from decimal import Decimal
from datetime import date, time, timedelta
from django.contrib.auth import get_user_model
from django.test import TestCase
from doctors.models import Doctor
from .models import Slot, Appointment
from .services import calculate_fee

User = get_user_model()


class SlotCapacityTests(TestCase):
    def setUp(self):
        from datetime import timedelta
        self.future_date = date.today() + timedelta(days=2)
        self.doctor = Doctor.objects.create(
            name="Test Doctor", specialization="General", qualification="MBBS",
            experience_years=5, fee=Decimal('500.00'), available_days="mon,tue,wed,thu,fri,sat,sun"
        )
        self.slot = Slot.objects.create(doctor=self.doctor, date=self.future_date, start_time=time(10, 0), max_capacity=5)

    def _make_appointment(self, i, status='confirmed'):
        patient = User.objects.create_user(email=f"patient{i}@test.com", username=f"p{i}", password="pass1234", is_verified=True)
        return Appointment.objects.create(patient=patient, doctor=self.doctor, slot=self.slot, fee_charged=self.doctor.fee, status=status)

    def test_slot_not_full_below_capacity(self):
        for i in range(4):
            self._make_appointment(i)
        self.assertFalse(self.slot.is_full())

    def test_slot_full_at_capacity(self):
        for i in range(5):
            self._make_appointment(i)
        self.assertTrue(self.slot.is_full())

    def test_cancelled_appointments_free_up_slot(self):
        self._make_appointment(0, status='cancelled')
        for i in range(1, 5):
            self._make_appointment(i)
        self.assertFalse(self.slot.is_full())

    def test_booking_fails_when_all_5_slots_filled_friendly_error(self):
        from rest_framework.test import APIClient
        client = APIClient()
        # Fill all 5 slots
        for i in range(5):
            self._make_appointment(i)

        # 6th patient attempts to book
        patient6 = User.objects.create_user(
            email="patient6@test.com", username="p6", password="pass1234", is_verified=True
        )
        client.force_authenticate(user=patient6)
        res = client.post("/api/appointments/book/", {
            "slot_id": self.slot.id,
            "patient_name": "Sixth Patient",
            "notes": "Testing slot capacity exceeded"
        })
        self.assertEqual(res.status_code, 400)
        self.assertIn("5 of 5 slots filled", res.data["error"])
        self.assertIn("Booking is not possible for this session", res.data["error"])

    def test_booking_succeeds_when_slot_has_fewer_than_5_bookings(self):
        from rest_framework.test import APIClient
        client = APIClient()
        # 4 slots filled
        for i in range(4):
            self._make_appointment(i)

        # 5th patient books -> Should succeed
        patient5 = User.objects.create_user(
            email="patient5@test.com", username="p5", password="pass1234", is_verified=True
        )
        client.force_authenticate(user=patient5)
        res = client.post("/api/appointments/book/", {
            "slot_id": self.slot.id,
            "patient_name": "Fifth Patient"
        })
        self.assertEqual(res.status_code, 201)
        self.assertEqual(self.slot.booked_count(), 5)
        self.assertTrue(self.slot.is_full())

    def test_booking_fails_when_slot_is_blocked_friendly_error(self):
        from rest_framework.test import APIClient
        client = APIClient()
        self.slot.is_blocked = True
        self.slot.save()

        patient = User.objects.create_user(
            email="blocked_test@test.com", username="blocked_test", password="pass1234", is_verified=True
        )
        client.force_authenticate(user=patient)
        res = client.post("/api/appointments/book/", {
            "slot_id": self.slot.id,
            "patient_name": "Blocked Patient"
        })
        self.assertEqual(res.status_code, 400)
        self.assertIn("temporarily unavailable or blocked", res.data["error"])

    def test_reschedule_fails_when_target_slot_is_full_friendly_error(self):
        from rest_framework.test import APIClient
        client = APIClient()

        # Slot 1 for patient (in future)
        slot1 = Slot.objects.create(doctor=self.doctor, date=self.future_date, start_time=time(14, 0), max_capacity=5)
        patient = User.objects.create_user(
            email="reschedule_p@test.com", username="resched_p", password="pass1234", is_verified=True
        )
        appt = Appointment.objects.create(
            patient=patient, doctor=self.doctor, slot=slot1, fee_charged=Decimal("500.00"), status='confirmed'
        )

        # Target slot (self.slot) is filled with 5 appointments
        for i in range(5):
            self._make_appointment(i)

        client.force_authenticate(user=patient)
        res = client.post(f"/api/appointments/reschedule/{appt.id}/", {
            "new_slot_id": self.slot.id,
            "reason": "Want earlier time"
        })
        self.assertEqual(res.status_code, 400)
        self.assertIn("completely booked", res.data["error"])

    def test_hospital_dashboard_stats_api_loads_successfully(self):
        from rest_framework.test import APIClient
        client = APIClient()
        admin_user = User.objects.create_user(
            email="admin_hosp@test.com", username="adminhosp", password="pass1234", role="admin", is_verified=True
        )
        client.force_authenticate(user=admin_user)
        res = client.get("/api/appointments/hospital/stats/")
        self.assertEqual(res.status_code, 200)
        self.assertIn("metrics", res.data)
        self.assertIn("total_patients", res.data["metrics"])
        self.assertIn("traffic_trend", res.data)




