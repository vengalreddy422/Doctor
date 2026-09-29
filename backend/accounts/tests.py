from datetime import timedelta
from django.test import TestCase
from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework.test import APIClient
from .models import OTP

User = get_user_model()


class OTPTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(email="test@example.com", username="test", password="pass1234")
        self.client = APIClient()

    def test_fresh_otp_not_expired(self):
        otp = OTP.objects.create(user=self.user, code="123456")
        self.assertFalse(otp.is_expired())

    def test_old_otp_is_expired(self):
        otp = OTP.objects.create(user=self.user, code="123456")
        otp.created_at = timezone.now() - timedelta(minutes=15)
        otp.save()
        self.assertTrue(otp.is_expired())

    def test_otp_attempts_and_rollback_after_3_failures(self):
        unverified_user = User.objects.create_user(
            email="patient@example.com", username="patient", password="Password123!", is_verified=False
        )
        OTP.objects.create(user=unverified_user, code="999999", purpose="verify_email")

        # Attempt 1: Wrong OTP
        res1 = self.client.post("/api/accounts/verify-otp/", {"email": "patient@example.com", "code": "000000"})
        self.assertEqual(res1.status_code, 400)
        self.assertIn("2 attempts remaining", res1.data["error"])
        unverified_user.refresh_from_db()
        self.assertEqual(unverified_user.otp_attempts, 1)

        # Attempt 2: Wrong OTP
        res2 = self.client.post("/api/accounts/verify-otp/", {"email": "patient@example.com", "code": "111111"})
        self.assertEqual(res2.status_code, 400)
        self.assertIn("1 attempt remaining", res2.data["error"])
        unverified_user.refresh_from_db()
        self.assertEqual(unverified_user.otp_attempts, 2)

        # Attempt 3: Wrong OTP -> Rollback / Delete
        res3 = self.client.post("/api/accounts/verify-otp/", {"email": "patient@example.com", "code": "222222"})
        self.assertEqual(res3.status_code, 400)
        self.assertTrue(res3.data.get("rollback"))
        self.assertFalse(User.objects.filter(email="patient@example.com").exists())

    def test_login_lockout_after_3_failed_attempts(self):
        verified_user = User.objects.create_user(
            email="verified@example.com", username="verified", password="CorrectPassword123!", is_verified=True
        )

        # Attempt 1: Wrong password
        res1 = self.client.post("/api/accounts/login/", {"email": "verified@example.com", "password": "wrong"})
        self.assertEqual(res1.status_code, 401)
        self.assertIn("2 attempts remaining", res1.data["error"])

        # Attempt 2: Wrong password
        res2 = self.client.post("/api/accounts/login/", {"email": "verified@example.com", "password": "wrong"})
        self.assertEqual(res2.status_code, 401)
        self.assertIn("1 attempt remaining", res2.data["error"])

        # Attempt 3: Wrong password -> 5 min Lockout
        res3 = self.client.post("/api/accounts/login/", {"email": "verified@example.com", "password": "wrong"})
        self.assertEqual(res3.status_code, 429)
        self.assertTrue(res3.data.get("locked"))
        self.assertIn("locked for 5 minutes", res3.data["error"])

        # Attempt 4: Even with correct password, blocked while locked
        res4 = self.client.post("/api/accounts/login/", {"email": "verified@example.com", "password": "CorrectPassword123!"})
        self.assertEqual(res4.status_code, 429)
        self.assertTrue(res4.data.get("locked"))

