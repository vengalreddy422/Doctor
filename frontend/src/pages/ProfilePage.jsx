import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import Alert from '../components/Alert';
import '../styles/Profile.css';
import {
  User, Mail, Phone, MapPin, Calendar, CheckCircle2, ShieldCheck,
  Edit3, CreditCard, Clock, Gift, Sparkles, Stethoscope, ChevronRight,
  HeartPulse, Award, FileText
} from 'lucide-react';

const ProfilePage = () => {
  const { user: authUser, updateUser } = useAuth();
  const [profile, setProfile] = useState(authUser);
  const [bookingStats, setBookingStats] = useState(null);
  const [recentAppointments, setRecentAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const location = useLocation();
  const [alertInfo, setAlertInfo] = useState(location.state?.alert || { type: '', message: '' });

  useEffect(() => {
    const fetchProfileData = async () => {
      try {
        const [profileRes, appointmentsRes] = await Promise.all([
          api.get('/accounts/profile/'),
          api.get('/appointments/my-appointments/', { params: { page_size: 3 } })
        ]);
        setProfile(profileRes.data);
        updateUser(profileRes.data);
        setRecentAppointments(appointmentsRes.data.results || []);

        // Also fetch user loyalty booking stats
        try {
          const couponRes = await api.get('/appointments/available-coupons/');
          setBookingStats(couponRes.data.booking_stats);
        } catch {
          // Non-blocking
        }
      } catch (err) {
        console.error("Failed to load profile details:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchProfileData();
  }, []);

  if (loading && !profile) {
    return (
      <div className="container" style={{ minHeight: '60vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem' }}>
        <div className="spinner" style={{ width: '40px', height: '40px', border: '3px solid rgba(13,148,136,0.2)', borderTopColor: 'var(--color-primary)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }}></div>
        <div style={{ color: 'var(--color-navy)', fontWeight: 600 }}>Loading Patient Portal...</div>
      </div>
    );
  }

  const userInitial = profile?.username ? profile.username.charAt(0).toUpperCase() : 'U';
  const fullName = [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') || profile?.username;

  return (
    <div className="container" style={{ paddingTop: '2.5rem', paddingBottom: '4rem', maxWidth: '1000px' }}>
      {/* HEADER BREADCRUMB / GREETING */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '2rem' }}>
        <div>
          <span className="eyebrow" style={{ color: 'var(--color-primary)', fontWeight: 700 }}>
            Patient Portal &bull; Medical Profile
          </span>
          <h1 style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--color-navy)', marginTop: '0.2rem', marginBottom: '0.35rem' }}>
            Welcome back, {profile?.first_name || profile?.username}!
          </h1>
          <p style={{ color: 'var(--color-ink-soft)', fontSize: '0.9rem', margin: 0 }}>
            Manage your personal medical information, loyalty milestone tier, and active appointment schedules.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.6rem' }}>
          <Link to="/profile/edit" className="btn btn-outline btn-sm" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: '#fff' }}>
            <Edit3 size={15} /> Edit Profile
          </Link>
          <Link to="/#doctor-list" className="btn btn-primary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Stethoscope size={15} /> Book Doctor
          </Link>
        </div>
      </div>

      {alertInfo.message && (
        <div style={{ marginBottom: '1.75rem' }}>
          <Alert type={alertInfo.type} message={alertInfo.message} onClose={() => setAlertInfo({ type: '', message: '' })} />
        </div>
      )}

      {/* QUICK STATS & LOYALTY SUMMARY */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
        <div className="card" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem', borderLeft: '4px solid var(--color-primary)' }}>
          <div style={{ width: '46px', height: '46px', borderRadius: '12px', background: 'var(--color-primary-subtle)', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Calendar size={22} />
          </div>
          <div>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--color-ink-soft)', textTransform: 'uppercase' }}>Consultations</span>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--color-navy)' }}>
              {bookingStats?.booking_count ?? 0}
            </div>
            <span style={{ fontSize: '0.72rem', color: 'var(--color-primary)', fontWeight: 600 }}>Completed / Active</span>
          </div>
        </div>

        <div className="card" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem', borderLeft: '4px solid #7c3aed' }}>
          <div style={{ width: '46px', height: '46px', borderRadius: '12px', background: '#ede9fe', color: '#7c3aed', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Award size={22} />
          </div>
          <div>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--color-ink-soft)', textTransform: 'uppercase' }}>Loyalty Tier</span>
            <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--color-navy)' }}>
              {bookingStats?.booking_count >= 5 ? 'Gold Member' : 'Silver Member'}
            </div>
            <span style={{ fontSize: '0.72rem', color: '#7c3aed', fontWeight: 600 }}>
              {bookingStats?.bookings_until_next ? `${bookingStats.bookings_until_next} to Next Milestone` : 'Active Rewards'}
            </span>
          </div>
        </div>

        <div className="card" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem', borderLeft: '4px solid #16a34a' }}>
          <div style={{ width: '46px', height: '46px', borderRadius: '12px', background: '#dcfce7', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ShieldCheck size={22} />
          </div>
          <div>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--color-ink-soft)', textTransform: 'uppercase' }}>Account Status</span>
            <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#16a34a' }}>
              Verified Patient
            </div>
            <span style={{ fontSize: '0.72rem', color: 'var(--color-ink-soft)' }}>OTP Protected</span>
          </div>
        </div>
      </div>

      {/* MAIN TWO-COLUMN PROFILE CONTENT */}
      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '1.75rem', alignItems: 'flex-start' }}>
        {/* LEFT COLUMN: IDENTITY CARD */}
        <div className="card" style={{ padding: '2rem 1.5rem', textAlign: 'center' }}>
          <div style={{ position: 'relative', width: '96px', height: '96px', margin: '0 auto 1.25rem' }}>
            {profile?.profile_image_url || profile?.profile_image ? (
              <img
                src={profile.profile_image_url || profile.profile_image}
                alt={profile.username}
                style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover', border: '3px solid var(--color-primary)', boxShadow: '0 4px 14px rgba(13,148,136,0.2)' }}
              />
            ) : (
              <div style={{ width: '100%', height: '100%', borderRadius: '50%', background: 'linear-gradient(135deg, var(--color-primary) 0%, #0284c7 100%)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.5rem', fontWeight: 800 }}>
                {userInitial}
              </div>
            )}
            <div style={{ position: 'absolute', bottom: '0', right: '0', background: '#16a34a', color: '#fff', width: '26px', height: '26px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid #fff' }} title="Verified User">
              <CheckCircle2 size={15} />
            </div>
          </div>

          <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--color-navy)', margin: '0 0 0.2rem' }}>
            {fullName}
          </h2>
          <p style={{ fontSize: '0.82rem', color: 'var(--color-ink-soft)', margin: '0 0 1rem' }}>
            @{profile?.username} &middot; <span style={{ textTransform: 'capitalize', fontWeight: 600, color: 'var(--color-primary)' }}>{profile?.role || 'Patient'}</span>
          </p>

          <div style={{ padding: '0.75rem', background: 'var(--color-bg-alt)', borderRadius: '10px', fontSize: '0.8rem', color: 'var(--color-ink-soft)', marginBottom: '1.25rem', textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Mail size={14} style={{ color: 'var(--color-primary)', flexShrink: 0 }} />
              <span style={{ wordBreak: 'break-all', fontWeight: 500 }}>{profile?.email}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Phone size={14} style={{ color: 'var(--color-primary)', flexShrink: 0 }} />
              <span>{profile?.phone || 'No phone added'}</span>
            </div>
          </div>

          <Link to="/profile/edit" className="btn btn-outline btn-sm" style={{ width: '100%', justifyContent: 'center', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <Edit3 size={14} /> Update Contact & Photo
          </Link>
        </div>

        {/* RIGHT COLUMN: INFORMATION & RECENT APPOINTMENTS */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* PERSONAL & MEDICAL DETAILS CARD */}
          <div className="card" style={{ padding: '1.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid var(--color-line)', paddingBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <HeartPulse size={18} style={{ color: 'var(--color-primary)' }} />
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--color-navy)', margin: 0 }}>
                  Personal & Medical Info
                </h3>
              </div>
              <Link to="/profile/edit" style={{ fontSize: '0.78rem', color: 'var(--color-primary)', fontWeight: 600, textDecoration: 'none' }}>
                Edit &rarr;
              </Link>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem' }}>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--color-ink-muted)', fontWeight: 600, textTransform: 'uppercase', display: 'block', marginBottom: '0.2rem' }}>
                  Full Legal Name
                </span>
                <span style={{ fontSize: '0.92rem', fontWeight: 600, color: 'var(--color-navy)' }}>
                  {fullName}
                </span>
              </div>

              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--color-ink-muted)', fontWeight: 600, textTransform: 'uppercase', display: 'block', marginBottom: '0.2rem' }}>
                  Gender
                </span>
                <span style={{ fontSize: '0.92rem', fontWeight: 600, color: 'var(--color-navy)', textTransform: 'capitalize' }}>
                  {profile?.gender || 'Not specified'}
                </span>
              </div>

              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--color-ink-muted)', fontWeight: 600, textTransform: 'uppercase', display: 'block', marginBottom: '0.2rem' }}>
                  Date of Birth
                </span>
                <span style={{ fontSize: '0.92rem', fontWeight: 600, color: 'var(--color-navy)' }}>
                  {profile?.birthday || 'Not specified'}
                </span>
              </div>

              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--color-ink-muted)', fontWeight: 600, textTransform: 'uppercase', display: 'block', marginBottom: '0.2rem' }}>
                  Primary Phone
                </span>
                <span style={{ fontSize: '0.92rem', fontWeight: 600, color: 'var(--color-navy)' }}>
                  {profile?.phone || 'Not added'}
                </span>
              </div>

              <div style={{ gridColumn: '1 / -1' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--color-ink-muted)', fontWeight: 600, textTransform: 'uppercase', display: 'block', marginBottom: '0.2rem' }}>
                  Residential Address
                </span>
                <span style={{ fontSize: '0.92rem', fontWeight: 500, color: 'var(--color-navy)' }}>
                  {profile?.address || 'No address provided yet.'}
                </span>
              </div>
            </div>
          </div>

          {/* RECENT APPOINTMENTS PREVIEW */}
          <div className="card" style={{ padding: '1.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid var(--color-line)', paddingBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Clock size={18} style={{ color: 'var(--color-primary)' }} />
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--color-navy)', margin: 0 }}>
                  Recent Consultation Bookings
                </h3>
              </div>
              <Link to="/my-appointments" style={{ fontSize: '0.78rem', color: 'var(--color-primary)', fontWeight: 600, textDecoration: 'none' }}>
                View All Bookings &rarr;
              </Link>
            </div>

            {recentAppointments.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {recentAppointments.map((appt) => (
                  <div
                    key={appt.id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '0.85rem 1rem',
                      background: 'var(--color-bg-alt)',
                      borderRadius: '10px',
                      border: '1px solid var(--color-line)',
                      flexWrap: 'wrap',
                      gap: '0.5rem'
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 700, color: 'var(--color-navy)', fontSize: '0.92rem' }}>
                        Dr. {appt.doctor_name}
                      </div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--color-ink-soft)' }}>
                        {appt.doctor_specialization} &middot; {appt.slot_date} at {appt.slot_time}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <span className={`status-badge status-${appt.status}`} style={{ fontSize: '0.72rem' }}>
                        {appt.status?.toUpperCase()}
                      </span>
                      <span style={{ fontWeight: 700, color: 'var(--color-navy)', fontSize: '0.9rem' }}>
                        ₹{appt.fee_charged}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '1.5rem', background: 'var(--color-bg-alt)', borderRadius: '10px' }}>
                <p style={{ fontSize: '0.88rem', color: 'var(--color-ink-soft)', margin: '0 0 0.75rem' }}>
                  You haven't scheduled any doctor consultations yet.
                </p>
                <Link to="/#doctor-list" className="btn btn-primary btn-sm">
                  Browse 150 Specialists
                </Link>
              </div>
            )}
          </div>

          {/* QUICK PORTAL LINKS */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <Link
              to="/my-appointments"
              className="card"
              style={{ padding: '1.25rem', textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: 'inherit', transition: 'all 0.2s ease' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ width: '38px', height: '38px', borderRadius: '8px', background: 'var(--color-primary-subtle)', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Calendar size={18} />
                </div>
                <div>
                  <div style={{ fontWeight: 700, color: 'var(--color-navy)', fontSize: '0.9rem' }}>My Appointments</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-ink-soft)' }}>Reschedule & cancel slots</div>
                </div>
              </div>
              <ChevronRight size={16} style={{ color: 'var(--color-ink-muted)' }} />
            </Link>

            <Link
              to="/payment-history"
              className="card"
              style={{ padding: '1.25rem', textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: 'inherit', transition: 'all 0.2s ease' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ width: '38px', height: '38px', borderRadius: '8px', background: '#ecfdf5', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <CreditCard size={18} />
                </div>
                <div>
                  <div style={{ fontWeight: 700, color: 'var(--color-navy)', fontSize: '0.9rem' }}>Payment Receipts</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-ink-soft)' }}>Razorpay digital invoices</div>
                </div>
              </div>
              <ChevronRight size={16} style={{ color: 'var(--color-ink-muted)' }} />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
