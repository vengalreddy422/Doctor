import os
import sys
import time
import json
from playwright.sync_api import sync_playwright

BASE_URL = "http://localhost:5173"
SCREENSHOT_DIR = os.path.abspath("docs/audit/screenshots")
os.makedirs(SCREENSHOT_DIR, exist_ok=True)

audit_results = {
    "pages_tested": [],
    "buttons_clicked": 0,
    "buttons_detail": [],
    "console_errors": [],
    "network_failures": [],
    "screenshots": [],
    "action_failures": [],
    "audit_summary": {},
}

def setup_page_listeners(page, context_name):
    # Route abort external razorpay script to speed up rendering
    def handle_route(route):
        if "checkout.razorpay.com" in route.request.url:
            route.abort()
        else:
            route.continue_()
    page.route("**/*razorpay.com/*", handle_route)

    def on_console(msg):
        if msg.type in ["error", "warn"]:
            err_data = {
                "context": context_name,
                "type": msg.type,
                "text": msg.text,
                "location": msg.location,
            }
            audit_results["console_errors"].append(err_data)
            print(f"[{context_name}] CONSOLE {msg.type.upper()}: {msg.text}")

    def on_response(response):
        if response.status >= 400:
            try:
                body = response.text()
            except Exception:
                body = "<unreadable>"
            net_err = {
                "context": context_name,
                "url": response.url,
                "status": response.status,
                "status_text": response.status_text,
                "body": body[:500],
            }
            audit_results["network_failures"].append(net_err)
            print(f"[{context_name}] NETWORK FAIL {response.status}: {response.url} - {body[:150]}")

    def on_page_error(exc):
        audit_results["console_errors"].append({
            "context": context_name,
            "type": "uncaught_exception",
            "text": str(exc),
        })
        print(f"[{context_name}] UNCAUGHT EXCEPTION: {exc}")

    page.on("console", on_console)
    page.on("response", on_response)
    page.on("pageerror", on_page_error)

def capture_screenshot(page, name):
    filepath = os.path.join(SCREENSHOT_DIR, f"{name}.png")
    page.screenshot(path=filepath, full_page=False)
    rel_path = f"docs/audit/screenshots/{name}.png"
    audit_results["screenshots"].append(rel_path)
    return rel_path

def record_click(page, element, description):
    try:
        element.scroll_into_view_if_needed(timeout=2000)
        element.click(timeout=3000)
        audit_results["buttons_clicked"] += 1
        audit_results["buttons_detail"].append(description)
        page.wait_for_timeout(800)
        print(f"[CLICKED] {description}")
        return True
    except Exception as e:
        audit_results["action_failures"].append({
            "action": description,
            "error": str(e),
        })
        print(f"[ACTION FAIL] {description}: {e}")
        return False

