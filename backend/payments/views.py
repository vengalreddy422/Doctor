import json
from decimal import Decimal, ROUND_HALF_UP
import razorpay.errors
from django.conf import settings
from django.core.paginator import Paginator
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, generics
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.authentication import SessionAuthentication
from rest_framework_simplejwt.authentication import JWTAuthentication

from appointments.models import Appointment
from appointments.notifications import send_payment_confirmation
from .models import Payment
from .serializers import PaymentSerializer, VerifyPaymentSerializer
from .utils import client


class CreateOrderView(APIView):
    authentication_classes = [JWTAuthentication, SessionAuthentication]
    permission_classes = [IsAuthenticated]

    def post(self, request, appointment_id):
        try:
            appointment = Appointment.objects.get(id=appointment_id, patient=request.user)
        except Appointment.DoesNotExist:
            return Response({"error": "Appointment not found"}, status=status.HTTP_404_NOT_FOUND)

        if hasattr(appointment, 'payment') and appointment.payment.status == 'paid':
            return Response({"error": "Already paid"}, status=status.HTTP_400_BAD_REQUEST)

        from decimal import Decimal, ROUND_HALF_UP
        amount_paise = int((appointment.fee_charged * Decimal('100')).quantize(Decimal('1'), rounding=ROUND_HALF_UP))

        order = client.order.create({
            "amount": amount_paise,
            "currency": "INR",
            "payment_capture": 1,
        })

        Payment.objects.update_or_create(
            appointment=appointment,
            defaults={
                "patient": request.user,
                "razorpay_order_id": order['id'],
                "amount": appointment.fee_charged,
                "status": "created",
            }
        )

        return Response({
            "order_id": order['id'],
            "amount": amount_paise,
            "currency": "INR",
            "key": client.auth[0],
        })


class VerifyPaymentView(APIView):
    authentication_classes = [JWTAuthentication, SessionAuthentication]
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = VerifyPaymentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        try:
            payment = Payment.objects.get(razorpay_order_id=data['razorpay_order_id'], patient=request.user)
        except Payment.DoesNotExist:
            return Response({"error": "Payment record not found"}, status=status.HTTP_404_NOT_FOUND)

        try:
            client.utility.verify_payment_signature({
                'razorpay_order_id': data['razorpay_order_id'],
                'razorpay_payment_id': data['razorpay_payment_id'],
                'razorpay_signature': data['razorpay_signature'],
            })
        except razorpay.errors.SignatureVerificationError:
            payment.status = 'failed'
            payment.save()
            return Response({"error": "Payment verification failed"}, status=status.HTTP_400_BAD_REQUEST)

        payment.razorpay_payment_id = data['razorpay_payment_id']
        payment.razorpay_signature = data['razorpay_signature']
        payment.status = 'paid'
        payment.save()

        payment.appointment.status = 'confirmed'
        payment.appointment.save(update_fields=['status', 'updated_at'])

        # Invalidate slots and dashboard stats caches for immediate live updates across Admin & Hospital panels
        from django.core.cache import cache
        cache.clear()

        # Trigger confirmation email
        send_payment_confirmation(payment.appointment)

        return Response({"message": "Payment verified successfully", "status": "paid"})


