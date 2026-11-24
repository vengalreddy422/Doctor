import React, { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { useToast } from '../../context/ToastContext';
import api from '../../api/client';
import {
  CalendarCheck,
  Search,
  Filter,
  Lock,
  Unlock,
  AlertTriangle,
  RefreshCw,
  Clock,
  CheckCircle2,
  XCircle,
  X
} from 'lucide-react';
import './HospitalPages.css';
import './HospitalQueuePage.css';

export default function HospitalSlotsPage() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [slots, setSlots] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState('all');
  const [selectedDate, setSelectedDate] = useState('');
  const [togglingSlotId, setTogglingSlotId] = useState(null);

  // Slot Resolution Modal
  const [resolutionModal, setResolutionModal] = useState({
    open: false,
    slot: null,
    resolution: 'refund', // 'refund' | 'reschedule'
    reason: 'Doctor Emergency / Schedule Realignment',
    customReason: '',
    submitting: false,
  });

  const fetchSlots = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedDoctorId !== 'all') params.set('doctor_id', selectedDoctorId);
      if (selectedDate) params.set('date', selectedDate);
      const res = await api.get(`/appointments/hospital/slots/?${params.toString()}`);
      setSlots(res.data.slots || []);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to load slots.');
    } finally {
      setLoading(false);
    }
  }, [selectedDoctorId, selectedDate]);

  useEffect(() => {
    fetchSlots();
    // Load doctor list for dropdown
    api.get('/appointments/hospital/doctors/').then((res) => {
      setDoctors(res.data.doctors || []);
    }).catch(() => {});
  }, [fetchSlots]);

  const handleToggleBlock = async (slot) => {
    setTogglingSlotId(slot.id);
    try {
      const res = await api.post('/appointments/hospital/slots/', { slot_id: slot.id });
      toast.success(res.data.message || 'Slot state updated.');
      fetchSlots();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to toggle slot.');
    } finally {
      setTogglingSlotId(null);
    }
  };

  const handleExecuteResolution = async (e) => {
    e.preventDefault();
    const { slot, resolution, reason, customReason } = resolutionModal;
    if (!slot) return;

    setResolutionModal((prev) => ({ ...prev, submitting: true }));
    const finalReason = reason === 'Other' && customReason.trim() ? customReason.trim() : reason;
    try {
      const res = await api.post('/appointments/hospital/emergency/', {
        slot_id: slot.id,
        resolution,
        reason: finalReason,
      });
      toast.success(res.data.message || 'Emergency resolution completed.');
      setResolutionModal({
        open: false,
        slot: null,
        resolution: 'refund',
        reason: 'Doctor Emergency / Schedule Realignment',
        customReason: '',
        submitting: false,
      });
      fetchSlots();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to execute emergency resolution.');
      setResolutionModal((prev) => ({ ...prev, submitting: false }));
    }
  };

  return (
    <DashboardLayout
      role="hospital"
      title="Slot Capacity & Intake Monitor"
      subtitle="Real-time 5-seat capacity tracking, occupancy limits, and on-demand slot locking."
      breadcrumbs={[
        { label: 'Hospital Portal', path: '/hospital/queue' },
        { label: 'Slot Monitor' },
      ]}
      actions={
        <button
          onClick={fetchSlots}
          disabled={loading}
          className="cc-btn cc-btn-outline cc-btn-sm"
        >
          <RefreshCw size={14} className={loading ? 'spin' : ''} />
          <span>Refresh</span>
        </button>
      }
    >
      <div className="cc-queue-container">
        {/* Filter Toolbar */}
        <div className="cc-queue-toolbar">
          <div className="cc-queue-toolbar-top">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              <span className="cc-stat-chip admission">
                <CalendarCheck size={15} />
                <span>{slots.length} Active Slots Loaded</span>
              </span>
              <span className="cc-stat-chip waiting">
                <Lock size={14} />
                <span>{slots.filter((s) => s.is_blocked).length} Blocked</span>
              </span>
              <span className="cc-stat-chip completed">
                <CheckCircle2 size={14} />
                <span>{slots.filter((s) => !s.is_blocked && !s.is_full).length} Open for Intake</span>
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              <select
                value={selectedDoctorId}
                onChange={(e) => setSelectedDoctorId(e.target.value)}
                className="cc-filter-select"
                style={{ width: '220px' }}
              >
                <option value="all">All Attending Doctors</option>
                {doctors.map((doc) => (
                  <option key={doc.id} value={doc.id}>
                    Dr. {doc.name} ({doc.specialization})
                  </option>
                ))}
              </select>

              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="cc-filter-input"
                style={{ width: '160px' }}
              />

              {selectedDate && (
                <button
                  type="button"
                  onClick={() => setSelectedDate('')}
                  className="cc-btn cc-btn-outline cc-btn-sm"
                  title="Clear Date"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Slots Grid */}
        {loading && slots.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
            <RefreshCw size={24} className="spin" style={{ margin: '0 auto 0.5rem', display: 'block', color: 'var(--cc-primary)' }} />
            Loading clinical slots...
          </div>
        ) : slots.length === 0 ? (
          <div className="cc-card-table" style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
            <CalendarCheck size={36} style={{ margin: '0 auto 0.75rem', display: 'block', opacity: 0.4 }} />
            No consultation slots found matching criteria.
          </div>
        ) : (
          <div className="cc-slots-grid">
            {slots.map((s) => {
              const isToggling = togglingSlotId === s.id;
              const rate = s.occupancy_rate || 0;
              const barClass = s.is_blocked ? 'red' : rate >= 80 ? 'amber' : 'green';

              return (
                <div key={s.id} className={`cc-slot-card ${s.is_blocked ? 'blocked' : ''}`}>
                  <div>
                    <div className="cc-slot-card-header">
                      <div>
                        <div style={{ fontWeight: 700, color: 'var(--cc-slate-900)' }}>
                          Dr. {s.doctor_name}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--cc-teal-dark)' }}>
                          {s.doctor_specialization}
                        </div>
                      </div>

                      <span
                        className="cc-status-pill"
                        style={{
                          background: s.is_blocked ? '#fef2f2' : s.is_full ? '#fffbeb' : '#ecfdf5',
                          color: s.is_blocked ? '#991b1b' : s.is_full ? '#92400e' : '#065f46',
                          borderColor: s.is_blocked ? '#fecaca' : s.is_full ? '#fde68a' : '#a7f3d0',
                        }}
                      >
                        {s.is_blocked ? 'Blocked' : s.is_full ? 'Full (5/5)' : `${s.booked_count}/5 Booked`}
                      </span>
                    </div>

                    <div style={{ marginTop: '0.75rem' }}>
                      <div className="cc-slot-time-badge">
                        🕒 {s.start_time} - {s.end_time}
                      </div>
                      <div style={{ fontSize: '0.8125rem', color: '#64748b', marginTop: '2px' }}>
                        📅 {s.date}
                      </div>
                    </div>

                    <div style={{ marginTop: '0.75rem' }}>
                      <div className="cc-slot-capacity-info">
                        <span style={{ color: '#64748b' }}>Occupancy</span>
                        <span>{s.booked_count} of 5 Seats ({rate}%)</span>
                      </div>
                      <div className="cc-progress-track" style={{ marginTop: '4px' }}>
                        <div
                          className={`cc-progress-bar ${barClass}`}
                          style={{ width: `${Math.min(100, rate)}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  <div style={{ borderTop: '1px solid var(--cc-slate-100)', paddingTop: '0.75rem', display: 'flex', justifyContent: 'space-between', gap: '0.5rem' }}>
                    <button
                      type="button"
                      onClick={() => handleToggleBlock(s)}
                      disabled={isToggling}
                      className={`cc-btn cc-btn-sm ${s.is_blocked ? 'cc-btn-teal' : 'cc-btn-outline'}`}
                      style={{ flex: 1 }}
                    >
                      {s.is_blocked ? <Unlock size={13} /> : <Lock size={13} />}
                      <span>{s.is_blocked ? 'Unblock Slot' : 'Block Slot'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setResolutionModal({
                        open: true,
                        slot: s,
                        resolution: 'refund',
                        reason: 'Doctor Emergency / Schedule Realignment',
                        customReason: '',
                        submitting: false,
                      })}
                      className="cc-btn cc-btn-danger-outline cc-btn-sm"
                      title="Emergency Cancel & Resolve Patient Appointments"
                    >
                      <AlertTriangle size={13} />
                      <span>Resolve Hub</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Slot Emergency Resolution Modal */}
      {resolutionModal.open && resolutionModal.slot && (
        <div className="cc-modal-backdrop" onClick={() => setResolutionModal({ ...resolutionModal, open: false })}>
          <div className="cc-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="cc-modal-header">
              <h3 className="cc-modal-title" style={{ color: '#dc2626' }}>
                <AlertTriangle size={20} />
                Emergency Slot Resolution Hub
              </h3>
              <button
                type="button"
                onClick={() => setResolutionModal({ ...resolutionModal, open: false })}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleExecuteResolution}>
              <div className="cc-modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ background: '#fef2f2', padding: '0.875rem', borderRadius: '8px', border: '1px solid #fecaca' }}>
                  <div style={{ fontWeight: 700, color: '#991b1b' }}>
                    Dr. {resolutionModal.slot.doctor_name} &middot; 📅 {resolutionModal.slot.date} ({resolutionModal.slot.start_time} - {resolutionModal.slot.end_time})
                  </div>
                  <div style={{ fontSize: '0.8125rem', color: '#7f1d1d', marginTop: '4px' }}>
                    Affected Patients: <strong>{resolutionModal.slot.booked_count} Booked Appointments</strong>
                  </div>
                </div>

                <div>
                  <label className="cc-form-label" style={{ marginBottom: '6px' }}>Select Resolution Method:</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem', border: '1px solid #e2e8f0', borderRadius: '6px', cursor: 'pointer' }}>
                      <input
                        type="radio"
                        name="resolution"
                        value="refund"
                        checked={resolutionModal.resolution === 'refund'}
                        onChange={(e) => setResolutionModal({ ...resolutionModal, resolution: e.target.value })}
                      />
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.8125rem', color: '#dc2626' }}>Cancel & Authorize 100% Full Refund</div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Zero deductions with automatic patient apology email dispatch.</div>
                      </div>
                    </label>

                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem', border: '1px solid #e2e8f0', borderRadius: '6px', cursor: 'pointer' }}>
                      <input
                        type="radio"
                        name="resolution"
                        value="reschedule"
                        checked={resolutionModal.resolution === 'reschedule'}
                        onChange={(e) => setResolutionModal({ ...resolutionModal, resolution: e.target.value })}
                      />
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.8125rem', color: 'var(--cc-primary)' }}>Auto-Reschedule to Next Open Slot</div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Transfers patients to the doctor's earliest unblocked slot.</div>
                      </div>
                    </label>
                  </div>
                </div>

                <div>
                  <label className="cc-form-label">Official Cancellation Reason:</label>
                  <select
                    value={resolutionModal.reason}
                    onChange={(e) => setResolutionModal({ ...resolutionModal, reason: e.target.value })}
                    className="cc-filter-select"
                  >
                    <option value="Doctor Emergency / Schedule Realignment">Doctor Emergency / Schedule Realignment</option>
                    <option value="Doctor Medical Leave">Doctor Medical Leave</option>
                    <option value="OPD Facility Maintenance">OPD Facility Maintenance</option>
                    <option value="Other">Other Reason</option>
                  </select>

                  {resolutionModal.reason === 'Other' && (
                    <textarea
                      rows={2}
                      placeholder="Specify reason..."
                      value={resolutionModal.customReason}
                      onChange={(e) => setResolutionModal({ ...resolutionModal, customReason: e.target.value })}
                      className="cc-filter-input"
                      style={{ height: 'auto', marginTop: '8px', padding: '8px' }}
                    />
                  )}
                </div>
              </div>

              <div className="cc-modal-footer">
                <button
                  type="button"
                  onClick={() => setResolutionModal({ ...resolutionModal, open: false })}
                  className="cc-btn cc-btn-outline"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={resolutionModal.submitting}
                  className="cc-btn cc-btn-danger-outline"
                  style={{ background: '#dc2626', color: '#ffffff' }}
                >
                  {resolutionModal.submitting ? 'Executing Resolution...' : 'Confirm & Notify Patients'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
