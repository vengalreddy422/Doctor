from django.contrib import admin
from .models import Payment


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ('patient', 'appointment', 'amount', 'status', 'created_at')
    list_filter = ('status',)
    search_fields = ('patient__email', 'razorpay_order_id')
