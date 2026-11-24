# 🖥️ CareConnect — Live Screen-by-Screen Feature & Function Explanation Guide
### *Zero-PPT Live Application Walkthrough for Academic Review*

> **Candidate**: Vallem Vengal Reddy | **Roll No**: `25MRD00124`  
> **Course**: II - MCA (Department of Computer Applications)  
> **Institution**: Madanapalle Institute of Technology & Science (MITS)  
> **Use Case**: Look directly at your running browser screen and explain each function, feature, and role step-by-step.

---

## 🎯 Quick Navigation: The 6 Demo Stations

1. **Station 1: Home Page & Multi-Facet Doctor Search** (`/`)
2. **Station 2: Doctor Profile & Real-Time Slot Booking Engine** (`/doctor/:id`)
3. **Station 3: Passwordless OTP Authentication & JWT Security** (`/login` & `/register`)
4. **Station 4: Patient Dashboard, Rescheduling & GST Tax Invoicing** (`/my-appointments`)
5. **Station 5: Hospital Front-Desk Live Queue Operations** (`/hospital/dashboard`)
6. **Station 6: Superadmin Governance, Emergency Overrides & Financial Audit** (`/admin-dashboard`)

---

## 🖥️ STATION 1: Home Page & Multi-Facet Search (`/`)

### 📍 What to look at on your screen:
The top navigation bar, the hero banner (*"Book Trusted Doctors in Minutes"*), the search bar with 3 inputs, the quick stats pills (`39+ Doctors`, `9+ Specialties`, `25k+ Patients`), the specialty sidebar, and the grid of doctor cards.

### 🗣️ What to say & point at (Bullet Points):
* **Top Navigation Bar**:
  * **Logo & Brand Identity**: *"Here at the top left is our brand CareConnect with instant home navigation."*
  * **Navigation Links**: Direct links to **Home**, **Doctors Directory**, and **About** pages.
  * **Role-Aware Auth Pill**: Shows *'Log in / Get Started'* for guests, or the user's avatar initial (e.g., green `V`) with dropdown to access *'My Consultations'*, *'Profile'*, and *'Logout'*.
  * **Theme Switcher**: *"Notice the moon/sun icon at the top right—CareConnect supports a complete Dark/Light mode theme toggle using CSS variable tokens."*
* **Hero Search Engine**:
  * **Point to the 3 Search Inputs**:
    1. *Doctor / Hospital input*: Full-text search matching doctor names and hospital clinics.
    2. *Specialty dropdown*: Filter across 15 medical fields (Cardiology, Dermatology, General Physician, Orthopedics, Pediatrics, etc.).
    3. *Location input*: Filter by hospital city or clinic branch.
  * **Live Search Trigger**: *"When I click the green 'Search' button, React updates query parameters and sends an asynchronous GET request to `/api/doctors/` without reloading the page."*
* **Specialty Filter Sidebar**:
  * **Specialty Pills**: Clicking any specialty pill (e.g., *'General Physician'* or *'Cardiologist'*) instantly filters the doctor cards list.
* **Doctor Profile Cards**:
  * **Doctor Avatar**: High-definition clinical portrait stored on Cloudinary CDN.
  * **Doctor Name & Department**: E.g., *Dr. Rajesh Kumar*, General Physician.
  * **Hospital Affiliation**: Shows affiliated hospital branch (e.g., *Apollo Hospital*).
  * **Experience & Fee**: Displays verified years of practice (e.g., *12 Years Exp.*) and consultation fee (e.g., *₹500.00*).
  * **Rating & Availability Badge**: Star rating (e.g., *4.5 ★*) and a green *"Available Today"* pill if slots are open today.
  * **Book Button**: Green CTA button redirecting immediately to the doctor's booking calendar.

### ⚙️ Technical Under-the-Hood to mention:
* Backend uses **Django REST Framework generic ListAPIView** with `django-filter` backend.
* Implements database indexing on `specialization`, `hospital_id`, and `city` columns for sub-50ms query response.

---

## 🖥️ STATION 2: Doctor Detail & Real-Time Slot Engine (`/doctor/:id`)

### 📍 What to look at on your screen:
Click **"Book"** on any doctor card. Look at the left doctor profile card, the 7-day calendar date picker, the time slots grid, and the checkout modal.

### 🗣️ What to say & point at (Bullet Points):
* **Left Doctor Overview Card**:
  * Shows complete clinical credentials: MBBS, MD, 12 Years Experience, Apollo Hospital, consultation fee (`₹500.00`), and patient feedback ratings.
  * **Weekly Schedule Blocks**: Shows the doctor’s consulting days (e.g., Monday to Saturday) and morning/evening OPD shifts.
