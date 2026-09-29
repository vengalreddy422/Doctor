from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from .views import (
    RegisterView, VerifyOTPView, ResendOTPView, CancelRegistrationView, LoginView, LogoutView,
    CurrentUserView, ProfileView, ForgotPasswordView, ResetPasswordView,
    AdminPatientListView
)

urlpatterns = [
    path('register/', RegisterView.as_view(), name='api_register'),
    path('verify-otp/', VerifyOTPView.as_view(), name='api_verify_otp'),
    path('resend-otp/', ResendOTPView.as_view(), name='api_resend_otp'),
    path('cancel-registration/', CancelRegistrationView.as_view(), name='api_cancel_registration'),
    path('login/', LoginView.as_view(), name='api_login'),
    path('logout/', LogoutView.as_view(), name='api_logout'),
    path('me/', CurrentUserView.as_view(), name='api_current_user'),
    path('profile/', ProfileView.as_view(), name='api_profile'),
    path('forgot-password/', ForgotPasswordView.as_view(), name='api_forgot_password'),
    path('reset-password/', ResetPasswordView.as_view(), name='api_reset_password'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('admin/patients/', AdminPatientListView.as_view(), name='admin_patient_list'),
]
