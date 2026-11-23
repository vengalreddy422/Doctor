import datetime
import zoneinfo
from decimal import Decimal
from unittest.mock import patch
from django.utils import timezone
from django.contrib.auth import get_user_model
from django.test import TestCase, TransactionTestCase
from rest_framework.test import APIClient
from doctors.models import Doctor
from appointments.models import Slot, Appointment

User = get_user_model()
KOLKATA_TZ = zoneinfo.ZoneInfo("Asia/Kolkata")


class RescheduleBusinessRulesTests(TestCase):
    """
    Exhaustive tests for Reschedule Business Rules R1-R8, R10-R11 on PostgreSQL.
    """

    def setUp(self):
        self.client = APIClient()
        self.patient = User.objects.create_user(
            email="patient_reschedule@careconnect.health",
            username="patient_reschedule",
            password="Password123!",
            is_verified=True,
            role="patient"
        )
        self.other_patient = User.objects.create_user(
            email="other_patient@careconnect.health",
            username="other_patient",
            password="Password123!",
            is_verified=True,
            role="patient"
        )
        self.admin_user = User.objects.create_user(
            email="admin_reschedule@careconnect.health",
            username="admin_reschedule",
            password="Password123!",
            is_verified=True,
            role="admin",
            is_staff=True
        )

        self.doctor = Doctor.objects.create(
            name="Dr. Sameer Joshi",
            specialization="Cardiology",
            qualification="MD, DM Cardiology",
            experience_years=15,
            fee=Decimal("800.00"),
            available_days="mon,tue,wed,thu,fri,sat,sun",
            is_active=True
        )

        self.other_doctor = Doctor.objects.create(
            name="Dr. Priya Menon",
            specialization="Neurology",
            qualification="MD, DM Neurology",
            experience_years=12,
            fee=Decimal("1000.00"),
            available_days="mon,tue,wed,thu,fri,sat,sun",
            is_active=True
        )

        # Base future date 3 days ahead in Asia/Kolkata
        now_kolkata = timezone.now().astimezone(KOLKATA_TZ)
        self.future_date_1 = (now_kolkata + datetime.timedelta(days=3)).date()
        self.future_date_2 = (now_kolkata + datetime.timedelta(days=4)).date()

        self.slot_current = Slot.objects.create(
            doctor=self.doctor,
            date=self.future_date_1,
            start_time=datetime.time(10, 0),
            end_time=datetime.time(10, 30),
            max_capacity=5
        )

        self.slot_target = Slot.objects.create(
            doctor=self.doctor,
            date=self.future_date_2,
            start_time=datetime.time(14, 0),
            end_time=datetime.time(14, 30),
            max_capacity=5
        )

        self.appointment = Appointment.objects.create(
            patient=self.patient,
            doctor=self.doctor,
            slot=self.slot_current,
            fee_charged=self.doctor.fee,
            status='confirmed',
            patient_name='Self Patient'
        )

    # --------------------------------------------------------------------------
    # R1: One reschedule per appointment per calendar day (Asia/Kolkata)
    # --------------------------------------------------------------------------
    def test_r1_one_reschedule_per_calendar_day_enforced(self):
        """
        R1: First reschedule succeeds; second attempt on the same calendar day returns 400
        with next allowed time. Reschedule on subsequent calendar day is allowed.
        """
        self.client.force_authenticate(user=self.patient)

        # 1st attempt: should succeed
        res1 = self.client.post(
            f"/api/appointments/{self.appointment.id}/reschedule/",
            {"new_slot_id": self.slot_target.id}
        )
        self.assertEqual(res1.status_code, 200, res1.data)
        self.appointment.refresh_from_db()
        self.assertEqual(self.appointment.slot_id, self.slot_target.id)
        self.assertEqual(getattr(self.appointment, 'reschedule_count', 0), 1)
        self.assertIsNotNone(getattr(self.appointment, 'last_rescheduled_at', None))

        # 2nd attempt on the same day to another slot: must return 400
        slot_target_2 = Slot.objects.create(
            doctor=self.doctor,
            date=(timezone.now().astimezone(KOLKATA_TZ) + datetime.timedelta(days=5)).date(),
            start_time=datetime.time(16, 0),
            max_capacity=5
        )
        res2 = self.client.post(
            f"/api/appointments/{self.appointment.id}/reschedule/",
            {"new_slot_id": slot_target_2.id}
        )
        self.assertEqual(res2.status_code, 400)
        self.assertIn("reschedule", res2.data.get("error", "").lower())
        self.assertIn("calendar day", res2.data.get("error", "").lower())

        # Simulate next day in Asia/Kolkata
        yesterday_kolkata = timezone.now() - datetime.timedelta(days=1, hours=1)
        self.appointment.last_rescheduled_at = yesterday_kolkata
        self.appointment.save(update_fields=['last_rescheduled_at'])

        # Next day attempt: should now be allowed
        res3 = self.client.post(
            f"/api/appointments/{self.appointment.id}/reschedule/",
            {"new_slot_id": slot_target_2.id}
        )
        self.assertEqual(res3.status_code, 200)
        self.appointment.refresh_from_db()
        self.assertEqual(self.appointment.slot_id, slot_target_2.id)
        self.assertEqual(self.appointment.reschedule_count, 2)

    # --------------------------------------------------------------------------
    # R2: Rescheduling to the SAME slot is rejected (400)
    # --------------------------------------------------------------------------
    def test_r2_reschedule_to_same_slot_rejected(self):
        """
        R2: Rescheduling to the currently booked slot must return 400.
        """
        self.client.force_authenticate(user=self.patient)
        res = self.client.post(
            f"/api/appointments/{self.appointment.id}/reschedule/",
            {"new_slot_id": self.slot_current.id}
        )
        self.assertEqual(res.status_code, 400)
        self.assertIn("same slot", res.data.get("error", "").lower())

    # --------------------------------------------------------------------------
    # R3: Target slot must be: future, not blocked, not full, same doctor
    # --------------------------------------------------------------------------
    def test_r3_target_slot_validation(self):
        """
        R3: Validate future, not blocked, not full (5/5), and same doctor constraints.
        """
        self.client.force_authenticate(user=self.patient)

        # 1. Past slot
        past_slot = Slot.objects.create(
            doctor=self.doctor,
            date=datetime.date(2020, 1, 1),
            start_time=datetime.time(10, 0),
            max_capacity=5
        )
        res_past = self.client.post(
            f"/api/appointments/{self.appointment.id}/reschedule/",
            {"new_slot_id": past_slot.id}
        )
        self.assertEqual(res_past.status_code, 400)
        self.assertIn("past", res_past.data.get("error", "").lower())

        # 2. Blocked slot
        self.slot_target.is_blocked = True
        self.slot_target.save()
        res_blocked = self.client.post(
            f"/api/appointments/{self.appointment.id}/reschedule/",
            {"new_slot_id": self.slot_target.id}
        )
        self.assertEqual(res_blocked.status_code, 400)
        self.assertIn("blocked", res_blocked.data.get("error", "").lower())
        self.slot_target.is_blocked = False
        self.slot_target.save()

        # 3. Full slot (5/5)
        for i in range(5):
            p = User.objects.create_user(
                email=f"fill_patient_{i}@test.com",
                username=f"fill_p_{i}",
                password="Password123!"
            )
            Appointment.objects.create(
                patient=p,
                doctor=self.doctor,
                slot=self.slot_target,
                fee_charged=self.doctor.fee,
                status='confirmed'
            )
        res_full = self.client.post(
            f"/api/appointments/{self.appointment.id}/reschedule/",
            {"new_slot_id": self.slot_target.id}
        )
        self.assertEqual(res_full.status_code, 400)
        self.assertIn("completely booked", res_full.data.get("error", "").lower())

        # 4. Slot for a different doctor
        diff_doc_slot = Slot.objects.create(
            doctor=self.other_doctor,
            date=self.future_date_2,
            start_time=datetime.time(15, 0),
            max_capacity=5
        )
        res_diff_doc = self.client.post(
            f"/api/appointments/{self.appointment.id}/reschedule/",
            {"new_slot_id": diff_doc_slot.id}
        )
        self.assertEqual(res_diff_doc.status_code, 400)
        self.assertIn("doctor", res_diff_doc.data.get("error", "").lower())

    # --------------------------------------------------------------------------
    # R4: 10-hour rule at exact boundaries (9h59m, 10h00m, 10h01m)
    # --------------------------------------------------------------------------
    def test_r4_ten_hour_rule_exact_boundaries(self):
        """
        R4: 9h59m remaining rejected, 10h00m allowed, 10h01m allowed.
        """
        self.client.force_authenticate(user=self.patient)

        now_kolkata = timezone.now().astimezone(KOLKATA_TZ)

        # Case 1: 9 hours 59 minutes before slot start -> REJECTED
        slot_9h59m_dt = now_kolkata + datetime.timedelta(hours=9, minutes=59)
        slot_9h59m = Slot.objects.create(
            doctor=self.doctor,
            date=slot_9h59m_dt.date(),
            start_time=slot_9h59m_dt.time().replace(microsecond=0),
            max_capacity=5
        )
        appt_9h59m = Appointment.objects.create(
            patient=self.patient,
            doctor=self.doctor,
            slot=slot_9h59m,
            fee_charged=self.doctor.fee,
            status='confirmed'
        )
        res1 = self.client.post(
            f"/api/appointments/{appt_9h59m.id}/reschedule/",
            {"new_slot_id": self.slot_target.id}
        )
        self.assertEqual(res1.status_code, 400)
        self.assertIn("10 hours", res1.data.get("error", ""))

        # Case 2: 10 hours 00 minutes before slot start -> ALLOWED
        slot_10h00m_dt = now_kolkata + datetime.timedelta(hours=10, minutes=0)
        slot_10h00m = Slot.objects.create(
            doctor=self.doctor,
            date=slot_10h00m_dt.date(),
            start_time=slot_10h00m_dt.time().replace(microsecond=0),
            max_capacity=5
        )
        appt_10h00m = Appointment.objects.create(
            patient=self.patient,
            doctor=self.doctor,
            slot=slot_10h00m,
            fee_charged=self.doctor.fee,
            status='confirmed'
        )
        res2 = self.client.post(
            f"/api/appointments/{appt_10h00m.id}/reschedule/",
            {"new_slot_id": self.slot_target.id}
        )
        self.assertEqual(res2.status_code, 200, res2.data)

        # Case 3: 10 hours 01 minutes before slot start -> ALLOWED
        slot_10h01m_dt = now_kolkata + datetime.timedelta(hours=10, minutes=1)
        slot_10h01m = Slot.objects.create(
            doctor=self.doctor,
            date=slot_10h01m_dt.date(),
            start_time=slot_10h01m_dt.time().replace(microsecond=0),
            max_capacity=5
        )
        appt_10h01m = Appointment.objects.create(
            patient=self.patient,
            doctor=self.doctor,
            slot=slot_10h01m,
            fee_charged=self.doctor.fee,
            status='confirmed'
        )
        res3 = self.client.post(
            f"/api/appointments/{appt_10h01m.id}/reschedule/",
            {"new_slot_id": self.slot_target.id}
        )
        self.assertEqual(res3.status_code, 200, res3.data)

    # --------------------------------------------------------------------------
    # R5: Reject non-confirmed/pending (cancelled, completed, expired, checked-in)
    # --------------------------------------------------------------------------
    def test_r5_status_restrictions(self):
        """
        R5: Only pending/confirmed appointments can be rescheduled.
        Reject cancelled, completed, expired, checked-in, and in-consultation appointments.
        """
        self.client.force_authenticate(user=self.patient)

        # 1. Cancelled
        self.appointment.status = 'cancelled'
        self.appointment.save()
        res = self.client.post(
            f"/api/appointments/{self.appointment.id}/reschedule/",
            {"new_slot_id": self.slot_target.id}
        )
        self.assertEqual(res.status_code, 400)

        # 2. Completed
        self.appointment.status = 'completed'
        self.appointment.save()
        res = self.client.post(
            f"/api/appointments/{self.appointment.id}/reschedule/",
            {"new_slot_id": self.slot_target.id}
        )
        self.assertEqual(res.status_code, 400)

        # 3. Expired
        self.appointment.status = 'expired'
        self.appointment.save()
        res = self.client.post(
            f"/api/appointments/{self.appointment.id}/reschedule/",
            {"new_slot_id": self.slot_target.id}
        )
        self.assertEqual(res.status_code, 400)

        # 4. Checked-in (op_checked_in = True)
        self.appointment.status = 'confirmed'
        self.appointment.op_checked_in = True
        self.appointment.save()
        res = self.client.post(
            f"/api/appointments/{self.appointment.id}/reschedule/",
            {"new_slot_id": self.slot_target.id}
        )
        self.assertEqual(res.status_code, 400)
        self.assertIn("check", res.data.get("error", "").lower())

    # --------------------------------------------------------------------------
    # R6: Patient IDOR, Anonymous 401, Admin override
    # --------------------------------------------------------------------------
    def test_r6_permissions_and_admin_override(self):
        """
        R6: Another patient gets 403/404; anonymous gets 401; admin override works and logs.
        """
        # Anonymous
        self.client.logout()
        res_anon = self.client.post(
            f"/api/appointments/{self.appointment.id}/reschedule/",
            {"new_slot_id": self.slot_target.id}
        )
        self.assertEqual(res_anon.status_code, 401)

        # Other patient (IDOR)
        self.client.force_authenticate(user=self.other_patient)
        res_other = self.client.post(
            f"/api/appointments/{self.appointment.id}/reschedule/",
            {"new_slot_id": self.slot_target.id}
        )
        self.assertIn(res_other.status_code, [403, 404])

        # Admin override
        self.client.force_authenticate(user=self.admin_user)
        res_admin = self.client.post(
            f"/api/appointments/{self.appointment.id}/reschedule/",
            {"new_slot_id": self.slot_target.id}
        )
        self.assertEqual(res_admin.status_code, 200, res_admin.data)
        self.appointment.refresh_from_db()
        self.assertEqual(self.appointment.slot_id, self.slot_target.id)

    # --------------------------------------------------------------------------
    # R7: Patient cannot reschedule into slot where they already hold an appointment
    # --------------------------------------------------------------------------
    def test_r7_prevent_duplicate_booking_in_target_slot(self):
        """
        R7: Patient already holding an active appointment in target slot is rejected.
        """
        self.client.force_authenticate(user=self.patient)

        # Create another appointment for same patient in target slot
        Appointment.objects.create(
            patient=self.patient,
            doctor=self.doctor,
            slot=self.slot_target,
            fee_charged=self.doctor.fee,
            status='confirmed'
        )

        res = self.client.post(
            f"/api/appointments/{self.appointment.id}/reschedule/",
            {"new_slot_id": self.slot_target.id}
        )
        self.assertEqual(res.status_code, 400)
        self.assertIn("already", res.data.get("error", "").lower())

    # --------------------------------------------------------------------------
    # R8: Atomic swap (old seat freed, new seat taken)
    # --------------------------------------------------------------------------
    def test_r8_atomic_swap(self):
        """
        R8: Old slot seat released, new slot seat claimed in one atomic transaction.
        """
        self.client.force_authenticate(user=self.patient)

        self.assertEqual(self.slot_current.booked_count(), 1)
        self.assertEqual(self.slot_target.booked_count(), 0)

        res = self.client.post(
            f"/api/appointments/{self.appointment.id}/reschedule/",
            {"new_slot_id": self.slot_target.id}
        )
        self.assertEqual(res.status_code, 200)

        self.assertEqual(self.slot_current.booked_count(), 0)
        self.assertEqual(self.slot_target.booked_count(), 1)

    # --------------------------------------------------------------------------
    # R10: Payment and receipt ID kept, refund tier based on new slot time
    # --------------------------------------------------------------------------
    def test_r10_payment_and_receipt_preserved_and_refund_tier_updated(self):
        """
        R10: Payment receipt ID and fee_charged remain identical, no new charge,
        and cancellation refund tier uses new slot date/time.
        """
        self.client.force_authenticate(user=self.patient)
        original_receipt_id = self.appointment.receipt_id
        original_fee = self.appointment.fee_charged

        res = self.client.post(
            f"/api/appointments/{self.appointment.id}/reschedule/",
            {"new_slot_id": self.slot_target.id}
        )
        self.assertEqual(res.status_code, 200)

        self.appointment.refresh_from_db()
        self.assertEqual(self.appointment.receipt_id, original_receipt_id)
        self.assertEqual(self.appointment.fee_charged, original_fee)

        refund_info = self.appointment.calculate_cancellation_refund()
        # self.slot_target is 4 days away (> 24 hrs) -> Tier 1
        self.assertEqual(refund_info['refund_percentage'], 100)
        self.assertEqual(refund_info['tier_code'], 'tier_1_full')

    # --------------------------------------------------------------------------
    # R11: Reschedule email sent to patient; email failure does not fail reschedule
    # --------------------------------------------------------------------------
    @patch("appointments.views.send_reschedule_notification")
    def test_r11_reschedule_email_sent_and_fault_tolerant(self, mock_email):
        """
        R11: Reschedule notification called with old & new slot info;
        exception in email sending does not abort reschedule.
        """
        self.client.force_authenticate(user=self.patient)

        # Test normal sending
        res = self.client.post(
            f"/api/appointments/{self.appointment.id}/reschedule/",
            {"new_slot_id": self.slot_target.id}
        )
        self.assertEqual(res.status_code, 200)
        mock_email.assert_called_once()

        # Test fault-tolerance when email service fails
        mock_email.side_effect = Exception("SMTP timeout error")
        slot_target_3 = Slot.objects.create(
            doctor=self.doctor,
            date=(timezone.now().astimezone(KOLKATA_TZ) + datetime.timedelta(days=6)).date(),
            start_time=datetime.time(11, 0),
            max_capacity=5
        )
        # Advance last_rescheduled_at to allow second day reschedule
        self.appointment.last_rescheduled_at = timezone.now() - datetime.timedelta(days=1)
        self.appointment.save()

        res2 = self.client.post(
            f"/api/appointments/{self.appointment.id}/reschedule/",
            {"new_slot_id": slot_target_3.id}
        )
        self.assertEqual(res2.status_code, 200)
        self.appointment.refresh_from_db()
        self.assertEqual(self.appointment.slot_id, slot_target_3.id)


