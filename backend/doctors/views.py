from datetime import time as time_cls
from rest_framework import generics, status
from rest_framework.views import APIView
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from django.core.paginator import Paginator
from django.shortcuts import get_object_or_404
from django.core.cache import cache
from django.utils import timezone
from django.db.models import Count, Q, F
from django.contrib.auth import get_user_model

from accounts.permissions import IsAdminRole, IsHospitalOrAdminRole
from appointments.models import Slot, Appointment
from appointments.services import refresh_rolling_slots
from .models import Doctor, DoctorSchedule, Hospital
from .serializers import DoctorSerializer, HospitalSerializer, AdminHospitalSerializer


class DoctorListView(APIView):
    """Public listing — patients browse without needing auth, supports search, filter, pagination."""
    permission_classes = [AllowAny]

    def get(self, request):
        specialization = request.GET.get('specialization', '').strip()
        search = request.GET.get('search', request.GET.get('q', '')).strip()
        hospital = request.GET.get('hospital', request.GET.get('hospital_name', '')).strip()
        location = request.GET.get('location', request.GET.get('city', '')).strip()
        available_today = request.GET.get('available_today', '').strip().lower() in ['true', '1', 'yes']
        page_number = request.GET.get('page', 1)
        page_size = int(request.GET.get('page_size', 12))

        user_id = request.user.id if (request.user and request.user.is_authenticated) else 'anon'
        cache_key = f"doc_list_opt_{user_id}_{specialization}_{search}_{hospital}_{location}_{available_today}_{page_number}_{page_size}"
        cached_response = cache.get(cache_key)
        if cached_response is not None:
            return Response(cached_response)

        qs = Doctor.objects.filter(is_active=True).select_related('hospital').order_by('name')
        if specialization:
            qs = qs.filter(specialization__iexact=specialization)
        if search:
            qs = qs.filter(
                Q(name__icontains=search) |
                Q(hospital_name__icontains=search) |
                Q(clinic_address__icontains=search) |
                Q(specialization__icontains=search) |
                Q(hospital__name__icontains=search) |
                Q(hospital__city__icontains=search) |
                Q(hospital__address__icontains=search)
            )
        if hospital:
            qs = qs.filter(Q(hospital__name__icontains=hospital) | Q(hospital_name__icontains=hospital))
        if location:
            qs = qs.filter(
                Q(clinic_address__icontains=location) |
                Q(hospital_name__icontains=location) |
                Q(hospital__city__icontains=location) |
                Q(hospital__state__icontains=location) |
                Q(hospital__address__icontains=location) |
                Q(hospital__name__icontains=location)
            )
        if available_today:
            today = timezone.localdate()
            today_code = today.strftime('%a').lower()
            qs = qs.filter(available_days__icontains=today_code)

        paginator = Paginator(qs, page_size)
        page_obj = paginator.get_page(page_number)

        # Bulk preload and cache hospital doctor counts in 1 query to prevent N+1 per doctor
        hosp_ids = [d.hospital_id for d in page_obj.object_list if d.hospital_id]
        if hosp_ids:
            uncached_hosp_ids = [hid for hid in hosp_ids if cache.get(f"hosp_doc_cnt_{hid}") is None]
            if uncached_hosp_ids:
                doc_counts = dict(
                    Doctor.objects.filter(is_active=True, hospital_id__in=uncached_hosp_ids)
                    .values('hospital_id')
                    .annotate(c=Count('id'))
                    .values_list('hospital_id', 'c')
                )
                for hid in uncached_hosp_ids:
                    cache.set(f"hosp_doc_cnt_{hid}", doc_counts.get(hid, 0), timeout=600)

        # Cache specializations list in memory for 10 minutes
        specializations = cache.get('all_specializations_list')
        if not specializations:
            specializations = list(
                Doctor.objects.filter(is_active=True)
                .values_list('specialization', flat=True)
                .order_by('specialization')
                .distinct()
            )
            cache.set('all_specializations_list', specializations, timeout=600)

        payload = {
            'count': paginator.count,
            'num_pages': paginator.num_pages,
            'current_page': page_obj.number,
            'has_next': page_obj.has_next(),
            'has_previous': page_obj.has_previous(),
            'results': DoctorSerializer(page_obj.object_list, many=True, context={'request': request}).data,
            'specializations': specializations,
        }
        cache.set(cache_key, payload, timeout=120)
        return Response(payload)


