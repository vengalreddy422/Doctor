from rest_framework import serializers
from decimal import Decimal
from .models import Doctor, Hospital


def _get_user_booking_number(request):
    if not request or not hasattr(request, 'user') or not request.user.is_authenticated:
        return None
    if not hasattr(request, '_cached_booking_number'):
        from appointments.models import Appointment
        prev = Appointment.objects.filter(
            patient=request.user
        ).exclude(status__in=['cancelled', 'expired', 'rescheduled']).count()
        request._cached_booking_number = prev + 1
    return request._cached_booking_number


class HospitalSerializer(serializers.ModelSerializer):
    maps_url = serializers.SerializerMethodField()
    doctors_count = serializers.SerializerMethodField()

    class Meta:
        model = Hospital
        fields = [
            'id', 'name', 'slug', 'contact_phone', 'contact_email',
            'address', 'city', 'state', 'google_maps_url', 'maps_url',
            'is_active', 'created_at', 'doctors_count'
        ]

    def get_maps_url(self, obj):
        return obj.get_google_maps_url()

    def get_doctors_count(self, obj):
        from django.core.cache import cache
        if hasattr(obj, 'active_doctors_count'):
            return obj.active_doctors_count
        cache_key = f"hosp_doc_cnt_{obj.id}"
        cnt = cache.get(cache_key)
        if cnt is None:
            cnt = obj.doctors.filter(is_active=True).count()
            cache.set(cache_key, cnt, timeout=300)
        return cnt


class AdminHospitalSerializer(serializers.ModelSerializer):
    maps_url = serializers.SerializerMethodField()
    doctors_count = serializers.SerializerMethodField()
    active_doctors = serializers.SerializerMethodField()
    total_appointments = serializers.SerializerMethodField()
    total_slots = serializers.SerializerMethodField()
    booked_appts = serializers.SerializerMethodField()
    occupancy_rate = serializers.SerializerMethodField()
    manager_username = serializers.SerializerMethodField()

    class Meta:
        model = Hospital
        fields = [
            'id', 'name', 'slug', 'contact_phone', 'contact_email',
            'address', 'city', 'state', 'google_maps_url', 'maps_url',
            'is_active', 'created_at', 'updated_at',
            'doctors_count', 'active_doctors', 'total_appointments',
            'total_slots', 'booked_appts', 'occupancy_rate', 'manager_username'
        ]

    def get_maps_url(self, obj):
        return obj.get_google_maps_url()

    def get_doctors_count(self, obj):
        from django.core.cache import cache
        cache_key = f"hosp_tot_cnt_{obj.id}"
        cnt = cache.get(cache_key)
        if cnt is None:
            cnt = obj.doctors.count()
            cache.set(cache_key, cnt, timeout=300)
        return cnt

    def get_active_doctors(self, obj):
        from django.core.cache import cache
        cache_key = f"hosp_doc_cnt_{obj.id}"
        cnt = cache.get(cache_key)
        if cnt is None:
            cnt = obj.doctors.filter(is_active=True).count()
            cache.set(cache_key, cnt, timeout=300)
        return cnt

    def get_total_appointments(self, obj):
        from django.core.cache import cache
        from appointments.models import Appointment
        cache_key = f"hosp_appts_cnt_{obj.id}"
        cnt = cache.get(cache_key)
        if cnt is None:
            cnt = Appointment.objects.filter(doctor__hospital=obj).count()
            cache.set(cache_key, cnt, timeout=60)
        return cnt

    def get_total_slots(self, obj):
        from django.core.cache import cache
        from appointments.models import Slot
        cache_key = f"hosp_slots_cnt_{obj.id}"
        cnt = cache.get(cache_key)
        if cnt is None:
            cnt = Slot.objects.filter(doctor__hospital=obj).count()
            cache.set(cache_key, cnt, timeout=60)
        return cnt

    def get_booked_appts(self, obj):
        from django.core.cache import cache
        from appointments.models import Appointment
        cache_key = f"hosp_booked_cnt_{obj.id}"
        cnt = cache.get(cache_key)
        if cnt is None:
            cnt = Appointment.objects.filter(
                doctor__hospital=obj,
                status__in=['pending', 'confirmed', 'completed']
            ).count()
            cache.set(cache_key, cnt, timeout=60)
        return cnt

    def get_occupancy_rate(self, obj):
        total_slots = self.get_total_slots(obj)
        if total_slots == 0:
            return 0
        booked = self.get_booked_appts(obj)
        return round((booked / (total_slots * 5)) * 100, 1)

    def get_manager_username(self, obj):
        from django.contrib.auth import get_user_model
        User = get_user_model()
        user = User.objects.filter(role='hospital', hospital=obj).first()
        if not user:
            user = User.objects.filter(username=obj.slug).first()
        return user.username if user else obj.slug


