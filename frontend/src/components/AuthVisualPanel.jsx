import React from 'react';
import { HeartPulse } from 'lucide-react';
import '../styles/Auth.css';

/**
 * Shared Visual Panel for all 5 Authentication Pages
 * Provides consistent 55% full-bleed atmospheric photography,
 * bottom-heavy navy gradient overlay, 20s Ken Burns zoom, and reassurance copy.
 */
const AuthVisualPanel = ({
  badgeIcon: BadgeIcon = HeartPulse,
  badgeText = 'Verified Clinic Network',
  title = 'Care that fits your schedule.',
  subtitle = 'Trusted by 10,000+ patients and credentialed hospital specialists.',
}) => {
  return (
    <div className="split-auth-visual">
      <div className="auth-bg-photo" />
      <div className="auth-gradient-overlay" />
      <div className="auth-ambient-glow" />

      <div className="auth-visual-content">
        <div className="auth-brand-pill">
          <BadgeIcon size={16} />
          <span>{badgeText}</span>
        </div>

        <div className="auth-reassurance-box">
          <h2 className="auth-reassurance-title">{title}</h2>
          <p className="auth-reassurance-sub">{subtitle}</p>
        </div>
      </div>
    </div>
  );
};

export default AuthVisualPanel;
