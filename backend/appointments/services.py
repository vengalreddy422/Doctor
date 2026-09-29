"""
appointments/services.py
=========================
Core business logic for slot generation, fee calculation, and appointment lifecycle.

Key design decisions:
  • Slots are generated from DoctorSchedule (weekly recurring blocks), NOT from
    the legacy morning_start / afternoon_start fields.
  • Past slots are NEVER deleted — they hold historical appointment references.
  • The rolling window always maintains the next 7 *available* dates.
  • Holidays (global + per-doctor) are respected.
  • Uses bulk_create(ignore_conflicts=True) for idempotent, high-performance writes.
"""

from datetime import datetime, timedelta, time as time_cls
from decimal import Decimal
from django.utils import timezone
from django.db.models import Count, Q


# ---------------------------------------------------------------------------
# Fee calculation (Dynamic Pricing Engine)
# ---------------------------------------------------------------------------
def calculate_fee(patient, doctor):
    """
    Business Logic — Alternating Dynamic Pricing Model:
      • Odd-numbered appointments (1st, 3rd, 5th, 7th, ...)  → +5% Price Increase
      • Even-numbered appointments (2nd, 4th, 6th, 8th, ...) → -5% Loyalty Discount
    
    Excludes cancelled, expired, and rescheduled appointments from the count.
    Formula:
      - If (booking_number % 2 != 0) => Fee = doctor.fee * 1.05 (+5%)
      - If (booking_number % 2 == 0) => Fee = doctor.fee * 0.95 (-5%)
    """
    from .models import Appointment
    previous_appointments = Appointment.objects.filter(
        patient=patient
    ).exclude(
        status__in=['cancelled', 'expired', 'rescheduled']
    )
    
    previous_count = previous_appointments.count()
    booking_number = previous_count + 1
    
    if booking_number % 2 != 0:
        # Odd-numbered booking: 1st, 3rd, 5th, 7th... (+5% increase)
        return (doctor.fee * Decimal('1.05')).quantize(Decimal('0.01'))
    else:
        # Even-numbered booking: 2nd, 4th, 6th, 8th... (-5% discount)
        return (doctor.fee * Decimal('0.95')).quantize(Decimal('0.01'))


# ---------------------------------------------------------------------------
# Slot generation from DoctorSchedule
# ---------------------------------------------------------------------------
def generate_slots_for_doctor(doctor, days_needed=7):
    """
    Rolling available-day window, driven dynamically by DoctorSchedule:

    1. Read all active DoctorSchedule entries for this doctor.
       If none exist, auto-populate from doctor.available_days (defaulting to mon..sat).
    2. Starting from today, scan forward to find the next `days_needed` dates that
       match the doctor's weekly active schedule and are not blocked holidays.
    3. For each matching date, generate the standard 6 consultation slots.
    4. Uses bulk_create(ignore_conflicts=True) for idempotent, high-performance writes.
    5. NEVER delete past slots (historical appointments depend on them).

    Returns the count of newly created Slot rows.
    """
    from .models import Slot
    from doctors.models import DoctorSchedule, Holiday

    # Ensure doctor has valid available_days
    days = []
    if doctor.available_days:
        days = [d.strip().lower() for d in doctor.available_days.split(',') if d.strip()]
    if not days:
        days = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat']
        doctor.available_days = ','.join(days)
        doctor.save(update_fields=['available_days'])

    # Ensure DoctorSchedule records exist for all available days
    existing_days = set(
        DoctorSchedule.objects.filter(doctor=doctor, is_active=True).values_list('day_of_week', flat=True)
    )
    for day in days:
        if day not in existing_days:
            DoctorSchedule.objects.get_or_create(
                doctor=doctor,
                day_of_week=day,
                defaults={
                    'start_time': time_cls(10, 0),
                    'end_time': time_cls(17, 0),
                    'is_active': True,
                }
            )

    schedules = list(
        DoctorSchedule.objects.filter(doctor=doctor, is_active=True)
    )
    if not schedules:
        return 0

    # Build a lookup: day_code -> [schedule_block, ...]
    schedule_map = {}
    for sched in schedules:
        schedule_map.setdefault(sched.day_of_week, []).append(sched)

    today = timezone.localdate()

    # Gather holiday dates (global + doctor-specific)
    holiday_dates = set(
        Holiday.objects.filter(
            Q(doctor=doctor) | Q(doctor__isnull=True),
            date__gte=today,
        ).values_list('date', flat=True)
    )

    target_dates = []
    offset = 0
    while len(target_dates) < days_needed and offset < 365:
        candidate = today + timedelta(days=offset)
        day_code = candidate.strftime('%a').lower()  # 'mon', 'tue', ...
        if day_code in schedule_map and candidate not in holiday_dates:
            target_dates.append(candidate)
        offset += 1

    # Build Slot objects for bulk creation
    slots_to_create = []
    
    # Standard 6 fixed consultation slots
    FIXED_SLOTS = [
        (time_cls(10, 0), time_cls(11, 0)),
        (time_cls(11, 0), time_cls(12, 0)),
        (time_cls(12, 0), time_cls(13, 0)),
        (time_cls(14, 0), time_cls(15, 0)),
        (time_cls(15, 0), time_cls(16, 0)),
        (time_cls(16, 0), time_cls(17, 0)),
    ]

    for target_date in target_dates:
        day_code = target_date.strftime('%a').lower()
        if day_code in schedule_map:
            for slot_start, slot_end in FIXED_SLOTS:
                slots_to_create.append(
                    Slot(
                        doctor=doctor,
                        date=target_date,
                        start_time=slot_start,
                        end_time=slot_end,
                        max_capacity=5,  # 5 appointments per slot
                    )
                )

    if not slots_to_create:
        return 0

    created = Slot.objects.bulk_create(slots_to_create, ignore_conflicts=True)
    return len(created)


def refresh_rolling_slots(doctor, force=False):
    """
    Ensure the doctor has slots generated for the next 7 available dates.
    """
    from .models import Slot
    from django.utils import timezone
    
    count = generate_slots_for_doctor(doctor, days_needed=7)
    doctor.sync_available_days_from_schedules()
    return count


# ---------------------------------------------------------------------------
# Appointment lifecycle helpers
# ---------------------------------------------------------------------------
def expire_past_appointments():
    """
    Mark pending/confirmed appointments as 'expired' if the slot date+time
    has passed. Called by the daily management command.

    Returns the count of expired appointments.
    """
    from .models import Appointment

    now = timezone.localtime()
    today = now.date()
    current_time = now.time()

    # Appointments on past dates
    past_date_qs = Appointment.objects.filter(
        status__in=['pending', 'confirmed'],
        slot__date__lt=today,
    )

    # Appointments today but slot time already passed
    past_time_qs = Appointment.objects.filter(
        status__in=['pending', 'confirmed'],
        slot__date=today,
        slot__start_time__lt=current_time,
    )

    count = 0
    for qs in [past_date_qs, past_time_qs]:
        count += qs.update(status='expired')

    return count


def get_available_slots(doctor, date):
    """
    Return slots for a given doctor+date with availability info.
    Filters out past time slots for today, and annotates booked count.
    """
    from .models import Slot

    now = timezone.localtime()
    slots = Slot.objects.filter(
        doctor=doctor, date=date, is_blocked=False
    ).annotate(
        booked=Count(
            'appointments',
            filter=Q(appointments__status__in=['pending', 'confirmed', 'completed'])
        )
    ).order_by('start_time')

    # If the date is today, filter out slots that have already passed
    if date == now.date():
        slots = slots.filter(start_time__gt=now.time())

    return slots