* **Feature 1: Interactive Rolling 7-Day Date Picker**:
  * **Point at the Date Pills**: E.g., `WED 22 Jul`, `THU 23 Jul`, `FRI 24 Jul`...
  * *"The system algorithmically calculates the next 7 valid working days based on the doctor's schedule configuration in the database."*
  * Clicking a date triggers a reactive state update loading that day's specific time slots.


* **Feature 2: Real-Time Slot Capacity Display**:
  * **Point to Time Slot Boxes**: E.g., `10:00 Available`, `15:00 Available`, `16:00 Available`.
  * Each slot shows live capacity status. If a slot reaches maximum capacity (e.g., 5/5 patients), it automatically disables and renders as `FULL`.

  
* **Feature 3: Booking & Patient Vitals Modal**:
  * **Click a slot**: A clean booking drawer/modal opens.
  * **Patient Demographics**: Option to book for **Self** or a **Family Member** (Father, Mother, Spouse, Child, Other) with Patient Name, Age, and Gender.
  * **Health Concern / Symptoms Box**: Allows the patient to input chief complaints and symptoms for the doctor to review beforehand.
* **Feature 4: Dynamic Coupon Discount Engine**:
  * **Coupon Input Box**: Enter coupon code `WELCOME50`.
  * **Click Apply**: Instant discount calculation (e.g., ₹500 fee discounted to ₹450).
* **Feature 5: Flexible Payment Options**:
  * **Option A: Pay Online (Razorpay)**: Launches Razorpay checkout supporting UPI (GPay/PhonePe), Credit/Debit Cards, and Netbanking.
  * **Option B: Pay at Hospital**: Allows walk-in cash/card payment upon arrival at the hospital reception.

### ⚙️ Technical Under-the-Hood to mention:
* **Concurrency Locking (`select_for_update`)**: *"To prevent double-booking if two patients select the last available slot simultaneously, the Django backend executes a row-level lock using PostgreSQL `select_for_update()` inside an atomic transaction. This mathematically ensures zero overbooking."*

---

## 🖥️ STATION 3: Authentication & Security (`/login` & `/register`)

### 📍 What to look at on your screen:
The registration/login modal with email and password fields, or the OTP verification screen.

### 🗣️ What to say & point at (Bullet Points):
* **Visual Auth Panel**: Left side showcases modern healthcare branding (*"Join in under a minute"*), while the right side handles the form.
* **Password Strength Meter**: Real-time evaluation of password complexity (minimum 8 characters, numbers, symbols).
* **Feature 1: Passwordless Email OTP Verification**:
  * Eliminates spam and fake bookings.
  * The backend generates a secure 6-digit random code and dispatches it via the **Brevo (Sendinblue) Transactional API** to the patient's verified email.
* **Feature 2: Anti-Brute Force Protection**:
  * OTPs expire strictly after **5 minutes**.
  * A 3-attempt failure threshold automatically invalidates the code and triggers a temporary cooldown.
* **Feature 3: JWT Token Management**:
  * Upon successful authentication, the API returns a **SimpleJWT Access Token** (short-lived, 15-minute expiry) and a **Refresh Token**.
  * Handled via an Axios response interceptor that transparently requests new access tokens on HTTP 401, providing uninterrupted user sessions.

---

## 🖥️ STATION 4: Patient Dashboard & Invoicing (`/my-appointments`)

### 📍 What to look at on your screen:
Go to avatar dropdown -> Click **"My Consultations"**. Look at the status tabs, the appointment cards, action buttons (*Pay & Confirm*, *Reschedule*, *Cancel*), and the invoice preview modal.

### 🗣️ What to say & point at (Bullet Points):
* **Top Header & Telemetry**:
  * *"Here is the patient's centralized healthcare hub titled 'My Consultations'."*
  * Displays active counts: e.g., `All (2)`, `Pending (2)`, `Confirmed (0)`, `Completed (0)`, `Cancelled (0)`.
* **Appointment Status Tabs**:
  * **Pending**: Appointments booked with "Pay at Hospital" or awaiting payment completion.
  * **Confirmed**: Paid and verified appointments locked into the doctor's OPD roster.
  * **Completed**: Consultations that have taken place and marked finished by hospital staff.
  * **Cancelled**: Appointments cancelled by the patient or due to emergency doctor leave.
* **Appointment Card Anatomy**:
  * **Specialty Badge**: Green pill (e.g., `ORTHOPEDIC` or `GENERAL PHYSICIAN`).
  * **Doctor Name**: Doctor's name and hospital affiliation.
  * **Scheduled Date & Time**: E.g., `July 25, 2026 • 11:00 - 12:00`.
  * **Unique Booking Reference**: Auto-generated tracking ID (e.g., `MC-20260722-3085`).
  * **Fee Charged**: Consultation fee after coupon deductions.
* **Action Button 1: "Pay & Confirm"**:
  * If the appointment is pending payment, clicking this opens Razorpay immediately to complete payment online.
