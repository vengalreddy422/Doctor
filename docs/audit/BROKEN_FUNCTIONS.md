# CareConnect Codebase Audit: Live E2E Verification & Issue Log

**Audit Execution Date**: November 23, 2026  
**Auditor**: Senior QA & Systems Architect  
**Scope**: Full Stack Live Runtime (Backend: Django 5 + DRF at `127.0.0.1:8000`, Frontend: React 18 + Vite at `localhost:5173`, PostgreSQL Neon Cloud DB, Razorpay Gateway)  
**Execution Harness**: Playwright Automated E2E Test Runner (`scripts/run_audit.py`)

---

## 1. Executive Summary of Live Playwright Execution

A full automated end-to-end verification was performed by launching browser sessions across three distinct authenticated roles (Patient, Hospital Staff, and System Admin):

| Metric | Measured Value |
|---|---|
| **Total Test Duration** | 95.61 seconds |
| **Unique Routes/Pages Tested** | 10 pages (`/login`, `/`, `/doctors/265`, `/my-appointments`, `/payment-history`, `/profile`, `/profile/edit`, `/hospital/dashboard`, `/admin/dashboard`, `/admin/doctors/new`) |
| **Total Interactive Buttons Clicked** | 31 buttons |
| **Full UI Screenshots Captured** | 33 screenshots (saved to `docs/audit/screenshots/`) |
| **Console Errors / React Warnings** | 2 warnings (`fetchPriority` React DOM prop warning) |
| **Network Call Failures (HTTP >= 400)** | 0 failures (All API calls returned 200/201) |
| **Action / Selector Failures** | 0 failures |

---

## 2. Completed Backend Fixes & Regression Test Verification

As required prior to dashboard redesign, five critical architecture and runtime issues were fixed, verified with regression tests, and committed individually to the repository:

### Fix 2.a: Crash in Appointment Cancellation with Payment
- **Commit**: `85fcbbe` — `fix(payments): add updated_at and refunded status to Payment model to resolve cancellation crash`
- **Root Cause**: `backend/appointments/views.py` called `payment.save(update_fields=['status', 'updated_at'])`, but `Payment` in `backend/payments/models.py` had no `updated_at` field and was missing `'refunded'` from `STATUS_CHOICES`.
- **Before**:
  ```python
  # backend/payments/models.py
  STATUS_CHOICES = (
      ('pending', 'Pending'),
      ('completed', 'Completed'),
      ('failed', 'Failed'),
  )
  ...
  created_at = models.DateTimeField(auto_now_add=True)
  ```
- **After**:
  ```python
  # backend/payments/models.py
  STATUS_CHOICES = (
      ('pending', 'Pending'),
      ('completed', 'Completed'),
      ('failed', 'Failed'),
      ('refunded', 'Refunded'),
  )
  ...
  created_at = models.DateTimeField(auto_now_add=True)
  updated_at = models.DateTimeField(auto_now=True)
  ```
- **Regression Test**: `test_payment_has_updated_at_and_refunded_status` in `backend/payments/tests.py` passes cleanly.

### Fix 2.b: Automated Razorpay Refund API Invocation on Cancellation
- **Commit**: `e33b953` — `fix(payments): invoke Razorpay refund API on cancellation, record refund id, and handle failures gracefully`
- **Root Cause**: `CancelAppointmentView` computed the 4-tier refund deduction but never called `razorpay_client.payment.refund()`, leaving payments unrefunded in the gateway.
- **Implementation**: Added `razorpay_refund_id` and `refund_status` fields to `Payment`. On cancellation, `razorpay_client.payment.refund(...)` is called with the exact amount in paise. If Razorpay throws an API error, the cancellation still completes with `refund_status='failed'`, ensuring the user's booking cancellation is never rolled back due to gateway downtime.
- **Regression Test**: `test_cancel_appointment_triggers_razorpay_refund` and `test_cancel_appointment_graceful_on_razorpay_error` in `backend/payments/tests.py` pass.

### Fix 2.c: Razorpay Webhook Endpoint with Idempotency
- **Commit**: `52bcd1b` — `feat(payments): add Razorpay webhook endpoint with signature verification and idempotency`
- **Root Cause**: Appointments stayed stuck in `'pending'` if the user closed their browser or lost internet before the frontend `POST /api/payments/verify/` executed.
- **Implementation**: Created `RazorpayWebhookView` at `POST /api/payments/webhook/`. Verifies webhook signature against `settings.RAZORPAY_WEBHOOK_SECRET` via `hmac.compare_digest`. Handles `payment.captured`, `payment.failed`, and `refund.processed` with idempotency safeguards.
- **Regression Test**: `test_webhook_payment_captured_success`, `test_webhook_invalid_signature_rejected`, and `test_webhook_idempotency_duplicate_event` pass.