class RescheduleConcurrencyTests(TransactionTestCase):
    """
    R9: Concurrency tests on PostgreSQL with row locks and multi-threading.
    """
    def setUp(self):
        self.patient = User.objects.create_user(
            email="patient_conc1@careconnect.health",
            username="patient_conc1",
            password="Password123!",
            is_verified=True,
            role="patient"
        )
        self.other_patient = User.objects.create_user(
            email="patient_conc2@careconnect.health",
            username="patient_conc2",
            password="Password123!",
            is_verified=True,
            role="patient"
        )
        self.doctor = Doctor.objects.create(
            name="Dr. Concurrency Doctor",
            specialization="Cardiology",
            qualification="MD",
            experience_years=10,
            fee=Decimal("700.00"),
            available_days="mon,tue,wed,thu,fri,sat,sun",
            is_active=True
        )
        now_kolkata = timezone.now().astimezone(KOLKATA_TZ)
        self.future_date = (now_kolkata + datetime.timedelta(days=3)).date()
        self.slot_current_1 = Slot.objects.create(
            doctor=self.doctor, date=self.future_date, start_time=datetime.time(9, 0), max_capacity=5
        )
        self.slot_current_2 = Slot.objects.create(
            doctor=self.doctor, date=self.future_date, start_time=datetime.time(10, 0), max_capacity=5
        )
        self.slot_target = Slot.objects.create(
            doctor=self.doctor, date=self.future_date, start_time=datetime.time(14, 0), max_capacity=5
        )
        self.appointment = Appointment.objects.create(
            patient=self.patient, doctor=self.doctor, slot=self.slot_current_1, fee_charged=self.doctor.fee, status='confirmed'
        )
        self.appt_2 = Appointment.objects.create(
            patient=self.other_patient, doctor=self.doctor, slot=self.slot_current_2, fee_charged=self.doctor.fee, status='confirmed'
        )

    def test_r9_concurrency_race_for_last_seat(self):
        """
        R9: Two patients simultaneously rescheduling into a slot with 1 seat remaining.
        Exactly one must succeed (200), and one must fail (400).
        """
        import concurrent.futures
        from django.db import connection

        # Fill 4 seats in slot_target (1 seat remaining)
        for i in range(4):
            u = User.objects.create_user(
                email=f"filler_c_{i}@test.com", username=f"filler_c_{i}", password="Password123!"
            )
            Appointment.objects.create(
                patient=u, doctor=self.doctor, slot=self.slot_target, fee_charged=self.doctor.fee, status='confirmed'
            )

        def attempt_reschedule(user, appt_id):
            connection.close()
            c = APIClient()
            c.force_authenticate(user=user)
            return c.post(
                f"/api/appointments/{appt_id}/reschedule/",
                {"new_slot_id": self.slot_target.id}
            )

        with concurrent.futures.ThreadPoolExecutor(max_workers=2) as executor:
            future1 = executor.submit(attempt_reschedule, self.patient, self.appointment.id)
            future2 = executor.submit(attempt_reschedule, self.other_patient, self.appt_2.id)
            res1 = future1.result()
            res2 = future2.result()

        status_codes = sorted([res1.status_code, res2.status_code])
        self.assertEqual(status_codes, [200, 400], f"Expected [200, 400], got {status_codes}")
        self.assertEqual(self.slot_target.booked_count(), 5)