# ==========================================
# 1. PATIENT FLOW AUDIT
# ==========================================
def audit_patient_flow(playwright):
    print("\n" + "="*50)
    print(">>> AUDITING PATIENT FLOW")
    print("="*50)
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context(viewport={"width": 1280, "height": 800})
    page = context.new_page()
    setup_page_listeners(page, "PatientFlow")

    # 1. Login
    print("[Patient] Navigating to /login")
    page.goto(f"{BASE_URL}/login", wait_until="domcontentloaded")
    page.wait_for_selector("#id_email", timeout=10000)
    capture_screenshot(page, "patient_01_login_page")
    audit_results["pages_tested"].append("/login")

    page.fill("#id_email", "patient@careconnect.health")
    page.fill("#id_password", "PatientPass123!")
    submit_btn = page.query_selector(".auth-submit-btn, button[type='submit']")
    with page.expect_response(lambda r: '/api/accounts/login/' in r.url and r.status == 200, timeout=15000):
        record_click(page, submit_btn, "Patient: Submit Login")
    page.wait_for_url(lambda u: "/login" not in u, timeout=15000)
    page.wait_for_timeout(1000)
    capture_screenshot(page, "patient_02_logged_in")

    # 2. HomePage & Doctor Search
    print("[Patient] Testing HomePage & Doctor Search")
    page.goto(f"{BASE_URL}/", wait_until="domcontentloaded")
    page.wait_for_timeout(1500)
    capture_screenshot(page, "patient_03_homepage")
    audit_results["pages_tested"].append("/")

    search_input = page.query_selector("input[type='text'], input[placeholder*='search' i]")
    if search_input:
        search_input.fill("Cardio")
        page.wait_for_timeout(500)
        search_btn = page.query_selector("button:has-text('Search'), button:has-text('Find')")
        if search_btn:
            record_click(page, search_btn, "Patient: Search Doctors")
        capture_screenshot(page, "patient_04_search_results")

    # Click specialty chip
    specialty_chips = page.query_selector_all(".specialty-chip, .filter-chip, button:has-text('Cardio')")
    if specialty_chips:
        record_click(page, specialty_chips[0], "Patient: Filter by Specialty")
        capture_screenshot(page, "patient_05_specialty_filtered")

    # 3. Doctor Detail Page & Slot Booking
    print("[Patient] Testing Doctor Detail Page & Slot Booking")
    doctor_links = page.query_selector_all("a[href*='/doctors/']")
    doc_url = doctor_links[0].get_attribute("href") if doctor_links else "/doctors/265"
    page.goto(f"{BASE_URL}{doc_url}", wait_until="domcontentloaded")
    page.wait_for_timeout(2000)
    capture_screenshot(page, "patient_06_doctor_detail_page")
    audit_results["pages_tested"].append(doc_url)

    # Click rolling 7-day date chips
    date_chips = page.query_selector_all(".date-chip")
    for idx, chip in enumerate(date_chips[:3]):
        record_click(page, chip, f"Patient: Select Date Chip #{idx+1}")
        page.wait_for_timeout(600)
    capture_screenshot(page, "patient_07_slot_date_selected")

    # Click available slot button (.slot-btn:not([disabled]))
    avail_slots = page.query_selector_all(".slot-btn:not([disabled])")
    if avail_slots:
        record_click(page, avail_slots[0], "Patient: Select Available Slot (Open Booking Modal)")
        page.wait_for_timeout(1000)
        capture_screenshot(page, "patient_08_booking_modal_open")

        # In booking modal, test Coupon code input
        coupon_input = page.query_selector("input[placeholder*='coupon' i], input[placeholder*='code' i]")
        if coupon_input:
            coupon_input.fill("TESTCOUPON")
            apply_btn = page.query_selector("button:has-text('Apply')")
            if apply_btn:
                record_click(page, apply_btn, "Patient: Apply Coupon Code")
                page.wait_for_timeout(500)
                capture_screenshot(page, "patient_09_coupon_applied")

        # Close booking modal
        close_btn = page.query_selector("button:has-text('Cancel'), button:has-text('Close'), .modal-close")
        if close_btn:
            record_click(page, close_btn, "Patient: Close Booking Modal")
            page.wait_for_timeout(500)

    # 4. My Appointments Page
    print("[Patient] Testing My Appointments")
    page.goto(f"{BASE_URL}/my-appointments", wait_until="domcontentloaded")
    page.wait_for_timeout(2000)
    capture_screenshot(page, "patient_10_my_appointments")
    audit_results["pages_tested"].append("/my-appointments")

    # Click Filter Tabs: Upcoming, Completed, Cancelled, All
    for tab_name in ["Upcoming", "Completed", "Cancelled", "All"]:
        tab_btn = page.query_selector(f"button:has-text('{tab_name}')")
        if tab_btn:
            record_click(page, tab_btn, f"Patient: Tab '{tab_name}'")

    # Check for Action Buttons on Appointment cards (Cancel, Reschedule, Invoice)
    reschedule_btn = page.query_selector("button:has-text('Reschedule')")
    if reschedule_btn:
        record_click(page, reschedule_btn, "Patient: Reschedule Appointment")
        page.wait_for_timeout(600)
        capture_screenshot(page, "patient_11_reschedule_modal")
        close_modal = page.query_selector("button:has-text('Cancel'), button:has-text('Close'), .modal-close")
        if close_modal:
            record_click(page, close_modal, "Patient: Dismiss Reschedule Modal")

    cancel_btn = page.query_selector("button:has-text('Cancel Appointment'), button:has-text('Cancel'):not(:has-text('Filter'))")
    if cancel_btn:
        record_click(page, cancel_btn, "Patient: Cancel Appointment")
        page.wait_for_timeout(600)
        capture_screenshot(page, "patient_12_cancel_modal")
        close_cancel = page.query_selector("button:has-text('Keep'), button:has-text('No'), button:has-text('Back')")
        if close_cancel:
            record_click(page, close_cancel, "Patient: Dismiss Cancel Modal")

    # 5. Payment History Page
    print("[Patient] Testing Payment History & Invoices")
    page.goto(f"{BASE_URL}/payment-history", wait_until="domcontentloaded")
    page.wait_for_timeout(2000)
    capture_screenshot(page, "patient_13_payment_history")
    audit_results["pages_tested"].append("/payment-history")

    invoice_btn = page.query_selector("button:has-text('Invoice'), button:has-text('Receipt'), button:has-text('View')")
    if invoice_btn:
        record_click(page, invoice_btn, "Patient: Open Invoice Modal")
        page.wait_for_timeout(1000)
        capture_screenshot(page, "patient_14_invoice_modal")
        close_inv = page.query_selector("button:has-text('Close'), .invoice-modal-overlay")
        if close_inv:
            record_click(page, close_inv, "Patient: Close Invoice Modal")

    # 6. Profile Page & Edit
    print("[Patient] Testing Profile & Edit Profile")
    page.goto(f"{BASE_URL}/profile", wait_until="domcontentloaded")
    page.wait_for_timeout(1500)
    capture_screenshot(page, "patient_15_profile_page")
    audit_results["pages_tested"].append("/profile")

    page.goto(f"{BASE_URL}/profile/edit", wait_until="domcontentloaded")
    page.wait_for_timeout(1500)
    capture_screenshot(page, "patient_16_profile_edit_page")
    audit_results["pages_tested"].append("/profile/edit")

    save_profile_btn = page.query_selector("button:has-text('Save'), button[type='submit']")
    if save_profile_btn:
        record_click(page, save_profile_btn, "Patient: Save Profile Changes")
        capture_screenshot(page, "patient_17_profile_save_attempt")

    browser.close()