class HybridDoctorImageField(serializers.Field):
    """
    Enterprise hybrid image field that accepts:
    1. Standard file uploads (JPG, PNG, WEBP, SVG)
    2. External CDN/Unsplash/Cloudinary image URL strings
    3. Null / empty string to clear photo
    """
    def to_representation(self, value):
        if not value:
            return None
        val_str = str(value)
        if val_str.startswith(('http://', 'https://', '/media/')):
            return val_str
        try:
            return value.url
        except Exception:
            return f"/media/{val_str}"

    def to_internal_value(self, data):
        if data is None or data == '' or data == 'null' or data == 'undefined':
            return None
        if hasattr(data, 'read') and hasattr(data, 'name'):
            if hasattr(data, 'size') and data.size > 10 * 1024 * 1024:
                raise serializers.ValidationError("Image file size must be under 10MB.")
            return data
        if isinstance(data, str):
            val = data.strip()
            if not val or val.lower() in ('null', 'undefined', 'none'):
                return None
            return val
        return data


class DoctorSerializer(serializers.ModelSerializer):
    image = HybridDoctorImageField(required=False, allow_null=True)
    calculated_fee = serializers.SerializerMethodField()
    pricing_label = serializers.SerializerMethodField()
    pricing_type = serializers.SerializerMethodField()
    maps_url = serializers.SerializerMethodField()
    hospital_details = HospitalSerializer(source='hospital', read_only=True)
    available_days_list = serializers.SerializerMethodField()
    available_days_display = serializers.SerializerMethodField()
    is_available_today = serializers.SerializerMethodField()

    class Meta:
        model = Doctor
        fields = '__all__'

    def get_maps_url(self, obj):
        return obj.get_google_maps_url()

    def get_is_available_today(self, obj):
        return obj.is_available_today()

    def get_available_days_list(self, obj):
        if obj.available_days:
            return [d.strip().lower() for d in obj.available_days.split(',') if d.strip()]
        days = obj.get_available_days_list()
        return days if days else ['mon', 'tue', 'wed', 'thu', 'fri', 'sat']

    def get_available_days_display(self, obj):
        day_map = {'mon': 'Mon', 'tue': 'Tue', 'wed': 'Wed', 'thu': 'Thu', 'fri': 'Fri', 'sat': 'Sat', 'sun': 'Sun'}
        days = self.get_available_days_list(obj)
        return [day_map.get(d.lower(), d.capitalize()) for d in days]

    def get_calculated_fee(self, obj):
        request = self.context.get('request')
        booking_num = _get_user_booking_number(request)
        if booking_num is not None:
            if booking_num % 2 != 0:
                # Odd -> +5%
                return str((obj.fee * Decimal('1.05')).quantize(Decimal('0.01')))
            else:
                # Even -> -5%
                return str((obj.fee * Decimal('0.95')).quantize(Decimal('0.01')))
        return str(obj.fee)

    def get_pricing_label(self, obj):
        request = self.context.get('request')
        booking_num = _get_user_booking_number(request)
        if booking_num is not None:
            if booking_num % 2 != 0:
                return f"+5% Surge (Booking #{booking_num})"
            else:
                return f"-5% Loyalty (Booking #{booking_num})"
        return None

    def get_pricing_type(self, obj):
        request = self.context.get('request')
        booking_num = _get_user_booking_number(request)
        if booking_num is not None:
            return 'surge' if booking_num % 2 != 0 else 'discount'
        return 'standard'


