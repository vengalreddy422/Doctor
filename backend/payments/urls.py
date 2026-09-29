from django.urls import path
from .views import CreateOrderView, VerifyPaymentView, MyPaymentHistoryView

urlpatterns = [
    path('create-order/<int:appointment_id>/', CreateOrderView.as_view(), name='create_order'),
    path('verify/', VerifyPaymentView.as_view(), name='verify_payment'),
    path('my-payments/', MyPaymentHistoryView.as_view(), name='api_my_payments'),
]
