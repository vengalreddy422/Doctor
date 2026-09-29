import re
from datetime import timedelta
from django.utils import timezone
from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import authenticate, get_user_model
from django.conf import settings

from .serializers import (
    RegisterSerializer, UserSerializer, ProfileSerializer,
    VerifyOTPSerializer, ForgotPasswordSerializer, ResetPasswordSerializer
)
from .models import OTP
from .utils import send_otp_email
from .permissions import IsAdminRole

User = get_user_model()


def generate_safe_username(name, email):
    """Generate a clean, unique alphanumeric username from full name or email."""
    clean_name = re.sub(r'[^a-zA-Z0-9_]', '', name.strip().lower().replace(' ', '_'))
    if not clean_name or len(clean_name) < 2:
        clean_name = re.sub(r'[^a-zA-Z0-9_]', '', email.split('@')[0].lower())
    if not clean_name:
        clean_name = 'user'

    base_username = clean_name[:25]
    if not User.objects.filter(username__iexact=base_username).exclude(email=email).exists():
        return base_username
    return f"{base_username}_{int(timezone.now().timestamp()) % 10000}"


class RegisterView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        email = request.data.get('email', '').strip().lower()
        full_name = request.data.get('username', '').strip()
        phone = request.data.get('phone', '').strip()
        password = request.data.get('password', '')

        if not email or not full_name or not password:
            return Response({"error": "Please fill in all required fields (Name, Email, and Password)."}, status=status.HTTP_400_BAD_REQUEST)

        if not re.match(r'^[^\s@]+@[^\s@]+\.[^\s@]+$', email):
            return Response({"error": "Please provide a valid email address (e.g. name@example.com)."}, status=status.HTTP_400_BAD_REQUEST)

        if len(password) < 8:
            return Response({"error": "Password must be at least 8 characters long."}, status=status.HTTP_400_BAD_REQUEST)

        # Parse first and last names
        name_parts = full_name.split(' ', 1)
        first_name = name_parts[0].strip()
        last_name = name_parts[1].strip() if len(name_parts) > 1 else ''

        safe_username = generate_safe_username(full_name, email)

        existing_email_user = User.objects.filter(email=email).first()

        if existing_email_user and existing_email_user.is_verified:
            return Response({
                "error": "An account with this email is already registered. Please log in or use Forgot Password.",
                "already_registered": True
            }, status=status.HTTP_400_BAD_REQUEST)

        if existing_email_user and not existing_email_user.is_verified:
            user = existing_email_user
            user.username = safe_username
            user.first_name = first_name
            user.last_name = last_name
            if phone:
                user.phone = phone
            user.set_password(password)
            user.otp_attempts = 0
            user.save()
        else:
            user = User.objects.create_user(
                email=email,
                username=safe_username,
                first_name=first_name,
                last_name=last_name,
                phone=phone,
                password=password,
                is_verified=False,
                otp_attempts=0
            )

        otp = send_otp_email(user, purpose='verify_email')
        resp_data = {
            "message": "Account created! A 6-digit verification code has been sent to your email.",
            "email": email,
        }
        if getattr(settings, 'DEBUG', False) and otp:
            resp_data["dev_otp"] = otp.code

        return Response(resp_data, status=status.HTTP_201_CREATED)


class VerifyOTPView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = VerifyOTPSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data['email'].strip().lower()
        code = serializer.validated_data['code'].strip()

        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            return Response(
                {"error": "User registration was not found or was cancelled. Please register again.", "not_found": True, "rollback": True},
                status=status.HTTP_404_NOT_FOUND
            )

        if user.is_verified:
            return Response({"message": "Email is already verified. Please sign in with your password."})

        otp = OTP.objects.filter(
            user=user, code=code, purpose='verify_email', is_used=False
        ).order_by('-created_at').first()

        if otp is None or otp.is_expired():
            user.otp_attempts += 1
            if user.otp_attempts >= 3:
                # 3 failed attempts: Rollback / delete unverified user completely
                user.delete()
                return Response({
                    "error": "You have entered an incorrect verification code 3 times. For your security, this pending registration has been cancelled. Please register again.",
                    "attempts_exceeded": True,
                    "rollback": True
                }, status=status.HTTP_400_BAD_REQUEST)
            else:
                remaining = 3 - user.otp_attempts
                user.save(update_fields=['otp_attempts'])
                if otp and otp.is_expired():
                    return Response({
                        "error": f"This verification code has expired. Please click 'Resend Code'. You have {remaining} attempt{'s' if remaining != 1 else ''} remaining.",
                        "remaining_attempts": remaining,
                        "expired": True
                    }, status=status.HTTP_400_BAD_REQUEST)
                return Response({
                    "error": f"Incorrect verification code. You have {remaining} attempt{'s' if remaining != 1 else ''} remaining.",
                    "remaining_attempts": remaining,
                    "attempts_used": user.otp_attempts
                }, status=status.HTTP_400_BAD_REQUEST)

        # Correct OTP!
        otp.is_used = True
        otp.save()
        user.otp_attempts = 0
        user.is_verified = True
        user.save(update_fields=['is_verified', 'otp_attempts'])
        return Response({"message": "Email verified successfully! You can now log in."})


