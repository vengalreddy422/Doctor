import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import Alert from '../components/Alert';
import {
  Eye, EyeOff, AlertCircle, CheckCircle, HeartPulse,
  UserPlus, UserCheck, Check, X, ShieldCheck, Mail, Phone, User
} from 'lucide-react';
import '../styles/Auth.css';

const RegisterPage = () => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Confirmation Modal State (Yes / No Dialog)
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const [touched, setTouched] = useState({
    username: false,
    email: false,
    password: false,
    confirmPassword: false,
    agreeTerms: false,
  });

  const [errors, setErrors] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    agreeTerms: '',
  });

  const { user, logout } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  // 3-Segment Password Strength Calculation
  const getPasswordStrength = () => {
    if (!password) return 0;
    let score = 0;
    if (password.length >= 8) score++;
    if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
    if (/[0-9]/.test(password) || /[^A-Za-z0-9]/.test(password)) score++;
    return score; // 1 = Weak, 2 = Good, 3 = Strong
  };

  const strength = getPasswordStrength();
  const passwordsMatch = confirmPassword.length > 0 && confirmPassword === password && password.length >= 8;

  const validateField = (field, value) => {
    let error = '';
    if (field === 'username') {
      if (!value.trim()) {
        error = 'Please enter your full name.';
      } else if (value.trim().length < 2) {
        error = 'Name must be at least 2 characters.';
      }
    } else if (field === 'email') {
      if (!value.trim()) {
        error = 'Please enter your email address.';
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())) {
        error = 'Please enter a valid email address.';
      }
    } else if (field === 'password') {
      if (!value) {
        error = 'Please enter a password.';
      } else if (value.length < 8) {
        error = 'Password must be at least 8 characters.';
      }
    } else if (field === 'confirmPassword') {
      if (!value) {
        error = 'Please confirm your password.';
      } else if (value !== password) {
        error = 'Passwords do not match.';
      }
    } else if (field === 'agreeTerms') {
      if (!value) {
        error = 'You must accept the terms to continue.';
      }
    }
    setErrors((prev) => ({ ...prev, [field]: error }));
    return !error;
  };

  const handleBlur = (field) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    if (field === 'username') validateField('username', username);
    if (field === 'email') validateField('email', email);
    if (field === 'password') validateField('password', password);
    if (field === 'confirmPassword') validateField('confirmPassword', confirmPassword);
  };

  // Pre-submit validation -> triggers Yes/No Confirmation Dialog
  const handlePreSubmit = (e) => {
    e.preventDefault();
    setErrorMsg('');

    const uValid = validateField('username', username);
    const eValid = validateField('email', email);
    const pValid = validateField('password', password);
    const cpValid = validateField('confirmPassword', confirmPassword);
    const tValid = agreeTerms;

    setTouched({
      username: true,
      email: true,
      password: true,
      confirmPassword: true,
      agreeTerms: true,
    });

    if (!agreeTerms) {
      setErrors((prev) => ({ ...prev, agreeTerms: 'Please accept the Terms & Privacy policy.' }));
      return;
    }

    if (!uValid || !eValid || !pValid || !cpValid || !tValid) return;

    // Show Confirmation Dialog
    setShowConfirmModal(true);
  };

  // Execution after clicking "Yes, Create Account"
  const executeRegistration = async () => {
    setLoading(true);
    setShowConfirmModal(false);
    setErrorMsg('');

    // Clear any previous session so the new account registration starts clean without any stale token headers
    try {
      if (user && logout) {
        await logout();
      } else {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('user');
      }
    } catch {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('user');
    }

    try {
      const res = await api.post('/accounts/register/', {
        username: username.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        password,
      });

      setIsSuccess(true);
      toast.success('Account created! Verification code sent to your email.');

      navigate(`/verify-otp/${encodeURIComponent(email.trim().toLowerCase())}`, {
        state: {
          alert: {
            type: 'success',
            message: res.data?.dev_otp
              ? `Verification code dispatched! (Dev Code: ${res.data.dev_otp}). Also check your Spam folder.`
              : 'Registered! Please check your inbox or Spam/Junk folder for your 6-digit OTP.'
          },
          devOtp: res.data?.dev_otp
        }
      });
    } catch (err) {
      const msg = err.response?.data?.error || err.response?.data?.detail || 'Registration failed. Please check your information.';
      setErrorMsg(msg);
      toast.error(msg);
      setLoading(false);
    }
  };

  return (
    <div className="auth-page-wrap">
      <div className="auth-card-box wide fade-up">
        <div className="auth-card-header">
          <Link to="/" className="auth-logo-badge">
            <HeartPulse size={22} color="var(--color-primary, #10b981)" />
            <span>CareConnect</span>
          </Link>
          <h1 className="auth-greeting-title">Create your account</h1>
          <p className="auth-greeting-sub">Join CareConnect to book appointments with top verified doctors.</p>
        </div>

        {errorMsg && (
          <div style={{ marginBottom: '1rem' }}>
            <Alert type="error" message={errorMsg} onClose={() => setErrorMsg('')} />
          </div>
        )}

        <form onSubmit={handlePreSubmit} id="register-form" noValidate>
          {/* GROUP 1: YOUR DETAILS */}
          <div className="auth-group-divider">
            <span className="auth-group-title">1. Your Details</span>
          </div>

          {/* FULL NAME */}
          <div className="auth-field-group">
            <label htmlFor="id_username" className="auth-field-label">
              Full Name <span className="req-star">*</span>
            </label>
            <div className="auth-input-wrapper">
              <input
                type="text"
                id="id_username"
                className={`auth-input ${touched.username && errors.username ? 'is-invalid' : ''}`}
                placeholder="e.g. Alex Johnson"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  if (errors.username) setErrors((prev) => ({ ...prev, username: '' }));
                }}
                onBlur={() => handleBlur('username')}
                autoComplete="name"
                required
                autoFocus
              />
            </div>
            {touched.username && errors.username && (
              <div className="auth-error-msg">
                <AlertCircle size={13} />
                <span>{errors.username}</span>
              </div>
            )}
          </div>

          {/* EMAIL */}
          <div className="auth-field-group">
            <label htmlFor="id_email" className="auth-field-label">
              Email Address <span className="req-star">*</span>
            </label>
            <div className="auth-input-wrapper">
              <input
                type="email"
                id="id_email"
                className={`auth-input ${touched.email && errors.email ? 'is-invalid' : ''}`}
                placeholder="e.g. alex@example.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (errors.email) setErrors((prev) => ({ ...prev, email: '' }));
                }}
                onBlur={() => handleBlur('email')}
                autoComplete="email"
                required
              />
            </div>
            {touched.email && errors.email && (
              <div className="auth-error-msg">
                <AlertCircle size={13} />
                <span>{errors.email}</span>
              </div>
            )}
          </div>

          {/* PHONE (OPTIONAL) */}
          <div className="auth-field-group">
            <label htmlFor="id_phone" className="auth-field-label">
              Phone Number <span style={{ color: 'var(--color-ink-muted, #94a3b8)', fontWeight: 400 }}>(Optional)</span>
            </label>
            <div className="auth-input-wrapper">
              <input
                type="tel"
                id="id_phone"
                className="auth-input"
                placeholder="+91 98765 43210"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                autoComplete="tel"
              />
            </div>
          </div>

          {/* GROUP 2: SECURITY & ACCESS */}
          <div className="auth-group-divider" style={{ marginTop: '1.25rem' }}>
            <span className="auth-group-title">2. Secure Your Account</span>
          </div>

          {/* PASSWORD */}
          <div className="auth-field-group">
            <label htmlFor="id_password" className="auth-field-label">
              Password <span className="req-star">*</span>
            </label>
            <div className="auth-input-wrapper">
              <input
                type={showPassword ? 'text' : 'password'}
                id="id_password"
                className={`auth-input has-action ${touched.password && errors.password ? 'is-invalid' : ''}`}
                placeholder="Min. 8 characters"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (errors.password) setErrors((prev) => ({ ...prev, password: '' }));
                }}
                onBlur={() => handleBlur('password')}
                autoComplete="new-password"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="auth-input-action-btn"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                tabIndex={-1}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            {/* 3-SEGMENT PASSWORD STRENGTH INDICATOR */}
            {password.length > 0 && (
              <div className="strength-meter-wrap">
                <div className="strength-segments">
                  <div className={`strength-segment ${strength >= 1 ? 'active-weak' : ''}`} />
                  <div className={`strength-segment ${strength >= 2 ? 'active-good' : ''}`} />
                  <div className={`strength-segment ${strength >= 3 ? 'active-strong' : ''}`} />
                </div>
                <div className="strength-text-label" style={{ color: strength === 1 ? '#ef4444' : strength === 2 ? '#d97706' : '#059669' }}>
                  <span>{strength === 1 ? 'Weak password' : strength === 2 ? 'Good password' : 'Strong password'}</span>
                  <span style={{ color: 'var(--color-ink-muted, #94a3b8)', fontWeight: 400 }}>{password.length}/8+ chars</span>
                </div>
              </div>
            )}

            {touched.password && errors.password && (
              <div className="auth-error-msg">
                <AlertCircle size={13} />
                <span>{errors.password}</span>
              </div>
            )}
          </div>

          {/* CONFIRM PASSWORD */}
          <div className="auth-field-group">
            <label htmlFor="id_confirm_password" className="auth-field-label">
              Confirm Password <span className="req-star">*</span>
            </label>
            <div className="auth-input-wrapper">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                id="id_confirm_password"
                className={`auth-input has-action ${touched.confirmPassword && errors.confirmPassword ? 'is-invalid' : ''}`}
                placeholder="Re-enter password"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  if (errors.confirmPassword) setErrors((prev) => ({ ...prev, confirmPassword: '' }));
                }}
                onBlur={() => handleBlur('confirmPassword')}
                autoComplete="new-password"
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="auth-input-action-btn"
                aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                tabIndex={-1}
              >
                {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            {/* REAL-TIME MATCH BADGE */}
            {passwordsMatch && (
              <div className="passwords-match-badge">
                <CheckCircle size={13} />
                <span>Passwords match</span>
              </div>
            )}

            {touched.confirmPassword && errors.confirmPassword && (
              <div className="auth-error-msg">
                <AlertCircle size={13} />
                <span>{errors.confirmPassword}</span>
              </div>
            )}
          </div>

          {/* CUSTOM ANIMATED CHECKBOX: TERMS & PRIVACY */}
          <label className="auth-checkbox-label">
            <input
              type="checkbox"
              className="auth-checkbox-input"
              checked={agreeTerms}
              onChange={(e) => {
                setAgreeTerms(e.target.checked);
                if (errors.agreeTerms) setErrors((prev) => ({ ...prev, agreeTerms: '' }));
              }}
            />
            <span className="custom-checkbox-box">
              <svg className="checkbox-tick-svg" viewBox="0 0 16 16">
                <path d="M3.5 8.5L6.5 11.5L12.5 4.5" />
              </svg>
            </span>
            <span>
              I agree to the <Link to="/about" className="auth-link-inline">Terms of Service</Link> and <Link to="/about" className="auth-link-inline">Privacy Policy</Link>.
            </span>
          </label>
          {touched.agreeTerms && errors.agreeTerms && (
            <div className="auth-error-msg" style={{ marginBottom: '0.75rem' }}>
              <AlertCircle size={13} />
              <span>{errors.agreeTerms}</span>
            </div>
          )}

          {/* SUBMIT BUTTON */}
          <button
            type="submit"
            className={`auth-submit-btn ${isSuccess ? 'btn-success' : ''}`}
            disabled={loading || isSuccess}
          >
            {isSuccess ? (
              <span className="btn-content-success">
                <svg className="checkmark-svg" viewBox="0 0 24 24">
                  <path fill="none" stroke="#ffffff" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" d="M4 12.5l5.5 5.5L20 6" />
                </svg>
                Account Created!
              </span>
            ) : loading ? (
              <span className="btn-content-loading">
                <span className="auth-btn-spinner" />
                Creating account...
              </span>
            ) : (
              <span>Create my account</span>
            )}
          </button>
        </form>

        {/* SWITCHER */}
        <div className="auth-switch-box">
          Already have an account?
          <Link to="/login" className="auth-switch-link">Log In</Link>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* ENTERPRISE REGISTRATION CONFIRMATION MODAL (YES / NO) */}
      {/* ========================================================================= */}
      {showConfirmModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(15, 23, 42, 0.7)',
            backdropFilter: 'blur(5px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '1rem',
          }}
          onClick={() => setShowConfirmModal(false)}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '16px',
              maxWidth: '480px',
              width: '100%',
              padding: '1.75rem',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              border: '1px solid #e2e8f0',
              animation: 'slideUp 0.2s ease-out',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
              <div
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '12px',
                  background: '#ecfdf5',
                  color: '#059669',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <UserCheck size={24} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: 'var(--c-navy, #0f172a)' }}>
                  Confirm Registration
                </h3>
                <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                  CareConnect Patient Portal
                </span>
              </div>
            </div>

            <p style={{ fontSize: '0.88rem', color: '#475569', lineHeight: 1.45, margin: '0 0 1.25rem' }}>
              Are you sure you want to proceed and create your account with the following registration details?
            </p>

            {/* Profile Review Summary Box */}
            <div
              style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '10px',
                padding: '1rem',
                marginBottom: '1.5rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.65rem',
                fontSize: '0.85rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <User size={14} /> Full Name:
                </span>
                <strong style={{ color: '#0f172a' }}>{username}</strong>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <Mail size={14} /> Email Address:
                </span>
                <strong style={{ color: '#0284c7' }}>{email}</strong>
              </div>

              {phone && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b', display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <Phone size={14} /> Phone Number:
                  </span>
                  <strong style={{ color: '#059669' }}>{phone}</strong>
                </div>
              )}
            </div>

            {/* Action Buttons: Yes / No */}
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="btn btn-outline"
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  fontWeight: 600,
                  fontSize: '0.9rem',
                }}
              >
                <X size={15} /> No, Review Details
              </button>

              <button
                type="button"
                onClick={executeRegistration}
                className="btn btn-primary"
                style={{
                  flex: 1.3,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  fontWeight: 700,
                  fontSize: '0.9rem',
                  background: '#059669',
                  borderColor: '#059669',
                }}
              >
                <Check size={16} /> Yes, Create Account
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RegisterPage;
