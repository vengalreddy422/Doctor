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


class AuthSignupLoginTests(TestCase):
    def setUp(self):
        self.client = APIClient()

    def test_signup_success(self):
        payload = {
            "username": "Rahul Sharma",
            "email": "rahul.sharma@example.com",
            "phone": "9876543210",
            "password": "StrongPassword123!",
        }
        res = self.client.post("/api/accounts/register/", payload)
        self.assertEqual(res.status_code, 201)
        self.assertIn("Account created", res.data["message"])

        user = User.objects.get(email="rahul.sharma@example.com")
        self.assertFalse(user.is_verified)
        self.assertEqual(user.first_name, "Rahul")
        self.assertEqual(user.last_name, "Sharma")
        self.assertTrue(OTP.objects.filter(user=user, purpose="verify_email").exists())

    def test_signup_validation_errors(self):
        # Missing fields
        res1 = self.client.post("/api/accounts/register/", {"email": "", "username": "", "password": ""})
        self.assertEqual(res1.status_code, 400)
        self.assertIn("required fields", res1.data["error"])

        # Invalid email
        res2 = self.client.post("/api/accounts/register/", {
            "email": "invalid-email-format",
            "username": "John Doe",
            "password": "Password123!",
        })
        self.assertEqual(res2.status_code, 400)
        self.assertIn("valid email address", res2.data["error"])

        # Short password
        res3 = self.client.post("/api/accounts/register/", {
            "email": "valid@example.com",
            "username": "John Doe",
            "password": "short",
        })
        self.assertEqual(res3.status_code, 400)
        self.assertIn("at least 8 characters", res3.data["error"])

    def test_signup_already_registered_verified_user(self):
        User.objects.create_user(
            email="existing@example.com", username="existing", password="Password123!", is_verified=True
        )
        res = self.client.post("/api/accounts/register/", {
            "email": "existing@example.com",
            "username": "Existing Person",
            "password": "Password123!",
        })
        self.assertEqual(res.status_code, 400)
        self.assertTrue(res.data.get("already_registered"))

    def test_verify_otp_success_and_activation(self):
        user = User.objects.create_user(
            email="verify_me@example.com", username="verifyme", password="Password123!", is_verified=False
        )
        otp = OTP.objects.create(user=user, code="654321", purpose="verify_email")

        res = self.client.post("/api/accounts/verify-otp/", {
            "email": "verify_me@example.com",
            "code": "654321",
        })
        self.assertEqual(res.status_code, 200)
        self.assertIn("verified successfully", res.data["message"])

        user.refresh_from_db()
        self.assertTrue(user.is_verified)
        otp.refresh_from_db()
        self.assertTrue(otp.is_used)

    def test_login_success_with_email(self):
        User.objects.create_user(
            email="login_test@example.com", username="logintest", first_name="Login", last_name="User",
            password="CorrectPassword123!", is_verified=True
        )
        res = self.client.post("/api/accounts/login/", {
            "email": "login_test@example.com",
            "password": "CorrectPassword123!",
        })
        self.assertEqual(res.status_code, 200)
        self.assertIn("access", res.data)
        self.assertIn("refresh", res.data)
        self.assertEqual(res.data["user"]["email"], "login_test@example.com")
        self.assertIn("Welcome back", res.data["message"])

    def test_login_success_with_username(self):
        User.objects.create_user(
            email="user_login@example.com", username="custom_username",
            password="CorrectPassword123!", is_verified=True
        )
        res = self.client.post("/api/accounts/login/", {
            "email": "custom_username",
            "password": "CorrectPassword123!",
        })
        self.assertEqual(res.status_code, 200)
        self.assertIn("access", res.data)

    def test_login_unverified_returns_403_needs_verification(self):
        User.objects.create_user(
            email="unverified_login@example.com", username="unverified_login",
            password="Password123!", is_verified=False
        )
        res = self.client.post("/api/accounts/login/", {
            "email": "unverified_login@example.com",
            "password": "Password123!",
        })
        self.assertEqual(res.status_code, 403)
        self.assertTrue(res.data.get("needs_verification"))

    def test_login_nonexistent_user_returns_401(self):
        res = self.client.post("/api/accounts/login/", {
            "email": "nobody@example.com",
            "password": "SomePassword123!",
        })
        self.assertEqual(res.status_code, 401)
        self.assertTrue(res.data.get("not_found"))

    def test_logout(self):
        res = self.client.post("/api/accounts/logout/", {})
        self.assertEqual(res.status_code, 200)

    def test_forgot_password_and_reset_flow(self):
        user = User.objects.create_user(
            email="reset_target@example.com", username="resettarget",
            password="OldPassword123!", is_verified=True
        )

        # 1. Forgot password request
        res1 = self.client.post("/api/accounts/forgot-password/", {"email": "reset_target@example.com"})
        self.assertEqual(res1.status_code, 200)
        self.assertTrue(OTP.objects.filter(user=user, purpose="reset_password").exists())

        otp = OTP.objects.filter(user=user, purpose="reset_password").first()

        # 2. Reset password with OTP
        res2 = self.client.post("/api/accounts/reset-password/", {
            "email": "reset_target@example.com",
            "code": otp.code,
            "new_password": "NewSecurePassword456!",
        })
        self.assertEqual(res2.status_code, 200)
        self.assertIn("Password reset successfully", res2.data["message"])

        # 3. Login with old password fails
        res3 = self.client.post("/api/accounts/login/", {
            "email": "reset_target@example.com",
            "password": "OldPassword123!",
        })
        self.assertEqual(res3.status_code, 401)

        # 4. Login with new password succeeds
        res4 = self.client.post("/api/accounts/login/", {
            "email": "reset_target@example.com",
            "password": "NewSecurePassword456!",
        })
        self.assertEqual(res4.status_code, 200)


