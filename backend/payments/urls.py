from django.urls import path
from .views import (
    CreateOrderView, VerifyPaymentView, MyPaymentHistoryView, RazorpayWebhookView,
    AdminFailedRefundsListView, AdminRetryRefundView
)

urlpatterns = [
    path('create-order/<int:appointment_id>/', CreateOrderView.as_view(), name='create_order'),
    path('verify/', VerifyPaymentView.as_view(), name='verify_payment'),
    path('webhook/', RazorpayWebhookView.as_view(), name='razorpay_webhook'),
    path('my-payments/', MyPaymentHistoryView.as_view(), name='api_my_payments'),
    path('admin/failed-refunds/', AdminFailedRefundsListView.as_view(), name='admin_failed_refunds'),
    path('admin/refunds/<int:payment_id>/retry/', AdminRetryRefundView.as_view(), name='admin_retry_refund'),
]