### Fix 2.d: DRF Endpoint Throttling
- **Commit**: `c1c2aec` — `feat(accounts): add DRF throttle rates and scopes for auth endpoints`
- **Root Cause**: Auth endpoints lacked rate limits, leaving them vulnerable to OTP brute-forcing and email bombing.
- **Implementation**: Added `rest_framework.throttling.ScopedRateThrottle` to `REST_FRAMEWORK['DEFAULT_THROTTLE_CLASSES']` with rates:
  - `register`: `'10/hour'`
  - `resend_otp`: `'5/minute'`
  - `forgot_password`: `'5/minute'`
  - `login`: `'10/minute'`
  - `verify_otp`: `'10/minute'`
- **Regression Test**: `test_login_rate_limiting_throttle` in `backend/accounts/tests.py` passes.

### Fix 2.e: Hospital Password Protection & Mandatory First-Login Password Change
- **Commit**: `4e34b34` — `fix(accounts): prevent overwriting existing hospital staff passwords and enforce change on initial creation`
- **Root Cause**: `setup_hospital_accounts` ran `user.set_password(default_password)` unconditionally, wiping custom passwords on every deployment.
- **Implementation**: Added `must_change_password` boolean field to `User`. In `setup_hospital_accounts`, password is only set if the account is newly created (`created=True`), setting `must_change_password=True`. Existing accounts retain their passwords untouched.
- **Regression Test**: `test_setup_hospital_accounts_never_overwrites_existing_password` in `backend/accounts/tests.py` passes.

---

## 3. Real Live Playwright Findings & Screenshots by Role

### 3.1 Patient Flow Verification

The patient flow was audited using `patient@careconnect.health`.

