from decimal import Decimal
from rest_framework import generics, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db import transaction
from django.db.models import Count, Q, F, Sum
from django.core.paginator import Paginator
from django.contrib.auth import get_user_model
from django.shortcuts import get_object_or_404
from django.utils import timezone

from accounts.permissions import IsAdminRole, IsHospitalOrAdminRole, IsHospitalRole
from accounts.serializers import UserSerializer
from doctors.models import Doctor, Hospital
from doctors.serializers import DoctorSerializer
from payments.models import Payment
from payments.serializers import PaymentSerializer
from .models import Slot, Appointment, Coupon
from .serializers import (
    BookAppointmentSerializer, AppointmentSerializer,
    RescheduleAppointmentSerializer, CouponSerializer
)
from .services import calculate_fee
from .notifications import (
    send_booking_confirmation, send_cancellation_notification,
    send_admin_slot_cancellation_email, send_admin_reschedule_email
)

User = get_user_model()


def get_user_booking_stats(user):
    """Calculate user's confirmed/completed booking count and milestone info."""
    booking_count = Appointment.objects.filter(
        patient=user
    ).exclude(
        status__in=['cancelled', 'expired', 'rejected']
    ).count()

    next_milestone = ((booking_count // 5) + 1) * 5
    bookings_until_next = next_milestone - booking_count

    return {
        'booking_count': booking_count,
        'next_milestone': next_milestone,
        'bookings_until_next': bookings_until_next,
    }


class AvailableCouponsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        stats = get_user_booking_stats(request.user)
        b_count = stats['booking_count']
        doctor_id = request.GET.get('doctor_id')
        
        doctor_fee = None
        if doctor_id:
            try:
                doc = Doctor.objects.get(id=doctor_id)
                doctor_fee = calculate_fee(request.user, doc)
            except Doctor.DoesNotExist:
                doctor_fee = None

        all_active_coupons = Coupon.objects.filter(is_active=True).order_by('-discount_value')
        eligible_coupons = []
        locked_coupons = []

        for coupon in all_active_coupons:
            c_data = CouponSerializer(coupon).data
            if doctor_fee is not None:
                disc = coupon.calculate_discount(doctor_fee)
                c_data['discount_for_doctor'] = str(disc)
                c_data['final_fee'] = str(max(Decimal('0.00'), doctor_fee - disc))

            # Eligibility check
            is_eligible = True
            lock_reason = ""

            if coupon.coupon_type == 'first_booking':
                if b_count > 0:
                    is_eligible = False
                    lock_reason = "Only valid for 1st booking"
            elif coupon.coupon_type == 'milestone':
                if b_count < coupon.required_bookings:
                    is_eligible = False
                    lock_reason = f"Unlocks at {coupon.required_bookings} bookings ({coupon.required_bookings - b_count} more needed)"
            elif coupon.required_bookings > 0 and b_count < coupon.required_bookings:
                is_eligible = False
                lock_reason = f"Requires {coupon.required_bookings} prior bookings"

            c_data['is_eligible'] = is_eligible
            c_data['lock_reason'] = lock_reason

            if is_eligible:
                eligible_coupons.append(c_data)
            else:
                locked_coupons.append(c_data)

        # Determine top suggested coupon
        suggested_coupon = None
        suggestion_message = ""
        badge_text = ""

        if b_count == 0:
            first_c = next((c for c in eligible_coupons if c['code'] == 'FIRSTCARE'), eligible_coupons[0] if eligible_coupons else None)
            if first_c:
                suggested_coupon = first_c
                suggestion_message = "🎉 Welcome to CareConnect! You have an exclusive 20% OFF coupon for your 1st consultation!"
                badge_text = "First Booking Special"
        elif b_count >= 20:
            suggested_coupon = next((c for c in eligible_coupons if c['code'] == 'DIAMOND20'), eligible_coupons[0] if eligible_coupons else None)
            suggestion_message = f"🏆 VIP Diamond Milestone! You completed {b_count} bookings — enjoy 35% OFF!"
            badge_text = "Diamond Milestone (20+ Bookings)"
        elif b_count >= 15:
            suggested_coupon = next((c for c in eligible_coupons if c['code'] == 'PLATINUM15'), eligible_coupons[0] if eligible_coupons else None)
            suggestion_message = f"💎 Platinum Milestone! You completed {b_count} bookings — enjoy 30% OFF!"
            badge_text = "Platinum Milestone (15+ Bookings)"
        elif b_count >= 10:
            suggested_coupon = next((c for c in eligible_coupons if c['code'] == 'GOLD10'), eligible_coupons[0] if eligible_coupons else None)
            suggestion_message = f"👑 Gold Milestone! You completed {b_count} bookings — enjoy 25% OFF!"
            badge_text = "Gold Milestone (10+ Bookings)"
        elif b_count >= 5:
            suggested_coupon = next((c for c in eligible_coupons if c['code'] == 'LOYALTY5'), eligible_coupons[0] if eligible_coupons else None)
            suggestion_message = f"🌟 Loyalty Milestone! You completed {b_count} bookings — enjoy 15% OFF!"
            badge_text = "Loyalty Milestone (5+ Bookings)"
        elif eligible_coupons:
            suggested_coupon = eligible_coupons[0]
            suggestion_message = f"🎁 Special Offer: Use code {suggested_coupon['code']} to save on your appointment!"
            badge_text = "Available Coupon"

        return Response({
            "booking_stats": stats,
            "suggested_coupon": suggested_coupon,
            "suggestion_message": suggestion_message,
            "badge_text": badge_text,
            "eligible_coupons": eligible_coupons,
            "locked_coupons": locked_coupons,
        })


class ValidateCouponView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        code = request.data.get('code', '').strip().upper()
        doctor_id = request.data.get('doctor_id')

        if not code:
            return Response({"error": "Coupon code is required."}, status=status.HTTP_400_BAD_REQUEST)

        coupon = Coupon.objects.filter(code=code, is_active=True).first()
        if not coupon:
            return Response({"error": f"Invalid or inactive coupon code '{code}'."}, status=status.HTTP_400_BAD_REQUEST)

        stats = get_user_booking_stats(request.user)
        b_count = stats['booking_count']

        if coupon.coupon_type == 'first_booking' and b_count > 0:
            return Response({"error": "This coupon is only valid for your very 1st booking."}, status=status.HTTP_400_BAD_REQUEST)
        if coupon.required_bookings > 0 and b_count < coupon.required_bookings:
            needed = coupon.required_bookings - b_count
            return Response({
                "error": f"This coupon unlocks at {coupon.required_bookings} bookings. You have {b_count} ({needed} more needed)."
            }, status=status.HTTP_400_BAD_REQUEST)

        original_fee = Decimal('500.00')
        if doctor_id:
            try:
                doctor = Doctor.objects.get(id=doctor_id)
                original_fee = calculate_fee(request.user, doctor)
            except Doctor.DoesNotExist:
                pass

        discount = coupon.calculate_discount(original_fee)
        final_fee = max(Decimal('0.00'), original_fee - discount)

        return Response({
            "valid": True,
            "coupon": CouponSerializer(coupon).data,
            "original_fee": str(original_fee),
            "discount_amount": str(discount),
            "final_fee": str(final_fee),
            "message": f"Coupon '{coupon.code}' applied successfully! You save ₹{discount}."
        })


class BookAppointmentView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = BookAppointmentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        slot_id = serializer.validated_data['slot_id']
        patient_name = serializer.validated_data.get('patient_name', '').strip()
        patient_relation = serializer.validated_data.get('patient_relation', 'Self').strip()
        patient_age = serializer.validated_data.get('patient_age')
        patient_gender = serializer.validated_data.get('patient_gender', '').strip()
        patient_phone = serializer.validated_data.get('patient_phone', '').strip()
        notes = serializer.validated_data.get('notes', '').strip()
        coupon_code = serializer.validated_data.get('coupon_code', '').strip().upper()

        if not patient_name:
            full_n = f"{request.user.first_name} {request.user.last_name}".strip()
            patient_name = full_n if full_n else request.user.username

        with transaction.atomic():
            slot = Slot.objects.select_for_update().select_related('doctor').get(id=slot_id)

            if slot.is_past():
                return Response(
                    {"error": "Cannot book appointments in the past."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            if slot.is_full():
                return Response(
                    {"error": "This slot is full. Maximum 5 patients per slot reached. Please choose another."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            # Prevent double booking of the same patient on the same slot
            if Appointment.objects.filter(
                patient=request.user, slot=slot,
                patient_name__iexact=patient_name,
                status__in=['pending', 'confirmed', 'completed']
            ).exists():
                return Response(
                    {"error": f"An appointment for '{patient_name}' has already been booked for this time slot."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            original_fee = calculate_fee(request.user, slot.doctor)
            discount_amount = Decimal('0.00')
            applied_coupon = None

            if coupon_code:
                coupon = Coupon.objects.filter(code=coupon_code, is_active=True).first()
                if not coupon:
                    return Response({"error": f"Invalid or expired coupon code: {coupon_code}"}, status=status.HTTP_400_BAD_REQUEST)

                stats = get_user_booking_stats(request.user)
                b_count = stats['booking_count']

                if coupon.coupon_type == 'first_booking' and b_count > 0:
                    return Response({"error": "Coupon 'FIRSTCARE' is only valid on your 1st booking."}, status=status.HTTP_400_BAD_REQUEST)
                if coupon.required_bookings > 0 and b_count < coupon.required_bookings:
                    return Response({
                        "error": f"Coupon '{coupon.code}' requires at least {coupon.required_bookings} prior bookings."
                    }, status=status.HTTP_400_BAD_REQUEST)

                discount_amount = coupon.calculate_discount(original_fee)
                applied_coupon = coupon.code

            final_fee = max(Decimal('0.00'), original_fee - discount_amount)

            appointment = Appointment.objects.create(
                patient=request.user,
                doctor=slot.doctor,
                slot=slot,
                patient_name=patient_name,
                patient_relation=patient_relation or 'Self',
                patient_age=patient_age,
                patient_gender=patient_gender,
                patient_phone=patient_phone,
                original_fee=original_fee,
                discount_amount=discount_amount,
                coupon_code=applied_coupon,
                fee_charged=final_fee,
                status='pending',
                notes=notes,
            )

            # Invalidate slots and dashboard stats caches for immediate live updates
            from django.core.cache import cache
            cache.clear()

            # Trigger email notification
            try:
                send_booking_confirmation(appointment)
            except Exception:
                pass

        return Response(AppointmentSerializer(appointment).data, status=status.HTTP_201_CREATED)


class AppointmentDetailView(generics.RetrieveAPIView):
    serializer_class = AppointmentSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        if self.request.user.role == 'admin' or self.request.user.is_superuser:
            return Appointment.objects.all().select_related('doctor', 'slot', 'patient')
        return Appointment.objects.filter(patient=self.request.user).select_related('doctor', 'slot', 'patient')


class MyAppointmentsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        status_filter = request.GET.get('status', '').strip()
        page_number = request.GET.get('page', 1)
        page_size = int(request.GET.get('page_size', 6))

        qs = (
            Appointment.objects
            .filter(patient=request.user)
            .select_related('doctor', 'slot', 'patient')
            .order_by('-created_at')
        )
        if status_filter:
            qs = qs.filter(status=status_filter)

        paginator = Paginator(qs, page_size)
        page_obj = paginator.get_page(page_number)

        status_counts = dict(
            Appointment.objects
            .filter(patient=request.user)
            .values('status')
            .annotate(count=Count('id'))
            .values_list('status', 'count')
        )

        return Response({
            'count': paginator.count,
            'num_pages': paginator.num_pages,
            'current_page': page_obj.number,
            'has_next': page_obj.has_next(),
            'has_previous': page_obj.has_previous(),
            'status_filter': status_filter,
            'status_counts': status_counts,
            'total_count': sum(status_counts.values()),
            'results': AppointmentSerializer(page_obj.object_list, many=True).data,
        })


class CancellationPreviewView(APIView):
    """
    Returns real-time RedBus-style cancellation breakdown:
    - hours_remaining
    - refund_percentage, deduction_percentage
    - deduction_amount, refund_amount
    - tier_label, tier_code
    - policy slabs guide
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, appointment_id):
        appointment = get_object_or_404(
            Appointment.objects.select_related('doctor', 'slot', 'patient'),
            id=appointment_id, patient=request.user
        )
        refund_info = appointment.calculate_cancellation_refund()
        refund_info['appointment_id'] = appointment.id
        refund_info['doctor_name'] = appointment.doctor.name
        refund_info['doctor_specialization'] = appointment.doctor.specialization
        refund_info['hospital_name'] = appointment.doctor.hospital_name or (appointment.doctor.hospital.name if appointment.doctor.hospital else 'CareConnect Hospital')
        refund_info['slot_date'] = str(appointment.slot.date)
        refund_info['slot_time'] = appointment.slot.start_time.strftime('%H:%M')
        refund_info['receipt_id'] = appointment.receipt_id
        refund_info['policy_slabs'] = [
            {'title': 'Standard Notice (> 24 Hours)', 'refund': '100% Refund', 'deduction': '₹0 Cut-off (0%)', 'badge': 'Free Cancellation', 'color': 'emerald'},
            {'title': 'Moderate Notice (12 – 24 Hours)', 'refund': '75% Refund', 'deduction': '25% Cash Cut-off', 'badge': '75% Return', 'color': 'blue'},
            {'title': 'Short Notice (2 – 12 Hours)', 'refund': '50% Refund', 'deduction': '50% Cash Cut-off', 'badge': '50% Return', 'color': 'amber'},
            {'title': 'Late Notice (< 2 Hours)', 'refund': '0% Refund', 'deduction': '100% (Non-Refundable)', 'badge': 'No Refund', 'color': 'rose'},
        ]
        return Response(refund_info)


class CancelAppointmentView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, appointment_id):
        try:
            appointment = Appointment.objects.select_related('slot', 'doctor', 'patient').get(
                id=appointment_id, patient=request.user
            )
        except Appointment.DoesNotExist:
            return Response({"error": "Appointment not found."}, status=status.HTTP_404_NOT_FOUND)

        if not appointment.is_cancellable:
            return Response(
                {"error": f"Cannot cancel an appointment with status '{appointment.get_status_display()}'."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        reason = request.data.get('reason', 'Patient schedule change / personal reason').strip()
        refund_info = appointment.calculate_cancellation_refund()

        with transaction.atomic():
            appointment.status = 'cancelled'
            appointment.cancelled_by = 'patient'
            appointment.cancellation_reason = reason
            appointment.cancellation_fee = Decimal(refund_info['deduction_amount'])
            appointment.refund_amount = Decimal(refund_info['refund_amount'])
            if Decimal(refund_info['refund_amount']) > Decimal('0.00'):
                appointment.refund_status = 'full' if Decimal(refund_info['deduction_amount']) == Decimal('0.00') else 'partial'
            else:
                appointment.refund_status = 'none'
            appointment.cancelled_at = timezone.now()
            appointment.save(update_fields=[
                'status', 'cancelled_by', 'cancellation_reason',
                'cancellation_fee', 'refund_amount', 'refund_status',
                'cancelled_at', 'updated_at'
            ])

            # Update linked payment status if exists
            payment = Payment.objects.filter(appointment=appointment).first()
            if payment:
                if Decimal(refund_info['refund_amount']) > Decimal('0.00'):
                    payment.status = 'refunded'
                payment.save(update_fields=['status', 'updated_at'])

            # Invalidate slots and dashboard caches for immediate live updates
            from django.core.cache import cache
            cache.clear()

        try:
            send_cancellation_notification(appointment, refund_info=refund_info)
        except Exception as e:
            print(f"Failed sending cancellation notification: {e}")

        return Response({
            "message": f"Appointment cancelled successfully. Net refund of ₹{appointment.refund_amount} has been initiated.",
            "refund_info": refund_info,
            "appointment": AppointmentSerializer(appointment).data,
        })


class RescheduleAppointmentView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, appointment_id):
        appointment = get_object_or_404(
            Appointment.objects.select_related('doctor', 'slot'),
            id=appointment_id, patient=request.user
        )

        eligible, reason = appointment.check_reschedule_eligibility()
        if not eligible:
            return Response(
                {"error": reason},
                status=status.HTTP_400_BAD_REQUEST
            )

        new_slot_id = request.data.get('new_slot_id')
        if new_slot_id:
            with transaction.atomic():
                new_slot = get_object_or_404(Slot.objects.select_for_update().select_related('doctor'), id=new_slot_id)
                if new_slot.is_past():
                    return Response({"error": "Cannot reschedule to a past slot."}, status=status.HTTP_400_BAD_REQUEST)
                if new_slot.is_full():
                    return Response({"error": "The selected slot is full (5/5 appointments booked). Please choose another slot."}, status=status.HTTP_400_BAD_REQUEST)
                if new_slot.is_blocked:
                    return Response({"error": "The selected slot is blocked by hospital administration."}, status=status.HTTP_400_BAD_REQUEST)

                appointment.slot = new_slot
                appointment.status = 'confirmed'
                appointment.save(update_fields=['slot', 'status', 'updated_at'])

                # Invalidate doctor slots and dashboard caches
                from django.core.cache import cache
                cache.clear()

                return Response({
                    "message": f"Appointment successfully rescheduled to {new_slot.date} at {new_slot.start_time.strftime('%H:%M')}.",
                    "appointment": AppointmentSerializer(appointment).data
                })

        return Response({
            "message": "Please select a new slot to complete the reschedule.",
            "doctor_id": appointment.doctor.id
        })


class AppointmentCheckInView(APIView):
    """Hospital staff / Admin acknowledges patient entry/arrival at OP."""
    permission_classes = [IsHospitalOrAdminRole]

    def post(self, request, appointment_id):
        try:
            appointment = Appointment.objects.select_related('doctor', 'slot', 'patient').get(id=appointment_id)
        except Appointment.DoesNotExist:
            return Response({"error": "Appointment not found."}, status=status.HTTP_404_NOT_FOUND)

        appointment.op_checked_in = True
        appointment.op_checked_in_at = timezone.now()
        appointment.save(update_fields=['op_checked_in', 'op_checked_in_at', 'updated_at'])

        # Invalidate dashboard stats cache
        from django.core.cache import cache
        cache.clear()

        return Response({
            "message": f"Patient '{appointment.patient_name or appointment.patient.username}' acknowledged and checked in at OP.",
            "appointment": AppointmentSerializer(appointment).data
        })


class AppointmentCompleteView(APIView):
    """Hospital staff / Admin marks consultation as completed."""
    permission_classes = [IsHospitalOrAdminRole]

    def post(self, request, appointment_id):
        try:
            appointment = Appointment.objects.select_related('doctor', 'slot', 'patient').get(id=appointment_id)
        except Appointment.DoesNotExist:
            return Response({"error": "Appointment not found."}, status=status.HTTP_404_NOT_FOUND)

        appointment.status = 'completed'
        appointment.completed_at = timezone.now()
        if not appointment.op_checked_in:
            appointment.op_checked_in = True
            appointment.op_checked_in_at = timezone.now()
        appointment.save(update_fields=['status', 'completed_at', 'op_checked_in', 'op_checked_in_at', 'updated_at'])

        # Invalidate dashboard stats cache
        from django.core.cache import cache
        cache.clear()

        return Response({
            "message": f"Consultation for '{appointment.patient_name or appointment.patient.username}' marked as COMPLETED. Patient can now submit review and rating.",
            "appointment": AppointmentSerializer(appointment).data
        })


class AppointmentReviewView(APIView):
    """Patient rates their consultation experience across Doctor, Hospital, and Management (1-5 stars) and leaves review comments."""
    permission_classes = [IsAuthenticated]

    def post(self, request, appointment_id):
        from django.db.models import Avg, Count, Q
        from .serializers import AppointmentReviewSerializer
        from doctors.models import Hospital

        appointment = get_object_or_404(
            Appointment.objects.select_related('doctor', 'doctor__hospital', 'slot'),
            id=appointment_id, patient=request.user
        )

        if appointment.status != 'completed':
            return Response(
                {"error": "Reviews can only be submitted after consultation is completed."},
                status=status.HTTP_400_BAD_REQUEST
            )

        serializer = AppointmentReviewSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        doc_r = serializer.validated_data.get('doctor_rating') or serializer.validated_data.get('rating') or 5
        hosp_r = serializer.validated_data.get('hospital_rating') or 5
        mgmt_r = serializer.validated_data.get('management_rating') or 5
        review_comment = serializer.validated_data.get('review_comment', '').strip()

        # Calculate overall rating average
        avg_rating = round((Decimal(doc_r) + Decimal(hosp_r) + Decimal(mgmt_r)) / Decimal('3.0'), 1)

        with transaction.atomic():
            appointment.doctor_rating = doc_r
            appointment.hospital_rating = hosp_r
            appointment.management_rating = mgmt_r
            appointment.rating = avg_rating
            appointment.review_comment = review_comment
            appointment.reviewed_at = timezone.now()
            appointment.is_reviewed = True
            appointment.save(update_fields=[
                'doctor_rating', 'hospital_rating', 'management_rating',
                'rating', 'review_comment', 'reviewed_at', 'is_reviewed', 'updated_at'
            ])

            # Recalculate doctor rating and total review count
            doctor = appointment.doctor
            if doctor:
                reviewed_appts = Appointment.objects.filter(
                    doctor=doctor, is_reviewed=True
                ).exclude(doctor_rating__isnull=True, rating__isnull=True)
                
                agg = reviewed_appts.aggregate(
                    avg_doc=Avg('doctor_rating'),
                    avg_all=Avg('rating'),
                    cnt=Count('id')
                )
                new_avg = agg['avg_doc'] or agg['avg_all'] or Decimal('4.8')
                new_cnt = agg['cnt'] or 0

                doctor.rating = round(Decimal(str(new_avg)), 1)
                doctor.total_reviews = new_cnt
                doctor.save(update_fields=['rating', 'total_reviews'])

                # Invalidate doctor caches
                from django.core.cache import cache
                cache.delete(f"doc_detail_{doctor.id}_{request.user.id}")
                cache.delete(f"doc_detail_{doctor.id}_anon")

            # Recalculate hospital rating and total reviews if hospital exists
            hospital_obj = doctor.hospital if (doctor and doctor.hospital) else None
            if not hospital_obj and doctor and doctor.hospital_name:
                hospital_obj = Hospital.objects.filter(name__iexact=doctor.hospital_name.strip()).first()

            if hospital_obj:
                hosp_appts = Appointment.objects.filter(
                    Q(doctor__hospital=hospital_obj) | Q(doctor__hospital_name__iexact=hospital_obj.name),
                    is_reviewed=True
                ).exclude(hospital_rating__isnull=True, rating__isnull=True)

                h_agg = hosp_appts.aggregate(
                    avg_hosp=Avg('hospital_rating'),
                    avg_all=Avg('rating'),
                    cnt=Count('id')
                )
                h_new_avg = h_agg['avg_hosp'] or h_agg['avg_all'] or Decimal('4.8')
                h_new_cnt = h_agg['cnt'] or 0

                hospital_obj.rating = round(Decimal(str(h_new_avg)), 1)
                hospital_obj.total_reviews = h_new_cnt
                hospital_obj.save(update_fields=['rating', 'total_reviews'])

        return Response({
            "message": f"Thank you for reviewing Dr. {doctor.name if doctor else ''} and the hospital! Your comprehensive feedback has been recorded.",
            "appointment": AppointmentSerializer(appointment).data,
            "doctor_rating": str(doctor.rating) if doctor else "5.0",
            "hospital_rating": str(hospital_obj.rating) if hospital_obj else "5.0",
        })


class AdminAppointmentListView(generics.ListAPIView):
    serializer_class = AppointmentSerializer
    permission_classes = [IsHospitalOrAdminRole]

    def get_queryset(self):
        user = self.request.user
        qs = (
            Appointment.objects.all()
            .select_related('patient', 'doctor', 'doctor__hospital', 'slot')
            .order_by('-created_at')
        )
        if user.role == 'hospital':
            if user.hospital:
                qs = qs.filter(Q(doctor__hospital=user.hospital) | Q(doctor__hospital_name__iexact=user.hospital.name))
            elif user.hospital_name:
                qs = qs.filter(doctor__hospital_name__iexact=user.hospital_name)

        status_param = self.request.GET.get('status')
        if status_param and status_param != 'all':
            qs = qs.filter(status=status_param)

        search_param = self.request.GET.get('search')
        if search_param:
            qs = qs.filter(
                Q(patient_name__icontains=search_param) |
                Q(patient__username__icontains=search_param) |
                Q(patient__email__icontains=search_param) |
                Q(doctor__name__icontains=search_param) |
                Q(receipt_id__icontains=search_param)
            )

        return qs



class AdminAppointmentStatusUpdateView(APIView):
    permission_classes = [IsHospitalOrAdminRole]

    def patch(self, request, appointment_id):
        try:
            appointment = Appointment.objects.select_related('patient', 'doctor', 'slot').get(id=appointment_id)
        except Appointment.DoesNotExist:
            return Response({"error": "Appointment not found."}, status=status.HTTP_404_NOT_FOUND)

        new_status = request.data.get('status')
        reason = request.data.get('reason', 'Hospital / Admin operational schedule adjustment.').strip()
        valid_statuses = dict(Appointment.STATUS_CHOICES).keys()
        if new_status not in valid_statuses:
            return Response(
                {"error": f"Status must be one of {list(valid_statuses)}"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        with transaction.atomic():
            if new_status == 'cancelled' and appointment.status != 'cancelled':
                appointment.status = 'cancelled'
                appointment.cancelled_by = 'admin' if request.user.role == 'admin' else 'hospital'
                appointment.cancellation_reason = reason
                appointment.cancellation_fee = Decimal('0.00')
                appointment.refund_amount = appointment.fee_charged
                appointment.refund_status = 'full'
                appointment.cancelled_at = timezone.now()
                appointment.notes = f"[Cancelled by {request.user.role.capitalize()}: {reason}] {appointment.notes or ''}".strip()
                appointment.save(update_fields=[
                    'status', 'cancelled_by', 'cancellation_reason',
                    'cancellation_fee', 'refund_amount', 'refund_status',
                    'cancelled_at', 'notes', 'updated_at'
                ])
                # Refund payment
                payment = Payment.objects.filter(appointment=appointment).first()
                if payment:
                    payment.status = 'refunded'
                    payment.save(update_fields=['status', 'updated_at'])

                try:
                    send_cancellation_notification(appointment)
                except Exception as e:
                    print(f"Failed sending cancellation notification: {e}")
            else:
                appointment.status = new_status
                appointment.save(update_fields=['status', 'updated_at'])

        from django.core.cache import cache
        cache.clear()

        return Response(AppointmentSerializer(appointment).data)


class AdminSlotListView(APIView):
    """Admin and Hospital view to inspect, filter, and monitor all doctor slots with real-time capacity."""
    permission_classes = [IsHospitalOrAdminRole]

    def get(self, request):
        doctor_id = request.GET.get('doctor_id')
        hospital = request.GET.get('hospital', '').strip()
        if not hospital and request.user.role == 'hospital' and getattr(request.user, 'hospital_name', None):
            hospital = request.user.hospital_name.strip()
        date_str = request.GET.get('date', '').strip()
        status_filter = request.GET.get('status', 'all').strip()  # all, available, full, blocked
        search = request.GET.get('search', '').strip()
        page_number = request.GET.get('page', 1)
        page_size = int(request.GET.get('page_size', 12))

        today = timezone.localdate()

        qs = Slot.objects.select_related('doctor', 'doctor__hospital').annotate(
            booked_count=Count(
                'appointments',
                filter=Q(appointments__status__in=['pending', 'confirmed', 'completed']),
                distinct=True
            )
        )

        if doctor_id:
            qs = qs.filter(doctor_id=doctor_id)
        if hospital:
            qs = qs.filter(Q(doctor__hospital_name__icontains=hospital) | Q(doctor__hospital__name__icontains=hospital))
        if date_str:
            qs = qs.filter(date=date_str)
        else:
            # Default to showing today & future upcoming slots
            qs = qs.filter(date__gte=today)

        if search:
            qs = qs.filter(
                Q(doctor__name__icontains=search) |
                Q(doctor__hospital_name__icontains=search) |
                Q(doctor__hospital__name__icontains=search) |
                Q(doctor__specialization__icontains=search)
            )

        if status_filter == 'blocked':
            qs = qs.filter(is_blocked=True)
        elif status_filter == 'full':
            qs = qs.filter(booked_count__gte=F('max_capacity'), is_blocked=False)
        elif status_filter == 'available':
            qs = qs.filter(booked_count__lt=F('max_capacity'), is_blocked=False)

        qs = qs.order_by('date', 'start_time')

        paginator = Paginator(qs, page_size)
        page_obj = paginator.get_page(page_number)

        slots_data = []
        for slot in page_obj.object_list:
            h_name = slot.doctor.hospital_name or (slot.doctor.hospital.name if slot.doctor.hospital else 'CareConnect Hospital')
            slots_data.append({
                'id': slot.id,
                'doctor_id': slot.doctor.id,
                'doctor_name': slot.doctor.name,
                'doctor_specialization': slot.doctor.specialization,
                'hospital_name': h_name,
                'doctor_fee': str(slot.doctor.fee),
                'date': slot.date.strftime('%Y-%m-%d'),
                'start_time': slot.start_time.strftime('%H:%M'),
                'end_time': slot.end_time.strftime('%H:%M') if slot.end_time else '',
                'max_capacity': slot.max_capacity,
                'booked_count': slot.booked_count,
                'is_blocked': slot.is_blocked,
                'is_full': slot.booked_count >= slot.max_capacity,
                'is_past': slot.is_past(),
            })

        return Response({
            'count': paginator.count,
            'num_pages': paginator.num_pages,
            'current_page': page_obj.number,
            'has_next': page_obj.has_next(),
            'has_previous': page_obj.has_previous(),
            'results': slots_data,
        })


class AdminCancelSlotView(APIView):
    """
    Admin or Hospital Management cancels/blocks a particular slot.
    Supports 2 resolution options:
    1. 'auto_reschedule': Shifts affected patients to doctor's next available active slot and sends email with new schedule & sincere apologies.
    2. 'cancel_refund': Cancels appointments with 100% Full Refund (₹0 deduction) and sends email with full refund confirmation & apologies.
    """
    permission_classes = [IsHospitalOrAdminRole]

    def post(self, request, slot_id):
        action = request.data.get('action', 'auto_reschedule')  # 'auto_reschedule' or 'cancel_refund'
        reason = request.data.get('reason', 'Emergency doctor unavailability or hospital administrative schedule adjustment.').strip()
        target_slot_id = request.data.get('target_slot_id')

        try:
            slot = Slot.objects.select_related('doctor').get(id=slot_id)
        except Slot.DoesNotExist:
            return Response({"error": "Slot not found."}, status=status.HTTP_404_NOT_FOUND)

        with transaction.atomic():
            # Mark original slot as blocked
            slot.is_blocked = True
            slot.save(update_fields=['is_blocked'])

            # Find all active appointments on this slot
            affected_appointments = list(
                Appointment.objects.select_related('patient', 'doctor', 'slot').filter(
                    slot=slot,
                    status__in=['pending', 'confirmed']
                )
            )

            rescheduled_list = []
            refunded_list = []

            # If auto-reschedule is requested, look for target or next available slot
            next_available_slot = None
            if action == 'auto_reschedule':
                if target_slot_id:
                    next_available_slot = Slot.objects.filter(id=target_slot_id, is_blocked=False).first()
                if not next_available_slot:
                    now_time = timezone.localtime()
                    next_available_slot = Slot.objects.filter(
                        doctor=slot.doctor,
                        date__gte=timezone.localdate(),
                        is_blocked=False
                    ).exclude(id=slot.id).annotate(
                        booked_count=Count('appointments', filter=Q(appointments__status__in=['pending', 'confirmed', 'completed']))
                    ).filter(booked_count__lt=5).order_by('date', 'start_time').first()

                for appt in affected_appointments:
                    if next_available_slot:
                        old_slot_info = f"{slot.date} at {slot.start_time.strftime('%H:%M')}"
                        appt.slot = next_available_slot
                        appt.notes = f"[Auto-rescheduled from {old_slot_info}: {reason}] {appt.notes or ''}".strip()
                        appt.save(update_fields=['slot', 'notes', 'updated_at'])
                        rescheduled_list.append({
                            'patient_name': appt.patient_name or appt.patient.username,
                            'email': appt.patient.email,
                            'new_slot': f"{next_available_slot.date} at {next_available_slot.start_time.strftime('%H:%M')}",
                        })
                        try:
                            send_admin_slot_cancellation_email(
                                appt, slot, reason=reason, is_auto_rescheduled=True, new_slot=next_available_slot
                            )
                        except Exception as e:
                            print(f"Failed sending slot reschedule email: {e}")
                    else:
                        action = 'cancel_refund'

            if action == 'cancel_refund':
                for appt in affected_appointments:
                    appt.status = 'cancelled'
                    appt.cancelled_by = 'admin' if request.user.role == 'admin' else 'hospital'
                    appt.cancellation_reason = reason
                    appt.cancellation_fee = Decimal('0.00')
                    appt.refund_amount = appt.fee_charged
                    appt.refund_status = 'full'
                    appt.cancelled_at = timezone.now()
                    appt.notes = f"[Slot cancelled with 100% full refund by {request.user.role.capitalize()}: {reason}] {appt.notes or ''}".strip()
                    appt.save(update_fields=[
                        'status', 'cancelled_by', 'cancellation_reason',
                        'cancellation_fee', 'refund_amount', 'refund_status',
                        'cancelled_at', 'notes', 'updated_at'
                    ])

                    # Refund payment if exists
                    payment = Payment.objects.filter(appointment=appt).first()
                    if payment:
                        payment.status = 'refunded'
                        payment.save(update_fields=['status', 'updated_at'])

                    refunded_list.append({
                        'patient_name': appt.patient_name or appt.patient.username,
                        'email': appt.patient.email,
                        'refund_amount': str(appt.fee_charged),
                    })

                    try:
                        send_admin_slot_cancellation_email(
                            appt, slot, reason=reason, is_auto_rescheduled=False, new_slot=None
                        )
                    except Exception as e:
                        print(f"Failed sending slot cancel email: {e}")

        from django.core.cache import cache
        cache.clear()

        res_msg = f"Slot on {slot.date} ({slot.start_time.strftime('%H:%M')}) has been blocked. "
        if rescheduled_list:
            res_msg += f"{len(rescheduled_list)} patient(s) auto-rescheduled to {next_available_slot.date} ({next_available_slot.start_time.strftime('%H:%M')}). "
        if refunded_list:
            res_msg += f"{len(refunded_list)} patient(s) granted 100% full refund with ₹0 deductions."

        return Response({
            "message": res_msg,
            "action_taken": action,
            "rescheduled_count": len(rescheduled_list),
            "refunded_count": len(refunded_list),
            "rescheduled_patients": rescheduled_list,
            "refunded_patients": refunded_list,
            "slot_id": slot.id,
            "is_blocked": slot.is_blocked,
        })


class AdminToggleSlotBlockView(APIView):
    """Admin or Hospital staff toggles block status on a slot."""
    permission_classes = [IsHospitalOrAdminRole]

    def post(self, request, slot_id):
        try:
            slot = Slot.objects.get(id=slot_id)
        except Slot.DoesNotExist:
            return Response({"error": "Slot not found."}, status=status.HTTP_404_NOT_FOUND)

        slot.is_blocked = not slot.is_blocked
        slot.save(update_fields=['is_blocked'])

        from django.core.cache import cache
        cache.clear()

        return Response({
            "message": f"Slot is now {'Blocked' if slot.is_blocked else 'Unblocked / Active'}.",
            "slot_id": slot.id,
            "is_blocked": slot.is_blocked,
        })


class AdminRescheduleAppointmentView(APIView):
    """Admin or Hospital staff reschedules an appointment to a new slot and sends confirmation email to patient."""
    permission_classes = [IsHospitalOrAdminRole]

    def post(self, request, appointment_id):
        new_slot_id = request.data.get('new_slot_id')
        admin_notes = request.data.get('notes', '').strip()

        if not new_slot_id:
            return Response({"error": "new_slot_id is required."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            appointment = Appointment.objects.select_related('doctor', 'slot', 'patient').get(id=appointment_id)
        except Appointment.DoesNotExist:
            return Response({"error": "Appointment not found."}, status=status.HTTP_404_NOT_FOUND)

        with transaction.atomic():
            new_slot = get_object_or_404(Slot.objects.select_for_update().select_related('doctor'), id=new_slot_id)

            if new_slot.is_past():
                return Response({"error": "Cannot reschedule to a past slot."}, status=status.HTTP_400_BAD_REQUEST)
            if new_slot.is_full():
                return Response({"error": "The selected target slot is full (5/5 patients booked). Please choose another."}, status=status.HTTP_400_BAD_REQUEST)
            if new_slot.is_blocked:
                return Response({"error": "The selected target slot is blocked/unavailable."}, status=status.HTTP_400_BAD_REQUEST)

            old_slot_info = f"{appointment.slot.date} at {appointment.slot.start_time.strftime('%H:%M')}"
            
            # Update appointment
            appointment.slot = new_slot
            appointment.doctor = new_slot.doctor
            if appointment.status in ['cancelled', 'expired', 'rescheduled']:
                appointment.status = 'confirmed'
            
            if admin_notes:
                appointment.notes = f"[Admin Rescheduled: {admin_notes}] {appointment.notes or ''}".strip()
            appointment.save(update_fields=['slot', 'doctor', 'status', 'notes', 'updated_at'])

            # Send email notification to patient
            try:
                send_admin_reschedule_email(appointment, old_slot_info=old_slot_info)
            except Exception as e:
                print(f"Failed sending admin reschedule email: {e}")

        from django.core.cache import cache
        cache.clear()

        return Response({
            "message": f"Appointment successfully rescheduled to {new_slot.date} at {new_slot.start_time.strftime('%H:%M')}.",
            "appointment": AppointmentSerializer(appointment).data,
        })


class AdminDashboardStatsView(APIView):
    permission_classes = [IsAdminRole]

    def get(self, request):
        from django.db.models import Sum
        from django.core.cache import cache

        bypass_cache = request.GET.get('refresh') in ['true', '1']
        cache_key = 'admin_dashboard_stats_data_v2'
        if not bypass_cache:
            cached = cache.get(cache_key)
            if cached is not None:
                return Response(cached)

        today = timezone.localdate()
        today_code = today.strftime('%a').lower()

        doc_slots_map = dict(Slot.objects.values_list('doctor_id').annotate(c=Count('id')))
        doc_appts_map = dict(
            Appointment.objects.filter(
                status__in=['pending', 'confirmed', 'completed']
            ).values_list('doctor_id').annotate(c=Count('id'))
        )

        doctors_qs = list(Doctor.objects.select_related('hospital').order_by('name'))

        doctors_stats = []
        hospital_stats = {}
        specializations_set = set()

        for doctor in doctors_qs:
            if doctor.specialization:
                specializations_set.add(doctor.specialization)

            d_slots = doc_slots_map.get(doctor.id, 0)
            d_appts = doc_appts_map.get(doctor.id, 0)
            avail_days_list = [d.strip().lower() for d in doctor.available_days.split(',') if d.strip()] if doctor.available_days else []
            is_avail_today = doctor.is_active and (today_code in avail_days_list)

            h_name = (doctor.hospital.name if doctor.hospital else doctor.hospital_name) or "CareConnect General Hospital"
            h_name = h_name.strip()
            if h_name not in hospital_stats:

                hospital_stats[h_name] = {
                    'hospital_name': h_name,
                    'total_slots': 0,
                    'booked_appts': 0,
                    'doctors_count': 0,
                    'active_doctors': 0,
                    'doctors': [],
                    'revenue': Decimal('0.00'),
                }
            hospital_stats[h_name]['total_slots'] += d_slots
            hospital_stats[h_name]['booked_appts'] += d_appts
            hospital_stats[h_name]['doctors_count'] += 1
            if doctor.is_active:
                hospital_stats[h_name]['active_doctors'] += 1
            hospital_stats[h_name]['doctors'].append({
                'id': doctor.id,
                'name': doctor.name,
                'specialization': doctor.specialization,
                'fee': str(doctor.fee),
                'total_slots': d_slots,
                'booked_appts': d_appts,
                'is_active': doctor.is_active,
                'is_available_today': is_avail_today,
            })

            doctors_stats.append({
                'doctor_id': doctor.id,
                'doctor_name': doctor.name,
                'specialization': doctor.specialization,
                'qualification': doctor.qualification,
                'experience_years': doctor.experience_years,
                'hospital_name': doctor.hospital_name or '',
                'contact_number': doctor.contact_number or '',
                'contact_email': doctor.contact_email or '',
                'clinic_address': doctor.clinic_address or '',
                'maps_url': doctor.get_google_maps_url(),
                'fee': str(doctor.fee),
                'total_slots': d_slots,
                'booked_appts': d_appts,
                'is_active': doctor.is_active,
                'is_available_today': is_avail_today,
                'available_days': doctor.available_days,
            })

        # Calculate revenue and occupancy rates per hospital
        for h_name, h_data in hospital_stats.items():
            occupancy = (h_data['booked_appts'] / (h_data['total_slots'] * 5) * 100) if h_data['total_slots'] > 0 else 0
            h_data['occupancy_rate'] = round(occupancy, 1)

        status_breakdown = dict(
            Appointment.objects.values('status')
            .annotate(count=Count('id'))
            .values_list('status', 'count')
        )

        recent_appointments = list(
            Appointment.objects.all()
            .select_related('patient', 'doctor', 'doctor__hospital', 'slot')
            .order_by('-created_at')[:10]
        )

        patients_list = list(User.objects.filter(role='patient').order_by('-date_joined')[:50])
        payments_list = list(
            Payment.objects.all()
            .select_related('patient', 'appointment', 'appointment__doctor', 'appointment__slot')
            .order_by('-created_at')[:50]
        )
        all_appointments = list(
            Appointment.objects.all()
            .select_related('patient', 'doctor', 'doctor__hospital', 'slot')
            .order_by('-slot__date', '-slot__start_time')[:100]
        )

        rev_agg = Payment.objects.filter(status='paid').aggregate(total=Sum('amount'))
        total_revenue = rev_agg['total'] or Decimal('0.00')

        payload = {
            'total_patients': len(patients_list) if len(patients_list) < 50 else User.objects.filter(role='patient').count(),
            'total_doctors': len(doctors_stats),
            'total_appointments': sum(status_breakdown.values()),
            'total_revenue': str(total_revenue),
            'status_breakdown': status_breakdown,
            'specializations': sorted(list(specializations_set)),
            'doctors_stats': doctors_stats,
            'hospital_stats': hospital_stats,
            'recent_appointments': AppointmentSerializer(recent_appointments, many=True).data,
            'patients_list': UserSerializer(patients_list, many=True).data,
            'payments_list': PaymentSerializer(payments_list, many=True).data,
            'all_appointments': AppointmentSerializer(all_appointments, many=True).data,
        }
        cache.set(cache_key, payload, timeout=60)
        return Response(payload)


class HospitalDashboardStatsView(APIView):
    """
    Dynamic Hospital Management Dashboard API with sub-second response optimization and query consolidation.
    """
    permission_classes = [IsHospitalOrAdminRole]

    def get(self, request):
        from datetime import timedelta
        from django.utils import timezone
        from django.db.models import Sum, Count, Q
        from django.core.cache import cache

        user = request.user

        # Query and filter parameters
        date_param = request.GET.get('date', '').strip()
        range_param = request.GET.get('range', 'all').strip()
        search_query = request.GET.get('search', '').strip()
        status_filter = request.GET.get('status', 'all').strip()
        doctor_id_filter = request.GET.get('doctor_id', '').strip()
        specialist_filter = request.GET.get('specialization', request.GET.get('specialist', '')).strip()
        op_status_filter = request.GET.get('op_status', 'all').strip() # 'all' | 'checked_in' | 'waiting' | 'completed' | 'cancelled'
        h_param = request.GET.get('hospital_name', request.GET.get('hospital_id', request.GET.get('hospital_slug', ''))).strip()

        user_hosp_id = (
            getattr(user, 'hospital_id', None)
            or getattr(user, 'hospital_name', '')
            or getattr(user, 'hospital_slug', '')
            or (f"user_{user.id}" if getattr(user, 'role', '') != 'admin' else "admin")
        )
        bypass_cache = request.GET.get('refresh') in ['true', '1']
        cache_raw = f"{user_hosp_id}_{h_param}_{date_param}_{range_param}_{status_filter}_{doctor_id_filter}_{specialist_filter}_{op_status_filter}_{search_query}"
        cache_key = f"hosp_stats_{hashlib.md5(cache_raw.encode('utf-8')).hexdigest()}"
        if not bypass_cache:
            cached = cache.get(cache_key)
            if cached is not None:
                return Response(cached)

        target_hospital_obj = None

        # 1. Check if user is hospital staff
        if user.role == 'hospital':
            if user.hospital:
                target_hospital_obj = user.hospital
            elif user.hospital_name:
                target_hospital_obj = Hospital.objects.filter(name__iexact=user.hospital_name.strip()).first()
            elif user.hospital_slug:
                target_hospital_obj = Hospital.objects.filter(slug=user.hospital_slug).first()

        # 2. If user is Admin or specific hospital query param is passed
        if not target_hospital_obj or (user.role == 'admin' and (request.GET.get('hospital_id') or request.GET.get('hospital_name') or request.GET.get('hospital_slug'))):
            h_id = request.GET.get('hospital_id')
            h_name = request.GET.get('hospital_name', '').strip()
            h_slug = request.GET.get('hospital_slug', '').strip()

            if h_id:
                target_hospital_obj = Hospital.objects.filter(id=h_id).first()
            elif h_slug:
                target_hospital_obj = Hospital.objects.filter(slug=h_slug).first()
            elif h_name:
                target_hospital_obj = Hospital.objects.filter(name__iexact=h_name).first()

        if not target_hospital_obj:
            target_hospital_obj = Hospital.objects.filter(is_active=True).first()

        target_hospital_name = target_hospital_obj.name if target_hospital_obj else "CareConnect General Hospital"


        # Doctors affiliated with this hospital
        if target_hospital_obj:
            hospital_doctors_qs = Doctor.objects.filter(
                Q(hospital=target_hospital_obj) | Q(hospital_name__iexact=target_hospital_name)
            )
        else:
            hospital_doctors_qs = Doctor.objects.filter(
                Q(hospital_name__iexact=target_hospital_name) | Q(hospital_name__icontains=target_hospital_name)
            )

        hospital_doctors = list(hospital_doctors_qs.select_related('hospital').annotate(
            total_slots=Count('slots', distinct=True),
            booked_appts=Count(
                'appointments',
                filter=Q(appointments__status__in=['pending', 'confirmed', 'completed']),
                distinct=True
            )
        ).order_by('name'))

        doc_ids = [d.id for d in hospital_doctors]
        today = timezone.localdate()

        base_appts = Appointment.objects.filter(doctor_id__in=doc_ids)

        # Consolidated Single Aggregate Query for All Metrics (1 query instead of 10)
        appt_metrics = base_appts.aggregate(
            total_patients=Count('id', filter=Q(status__in=['confirmed', 'completed', 'pending'])),
            today_inflow=Count('id', filter=Q(slot__date=today) | Q(created_at__date=today)),
            completed_count=Count('id', filter=Q(status='completed')),
            confirmed_count=Count('id', filter=Q(status='confirmed')),
            pending_count=Count('id', filter=Q(status='pending')),
            cancelled_count=Count('id', filter=Q(status='cancelled')),
            total_revenue=Sum('fee_charged', filter=Q(status__in=['confirmed', 'completed', 'pending'])),
        )

        total_patients_count = appt_metrics['total_patients'] or 0
        today_inflow = appt_metrics['today_inflow'] or 0
        completed_count = appt_metrics['completed_count'] or 0
        confirmed_count = appt_metrics['confirmed_count'] or 0
        pending_count = appt_metrics['pending_count'] or 0
        cancelled_count = appt_metrics['cancelled_count'] or 0
        total_revenue = appt_metrics['total_revenue'] or Decimal('0.00')

        # Filtered Appointments for the Patient Queue
        filtered_qs = base_appts.select_related('patient', 'doctor', 'doctor__hospital', 'slot')

        if date_param:
            filtered_qs = filtered_qs.filter(Q(slot__date=date_param) | Q(created_at__date=date_param))
        elif range_param == 'today':
            filtered_qs = filtered_qs.filter(Q(slot__date=today) | Q(created_at__date=today))
        elif range_param == 'yesterday':
            yesterday = today - timedelta(days=1)
            filtered_qs = filtered_qs.filter(Q(slot__date=yesterday) | Q(created_at__date=yesterday))
        elif range_param == 'upcoming_7':
            filtered_qs = filtered_qs.filter(slot__date__gte=today, slot__date__lte=today + timedelta(days=7))
        elif range_param == 'past_7':
            filtered_qs = filtered_qs.filter(Q(slot__date__gte=today - timedelta(days=7), slot__date__lte=today) | Q(created_at__date__gte=today - timedelta(days=7), created_at__date__lte=today))
        elif range_param == 'this_month':
            filtered_qs = filtered_qs.filter(Q(slot__date__year=today.year, slot__date__month=today.month) | Q(created_at__year=today.year, created_at__month=today.month))

        if status_filter and status_filter != 'all':
            filtered_qs = filtered_qs.filter(status=status_filter)

        if doctor_id_filter and doctor_id_filter != 'all':
            filtered_qs = filtered_qs.filter(doctor_id=doctor_id_filter)

        if specialist_filter and specialist_filter != 'all':
            filtered_qs = filtered_qs.filter(doctor__specialization__iexact=specialist_filter)

        if op_status_filter == 'checked_in':
            filtered_qs = filtered_qs.filter(op_checked_in=True)
        elif op_status_filter == 'waiting':
            filtered_qs = filtered_qs.filter(op_checked_in=False, status__in=['pending', 'confirmed'])
        elif op_status_filter == 'completed':
            filtered_qs = filtered_qs.filter(status='completed')
        elif op_status_filter == 'cancelled':
            filtered_qs = filtered_qs.filter(status='cancelled')

        if search_query:
            filtered_qs = filtered_qs.filter(
                Q(patient_name__icontains=search_query) |
                Q(patient__username__icontains=search_query) |
                Q(patient__email__icontains=search_query) |
                Q(doctor__name__icontains=search_query) |
                Q(receipt_id__icontains=search_query) |
                Q(patient_phone__icontains=search_query)
            )

        filtered_appts = list(filtered_qs.order_by('-slot__date', '-slot__start_time')[:100])

        # 14-day dynamic traffic trend timeline (Single-query aggregation by booking activity & visits)
        fourteen_days_ago = today - timedelta(days=14)
        traffic_raw = list(
            base_appts.filter(
                Q(created_at__date__gte=fourteen_days_ago, created_at__date__lte=today) |
                Q(slot__date__gte=fourteen_days_ago, slot__date__lte=today)
            ).values('created_at__date', 'slot__date', 'status', 'fee_charged')
        )
        traffic_by_date = {}
        for item in traffic_raw:
            d_str = str(item['created_at__date'] or item['slot__date'])
            if d_str not in traffic_by_date:
                traffic_by_date[d_str] = {'count': 0, 'revenue': Decimal('0.00')}
            traffic_by_date[d_str]['count'] += 1
            if item['status'] in ['confirmed', 'completed', 'pending']:
                traffic_by_date[d_str]['revenue'] += (item['fee_charged'] or Decimal('0.00'))

        traffic_trend = []
        for offset in range(13, -1, -1):
            day_dt = today - timedelta(days=offset)
            d_str = day_dt.strftime('%Y-%m-%d')
            d_data = traffic_by_date.get(d_str, {'count': 0, 'revenue': Decimal('0.00')})
            traffic_trend.append({
                'date': d_str,
                'label': day_dt.strftime('%b %d'),
                'count': d_data['count'],
                'revenue': str(d_data['revenue'])
            })

        # Real-time operational slots for hospital doctors with annotated booked count
        slots_qs = Slot.objects.filter(
            doctor_id__in=doc_ids, date__gte=today
        ).select_related('doctor').annotate(
            booked_count=Count(
                'appointments',
                filter=Q(appointments__status__in=['pending', 'confirmed', 'completed'])
            )
        ).order_by('date', 'start_time')
        if date_param:
            slots_qs = Slot.objects.filter(
                doctor_id__in=doc_ids, date=date_param
            ).select_related('doctor').annotate(
                booked_count=Count(
                    'appointments',
                    filter=Q(appointments__status__in=['pending', 'confirmed', 'completed'])
                )
            ).order_by('start_time')

        slots_list = []
        for slot in slots_qs[:35]:
            b_count = slot.booked_count
            slots_list.append({
                'id': slot.id,
                'doctor_id': slot.doctor.id,
                'doctor_name': slot.doctor.name,
                'doctor_specialization': slot.doctor.specialization,
                'date': slot.date.strftime('%Y-%m-%d'),
                'start_time': slot.start_time.strftime('%H:%M'),
                'end_time': slot.end_time.strftime('%H:%M') if slot.end_time else None,
                'max_capacity': slot.max_capacity,
                'booked_count': b_count,
                'is_full': b_count >= slot.max_capacity,
                'is_blocked': slot.is_blocked,
            })

        total_slots_count = sum(d.total_slots for d in hospital_doctors)
        total_booked_count = sum(d.booked_appts for d in hospital_doctors)
        occupancy_rate = round((total_booked_count / (total_slots_count * 5) * 100), 1) if total_slots_count > 0 else 0

        # Unique specializations list for hospital
        specializations_list = sorted(list(set(d.specialization for d in hospital_doctors if d.specialization)))

        # Dynamic hospitals list (cached for 10 minutes)
        all_hospitals_data = cache.get('all_hospitals_dropdown_data')
        if all_hospitals_data is None:
            all_hospitals_data = [{
                'id': h.id,
                'name': h.name,
                'slug': h.slug,
                'city': h.city,
                'address': h.address,
                'phone': h.contact_phone,
                'email': h.contact_email,
                'maps_url': h.get_google_maps_url(),
            } for h in Hospital.objects.filter(is_active=True).order_by('name')]
            cache.set('all_hospitals_dropdown_data', all_hospitals_data, timeout=600)

        hospital_info = {
            'id': target_hospital_obj.id if target_hospital_obj else None,
            'name': target_hospital_name,
            'slug': target_hospital_obj.slug if target_hospital_obj else 'careconnect',
            'address': target_hospital_obj.address if target_hospital_obj else '',
            'city': target_hospital_obj.city if target_hospital_obj else '',
            'state': target_hospital_obj.state if target_hospital_obj else '',
            'contact_phone': target_hospital_obj.contact_phone if target_hospital_obj else '',
            'contact_email': target_hospital_obj.contact_email if target_hospital_obj else '',
            'google_maps_url': target_hospital_obj.google_maps_url if target_hospital_obj else '',
            'maps_url': target_hospital_obj.get_google_maps_url() if target_hospital_obj else 'https://www.google.com/maps',
        }

        active_doctors_count = sum(1 for d in hospital_doctors if d.is_active)
        total_doctors_count = len(hospital_doctors)

        payload = {
            'hospital_name': target_hospital_name,
            'hospital_info': hospital_info,
            'all_hospitals': all_hospitals_data,
            'specializations': specializations_list,
            'metrics': {
                'total_patients': total_patients_count,
                'today_inflow': today_inflow,
                'completed_count': completed_count,
                'confirmed_count': confirmed_count,
                'pending_count': pending_count,
                'cancelled_count': cancelled_count,
                'total_revenue': str(total_revenue),
                'active_doctors_count': active_doctors_count,
                'total_doctors_count': total_doctors_count,
                'occupancy_rate': occupancy_rate,
                'filtered_count': len(filtered_appts),
            },
            'traffic_trend': traffic_trend,
            'appointments': AppointmentSerializer(filtered_appts, many=True).data,
            'doctors': DoctorSerializer(hospital_doctors, many=True, context={'request': request}).data,
            'slots': slots_list,
        }
        cache.set(cache_key, payload, timeout=30)
        return Response(payload)



