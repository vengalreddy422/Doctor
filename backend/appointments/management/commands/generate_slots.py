from datetime import time as time_cls
from django.core.management.base import BaseCommand
from doctors.models import Doctor, DoctorSchedule
from appointments.models import Slot
from appointments.services import refresh_rolling_slots, expire_past_appointments, generate_slots_for_doctor


class Command(BaseCommand):
    help = (
        'Daily maintenance / slot synchronization:\n'
        '  1. Expire past pending/confirmed appointments.\n'
        '  2. Extend and synchronize rolling 7-day slots for all active doctors across their active working days.\n'
    )

    def add_arguments(self, parser):
        parser.add_argument(
            '--sync-all',
            action='store_true',
            help='Ensure every doctor has Mon-Sat schedules and fresh slots generated.',
        )

    def handle(self, *args, **options):
        sync_all = options.get('sync_all', False)

        # Step 1: Expire stale appointments
        expired = expire_past_appointments()
        self.stdout.write(f'  Expired {expired} past appointment(s).')

        # Step 2: Refresh rolling slots
        doctors = Doctor.objects.filter(is_active=True)
        total_created = 0

        for doctor in doctors:
            if sync_all:
                valid_days = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat']
                if doctor.available_days:
                    parsed = [x.strip().lower() for x in doctor.available_days.split(',') if x.strip()]
                    if len(parsed) >= 2:
                        valid_days = parsed
                doctor.available_days = ','.join(valid_days)
                doctor.save(update_fields=['available_days'])
                
                DoctorSchedule.objects.filter(doctor=doctor).delete()
                for day in valid_days:
                    DoctorSchedule.objects.create(
                        doctor=doctor,
                        day_of_week=day,
                        start_time=time_cls(10, 0),
                        end_time=time_cls(17, 0),
                        is_active=True
                    )

            created = generate_slots_for_doctor(doctor, days_needed=7)
            total_created += created
            self.stdout.write(f'  {doctor.name} ({doctor.available_days}): +{created} slot(s)')

        self.stdout.write(
            self.style.SUCCESS(
                f'\nDone. {expired} expired, {total_created} slot(s) created.'
            )
        )