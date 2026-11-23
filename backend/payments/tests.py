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
        from unittest.mock import patch
        with patch("payments.utils.client.payment.refund", return_value={"id": "rfnd_mock_123"}):
            response = self.client.post(f"/api/appointments/cancel/{self.appointment.id}/", {"reason": "Personal issue"})
            self.assertEqual(response.status_code, 200)

            self.appointment.refresh_from_db()
            self.assertEqual(self.appointment.status, "cancelled")

            self.payment.refresh_from_db()
            self.assertIn(self.payment.status, ["refunded", "partially_refunded"])
            self.assertIsNotNone(self.payment.updated_at)

    def test_cancel_triggers_razorpay_refund_api_and_stores_refund_id(self):
        """Regression test for 2.b: Razorpay refund API call on cancellation."""
        from unittest.mock import patch

        mock_refund_response = {"id": "rfnd_test_7890", "amount": 100000, "status": "processed"}
        with patch("payments.utils.client.payment.refund", return_value=mock_refund_response) as mock_refund:
            response = self.client.post(f"/api/appointments/cancel/{self.appointment.id}/", {"reason": "Doctor change"})
            self.assertEqual(response.status_code, 200)

            mock_refund.assert_called_once()

            self.payment.refresh_from_db()
            self.assertEqual(self.payment.razorpay_refund_id, "rfnd_test_7890")
            self.assertEqual(self.payment.status, "refunded")
            self.assertEqual(self.payment.refund_error, "")

    def test_cancel_handles_razorpay_refund_api_failure_without_losing_cancellation(self):
        """Regression test for 2.b: API failure is handled gracefully without losing the cancellation."""
        from unittest.mock import patch
        import razorpay.errors

        with patch("payments.utils.client.payment.refund", side_effect=Exception("Razorpay gateway timeout")):
            response = self.client.post(f"/api/appointments/cancel/{self.appointment.id}/", {"reason": "Change of mind"})
            # Cancellation must still succeed for the user!
            self.assertEqual(response.status_code, 200)

            self.appointment.refresh_from_db()
            self.assertEqual(self.appointment.status, "cancelled")

            self.payment.refresh_from_db()
            self.assertEqual(self.payment.refund_error, "Razorpay gateway timeout")

    def test_cancel_appointment_double_click_idempotency_prevents_duplicate_refund(self):
        """Regression test for BUG-C04: Repeated cancellation calls do not invoke Razorpay refund API twice."""
        from unittest.mock import patch
        mock_refund_response = {"id": "rfnd_test_idempotent", "amount": 100000, "status": "processed"}

        with patch("payments.utils.client.payment.refund", return_value=mock_refund_response) as mock_refund:
            # 1st cancel request
            res1 = self.client.post(f"/api/appointments/cancel/{self.appointment.id}/", {"reason": "1st cancellation"})
            self.assertEqual(res1.status_code, 200)
            self.assertEqual(mock_refund.call_count, 1)

            # 2nd concurrent/repeated cancel request
            res2 = self.client.post(f"/api/appointments/cancel/{self.appointment.id}/", {"reason": "Duplicate cancellation"})
            self.assertEqual(res2.status_code, 400)
            self.assertIn("already been cancelled", res2.json()["error"].lower())

            # Refund API MUST NOT be called a second time
            self.assertEqual(mock_refund.call_count, 1)



class RazorpayWebhookRegressionTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.patient = User.objects.create_user(
            email="webhook_pat@example.com", username="webhook_pat", password="Password123!", is_verified=True
        )
        self.doctor = Doctor.objects.create(
            name="Dr. Webhook", specialization="Pediatrics", qualification="MBBS",
            experience_years=8, fee=Decimal('500.00'), available_days="mon,tue,wed,thu,fri,sat,sun"
        )
        self.slot = Slot.objects.create(
            doctor=self.doctor, date=date.today() + timedelta(days=3), start_time=time(11, 0), max_capacity=5
        )
        self.appointment = Appointment.objects.create(
            patient=self.patient, doctor=self.doctor, slot=self.slot,
            fee_charged=Decimal('500.00'), status='pending'
        )
        self.payment = Payment.objects.create(
            appointment=self.appointment,
            patient=self.patient,
            razorpay_order_id="order_wh_123",
            amount=Decimal('500.00'),
            status='created'
        )

    def test_webhook_missing_signature_returns_400(self):
        response = self.client.post("/api/payments/webhook/", {"event": "payment.captured"}, format="json")
        self.assertEqual(response.status_code, 400)
        self.assertIn("Missing webhook signature", response.data["error"])

    def test_webhook_invalid_signature_returns_400(self):
        import razorpay.errors
        from unittest.mock import patch

        with patch("payments.utils.client.utility.verify_webhook_signature", side_effect=razorpay.errors.SignatureVerificationError("Bad sig")):
            response = self.client.post(
                "/api/payments/webhook/",
                {"event": "payment.captured"},
                format="json",
                HTTP_X_RAZORPAY_SIGNATURE="invalid_sig"
            )
            self.assertEqual(response.status_code, 400)
            self.assertIn("Invalid webhook signature", response.data["error"])

    def test_webhook_payment_captured_happy_path_and_idempotency(self):
        """Valid payment.captured confirms pending appointment even if browser was closed."""
        from unittest.mock import patch

        payload = {
            "event": "payment.captured",
            "payload": {
                "payment": {
                    "entity": {
                        "id": "pay_captured_999",
                        "order_id": "order_wh_123",
                        "amount": 50000,
                        "status": "captured"
                    }
                }
            }
        }

        with patch("payments.utils.client.utility.verify_webhook_signature", return_value=True), \
             patch("appointments.notifications.send_email", return_value=True) as mock_email:
            # First delivery
            response1 = self.client.post(
                "/api/payments/webhook/",
                payload,
                format="json",
                HTTP_X_RAZORPAY_SIGNATURE="valid_sig_123"
            )
            self.assertEqual(response1.status_code, 200)
            self.assertEqual(response1.data["status"], "processed")

            self.payment.refresh_from_db()
            self.assertEqual(self.payment.status, "paid")
            self.assertEqual(self.payment.razorpay_payment_id, "pay_captured_999")

            self.appointment.refresh_from_db()
            self.assertEqual(self.appointment.status, "confirmed")
            mock_email.assert_called_once()

            # Second duplicate delivery (Idempotency)
            response2 = self.client.post(
                "/api/payments/webhook/",
                payload,
                format="json",
                HTTP_X_RAZORPAY_SIGNATURE="valid_sig_123"
            )
            self.assertEqual(response2.status_code, 200)
            self.assertEqual(response2.data["status"], "already_processed")
            # Email must NOT be called a second time
            self.assertEqual(mock_email.call_count, 1)

    def test_webhook_payment_failed_records_status(self):
        from unittest.mock import patch

        payload = {
            "event": "payment.failed",
            "payload": {
                "payment": {
                    "entity": {
                        "id": "pay_failed_111",
                        "order_id": "order_wh_123",
                        "amount": 50000,
                        "status": "failed"
                    }
                }
            }
        }

        with patch("payments.utils.client.utility.verify_webhook_signature", return_value=True):
            response = self.client.post(
                "/api/payments/webhook/",
                payload,
                format="json",
                HTTP_X_RAZORPAY_SIGNATURE="valid_sig_123"
            )
            self.assertEqual(response.status_code, 200)
            self.assertEqual(response.data["status"], "failed_recorded")

            self.payment.refresh_from_db()
            self.assertEqual(self.payment.status, "failed")


class AdminRefundManagementTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin = User.objects.create_user(
            email="superadmin@careconnect.health", username="superadmin", password="AdminPass123!", role="admin", is_staff=True, is_verified=True
        )
        self.patient = User.objects.create_user(
            email="regularpatient@test.com", username="regularpatient", password="PatientPass123!", role="patient", is_verified=True
        )
        self.doctor = Doctor.objects.create(
            name="Dr. Refund Test", specialization="Cardiology", qualification="MBBS, MD",
            experience_years=10, fee=Decimal('1000.00'), available_days="mon,tue,wed,thu,fri,sat,sun"
        )
        self.slot = Slot.objects.create(
            doctor=self.doctor, date=date.today() + timedelta(days=2), start_time=time(10, 0), max_capacity=5
        )
        self.appointment = Appointment.objects.create(
            patient=self.patient, doctor=self.doctor, slot=self.slot,
            fee_charged=Decimal('1000.00'), refund_amount=Decimal('1000.00'), status='cancelled'
        )
        self.payment = Payment.objects.create(
            appointment=self.appointment, patient=self.patient,
            razorpay_order_id="order_failed_refund_123", razorpay_payment_id="pay_failed_refund_456",
            amount=Decimal('1000.00'), status='paid', refund_status='failed', refund_error="Network timeout on gateway"
        )

    def test_admin_can_view_failed_refunds_list(self):
        self.client.force_authenticate(user=self.admin)
        res = self.client.get("/api/payments/admin/failed-refunds/")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["count"], 1)
        self.assertEqual(data["results"][0]["payment_id"], self.payment.id)
        self.assertEqual(data["results"][0]["refund_error"], "Network timeout on gateway")

    def test_regular_patient_forbidden_from_admin_failed_refunds(self):
        self.client.force_authenticate(user=self.patient)
        res = self.client.get("/api/payments/admin/failed-refunds/")
        self.assertEqual(res.status_code, 403)

    def test_admin_can_retry_failed_refund_successfully(self):
        from unittest.mock import patch
        mock_refund_data = {"id": "rfnd_retry_success_999", "amount": 100000, "status": "processed"}

        self.client.force_authenticate(user=self.admin)
        with patch("payments.utils.client.payment.refund", return_value=mock_refund_data) as mock_refund:
            res = self.client.post(f"/api/payments/admin/refunds/{self.payment.id}/retry/")
            self.assertEqual(res.status_code, 200)
            mock_refund.assert_called_once()

            self.payment.refresh_from_db()
            self.assertEqual(self.payment.refund_status, 'processed')
            self.assertEqual(self.payment.razorpay_refund_id, "rfnd_retry_success_999")
            self.assertEqual(self.payment.refund_error, "")

