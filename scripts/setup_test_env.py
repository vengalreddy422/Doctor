import os
import sys

os.environ["DJANGO_ALLOW_ASYNC_UNSAFE"] = "true"
os.environ["DJANGO_SETTINGS_MODULE"] = "config.settings"
os.environ["ENV_FILE"] = ".env.test"
sys.path.insert(0, os.path.abspath("backend"))

import django
django.setup()

from django.contrib.auth import get_user_model
from doctors.models import Doctor, Hospital
from appointments.models import Slot, Coupon

User = get_user_model()

print("=== CareConnect Test Environment Setup & Verification ===")
print("Database: backend/test_careconnect.sqlite3")

# Ensure test users
users_to_ensure = [
    ("admin@careconnect.health", "superadmin", "AdminPass123!", "admin", True),
    ("hospital@careconnect.health", "careconnecthospital", "HospitalPass123!", "hospital", False),
    ("patient@careconnect.health", "careconnectpatient", "PatientPass123!", "patient", False),
    ("patient2@careconnect.health", "careconnectpatient2", "PatientPass123!", "patient", False),
]

for email, username, pwd, role, is_staff in users_to_ensure:
    u, created = User.objects.get_or_create(email=email, defaults={
        "username": username,
        "role": role,
        "is_verified": True,
        "is_staff": is_staff,
        "is_superuser": is_staff
    })
    u.set_password(pwd)
    u.role = role
    u.is_verified = True
    u.is_staff = is_staff
    u.is_superuser = is_staff
    u.save()
    print(f"[{'CREATED' if created else 'VERIFIED'}] User: {email} (role={role}, is_verified={u.is_verified})")

# Ensure Coupons
coupons_data = [
    ("WELCOME50", "Welcome 50% Off", "percentage", 50.00, 500.00, "first_booking"),
    ("FLAT100", "Flat Rs 100 Off", "flat", 100.00, None, "general"),
    ("LOYALTY20", "Milestone 20% Off", "percentage", 20.00, 300.00, "milestone"),
]

for code, title, disc_type, val, max_disc, c_type in coupons_data:
    c, created = Coupon.objects.get_or_create(code=code, defaults={
        "title": title,
        "discount_type": disc_type,
        "discount_value": val,
        "max_discount": max_disc,
        "is_active": True,
        "coupon_type": c_type
    })
    print(f"[{'CREATED' if created else 'VERIFIED'}] Coupon: {code} ({disc_type} {val})")

# Verify Counts
print(f"\nTotal Doctors: {Doctor.objects.count()}")
print(f"Total Hospitals: {Hospital.objects.count()}")
print(f"Total Slots: {Slot.objects.count()}")
print(f"Total Users: {User.objects.count()}")
print(f"Total Coupons: {Coupon.objects.count()}")
print("Setup complete and ready for testing.")
