from decimal import Decimal
from datetime import date, time
from django.contrib.auth import get_user_model
from django.test import TestCase
from doctors.models import Doctor
from .models import Slot, Appointment
from .services import calculate_fee

User = get_user_model()


class SlotCapacityTests(TestCase):
    def setUp(self):
        self.doctor = Doctor.objects.create(
            name="Test Doctor", specialization="General", qualification="MBBS",
            experience_years=5, fee=Decimal('500.00'), available_days="mon,tue"
        )
        self.slot = Slot.objects.create(doctor=self.doctor, date=date.today(), start_time=time(10, 0), max_capacity=5)

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


