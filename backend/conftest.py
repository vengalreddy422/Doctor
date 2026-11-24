import os
import zoneinfo
import datetime
from decimal import Decimal
import pytest
from django.conf import settings
from django.utils import timezone
from rest_framework.test import APIClient
from accounts.models import User
from doctors.models import Doctor, Hospital
from appointments.models import Slot, Appointment
from payments.models import Payment

KOLKATA = zoneinfo.ZoneInfo("Asia/Kolkata")

@pytest.fixture(scope='session')
def django_db_setup(django_db_blocker):
    """
    Directly use careconnect_isolated_test Postgres database without creating
    a temporary test_<dbname> database.
    """
    django_db_blocker.unblock()

@pytest.fixture
def api_client():
    return APIClient()

@pytest.fixture
def test_hospital(db):
    h, _ = Hospital.objects.get_or_create(
        name="Apollo Care Test Center",
        defaults={
            "city": "Bengaluru",
            "address": "100 Feet Rd, Indiranagar",
            "contact_email": "test-hospital@careconnect.health",
            "contact_phone": "+919876543210"
        }
    )
    return h

@pytest.fixture
def test_doctor(db, test_hospital):
    d, _ = Doctor.objects.get_or_create(
        contact_email="dr.sharma.test@careconnect.health",
        defaults={
            "name": "Dr. Rohit Sharma",
            "specialization": "Cardiology",
            "hospital": test_hospital,
            "hospital_name": test_hospital.name,
            "fee": Decimal("1000.00"),
            "experience_years": 15,
            "qualification": "MBBS, MD (Cardio)"
        }
    )
    return d

@pytest.fixture
def test_doctor2(db, test_hospital):
    d, _ = Doctor.objects.get_or_create(
        contact_email="dr.verma.test@careconnect.health",
        defaults={
            "name": "Dr. Priya Verma",
            "specialization": "Dermatology",
            "hospital": test_hospital,
            "hospital_name": test_hospital.name,
            "fee": Decimal("800.00"),
            "experience_years": 10,
            "qualification": "MBBS, MD (Derma)"
        }
    )
    return d

@pytest.fixture
def test_patient(db):
    u, _ = User.objects.get_or_create(
        email="patient.test1@careconnect.health",
        defaults={
            "username": "patient_test1",
            "first_name": "Aarav",
            "last_name": "Patel",
            "role": "patient",
            "is_verified": True
        }
    )
    u.set_password("SecurePass123!")
    u.save()
    return u

@pytest.fixture
def test_patient2(db):
    u, _ = User.objects.get_or_create(
        email="patient.test2@careconnect.health",
        defaults={
            "username": "patient_test2",
            "first_name": "Diya",
            "last_name": "Nair",
            "role": "patient",
            "is_verified": True
        }
    )
    u.set_password("SecurePass123!")
    u.save()
    return u

@pytest.fixture
def test_admin(db):
    u, _ = User.objects.get_or_create(
        email="admin.test@careconnect.health",
        defaults={
            "username": "admin_test",
            "first_name": "Admin",
            "last_name": "System",
            "role": "admin",
            "is_staff": True,
            "is_superuser": True,
            "is_verified": True
        }
    )
    u.set_password("AdminPass123!")
    u.save()
    return u

@pytest.fixture
def make_slot(db, test_doctor):
    """
    Factory to create a slot at a given delta from current time in Asia/Kolkata.
    """
    def _create_slot(hours_delta=24, minutes_delta=0, doctor=None, is_blocked=False, max_capacity=5):
        doc = doctor or test_doctor
        now_kol = timezone.now().astimezone(KOLKATA)
        target_dt = now_kol + datetime.timedelta(hours=hours_delta, minutes=minutes_delta)
        slot_date = target_dt.date()
        slot_time = datetime.time(target_dt.hour, target_dt.minute, 0)
        
        slot, _ = Slot.objects.get_or_create(
            doctor=doc,
            date=slot_date,
            start_time=slot_time,
            defaults={
                "end_time": (datetime.datetime.combine(slot_date, slot_time) + datetime.timedelta(minutes=30)).time(),
                "is_blocked": is_blocked,
                "max_capacity": max_capacity,
            }
        )
        if slot.is_blocked != is_blocked or slot.max_capacity != max_capacity:
            slot.is_blocked = is_blocked
            slot.max_capacity = max_capacity
            slot.save()
        return slot
    return _create_slot

@pytest.fixture
def make_appointment(db, make_slot, test_patient):
    """
    Factory to create an appointment with optional linked payment.
    """
    def _create_appointment(
        patient=None, doctor=None, slot=None,
        status='confirmed', fee=Decimal('1000.00'),
        paid=True, hours_delta=25, minutes_delta=0,
        op_checked_in=False
    ):
        p = patient or test_patient
        s = slot or make_slot(hours_delta=hours_delta, minutes_delta=minutes_delta, doctor=doctor)
        d = doctor or s.doctor
        
        appt = Appointment.objects.create(
            patient=p,
            doctor=d,
            slot=s,
            fee_charged=fee,
            original_fee=fee,
            status=status,
            op_checked_in=op_checked_in
        )
        if paid:
            Payment.objects.create(
                appointment=appt,
                patient=p,
                amount=fee,
                status='paid',
                razorpay_order_id=f"order_mock_{appt.id}",
                razorpay_payment_id=f"pay_mock_{appt.id}",
                razorpay_signature="mock_sig"
            )
        return appt
    return _create_appointment
