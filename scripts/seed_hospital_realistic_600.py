import os
import sys
import datetime
import zoneinfo
from decimal import Decimal

# Force test environment pointing to careconnect_isolated_test
os.environ["ENV_FILE"] = ".env.test"

import django
sys.path.insert(0, os.path.abspath("backend"))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from django.utils import timezone
from accounts.models import User
from doctors.models import Doctor, Hospital
from appointments.models import Slot, Appointment
from payments.models import Payment

KOLKATA = zoneinfo.ZoneInfo("Asia/Kolkata")

def seed_600_plus():
    print("[1/3] Setting up Hospitals and Doctors...")
    # Hospital A
    hosp_a, _ = Hospital.objects.get_or_create(
        name="CareConnect Apex General Hospital",
        defaults={
            "city": "Bengaluru",
            "address": "100ft Road, Indiranagar, Bengaluru",
            "slug": "careconnect-apex-general"
        }
    )

    staff_a, _ = User.objects.get_or_create(
        email="hospital.staff.a@careconnect.health",
        defaults={
            "username": "hosp_staff_a",
            "role": "hospital",
            "hospital": hosp_a,
            "hospital_name": hosp_a.name,
            "is_verified": True
        }
    )
    staff_a.set_password("Password123!")
    staff_a.hospital = hosp_a
    staff_a.hospital_name = hosp_a.name
    staff_a.save()

    doc_a1, _ = Doctor.objects.get_or_create(
        contact_email="dr.kavita.nair@careconnect.health",
        defaults={
            "name": "Dr. Kavita Nair",
            "specialization": "Cardiology",
            "hospital": hosp_a,
            "hospital_name": hosp_a.name,
            "fee": Decimal("1000.00"),
            "experience_years": 14,
            "qualification": "MBBS, MD, DM (Cardiology)",
            "clinic_address": "Indiranagar OPD, Wing A",
            "is_active": True
        }
    )

    doc_a2, _ = Doctor.objects.get_or_create(
        contact_email="dr.arjun.mehta@careconnect.health",
        defaults={
            "name": "Dr. Arjun Mehta",
            "specialization": "Orthopedics",
            "hospital": hosp_a,
            "hospital_name": hosp_a.name,
            "fee": Decimal("900.00"),
            "experience_years": 11,
            "qualification": "MBBS, MS (Ortho)",
            "clinic_address": "Indiranagar OPD, Wing B",
            "is_active": True
        }
    )

    # Hospital B
    hosp_b, _ = Hospital.objects.get_or_create(
        name="Metro Care Hospital B",
        defaults={
            "city": "Mumbai",
            "address": "Linking Rd, Bandra West, Mumbai",
            "slug": "metro-care-hospital-b"
        }
    )

    staff_b, _ = User.objects.get_or_create(
        email="hospital.staff.b@careconnect.health",
        defaults={
            "username": "hosp_staff_b",
            "role": "hospital",
            "hospital": hosp_b,
            "hospital_name": hosp_b.name,
            "is_verified": True
        }
    )
    staff_b.set_password("Password123!")
    staff_b.hospital = hosp_b
    staff_b.hospital_name = hosp_b.name
    staff_b.save()

    doc_b, _ = Doctor.objects.get_or_create(
        contact_email="dr.siddharth.b@careconnect.health",
        defaults={
            "name": "Dr. Siddharth Bose",
            "specialization": "Neurology",
            "hospital": hosp_b,
            "hospital_name": hosp_b.name,
            "fee": Decimal("1200.00"),
            "experience_years": 16,
            "qualification": "MBBS, MD (Neuro)",
            "clinic_address": "Bandra OPD, 3rd Floor",
            "is_active": True
        }
    )

    patient, _ = User.objects.get_or_create(
        email="patient.verified@careconnect.health",
        defaults={"username": "patient_verified", "role": "patient", "is_verified": True}
    )
    patient.set_password("Password123!")
    patient.save()

    print("[2/3] Generating 7-day slot grid for all doctors...")
    today = timezone.localdate()
    all_slots = []
    doctors = [doc_a1, doc_a2, doc_b]

    # Slot times throughout the day
    slot_times = [
        (datetime.time(9, 0), datetime.time(9, 30)),
        (datetime.time(9, 30), datetime.time(10, 0)),
        (datetime.time(10, 0), datetime.time(10, 30)),
        (datetime.time(10, 30), datetime.time(11, 0)),
        (datetime.time(11, 0), datetime.time(11, 30)),
        (datetime.time(11, 30), datetime.time(12, 0)),
        (datetime.time(14, 0), datetime.time(14, 30)),
        (datetime.time(14, 30), datetime.time(15, 0)),
        (datetime.time(15, 0), datetime.time(15, 30)),
        (datetime.time(15, 30), datetime.time(16, 0)),
    ]

    for d_offset in range(7):
        target_date = today + datetime.timedelta(days=d_offset)
        for doc in doctors:
            for s_start, s_end in slot_times:
                slot, _ = Slot.objects.get_or_create(
                    doctor=doc,
                    date=target_date,
                    start_time=s_start,
                    defaults={"end_time": s_end, "max_capacity": 5, "is_blocked": False}
                )
                all_slots.append(slot)

    slots_a = [s for s in all_slots if s.doctor in (doc_a1, doc_a2)]
    slots_b = [s for s in all_slots if s.doctor == doc_b]

    print(f"   -> Created {len(all_slots)} total slots across 7 days ({len(slots_a)} for Hosp A, {len(slots_b)} for Hosp B)")

    print("[3/3] Seeding 620 realistic appointments...")
    existing_count = Appointment.objects.filter(doctor__hospital__in=[hosp_a, hosp_b]).count()
    print(f"   -> Existing appointment count: {existing_count}")

    # First names & Last names for realistic distribution
    first_names = ["Aarav", "Ananya", "Rohan", "Pooja", "Vikram", "Sneha", "Aditya", "Meera", "Karan", "Priya",
                   "Rajesh", "Divya", "Suresh", "Neha", "Amit", "Kavya", "Deepak", "Anjali", "Sanjay", "Ritu"]
    last_names = ["Sharma", "Verma", "Iyer", "Patel", "Reddy", "Nair", "Kapoor", "Chatterjee", "Menon", "Joshi",
                  "Gupta", "Kulkarni", "Deshmukh", "Singhania", "Pillai", "Bose", "Das", "Rao", "Chawla", "Bhat"]

    target_total = 620
    needed = max(0, target_total - existing_count)

    created_appts = []
    created_payments = []

    statuses_distribution = (
        ["pending"] * 80 +        # 80 pending (ensures Ready to Admit badge > 0!)
        ["confirmed"] * 330 +     # 330 confirmed (waiting arrival or admitted)
        ["completed"] * 150 +     # 150 completed
        ["cancelled"] * 60        # 60 cancelled
    )

    import random
    rng = random.Random(42)

    now_kolkata = timezone.now().astimezone(KOLKATA)

    for i in range(1, needed + 1):
        idx = existing_count + i
        status = statuses_distribution[(i - 1) % len(statuses_distribution)]

        # 85% to Hosp A, 15% to Hosp B
        if i % 7 == 0:
            assigned_slot = rng.choice(slots_b)
        else:
            assigned_slot = rng.choice(slots_a)

        doc = assigned_slot.doctor
        fn = rng.choice(first_names)
        ln = rng.choice(last_names)
        p_name = f"{fn} {ln}"
        p_age = rng.randint(18, 78)
        p_gender = rng.choice(["Male", "Female", "Other"])
        p_phone = f"+9198{rng.randint(10000000, 99999999)}"

        is_checked_in = False
        checked_in_at = None
        completed_at = None
        cancel_reason = ""

        if status == "completed":
            is_checked_in = True
            checked_in_at = now_kolkata - datetime.timedelta(hours=rng.randint(2, 48))
            completed_at = checked_in_at + datetime.timedelta(minutes=rng.randint(15, 30))
        elif status == "confirmed":
            # Some confirmed patients are already admitted in OP chamber
            if rng.random() < 0.25:
                is_checked_in = True
                checked_in_at = now_kolkata - datetime.timedelta(minutes=rng.randint(5, 45))
        elif status == "cancelled":
            cancel_reason = "Patient schedule conflict / rescheduled personal emergency"

        receipt_id = f"MC-20261124-{idx:04d}"
        fee = doc.fee

        appt = Appointment(
            receipt_id=receipt_id,
            patient=patient,
            doctor=doc,
            slot=assigned_slot,
            patient_name=p_name,
            patient_age=p_age,
            patient_gender=p_gender,
            patient_phone=p_phone,
            status=status,
            fee_charged=fee,
            original_fee=fee,
            op_checked_in=is_checked_in,
            op_checked_in_at=checked_in_at,
            completed_at=completed_at,
            cancellation_reason=cancel_reason,
            is_reviewed=(status == "completed" and rng.random() < 0.4),
            doctor_rating=rng.randint(4, 5) if status == "completed" else None,
            hospital_rating=rng.randint(4, 5) if status == "completed" else None,
            management_rating=rng.randint(4, 5) if status == "completed" else None,
        )
        created_appts.append(appt)

    if created_appts:
        Appointment.objects.bulk_create(created_appts, batch_size=200)
        print(f"   -> Bulk inserted {len(created_appts)} appointments.")

    # Now create linked payments
    new_appts = Appointment.objects.filter(payment__isnull=True)
    created_payments = []
    for appt in new_appts:
        p_status = "paid" if appt.status in ("confirmed", "completed") else "refunded" if appt.status == "cancelled" else "created"
        pay = Payment(
            appointment=appt,
            patient=appt.patient,
            amount=appt.fee_charged,
            status=p_status,
            razorpay_order_id=f"order_mock_{appt.id:06d}",
            razorpay_payment_id=f"pay_mock_{appt.id:06d}" if p_status in ("paid", "refunded") else None,
            razorpay_refund_id=f"rfnd_mock_{appt.id:06d}" if p_status == "refunded" else None,
            refund_status="processed" if p_status == "refunded" else "none",
        )
        created_payments.append(pay)

    if created_payments:
        Payment.objects.bulk_create(created_payments, batch_size=200)
        print(f"   -> Bulk inserted {len(created_payments)} payments.")

    total_hosp_a = Appointment.objects.filter(doctor__hospital=hosp_a).count()
    pending_hosp_a = Appointment.objects.filter(doctor__hospital=hosp_a, status="pending").count()
    confirmed_hosp_a = Appointment.objects.filter(doctor__hospital=hosp_a, status="confirmed").count()
    completed_hosp_a = Appointment.objects.filter(doctor__hospital=hosp_a, status="completed").count()
    cancelled_hosp_a = Appointment.objects.filter(doctor__hospital=hosp_a, status="cancelled").count()

    print("\n--- SEEDING COMPLETE ---")
    print(f"Total Appointments in Database: {Appointment.objects.count()}")
    print(f"Hospital A Total: {total_hosp_a}")
    print(f"  - Pending (Ready to Admit): {pending_hosp_a}")
    print(f"  - Confirmed: {confirmed_hosp_a}")
    print(f"  - Completed: {completed_hosp_a}")
    print(f"  - Cancelled: {cancelled_hosp_a}")

if __name__ == "__main__":
    seed_600_plus()