* **Action Button 2: "Reschedule"**:
  * **Click the Reschedule button**: A modal opens showing future available dates and slots for that doctor.
  * Allows the patient to swap their slot up to 2 hours before the appointment without re-paying or paying extra fees.
* **Action Button 3: "Cancel"**:
  * Opens the cancellation confirmation dialog explaining refund policy.
  * Frees up the slot count instantly in the database for other patients to book.
* **Action Button 4: "Download / Print Tax Invoice"**:
  * **Click Invoice**: An official GST-compliant Medical Tax Invoice modal renders on screen.
  * Features CareConnect hospital tax details, patient name, doctor registration number, fee breakdown, and a clean **Print/PDF Download** button.

---

## 🖥️ STATION 5: Hospital Front-Desk Live Queue Operations (`/hospital/dashboard`)

### 📍 What to look at on your screen:
Switch to Hospital Portal view. Look at the hospital selector, today's arrivals queue table, the status pill badges, and action buttons.

### 🗣️ What to say & point at (Bullet Points):
* **Hospital Identity Banner**:
  * Identifies the current hospital facility (e.g., *Apollo Hospitals, Bannerghatta Road*).
  * Replaces physical paper visitor registers and messy clipboard logs.
* **Feature 1: Live Arrivals Queue Table**:
  * Shows every patient arriving today sorted chronologically by slot time.
  * Table columns: Patient Name, Doctor Assigned, Time Slot, Contact Phone, Payment Mode (Online / Cash), and Current Status.
* **Feature 2: 1-Click Operational Queue Progression**:
  * **Step 1: Check-in (`ARRIVED`)**: When the patient walks in through the clinic door, staff click the green **"Check-in"** button. Status transitions to `Arrived`, recording arrival timestamp.
  * **Step 2: In Consultation (`IN_CONSULTATION`)**: When the doctor calls the patient into the examination room, staff click **"Start Consultation"**.
  * **Step 3: Completed (`COMPLETED`)**: When the checkup concludes, staff click **"Mark Completed"**, removing the patient from the active waiting queue.
* **Feature 3: Doctor Occupancy & OPD Schedule View**:
  * Receptionists can view all doctors on duty today, their consultation room number, and how many appointments remain in their shift.
* **Feature 4: Pay-at-Hospital Ledger Collection**:
  * For patients who selected "Pay at Hospital", staff can collect payment and mark the fee as settled with a single click.

### ⚙️ Technical Under-the-Hood to mention:
* Protected by custom DRF permission class `IsHospitalStaff`.
* Enforces hospital facility data tenancy: staff from Apollo Hospital cannot see or manipulate patients booked at Fortis or Narayana Health.

---

## 🖥️ STATION 6: Superadmin Governance & Audit Console (`/admin-dashboard`)

### 📍 What to look at on your screen:
Open the Admin Console. Look at the 4 top KPI statistic cards, the doctor management table, the slot override tab, and the financial ledger.

### 🗣️ What to say & point at (Bullet Points):
* **Top KPI Executive Stat Cards**:
  * **Gross Consultation Revenue**: Aggregate financial volume processed across all hospitals.
  * **Total Registered Patients**: Real-time count of verified patient user accounts.
  * **Active Doctors Onboarded**: Total clinical specialists currently active in the directory.
  * **Completed Consultations**: Total successful outpatient checkups executed on the platform.
* **Feature 1: Emergency Slot Override & Doctor Absence**:
  * If a doctor has an emergency or medical leave, the admin selects the doctor and date.
  * **1-Click Slot Blocking**: Locks out that doctor's calendar; automatically updates affected patient appointments to `Cancelled` and triggers high-priority email alerts.
* **Feature 2: Comprehensive Financial Audit Ledger**:
  * Searchable table logging all Razorpay payments.
  * Displays: Order ID, Payment ID, Patient Email, Consultation Fee, Payment Method, and HMAC verification timestamp.
  * Guarantees 100% financial reconciliation and prevents accounting discrepancies.
* **Feature 3: Doctor & Hospital Onboarding**:
  * Form to onboard new medical specialists: set consultation fees, assign hospital branches, configure weekly shift timings, and upload clinical photos.

---

## ⚡ 60-Second Quick Summary to Conclude Your Live Demo

Look up at the committee and deliver this confident 3-bullet closing:

1. **Architecture Strength**: *"CareConnect is built on a clean decoupled architecture—React 18 frontend communicating via secured REST APIs to a PostgreSQL database on Neon Cloud."*
2. **Clinical Reliability**: *"Through PostgreSQL row-level locks (`select_for_update`), we have mathematically eliminated the risk of double-booking, ensuring complete slot predictability."*
3. **End-to-End Delivery**: *"From doctor discovery and Brevo OTP login to Razorpay payments, live hospital queue check-ins, and downloadable medical tax invoices, every core feature is fully operational and production-verified."*
4. **Closing**: *"Thank you, and I am now ready for any questions or live testing of the system."*
