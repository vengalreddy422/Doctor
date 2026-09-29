import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/client';
import Alert from '../components/Alert';
import { AlertCircle, HeartPulse, MailCheck, ArrowRight, KeyRound } from 'lucide-react';
import '../styles/Auth.css';

const ForgotPasswordPage = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [devOtp, setDevOtp] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [touched, setTouched] = useState(false);
  const [error, setError] = useState('');

  const navigate = useNavigate();

  const validateEmail = (val) => {
    if (!val.trim()) {
      return 'Please enter your registered email address.';
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val.trim())) {
      return 'Please enter a valid email address.';
    }
    return '';
  };

  const handleBlur = () => {
    setTouched(true);
    setError(validateEmail(email));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    const err = validateEmail(email);
    setTouched(true);
    setError(err);
    if (err) return;

    setLoading(true);

    try {
      const res = await api.post('/accounts/forgot-password/', {
        email: email.trim().toLowerCase(),
      });
      setDevOtp(res.data?.dev_otp || '');
      setIsSubmitted(true);
    } catch (apiErr) {
      const msg = apiErr.response?.data?.error || 'Unable to send recovery code. Please check your email and try again.';
      setErrorMsg(msg);
    } finally {
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
          {!isSubmitted ? (
            <>
              <h1 className="auth-greeting-title">Reset your password</h1>
              <p className="auth-greeting-sub">Enter your email address and we'll send you a 6-digit verification code.</p>
            </>
          ) : null}
        </div>

        {errorMsg && (
          <div style={{ marginBottom: '1.25rem' }}>
            <Alert type="error" message={errorMsg} onClose={() => setErrorMsg('')} />
          </div>
        )}

        {!isSubmitted ? (
          /* ACTIVE FORM STATE */
          <form onSubmit={handleSubmit} noValidate>
            <div className="auth-field-group">
              <label htmlFor="id_email" className="auth-field-label">
                Registered Email Address <span className="req-star">*</span>
              </label>
              <div className="auth-input-wrapper">
                <input
                  type="email"
                  id="id_email"
                  className={`auth-input ${touched && error ? 'is-invalid' : ''}`}
                  placeholder="e.g. sarah.jenkins@example.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (error) setError('');
                  }}
                  onBlur={handleBlur}
                  autoComplete="email"
                  required
                  autoFocus
                />
              </div>
              {touched && error && (
                <div className="auth-error-msg">
                  <AlertCircle size={13} />
                  <span>{error}</span>
                </div>
              )}
            </div>

            <button
              type="submit"
              className="auth-submit-btn"
              disabled={loading}
            >
              {loading ? (
                <span className="btn-content-loading">
                  <span className="auth-btn-spinner" />
                  Sending recovery code...
                </span>
              ) : (
                <span>Send verification code</span>
              )}
            </button>
          </form>
        ) : (
          /* REASSURING CONFIRMATION STATE */
          <div className="auth-confirmation-card">
            <div className="auth-confirm-icon-wrap">
              <MailCheck size={36} />
            </div>
            <h2 className="auth-confirm-title">Check your inbox</h2>
            <p className="auth-confirm-text">
              We've sent a 6-digit verification code to
              <br />
              <span className="auth-confirm-email-pill">{email}</span>
              <br />
              Enter the code on the next screen to create your new password.
            </p>

            <button
              type="button"
              className="auth-submit-btn"
              onClick={() => navigate(`/reset-password/${encodeURIComponent(email.trim().toLowerCase())}`, {
                state: {
                  alert: {
                    type: 'success',
                    message: devOtp
                      ? `OTP sent to email! (Dev Code: ${devOtp}). Also check your Spam folder.`
                      : 'Enter your 6-digit recovery code below. Check your inbox or Spam/Junk folder.'
                  },
                  devOtp: devOtp
                }
              })}
            >
              <span>Enter verification code</span>
              <ArrowRight size={18} />
            </button>

            <div>
              <button
                type="button"
                className="auth-confirm-retry-btn"
                onClick={() => setIsSubmitted(false)}
              >
                Didn't receive the email? Try another address
              </button>
            </div>
          </div>
        )}

        {/* SWITCHER */}
        <div className="auth-switch-box">
          Remembered your password?
          <Link to="/login" className="auth-switch-link">Log In</Link>
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
