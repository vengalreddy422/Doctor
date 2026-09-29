import React from 'react';
import { Link } from 'react-router-dom';
import '../styles/Footer.css';

const Footer = () => {
  return (
    <footer className="site-footer" role="contentinfo">
      <div className="container">
        <div className="footer-grid">
          <div>
            <div className="footer-brand">
              <svg className="brand-logo-svg" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" style={{ width: '28px', height: '28px', marginRight: '6px' }}>
                <rect width="40" height="40" rx="10" fill="url(#footer-logo-grad)" />
                <path d="M20 12V28M12 20H28" stroke="white" strokeWidth="4.5" strokeLinecap="round" />
                <path d="M13 26C13 26 15 31 20 31C25 31 27 26 27 26" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
                <defs>
                  <linearGradient id="footer-logo-grad" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#10b981" />
                    <stop offset="1" stopColor="#059669" />
                  </linearGradient>
                </defs>
              </svg>
              Care<span className="footer-brand-accent" style={{ color: 'var(--color-primary-light)' }}>Connect</span>
            </div>
            <p className="footer-desc">
              Your trusted platform for managing doctor consultations and appointments —
              providing seamless, efficient, and stress-free healthcare access.
            </p>
            <div className="footer-social" aria-label="Social media links">
              <a href="#" className="social-btn" aria-label="Twitter">𝕏</a>
              <a href="#" className="social-btn" aria-label="LinkedIn">in</a>
              <a href="#" className="social-btn" aria-label="Instagram">📷</a>
            </div>
          </div>

          <div>
            <h4>Company</h4>
            <Link to="/about">About Us</Link>
            <a href="#">Careers</a>
            <a href="#">Press</a>
          </div>

          <div>
            <h4>Services</h4>
            <a href="/#doctor-list">Find a Doctor</a>
            <Link to="/">Book Appointment</Link>
            <a href="#">Video Consult</a>
          </div>

          <div>
            <h4>Support</h4>
            <a href="#">Help Center</a>
            <a href="#">Privacy Policy</a>
            <a href="#">Terms of Service</a>
          </div>

          <div>
            <h4>Contact</h4>
            <a href="tel:+919391651749">+91 9391651749</a>
            <a href="mailto:vengalreddy2005@gmail.com">vengalreddy2005@gmail.com</a>
            <a href="#">Contact Us</a>
          </div>
        </div>

        <div className="footer-bottom">
          Copyright &copy; 2026 CareConnect &mdash; All Rights Reserved. Made with ♥ for better healthcare.
        </div>
      </div>
    </footer>
  );
};

export default Footer;
