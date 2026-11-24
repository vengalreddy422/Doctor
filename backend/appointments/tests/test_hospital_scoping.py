import datetime
import zoneinfo
from decimal import Decimal
import pytest
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient

from accounts.models import User
from doctors.models import Doctor, Hospital
from appointments.models import Slot, Appointment
from payments.models import Payment

KOLKATA = zoneinfo.ZoneInfo("Asia/Kolkata")


@pytest.mark.django_db
class TestHospitalScopingAndPermissions:
    """
    Security and Multi-Tenant Isolation Test Suite.
    Enforces that Hospital A staff CANNOT access, view, or mutate Hospital B data.
    """

    @pytest.fixture(autouse=True)
    def setup_hospitals_and_users(self, db):
        # Hospital A & Staff A
        self.hospital_a, _ = Hospital.objects.get_or_create(
            name="City Care Hospital A",
            defaults={"city": "Bengaluru", "address": "Indiranagar", "slug": "city-care-hospital-a"}
        )
        self.staff_a, _ = User.objects.get_or_create(
            email="staff.a@hospital-a.com",
            defaults={
                "username": "staff_a",
                "role": "hospital",
                "hospital": self.hospital_a,
                "hospital_name": self.hospital_a.name,
                "is_verified": True,
            }
        )
        self.staff_a.set_password("Password123!")
        self.staff_a.save()

        # Doctor A & Slot A
        self.doctor_a, _ = Doctor.objects.get_or_create(
            contact_email="dr.a@hospital-a.com",
            defaults={
                "name": "Dr. Alpha",
                "specialization": "Cardiology",
                "hospital": self.hospital_a,
                "hospital_name": self.hospital_a.name,
                "fee": Decimal("500.00"),
                "experience_years": 10,
                "qualification": "MBBS, MD (Cardio)",
                "is_active": True,
            }
        )
        self.slot_a, _ = Slot.objects.get_or_create(
            doctor=self.doctor_a,
            date=datetime.date(2026, 12, 1),
            start_time=datetime.time(10, 0),
            defaults={"end_time": datetime.time(10, 30), "max_capacity": 5}
        )

        # Hospital B & Staff B
        self.hospital_b, _ = Hospital.objects.get_or_create(
            name="Metro Health Hospital B",
            defaults={"city": "Mumbai", "address": "Bandra", "slug": "metro-health-hospital-b"}
        )
        self.staff_b, _ = User.objects.get_or_create(
            email="staff.b@hospital-b.com",
            defaults={
                "username": "staff_b",
                "role": "hospital",
                "hospital": self.hospital_b,
                "hospital_name": self.hospital_b.name,
                "is_verified": True,
            }
        )
        self.staff_b.set_password("Password123!")
        self.staff_b.save()

        # Doctor B & Slot B
        self.doctor_b, _ = Doctor.objects.get_or_create(
            contact_email="dr.b@hospital-b.com",
            defaults={
                "name": "Dr. Beta",
                "specialization": "Neurology",
                "hospital": self.hospital_b,
                "hospital_name": self.hospital_b.name,
                "fee": Decimal("750.00"),
                "experience_years": 12,
                "qualification": "MBBS, MD (Neuro)",
                "is_active": True,
            }
        )
        self.slot_b, _ = Slot.objects.get_or_create(
            doctor=self.doctor_b,
            date=datetime.date(2026, 12, 1),
            start_time=datetime.time(11, 0),
            defaults={"end_time": datetime.time(11, 30), "max_capacity": 5}
        )

        # Patient & Appointments
        self.patient, _ = User.objects.get_or_create(
            email="patient.tenant@careconnect.health",
            defaults={"username": "patient_tenant", "role": "patient", "is_verified": True}
        )
        self.patient.set_password("Password123!")
        self.patient.save()

        self.appt_a = Appointment.objects.create(
            patient=self.patient,
            doctor=self.doctor_a,
            slot=self.slot_a,
            status='confirmed',
            fee_charged=Decimal("500.00"),
            receipt_id="RCP-A-001"
        )

        self.appt_b = Appointment.objects.create(
            patient=self.patient,
            doctor=self.doctor_b,
            slot=self.slot_b,
            status='confirmed',
            fee_charged=Decimal("750.00"),
            receipt_id="RCP-B-001"
        )

        # Superadmin
        self.admin, _ = User.objects.get_or_create(
            email="superadmin.tenant@careconnect.health",
            defaults={"username": "admin_tenant", "role": "admin", "is_superuser": True}
        )
        self.admin.set_password("Password123!")
        self.admin.save()

    def test_unauthenticated_requests_denied(self, api_client):
        """Unauthenticated requests to all hospital endpoints must return 401."""
        endpoints = [
            "/api/appointments/hospital/queue/",
            "/api/appointments/hospital/analytics/",
            "/api/appointments/hospital/doctors/",
            "/api/appointments/hospital/slots/",
            "/api/appointments/hospital/emergency/",
            "/api/appointments/hospital/payments/",
        ]
        for ep in endpoints:
            res = api_client.get(ep)
            assert res.status_code == status.HTTP_401_UNAUTHORIZED, f"Expected 401 on {ep}, got {res.status_code}"

    def test_patient_requests_denied(self, api_client):
        """Standard patients must be rejected with 403 Forbidden."""
        api_client.force_authenticate(user=self.patient)
        endpoints = [
            "/api/appointments/hospital/queue/",
            "/api/appointments/hospital/analytics/",
            "/api/appointments/hospital/doctors/",
            "/api/appointments/hospital/slots/",
            "/api/appointments/hospital/emergency/",
            "/api/appointments/hospital/payments/",
        ]
        for ep in endpoints:
            res = api_client.get(ep)
            assert res.status_code == status.HTTP_403_FORBIDDEN, f"Expected 403 on {ep}, got {res.status_code}"

    def test_cross_hospital_isolation_queue_and_analytics(self, api_client):
        """
        Hospital A staff querying Hospital B via explicit parameter must receive 403 Forbidden.
        Standard queries must return ONLY Hospital A data.
        """
        api_client.force_authenticate(user=self.staff_a)

        # 1. Hospital A staff tries to query Hospital B queue
        res_cross_queue = api_client.get(f"/api/appointments/hospital/queue/?hospital_id={self.hospital_b.id}")
        assert res_cross_queue.status_code == status.HTTP_403_FORBIDDEN
        assert "different hospital facility" in res_cross_queue.data.get("error", "").lower()

        # 2. Hospital A staff tries to query Hospital B analytics
        res_cross_analytics = api_client.get(f"/api/appointments/hospital/analytics/?hospital_id={self.hospital_b.id}")
        assert res_cross_analytics.status_code == status.HTTP_403_FORBIDDEN

        # 3. Hospital A staff querying own queue receives ONLY Hospital A appointment
        res_own_queue = api_client.get("/api/appointments/hospital/queue/")
        assert res_own_queue.status_code == status.HTTP_200_OK
        appt_ids = [a["id"] for a in res_own_queue.data["results"]]
        assert self.appt_a.id in appt_ids
        assert self.appt_b.id not in appt_ids
        assert res_own_queue.data["hospital"]["id"] == self.hospital_a.id

    def test_cross_hospital_check_in_and_complete_forbidden(self, api_client):
        """Hospital A staff CANNOT check-in or complete an appointment belonging to Hospital B."""
        api_client.force_authenticate(user=self.staff_a)

        # Attempt to check in Hospital B appointment
        res_check_in = api_client.post(f"/api/appointments/{self.appt_b.id}/check-in/")
        assert res_check_in.status_code == status.HTTP_403_FORBIDDEN
        assert "Unauthorized" in res_check_in.data.get("error", "")

        # Attempt to complete Hospital B appointment
        res_complete = api_client.post(f"/api/appointments/{self.appt_b.id}/complete/")
        assert res_complete.status_code == status.HTTP_403_FORBIDDEN
        assert "Unauthorized" in res_complete.data.get("error", "")

        # But can check in own appointment
        res_own = api_client.post(f"/api/appointments/{self.appt_a.id}/check-in/")
        assert res_own.status_code == status.HTTP_200_OK
        self.appt_a.refresh_from_db()
        assert self.appt_a.op_checked_in is True

    def test_cross_hospital_doctor_and_slot_actions_forbidden(self, api_client):
        """Hospital A staff CANNOT toggle or mutate doctors/slots of Hospital B."""
        api_client.force_authenticate(user=self.staff_a)

        # Attempt to toggle Doctor B active state
        res_doc = api_client.post("/api/appointments/hospital/doctors/", {"doctor_id": self.doctor_b.id})
        assert res_doc.status_code == status.HTTP_403_FORBIDDEN

        # Attempt to toggle Slot B block
        res_slot = api_client.post("/api/appointments/hospital/slots/", {"slot_id": self.slot_b.id})
        assert res_slot.status_code == status.HTTP_403_FORBIDDEN

        # Attempt to emergency resolve Slot B
        res_emerg = api_client.post("/api/appointments/hospital/emergency/", {
            "slot_id": self.slot_b.id,
            "resolution": "refund"
        })
        assert res_emerg.status_code == status.HTTP_403_FORBIDDEN

    def test_admin_scoping_and_404_handling(self, api_client):
        """Admin can query both Hospital A and B, but gets 404 for non-existent hospital."""
        api_client.force_authenticate(user=self.admin)

        # Admin querying Hospital A
        res_a = api_client.get(f"/api/appointments/hospital/queue/?hospital_id={self.hospital_a.id}")
        assert res_a.status_code == status.HTTP_200_OK
        assert res_a.data["hospital"]["id"] == self.hospital_a.id

        # Admin querying Hospital B
        res_b = api_client.get(f"/api/appointments/hospital/queue/?hospital_id={self.hospital_b.id}")
        assert res_b.status_code == status.HTTP_200_OK
        assert res_b.data["hospital"]["id"] == self.hospital_b.id

        # Admin querying invalid hospital ID
        res_404 = api_client.get("/api/appointments/hospital/queue/?hospital_id=999999")
        assert res_404.status_code == status.HTTP_404_NOT_FOUND

    def test_queue_pagination_boundaries(self, api_client):
        """Validates DRF server-side pagination with exact counts and pages."""
        api_client.force_authenticate(user=self.staff_a)

        # Request page_size=1
        res = api_client.get("/api/appointments/hospital/queue/?page=1&page_size=1")
        assert res.status_code == status.HTTP_200_OK
        assert res.data["page_size"] == 1
        assert len(res.data["results"]) == 1
        assert res.data["count"] >= 1
        assert "summary" in res.data
        assert "ready_to_admit" in res.data["summary"]
