import React, { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import api from '../api/client';
import { useToast } from '../context/ToastContext';
import Alert from '../components/Alert';
import { HeartPulse, MailCheck } from 'lucide-react';
import '../styles/Auth.css';

const VerifyOtpPage = () => {
  const { email: routeEmail } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const toast = useToast();

  const email = decodeURIComponent(routeEmail || '');
  const [digits, setDigits] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isRollback, setIsRollback] = useState(false);
  const [resending, setResending] = useState(false);
  const [isShaking, setIsShaking] = useState(false);
  const [countdown, setCountdown] = useState(30);
  const [devOtp, setDevOtp] = useState(location.state?.devOtp || '');
  const [alertInfo, setAlertInfo] = useState(location.state?.alert || { type: '', message: '' });

  const inputRefs = useRef([]);

  // Auto-focus first digit box or auto-fill if devOtp passed
  useEffect(() => {
    if (devOtp && devOtp.length === 6) {
      setDigits(devOtp.split(''));
    } else if (inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, [devOtp]);

  // 30-second resend countdown timer
  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  const triggerVerification = async (codeToVerify) => {
    if (codeToVerify.length < 6 || loading || isSuccess || isRollback) return;

    setLoading(true);
    setAlertInfo({ type: '', message: '' });

    try {
      await api.post('/accounts/verify-otp/', {
        email,
        code: codeToVerify,
      });

      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('user');

      setIsSuccess(true);
      toast.success('Email verified successfully! Please sign in.');
      navigate('/login', {
        state: { alert: { type: 'success', message: 'Email verified! Please sign in with your password.' } }
      });
    } catch (err) {
      const isCancelled = err.response?.data?.rollback || err.response?.data?.attempts_exceeded;
      const msg = err.response?.data?.error || 'Invalid or expired verification code.';

      if (isCancelled) {
        setIsRollback(true);
        setAlertInfo({ type: 'error', message: msg });
        setDigits(['', '', '', '', '', '']);
      } else {
        setAlertInfo({ type: 'error', message: msg });
        setIsShaking(true);
        setTimeout(() => {
          setIsShaking(false);
          setDigits(['', '', '', '', '', '']);
          inputRefs.current[0]?.focus();
        }, 350);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDigitChange = (index, value) => {
    if (isRollback) return;
    const numeric = value.replace(/\D/g, '');
    if (!numeric && value !== '') return;

    const newDigits = [...digits];

    // If pasted multiple digits
    if (numeric.length > 1) {
      const pastedChars = numeric.slice(0, 6).split('');
      pastedChars.forEach((char, i) => {
        if (i < 6) newDigits[i] = char;
      });
      setDigits(newDigits);
      const nextIdx = Math.min(pastedChars.length, 5);
      inputRefs.current[nextIdx]?.focus();

      if (newDigits.every((d) => d !== '')) {
        triggerVerification(newDigits.join(''));
      }
      return;
    }

    newDigits[index] = numeric;
    setDigits(newDigits);

    // Auto advance focus
    if (numeric && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all 6 digits are filled
    if (numeric && index === 5 && newDigits.every((d) => d !== '')) {
      triggerVerification(newDigits.join(''));
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasteData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasteData) {
      handleDigitChange(0, pasteData);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (isRollback) return;
    const code = digits.join('');
    triggerVerification(code);
  };

  const handleResendOtp = async () => {
    if (!email || countdown > 0 || resending || isRollback) return;
    setResending(true);
    try {
      const res = await api.post('/accounts/resend-otp/', { email, purpose: 'verify_email' });
      const newDevOtp = res.data?.dev_otp;
      if (newDevOtp) {
        setDevOtp(newDevOtp);
        setAlertInfo({ type: 'success', message: `Fresh OTP dispatched! (Dev Code: ${newDevOtp}). Also check your Spam folder.` });
      } else {
        setAlertInfo({ type: 'success', message: 'A fresh 6-digit code has been sent to your email. Please check your inbox / Spam folder.' });
      }
      setCountdown(30);
      inputRefs.current[0]?.focus();
    } catch (err) {
      const msg = err.response?.data?.error || 'Could not resend code. Please try again.';
      if (err.response?.data?.rollback) {
        setIsRollback(true);
      }
      setAlertInfo({ type: 'error', message: msg });
    } finally {
      setResending(false);
    }
  };

  const handleCancelAndSignUpAgain = async (e) => {
    e.preventDefault();
    if (email) {
      try {
        await api.post('/accounts/cancel-registration/', { email });
      } catch (err) {
        // Ignore or continue
      }
    }
    navigate('/register');
  };

  return (
    <div className="auth-page-wrap">
      <div className="auth-card-box fade-up" style={{ textAlign: 'center' }}>
        <div className="auth-card-header" style={{ textAlign: 'center' }}>
          <Link to="/" className="auth-logo-badge" style={{ justifyContent: 'center' }}>
            <HeartPulse size={22} color="var(--color-primary, #10b981)" />
            <span>CareConnect</span>
          </Link>
          <h1 className="auth-greeting-title">Verify your email</h1>
          <p className="auth-greeting-sub">
            We sent a 6-digit code to <strong style={{ color: 'var(--color-navy, #0f172a)' }}>{email || 'your email address'}</strong>.
          </p>
        </div>

        {alertInfo.message && (
          <div style={{ marginBottom: '1.25rem', textAlign: 'left' }}>
            <Alert type={alertInfo.type} message={alertInfo.message} onClose={() => setAlertInfo({ type: '', message: '' })} />
          </div>
        )}

        {/* Email Delivery Tip */}
        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0.65rem 0.85rem', fontSize: '0.78rem', color: '#475569', marginBottom: '1.25rem', textAlign: 'left', lineHeight: 1.4 }}>
          💡 <strong>Email Delivery Tip:</strong> If the OTP is not in your Primary inbox, please check your <strong>Spam / Junk</strong> or <strong>Promotions</strong> folder. You can also view the code in the active Django server terminal.
        </div>

        {!isRollback ? (
          <>
            <form onSubmit={handleSubmit} id="otp-form">
              {/* 6 INDIVIDUAL AUTO-ADVANCING DIGIT BOXES */}
              <div
                className={`otp-boxes-wrapper ${isShaking ? 'shake-error' : ''}`}
                onPaste={handlePaste}
              >
                {digits.map((digit, index) => (
                  <input
                    key={index}
                    ref={(el) => (inputRefs.current[index] = el)}
                    type="text"
                    maxLength={1}
                    inputMode="numeric"
                    pattern="[0-9]*"
                    className={`otp-box-input ${isShaking ? 'is-error' : ''}`}
                    value={digit}
                    onChange={(e) => handleDigitChange(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(index, e)}
                    disabled={loading || isSuccess || isRollback}
                    autoComplete="one-time-code"
                    required
                  />
                ))}
              </div>

              {/* SUBMIT BUTTON */}
              <button
                type="submit"
                className={`auth-submit-btn ${isSuccess ? 'btn-success' : ''}`}
                disabled={loading || isSuccess || isRollback || digits.join('').length < 6}
              >
                {isSuccess ? (
                  <span className="btn-content-success">
                    <svg className="checkmark-svg" viewBox="0 0 24 24">
                      <path fill="none" stroke="#ffffff" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" d="M4 12.5l5.5 5.5L20 6" />
                    </svg>
                    Verified! Taking you to login...
                  </span>
                ) : loading ? (
                  <span className="btn-content-loading">
                    <span className="auth-btn-spinner" />
                    Verifying code...
                  </span>
                ) : (
                  <span>Confirm code</span>
                )}
              </button>
            </form>

            {/* COUNTDOWN & RESEND */}
            <div className="otp-resend-wrap">
              {countdown > 0 ? (
                <span>Resend code in <strong style={{ color: 'var(--color-navy, #0f172a)' }}>{countdown}s</strong></span>
              ) : (
                <button
                  type="button"
                  onClick={handleResendOtp}
                  className="otp-resend-btn"
                  disabled={resending}
                >
                  {resending ? 'Sending...' : 'Resend code now'}
                </button>
              )}
            </div>
          </>
        ) : (
          <div style={{ marginTop: '1.5rem', marginBottom: '1.5rem' }}>
            <button
              type="button"
              onClick={handleCancelAndSignUpAgain}
              className="btn btn-primary"
              style={{ width: '100%', height: '46px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', cursor: 'pointer' }}
            >
              Sign Up Again
            </button>
          </div>
        )}

        {/* SWITCHER */}
        <div className="auth-switch-box">
          Wrong email address?
          <button
            type="button"
            onClick={handleCancelAndSignUpAgain}
            className="auth-switch-link"
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, font: 'inherit', color: 'var(--color-primary, #10b981)', textDecoration: 'underline' }}
          >
            Sign up again
          </button>
        </div>
      </div>
    </div>
  );
};

export default VerifyOtpPage;
