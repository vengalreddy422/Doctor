import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link, useLocation } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import Alert from '../components/Alert';
import InvoiceModal from '../components/InvoiceModal';
import { MapPin, Navigation, Phone, Building2, Star, Lock, Clock, AlertCircle, MessageSquare, Sparkles } from 'lucide-react';
import '../styles/Appointments.css';

const MyAppointmentsPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [appointments, setAppointments] = useState([]);
  const [statusCounts, setStatusCounts] = useState({});
  const [totalCount, setTotalCount] = useState(0);
  const [pagination, setPagination] = useState({ count: 0, num_pages: 1, current_page: 1 });
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [selectedInvoice, setSelectedInvoice] = useState(null);

  // RedBus-style Cancellation Modal State
  const [cancellationModal, setCancellationModal] = useState({
    open: false,
    loading: false,
    appointment: null,
    preview: null,
    reason: 'Schedule Conflict / Personal Reason',
    customReason: '',
    submitting: false,
  });

  // Post-Consultation 3-Category Rating & Review Modal State (Doctor, Hospital & Management)
  const [reviewModal, setReviewModal] = useState({
    open: false,
    appointment: null,
    doctorRating: 5,
    doctorHover: 0,
    hospitalRating: 5,
    hospitalHover: 0,
    managementRating: 5,
    managementHover: 0,
    comment: '',
    submitting: false,
  });

  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [alertInfo, setAlertInfo] = useState(location.state?.alert || { type: '', message: '' });

  const statusFilter = searchParams.get('status') || '';
  const page = searchParams.get('page') || 1;

  const fetchAppointments = async () => {
    setLoading(true);
    try {
      const res = await api.get('/appointments/my-appointments/', {
        params: { status: statusFilter, page: page, page_size: 6 }
      });
      setAppointments(res.data.results || []);
      setStatusCounts(res.data.status_counts || {});
      setTotalCount(res.data.total_count || 0);
      setPagination({
        count: res.data.count,
        num_pages: res.data.num_pages,
        current_page: res.data.current_page,
        has_next: res.data.has_next,
        has_previous: res.data.has_previous,
      });
    } catch (err) {
      console.error("Error fetching appointments:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAppointments();
  }, [statusFilter, page]);

  const handleTabChange = (status) => {
    const params = new URLSearchParams();
    if (status) params.set('status', status);
    params.set('page', '1');
    setSearchParams(params);
  };

  const handlePageChange = (newPage) => {
    const params = new URLSearchParams(searchParams);
    params.set('page', newPage.toString());
    setSearchParams(params);
  };

  // Open Review Modal
  const handleOpenReviewModal = (appt) => {
    setReviewModal({
      open: true,
      appointment: appt,
      doctorRating: appt.doctor_rating || appt.rating || 5,
      doctorHover: 0,
      hospitalRating: appt.hospital_rating || 5,
      hospitalHover: 0,
      managementRating: appt.management_rating || 5,
      managementHover: 0,
      comment: appt.review_comment || '',
      submitting: false,
    });
  };

  const handleCloseReviewModal = () => {
    setReviewModal({
      open: false,
      appointment: null,
      doctorRating: 5,
      doctorHover: 0,
      hospitalRating: 5,
      hospitalHover: 0,
      managementRating: 5,
      managementHover: 0,
      comment: '',
      submitting: false,
    });
  };

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    const { appointment, doctorRating, hospitalRating, managementRating, comment } = reviewModal;
    if (!appointment) return;

    const overallRating = Math.round(((Number(doctorRating) + Number(hospitalRating) + Number(managementRating)) / 3) * 10) / 10;

    setReviewModal((prev) => ({ ...prev, submitting: true }));
    try {
      const res = await api.post(`/appointments/${appointment.id}/review/`, {
        doctor_rating: Number(doctorRating),
        hospital_rating: Number(hospitalRating),
        management_rating: Number(managementRating),
        rating: Math.round(overallRating),
        review_comment: comment.trim(),
      });
      toast.success(res.data.message || 'Thank you for reviewing the doctor, hospital & management!');
      handleCloseReviewModal();
      fetchAppointments();
    } catch (err) {
      const msg = err.response?.data?.error || 'Failed to submit review.';
      toast.error(msg);
      setReviewModal((prev) => ({ ...prev, submitting: false }));
    }
  };

  // Open RedBus-style Cancellation Modal & Fetch Real-time Math Preview
  const handleOpenCancelModal = async (appt) => {
    setCancellationModal({
      open: true,
      loading: true,
      appointment: appt,
      preview: null,
      reason: 'Schedule Conflict / Personal Reason',
      customReason: '',
      submitting: false,
    });

    try {
      const res = await api.get(`/appointments/cancel-preview/${appt.id}/`);
      setCancellationModal((prev) => ({
        ...prev,
        preview: res.data,
        loading: false,
      }));
    } catch (err) {
      console.error("Failed to load cancellation preview:", err);
      // Fallback preview
      setCancellationModal((prev) => ({
        ...prev,
        preview: {
          fee_paid: appt.fee_charged,
          deduction_amount: '0.00',
          refund_amount: appt.fee_charged,
          refund_percentage: 100,
          deduction_percentage: 0,
          tier_label: 'Standard Cancellation Policy',
          hours_display: 'Calculating...',
          policy_slabs: [
            { title: 'Standard (> 24 Hours)', refund: '100% Refund', deduction: '₹0 Cut-off (0%)', badge: 'Free Cancellation', color: 'emerald' },
            { title: 'Moderate (12 – 24 Hours)', refund: '75% Refund', deduction: '25% Cash Cut-off', badge: '75% Return', color: 'blue' },
            { title: 'Short Notice (2 – 12 Hours)', refund: '50% Refund', deduction: '50% Cash Cut-off', badge: '50% Return', color: 'amber' },
            { title: 'Late Notice (< 2 Hours)', refund: '0% Refund', deduction: '100% Non-Refundable', badge: 'No Refund', color: 'rose' },
          ]
        },
        loading: false,
      }));
    }
  };

  const handleCloseCancelModal = () => {
    setCancellationModal({
      open: false,
      loading: false,
      appointment: null,
      preview: null,
      reason: 'Schedule Conflict / Personal Reason',
      customReason: '',
      submitting: false,
    });
  };

  // Submit Cancellation with Selected Reason & Processed Refund
  const handleConfirmCancellation = async () => {
    const { appointment, reason, customReason, preview } = cancellationModal;
    if (!appointment) return;

    setCancellationModal((prev) => ({ ...prev, submitting: true }));
    setAlertInfo({ type: '', message: '' });

    const finalReason = reason === 'Other' && customReason.trim()
      ? `Other: ${customReason.trim()}`
      : reason;

    try {
      const res = await api.post(`/appointments/cancel/${appointment.id}/`, {
        reason: finalReason,
      });

      const refundAmt = res.data?.appointment?.refund_amount || preview?.refund_amount || '0.00';
      setAlertInfo({
        type: 'success',
        message: `✅ Appointment cancelled. Refund of ₹${refundAmt} processed to original payment method. Cancellation confirmation & breakdown emailed.`
      });
      handleCloseCancelModal();
      fetchAppointments();
    } catch (err) {
      const msg = err.response?.data?.error || 'Failed to cancel appointment.';
      setAlertInfo({ type: 'error', message: msg });
      setCancellationModal((prev) => ({ ...prev, submitting: false }));
    }
  };

  const handleReschedule = async (apptId, docId) => {
    setActionLoading(apptId);
    setAlertInfo({ type: '', message: '' });
    try {
      await api.post(`/appointments/reschedule/${apptId}/`);
      navigate(`/doctors/${docId}`, {
        state: { alert: { type: 'info', message: 'Please select a new slot to complete your reschedule.' } }
      });
    } catch (err) {
      const msg = err.response?.data?.error || 'Failed to reschedule appointment.';
      setAlertInfo({ type: 'error', message: msg });
      setActionLoading(null);
    }
  };

  // Razorpay Checkout Trigger
  const handlePayForAppointment = async (apptId) => {
    if (!window.Razorpay) {
      setAlertInfo({ type: 'error', message: 'Razorpay SDK failed to load. Please refresh the page.' });
      return;
    }

    setActionLoading(apptId);
    setAlertInfo({ type: '', message: '' });

    try {
      const orderRes = await api.post(`/payments/create-order/${apptId}/`);
      const { order_id, amount, currency, key } = orderRes.data;

      const options = {
        key: key,
        amount: amount,
        currency: currency,
        name: 'CareConnect Healthcare',
        description: 'Doctor Consultation Fee',
        order_id: order_id,
        prefill: {
          name: user?.username || '',
          email: user?.email || '',
          contact: user?.phone || '',
        },
        theme: {
          color: '#10b981',
        },
        handler: async function (response) {
          try {
            await api.post('/payments/verify/', {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });
            setAlertInfo({ type: 'success', message: 'Payment verified! Your appointment is confirmed.' });
            fetchAppointments();
          } catch (verifyErr) {
            setAlertInfo({ type: 'error', message: 'Payment verification failed. Please contact support.' });
          }
        },
        modal: {
          ondismiss: function () {
            setActionLoading(null);
          },
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err) {
      const msg = err.response?.data?.error || 'Could not initiate payment.';
      setAlertInfo({ type: 'error', message: msg });
      setActionLoading(null);
    }
  };

  const getStatusDisplay = (status) => {
    switch (status) {
      case 'pending': return 'Pending';
      case 'confirmed': return 'Confirmed';
      case 'completed': return 'Completed';
      case 'cancelled': return 'Cancelled';
      case 'expired': return 'Expired';
      case 'rescheduled': return 'Rescheduled';
      default: return status;
    }
  };

  return (
    <div className="container" style={{ paddingTop: '2rem', paddingBottom: '3rem' }}>
      <div style={{ marginBottom: '2rem' }}>
        <span className="eyebrow">Patient Dashboard</span>
        <h2>My Consultations</h2>
        <p style={{ color: 'var(--color-ink-soft)', fontSize: '0.95rem' }}>
          Track, manage, reschedule or complete payments for your doctor appointments.
        </p>
      </div>

      {alertInfo.message && (
        <div style={{ marginBottom: '1.5rem' }}>
          <Alert type={alertInfo.type} message={alertInfo.message} onClose={() => setAlertInfo({ type: '', message: '' })} />
        </div>
      )}

      {/* Status Tabs */}
      <div className="appointments-tabs">
        <button
          type="button"
          onClick={() => handleTabChange('')}
          className={`tab-btn ${!statusFilter ? 'active' : ''}`}
        >
          All <span className="tab-count">{totalCount}</span>
        </button>
        <button
          type="button"
          onClick={() => handleTabChange('pending')}
          className={`tab-btn ${statusFilter === 'pending' ? 'active' : ''}`}
        >
          Pending <span className="tab-count">{statusCounts.pending || 0}</span>
        </button>
        <button
          type="button"
          onClick={() => handleTabChange('confirmed')}
          className={`tab-btn ${statusFilter === 'confirmed' ? 'active' : ''}`}
        >
          Confirmed <span className="tab-count">{statusCounts.confirmed || 0}</span>
        </button>
        <button
          type="button"
          onClick={() => handleTabChange('completed')}
          className={`tab-btn ${statusFilter === 'completed' ? 'active' : ''}`}
        >
          Completed <span className="tab-count">{statusCounts.completed || 0}</span>
        </button>
        <button
          type="button"
          onClick={() => handleTabChange('cancelled')}
          className={`tab-btn ${statusFilter === 'cancelled' ? 'active' : ''}`}
        >
          Cancelled <span className="tab-count">{statusCounts.cancelled || 0}</span>
        </button>
        <button
          type="button"
          onClick={() => handleTabChange('expired')}
          className={`tab-btn ${statusFilter === 'expired' ? 'active' : ''}`}
        >
          Expired <span className="tab-count">{statusCounts.expired || 0}</span>
        </button>
      </div>

      {/* Appointments List */}
      <div style={{ marginTop: '1.5rem' }}>
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="appointment-card skeleton-card-wrapper" style={{ display: 'flex', gap: '1.25rem', alignItems: 'center' }}>
                <div className="skeleton skeleton-circle" style={{ width: '56px', height: '56px', flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div className="skeleton skeleton-text" style={{ width: '40%', height: '18px', marginBottom: '8px' }} />
                  <div className="skeleton skeleton-text" style={{ width: '60%', height: '14px', marginBottom: '8px' }} />
                  <div className="skeleton skeleton-text" style={{ width: '30%', height: '14px' }} />
                </div>
                <div className="skeleton" style={{ width: '100px', height: '36px', borderRadius: '8px' }} />
              </div>
            ))}
          </div>
        ) : appointments.length > 0 ? (
          appointments.map((appt) => (
            <div key={appt.id} className="appointment-card">
              <div className="appointment-avatar">
                {appt.doctor_name ? appt.doctor_name.charAt(0).toUpperCase() : 'D'}
              </div>

              <div className="appointment-info">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '0.25rem' }}>
                  <span className="verified-badge">
                    &#10003; {appt.doctor_specialization || 'Specialist'}
                  </span>
                  {appt.patient_relation && appt.patient_relation !== 'Self' && (
                    <span style={{ fontSize: '0.72rem', background: 'rgba(59, 130, 246, 0.12)', color: '#2563eb', padding: '0.15rem 0.5rem', borderRadius: '9999px', fontWeight: 700 }}>
                      For: {appt.patient_relation}
                    </span>
                  )}
                </div>
                <h4>Dr. {appt.doctor_name}</h4>
                <div style={{ fontSize: '0.85rem', color: 'var(--color-navy)', fontWeight: 600, marginBottom: '0.25rem' }}>
                  👤 Patient: {appt.patient_name || user?.username}
                  {appt.patient_age ? ` (${appt.patient_age} yrs${appt.patient_gender ? `, ${appt.patient_gender}` : ''})` : ''}
                </div>
                <p style={{ marginBottom: '0.25rem' }}>
                  📅 <strong>{appt.slot_date}</strong> &middot; 🕒 <strong>{appt.slot_time} - {appt.slot_end_time || 'Slot'}</strong>
                </p>

                {/* Hospital / Clinic & Google Maps Location */}
                <div style={{ marginTop: '0.4rem', marginBottom: '0.4rem', background: '#f8fafc', padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--color-navy)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <Building2 size={13} style={{ color: 'var(--color-primary)' }} />
                    {appt.doctor_hospital || 'CareConnect Hospital'}
                  </div>
                  {appt.doctor_clinic_address && (
                    <div style={{ fontSize: '0.76rem', color: 'var(--color-ink-soft)', marginTop: '2px', lineHeight: 1.3 }}>
                      📍 {appt.doctor_clinic_address}
                    </div>
                  )}

                  {/* Quick Action Links: Google Maps & Call */}
                  <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.4rem', flexWrap: 'wrap' }}>
                    <a
                      href={appt.doctor_maps_url || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent((appt.doctor_hospital || '') + ' ' + (appt.doctor_clinic_address || ''))}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-sm"
                      style={{
                        fontSize: '0.74rem',
                        padding: '2px 8px',
                        background: '#e0f2fe',
                        color: '#0284c7',
                        border: '1px solid #bae6fd',
                        borderRadius: '6px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '3px',
                        fontWeight: 600,
                        textDecoration: 'none'
                      }}
                    >
                      <Navigation size={11} /> Get Directions (Google Maps)
                    </a>
                    {appt.doctor_contact_number && (
                      <a
                        href={`tel:${appt.doctor_contact_number}`}
                        className="btn btn-sm"
                        style={{
                          fontSize: '0.74rem',
                          padding: '2px 8px',
                          background: '#ecfdf5',
                          color: '#059669',
                          border: '1px solid #a7f3d0',
                          borderRadius: '6px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '3px',
                          fontWeight: 600,
                          textDecoration: 'none'
                        }}
                      >
                        <Phone size={11} /> {appt.doctor_contact_number}
                      </a>
                    )}
                  </div>
                </div>

                <p className="receipt-id">ID: {appt.receipt_id || `APT-${appt.id}`}</p>
                {appt.notes && (
                  <p style={{ fontSize: '0.8rem', color: 'var(--color-ink-soft)', marginTop: '0.25rem', fontStyle: 'italic' }}>
                    📝 Note: {appt.notes}
                  </p>
                )}
              </div>

              <div className="appointment-actions">
                <div style={{ textAlign: 'right', marginBottom: '0.5rem', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.25rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    {appt.original_fee && Number(appt.discount_amount) > 0 && (
                      <span style={{ fontSize: '0.8rem', color: 'var(--color-ink-muted)', textDecoration: 'line-through' }}>
                        ₹{appt.original_fee}
                      </span>
                    )}
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '1rem', fontWeight: 800, color: 'var(--color-primary)' }}>
                      ₹{appt.fee_charged}
                    </span>
                  </div>
                  {appt.coupon_code && (
                    <span style={{ fontSize: '0.72rem', color: '#047857', background: 'rgba(16, 185, 129, 0.12)', padding: '0.15rem 0.45rem', borderRadius: '4px', fontWeight: 700 }}>
                      🏷️ {appt.coupon_code} (-₹{appt.discount_amount})
                    </span>
                  )}
                  <span className={`status-badge status-${appt.status}`}>
                    {getStatusDisplay(appt.status)}
                  </span>
                </div>

                <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'flex-end', flexWrap: 'wrap', alignItems: 'center' }}>
                  {appt.status === 'pending' && (
                    <button
                      className="btn btn-sm btn-primary"
                      onClick={() => handlePayForAppointment(appt.id)}
                      disabled={actionLoading === appt.id}
                    >
                      💳 Pay & Confirm
                    </button>
                  )}

                  {/* Post-Consultation Star Rating & Review Button */}
                  {appt.status === 'completed' && (
                    !appt.is_reviewed ? (
                      <button
                        type="button"
                        className="btn btn-sm"
                        onClick={() => handleOpenReviewModal(appt)}
                        style={{
                          background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                          color: '#fff',
                          border: 'none',
                          fontWeight: 700,
                          padding: '4px 10px',
                          borderRadius: '6px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          boxShadow: '0 2px 6px rgba(217, 119, 6, 0.3)',
                          cursor: 'pointer'
                        }}
                      >
                        <Star size={13} fill="#fff" /> Rate Experience & Review
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="btn btn-sm btn-outline"
                        onClick={() => handleOpenReviewModal(appt)}
                        style={{
                          color: '#d97706',
                          borderColor: '#fde68a',
                          background: '#fffbeb',
                          fontSize: '0.76rem',
                          fontWeight: 700,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                        title="Click to view or edit your submitted review"
                      >
                        <Star size={12} fill="#d97706" /> ⭐ {appt.rating}.0 / 5 Rated
                      </button>
                    )
                  )}

                  {/* Rescheduling with 10-Hour Rule Validation */}
                  {(appt.status === 'pending' || appt.status === 'confirmed') && (
                    appt.reschedule_info?.eligible ? (
                      <button
                        className="btn btn-sm btn-outline"
                        onClick={() => handleReschedule(appt.id, appt.doctor)}
                        disabled={actionLoading === appt.id}
                        title="Reschedule to a new slot (Available > 10 hours prior to consultation)"
                      >
                        🔄 Reschedule
                      </button>
                    ) : (
                      <button
                        className="btn btn-sm btn-outline"
                        disabled
                        style={{
                          opacity: 0.6,
                          cursor: 'not-allowed',
                          borderColor: '#cbd5e1',
                          color: '#64748b',
                          fontSize: '0.74rem',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '3px'
                        }}
                        title="Rescheduling is only permitted up to 10 hours before appointment start time to prevent empty slot vacancy."
                      >
                        <Lock size={11} /> Reschedule Locked (&lt; 10h)
                      </button>
                    )
                  )}

                  <button
                    type="button"
                    className="btn btn-sm btn-outline"
                    onClick={() => setSelectedInvoice({
                      ...appt,
                      patient_name: user?.username,
                      patient_email: user?.email,
                    })}
                    title="Generate and Print Tax Invoice"
                  >
                    🧾 Invoice
                  </button>

                  {appt.is_cancellable && (
                    <button
                      className="btn btn-sm btn-outline"
                      onClick={() => handleOpenCancelModal(appt)}
                      style={{ color: 'var(--color-danger)', borderColor: 'rgba(239, 68, 68, 0.2)' }}
                      disabled={actionLoading === appt.id}
                    >
                      Cancel & Refund
                    </button>
                  )}
                </div>

                {/* Patient Submitted Review Card Snippet */}
                {appt.status === 'completed' && appt.is_reviewed && (
                  <div style={{ marginTop: '0.6rem', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '0.6rem 0.85rem', fontSize: '0.78rem', width: '100%', color: '#166534' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '6px', fontWeight: 700, marginBottom: '4px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <MessageSquare size={13} /> <strong>Your Verified Review:</strong>
                      </div>
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', fontSize: '0.74rem' }}>
                        <span style={{ background: '#dcfce7', padding: '2px 6px', borderRadius: '4px', color: '#15803d', fontWeight: 700 }}>
                          👨‍⚕️ Doctor: ⭐ {appt.doctor_rating || appt.rating}/5
                        </span>
                        <span style={{ background: '#e0f2fe', padding: '2px 6px', borderRadius: '4px', color: '#0369a1', fontWeight: 700 }}>
                          🏥 Hospital: ⭐ {appt.hospital_rating || 5}/5
                        </span>
                        <span style={{ background: '#fef3c7', padding: '2px 6px', borderRadius: '4px', color: '#b45309', fontWeight: 700 }}>
                          💼 Management: ⭐ {appt.management_rating || 5}/5
                        </span>
                      </div>
                    </div>
                    {appt.review_comment && (
                      <div style={{ fontStyle: 'italic', color: '#15803d', marginTop: '3px', background: 'rgba(255,255,255,0.6)', padding: '4px 8px', borderRadius: '4px' }}>
                        "{appt.review_comment}"
                      </div>
                    )}
                  </div>
                )}

                {/* Cancelled Appointment & Refund Breakdown Card Footer */}
                {appt.status === 'cancelled' && (
                  <div style={{ marginTop: '0.6rem', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '0.55rem 0.75rem', fontSize: '0.78rem', width: '100%' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '4px' }}>
                      <span style={{ fontWeight: 700, color: '#991b1b' }}>
                        🛑 Cancelled {appt.cancelled_by ? `by ${appt.cancelled_by === 'hospital' ? 'Hospital Administration' : appt.cancelled_by === 'admin' ? 'CareConnect Admin' : 'Patient'}` : ''}
                      </span>
                      {appt.refund_amount !== null && (
                        <span style={{ fontWeight: 800, color: '#15803d', background: '#dcfce7', padding: '1px 7px', borderRadius: '4px' }}>
                          💰 Refund: ₹{appt.refund_amount} {Number(appt.cancellation_fee) > 0 ? `(₹${appt.cancellation_fee} cut-off)` : '(100% Full Refund)'}
                        </span>
                      )}
                    </div>
                    {appt.cancellation_reason && (
                      <div style={{ color: '#7f1d1d', fontStyle: 'italic', marginTop: '3px', lineHeight: 1.3 }}>
                        Reason: {appt.cancellation_reason}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="empty-state">
            <div className="empty-state-icon">📅</div>
            <h3>No consultations found</h3>
            <p>You do not have any appointments under this status filter.</p>
            <a href="/#doctor-list" className="btn btn-primary" style={{ marginTop: '1rem' }}>
              Find a Doctor
            </a>
          </div>
        )}
      </div>

      {/* Pagination */}
      {pagination.num_pages > 1 && (
        <div className="pagination">
          {pagination.has_previous ? (
            <button
              type="button"
              onClick={() => handlePageChange(pagination.current_page - 1)}
              className="page-btn"
            >
              &larr;
            </button>
          ) : (
            <span className="disabled page-btn">&larr;</span>
          )}

          <span className="current page-btn active">
            {pagination.current_page} / {pagination.num_pages}
          </span>

          {pagination.has_next ? (
            <button
              type="button"
              onClick={() => handlePageChange(pagination.current_page + 1)}
              className="page-btn"
            >
              &rarr;
            </button>
          ) : (
            <span className="disabled page-btn">&rarr;</span>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* REDBUS-STYLE CANCELLATION & CASH CUT-OFF REFUND MODAL */}
      {/* ========================================================================= */}
      {cancellationModal.open && (
        <div className="modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1200, padding: '1rem' }}>
          <div className="card" style={{ width: '100%', maxWidth: '580px', maxHeight: '92vh', overflowY: 'auto', background: '#ffffff', borderRadius: '16px', boxShadow: '0 20px 40px rgba(0,0,0,0.2)', border: 'none', padding: 0 }}>
            {/* Header */}
            <div style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', color: '#fff', padding: '1.25rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTopLeftRadius: '16px', borderTopRightRadius: '16px' }}>
              <div>
                <div style={{ fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#f87171' }}>
                  Cancellation & Refund Preview
                </div>
                <h3 style={{ margin: '2px 0 0', fontSize: '1.15rem', fontWeight: 800, color: '#fff' }}>
                  Cancel Appointment with Dr. {cancellationModal.appointment?.doctor_name}
                </h3>
              </div>
              <button
                type="button"
                onClick={handleCloseCancelModal}
                style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '50%', width: '32px', height: '32px', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                ✕
              </button>
            </div>

            <div style={{ padding: '1.5rem' }}>
              {cancellationModal.loading ? (
                <div style={{ textAlign: 'center', padding: '2.5rem 0' }}>
                  <div className="spinner" style={{ margin: '0 auto 0.75rem', width: '36px', height: '36px', border: '3px solid #e2e8f0', borderTopColor: '#dc2626', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }}></div>
                  <p style={{ color: 'var(--color-navy)', fontWeight: 600, fontSize: '0.9rem' }}>Calculating real-time cash cut-off refund...</p>
                </div>
              ) : (
                <>
                  {/* Consultation summary card */}
                  <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '0.85rem 1rem', marginBottom: '1.25rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.82rem' }}>
                    <div>
                      <span style={{ color: 'var(--color-ink-soft)', fontSize: '0.74rem', textTransform: 'uppercase', fontWeight: 700 }}>Hospital / Facility:</span>
                      <div style={{ fontWeight: 700, color: 'var(--color-navy)' }}>{cancellationModal.appointment?.doctor_hospital || 'CareConnect Hospital'}</div>
                    </div>
                    <div>
                      <span style={{ color: 'var(--color-ink-soft)', fontSize: '0.74rem', textTransform: 'uppercase', fontWeight: 700 }}>Scheduled Slot:</span>
                      <div style={{ fontWeight: 700, color: 'var(--color-navy)' }}>{cancellationModal.appointment?.slot_date} at {cancellationModal.appointment?.slot_time}</div>
                    </div>
                    <div>
                      <span style={{ color: 'var(--color-ink-soft)', fontSize: '0.74rem', textTransform: 'uppercase', fontWeight: 700 }}>Receipt ID:</span>
                      <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--color-primary)' }}>{cancellationModal.appointment?.receipt_id}</div>
                    </div>
                    <div>
                      <span style={{ color: 'var(--color-ink-soft)', fontSize: '0.74rem', textTransform: 'uppercase', fontWeight: 700 }}>Countdown to Slot:</span>
                      <div style={{ fontWeight: 700, color: '#dc2626' }}>⏱️ {cancellationModal.preview?.hours_display || 'Upcoming'}</div>
                    </div>
                  </div>

                  {/* RedBus Policy Timeline Slabs */}
                  <div style={{ marginBottom: '1.25rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                      <span style={{ fontSize: '0.78rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-navy)' }}>
                        📋 RedBus-Style Refund Slabs
                      </span>
                      <span style={{ fontSize: '0.72rem', background: '#ecfdf5', color: '#059669', padding: '2px 8px', borderRadius: '6px', fontWeight: 700 }}>
                        Active: {cancellationModal.preview?.refund_percentage}% Refund
                      </span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.35rem', marginBottom: '0.75rem' }}>
                      {[
                        { range: '> 24 hrs', refund: '100% Refund', fee: '₹0 Cut', code: 'tier_1_full', color: '#10b981' },
                        { range: '12 – 24 hrs', refund: '75% Refund', fee: '25% Cut', code: 'tier_2_standard', color: '#3b82f6' },
                        { range: '2 – 12 hrs', refund: '50% Refund', fee: '50% Cut', code: 'tier_3_short_notice', color: '#f59e0b' },
                        { range: '< 2 hrs', refund: '0% Refund', fee: '100% Cut', code: 'tier_4_non_refundable', color: '#ef4444' },
                      ].map((tier, idx) => {
                        const isActive = cancellationModal.preview?.tier_code === tier.code;
                        return (
                          <div
                            key={idx}
                            style={{
                              padding: '8px 6px',
                              borderRadius: '8px',
                              textAlign: 'center',
                              background: isActive ? `${tier.color}15` : '#f8fafc',
                              border: isActive ? `2px solid ${tier.color}` : '1px solid #e2e8f0',
                              boxShadow: isActive ? `0 0 10px ${tier.color}30` : 'none',
                              position: 'relative',
                              transition: 'all 0.2s ease',
                            }}
                          >
                            {isActive && (
                              <div style={{ position: 'absolute', top: '-8px', left: '50%', transform: 'translateX(-50%)', background: tier.color, color: '#fff', fontSize: '0.62rem', fontWeight: 800, padding: '1px 5px', borderRadius: '4px', whiteSpace: 'nowrap' }}>
                                YOUR TIER
                              </div>
                            )}
                            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--color-navy)', marginTop: isActive ? '2px' : '0' }}>{tier.range}</div>
                            <div style={{ fontSize: '0.78rem', fontWeight: 800, color: tier.color, margin: '2px 0' }}>{tier.refund}</div>
                            <div style={{ fontSize: '0.68rem', color: 'var(--color-ink-soft)' }}>{tier.fee}</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Refund Math Calculation Table */}
                  <div style={{ background: '#f0fdf4', border: '1.5px solid #86efac', borderRadius: '12px', padding: '1rem 1.25rem', marginBottom: '1.25rem' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#166534', marginBottom: '0.5rem' }}>
                      💰 Cash Cut-off Deduction Breakdown
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.86rem', color: '#374151', padding: '3px 0' }}>
                      <span>Consultation Fee Paid:</span>
                      <span style={{ fontWeight: 700 }}>₹{cancellationModal.preview?.fee_paid || cancellationModal.appointment?.fee_charged}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.86rem', color: '#dc2626', padding: '3px 0' }}>
                      <span>Cash Cut-off Deduction ({cancellationModal.preview?.deduction_percentage}%):</span>
                      <span style={{ fontWeight: 700 }}>- ₹{cancellationModal.preview?.deduction_amount}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.05rem', fontWeight: 800, color: '#166534', borderTop: '1.5px dashed #86efac', paddingTop: '8px', marginTop: '6px' }}>
                      <span>Net Refund Credited:</span>
                      <span style={{ fontSize: '1.2rem', fontFamily: 'var(--font-mono)' }}>₹{cancellationModal.preview?.refund_amount}</span>
                    </div>
                  </div>

                  {/* Cancellation Reason Dropdown */}
                  <div style={{ marginBottom: '1.25rem' }}>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--color-navy)', marginBottom: '4px' }}>
                      Please select reason for cancellation:
                    </label>
                    <select
                      value={cancellationModal.reason}
                      onChange={(e) => setCancellationModal((prev) => ({ ...prev, reason: e.target.value }))}
                      style={{ width: '100%', height: '38px', borderRadius: '8px', border: '1px solid var(--c-border)', padding: '0 10px', fontSize: '0.86rem', background: '#fff' }}
                    >
                      <option value="Schedule Conflict / Personal Reason">Schedule Conflict / Change of Plans</option>
                      <option value="Feeling better / Consultation not required">Feeling better / Consultation no longer needed</option>
                      <option value="Consulted another doctor">Consulted another doctor locally</option>
                      <option value="Booked wrong date/time slot">Booked wrong date or time slot</option>
                      <option value="Hospital location too far">Hospital location too far / Travel difficulty</option>
                      <option value="Financial / Budget constraint">Financial / Budget constraint</option>
                      <option value="Other">Other (Please specify)</option>
                    </select>

                    {cancellationModal.reason === 'Other' && (
                      <textarea
                        rows={2}
                        placeholder="Please describe your reason..."
                        value={cancellationModal.customReason}
                        onChange={(e) => setCancellationModal((prev) => ({ ...prev, customReason: e.target.value }))}
                        style={{ width: '100%', marginTop: '8px', borderRadius: '8px', border: '1px solid var(--c-border)', padding: '8px 10px', fontSize: '0.84rem' }}
                      />
                    )}
                  </div>

                  {/* Polite Apology & Instant Refund Notice */}
                  <p style={{ fontSize: '0.78rem', color: 'var(--color-ink-soft)', lineHeight: 1.4, margin: '0 0 1.25rem', background: '#eff6ff', padding: '8px 12px', borderRadius: '8px', border: '1px solid #bfdbfe' }}>
                    ℹ️ <strong>Instant Refund Guarantee:</strong> We regret any inconvenience. Your net refund of <strong>₹{cancellationModal.preview?.refund_amount}</strong> will be immediately initiated to your payment method and a detailed refund breakdown receipt will be emailed to you.
                  </p>

                  {/* Action Buttons */}
                  <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                    <button
                      type="button"
                      onClick={handleCloseCancelModal}
                      className="btn btn-outline"
                      disabled={cancellationModal.submitting}
                    >
                      Keep Appointment
                    </button>
                    <button
                      type="button"
                      onClick={handleConfirmCancellation}
                      disabled={cancellationModal.submitting}
                      className="btn btn-primary"
                      style={{ background: '#dc2626', borderColor: '#dc2626', display: 'flex', alignItems: 'center', gap: '6px' }}
                    >
                      {cancellationModal.submitting ? 'Processing Refund...' : `Confirm & Refund ₹${cancellationModal.preview?.refund_amount}`}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* POST-CONSULTATION 3-TIER REVIEW MODAL (DOCTOR, HOSPITAL & MANAGEMENT) */}
      {/* ========================================================================= */}
      {reviewModal.open && reviewModal.appointment && (
        <div className="modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1200, padding: '1rem' }}>
          <div className="card" style={{ width: '100%', maxWidth: '580px', maxHeight: '92vh', overflowY: 'auto', background: '#ffffff', borderRadius: '16px', boxShadow: '0 20px 40px rgba(0,0,0,0.2)', border: 'none', padding: 0 }}>
            {/* Modal Header */}
            <div style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', color: '#fff', padding: '1.25rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTopLeftRadius: '16px', borderTopRightRadius: '16px' }}>
              <div>
                <div style={{ fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#f59e0b', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Sparkles size={13} /> Complete Healthcare Experience Review
                </div>
                <h3 style={{ margin: '2px 0 0', fontSize: '1.2rem', fontWeight: 800, color: '#fff' }}>
                  Rate Doctor, Hospital & Management
                </h3>
              </div>
              <button
                type="button"
                onClick={handleCloseReviewModal}
                style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '50%', width: '32px', height: '32px', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitReview} style={{ padding: '1.5rem' }}>
              {/* Consultation Context Banner */}
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '0.75rem 1rem', marginBottom: '1.25rem', display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '0.5rem', fontSize: '0.82rem' }}>
                <div>
                  <div style={{ fontWeight: 700, color: 'var(--color-navy)' }}>Dr. {reviewModal.appointment.doctor_name}</div>
                  <div style={{ fontSize: '0.74rem', color: '#0284c7' }}>{reviewModal.appointment.doctor_specialization}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 700, color: 'var(--color-navy)' }}>🏥 {reviewModal.appointment.doctor_hospital || 'CareConnect Hospital'}</div>
                  <div style={{ fontSize: '0.74rem', color: 'var(--color-ink-soft)', fontFamily: 'var(--font-mono)' }}>📅 {reviewModal.appointment.slot_date}</div>
                </div>
              </div>

              {/* 3 Interactive Star Rating Rows */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.25rem' }}>
                {/* 1. DOCTOR RATING */}
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '0.85rem 1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                    <div>
                      <span style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--color-navy)' }}>
                        👨‍⚕️ 1. Doctor Consultation & Treatment
                      </span>
                      <div style={{ fontSize: '0.72rem', color: 'var(--color-ink-soft)' }}>
                        Doctor diagnosis quality, explanation, empathy & punctuality
                      </div>
                    </div>
                    <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#d97706', background: '#fffbeb', padding: '2px 8px', borderRadius: '6px', border: '1px solid #fef3c7' }}>
                      ⭐ {reviewModal.doctorRating} / 5
                    </span>
                  </div>

                  <div style={{ display: 'flex', gap: '6px', marginTop: '0.4rem' }}>
                    {[1, 2, 3, 4, 5].map((star) => {
                      const activeScore = reviewModal.doctorHover || reviewModal.doctorRating;
                      const isFilled = star <= activeScore;
                      return (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setReviewModal((prev) => ({ ...prev, doctorRating: star }))}
                          onMouseEnter={() => setReviewModal((prev) => ({ ...prev, doctorHover: star }))}
                          onMouseLeave={() => setReviewModal((prev) => ({ ...prev, doctorHover: 0 }))}
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            padding: '2px',
                            transform: isFilled ? 'scale(1.15)' : 'scale(1)',
                            transition: 'all 0.15s ease',
                          }}
                          title={`Doctor: ${star} out of 5 stars`}
                        >
                          <Star size={26} fill={isFilled ? '#f59e0b' : 'none'} stroke={isFilled ? '#d97706' : '#cbd5e1'} strokeWidth={1.5} />
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 2. HOSPITAL FACILITY & CLEANLINESS */}
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '0.85rem 1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                    <div>
                      <span style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--color-navy)' }}>
                        🏥 2. Hospital Facility & Cleanliness
                      </span>
                      <div style={{ fontSize: '0.72rem', color: 'var(--color-ink-soft)' }}>
                        Campus hygiene, modern medical equipment, waiting lounge & safety
                      </div>
                    </div>
                    <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#0284c7', background: '#f0f9ff', padding: '2px 8px', borderRadius: '6px', border: '1px solid #e0f2fe' }}>
                      ⭐ {reviewModal.hospitalRating} / 5
                    </span>
                  </div>

                  <div style={{ display: 'flex', gap: '6px', marginTop: '0.4rem' }}>
                    {[1, 2, 3, 4, 5].map((star) => {
                      const activeScore = reviewModal.hospitalHover || reviewModal.hospitalRating;
                      const isFilled = star <= activeScore;
                      return (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setReviewModal((prev) => ({ ...prev, hospitalRating: star }))}
                          onMouseEnter={() => setReviewModal((prev) => ({ ...prev, hospitalHover: star }))}
                          onMouseLeave={() => setReviewModal((prev) => ({ ...prev, hospitalHover: 0 }))}
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            padding: '2px',
                            transform: isFilled ? 'scale(1.15)' : 'scale(1)',
                            transition: 'all 0.15s ease',
                          }}
                          title={`Hospital: ${star} out of 5 stars`}
                        >
                          <Star size={26} fill={isFilled ? '#0284c7' : 'none'} stroke={isFilled ? '#0369a1' : '#cbd5e1'} strokeWidth={1.5} />
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 3. HOSPITAL MANAGEMENT & FRONT DESK */}
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '0.85rem 1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                    <div>
                      <span style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--color-navy)' }}>
                        💼 3. Hospital Management & Staff
                      </span>
                      <div style={{ fontSize: '0.72rem', color: 'var(--color-ink-soft)' }}>
                        Reception desk behavior, billing transparency, speed & OP assistance
                      </div>
                    </div>
                    <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#059669', background: '#ecfdf5', padding: '2px 8px', borderRadius: '6px', border: '1px solid #a7f3d0' }}>
                      ⭐ {reviewModal.managementRating} / 5
                    </span>
                  </div>

                  <div style={{ display: 'flex', gap: '6px', marginTop: '0.4rem' }}>
                    {[1, 2, 3, 4, 5].map((star) => {
                      const activeScore = reviewModal.managementHover || reviewModal.managementRating;
                      const isFilled = star <= activeScore;
                      return (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setReviewModal((prev) => ({ ...prev, managementRating: star }))}
                          onMouseEnter={() => setReviewModal((prev) => ({ ...prev, managementHover: star }))}
                          onMouseLeave={() => setReviewModal((prev) => ({ ...prev, managementHover: 0 }))}
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            padding: '2px',
                            transform: isFilled ? 'scale(1.15)' : 'scale(1)',
                            transition: 'all 0.15s ease',
                          }}
                          title={`Management: ${star} out of 5 stars`}
                        >
                          <Star size={26} fill={isFilled ? '#10b981' : 'none'} stroke={isFilled ? '#059669' : '#cbd5e1'} strokeWidth={1.5} />
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* OVERALL SCORE CALCULATOR BANNER */}
              <div style={{ background: '#fefce8', border: '1.5px solid #fef08a', borderRadius: '10px', padding: '0.75rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#854d0e', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  ⭐ Calculated Overall Score:
                </span>
                <span style={{ fontSize: '1.15rem', fontWeight: 900, color: '#a16207' }}>
                  {Math.round(((Number(reviewModal.doctorRating) + Number(reviewModal.hospitalRating) + Number(reviewModal.managementRating)) / 3) * 10) / 10} / 5.0
                </span>
              </div>

              {/* Quick Feedback Tags */}
              <div style={{ marginBottom: '1rem' }}>
                <span style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--color-ink-soft)', textTransform: 'uppercase', display: 'block', marginBottom: '0.4rem' }}>
                  Quick Praise & Tags:
                </span>
                <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                  {[
                    'Accurate Doctor Diagnosis',
                    'Spotless Clean Hospital',
                    'Polite Front Desk Staff',
                    'Zero Waiting Delay',
                    'Clear Prescription Guidance',
                    'Affordable & Transparent',
                  ].map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => {
                        const current = reviewModal.comment;
                        const newComment = current ? `${current}. ${tag}` : tag;
                        setReviewModal((prev) => ({ ...prev, comment: newComment }));
                      }}
                      style={{
                        fontSize: '0.72rem',
                        fontWeight: 600,
                        padding: '3px 8px',
                        borderRadius: '12px',
                        background: '#f1f5f9',
                        border: '1px solid #cbd5e1',
                        color: 'var(--color-navy)',
                        cursor: 'pointer',
                      }}
                    >
                      + {tag}
                    </button>
                  ))}
                </div>
              </div>

              {/* Feedback Textarea */}
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--color-navy)', marginBottom: '4px' }}>
                  Detailed Experience & Suggestions (Optional):
                </label>
                <textarea
                  rows={3}
                  value={reviewModal.comment}
                  onChange={(e) => setReviewModal((prev) => ({ ...prev, comment: e.target.value }))}
                  placeholder="Share details of your consultation, facility hygiene, and staff experience to help other patients..."
                  style={{ width: '100%', borderRadius: '8px', border: '1px solid var(--c-border)', padding: '8px 10px', fontSize: '0.85rem' }}
                />
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={handleCloseReviewModal}
                  className="btn btn-outline"
                  disabled={reviewModal.submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={reviewModal.submitting}
                  className="btn btn-primary"
                  style={{
                    background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                    borderColor: '#d97706',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontWeight: 800,
                  }}
                >
                  <Star size={15} fill="#fff" />
                  {reviewModal.submitting ? 'Submitting...' : 'Submit Healthcare Review'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Invoice Modal */}
      {selectedInvoice && (
        <InvoiceModal
          data={selectedInvoice}
          onClose={() => setSelectedInvoice(null)}
        />
      )}
    </div>
  );
};

export default MyAppointmentsPage;