| Action / Page | Screenshot Link | Result / Observed State |
|---|---|---|
| Login Screen | [patient_01_login_page.png](file:///e:/PROJECTS/appointment_system_updated/appointment_system/docs/audit/screenshots/patient_01_login_page.png) | Form renders cleanly with email/password validation. |
| Authenticated Home | [patient_02_logged_in.png](file:///e:/PROJECTS/appointment_system_updated/appointment_system/docs/audit/screenshots/patient_02_logged_in.png) | User avatar and auth state reflected in top navigation. |
| Homepage & Hero Search | [patient_03_homepage.png](file:///e:/PROJECTS/appointment_system_updated/appointment_system/docs/audit/screenshots/patient_03_homepage.png) | Doctor search, specialty pills, and hospital filters rendered. |
| Search Filter: 'Cardio' | [patient_04_search_results.png](file:///e:/PROJECTS/appointment_system_updated/appointment_system/docs/audit/screenshots/patient_04_search_results.png) | Query filters doctor cards correctly. |
| Specialty Filter Chip | [patient_05_specialty_filtered.png](file:///e:/PROJECTS/appointment_system_updated/appointment_system/docs/audit/screenshots/patient_05_specialty_filtered.png) | Specialty pills filter results in real time. |
| Doctor Detail Page | [patient_06_doctor_detail_page.png](file:///e:/PROJECTS/appointment_system_updated/appointment_system/docs/audit/screenshots/patient_06_doctor_detail_page.png) | Doctor profile, hospital address, Google maps link, and fees displayed. |
| 7-Day Rolling Slots | [patient_07_slot_date_selected.png](file:///e:/PROJECTS/appointment_system_updated/appointment_system/docs/audit/screenshots/patient_07_slot_date_selected.png) | Rolling 7-day date chips load live available slots and capacity counters (e.g. 0/5 to 5/5). |
| My Appointments Hub | [patient_10_my_appointments.png](file:///e:/PROJECTS/appointment_system_updated/appointment_system/docs/audit/screenshots/patient_10_my_appointments.png) | Appointments list rendered with status tabs (Upcoming, Completed, Cancelled). |
| Cancel Appointment Modal | [patient_12_cancel_modal.png](file:///e:/PROJECTS/appointment_system_updated/appointment_system/docs/audit/screenshots/patient_12_cancel_modal.png) | Confirmation modal opens with cancel & keep actions. |
| Payment History & Invoices | [patient_13_payment_history.png](file:///e:/PROJECTS/appointment_system_updated/appointment_system/docs/audit/screenshots/patient_13_payment_history.png) | Payment ledger displays transactions and invoice generation options. |
| Patient Profile View | [patient_15_profile_page.png](file:///e:/PROJECTS/appointment_system_updated/appointment_system/docs/audit/screenshots/patient_15_profile_page.png) | User demographics, contact info, and role badge rendered. |
| Patient Profile Edit | [patient_16_profile_edit_page.png](file:///e:/PROJECTS/appointment_system_updated/appointment_system/docs/audit/screenshots/patient_16_profile_edit_page.png) | Form fields allow editing profile demographics. |
| Profile Save Action | [patient_17_profile_save_attempt.png](file:///e:/PROJECTS/appointment_system_updated/appointment_system/docs/audit/screenshots/patient_17_profile_save_attempt.png) | Save profile updates successfully with feedback toast. |

---

### 3.2 Hospital Staff Flow Verification

The hospital staff portal was audited using `hospital@careconnect.health`.

| Action / Tab | Screenshot Link | Result / Observed State |
|---|---|---|
| Dashboard Overview | [hospital_01_dashboard_overview.png](file:///e:/PROJECTS/appointment_system_updated/appointment_system/docs/audit/screenshots/hospital_01_dashboard_overview.png) | Top KPIs: Today's Appointments, Active Doctors, Revenue, and Traffic. |
| Overview & Traffic Tab | [hospital_tab_overview.png](file:///e:/PROJECTS/appointment_system_updated/appointment_system/docs/audit/screenshots/hospital_tab_overview.png) | Live refresh button works; traffic analytics graphs rendered. |
| Patient Queue Tab | [hospital_tab_patients.png](file:///e:/PROJECTS/appointment_system_updated/appointment_system/docs/audit/screenshots/hospital_tab_patients.png) | Patient queue table displays patients with check-in and waiting status filters. |
| Specialist Roster Tab | [hospital_tab_doctors.png](file:///e:/PROJECTS/appointment_system_updated/appointment_system/docs/audit/screenshots/hospital_tab_doctors.png) | Shows hospital's affiliated doctors with consultation fees and schedule days. |
| Doctor Quick Edit Modal | [hospital_doctor_edit_modal.png](file:///e:/PROJECTS/appointment_system_updated/appointment_system/docs/audit/screenshots/hospital_doctor_edit_modal.png) | Inline modal for updating consultation fee and contact details works smoothly. |
| Slot Capacity Monitor | [hospital_tab_slots.png](file:///e:/PROJECTS/appointment_system_updated/appointment_system/docs/audit/screenshots/hospital_tab_slots.png) | Live capacity view by doctor and date (booked vs max 5). |
| Financial Ledger Tab | [hospital_tab_payments.png](file:///e:/PROJECTS/appointment_system_updated/appointment_system/docs/audit/screenshots/hospital_tab_payments.png) | Hospital payments table with transaction status and receipt view. |
| Cancel & Reschedule Hub | [hospital_tab_cancel_reschedule.png](file:///e:/PROJECTS/appointment_system_updated/appointment_system/docs/audit/screenshots/hospital_tab_cancel_reschedule.png) | Emergency mass-reschedule and doctor leave management tool. |

---

### 3.3 Admin Flow Verification

The system admin portal was audited using `admin@careconnect.health`.

| Action / Tab | Screenshot Link | Result / Observed State |
|---|---|---|
| Overview Dashboard | [admin_01_dashboard_overview.png](file:///e:/PROJECTS/appointment_system_updated/appointment_system/docs/audit/screenshots/admin_01_dashboard_overview.png) | Platform KPIs: Total Hospitals (16), Doctors (151), Bookings (14), Patients (17). |
| Hospital Management Tab | [admin_tab_hospitals.png](file:///e:/PROJECTS/appointment_system_updated/appointment_system/docs/audit/screenshots/admin_tab_hospitals.png) | Hospital directory with active status toggles and contact details. |
| Add Hospital Modal | [admin_add_hospital_modal.png](file:///e:/PROJECTS/appointment_system_updated/appointment_system/docs/audit/screenshots/admin_add_hospital_modal.png) | Modal for adding new hospital facility opens and closes cleanly. |
| Slot Management Tab | [admin_tab_slots.png](file:///e:/PROJECTS/appointment_system_updated/appointment_system/docs/audit/screenshots/admin_tab_slots.png) | Master slot grid across all hospitals and doctors. |
| Slot Block / Unblock Toggle | [admin_slot_toggle_result.png](file:///e:/PROJECTS/appointment_system_updated/appointment_system/docs/audit/screenshots/admin_slot_toggle_result.png) | Interactive button toggles slot between Available (🟢) and Blocked (🔒). |
| Doctors Directory Tab | [admin_tab_doctors.png](file:///e:/PROJECTS/appointment_system_updated/appointment_system/docs/audit/screenshots/admin_tab_doctors.png) | Doctor directory with search, filter, and Photo Studio trigger. |
| Appointments Tab | [admin_tab_appointments.png](file:///e:/PROJECTS/appointment_system_updated/appointment_system/docs/audit/screenshots/admin_tab_appointments.png) | Master appointments table with status filters and details view. |
| Patients Directory Tab | [admin_tab_patients.png](file:///e:/PROJECTS/appointment_system_updated/appointment_system/docs/audit/screenshots/admin_tab_patients.png) | Patient directory with appointment counts and verified status. |
| Financial Ledger Tab | [admin_tab_payments.png](file:///e:/PROJECTS/appointment_system_updated/appointment_system/docs/audit/screenshots/admin_tab_payments.png) | Master financial transactions table. |
| Payment Refund Dialog | [admin_refund_dialog.png](file:///e:/PROJECTS/appointment_system_updated/appointment_system/docs/audit/screenshots/admin_refund_dialog.png) | Admin refund confirmation dialog opens and dismisses properly. |
| Add Doctor Form Page | [admin_doctor_form_page.png](file:///e:/PROJECTS/appointment_system_updated/appointment_system/docs/audit/screenshots/admin_doctor_form_page.png) | Standalone form at `/admin/doctors/new` for doctor onboarding. |

---

## 4. Newly Identified Frontend & Architectural Vulnerabilities

During the live Playwright execution, several frontend architectural weaknesses were recorded:

### UI-001: React DOM Warning on `fetchPriority` Prop
- **Location**: `frontend/src/pages/HomePage.jsx:149:43`
- **Console Log**:
  ```
  Warning: React does not recognize the `fetchPriority` prop on a DOM element. If you intentionally want it to appear in the DOM as a custom attribute, spell it as lowercase `fetchpriority` instead.
  ```
- **Cause**: React 18 JSX expects lowercase `fetchpriority` or omission on standard `<img>` tags.

### UI-002: Razorpay Script Blocks DOM Lifecycle
- **Location**: `frontend/index.html` line 21 (`<script src="https://checkout.razorpay.com/v1/checkout.js"></script>`)
- **Observed Impact**: When Playwright navigates with standard `wait_until='load'`, Razorpay's script triggers ~50 async chunk requests (`v2-entry-loader`, `v2-entry-card-block`, etc.), causing the browser's `window.onload` event to hang or exceed 30s timeouts.
- **Remedy for Redesign**: Dynamically inject the Razorpay script only when opening the payment checkout modal rather than loading it synchronously in `<head>` on every page.

### UI-003: Auth State Transition Race Condition on Slower Networks
- **Location**: `frontend/src/pages/LoginPage.jsx#L84-L92`
- **Observed Impact**: The login handler uses a static `setTimeout(..., 500)` before navigating to `/admin/dashboard` or `/hospital/dashboard`. On slower network responses or database connection delays, the user is redirected before the JWT token and user profile are safely committed to `localStorage`, triggering an immediate bounce back to `/login` by `ProtectedRoute`.
- **Remedy for Redesign**: Await `login()` resolution and confirm state commitment prior to executing navigation.

### UI-004: Monolithic Single-File Dashboard Architecture
- **Location**: `frontend/src/pages/AdminDashboardPage.jsx` (3,917 lines) and `frontend/src/pages/HospitalDashboardPage.jsx` (2,663 lines)
- **Observed Impact**: Single component files exceeding 3,000 lines with dozens of entangled `useState` hooks, inline CSS objects, and mixed responsibilities. This causes sluggish re-renders when switching tabs and makes maintenance fragile.
- **Redesign Target**: Modularize into separate sub-components (`<OverviewTab />`, `<SlotsTab />`, `<PaymentsTab />`, `<DoctorsTab />`) with shared UI primitives.

### UI-005: Absence of Unified Patient Dashboard (`/patient/*`)
- **Location**: Routes spread across `/my-appointments`, `/payment-history`, `/profile`, `/profile/edit`.
- **Observed Impact**: Patients have no centralized workspace to view upcoming visits, track doctor follow-ups, view active coupons, or manage family bookings.
- **Redesign Target**: Establish a unified `/patient/dashboard` with sidebar navigation matching the Admin and Hospital portals.
