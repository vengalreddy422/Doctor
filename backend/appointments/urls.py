from django.urls import path
from .views import (
    BookAppointmentView, MyAppointmentsView, CancelAppointmentView,
    CancellationPreviewView, RescheduleAppointmentView, AdminAppointmentListView,
    AdminAppointmentStatusUpdateView, AdminDashboardStatsView,
    AppointmentDetailView, AvailableCouponsView, ValidateCouponView,
    AdminSlotListView, AdminCancelSlotView, AdminToggleSlotBlockView,
    AdminRescheduleAppointmentView, HospitalDashboardStatsView,
    AppointmentCheckInView, AppointmentCompleteView, AppointmentReviewView
)

urlpatterns = [
    path('', BookAppointmentView.as_view(), name='api_appointments_root'),
    path('<int:pk>/', AppointmentDetailView.as_view(), name='api_appointment_detail'),
    path('<int:appointment_id>/check-in/', AppointmentCheckInView.as_view(), name='api_appointment_check_in'),
    path('<int:appointment_id>/complete/', AppointmentCompleteView.as_view(), name='api_appointment_complete'),
    path('<int:appointment_id>/review/', AppointmentReviewView.as_view(), name='api_appointment_review'),
    path('book/', BookAppointmentView.as_view(), name='api_book_appointment'),
    path('available-coupons/', AvailableCouponsView.as_view(), name='api_available_coupons'),
    path('validate-coupon/', ValidateCouponView.as_view(), name='api_validate_coupon'),
    path('my-appointments/', MyAppointmentsView.as_view(), name='api_my_appointments'),
    path('cancel-preview/<int:appointment_id>/', CancellationPreviewView.as_view(), name='api_cancellation_preview'),
    path('cancel/<int:appointment_id>/', CancelAppointmentView.as_view(), name='api_cancel_appointment'),
    path('reschedule/<int:appointment_id>/', RescheduleAppointmentView.as_view(), name='api_reschedule_appointment'),
    
    # Hospital Management endpoints
    path('hospital/stats/', HospitalDashboardStatsView.as_view(), name='hospital_dashboard_stats'),
    path('hospital/slots/<int:slot_id>/cancel/', AdminCancelSlotView.as_view(), name='hospital_cancel_slot'),

    # Admin endpoints
    path('admin/all/', AdminAppointmentListView.as_view(), name='admin_appointment_list'),
    path('admin/<int:appointment_id>/status/', AdminAppointmentStatusUpdateView.as_view(), name='admin_status_update'),
    path('admin/<int:appointment_id>/reschedule/', AdminRescheduleAppointmentView.as_view(), name='admin_reschedule_appointment'),
    path('admin/slots/', AdminSlotListView.as_view(), name='admin_slot_list'),
    path('admin/slots/<int:slot_id>/cancel/', AdminCancelSlotView.as_view(), name='admin_cancel_slot'),
    path('admin/slots/<int:slot_id>/toggle-block/', AdminToggleSlotBlockView.as_view(), name='admin_toggle_slot_block'),
    path('admin/stats/', AdminDashboardStatsView.as_view(), name='admin_stats'),
]


