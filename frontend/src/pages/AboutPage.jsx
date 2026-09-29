import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import '../styles/AboutPage.css';

const AboutPage = () => {
  const [stats, setStats] = useState({
    doctor_count: 50,
    patient_count: 1000,
    appointment_count: 500,
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await api.get('/doctors/about-stats/');
        setStats(res.data);
      } catch (err) {
        console.error("Error fetching about stats:", err);
      }
    };
    fetchStats();
  }, []);

  return (
    <div>
      {/* ABOUT HERO */}
      <div className="about-hero" style={{ marginTop: '-1.5rem' }}>
        <div className="container">
          <span className="eyebrow" style={{ color: '#5eead4' }}>About CareConnect</span>
          <h1 style={{ maxWidth: '680px', marginLeft: 'auto', marginRight: 'auto', color: '#ffffff' }}>
            Healthcare Access, Without the Hold Music.
          </h1>
          <p style={{ maxWidth: '560px', marginLeft: 'auto', marginRight: 'auto' }}>
            We connect patients with trusted doctors across every major specialty. Browse schedules, select slots, and confirm appointments in minutes.
          </p>
        </div>
      </div>

      <div className="container">
        {/* STATS CARDS */}
        <div className="about-stats-row">
          <div className="about-stat-card">
            <div className="about-stat-number">{stats.doctor_count}+</div>
            <div className="about-stat-label">Verified Specialists</div>
          </div>
          <div className="about-stat-card">
            <div className="about-stat-number">{stats.patient_count}+</div>
            <div className="about-stat-label">Happy Patients</div>
          </div>
          <div className="about-stat-card">
            <div className="about-stat-number">{stats.appointment_count}+</div>
            <div className="about-stat-label">Successful Bookings</div>
          </div>
          <div className="about-stat-card">
            <div className="about-stat-number">24/7</div>
            <div className="about-stat-label">Online Scheduling</div>
          </div>
        </div>

        {/* MISSION */}
        <div className="mission-block">
          <span className="eyebrow">Our Mission</span>
          <h2>Making Quality Healthcare One Click Away</h2>
          <p style={{ color: 'var(--color-ink-soft)', fontSize: '0.95rem', lineHeight: 1.6 }}>
            Finding the right medical professional shouldn't require dozens of calls, busy signals, or sitting on hold. CareConnect brings credentialed specialist lists, upfront consultation rates, and active schedules directly to your screen so you are in complete control of your care.
          </p>
        </div>

        {/* HOW IT WORKS (TIMELINE) */}
        <div style={{ maxWidth: '640px', margin: '0 auto 3rem' }}>
          <div className="section-head" style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <span className="eyebrow">Three Simple Steps</span>
            <h2>How It Works</h2>
          </div>

          <div className="timeline">
            <div className="timeline-item">
              <div className="timeline-marker">01</div>
              <div className="timeline-content">
                <h4>1. Discover Specialists</h4>
                <p style={{ color: 'var(--color-ink-soft)', fontSize: '0.9rem' }}>
                  Filter by department specialization, location, hospital name, or ratings. Read detailed professional biographies and qualifications upfront.
                </p>
              </div>
            </div>
            <div className="timeline-item">
              <div className="timeline-marker">02</div>
              <div className="timeline-content">
                <h4>2. Select Your Time Slot</h4>
                <p style={{ color: 'var(--color-ink-soft)', fontSize: '0.9rem' }}>
                  View live available slot timings for the upcoming 7 days. Confirm the slot and add patient visit details instantly.
                </p>
              </div>
            </div>
            <div className="timeline-item">
              <div className="timeline-marker">03</div>
              <div className="timeline-content">
                <h4>3. Secure &amp; Go</h4>
                <p style={{ color: 'var(--color-ink-soft)', fontSize: '0.9rem' }}>
                  Complete checkout securely with Razorpay. Access transaction receipt history, reschedule, or cancel on-demand from your account.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* CORE PLATFORM VALUES */}
        <div className="features-section" style={{ paddingTop: 0 }}>
          <div className="section-head">
            <span className="eyebrow">Platform Guidelines</span>
            <h2>Core Platform Values</h2>
          </div>

          <div className="grid">
            <div className="feature-card">
              <div className="feature-icon">✔️</div>
              <h4>Verified First</h4>
              <p>Doctors' medical licenses and certifications are rigorously checked before profile publication.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">📈</div>
              <h4>Transparent Pricing</h4>
              <p>Platform rates match doctor settings. No hidden administrative fees or consulting surcharges.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">⏰</div>
              <h4>Respect for Your Time</h4>
              <p>We work closely with clinic schedules to sync timing slots, minimizing offline waiting room periods.</p>
            </div>
          </div>
        </div>

        {/* CTA BANNER */}
        <div className="cta-banner">
          <h2>Ready to Meet Your Specialist?</h2>
          <p>Book your consulting visit in less than 2 minutes today.</p>
          <a href="/#doctor-list" className="btn btn-hero">Browse Available Doctors</a>
        </div>
      </div>
    </div>
  );
};

export default AboutPage;
