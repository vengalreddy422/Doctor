import React, { useState, useRef, useEffect } from 'react';
import { NavLink, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  Users,
  LayoutDashboard,
  Stethoscope,
  CalendarCheck,
  AlertTriangle,
  Receipt,
  Menu,
  X,
  ChevronDown,
  LogOut,
  Building2,
  ExternalLink,
  ChevronRight,
  ShieldAlert,
  Clock
} from 'lucide-react';
import './DashboardLayout.css';

export default function DashboardLayout({
  role = 'hospital',
  title = '',
  subtitle = '',
  badge = null,
  breadcrumbs = [],
  actions = null,
  children
}) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setUserDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Hospital Navigation Links (Max 6)
  const hospitalNavItems = [
    { label: 'Patient Queue', to: '/hospital/queue', icon: Users },
    { label: 'Overview', to: '/hospital/overview', icon: LayoutDashboard },
    { label: 'Specialists', to: '/hospital/doctors', icon: Stethoscope },
    { label: 'Slot Monitor', to: '/hospital/slots', icon: CalendarCheck },
    { label: 'Emergency Hub', to: '/hospital/emergency', icon: AlertTriangle },
    { label: 'Financial Ledger', to: '/hospital/payments', icon: Receipt },
  ];

  const navItems = role === 'hospital' ? hospitalNavItems : [];

  const hospitalName = user?.hospital_name || user?.hospital?.name || 'CareConnect Clinical Partner';
  const staffName = user?.first_name ? `${user.first_name} ${user.last_name || ''}`.trim() : (user?.name || user?.email || 'Hospital Staff');

  return (
    <div className="cc-dashboard-wrapper">
      {/* Sticky Top Navigation Bar */}
      <header className="cc-top-navbar">
        <div className="cc-top-navbar-inner">
          {/* Brand & Portal Type */}
          <Link to={role === 'hospital' ? '/hospital/queue' : '/'} className="cc-nav-brand">
            <div className="cc-brand-icon">
              <Building2 size={20} />
            </div>
            <div className="cc-brand-text">
              <span className="cc-brand-name">CareConnect</span>
              <span className="cc-brand-badge">
                <span className="cc-badge-dot"></span>
                Hospital Portal
              </span>
            </div>
          </Link>

          {/* Center: Top Navigation Links */}
          <nav className="cc-nav-links" aria-label="Hospital Navigation">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.to || location.pathname.startsWith(`${item.to}/`);
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive: isLinkActive }) =>
                    `cc-nav-link ${isLinkActive || isActive ? 'active' : ''}`
                  }
                >
                  <Icon size={16} />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </nav>

          {/* Right: Quick Status & User Profile */}
          <div className="cc-nav-right">
            {/* User Dropdown */}
            <div className="cc-user-dropdown-container" ref={dropdownRef}>
              <button
                className="cc-user-btn"
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                aria-expanded={userDropdownOpen}
                aria-haspopup="true"
              >
                <div className="cc-user-avatar">
                  {staffName.charAt(0).toUpperCase()}
                </div>
                <div className="cc-user-meta">
                  <span className="cc-user-name">{staffName}</span>
                  <span className="cc-user-role">{hospitalName}</span>
                </div>
                <ChevronDown size={14} style={{ opacity: 0.7 }} />
              </button>

              {userDropdownOpen && (
                <div className="cc-dropdown-menu">
                  <div className="cc-dropdown-header">
                    <div className="cc-dropdown-title">{staffName}</div>
                    <div className="cc-dropdown-subtitle">{hospitalName}</div>
                    <div className="cc-dropdown-subtitle" style={{ fontSize: '0.6875rem', color: '#0d9488' }}>
                      Role: {user?.role || 'Hospital Staff'}
                    </div>
                  </div>
                  <Link to="/" className="cc-dropdown-item">
                    <ExternalLink size={15} />
                    <span>Public Home Page</span>
                  </Link>
                  <button className="cc-dropdown-item danger" onClick={handleLogout}>
                    <LogOut size={15} />
                    <span>Sign Out</span>
                  </button>
                </div>
              )}
            </div>

            {/* Mobile Hamburger Button */}
            <button
              className="cc-mobile-toggle"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Navigation */}
        <div className={`cc-mobile-nav ${mobileMenuOpen ? 'open' : ''}`}>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.to || location.pathname.startsWith(`${item.to}/`);
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={`cc-mobile-link ${isActive ? 'active' : ''}`}
                onClick={() => setMobileMenuOpen(false)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                  <Icon size={18} />
                  <span>{item.label}</span>
                </div>
                <ChevronRight size={16} opacity={0.5} />
              </NavLink>
            );
          })}
        </div>
      </header>

      {/* Sub-header / Breadcrumbs & Title Bar */}
      <section className="cc-sub-header">
        <div className="cc-sub-header-inner">
          <div>
            {breadcrumbs && breadcrumbs.length > 0 && (
              <div className="cc-breadcrumb-trail">
                {breadcrumbs.map((crumb, idx) => (
                  <React.Fragment key={crumb.path || idx}>
                    {idx > 0 && <ChevronRight size={12} />}
                    {crumb.path ? (
                      <Link to={crumb.path} className="cc-breadcrumb-item">
                        {crumb.label}
                      </Link>
                    ) : (
                      <span className="cc-breadcrumb-current">{crumb.label}</span>
                    )}
                  </React.Fragment>
                ))}
              </div>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.125rem' }}>
              <h1 className="cc-page-header-title">{title}</h1>
              {badge}
            </div>
            {subtitle && (
              <p style={{ margin: '0.25rem 0 0', fontSize: '0.8125rem', color: '#64748b' }}>
                {subtitle}
              </p>
            )}
          </div>

          {/* Action buttons (e.g. Refresh, New Doctor, Export) */}
          {actions && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
              {actions}
            </div>
          )}
        </div>
      </section>

      {/* Main Content Area */}
      <main className="cc-dashboard-content">
        {children}
      </main>
    </div>
  );
}
