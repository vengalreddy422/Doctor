# CareConnect / MediConnect — Doctor Appointment System

Modern, full-stack Doctor Booking & Healthcare Management System built with **Django REST Framework** (Backend) and **React + Vite + Tailwind/Modern CSS** (Frontend).

---

## 📁 Project Architecture

```text
appointment_system/
├── backend/                  # Django REST Framework API
│   ├── accounts/             # Authentication, OTP, Roles, Hospitals
│   ├── appointments/         # Bookings, Slot generator, Coupons, Notifications
│   ├── doctors/              # Doctor profiles, specialties, schedules
│   ├── payments/             # Razorpay integration & signature verification
│   ├── config/               # Project settings, wsgi/asgi, URLs
│   ├── manage.py             # Django CLI
│   ├── requirements.txt      # Python dependencies
│   ├── Procfile              # Render/Railway deployment entrypoint
│   └── pytest.ini            # Test configuration
│
├── frontend/                 # React + Vite Single Page Application
│   ├── src/                  # React components, pages, api client, context
│   ├── public/               # Static assets & SPA redirects (_redirects)
│   ├── package.json          # Node dependencies & build scripts
│   ├── vite.config.js        # Vite configuration & dev proxy
│   └── vercel.json           # Vercel SPA routing configuration
│
└── README.md
```

---

## 🚀 Quick Start (Local Development)

### 1. Backend Setup

```bash
cd backend

# Create & activate virtual environment
python -m venv venv
# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Setup environment variables
cp .env.example .env
# Fill in SECRET_KEY, DATABASE credentials, Cloudinary, Razorpay, etc.

# Run migrations
python manage.py migrate

# (Optional) Seed initial data
python manage.py generate_slots
python manage.py seed_coupons

# Start backend server (runs on http://127.0.0.1:8000)
python manage.py runserver
```

### 2. Frontend Setup

```bash
cd frontend

# Install Node modules
npm install

# Start Vite dev server (runs on http://localhost:5173)
npm run dev
```

---

## 🧪 Testing

Run backend test suite:
```bash
cd backend
pytest
```

---

## 🌐 Server Deployment Guide

### A. Deploy Backend on Render / Railway
- **Root Directory**: `backend`
- **Build Command**: `pip install -r requirements.txt && python manage.py migrate`
- **Start Command**: `gunicorn config.wsgi --log-file -`
- **Environment Variables**:
  - `SECRET_KEY`: `<secure-random-key>`
  - `DEBUG`: `False`
  - `DATABASE_URL`: `<postgresql-url>`
  - `ALLOWED_HOSTS`: `your-backend.onrender.com,your-frontend.vercel.app`
  - `CORS_ALLOWED_ORIGINS`: `https://your-frontend.vercel.app`
  - `CSRF_TRUSTED_ORIGINS`: `https://your-backend.onrender.com,https://your-frontend.vercel.app`
  - `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`
  - `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`
  - `BREVO_API_KEY`, `EMAIL_HOST_USER`, `EMAIL_HOST_PASSWORD`

### B. Deploy Frontend on Vercel / Netlify
- **Root Directory**: `frontend`
- **Framework Preset**: Vite
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Environment Variable**:
  - `VITE_API_URL`: `https://your-backend.onrender.com/api`
