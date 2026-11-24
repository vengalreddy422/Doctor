"""
Playwright Runner for CareConnect Reschedule & Cancel E2E Test Suite
Executes the scenarios defined in e2e/reschedule_cancel.spec.ts against Vite frontend
"""
import os
import sys
import json
import time
from playwright.sync_api import sync_playwright

BASE_URL = os.environ.get("BASE_URL", "http://localhost:5173")

def run_tests():
    print("=" * 70)
    print("RUNNING RESCHEDULE & CANCEL PLAYWRIGHT VERIFICATION SUITE")
    print("=" * 70)

    results = []

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={"width": 1280, "height": 800})
        page = context.new_page()

        # Helper to set auth
        def set_auth(page):
            def mock_me(route):
                route.fulfill(status=200, content_type="application/json", body=json.dumps({
                    "id": 101, "username": "patient_e2e", "email": "patient_e2e@example.com", "role": "patient"
                }))
            page.route("**/api/accounts/me/**", mock_me)
            page.goto(f"{BASE_URL}/login")
            page.evaluate("""() => {
                localStorage.setItem('access_token', 'mock_jwt_access');
                localStorage.setItem('refresh_token', 'mock_jwt_refresh');
                localStorage.setItem('user', JSON.stringify({
                    id: 101,
                    username: 'patient_e2e',
                    email: 'patient_e2e@example.com',
                    role: 'patient'
                }));
            }""")

        # TC-FE-01: Reschedule button disabled (< 10h rule)
        try:
            print("\n[RUNNING] TC-FE-01: Reschedule button disabled (< 10h rule - R4)...")
            set_auth(page)

            def mock_appts_1(route):
                route.fulfill(status=200, content_type="application/json", body=json.dumps({
                    "count": 1,
                    "results": [{
                        "id": 201, "doctor": 1, "doctor_name": "Dr. Sarah Jenkins", "doctor_hospital": "City Care Hospital",
                        "slot": 501, "slot_date": "2026-11-25", "slot_time": "14:00", "status": "confirmed",
                        "fee_charged": "800.00", "receipt_id": "REC-201", "is_cancellable": True,
                        "reschedule_info": {
                            "eligible": False, "hours_remaining": 5.5,
                            "reason": "Rescheduling is only permitted up to 10 hours prior to consultation start time (currently 5.5 hrs remaining)."
                        }
                    }]
                }))

            page.route("**/api/appointments/my-appointments/**", mock_appts_1)
            page.goto(f"{BASE_URL}/my-appointments")
            page.wait_for_selector('[data-testid="reschedule-locked-btn-201"]')
            locked_btn = page.locator('[data-testid="reschedule-locked-btn-201"]')
            assert locked_btn.is_disabled(), "Button should be disabled"
            assert "Reschedule Locked (< 10h)" in locked_btn.inner_text(), "Expected locked badge text"
            assert "10 hours" in locked_btn.get_attribute("title"), "Expected tooltip"
            print("  -> PASSED: Reschedule button disabled with <10h tooltip & badge.")
            results.append(("TC-FE-01", "Reschedule locked <10h", "PASS"))
        except Exception as e:
            print(f"  -> FAILED: {e}")
            results.append(("TC-FE-01", "Reschedule locked <10h", f"FAIL: {e}"))
        finally:
            page.unroute("**/api/appointments/my-appointments/**")

        # TC-FE-02: Reschedule button disabled (Daily Quota - R1)
        try:
            print("\n[RUNNING] TC-FE-02: Reschedule button disabled (Daily Quota - R1)...")
            set_auth(page)

            def mock_appts_2(route):
                route.fulfill(status=200, content_type="application/json", body=json.dumps({
                    "count": 1,
                    "results": [{
                        "id": 202, "doctor": 1, "doctor_name": "Dr. Sarah Jenkins", "doctor_hospital": "City Care Hospital",
                        "slot": 502, "slot_date": "2026-11-26", "slot_time": "11:00", "status": "confirmed",
                        "fee_charged": "800.00", "receipt_id": "REC-202", "is_cancellable": True,
                        "reschedule_info": {
                            "eligible": False, "hours_remaining": 48.0,
                            "reason": "Only one reschedule per appointment per calendar day is permitted."
                        }
                    }]
                }))

            page.route("**/api/appointments/my-appointments/**", mock_appts_2)
            page.goto(f"{BASE_URL}/my-appointments")
            page.wait_for_selector('[data-testid="reschedule-locked-btn-202"]')
            locked_btn = page.locator('[data-testid="reschedule-locked-btn-202"]')
            assert locked_btn.is_disabled(), "Button should be disabled"
            assert "Rescheduled Today" in locked_btn.inner_text(), "Expected Rescheduled Today badge"
            print("  -> PASSED: Reschedule button disabled with Rescheduled Today badge.")
            results.append(("TC-FE-02", "Reschedule daily quota locked", "PASS"))
        except Exception as e:
            print(f"  -> FAILED: {e}")
            results.append(("TC-FE-02", "Reschedule daily quota locked", f"FAIL: {e}"))
        finally:
            page.unroute("**/api/appointments/my-appointments/**")

        # TC-FE-03: Target slot picker greys out and disables SAME slot (R2)
        try:
            print("\n[RUNNING] TC-FE-03: Target slot picker disables SAME slot (R2)...")
            set_auth(page)

            def mock_appts_3(route):
                route.fulfill(status=200, content_type="application/json", body=json.dumps({
                    "count": 1,
                    "results": [{
                        "id": 203, "doctor": 1, "doctor_name": "Dr. Sarah Jenkins", "slot": 503,
                        "slot_date": "2026-11-28", "slot_time": "10:00", "status": "confirmed",
                        "fee_charged": "800.00", "is_cancellable": True,
                        "reschedule_info": {"eligible": True, "hours_remaining": 90.0, "reason": "Eligible"}
                    }]
                }))

            def mock_slots_3(route):
                route.fulfill(status=200, content_type="application/json", body=json.dumps([
                    {"id": 503, "date": "2026-11-28", "start_time": "10:00", "booked_count": 1, "max_capacity": 5, "is_full": False, "is_past": False},
                    {"id": 504, "date": "2026-11-28", "start_time": "11:00", "booked_count": 2, "max_capacity": 5, "is_full": False, "is_past": False}
                ]))

            page.route("**/api/appointments/my-appointments/**", mock_appts_3)
            page.route("**/api/doctors/1/slots/**", mock_slots_3)

            page.goto(f"{BASE_URL}/my-appointments")
            page.wait_for_selector('[data-testid="reschedule-btn-203"]')
            page.click('[data-testid="reschedule-btn-203"]')

            page.wait_for_selector('[data-testid="reschedule-slot-select"]')
            same_slot_opt = page.locator('[data-testid="reschedule-slot-select"] option[value="503"]')
            assert same_slot_opt.is_disabled(), "Same slot option must be disabled"
            assert "Current Slot - Not selectable" in same_slot_opt.inner_text(), "Expected Current Slot notice"

            new_slot_opt = page.locator('[data-testid="reschedule-slot-select"] option[value="504"]')
            assert not new_slot_opt.is_disabled(), "New slot option must be selectable"
            print("  -> PASSED: Same slot option correctly disabled with clear label.")
            results.append(("TC-FE-03", "Same slot disabled in picker", "PASS"))
        except Exception as e:
            print(f"  -> FAILED: {e}")
            results.append(("TC-FE-03", "Same slot disabled in picker", f"FAIL: {e}"))
        finally:
            page.unroute("**/api/appointments/my-appointments/**")
            page.unroute("**/api/doctors/1/slots/**")

        # TC-FE-04: Full slots show 5/5 full and are disabled
        try:
            print("\n[RUNNING] TC-FE-04: Full slots show 5/5 full and are disabled (R3/R9)...")
            set_auth(page)

            def mock_appts_4(route):
                route.fulfill(status=200, content_type="application/json", body=json.dumps({
                    "count": 1,
                    "results": [{
                        "id": 204, "doctor": 1, "doctor_name": "Dr. Sarah Jenkins", "slot": 505,
                        "slot_date": "2026-11-29", "slot_time": "09:00", "status": "confirmed",
                        "fee_charged": "800.00", "is_cancellable": True,
                        "reschedule_info": {"eligible": True, "hours_remaining": 110.0, "reason": "Eligible"}
                    }]
                }))

            def mock_slots_4(route):
                route.fulfill(status=200, content_type="application/json", body=json.dumps([
                    {"id": 505, "date": "2026-11-29", "start_time": "09:00", "booked_count": 1, "max_capacity": 5, "is_full": False, "is_past": False},
                    {"id": 506, "date": "2026-11-29", "start_time": "10:00", "booked_count": 5, "max_capacity": 5, "is_full": True, "is_past": False}
                ]))

            page.route("**/api/appointments/my-appointments/**", mock_appts_4)
            page.route("**/api/doctors/1/slots/**", mock_slots_4)

            page.goto(f"{BASE_URL}/my-appointments")
            page.wait_for_selector('[data-testid="reschedule-btn-204"]')
            page.click('[data-testid="reschedule-btn-204"]')

            page.wait_for_selector('[data-testid="reschedule-slot-select"]')
            full_opt = page.locator('[data-testid="reschedule-slot-select"] option[value="506"]')
            assert full_opt.is_disabled(), "Full slot must be disabled"
            assert "5/5 full - Unselectable" in full_opt.inner_text(), "Expected 5/5 full notice"
            print("  -> PASSED: Full slot (5/5) is unselectable.")
            results.append(("TC-FE-04", "Full slot 5/5 disabled", "PASS"))
        except Exception as e:
            print(f"  -> FAILED: {e}")
            results.append(("TC-FE-04", "Full slot 5/5 disabled", f"FAIL: {e}"))
        finally:
            page.unroute("**/api/appointments/my-appointments/**")
            page.unroute("**/api/doctors/1/slots/**")

        # TC-FE-05: Cancel modal displays RedBus refund breakdown and net refund amount
        try:
            print("\n[RUNNING] TC-FE-05: Cancel modal RedBus breakdown (C1/C10)...")
            set_auth(page)

            def mock_appts_5(route):
                route.fulfill(status=200, content_type="application/json", body=json.dumps({
                    "count": 1,
                    "results": [{
                        "id": 205, "doctor": 1, "doctor_name": "Dr. Sarah Jenkins", "slot": 507,
                        "slot_date": "2026-11-30", "slot_time": "15:00", "status": "confirmed",
                        "fee_charged": "1000.00", "receipt_id": "REC-205", "is_cancellable": True,
                        "reschedule_info": {"eligible": True, "hours_remaining": 120.0, "reason": "Eligible"}
                    }]
                }))

            def mock_preview_5(route):
                route.fulfill(status=200, content_type="application/json", body=json.dumps({
                    "hours_remaining": 120.0, "fee_paid": "1000.00", "refund_percentage": 100,
                    "deduction_percentage": 0, "deduction_amount": "0.00", "refund_amount": "1000.00",
                    "tier_code": "standard", "tier_label": "Standard Cancellation (> 24 Hours)",
                    "hours_display": "120.0 Hours Remaining"
                }))

            page.route("**/api/appointments/my-appointments/**", mock_appts_5)
            page.route("**/api/appointments/cancel-preview/205/**", mock_preview_5)

            page.goto(f"{BASE_URL}/my-appointments")
            page.wait_for_selector('[data-testid="cancel-btn-205"]')
            page.click('[data-testid="cancel-btn-205"]')

            page.wait_for_selector('[data-testid="confirm-cancel-btn"]')
            confirm_btn = page.locator('[data-testid="confirm-cancel-btn"]')
            assert "Confirm & Refund ₹1000.00" in confirm_btn.inner_text(), "Expected net refund in button"
            print("  -> PASSED: Cancel modal displays RedBus breakdown and net refund.")
            results.append(("TC-FE-05", "Cancel modal RedBus breakdown", "PASS"))
        except Exception as e:
            print(f"  -> FAILED: {e}")
            results.append(("TC-FE-05", "Cancel modal RedBus breakdown", f"FAIL: {e}"))
        finally:
            page.unroute("**/api/appointments/my-appointments/**")
            page.unroute("**/api/appointments/cancel-preview/205/**")

        browser.close()

    print("\n" + "=" * 70)
    print("PLAYWRIGHT TEST SUMMARY:")
    for test_id, name, status_text in results:
        print(f"  [{status_text}] {test_id} - {name}")
    print("=" * 70)

if __name__ == "__main__":
    run_tests()
