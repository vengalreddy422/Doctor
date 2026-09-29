from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import Doctor, DoctorSchedule


@receiver(post_save, sender=Doctor)
def sync_slots_on_doctor_save(sender, instance, created, **kwargs):
    """
    Fires every time a Doctor record is saved.
    Rebuilds the rolling 7-day slot window from DoctorSchedule entries.
    """
    from appointments.services import refresh_rolling_slots
    # Only refresh if the doctor has at least one schedule block
    if instance.schedules.filter(is_active=True).exists():
        refresh_rolling_slots(instance)


@receiver(post_save, sender=DoctorSchedule)
def sync_slots_on_schedule_save(sender, instance, **kwargs):
    """
    When a DoctorSchedule entry is created or updated,
    regenerate the rolling slots for that doctor.
    """
    from appointments.services import refresh_rolling_slots
    refresh_rolling_slots(instance.doctor)