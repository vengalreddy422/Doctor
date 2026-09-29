from django.contrib import admin
from .models import Slot, Appointment, Coupon


@admin.register(Slot)
class SlotAdmin(admin.ModelAdmin):
    list_display = ('doctor', 'date', 'start_time', 'end_time', 'max_capacity',
                    'is_blocked', 'booked_count')
    list_filter = ('doctor', 'date', 'is_blocked')
    list_editable = ('is_blocked',)
    date_hierarchy = 'date'

    def booked_count(self, obj):
        return obj.booked_count()


@admin.register(Appointment)
class AppointmentAdmin(admin.ModelAdmin):
    list_display = ('receipt_id', 'patient', 'doctor', 'slot', 'status',
                    'original_fee', 'discount_amount', 'coupon_code', 'fee_charged', 'created_at')
    list_filter = ('status', 'doctor', 'coupon_code')
    search_fields = ('patient__email', 'doctor__name', 'receipt_id', 'coupon_code')
    list_editable = ('status',)
    readonly_fields = ('receipt_id', 'created_at', 'updated_at')
    date_hierarchy = 'created_at'


@admin.register(Coupon)
class CouponAdmin(admin.ModelAdmin):
    list_display = ('code', 'title', 'discount_type', 'discount_value', 'coupon_type', 'required_bookings', 'is_active', 'created_at')
    list_filter = ('coupon_type', 'discount_type', 'is_active')
    search_fields = ('code', 'title', 'description')
    list_editable = ('is_active',)