class DoctorDetailView(APIView):
    """Public detail view for a single doctor, including related doctors."""
    permission_classes = [AllowAny]

    def get(self, request, pk):
        user_id = request.user.id if (request.user and request.user.is_authenticated) else 'anon'
        cache_key = f"doc_detail_{pk}_{user_id}"
        cached = cache.get(cache_key)
        if cached:
            return Response(cached)

        doctor = get_object_or_404(Doctor.objects.select_related('hospital'), pk=pk, is_active=True)
        related = Doctor.objects.filter(
            specialization=doctor.specialization, is_active=True
        ).select_related('hospital').exclude(id=doctor.id)[:5]

        payload = {
            'doctor': DoctorSerializer(doctor, context={'request': request}).data,
            'related_doctors': DoctorSerializer(related, many=True, context={'request': request}).data,
        }
        cache.set(cache_key, payload, timeout=60)
        return Response(payload)


class SpecializationsListView(APIView):
    """List of all available doctor specializations."""
    permission_classes = [AllowAny]

    def get(self, request):
        specializations = cache.get('all_specializations_list')
        if not specializations:
            specializations = list(
                Doctor.objects.filter(is_active=True)
                .values_list('specialization', flat=True)
                .order_by('specialization')
                .distinct()
            )
            cache.set('all_specializations_list', specializations, timeout=600)
        return Response(specializations)


class AboutStatsView(APIView):
    """System count statistics for the About page."""
    permission_classes = [AllowAny]

    def get(self, request):
        stats_data = cache.get('about_stats_data')
        if not stats_data:
            User = get_user_model()
            doctor_count = Doctor.objects.filter(is_active=True).count()
            patient_count = User.objects.filter(role='patient').count()
            appointment_count = Appointment.objects.filter(
                status__in=['confirmed', 'completed']
            ).count()

            stats_data = {
                'doctor_count': doctor_count,
                'patient_count': patient_count,
                'appointment_count': appointment_count,
            }
            cache.set('about_stats_data', stats_data, timeout=300)

        return Response(stats_data)


class AdminDoctorListCreateView(generics.ListCreateAPIView):
    queryset = Doctor.objects.all().order_by('-id')
    serializer_class = DoctorSerializer
    permission_classes = [IsHospitalOrAdminRole]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def perform_create(self, serializer):
        user = self.request.user
        hospital_obj = None
        if user.role == 'hospital':
            if getattr(user, 'hospital', None):
                hospital_obj = user.hospital
            elif getattr(user, 'hospital_name', None):
                hospital_obj = Hospital.objects.filter(name__iexact=user.hospital_name.strip()).first()
        elif serializer.validated_data.get('hospital'):
            hospital_obj = serializer.validated_data.get('hospital')
        elif serializer.validated_data.get('hospital_name'):
            h_name = serializer.validated_data.get('hospital_name', '').strip()
            hospital_obj = Hospital.objects.filter(name__iexact=h_name).first()

        if hospital_obj:
            doctor = serializer.save(hospital=hospital_obj, hospital_name=hospital_obj.name)
        else:
            doctor = serializer.save()

        if doctor.available_days:
            raw_days = [d.strip().lower() for d in doctor.available_days.split(',') if d.strip()]
            unique_days = list(dict.fromkeys(raw_days))
            DoctorSchedule.objects.filter(doctor=doctor).exclude(day_of_week__in=unique_days).delete()
            for day in unique_days:
                DoctorSchedule.objects.update_or_create(
                    doctor=doctor,
                    day_of_week=day,
                    start_time=time_cls(10, 0),
                    defaults={
                        'end_time': time_cls(17, 0),
                        'is_active': True
                    }
                )
            refresh_rolling_slots(doctor, force=True)

        cache.delete('admin_dashboard_stats_data_v2')
        cache.delete('all_specializations_list')
        cache.delete('about_stats_data')
        cache.clear()


class AdminDoctorDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Doctor.objects.all()
    serializer_class = DoctorSerializer
    permission_classes = [IsHospitalOrAdminRole]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def perform_update(self, serializer):
        user = self.request.user
        hospital_obj = None
        if user.role == 'hospital':
            if getattr(user, 'hospital', None):
                hospital_obj = user.hospital
            elif getattr(user, 'hospital_name', None):
                hospital_obj = Hospital.objects.filter(name__iexact=user.hospital_name.strip()).first()
        elif serializer.validated_data.get('hospital'):
            hospital_obj = serializer.validated_data.get('hospital')
        elif serializer.validated_data.get('hospital_name'):
            h_name = serializer.validated_data.get('hospital_name', '').strip()
            hospital_obj = Hospital.objects.filter(name__iexact=h_name).first()

        instance = serializer.instance
        old_available_days = instance.available_days if instance else ''

        if hospital_obj:
            doctor = serializer.save(hospital=hospital_obj, hospital_name=hospital_obj.name)
        else:
            doctor = serializer.save()

        # Only rebuild schedule and regenerate rolling slots if available_days actually changed
        days_changed = ('available_days' in serializer.validated_data and serializer.validated_data['available_days'] != old_available_days)
        if days_changed and doctor.available_days:
            raw_days = [d.strip().lower() for d in (doctor.available_days or '').split(',') if d.strip()]
            unique_days = list(dict.fromkeys(raw_days))
            DoctorSchedule.objects.filter(doctor=doctor).exclude(day_of_week__in=unique_days).delete()
            for day in unique_days:
                DoctorSchedule.objects.update_or_create(
                    doctor=doctor,
                    day_of_week=day,
                    start_time=time_cls(10, 0),
                    defaults={
                        'end_time': time_cls(17, 0),
                        'is_active': True
                    }
                )
            refresh_rolling_slots(doctor, force=True)

        cache.delete('admin_dashboard_stats_data_v2')
        cache.delete('all_specializations_list')
        cache.delete('about_stats_data')
        cache.clear()

    def perform_destroy(self, instance):
        instance.delete()
        cache.delete('admin_dashboard_stats_data_v2')
        cache.delete('all_specializations_list')
        cache.delete('about_stats_data')
        cache.clear()




@api_view(['GET'])
@permission_classes([AllowAny])
def doctor_search_api(request):
    query = request.GET.get('q', '').strip().lower()
    if len(query) < 2:
        return Response([])

    cache_key = f"doc_srch_{query}"
    cached = cache.get(cache_key)
    if cached is not None:
        return Response(cached)

    doctors = list(Doctor.objects.filter(
        Q(is_active=True) & (
            Q(name__icontains=query) |
            Q(specialization__icontains=query) |
            Q(hospital_name__icontains=query) |
            Q(clinic_address__icontains=query) |
            Q(hospital__city__icontains=query) |
            Q(hospital__name__icontains=query)
        )
    ).values(
        'id', 'name', 'specialization', 'fee', 'image', 'hospital_name', 'clinic_address'
    )[:8])
    
    for d in doctors:
        d['fee'] = str(d['fee'])
        img = d.get('image')
        if img:
            img_str = str(img)
            if img_str.startswith(('http://', 'https://', '/media/')):
                d['image'] = img_str
            else:
                d['image'] = f"/media/{img_str}"
        else:
            d['image'] = None

    cache.set(cache_key, doctors, timeout=300)
    return Response(doctors)


@api_view(['GET'])
@permission_classes([AllowAny])
def doctor_available_dates_api(request, pk):
    today = timezone.localdate()
    cache_key = f"doc_dates_{pk}_{today}"
    cached = cache.get(cache_key)
    if cached is not None:
        return Response(cached)

    dates = list(Slot.objects.filter(
        doctor_id=pk, date__gte=today, is_blocked=False
    ).values_list('date', flat=True).distinct().order_by('date')[:7])
    
    # Only refresh if fewer than 7 rolling dates exist in DB
    if len(dates) < 7:
        doctor = generics.get_object_or_404(Doctor, pk=pk)
        refresh_rolling_slots(doctor)
        dates = list(Slot.objects.filter(
            doctor_id=pk, date__gte=today, is_blocked=False
        ).values_list('date', flat=True).distinct().order_by('date')[:7])
    
    formatted_dates = [d.strftime('%Y-%m-%d') for d in dates]
    cache.set(cache_key, formatted_dates, timeout=60)
    return Response(formatted_dates)


