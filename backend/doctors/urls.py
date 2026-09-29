from django.urls import path
from .views import (
    DoctorListView, DoctorDetailView, SpecializationsListView, AboutStatsView,
    AdminDoctorListCreateView, AdminDoctorDetailView, 
    HospitalListView, AdminHospitalListCreateView, AdminHospitalDetailView,
    doctor_search_api, doctor_available_dates_api, doctor_available_slots_api
)

urlpatterns = [
    path('', DoctorListView.as_view(), name='api_doctor_list'),
    path('specializations/', SpecializationsListView.as_view(), name='api_specializations_list'),
    path('about-stats/', AboutStatsView.as_view(), name='api_about_stats'),
    path('hospitals/', HospitalListView.as_view(), name='api_hospital_list'),
    path('admin/hospitals/', AdminHospitalListCreateView.as_view(), name='admin_hospital_list_create'),
    path('admin/hospitals/<int:pk>/', AdminHospitalDetailView.as_view(), name='admin_hospital_detail'),
    path('search/', doctor_search_api, name='doctor_search_api'),
    path('<int:pk>/', DoctorDetailView.as_view(), name='api_doctor_detail'),
    path('<int:pk>/available-dates/', doctor_available_dates_api, name='doctor_available_dates_api'),
    path('<int:pk>/slots/', doctor_available_slots_api, name='doctor_available_slots_api'),
    path('<int:pk>/available-slots/', doctor_available_slots_api, name='doctor_available_slots_alias'),
    path('admin/', AdminDoctorListCreateView.as_view(), name='admin_doctor_list_create'),
    path('admin/<int:pk>/', AdminDoctorDetailView.as_view(), name='admin_doctor_detail'),
]
