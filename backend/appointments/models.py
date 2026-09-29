import uuid
from decimal import Decimal
from django.db import models
from django.conf import settings
from django.utils import timezone
from doctors.models import Doctor


class Slot(models.Model):
    doctor = models.ForeignKey(Doctor, on_delete=models.CASCADE, related_name='slots')
    date = models.DateField(db_index=True)
    start_time = models.TimeField()
    end_time = models.TimeField(blank=True, null=True, help_text='Auto-calculated from consultation duration')
    max_capacity = models.PositiveIntegerField(default=5)
    is_blocked = models.BooleanField(
        default=False,
        help_text='Admin can manually block this slot',
    )

    class Meta:
        unique_together = ('doctor', 'date', 'start_time')
        ordering = ['date', 'start_time']

    def __str__(self):
        end = f'–{self.end_time:%H:%M}' if self.end_time else ''
        return f"{self.doctor.name} — {self.date} {self.start_time:%H:%M}{end}"

    def booked_count(self):
        return self.appointments.filter(
            status__in=['pending', 'confirmed', 'completed']
        ).count()

    def is_full(self):
        return self.is_blocked or self.booked_count() >= self.max_capacity

    def is_past(self):
        """True if this slot's date+time is in the past."""
        now = timezone.localtime()
        from datetime import datetime
        slot_dt = datetime.combine(self.date, self.start_time)
        slot_dt = timezone.make_aware(slot_dt, timezone.get_current_timezone())
        return slot_dt < now