@api_view(['GET'])
@permission_classes([AllowAny])
def doctor_available_slots_api(request, pk):
    date_str = request.GET.get('date')
    if not date_str:
        return Response({"error": "date parameter is required"}, status=400)
        
    cache_key = f"doc_slots_{pk}_{date_str}"
    cached = cache.get(cache_key)
    if cached is not None:
        return Response(cached)

    now = timezone.localtime()
    slots = Slot.objects.filter(
        doctor_id=pk, date=date_str, is_blocked=False
    ).annotate(
        booked=Count(
            'appointments',
            filter=Q(appointments__status__in=['pending', 'confirmed', 'completed'])
        )
    ).order_by('start_time')
    
    if date_str == now.date().strftime('%Y-%m-%d'):
        slots = slots.filter(start_time__gt=now.time())
        
    results = [{
        'id': slot.id,
        'start_time': slot.start_time.strftime('%H:%M'),
        'end_time': slot.end_time.strftime('%H:%M') if slot.end_time else None,
        'max_capacity': slot.max_capacity,
        'booked': slot.booked,
        'booked_count': slot.booked,
        'is_blocked': slot.is_blocked,
        'is_full': slot.booked >= slot.max_capacity,
        'is_past': slot.is_past(),
    } for slot in slots]
    
    cache.set(cache_key, results, timeout=60)
    return Response(results)


import re

def clean_hospital_slug(hospital_name):
    """Generate clean, lowercase username slug from hospital name."""
    if not hospital_name:
        return 'careconnect'
    slug = re.sub(r'[^a-zA-Z0-9]', '', hospital_name.lower())
    return slug[:30] if slug else 'hospital'


class HospitalListView(APIView):
    """Public list of active hospital facilities for search and doctor registration dropdowns."""
    permission_classes = [AllowAny]

    def get(self, request):
        cached = cache.get('public_hospitals_list_data')
        if cached is not None:
            return Response(cached)

        hospitals = Hospital.objects.filter(is_active=True).annotate(
            active_doctors_count=Count('doctors', filter=Q(doctors__is_active=True))
        ).order_by('name')
        data = HospitalSerializer(hospitals, many=True).data
        cache.set('public_hospitals_list_data', data, timeout=300)
        return Response(data)


class AdminHospitalListCreateView(APIView):
    """
    Admin Hospital Management API:
    - GET: List all hospital entities with live occupancy and doctor counts
    - POST: Dynamically create a new hospital facility and auto-provision its manager credentials
    """
    permission_classes = [IsAdminRole]

    def get(self, request):
        cached = cache.get('admin_hospitals_data_list')
        if cached is not None:
            return Response(cached)
        hospitals = Hospital.objects.all().order_by('name')
        data = AdminHospitalSerializer(hospitals, many=True).data
        cache.set('admin_hospitals_data_list', data, timeout=60)
        return Response(data)

    def post(self, request):
        cache.delete('admin_hospitals_data_list')
        cache.delete('admin_dashboard_stats_data_v2')
        cache.delete('public_hospitals_list_data')
        cache.delete('all_hospitals_dropdown_data')
        name = request.data.get('name', '').strip()
        if not name:
            return Response({'error': 'Hospital name is required.'}, status=status.HTTP_400_BAD_REQUEST)

        if Hospital.objects.filter(name__iexact=name).exists():
            return Response({'error': f"A hospital with the name '{name}' already exists."}, status=status.HTTP_400_BAD_REQUEST)

        custom_slug = request.data.get('slug', '').strip()
        slug = clean_hospital_slug(custom_slug or name)

        # Ensure slug uniqueness
        base_slug = slug
        counter = 1
        while Hospital.objects.filter(slug=slug).exists():
            slug = f"{base_slug}{counter}"
            counter += 1

        phone = request.data.get('contact_phone', '').strip()
        email = request.data.get('contact_email', '').strip()
        address = request.data.get('address', '').strip()
        city = request.data.get('city', '').strip()
        state = request.data.get('state', '').strip()
        maps_url = request.data.get('google_maps_url', '').strip()

        # Manager Credentials
        manager_password = request.data.get('manager_password', 'hospital@123').strip() or 'hospital@123'
        user_email = email or f"{slug}@hospital.mediconnect.com"

        # Create dynamic Hospital
        hospital = Hospital.objects.create(
            name=name,
            slug=slug,
            contact_phone=phone,
            contact_email=email,
            address=address,
            city=city,
            state=state,
            google_maps_url=maps_url,
            is_active=True
        )

        # Auto-provision manager user account
        User = get_user_model()
        user = User.objects.filter(username=slug).first()
        if not user:
            user = User.objects.create_user(
                username=slug,
                email=user_email,
                password=manager_password,
                role='hospital',
                hospital=hospital,
                hospital_name=hospital.name,
                hospital_slug=hospital.slug,
                is_verified=True,
                is_active=True,
                first_name=hospital.name[:30]
            )
        else:
            user.role = 'hospital'
            user.hospital = hospital
            user.hospital_name = hospital.name
            user.hospital_slug = hospital.slug
            user.set_password(manager_password)
            user.is_active = True
            user.is_verified = True
            user.save()

        res_data = AdminHospitalSerializer(hospital).data
        res_data['credentials'] = {
            'username': user.username,
            'password': manager_password,
            'email': user.email,
            'role': 'hospital'
        }

        return Response(res_data, status=status.HTTP_201_CREATED)