class MyPaymentHistoryView(APIView):
    authentication_classes = [JWTAuthentication, SessionAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        page_number = request.GET.get('page', 1)
        page_size = int(request.GET.get('page_size', 5))

        qs = (
            Payment.objects
            .filter(patient=request.user)
            .select_related('appointment__doctor', 'appointment__slot', 'patient')
            .order_by('-created_at')
        )
        paginator = Paginator(qs, page_size)
        page_obj = paginator.get_page(page_number)

        return Response({
            'count': paginator.count,
            'num_pages': paginator.num_pages,
            'current_page': page_obj.number,
            'has_next': page_obj.has_next(),
            'has_previous': page_obj.has_previous(),
            'results': PaymentSerializer(page_obj.object_list, many=True).data,
        })


class RazorpayWebhookView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    def post(self, request):
        webhook_signature = request.headers.get('X-Razorpay-Signature') or request.META.get('HTTP_X_RAZORPAY_SIGNATURE')
        if not webhook_signature:
            return Response({"error": "Missing webhook signature"}, status=status.HTTP_400_BAD_REQUEST)

        webhook_secret = getattr(settings, 'RAZORPAY_WEBHOOK_SECRET', '') or getattr(settings, 'RAZORPAY_KEY_SECRET', '')
        webhook_body = request.body.decode('utf-8')

        try:
            client.utility.verify_webhook_signature(webhook_body, webhook_signature, webhook_secret)
        except razorpay.errors.SignatureVerificationError:
            return Response({"error": "Invalid webhook signature"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            event_data = json.loads(webhook_body)
        except Exception:
            return Response({"error": "Invalid JSON body"}, status=status.HTTP_400_BAD_REQUEST)

        event = event_data.get('event')
        payload = event_data.get('payload', {})

        if event == 'payment.captured':
            payment_entity = payload.get('payment', {}).get('entity', {})
            order_id = payment_entity.get('order_id')
            payment_id = payment_entity.get('id')

            if order_id:
                payment = Payment.objects.filter(razorpay_order_id=order_id).first()
                if payment:
                    # Idempotency check: if already confirmed/paid, return 200 without duplicate action
                    if payment.status == 'paid' and payment.appointment.status == 'confirmed':
                        return Response({"status": "already_processed", "event": event}, status=status.HTTP_200_OK)

                    payment.razorpay_payment_id = payment_id
                    payment.status = 'paid'
                    payment.save(update_fields=['status', 'razorpay_payment_id', 'updated_at'])

                    payment.appointment.status = 'confirmed'
                    payment.appointment.save(update_fields=['status', 'updated_at'])

                    from django.core.cache import cache
                    cache.clear()

                    try:
                        send_payment_confirmation(payment.appointment)
                    except Exception as e:
                        print(f"[-] Webhook email dispatch error: {e}")

                    return Response({"status": "processed", "event": event}, status=status.HTTP_200_OK)

        elif event == 'payment.failed':
            payment_entity = payload.get('payment', {}).get('entity', {})
            order_id = payment_entity.get('order_id')

            if order_id:
                payment = Payment.objects.filter(razorpay_order_id=order_id).first()
                if payment and payment.status != 'paid':
                    payment.status = 'failed'
                    payment.save(update_fields=['status', 'updated_at'])
                    return Response({"status": "failed_recorded", "event": event}, status=status.HTTP_200_OK)

        elif event == 'refund.processed':
            refund_entity = payload.get('refund', {}).get('entity', {})
            payment_id = refund_entity.get('payment_id')
            refund_id = refund_entity.get('id')

            if payment_id:
                payment = Payment.objects.filter(razorpay_payment_id=payment_id).first()
                if payment:
                    payment.status = 'refunded'
                    if refund_id:
                        payment.razorpay_refund_id = refund_id
                    payment.save(update_fields=['status', 'razorpay_refund_id', 'updated_at'])
                    return Response({"status": "refund_recorded", "event": event}, status=status.HTTP_200_OK)

        return Response({"status": "ignored", "event": event}, status=status.HTTP_200_OK)


class AdminFailedRefundsListView(APIView):
    """Admin view listing all payments whose gateway refund failed, for administrative audit and manual retry."""
    authentication_classes = [JWTAuthentication, SessionAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if not (request.user.role == 'admin' or request.user.is_superuser or request.user.is_staff):
            return Response({"error": "Admin access required."}, status=status.HTTP_403_FORBIDDEN)

        failed_payments = (
            Payment.objects
            .filter(refund_status='failed')
            .select_related('appointment__doctor', 'patient')
            .order_by('-updated_at')
        )

        results = []
        for p in failed_payments:
            results.append({
                'payment_id': p.id,
                'appointment_id': p.appointment.id if p.appointment else None,
                'patient_name': p.patient.get_full_name() or p.patient.username,
                'patient_email': p.patient.email,
                'doctor_name': p.appointment.doctor.name if p.appointment and p.appointment.doctor else None,
                'amount': str(p.amount),
                'refund_amount': str(p.appointment.refund_amount) if p.appointment else str(p.amount),
                'razorpay_payment_id': p.razorpay_payment_id,
                'refund_status': p.refund_status,
                'refund_error': p.refund_error,
                'created_at': p.created_at.isoformat(),
                'updated_at': p.updated_at.isoformat(),
            })

        return Response({
            'count': len(results),
            'results': results,
        }, status=status.HTTP_200_OK)


class AdminRetryRefundView(APIView):
    """Admin endpoint to trigger a retry of a failed Razorpay gateway refund."""
    authentication_classes = [JWTAuthentication, SessionAuthentication]
    permission_classes = [IsAuthenticated]

    def post(self, request, payment_id):
        if not (request.user.role == 'admin' or request.user.is_superuser or request.user.is_staff):
            return Response({"error": "Admin access required."}, status=status.HTTP_403_FORBIDDEN)

        from django.db import transaction
        with transaction.atomic():
            payment = (
                Payment.objects
                .select_for_update()
                .select_related('appointment')
                .filter(id=payment_id)
                .first()
            )
            if not payment:
                return Response({"error": "Payment record not found."}, status=status.HTTP_404_NOT_FOUND)

            if payment.refund_status == 'processed':
                return Response({"error": "Refund has already been processed successfully."}, status=status.HTTP_400_BAD_REQUEST)

            if not payment.razorpay_payment_id:
                return Response({"error": "No valid gateway transaction ID to refund."}, status=status.HTTP_400_BAD_REQUEST)

            refund_amt = payment.appointment.refund_amount if payment.appointment else payment.amount
            if not refund_amt or Decimal(str(refund_amt)) <= Decimal('0.00'):
                return Response({"error": "Refund amount is zero; no gateway refund needed."}, status=status.HTTP_400_BAD_REQUEST)

            try:
                refund_paise = int((Decimal(str(refund_amt)) * Decimal('100')).quantize(Decimal('1'), rounding=ROUND_HALF_UP))
                refund_res = client.payment.refund(
                    payment.razorpay_payment_id,
                    {
                        "amount": refund_paise,
                        "notes": {
                            "payment_id": str(payment.id),
                            "appointment_id": str(payment.appointment.id) if payment.appointment else '',
                            "retried_by": request.user.email,
                            "idempotency_key": f"admin_retry_refund_{payment.id}_{payment.updated_at.timestamp()}"
                        }
                    }
                )
                payment.razorpay_refund_id = refund_res.get('id', '')
                payment.refund_status = 'processed'
                payment.status = 'refunded'
                payment.refund_error = ''
                payment.save(update_fields=['status', 'razorpay_refund_id', 'refund_status', 'refund_error', 'updated_at'])

                return Response({
                    "message": "Refund retried and processed successfully.",
                    "refund_id": payment.razorpay_refund_id,
                    "status": payment.refund_status
                }, status=status.HTTP_200_OK)

            except Exception as e:
                payment.refund_status = 'failed'
                payment.refund_error = str(e)
                payment.save(update_fields=['refund_status', 'refund_error', 'updated_at'])
                return Response({
                    "error": f"Gateway refund retry failed: {str(e)}",
                    "status": "failed"
                }, status=status.HTTP_502_BAD_GATEWAY)


