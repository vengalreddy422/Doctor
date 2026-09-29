import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Alert from '../components/Alert';
import { Eye, EyeOff, AlertCircle, HeartPulse } from 'lucide-react';
import '../styles/Auth.css';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [lockoutSeconds, setLockoutSeconds] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');
  const [touched, setTouched] = useState({ email: false, password: false });
  const [errors, setErrors] = useState({ email: '', password: '' });

  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from || '/';
  const incomingAlert = location.state?.alert;

  // 5-minute Lockout countdown timer
  useEffect(() => {
    if (lockoutSeconds <= 0) return;
    const timer = setInterval(() => {
      setLockoutSeconds((prev) => {
        if (prev <= 1) {
          setErrorMsg('Lockout expired. You can now try logging in again.');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [lockoutSeconds]);

  const validateField = (field, value) => {
    let error = '';
    if (field === 'email') {
      if (!value.trim()) {
        error = 'Please enter your email or username.';
      } else if (value.includes('@') && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())) {
        error = 'Please enter a valid email address.';
      }
    } else if (field === 'password') {
      if (!value) {
        error = 'Please enter your password.';
      } else if (value.length < 6) {
        error = 'Password must be at least 6 characters.';
      }
    }
    setErrors((prev) => ({ ...prev, [field]: error }));
    return !error;
  };

  const handleBlur = (field) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    if (field === 'email') validateField('email', email);
    if (field === 'password') validateField('password', password);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (lockoutSeconds > 0) return;
    setErrorMsg('');

    const emailValid = validateField('email', email);
    const passValid = validateField('password', password);
    setTouched({ email: true, password: true });

    if (!emailValid || !passValid) return;

    setLoading(true);

    try {
      const user = await login(email.trim().toLowerCase(), password);
      setIsSuccess(true);
      setLockoutSeconds(0);

      setTimeout(() => {
        if (user.role === 'admin' || user.is_superuser) {
          navigate('/admin/dashboard');
        } else if (user.role === 'hospital') {
          navigate('/hospital/dashboard');
        } else {
          navigate(from === '/login' ? '/' : from);
        }
      }, 500);
    } catch (err) {
      if (err.response?.data?.needs_verification) {
        navigate(`/verify-otp/${encodeURIComponent(err.response.data.email || email)}`, {
          state: { alert: { type: 'warning', message: 'Please verify your email before logging in.' } }
        });
        return;
      }

      if (err.response?.data?.locked && err.response?.data?.remaining_seconds) {
        setLockoutSeconds(err.response.data.remaining_seconds);
      }

      const msg = err.response?.data?.error || 'Invalid email or password.';
      setErrorMsg(msg);
      setLoading(false);
    }
  };

  const [loginMode, setLoginMode] = useState('patient'); // 'patient' | 'hospital'

  const HOSPITAL_PRESETS = [
    { name: 'Yashoda Hospitals, Secunderabad', username: 'Yashoda Hospitals' },
    { name: 'Apollo Speciality Hospital, Bannerghatta', username: 'apollobannerghatta' },
    { name: 'Fortis Memorial Research Institute', username: 'Fortis Memorial' },
    { name: 'Narayana Health City', username: 'narayanahealthcity' },
    { name: 'Care Hospitals, Banjara Hills', username: 'Care Hospitals' },
    { name: 'Lilavati Hospital & Research Centre', username: 'Lilavati Hospital' },
    { name: 'Sunshine Hospitals, Gachibowli', username: 'Sunshine Hospitals' },
    { name: 'Aster Medcity & Wellness Center', username: 'Aster Medcity' },
    { name: 'Manipal Hospital, Old Airport Road', username: 'Manipal Hospital' },
    { name: 'Medicover Hospitals, Hi-Tech City', username: 'Medicover Hospitals' },
    { name: 'KIMS Super Speciality Hospital', username: 'KIMS Super Speciality' },
    { name: 'Sir Ganga Ram Hospital', username: 'Sir Ganga Ram Hospital' },
    { name: 'Max Super Speciality Hospital, Saket', username: 'Max Super Speciality' },
    { name: 'Gleneagles Global Health City', username: 'Gleneagles Global' },
  ];

  const handleSelectHospitalPreset = (presetName) => {
    setErrorMsg('');
    setEmail(presetName);
    setPassword('hospital@123');
  };

  const handleQuickFill = (roleType) => {
    setErrorMsg('');
    if (roleType === 'hospital') {
      setLoginMode('hospital');
      setEmail('Yashoda Hospitals');
      setPassword('hospital@123');
    } else {
      setLoginMode('patient');
      setEmail('');
      setPassword('');
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
          <h1 className="auth-greeting-title">Welcome back</h1>
          <p className="auth-greeting-sub">Sign in to Patient Portal, Hospital Management, or Admin Dashboard.</p>
        </div>

        {/* Portal Quick Access Selector */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem', marginBottom: '1.25rem', padding: '4px', background: '#f1f5f9', borderRadius: '10px' }}>
          <button
            type="button"
            onClick={() => handleQuickFill('hospital')}
            style={{
              padding: '7px 8px',
              borderRadius: '8px',
              border: 'none',
              background: loginMode === 'hospital' ? '#0284c7' : 'transparent',
              color: loginMode === 'hospital' ? '#fff' : '#475569',
              fontSize: '0.78rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px',
              transition: 'all 0.15s ease'
            }}
          >
            🏥 Hospital Login
          </button>
          <button
            type="button"
            onClick={() => handleQuickFill('patient')}
            style={{
              padding: '7px 8px',
              borderRadius: '8px',
              border: 'none',
              background: loginMode === 'patient' ? '#10b981' : 'transparent',
              color: loginMode === 'patient' ? '#fff' : '#475569',
              fontSize: '0.78rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px',
              transition: 'all 0.15s ease'
            }}
          >
            👤 Patient / Custom
          </button>
        </div>

        {loginMode === 'hospital' && (
          <div style={{ background: '#e0f2fe', border: '1px solid #bae6fd', padding: '10px 12px', borderRadius: '8px', fontSize: '0.78rem', color: '#0369a1', marginBottom: '1.25rem', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={{ fontWeight: 700 }}>
              🏥 Quick Hospital Facility Select:
            </div>
            <select
              onChange={(e) => handleSelectHospitalPreset(e.target.value)}
              value={email}
              style={{ width: '100%', height: '34px', borderRadius: '6px', border: '1px solid #93c5fd', padding: '0 8px', fontSize: '0.8rem', background: '#fff', color: '#0f172a', fontWeight: 600 }}
            >
              <option value="">-- Choose Hospital Unit --</option>
              {HOSPITAL_PRESETS.map((h) => (
                <option key={h.name} value={h.name}>{h.name}</option>
              ))}
            </select>
            <span style={{ fontSize: '0.72rem', color: '#0284c7' }}>
              🔑 Default Password: <code>hospital@123</code>. You can also type any hospital name directly below.
            </span>
          </div>
        )}

        {incomingAlert && (
          <div style={{ marginBottom: '1rem' }}>
            <Alert type={incomingAlert.type} message={incomingAlert.message} />
          </div>
        )}

        {errorMsg && (
          <div style={{ marginBottom: '1rem' }}>
            <Alert type="error" message={errorMsg} onClose={() => setErrorMsg('')} />
          </div>
        )}

        <form onSubmit={handleSubmit} id="login-form" noValidate>
          {/* EMAIL / USERNAME */}
          <div className="auth-field-group">
            <label htmlFor="id_email" className="auth-field-label">
              Email or Username <span className="req-star">*</span>
            </label>
            <div className="auth-input-wrapper">
              <input
                type="text"
                id="id_email"
                className={`auth-input ${touched.email && errors.email ? 'is-invalid' : ''}`}
                placeholder="e.g. sarah.jenkins@example.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (errors.email) setErrors((prev) => ({ ...prev, email: '' }));
                }}
                onBlur={() => handleBlur('email')}
                autoComplete="username"
                required
                autoFocus
              />
            </div>
            {touched.email && errors.email && (
              <div className="auth-error-msg">
                <AlertCircle size={13} />
                <span>{errors.email}</span>
              </div>
            )}
          </div>

          {/* PASSWORD */}
          <div className="auth-field-group">
            <div className="auth-label-row">
              <label htmlFor="id_password" className="auth-field-label">
                Password <span className="req-star">*</span>
              </label>
              <Link to="/forgot-password" className="auth-forgot-link">Forgot password?</Link>
            </div>
            <div className="auth-input-wrapper">
              <input
                type={showPassword ? 'text' : 'password'}
                id="id_password"
                className={`auth-input has-action ${touched.password && errors.password ? 'is-invalid' : ''}`}
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (errors.password) setErrors((prev) => ({ ...prev, password: '' }));
                }}
                onBlur={() => handleBlur('password')}
                autoComplete="current-password"
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
            {touched.password && errors.password && (
              <div className="auth-error-msg">
                <AlertCircle size={13} />
                <span>{errors.password}</span>
              </div>
            )}
          </div>

          {/* SUBMIT BUTTON */}
          <button
            type="submit"
            className={`auth-submit-btn ${isSuccess ? 'btn-success' : ''}`}
            disabled={loading || isSuccess || lockoutSeconds > 0}
          >
            {isSuccess ? (
              <span className="btn-content-success">
                <svg className="checkmark-svg" viewBox="0 0 24 24">
                  <path fill="none" stroke="#ffffff" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" d="M4 12.5l5.5 5.5L20 6" />
                </svg>
                Signed In!
              </span>
            ) : lockoutSeconds > 0 ? (
              <span>Locked ({Math.floor(lockoutSeconds / 60)}:{String(lockoutSeconds % 60).padStart(2, '0')})</span>
            ) : loading ? (
              <span className="btn-content-loading">
                <span className="auth-btn-spinner" />
                Signing in...
              </span>
            ) : (
              <span>Sign in to Account</span>
            )}
          </button>
        </form>

        {/* SWITCHER */}
        <div className="auth-switch-box">
          Don't have an account?
          <Link to="/register" className="auth-switch-link">Sign Up</Link>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