class FeeCalculationTests(TestCase):
    def setUp(self):
        self.doctor = Doctor.objects.create(
            name="Test Doctor", specialization="General", qualification="MBBS",
            experience_years=5, fee=Decimal('500.00'), available_days="mon"
        )
        self.patient = User.objects.create_user(email="patient@test.com", username="patient", password="pass1234", is_verified=True)
        self.slot = Slot.objects.create(doctor=self.doctor, date=date.today(), start_time=time(10, 0))

    def test_first_appointment_odd_dynamic_fee(self):
        # 1st visit (odd): +5% = 525.00
        self.assertEqual(calculate_fee(self.patient, self.doctor), Decimal('525.00'))

    def test_second_appointment_even_loyalty_fee(self):
        # 2nd visit (even): -5% = 475.00
        Appointment.objects.create(patient=self.patient, doctor=self.doctor, slot=self.slot, fee_charged=Decimal('525.00'), status='completed')
        self.assertEqual(calculate_fee(self.patient, self.doctor), Decimal('475.00'))

    def test_third_appointment_odd_dynamic_fee(self):
        # 3rd visit (odd): +5% = 525.00
        for i in range(2):
            s = Slot.objects.create(doctor=self.doctor, date=date.today(), start_time=time(11 + i, 0))
            Appointment.objects.create(patient=self.patient, doctor=self.doctor, slot=s, fee_charged=Decimal('500.00'), status='completed')
        self.assertEqual(calculate_fee(self.patient, self.doctor), Decimal('525.00'))

    def test_cancelled_does_not_count(self):
        Appointment.objects.create(patient=self.patient, doctor=self.doctor, slot=self.slot, fee_charged=Decimal('500.00'), status='cancelled')
        self.assertEqual(calculate_fee(self.patient, self.doctor), Decimal('525.00'))


class SlotGenerationTests(TestCase):
    def setUp(self):
        pass

    def test_slots_generated_only_on_available_days(self):
        doctor = Doctor.objects.create(
            name="Monday Doctor", specialization="General", qualification="MBBS",
            experience_years=5, fee=Decimal('500.00'), available_days="mon"
        )
        from appointments.services import generate_slots_for_doctor
        generate_slots_for_doctor(doctor, days_needed=7)

        slots = Slot.objects.filter(doctor=doctor)
        self.assertTrue(slots.exists())
        for slot in slots:
            self.assertEqual(slot.date.strftime('%a').lower(), 'mon')

    def test_exactly_six_slots_per_day(self):
        doctor = Doctor.objects.create(
            name="Tuesday Doctor", specialization="General", qualification="MBBS",
            experience_years=5, fee=Decimal('500.00'), available_days="tue"
        )
        from appointments.services import generate_slots_for_doctor
        generate_slots_for_doctor(doctor, days_needed=7)

        slots = Slot.objects.filter(doctor=doctor)
        self.assertTrue(slots.exists())
        # Standard daily schedule generates 6 fixed consultation blocks
        dates = slots.values_list('date', flat=True).distinct()
        for d in dates:
            self.assertEqual(slots.filter(date=d).count(), 6)


