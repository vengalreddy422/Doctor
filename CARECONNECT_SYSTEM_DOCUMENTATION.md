# CareConnect — Comprehensive Architecture & Workflow Specification

> **Document Version:** 2.0  
> **Last Updated:** November 2026  
> **Target Audience:** Engineering, Product Managers, System Architects, Quality Assurance  

---

## Table of Contents
1. [Executive Summary & System Introduction](#1-executive-summary--system-introduction)
2. [High-Level Architecture & Tech Stack](#2-high-level-architecture--tech-stack)
3. [Database Models & Relational Entity Schema](#3-database-models--relational-entity-schema)
4. [Authentication & Multi-Tenant Security Model](#4-authentication--multi-tenant-security-model)
5. [User Roles & Functional Modules](#5-user-roles--functional-modules)
   - [5.1 Patient Portal](#51-patient-portal)
   - [5.2 Hospital Staff Hub (V2 Redesign)](#52-hospital-staff-hub-v2-redesign)
   - [5.3 Super Admin Control Center](#53-super-admin-control-center)
6. [Core Business Lifecycles & State Transitions](#6-core-business-lifecycles--state-transitions)
   - [6.1 Appointment Booking & Razorpay Payment](#61-appointment-booking--razorpay-payment)
   - [6.2 Reception Check-in & Consultation Completion](#62-reception-check-in--consultation-completion)
   - [6.3 Reschedule & Cancellation/Refund Policies](#63-reschedule--cancellationrefund-policies)
   - [6.4 Emergency Slot Disruption & Auto-Reschedule Engine](#64-emergency-slot-disruption--auto-reschedule-engine)
7. [Performance Engineering & Sub-Second Latency Optimization](#7-performance-engineering--sub-second-latency-optimization)
8. [API Endpoints Reference](#8-api-endpoints-reference)
9. [Automated Testing & Quality Verification Suite](#9-automated-testing--quality-verification-suite)
10. [Deployment & Environment Configuration](#10-deployment--environment-configuration)

---

## 1. Executive Summary & System Introduction

**CareConnect** is an enterprise-grade, multi-tenant outpatient department (OPD) appointment management and scheduling platform. It bridges the gap between healthcare seekers (patients) and healthcare providers (hospitals, doctors, and clinics).

### Core Problems Addressed
- **Elimination of OPD Wait-Time Bottlenecks**: Modern queue management with 1-click reception check-in and doctor chamber tracking.
- **Strict Multi-Tenant Hospital Isolation**: Hospital staff and administrators can access and mutate data strictly belonging to their registered facility.
- **Financial Precision & Automated Refunds**: Seamless integration with Razorpay, enforcing sliding-scale refund policies and automated receipt generation.
- **Unforeseen Doctor Emergencies**: Automated resolution engine capable of auto-rescheduling patients to adjacent open slots or issuing 100% full refunds.
- **Sub-Second Response Times (< 1s)**: Batch aggregation and targeted cache invalidation ensure instantaneous UI updates without stale user states.

---

## 2. High-Level Architecture & Tech Stack

```
+-----------------------------------------------------------------------------------+
|                           CLIENT LAYER (React 19 + Vite)                          |
|  - Patient Portal (Search, Booking, Razorpay Modal, My Appointments, Reviews)     |
|  - Hospital Hub V2 (Overview, Queue, Doctor Roster, Slot Monitor, Emergency, Ledger)|
|  - Super Admin Dashboard (Platform GMV, Facility Onboarding, User Management)     |
+-----------------------------------------------------------------------------------+
                                         |  HTTPS / REST / JSON
                                         v
+-----------------------------------------------------------------------------------+
|                        API GATEWAY & SECURITY INTERCEPTORS                        |
|  - FastCachedJWTAuthentication (In-Memory Token Lookup, 0ms overhead)            |
|  - CORS & Content Security Policies                                               |
|  - Multi-Tenant Scoping Middleware & Role-Based Permissions (RBAC)                |
+-----------------------------------------------------------------------------------+
                                         |
                                         v
+-----------------------------------------------------------------------------------+
|                       BACKEND SERVICES (Django 5.x + DRF)                         |
|  - Accounts Service   - Doctors & Roster Engine    - Appointments Engine           |
|  - Payments & Refund  - Slot Scheduler Service     - Analytics Aggregation Engine  |
+-----------------------------------------------------------------------------------+
                      |                                       |
                      v                                       v
+-----------------------------------------+   +-------------------------------------+
|        PRIMARY DATABASE (PostgreSQL)    |   |     IN-MEMORY CACHE & MESSAGING     |
|  - Neon Serverless PostgreSQL           |   |  - Django LocMemCache               |
|  - Row-Level Locking (select_for_update)|   |  - Targeted Hospital Invalidator    |
|  - Decimal Financial Precision          |   |  - Async Email Notification System  |
+-----------------------------------------+   +-------------------------------------+
```

### Detailed Tech Stack Matrix
- **Frontend**: React 19, Vite, Tailwind CSS, Lucide Icons, Chart.js, Recharts, Playwright.
- **Backend**: Python 3.12+, Django 5.x, Django REST Framework (DRF), SimpleJWT.
- **Database**: PostgreSQL 16 (Neon Serverless AWS US-East-2).
- **Payment Gateway**: Razorpay REST APIs and Webhook verification (HMAC-SHA256).
- **Caching**: Django Cache Framework with in-memory targeted invalidation.

---

## 3. Database Models & Relational Entity Schema

### Key Relational Models
1. **`User` (Custom User Model)**:
   - Extends `AbstractUser`. Roles: `patient`, `hospital`, `doctor`, `admin`.
   - Includes `phone_number`, `is_verified`, and optional foreign key / pointer to `Hospital`.
2. **`Hospital`**:
   - Represents the medical institution. Includes `name`, `slug`, `city`, `address`, `phone`, `email`, and `is_active`.
3. **`Doctor`**:
   - Linked to `User` and `Hospital`. Fields: `name`, `specialization`, `experience_years`, `consultation_fee`, `is_active`.
4. **`Slot`**:
   - Outpatient consultation time-block. Fields: `doctor`, `date`, `start_time`, `end_time`, `max_capacity` (default: 5), `is_blocked`.
5. **`Appointment`**:
   - Central transaction record.
   - **Foreign Keys**: `patient`, `doctor`, `slot`.
   - **Status State Machine**: `pending` -> `confirmed` -> `completed` / `cancelled` / `rescheduled`.
   - **Tracking Fields**: `op_checked_in` (boolean), `op_checked_in_at` (timestamp), `completed_at` (timestamp), `receipt_id`, `reschedule_count`.
   - **Review Fields**: `is_reviewed`, `doctor_rating`, `hospital_rating`, `management_rating`, `review_comments`.
6. **`Payment`**:
   - Financial ledger. Fields: `appointment`, `amount`, `status` (`paid`, `refunded`, `partially_refunded`, `failed`), `razorpay_order_id`, `razorpay_payment_id`, `razorpay_refund_id`, `refund_status`.
7. **`Coupon` & `CouponUsage`**:
   - Promotional discount tracking with single-use per user protection.

---

## 4. Authentication & Multi-Tenant Security Model

### Authentication Flow
1. **Login & Token Issuance**: `/accounts/login/` validates credentials and returns an `access_token` and `refresh_token` containing user claims (`user_id`, `role`, `hospital_id`).
2. **`FastCachedJWTAuthentication`**: To eliminate the standard 15–30ms database overhead on every authenticated request, verified User instances are cached in memory for 60 seconds (`jwt_user_inst_{id}`).
3. **Targeted Invalidation**: Modifying hospital records, slots, or appointments invalidates **only** hospital analytics and slot caches, leaving user authentication tokens hot in memory for instantaneous navigation.

### Multi-Tenant Scoping Rule
```python
# Multi-tenant isolation enforcement in Hospital Views
def get_hospital_for_user(request):
    if request.user.role == 'admin':
        # Admin can view all facilities or pass ?hospital_id=X
        return get_requested_or_default_hospital(request)
    if request.user.role == 'hospital':
        user_hosp = getattr(request.user, 'hospital', None)
        if not user_hosp and getattr(request.user, 'hospital_name', None):
            user_hosp = Hospital.objects.filter(name__iexact=request.user.hospital_name.strip()).first()
        if not user_hosp:
            return None, Response({"error": "No hospital facility assigned to your account."}, status=403)
        return user_hosp, None
    return None, Response({"error": "Forbidden: Requires Hospital or Admin role."}, status=403)
```

---

## 5. User Roles & Functional Modules

### 5.1 Patient Portal
- **Discovery**: Dynamic search and filtering by doctor specialization, hospital, and fees.
- **Booking Flow**: Slot reservation with transactional concurrency protection.
- **Promotions**: Coupon code validation and live fee recalculation.
- **Self-Service Appointments**:
  - Download and print PDF/HTML consultation invoices.
  - Self-service reschedule (one-time allowable to any active slot of the same doctor).
  - Sliding-scale cancellation with real-time Razorpay refund initiation.
  - 3-tier post-consultation rating: Doctor (1-5), Hospital (1-5), Management (1-5).

### 5.2 Hospital Staff Hub (V2 Modular Redesign)
The hospital experience is divided into 6 modular pages accessible via a sticky top navigation bar:
1. **Overview / Analytics (`/hospital/dashboard`)**:
   - Asia/Kolkata day boundaries.
   - Real-time KPIs: Today Inflow, Occupancy %, Gross Revenue, Refunds, Net Revenue.
   - Dynamic 14-day trends and 7-day sparkline charts.
2. **Patient Queue (`/hospital/queue`)**:
   - Tabbed view: *All*, *Ready to Admit*, *In Chamber*, *Completed*, *Cancelled*.
   - Instant search by patient name, phone, or appointment ID.
   - Action buttons: Accept Patient (Check-in), Complete Consultation, Reschedule, Revert Status.
3. **Doctor Roster (`/hospital/doctors`)**:
   - Active status toggles, specialization filters, fee configurations, and doctor profiles.
4. **Slot Monitor (`/hospital/slots`)**:
   - Visual calendar grid of daily slots.
   - Capacity indicators (e.g., 3/5 booked).
   - Real-time 1-click slot blocking/unblocking.
5. **Emergency Disruption Wizard (`/hospital/emergency`)**:
   - Automated doctor absence handling.
   - Dual-mode resolution: Auto-Reschedule to adjacent open slots or Cancel with 100% full refund.
6. **Cashier Ledger (`/hospital/payments`)**:
   - Transparent financial accounting.
   - Transaction filter by status (`paid`, `refunded`), receipt generation, and invoice printing.

### 5.3 Super Admin Control Center
- **Global Overview (`/admin/dashboard`)**: Platform-wide metrics, multi-hospital performance aggregation, and system health checks.
- **Facility Management (`/admin/hospitals`)**: Onboard new hospitals, update facilities, and activate/suspend branches.
- **Practitioner Administration (`/admin/doctors`)**: Manage physician credentials and directory listings.
- **Global Ledger (`/admin/payments`)**: Platform GMV tracking and commission reporting.

---

## 6. Core Business Lifecycles & State Transitions

### 6.1 Appointment Booking & Razorpay Payment
```
[Patient Selects Slot] 
       │
       ▼
[POST /appointments/book/] (Acquires select_for_update lock on Slot)
       │
       ├─► Status: 'pending' (Awaiting Payment)
       ▼
[POST /payments/create-order/] (Generates Razorpay Order ID)
       │
       ▼
[Razorpay Checkout Modal in React] 
       │
       ▼
[POST /payments/verify/] (Cryptographic HMAC-SHA256 signature check)
       │
       ├─► SUCCESS: Status updated to 'confirmed'
       │            Receipt ID generated (e.g., RCPT-20261125-ABCD)
       │            Email notification dispatched
       │            Targeted cache invalidated
       │
       └─► FAILURE: Status remains 'pending' / cancelled after timeout
```

### 6.2 Reception Check-in & Consultation Completion
- **Check-in (`POST /appointments/<id>/check-in/`)**:
  - Permitted starting 2 hours prior to scheduled slot time.
  - Sets `op_checked_in = True` and records `op_checked_in_at = timezone.now()`.
  - Increments active chamber queue counters.
- **Completion (`POST /appointments/<id>/complete/`)**:
  - Doctor marks consultation finished.
  - Sets `status = 'completed'` and records `completed_at = timezone.now()`.
  - Enables the patient to submit feedback and reviews.

### 6.3 Reschedule & Cancellation/Refund Policies
- **Reschedule**:
  - Checks target slot: must be active, not blocked, not past, same doctor, and capacity available.
  - Increments `reschedule_count`.
- **Cancellation Sliding Scale**:
  - `> 24 hours` before slot: **100% Refund** (₹0 deduction).
  - `4 to 24 hours` before slot: **50% Refund** (50% deduction).
  - `< 4 hours` before slot: **0% Refund** (Non-refundable).
  - Automated Razorpay API invocation (`razorpay_client.payment.refund()`).

### 6.4 Emergency Slot Disruption & Auto-Reschedule Engine
When a doctor is unavailable due to an emergency:
1. Hospital staff selects the doctor and affected date in `/hospital/emergency`.
2. **Action = `auto_reschedule`**:
   - Queries the next available unblocked slot for that doctor with remaining capacity.
   - Moves the appointment, preserves payment status, and sends notification email.
3. **Action = `cancel_and_refund`**:
   - Cancels all appointments for that slot.
   - Issues 100% full refund with zero deductions regardless of the cancellation window.

---

## 7. Performance Engineering & Sub-Second Latency Optimization

### Problem Statement
In previous builds, cold analytics loads and queue operations on remote Neon PostgreSQL took **11.5 seconds** due to N+1 query loops (28 sequential queries for 14-day trends and $2 \times N$ queries for doctor occupancy). Furthermore, global `cache.clear()` calls were wiping user authentication tokens.

### Optimization Strategy & Results

```
+---------------------------------------------------------------------------------------+
|  BENCHMARK RESULTS (Neon Cloud PostgreSQL, Remote SSL, 600+ Realistic Appointments)   |
+---------------------------------------------------------------------------------------+
|  Metric                                  | Before Fix      | After Batch Fix  | Gain  |
|  HospitalAnalyticsView (Cold/Refresh)    | 11,560 ms (11.5s)| 542 ms (0.54s)   | 95.3% |
|  HospitalAnalyticsView (Cached 60s)      | 12 ms           | 1.5 ms           | 87.5% |
|  HospitalQueueView (Pagination & Counts) | 1,850 ms        | 280 ms           | 84.8% |
|  Check-In / Complete Button Clicks       | 2,200 ms        | < 350 ms         | 84.1% |
+---------------------------------------------------------------------------------------+
```

#### Key Implementation Changes
1. **Single-Pass 14-Day Volume Query**:
   ```python
   vol_rows = list(base_appts.filter(
       Q(slot__date__gte=fourteen_days_ago, slot__date__lte=today) |
       Q(created_at__gte=trend_start_dt)
   ).values('slot__date', 'created_at__date'))
   # Aggregated into Python date map in O(N) memory
   ```
2. **Single-Pass TruncDate Payment Aggregation**:
   ```python
   pay_rows = Payment.objects.filter(
       appointment__doctor_id__in=doc_ids,
       created_at__gte=trend_start_dt
   ).annotate(d=TruncDate('created_at', tzinfo=kolkata_tz)).values('d').annotate(
       c=Sum('amount', filter=Q(status='paid')),
       r=Sum('amount', filter=Q(status='refunded'))
   )
   ```
3. **Single Aggregate for Queue Counters**: Combined 5 separate count queries into one `aggregate(Count(..., filter=Q(...)))`.
4. **Targeted Cache Invalidation (`invalidate_hospital_cache`)**:
   Deletes only `hosp_analytics_{id}_*` and slot caches while keeping user JWT authentication tokens intact.

---

## 8. API Endpoints Reference

### Authentication & Profiles
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/accounts/register/` | Public | Patient registration with password validation |
| `POST` | `/accounts/login/` | Public | Issue access and refresh JWT tokens |
| `POST` | `/accounts/token/refresh/` | Public | Refresh expired access token |
| `GET`  | `/accounts/profile/` | Authenticated | Fetch current user profile |

### Outpatient Appointments
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET`  | `/appointments/` | Authenticated | List user appointments |
| `POST` | `/appointments/book/` | Patient | Book appointment in slot |
| `POST` | `/appointments/<id>/reschedule/` | Patient / Staff | Reschedule consultation slot |
| `POST` | `/appointments/<id>/cancel/` | Patient / Staff | Cancel appointment with sliding refund |
| `POST` | `/appointments/<id>/check-in/` | Hospital / Admin | Reception check-in |
| `POST` | `/appointments/<id>/complete/` | Hospital / Admin | Mark consultation completed |
| `POST` | `/appointments/<id>/review/` | Patient | Submit consultation review and rating |

### Hospital Management & Analytics (Multi-Tenant)
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET`  | `/appointments/hospital/analytics/` | Hospital / Admin | Aggregated KPIs, 14-day trends, sparklines |
| `GET`  | `/appointments/hospital/queue/` | Hospital / Admin | Paginated queue with live counters |
| `POST` | `/appointments/admin/slots/<id>/cancel/` | Hospital / Admin | Emergency slot cancel or auto-reschedule |
| `POST` | `/appointments/admin/slots/<id>/toggle-block/`| Hospital / Admin | Block/Unblock slot |

### Payments & Invoicing
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/payments/create-order/` | Patient | Generate Razorpay Order ID |
| `POST` | `/payments/verify/` | Patient | Cryptographic payment signature verification |
| `POST` | `/payments/webhook/` | Razorpay Server | Async payment capture / refund listener |
| `GET`  | `/payments/invoice/<receipt_id>/` | Authenticated | Generate printable HTML/PDF invoice |

---

## 9. Automated Testing & Quality Verification Suite

CareConnect maintains an automated test pyramid verifying API behavior, security isolation, and front-to-back browser interactions:

1. **Backend Unit & Regression Suite (`pytest backend`)**:
   - 79 comprehensive tests covering Authentication, Multi-Tenant Scoping, Role Boundaries, Booking Concurrency, Sliding Refunds, and Analytics.
   - Execution against isolated PostgreSQL test database (`careconnect_isolated_test`).
2. **Playwright End-to-End Browser Verification**:
   - Real browser clicks executing complete flows as Patient, Hospital Staff, and Admin.
   - Assertions on UI states (toasts, badge counts, list refresh without reload) and database records.
   - Viewport testing at Mobile (375px), Tablet (768px), and Desktop (1440px).

---

## 10. Deployment & Environment Configuration

### Required Environment Variables
```env
# Application Settings
DEBUG=False
SECRET_KEY=careconnect-production-secret-key-change-in-prod
ALLOWED_HOSTS=localhost,127.0.0.1,.careconnect.health

# Database Configuration (Neon PostgreSQL)
DATABASE_URL=postgresql://user:password@ep-careconnect-pooler.c-4.us-east-2.aws.neon.tech/careconnect?sslmode=require

# Razorpay Credentials
RAZORPAY_KEY_ID=rzp_test_YourKeyIdHere
RAZORPAY_KEY_SECRET=YourRazorpaySecretHere
RAZORPAY_WEBHOOK_SECRET=YourWebhookSecretHere

# CORS & Frontend URLs
CORS_ALLOWED_ORIGINS=https://careconnect.health,http://localhost:5173

# Email Notifications
EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
EMAIL_HOST=smtp.sendgrid.net
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=apikey
EMAIL_HOST_PASSWORD=YourSendGridApiKeyHere
```

### Production Build & Launch Checklist
1. **Database Migration**: `python manage.py migrate --noinput`
2. **Static Asset Collection**: `python manage.py collectstatic --noinput`
3. **Frontend Production Build**: `npm run build` inside `frontend/` (Vite output to `dist/`)
4. **WSGI / ASGI Server**: Gunicorn / Uvicorn running behind Nginx / Cloudflare
5. **Health Check Endpoint**: `/health/` returns `200 OK` with database ping confirmation.
