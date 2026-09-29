from datetime import time as time_cls
from django.db import models


# Canonical short names expected by strftime('%a').lower()
WEEKDAY_CHOICES = [
    ('mon', 'Monday'),
    ('tue', 'Tuesday'),
    ('wed', 'Wednesday'),
    ('thu', 'Thursday'),
    ('fri', 'Friday'),
    ('sat', 'Saturday'),
    ('sun', 'Sunday'),
]


from django.core.exceptions import ValidationError

def validate_image_size(image):
    max_size_mb = 10
    if image.size > max_size_mb * 1024 * 1024:
        raise ValidationError(f"Image size must be under {max_size_mb}MB. Please choose a smaller image.")

class Hospital(models.Model):
    """
    Enterprise-grade dynamic Hospital entity.
    Allows dynamic registration of hospital facilities, branch locations, and accounts.
    """
    name = models.CharField(max_length=200, unique=True, db_index=True)
    slug = models.SlugField(
        max_length=100,
        unique=True,
        db_index=True,
        help_text="Lowercase sanitized username slug for hospital staff portal login"
    )
    contact_phone = models.CharField(
        max_length=25,
        blank=True,
        default='',
        help_text="Hospital official contact phone number"
    )
    contact_email = models.EmailField(
        blank=True,
        default='',
        help_text="Hospital official contact email"
    )
    address = models.CharField(
        max_length=255,
        blank=True,
        default='',
        help_text="Street address, campus, or landmark"
    )
    city = models.CharField(
        max_length=100,
        blank=True,
        default='',
        help_text="City or metropolitan area"
    )
    state = models.CharField(
        max_length=100,
        blank=True,
        default='',
        help_text="State or province"
    )
    google_maps_url = models.URLField(
        max_length=500,
        blank=True,
        default='',
        help_text="Direct Google Maps navigation or location link"
    )
    is_active = models.BooleanField(default=True, db_index=True)
    rating = models.DecimalField(
        max_digits=3, decimal_places=1, default=4.8,
        help_text='Average hospital patient rating (1.0 – 5.0)',
    )
    total_reviews = models.PositiveIntegerField(
        default=0,
        help_text='Total number of patient reviews for this hospital',
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['name']
        verbose_name = 'Hospital Facility'
        verbose_name_plural = 'Hospital Facilities'

    def __str__(self):
        return self.name

    def get_google_maps_url(self):
        """Return custom Google Maps URL or auto-generate search query URL."""
        if self.google_maps_url and self.google_maps_url.strip():
            return self.google_maps_url.strip()

        query_parts = [self.name]
        if self.address:
            query_parts.append(self.address)
        if self.city:
            query_parts.append(self.city)

        import urllib.parse
        query_str = ", ".join(query_parts)
        return f"https://www.google.com/maps/search/?api=1&query={urllib.parse.quote(query_str)}"


class Doctor(models.Model):
    hospital = models.ForeignKey(
        Hospital,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='doctors',
        help_text='Associated hospital facility'
    )
    name = models.CharField(max_length=100, db_index=True)
    specialization = models.CharField(max_length=100, db_index=True)
    qualification = models.CharField(max_length=100)
    experience_years = models.PositiveIntegerField()
    fee = models.DecimalField(max_digits=8, decimal_places=2)
    image = models.ImageField(upload_to='doctors/', blank=True, null=True, validators=[validate_image_size])
    hospital_name = models.CharField(
        max_length=200,
        blank=True,
        default='',
        help_text='Hospital / clinic where this doctor is available',
    )
    contact_number = models.CharField(
        max_length=25,
        blank=True,
        default='',
        help_text='Doctor or clinic direct contact phone number',
    )
    contact_email = models.EmailField(
        blank=True,
        default='',
        help_text='Doctor or clinic contact email address',
    )
    clinic_address = models.CharField(
        max_length=255,
        blank=True,
        default='',
        help_text='Clinic / hospital street address, chamber, or landmark',
    )
    google_maps_url = models.URLField(
        max_length=500,
        blank=True,
        default='',
        help_text='Direct Google Maps link. If left blank, auto-generates search link from address/hospital',
    )
    # Legacy field — kept for backward compat; populated automatically from DoctorSchedule
    available_days = models.CharField(
        max_length=100,
        blank=True,
        default='',
        help_text='Auto-populated from schedules. Comma-separated 3-letter weekday codes.',
    )
    is_active = models.BooleanField(default=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)

    # New profile fields
    bio = models.TextField(
        blank=True, default='',
        help_text='Short biography shown on the doctor profile page',
    )
    rating = models.DecimalField(
        max_digits=3, decimal_places=1, default=4.5,
        help_text='Average patient rating (1.0 – 5.0)',
    )
    total_reviews = models.PositiveIntegerField(
        default=0,
        help_text='Total number of patient reviews',
    )

    class Meta:
        ordering = ['name']

    def __str__(self):
        return f'Dr. {self.name} - {self.specialization}'

    def save(self, *args, **kwargs):
        if self.hospital:
            self.hospital_name = self.hospital.name
            if not self.clinic_address:
                self.clinic_address = self.hospital.address
            if not self.contact_number:
                self.contact_number = self.hospital.contact_phone
            if not self.contact_email:
                self.contact_email = self.hospital.contact_email
            if not self.google_maps_url and self.hospital.google_maps_url:
                self.google_maps_url = self.hospital.google_maps_url
        elif self.hospital_name and not self.hospital:
            # Dynamically link to Hospital if exists
            h_obj = Hospital.objects.filter(name__iexact=self.hospital_name.strip()).first()
            if h_obj:
                self.hospital = h_obj
        super().save(*args, **kwargs)

    def get_google_maps_url(self):
        """Return custom Google Maps URL or auto-generate search query URL."""
        if self.google_maps_url and self.google_maps_url.strip():
            return self.google_maps_url.strip()
        if self.hospital and self.hospital.google_maps_url:
            return self.hospital.google_maps_url.strip()
        
        query_parts = []
        if self.hospital:
            query_parts.append(self.hospital.name)
            if self.hospital.address:
                query_parts.append(self.hospital.address)
        elif self.hospital_name and self.hospital_name.strip():
            query_parts.append(self.hospital_name.strip())

        if self.clinic_address and self.clinic_address.strip() and self.clinic_address.strip() not in query_parts:
            query_parts.append(self.clinic_address.strip())
        if not query_parts and self.name:
            query_parts.append(f"Dr. {self.name.strip()}")
            
        if not query_parts:
            return "https://www.google.com/maps"
            
        import urllib.parse
        query_str = ", ".join(query_parts)
        return f"https://www.google.com/maps/search/?api=1&query={urllib.parse.quote(query_str)}"

    def get_available_days_list(self):
        """Derive days list fast from available_days column or active schedules."""
        if self.available_days:
            days = [d.strip().lower() for d in self.available_days.split(',') if d.strip()]
            day_order = [code for code, _ in WEEKDAY_CHOICES]
            days.sort(key=lambda d: day_order.index(d) if d in day_order else 99)
            return days
        days = list(
            self.schedules.filter(is_active=True)
            .values_list('day_of_week', flat=True)
            .order_by()  # Clear default ordering so distinct() works properly
            .distinct()
        )
        day_order = [code for code, _ in WEEKDAY_CHOICES]
        days.sort(key=lambda d: day_order.index(d) if d in day_order else 99)
        return days

    def is_available_today(self):
        """Check if doctor is active and works today (fast 0-query in-memory check)."""
        if not self.is_active:
            return False
        from django.utils import timezone
        today = timezone.localdate()
        today_code = today.strftime('%a').lower()  # 'mon', 'fri', etc.

        if self.available_days:
            days = [d.strip().lower() for d in self.available_days.split(',') if d.strip()]
        else:
            days = self.get_available_days_list()

        return today_code in days

    def get_available_days_display(self):
        day_map = dict(WEEKDAY_CHOICES)
        return [day_map.get(d, d.capitalize()) for d in self.get_available_days_list()]

    def sync_available_days_from_schedules(self):
        """Rebuild the legacy available_days CSV from active DoctorSchedule entries."""
        days = list(
            self.schedules.filter(is_active=True)
            .values_list('day_of_week', flat=True)
            .distinct()
        )
        day_order = [code for code, _ in WEEKDAY_CHOICES]
        days.sort(key=lambda d: day_order.index(d) if d in day_order else 99)
        new_val = ','.join(days)
        self.available_days = new_val
        Doctor.objects.filter(id=self.id).update(available_days=new_val)


class DoctorSchedule(models.Model):
    """
    Weekly recurring schedule block for a doctor.
    Example: Dr. Smith works Monday 9:00–12:00 and Monday 14:00–17:00.
    The admin configures only these; slots are auto-generated from them.
    """
    doctor = models.ForeignKey(Doctor, on_delete=models.CASCADE, related_name='schedules')
    day_of_week = models.CharField(max_length=3, choices=WEEKDAY_CHOICES)
    start_time = models.TimeField(help_text='Block start time, e.g. 09:00')
    end_time = models.TimeField(help_text='Block end time, e.g. 12:00')
    is_active = models.BooleanField(default=True)

    class Meta:
        unique_together = ('doctor', 'day_of_week', 'start_time')
        ordering = ['day_of_week', 'start_time']
        verbose_name = 'Weekly Schedule Block'
        verbose_name_plural = 'Weekly Schedule Blocks'

    def __str__(self):
        day_label = dict(WEEKDAY_CHOICES).get(self.day_of_week, self.day_of_week)
        return f'{self.doctor.name} — {day_label} {self.start_time:%H:%M}–{self.end_time:%H:%M}'


class Holiday(models.Model):
    """
    Block specific dates from slot generation.
    If doctor is NULL → global holiday (affects all doctors).
    """
    doctor = models.ForeignKey(
        Doctor, on_delete=models.CASCADE, related_name='holidays',
        blank=True, null=True,
        help_text='Leave blank for a global holiday affecting all doctors',
    )
    date = models.DateField()
    reason = models.CharField(max_length=200, blank=True, default='')

    class Meta:
        ordering = ['date']
        verbose_name = 'Holiday / Blocked Date'
        verbose_name_plural = 'Holidays / Blocked Dates'

    def __str__(self):
        scope = f'Dr. {self.doctor.name}' if self.doctor else 'Global'
        return f'{self.date} — {scope} — {self.reason or "Holiday"}'