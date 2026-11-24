import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout';
import InvoiceModal from '../../components/InvoiceModal';
import { useToast } from '../../context/ToastContext';
import api from '../../api/client';
import {
  Users,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  RotateCcw,
  ShieldAlert,
  FileText,
  Phone,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  UserCheck,
  Calendar,
  AlertTriangle,
  X
} from 'lucide-react';
import './HospitalQueuePage.css';

export default function HospitalQueuePage() {
  const toast = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  // Query parameter states
  const page = parseInt(searchParams.get('page') || '1', 10);
  const pageSize = parseInt(searchParams.get('page_size') || '10', 10);
  const search = searchParams.get('search') || '';
  const range = searchParams.get('range') || 'all';
  const doctorId = searchParams.get('doctor_id') || 'all';
  const specialization = searchParams.get('specialization') || 'all';
  const opStatus = searchParams.get('op_status') || 'all';
  const dateParam = searchParams.get('date') || '';

  // Data states
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({
    count: 0,
    total_pages: 1,
    current_page: 1,
    page_size: 10,
    summary: {
      today_inflow: 0,
      ready_to_admit: 0,
      in_chamber: 0,
      completed_today: 0,
      cancelled_today: 0,
      total_in_filter: 0,
    },
    specializations: [],
    doctors: [],
    results: []
  });

  // Modal states
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [actionLoadingId, setActionLoadingId] = useState(null);

  // Reschedule Modal
  const [rescheduleModal, setRescheduleModal] = useState({
    open: false,
    appointment: null,
    availableDates: [],
    availableSlots: [],
    selectedDate: '',
    selectedSlotId: '',
    notes: '',
    submitting: false,
    loadingSlots: false,
  });

  // Cancel Modal
  const [cancelModal, setCancelModal] = useState({
    open: false,
    appointment: null,
    reason: 'Doctor Emergency / Hospital Schedule Realignment',
    customReason: '',
    submitting: false,
  });

  // Fetch Queue Data
  const fetchQueue = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', page.toString());
      params.set('page_size', pageSize.toString());
      if (search) params.set('search', search);
      if (range && range !== 'all') params.set('range', range);
      if (doctorId && doctorId !== 'all') params.set('doctor_id', doctorId);
      if (specialization && specialization !== 'all') params.set('specialization', specialization);
      if (opStatus && opStatus !== 'all') params.set('op_status', opStatus);
      if (dateParam) params.set('date', dateParam);

      const res = await api.get(`/appointments/hospital/queue/?${params.toString()}`);
      setData(res.data);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to fetch patient queue.');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search, range, doctorId, specialization, opStatus, dateParam]);

  useEffect(() => {
    fetchQueue();
  }, [fetchQueue]);

  // Update query params helper
  const updateParam = (key, value) => {
    const nextParams = new URLSearchParams(searchParams);
    if (value && value !== 'all') {
      nextParams.set(key, value);
    } else {
      nextParams.delete(key);
    }
    // Reset to page 1 on filter changes
    if (key !== 'page') {
      nextParams.set('page', '1');
    }
    setSearchParams(nextParams);
  };

  // Check In Patient
  const handleCheckIn = async (appointmentId) => {
    setActionLoadingId(appointmentId);
    try {
      const res = await api.post(`/appointments/${appointmentId}/check-in/`);
      toast.success(res.data.message || 'Patient checked in successfully at OP chamber.');
      fetchQueue();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Check-in failed.');
    } finally {
      setActionLoadingId(null);
    }
  };

  // Complete Consultation
  const handleCompleteConsultation = async (appointmentId) => {
    setActionLoadingId(appointmentId);
    try {
      const res = await api.post(`/appointments/${appointmentId}/complete/`);
      toast.success(res.data.message || 'Consultation marked as completed.');
      fetchQueue();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to complete consultation.');
    } finally {
      setActionLoadingId(null);
    }
  };

  // Open Reschedule Modal
  const openRescheduleModal = async (appt) => {
    setRescheduleModal({
      open: true,
      appointment: appt,
      availableDates: [],
      availableSlots: [],
      selectedDate: '',
      selectedSlotId: '',
      notes: '',
      submitting: false,
      loadingSlots: true,
    });

    try {
      const docId = appt.doctor_id || (appt.doctor ? appt.doctor.id : null);
      if (!docId) {
        toast.error('Doctor information missing for appointment.');
        return;
      }
      const res = await api.get(`/doctors/${docId}/`);
      const slots = res.data.slots || [];
      const openSlots = slots.filter((s) => !s.is_blocked && (s.booked_count || 0) < (s.max_capacity || 5));
      const dates = Array.from(new Set(openSlots.map((s) => s.date))).sort();

      const firstDate = dates[0] || '';
      const slotsForDate = openSlots.filter((s) => s.date === firstDate);

      setRescheduleModal((prev) => ({
        ...prev,
        availableDates: dates,
        availableSlots: slotsForDate,
        selectedDate: firstDate,
        selectedSlotId: slotsForDate[0]?.id || '',
        loadingSlots: false,
      }));
    } catch {
      toast.error('Failed to load doctor slots for rescheduling.');
      setRescheduleModal((prev) => ({ ...prev, loadingSlots: false }));
    }
  };

  const handleRescheduleDateChange = async (date) => {
    try {
      const docId = rescheduleModal.appointment.doctor_id || rescheduleModal.appointment.doctor?.id;
      const res = await api.get(`/doctors/${docId}/`);
      const slots = res.data.slots || [];
      const slotsForDate = slots.filter((s) => s.date === date && !s.is_blocked && (s.booked_count || 0) < (s.max_capacity || 5));
      setRescheduleModal((prev) => ({
        ...prev,
        selectedDate: date,
        availableSlots: slotsForDate,
        selectedSlotId: slotsForDate[0]?.id || '',
      }));
    } catch {
      toast.error('Failed to update date slots.');
    }
  };

  const submitReschedule = async (e) => {
    e.preventDefault();
    const { appointment, selectedSlotId, notes } = rescheduleModal;
    if (!selectedSlotId) {
      toast.error('Please select a target slot.');
      return;
    }
    setRescheduleModal((prev) => ({ ...prev, submitting: true }));
    try {
      const res = await api.post(`/appointments/admin/${appointment.id}/reschedule/`, {
        new_slot_id: selectedSlotId,
        notes: notes.trim() || 'Rescheduled via Hospital Queue Portal',
      });
      toast.success(res.data.message || 'Appointment rescheduled successfully.');
      setRescheduleModal((prev) => ({ ...prev, open: false, submitting: false }));
      fetchQueue();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to reschedule.');
      setRescheduleModal((prev) => ({ ...prev, submitting: false }));
    }
  };

  // Submit Cancellation
  const submitCancellation = async (e) => {
    e.preventDefault();
    const { appointment, reason, customReason } = cancelModal;
    if (!appointment) return;
    setCancelModal((prev) => ({ ...prev, submitting: true }));
    const finalReason = reason === 'Other' && customReason.trim() ? customReason.trim() : reason;
    try {
      await api.patch(`/appointments/admin/${appointment.id}/status/`, {
        status: 'cancelled',
        reason: finalReason,
      });
      toast.success('Appointment cancelled with 100% full refund.');
      setCancelModal({
        open: false,
        appointment: null,
        reason: 'Doctor Emergency / Hospital Schedule Realignment',
        customReason: '',
        submitting: false,
      });
      fetchQueue();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to cancel appointment.');
      setCancelModal((prev) => ({ ...prev, submitting: false }));
    }
  };

  const { summary } = data;

  return (
    <DashboardLayout
      role="hospital"
      title="Patient Admission Queue"
      subtitle="Live OP arrival monitoring, triage check-in, and consultation workflows."
      breadcrumbs={[
        { label: 'Hospital Portal', path: '/hospital/queue' },
        { label: 'Patient Queue' },
      ]}
      actions={
        <button
          onClick={fetchQueue}
          disabled={loading}
          className="cc-btn cc-btn-outline cc-btn-sm"
          title="Refresh Queue"
        >
          <RefreshCw size={14} className={loading ? 'spin' : ''} />
          <span>Refresh</span>
        </button>
      }
    >
      <div className="cc-queue-container">
        {/* Quick Summary & Admission Toolbar */}
        <section className="cc-queue-toolbar" aria-label="Queue Controls & Admission Status">
          <div className="cc-queue-toolbar-top">
            <div className="cc-queue-stats-group">
              {/* Preserves dynamic logic from Walk-In Reception banner in queue toolbar */}
              <span className="cc-stat-chip admission" id="badge-ready-to-admit">
                <CheckCircle2 size={16} />
                <span>Ready to Admit ({summary?.ready_to_admit || 0} Pending)</span>
              </span>
              <span className="cc-stat-chip waiting">
                <Clock size={15} />
                <span>Waiting In OP ({summary?.ready_to_admit || 0})</span>
              </span>
              <span className="cc-stat-chip in-chamber">
                <UserCheck size={15} />
                <span>In OP Chamber ({summary?.in_chamber || 0})</span>
              </span>
              <span className="cc-stat-chip completed">
                <CheckCircle2 size={15} />
                <span>Completed Today ({summary?.completed_today || 0})</span>
              </span>
            </div>

            {/* Page Size Selector */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.8125rem', color: '#64748b' }}>Show:</span>
              <select
                value={pageSize}
                onChange={(e) => updateParam('page_size', e.target.value)}
                className="cc-filter-select"
                style={{ width: 'auto', height: '32px', fontSize: '0.8125rem' }}
              >
                <option value="10">10 / page</option>
                <option value="25">25 / page</option>
                <option value="50">50 / page</option>
                <option value="100">100 / page</option>
              </select>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="cc-queue-filters-grid">
            {/* Search Input */}
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                placeholder="Search patient, phone, receipt..."
                value={search}
                onChange={(e) => updateParam('search', e.target.value)}
                className="cc-filter-input"
                style={{ paddingLeft: '2.25rem' }}
              />
              <Search
                size={16}
                style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}
              />
            </div>

            {/* Doctor Filter */}
            <select
              value={doctorId}
              onChange={(e) => updateParam('doctor_id', e.target.value)}
              className="cc-filter-select"
            >
              <option value="all">All Specialists</option>
              {data.doctors?.map((doc) => (
                <option key={doc.id} value={doc.id}>
                  Dr. {doc.name} ({doc.specialization})
                </option>
              ))}
            </select>

            {/* Specialization Filter */}
            <select
              value={specialization}
              onChange={(e) => updateParam('specialization', e.target.value)}
              className="cc-filter-select"
            >
              <option value="all">All Departments</option>
              {data.specializations?.map((spec) => (
                <option key={spec} value={spec}>{spec}</option>
              ))}
            </select>

            {/* OP Status Filter */}
            <select
              value={opStatus}
              onChange={(e) => updateParam('op_status', e.target.value)}
              className="cc-filter-select"
            >
              <option value="all">All Statuses</option>
              <option value="waiting">Waiting Arrival</option>
              <option value="checked_in">Checked-in (In OP)</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>

            {/* Date Range Filter */}
            <select
              value={range}
              onChange={(e) => updateParam('range', e.target.value)}
              className="cc-filter-select"
            >
              <option value="all">All Time</option>
              <option value="today">Today's Inflow</option>
              <option value="yesterday">Yesterday</option>
              <option value="upcoming_7">Next 7 Days</option>
              <option value="past_7">Past 7 Days</option>
              <option value="this_month">This Month</option>
            </select>
          </div>
        </section>

        {/* Patient Queue Data Table */}
        <section className="cc-card-table" aria-label="Patient Queue Table">
          <div className="cc-table-wrapper">
            <table className="cc-table">
              <thead>
                <tr>
                  <th>Patient & Family</th>
                  <th>Contact Info</th>
                  <th>Assigned Specialist</th>
                  <th>Consultation Slot</th>
                  <th>Tracking / Receipt</th>
                  <th>Fee</th>
                  <th>OP & Consultation Status</th>
                  <th>OP Staff Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading && data.results.length === 0 ? (
                  <tr>
                    <td colSpan="8" style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
                      <RefreshCw size={24} className="spin" style={{ margin: '0 auto 0.75rem', display: 'block', color: 'var(--cc-primary)' }} />
                      Loading patient queue...
                    </td>
                  </tr>
                ) : data.results.length === 0 ? (
                  <tr>
                    <td colSpan="8" style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
                      <Users size={32} style={{ margin: '0 auto 0.75rem', display: 'block', opacity: 0.4 }} />
                      No patient appointments found matching the selected filters.
                    </td>
                  </tr>
                ) : (
                  data.results.map((appt) => {
                    const isCheckedIn = appt.op_checked_in;
                    const isCompleted = appt.status === 'completed';
                    const isCancelled = appt.status === 'cancelled';
                    const isActionLoading = actionLoadingId === appt.id;

                    const patientName = appt.patient_name || appt.patient?.username || 'Patient';
                    const patientAge = appt.patient_age;
                    const patientGender = appt.patient_gender;
                    const patientRelation = appt.relationship && appt.relationship !== 'Self' ? appt.relationship : null;
                    const receiptId = appt.receipt_id || `APT-${appt.id}`;
                    const slotDate = appt.slot?.date || appt.slot_date || '';
                    const slotTime = appt.slot ? `${appt.slot.start_time} - ${appt.slot.end_time}` : (appt.slot_time || '');

                    return (
                      <tr key={appt.id}>
                        {/* Patient & Family */}
                        <td>
                          <div className="cc-patient-cell">
                            <div className="cc-patient-avatar">
                              {patientName.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="cc-patient-name">
                                <span>{patientName}</span>
                                {appt.patient_notes && (
                                  <span title={`Clinical Notes: ${appt.patient_notes}`} style={{ color: '#0d9488', fontSize: '0.75rem' }}>
                                    &bull;
                                  </span>
                                )}
                              </div>
                              <div className="cc-patient-meta">
                                {patientAge && <span>{patientAge} yrs</span>}
                                {patientGender && <span> &middot; {patientGender}</span>}
                                {patientRelation && <span style={{ color: '#0284c7' }}> &middot; {patientRelation}</span>}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Contact Info */}
                        <td>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            {appt.patient_phone ? (
                              <a
                                href={`tel:${appt.patient_phone}`}
                                style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#0284c7', textDecoration: 'none', fontWeight: 500 }}
                              >
                                <Phone size={13} />
                                <span>{appt.patient_phone}</span>
                              </a>
                            ) : (
                              <span style={{ color: '#94a3b8' }}>&mdash;</span>
                            )}
                            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                              {appt.patient_email || appt.patient?.email}
                            </span>
                          </div>
                        </td>

                        {/* Assigned Doctor */}
                        <td>
                          <div className="cc-doctor-name">
                            Dr. {appt.doctor?.name || appt.doctor_name}
                          </div>
                          <div className="cc-doctor-spec">
                            {appt.doctor?.specialization || appt.doctor_specialization}
                          </div>
                        </td>

                        {/* Consultation Slot */}
                        <td>
                          <div style={{ fontWeight: 600, color: 'var(--cc-slate-900)' }}>
                            {slotDate}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                            {slotTime}
                          </div>
                        </td>

                        {/* Tracking / Receipt */}
                        <td>
                          <button
                            type="button"
                            onClick={() => setSelectedInvoice(appt)}
                            className="cc-btn cc-btn-outline cc-btn-sm"
                            title="View Printable Tax Invoice"
                          >
                            <FileText size={13} />
                            <span>{receiptId}</span>
                          </button>
                        </td>

                        {/* Fee */}
                        <td>
                          <span style={{ fontWeight: 700, color: 'var(--cc-slate-900)' }}>
                            ₹{appt.fee_charged || appt.amount || 0}
                          </span>
                        </td>

                        {/* Status Badges */}
                        <td>
                          {isCompleted ? (
                            <span className="cc-status-pill cc-status-completed">
                              <CheckCircle2 size={12} />
                              Consultation Completed
                            </span>
                          ) : isCancelled ? (
                            <span className="cc-status-pill cc-status-cancelled">
                              <ShieldAlert size={12} />
                              Cancelled & Refunded
                            </span>
                          ) : isCheckedIn ? (
                            <span className="cc-status-pill cc-status-in-op">
                              <UserCheck size={12} />
                              In OP Chamber
                            </span>
                          ) : (
                            <span className="cc-status-pill cc-status-waiting">
                              <Clock size={12} />
                              Waiting Arrival
                            </span>
                          )}
                        </td>

                        {/* OP Staff Actions */}
                        <td>
                          <div className="cc-action-group">
                            {!isCompleted && !isCancelled && (
                              <>
                                {!isCheckedIn ? (
                                  <button
                                    type="button"
                                    onClick={() => handleCheckIn(appt.id)}
                                    disabled={isActionLoading}
                                    className="cc-btn cc-btn-teal cc-btn-sm"
                                    title="Check in patient upon arrival"
                                  >
                                    <UserCheck size={13} />
                                    <span>{isActionLoading ? 'Checking in...' : 'Accept Patient'}</span>
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => handleCompleteConsultation(appt.id)}
                                    disabled={isActionLoading}
                                    className="cc-btn cc-btn-primary cc-btn-sm"
                                    title="Mark consultation as completed"
                                  >
                                    <CheckCircle2 size={13} />
                                    <span>{isActionLoading ? 'Saving...' : 'Complete Consultation'}</span>
                                  </button>
                                )}

                                <button
                                  type="button"
                                  onClick={() => openRescheduleModal(appt)}
                                  disabled={isActionLoading}
                                  className="cc-btn cc-btn-outline cc-btn-sm"
                                  title="Reschedule to another slot"
                                >
                                  <RotateCcw size={13} />
                                  <span>Reschedule</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => setCancelModal({
                                    open: true,
                                    appointment: appt,
                                    reason: 'Doctor Emergency / Hospital Schedule Realignment',
                                    customReason: '',
                                    submitting: false,
                                  })}
                                  disabled={isActionLoading}
                                  className="cc-btn cc-btn-danger-outline cc-btn-sm"
                                  title="Authorize 100% full refund & cancel"
                                >
                                  <ShieldAlert size={13} />
                                  <span>Cancel & Refund</span>
                                </button>
                              </>
                            )}
                            {isCompleted && (
                              <span style={{ fontSize: '0.75rem', color: '#059669', fontWeight: 600 }}>
                                Finished
                              </span>
                            )}
                            {isCancelled && (
                              <span style={{ fontSize: '0.75rem', color: '#dc2626', fontWeight: 600 }}>
                                100% Refunded
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          <div className="cc-pagination-bar">
            <div className="cc-page-info">
              Showing <strong>{data.results.length}</strong> of <strong>{data.count}</strong> appointments &middot; Page <strong>{data.current_page}</strong> of <strong>{data.total_pages || 1}</strong>
            </div>

            <div className="cc-pagination-controls">
              <button
                type="button"
                onClick={() => updateParam('page', Math.max(1, page - 1).toString())}
                disabled={page <= 1 || loading}
                className="cc-btn cc-btn-outline cc-btn-sm"
              >
                <ChevronLeft size={14} />
                <span>Previous</span>
              </button>

              <span style={{ fontSize: '0.8125rem', padding: '0 0.5rem', fontWeight: 600 }}>
                {data.current_page} / {data.total_pages || 1}
              </span>

              <button
                type="button"
                onClick={() => updateParam('page', (page + 1).toString())}
                disabled={page >= data.total_pages || loading}
                className="cc-btn cc-btn-outline cc-btn-sm"
              >
                <span>Next</span>
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </section>
      </div>

      {/* Invoice Modal */}
      {selectedInvoice && (
        <InvoiceModal
          data={selectedInvoice}
          onClose={() => setSelectedInvoice(null)}
        />
      )}

      {/* Reschedule Modal */}
      {rescheduleModal.open && rescheduleModal.appointment && (
        <div className="cc-modal-backdrop" onClick={() => setRescheduleModal({ ...rescheduleModal, open: false })}>
          <div className="cc-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="cc-modal-header">
              <h3 className="cc-modal-title">
                <RotateCcw size={20} color="var(--cc-primary)" />
                Reschedule Patient Appointment
              </h3>
              <button
                type="button"
                onClick={() => setRescheduleModal({ ...rescheduleModal, open: false })}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={submitReschedule}>
              <div className="cc-modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ background: '#f8fafc', padding: '0.875rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontWeight: 700, color: 'var(--cc-slate-900)' }}>
                    Patient: {rescheduleModal.appointment.patient_name || rescheduleModal.appointment.patient?.username}
                  </div>
                  <div style={{ fontSize: '0.8125rem', color: '#0d9488', marginTop: '2px' }}>
                    Dr. {rescheduleModal.appointment.doctor?.name || rescheduleModal.appointment.doctor_name}
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '4px' }}>
                    Select New Consultation Date:
                  </label>
                  {rescheduleModal.availableDates.length > 0 ? (
                    <select
                      value={rescheduleModal.selectedDate}
                      onChange={(e) => handleRescheduleDateChange(e.target.value)}
                      className="cc-filter-select"
                    >
                      {rescheduleModal.availableDates.map((d) => (
                        <option key={d} value={d}>📅 {d}</option>
                      ))}
                    </select>
                  ) : (
                    <div style={{ padding: '0.75rem', background: '#fef2f2', color: '#991b1b', borderRadius: '6px', fontSize: '0.8125rem' }}>
                      {rescheduleModal.loadingSlots ? 'Scanning doctor schedule...' : 'No open future slots available for this doctor.'}
                    </div>
                  )}
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '4px' }}>
                    Select New Time Slot:
                  </label>
                  {rescheduleModal.availableSlots.length > 0 ? (
                    <select
                      value={rescheduleModal.selectedSlotId}
                      onChange={(e) => setRescheduleModal({ ...rescheduleModal, selectedSlotId: e.target.value })}
                      className="cc-filter-select"
                    >
                      {rescheduleModal.availableSlots.map((s) => (
                        <option key={s.id} value={s.id}>
                          🕒 {s.start_time} - {s.end_time} ({s.booked_count || 0}/5 Booked)
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div style={{ padding: '0.75rem', background: '#f8fafc', color: '#64748b', borderRadius: '6px', fontSize: '0.8125rem' }}>
                      No available slots on this date.
                    </div>
                  )}
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '4px' }}>
                    Reschedule Note / Reason:
                  </label>
                  <input
                    type="text"
                    value={rescheduleModal.notes}
                    onChange={(e) => setRescheduleModal({ ...rescheduleModal, notes: e.target.value })}
                    placeholder="E.g. Schedule adjustment per patient/doctor request"
                    className="cc-filter-input"
                  />
                </div>
              </div>

              <div className="cc-modal-footer">
                <button
                  type="button"
                  onClick={() => setRescheduleModal({ ...rescheduleModal, open: false })}
                  className="cc-btn cc-btn-outline"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={rescheduleModal.submitting || !rescheduleModal.selectedSlotId}
                  className="cc-btn cc-btn-primary"
                >
                  {rescheduleModal.submitting ? 'Rescheduling...' : 'Confirm Reschedule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Cancel & 100% Refund Modal */}
      {cancelModal.open && cancelModal.appointment && (
        <div className="cc-modal-backdrop" onClick={() => setCancelModal({ ...cancelModal, open: false })}>
          <div className="cc-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="cc-modal-header">
              <h3 className="cc-modal-title" style={{ color: '#dc2626' }}>
                <ShieldAlert size={20} />
                Cancel & Authorize 100% Full Refund
              </h3>
              <button
                type="button"
                onClick={() => setCancelModal({ ...cancelModal, open: false })}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={submitCancellation}>
              <div className="cc-modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ background: '#fef2f2', padding: '0.875rem', borderRadius: '8px', border: '1px solid #fecaca' }}>
                  <div style={{ fontWeight: 700, color: '#991b1b' }}>
                    Patient: {cancelModal.appointment.patient_name || cancelModal.appointment.patient?.username}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid #fecaca' }}>
                    <span style={{ fontSize: '0.8125rem', color: '#991b1b', fontWeight: 600 }}>Refund Amount (Zero Deduction):</span>
                    <span style={{ fontSize: '1rem', color: '#15803d', fontWeight: 800 }}>
                      ₹{cancelModal.appointment.fee_charged || cancelModal.appointment.amount || 0}
                    </span>
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '4px' }}>
                    Select Cancellation Reason:
                  </label>
                  <select
                    value={cancelModal.reason}
                    onChange={(e) => setCancelModal({ ...cancelModal, reason: e.target.value })}
                    className="cc-filter-select"
                  >
                    <option value="Doctor Emergency / Hospital Schedule Realignment">Doctor Emergency / Hospital Schedule Realignment</option>
                    <option value="Doctor Unwell / Medical Leave">Doctor Unwell / Medical Leave</option>
                    <option value="Patient Emergency Request">Patient Emergency Request</option>
                    <option value="Hospital Facility / OPD Maintenance">Hospital Facility / OPD Maintenance</option>
                    <option value="Other">Other Reason</option>
                  </select>

                  {cancelModal.reason === 'Other' && (
                    <textarea
                      rows={2}
                      placeholder="Specify reason..."
                      value={cancelModal.customReason}
                      onChange={(e) => setCancelModal({ ...cancelModal, customReason: e.target.value })}
                      className="cc-filter-input"
                      style={{ height: 'auto', marginTop: '8px', padding: '8px' }}
                    />
                  )}
                </div>
              </div>

              <div className="cc-modal-footer">
                <button
                  type="button"
                  onClick={() => setCancelModal({ ...cancelModal, open: false })}
                  className="cc-btn cc-btn-outline"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={cancelModal.submitting}
                  className="cc-btn cc-btn-danger-outline"
                  style={{ background: '#dc2626', color: '#ffffff' }}
                >
                  {cancelModal.submitting ? 'Processing 100% Refund...' : 'Authorize 100% Refund & Cancel'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