class AdminHospitalDetailView(APIView):
    """
    Admin retrieve, update, delete single hospital facility.
    """
    permission_classes = [IsAdminRole]

    def get_object(self, pk):
        return get_object_or_404(Hospital, pk=pk)

    def get(self, request, pk):
        hospital = self.get_object(pk)
        return Response(AdminHospitalSerializer(hospital).data)

    def patch(self, request, pk):
        hospital = self.get_object(pk)
        name = request.data.get('name')
        if name and name.strip() and name.strip() != hospital.name:
            if Hospital.objects.filter(name__iexact=name.strip()).exclude(pk=pk).exists():
                return Response({'error': f"Another hospital with name '{name.strip()}' already exists."}, status=status.HTTP_400_BAD_REQUEST)
            hospital.name = name.strip()
            # Sync doctor names
            hospital.doctors.all().update(hospital_name=hospital.name)

        if 'contact_phone' in request.data:
            hospital.contact_phone = request.data.get('contact_phone', '').strip()
        if 'contact_email' in request.data:
            hospital.contact_email = request.data.get('contact_email', '').strip()
        if 'address' in request.data:
            hospital.address = request.data.get('address', '').strip()
        if 'city' in request.data:
            hospital.city = request.data.get('city', '').strip()
        if 'state' in request.data:
            hospital.state = request.data.get('state', '').strip()
        if 'google_maps_url' in request.data:
            hospital.google_maps_url = request.data.get('google_maps_url', '').strip()
        if 'is_active' in request.data:
            hospital.is_active = bool(request.data.get('is_active'))

        hospital.save()

        # Optional password reset for hospital manager
        reset_password = request.data.get('reset_password', '').strip()
        User = get_user_model()
        user = User.objects.filter(role='hospital', hospital=hospital).first()
        if not user:
            user = User.objects.filter(username=hospital.slug).first()

        if reset_password and user:
            user.set_password(reset_password)
            user.save()

        cache.delete('admin_hospitals_data_list')
        cache.delete('admin_dashboard_stats_data_v2')
        cache.delete('public_hospitals_list_data')
        cache.delete('all_hospitals_dropdown_data')

        res_data = AdminHospitalSerializer(hospital).data
        if reset_password:
            res_data['message'] = f"Hospital details updated and password reset successfully for '{user.username}'."
        return Response(res_data)

    def delete(self, request, pk):
        hospital = self.get_object(pk)
        # Soft delete / deactivate
        hospital.is_active = False
        hospital.save()
        cache.delete('admin_hospitals_data_list')
        cache.delete('admin_dashboard_stats_data_v2')
        cache.delete('public_hospitals_list_data')
        cache.delete('all_hospitals_dropdown_data')
        return Response({'message': f"Hospital '{hospital.name}' has been deactivated successfully."})

