import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import '../styles/Navbar.css';

const Navbar = () => {
  const { user, logout, isAdmin, isHospital } = useAuth();
  const toast = useToast();
  const [menuOpen, setMenuOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('theme') === 'dark');
  const [isScrolled, setIsScrolled] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 15);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark-mode');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark-mode');
      localStorage.setItem('theme', 'light');
    }
  }, [darkMode]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setMenuOpen(false);
    setDropdownOpen(false);
  }, [location]);

  const toggleTheme = (e) => {
    e.preventDefault();
    setDarkMode(!darkMode);
  };

  const handleLogout = () => {
    logout();
    setDropdownOpen(false);
    setMenuOpen(false);
    toast.info('You have signed out successfully.');
    navigate('/login');
  };

  const userInitial = user?.username ? user.username.charAt(0).toUpperCase() : 'U';

  const handleHomeClick = (e) => {
    if (location.pathname === '/') {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleDoctorsClick = (e) => {
    if (location.pathname === '/') {
      e.preventDefault();
      const el = document.getElementById('doctor-list');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  return (
    <nav className={`navbar ${isScrolled ? 'scrolled' : ''}`} id="main-navbar" role="navigation" aria-label="Main navigation">
      <div className="container">
        <Link className="navbar-brand" to="/" onClick={handleHomeClick} aria-label="CareConnect home">
          <svg className="brand-logo-svg" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" style={{ width: '32px', height: '32px', marginRight: '6px' }}>
            <rect width="40" height="40" rx="10" fill="url(#nav-logo-grad)" />
            <path d="M20 12V28M12 20H28" stroke="white" strokeWidth="4.5" strokeLinecap="round" />
            <path d="M13 26C13 26 15 31 20 31C25 31 27 26 27 26" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
            <defs>
              <linearGradient id="nav-logo-grad" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
                <stop stopColor="#10b981" />
                <stop offset="1" stopColor="#059669" />
              </linearGradient>
            </defs>
          </svg>
          Care<span className="brand-accent">Connect</span>
        </Link>

        <button
          className="nav-toggle"
          id="nav-toggle"
          aria-label="Toggle navigation"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen(!menuOpen)}
        >
          ☰
        </button>

        <div className={`nav-links ${menuOpen ? 'open' : ''}`} id="nav-links" role="menubar">
          <Link to="/" onClick={handleHomeClick} role="menuitem">Home</Link>
          <a href="/#doctor-list" onClick={handleDoctorsClick} role="menuitem">Doctors</a>
          <Link to="/about" role="menuitem">About</Link>

          {user ? (
            <>
              {isAdmin && (
                <Link to="/admin/dashboard" role="menuitem">Dashboard</Link>
              )}

              {/* Desktop Profile Dropdown */}
              <div className="nav-profile-dropdown desktop-only" ref={dropdownRef} role="menu">
                <button
                  type="button"
                  className="nav-profile-trigger"
                  aria-haspopup="true"
                  aria-expanded={dropdownOpen}
                  aria-label="Profile menu"
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                >
                  <span className="nav-profile" title={user.username}>{userInitial}</span>
                </button>
                {dropdownOpen && (
                  <div className="dropdown-menu show" style={{ display: 'block' }}>
                    <div className="dropdown-header">
                      <strong style={{ color: 'var(--color-navy)', fontSize: '0.88rem' }}>{user.username}</strong>
                      <span style={{ fontSize: '0.75rem', color: 'var(--color-ink-muted)' }}>{user.email}</span>
                      {user.hospital_name && (
                        <span style={{ display: 'block', fontSize: '0.72rem', color: '#0284c7', fontWeight: 700, marginTop: '2px' }}>
                          🏥 {user.hospital_name}
                        </span>
                      )}
                    </div>
                    {isHospital && (
                      <Link to="/hospital/dashboard" role="menuitem" onClick={() => setDropdownOpen(false)} style={{ color: '#0284c7', fontWeight: 700 }}>
                        🏥 Hospital Dashboard
                      </Link>
                    )}
                    {isAdmin && (
                      <Link to="/admin/dashboard" role="menuitem" onClick={() => setDropdownOpen(false)} style={{ color: 'var(--color-primary)', fontWeight: 700 }}>
                        🛡️ Platform Admin
                      </Link>
                    )}
                    <Link to="/profile" role="menuitem" onClick={() => setDropdownOpen(false)}>My Profile</Link>
                    <Link to="/my-appointments" role="menuitem" onClick={() => setDropdownOpen(false)}>My Consultations</Link>
                    <Link to="/payment-history" role="menuitem" onClick={() => setDropdownOpen(false)}>Billing History</Link>
                    <div className="dropdown-divider"></div>
                    <button
                      type="button"
                      className="dropdown-logout-btn"
                      onClick={handleLogout}
                      style={{ textAlign: 'left', width: '100%', display: 'block', padding: '0.5rem 1rem' }}
                    >
                      Sign out
                    </button>
                  </div>
                )}
              </div>

              {/* Mobile Only: Direct Links */}
              {isHospital && (
                <Link to="/hospital/dashboard" className="mobile-only" role="menuitem" style={{ color: '#0284c7', fontWeight: 700 }}>
                  🏥 Hospital Dashboard
                </Link>
              )}
              {isAdmin && (
                <Link to="/admin/dashboard" className="mobile-only" role="menuitem" style={{ color: 'var(--color-primary)', fontWeight: 700 }}>
                  🛡️ Platform Admin
                </Link>
              )}
              <Link to="/profile" className="mobile-only" role="menuitem">My Profile</Link>
              <Link to="/my-appointments" className="mobile-only" role="menuitem">My Consultations</Link>
              <Link to="/payment-history" className="mobile-only" role="menuitem">Billing History</Link>
              <button
                type="button"
                className="mobile-only"
                onClick={handleLogout}
                style={{ textAlign: 'left', width: '100%', border: 'none', background: 'none', padding: '0.6rem 0.75rem', fontFamily: 'var(--font-family)', fontSize: '0.875rem', color: 'var(--color-danger)', cursor: 'pointer' }}
              >
                Sign out
              </button>
            </>
          ) : (
            <>
              <Link to="/login" role="menuitem">Log in</Link>
              <button
                type="button"
                onClick={toggleTheme}
                className="theme-toggle-btn"
                title="Toggle theme"
                role="menuitem"
                style={{ margin: '0 0.5rem', background: 'none', border: 'none', cursor: 'pointer', fontSize: '1rem' }}
              >
                {darkMode ? '☀️' : '🌙'}
              </button>
              <Link to="/register" className="btn btn-primary btn-sm" role="menuitem">Get started</Link>
            </>
          )}

          {user && (
            <button
              type="button"
              onClick={toggleTheme}
              className="theme-toggle-btn"
              title="Toggle theme"
              role="menuitem"
              style={{ margin: '0 0.5rem', background: 'none', border: 'none', cursor: 'pointer', fontSize: '1rem' }}
            >
              {darkMode ? '☀️' : '🌙'}
            </button>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
