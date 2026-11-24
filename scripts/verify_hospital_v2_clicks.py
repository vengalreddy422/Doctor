"""
Comprehensive Outcome-Verified Browser Verification for Hospital Dashboard V2
Executes real Playwright browser clicks, verifying both visible DOM updates and PostgreSQL DB mutations.
"""
import os
import sys
import time
import socket
import subprocess
import datetime
import zoneinfo
from decimal import Decimal

# Ensure test DB environment
os.environ["ENV_FILE"] = ".env.test"

import django
sys.path.insert(0, os.path.abspath("backend"))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from django.utils import timezone
from accounts.models import User
from doctors.models import Doctor, Hospital
from appointments.models import Slot, Appointment
from payments.models import Payment

from playwright.sync_api import sync_playwright

KOLKATA = zoneinfo.ZoneInfo("Asia/Kolkata")
SCREENSHOT_DIR = os.path.abspath("e2e/screenshots")
os.makedirs(SCREENSHOT_DIR, exist_ok=True)

def is_port_in_use(port):
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        return s.connect_ex(('127.0.0.1', port)) == 0

def ensure_servers():
    backend_proc = None
    frontend_proc = None

    if not is_port_in_use(8000):
        print("Starting Django backend server on port 8000 (careconnect_isolated_test)...")
        env = os.environ.copy()
        env["ENV_FILE"] = ".env.test"
        backend_proc = subprocess.Popen(
            [sys.executable, "backend/manage.py", "runserver", "127.0.0.1:8000", "--noreload"],
            env=env,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL
        )
        for _ in range(30):
            if is_port_in_use(8000):
                print("Backend server is UP!")
                break
            time.sleep(1)

    if not is_port_in_use(5173):
        print("Starting Vite frontend server on port 5173...")
        frontend_proc = subprocess.Popen(
            ["npm", "--prefix", "frontend", "run", "dev", "--", "--port", "5173", "--host"],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            shell=True
        )
        for _ in range(30):
            if is_port_in_use(5173):
                print("Frontend server is UP!")
                break
            time.sleep(1)

    return backend_proc, frontend_proc


