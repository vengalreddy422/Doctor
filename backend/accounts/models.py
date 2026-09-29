import random
from datetime import timedelta
from django.contrib.auth.models import AbstractUser
from django.utils import timezone
from django.db import models
from django.conf import settings


class User(AbstractUser):
    ROLE_CHOICES = (
        ('admin', 'Admin'),
        ('hospital', 'Hospital'),
        ('patient', 'Patient'),
    )
    GENDER_CHOICES = (
        ('male', 'Male'),
        ('female', 'Female'),
        ('other', 'Other'),
    )

    email = models.EmailField(unique=True)
    role = models.CharField(max_length=15, choices=ROLE_CHOICES, default='patient')
    hospital = models.ForeignKey('doctors.Hospital', on_delete=models.SET_NULL, null=True, blank=True, related_name='staff_members', help_text='Direct linked dynamic hospital facility')
    hospital_name = models.CharField(max_length=200, blank=True, default='', help_text='Associated hospital facility for hospital staff')
    hospital_slug = models.CharField(max_length=100, blank=True, default='', db_index=True, help_text='Lowercase sanitized hospital username')
    phone = models.CharField(max_length=15, blank=True, null=True)
    is_verified = models.BooleanField(default=False)
    profile_image = models.ImageField(upload_to='patients/', blank=True, null=True)
    gender = models.CharField(max_length=10, choices=GENDER_CHOICES, blank=True, null=True)
    birthday = models.DateField(blank=True, null=True)
    address = models.CharField(max_length=255, blank=True, null=True)
    otp_attempts = models.PositiveIntegerField(default=0)
    failed_login_attempts = models.PositiveIntegerField(default=0)
    lockout_until = models.DateTimeField(blank=True, null=True)

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username']

    def is_locked(self):
        if self.lockout_until and timezone.now() < self.lockout_until:
            return True
        return False

    def remaining_lockout_seconds(self):
        if self.lockout_until and timezone.now() < self.lockout_until:
            return max(0, int((self.lockout_until - timezone.now()).total_seconds()))
        return 0

    def __str__(self):
        return f"{self.email} ({self.role})"


class OTP(models.Model):
    PURPOSE_CHOICES = (
        ('verify_email', 'Verify Email'),
        ('reset_password', 'Reset Password'),
    )

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='otps')
    code = models.CharField(max_length=6)
    purpose = models.CharField(max_length=20, choices=PURPOSE_CHOICES, default='verify_email')
    created_at = models.DateTimeField(auto_now_add=True)
    is_used = models.BooleanField(default=False)

    def is_expired(self):
        return timezone.now() > self.created_at + timedelta(minutes=10)

    @staticmethod
    def generate_code():
        return str(random.randint(100000, 999999))

    def __str__(self):
        return f"{self.user.email} - {self.code}"
