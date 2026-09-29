from django.db import models
from django.conf import settings
from appointments.models import Appointment


class Payment(models.Model):
    STATUS_CHOICES = (
        ('created', 'Created'),
        ('paid', 'Paid'),
        ('failed', 'Failed'),
    )

    appointment = models.OneToOneField(Appointment, on_delete=models.CASCADE, related_name='payment')
    patient = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='payments')
    razorpay_order_id = models.CharField(max_length=100, db_index=True)
    razorpay_payment_id = models.CharField(max_length=100, blank=True, null=True, db_index=True)
    razorpay_signature = models.CharField(max_length=255, blank=True, null=True)
    amount = models.DecimalField(max_digits=8, decimal_places=2)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='created', db_index=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    def __str__(self):
        return f"{self.patient.email} - {self.amount} ({self.status})"