class Appointment(models.Model):
    STATUS_CHOICES = (
        ('pending', 'Pending'),
        ('confirmed', 'Confirmed'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled'),
        ('rejected', 'Rejected'),
        ('expired', 'Expired'),
        ('rescheduled', 'Rescheduled'),
    )

    patient = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='appointments'
    )
    doctor = models.ForeignKey(
        Doctor, on_delete=models.CASCADE, related_name='appointments'
    )
    slot = models.ForeignKey(
        Slot, on_delete=models.CASCADE, related_name='appointments'
    )
    original_fee = models.DecimalField(max_digits=8, decimal_places=2, null=True, blank=True)
    discount_amount = models.DecimalField(max_digits=8, decimal_places=2, default=0)
    coupon_code = models.CharField(max_length=30, blank=True, null=True)
    fee_charged = models.DecimalField(max_digits=8, decimal_places=2)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending', db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    # Rescheduling
    rescheduled_from = models.ForeignKey(
        'self', null=True, blank=True,
        on_delete=models.SET_NULL, related_name='rescheduled_to',
    )

    # Patient & Family Member Info
    patient_name = models.CharField(
        max_length=150, blank=True, default='',
        help_text='Name of the patient visiting (Self, Mother, Daughter, etc.)',
    )
    patient_relation = models.CharField(
        max_length=50, blank=True, default='Self',
        help_text='Relation to user: Self, Mother, Father, Daughter, Son, Spouse, Other',
    )
    patient_age = models.PositiveIntegerField(
        null=True, blank=True, help_text='Age of the visiting patient'
    )
    patient_gender = models.CharField(
        max_length=20, blank=True, default='',
        choices=(('Male', 'Male'), ('Female', 'Female'), ('Other', 'Other')),
    )
    patient_phone = models.CharField(
        max_length=20, blank=True, default='',
        help_text='Contact phone number for patient consultation updates',
    )

    # Patient notes
    notes = models.TextField(blank=True, default='', help_text='Optional notes or symptoms from the patient')

    # Notifications
    reminder_sent = models.BooleanField(default=False)

    # OP Check-in & Hospital Acknowledgment
    op_checked_in = models.BooleanField(
        default=False,
        help_text='Hospital staff marked patient as arrived at OP'
    )
    op_checked_in_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    # Post-Consultation Rating & Review System (Doctor, Hospital, Management)
    doctor_rating = models.PositiveSmallIntegerField(
        null=True, blank=True,
        help_text='Doctor consultation rating (1 to 5)'
    )
    hospital_rating = models.PositiveSmallIntegerField(
        null=True, blank=True,
        help_text='Hospital facility & cleanliness rating (1 to 5)'
    )
    management_rating = models.PositiveSmallIntegerField(
        null=True, blank=True,
        help_text='Hospital management & staff behavior rating (1 to 5)'
    )
    rating = models.PositiveSmallIntegerField(
        null=True, blank=True,
        help_text='Overall average star rating (1 to 5)'
    )
    review_comment = models.TextField(
        blank=True, default='',
        help_text='Patient review comments and feedback'
    )
    reviewed_at = models.DateTimeField(null=True, blank=True)
    is_reviewed = models.BooleanField(default=False)

    # Cancellation & RedBus-Style Refund Policy
    cancelled_by = models.CharField(
        max_length=20,
        choices=(('patient', 'Patient'), ('hospital', 'Hospital'), ('admin', 'Admin')),
        blank=True, default='',
        help_text='Who initiated the cancellation'
    )
    cancellation_reason = models.CharField(max_length=255, blank=True, default='')
    cancellation_fee = models.DecimalField(
        max_digits=8, decimal_places=2, default=Decimal('0.00'),
        help_text='Cash cut-off / deduction retained per policy'
    )
    refund_amount = models.DecimalField(
        max_digits=8, decimal_places=2, default=Decimal('0.00'),
        help_text='Net refund amount credited to patient'
    )
    refund_status = models.CharField(
        max_length=20,
        choices=(
            ('none', 'No Refund'),
            ('full', 'Full 100% Refund'),
            ('partial', 'Partial Refund (Post Cut-off)'),
            ('completed', 'Refund Completed'),
        ),
        default='none'
    )
    cancelled_at = models.DateTimeField(null=True, blank=True)

    # Receipt
    receipt_id = models.CharField(
        max_length=30, unique=True, blank=True, default='',
        help_text='Auto-generated receipt ID like MC-20260716-001',
    )

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.patient.email} → {self.doctor.name} ({self.slot.date} {self.slot.start_time})"

    def save(self, *args, **kwargs):
        if not self.receipt_id:
            self.receipt_id = self._generate_receipt_id()
        if self.original_fee is None:
            self.original_fee = self.fee_charged
        super().save(*args, **kwargs)

    def _generate_receipt_id(self):
        """Generate a unique receipt ID: MC-YYYYMMDD-XXXX"""
        date_str = timezone.localdate().strftime('%Y%m%d')
        short_uuid = uuid.uuid4().hex[:4].upper()
        return f'MC-{date_str}-{short_uuid}'

    def get_hours_until_slot(self):
        """Calculate exact hours remaining until appointment slot start."""
        import datetime
        from django.utils import timezone
        slot_dt = timezone.make_aware(datetime.datetime.combine(self.slot.date, self.slot.start_time))
        diff = slot_dt - timezone.now()
        return diff.total_seconds() / 3600.0

    def check_reschedule_eligibility(self):
        """
        10-Hour Reschedule Business Rule:
        Rescheduling is permitted only if >= 10 hours remain before slot time.
        If < 10 hours, slot cannot be rescheduled to prevent empty slot vacancy.
        """
        if self.status not in ('pending', 'confirmed'):
            return False, f"Cannot reschedule an appointment with status '{self.get_status_display()}'."

        if self.slot.is_past():
            return False, "Cannot reschedule a past consultation."

        hours_rem = self.get_hours_until_slot()
        if hours_rem < 10.0:
            hrs_display = max(0, round(hours_rem, 1))
            return False, f"Rescheduling is only permitted up to 10 hours prior to consultation start time (currently {hrs_display} hrs remaining). Empty slot vacancy protection applies."

        return True, "Eligible for rescheduling (10+ hours before slot)."

    def calculate_cancellation_refund(self):
        """
        RedBus-style dynamic cash cut-off & refund calculation:
        - > 24 Hours: 100% Refund (0% deduction)
        - 12 to 24 Hours: 75% Refund (25% cash deduction)
        - 2 to 12 Hours: 50% Refund (50% cash deduction)
        - < 2 Hours or Past: 0% Non-Refundable (100% deduction)
        """
        import datetime
        from django.utils import timezone

        slot_dt = timezone.make_aware(datetime.datetime.combine(self.slot.date, self.slot.start_time))
        now_dt = timezone.now()

        diff = slot_dt - now_dt
        total_seconds = diff.total_seconds()
        hours_remaining = round(total_seconds / 3600, 2)

        fee = self.fee_charged or Decimal('0.00')

        if hours_remaining >= 24:
            refund_pct = Decimal('100')
            deduct_pct = Decimal('0')
            tier = 'Tier 1 (> 24 hrs): 100% Full Refund Guaranteed (₹0 Deduction)'
            tier_code = 'tier_1_full'
        elif hours_remaining >= 12:
            refund_pct = Decimal('75')
            deduct_pct = Decimal('25')
            tier = 'Tier 2 (12–24 hrs): 75% Refund (25% Cash Cut-off Deduction)'
            tier_code = 'tier_2_standard'
        elif hours_remaining >= 2:
            refund_pct = Decimal('50')
            deduct_pct = Decimal('50')
            tier = 'Tier 3 (2–12 hrs): 50% Refund (50% Short-Notice Cut-off)'
            tier_code = 'tier_3_short_notice'
        else:
            refund_pct = Decimal('0')
            deduct_pct = Decimal('100')
            tier = 'Tier 4 (< 2 hrs): Non-Refundable Late Cancellation (100% Cut-off)'
            tier_code = 'tier_4_non_refundable'

        deduction_amt = (fee * (deduct_pct / Decimal('100'))).quantize(Decimal('0.01'))
        refund_amt = (fee * (refund_pct / Decimal('100'))).quantize(Decimal('0.01'))

        return {
            'hours_remaining': max(0, hours_remaining),
            'hours_display': f"{int(max(0, total_seconds) // 3600)}h {int((max(0, total_seconds) % 3600) // 60)}m",
            'fee_paid': str(fee),
            'refund_percentage': int(refund_pct),
            'deduction_percentage': int(deduct_pct),
            'deduction_amount': str(deduction_amt),
            'refund_amount': str(refund_amt),
            'tier_label': tier,
            'tier_code': tier_code,
            'is_past': hours_remaining <= 0,
        }

    @property
    def is_cancellable(self):
        return self.status in ('pending', 'confirmed')

    @property
    def is_reschedulable(self):
        eligible, _ = self.check_reschedule_eligibility()
        return eligible


