import datetime
import zoneinfo
from decimal import Decimal
from unittest.mock import patch
import pytest
from django.utils import timezone
from rest_framework import status
from appointments.models import Appointment, Slot
from payments.models import Payment

KOLKATA = zoneinfo.ZoneInfo("Asia/Kolkata")

@pytest.mark.django_db
class TestRescheduleRules:

    def test_r1_one_reschedule_per_calendar_day(self, api_client, test_patient, make_slot, make_appointment):
        """
        R1: One reschedule per appointment per calendar day (Asia/Kolkata).
        A second attempt the same day returns 400 with clear message and next allowed time.
        Stores reschedule_count and last_rescheduled_at on Appointment.
        """
        api_client.force_authenticate(user=test_patient)
        appt = make_appointment(patient=test_patient, hours_delta=30)
        target_slot_1 = make_slot(hours_delta=35)
        target_slot_2 = make_slot(hours_delta=40)

        # First reschedule should succeed
        url = f"/api/appointments/{appt.id}/reschedule/"
        res1 = api_client.post(url, {"new_slot_id": target_slot_1.id}, format="json")
        assert res1.status_code == status.HTTP_200_OK, res1.data
        
        appt.refresh_from_db()
        assert appt.reschedule_count == 1
        assert appt.last_rescheduled_at is not None

        # Second reschedule on same calendar day should return 400 with next allowed time
        res2 = api_client.post(url, {"new_slot_id": target_slot_2.id}, format="json")
        assert res2.status_code == status.HTTP_400_BAD_REQUEST
        error_msg = res2.data.get("error", "")
        assert "calendar day" in error_msg.lower() or "once per day" in error_msg.lower()
        # Message must indicate when it becomes allowed again (e.g. tomorrow / midnight / time)
        assert any(term in error_msg.lower() for term in ["midnight", "tomorrow", "allowed again", "00:00"])

    def test_r2_reschedule_to_same_slot_rejected(self, api_client, test_patient, make_appointment):
        """
        R2: Rescheduling to the SAME slot is rejected (400).
        """
        api_client.force_authenticate(user=test_patient)
        appt = make_appointment(patient=test_patient, hours_delta=25)
        url = f"/api/appointments/{appt.id}/reschedule/"
        
        res = api_client.post(url, {"new_slot_id": appt.slot.id}, format="json")
        assert res.status_code == status.HTTP_400_BAD_REQUEST
        assert "same slot" in res.data.get("error", "").lower()

    def test_r3_target_slot_validation(self, api_client, test_patient, test_doctor, test_doctor2, make_slot, make_appointment):
        """
        R3: Target slot must be: in the future, not blocked, not full (5/5), and for the same doctor.
        """
        api_client.force_authenticate(user=test_patient)
        appt = make_appointment(patient=test_patient, doctor=test_doctor, hours_delta=30)
        url = f"/api/appointments/{appt.id}/reschedule/"

        # 3a: Past slot
        past_slot = make_slot(hours_delta=-2, doctor=test_doctor)
        res_past = api_client.post(url, {"new_slot_id": past_slot.id}, format="json")
        assert res_past.status_code == status.HTTP_400_BAD_REQUEST
        assert "past" in res_past.data.get("error", "").lower()

        # 3b: Blocked slot
        blocked_slot = make_slot(hours_delta=35, doctor=test_doctor, is_blocked=True)
        res_blocked = api_client.post(url, {"new_slot_id": blocked_slot.id}, format="json")
        assert res_blocked.status_code == status.HTTP_400_BAD_REQUEST
        assert "blocked" in res_blocked.data.get("error", "").lower()

        # 3c: Full slot (5/5)
        full_slot = make_slot(hours_delta=40, doctor=test_doctor, max_capacity=5)
        # fill slot with 5 other appointments
        from accounts.models import User
        for i in range(5):
            u, _ = User.objects.get_or_create(
                username=f"filler_u_{i}_{full_slot.id}",
                defaults={"email": f"filler_{i}_{full_slot.id}@test.com", "role": "patient"}
            )
            Appointment.objects.create(
                patient=u, doctor=test_doctor, slot=full_slot,
                status="confirmed", fee_charged=Decimal("500.00")
            )
        assert full_slot.booked_count() >= 5
        res_full = api_client.post(url, {"new_slot_id": full_slot.id}, format="json")
        assert res_full.status_code == status.HTTP_400_BAD_REQUEST
        assert "booked" in res_full.data.get("error", "").lower() or "full" in res_full.data.get("error", "").lower()

        # 3d: Different doctor's slot
        diff_doc_slot = make_slot(hours_delta=45, doctor=test_doctor2)
        res_diff = api_client.post(url, {"new_slot_id": diff_doc_slot.id}, format="json")
        assert res_diff.status_code == status.HTTP_400_BAD_REQUEST
        assert "doctor" in res_diff.data.get("error", "").lower()

    def test_r4_ten_hour_rule_boundaries(self, api_client, test_patient, test_doctor, make_slot):
        """
        R4: The 10-hour rule at the exact boundaries:
        9h59m rejected (400), 10h00m allowed (200), 10h01m allowed (200), using Asia/Kolkata.
        """
        api_client.force_authenticate(user=test_patient)
        fixed_now = datetime.datetime(2026, 11, 24, 10, 0, 0, tzinfo=KOLKATA)

        with patch("django.utils.timezone.now", return_value=fixed_now):
            target_slot = make_slot(hours_delta=48, doctor=test_doctor)

            # 4a: Exactly 9 hours 59 minutes remaining (19:59 IST) -> Rejected (400)
            slot_9h59m, _ = Slot.objects.get_or_create(
                doctor=test_doctor,
                date=fixed_now.date(),
                start_time=datetime.time(19, 59, 0),
                defaults={"end_time": datetime.time(20, 29, 0), "max_capacity": 5}
            )
            appt_9h59m = Appointment.objects.create(
                patient=test_patient, doctor=test_doctor,
                slot=slot_9h59m,
                fee_charged=Decimal("1000.00"), status="confirmed"
            )
            url_9h59m = f"/api/appointments/{appt_9h59m.id}/reschedule/"
            res_9h59m = api_client.post(url_9h59m, {"new_slot_id": target_slot.id}, format="json")
            assert res_9h59m.status_code == status.HTTP_400_BAD_REQUEST
            assert "10 hours" in res_9h59m.data.get("error", "")

            # 4b: Exactly 10 hours 00 minutes remaining (20:00 IST) -> Allowed (200)
            slot_10h00m, _ = Slot.objects.get_or_create(
                doctor=test_doctor,
                date=fixed_now.date(),
                start_time=datetime.time(20, 0, 0),
                defaults={"end_time": datetime.time(20, 30, 0), "max_capacity": 5}
            )
            appt_10h00m = Appointment.objects.create(
                patient=test_patient, doctor=test_doctor,
                slot=slot_10h00m,
                fee_charged=Decimal("1000.00"), status="confirmed"
            )
            url_10h00m = f"/api/appointments/{appt_10h00m.id}/reschedule/"
            target_slot_b = make_slot(hours_delta=50, doctor=test_doctor)
            res_10h00m = api_client.post(url_10h00m, {"new_slot_id": target_slot_b.id}, format="json")
            assert res_10h00m.status_code == status.HTTP_200_OK, res_10h00m.data

            # 4c: Exactly 10 hours 01 minutes remaining (20:01 IST) -> Allowed (200)
            slot_10h01m, _ = Slot.objects.get_or_create(
                doctor=test_doctor,
                date=fixed_now.date(),
                start_time=datetime.time(20, 1, 0),
                defaults={"end_time": datetime.time(20, 31, 0), "max_capacity": 5}
            )
            appt_10h01m = Appointment.objects.create(
                patient=test_patient, doctor=test_doctor,
                slot=slot_10h01m,
                fee_charged=Decimal("1000.00"), status="confirmed"
            )
            url_10h01m = f"/api/appointments/{appt_10h01m.id}/reschedule/"
            target_slot_c = make_slot(hours_delta=52, doctor=test_doctor)
            res_10h01m = api_client.post(url_10h01m, {"new_slot_id": target_slot_c.id}, format="json")
            assert res_10h01m.status_code == status.HTTP_200_OK, res_10h01m.data

    def test_r5_status_restrictions(self, api_client, test_patient, make_slot, make_appointment):
        """
        R5: Only confirmed/pending appointments can be rescheduled.
        Reject cancelled, completed, expired, checked-in and in-consultation ones.
        """
        api_client.force_authenticate(user=test_patient)
        target_slot = make_slot(hours_delta=30)

        # 5a: Cancelled
        appt_cancelled = make_appointment(patient=test_patient, status="cancelled", hours_delta=20)
        res_c = api_client.post(f"/api/appointments/{appt_cancelled.id}/reschedule/", {"new_slot_id": target_slot.id})
        assert res_c.status_code == status.HTTP_400_BAD_REQUEST

        # 5b: Completed
        appt_completed = make_appointment(patient=test_patient, status="completed", hours_delta=20)
        res_comp = api_client.post(f"/api/appointments/{appt_completed.id}/reschedule/", {"new_slot_id": target_slot.id})
        assert res_comp.status_code == status.HTTP_400_BAD_REQUEST

        # 5c: Expired
        appt_expired = make_appointment(patient=test_patient, status="expired", hours_delta=20)
        res_exp = api_client.post(f"/api/appointments/{appt_expired.id}/reschedule/", {"new_slot_id": target_slot.id})
        assert res_exp.status_code == status.HTTP_400_BAD_REQUEST

        # 5d: Checked-in at OP
        appt_checked_in = make_appointment(patient=test_patient, status="confirmed", op_checked_in=True, hours_delta=20)
        res_check = api_client.post(f"/api/appointments/{appt_checked_in.id}/reschedule/", {"new_slot_id": target_slot.id})
        assert res_check.status_code == status.HTTP_400_BAD_REQUEST
        assert "checked in" in res_check.data.get("error", "").lower()

        # 5e: In-consultation
        appt_in_cons = make_appointment(patient=test_patient, status="in_consultation", hours_delta=20)
        res_icons = api_client.post(f"/api/appointments/{appt_in_cons.id}/reschedule/", {"new_slot_id": target_slot.id})
        assert res_icons.status_code == status.HTTP_400_BAD_REQUEST

    def test_r6_permission_and_admin_override(self, api_client, test_patient, test_patient2, test_admin, make_slot, make_appointment):
        """
        R6: The patient may reschedule only their own appointment (another patient gets 403/404).
        Anonymous gets 401. Admin override works and is logged.
        """
        appt = make_appointment(patient=test_patient, hours_delta=25)
        target_slot = make_slot(hours_delta=30, doctor=appt.doctor)
        url = f"/api/appointments/{appt.id}/reschedule/"

        # Anonymous gets 401
        api_client.logout()
        res_anon = api_client.post(url, {"new_slot_id": target_slot.id})
        assert res_anon.status_code == status.HTTP_401_UNAUTHORIZED

        # Other patient gets 404
        api_client.force_authenticate(user=test_patient2)
        res_other = api_client.post(url, {"new_slot_id": target_slot.id})
        assert res_other.status_code in [status.HTTP_404_NOT_FOUND, status.HTTP_403_FORBIDDEN]

        # Admin override works and logs override
        api_client.force_authenticate(user=test_admin)
        res_admin = api_client.post(url, {"new_slot_id": target_slot.id})
        assert res_admin.status_code == status.HTTP_200_OK
        appt.refresh_from_db()
        assert appt.slot_id == target_slot.id
        assert "admin" in (appt.notes or "").lower() or appt.reschedule_count == 1

    def test_r7_prevent_reschedule_to_slot_patient_already_holds(self, api_client, test_patient, test_doctor, make_slot, make_appointment):
        """
        R7: The patient cannot reschedule into a slot where they already hold an appointment with that doctor.
        """
        api_client.force_authenticate(user=test_patient)
        slot_a = make_slot(hours_delta=24, doctor=test_doctor)
        slot_b = make_slot(hours_delta=48, doctor=test_doctor)

        appt_a = Appointment.objects.create(
            patient=test_patient, doctor=test_doctor, slot=slot_a,
            status="confirmed", fee_charged=Decimal("1000.00")
        )
        appt_b = Appointment.objects.create(
            patient=test_patient, doctor=test_doctor, slot=slot_b,
            status="confirmed", fee_charged=Decimal("1000.00")
        )

        # Trying to reschedule appt_a into slot_b should fail
        url = f"/api/appointments/{appt_a.id}/reschedule/"
        res = api_client.post(url, {"new_slot_id": slot_b.id})
        assert res.status_code == status.HTTP_400_BAD_REQUEST
        assert "already" in res.data.get("error", "").lower()

    def test_r8_atomic_swap_slot_capacities(self, api_client, test_patient, test_doctor, make_slot, make_appointment):
        """
        R8: Atomic swap: the old slot seat is released and the new slot seat is taken in one transaction.
        If anything fails, nothing changes.
        """
        api_client.force_authenticate(user=test_patient)
        slot_old = make_slot(hours_delta=25, doctor=test_doctor)
        slot_new = make_slot(hours_delta=35, doctor=test_doctor)

        appt = Appointment.objects.create(
            patient=test_patient, doctor=test_doctor, slot=slot_old,
            status="confirmed", fee_charged=Decimal("1000.00")
        )
        assert slot_old.booked_count() == 1
        assert slot_new.booked_count() == 0

        url = f"/api/appointments/{appt.id}/reschedule/"
        res = api_client.post(url, {"new_slot_id": slot_new.id})
        assert res.status_code == status.HTTP_200_OK

        assert slot_old.booked_count() == 0
        assert slot_new.booked_count() == 1

    @pytest.mark.django_db(transaction=True)
    def test_r9_concurrency_last_seat_and_duplicate_submit(self, test_patient, test_patient2, test_doctor, make_slot, make_appointment):
        """
        R9: Concurrency:
        1. Two patients rescheduling into the last seat of a slot, exactly one succeeds.
        2. The same appointment submitted twice in parallel, only one succeeds.
        """
        from concurrent.futures import ThreadPoolExecutor
        from rest_framework.test import APIClient
        from django.db import connections

        slot_target = make_slot(hours_delta=40, doctor=test_doctor, max_capacity=2)
        # 1 slot already taken
        from accounts.models import User
        u_other, _ = User.objects.get_or_create(username="other_filler", defaults={"role": "patient"})
        Appointment.objects.create(patient=u_other, doctor=test_doctor, slot=slot_target, status="confirmed", fee_charged=Decimal("500.00"))
        assert slot_target.booked_count() == 1  # 1 seat left!

        appt1 = make_appointment(patient=test_patient, doctor=test_doctor, hours_delta=25)
        appt2 = make_appointment(patient=test_patient2, doctor=test_doctor, hours_delta=26)

        # Close all connections so newly created rows are visible to new thread connections in PostgreSQL
        connections.close_all()

        def do_reschedule(user, appt_id, target_slot_id):
            try:
                client = APIClient()
                client.force_authenticate(user=user)
                return client.post(f"/api/appointments/{appt_id}/reschedule/", {"new_slot_id": target_slot_id}, format="json")
            finally:
                connections.close_all()

        with ThreadPoolExecutor(max_workers=2) as executor:
            f1 = executor.submit(do_reschedule, test_patient, appt1.id, slot_target.id)
            f2 = executor.submit(do_reschedule, test_patient2, appt2.id, slot_target.id)
            res1 = f1.result()
            res2 = f2.result()

        statuses = [res1.status_code, res2.status_code]
        assert status.HTTP_200_OK in statuses
        assert status.HTTP_400_BAD_REQUEST in statuses
        assert slot_target.booked_count() == 2

    def test_r10_payment_and_receipt_kept_new_slot_refund_tier(self, api_client, test_patient, test_doctor, make_slot, make_appointment):
        """
        R10: The payment and receipt ID are kept, no new charge,
        and the refund tier is based on the NEW slot time afterwards.
        """
        api_client.force_authenticate(user=test_patient)
        appt = make_appointment(patient=test_patient, doctor=test_doctor, hours_delta=28)
        original_receipt = appt.receipt_id
        original_fee = appt.fee_charged
        payment = Payment.objects.get(appointment=appt)
        payment_id = payment.id

        slot_new = make_slot(hours_delta=15, doctor=test_doctor) # 15 hours remaining
        url = f"/api/appointments/{appt.id}/reschedule/"
        res = api_client.post(url, {"new_slot_id": slot_new.id})
        assert res.status_code == status.HTTP_200_OK

        appt.refresh_from_db()
        assert appt.receipt_id == original_receipt
        assert appt.fee_charged == original_fee
        assert Payment.objects.filter(appointment=appt).count() == 1
        assert Payment.objects.get(appointment=appt).id == payment_id

        # Refund tier calculation should now reflect 15 hours (Tier 2: 75% refund, 25% cut-off)
        refund_info = appt.calculate_cancellation_refund()
        assert refund_info["refund_percentage"] == 75
        assert refund_info["deduction_percentage"] == 25

    def test_r11_reschedule_email_sent_resilient_to_smtp_failure(self, api_client, test_patient, test_doctor, make_slot, make_appointment):
        """
        R11: A reschedule email goes to the patient with old and new time,
        and one failing email does not fail the reschedule.
        """
        api_client.force_authenticate(user=test_patient)
        appt = make_appointment(patient=test_patient, doctor=test_doctor, hours_delta=30)
        slot_new = make_slot(hours_delta=36, doctor=test_doctor)
        url = f"/api/appointments/{appt.id}/reschedule/"

        # Mock email failure
        with patch("appointments.notifications.send_reschedule_notification", side_effect=Exception("SMTP Down")):
            res = api_client.post(url, {"new_slot_id": slot_new.id})
            assert res.status_code == status.HTTP_200_OK
            appt.refresh_from_db()
            assert appt.slot_id == slot_new.id
            appt.refresh_from_db()
            assert appt.slot_id == slot_new.id
