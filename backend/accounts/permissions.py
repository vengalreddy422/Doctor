from rest_framework.permissions import BasePermission


class IsAdminRole(BasePermission):
    """Checks our own `role` field (business role), not is_staff/is_superuser
    (Django admin-site access) — these are separate concepts."""

    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and (request.user.role == 'admin' or request.user.is_superuser))


class IsHospitalRole(BasePermission):
    """Checks if the user has the hospital management role."""

    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.role == 'hospital')


class IsHospitalOrAdminRole(BasePermission):
    """Checks if user is either Super Admin or Hospital Facility Admin."""

    def has_permission(self, request, view):
        return bool(
            request.user and request.user.is_authenticated and 
            (request.user.role in ('admin', 'hospital') or request.user.is_superuser)
        )
