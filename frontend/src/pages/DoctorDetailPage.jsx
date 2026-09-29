import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import Alert from '../components/Alert';
import {
  Tag, Sparkles, CheckCircle2, Lock, Gift, X, ChevronDown,
  ChevronUp, Clock, Calendar, Check, AlertCircle, MapPin,
  Navigation, Phone, Mail, ExternalLink, Building2
} from 'lucide-react';
import '../styles/DoctorDetailPage.css';
import { getDoctorAvatar } from '../utils/doctorAvatars';

const DoctorDetailPage = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [doctor, setDoctor] = useState(null);
  const [relatedDoctors, setRelatedDoctors] = useState([]);
  const [availableDates, setAvailableDates] = useState([]);
  const [selectedDate, setSelectedDate] = useState('');
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [slotsLoading, setSlotsLoading] = useState(false);

  // Booking Modal State
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [bookingFor, setBookingFor] = useState('Myself');
  const [patientName, setPatientName] = useState('');
  const [patientAge, setPatientAge] = useState('');
  const [patientGender, setPatientGender] = useState('');
  const [patientPhone, setPatientPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [bookingLoading, setBookingLoading] = useState(false);
  const [alertInfo, setAlertInfo] = useState({ type: '', message: '' });

  // Coupon States
  const [couponData, setCouponData] = useState(null);
  const [couponsLoading, setCouponsLoading] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [inputCouponCode, setInputCouponCode] = useState('');
  const [couponMessage, setCouponMessage] = useState(null); // { type: 'success' | 'error', text: '' }
  const [showAllCoupons, setShowAllCoupons] = useState(false);
  const [couponValidating, setCouponValidating] = useState(false);

  // Load Doctor Details & Available Dates
  useEffect(() => {
    const fetchDoctorData = async () => {
      setLoading(true);
      try {
        const [docRes, datesRes] = await Promise.all([
          api.get(`/doctors/${id}/`),
          api.get(`/doctors/${id}/available-dates/`),
        ]);
        setDoctor(docRes.data.doctor);
        setRelatedDoctors(docRes.data.related_doctors || []);
        setAvailableDates(datesRes.data || []);
        if (datesRes.data && datesRes.data.length > 0) {
          setSelectedDate(datesRes.data[0]);
        }
      } catch (err) {
        setAlertInfo({ type: 'error', message: 'Failed to load doctor details.' });
      } finally {
        setLoading(false);
      }
    };

    fetchDoctorData();
  }, [id]);

  // Fetch slots whenever selectedDate changes
  useEffect(() => {
    if (!selectedDate || !id) return;
    const fetchSlots = async () => {
      setSlotsLoading(true);
      try {
        const res = await api.get(`/doctors/${id}/slots/`, { params: { date: selectedDate } });
        setSlots(res.data || []);
      } catch (err) {
        console.error("Error fetching slots:", err);
      } finally {
        setSlotsLoading(false);
      }
    };

    fetchSlots();
  }, [id, selectedDate]);

  const openBookingModal = async (slot) => {
    if (!user) {
      navigate('/login', { state: { from: `/doctors/${id}` } });
      return;
    }
    setSelectedSlot(slot);
    setBookingFor('Myself');
    const defaultName = `${user?.first_name || ''} ${user?.last_name || ''}`.trim() || user?.username || '';
    setPatientName(defaultName);
    setPatientAge(user?.age || '');
    setPatientGender(user?.gender || '');
    setPatientPhone(user?.phone || '');
    setNotes('');
    setCouponMessage(null);
    setInputCouponCode('');
    setShowAllCoupons(false);
    setModalOpen(true);

    // Fetch coupons available for this user & doctor
    setCouponsLoading(true);
    try {
      const res = await api.get('/appointments/available-coupons/', { params: { doctor_id: id } });
      setCouponData(res.data);
      // Auto-suggest the best available coupon for 1-click ease
      if (res.data?.suggested_coupon) {
        setAppliedCoupon(res.data.suggested_coupon);
        setInputCouponCode(res.data.suggested_coupon.code);
        setCouponMessage({
          type: 'success',
          text: `🎉 Suggested coupon '${res.data.suggested_coupon.code}' applied! You save ₹${res.data.suggested_coupon.discount_for_doctor || ''}`
        });
      } else {
        setAppliedCoupon(null);
      }
    } catch (err) {
      console.error("Could not fetch coupons:", err);
    } finally {
      setCouponsLoading(false);
    }
  };

  const handleBookingForChange = (relation) => {
    setBookingFor(relation);
    if (relation === 'Myself') {
      const defaultName = `${user?.first_name || ''} ${user?.last_name || ''}`.trim() || user?.username || '';
      setPatientName(defaultName);
      setPatientPhone(user?.phone || '');
      setPatientGender(user?.gender || '');
      setPatientAge(user?.age || '');
    } else {
      setPatientName('');
      setPatientAge('');
      if (relation === 'Mother' || relation === 'Daughter') {
        setPatientGender('Female');
      } else if (relation === 'Father' || relation === 'Son') {
        setPatientGender('Male');
      } else {
        setPatientGender('');
      }
    }
  };

  const closeBookingModal = () => {
    setModalOpen(false);
    setSelectedSlot(null);
    setAppliedCoupon(null);
    setCouponMessage(null);
  };

  const handleApplyCoupon = async (codeOverride) => {
    const code = (codeOverride || inputCouponCode).trim().toUpperCase();
    if (!code) {
      setCouponMessage({ type: 'error', text: 'Please enter a coupon code.' });
      return;
    }
    setCouponValidating(true);
    setCouponMessage(null);

    try {
      const res = await api.post('/appointments/validate-coupon/', {
        code,
        doctor_id: id
      });
      setAppliedCoupon({
        ...res.data.coupon,
        discount_for_doctor: res.data.discount_amount,
        final_fee: res.data.final_fee
      });
      setInputCouponCode(code);
      setCouponMessage({ type: 'success', text: res.data.message });
      toast.success(`🎉 ${res.data.message}`);
    } catch (err) {
      const errMsg = err.response?.data?.error || 'Invalid or inactive coupon code.';
      setCouponMessage({ type: 'error', text: errMsg });
      setAppliedCoupon(null);
      toast.error(errMsg);
    } finally {
      setCouponValidating(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setInputCouponCode('');
    setCouponMessage(null);
    toast.info('Coupon removed.');
  };

  const handleBookingSubmit = async (e) => {
    e.preventDefault();
    if (!selectedSlot) return;

    if (!patientName.trim()) {
      setCouponMessage({ type: 'error', text: 'Please enter the patient’s full name.' });
      return;
    }

    setBookingLoading(true);
    setAlertInfo({ type: '', message: '' });
    try {
      const res = await api.post('/appointments/book/', {
        slot_id: selectedSlot.id,
        patient_name: patientName.trim(),
        patient_relation: bookingFor,
        patient_age: patientAge ? Number(patientAge) : null,
        patient_gender: patientGender,
        patient_phone: patientPhone.trim(),
        notes: notes.trim(),
        coupon_code: appliedCoupon ? appliedCoupon.code : '',
      });
      const discountNote = appliedCoupon ? ` (Discount applied: -₹${appliedCoupon.discount_for_doctor || ''} using ${appliedCoupon.code})` : '';
      const forWhom = bookingFor === 'Myself' ? 'your' : `${bookingFor} (${patientName.trim()})'s`;
      navigate('/my-appointments', {
        state: { alert: { type: 'success', message: `Appointment confirmed for ${forWhom}! Total Fee: ₹${res.data.fee_charged}${discountNote}` } }
      });
    } catch (err) {
      const errMsg = err.response?.data?.error || err.response?.data?.detail || 'Booking failed. Please try again.';
      setAlertInfo({ type: 'error', message: errMsg });
      closeBookingModal();
    } finally {
      setBookingLoading(false);
    }
  };


  if (loading) {
    return (
      <div className="container" style={{ paddingTop: '2rem', paddingBottom: '3.5rem' }}>
        <div className="doctor-detail-grid">
          <div className="card skeleton-card-wrapper" style={{ padding: '2.25rem', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div className="skeleton skeleton-circle" style={{ width: '120px', height: '120px', marginBottom: '1.25rem' }} />
            <div className="skeleton skeleton-text" style={{ width: '120px', height: '16px', marginBottom: '8px' }} />
            <div className="skeleton skeleton-text" style={{ width: '200px', height: '24px', marginBottom: '10px' }} />
            <div className="skeleton skeleton-text" style={{ width: '160px', height: '14px', marginBottom: '1.5rem' }} />
            <div className="skeleton" style={{ width: '100%', height: '70px', borderRadius: '12px' }} />
          </div>
          <div className="card skeleton-card-wrapper" style={{ padding: '2rem' }}>
            <div className="skeleton skeleton-text" style={{ width: '180px', height: '20px', marginBottom: '1rem' }} />
            <div style={{ display: 'flex', gap: '8px', marginBottom: '1.5rem' }}>
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="skeleton" style={{ width: '70px', height: '60px', borderRadius: '10px' }} />
              ))}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="skeleton" style={{ height: '48px', borderRadius: '8px' }} />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!doctor) {
    return (
      <div className="container" style={{ padding: '3rem 0', textAlign: 'center' }}>
        <h3>Doctor not found</h3>
        <Link to="/" className="btn btn-primary" style={{ marginTop: '1rem' }}>Back to Home</Link>
      </div>
    );
  }

  // Format date helper
  const formatDateObj = (dateStr) => {
    const d = new Date(dateStr);
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return {
      dayName: days[d.getDay()],
      dayNum: d.getDate(),
      month: months[d.getMonth()],
      formatted: d.toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long' }),
    };
  };

  return (
    <div className="container" style={{ paddingTop: '2rem', paddingBottom: '3.5rem' }}>
      {alertInfo.message && (
        <div style={{ marginBottom: '1.5rem' }}>
          <Alert type={alertInfo.type} message={alertInfo.message} onClose={() => setAlertInfo({ type: '', message: '' })} />
        </div>
      )}

      {/* Two Column Grid */}
      <div className="doctor-detail-grid">
        {/* Left Column: Doctor Profile Card */}
        <div className="card" style={{ padding: '2.25rem', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
          <div className="doctor-profile-avatar-container">
            <img
              src={getDoctorAvatar(doctor)}
              className="doctor-profile-avatar"
              alt={`Dr. ${doctor.name}`}
              loading="lazy"
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = getDoctorAvatar(doctor, doctor.name);
              }}
            />
            <span className="doctor-profile-avatar-badge" title="Verified Professional">&#10003;</span>
          </div>

          <span className="eyebrow">{doctor.specialization}</span>
          <h2 style={{ fontSize: '1.5rem', color: 'var(--color-navy)', marginTop: '0.25rem', marginBottom: '0.5rem', fontWeight: 800 }}>
            Dr. {doctor.name}
          </h2>

          <p style={{ color: 'var(--color-ink-soft)', fontSize: '0.9rem', marginBottom: '0.5rem', lineHeight: 1.4 }}>
            {doctor.qualification || 'MBBS, MD'} &middot; <strong>{doctor.experience_years} Years Experience</strong>
          </p>

          {doctor.hospital_name && (
            <p style={{ fontSize: '0.82rem', color: 'var(--color-primary)', fontWeight: 600, marginBottom: '1.25rem' }}>
              🏥 {doctor.hospital_name}
            </p>
          )}

          <div style={{ width: '100%', borderTop: '1px solid var(--color-line)', borderBottom: '1px solid var(--color-line)', padding: '1.25rem 0', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-around', background: 'var(--color-bg-alt)', borderRadius: 'var(--radius)' }}>
            <div>
              <span style={{ display: 'block', fontSize: '0.72rem', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', color: 'var(--color-ink-soft)' }}>
                Consultation Fee
              </span>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.2rem' }}>
                <strong style={{ fontSize: '1.3rem', color: 'var(--color-primary)', fontFamily: 'var(--font-mono)', fontWeight: 800 }}>
                  ₹{doctor.calculated_fee || doctor.fee}
                </strong>
                {doctor.pricing_label && (
                  <span style={{
                    fontSize: '0.68rem',
                    fontWeight: 700,
                    padding: '0.1rem 0.45rem',
                    borderRadius: '4px',
                    background: doctor.pricing_type === 'surge' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                    color: doctor.pricing_type === 'surge' ? '#dc2626' : '#059669',
                  }}>
                    {doctor.pricing_label}
                  </span>
                )}
              </div>
            </div>
            <div style={{ borderLeft: '1px solid var(--color-line)' }}></div>
            <div>
              <span style={{ display: 'block', fontSize: '0.72rem', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', color: 'var(--color-ink-soft)' }}>
                Rating
              </span>
              <strong style={{ fontSize: '1.25rem', color: 'var(--color-navy)' }}>
                {doctor.rating || '4.5'} <span style={{ color: 'var(--color-warning)', fontSize: '1rem' }}>★</span>
              </strong>
            </div>
          </div>

          {/* Dynamic Weekly recurring hours */}
          <div style={{ width: '100%', textAlign: 'left' }}>
            <h5 style={{ marginBottom: '0.5rem', color: 'var(--color-navy)', fontWeight: 700, fontSize: '0.88rem' }}>
              Weekly Schedule Blocks
            </h5>
            <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
              {(doctor.available_days_display || (doctor.available_days ? doctor.available_days.split(',').map(d => d.trim().toUpperCase()) : ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'])).map((day) => (
                <span key={day} style={{ fontSize: '0.72rem', fontWeight: 700, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', padding: '0.25rem 0.55rem', background: 'rgba(2, 132, 199, 0.1)', color: '#0284c7', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(2, 132, 199, 0.2)' }}>
                  {day}
                </span>
              ))}
            </div>
            {doctor.bio && (
              <p style={{ fontSize: '0.84rem', color: 'var(--color-ink-soft)', lineHeight: 1.5, marginTop: '1rem', borderTop: '1px solid var(--color-line)', paddingTop: '0.75rem' }}>
                {doctor.bio}
              </p>
            )}
          </div>

          {/* Doctor & Clinic Location & Contact Details */}
          <div style={{ width: '100%', textAlign: 'left', marginTop: '1.25rem', paddingTop: '1.25rem', borderTop: '1px solid var(--color-line)' }}>
            <h5 style={{ marginBottom: '0.75rem', color: 'var(--color-navy)', fontWeight: 700, fontSize: '0.88rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <MapPin size={16} style={{ color: '#0284c7' }} /> Doctor Contact & Clinic Info
            </h5>

            {/* Hospital & Chamber Address Card */}
            <div style={{ background: 'var(--color-bg-alt)', padding: '0.85rem', borderRadius: 'var(--radius)', marginBottom: '0.85rem', border: '1px solid var(--color-line)' }}>
              <div style={{ fontWeight: 700, color: 'var(--color-navy)', fontSize: '0.86rem', display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.35rem' }}>
                <Building2 size={14} style={{ color: 'var(--color-primary)' }} />
                {doctor.hospital_details?.name || doctor.hospital_name || 'CareConnect Medical Hospital'}
              </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--color-ink-soft)', margin: '0 0 0.5rem', lineHeight: 1.4 }}>
                📍 {doctor.clinic_address || doctor.hospital_details?.address || 'Main Campus Healthcare Pavilion'}
                {doctor.hospital_details?.city ? `, ${doctor.hospital_details.city}` : ''}
              </p>

              {/* Direct Phone & Email Display */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', fontSize: '0.8rem', color: 'var(--color-navy)', borderTop: '1px dashed var(--color-line)', paddingTop: '0.45rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Phone size={13} style={{ color: '#059669', flexShrink: 0 }} />
                  <span><strong>Phone:</strong> {doctor.contact_number || doctor.hospital_details?.contact_phone || '+91 80 4000 1234'}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Mail size={13} style={{ color: '#2563eb', flexShrink: 0 }} />
                  <span style={{ wordBreak: 'break-all' }}><strong>Email:</strong> {doctor.contact_email || doctor.hospital_details?.contact_email || 'doctor.contact@careconnect.com'}</span>
                </div>
              </div>
            </div>

            {/* Google Maps Button */}
            <a
              href={doctor.maps_url || doctor.hospital_details?.maps_url || doctor.google_maps_url || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent((doctor.hospital_name || doctor.hospital_details?.name || '') + ' ' + (doctor.clinic_address || doctor.hospital_details?.address || ''))}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-primary btn-sm"
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.45rem',
                marginBottom: '0.65rem',
                textDecoration: 'none',
                background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                color: '#fff',
                fontWeight: 600,
                fontSize: '0.82rem',
                padding: '0.5rem 0.75rem',
                borderRadius: '8px',
                boxShadow: '0 2px 6px rgba(2,132,199,0.25)',
              }}
            >
              <Navigation size={14} /> Open in Google Maps
            </a>

            {/* Quick Action Dial / Email buttons */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem' }}>
              <a
                href={`tel:${doctor.contact_number || doctor.hospital_details?.contact_phone || '+918040001234'}`}
                className="btn btn-outline btn-sm"
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.3rem', fontSize: '0.76rem', textDecoration: 'none', padding: '0.35rem 0.5rem', background: '#fff' }}
                title="Call Doctor / Clinic"
              >
                <Phone size={12} style={{ color: '#059669' }} /> Call Now
              </a>
              <a
                href={`mailto:${doctor.contact_email || doctor.hospital_details?.contact_email || 'contact@careconnect.com'}`}
                className="btn btn-outline btn-sm"
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.3rem', fontSize: '0.76rem', textDecoration: 'none', padding: '0.35rem 0.5rem', background: '#fff' }}
                title="Email Clinic"
              >
                <Mail size={12} style={{ color: '#2563eb' }} /> Email
              </a>
            </div>
          </div>
        </div>

        {/* Right Column: Interactive Scheduling Panel */}
        <div className="card" style={{ padding: '2.25rem' }}>
          <span className="eyebrow" style={{ color: 'var(--color-accent)' }}>Appointment Booking</span>
          <h3 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--color-navy)', marginBottom: '1.5rem' }}>
            Select Date & Time Slot
          </h3>

          {!user ? (
            <div style={{ textAlign: 'center', padding: '2.5rem 1.5rem', background: 'var(--color-surface-alt)', borderRadius: 'var(--radius)', border: '1.5px dashed var(--color-line-strong)' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem', opacity: 0.8 }}>🔒</div>
              <h5 style={{ marginBottom: '0.5rem', color: 'var(--color-navy)' }}>Authentication Required</h5>
              <p style={{ fontSize: '0.88rem', color: 'var(--color-ink-soft)', marginBottom: '1.5rem', maxWidth: '320px', marginLeft: 'auto', marginRight: 'auto' }}>
                Please sign in or create an account to view open slots and confirm a booking.
              </p>
              <Link to="/login" state={{ from: `/doctors/${id}` }} className="btn btn-primary" style={{ padding: '0.55rem 1.75rem' }}>
                Log In to Book
              </Link>
            </div>
          ) : availableDates.length > 0 ? (
            <>
              {/* 1. Date Selector Strip */}
              <h5 style={{ marginBottom: '0.75rem', fontSize: '0.88rem', fontWeight: 700, color: 'var(--color-navy)' }}>
                1. Choose Date
              </h5>
              <div className="date-strip">
                {availableDates.map((dateStr) => {
                  const info = formatDateObj(dateStr);
                  const isActive = dateStr === selectedDate;
                  return (
                    <button
                      key={dateStr}
                      type="button"
                      onClick={() => setSelectedDate(dateStr)}
                      className={`date-chip ${isActive ? 'active' : ''}`}
                      data-date={dateStr}
                    >
                      <span className="day-name">{info.dayName}</span>
                      <span className="day-num">{info.dayNum}</span>
                      <span className="month">{info.month}</span>
                    </button>
                  );
                })}
              </div>

              {/* 2. Slot Selector Grid */}
              <h5 style={{ marginBottom: '0.75rem', fontSize: '0.88rem', fontWeight: 700, color: 'var(--color-navy)' }}>
                2. Select Time <span style={{ fontWeight: 400, color: 'var(--color-ink-soft)', fontSize: '0.8rem' }}>({doctor.consultation_duration || 30} mins per session)</span>
              </h5>

              {slotsLoading ? (
                <div style={{ textAlign: 'center', padding: '2rem 0' }}>
                  <div className="spinner"></div>
                </div>
              ) : (
                <div className="slot-grid">
                  {slots.length > 0 ? (
                    slots.map((slot) => {
                      const maxCap = slot.max_capacity || 5;
                      const bookedCount = slot.booked || 0;
                      const isFull = slot.is_full || bookedCount >= maxCap;
                      return (
                        <button
                          key={slot.id}
                          type="button"
                          onClick={() => openBookingModal(slot)}
                          className={`slot-btn ${isFull ? 'slot-full' : ''}`}
                          disabled={isFull}
                          style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '2px',
                            padding: '8px 10px',
                            borderRadius: '8px',
                            border: isFull ? '1.5px solid #fca5a5' : '1.5px solid #bbf7d0',
                            background: isFull ? '#fef2f2' : '#f0fdf4',
                            cursor: isFull ? 'not-allowed' : 'pointer',
                            opacity: isFull ? 0.75 : 1,
                            position: 'relative'
                          }}
                          title={isFull ? 'This slot is full (5/5 patients booked). Please choose another slot.' : `Available: ${bookedCount}/${maxCap} booked`}
                        >
                          <strong style={{ fontSize: '0.92rem', color: isFull ? '#991b1b' : '#166534' }}>
                            {slot.start_time} {slot.end_time ? `- ${slot.end_time}` : ''}
                          </strong>
                          <span
                            className="slot-label"
                            style={{
                              fontSize: '0.7rem',
                              fontWeight: 700,
                              color: isFull ? '#dc2626' : '#15803d',
                              whiteSpace: 'nowrap'
                            }}
                          >
                            {isFull ? `🔴 Full (${bookedCount}/${maxCap}) - Choose another` : `🟢 Available (${bookedCount}/${maxCap})`}
                          </span>
                        </button>
                      );
                    })
                  ) : (
                    <div style={{ gridColumn: '1 / -1', padding: '2rem 1rem', textAlign: 'center', color: 'var(--color-ink-soft)', background: 'var(--color-bg-alt)', borderRadius: 'var(--radius)', fontSize: '0.9rem' }}>
                      No appointment slots available on {formatDateObj(selectedDate).formatted}.
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            <div style={{ padding: '2.5rem 1.5rem', textAlign: 'center', color: 'var(--color-ink-soft)', background: 'var(--color-bg-alt)', borderRadius: 'var(--radius)', border: '1.5px dashed var(--color-line)' }}>
              <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📅</div>
              <h5>No Slots Available</h5>
              <p style={{ fontSize: '0.85rem', maxWidth: '280px', margin: '0.5rem auto 0' }}>
                This doctor has no active slots published. Please check back later.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Related Doctors Section */}
      {relatedDoctors.length > 0 && (
        <div style={{ marginTop: '3.5rem' }}>
          <span className="eyebrow">Other Specialists</span>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-navy)', marginBottom: '1.25rem' }}>
            Similar Doctors in {doctor.specialization}
          </h3>
          <div className="grid">
            {relatedDoctors.map((other) => (
              <Link
                key={other.id}
                to={`/doctors/${other.id}`}
                className="card card-hoverable"
                style={{ display: 'flex', gap: '1.25rem', padding: '1.25rem', alignItems: 'center', textDecoration: 'none', color: 'inherit' }}
              >
                <img
                  src={getDoctorAvatar(other)}
                  style={{ width: '54px', height: '54px', borderRadius: '50%', objectFit: 'cover', border: '2.5px solid var(--color-primary-ghost)', flexShrink: 0, background: '#f8fafc' }}
                  alt={`Dr. ${other.name}`}
                  loading="lazy"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = getDoctorAvatar(other, other.name);
                  }}
                />
                <div>
                  <p style={{ margin: '0 0 0.15rem', fontWeight: 700, color: 'var(--color-navy)', fontSize: '0.95rem' }}>
                    Dr. {other.name}
                  </p>
                  <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--color-ink-soft)' }}>
                    ₹{other.fee} &middot; <strong>{other.experience_years} yrs Exp</strong>
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Booking Confirmation Modal */}
      {modalOpen && selectedSlot && (
        <div
          className="booking-modal-overlay"
          onClick={(e) => {
            if (e.target.classList.contains('booking-modal-overlay')) {
              closeBookingModal();
            }
          }}
        >
          <div className="booking-modal" style={{ maxWidth: '540px' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'var(--color-primary-ghost)', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Calendar size={18} />
                </div>
                <h3 style={{ margin: 0 }}>Confirm Your Appointment</h3>
              </div>
              <button className="modal-close" type="button" onClick={closeBookingModal} title="Close">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleBookingSubmit}>
              <div className="modal-body" style={{ maxHeight: '72vh', overflowY: 'auto' }}>
                
                {/* 1. Appointment Overview */}
                <div style={{ background: 'var(--color-surface-alt)', padding: '0.9rem 1.1rem', borderRadius: 'var(--radius)', marginBottom: '1.25rem', border: '1px solid var(--color-line)' }}>
                  <div className="modal-detail-row" style={{ marginBottom: '0.35rem' }}>
                    <span className="modal-detail-label">Consultant:</span>
                    <span className="modal-detail-value" style={{ fontWeight: 700 }}>Dr. {doctor.name} ({doctor.specialization})</span>
                  </div>
                  <div className="modal-detail-row" style={{ marginBottom: '0.35rem' }}>
                    <span className="modal-detail-label">Date:</span>
                    <span className="modal-detail-value">{selectedDate}</span>
                  </div>
                  <div className="modal-detail-row">
                    <span className="modal-detail-label">Time Slot:</span>
                    <span className="modal-detail-value" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                      <Clock size={13} style={{ color: 'var(--color-primary)' }} />
                      {selectedSlot.start_time} - {selectedSlot.end_time || ''}
                    </span>
                  </div>
                </div>

                {/* 2. Patient & Family Member Selection */}
                <div style={{ marginBottom: '1.25rem', padding: '1rem', background: 'var(--color-bg-alt)', borderRadius: 'var(--radius)', border: '1px solid var(--color-line)' }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-navy)', marginBottom: '0.5rem' }}>
                    Who is this consultation for?
                  </label>
                  
                  {/* Quick Pills */}
                  <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '0.85rem' }}>
                    {['Myself', 'Mother', 'Father', 'Daughter', 'Son', 'Spouse', 'Other'].map((rel) => (
                      <button
                        key={rel}
                        type="button"
                        onClick={() => handleBookingForChange(rel)}
                        style={{
                          padding: '0.3rem 0.75rem',
                          borderRadius: '20px',
                          fontSize: '0.78rem',
                          fontWeight: 600,
                          border: '1px solid',
                          borderColor: bookingFor === rel ? 'var(--color-primary)' : 'var(--color-line)',
                          background: bookingFor === rel ? 'var(--color-primary)' : 'var(--color-surface-alt)',
                          color: bookingFor === rel ? '#ffffff' : 'var(--color-ink)',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        {rel === 'Myself' && '👤 '}
                        {rel === 'Mother' && '👩 '}
                        {rel === 'Father' && '👨 '}
                        {rel === 'Daughter' && '👧 '}
                        {rel === 'Son' && '👦 '}
                        {rel === 'Spouse' && '💍 '}
                        {rel === 'Other' && '👥 '}
                        {rel}
                      </button>
                    ))}
                  </div>

                  {/* Patient Name Input */}
                  <div style={{ marginBottom: '0.65rem' }}>
                    <label htmlFor="patient-name-input" style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-ink)', marginBottom: '0.25rem' }}>
                      Patient Full Name <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <input
                      id="patient-name-input"
                      type="text"
                      required
                      value={patientName}
                      onChange={(e) => setPatientName(e.target.value)}
                      placeholder={bookingFor === 'Myself' ? 'Your full name' : `Enter ${bookingFor}'s full name`}
                      style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1px solid var(--color-line)', fontSize: '0.85rem' }}
                    />
                  </div>

                  {/* Age & Gender & Contact Grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1.2fr', gap: '0.5rem' }}>
                    <div>
                      <label htmlFor="patient-age-input" style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-ink)', marginBottom: '0.2rem' }}>
                        Age
                      </label>
                      <input
                        id="patient-age-input"
                        type="number"
                        min="1"
                        max="120"
                        value={patientAge}
                        onChange={(e) => setPatientAge(e.target.value)}
                        placeholder="Age"
                        style={{ width: '100%', padding: '0.45rem 0.6rem', borderRadius: '6px', border: '1px solid var(--color-line)', fontSize: '0.82rem' }}
                      />
                    </div>
                    <div>
                      <label htmlFor="patient-gender-select" style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-ink)', marginBottom: '0.2rem' }}>
                        Gender
                      </label>
                      <select
                        id="patient-gender-select"
                        value={patientGender}
                        onChange={(e) => setPatientGender(e.target.value)}
                        style={{ width: '100%', padding: '0.45rem 0.6rem', borderRadius: '6px', border: '1px solid var(--color-line)', fontSize: '0.82rem', background: '#fff' }}
                      >
                        <option value="">Select</option>
                        <option value="Female">Female</option>
                        <option value="Male">Male</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                    <div>
                      <label htmlFor="patient-phone-input" style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-ink)', marginBottom: '0.2rem' }}>
                        Contact Phone
                      </label>
                      <input
                        id="patient-phone-input"
                        type="tel"
                        value={patientPhone}
                        onChange={(e) => setPatientPhone(e.target.value)}
                        placeholder="Phone No."
                        style={{ width: '100%', padding: '0.45rem 0.6rem', borderRadius: '6px', border: '1px solid var(--color-line)', fontSize: '0.82rem' }}
                      />
                    </div>
                  </div>
                </div>

                {/* 3. 🎉 PROACTIVE COUPON & REWARDS SYSTEM */}
                <div className="coupon-booking-section" style={{ marginBottom: '1.25rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-navy)', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                      <Tag size={15} style={{ color: 'var(--color-primary)' }} />
                      Discounts & Loyalty Coupons
                    </span>
                    {couponData?.booking_stats && (
                      <span style={{ fontSize: '0.75rem', color: 'var(--color-ink-soft)', background: 'var(--color-surface-alt)', padding: '0.2rem 0.5rem', borderRadius: '12px', border: '1px solid var(--color-line)' }}>
                        {couponData.booking_stats.booking_count} Bookings completed
                      </span>
                    )}
                  </div>

                  {/* Proactive Suggestion Banner */}
                  {couponData?.suggested_coupon && !appliedCoupon && (
                    <div className="coupon-suggestion-banner" style={{
                      background: 'linear-gradient(135deg, rgba(13, 148, 136, 0.08) 0%, rgba(20, 184, 166, 0.15) 100%)',
                      border: '1.5px dashed var(--color-primary)',
                      borderRadius: 'var(--radius)',
                      padding: '0.85rem 1rem',
                      marginBottom: '0.75rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.5rem',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px',
                          color: 'var(--color-primary-dark)',
                          background: 'rgba(13, 148, 136, 0.15)',
                          padding: '0.15rem 0.55rem',
                          borderRadius: '10px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.3rem'
                        }}>
                          <Sparkles size={12} />
                          {couponData.badge_text || 'Recommended Offer'}
                        </span>
                        <span style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--color-primary)' }}>
                          {couponData.suggested_coupon.discount_type === 'percentage' ? `${couponData.suggested_coupon.discount_value}% OFF` : `₹${couponData.suggested_coupon.discount_value} OFF`}
                        </span>
                      </div>

                      <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--color-navy)', lineHeight: 1.4 }}>
                        {couponData.suggestion_message}
                      </p>

                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.2rem' }}>
                        <code style={{
                          fontSize: '0.88rem',
                          fontWeight: 800,
                          color: 'var(--color-primary-dark)',
                          background: 'var(--color-bg-alt)',
                          padding: '0.25rem 0.6rem',
                          borderRadius: '6px',
                          border: '1px solid rgba(13, 148, 136, 0.25)',
                          letterSpacing: '0.8px'
                        }}>
                          {couponData.suggested_coupon.code}
                        </code>
                        <button
                          type="button"
                          className="btn btn-sm btn-primary"
                          onClick={() => handleApplyCoupon(couponData.suggested_coupon.code)}
                          style={{ padding: '0.35rem 0.85rem', fontSize: '0.78rem', borderRadius: '6px' }}
                        >
                          Apply Coupon
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Applied Coupon Card */}
                  {appliedCoupon && (
                    <div style={{
                      background: 'rgba(16, 185, 129, 0.08)',
                      border: '1px solid #10b981',
                      borderRadius: 'var(--radius)',
                      padding: '0.75rem 1rem',
                      marginBottom: '0.75rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                        <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#10b981', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Check size={16} />
                        </div>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <strong style={{ fontSize: '0.85rem', color: '#065f46' }}>{appliedCoupon.code}</strong>
                            <span style={{ fontSize: '0.75rem', color: '#047857', fontWeight: 600 }}>Applied</span>
                          </div>
                          <span style={{ fontSize: '0.75rem', color: '#065f46' }}>
                            {appliedCoupon.title} (Saving ₹{appliedCoupon.discount_for_doctor || ''})
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={handleRemoveCoupon}
                        style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.2rem', fontSize: '0.75rem', fontWeight: 600 }}
                      >
                        <X size={14} /> Remove
                      </button>
                    </div>
                  )}

                  {/* Manual Coupon Input Box */}
                  <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <div style={{ position: 'relative', flex: 1 }}>
                      <input
                        type="text"
                        value={inputCouponCode}
                        onChange={(e) => setInputCouponCode(e.target.value.toUpperCase())}
                        placeholder="Enter Promo or Coupon Code"
                        style={{
                          width: '100%',
                          padding: '0.55rem 0.75rem',
                          borderRadius: '8px',
                          border: '1px solid var(--color-line)',
                          fontSize: '0.82rem',
                          fontFamily: 'inherit',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px'
                        }}
                      />
                    </div>
                    <button
                      type="button"
                      className="btn btn-outline"
                      onClick={() => handleApplyCoupon()}
                      disabled={couponValidating || !inputCouponCode.trim()}
                      style={{ padding: '0.55rem 1rem', fontSize: '0.82rem', whiteSpace: 'nowrap' }}
                    >
                      {couponValidating ? 'Checking...' : 'Apply'}
                    </button>
                  </div>

                  {/* Feedback Message */}
                  {couponMessage && (
                    <div style={{
                      fontSize: '0.78rem',
                      color: couponMessage.type === 'success' ? '#047857' : '#b91c1c',
                      background: couponMessage.type === 'success' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                      padding: '0.4rem 0.75rem',
                      borderRadius: '6px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      marginBottom: '0.5rem'
                    }}>
                      {couponMessage.type === 'success' ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
                      <span>{couponMessage.text}</span>
                    </div>
                  )}

                  {/* Toggle All Coupons & Loyalty Milestones */}
                  {((couponData?.eligible_coupons && couponData.eligible_coupons.length > 0) || (couponData?.locked_coupons && couponData.locked_coupons.length > 0)) && (
                    <div>
                      <button
                        type="button"
                        onClick={() => setShowAllCoupons(!showAllCoupons)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--color-primary)',
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.3rem',
                          padding: '0.2rem 0'
                        }}
                      >
                        <Gift size={13} />
                        {showAllCoupons ? 'Hide Available Coupons' : `View All Coupons & Loyalty Milestones (${(couponData?.eligible_coupons?.length || 0) + (couponData?.locked_coupons?.length || 0)})`}
                        {showAllCoupons ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                      </button>

                      {showAllCoupons && (
                        <div style={{ marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.4rem', maxHeight: '180px', overflowY: 'auto', paddingRight: '0.25rem' }}>
                          {/* Next milestone reminder */}
                          {couponData?.booking_stats?.bookings_until_next > 0 && (
                            <div style={{ fontSize: '0.75rem', color: 'var(--color-primary-dark)', background: 'var(--color-primary-ghost)', padding: '0.4rem 0.6rem', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                              <Sparkles size={12} />
                              <span>Complete <strong>{couponData.booking_stats.bookings_until_next}</strong> more booking{couponData.booking_stats.bookings_until_next > 1 ? 's' : ''} to unlock the {couponData.booking_stats.next_milestone}-bookings loyalty coupon!</span>
                            </div>
                          )}

                          {/* Eligible coupons */}
                          {couponData?.eligible_coupons?.map((c) => (
                            <div
                              key={c.code}
                              onClick={() => handleApplyCoupon(c.code)}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: '0.5rem 0.75rem',
                                borderRadius: '6px',
                                border: appliedCoupon?.code === c.code ? '1.5px solid var(--color-primary)' : '1px solid var(--color-line)',
                                background: appliedCoupon?.code === c.code ? 'var(--color-primary-ghost)' : 'var(--color-surface-alt)',
                                cursor: 'pointer',
                                transition: 'all 0.15s ease'
                              }}
                            >
                              <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                  <span style={{ fontWeight: 800, fontSize: '0.8rem', color: 'var(--color-navy)' }}>{c.code}</span>
                                  <span style={{ fontSize: '0.72rem', background: 'rgba(13, 148, 136, 0.12)', color: 'var(--color-primary)', padding: '0.1rem 0.4rem', borderRadius: '4px', fontWeight: 600 }}>
                                    {c.discount_type === 'percentage' ? `${c.discount_value}% OFF` : `₹${c.discount_value} OFF`}
                                  </span>
                                </div>
                                <span style={{ fontSize: '0.72rem', color: 'var(--color-ink-soft)', display: 'block' }}>{c.title}</span>
                              </div>
                              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: appliedCoupon?.code === c.code ? 'var(--color-primary)' : 'var(--color-ink-muted)' }}>
                                {appliedCoupon?.code === c.code ? '✓ Active' : 'Tap to Apply'}
                              </span>
                            </div>
                          ))}

                          {/* Locked milestone coupons */}
                          {couponData?.locked_coupons?.map((lc) => (
                            <div
                              key={lc.code}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: '0.45rem 0.75rem',
                                borderRadius: '6px',
                                border: '1px dashed var(--color-line)',
                                background: 'rgba(0,0,0,0.02)',
                                opacity: 0.7,
                              }}
                            >
                              <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                  <Lock size={12} style={{ color: 'var(--color-ink-muted)' }} />
                                  <span style={{ fontWeight: 700, fontSize: '0.78rem', color: 'var(--color-ink-soft)' }}>{lc.code}</span>
                                  <span style={{ fontSize: '0.7rem', color: 'var(--color-ink-muted)' }}>
                                    ({lc.discount_type === 'percentage' ? `${lc.discount_value}% OFF` : `₹${lc.discount_value}`})
                                  </span>
                                </div>
                                <span style={{ fontSize: '0.7rem', color: 'var(--color-ink-muted)', display: 'block' }}>{lc.lock_reason}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* 3. Price & Fee Breakdown */}
                <div style={{ background: 'var(--color-surface-alt)', padding: '1rem', borderRadius: 'var(--radius)', marginBottom: '1.25rem', border: '1px solid var(--color-line)' }}>
                  <div className="modal-detail-row" style={{ marginBottom: '0.4rem' }}>
                    <span className="modal-detail-label" style={{ color: 'var(--color-ink-soft)', fontSize: '0.85rem' }}>
                      Consultation Fee:
                      {doctor.pricing_label && (
                        <span style={{ marginLeft: '0.4rem', fontSize: '0.72rem', color: doctor.pricing_type === 'surge' ? '#dc2626' : '#059669', fontWeight: 700 }}>
                          ({doctor.pricing_label})
                        </span>
                      )}
                    </span>
                    <span className="modal-detail-value" style={{ fontWeight: 700, fontSize: '0.95rem' }}>
                      ₹{doctor.calculated_fee || doctor.fee}
                    </span>
                  </div>

                  {appliedCoupon && (
                    <div className="modal-detail-row" style={{ marginBottom: '0.4rem' }}>
                      <span className="modal-detail-label" style={{ color: '#047857', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                        <Tag size={13} />
                        Coupon Discount ({appliedCoupon.code}):
                      </span>
                      <span className="modal-detail-value" style={{ fontWeight: 700, color: '#047857', fontSize: '0.9rem' }}>
                        -₹{appliedCoupon.discount_for_doctor || (appliedCoupon.discount_type === 'percentage' ? ((Number(doctor.calculated_fee || doctor.fee) * Number(appliedCoupon.discount_value)) / 100).toFixed(0) : appliedCoupon.discount_value)}
                      </span>
                    </div>
                  )}

                  <div className="modal-detail-row" style={{ borderTop: '1.5px solid var(--color-line)', marginTop: '0.5rem', paddingTop: '0.6rem' }}>
                    <span className="modal-detail-label" style={{ fontWeight: 800, color: 'var(--color-navy)', fontSize: '0.95rem' }}>
                      Total Amount Payable:
                    </span>
                    <span className="modal-detail-value" style={{ fontWeight: 800, color: 'var(--color-primary)', fontSize: '1.2rem' }}>
                      ₹{appliedCoupon?.final_fee || (appliedCoupon ? Math.max(0, Number(doctor.calculated_fee || doctor.fee) - Number(appliedCoupon.discount_for_doctor || 0)) : (doctor.calculated_fee || doctor.fee))}
                    </span>
                  </div>
                </div>

                {/* 4. Reason / Patient Notes */}
                <div style={{ marginBottom: '1rem' }}>
                  <label htmlFor="notes" style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-navy)', marginBottom: '0.25rem' }}>
                    Reason for Visit / Patient Notes (Optional)
                  </label>
                  <textarea
                    id="notes"
                    rows="2"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Briefly explain symptoms, current conditions, or previous records..."
                    style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: '8px', border: '1px solid var(--color-line)', fontFamily: 'inherit', fontSize: '0.85rem' }}
                  ></textarea>
                </div>

                <div style={{ background: 'var(--color-primary-ghost)', color: 'var(--color-primary-dark)', borderRadius: 'var(--radius-sm)', padding: '0.75rem', fontSize: '0.78rem', lineHeight: 1.45, display: 'flex', gap: '0.5rem', alignItems: 'start', border: '1px solid rgba(13, 148, 136, 0.15)' }}>
                  <span style={{ fontSize: '1.05rem', lineHeight: 1 }}>💡</span>
                  <span>Your slot will be reserved in <strong>Pending</strong> status. You can pay securely with Razorpay inside your appointments dashboard to finalize.</span>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1rem', padding: '0 1.5rem 1.25rem' }}>
                <button className="btn btn-outline" type="button" onClick={closeBookingModal}>
                  Cancel
                </button>
                <button className="btn btn-primary" type="submit" disabled={bookingLoading}>
                  {bookingLoading ? 'Booking...' : (appliedCoupon ? `Confirm & Book (₹${appliedCoupon.final_fee || doctor.fee})` : 'Confirm & Book')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default DoctorDetailPage;
