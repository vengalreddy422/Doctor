# 🏥 CareConnect — Doctor Appointment & Hospital Management System

[![Django](https://img.shields.io/badge/Django-5.0+-092E20?style=for-the-badge&logo=django&logoColor=white)](https://www.djangoproject.com/)
[![React](https://img.shields.io/badge/React-18.0+-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://reactjs.org/)
[![Vite](https://img.shields.io/badge/Vite-5.0+-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Neon_Cloud-336791?style=for-the-badge&logo=postgresql&logoColor=white)](https://neon.tech/)
[![Razorpay](https://img.shields.io/badge/Payments-Razorpay-02042B?style=for-the-badge&logo=razorpay&logoColor=3395FF)](https://razorpay.com/)

A modern, full-stack healthcare platform designed to simplify hospital appointments, doctor schedules, patient check-ins, and medical invoicing.

---

## 🌟 Key Features

### 👤 1. Patient Portal
- **Doctor Search & Filters**: Search doctors by medical specialty, hospital branch, city, and date.
- **Smart Booking**: Select rolling 7-day consultation slots with real-time capacity counter (e.g. 0/5 to 5/5).
- **Flexible Rescheduling & Cancellation**: Reschedule slots online with automated email notifications.
- **Razorpay Payments & Coupons**: Secure payment integration, dynamic milestone discount coupons, and instant printable medical tax invoices.
- **Reviews & Ratings**: Post ratings and reviews for doctors and hospital facilities.

### 🩺 2. Doctor Directory & Photo Studio
- **Curated Clinical Photography**: 40+ high-definition gender-matched clinical portraits.
- **1-Click Photo Studio**: Admins can change doctor photos instantly using curated presets, local file uploads (with automatic client-side compression), or custom image URLs.
- **Doctor Working Schedules**: Flexible days selection (Mon–Fri, Weekends, Custom days) with auto-generated rolling slots.

### 🏢 3. Hospital Facility Manager
- **Multi-Hospital Support**: Register multiple hospital branches with auto-generated staff login credentials.
- **Live Traffic & Patient Queue**: Inspect today's arrivals, pending check-ins, and consultation completions.
- **Slot Capacity Monitor**: Monitor real-time occupancy across all hospital doctors.

### 🛡️ 4. Administrator Console
- **Comprehensive Analytics**: Real-time stats on total patients, active doctors, appointments, and gross revenue.
- **Live Slot Operations**: Inspect, block, unblock, or cancel slots with instant patient email alerts.
- **Financial Ledger & Export**: Searchable payment records with invoice generation.

---

## 📁 Project Structure

```text
appointment_system/
├── backend/                  # 🐍 Django REST API
│   ├── accounts/             # User auth, OTP verification, roles (Admin/Hospital/Patient)
│   ├── appointments/         # Bookings, rolling slots, coupon discounts, invoices
│   ├── doctors/              # Doctor profiles, specialties, schedules, hospitals
│   ├── payments/             # Razorpay payment verification & ledger
│   ├── config/               # Settings, routing, WSGI/ASGI
│   ├── manage.py             # Django management tool
│   └── requirements.txt      # Python dependencies
│
├── frontend/                 # ⚛️ React 18 + Vite SPA
│   ├── src/
│   │   ├── api/              # Axios API client & interceptors
│   │   ├── components/       # Reusable UI (Navbar, Footer, Alert, InvoiceModal)
│   │   ├── context/          # AuthContext & ToastContext
│   │   ├── pages/            # Page views (Home, DoctorDetail, Admin, Hospital, etc.)
│   │   ├── styles/           # Modern vanilla CSS stylesheets
│   │   └── utils/            # Doctor avatar engine & image compressor
│   ├── package.json          # Node dependencies & scripts
│   └── vite.config.js        # Vite build & proxy configuration
│
└── README.md
```

---

## 🚀 Step-by-Step Installation Guide (Beginner Friendly)

### 📌 Prerequisites
Make sure you have installed on your computer:
1. **Python** (version 3.10, 3.11, or 3.12) — [Download Python](https://www.python.org/downloads/)
2. **Node.js** (version 18 or 20+) — [Download Node.js](https://nodejs.org/)
3. **Git** — [Download Git](https://git-scm.com/)

---

### Step 1: Clone the Repository
Open your terminal (Command Prompt, PowerShell, or macOS/Linux Terminal) and run:
```bash
git clone https://github.com/vengalreddy422/Doctor.git
cd Doctor
```

---

### Step 2: Setup Backend (Django)

1. Navigate to the `backend` folder:
   ```bash
   cd backend
   ```

2. Create a virtual environment:
   ```bash
   # Windows:
   python -m venv venv
   venv\Scripts\activate

   # macOS / Linux:
   python3 -m venv venv
   source venv/bin/activate
   ```

3. Install required Python packages:
   ```bash
   pip install -r requirements.txt
   ```

4. Run database migrations:
   ```bash
   python manage.py migrate
   ```

5. (Optional) Seed sample doctors & coupons:
   ```bash
   python manage.py seed_doctors
   ```

6. Start the Backend Server:
   ```bash
   python manage.py runserver
   ```
   🎉 **Backend is running at:** `http://127.0.0.1:8000`

---

### Step 3: Setup Frontend (React + Vite)

Open a **second terminal window** and run:

1. Navigate to the `frontend` folder:
   ```bash
   cd frontend
   ```

2. Install Node dependencies:
   ```bash
   npm install
   ```

3. Start the Frontend Development Server:
   ```bash
   npm run dev
   ```
   🎉 **Frontend is running at:** `http://localhost:5173`

---

## 🧪 Running Automated Tests

To run the backend test suite:
```bash
cd backend
pytest
```

---

## 🌐 Default User Roles

| Role | Access URL | Permissions |
| :--- | :--- | :--- |
| **Patient** | `http://localhost:5173/` | Search doctors, book appointments, cancel/reschedule, download invoices |
| **Hospital Staff** | `http://localhost:5173/hospital/dashboard` | Manage hospital patient queue, check-ins, doctors, and slot availability |
| **Administrator** | `http://localhost:5173/admin/dashboard` | Full control over doctors, hospitals, appointments, slots, revenue & ledger |

---

## 🛠️ Tech Stack

- **Backend**: Python 3, Django 5, Django REST Framework, PostgreSQL, SimpleJWT, Brevo SMTP.
- **Frontend**: React 18, Vite, Lucide Icons, Modern Vanilla CSS.
- **Payments**: Razorpay API & Webhook Signatures.
- **Testing**: Pytest, Django Test Runner.

---

## 🤝 Contributing & Support
Feel free to open issues or submit pull requests to improve the platform!

⭐ If you find this project helpful, give it a star on **[GitHub](https://github.com/vengalreddy422/Doctor)**!
