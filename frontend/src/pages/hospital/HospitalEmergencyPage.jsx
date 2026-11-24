import React, { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { useToast } from '../../context/ToastContext';
import api from '../../api/client';
import {
  AlertTriangle,
  RotateCcw,
  ShieldAlert,
  Users,
  CheckCircle2,
  RefreshCw,
  Phone,
  FileText,
  Clock,
  X
} from 'lucide-react';
import './HospitalPages.css';
import './HospitalQueuePage.css';

export default function HospitalEmergencyPage() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [appointments, setAppointments] = useState([]);
  const [actionLoadingId, setActionLoadingId] = useState(null);

  const fetchEmergencyAppts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/appointments/hospital/emergency/');
      setAppointments(res.data.appointments || []);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to load emergency hub.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEmergencyAppts();
  }, [fetchEmergencyAppts]);

  const handleCancelOne = async (appt) => {
    setActionLoadingId(appt.id);
    try {
      await api.patch(`/appointments/admin/${appt.id}/status/`, {
        status: 'cancelled',
        reason: 'Emergency Hub 100% Refund Resolution',
      });
      toast.success(`Patient '${appt.patient_name || 'Patient'}' refunded 100% and notified.`);
      fetchEmergencyAppts();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to cancel appointment.');
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <DashboardLayout
      role="hospital"
      title="Emergency Slot Resolution Hub"
      subtitle="Rapid incident mitigation, mass patient re-assignment, and 100% automated refund processing."
      breadcrumbs={[
        { label: 'Hospital Portal', path: '/hospital/queue' },
        { label: 'Emergency Hub' },
      ]}
      actions={
        <button
          onClick={fetchEmergencyAppts}
          disabled={loading}
          className="cc-btn cc-btn-outline cc-btn-sm"
        >
          <RefreshCw size={14} className={loading ? 'spin' : ''} />
          <span>Refresh</span>
        </button>
      }
    >
      <div className="cc-queue-container">
        {/* Hub Summary Toolbar */}
        <div className="cc-queue-toolbar">
          <div className="cc-queue-toolbar-top">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              <span className="cc-stat-chip waiting">
                <AlertTriangle size={15} />
                <span>{appointments.length} Patients Requiring Resolution</span>
              </span>
              <span className="cc-stat-chip admission">
                <ShieldAlert size={15} />
                <span>100% Full Refund Policy Active (₹0 deductions)</span>
              </span>
            </div>
          </div>
        </div>

        {/* Affected Appointments Table */}
        <div className="cc-card-table">
          <div className="cc-table-wrapper">
            <table className="cc-table">
              <thead>
                <tr>
                  <th>Patient & Contact</th>
                  <th>Assigned Specialist</th>
                  <th>Scheduled Slot</th>
                  <th>Fee Charged</th>
                  <th>Current Status</th>
                  <th>Audit / Incident Notes</th>
                  <th>Emergency Action</th>
                </tr>
              </thead>
              <tbody>
                {loading && appointments.length === 0 ? (
                  <tr>
                    <td colSpan="7" style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
                      <RefreshCw size={24} className="spin" style={{ margin: '0 auto 0.5rem', display: 'block', color: 'var(--cc-primary)' }} />
                      Scanning appointments requiring emergency triage...
                    </td>
                  </tr>
                ) : appointments.length === 0 ? (
                  <tr>
                    <td colSpan="7" style={{ textAlign: 'center', padding: '3.5rem', color: '#059669' }}>
                      <CheckCircle2 size={36} style={{ margin: '0 auto 0.75rem', display: 'block', color: '#10b981' }} />
                      <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--cc-slate-800)' }}>
                        All Clinical Slots & Patients Normal
                      </div>
                      <div style={{ fontSize: '0.8125rem', color: '#64748b', marginTop: '4px' }}>
                        No appointments currently blocked or flagged for emergency cancellation.
                      </div>
                    </td>
                  </tr>
                ) : (
                  appointments.map((appt) => {
                    const isActionLoading = actionLoadingId === appt.id;
                    const patientName = appt.patient_name || appt.patient?.username || 'Patient';
                    const slotDate = appt.slot?.date || appt.slot_date;
                    const slotTime = appt.slot ? `${appt.slot.start_time} - ${appt.slot.end_time}` : appt.slot_time;

                    return (
                      <tr key={appt.id}>
                        <td>
                          <div style={{ fontWeight: 600, color: 'var(--cc-slate-900)' }}>{patientName}</div>
                          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                            {appt.patient_phone || appt.patient_email}
                          </div>
                        </td>
                        <td>
                          <div style={{ fontWeight: 600, color: 'var(--cc-slate-900)' }}>
                            Dr. {appt.doctor?.name || appt.doctor_name}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--cc-teal-dark)' }}>
                            {appt.doctor?.specialization || appt.doctor_specialization}
                          </div>
                        </td>
                        <td>
                          <div style={{ fontWeight: 600 }}>{slotDate}</div>
                          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{slotTime}</div>
                        </td>
                        <td>
                          <span style={{ fontWeight: 700, color: 'var(--cc-slate-900)' }}>
                            ₹{appt.fee_charged || appt.amount || 0}
                          </span>
                        </td>
                        <td>
                          <span className="cc-status-pill cc-status-waiting">
                            {appt.status}
                          </span>
                        </td>
                        <td>
                          <span style={{ fontSize: '0.8125rem', color: '#dc2626', fontWeight: 500 }}>
                            {appt.notes || 'Doctor slot blocked / schedule disrupted'}
                          </span>
                        </td>
                        <td>
                          <button
                            type="button"
                            onClick={() => handleCancelOne(appt)}
                            disabled={isActionLoading}
                            className="cc-btn cc-btn-danger-outline cc-btn-sm"
                          >
                            <ShieldAlert size={13} />
                            <span>{isActionLoading ? 'Refunding...' : 'Authorize 100% Refund'}</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