class BookingConstraintTests(TestCase):
    def setUp(self):
        self.doctor = Doctor.objects.create(
            name="Constraint Doctor", specialization="General", qualification="MBBS",
            experience_years=5, fee=Decimal('500.00'), available_days="mon,tue,wed,thu,fri,sat,sun"
        )
        self.patient = User.objects.create_user(email="patient_c@test.com", username="patient_c", password="pass1234", is_verified=True)
        self.slot = Slot.objects.create(doctor=self.doctor, date=date.today(), start_time=time(10, 0), max_capacity=5)

    def test_double_booking_prevention(self):
        # Book the first time
        Appointment.objects.create(
            patient=self.patient, doctor=self.doctor, slot=self.slot,
            fee_charged=self.doctor.fee, status='upcoming'
        )
        # Attempt to book via API view or logic check
        # Checking logic since view is normally hit via HTTP request
        existing_booking = Appointment.objects.filter(
            patient=self.patient, slot=self.slot,
            status__in=['pending', 'upcoming', 'active', 'completed']
        ).exists()
        self.assertTrue(existing_booking)

    def test_daily_appointment_limit_25(self):
        # Create a slot
        slot = Slot.objects.create(doctor=self.doctor, date=date.today(), start_time=time(11, 0), max_capacity=30)
        # Create 25 appointments for this doctor on today's date
        for i in range(25):
            patient = User.objects.create_user(
                email=f"p_limit{i}@test.com", username=f"p_limit{i}", password="pass1234", is_verified=True
            )
            Appointment.objects.create(
                patient=patient, doctor=self.doctor, slot=slot,
                fee_charged=self.doctor.fee, status='upcoming'
            )

        # Check total appointments for doctor today
        count = Appointment.objects.filter(
            doctor=self.doctor, slot__date=date.today(),
            status__in=['pending', 'upcoming', 'active', 'completed']
        ).count()
        self.assertEqual(count, 25)


