from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import User, OTP


class CustomUserAdmin(UserAdmin):
    model = User
    list_display = ('email', 'username', 'role', 'is_verified', 'is_staff')
    list_filter = ('role', 'is_verified', 'is_staff')
    fieldsets = UserAdmin.fieldsets + (
        ('Extra Info', {'fields': ('role', 'phone', 'is_verified', 'profile_image', 'gender', 'birthday', 'address')}),
    )
    add_fieldsets = UserAdmin.add_fieldsets + (
        ('Extra Info', {'fields': ('email', 'role', 'phone')}),
    )


admin.site.register(User, CustomUserAdmin)
admin.site.register(OTP)