class ResendOTPView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        email = request.data.get('email', '').strip().lower()
        purpose = request.data.get('purpose', 'verify_email')

        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            return Response(
                {"error": "No registration found with this email address. Please register again.", "not_found": True, "rollback": True},
                status=status.HTTP_404_NOT_FOUND
            )

        # Reset OTP attempts on resend so user gets fresh attempts with new code
        user.otp_attempts = 0
        user.save(update_fields=['otp_attempts'])

        otp = send_otp_email(user, purpose=purpose)
        resp_data = {"message": "A fresh verification code has been sent to your email."}
        if getattr(settings, 'DEBUG', False) and otp:
            resp_data["dev_otp"] = otp.code
        return Response(resp_data)


class CancelRegistrationView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        email = request.data.get('email', '').strip().lower()
        if not email:
            return Response({"error": "Email is required."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            user = User.objects.get(email=email)
            if not user.is_verified:
                user.delete()
                return Response({
                    "message": "Registration cancelled and unverified details removed successfully.",
                    "rollback": True
                })
            else:
                return Response({"error": "Cannot cancel an already verified active account."}, status=status.HTTP_400_BAD_REQUEST)
        except User.DoesNotExist:
            return Response({"message": "No pending unverified registration found.", "rollback": True})


class ForgotPasswordView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = ForgotPasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data['email'].strip().lower()

        try:
            user = User.objects.get(email=email)
            otp = send_otp_email(user, purpose='reset_password')
            resp_data = {"message": "A 6-digit password reset OTP has been sent to your email.", "email": email}
            if getattr(settings, 'DEBUG', False) and otp:
                resp_data["dev_otp"] = otp.code
            return Response(resp_data)
        except User.DoesNotExist:
            return Response({"error": "No account found registered with this email address. Please check your spelling or sign up."}, status=status.HTTP_404_NOT_FOUND)


class ResetPasswordView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = ResetPasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data['email'].strip().lower()
        code = serializer.validated_data['code'].strip()
        new_password = serializer.validated_data['new_password']

        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            return Response({"error": "No account found with this email."}, status=status.HTTP_404_NOT_FOUND)

        otp = OTP.objects.filter(
            user=user, code=code, purpose='reset_password', is_used=False
        ).order_by('-created_at').first()

        if otp is None:
            return Response({"error": "Invalid verification code. Please check the code and try again."}, status=status.HTTP_400_BAD_REQUEST)
        if otp.is_expired():
            return Response({"error": "This verification code has expired. Please request a new code."}, status=status.HTTP_400_BAD_REQUEST)

        if len(new_password) < 8:
            return Response({"error": "Password must be at least 8 characters long."}, status=status.HTTP_400_BAD_REQUEST)

        otp.is_used = True
        otp.save()
        user.set_password(new_password)
        user.failed_login_attempts = 0
        user.lockout_until = None
        user.save()
        return Response({"message": "Password reset successfully! You can now log in with your new password."})


class LoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        login_input = request.data.get('email', '').strip().lower()
        password = request.data.get('password')

        if not login_input or not password:
            return Response({"error": "Please enter both your email/username and password."}, status=status.HTTP_400_BAD_REQUEST)

        # Case-insensitive resolution by email, username, hospital name, hospital slug, or cleaned alphanumeric
        user_obj = None
        if '@' in login_input:
            user_obj = User.objects.filter(email__iexact=login_input).first()
        else:
            # 1. Exact username, slug, hospital name, or email
            user_obj = (
                User.objects.filter(username__iexact=login_input).first() or
                User.objects.filter(hospital_slug__iexact=login_input).first() or
                User.objects.filter(hospital_name__iexact=login_input).first() or
                User.objects.filter(email__iexact=login_input).first()
            )

            # 2. If not found, try matching by clean alphanumeric slug (e.g. 'yashodahospitals' or 'apollo')
            if not user_obj:
                clean_input = re.sub(r'[^a-zA-Z0-9]', '', login_input)
                if clean_input:
                    user_obj = (
                        User.objects.filter(hospital_slug__icontains=clean_input).first() or
                        User.objects.filter(username__icontains=clean_input).first() or
                        User.objects.filter(hospital_name__icontains=login_input).first() or
                        User.objects.filter(hospital_name__icontains=clean_input).first()
                    )

            # 3. If multi-word string (e.g. "Yashoda Hospitals"), search by words
            if not user_obj and ' ' in login_input:
                first_word = login_input.split()[0].strip()
                if len(first_word) >= 3:
                    user_obj = (
                        User.objects.filter(role='hospital', hospital_name__icontains=first_word).first() or
                        User.objects.filter(role='hospital', username__icontains=first_word).first() or
                        User.objects.filter(role='hospital', hospital_slug__icontains=first_word).first()
                    )

        if not user_obj:
            return Response({
                "error": "No account found matching this email or username. Please check your spelling or create a new account.",
                "not_found": True
            }, status=status.HTTP_401_UNAUTHORIZED)

        # 1. Check if user account is currently locked out
        if user_obj.is_locked():
            rem_sec = user_obj.remaining_lockout_seconds()
            rem_min = max(1, (rem_sec + 59) // 60)
            return Response({
                "error": f"Account temporarily locked due to 3 failed attempts. Please try again in {rem_min} minute{'s' if rem_min != 1 else ''} or reset your password.",
                "locked": True,
                "remaining_seconds": rem_sec,
                "remaining_minutes": rem_min
            }, status=status.HTTP_429_TOO_MANY_REQUESTS)
        elif user_obj.lockout_until and timezone.now() >= user_obj.lockout_until:
            # 5 minutes have passed since lockout. User gets 1 attempt.
            user_obj.failed_login_attempts = 2
            user_obj.lockout_until = None
            user_obj.save(update_fields=['failed_login_attempts', 'lockout_until'])

        # 2. Attempt authentication
        username_for_auth = user_obj.email
        user = authenticate(request, username=username_for_auth, password=password)

        if user is None:
            user_obj.failed_login_attempts += 1
            if user_obj.failed_login_attempts >= 3:
                user_obj.lockout_until = timezone.now() + timedelta(minutes=5)
                user_obj.save(update_fields=['failed_login_attempts', 'lockout_until'])
                return Response({
                    "error": "You have entered an incorrect password 3 times. For your security, your account has been locked for 5 minutes.",
                    "locked": True,
                    "remaining_seconds": 300,
                    "remaining_minutes": 5
                }, status=status.HTTP_429_TOO_MANY_REQUESTS)
            else:
                remaining = 3 - user_obj.failed_login_attempts
                user_obj.save(update_fields=['failed_login_attempts'])
                return Response({
                    "error": f"Incorrect password. You have {remaining} attempt{'s' if remaining != 1 else ''} remaining before a 5-minute security lockout.",
                    "remaining_attempts": remaining
                }, status=status.HTTP_401_UNAUTHORIZED)

        # 3. Successful authentication
        user_obj.failed_login_attempts = 0
        user_obj.lockout_until = None
        user_obj.save(update_fields=['failed_login_attempts', 'lockout_until'])

        if not user.is_verified and not (user.role == 'admin' or user.is_superuser):
            # Resend fresh verification code
            otp = send_otp_email(user, purpose='verify_email')
            return Response({
                "error": "Your email address is not verified yet. We have sent a verification code to your email.",
                "email": user.email,
                "dev_otp": otp.code if (getattr(settings, 'DEBUG', False) and otp) else None,
                "needs_verification": True
            }, status=status.HTTP_403_FORBIDDEN)

        refresh = RefreshToken.for_user(user)
        return Response({
            "refresh": str(refresh),
            "access": str(refresh.access_token),
            "user": UserSerializer(user).data,
            "message": f"Welcome back, {user.first_name or user.username}!"
        })


class LogoutView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        try:
            refresh_str = request.data.get("refresh")
            if refresh_str:
                token = RefreshToken(refresh_str)
                token.blacklist()
            return Response({"message": "Logged out successfully."}, status=status.HTTP_200_OK)
        except Exception:
            return Response({"message": "Session cleared."}, status=status.HTTP_200_OK)


class CurrentUserView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(UserSerializer(request.user).data)


class ProfileView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get(self, request):
        return Response(ProfileSerializer(request.user).data)

    def patch(self, request):
        serializer = ProfileSerializer(request.user, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response({
            "message": "Profile updated successfully.",
            "user": UserSerializer(request.user).data
        })


from accounts.permissions import IsHospitalOrAdminRole
from django.db.models import Q


class AdminPatientListView(generics.ListAPIView):
    serializer_class = UserSerializer
    permission_classes = [IsHospitalOrAdminRole]

    def get_queryset(self):
        qs = User.objects.filter(role='patient').order_by('-date_joined')
        search = self.request.GET.get('search')
        if search:
            qs = qs.filter(
                Q(username__icontains=search) |
                Q(email__icontains=search) |
                Q(first_name__icontains=search) |
                Q(last_name__icontains=search) |
                Q(phone__icontains=search)
            )
        return qs

