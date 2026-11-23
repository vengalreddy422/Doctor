# 🏥 CareConnect — Complete Patient Workflow, Brevo OTP Authentication, Hospital Management & Admin Operations Handbook

> **System**: CareConnect Enterprise Doctor Appointment & Hospital Management Platform  
> **Repository Reference**: [vengalreddy422 / Doctor](https://github.com/vengalreddy422/Doctor)  
> **Document Purpose**: Single-File Master Guide covering the complete Patient End-to-End Lifecycle, Unauthenticated vs Authenticated Security Boundaries, Brevo OTP Verification, Dynamic Pricing & Coupons, Hospital Facility Portal, and Comprehensive Administrator Operations.

---

## 📑 Master Table of Contents

1. [Executive Summary & High-Level System Architecture](#1-executive-summary--high-level-system-architecture)
2. [Phase 1: Unauthenticated Visitor Experience (Public Information Only)](#2-phase-1-unauthenticated-visitor-experience-public-information-only)
   - Publicly Accessible Information
   - Resource Restrictions & Security Boundaries
   - Booking Interception & Redirection Logic
3. [Phase 2: Authentication via Brevo Confirmation OTP](#3-phase-2-authentication-via-brevo-confirmation-otp)
   - Architecture & Request-Response Lifecycle
   - Brevo REST API Integration & Fallback Strategy
   - 6-Digit OTP Generation, Hashing & 10-Minute Expiry
   - 3-Attempt Lockout & Anti-Spam Security
   - Token Issuance (JWT Access + Refresh)
4. [Phase 3: Authenticated Patient Workflow](#4-phase-3-authenticated-patient-workflow)
   - Step 1: Doctor Directory Search, Filters & Hospital Location
   - Step 2: Rolling 7-Day Calendar & Slot Capacity Telemetry
   - Step 3: Patient Booking Modal & Medical Problem Submission
   - Step 4: Dynamic Pricing Engine & Modifier Rules
   - Step 5: Coupon Code Processing Engine
   - Step 6: Payment Methods & Razorpay Checkout
   - Step 7: GST Medical Tax Invoice Generation
5. [Phase 4: Omnichannel Notifications via Brevo](#5-phase-4-omnichannel-notifications-via-brevo)
   - Immediate Reservation Email (Pending Payment)
   - Confirmed Booking & Calendar Invite Email
   - Automated 24-Hour & 2-Hour Pre-Consultation Reminders
   - Reschedule & Cancellation Alert Broadcasts
   - Post-Consultation Rating & Review Request
6. [Phase 5: Rescheduling & Cancellation Lifecycles](#6-phase-5-rescheduling--cancellation-lifecycles)
   - Rescheduling Engine: The 10-Hour Vacancy Protection Rule
   - Cancellation Policy: RedBus-Style 4-Tier Dynamic Cash Cut-off
   - Real-Time Refund Preview & Automatic Razorpay Refund
7. [Phase 6: Hospital Management Portal on Website](#7-phase-6-hospital-management-portal-on-website)
   - Hospital Tenancy & Branch Profile
   - Front-Desk Live OP Queue & Patient Telemetry
   - 1-Click Patient Flow: Arrived → In-Consultation → Completed
   - Hospital Doctor Roster & Occupancy Monitoring
   - Emergency Slot Blocking & Hospital-Initiated Auto-Reschedule
8. [Phase 7: Administrator Operations Guide (What the Admin Must Do)](#8-phase-7-administrator-operations-guide-what-the-admin-must-do)
   - Core Governance Responsibilities
   - Step-by-Step System Setup & Secret Credentials Configuration
   - Hospital Facility Registration & Manager Account Generation
   - Doctor Onboarding, Specialties & The 1-Click Photo Studio
   - Dynamic Pricing, Peak Surge & Coupon Campaign Management
   - Live Slot Control, Overrides & Emergency Doctor Leave Broadcast
   - Financial Auditing, Razorpay Settlements & Refund Reconciliations
   - Patient Governance & Account Recovery
   - Daily & Weekly Standard Operating Procedures (SOP) Checklist
9. [Visual Flowcharts & Mermaid Sequence Diagrams](#9-visual-flowcharts--mermaid-sequence-diagrams)

---

## 1. Executive Summary & High-Level System Architecture

CareConnect is architected to eliminate outpatient department (OPD) congestion, prevent slot overbooking, automate patient communication, and streamline multi-hospital clinic management.

### Full-Stack Architecture Overview

```text
┌────────────────────────────────────────────────────────────────────────┐
│                        CLIENT PRESENTATION TIER                        │
│   • React 18 Single Page Application (Vite 6 Build Engine)             │
│   • Modern Vanilla CSS Responsive Design System & Lucide Icons         │
│   • Public Landing, Doctor Catalog, Secure Patient Booking Modal       │
│   • Hospital Staff Dashboard & Administrator Master Console            │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ HTTPS (TLS 1.3) / RESTful JSON
┌───────────────────────────────────▼────────────────────────────────────┐
│                         APPLICATION LOGIC TIER                         │
│   • Python 3.11/3.13 + Django 5.1 REST Framework (DRF)                 │
│   • SimpleJWT Authentication + FastCached Token Middleware             │
│   • Concurrency Control: PostgreSQL SELECT FOR UPDATE Row Locking      │
│   • Dynamic Pricing Engine, Coupon Calculation Engine                  │
│   • Async Daemon Thread Dispatch for Instant Email Responses           │
└──────────────┬────────────────────┬────────────────────┬───────────────┘
               │                    │                    │
┌──────────────▼──────┐┌────────────▼──────────┐┌────────▼──────────────┐
│      DATA TIER      ││     FINTECH TIER      ││     EXTERNAL CLOUD    │
│ Neon Cloud Postgres ││ Razorpay Payment API  ││ Brevo REST API / SMTP │
│ PgBouncer Pooling   ││ HMAC-SHA256 Signatures││ Cloudinary CDN Media  │
│ 16 Normalized Models││ Webhook Verification  ││ Google Maps Geocoding │
└─────────────────────┘└───────────────────────┘└───────────────────────┘
```

---

## 2. Phase 1: Unauthenticated Visitor Experience (Public Information Only)

When an anonymous user lands on CareConnect (`/` or `/doctors`), they are presented with an informative, trustworthy experience designed to highlight clinical excellence without exposing protected actions or medical slots.

```mermaid
flowchart TD
    Visitor([Anonymous Visitor]) --> LandingPage[CareConnect Homepage /]
    LandingPage --> BrowseSpecialties[Explore 15+ Medical Specialties]
    LandingPage --> BrowseDoctors[Browse Doctor Directory /doctors]
    LandingPage --> ViewHospitals[View Hospital Locations & Google Maps]
    LandingPage --> ReadReviews[Read Verified Patient Reviews & Ratings]
    
    BrowseDoctors --> DoctorProfile[View Doctor Profile /doctors/:id]
    DoctorProfile --> ClickBook[User clicks 'Select Slot' or 'Book Appointment']
    
    ClickBook --> AuthCheck{Is User Logged In?}
    AuthCheck -- NO --> InterceptModal[Display Protected Resource Modal]
    InterceptModal --> RedirectLogin[Redirect to /login with state: from=/doctors/:id]
    AuthCheck -- YES --> OpenModal[Unlock Slot Picker & Booking Modal]
```

### Publicly Accessible Information

Anonymous users can freely view:
1. **Hospital Overview & Accreditations**: Hospital names (Apollo, Fortis, Narayana, AIIMS, Care Hospitals), clinical departments, contact phone numbers, emergency hotlines, and street addresses.
2. **Interactive Location & Google Maps**: Clickable maps and direct Google Maps navigation links to locate physical OPD centers.
3. **Doctor Profiles & Credentials**:
   - Doctor's full name, clinical photograph, and specialty (Cardiology, Dermatology, Pediatrics, etc.).
   - Educational qualifications (MBBS, MD, DM, FRCP, MS, MCh).
   - Years of clinical experience and professional biography.
   - Associated hospital branch and consultation room address.
   - Base consultation fee (for transparent cost awareness).
   - Star rating (1 to 5) and verified patient feedback.
4. **General Healthcare Guidance & FAQs**: Information on preparing for consultations, required documents, hospital visiting hours, and clinical policies.

### Resource Restrictions & Security Boundaries

To maintain HIPAA/NABH compliance, prevent bot reservation attacks, and protect schedule data, unauthenticated visitors **CANNOT**:
- ❌ **View Real-Time Available Slots**: Cannot view active time intervals (e.g., 09:00 AM, 10:30 AM) or see remaining slot capacity counters (`0/5` to `5/5`).
- ❌ **Lock or Reserve a Slot**: Concurrency locks cannot be acquired by unauthenticated sessions.
- ❌ **Submit Patient Medical Problems**: Symptom descriptions, chief complaints, and past medical history inputs remain strictly locked.
- ❌ **Apply Promotional Coupons**: Coupon discovery (`/api/appointments/available-coupons/`) requires user history to prevent discount abuse.
- ❌ **Access Razorpay Checkout**: No payment session or order ID can be minted without an authenticated user ID.
- ❌ **View Medical Tax Invoices or History**: Protected under role authorization.

### Booking Interception & Redirection Logic

When an unauthenticated user clicks any booking trigger (`Select Slot`, `Book Consultation`, or `Schedule Now`):
1. **Client-side Intercept**: `DoctorDetailPage.jsx` checks `const { user } = useAuth()`.
2. If `user == null`, execution is immediately halted.
3. The application displays a toast notification: *"Please login or verify your account with an OTP to select slots and book an appointment."*
4. The router triggers a smooth redirect:
   ```javascript
   navigate('/login', { state: { from: `/doctors/${id}` } });
   ```
5. After completing OTP authentication, the user is automatically redirected back to `/doctors/${id}` with their selected context preserved.

---

## 3. Phase 2: Authentication via Brevo Confirmation OTP

CareConnect utilizes **Brevo (formerly Sendinblue)** as its high-speed transactional email engine. Authentication is verified using a cryptographically secure 6-digit confirmation One-Time Password (OTP).

```mermaid
sequenceDiagram
    autonumber
    actor Patient
    participant ReactClient as React 18 Frontend
    participant DjangoAuth as Django REST Auth API
    participant BrevoService as Brevo REST API (v3)
    participant Database as Neon PostgreSQL DB

    Patient->>ReactClient: Enters email and submits Register / Login
    ReactClient->>DjangoAuth: POST /api/accounts/register/ or /login/
    DjangoAuth->>Database: Verify account & mark old OTPs as is_used=True
    DjangoAuth->>DjangoAuth: Generate cryptographically random 6-digit OTP
    DjangoAuth->>Database: Create OTP record (expires_at = now + 10 mins)
    
    par Async Email Dispatch
        DjangoAuth->>BrevoService: POST https://api.brevo.com/v3/smtp/email
        BrevoService-->>Patient: Delivers branded HTML Email with 6-digit OTP
    and Immediate Response to Frontend
        DjangoAuth-->>ReactClient: 200 OK { message: "OTP sent to your email", email: patient@mail.com }
    end

    ReactClient->>ReactClient: Redirect to /verify-otp with email in state
    Patient->>ReactClient: Enters 6-digit OTP code
    ReactClient->>DjangoAuth: POST /api/accounts/verify-otp/ { email, code }
    
    DjangoAuth->>Database: Query OTP where user=email, code=code, is_used=False
    alt OTP Valid & Within 10 Minutes
        DjangoAuth->>Database: Mark OTP is_used=True, activate user account
        DjangoAuth->>DjangoAuth: Generate JWT Access & Refresh Tokens
        DjangoAuth-->>ReactClient: 200 OK { tokens, user: { role: "patient", email } }
        ReactClient->>ReactClient: Store tokens in localStorage, update AuthContext
        ReactClient->>ReactClient: Redirect back to /doctors/:id (Original Booking Page)
    else Invalid Code / Expired / Exceeded 3 Attempts
        DjangoAuth-->>ReactClient: 400 Bad Request { error: "Invalid OTP code or expired." }
    end
```

### Brevo Integration Architecture

The backend implements a two-tier delivery system in `backend/accounts/brevo.py`:
1. **Primary Delivery**: Brevo v3 HTTP REST API (`https://api.brevo.com/v3/smtp/email`).
   - Latency: ~100–300 ms.
   - Bypasses cloud port blocks (e.g., Render/AWS blocking SMTP port 587/465).
   - Injected with authorized sender name `CareConnect Health` and API Key authentication.
2. **Fallback Delivery**: Standard Django SMTP multi-alternative relay via Brevo's SMTP server `smtp-relay.brevo.com` if the REST endpoint is unreachable.
3. **Async Threading**: Emails are dispatched in non-blocking background daemon threads (`threading.Thread`), allowing API endpoints to respond to the client in `< 150 ms`.

### Security Guarantees & OTP Rules

- **Cryptographic Randomness**: Generated via `secrets.SystemRandom().randint(100000, 999999)`.
- **10-Minute Time-To-Live (TTL)**: OTPs expire precisely 600 seconds after creation.
- **Single-Use Enforcement**: Any unused existing OTPs for the user are immediately invalidated (`is_used=True`) whenever a new OTP is minted.
- **3-Attempt Lockout Policy**: If an invalid OTP is entered 3 consecutive times, the token is invalidated, and the user must wait 15 minutes before requesting a new code.
- **Branded Security Template**:
  ```html
  <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 24px; border: 1px solid #e0e0e0; border-radius: 12px;">
      <h2 style="color: #2563eb; margin-bottom: 8px;">CareConnect Medical Portal</h2>
      <p style="font-size: 15px; color: #374151;">Use the verification code below to confirm your identity and access clinical booking:</p>
      <div style="background: #eff6ff; border: 1px solid #bfdbfe; padding: 18px; text-align: center; border-radius: 8px; font-size: 28px; font-weight: 800; letter-spacing: 6px; color: #1e40af; margin: 20px 0;">
          {{ OTP_CODE }}
      </div>
      <p style="font-size: 13px; color: #6b7280;">This code is valid for <b>10 minutes</b>. Never share your OTP with anyone. CareConnect staff will never request your code.</p>
  </div>
  ```

---

## 4. Phase 3: Authenticated Patient Workflow

Once verified, the user enters the active clinical booking workflow.

```mermaid
flowchart TD
    AuthUser([Authenticated Patient]) --> BrowseDirectory[Filter Doctors: Specialty, Hospital, City, Experience]
    BrowseDirectory --> SelectDoc[Select Doctor Profile]
    SelectDoc --> ChooseDate[Select Consultation Date (Rolling 7-Day Window)]
    ChooseDate --> SlotPicker[Inspect Real-Time Slots: 0/5 to 5/5 Capacity]
    SlotPicker --> ClickSlot[Select Available Time Slot]
    
    ClickSlot --> BookingModal[Open Booking Modal]
    BookingModal --> FillPatientInfo[Select Beneficiary: Myself vs Family Member]
    FillPatientInfo --> EnterProblem[Enter Symptoms, Duration & Past Medical Notes]
    EnterProblem --> DynamicPricing[Calculate Dynamic Pricing Modifiers]
    DynamicPricing --> ApplyCoupon[Apply or Auto-Select Promo Coupon]
    
    ApplyCoupon --> ChoosePayment{Select Payment Method}
    ChoosePayment -- Online Payment --> RazorpaySDK[Launch Razorpay Modal: Cards, UPI, QR, NetBanking]
    ChoosePayment -- Pay at Hospital --> PayDesk[Reserve Slot with Pay-at-Desk Option]
    
    RazorpaySDK --> VerifySig[HMAC-SHA256 Signature Verification]
    VerifySig --> SuccessState[Slot Confirmed & Concurrency Locked]
    PayDesk --> SuccessState
    
    SuccessState --> SendNotifications[Dispatch Brevo Confirmation Emails & SMS]
    SuccessState --> Invoice[Generate GST Tax Invoice MC-YYYYMMDD-XXXX]
    Invoice --> RedirectAppts[Navigate to /my-appointments]
```

### Step 1: Doctor Directory Search, Filters & Hospital Location

The patient discovers specialists using multi-faceted search criteria:
- **Medical Specialty**: 15 clinical domains (Cardiology, Neurology, Pediatrics, Orthopedics, Oncology, Dermatology, ENT, Gynecology, General Medicine, Gastroenterology, Ophthalmology, Psychiatry, Pulmonology, Urology, Nephrology).
- **Hospital Branch & City**: Apollo Hospitals (Bangalore, Chennai), Fortis Memorial (Delhi NCR), Narayana Health (Bangalore), AIIMS (New Delhi), Care Hospitals (Hyderabad).
- **Physical Location & Navigation**: Each doctor card features:
  - Hospital campus name and street address.
  - Interactive **"Get Directions"** button linking directly to Google Maps navigation (`https://www.google.com/maps/search/?api=1&query=...`).
- **Doctor Experience & Fee Slider**: Filter by years of experience (e.g., 5+ yrs, 10+ yrs, 15+ yrs) and consultation fee bracket.

### Step 2: Rolling 7-Day Calendar & Slot Capacity Telemetry

Doctors specify working days (`mon`, `tue`, `wed`, etc.). The system calculates a rolling 7-day active calendar:
- **Date Selector**: Only displays dates where the doctor has scheduled shifts.
- **Slot Capacity Pills**: Slots are divided into Morning and Afternoon blocks. Each slot displays real-time capacity:
  - `🟢 AVAILABLE (2/5)`: Slot has 3 open seats.
  - `🟡 FILLING FAST (4/5)`: Only 1 seat remains.
  - `🔴 FULL (5/5)`: Slot completely booked (selection disabled).
  - `🔒 BLOCKED`: Manually closed by hospital administration.
- **Concurrency Locking**: When an appointment is submitted, PostgreSQL acquires an atomic row lock (`SELECT FOR UPDATE`) on the `Slot` record. If two patients attempt to book the final 5th seat simultaneously, the second transaction is safely rolled back with an informative message.

### Step 3: Patient Booking Modal & Medical Problem Submission

Clicking an available slot launches the interactive Patient Booking Modal:
1. **Beneficiary Selector**:
   - `Myself`: Pre-populates patient's authenticated name, age, phone, and gender.
   - `Family Member`: Enables fields for `Mother`, `Father`, `Son`, `Daughter`, `Spouse`, or `Other`, with independent demographic entry.
2. **Medical Problem & Symptoms Input**:
   - **Chief Complaint**: Free-text field describing symptoms (e.g., *"Persistent acute chest tightness radiating to left arm for 3 days"*).
   - **Symptom Duration**: Days, weeks, or months of onset.
   - **Past Medical History**: Chronic illnesses (e.g., Hypertension, Type-2 Diabetes, Asthma).
   - **Allergies & Current Medications**: Alerts for the attending physician.
   - **Optional Medical Report Notes**: Reference to previous prescriptions or lab test dates.

### Step 4: Dynamic Pricing Engine & Modifier Rules

Consultation prices are dynamically evaluated based on situational and operational rules:

| Modifier Rule | Trigger Condition | Price Adjustment | Clinical Rationale |
| :--- | :--- | :--- | :--- |
| **Base Consultation Fee** | Standard weekday booking | Default Doctor Fee (₹500 – ₹2,500) | Standard OPD consultation rate |
| **Senior Specialist Tier** | Doctor clinical experience > 15 years | + ₹300 Tier Premium | Senior consultant clinical review |
| **Weekend OPD Premium** | Slot on Saturday or Sunday | + 15% Weekend Surge | Higher staffing and overtime cost |
| **Peak-Hour Slot Surge** | Slots between 10:00 AM – 12:30 PM | + 10% Prime-Time Surge | Peak waiting room crowd balancing |
| **Follow-Up Consultation** | Patient re-visiting doctor within 7 days | - 40% Follow-up Discount | Post-diagnostic review continuity |

The real-time price calculator updates live in the modal before checkout.

### Step 5: Coupon Code Processing Engine

CareConnect features a promotional and loyalty coupon engine (`backend/appointments/models.py:Coupon`):
- **First Booking Special (`WELCOME50` / `FIRSTCARE`)**: Automatically suggested for new patients with 0 prior bookings, granting a 50% discount (up to ₹400 cap).
- **Loyalty Milestone (`LOYALTY20`)**: Unlocked every 5 completed consultations, providing 20% off as patient retention rewards.
- **General Seasonal Promos (`HEALTHCARE10`, `FESTIVE100`)**: Flat or percentage deductions.
- **Validation Rules**:
  1. Checks code validity, expiry date, and `is_active` flag.
  2. Ensures patient meets `required_bookings` and `max_bookings` constraints.
  3. Enforces `max_discount` cap on percentage calculations.
  4. Deducts discount from dynamic fee: `final_fee = max(0, original_fee - discount_amount)`.

### Step 6: Payment Methods & Razorpay Checkout

Patients can choose between two flexible payment mechanisms:

#### Option A: Online Payment via Razorpay
1. Frontend calls `/api/payments/create-order/` passing `appointment_id`.
2. Backend generates a Razorpay Order ID (`order_...`) with receipt reference.
3. Razorpay Checkout Modal opens with options:
   - **UPI / QR Code**: Google Pay, PhonePe, Paytm, BHIM.
   - **Credit / Debit Cards**: Visa, MasterCard, RuPay, Amex.
   - **Net Banking**: All major Indian commercial banks.
   - **Digital Wallets**: Paytm, Mobikwik, Freecharge.
4. On completion, Razorpay returns `razorpay_payment_id`, `razorpay_order_id`, and `razorpay_signature`.
5. Backend verifies signature using HMAC-SHA256:
   ```python
   generated_signature = hmac.new(
       settings.RAZORPAY_KEY_SECRET.encode(),
       f"{order_id}|{payment_id}".encode(),
       hashlib.sha256
   ).hexdigest()
   if generated_signature == signature:
       # Mark appointment as 'confirmed', update payment ledger
   ```

#### Option B: Pay-at-Hospital (Front-Desk Cash/Card)
- Patients choosing to pay at the clinic counter can confirm their slot with status `pending`.
- A reservation token is issued, and fee collection is acknowledged by hospital staff upon physical arrival.

### Step 7: GST Medical Tax Invoice Generation

Immediately upon confirmation, an immutable digital tax invoice is generated:
- **Receipt ID Format**: `MC-YYYYMMDD-XXXX` (e.g., `MC-20261014-9F2B`).
- **Invoice Metadata**: Doctor registration number, hospital GSTIN, patient details, SAC medical code (999312), base consultation fee, coupon discount deduction, and net amount paid.
- **Download / Print**: Available directly in the patient dashboard with a 1-click printable PDF view.

---

## 5. Phase 4: Omnichannel Notifications via Brevo

CareConnect maintains real-time patient engagement through Brevo email notifications at every milestone:

```mermaid
journey
    title Patient Notification Touchpoints
    section Reservation
      Slot Reserved: 5: Brevo sends reservation notice with payment link
    section Confirmation
      Payment Verified: 5: Brevo delivers Confirmed Booking Receipt & Google Map link
    section Preparation
      24 Hours Before: 4: Brevo reminder with clinic preparation instructions
      2 Hours Before: 5: Urgent SMS/Email alert with OPD chamber & token
    section Post-Consultation
      Consultation Finished: 5: Brevo delivers 3-category Review & Rating request
```

1. **Booking Confirmation**:
   - Includes appointment date, exact consulting hour, doctor name, hospital address, and Google Maps direction button.
2. **Automated Reminders**:
   - **24-Hour Reminder**: Background cron job flags `reminder_sent=True` and alerts the patient to carry past medical files.
   - **2-Hour Urgent Alert**: Reminds the patient of estimated commute time and parking availability.
3. **Reschedule & Cancellation Alerts**:
   - Detailed email highlighting previous slot vs newly selected slot, or refund deduction calculations.
4. **Post-Consultation Review Prompt**:
   - Sent 2 hours after hospital staff marks consultation `COMPLETED`, asking the patient to rate the Doctor, Hospital Cleanliness, and Staff Management (1 to 5 stars).

---

## 6. Phase 5: Rescheduling & Cancellation Lifecycles

Medical schedules are dynamic. CareConnect implements strict, fair algorithmic rules balancing patient convenience with hospital vacancy protection.

### Rescheduling Engine: The 10-Hour Vacancy Protection Rule

```mermaid
flowchart TD
    ReqReschedule([Patient Requests Reschedule]) --> CheckStatus{Is Status Confirmed/Pending?}
    CheckStatus -- NO --> DenyStatus[Deny: Cannot reschedule completed/cancelled visits]
    CheckStatus -- YES --> CalcTime[Calculate exact hours remaining until slot]
    
    CalcTime --> CheckHours{Hours Remaining >= 10.0 Hours?}
    CheckHours -- NO (< 10 hrs) --> DenyVacancy[Deny: Rescheduling locked within 10 hours to prevent empty slot vacancy]
    CheckHours -- YES (>= 10 hrs) --> SelectNewSlot[Patient selects new date and open slot]
    
    SelectNewSlot --> SwapAtomic[Atomic Slot Swap: Old Slot booked_count - 1, New Slot booked_count + 1]
    SwapAtomic --> AuditLog[Link rescheduled_from audit pointer]
    AuditLog --> NotifyBrevo[Dispatch Brevo Reschedule Notification Email]
```

- **Business Rule**: Rescheduling is permitted online only if **$\ge$ 10 hours** remain before the appointment start time.
- **Slot Swap Integrity**: When rescheduled, the old slot's capacity is instantly released for other patients, and the new slot capacity is incremented atomically.
- **Financial Carryover**: 100% of the consultation fee paid is transferred to the new slot without any penalty fee.

### Cancellation Policy: RedBus-Style 4-Tier Dynamic Cash Cut-off

CareConnect enforces a tiered refund deduction matrix modelled after major transit systems:

| Cancellation Window | Patient Refund % | Hospital Retention / Deduction % | Tier Classification |
| :--- | :--- | :--- | :--- |
| **> 24 Hours Notice** | **100% Full Refund** | **0% Deduction (₹0)** | Tier 1: Risk-Free Cancellation |
| **12 to 24 Hours Notice** | **75% Refund** | **25% Cash Cut-off** | Tier 2: Standard Cancellation |
| **2 to 12 Hours Notice** | **50% Refund** | **50% Short-Notice Cut-off** | Tier 3: Late Cancellation |
| **< 2 Hours / Past Slot** | **0% (Non-Refundable)** | **100% Deduction** | Tier 4: Forfeit Due to Lockout |

```mermaid
sequenceDiagram
    autonumber
    actor Patient
    participant ReactClient as React 18 Frontend
    participant DjangoAPI as Appointments API
    participant Razorpay as Razorpay Refund API
    participant Brevo as Brevo Notification Service

    Patient->>ReactClient: Clicks "Cancel Appointment"
    ReactClient->>DjangoAPI: GET /api/appointments/cancel-preview/:id/
    DjangoAPI->>DjangoAPI: Compute exact hours remaining & deduction tier
    DjangoAPI-->>ReactClient: Return preview: { fee_paid, deduction_amount, refund_amount, tier_label }
    ReactClient->>Patient: Displays transparent refund breakdown & asks for cancellation reason
    Patient->>ReactClient: Confirms cancellation with reason
    ReactClient->>DjangoAPI: POST /api/appointments/cancel/:id/ { reason }
    
    DjangoAPI->>DjangoAPI: Update status='cancelled', refund_status='completed'
    DjangoAPI->>Razorpay: POST /v1/payments/:id/refund { amount: refund_amount }
    Razorpay-->>DjangoAPI: Refund ID generated (rfnd_...)
    DjangoAPI->>Brevo: Send cancellation email with full deduction audit
    DjangoAPI-->>ReactClient: 200 OK "Refund processed successfully"
```

---

## 7. Phase 6: Hospital Management Portal on Website

The Hospital Portal (`/hospital-dashboard`) empowers front-desk medical officers and clinical administrators to manage daily footfall and live OPD queues.

```mermaid
flowchart TD
    Staff([Hospital Staff / Receptionist]) --> LoginPortal[Log in via Hospital Credentials]
    LoginPortal --> HospitalDashboard[Hospital Dashboard /hospital-dashboard]
    
    HospitalDashboard --> TabOverview[Overview: Daily OPD Count, Revenue, Waiting Queue]
    HospitalDashboard --> TabQueue[Live Arrivals & OP Queue]
    HospitalDashboard --> TabRoster[Doctor On-Duty Roster & Slot Occupancy]
    HospitalDashboard --> TabOverrides[Emergency Absence & Auto-Reschedule]
    
    TabQueue --> PatientArrives[Patient arrives at hospital reception]
    PatientArrives --> ActionCheckIn[Click 'Mark Arrived' -> op_checked_in=True]
    ActionCheckIn --> ActionConsult[Click 'Start Consultation' -> status=in_consultation]
    ActionConsult --> ActionComplete[Click 'Complete Consultation' -> status=completed]
    ActionComplete --> TriggerReview[Brevo automatically sends review email to patient]
```

### 1. Hospital Tenancy & Branch Profile
- Each hospital branch (e.g., *Care Hospitals - Banjara Hills*) has dedicated staff credentials.
- Staff can inspect branch details, registered doctors, consulting chambers, emergency phone numbers, and location settings.

### 2. Front-Desk Live OP Queue & Patient Telemetry
- **Today's Incoming Arrivals**: Real-time list of all patients booked for the current date, sortable by doctor, time, and patient status.
- **1-Click Clinical Status Transitions**:
  1. `ARRIVED`: Receptionist marks the patient as physically present. Records `op_checked_in_at` timestamp.
  2. `IN_CONSULTATION`: Patient enters the doctor's chamber.
  3. `COMPLETED`: Doctor concludes the appointment. System marks `completed_at` and records the consultation in the electronic health history.
  4. `NO_SHOW`: If a patient fails to arrive within 30 minutes of slot time, marked as no-show.

### 3. Hospital Doctor Roster & Occupancy Monitoring
- Live monitor of all doctors scheduled for today's OPD.
- Occupancy gauges displaying current slot load (e.g., *Dr. Rajesh Sharma: 24/25 appointments booked — 96% load*).
- Instant visibility into morning vs afternoon consulting shifts.

### 4. Emergency Slot Blocking & Hospital-Initiated Auto-Reschedule
If a doctor has an emergency surgery or unexpected leave:
- Staff can click **"Emergency Slot Block"** on the affected slot.
- Two automated resolution paths:
  1. **Auto-Reschedule**: Automatically shifts all affected patients to the doctor's next available slot and broadcasts an email explanation.
  2. **100% Emergency Refund & Cancel**: Immediately cancels bookings with a **100% full refund** (waiving all deductions) and sends high-priority SMS/Email alerts via Brevo.

---

## 8. Phase 7: Administrator Operations Guide (What the Admin Must Do)

The Administrator Console (`/admin-dashboard`) is the operational control center of the entire platform. Below is the comprehensive step-by-step operational guide for platform administrators.

```mermaid
mindmap
  root((CareConnect Administrator))
    Infrastructure
      Brevo API Keys
      Razorpay Credentials
      Cloudinary Media
      PostgreSQL Connections
    Hospital Governance
      Branch Onboarding
      Manager Credentials
      GPS & Maps Setup
    Doctor Operations
      Credential Verification
      Photo Studio Curation
      Schedule & Slot Engine
    Pricing & Monetization
      Dynamic Surge Multipliers
      Coupon Campaigns
      Revenue Settlements
    Emergency Overrides
      Slot Blocking
      Doctor Leaves
      Broadcast Alerts
```

---

### Step 1: System Infrastructure & Secrets Configuration

Before launching operations, the Admin must verify all environment secrets in `backend/config/settings.py` or `.env`:

```ini
# Brevo (Sendinblue) Transactional Service
BREVO_API_KEY=xkeysib-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
DEFAULT_FROM_EMAIL=vengalreddy2005@gmail.com

# Razorpay Payment Gateway Credentials
RAZORPAY_KEY_ID=rzp_live_xxxxxxxxxxxx
RAZORPAY_KEY_SECRET=yyyyyyyyyyyyyyyyyyyyyyyy

# Cloudinary Media Storage (Doctor clinical portraits)
CLOUDINARY_CLOUD_NAME=careconnect
CLOUDINARY_API_KEY=123456789012345
CLOUDINARY_API_SECRET=zzzzzzzzzzzzzzzzzzzzzzzzz

# Database SSL & Pooling (Neon PostgreSQL)
DATABASE_URL=postgresql://user:password@ep-wandering-wave-...aws.neon.tech/neondb?sslmode=require
```

---

### Step 2: Hospital Facility Registration & Manager Account Generation

To add a new hospital branch:
1. Navigate to **Admin Dashboard → Hospitals Tab → "Add Hospital Facility"**.
2. Input the hospital facility details:
   - **Hospital Name**: (e.g., `Apollo Specialty Hospital`).
   - **City & State**: (e.g., `Bangalore`, `Karnataka`).
   - **Street Address**: Physical address of the campus.
   - **Contact Phone & Email**: Official hospital reception desk.
   - **Google Maps Navigation URL**: Direct Google Maps place link (e.g., `https://maps.google.com/?cid=...`). If omitted, the system auto-generates a search query URL.
3. **Manager Account Credentials**:
   - The admin sets a manager username (e.g., `apollo_manager`) and temporary password (e.g., `hospital@123`).
   - The platform auto-creates the user with role `is_hospital=True`.
4. Copy and securely transmit credentials to the hospital front-desk supervisor.

---

### Step 3: Doctor Onboarding, Specialties & The 1-Click Photo Studio

To onboard a physician to the system:
1. Navigate to **Admin Dashboard → Doctors Tab → "Add New Doctor"**.
2. **Clinical Qualifications**:
   - Doctor Name, Specialization (select from 15 categories), Qualifications (MBBS, MD, DM), and Experience Years.
   - Biography, Associated Hospital Facility, and Base Consultation Fee (e.g., `₹800.00`).
3. **Working Schedule Definition**:
   - Select consultation days (e.g., `mon, tue, wed, thu, fri`).
   - Configure shift timings (e.g., Morning: 09:00 AM – 01:00 PM; Afternoon: 04:00 PM – 08:00 PM).
   - Set Slot Duration (e.g., 30 minutes) and Slot Maximum Capacity (default: 5 patients per slot).
4. **The 1-Click Photo Studio**:
   - Administrators can assign high-definition clinical portraits using three built-in modes:
     * **Curated Studio Presets**: Choose from 40+ gender-matched, clinical white-coat portraits seeded in the platform.
     * **Local File Upload with Client-Side Canvas Compression**: Upload local JPG/PNG files; the system automatically compresses images to `< 200 KB` in browser memory before uploading to Cloudinary CDN.
     * **Custom URL**: Direct linking to official hospital photo assets.

---

### Step 4: Dynamic Pricing, Peak Surge & Coupon Campaign Management

The Admin oversees pricing strategy and promotional campaigns:

#### Managing Dynamic Pricing Rules
- Adjust base fees per doctor or clinical department.
- Configure peak-hour multipliers (e.g., morning 10:00 AM – 12:30 PM surge).
- Configure weekend fees for Saturday/Sunday emergency OPDs.

#### Creating & Managing Coupons
Under **Admin Dashboard → Coupons Tab**:
1. Click **"Create Promo Coupon"**.
2. Input fields:
   - **Coupon Code**: Unique string (e.g., `SUMMER25`, `FIRSTCARE`).
   - **Discount Type**: `Percentage (%)` or `Flat Amount (₹)`.
   - **Discount Value**: e.g., `25%` or `₹200`.
   - **Max Discount Cap**: e.g., Maximum `₹500` deduction for percentage coupons.
   - **Coupon Scope**:
     * `first_booking`: Automatically restricted to patients with 0 completed visits.
     * `milestone`: Automatically restricted to loyalty members with $\ge 5$ bookings.
     * `general`: Open to all authenticated patients.
3. Toggle `is_active` to instantly enable or disable promo campaigns across the platform.

---

### Step 5: Live Slot Control, Overrides & Emergency Doctor Leave Broadcast

The **Slot Management Tab** gives the Admin real-time oversight of every appointment slot across all doctors:
- **Filtering**: Search by date, specific hospital, doctor, or status (`Available`, `Full`, `Blocked`).
- **Manual Slot Blocking**:
  - Click **"Block Slot"** on any upcoming slot (e.g., Doctor called into emergency surgery).
  - The slot immediately stops accepting new bookings.
- **Handling Existing Bookings on Blocked Slots**:
  - The Admin is presented with two resolution options:
    1. **Auto-Reschedule**: Shifts all confirmed patients to the doctor's next matching shift and dispatches Brevo update emails.
    2. **Emergency 100% Refund**: Cancels all bookings, initiates full Razorpay refunds, and broadcasts high-priority emergency notifications to affected patients.

---

### Step 6: Financial Auditing, Razorpay Settlements & Refund Reconciliations

The Admin verifies platform cash flows under **Admin Dashboard → Financial Ledger**:
- **Gross Consultation Revenue**: Real-time aggregated consultation revenue.
- **Razorpay Order Reconciliations**: Every transaction contains `order_id`, `payment_id`, patient email, and payment method.
- **Refund Audit Trail**:
  - Track cancelled appointments and verify whether refunds are `full` or `partial`.
  - Monitor Razorpay refund IDs (`rfnd_...`) and settlement statuses.
- **Invoicing Audits**: Inspect or re-print any patient's GST medical tax receipt (`MC-YYYYMMDD-XXXX`).

---

### Step 7: Patient & User Governance

Under **Admin Dashboard → Patients Tab**:
- **Directory Search**: Search patients by name, email, or contact phone.
- **Verification Status**: Inspect whether patient email was verified via Brevo OTP.
- **Account Unlocking**: If a patient is locked out due to exceeding 3 OTP attempts, Admin can reset their verification state.
- **Booking History**: Inspect total appointments booked, completed visits, and no-show history.

---

### Step 8: Standard Operating Procedures (SOP) Checklist

To ensure operational excellence, administrators should follow this checklist:

#### Daily Morning Checklist (08:00 AM – 09:00 AM)
- [ ] Log in to Admin Console and review **Today's OPD Appointments count**.
- [ ] Check doctor absence notifications and execute **Emergency Slot Blocks** if any physician is on leave.
- [ ] Inspect Razorpay ledger for any pending or failed webhook payments.
- [ ] Verify that Brevo API quota is healthy and transactional emails are delivering without delay.

#### Daily Evening Checklist (07:00 PM – 08:30 PM)
- [ ] Check **Completed vs No-Show** consultations across all hospital branches.
- [ ] Confirm that post-consultation review emails were dispatched for completed visits.
- [ ] Audit daily cancellation refunds processed through Razorpay.

#### Weekly Maintenance Checklist (Every Sunday)
- [ ] Review rolling 7-day slot availability for the upcoming week.
- [ ] Analyze coupon utilization rates (`WELCOME50`, `LOYALTY20`) and ROI.
- [ ] Review average doctor and hospital cleanliness ratings; flag any rating below 4.0 for clinical review.
- [ ] Rotate security tokens and review admin access audit logs.

---

## 9. Visual Flowcharts & Mermaid Sequence Diagrams

### Complete System Interaction Diagram

```mermaid
sequenceDiagram
    autonumber
    actor Patient
    actor Doctor
    actor HospitalStaff
    actor Admin
    participant Frontend as CareConnect SPA
    participant Backend as Django API
    participant Brevo as Brevo Email API
    participant Razorpay as Razorpay Gateway
    participant Database as Neon Postgres

    %% Unauthenticated Phase
    Note over Patient,Frontend: Phase 1: Unauthenticated Visitor
    Patient->>Frontend: Visits Website, Views Doctor Directory & Hospital Map
    Patient->>Frontend: Clicks "Book Appointment"
    Frontend-->>Patient: Intercepts action -> Prompts OTP Login

    %% Authentication Phase
    Note over Patient,Brevo: Phase 2: Brevo OTP Authentication
    Patient->>Frontend: Submits Email Address
    Frontend->>Backend: POST /api/accounts/login/
    Backend->>Database: Generate 6-digit OTP (TTL: 10 mins)
    Backend->>Brevo: POST /v3/smtp/email (Async)
    Brevo-->>Patient: Delivers OTP Email
    Patient->>Frontend: Enters 6-digit OTP
    Frontend->>Backend: POST /api/accounts/verify-otp/
    Backend-->>Frontend: Returns JWT Access & Refresh Tokens

    %% Booking & Pricing Phase
    Note over Patient,Razorpay: Phase 3: Selection, Pricing, Coupons & Payment
    Patient->>Frontend: Selects Doctor, Rolling Date & Time Slot
    Patient->>Frontend: Enters Symptoms, Patient Details & Coupon Code
    Frontend->>Backend: POST /api/appointments/validate-coupon/
    Backend-->>Frontend: Returns Dynamic Fee Breakdown
    Patient->>Frontend: Confirms Checkout
    Frontend->>Backend: POST /api/payments/create-order/
    Backend->>Razorpay: Generate Order ID
    Razorpay-->>Frontend: Opens Razorpay Checkout Modal
    Patient->>Razorpay: Pays via UPI / Card / QR
    Razorpay-->>Frontend: Payment Success & Signature
    Frontend->>Backend: POST /api/payments/verify/
    Backend->>Database: Lock Slot (SELECT FOR UPDATE) & Save Appointment
    Backend->>Brevo: Send Confirmation & GST Invoice (MC-...)
    Brevo-->>Patient: Delivers Booking Confirmation

    %% Hospital Operational Phase
    Note over HospitalStaff,Database: Phase 4: Hospital Management & OP Queue
    Patient->>HospitalStaff: Arrives at Hospital Front Desk
    HospitalStaff->>Frontend: Logs into /hospital-dashboard
    HospitalStaff->>Backend: POST /api/appointments/:id/check-in/ (ARRIVED)
    HospitalStaff->>Backend: Updates status to IN_CONSULTATION -> COMPLETED
    Backend->>Brevo: Dispatch Post-Consultation Rating Email

    %% Admin Governance Phase
    Note over Admin,Database: Phase 5: Administrator Governance
    Admin->>Frontend: Logs into /admin-dashboard
    Admin->>Backend: Inspects Revenue, Manages Doctors, Modifies Slots
    Admin->>Backend: Triggers Emergency Slot Block if Doctor is Absent
    Backend->>Brevo: Broadcasts 100% Refund & Cancellation to Affected Patients
```

---

## 10. Summary Reference & Cheat Sheet

| Feature / Scenario | Unauthenticated State | Authenticated Patient State | Hospital Staff State | Administrator State |
| :--- | :--- | :--- | :--- | :--- |
| **Doctor Information** | Publicly Visible | Publicly Visible | Publicly Visible | Full Edit & Photo Studio |
| **Hospital Location & Maps** | Publicly Visible | Publicly Visible | Profile Edit | Add/Edit Branches |
| **Available Slots View** | Hidden / Blocked | Real-Time Live (0/5 to 5/5) | Roster Capacity View | Full Control / Block / Unblock |
| **Slot Booking** | Blocked (Redirects to OTP) | Unlocked with Problem Input | Front-Desk OP Booking | Admin Override Booking |
| **Coupons & Discounts** | Inaccessible | Auto-Suggested & Validated | View Applied Code | Create / Toggle Campaigns |
| **Payment & Invoice** | Inaccessible | Razorpay / Pay-at-Desk | Acknowledge Counter Cash | Full Financial Audit Ledger |
| **Rescheduling** | Inaccessible | Self-Service ( $\ge$ 10 hrs rule) | Auto-Reschedule Assistance | Master Override Reschedule |
| **Cancellation & Refund** | Inaccessible | RedBus 4-Tier Dynamic Refund | Emergency 100% Refund | Manual Refund Reconcile |
| **Live OP Queue** | Inaccessible | View My Queue Token | Full Check-in Telemetry | Global Platform Analytics |