# ==========================================
# 2. HOSPITAL STAFF FLOW AUDIT
# ==========================================
def audit_hospital_flow(playwright):
    print("\n" + "="*50)
    print(">>> AUDITING HOSPITAL STAFF FLOW")
    print("="*50)
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context(viewport={"width": 1280, "height": 800})
    page = context.new_page()
    setup_page_listeners(page, "HospitalFlow")

    # 1. Login
    print("[Hospital] Navigating to /login")
    page.goto(f"{BASE_URL}/login", wait_until="domcontentloaded")
    page.wait_for_selector("#id_email", timeout=10000)
    page.fill("#id_email", "hospital@careconnect.health")
    page.fill("#id_password", "HospitalPass123!")
    submit_btn = page.query_selector(".auth-submit-btn, button[type='submit']")
    with page.expect_response(lambda r: '/api/accounts/login/' in r.url and r.status == 200, timeout=15000):
        record_click(page, submit_btn, "Hospital: Submit Login")
    page.wait_for_url("**/hospital/dashboard", timeout=15000)
    page.wait_for_selector("button.sidebar-nav-btn", timeout=15000)
    capture_screenshot(page, "hospital_01_dashboard_overview")
    audit_results["pages_tested"].append("/hospital/dashboard")

    # Test all sidebar navigation tabs
    nav_tabs = [
        ("overview", "Overview & Traffic"),
        ("patients", "Patient Queue"),
        ("doctors", "Specialist Roster"),
        ("slots", "Slot Capacity Monitor"),
        ("payments", "Financial Ledger"),
        ("cancel_reschedule", "Cancel & Reschedule Hub"),
    ]

    for tab_id, tab_label in nav_tabs:
        tab_btn = page.query_selector(f"button.sidebar-nav-btn:has-text('{tab_label}')")
        if tab_btn:
            record_click(page, tab_btn, f"Hospital: Switch to Tab '{tab_label}'")
            page.wait_for_timeout(1200)
            capture_screenshot(page, f"hospital_tab_{tab_id}")

            # Specific tests inside tabs:
            if tab_id == "overview":
                refresh_btn = page.query_selector("button:has-text('Refresh')")
                if refresh_btn:
                    record_click(page, refresh_btn, "Hospital: Refresh Dashboard Data")

            elif tab_id == "patients":
                filter_btns = page.query_selector_all(".filter-btn, button:has-text('Today'), button:has-text('Waiting'), button:has-text('Completed')")
                for fb in filter_btns[:3]:
                    record_click(page, fb, "Hospital: Click Patient Queue Filter")
                p_search = page.query_selector("input[placeholder*='search' i]")
                if p_search:
                    p_search.fill("Patient")
                    page.wait_for_timeout(500)

            elif tab_id == "doctors":
                edit_btn = page.query_selector("button:has-text('Edit'), button[title*='Edit' i]")
                if edit_btn:
                    record_click(page, edit_btn, "Hospital: Open Doctor Quick Edit Modal")
                    page.wait_for_timeout(800)
                    capture_screenshot(page, "hospital_doctor_edit_modal")
                    cancel_edit = page.query_selector("button:has-text('Cancel'), .modal-close")
                    if cancel_edit:
                        record_click(page, cancel_edit, "Hospital: Close Doctor Quick Edit Modal")

            elif tab_id == "slots":
                selects = page.query_selector_all("select")
                if selects:
                    try:
                        selects[0].select_option(index=1)
                        page.wait_for_timeout(1000)
                        capture_screenshot(page, "hospital_slot_doctor_selected")
                    except Exception as e:
                        print(f"[Hospital] Slot select error: {e}")

            elif tab_id == "cancel_reschedule":
                preview_btn = page.query_selector("button:has-text('Preview Impact'), button:has-text('Select Doctor')")
                if preview_btn:
                    record_click(page, preview_btn, "Hospital: Preview Cancellation Impact")

    browser.close()