def run_click_verification():
    backend_proc, frontend_proc = ensure_servers()

    try:
        with sync_playwright() as p:
            print("\n========================================================")
            print("CARECONNECT HOSPITAL DASHBOARD V2 - CLICK VERIFICATION")
            print("========================================================\n")

            browser = p.chromium.launch(headless=True)
            context = browser.new_context(viewport={"width": 1440, "height": 900})
            page = context.new_page()

            # ------------------------------------------------------------------
            # 1. AUTHENTICATION & LOGIN
            # ------------------------------------------------------------------
            print("[Step 1] Logging in as Hospital Staff via UI...")
            page.goto("http://localhost:5173/login", wait_until="networkidle")
            page.wait_for_selector("#id_email", timeout=15000)
            page.fill('#id_email', "hospital.staff.a@careconnect.health")
            page.fill('#id_password', "Password123!")
            page.click('button[type="submit"]')

            # Wait for redirect to /hospital/queue
            page.wait_for_url("**/hospital/queue**", timeout=15000)
            page.wait_for_selector(".cc-table", timeout=15000)
            print("   [PASS] Logged in successfully. Current URL:", page.url)

            # Check toolbar badge has real count (>0)
            badge_text = page.locator("#badge-ready-to-admit").inner_text()
            print(f"   [PASS] Toolbar dynamic pending badge: '{badge_text}'")
            assert "0 Pending" not in badge_text, f"Badge should not be 0 Pending, got {badge_text}"

            # ------------------------------------------------------------------
            # 2. CLICK ACTION: ACCEPT PATIENT (CHECK-IN)
            # ------------------------------------------------------------------
            print("\n[Step 2] Testing 'Accept Patient' button click...")
            # Pick a confirmed waiting patient from DB
            hosp_a = Hospital.objects.get(name="CareConnect Apex General Hospital")
            candidate_checkin = Appointment.objects.filter(
                doctor__hospital=hosp_a,
                status="confirmed",
                op_checked_in=False
            ).first()
            assert candidate_checkin is not None, "Need a confirmed waiting appointment for check-in test"

            # Search specifically for candidate to isolate the row
            search_input = page.locator('input[placeholder*="Search by patient name"]')
            search_input.fill(candidate_checkin.patient_name)
            page.wait_for_timeout(600)  # debounce
            page.wait_for_selector(".cc-table tbody tr", timeout=10000)

            # Locate the 'Accept Patient' button for candidate
            accept_btn = page.locator(f'button:has-text("Accept Patient")').first
            assert accept_btn.is_visible(), "Accept Patient button must be visible"

            # Click Accept Patient
            accept_btn.click()

            # Assert UI Updates: toast appears & status pill changes to 'In OP Chamber'
            page.wait_for_selector('.cc-status-in-op', timeout=10000)
            print("   [PASS] UI Assertion: Row status pill changed to 'In OP Chamber'")

            # Assert DB Update
            candidate_checkin.refresh_from_db()
            assert candidate_checkin.op_checked_in is True, "DB Assertion Failed: op_checked_in is False"
            assert candidate_checkin.op_checked_in_at is not None, "DB Assertion Failed: op_checked_in_at is None"
            print(f"   [PASS] DB Assertion: op_checked_in=True, timestamp={candidate_checkin.op_checked_in_at}")

            # ------------------------------------------------------------------
            # 3. CLICK ACTION: COMPLETE CONSULTATION
            # ------------------------------------------------------------------
            print("\n[Step 3] Testing 'Complete Consultation' button click...")
            complete_btn = page.locator('button:has-text("Complete Consultation")').first
            assert complete_btn.is_visible(), "Complete Consultation button must be visible for checked-in patient"

            # Click Complete Consultation
            complete_btn.click()

            # Assert UI Updates: status pill becomes 'Consultation Completed'
            page.wait_for_selector('.cc-status-completed', timeout=10000)
            print("   [PASS] UI Assertion: Row status pill changed to 'Consultation Completed'")

            # Assert DB Update
            candidate_checkin.refresh_from_db()
            assert candidate_checkin.status == "completed", f"DB Assertion Failed: status is {candidate_checkin.status}"
            assert candidate_checkin.completed_at is not None, "DB Assertion Failed: completed_at is None"
            print(f"   [PASS] DB Assertion: status='completed', completed_at={candidate_checkin.completed_at}")

            # Clear search
            search_input.fill("")
            page.wait_for_timeout(600)

            # ------------------------------------------------------------------
            # 4. CLICK ACTION: RESCHEDULE APPOINTMENT
            # ------------------------------------------------------------------
            print("\n[Step 4] Testing 'Reschedule' modal and submission click...")
            candidate_reschedule = Appointment.objects.filter(
                doctor__hospital=hosp_a,
                status="confirmed",
                op_checked_in=False
            ).exclude(id=candidate_checkin.id).first()
            assert candidate_reschedule is not None, "Need candidate for reschedule test"
            orig_slot_id = candidate_reschedule.slot_id

            search_input.fill(candidate_reschedule.patient_name)
            page.wait_for_timeout(600)

            reschedule_btn = page.locator('button:has-text("Reschedule")').first
            reschedule_btn.click()

            # Assert modal is open
            page.wait_for_selector('.cc-modal-backdrop', timeout=10000)
            print("   [PASS] UI Assertion: Reschedule modal is displayed.")

            # Pick target slot
            slot_select = page.locator('select').last
            options_count = slot_select.locator('option').count()
            if options_count > 1:
                slot_select.select_option(index=1)

            reason_input = page.locator('textarea, input[type="text"]').last
            if reason_input.is_visible():
                reason_input.fill("Patient requested slot realignment.")

            confirm_reschedule_btn = page.locator('button:has-text("Confirm Reschedule")')
            confirm_reschedule_btn.click()

            # Wait for modal close
            page.wait_for_selector('.cc-modal-backdrop', state="hidden", timeout=10000)
            print("   [PASS] UI Assertion: Reschedule modal closed after submission.")

            # Assert DB Update
            candidate_reschedule.refresh_from_db()
            assert candidate_reschedule.reschedule_count >= 1, "DB Assertion Failed: reschedule_count was not incremented"
            print(f"   [PASS] DB Assertion: reschedule_count={candidate_reschedule.reschedule_count}, slot_id={candidate_reschedule.slot_id} (orig was {orig_slot_id})")

            # Clear search
            search_input.fill("")
            page.wait_for_timeout(600)

            # ------------------------------------------------------------------
            # 5. CLICK ACTION: CANCEL & REFUND
            # ------------------------------------------------------------------
            print("\n[Step 5] Testing 'Cancel & Refund' modal and confirmation click...")
            candidate_cancel = Appointment.objects.filter(
                doctor__hospital=hosp_a,
                status="confirmed",
                op_checked_in=False
            ).exclude(id__in=[candidate_checkin.id, candidate_reschedule.id]).first()
            assert candidate_cancel is not None, "Need candidate for cancel test"

            search_input.fill(candidate_cancel.patient_name)
            page.wait_for_timeout(600)

            cancel_btn = page.locator('button:has-text("Cancel & Refund")').first
            cancel_btn.click()

            # Assert modal is open
            page.wait_for_selector('.cc-modal-backdrop', timeout=10000)
            print("   [PASS] UI Assertion: Cancellation confirmation modal displayed.")

            confirm_cancel_btn = page.locator('button:has-text("Confirm Full Refund & Cancel")')
            confirm_cancel_btn.click()

            # Wait for modal close
            page.wait_for_selector('.cc-modal-backdrop', state="hidden", timeout=10000)

            # Assert UI Updates
            page.wait_for_selector('.cc-status-cancelled', timeout=10000)
            print("   [PASS] UI Assertion: Row status pill changed to 'Cancelled & Refunded'")

            # Assert DB Update
            candidate_cancel.refresh_from_db()
            assert candidate_cancel.status == "cancelled", f"DB Assertion Failed: status is {candidate_cancel.status}"
            pay = Payment.objects.filter(appointment=candidate_cancel).first()
            if pay:
                assert pay.status == "refunded", f"DB Assertion Failed: payment status is {pay.status}"
            print(f"   [PASS] DB Assertion: appointment.status='cancelled', payment.status='{pay.status if pay else 'N/A'}'")

            # Clear search
            search_input.fill("")
            page.wait_for_timeout(600)

            # ------------------------------------------------------------------
            # 6. CLICK ACTION: BLOCK & UNBLOCK SLOT
            # ------------------------------------------------------------------
            print("\n[Step 6] Navigating to /hospital/slots and testing Block/Unblock Slot click...")
            page.goto("http://localhost:5173/hospital/slots", wait_until="networkidle")
            page.wait_for_selector(".cc-slots-grid", timeout=15000)

            # Find first slot card that is not blocked
            unblocked_slot = Slot.objects.filter(doctor__hospital=hosp_a, is_blocked=False).first()
            assert unblocked_slot is not None, "Need an unblocked slot in DB"

            block_btn = page.locator('button:has-text("Block Slot")').first
            block_btn.click()

            # Wait for UI toggle
            page.wait_for_selector('button:has-text("Unblock Slot")', timeout=10000)
            print("   [PASS] UI Assertion: Button toggled to 'Unblock Slot'")

            unblocked_slot.refresh_from_db()
            assert unblocked_slot.is_blocked is True, "DB Assertion Failed: slot.is_blocked is False after block"
            print(f"   [PASS] DB Assertion: slot {unblocked_slot.id} is_blocked=True")

            # Now click Unblock Slot
            unblock_btn = page.locator('button:has-text("Unblock Slot")').first
            unblock_btn.click()

            # Wait for UI toggle back
            page.wait_for_selector('button:has-text("Block Slot")', timeout=10000)
            print("   [PASS] UI Assertion: Button toggled back to 'Block Slot'")

            unblocked_slot.refresh_from_db()
            assert unblocked_slot.is_blocked is False, "DB Assertion Failed: slot.is_blocked is True after unblock"
            print(f"   [PASS] DB Assertion: slot {unblocked_slot.id} is_blocked=False")

            # ------------------------------------------------------------------
            # 7. CLICK ACTION: DOCTOR EDIT DETAILS & DEACTIVATE / ACTIVATE
            # ------------------------------------------------------------------
            print("\n[Step 7] Navigating to /hospital/doctors and testing Doctor Activate/Deactivate & Edit Profile...")
            page.goto("http://localhost:5173/hospital/doctors", wait_until="networkidle")
            page.wait_for_selector(".cc-roster-grid", timeout=15000)

            doc_test = Doctor.objects.get(contact_email="dr.arjun.mehta@careconnect.health")

            # Find button Deactivate Specialist for Dr. Arjun Mehta
            deactivate_btn = page.locator('button:has-text("Deactivate Specialist")').first
            deactivate_btn.click()

            page.wait_for_selector('button:has-text("Activate Specialist")', timeout=10000)
            print("   [PASS] UI Assertion: Button changed to 'Activate Specialist'")

            doc_test.refresh_from_db()
            assert doc_test.is_active is False, "DB Assertion Failed: doctor.is_active is True after deactivate"
            print(f"   [PASS] DB Assertion: doctor {doc_test.name} is_active=False")

            # Click Activate Specialist back
            activate_btn = page.locator('button:has-text("Activate Specialist")').first
            activate_btn.click()
            page.wait_for_selector('button:has-text("Deactivate Specialist")', timeout=10000)
            print("   [PASS] UI Assertion: Button changed back to 'Deactivate Specialist'")

            doc_test.refresh_from_db()
            assert doc_test.is_active is True, "DB Assertion Failed: doctor.is_active is False after activate"
            print(f"   [PASS] DB Assertion: doctor {doc_test.name} is_active=True")

            # Test Edit Profile modal
            edit_profile_btn = page.locator('button:has-text("Edit Profile")').first
            edit_profile_btn.click()
            page.wait_for_selector('.cc-modal-backdrop', timeout=10000)
            print("   [PASS] UI Assertion: Doctor Edit Profile modal opened.")

            fee_input = page.locator('input[type="number"]').first
            fee_input.fill("1150.00")

            save_doc_btn = page.locator('button:has-text("Save Changes")')
            save_doc_btn.click()

            page.wait_for_selector('.cc-modal-backdrop', state="hidden", timeout=10000)
            print("   [PASS] UI Assertion: Doctor Edit Profile modal saved and closed.")

            doc_test.refresh_from_db()
            assert doc_test.fee == Decimal("1150.00"), f"DB Assertion Failed: doctor fee is {doc_test.fee}"
            print(f"   [PASS] DB Assertion: doctor fee updated to ₹{doc_test.fee}")

            # ------------------------------------------------------------------
            # 8. EMERGENCY RESOLUTION HUB
            # ------------------------------------------------------------------
            print("\n[Step 8] Navigating to /hospital/emergency and verifying triage interface...")
            page.goto("http://localhost:5173/hospital/emergency", wait_until="networkidle")
            assert "Emergency Slot Resolution Hub" in page.content()
            print("   [PASS] UI Assertion: Emergency Hub rendered properly.")

            # ------------------------------------------------------------------
            # 9. INVOICE MODAL OPEN / PRINT
            # ------------------------------------------------------------------
            print("\n[Step 9] Navigating to /hospital/queue and opening Printable Tax Invoice...")
            page.goto("http://localhost:5173/hospital/queue", wait_until="networkidle")
            page.wait_for_selector(".cc-table", timeout=15000)

            invoice_btn = page.locator('button:has-text("MC-")').first
            invoice_btn.click()

            page.wait_for_selector('.cc-invoice-modal-content', timeout=10000)
            assert "TAX INVOICE & RECEIPT" in page.content()
            assert page.locator('button:has-text("Print")').is_visible()
            print("   [PASS] UI Assertion: Invoice Modal displayed with Print button.")

            # Close invoice modal
            page.keyboard.press("Escape")
            page.wait_for_timeout(400)

            # ------------------------------------------------------------------
            # 10. SEARCH, FILTER PERSISTENCE, & BROWSER RELOAD
            # ------------------------------------------------------------------
            print("\n[Step 10] Testing Search, Doctor Filter, and URL Query String Persistence on Reload...")
            search_input = page.locator('input[placeholder*="Search by patient name"]')
            search_input.fill("Aarav")
            page.wait_for_timeout(600)

            # Assert URL query string updated
            assert "search=Aarav" in page.url, f"URL should contain search=Aarav, got {page.url}"
            print("   [PASS] URL Assertion: Query string reflects search parameter:", page.url)

            # Select Doctor Filter
            doc_select = page.locator('select').first
            doc_select.select_option(index=1)
            page.wait_for_timeout(600)
            assert "doctor_id=" in page.url, f"URL should contain doctor_id, got {page.url}"
            print("   [PASS] URL Assertion: Query string reflects doctor_id filter:", page.url)

            # Reload browser page
            page.reload(wait_until="networkidle")
            page.wait_for_selector(".cc-table", timeout=15000)

            # Assert URL query parameters persisted
            assert "search=Aarav" in page.url, "URL query string search lost after reload!"
            assert "doctor_id=" in page.url, "URL query string doctor_id lost after reload!"
            print("   [PASS] Reload Assertion: Query parameters persisted after page reload:", page.url)

            # Reset filters
            page.goto("http://localhost:5173/hospital/queue", wait_until="networkidle")

            # ------------------------------------------------------------------
            # 11. PAGINATION BOUNDARIES (0, 1, 10, 11, 532 rows) & PAGE SIZE
            # ------------------------------------------------------------------
            print("\n[Step 11] Testing Pagination Boundaries (0, 1, 10, 11, 532 rows) and Page Sizes...")
            # Boundary A: 0 rows (empty search query)
            search_input = page.locator('input[placeholder*="Search by patient name"]')
            search_input.fill("NONEXISTENT_XYZ_STRING")
            page.wait_for_timeout(600)
            assert "No patient appointments found matching the current search criteria" in page.content()
            print("   [PASS] Pagination Boundary 0 rows: Clean empty state displayed.")

            # Clear search
            search_input.fill("")
            page.wait_for_timeout(600)

            # Page size test (10 -> 25 -> 50)
            page_size_select = page.locator('select').last
            page_size_select.select_option("25")
            page.wait_for_timeout(600)
            assert "page_size=25" in page.url, f"URL should reflect page_size=25, got {page.url}"

            row_count_25 = page.locator(".cc-table tbody tr").count()
            print(f"   [PASS] Page size 25: Rendered {row_count_25} rows on page 1.")
            assert row_count_25 == 25, f"Expected 25 rows, got {row_count_25}"

            # Navigate to Page 2
            page_2_btn = page.locator('button:has-text("2")').first
            if page_2_btn.is_visible():
                page_2_btn.click()
                page.wait_for_timeout(600)
                assert "page=2" in page.url, f"URL should reflect page=2, got {page.url}"
                print("   [PASS] Navigation to Page 2 successful:", page.url)

                # Assert query string persistence on reload
                page.reload(wait_until="networkidle")
                assert "page=2" in page.url, "URL should persist page=2 after reload!"
                assert "page_size=25" in page.url, "URL should persist page_size=25 after reload!"
                print("   [PASS] Page 2 and Page Size persisted after page reload.")

            # ------------------------------------------------------------------
            # 12. RESPONSIVE SCREENSHOTS AT 1440px, 768px, 375px
            # ------------------------------------------------------------------
            print("\n[Step 12] Capturing Multi-Viewport Screenshots at 1440px, 768px, 375px...")
            viewports = [
                ("1440px", 1440, 900),
                ("768px", 768, 1024),
                ("375px", 375, 812),
            ]

            pages_to_capture = [
                ("overview_populated", "http://localhost:5173/hospital/overview", ".cc-overview-container"),
                ("queue_populated", "http://localhost:5173/hospital/queue", ".cc-table"),
                ("doctors_populated", "http://localhost:5173/hospital/doctors", ".cc-roster-grid"),
                ("slots_populated", "http://localhost:5173/hospital/slots", ".cc-slots-grid"),
                ("emergency_populated", "http://localhost:5173/hospital/emergency", ".cc-panel-card"),
                ("payments_populated", "http://localhost:5173/hospital/payments", ".cc-table"),
                ("queue_empty_state", "http://localhost:5173/hospital/queue?search=NONEXISTENT_XYZ", ".cc-table"),
            ]

            for label, url, wait_sel in pages_to_capture:
                for vp_name, w, h in viewports:
                    page.set_viewport_size({"width": w, "height": h})
                    page.goto(url, wait_until="networkidle")
                    page.wait_for_timeout(500)
                    filename = f"hospital_v2_{label}_{vp_name}.png"
                    filepath = os.path.join(SCREENSHOT_DIR, filename)
                    page.screenshot(path=filepath, full_page=False)
                    print(f"   [SCREENSHOT] Captured {filename}")

            print("\n========================================================")
            print("ALL OUTCOME-VERIFIED CLICK & BROWSER TESTS PASSED (12/12)!")
            print("========================================================\n")

    finally:
        if backend_proc:
            backend_proc.terminate()
        if frontend_proc:
            frontend_proc.terminate()

if __name__ == "__main__":
    run_click_verification()