class Coupon(models.Model):
    DISCOUNT_TYPE_CHOICES = (
        ('percentage', 'Percentage (%)'),
        ('flat', 'Flat Amount (₹)'),
    )
    COUPON_TYPE_CHOICES = (
        ('first_booking', 'First Booking Special'),
        ('milestone', 'Loyalty Milestone (Every 5 Bookings)'),
        ('general', 'General Promo'),
    )

    code = models.CharField(max_length=30, unique=True, db_index=True)
    title = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    discount_type = models.CharField(max_length=20, choices=DISCOUNT_TYPE_CHOICES, default='percentage')
    discount_value = models.DecimalField(max_digits=8, decimal_places=2, help_text="Percentage value (e.g. 20) or flat amount in ₹")
    coupon_type = models.CharField(max_length=30, choices=COUPON_TYPE_CHOICES, default='general')
    required_bookings = models.PositiveIntegerField(default=0, help_text="Minimum prior bookings required")
    max_bookings = models.PositiveIntegerField(null=True, blank=True, help_text="Maximum prior bookings allowed (e.g. 0 for first booking only)")
    max_discount = models.DecimalField(max_digits=8, decimal_places=2, null=True, blank=True, help_text="Max discount cap in ₹")
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.code} ({self.title})"

    def calculate_discount(self, original_fee):
        from decimal import Decimal
        original = Decimal(str(original_fee))
        if self.discount_type == 'percentage':
            disc = (original * (self.discount_value / Decimal('100.00'))).quantize(Decimal('0.01'))
            if self.max_discount and disc > self.max_discount:
                disc = self.max_discount
            return min(disc, original)
        else: # flat
            disc = Decimal(str(self.discount_value))
            return min(disc, original)