# ==========================================
# 3. ADMIN FLOW AUDIT
# ==========================================
def audit_admin_flow(playwright):
    print("\n" + "="*50)
    print(">>> AUDITING ADMIN FLOW")
    print("="*50)
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context(viewport={"width": 1280, "height": 800})
    page = context.new_page()
    setup_page_listeners(page, "AdminFlow")

    # 1. Login
    print("[Admin] Navigating to /login")
    page.goto(f"{BASE_URL}/login", wait_until="domcontentloaded")
    page.wait_for_selector("#id_email", timeout=10000)
    page.fill("#id_email", "admin@careconnect.health")
    page.fill("#id_password", "AdminPass123!")
    submit_btn = page.query_selector(".auth-submit-btn, button[type='submit']")
    with page.expect_response(lambda r: '/api/accounts/login/' in r.url and r.status == 200, timeout=15000):
        record_click(page, submit_btn, "Admin: Submit Login")
    page.wait_for_url("**/admin/dashboard", timeout=15000)
    page.wait_for_selector("button.sidebar-item", timeout=15000)
    capture_screenshot(page, "admin_01_dashboard_overview")
    audit_results["pages_tested"].append("/admin/dashboard")

    admin_tabs = [
        ("overview", "Overview Dashboard"),
        ("hospitals", "Hospital Dashboard"),
        ("slots", "Slot Management"),
        ("doctors", "Doctors Directory"),
        ("appointments", "Appointments"),
        ("patients", "Patients"),
        ("payments", "Financial Ledger"),
    ]

    for tab_id, tab_label in admin_tabs:
        tab_btn = page.query_selector(f"button.sidebar-item:has-text('{tab_label}')")
        if tab_btn:
            record_click(page, tab_btn, f"Admin: Switch to Tab '{tab_label}'")
            page.wait_for_timeout(1500)
            capture_screenshot(page, f"admin_tab_{tab_id}")

            if tab_id == "hospitals":
                add_hosp_btn = page.query_selector("button:has-text('Add Hospital'), button:has-text('New Hospital')")
                if add_hosp_btn:
                    record_click(page, add_hosp_btn, "Admin: Open Add Hospital Modal")
                    page.wait_for_timeout(600)
                    capture_screenshot(page, "admin_add_hospital_modal")
                    close_btn = page.query_selector("button:has-text('Cancel'), .modal-close")
                    if close_btn:
                        record_click(page, close_btn, "Admin: Close Add Hospital Modal")

                toggle_btn = page.query_selector("button:has-text('Deactivate'), button:has-text('Activate')")
                if toggle_btn:
                    record_click(page, toggle_btn, "Admin: Toggle Hospital Status")

            elif tab_id == "slots":
                block_btn = page.query_selector("button:has-text('Block'), button:has-text('Unblock')")
                if block_btn:
                    record_click(page, block_btn, "Admin: Toggle Slot Block/Unblock")
                    page.wait_for_timeout(800)
                    capture_screenshot(page, "admin_slot_toggle_result")

            elif tab_id == "doctors":
                photo_btn = page.query_selector("button:has-text('Photo Studio'), button:has-text('Photo')")
                if photo_btn:
                    record_click(page, photo_btn, "Admin: Open Doctor Photo Studio")
                    page.wait_for_timeout(800)
                    capture_screenshot(page, "admin_photo_studio_modal")
                    close_photo = page.query_selector("button:has-text('Close'), .modal-close")
                    if close_photo:
                        record_click(page, close_photo, "Admin: Close Doctor Photo Studio")

            elif tab_id == "payments":
                refund_btn = page.query_selector("button:has-text('Refund')")
                if refund_btn:
                    record_click(page, refund_btn, "Admin: Open Payment Refund Dialog")
                    page.wait_for_timeout(600)
                    capture_screenshot(page, "admin_refund_dialog")
                    cancel_refund = page.query_selector("button:has-text('Cancel'), button:has-text('Close')")
                    if cancel_refund:
                        record_click(page, cancel_refund, "Admin: Dismiss Refund Dialog")

    # 3. Add Doctor Form Page directly
    print("[Admin] Testing Admin Doctor Form (/admin/doctors/new)")
    page.goto(f"{BASE_URL}/admin/doctors/new", wait_until="domcontentloaded")
    page.wait_for_timeout(2000)
    capture_screenshot(page, "admin_doctor_form_page")
    audit_results["pages_tested"].append("/admin/doctors/new")

    submit_doc = page.query_selector("button[type='submit'], button:has-text('Save Doctor'), button:has-text('Create')")
    if submit_doc:
        record_click(page, submit_doc, "Admin: Submit Empty Doctor Form (Validation Trigger)")
        page.wait_for_timeout(800)
        capture_screenshot(page, "admin_doctor_form_validation_errors")

    browser.close()

