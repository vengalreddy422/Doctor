import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import Alert from '../components/Alert';
import InvoiceModal from '../components/InvoiceModal';
import '../styles/AdminDashboard.css';
import {
  Building2, Users, Calendar, Clock, DollarSign, Search,
  Filter, RefreshCw, CheckCircle2, XCircle, ChevronLeft,
  ChevronRight, Edit3, Plus, Phone, Mail, MapPin, Navigation,
  Activity, ArrowUpRight, Check, X, Lock, Unlock, Eye,
  CalendarDays, TrendingUp, Stethoscope, AlertCircle, FileText,
  ExternalLink, ShieldAlert, RotateCcw, LogOut, ShieldCheck,
  AlertTriangle, CheckCheck, Sparkles, UserCheck
} from 'lucide-react';
import { getDoctorAvatar } from '../utils/doctorAvatars';

const HospitalDashboardPage = () => {
  const { user, logout, isAdmin, isHospital } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const hospitalParam = searchParams.get('hospital_name') || searchParams.get('hospital') || '';

  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [alertInfo, setAlertInfo] = useState({ type: '', message: '' });

  // Active Tab: 'overview' | 'patients' | 'doctors' | 'slots' | 'cancel_reschedule'
  const [activeTab, setActiveTab] = useState('overview');

  // Filters
  const [dateRange, setDateRange] = useState('all'); // 'today' | 'yesterday' | 'upcoming_7' | 'past_7' | 'this_month' | 'all' | 'custom'
  const [customDate, setCustomDate] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedDoctorId, setSelectedDoctorId] = useState('all');
  const [selectedSpecialist, setSelectedSpecialist] = useState('all');
  const [opStatusFilter, setOpStatusFilter] = useState('all'); // 'all' | 'checked_in' | 'waiting' | 'completed' | 'cancelled'
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedHospital, setSelectedHospital] = useState(hospitalParam || user?.hospital_name || '');
  const [doctorFilter, setDoctorFilter] = useState('all'); // 'all' | 'today' | 'active' | 'inactive'

  // Doctor Quick Edit Modal State
  const [editingDoctor, setEditingDoctor] = useState(null);
  const [editFormData, setEditFormData] = useState({});
  const [editLoading, setEditLoading] = useState(false);

  // Slot Cancellation & Auto-Reschedule Modal State
  const [cancelSlotModal, setCancelSlotModal] = useState({
    open: false,
    slot: null,
    action: 'auto_reschedule', // 'auto_reschedule' | 'cancel_refund'
    reason: 'Doctor Emergency / Unavoidable Clinical Duty',
    customReason: '',
    submitting: false,
  });

  // Individual Appointment Reschedule Modal State
  const [rescheduleModal, setRescheduleModal] = useState({
    open: false,
    appointment: null,
    doctorId: null,
    availableDates: [],
    selectedDate: '',
    availableSlots: [],
    selectedSlotId: '',
    notes: '',
    loadingSlots: false,
    submitting: false,
  });

  // Individual Appointment Cancel & 100% Refund Modal State
  const [cancelApptModal, setCancelApptModal] = useState({
    open: false,
    appointment: null,
    reason: 'Doctor Emergency / Hospital Schedule Realignment',
    customReason: '',
    submitting: false,
  });

  // Selected Invoice Modal
  const [selectedInvoice, setSelectedInvoice] = useState(null);

  const fetchHospitalStats = async (isSync = false) => {
    if (isSync) setRefreshing(true);
    else setLoading(true);

    try {
      const params = {
        hospital_name: selectedHospital,
        range: dateRange === 'custom' ? '' : dateRange,
        date: dateRange === 'custom' ? customDate : '',
        status: statusFilter,
        doctor_id: selectedDoctorId,
        specialization: selectedSpecialist,
        op_status: opStatusFilter,
        search: searchQuery,
      };
      if (isSync) {
        params.refresh = 'true';
      }

      const res = await api.get('/appointments/hospital/stats/', { params });
      setStats(res.data);
      if (!selectedHospital && res.data.hospital_name) {
        setSelectedHospital(res.data.hospital_name);
      }
    } catch (err) {
      console.error("Error loading hospital dashboard data:", err);
      setAlertInfo({ type: 'error', message: 'Failed to load dynamic hospital analytics.' });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchHospitalStats();
  }, [selectedHospital, dateRange, customDate, statusFilter, selectedDoctorId, selectedSpecialist, opStatusFilter]);

  // Tab switch real-time sync
  useEffect(() => {
    if (activeTab === 'slots' || activeTab === 'overview' || activeTab === 'patients') {
      fetchHospitalStats(true);
    }
  }, [activeTab]);

  // Background auto-refresh polling every 25s for live doctor slot booking synchronization
  useEffect(() => {
    const timer = setInterval(() => {
      fetchHospitalStats(true);
    }, 25000);
    return () => clearInterval(timer);
  }, [selectedHospital, dateRange, customDate, statusFilter, selectedDoctorId, selectedSpecialist, opStatusFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchHospitalStats();
  };

  // Sign out handler
  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Toggle slot block for doctor
  const handleToggleSlot = async (slotId) => {
    try {
      const res = await api.post(`/appointments/admin/slots/${slotId}/toggle-block/`);
      setAlertInfo({ type: 'info', message: res.data.message });
      fetchHospitalStats(true);
    } catch (err) {
      setAlertInfo({ type: 'error', message: 'Failed to toggle slot status.' });
    }
  };

  // Hospital OP Check-in Handler
  const handleCheckInPatient = async (apptId, patientName) => {
    try {
      const res = await api.post(`/appointments/${apptId}/check-in/`);
      setAlertInfo({
        type: 'success',
        message: `🏥 Patient '${patientName || 'Patient'}' acknowledged & marked as Checked-In at OP!`
      });
      fetchHospitalStats(true);
    } catch (err) {
      setAlertInfo({ type: 'error', message: 'Failed to acknowledge patient check-in.' });
    }
  };

  // Hospital Complete Consultation Handler
  const handleCompleteConsultation = async (apptId, patientName) => {
    try {
      const res = await api.post(`/appointments/${apptId}/complete/`);
      setAlertInfo({
        type: 'success',
        message: `✅ Consultation for '${patientName || 'Patient'}' marked as COMPLETED. Patient dashboard updated to allow reviews and ratings.`
      });
      fetchHospitalStats(true);
    } catch (err) {
      setAlertInfo({ type: 'error', message: 'Failed to mark consultation as completed.' });
    }
  };

  // Status Change for Hospital Appointment
  const handleQuickStatusUpdate = async (apptId, newStatus) => {
    try {
      await api.patch(`/appointments/admin/${apptId}/status/`, { status: newStatus });
      setAlertInfo({ type: 'success', message: `Appointment status updated to ${newStatus.toUpperCase()}` });
      fetchHospitalStats(true);
    } catch (err) {
      setAlertInfo({ type: 'error', message: 'Failed to update appointment status.' });
    }
  };

  // Open Reschedule Modal for an appointment
  const openRescheduleModal = async (appt) => {
    const docId = appt.doctor_id || appt.doctor?.id;
    setRescheduleModal({
      open: true,
      appointment: appt,
      doctorId: docId,
      availableDates: [],
      selectedDate: '',
      availableSlots: [],
      selectedSlotId: '',
      notes: '',
      loadingSlots: true,
      submitting: false,
    });

    if (docId) {
      try {
        const datesRes = await api.get(`/doctors/${docId}/available-dates/`);
        const dates = datesRes.data.available_dates || [];
        setRescheduleModal((prev) => ({
          ...prev,
          availableDates: dates,
          selectedDate: dates[0] || '',
          loadingSlots: false,
        }));

        if (dates[0]) {
          loadSlotsForDate(docId, dates[0]);
        }
      } catch (err) {
        console.error("Error loading doctor available dates:", err);
        setRescheduleModal((prev) => ({ ...prev, loadingSlots: false }));
      }
    }
  };

  const loadSlotsForDate = async (docId, dateStr) => {
    try {
      const res = await api.get(`/doctors/${docId}/slots/?date=${dateStr}`);
      const slots = res.data.slots || res.data || [];
      const openSlots = Array.isArray(slots)
        ? slots.filter(s => !s.is_past && !s.is_blocked && !s.is_full && ((s.booked_count ?? s.booked ?? 0) < (s.max_capacity || 5)))
        : [];
      setRescheduleModal((prev) => ({
        ...prev,
        availableSlots: openSlots,
        selectedSlotId: openSlots[0]?.id || '',
      }));
    } catch (err) {
      console.error("Error loading slots for date:", err);
    }
  };

  const handleRescheduleDateChange = (newDate) => {
    setRescheduleModal((prev) => ({
      ...prev,
      selectedDate: newDate,
      selectedSlotId: '',
      availableSlots: []
    }));
    if (rescheduleModal.doctorId && newDate) {
      loadSlotsForDate(rescheduleModal.doctorId, newDate);
    }
  };

  const handleExecuteReschedule = async (e) => {
    e.preventDefault();
    const { appointment, selectedSlotId, notes } = rescheduleModal;
    if (!appointment || !selectedSlotId) {
      setAlertInfo({ type: 'error', message: 'Please select a valid new consultation slot.' });
      return;
    }

    setRescheduleModal((prev) => ({ ...prev, submitting: true }));
    try {
      const res = await api.post(`/appointments/admin/${appointment.id}/reschedule/`, {
        new_slot_id: selectedSlotId,
        notes: notes.trim() || 'Rescheduled via Hospital Cancellation & Rescheduling Hub',
      });
      setAlertInfo({
        type: 'success',
        message: res.data.message || 'Appointment rescheduled successfully! Patient has been notified via email.'
      });
      setRescheduleModal((prev) => ({ ...prev, open: false, submitting: false }));
      fetchHospitalStats(true);
    } catch (err) {
      const msg = err.response?.data?.error || 'Failed to reschedule appointment.';
      setAlertInfo({ type: 'error', message: msg });
      setRescheduleModal((prev) => ({ ...prev, submitting: false }));
    }
  };

  // Open Cancel & 100% Refund Modal
  const openCancelApptModal = (appt) => {
    setCancelApptModal({
      open: true,
      appointment: appt,
      reason: 'Doctor Emergency / Hospital Schedule Realignment',
      customReason: '',
      submitting: false,
    });
  };

  const handleExecuteCancelAppt = async (e) => {
    e.preventDefault();
    const { appointment, reason, customReason } = cancelApptModal;
    if (!appointment) return;

    setCancelApptModal((prev) => ({ ...prev, submitting: true }));
    const finalReason = reason === 'Other' && customReason.trim() ? customReason.trim() : reason;

    try {
      await api.patch(`/appointments/admin/${appointment.id}/status/`, {
        status: 'cancelled',
        reason: finalReason,
      });
      setAlertInfo({
        type: 'success',
        message: `Appointment cancelled with 100% Full Refund (₹0 deduction). Apology email sent to patient.`
      });
      setCancelApptModal({
        open: false,
        appointment: null,
        reason: 'Doctor Emergency / Hospital Schedule Realignment',
        customReason: '',
        submitting: false,
      });
      fetchHospitalStats(true);
    } catch (err) {
      const msg = err.response?.data?.error || 'Failed to cancel appointment.';
      setAlertInfo({ type: 'error', message: msg });
      setCancelApptModal((prev) => ({ ...prev, submitting: false }));
    }
  };

  // Hospital Cancel / Auto-Reschedule Slot Action Handler
  const handleExecuteCancelSlot = async () => {
    const { slot, action, reason, customReason } = cancelSlotModal;
    if (!slot) return;

    setCancelSlotModal((prev) => ({ ...prev, submitting: true }));
    const finalReason = reason === 'Other' && customReason.trim() ? customReason.trim() : reason;

    try {
      const res = await api.post(`/appointments/hospital/slots/${slot.id}/cancel/`, {
        action: action,
        reason: finalReason,
      });
      setAlertInfo({
        type: 'success',
        message: res.data.message || 'Slot cancelled and patients notified via email.'
      });
      setCancelSlotModal({
        open: false,
        slot: null,
        action: 'auto_reschedule',
        reason: 'Doctor Emergency / Unavoidable Clinical Duty',
        customReason: '',
        submitting: false
      });
      fetchHospitalStats(true);
    } catch (err) {
      const msg = err.response?.data?.error || 'Failed to cancel slot.';
      setAlertInfo({ type: 'error', message: msg });
      setCancelSlotModal((prev) => ({ ...prev, submitting: false }));
    }
  };

  // Doctor Edit Modal Handlers
  const openEditDoctorModal = (doctor) => {
    setEditingDoctor(doctor);
    setEditFormData({
      name: doctor.name || '',
      specialization: doctor.specialization || '',
      qualification: doctor.qualification || '',
      experience_years: doctor.experience_years || 0,
      fee: doctor.fee || '500.00',
      contact_number: doctor.contact_number || '',
      contact_email: doctor.contact_email || '',
      clinic_address: doctor.clinic_address || '',
      google_maps_url: doctor.google_maps_url || '',
      bio: doctor.bio || '',
      is_active: doctor.is_active ?? true,
    });
  };

  const closeEditDoctorModal = () => {
    setEditingDoctor(null);
    setEditFormData({});
  };

  const handleSaveDoctor = async (e) => {
    e.preventDefault();
    if (!editingDoctor) return;
    setEditLoading(true);

    try {
      const payload = {
        ...editFormData,
        hospital_name: stats?.hospital_name || selectedHospital,
      };
      await api.patch(`/doctors/admin/${editingDoctor.id}/`, payload);
      setAlertInfo({ type: 'success', message: `Dr. ${editFormData.name}'s profile updated successfully!` });
      closeEditDoctorModal();
      fetchHospitalStats(true);
    } catch (err) {
      const msg = err.response?.data?.error || err.response?.data?.detail || 'Failed to save doctor changes.';
      setAlertInfo({ type: 'error', message: msg });
    } finally {
      setEditLoading(false);
    }
  };

  const handleToggleDoctorActive = async (doctorId, currentStatus) => {
    try {
      await api.patch(`/doctors/admin/${doctorId}/`, { is_active: !currentStatus });
      setAlertInfo({ type: 'success', message: `Doctor is now ${!currentStatus ? 'Active' : 'Inactive'}.` });
      fetchHospitalStats(true);
    } catch (err) {
      setAlertInfo({ type: 'error', message: 'Failed to update doctor active status.' });
    }
  };

  const metrics = stats?.metrics || {};
  const appointments = stats?.appointments || [];
  const doctors = stats?.doctors || [];
  const slots = stats?.slots || [];
  const trafficTrend = stats?.traffic_trend || [];
  const maxTrafficCount = Math.max(...trafficTrend.map((t) => t.count), 1);

  const cancelledCount = appointments.filter(a => a.status === 'cancelled').length;
  const rescheduledCount = appointments.filter(a => a.status === 'confirmed' && (a.notes || '').toLowerCase().includes('rescheduled')).length;

  if (loading) {
    return (
      <div style={{ display: 'flex', minHeight: '100vh', background: '#f8fafc' }}>
        <aside style={{ width: '270px', background: '#0f172a', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="skeleton-shimmer" style={{ height: '50px', borderRadius: '8px' }}></div>
          <div className="skeleton-shimmer" style={{ height: '36px', borderRadius: '6px' }}></div>
          <div className="skeleton-shimmer" style={{ height: '36px', borderRadius: '6px' }}></div>
          <div className="skeleton-shimmer" style={{ height: '36px', borderRadius: '6px' }}></div>
        </aside>
        <main style={{ flex: 1, padding: '2rem' }}>
          <div className="skeleton-shimmer" style={{ height: '90px', marginBottom: '1.5rem', borderRadius: '12px' }}></div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
            {[1,2,3,4,5].map(i => (
              <div key={i} className="skeleton-shimmer" style={{ height: '110px', borderRadius: '12px' }}></div>
            ))}
          </div>
          <div className="skeleton-shimmer" style={{ height: '320px', borderRadius: '14px' }}></div>
        </main>
      </div>
    );
  }

  return (
    <div className="admin-layout-container">
      {/* ========================================================================= */}
      {/* ENTERPRISE LEFT SIDEBAR NAVIGATION */}
      {/* ========================================================================= */}
      <aside className="admin-sidebar">
        {/* SIDEBAR BRAND HEADER */}
        <div className="admin-sidebar-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
            <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: '#0284c7', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Building2 size={22} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#fff', margin: 0, lineHeight: 1.2 }}>
                CareConnect
              </h2>
              <span style={{ fontSize: '0.68rem', color: '#38bdf8', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Hospital Facility Portal
              </span>
            </div>
          </div>

          <div style={{ background: '#1e293b', padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1px solid #334155' }}>
            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#f8fafc', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {stats?.hospital_name || stats?.hospital_info?.name || 'Facility Unit'}
            </div>
            <div style={{ fontSize: '0.68rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
              <MapPin size={10} style={{ color: '#38bdf8' }} /> {stats?.hospital_info?.city || 'Healthcare System'}
            </div>
          </div>
        </div>

        {/* SIDEBAR NAVIGATION ITEMS */}
        <div className="admin-sidebar-body">
          <div style={{ fontSize: '0.68rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', padding: '0.25rem 0.75rem 0.35rem' }}>
            Facility Operations
          </div>

          {/* 1. OVERVIEW */}
          <button
            type="button"
            onClick={() => setActiveTab('overview')}
            className={`sidebar-nav-btn ${activeTab === 'overview' ? 'active' : ''}`}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <Activity size={17} />
              <span>Overview & Traffic</span>
            </div>
          </button>

          {/* 2. PATIENT QUEUE */}
          <button
            type="button"
            onClick={() => setActiveTab('patients')}
            className={`sidebar-nav-btn ${activeTab === 'patients' ? 'active' : ''}`}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <Users size={17} />
              <span>Patient Queue</span>
            </div>
            <span style={{ fontSize: '0.72rem', background: '#0284c7', color: '#fff', padding: '2px 7px', borderRadius: '10px', fontWeight: 700 }}>
              {appointments.length}
            </span>
          </button>

          {/* 3. DOCTORS ROSTER */}
          <button
            type="button"
            onClick={() => setActiveTab('doctors')}
            className={`sidebar-nav-btn ${activeTab === 'doctors' ? 'active' : ''}`}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <Stethoscope size={17} />
              <span>Specialist Roster</span>
            </div>
            <span style={{ fontSize: '0.72rem', background: '#334155', color: '#cbd5e1', padding: '2px 7px', borderRadius: '10px', fontWeight: 700 }}>
              {doctors.length}
            </span>
          </button>

          {/* 4. SLOT CAPACITY */}
          <button
            type="button"
            onClick={() => setActiveTab('slots')}
            className={`sidebar-nav-btn ${activeTab === 'slots' ? 'active' : ''}`}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <Clock size={17} />
              <span>Slot Capacity Monitor</span>
            </div>
            <span style={{ fontSize: '0.72rem', background: '#d97706', color: '#fff', padding: '2px 7px', borderRadius: '10px', fontWeight: 700 }}>
              {slots.length}
            </span>
          </button>

          {/* 5. CANCELLATION & RESCHEDULE HUB */}
          <div style={{ fontSize: '0.68rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', padding: '0.75rem 0.75rem 0.35rem' }}>
            Patient Care & Audits
          </div>

          <button
            type="button"
            onClick={() => setActiveTab('cancel_reschedule')}
            className={`sidebar-nav-btn ${activeTab === 'cancel_reschedule' ? 'active' : ''}`}
            style={{
              background: activeTab === 'cancel_reschedule' ? 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)' : 'transparent',
              color: activeTab === 'cancel_reschedule' ? '#ffffff' : '#f87171',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <RotateCcw size={17} />
              <span>Cancel & Reschedule Hub</span>
            </div>
            <span style={{ fontSize: '0.7rem', background: '#fee2e2', color: '#dc2626', padding: '2px 6px', borderRadius: '10px', fontWeight: 800 }}>
              Hub
            </span>
          </button>

          {/* QUICK ONBOARD LINK */}
          <Link
            to="/admin/doctors/add"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.65rem',
              padding: '0.65rem 0.85rem',
              borderRadius: '8px',
              fontSize: '0.88rem',
              fontWeight: 600,
              color: '#38bdf8',
              textDecoration: 'none',
              background: 'rgba(56, 189, 248, 0.1)',
              border: '1px solid rgba(56, 189, 248, 0.2)',
              marginTop: '0.5rem',
            }}
          >
            <Plus size={17} />
            <span>Onboard Specialist</span>
          </Link>
        </div>

        {/* SIDEBAR FOOTER WITH USER DETAILS & LOGOUT BUTTON */}
        <div className="admin-sidebar-footer">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div style={{ width: '34px', height: '34px', borderRadius: '50%', background: '#0284c7', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.85rem' }}>
              {user?.username ? user.username.charAt(0).toUpperCase() : 'H'}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#f8fafc', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {user?.username}
              </div>
              <span style={{ fontSize: '0.68rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}>
                {user?.role || 'Hospital Manager'}
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <Link
              to="/"
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px',
                padding: '0.45rem',
                borderRadius: '6px',
                background: '#1e293b',
                color: '#cbd5e1',
                fontSize: '0.78rem',
                fontWeight: 600,
                textDecoration: 'none',
                border: '1px solid #334155',
              }}
              title="Return to Public Patient Portal"
            >
              <ExternalLink size={13} /> Public Site
            </Link>

            <button
              type="button"
              onClick={handleLogout}
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px',
                padding: '0.45rem',
                borderRadius: '6px',
                background: '#450a0a',
                color: '#fca5a5',
                fontSize: '0.78rem',
                fontWeight: 700,
                border: '1px solid #7f1d1d',
                cursor: 'pointer',
              }}
              title="Sign Out from Dashboard"
            >
              <LogOut size={13} /> Logout
            </button>
          </div>
        </div>
      </aside>

      {/* ========================================================================= */}
      {/* RIGHT MAIN VIEWPORT */}
      {/* ========================================================================= */}
      <main className="admin-content-viewport">
        {/* TOP DASHBOARD BANNER */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.75rem', padding: '1.25rem 1.5rem', background: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 2px 10px rgba(0,0,0,0.03)' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
              <span style={{ fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', background: '#e0f2fe', color: '#0284c7', padding: '2px 8px', borderRadius: '6px' }}>
                🏥 Facility Command
              </span>
              <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                Live Inflow Monitor &middot; Auto-Refund Engine Enabled
              </span>
            </div>
            <h1 style={{ fontSize: '1.65rem', fontWeight: 800, margin: 0, color: 'var(--c-navy)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              {stats?.hospital_name || 'Hospital Facility Portal'}
            </h1>
            {stats?.hospital_info?.address && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '0.4rem', flexWrap: 'wrap', fontSize: '0.8rem', color: 'var(--c-text-light)' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <MapPin size={13} style={{ color: '#0284c7' }} /> {stats.hospital_info.address} {stats.hospital_info.city ? `(${stats.hospital_info.city})` : ''}
                </span>
                {stats.hospital_info.contact_phone && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Phone size={13} style={{ color: '#059669' }} /> {stats.hospital_info.contact_phone}
                  </span>
                )}
                {stats.hospital_info.maps_url && (
                  <a
                    href={stats.hospital_info.maps_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: '#0284c7', textDecoration: 'none', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                  >
                    <Navigation size={13} /> Maps Pin <ExternalLink size={11} />
                  </a>
                )}
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', flexWrap: 'wrap' }}>
            {isAdmin && stats?.all_hospitals?.length > 1 && (
              <select
                value={selectedHospital}
                onChange={(e) => {
                  setSelectedHospital(e.target.value);
                  setSearchParams({ hospital_name: e.target.value });
                }}
                style={{ background: '#f8fafc', color: 'var(--c-navy)', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '0.45rem 0.75rem', fontSize: '0.85rem', fontWeight: 600 }}
              >
                {stats.all_hospitals.map((h) => {
                  const hName = typeof h === 'object' ? h.name : h;
                  const hCity = typeof h === 'object' && h.city ? ` (${h.city})` : '';
                  return (
                    <option key={hName} value={hName}>{hName}{hCity}</option>
                  );
                })}
              </select>
            )}

            <button
              type="button"
              onClick={() => fetchHospitalStats(true)}
              disabled={refreshing}
              className="btn btn-outline btn-sm"
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 600 }}
            >
              <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
              {refreshing ? 'Syncing...' : 'Live Refresh'}
            </button>

            <Link
              to="/admin/doctors/add"
              className="btn btn-primary btn-sm"
              style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', background: '#0284c7', borderColor: '#0284c7' }}
            >
              <Plus size={15} /> Add Doctor
            </Link>
          </div>
        </div>

        {alertInfo.message && (
          <div style={{ marginBottom: '1.5rem' }}>
            <Alert type={alertInfo.type} message={alertInfo.message} onClose={() => setAlertInfo({ type: '', message: '' })} />
          </div>
        )}

        {/* TOP 5 METRIC CARDS */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
          {/* Total Patients */}
          <div className="card" style={{ padding: '1.25rem', borderLeft: '4px solid #0284c7', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--c-text-light)', textTransform: 'uppercase' }}>Total Patients Treated</span>
              <Users size={20} style={{ color: '#0284c7' }} />
            </div>
            <div style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--c-navy)', margin: '0.35rem 0' }}>
              {metrics.total_patients || 0}
            </div>
            <span style={{ fontSize: '0.72rem', color: '#0284c7', fontWeight: 600 }}>All-time Bookings</span>
          </div>

          {/* Today's Inflow */}
          <div className="card" style={{ padding: '1.25rem', borderLeft: '4px solid #059669', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--c-text-light)', textTransform: 'uppercase' }}>Today's Patient Inflow</span>
              <Activity size={20} style={{ color: '#059669' }} />
            </div>
            <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#059669', margin: '0.35rem 0' }}>
              {metrics.today_inflow || 0}
            </div>
            <span style={{ fontSize: '0.72rem', color: '#059669', fontWeight: 600 }}>Active Today</span>
          </div>

          {/* Active Doctors */}
          <div className="card" style={{ padding: '1.25rem', borderLeft: '4px solid #2563eb', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--c-text-light)', textTransform: 'uppercase' }}>Doctors on Duty</span>
              <Stethoscope size={20} style={{ color: '#2563eb' }} />
            </div>
            <div style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--c-navy)', margin: '0.35rem 0' }}>
              {metrics.active_doctors_count || 0} / {metrics.total_doctors_count || 0}
            </div>
            <span style={{ fontSize: '0.72rem', color: '#2563eb', fontWeight: 600 }}>Active Specialists</span>
          </div>

          {/* Capacity Occupancy */}
          <div className="card" style={{ padding: '1.25rem', borderLeft: '4px solid #d97706', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--c-text-light)', textTransform: 'uppercase' }}>Capacity Occupancy</span>
              <TrendingUp size={20} style={{ color: '#d97706' }} />
            </div>
            <div style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--c-navy)', margin: '0.35rem 0' }}>
              {metrics.occupancy_rate || 0}%
            </div>
            <span style={{ fontSize: '0.72rem', color: '#d97706', fontWeight: 600 }}>Slot Utilization Rate</span>
          </div>

          {/* Revenue */}
          <div className="card" style={{ padding: '1.25rem', borderLeft: '4px solid #7c3aed', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--c-text-light)', textTransform: 'uppercase' }}>Consultation Revenue</span>
              <DollarSign size={20} style={{ color: '#7c3aed' }} />
            </div>
            <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#7c3aed', margin: '0.35rem 0' }}>
              ₹{Number(metrics.total_revenue || 0).toLocaleString()}
            </div>
            <span style={{ fontSize: '0.72rem', color: '#7c3aed', fontWeight: 600 }}>Total Booked</span>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* TAB 1: OVERVIEW & 14-DAY PATIENT TRAFFIC TIMELINE */}
        {/* ========================================================================= */}
        {activeTab === 'overview' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* Dynamic 14-day Traffic Bar Graph */}
            <div className="card" style={{ padding: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
                <div>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--c-navy)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <TrendingUp size={18} style={{ color: '#0284c7' }} /> Daily Patient Traffic Trend (Last 14 Days)
                  </h3>
                  <p style={{ fontSize: '0.8rem', color: 'var(--c-text-light)', margin: '0.2rem 0 0' }}>
                    Dynamic patient inflow volume and revenue distribution per day.
                  </p>
                </div>
                <span style={{ fontSize: '0.78rem', background: '#e0f2fe', color: '#0284c7', padding: '3px 8px', borderRadius: '6px', fontWeight: 700 }}>
                  14 Days History
                </span>
              </div>

              {/* Custom Dynamic Bar Chart */}
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: '0.5rem', height: '180px', padding: '1rem 0 0.5rem', borderBottom: '1px solid #e2e8f0' }}>
                {trafficTrend.map((day) => {
                  const heightPercent = Math.max(12, (day.count / maxTrafficCount) * 100);
                  const isToday = day.date === new Date().toISOString().split('T')[0];
                  return (
                    <div
                      key={day.date}
                      style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', height: '100%', justifyContent: 'flex-end' }}
                      title={`${day.date}: ${day.count} Patients | ₹${day.revenue}`}
                    >
                      <span style={{ fontSize: '0.7rem', fontWeight: 700, color: isToday ? '#0284c7' : 'var(--c-navy)' }}>
                        {day.count}
                      </span>
                      <div
                        style={{
                          width: '100%',
                          maxWidth: '36px',
                          height: `${heightPercent}%`,
                          background: isToday ? 'linear-gradient(180deg, #0284c7 0%, #0369a1 100%)' : '#cbd5e1',
                          borderRadius: '6px 6px 0 0',
                          transition: 'height 0.3s ease',
                        }}
                      ></div>
                      <span style={{ fontSize: '0.68rem', color: isToday ? '#0284c7' : 'var(--c-text-light)', fontWeight: isToday ? 800 : 500, whiteSpace: 'nowrap' }}>
                        {day.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Quick Doctor Summary Card */}
            <div className="card" style={{ padding: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--c-navy)', margin: 0 }}>
                  👨‍⚕️ Specialists Assigned to {stats?.hospital_name}
                </h3>
                <button type="button" onClick={() => setActiveTab('doctors')} className="btn btn-outline btn-sm">
                  Manage Doctors &rarr;
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
                {doctors.slice(0, 4).map((doc) => (
                  <div key={doc.id} style={{ padding: '1rem', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                    <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#e0f2fe', overflow: 'hidden', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <img
                        src={getDoctorAvatar(doc)}
                        alt={doc.name}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = getDoctorAvatar(doc, doc.name);
                        }}
                      />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, color: 'var(--c-navy)', fontSize: '0.9rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        Dr. {doc.name}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#0284c7', fontWeight: 600 }}>{doc.specialization}</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--c-text-light)', marginTop: '2px' }}>
                        Fee: <strong>₹{doc.fee}</strong> &middot; {doc.experience_years} yrs exp
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => openEditDoctorModal(doc)}
                      className="btn btn-outline btn-sm"
                      style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                      title="Edit Doctor"
                    >
                      <Edit3 size={13} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: PATIENT INFLOW & CONSULTATIONS */}
        {/* ========================================================================= */}
        {activeTab === 'patients' && (
          <div className="card" style={{ padding: '1.5rem' }}>
            {/* WALK-IN RECEPTION QUICK VERIFICATION BANNER */}
            <div style={{ background: 'linear-gradient(135deg, #065f46 0%, #047857 100%)', color: '#ffffff', padding: '1.25rem 1.5rem', borderRadius: '12px', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', boxShadow: '0 4px 14px rgba(5, 150, 105, 0.2)' }}>
              <div>
                <div style={{ fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', background: 'rgba(255,255,255,0.2)', color: '#ffffff', padding: '2px 8px', borderRadius: '6px', display: 'inline-block', marginBottom: '4px' }}>
                  ⚡ Walk-In Reception & OP Admission Desk
                </div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <UserCheck size={22} /> Patient Walk-In Verification & 1-Click Admission
                </h3>
                <p style={{ fontSize: '0.82rem', color: '#d1fae5', margin: '0.35rem 0 0', maxWidth: '750px' }}>
                  When a patient arrives at the hospital, check appointment availability below. Click the green <strong>"Accept Patient"</strong> button to admit them into the doctor chamber and mark the consultation completed, immediately enabling their 3-tier doctor, hospital & management review on their dashboard.
                </p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '0.8rem', background: '#ffffff', color: '#065f46', padding: '6px 12px', borderRadius: '8px', fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                  <CheckCircle2 size={16} /> Ready to Admit ({appointments.filter(a => a.status !== 'completed' && a.status !== 'cancelled').length} Pending)
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--c-navy)', margin: 0 }}>
                  👥 Patient Consultation Queue ({appointments.length} Patients)
                </h3>
                <p style={{ fontSize: '0.82rem', color: 'var(--c-text-light)', margin: '0.2rem 0 0' }}>
                  Filter by date, assigned specialist, or patient OP status.
                </p>
              </div>
            </div>

            {/* DATE-WISE, DOCTOR-WISE, SPECIALIST-WISE & OP STATUS FILTER TOOLBAR */}
            <div style={{ background: '#f8fafc', padding: '1.25rem', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* Quick Date Range Buttons */}
              <div>
                <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--c-text-light)', textTransform: 'uppercase', display: 'block', marginBottom: '0.5rem' }}>
                  📅 1. Date-Wise Filter:
                </label>
                <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                  {[
                    { id: 'all', label: 'All Dates' },
                    { id: 'today', label: '📅 Today' },
                    { id: 'yesterday', label: 'Yesterday' },
                    { id: 'upcoming_7', label: 'Next 7 Days' },
                    { id: 'past_7', label: 'Past 7 Days' },
                    { id: 'this_month', label: 'This Month' },
                    { id: 'custom', label: '🗓️ Pick Specific Date' },
                  ].map((btn) => (
                    <button
                      key={btn.id}
                      type="button"
                      onClick={() => setDateRange(btn.id)}
                      style={{
                        padding: '4px 10px',
                        borderRadius: '6px',
                        fontSize: '0.78rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        border: dateRange === btn.id ? '1px solid #0284c7' : '1px solid #cbd5e1',
                        background: dateRange === btn.id ? '#0284c7' : '#fff',
                        color: dateRange === btn.id ? '#fff' : 'var(--c-navy)',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      {btn.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Multi-Dimensional Filter Suite: Doctor, Specialist, OP Status, Custom Date, and Search */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '0.75rem', alignItems: 'flex-end' }}>
                {dateRange === 'custom' && (
                  <div>
                    <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--c-text-light)', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>
                      Exact Date
                    </label>
                    <input
                      type="date"
                      value={customDate}
                      onChange={(e) => setCustomDate(e.target.value)}
                      style={{ width: '100%', height: '36px', borderRadius: '6px', border: '1px solid var(--c-border)', padding: '0 8px', fontSize: '0.85rem', background: '#fff' }}
                    />
                  </div>
                )}

                {/* Doctor-wise filter */}
                <div>
                  <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--c-text-light)', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>
                    👨‍⚕️ Doctor-Wise Filter
                  </label>
                  <select
                    value={selectedDoctorId}
                    onChange={(e) => setSelectedDoctorId(e.target.value)}
                    style={{ width: '100%', height: '36px', borderRadius: '6px', border: '1px solid var(--c-border)', padding: '0 8px', fontSize: '0.85rem', background: '#fff' }}
                  >
                    <option value="all">All Hospital Doctors</option>
                    {doctors.map((d) => (
                      <option key={d.id} value={d.id}>Dr. {d.name} ({d.specialization})</option>
                    ))}
                  </select>
                </div>

                {/* Specialist-wise filter */}
                <div>
                  <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--c-text-light)', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>
                    🩺 Specialist / Department
                  </label>
                  <select
                    value={selectedSpecialist}
                    onChange={(e) => setSelectedSpecialist(e.target.value)}
                    style={{ width: '100%', height: '36px', borderRadius: '6px', border: '1px solid var(--c-border)', padding: '0 8px', fontSize: '0.85rem', background: '#fff' }}
                  >
                    <option value="all">All Specializations</option>
                    {(stats?.specializations || []).map((spec) => (
                      <option key={spec} value={spec}>{spec}</option>
                    ))}
                  </select>
                </div>

                {/* OP Status Filter */}
                <div>
                  <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--c-text-light)', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>
                    🏥 OP Patient Status
                  </label>
                  <select
                    value={opStatusFilter}
                    onChange={(e) => setOpStatusFilter(e.target.value)}
                    style={{ width: '100%', height: '36px', borderRadius: '6px', border: '1px solid var(--c-border)', padding: '0 8px', fontSize: '0.85rem', background: '#fff' }}
                  >
                    <option value="all">All OP Patients</option>
                    <option value="checked_in">🟢 Arrived & Checked-In at OP</option>
                    <option value="waiting">⏳ Waiting / Not Checked In</option>
                    <option value="completed">✅ Consultation Completed</option>
                    <option value="cancelled">🛑 Cancelled</option>
                  </select>
                </div>

                <div style={{ position: 'relative' }}>
                  <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--c-text-light)', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>
                    Search Queue
                  </label>
                  <form onSubmit={handleSearchSubmit}>
                    <Search size={15} style={{ position: 'absolute', left: '10px', top: '28px', color: 'var(--c-text-light)' }} />
                    <input
                      type="text"
                      placeholder="Patient, phone, receipt..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      style={{ width: '100%', height: '36px', borderRadius: '6px', border: '1px solid var(--c-border)', paddingLeft: '32px', paddingRight: '8px', fontSize: '0.85rem', background: '#fff' }}
                    />
                  </form>
                </div>
              </div>
            </div>

            {/* PATIENT CONSULTATIONS TABLE */}
            <div className="table-responsive">
              <table className="payment-table">
                <thead>
                  <tr>
                    <th>Patient & Family</th>
                    <th>Contact Info</th>
                    <th>Assigned Doctor</th>
                    <th>Consultation Slot</th>
                    <th>Receipt / Tracking</th>
                    <th style={{ textAlign: 'right' }}>Fee</th>
                    <th>OP & Consultation Status</th>
                    <th style={{ textAlign: 'center' }}>OP Staff Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {appointments.length > 0 ? (
                    appointments.map((appt) => (
                      <tr key={appt.id} style={{ background: appt.op_checked_in ? '#f0fdf4' : 'transparent' }}>
                        <td>
                          <div style={{ fontWeight: 700, color: 'var(--c-navy)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            {appt.patient_name || appt.patient_email}
                            {appt.op_checked_in && (
                              <span title="Patient has entered and checked in at hospital OP" style={{ color: '#059669', fontSize: '0.8rem' }}>🟢</span>
                            )}
                          </div>
                          {appt.patient_relation && (
                            <span style={{ fontSize: '0.7rem', background: '#ecfdf5', color: '#059669', padding: '1px 6px', borderRadius: '4px', fontWeight: 600 }}>
                              {appt.patient_relation} {appt.patient_age ? `(${appt.patient_age} yrs)` : ''}
                            </span>
                          )}
                          {appt.notes && (
                            <div style={{ fontSize: '0.72rem', color: 'var(--c-text-light)', fontStyle: 'italic', marginTop: '2px' }}>
                              "{appt.notes}"
                            </div>
                          )}
                        </td>
                        <td>
                          {appt.patient_phone ? (
                            <a href={`tel:${appt.patient_phone}`} style={{ fontSize: '0.78rem', color: '#059669', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '3px', fontWeight: 600 }}>
                              <Phone size={11} /> {appt.patient_phone}
                            </a>
                          ) : (
                            <span style={{ fontSize: '0.75rem', color: 'var(--c-text-light)' }}>{appt.patient_email}</span>
                          )}
                        </td>
                        <td>
                          <div style={{ fontWeight: 600, color: 'var(--c-navy)' }}>Dr. {appt.doctor_name}</div>
                          <div style={{ fontSize: '0.72rem', color: '#0284c7' }}>{appt.doctor_specialization}</div>
                        </td>
                        <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.82rem' }}>
                          <div>📅 {appt.slot_date}</div>
                          <div style={{ color: 'var(--c-text-light)', fontSize: '0.75rem' }}>🕒 {appt.slot_time} - {appt.slot_end_time || ''}</div>
                        </td>
                        <td>
                          <button
                            type="button"
                            onClick={() => setSelectedInvoice(appt)}
                            style={{
                              border: 'none',
                              background: '#f1f5f9',
                              color: '#0284c7',
                              padding: '3px 7px',
                              borderRadius: '4px',
                              fontSize: '0.75rem',
                              fontFamily: 'var(--font-mono)',
                              fontWeight: 700,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                            title="Click to view digital receipt & breakdown"
                          >
                            <FileText size={11} /> {appt.receipt_id || `APT-${appt.id}`}
                          </button>
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 800, color: 'var(--color-primary)' }}>
                          ₹{appt.fee_charged}
                        </td>
                        <td>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                            <span className={`status-badge status-${appt.status}`}>
                              {appt.status?.toUpperCase()}
                            </span>
                            {appt.status === 'completed' ? (
                              <span style={{ fontSize: '0.68rem', background: '#dcfce7', color: '#15803d', padding: '1px 6px', borderRadius: '4px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                                ✅ Completed {appt.is_reviewed ? `(⭐ ${appt.rating}/5)` : ''}
                              </span>
                            ) : appt.op_checked_in ? (
                              <span style={{ fontSize: '0.68rem', background: '#dbeafe', color: '#1d4ed8', padding: '1px 6px', borderRadius: '4px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                                🏥 In OP Chamber
                              </span>
                            ) : (
                              <span style={{ fontSize: '0.68rem', background: '#fef3c7', color: '#b45309', padding: '1px 6px', borderRadius: '4px', fontWeight: 600 }}>
                                ⏳ Waiting Arrival
                              </span>
                            )}
                          </div>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <div style={{ display: 'flex', gap: '6px', justifyContent: 'center', flexWrap: 'wrap', alignItems: 'center' }}>
                            {/* 1. PROMINENT "ACCEPT & ADMIT PATIENT" BUTTON */}
                            {appt.status !== 'completed' && appt.status !== 'cancelled' ? (
                              <button
                                type="button"
                                onClick={() => handleCompleteConsultation(appt.id, appt.patient_name)}
                                className="btn btn-sm"
                                style={{
                                  padding: '4px 10px',
                                  fontSize: '0.78rem',
                                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                                  color: '#ffffff',
                                  border: 'none',
                                  borderRadius: '6px',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  fontWeight: 800,
                                  boxShadow: '0 2px 6px rgba(16, 185, 129, 0.3)',
                                  cursor: 'pointer'
                                }}
                                title="Accept & Admit Patient to OP: Marks consultation as COMPLETED and immediately unlocks 3-category Review on Patient Dashboard."
                              >
                                <CheckCircle2 size={13} /> Accept Patient
                              </button>
                            ) : appt.status === 'completed' ? (
                              <span style={{ fontSize: '0.74rem', color: '#059669', background: '#ecfdf5', padding: '3px 8px', borderRadius: '6px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px', border: '1px solid #a7f3d0' }}>
                                <CheckCheck size={13} /> Completed
                              </span>
                            ) : null}

                            {/* 2. Reschedule Button */}
                            {appt.status !== 'cancelled' && appt.status !== 'completed' && (
                              <button
                                type="button"
                                onClick={() => openRescheduleModal(appt)}
                                className="btn btn-sm btn-outline"
                                style={{ padding: '3px 6px', fontSize: '0.72rem', color: '#0284c7', borderColor: '#bae6fd' }}
                                title="Reschedule Consultation"
                              >
                                <RotateCcw size={12} />
                              </button>
                            )}

                            {/* 3. Cancel & Refund Button */}
                            {appt.status !== 'cancelled' && (
                              <button
                                type="button"
                                onClick={() => openCancelApptModal(appt)}
                                className="btn btn-sm btn-outline"
                                style={{ padding: '3px 6px', fontSize: '0.72rem', color: '#dc2626', borderColor: '#fca5a5' }}
                                title="Cancel with 100% Full Refund"
                              >
                                <X size={12} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="8" style={{ textAlign: 'center', padding: '3rem', color: 'var(--c-text-light)' }}>
                        No patient appointments found matching the selected date, doctor, or OP filter.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: HOSPITAL DOCTORS */}
        {/* ========================================================================= */}
        {activeTab === 'doctors' && (
          <div className="card" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--c-navy)', margin: 0 }}>
                  🩺 Specialist Roster ({doctors.length} Doctors)
                </h3>
                <p style={{ fontSize: '0.82rem', color: 'var(--c-text-light)', margin: '0.2rem 0 0' }}>
                  Full doctor edit capability: adjust consultation fees, schedules, active/inactive status, contact details, clinic chamber address, and Google Maps pin.
                </p>
              </div>
              <Link to="/admin/doctors/add" className="btn btn-primary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: '#0284c7', borderColor: '#0284c7' }}>
                <Plus size={15} /> Add New Doctor
              </Link>
            </div>

            {/* DOCTOR STATUS FILTER TABS */}
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--c-text-light)', textTransform: 'uppercase' }}>Filter:</span>
              {[
                { id: 'all', label: `All Doctors (${doctors.length})` },
                { id: 'today', label: `🟢 Working Today (${doctors.filter(d => d.is_available_today).length})` },
                { id: 'active', label: `Active (${doctors.filter(d => d.is_active).length})` },
                { id: 'inactive', label: `Inactive (${doctors.filter(d => !d.is_active).length})` },
              ].map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setDoctorFilter(f.id)}
                  style={{
                    padding: '4px 12px',
                    borderRadius: '20px',
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    border: doctorFilter === f.id ? '1px solid #0284c7' : '1px solid #cbd5e1',
                    background: doctorFilter === f.id ? '#0284c7' : '#fff',
                    color: doctorFilter === f.id ? '#fff' : 'var(--c-navy)',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.25rem' }}>
              {doctors.filter(doc => {
                if (doctorFilter === 'today') return doc.is_available_today;
                if (doctorFilter === 'active') return doc.is_active;
                if (doctorFilter === 'inactive') return !doc.is_active;
                return true;
              }).map((doc) => (
                <div key={doc.id} className="card" style={{ padding: '1.25rem', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', opacity: doc.is_active ? 1 : 0.75, background: doc.is_active ? '#fff' : '#f8fafc' }}>
                  <div>
                    <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                      <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: '#e0f2fe', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <img
                          src={getDoctorAvatar(doc)}
                          alt={doc.name}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = getDoctorAvatar(doc, doc.name);
                          }}
                        />
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '4px' }}>
                          <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: 'var(--c-navy)' }}>Dr. {doc.name}</h4>
                          <span style={{
                            fontSize: '0.68rem',
                            fontWeight: 700,
                            padding: '1px 6px',
                            borderRadius: '10px',
                            background: doc.is_active ? '#d1fae5' : '#fee2e2',
                            color: doc.is_active ? '#065f46' : '#991b1b'
                          }}>
                            {doc.is_active ? 'ACTIVE' : 'INACTIVE'}
                          </span>
                        </div>
                        <span style={{ fontSize: '0.78rem', color: '#0284c7', fontWeight: 600 }}>{doc.specialization}</span>
                        <div style={{ fontSize: '0.72rem', color: 'var(--c-text-light)' }}>{doc.qualification} &middot; {doc.experience_years} yrs exp</div>
                      </div>
                    </div>

                    {/* Availability Badge */}
                    <div style={{ marginBottom: '0.75rem' }}>
                      {doc.is_available_today ? (
                        <span style={{
                          background: '#d1fae5',
                          color: '#065f46',
                          padding: '3px 8px',
                          borderRadius: '12px',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          border: '1px solid rgba(16, 185, 129, 0.3)'
                        }}>
                          🟢 Working Today ({doc.available_days || 'Today'})
                        </span>
                      ) : (
                        <span style={{
                          background: '#f1f5f9',
                          color: '#64748b',
                          padding: '3px 8px',
                          borderRadius: '12px',
                          fontSize: '0.72rem',
                          fontWeight: 600,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          border: '1px solid #e2e8f0'
                        }}>
                          ⚪ Off Today &middot; Schedule: {doc.available_days || 'N/A'}
                        </span>
                      )}
                    </div>

                    {/* Doctor Info Details */}
                    <div style={{ background: '#f8fafc', padding: '0.75rem', borderRadius: '8px', fontSize: '0.78rem', display: 'flex', flexDirection: 'column', gap: '0.35rem', marginBottom: '0.75rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--c-text-light)' }}>Fee:</span>
                        <strong style={{ color: 'var(--color-primary)' }}>₹{doc.fee}</strong>
                      </div>
                      {doc.contact_number && (
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: 'var(--c-text-light)' }}>Helpline:</span>
                          <strong style={{ color: '#059669' }}>{doc.contact_number}</strong>
                        </div>
                      )}
                      {doc.clinic_address && (
                        <div style={{ color: 'var(--c-text-light)', lineHeight: 1.3, marginTop: '2px' }}>
                          📍 {doc.clinic_address}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.5rem' }}>
                    <button
                      type="button"
                      onClick={() => openEditDoctorModal(doc)}
                      className="btn btn-primary btn-sm"
                      style={{ flex: 1.2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem', fontSize: '0.78rem', background: '#0284c7', borderColor: '#0284c7' }}
                    >
                      <Edit3 size={12} /> Edit Details
                    </button>
                    <button
                      type="button"
                      onClick={() => handleToggleDoctorActive(doc.id, doc.is_active)}
                      className="btn btn-outline btn-sm"
                      style={{
                        fontSize: '0.75rem',
                        padding: '4px 8px',
                        color: doc.is_active ? '#dc2626' : '#059669',
                        borderColor: doc.is_active ? '#fca5a5' : '#a7f3d0'
                      }}
                      title={doc.is_active ? 'Deactivate Doctor' : 'Activate Doctor'}
                    >
                      {doc.is_active ? 'Deactivate' : 'Activate'}
                    </button>
                    <Link
                      to={`/doctors/${doc.id}`}
                      target="_blank"
                      className="btn btn-outline btn-sm"
                      style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4px 8px' }}
                      title="View Public Profile"
                    >
                      <Eye size={12} />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 4: SLOT CAPACITY OPERATIONS */}
        {/* ========================================================================= */}
        {activeTab === 'slots' && (
          <div className="card" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--c-navy)', margin: 0 }}>
                  📅 Hospital Real-time Slot Capacity Monitor
                </h3>
                <p style={{ fontSize: '0.82rem', color: 'var(--c-text-light)', margin: '0.2rem 0 0' }}>
                  Inspect slot booking limits (0/5 to 5/5) and block or cancel slots with automated patient email notifications.
                </p>
              </div>
            </div>

            <div className="slot-management-grid">
              {slots.length > 0 ? (
                slots.map((slot) => (
                  <div key={slot.id} className={`slot-admin-card ${slot.is_blocked ? 'slot-blocked' : slot.is_full ? 'slot-full' : ''}`}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                      <div>
                        <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--c-navy)' }}>Dr. {slot.doctor_name}</span>
                        <div style={{ fontSize: '0.72rem', color: '#0284c7' }}>{slot.doctor_specialization}</div>
                      </div>
                      {slot.is_blocked ? (
                        <span className="capacity-chip blocked"><Lock size={11} /> Blocked</span>
                      ) : slot.is_full ? (
                        <span className="capacity-chip full"><AlertCircle size={11} /> Full (5/5)</span>
                      ) : (
                        <span className="capacity-chip available"><CheckCircle2 size={11} /> {slot.booked_count}/5 Booked</span>
                      )}
                    </div>

                    <div style={{ fontSize: '0.8rem', color: 'var(--c-navy)', fontWeight: 600, margin: '0.35rem 0' }}>
                      📅 {slot.date} &middot; 🕒 {slot.start_time} {slot.end_time ? `- ${slot.end_time}` : ''}
                    </div>

                    {/* Occupancy bar */}
                    <div className="occupancy-meter-bg" style={{ height: '6px', margin: '0.5rem 0' }}>
                      <div
                        className={`occupancy-meter-fill ${slot.booked_count >= 5 ? 'occupancy-high' : slot.booked_count >= 3 ? 'occupancy-med' : 'occupancy-low'}`}
                        style={{ width: `${(slot.booked_count / (slot.max_capacity || 5)) * 100}%` }}
                      ></div>
                    </div>

                    <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.5rem' }}>
                      <button
                        type="button"
                        onClick={() => handleToggleSlot(slot.id)}
                        className="btn btn-outline btn-sm"
                        style={{ flex: 1, fontSize: '0.75rem', padding: '2px 6px' }}
                      >
                        {slot.is_blocked ? <><Unlock size={11} /> Unblock</> : <><Lock size={11} /> Block</>}
                      </button>
                      <button
                        type="button"
                        onClick={() => setCancelSlotModal({
                          open: true,
                          slot: slot,
                          action: 'auto_reschedule',
                          reason: 'Doctor Emergency / Unavoidable Clinical Duty',
                          customReason: '',
                          submitting: false,
                        })}
                        className="btn btn-outline btn-sm"
                        style={{ flex: 1.2, fontSize: '0.75rem', padding: '2px 6px', color: '#dc2626', borderColor: '#fca5a5' }}
                        title="Cancel slot and auto-reschedule patients or issue 100% full refund"
                      >
                        <ShieldAlert size={11} /> Cancel / Reschedule
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '3rem', color: 'var(--c-text-light)' }}>
                  No active slots found for this hospital.
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 5: ENTERPRISE CANCELLATION & RESCHEDULE HUB */}
        {/* ========================================================================= */}
        {activeTab === 'cancel_reschedule' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* Hub Header Card */}
            <div className="card" style={{ padding: '1.5rem', background: 'linear-gradient(135deg, #1e1b4b 0%, #0f172a 100%)', color: '#fff' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
                    <span style={{ fontSize: '0.72rem', fontWeight: 800, background: '#dc2626', color: '#fff', padding: '2px 8px', borderRadius: '6px', textTransform: 'uppercase' }}>
                      Enterprise Hub
                    </span>
                    <span style={{ fontSize: '0.8rem', color: '#cbd5e1' }}>
                      Automated 100% Refund Engine & Patient Reassignment
                    </span>
                  </div>
                  <h2 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0, color: '#fff', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <RotateCcw size={22} style={{ color: '#38bdf8' }} /> Cancellation & Rescheduling Management
                  </h2>
                  <p style={{ fontSize: '0.85rem', color: '#94a3b8', margin: '0.4rem 0 0', maxWidth: '750px' }}>
                    Manage doctor emergency re-allocations, single-patient slot migrations, and guaranteed 100% full refund cancellations with ₹0 deductions and automatic patient email dispatches.
                  </p>
                </div>

                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                  <div style={{ textAlign: 'right', background: 'rgba(255,255,255,0.06)', padding: '0.75rem 1rem', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.1)' }}>
                    <div style={{ fontSize: '0.72rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}>Cancelled Consultations</div>
                    <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#f87171' }}>{cancelledCount}</div>
                  </div>
                  <div style={{ textAlign: 'right', background: 'rgba(255,255,255,0.06)', padding: '0.75rem 1rem', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.1)' }}>
                    <div style={{ fontSize: '0.72rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}>Rescheduled Consultations</div>
                    <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#38bdf8' }}>{rescheduledCount}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Hub Action List Table */}
            <div className="card" style={{ padding: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--c-navy)', margin: 0 }}>
                    Active Appointments Requiring Schedule Attention
                  </h3>
                  <p style={{ fontSize: '0.82rem', color: 'var(--c-text-light)', margin: '0.2rem 0 0' }}>
                    Click <strong>"Reschedule"</strong> to transfer a patient to another date/slot, or <strong>"Cancel & 100% Refund"</strong> to cancel with zero penalty.
                  </p>
                </div>
              </div>

              <div className="table-responsive">
                <table className="payment-table">
                  <thead>
                    <tr>
                      <th>Patient & Dependent</th>
                      <th>Assigned Specialist</th>
                      <th>Scheduled Slot</th>
                      <th>Fee Charged</th>
                      <th>Status</th>
                      <th>Audit / Notes</th>
                      <th style={{ textAlign: 'center' }}>Hub Operations</th>
                    </tr>
                  </thead>
                  <tbody>
                    {appointments.length > 0 ? (
                      appointments.map((appt) => {
                        const isRescheduled = (appt.notes || '').toLowerCase().includes('rescheduled');
                        return (
                          <tr key={appt.id}>
                            <td>
                              <div style={{ fontWeight: 700, color: 'var(--c-navy)' }}>
                                {appt.patient_name || appt.patient_email}
                              </div>
                              <div style={{ fontSize: '0.72rem', color: 'var(--c-text-light)' }}>
                                {appt.patient_phone || appt.patient_email}
                              </div>
                            </td>
                            <td>
                              <div style={{ fontWeight: 600, color: 'var(--c-navy)' }}>Dr. {appt.doctor_name}</div>
                              <div style={{ fontSize: '0.72rem', color: '#0284c7' }}>{appt.doctor_specialization}</div>
                            </td>
                            <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.82rem' }}>
                              <div>📅 {appt.slot_date}</div>
                              <div style={{ color: 'var(--c-text-light)', fontSize: '0.75rem' }}>🕒 {appt.slot_time}</div>
                            </td>
                            <td style={{ fontWeight: 800, color: 'var(--color-primary)' }}>
                              ₹{appt.fee_charged}
                            </td>
                            <td>
                              <span className={`status-badge status-${appt.status}`}>
                                {appt.status?.toUpperCase()}
                              </span>
                              {isRescheduled && (
                                <span style={{ display: 'block', fontSize: '0.68rem', color: '#0284c7', fontWeight: 700, marginTop: '2px' }}>
                                  🔄 Rescheduled
                                </span>
                              )}
                            </td>
                            <td style={{ maxWidth: '200px' }}>
                              <span style={{ fontSize: '0.72rem', color: 'var(--c-text-light)', fontStyle: appt.notes ? 'italic' : 'normal' }}>
                                {appt.notes || 'Standard booking'}
                              </span>
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                                {appt.status !== 'cancelled' ? (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => openRescheduleModal(appt)}
                                      className="btn btn-sm btn-outline"
                                      style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '4px',
                                        fontSize: '0.75rem',
                                        fontWeight: 700,
                                        color: '#0284c7',
                                        borderColor: '#bae6fd',
                                        background: '#f0f9ff',
                                      }}
                                    >
                                      <RotateCcw size={12} /> Reschedule
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => openCancelApptModal(appt)}
                                      className="btn btn-sm btn-outline"
                                      style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '4px',
                                        fontSize: '0.75rem',
                                        fontWeight: 700,
                                        color: '#dc2626',
                                        borderColor: '#fecaca',
                                        background: '#fef2f2',
                                      }}
                                    >
                                      <X size={12} /> Cancel & Refund
                                    </button>
                                  </>
                                ) : (
                                  <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontStyle: 'italic' }}>
                                    Refunded (100%)
                                  </span>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan="7" style={{ textAlign: 'center', padding: '3rem', color: 'var(--c-text-light)' }}>
                          No appointments found for cancellation/reschedule processing.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ========================================================================= */}
      {/* 1. RESCHEDULE APPOINTMENT MODAL */}
      {/* ========================================================================= */}
      {rescheduleModal.open && rescheduleModal.appointment && (
        <div className="modal-backdrop" onClick={() => setRescheduleModal({ ...rescheduleModal, open: false })}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '560px', borderRadius: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#0284c7' }}>
                <RotateCcw size={22} />
                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: 'var(--c-navy)' }}>
                  Reschedule Patient Appointment
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setRescheduleModal({ ...rescheduleModal, open: false })}
                className="btn btn-ghost btn-sm"
              >
                <X size={18} />
              </button>
            </div>

            {/* Target Patient Information */}
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '1rem', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--c-navy)' }}>
                  Patient: {rescheduleModal.appointment.patient_name || rescheduleModal.appointment.patient_email}
                </span>
                <span style={{ fontSize: '0.75rem', background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px', fontWeight: 600 }}>
                  {rescheduleModal.appointment.receipt_id || `APT-${rescheduleModal.appointment.id}`}
                </span>
              </div>
              <div style={{ fontSize: '0.82rem', color: '#0284c7', fontWeight: 600 }}>
                Doctor: Dr. {rescheduleModal.appointment.doctor_name} ({rescheduleModal.appointment.doctor_specialization})
              </div>
              <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '2px' }}>
                Current Slot: 📅 {rescheduleModal.appointment.slot_date} at 🕒 {rescheduleModal.appointment.slot_time}
              </div>
            </div>

            <form onSubmit={handleExecuteReschedule} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* Step 1: Select Available Date */}
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 800, color: 'var(--c-navy)', marginBottom: '4px' }}>
                  Select New Consultation Date:
                </label>
                {rescheduleModal.availableDates.length > 0 ? (
                  <select
                    value={rescheduleModal.selectedDate}
                    onChange={(e) => handleRescheduleDateChange(e.target.value)}
                    style={{ width: '100%', height: '38px', borderRadius: '8px', border: '1px solid var(--c-border)', padding: '0 10px', fontSize: '0.88rem', background: '#fff' }}
                  >
                    {rescheduleModal.availableDates.map((d) => (
                      <option key={d} value={d}>📅 {d}</option>
                    ))}
                  </select>
                ) : (
                  <div style={{ padding: '0.65rem', background: '#fef2f2', color: '#991b1b', borderRadius: '8px', fontSize: '0.82rem', fontWeight: 600 }}>
                    {rescheduleModal.loadingSlots ? 'Scanning doctor calendar...' : 'No upcoming open dates found for this specialist. Please check doctor roster.'}
                  </div>
                )}
              </div>

              {/* Step 2: Select Available Time Slot */}
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 800, color: 'var(--c-navy)', marginBottom: '4px' }}>
                  Select Target Time Slot:
                </label>
                {rescheduleModal.availableSlots.length > 0 ? (
                  <select
                    value={rescheduleModal.selectedSlotId}
                    onChange={(e) => setRescheduleModal({ ...rescheduleModal, selectedSlotId: e.target.value })}
                    style={{ width: '100%', height: '38px', borderRadius: '8px', border: '1px solid var(--c-border)', padding: '0 10px', fontSize: '0.88rem', background: '#fff' }}
                  >
                    {rescheduleModal.availableSlots.map((s) => (
                      <option key={s.id} value={s.id}>
                        🕒 {s.start_time || s.time} {s.end_time ? `- ${s.end_time}` : ''} ({s.booked_count || 0}/{s.max_capacity || 5} Booked)
                      </option>
                    ))}
                  </select>
                ) : (
                  <div style={{ padding: '0.65rem', background: '#fffbeb', color: '#92400e', borderRadius: '8px', fontSize: '0.82rem' }}>
                    No available time slots for the chosen date. Please select another date above.
                  </div>
                )}
              </div>

              {/* Step 3: Reschedule Reason / Notes */}
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 800, color: 'var(--c-navy)', marginBottom: '4px' }}>
                  Reason for Rescheduling (Logged in Audit & Email):
                </label>
                <input
                  type="text"
                  placeholder="e.g., Doctor emergency duty, schedule shift, patient requested change"
                  value={rescheduleModal.notes}
                  onChange={(e) => setRescheduleModal({ ...rescheduleModal, notes: e.target.value })}
                  style={{ width: '100%', height: '38px', borderRadius: '8px', border: '1px solid var(--c-border)', padding: '0 10px', fontSize: '0.85rem' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', borderTop: '1px solid #e2e8f0', paddingTop: '1rem' }}>
                <button
                  type="button"
                  onClick={() => setRescheduleModal({ ...rescheduleModal, open: false })}
                  className="btn btn-outline"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!rescheduleModal.selectedSlotId || rescheduleModal.submitting}
                  className="btn btn-primary"
                  style={{ background: '#0284c7', borderColor: '#0284c7', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  {rescheduleModal.submitting ? 'Rescheduling & Notifying...' : 'Confirm Reschedule & Send Email'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. CANCEL & 100% REFUND MODAL */}
      {/* ========================================================================= */}
      {cancelApptModal.open && cancelApptModal.appointment && (
        <div className="modal-backdrop" onClick={() => setCancelApptModal({ ...cancelApptModal, open: false })}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '540px', borderRadius: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#dc2626' }}>
                <ShieldAlert size={22} />
                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: 'var(--c-navy)' }}>
                  Cancel & 100% Full Refund
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setCancelApptModal({ ...cancelApptModal, open: false })}
                className="btn btn-ghost btn-sm"
              >
                <X size={18} />
              </button>
            </div>

            {/* Target Patient Box */}
            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '10px', padding: '1rem', marginBottom: '1.25rem' }}>
              <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#991b1b', marginBottom: '4px' }}>
                Patient: {cancelApptModal.appointment.patient_name || cancelApptModal.appointment.patient_email}
              </div>
              <div style={{ fontSize: '0.82rem', color: '#7f1d1d', marginBottom: '4px' }}>
                Dr. {cancelApptModal.appointment.doctor_name} &middot; 📅 {cancelApptModal.appointment.slot_date} at 🕒 {cancelApptModal.appointment.slot_time}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid #fecaca' }}>
                <span style={{ fontSize: '0.78rem', color: '#991b1b', fontWeight: 700 }}>Refund Amount (Zero Deductions):</span>
                <span style={{ fontSize: '1.1rem', color: '#15803d', fontWeight: 800 }}>₹{cancelApptModal.appointment.fee_charged} (100% Full Refund)</span>
              </div>
            </div>

            <form onSubmit={handleExecuteCancelAppt} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 800, color: 'var(--c-navy)', marginBottom: '4px' }}>
                  Select Cancellation Reason:
                </label>
                <select
                  value={cancelApptModal.reason}
                  onChange={(e) => setCancelApptModal({ ...cancelApptModal, reason: e.target.value })}
                  style={{ width: '100%', height: '38px', borderRadius: '8px', border: '1px solid var(--c-border)', padding: '0 10px', fontSize: '0.85rem', background: '#fff' }}
                >
                  <option value="Doctor Emergency / Hospital Schedule Realignment">Doctor Emergency / Hospital Schedule Realignment</option>
                  <option value="Doctor Unwell / Medical Leave">Doctor Unwell / Medical Leave</option>
                  <option value="Patient Emergency Request">Patient Emergency Request</option>
                  <option value="Hospital Facility / OPD Maintenance">Hospital Facility / OPD Maintenance</option>
                  <option value="Other">Other Reason</option>
                </select>

                {cancelApptModal.reason === 'Other' && (
                  <textarea
                    rows={2}
                    placeholder="Enter custom cancellation reason..."
                    value={cancelApptModal.customReason}
                    onChange={(e) => setCancelApptModal({ ...cancelApptModal, customReason: e.target.value })}
                    style={{ width: '100%', marginTop: '8px', borderRadius: '8px', border: '1px solid var(--c-border)', padding: '8px 10px', fontSize: '0.84rem' }}
                  />
                )}
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', borderTop: '1px solid #e2e8f0', paddingTop: '1rem' }}>
                <button
                  type="button"
                  onClick={() => setCancelApptModal({ ...cancelApptModal, open: false })}
                  className="btn btn-outline"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={cancelApptModal.submitting}
                  className="btn btn-primary"
                  style={{ background: '#dc2626', borderColor: '#dc2626', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  {cancelApptModal.submitting ? 'Refunding & Notifying...' : 'Authorize 100% Refund & Cancel'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. SLOT RESOLUTION & AUTO-RESCHEDULE MODAL */}
      {/* ========================================================================= */}
      {cancelSlotModal.open && cancelSlotModal.slot && (
        <div className="modal-backdrop" onClick={() => setCancelSlotModal({ ...cancelSlotModal, open: false })}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '580px', borderRadius: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#dc2626' }}>
                <ShieldAlert size={22} />
                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: 'var(--c-navy)' }}>
                  Cancel / Resolve Doctor Slot
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setCancelSlotModal({ ...cancelSlotModal, open: false })}
                className="btn btn-ghost btn-sm"
              >
                <X size={18} />
              </button>
            </div>

            {/* Target Slot Info Box */}
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '1rem', marginBottom: '1.25rem' }}>
              <div style={{ fontSize: '0.92rem', fontWeight: 800, color: 'var(--c-navy)', marginBottom: '4px' }}>
                Dr. {cancelSlotModal.slot.doctor_name} ({cancelSlotModal.slot.doctor_specialization})
              </div>
              <div style={{ fontSize: '0.82rem', color: '#0284c7', fontWeight: 600, marginBottom: '6px' }}>
                📅 {cancelSlotModal.slot.date} &middot; 🕒 {cancelSlotModal.slot.start_time} {cancelSlotModal.slot.end_time ? `- ${cancelSlotModal.slot.end_time}` : ''}
              </div>
              <div style={{ fontSize: '0.78rem', color: '#dc2626', fontWeight: 700, background: '#fef2f2', padding: '4px 8px', borderRadius: '6px', border: '1px solid #fecaca' }}>
                ⚠️ {cancelSlotModal.slot.booked_count} Patient(s) booked in this slot will be affected and notified via email.
              </div>
            </div>

            {/* Resolution Mode Selection */}
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 800, color: 'var(--c-navy)', marginBottom: '8px' }}>
                Select Resolution Action for Affected Patients:
              </label>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                {/* Option A: Auto-Reschedule */}
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '0.75rem',
                    padding: '0.85rem',
                    borderRadius: '10px',
                    border: cancelSlotModal.action === 'auto_reschedule' ? '2px solid #0284c7' : '1px solid #e2e8f0',
                    background: cancelSlotModal.action === 'auto_reschedule' ? '#f0f9ff' : '#fff',
                    cursor: 'pointer',
                  }}
                >
                  <input
                    type="radio"
                    name="hospital_cancel_action"
                    checked={cancelSlotModal.action === 'auto_reschedule'}
                    onChange={() => setCancelSlotModal({ ...cancelSlotModal, action: 'auto_reschedule' })}
                    style={{ marginTop: '3px', accentColor: '#0284c7' }}
                  />
                  <div>
                    <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#0369a1', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <RotateCcw size={14} /> Auto-Reschedule to Next Available Slot (Recommended)
                    </div>
                    <p style={{ fontSize: '0.78rem', color: '#475569', margin: '3px 0 0', lineHeight: 1.35 }}>
                      Automatically shifts all booked patients to Dr. {cancelSlotModal.slot.doctor_name}'s next active open slot and dispatches email with doctor name, hospital name, updated time, and sincere apologies.
                    </p>
                  </div>
                </label>

                {/* Option B: 100% Full Refund */}
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '0.75rem',
                    padding: '0.85rem',
                    borderRadius: '10px',
                    border: cancelSlotModal.action === 'cancel_refund' ? '2px solid #dc2626' : '1px solid #e2e8f0',
                    background: cancelSlotModal.action === 'cancel_refund' ? '#fef2f2' : '#fff',
                    cursor: 'pointer',
                  }}
                >
                  <input
                    type="radio"
                    name="hospital_cancel_action"
                    checked={cancelSlotModal.action === 'cancel_refund'}
                    onChange={() => setCancelSlotModal({ ...cancelSlotModal, action: 'cancel_refund' })}
                    style={{ marginTop: '3px', accentColor: '#dc2626' }}
                  />
                  <div>
                    <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#991b1b', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      💰 100% Full Refund Cancellation (Zero Deductions)
                    </div>
                    <p style={{ fontSize: '0.78rem', color: '#475569', margin: '3px 0 0', lineHeight: 1.35 }}>
                      Cancels all patient appointments with 100% refund (₹0 deduction) and sends cancellation apology email with full refund receipt.
                    </p>
                  </div>
                </label>
              </div>
            </div>

            {/* Cancellation Reason Dropdown */}
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 800, color: 'var(--c-navy)', marginBottom: '4px' }}>
                Reason for Cancellation (included in Patient Apology Email):
              </label>
              <select
                value={cancelSlotModal.reason}
                onChange={(e) => setCancelSlotModal({ ...cancelSlotModal, reason: e.target.value })}
                style={{ width: '100%', height: '38px', borderRadius: '8px', border: '1px solid var(--c-border)', padding: '0 10px', fontSize: '0.85rem', background: '#fff' }}
              >
                <option value="Doctor Emergency / Unavoidable Clinical Duty">Doctor Emergency / Unavoidable Clinical Duty</option>
                <option value="Doctor is unwell / on medical leave">Doctor is unwell / on medical leave</option>
                <option value="Hospital Department / Facility Maintenance">Hospital Department / Facility Maintenance</option>
                <option value="Administrative Schedule Realignment">Administrative Schedule Realignment</option>
                <option value="Other">Other (Custom Reason)</option>
              </select>

              {cancelSlotModal.reason === 'Other' && (
                <textarea
                  rows={2}
                  placeholder="Explain the cancellation reason..."
                  value={cancelSlotModal.customReason}
                  onChange={(e) => setCancelSlotModal({ ...cancelSlotModal, customReason: e.target.value })}
                  style={{ width: '100%', marginTop: '8px', borderRadius: '8px', border: '1px solid var(--c-border)', padding: '8px 10px', fontSize: '0.84rem' }}
                />
              )}
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', borderTop: '1px solid #e2e8f0', paddingTop: '1rem' }}>
              <button
                type="button"
                onClick={() => setCancelSlotModal({ ...cancelSlotModal, open: false })}
                className="btn btn-outline"
                disabled={cancelSlotModal.submitting}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteCancelSlot}
                disabled={cancelSlotModal.submitting}
                className="btn btn-primary"
                style={{ background: '#dc2626', borderColor: '#dc2626', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                {cancelSlotModal.submitting ? 'Executing & Notifying...' : 'Confirm Resolution & Notify Patients'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. DOCTOR EDIT MODAL */}
      {/* ========================================================================= */}
      {editingDoctor && (
        <div className="modal-backdrop" onClick={closeEditDoctorModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '680px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.75rem' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: 'var(--c-navy)' }}>
                  Edit Dr. {editingDoctor.name}
                </h3>
                <span style={{ fontSize: '0.78rem', color: '#0284c7', fontWeight: 600 }}>{stats?.hospital_name}</span>
              </div>
              <button type="button" onClick={closeEditDoctorModal} className="btn btn-ghost btn-sm">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveDoctor} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--c-navy)', display: 'block', marginBottom: '3px' }}>Doctor Name *</label>
                  <input
                    type="text"
                    required
                    value={editFormData.name}
                    onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                    style={{ width: '100%', height: '38px', borderRadius: '6px', border: '1px solid var(--c-border)', padding: '0 10px', fontSize: '0.88rem' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--c-navy)', display: 'block', marginBottom: '3px' }}>Specialization *</label>
                  <input
                    type="text"
                    required
                    value={editFormData.specialization}
                    onChange={(e) => setEditFormData({ ...editFormData, specialization: e.target.value })}
                    style={{ width: '100%', height: '38px', borderRadius: '6px', border: '1px solid var(--c-border)', padding: '0 10px', fontSize: '0.88rem' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--c-navy)', display: 'block', marginBottom: '3px' }}>Qualification *</label>
                  <input
                    type="text"
                    required
                    value={editFormData.qualification}
                    onChange={(e) => setEditFormData({ ...editFormData, qualification: e.target.value })}
                    style={{ width: '100%', height: '38px', borderRadius: '6px', border: '1px solid var(--c-border)', padding: '0 10px', fontSize: '0.88rem' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--c-navy)', display: 'block', marginBottom: '3px' }}>Experience (Years) *</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={editFormData.experience_years}
                    onChange={(e) => setEditFormData({ ...editFormData, experience_years: e.target.value })}
                    style={{ width: '100%', height: '38px', borderRadius: '6px', border: '1px solid var(--c-border)', padding: '0 10px', fontSize: '0.88rem' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--c-navy)', display: 'block', marginBottom: '3px' }}>Consultation Fee (₹) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={editFormData.fee}
                    onChange={(e) => setEditFormData({ ...editFormData, fee: e.target.value })}
                    style={{ width: '100%', height: '38px', borderRadius: '6px', border: '1px solid var(--c-border)', padding: '0 10px', fontSize: '0.88rem' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--c-navy)', display: 'block', marginBottom: '3px' }}>Contact Phone</label>
                  <input
                    type="text"
                    value={editFormData.contact_number}
                    onChange={(e) => setEditFormData({ ...editFormData, contact_number: e.target.value })}
                    placeholder="+91 98765 43210"
                    style={{ width: '100%', height: '38px', borderRadius: '6px', border: '1px solid var(--c-border)', padding: '0 10px', fontSize: '0.88rem' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--c-navy)', display: 'block', marginBottom: '3px' }}>Contact Email</label>
                  <input
                    type="email"
                    value={editFormData.contact_email}
                    onChange={(e) => setEditFormData({ ...editFormData, contact_email: e.target.value })}
                    placeholder="doctor@hospital.com"
                    style={{ width: '100%', height: '38px', borderRadius: '6px', border: '1px solid var(--c-border)', padding: '0 10px', fontSize: '0.88rem' }}
                  />
                </div>

                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--c-navy)', display: 'block', marginBottom: '3px' }}>Chamber / Clinic Physical Address</label>
                  <input
                    type="text"
                    value={editFormData.clinic_address}
                    onChange={(e) => setEditFormData({ ...editFormData, clinic_address: e.target.value })}
                    placeholder="Suite 302, 3rd Floor, OPD Wing..."
                    style={{ width: '100%', height: '38px', borderRadius: '6px', border: '1px solid var(--c-border)', padding: '0 10px', fontSize: '0.88rem' }}
                  />
                </div>

                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--c-navy)', display: 'block', marginBottom: '3px' }}>Google Maps URL (Optional)</label>
                  <input
                    type="url"
                    value={editFormData.google_maps_url}
                    onChange={(e) => setEditFormData({ ...editFormData, google_maps_url: e.target.value })}
                    placeholder="https://maps.google.com/..."
                    style={{ width: '100%', height: '38px', borderRadius: '6px', border: '1px solid var(--c-border)', padding: '0 10px', fontSize: '0.88rem' }}
                  />
                </div>

                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--c-navy)', display: 'block', marginBottom: '3px' }}>Doctor Bio</label>
                  <textarea
                    rows="2"
                    value={editFormData.bio}
                    onChange={(e) => setEditFormData({ ...editFormData, bio: e.target.value })}
                    style={{ width: '100%', borderRadius: '6px', border: '1px solid var(--c-border)', padding: '8px 10px', fontSize: '0.88rem', fontFamily: 'inherit' }}
                  />
                </div>

                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, color: 'var(--c-navy)', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={editFormData.is_active}
                      onChange={(e) => setEditFormData({ ...editFormData, is_active: e.target.checked })}
                      style={{ width: '16px', height: '16px', accentColor: '#0284c7' }}
                    />
                    Active Doctor (Receiving online patient bookings)
                  </label>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem', borderTop: '1px solid #e2e8f0', paddingTop: '1rem' }}>
                <button
                  type="submit"
                  disabled={editLoading}
                  className="btn btn-primary"
                  style={{ flex: 1, background: '#0284c7', borderColor: '#0284c7' }}
                >
                  {editLoading ? 'Saving Changes...' : 'Save Doctor Details'}
                </button>
                <button
                  type="button"
                  onClick={closeEditDoctorModal}
                  className="btn btn-outline"
                  style={{ flex: 0.4 }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. INVOICE MODAL */}
      {selectedInvoice && (
        <InvoiceModal appointment={selectedInvoice} onClose={() => setSelectedInvoice(null)} />
      )}
    </div>
  );
};

export default HospitalDashboardPage;
