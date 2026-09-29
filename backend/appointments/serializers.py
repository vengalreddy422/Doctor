from rest_framework import serializers
from .models import Appointment, Slot, Coupon


class CouponSerializer(serializers.ModelSerializer):
    class Meta:
        model = Coupon
        fields = (
            'id', 'code', 'title', 'description', 'discount_type',
            'discount_value', 'coupon_type', 'required_bookings',
            'max_bookings', 'max_discount', 'is_active'
        )


class BookAppointmentSerializer(serializers.Serializer):
    slot_id = serializers.IntegerField()
    patient_name = serializers.CharField(required=False, allow_blank=True, default='')
    patient_relation = serializers.CharField(required=False, allow_blank=True, default='Self')
    patient_age = serializers.IntegerField(required=False, allow_null=True)
    patient_gender = serializers.CharField(required=False, allow_blank=True, default='')
    patient_phone = serializers.CharField(required=False, allow_blank=True, default='')
    notes = serializers.CharField(required=False, allow_blank=True, default='')
    coupon_code = serializers.CharField(required=False, allow_blank=True, default='')

    def validate_slot_id(self, value):
        if not Slot.objects.filter(id=value).exists():
            raise serializers.ValidationError("Slot does not exist.")
        return value


class RescheduleAppointmentSerializer(serializers.Serializer):
    new_slot_id = serializers.IntegerField()

    def validate_new_slot_id(self, value):
        if not Slot.objects.filter(id=value).exists():
            raise serializers.ValidationError("Slot does not exist.")
        return value


class AppointmentReviewSerializer(serializers.Serializer):
    doctor_rating = serializers.IntegerField(min_value=1, max_value=5, required=False, default=5)
    hospital_rating = serializers.IntegerField(min_value=1, max_value=5, required=False, default=5)
    management_rating = serializers.IntegerField(min_value=1, max_value=5, required=False, default=5)
    rating = serializers.IntegerField(min_value=1, max_value=5, required=False)
    review_comment = serializers.CharField(required=False, allow_blank=True, default='')


class AppointmentSerializer(serializers.ModelSerializer):
    doctor_name = serializers.CharField(source='doctor.name', read_only=True)
    doctor_specialization = serializers.CharField(source='doctor.specialization', read_only=True)
    doctor_image = serializers.SerializerMethodField()
    doctor_hospital = serializers.CharField(source='doctor.hospital_name', read_only=True)
    doctor_contact_number = serializers.CharField(source='doctor.contact_number', read_only=True)
    doctor_contact_email = serializers.CharField(source='doctor.contact_email', read_only=True)
    doctor_clinic_address = serializers.CharField(source='doctor.clinic_address', read_only=True)
    doctor_maps_url = serializers.SerializerMethodField()
    doctor_fee = serializers.DecimalField(source='doctor.fee', max_digits=8, decimal_places=2, read_only=True)
    patient_name = serializers.SerializerMethodField()
    patient_email = serializers.CharField(source='patient.email', read_only=True)
    account_holder_name = serializers.SerializerMethodField()
    slot_date = serializers.DateField(source='slot.date', read_only=True)
    slot_time = serializers.TimeField(source='slot.start_time', read_only=True)
    slot_end_time = serializers.TimeField(source='slot.end_time', read_only=True)
    is_cancellable = serializers.BooleanField(read_only=True)
    is_reschedulable = serializers.BooleanField(read_only=True)
    reschedule_info = serializers.SerializerMethodField()

    class Meta:
        model = Appointment
        fields = (
            'id', 'doctor', 'doctor_name', 'doctor_specialization', 'doctor_image',
            'doctor_hospital', 'doctor_contact_number', 'doctor_contact_email',
            'doctor_clinic_address', 'doctor_maps_url', 'doctor_fee',
            'patient', 'patient_name', 'patient_relation',
            'patient_age', 'patient_gender', 'patient_phone', 'patient_email',
            'account_holder_name', 'slot', 'slot_date', 'slot_time', 'slot_end_time',
            'original_fee', 'discount_amount', 'coupon_code', 'fee_charged',
            'status', 'receipt_id', 'notes', 'is_cancellable',
            'is_reschedulable', 'reschedule_info',
            'op_checked_in', 'op_checked_in_at', 'completed_at',
            'doctor_rating', 'hospital_rating', 'management_rating',
            'rating', 'review_comment', 'reviewed_at', 'is_reviewed',
            'cancelled_by', 'cancellation_reason',
            'cancellation_fee', 'refund_amount', 'refund_status', 'cancelled_at',
            'created_at', 'updated_at',
        )
        read_only_fields = (
            'original_fee', 'discount_amount', 'coupon_code', 'fee_charged',
            'status', 'receipt_id', 'cancelled_by', 'cancellation_reason',
            'cancellation_fee', 'refund_amount', 'refund_status', 'cancelled_at',
            'op_checked_in_at', 'completed_at', 'reviewed_at', 'is_reviewed',
            'created_at', 'updated_at'
        )

    def get_doctor_image(self, obj):
        if obj.doctor and obj.doctor.image:
            img_str = str(obj.doctor.image)
            if img_str.startswith(('http://', 'https://', '/media/')):
                return img_str
            try:
                return obj.doctor.image.url
            except Exception:
                return f"/media/{img_str}"
        return None

    def get_doctor_maps_url(self, obj):
        if obj.doctor:
            return obj.doctor.get_google_maps_url()
        return ""

    def get_patient_name(self, obj):
        if obj.patient_name and obj.patient_name.strip():
            return obj.patient_name.strip()
        if obj.patient:
            full_name = f"{obj.patient.first_name} {obj.patient.last_name}".strip()
            return full_name if full_name else obj.patient.username
        return ''

    def get_account_holder_name(self, obj):
        if obj.patient:
            full_name = f"{obj.patient.first_name} {obj.patient.last_name}".strip()
            return full_name if full_name else obj.patient.username
        return ''

    def get_reschedule_info(self, obj):
        eligible, reason = obj.check_reschedule_eligibility()
        hours = max(0, round(obj.get_hours_until_slot(), 1))
        return {
            'eligible': eligible,
            'hours_remaining': hours,
            'reason': reason,
            'policy_notice': "Rescheduling permitted only up to 10 hours before appointment start time.",
        }

