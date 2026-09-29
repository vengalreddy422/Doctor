import React, { useState } from 'react';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import api from '../api/client';
import Alert from '../components/Alert';
import { Eye, EyeOff, AlertCircle, HeartPulse, KeyRound, CheckCircle } from 'lucide-react';
import '../styles/Auth.css';

const ResetPasswordPage = () => {
  const { email: routeEmail } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const email = decodeURIComponent(routeEmail || '');
  const [code, setCode] = useState(location.state?.devOtp || '');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [alertInfo, setAlertInfo] = useState(location.state?.alert || { type: '', message: '' });

  const [touched, setTouched] = useState({ code: false, newPassword: false, confirmPassword: false });
  const [errors, setErrors] = useState({ code: '', newPassword: '', confirmPassword: '' });

  // 3-Segment Password Strength Calculation
  const getPasswordStrength = () => {
    if (!newPassword) return 0;
    let score = 0;
    if (newPassword.length >= 8) score++;
    if (/[A-Z]/.test(newPassword) && /[a-z]/.test(newPassword)) score++;
    if (/[0-9]/.test(newPassword) || /[^A-Za-z0-9]/.test(newPassword)) score++;
    return score; // 1 = Weak, 2 = Good, 3 = Strong
  };

  const strength = getPasswordStrength();
  const passwordsMatch = confirmPassword.length > 0 && confirmPassword === newPassword && newPassword.length >= 8;

  const validateField = (field, value) => {
    let error = '';
    if (field === 'code') {
      if (!value.trim()) {
        error = 'Please enter the 6-digit verification code.';
      } else if (value.trim().length !== 6) {
        error = 'Code must be exactly 6 digits.';
      }
    } else if (field === 'newPassword') {
      if (!value) {
        error = 'Please enter your new password.';
      } else if (value.length < 8) {
        error = 'Password must be at least 8 characters.';
      }
    } else if (field === 'confirmPassword') {
      if (!value) {
        error = 'Please confirm your new password.';
      } else if (value !== newPassword) {
        error = 'Passwords do not match.';
      }
    }
    setErrors((prev) => ({ ...prev, [field]: error }));
    return !error;
  };

  const handleBlur = (field) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    if (field === 'code') validateField('code', code);
    if (field === 'newPassword') validateField('newPassword', newPassword);
    if (field === 'confirmPassword') validateField('confirmPassword', confirmPassword);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setAlertInfo({ type: '', message: '' });

    const cValid = validateField('code', code);
    const pValid = validateField('newPassword', newPassword);
    const cpValid = validateField('confirmPassword', confirmPassword);
    setTouched({ code: true, newPassword: true, confirmPassword: true });

    if (!cValid || !pValid || !cpValid) return;

    setLoading(true);
    try {
      await api.post('/accounts/reset-password/', {
        email,
        code: code.trim(),
        new_password: newPassword,
      });

      setIsSuccess(true);
      setTimeout(() => {
        navigate('/login', {
          state: { alert: { type: 'success', message: 'Password reset successfully! Please sign in with your new password.' } }
        });
      }, 600);
    } catch (err) {
      const msg = err.response?.data?.error || 'Invalid or expired verification code.';
      setAlertInfo({ type: 'error', message: msg });
      setLoading(false);
    }
  };

  return (
    <div className="auth-page-wrap">
      <div className="auth-card-box fade-up">
        <div className="auth-card-header">
          <Link to="/" className="auth-logo-badge">
            <HeartPulse size={22} color="var(--color-primary, #10b981)" />
            <span>CareConnect</span>
          </Link>
          <h1 className="auth-greeting-title">Choose new password</h1>
          <p className="auth-greeting-sub">
            Enter the 6-digit code sent to <strong style={{ color: 'var(--color-navy, #0f172a)' }}>{email || 'your email'}</strong> and set your new credentials.
          </p>
        </div>

        {alertInfo.message && (
          <div style={{ marginBottom: '1.25rem' }}>
            <Alert type={alertInfo.type} message={alertInfo.message} onClose={() => setAlertInfo({ type: '', message: '' })} />
          </div>
        )}

        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0.65rem 0.85rem', fontSize: '0.78rem', color: '#475569', marginBottom: '1.25rem', textAlign: 'left', lineHeight: 1.4 }}>
          💡 <strong>Email Delivery Tip:</strong> If the recovery code is not in your Primary inbox, please check your <strong>Spam / Junk</strong> or <strong>Promotions</strong> folder, or check the active Django server terminal.
        </div>

          <form onSubmit={handleSubmit} noValidate>
            {/* 6-DIGIT CODE FIELD */}
            <div className="auth-field-group">
              <label htmlFor="id_code" className="auth-field-label">
                6-Digit Verification Code <span className="req-star">*</span>
              </label>
              <div className="auth-input-wrapper">
                <input
                  type="text"
                  id="id_code"
                  maxLength={6}
                  inputMode="numeric"
                  className={`auth-input ${touched.code && errors.code ? 'is-invalid' : ''}`}
                  placeholder="e.g. 123456"
                  value={code}
                  onChange={(e) => {
                    const numeric = e.target.value.replace(/\D/g, '');
                    setCode(numeric);
                    if (errors.code) setErrors((prev) => ({ ...prev, code: '' }));
                  }}
                  onBlur={() => handleBlur('code')}
                  autoComplete="one-time-code"
                  style={{ letterSpacing: '0.25em', fontWeight: 600 }}
                  required
                  autoFocus
                />
              </div>
              {touched.code && errors.code && (
                <div className="auth-error-msg">
                  <AlertCircle size={13} />
                  <span>{errors.code}</span>
                </div>
              )}
            </div>

            {/* NEW PASSWORD */}
            <div className="auth-field-group">
              <label htmlFor="new_password" className="auth-field-label">
                New Password <span className="req-star">*</span>
              </label>
              <div className="auth-input-wrapper">
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="new_password"
                  className={`auth-input has-action ${touched.newPassword && errors.newPassword ? 'is-invalid' : ''}`}
                  placeholder="Min. 8 characters"
                  value={newPassword}
                  onChange={(e) => {
                    setNewPassword(e.target.value);
                    if (errors.newPassword) setErrors((prev) => ({ ...prev, newPassword: '' }));
                  }}
                  onBlur={() => handleBlur('newPassword')}
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
              {newPassword.length > 0 && (
                <div className="strength-meter-wrap">
                  <div className="strength-segments">
                    <div className={`strength-segment ${strength >= 1 ? 'active-weak' : ''}`} />
                    <div className={`strength-segment ${strength >= 2 ? 'active-good' : ''}`} />
                    <div className={`strength-segment ${strength >= 3 ? 'active-strong' : ''}`} />
                  </div>
                  <div className="strength-text-label" style={{ color: strength === 1 ? '#ef4444' : strength === 2 ? '#d97706' : '#059669' }}>
                    <span>{strength === 1 ? 'Weak password' : strength === 2 ? 'Good password' : 'Strong password'}</span>
                    <span style={{ color: 'var(--color-ink-muted, #94a3b8)', fontWeight: 400 }}>{newPassword.length}/8+ chars</span>
                  </div>
                </div>
              )}

              {touched.newPassword && errors.newPassword && (
                <div className="auth-error-msg">
                  <AlertCircle size={13} />
                  <span>{errors.newPassword}</span>
                </div>
              )}
            </div>

            {/* CONFIRM PASSWORD */}
            <div className="auth-field-group">
              <label htmlFor="confirm_password" className="auth-field-label">
                Confirm New Password <span className="req-star">*</span>
              </label>
              <div className="auth-input-wrapper">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  id="confirm_password"
                  className={`auth-input has-action ${touched.confirmPassword && errors.confirmPassword ? 'is-invalid' : ''}`}
                  placeholder="Re-enter new password"
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
                  Password Updated!
                </span>
              ) : loading ? (
                <span className="btn-content-loading">
                  <span className="auth-btn-spinner" />
                  Updating password...
                </span>
              ) : (
                <span>Update password &amp; Sign in</span>
              )}
            </button>
          </form>

          {/* SWITCHER */}
          <div className="auth-switch-box">
            Remembered your password?
            <Link to="/login" className="auth-switch-link">Log In</Link>
          </div>
      </div>
    </div>
  );
};

export default ResetPasswordPage;
