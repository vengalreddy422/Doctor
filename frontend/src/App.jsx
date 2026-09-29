import React from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import ScrollToTop from './components/ScrollToTop';
import { ProtectedRoute, AdminRoute, HospitalRoute } from './components/ProtectedRoute';

import HomePage from './pages/HomePage';
import DoctorDetailPage from './pages/DoctorDetailPage';
import AboutPage from './pages/AboutPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import VerifyOtpPage from './pages/VerifyOtpPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import ProfilePage from './pages/ProfilePage';
import ProfileEditPage from './pages/ProfileEditPage';
import MyAppointmentsPage from './pages/MyAppointmentsPage';
import PaymentHistoryPage from './pages/PaymentHistoryPage';
import AdminDashboardPage from './pages/AdminDashboardPage';
import AdminDoctorFormPage from './pages/AdminDoctorFormPage';
import HospitalDashboardPage from './pages/HospitalDashboardPage';

function App() {
  const location = useLocation();
  const isDashboard = location.pathname.startsWith('/admin/dashboard') || location.pathname.startsWith('/hospital/dashboard');

  return (
    <div className="app-layout" style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <ScrollToTop />
      {!isDashboard && <Navbar />}

      <main style={{ flex: 1 }}>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<HomePage />} />
          <Route path="/doctors/:id" element={<DoctorDetailPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/verify-otp/:email" element={<VerifyOtpPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password/:email" element={<ResetPasswordPage />} />

          {/* Protected Patient Routes */}
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <ProfilePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile/edit"
            element={
              <ProtectedRoute>
                <ProfileEditPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/my-appointments"
            element={
              <ProtectedRoute>
                <MyAppointmentsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/payment-history"
            element={
              <ProtectedRoute>
                <PaymentHistoryPage />
              </ProtectedRoute>
            }
          />

          {/* Hospital Management Route */}
          <Route
            path="/hospital/dashboard"
            element={
              <HospitalRoute>
                <HospitalDashboardPage />
              </HospitalRoute>
            }
          />

          {/* Admin Routes */}
          <Route
            path="/admin/dashboard"
            element={
              <AdminRoute>
                <AdminDashboardPage />
              </AdminRoute>
            }
          />
          <Route
            path="/admin/doctors/add"
            element={
              <HospitalRoute>
                <AdminDoctorFormPage />
              </HospitalRoute>
            }
          />
          <Route
            path="/admin/doctors/:id/edit"
            element={
              <HospitalRoute>
                <AdminDoctorFormPage />
              </HospitalRoute>
            }
          />
        </Routes>
      </main>

      {!isDashboard && <Footer />}
    </div>
  );
}

export default App;
