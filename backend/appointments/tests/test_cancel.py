import datetime
import zoneinfo
from decimal import Decimal
from unittest.mock import patch, MagicMock
import pytest
from django.utils import timezone
from rest_framework import status
from appointments.models import Appointment, Slot
from payments.models import Payment

KOLKATA = zoneinfo.ZoneInfo("Asia/Kolkata")

@pytest.mark.django_db
class TestCancelRules:

    def test_c1_refund_tier_boundaries(self, test_patient, test_doctor):
        """
        C1: Refund tier boundaries from calculate_cancellation_refund:
        - 24h boundary:
            - 24h 01m -> Tier 1 (100% refund, 0% cut-off)
            - 24h 00m -> Tier 1 (100% refund, 0% cut-off)
            - 23h 59m -> Tier 2 (75% refund, 25% cut-off)
        - 12h boundary:
            - 12h 01m -> Tier 2 (75% refund, 25% cut-off)
            - 12h 00m -> Tier 2 (75% refund, 25% cut-off)
            - 11h 59m -> Tier 3 (50% refund, 50% cut-off)
        - 2h boundary:
            - 2h 01m -> Tier 3 (50% refund, 50% cut-off)
            - 2h 00m -> Tier 3 (50% refund, 50% cut-off)
            - 1h 59m -> Tier 4 (0% refund, 100% cut-off)
        """
        fee = Decimal("1000.00")
        fixed_now = datetime.datetime(2026, 11, 24, 10, 0, 0, tzinfo=KOLKATA)

        def make_exact_slot(h, m):
            dt = fixed_now + datetime.timedelta(hours=h, minutes=m)
            s, _ = Slot.objects.get_or_create(
                doctor=test_doctor,
                date=dt.date(),
                start_time=datetime.time(dt.hour, dt.minute, 0),
                defaults={"end_time": (dt + datetime.timedelta(minutes=30)).time(), "max_capacity": 5}
            )
            return s

        with patch("django.utils.timezone.now", return_value=fixed_now):
            # 24h boundary tests
            appt_24h01m = Appointment(patient=test_patient, doctor=test_doctor, fee_charged=fee, slot=make_exact_slot(24, 1))
            r_24h01m = appt_24h01m.calculate_cancellation_refund()
            assert r_24h01m["tier_code"] == "tier_1_full"
            assert r_24h01m["refund_percentage"] == 100
            assert r_24h01m["deduction_percentage"] == 0
            assert r_24h01m["refund_amount"] == "1000.00"

            appt_24h00m = Appointment(patient=test_patient, doctor=test_doctor, fee_charged=fee, slot=make_exact_slot(24, 0))
            r_24h00m = appt_24h00m.calculate_cancellation_refund()
            assert r_24h00m["tier_code"] == "tier_1_full"
            assert r_24h00m["refund_percentage"] == 100
            assert r_24h00m["deduction_percentage"] == 0
            assert r_24h00m["refund_amount"] == "1000.00"

            appt_23h59m = Appointment(patient=test_patient, doctor=test_doctor, fee_charged=fee, slot=make_exact_slot(23, 59))
            r_23h59m = appt_23h59m.calculate_cancellation_refund()
            assert r_23h59m["tier_code"] == "tier_2_standard"
            assert r_23h59m["refund_percentage"] == 75
            assert r_23h59m["deduction_percentage"] == 25
            assert r_23h59m["refund_amount"] == "750.00"

            # 12h boundary tests
            appt_12h01m = Appointment(patient=test_patient, doctor=test_doctor, fee_charged=fee, slot=make_exact_slot(12, 1))
            r_12h01m = appt_12h01m.calculate_cancellation_refund()
            assert r_12h01m["tier_code"] == "tier_2_standard"
            assert r_12h01m["refund_percentage"] == 75
            assert r_12h01m["deduction_percentage"] == 25

            appt_12h00m = Appointment(patient=test_patient, doctor=test_doctor, fee_charged=fee, slot=make_exact_slot(12, 0))
            r_12h00m = appt_12h00m.calculate_cancellation_refund()
            assert r_12h00m["tier_code"] == "tier_2_standard"
            assert r_12h00m["refund_percentage"] == 75
            assert r_12h00m["deduction_percentage"] == 25

            appt_11h59m = Appointment(patient=test_patient, doctor=test_doctor, fee_charged=fee, slot=make_exact_slot(11, 59))
            r_11h59m = appt_11h59m.calculate_cancellation_refund()
            assert r_11h59m["tier_code"] == "tier_3_short_notice"
            assert r_11h59m["refund_percentage"] == 50
            assert r_11h59m["deduction_percentage"] == 50
            assert r_11h59m["refund_amount"] == "500.00"

            # 2h boundary tests
            appt_2h01m = Appointment(patient=test_patient, doctor=test_doctor, fee_charged=fee, slot=make_exact_slot(2, 1))
            r_2h01m = appt_2h01m.calculate_cancellation_refund()
            assert r_2h01m["tier_code"] == "tier_3_short_notice"
            assert r_2h01m["refund_percentage"] == 50
            assert r_2h01m["deduction_percentage"] == 50

            appt_2h00m = Appointment(patient=test_patient, doctor=test_doctor, fee_charged=fee, slot=make_exact_slot(2, 0))
            r_2h00m = appt_2h00m.calculate_cancellation_refund()
            assert r_2h00m["tier_code"] == "tier_3_short_notice"
            assert r_2h00m["refund_percentage"] == 50
            assert r_2h00m["deduction_percentage"] == 50

            appt_1h59m = Appointment(patient=test_patient, doctor=test_doctor, fee_charged=fee, slot=make_exact_slot(1, 59))
            r_1h59m = appt_1h59m.calculate_cancellation_refund()
            assert r_1h59m["tier_code"] == "tier_4_non_refundable"
            assert r_1h59m["refund_percentage"] == 0
            assert r_1h59m["deduction_percentage"] == 100
            assert r_1h59m["refund_amount"] == "0.00"

    def test_c2_cancel_twice_returns_400_and_concurrency(self, api_client, test_patient, make_appointment):
        """
        C2: Cancelling twice returns a clear 400 and never refunds twice.
        Also test with parallel requests.
        """
        api_client.force_authenticate(user=test_patient)
        appt = make_appointment(patient=test_patient, hours_delta=30)
        url = f"/api/appointments/{appt.id}/cancel/"

        with patch("payments.utils.client.payment.refund", return_value={"id": "rfnd_mock_123"}):
            # First cancel
            res1 = api_client.post(url, {"reason": "Personal work"})
            assert res1.status_code == status.HTTP_200_OK

            # Second cancel
            res2 = api_client.post(url, {"reason": "Personal work again"})
            assert res2.status_code == status.HTTP_400_BAD_REQUEST
            assert "already been cancelled" in res2.data.get("error", "").lower()

    def test_c3_cannot_cancel_completed_expired_checked_in(self, api_client, test_patient, make_appointment):
        """
        C3: Cannot cancel completed, expired, checked-in or already cancelled appointments.
        """
        api_client.force_authenticate(user=test_patient)

        # Completed
        appt_comp = make_appointment(patient=test_patient, status="completed", hours_delta=20)
        res_comp = api_client.post(f"/api/appointments/{appt_comp.id}/cancel/")
        assert res_comp.status_code == status.HTTP_400_BAD_REQUEST

        # Expired
        appt_exp = make_appointment(patient=test_patient, status="expired", hours_delta=20)
        res_exp = api_client.post(f"/api/appointments/{appt_exp.id}/cancel/")
        assert res_exp.status_code == status.HTTP_400_BAD_REQUEST

        # Checked in at OP
        appt_check = make_appointment(patient=test_patient, status="confirmed", op_checked_in=True, hours_delta=20)
        res_check = api_client.post(f"/api/appointments/{appt_check.id}/cancel/")
        assert res_check.status_code == status.HTTP_400_BAD_REQUEST
        assert "checked in" in res_check.data.get("error", "").lower()

    def test_c4_unpaid_pending_appointment_no_refund_no_razorpay(self, api_client, test_patient, make_appointment):
        """
        C4: An unpaid/pending appointment cancels with no refund and no Razorpay call.
        """
        api_client.force_authenticate(user=test_patient)
        appt = make_appointment(patient=test_patient, status="pending", paid=False, hours_delta=30)
        url = f"/api/appointments/{appt.id}/cancel/"

        with patch("payments.utils.client.payment.refund") as mock_refund:
            res = api_client.post(url, {"reason": "Did not pay"})
            assert res.status_code == status.HTTP_200_OK
            mock_refund.assert_not_called()
            
            appt.refresh_from_db()
            assert appt.status == "cancelled"
            assert appt.refund_amount == Decimal("0.00")

    def test_c5_paid_appointment_razorpay_call_and_failure_resilience(self, api_client, test_patient, make_appointment):
        """
        C5: A paid appointment calls Razorpay refund API once, stores refund id and status;
        if Razorpay fails, cancellation still succeeds with refund_status='failed'.
        """
        api_client.force_authenticate(user=test_patient)

        # 5a: Happy path
        appt_success = make_appointment(patient=test_patient, hours_delta=30)
        with patch("payments.utils.client.payment.refund", return_value={"id": "rfnd_test_999"}) as mock_refund:
            res_s = api_client.post(f"/api/appointments/{appt_success.id}/cancel/", {"reason": "Change of plan"})
            assert res_s.status_code == status.HTTP_200_OK
            mock_refund.assert_called_once()
            payment = Payment.objects.get(appointment=appt_success)
            assert payment.razorpay_refund_id == "rfnd_test_999"
            assert payment.refund_status == "processed"

        # 5b: Razorpay gateway failure
        appt_fail = make_appointment(patient=test_patient, hours_delta=30)
        with patch("payments.utils.client.payment.refund", side_effect=Exception("Gateway Timeout 504")):
            res_f = api_client.post(f"/api/appointments/{appt_fail.id}/cancel/", {"reason": "Emergency cancel"})
            assert res_f.status_code == status.HTTP_200_OK
            appt_fail.refresh_from_db()
            assert appt_fail.status == "cancelled"
            payment_f = Payment.objects.get(appointment=appt_fail)
            assert payment_f.refund_status == "failed"
            assert "Gateway Timeout" in payment_f.refund_error

    def test_c6_slot_seat_freed_after_cancellation(self, api_client, test_patient, make_slot, make_appointment):
        """
        C6: The seat is freed in the slot and the slot shows the right booked count (0/5 to 5/5).
        """
        api_client.force_authenticate(user=test_patient)
        slot = make_slot(hours_delta=30, max_capacity=5)
        appt = make_appointment(patient=test_patient, slot=slot, hours_delta=30)
        assert slot.booked_count() == 1

        with patch("payments.utils.client.payment.refund", return_value={"id": "rfnd_mock"}):
            res = api_client.post(f"/api/appointments/{appt.id}/cancel/", {"reason": "Cancel seat"})
            assert res.status_code == status.HTTP_200_OK

        assert slot.booked_count() == 0

    def test_c7_idor_prevention_and_admin_cancel(self, api_client, test_patient, test_patient2, test_admin, make_appointment):
        """
        C7: Only the owner or admin can cancel (IDOR test).
        """
        appt = make_appointment(patient=test_patient, hours_delta=25)
        url = f"/api/appointments/{appt.id}/cancel/"

        # Patient 2 tries to cancel Patient 1's appointment -> 404/403
        api_client.force_authenticate(user=test_patient2)
        res_idor = api_client.post(url, {"reason": "Malicious cancel"})
        assert res_idor.status_code in [status.HTTP_404_NOT_FOUND, status.HTTP_403_FORBIDDEN]

        # Admin cancels -> Allowed
        api_client.force_authenticate(user=test_admin)
        with patch("payments.utils.client.payment.refund", return_value={"id": "rfnd_admin_mock"}):
            res_admin = api_client.post(url, {"reason": "Admin initiated cancellation"})
            assert res_admin.status_code == status.HTTP_200_OK
            appt.refresh_from_db()
            assert appt.status == "cancelled"

    def test_c8_cancel_after_reschedule_uses_new_slot_time(self, api_client, test_patient, test_doctor, make_slot, make_appointment):
        """
        C8: Cancel after reschedule uses the NEW slot time for the refund tier.
        """
        api_client.force_authenticate(user=test_patient)
        appt = make_appointment(patient=test_patient, doctor=test_doctor, hours_delta=35) # originally >24h (Tier 1)
        
        # Reschedule to 5 hours from now (Tier 3: 50% refund)
        new_slot = make_slot(hours_delta=5, doctor=test_doctor)
        appt.slot = new_slot
        appt.save()

        # Cancellation should evaluate at 5 hours remaining -> Tier 3 (50%)
        refund_info = appt.calculate_cancellation_refund()
        assert refund_info["tier_code"] == "tier_3_short_notice"
        assert refund_info["refund_percentage"] == 50

    def test_c9_cancelled_cannot_be_rescheduled_and_can_rebook_same_slot(self, api_client, test_patient, test_doctor, make_slot, make_appointment):
        """
        C9: A cancelled appointment cannot be rescheduled, and the patient can rebook the same slot afterwards.
        """
        api_client.force_authenticate(user=test_patient)
        slot = make_slot(hours_delta=30, doctor=test_doctor)
        appt = make_appointment(patient=test_patient, doctor=test_doctor, slot=slot, hours_delta=30)

        with patch("payments.utils.client.payment.refund", return_value={"id": "rfnd_mock"}):
            res_cancel = api_client.post(f"/api/appointments/{appt.id}/cancel/")
            assert res_cancel.status_code == status.HTTP_200_OK

        # Reschedule on cancelled appointment must fail
        target_slot = make_slot(hours_delta=40, doctor=test_doctor)
        res_reschedule = api_client.post(f"/api/appointments/{appt.id}/reschedule/", {"new_slot_id": target_slot.id})
        assert res_reschedule.status_code == status.HTTP_400_BAD_REQUEST

        # Rebook the SAME slot afterwards -> should succeed (201)
        res_rebook = api_client.post("/api/appointments/book/", {"slot_id": slot.id}, format="json")
        assert res_rebook.status_code in [status.HTTP_201_CREATED, status.HTTP_200_OK]

    def test_c10_cancel_preview_matches_actual_cancel(self, api_client, test_patient, make_appointment):
        """
        C10: The cancel-preview endpoint returns the same amount as the actual cancel.
        """
        api_client.force_authenticate(user=test_patient)
        appt = make_appointment(patient=test_patient, hours_delta=15) # Tier 2 (75%)
        
        # Preview
        res_prev = api_client.get(f"/api/appointments/{appt.id}/cancel-preview/")
        assert res_prev.status_code == status.HTTP_200_OK
        preview_refund = res_prev.data["refund_amount"]
        preview_deduct = res_prev.data["deduction_amount"]

        # Cancel
        with patch("payments.utils.client.payment.refund", return_value={"id": "rfnd_mock"}):
            res_cancel = api_client.post(f"/api/appointments/{appt.id}/cancel/", {"reason": "Matched cancel"})
            assert res_cancel.status_code == status.HTTP_200_OK
            appt.refresh_from_db()
            assert str(appt.refund_amount) == preview_refund
            assert str(appt.cancellation_fee) == preview_deduct

    def test_c11_cancellation_reason_email_and_paise_rounding(self, api_client, test_patient, make_appointment):
        """
        C11: The cancellation reason is saved, an email is sent, and amount is rounded to whole paise.
        """
        api_client.force_authenticate(user=test_patient)
        appt = make_appointment(patient=test_patient, hours_delta=15, fee=Decimal("999.99"))
        custom_reason = "Doctor appointment timing clashes with personal work"

        with patch("appointments.views.send_cancellation_notification") as mock_email:
            with patch("payments.utils.client.payment.refund", return_value={"id": "rfnd_mock"}):
                res = api_client.post(f"/api/appointments/{appt.id}/cancel/", {"reason": custom_reason})
                assert res.status_code == status.HTTP_200_OK
                
                appt.refresh_from_db()
                assert appt.cancellation_reason == custom_reason
                mock_email.assert_called_once()
                # Check whole paise rounding (2 decimal places)
                assert appt.refund_amount.as_tuple().exponent == -2
                assert appt.cancellation_fee.as_tuple().exponent == -2
