from decimal import Decimal
from datetime import date, time, timedelta
from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from doctors.models import Doctor
from appointments.models import Slot, Appointment
from payments.models import Payment

User = get_user_model()


class PaymentCancellationRegressionTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.patient = User.objects.create_user(
            email="patient_pay@example.com", username="patient_pay", password="Password123!", is_verified=True
        )
        self.client.force_authenticate(user=self.patient)

        self.doctor = Doctor.objects.create(
            name="Dr. Sharma", specialization="Cardiology", qualification="MBBS, MD",
            experience_years=10, fee=Decimal('1000.00'), available_days="mon,tue,wed,thu,fri,sat,sun"
        )
        self.future_date = date.today() + timedelta(days=5)
        self.slot = Slot.objects.create(
            doctor=self.doctor, date=self.future_date, start_time=time(10, 0), max_capacity=5
        )
        self.appointment = Appointment.objects.create(
            patient=self.patient, doctor=self.doctor, slot=self.slot,
            fee_charged=Decimal('1000.00'), status='confirmed'
        )
        self.payment = Payment.objects.create(
            appointment=self.appointment,
            patient=self.patient,
            razorpay_order_id="order_test_123",
            razorpay_payment_id="pay_test_456",
            amount=Decimal('1000.00'),
            status='paid'
        )

    def test_cancel_appointment_with_linked_payment_does_not_crash_on_updated_at(self):
        """Regression test for Bug 2.a: Ensure payment.save(update_fields=['status', 'updated_at']) succeeds."""
        response = self.client.post(f"/api/appointments/cancel/{self.appointment.id}/", {"reason": "Personal issue"})
        self.assertEqual(response.status_code, 200)

        self.appointment.refresh_from_db()
        self.assertEqual(self.appointment.status, "cancelled")

        self.payment.refresh_from_db()
        self.assertEqual(self.payment.status, "refunded")
        self.assertIsNotNone(self.payment.updated_at)