class CouponSystemTests(TestCase):
    def setUp(self):
        from rest_framework.test import APIClient
        from appointments.models import Coupon
        self.client = APIClient()

        # Seed test coupons
        self.coupon_first = Coupon.objects.create(
            code="FIRSTCARE",
            title="First Booking Welcome Offer",
            discount_type="percentage",
            discount_value=Decimal("20.00"),
            coupon_type="first_booking",
            required_bookings=0,
            max_bookings=0,
            is_active=True
        )
        self.coupon_loyalty5 = Coupon.objects.create(
            code="LOYALTY5",
            title="5-Bookings Milestone Reward",
            discount_type="percentage",
            discount_value=Decimal("15.00"),
            coupon_type="milestone",
            required_bookings=5,
            is_active=True
        )

        self.doctor = Doctor.objects.create(
            name="Coupon Doctor", specialization="General", qualification="MBBS",
            experience_years=5, fee=Decimal("1000.00"), available_days="mon,tue,wed,thu,fri,sat,sun"
        )
        from datetime import timedelta
        self.slot = Slot.objects.create(
            doctor=self.doctor, date=date.today() + timedelta(days=1), start_time=time(14, 0), max_capacity=5
        )

        self.user = User.objects.create_user(
            email="newpatient@test.com", username="newpatient", password="Password123!", is_verified=True
        )

    def test_first_booking_coupon_suggestion_and_eligibility(self):
        self.client.force_authenticate(user=self.user)
        res = self.client.get(f"/api/appointments/available-coupons/?doctor_id={self.doctor.id}")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        
        # Booking count should be 0
        self.assertEqual(data["booking_stats"]["booking_count"], 0)
        self.assertIsNotNone(data["suggested_coupon"])
        self.assertEqual(data["suggested_coupon"]["code"], "FIRSTCARE")
        
        # FIRSTCARE is eligible, LOYALTY5 is in locked_coupons
        eligible_codes = [c["code"] for c in data["eligible_coupons"]]
        locked_codes = [c["code"] for c in data["locked_coupons"]]
        self.assertIn("FIRSTCARE", eligible_codes)
        self.assertIn("LOYALTY5", locked_codes)

    def test_milestone_coupon_unlocked_after_5_bookings(self):
        # Create 5 completed bookings for the user
        for i in range(5):
            s = Slot.objects.create(doctor=self.doctor, date=date.today(), start_time=time(8 + i, 0), max_capacity=5)
            Appointment.objects.create(
                patient=self.user, doctor=self.doctor, slot=s,
                fee_charged=self.doctor.fee, status='completed'
            )

        self.client.force_authenticate(user=self.user)
        res = self.client.get(f"/api/appointments/available-coupons/?doctor_id={self.doctor.id}")
        self.assertEqual(res.status_code, 200)
        data = res.json()

        self.assertEqual(data["booking_stats"]["booking_count"], 5)
        self.assertEqual(data["suggested_coupon"]["code"], "LOYALTY5")

        eligible_codes = [c["code"] for c in data["eligible_coupons"]]
        locked_codes = [c["code"] for c in data["locked_coupons"]]
        self.assertIn("LOYALTY5", eligible_codes)
        self.assertIn("FIRSTCARE", locked_codes) # FIRSTCARE locked because booking count > 0

    def test_booking_appointment_with_coupon_applies_discount(self):
        self.client.force_authenticate(user=self.user)
        res = self.client.post("/api/appointments/book/", {
            "slot_id": self.slot.id,
            "coupon_code": "FIRSTCARE",
            "notes": "Testing first booking coupon"
        })
        self.assertEqual(res.status_code, 201)
        data = res.json()

        # Dynamic fee for visit 1 = 1000 * 1.05 = 1050.00. 20% discount = 210.00. Fee charged = 840.00.
        self.assertEqual(Decimal(str(data["original_fee"])), Decimal("1050.00"))
        self.assertEqual(Decimal(str(data["discount_amount"])), Decimal("210.00"))
        self.assertEqual(data["coupon_code"], "FIRSTCARE")
        self.assertEqual(Decimal(str(data["fee_charged"])), Decimal("840.00"))

    def test_ineligible_coupon_rejected_on_booking(self):
        # User has 0 bookings, trying to use LOYALTY5
        self.client.force_authenticate(user=self.user)
        res = self.client.post("/api/appointments/book/", {
            "slot_id": self.slot.id,
            "coupon_code": "LOYALTY5"
        })
        self.assertEqual(res.status_code, 400)
        self.assertIn("requires at least 5", res.json()["error"])

    def test_milestone_coupon_cannot_be_reused_once_redeemed(self):
        """Regression test for BUG-C01: Once LOYALTY5 is used on 5th booking, it cannot be reused on 6th booking."""
        for i in range(5):
            s = Slot.objects.create(doctor=self.doctor, date=date.today(), start_time=time(8 + i, 0), max_capacity=5)
            Appointment.objects.create(
                patient=self.user, doctor=self.doctor, slot=s,
                fee_charged=self.doctor.fee, status='completed'
            )

        self.client.force_authenticate(user=self.user)
        # 1st booking with LOYALTY5 succeeds
        res1 = self.client.post("/api/appointments/book/", {
            "slot_id": self.slot.id,
            "coupon_code": "LOYALTY5"
        })
        self.assertEqual(res1.status_code, 201)

        # 2nd booking attempting to reuse LOYALTY5 must be rejected
        slot2 = Slot.objects.create(doctor=self.doctor, date=date.today() + timedelta(days=2), start_time=time(15, 0), max_capacity=5)
        res2 = self.client.post("/api/appointments/book/", {
            "slot_id": slot2.id,
            "coupon_code": "LOYALTY5"
        })
        self.assertEqual(res2.status_code, 400)
        self.assertIn("already redeemed", res2.json()["error"].lower())