def main():
    print("[*] Starting Playwright End-to-End Live UI Audit across all roles...")
    start_time = time.time()
    with sync_playwright() as playwright:
        audit_patient_flow(playwright)
        audit_hospital_flow(playwright)
        audit_admin_flow(playwright)

    elapsed = round(time.time() - start_time, 2)
    audit_results["audit_summary"] = {
        "duration_seconds": elapsed,
        "total_pages_tested": len(set(audit_results["pages_tested"])),
        "unique_pages": list(set(audit_results["pages_tested"])),
        "total_buttons_clicked": audit_results["buttons_clicked"],
        "total_screenshots": len(audit_results["screenshots"]),
        "total_console_errors_warnings": len(audit_results["console_errors"]),
        "total_network_failures": len(audit_results["network_failures"]),
        "total_action_failures": len(audit_results["action_failures"]),
    }

    print("\n" + "="*50)
    print(">>> AUDIT RUN SUMMARY")
    print(f"Elapsed Time: {elapsed}s")
    print(f"Total Unique Pages Tested: {len(set(audit_results['pages_tested']))}")
    print(f"Total Buttons Clicked: {audit_results['buttons_clicked']}")
    print(f"Total Screenshots Captured: {len(audit_results['screenshots'])}")
    print(f"Console Errors/Warnings: {len(audit_results['console_errors'])}")
    print(f"Network Failures (>=400): {len(audit_results['network_failures'])}")
    print(f"Action Failures: {len(audit_results['action_failures'])}")
    print("="*50)

    with open("docs/audit/audit_results.json", "w") as f:
        json.dump(audit_results, f, indent=2)
    print("[+] Saved full audit output to docs/audit/audit_results.json")

if __name__ == "__main__":
    main()
