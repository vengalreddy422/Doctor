import React, { Suspense, lazy } from 'react';
import { Routes, Route, useLocation, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import ScrollToTop from './components/ScrollToTop';
import { ProtectedRoute, AdminRoute, HospitalRoute } from './components/ProtectedRoute';

// Route-level code splitting via React.lazy
const HomePage = lazy(() => import('./pages/HomePage'));
const DoctorDetailPage = lazy(() => import('./pages/DoctorDetailPage'));
const AboutPage = lazy(() => import('./pages/AboutPage'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const RegisterPage = lazy(() => import('./pages/RegisterPage'));
const VerifyOtpPage = lazy(() => import('./pages/VerifyOtpPage'));
const ForgotPasswordPage = lazy(() => import('./pages/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('./pages/ResetPasswordPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const ProfileEditPage = lazy(() => import('./pages/ProfileEditPage'));
const MyAppointmentsPage = lazy(() => import('./pages/MyAppointmentsPage'));
const PaymentHistoryPage = lazy(() => import('./pages/PaymentHistoryPage'));
const AdminDashboardPage = lazy(() => import('./pages/AdminDashboardPage'));
const AdminDoctorFormPage = lazy(() => import('./pages/AdminDoctorFormPage'));
const HospitalQueuePage = lazy(() => import('./pages/hospital/HospitalQueuePage'));
const HospitalOverviewPage = lazy(() => import('./pages/hospital/HospitalOverviewPage'));
const HospitalDoctorsPage = lazy(() => import('./pages/hospital/HospitalDoctorsPage'));
const HospitalSlotsPage = lazy(() => import('./pages/hospital/HospitalSlotsPage'));
const HospitalEmergencyPage = lazy(() => import('./pages/hospital/HospitalEmergencyPage'));
const HospitalPaymentsPage = lazy(() => import('./pages/hospital/HospitalPaymentsPage'));

function PageLoader() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
      <div
        style={{
          width: '32px',
          height: '32px',
          border: '3px solid #e2e8f0',
          borderTopColor: '#0d9488',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite'
        }}
      />
    </div>
  );
}

function App() {
  const location = useLocation();
  const isDashboard = location.pathname.startsWith('/admin') || location.pathname.startsWith('/hospital');

  return (
    <div className="app-layout" style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <ScrollToTop />
      {!isDashboard && <Navbar />}

      <main style={{ flex: 1 }}>
        <Suspense fallback={<PageLoader />}>
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

            {/* Hospital Management Routes */}
            <Route
              path="/hospital"
              element={<Navigate to="/hospital/queue" replace />}
            />
            <Route
              path="/hospital/dashboard"
              element={<Navigate to="/hospital/queue" replace />}
            />
            <Route
              path="/hospital/queue"
              element={
                <HospitalRoute>
                  <HospitalQueuePage />
                </HospitalRoute>
              }
            />
            <Route
              path="/hospital/overview"
              element={
                <HospitalRoute>
                  <HospitalOverviewPage />
                </HospitalRoute>
              }
            />
            <Route
              path="/hospital/doctors"
              element={
                <HospitalRoute>
                  <HospitalDoctorsPage />
                </HospitalRoute>
              }
            />
            <Route
              path="/hospital/slots"
              element={
                <HospitalRoute>
                  <HospitalSlotsPage />
                </HospitalRoute>
              }
            />
            <Route
              path="/hospital/emergency"
              element={
                <HospitalRoute>
                  <HospitalEmergencyPage />
                </HospitalRoute>
              }
            />
            <Route
              path="/hospital/payments"
              element={
                <HospitalRoute>
                  <HospitalPaymentsPage />
                </HospitalRoute>
              }
            />

            {/* Admin Routes */}
            <Route
              path="/admin"
              element={<Navigate to="/admin/dashboard" replace />}
            />
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
        </Suspense>
      </main>

      {!isDashboard && <Footer />}
    </div>
  );
}

export default App;
