import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import Alert from '../components/Alert';
import InvoiceModal from '../components/InvoiceModal';
import '../styles/AdminDashboard.css';
import {
  LayoutDashboard, Users, UserCog, Calendar, CreditCard, Building,
  Plus, Edit3, Trash2, Search, Filter, RefreshCw, CheckCircle,
  XCircle, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
  ExternalLink, Power, Stethoscope, Award, Clock, AlertTriangle,
  RotateCcw, Lock, Unlock, Mail, ShieldAlert, Check, X,
  MapPin, Navigation, Phone, Copy, Key, ShieldCheck, CheckCheck,
  LogOut, Eye, UserCheck, FileText, Camera, UploadCloud, Sparkles, Image
} from 'lucide-react';
import { getDoctorAvatar, DOCTOR_AVATAR_PRESETS, compressImage } from '../utils/doctorAvatars';


const getPageNumbers = (current, total) => {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }
  if (current <= 4) {
    return [1, 2, 3, 4, 5, '...', total];
  }
  if (current >= total - 3) {
    return [1, '...', total - 4, total - 3, total - 2, total - 1, total];
  }
  return [1, '...', current - 1, current, current + 1, '...', total];
};

const AdminDashboardPage = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [alertInfo, setAlertInfo] = useState({ type: '', message: '' });
  const [selectedInvoice, setSelectedInvoice] = useState(null);

  useEffect(() => {
    if (location.state?.alert) {
      setAlertInfo(location.state.alert);
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  // Doctor tab filters & pagination
  const [doctorSearch, setDoctorSearch] = useState('');
  const [selectedDoctorSpec, setSelectedDoctorSpec] = useState('');
  const [selectedHospital, setSelectedHospital] = useState('');
  const [doctorAvailability, setDoctorAvailability] = useState('all');
  const [doctorPage, setDoctorPage] = useState(1);
  const [doctorPageSize, setDoctorPageSize] = useState(10);

  // Doctor Quick Photo Studio Modal State
  const [photoModalDoctor, setPhotoModalDoctor] = useState(null);
  const [photoMode, setPhotoMode] = useState('presets'); // 'presets' | 'upload' | 'url'
  const [selectedPresetUrl, setSelectedPresetUrl] = useState('');
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState('');
  const [photoGenderFilter, setPhotoGenderFilter] = useState('all'); // 'all' | 'Male' | 'Female'
  const [photoSubmitting, setPhotoSubmitting] = useState(false);
  const [customUrlInput, setCustomUrlInput] = useState('');

  // Patient tab filters & pagination
  const [patientSearch, setPatientSearch] = useState('');
  const [patientFilterType, setPatientFilterType] = useState('all'); // 'all' | 'verified' | 'with_phone'
  const [selectedPatientModal, setSelectedPatientModal] = useState(null);
  const [patientPage, setPatientPage] = useState(1);
  const [patientPageSize, setPatientPageSize] = useState(12);


  // Appointment tab filters & pagination
  const [appointmentSearch, setAppointmentSearch] = useState('');
  const [appointmentStatusFilter, setAppointmentStatusFilter] = useState('all');
  const [appointmentPage, setAppointmentPage] = useState(1);
  const [appointmentPageSize, setAppointmentPageSize] = useState(10);

  // Dynamic Hospitals List state
  const [adminHospitals, setAdminHospitals] = useState([]);
  const [hospitalsLoading, setHospitalsLoading] = useState(false);
  const [addHospitalModalOpen, setAddHospitalModalOpen] = useState(false);
  const [addHospitalLoading, setAddHospitalLoading] = useState(false);
  const [newHospitalData, setNewHospitalData] = useState({
    name: '',
    contact_phone: '',
    contact_email: '',
    address: '',
    city: 'Bangalore',
    state: 'Karnataka',
    google_maps_url: '',
    manager_username: '',
    manager_password: 'hospital@123',
  });
  const [createdCredentialsModal, setCreatedCredentialsModal] = useState({ open: false, data: null });
  const [editHospitalTarget, setEditHospitalTarget] = useState(null);
  const [editHospitalData, setEditHospitalData] = useState({});
  const [editHospitalLoading, setEditHospitalLoading] = useState(false);
  const [copiedSlug, setCopiedSlug] = useState('');

  // Hospital tab search & filter
  const [hospitalSearch, setHospitalSearch] = useState('');

  // Slot Management tab state
  const [slotsList, setSlotsList] = useState([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slotSearch, setSlotSearch] = useState('');
  const [slotHospitalFilter, setSlotHospitalFilter] = useState('');
  const [slotDoctorFilter, setSlotDoctorFilter] = useState('');
  const [slotDateFilter, setSlotDateFilter] = useState('');
  const [slotStatusFilter, setSlotStatusFilter] = useState('all'); // all, available, full, blocked
  const [slotPage, setSlotPage] = useState(1);
  const [slotPageSize, setSlotPageSize] = useState(12);
  const [totalSlotPages, setTotalSlotPages] = useState(1);
  const [totalSlotsCount, setTotalSlotsCount] = useState(0);

  // Slot Cancellation Modal State
  const [cancelSlotTarget, setCancelSlotTarget] = useState(null);
  const [cancelSlotAction, setCancelSlotAction] = useState('auto_reschedule'); // 'auto_reschedule' | 'cancel_refund'
  const [cancelSlotReason, setCancelSlotReason] = useState('Emergency doctor unavailability / Administrative schedule change');
  const [cancelSlotLoading, setCancelSlotLoading] = useState(false);

  // Admin Reschedule Modal State
  const [rescheduleTargetAppt, setRescheduleTargetAppt] = useState(null);
  const [rescheduleDoctorId, setRescheduleDoctorId] = useState('');
  const [rescheduleAvailableDates, setRescheduleAvailableDates] = useState([]);
  const [rescheduleSelectedDate, setRescheduleSelectedDate] = useState('');
  const [rescheduleAvailableSlots, setRescheduleAvailableSlots] = useState([]);
  const [rescheduleSelectedSlotId, setRescheduleSelectedSlotId] = useState('');
  const [rescheduleNotes, setRescheduleNotes] = useState('');
  const [rescheduleLoading, setRescheduleLoading] = useState(false);
  const [fetchingDatesSlots, setFetchingDatesSlots] = useState(false);

  const fetchAdminStats = async (isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const res = await api.get(`/appointments/admin/stats/${isManualRefresh ? '?refresh=true' : ''}`);
      setStats(res.data);
      if (isManualRefresh) {
        setAlertInfo({ type: 'success', message: 'Dashboard statistics refreshed successfully!' });
      }
    } catch (err) {
      setAlertInfo({ type: 'error', message: 'Failed to load admin dashboard statistics.' });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchAdminHospitals = async () => {
    setHospitalsLoading(true);
    try {
      const res = await api.get('/doctors/admin/hospitals/');
      setAdminHospitals(res.data || []);
    } catch (err) {
      console.error('Error fetching admin hospitals:', err);
    } finally {
      setHospitalsLoading(false);
    }
  };

  const handleCreateHospital = async (e) => {
    e.preventDefault();
    setAddHospitalLoading(true);
    try {
      const res = await api.post('/doctors/admin/hospitals/', newHospitalData);
      setAddHospitalModalOpen(false);
      setNewHospitalData({
        name: '',
        contact_phone: '',
        contact_email: '',
        address: '',
        city: 'Bangalore',
        state: 'Karnataka',
        google_maps_url: '',
        manager_username: '',
        manager_password: 'hospital@123',
      });
      setCreatedCredentialsModal({
        open: true,
        data: res.data
      });
      setAlertInfo({
        type: 'success',
        message: `Hospital '${res.data.name}' registered & manager credentials generated successfully!`
      });
      fetchAdminHospitals();
      fetchAdminStats(true);
    } catch (err) {
      const msg = err.response?.data?.error || 'Failed to create hospital.';
      setAlertInfo({ type: 'error', message: msg });
    } finally {
      setAddHospitalLoading(false);
    }
  };

  const handleOpenEditHospital = (h) => {
    setEditHospitalTarget(h);
    setEditHospitalData({
      name: h.name || '',
      contact_phone: h.contact_phone || '',
      contact_email: h.contact_email || '',
      address: h.address || '',
      city: h.city || '',
      state: h.state || '',
      google_maps_url: h.google_maps_url || '',
      is_active: h.is_active ?? true,
      reset_password: '',
    });
  };

  const handleUpdateHospital = async (e) => {
    e.preventDefault();
    if (!editHospitalTarget) return;
    setEditHospitalLoading(true);
    try {
      const res = await api.patch(`/doctors/admin/hospitals/${editHospitalTarget.id}/`, editHospitalData);
      setAlertInfo({
        type: 'success',
        message: res.data.message || `Hospital '${res.data.name}' updated successfully!`
      });
      setEditHospitalTarget(null);
      fetchAdminHospitals();
      fetchAdminStats(true);
    } catch (err) {
      const msg = err.response?.data?.error || 'Failed to update hospital details.';
      setAlertInfo({ type: 'error', message: msg });
    } finally {
      setEditHospitalLoading(false);
    }
  };

  const handleToggleHospitalActive = async (h) => {
    try {
      const res = await api.patch(`/doctors/admin/hospitals/${h.id}/`, { is_active: !h.is_active });
      setAlertInfo({
        type: 'info',
        message: `Hospital '${h.name}' status set to ${!h.is_active ? 'Active' : 'Inactive'}.`
      });
      fetchAdminHospitals();
      fetchAdminStats(true);
    } catch (err) {
      setAlertInfo({ type: 'error', message: 'Failed to update hospital status.' });
    }
  };

  const handleCopyCredentials = (username, password = 'hospital@123') => {
    const text = `Hospital Management Login Credentials:\nPortal: ${window.location.origin}/login\nUsername: ${username}\nPassword: ${password}`;
    navigator.clipboard.writeText(text);
    setCopiedSlug(username);
    setTimeout(() => setCopiedSlug(''), 3000);
  };

  const fetchAdminSlots = async () => {
    setSlotsLoading(true);
    try {
      const params = new URLSearchParams();
      if (slotDoctorFilter) params.append('doctor_id', slotDoctorFilter);
      if (slotHospitalFilter) params.append('hospital', slotHospitalFilter);
      if (slotDateFilter) params.append('date', slotDateFilter);
      if (slotStatusFilter !== 'all') params.append('status', slotStatusFilter);
      if (slotSearch) params.append('search', slotSearch);
      params.append('page', slotPage);
      params.append('page_size', slotPageSize);

      const res = await api.get(`/appointments/admin/slots/?${params.toString()}`);
      setSlotsList(res.data.results || []);
      setTotalSlotPages(res.data.num_pages || 1);
      setTotalSlotsCount(res.data.count || 0);
    } catch (err) {
      console.error('Error fetching admin slots:', err);
    } finally {
      setSlotsLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminStats();
    fetchAdminHospitals();
  }, []);

  useEffect(() => {
    if (activeTab === 'slots') {
      fetchAdminSlots();
    } else if (activeTab === 'hospitals') {
      fetchAdminHospitals();
    }
  }, [activeTab, slotDoctorFilter, slotHospitalFilter, slotDateFilter, slotStatusFilter, slotSearch, slotPage, slotPageSize]);

  // Background auto-refresh polling every 25s for live booking and slot capacity synchronization
  useEffect(() => {
    const timer = setInterval(() => {
      fetchAdminStats(true);
      if (activeTab === 'slots') {
        fetchAdminSlots();
      }
    }, 25000);
    return () => clearInterval(timer);
  }, [activeTab, slotDoctorFilter, slotHospitalFilter, slotDateFilter, slotStatusFilter, slotSearch, slotPage, slotPageSize]);

  const handleDeleteDoctor = async (id, name) => {
    if (!window.confirm(`Are you sure you want to permanently delete Dr. ${name}? This will delete their schedules and unbooked slots.`)) return;

    try {
      await api.delete(`/doctors/admin/${id}/`);
      setAlertInfo({ type: 'success', message: `Dr. ${name} has been removed successfully!` });
      fetchAdminStats(true);
    } catch (err) {
      setAlertInfo({ type: 'error', message: 'Failed to delete doctor. Check if active appointments exist.' });
    }
  };

  const handleOpenPhotoModal = (doc) => {
    const currentAvatar = doc.image || getDoctorAvatar({ name: doc.doctor_name, image: doc.image });
    setPhotoModalDoctor(doc);
    setPhotoMode('presets');
    setSelectedPresetUrl(doc.image || '');
    setPhotoFile(null);
    setPhotoPreview(currentAvatar);
    setCustomUrlInput(doc.image && doc.image.startsWith('http') ? doc.image : '');
    setPhotoGenderFilter('all');
  };

  const handlePhotoFileChange = async (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        setAlertInfo({ type: 'error', message: 'Image size exceeds 10MB limit. Please choose a smaller file.' });
        return;
      }
      setSelectedPresetUrl('');
      setPhotoPreview(URL.createObjectURL(file));
      setAlertInfo({ type: '', message: '' });
      try {
        const compressed = await compressImage(file);
        setPhotoFile(compressed);
      } catch (err) {
        setPhotoFile(file);
      }
    }
  };

  const handleSelectPresetPhoto = (preset) => {
    setSelectedPresetUrl(preset.url);
    setPhotoFile(null);
    setPhotoPreview(preset.url);
  };

  const handleSaveDoctorPhoto = async (e) => {
    if (e) e.preventDefault();
    if (!photoModalDoctor) return;
    setPhotoSubmitting(true);
    try {
      const payload = new FormData();
      if (photoMode === 'upload' && photoFile) {
        payload.append('image', photoFile);
      } else if (photoMode === 'url' && customUrlInput.trim()) {
        payload.append('image', customUrlInput.trim());
      } else if (selectedPresetUrl) {
        payload.append('image', selectedPresetUrl);
      } else if (photoPreview) {
        payload.append('image', photoPreview);
      }

      const res = await api.patch(`/doctors/admin/${photoModalDoctor.doctor_id}/`, payload, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const updatedImage = res.data.image || selectedPresetUrl || (photoMode === 'url' ? customUrlInput.trim() : photoPreview);

      // Instantly update stats in local state
      setStats((prev) => {
        if (!prev || !prev.all_doctors) return prev;
        return {
          ...prev,
          all_doctors: prev.all_doctors.map((d) =>
            d.doctor_id === photoModalDoctor.doctor_id
              ? { ...d, image: updatedImage }
              : d
          ),
        };
      });

      setAlertInfo({
        type: 'success',
        message: `Profile photo for Dr. ${photoModalDoctor.doctor_name} updated successfully!`
      });
      setPhotoModalDoctor(null);
    } catch (err) {
      let errMsg = 'Failed to update doctor profile photo. Please try again.';
      if (err.response?.data) {
        if (typeof err.response.data === 'string') errMsg = err.response.data;
        else if (err.response.data.image) errMsg = Array.isArray(err.response.data.image) ? err.response.data.image[0] : err.response.data.image;
        else errMsg = JSON.stringify(err.response.data);
      }
      setAlertInfo({ type: 'error', message: errMsg });
    } finally {
      setPhotoSubmitting(false);
    }
  };

  const handleToggleDoctorActive = async (id, currentActive, name) => {
    try {
      await api.patch(`/doctors/admin/${id}/`, { is_active: !currentActive });
      setAlertInfo({
        type: 'success',
        message: `Dr. ${name} marked as ${!currentActive ? 'Active' : 'Inactive'}.`
      });
      fetchAdminStats(true);
    } catch (err) {
      setAlertInfo({ type: 'error', message: 'Failed to update doctor status.' });
    }
  };

  const handleUpdateStatus = async (apptId, newStatus) => {
    try {
      await api.patch(`/appointments/admin/${apptId}/status/`, { status: newStatus });
      setAlertInfo({ type: 'success', message: `Appointment status updated to ${newStatus.toUpperCase()}.` });
      fetchAdminStats(true);
    } catch (err) {
      setAlertInfo({ type: 'error', message: 'Failed to update status.' });
    }
  };

  // --- Slot Block / Unblock ---
  const handleToggleSlotBlock = async (slotId) => {
    try {
      const res = await api.post(`/appointments/admin/slots/${slotId}/toggle-block/`);
      setAlertInfo({ type: 'success', message: res.data.message });
      fetchAdminSlots();
      fetchAdminStats(true);
    } catch (err) {
      setAlertInfo({ type: 'error', message: 'Failed to toggle slot block status.' });
    }
  };

  // --- Slot Cancellation (With Email to Patients) ---
  const handleExecuteCancelSlot = async () => {
    if (!cancelSlotTarget) return;
    setCancelSlotLoading(true);
    try {
      const res = await api.post(`/appointments/admin/slots/${cancelSlotTarget.id}/cancel/`, {
        action: cancelSlotAction,
        reason: cancelSlotReason
      });
      setAlertInfo({
        type: 'success',
        message: res.data.message || 'Slot cancelled and patients notified via email.'
      });
      setCancelSlotTarget(null);
      fetchAdminSlots();
      fetchAdminStats(true);
    } catch (err) {
      setAlertInfo({ type: 'error', message: err.response?.data?.error || 'Failed to cancel slot.' });
    } finally {
      setCancelSlotLoading(false);
    }
  };

  // --- Admin Reschedule Flow ---
  const handleOpenRescheduleModal = async (appt) => {
    setRescheduleTargetAppt(appt);
    const docId = appt.doctor_id || appt.doctor?.id || appt.doctor;
    setRescheduleDoctorId(docId);
    setRescheduleSelectedDate('');
    setRescheduleSelectedSlotId('');
    setRescheduleNotes(`Admin rescheduled consultation from ${appt.slot_date || ''} ${appt.slot_time || ''}`);
    setRescheduleAvailableDates([]);
    setRescheduleAvailableSlots([]);

    if (docId) {
      setFetchingDatesSlots(true);
      try {
        const res = await api.get(`/doctors/${docId}/available-dates/`);
        setRescheduleAvailableDates(res.data || []);
      } catch (err) {
        console.error('Error fetching available dates:', err);
      } finally {
        setFetchingDatesSlots(false);
      }
    }
  };

  const handleRescheduleDateSelect = async (date) => {
    setRescheduleSelectedDate(date);
    setRescheduleSelectedSlotId('');
    if (!rescheduleDoctorId || !date) return;

    setFetchingDatesSlots(true);
    try {
      const res = await api.get(`/doctors/${rescheduleDoctorId}/slots/?date=${date}`);
      setRescheduleAvailableSlots(res.data || []);
    } catch (err) {
      console.error('Error fetching available slots:', err);
    } finally {
      setFetchingDatesSlots(false);
    }
  };

  const handleExecuteReschedule = async () => {
    if (!rescheduleTargetAppt || !rescheduleSelectedSlotId) return;
    setRescheduleLoading(true);
    try {
      const res = await api.post(`/appointments/admin/${rescheduleTargetAppt.id}/reschedule/`, {
        new_slot_id: rescheduleSelectedSlotId,
        notes: rescheduleNotes,
      });
      setAlertInfo({
        type: 'success',
        message: `${res.data.message} An updated confirmation email has been dispatched to the patient.`
      });
      setRescheduleTargetAppt(null);
      fetchAdminStats(true);
      if (activeTab === 'slots') fetchAdminSlots();
    } catch (err) {
      setAlertInfo({ type: 'error', message: err.response?.data?.error || 'Failed to reschedule appointment.' });
    } finally {
      setRescheduleLoading(false);
    }
  };

  if (loading && !stats) {
    return (
      <div className="admin-container" style={{ padding: '2rem 1rem' }}>
        {/* Header Skeleton */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div className="skeleton-shimmer" style={{ width: '280px', height: '32px', marginBottom: '8px' }}></div>
            <div className="skeleton-shimmer" style={{ width: '420px', height: '16px' }}></div>
          </div>
          <div className="skeleton-shimmer" style={{ width: '160px', height: '40px', borderRadius: '8px' }}></div>
        </div>

        {/* Metric Cards Skeleton */}
        <div className="admin-stats-grid" style={{ marginBottom: '2rem' }}>
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="admin-stat-card" style={{ padding: '1.25rem' }}>
              <div className="skeleton-shimmer" style={{ width: '48px', height: '48px', borderRadius: '12px', flexShrink: 0 }}></div>
              <div style={{ flex: 1 }}>
                <div className="skeleton-shimmer" style={{ width: '60%', height: '14px', marginBottom: '8px' }}></div>
                <div className="skeleton-shimmer" style={{ width: '80%', height: '24px' }}></div>
              </div>
            </div>
          ))}
        </div>

        {/* Content Area Skeleton */}
        <div className="admin-layout">
          <div className="admin-sidebar">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="skeleton-shimmer" style={{ width: '100%', height: '42px', marginBottom: '8px', borderRadius: '8px' }}></div>
            ))}
          </div>
          <div className="admin-content">
            <div className="card" style={{ padding: '1.5rem' }}>
              <div className="skeleton-shimmer" style={{ width: '220px', height: '24px', marginBottom: '1.25rem' }}></div>
              <div className="skeleton-shimmer" style={{ width: '100%', height: '220px', borderRadius: '12px' }}></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Doctor Filtering
  const filteredDoctors = (stats?.doctors_stats || []).filter((d) => {
    const matchesSearch =
      d.doctor_name.toLowerCase().includes(doctorSearch.toLowerCase()) ||
      d.specialization.toLowerCase().includes(doctorSearch.toLowerCase()) ||
      d.hospital_name.toLowerCase().includes(doctorSearch.toLowerCase());

    const matchesSpec = !selectedDoctorSpec || d.specialization === selectedDoctorSpec;
    const matchesHospital = !selectedHospital || d.hospital_name === selectedHospital;

    let matchesAvail = true;
    if (doctorAvailability === 'today') matchesAvail = Boolean(d.is_available_today);
    else if (doctorAvailability === 'available') matchesAvail = d.total_slots > 0 && d.is_active;
    else if (doctorAvailability === 'active') matchesAvail = Boolean(d.is_active);
    else if (doctorAvailability === 'inactive') matchesAvail = !d.is_active;

    return matchesSearch && matchesSpec && matchesHospital && matchesAvail;
  });

  const totalDoctorPages = Math.ceil(filteredDoctors.length / doctorPageSize) || 1;
  const paginatedDoctors = filteredDoctors.slice(
    (doctorPage - 1) * doctorPageSize,
    doctorPage * doctorPageSize
  );

  // Patient Filtering
  const filteredPatients = (stats?.patients_list || []).filter((p) => {
    const q = patientSearch.toLowerCase();
    const fullName = `${p.first_name || ''} ${p.last_name || ''}`.trim().toLowerCase();
    const matchesSearch =
      !patientSearch ||
      (p.username || '').toLowerCase().includes(q) ||
      (p.email || '').toLowerCase().includes(q) ||
      fullName.includes(q) ||
      (p.phone && p.phone.includes(patientSearch));

    if (!matchesSearch) return false;
    if (patientFilterType === 'verified') return p.is_verified;
    if (patientFilterType === 'with_phone') return Boolean(p.phone);
    return true;
  });
  const totalPatientPages = Math.ceil(filteredPatients.length / patientPageSize) || 1;
  const paginatedPatients = filteredPatients.slice(
    (patientPage - 1) * patientPageSize,
    patientPage * patientPageSize
  );


  // Appointment Filtering
  const filteredAppointments = (stats?.all_appointments || []).filter((appt) => {
    const matchesSearch =
      (appt.patient_name || '').toLowerCase().includes(appointmentSearch.toLowerCase()) ||
      (appt.patient_email || '').toLowerCase().includes(appointmentSearch.toLowerCase()) ||
      (appt.doctor_name || '').toLowerCase().includes(appointmentSearch.toLowerCase()) ||
      (appt.slot_date || '').includes(appointmentSearch) ||
      (appt.receipt_id || '').toLowerCase().includes(appointmentSearch.toLowerCase());

    const matchesStatus = appointmentStatusFilter === 'all' || appt.status === appointmentStatusFilter;

    return matchesSearch && matchesStatus;
  });

  const totalApptPages = Math.ceil(filteredAppointments.length / appointmentPageSize) || 1;
  const paginatedAppointments = filteredAppointments.slice(
    (appointmentPage - 1) * appointmentPageSize,
    appointmentPage * appointmentPageSize
  );

  // Hospital list filtering
  const filteredHospitalsList = Object.entries(stats?.hospital_stats || {}).filter(([hName]) =>
    hName.toLowerCase().includes(hospitalSearch.toLowerCase())
  );

  const totalHospitalsCount = Object.keys(stats?.hospital_stats || {}).length;

  return (
    <div style={{ display: 'flex', minHeight: 'calc(100vh - 72px)', background: 'var(--c-bg)' }}>
      {/* SIDEBAR NAVIGATION */}
      <aside style={{ width: '260px', background: '#fff', borderRight: '1px solid var(--c-border)', display: 'flex', flexDirection: 'column', padding: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.5rem 0.75rem 1.25rem', borderBottom: '1px solid var(--c-border)', marginBottom: '1.25rem' }}>
          <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'var(--color-primary-subtle)', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Award size={22} />
          </div>
          <div>
            <h2 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--color-navy)', margin: 0 }}>CareConnect</h2>
            <span style={{ fontSize: '0.72rem', color: 'var(--color-primary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Admin Console</span>
          </div>
        </div>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', flex: 1 }}>
          <div style={{ fontSize: '0.7rem', fontWeight: 'bold', color: 'var(--c-text-light)', textTransform: 'uppercase', letterSpacing: '0.05em', padding: '0.25rem 0.75rem 0.5rem' }}>
            Core Operations
          </div>

          <button
            type="button"
            onClick={() => setActiveTab('overview')}
            className={`sidebar-item ${activeTab === 'overview' ? 'active' : ''}`}
            style={{ width: '100%', border: 'none', background: activeTab === 'overview' ? 'var(--c-emerald-light)' : 'none', color: activeTab === 'overview' ? 'var(--c-emerald)' : 'var(--c-navy)', textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.65rem 0.75rem', borderRadius: '8px', fontSize: '0.9rem', fontWeight: 600 }}
          >
            <LayoutDashboard size={18} />
            <span>Overview Dashboard</span>
          </button>

          {/* 🏥 HOSPITAL DASHBOARD TAB */}
          <button
            type="button"
            onClick={() => setActiveTab('hospitals')}
            className={`sidebar-item ${activeTab === 'hospitals' ? 'active' : ''}`}
            style={{ width: '100%', border: 'none', background: activeTab === 'hospitals' ? 'var(--c-emerald-light)' : 'none', color: activeTab === 'hospitals' ? 'var(--c-emerald)' : 'var(--c-navy)', textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.65rem 0.75rem', borderRadius: '8px', fontSize: '0.9rem', fontWeight: 600 }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <Building size={18} />
              <span>Hospital Dashboard</span>
            </div>
            <span style={{ fontSize: '0.75rem', background: '#e0f2fe', color: '#0284c7', padding: '2px 8px', borderRadius: '12px', fontWeight: 700 }}>
              {totalHospitalsCount}
            </span>
          </button>

          {/* 📅 SLOT MANAGEMENT TAB */}
          <button
            type="button"
            onClick={() => { setActiveTab('slots'); setSlotPage(1); }}
            className={`sidebar-item ${activeTab === 'slots' ? 'active' : ''}`}
            style={{ width: '100%', border: 'none', background: activeTab === 'slots' ? 'var(--c-emerald-light)' : 'none', color: activeTab === 'slots' ? 'var(--c-emerald)' : 'var(--c-navy)', textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.65rem 0.75rem', borderRadius: '8px', fontSize: '0.9rem', fontWeight: 600 }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <Clock size={18} />
              <span>Slot Management</span>
            </div>
            <span style={{ fontSize: '0.75rem', background: '#fef3c7', color: '#d97706', padding: '2px 8px', borderRadius: '12px', fontWeight: 700 }}>
              Live
            </span>
          </button>

          <button
            type="button"
            onClick={() => { setActiveTab('doctors'); setDoctorPage(1); }}
            className={`sidebar-item ${activeTab === 'doctors' ? 'active' : ''}`}
            style={{ width: '100%', border: 'none', background: activeTab === 'doctors' ? 'var(--c-emerald-light)' : 'none', color: activeTab === 'doctors' ? 'var(--c-emerald)' : 'var(--c-navy)', textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.65rem 0.75rem', borderRadius: '8px', fontSize: '0.9rem', fontWeight: 600 }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <Users size={18} />
              <span>Doctors Directory</span>
            </div>
            <span style={{ fontSize: '0.75rem', background: 'var(--color-primary-subtle)', color: 'var(--color-primary)', padding: '2px 8px', borderRadius: '12px', fontWeight: 700 }}>
              {stats?.total_doctors || 0}
            </span>
          </button>

          <button
            type="button"
            onClick={() => { setActiveTab('appointments'); setAppointmentPage(1); }}
            className={`sidebar-item ${activeTab === 'appointments' ? 'active' : ''}`}
            style={{ width: '100%', border: 'none', background: activeTab === 'appointments' ? 'var(--c-emerald-light)' : 'none', color: activeTab === 'appointments' ? 'var(--c-emerald)' : 'var(--c-navy)', textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.65rem 0.75rem', borderRadius: '8px', fontSize: '0.9rem', fontWeight: 600 }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <Calendar size={18} />
              <span>Appointments</span>
            </div>
            <span style={{ fontSize: '0.75rem', background: '#ede9fe', color: '#7c3aed', padding: '2px 8px', borderRadius: '12px', fontWeight: 700 }}>
              {stats?.total_appointments || 0}
            </span>
          </button>

          <button
            type="button"
            onClick={() => { setActiveTab('patients'); setPatientPage(1); }}
            className={`sidebar-item ${activeTab === 'patients' ? 'active' : ''}`}
            style={{ width: '100%', border: 'none', background: activeTab === 'patients' ? 'var(--c-emerald-light)' : 'none', color: activeTab === 'patients' ? 'var(--c-emerald)' : 'var(--c-navy)', textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.65rem 0.75rem', borderRadius: '8px', fontSize: '0.9rem', fontWeight: 600 }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <UserCog size={18} />
              <span>Patients</span>
            </div>
            <span style={{ fontSize: '0.75rem', background: '#dcfce7', color: '#16a34a', padding: '2px 8px', borderRadius: '12px', fontWeight: 700 }}>
              {stats?.total_patients || 0}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('payments')}
            className={`sidebar-item ${activeTab === 'payments' ? 'active' : ''}`}
            style={{ width: '100%', border: 'none', background: activeTab === 'payments' ? 'var(--c-emerald-light)' : 'none', color: activeTab === 'payments' ? 'var(--c-emerald)' : 'var(--c-navy)', textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.65rem 0.75rem', borderRadius: '8px', fontSize: '0.9rem', fontWeight: 600 }}
          >
            <CreditCard size={18} />
            <span>Financial Ledger</span>
          </button>

          <div style={{ fontSize: '0.7rem', fontWeight: 'bold', color: 'var(--c-text-light)', textTransform: 'uppercase', letterSpacing: '0.05em', padding: '1.25rem 0.75rem 0.5rem' }}>
            Quick Actions
          </div>

          <Link
            to="/admin/doctors/add"
            style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.65rem 0.75rem', borderRadius: '8px', fontSize: '0.9rem', fontWeight: 600, color: 'var(--c-emerald)', textDecoration: 'none', background: 'var(--c-emerald-light)' }}
          >
            <Plus size={18} />
            <span>Onboard Doctor</span>
          </Link>

          <div style={{ marginTop: 'auto', paddingTop: '1.25rem', borderTop: '1px solid var(--c-border)', display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', padding: '0.4rem 0.6rem', background: 'var(--c-bg)', borderRadius: '8px' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--color-primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.85rem' }}>
                {user?.username ? user.username.charAt(0).toUpperCase() : 'A'}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--c-navy)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {user?.username}
                </div>
                <span style={{ fontSize: '0.68rem', color: 'var(--color-primary)', fontWeight: 700, textTransform: 'uppercase' }}>
                  {user?.role || 'Administrator'}
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.4rem' }}>
              <Link
                to="/"
                style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', padding: '0.5rem', borderRadius: '6px', fontSize: '0.78rem', fontWeight: 600, color: 'var(--color-navy)', textDecoration: 'none', background: '#f1f5f9' }}
              >
                <ExternalLink size={13} />
                <span>Public Site</span>
              </Link>

              <button
                type="button"
                onClick={() => {
                  logout();
                  navigate('/login');
                }}
                style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', padding: '0.5rem', borderRadius: '6px', fontSize: '0.78rem', fontWeight: 700, color: '#dc2626', background: '#fef2f2', border: '1px solid #fecaca', cursor: 'pointer' }}
              >
                <LogOut size={13} />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </nav>
      </aside>

      {/* MAIN VIEWPORT */}
      <main style={{ flex: 1, padding: '2rem', overflowY: 'auto' }}>
        {/* HEADER */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 style={{ fontSize: '1.65rem', fontWeight: 800, color: 'var(--c-navy)', marginBottom: '0.25rem' }}>
              Healthcare Administration Console
            </h1>
            <p style={{ fontSize: '0.85rem', color: 'var(--c-text-light)' }}>
              Hospital analytics, slot cancellation management, and patient appointment rescheduling.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button
              type="button"
              onClick={() => {
                fetchAdminStats(true);
                if (activeTab === 'slots') fetchAdminSlots();
              }}
              disabled={refreshing}
              className="btn btn-outline btn-sm"
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#fff' }}
            >
              <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} /> {refreshing ? 'Refreshing...' : 'Live Sync'}
            </button>
            <Link to="/admin/doctors/add" className="btn btn-primary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Plus size={15} /> Add Doctor
            </Link>
          </div>
        </div>

        {alertInfo.message && (
          <div style={{ marginBottom: '1.5rem' }}>
            <Alert type={alertInfo.type} message={alertInfo.message} onClose={() => setAlertInfo({ type: '', message: '' })} />
          </div>
        )}

        {/* TOP STATS CARDS */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
          <div
            onClick={() => setActiveTab('hospitals')}
            className="card"
            style={{ padding: '1.25rem', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderLeft: '4px solid #0284c7' }}
          >
            <div>
              <span style={{ fontSize: '0.72rem', fontWeight: 'bold', color: 'var(--c-text-light)', textTransform: 'uppercase' }}>Hospitals & Clinics</span>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--c-navy)' }}>{totalHospitalsCount}</div>
              <span style={{ fontSize: '0.72rem', color: '#0284c7', fontWeight: 600 }}>Healthcare Facilities</span>
            </div>
            <div style={{ width: '44px', height: '44px', borderRadius: '10px', background: '#e0f2fe', color: '#0284c7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Building size={22} />
            </div>
          </div>

          <div
            onClick={() => { setActiveTab('doctors'); setDoctorPage(1); }}
            className="card"
            style={{ padding: '1.25rem', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderLeft: '4px solid #2563eb' }}
          >
            <div>
              <span style={{ fontSize: '0.72rem', fontWeight: 'bold', color: 'var(--c-text-light)', textTransform: 'uppercase' }}>Verified Doctors</span>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--c-navy)' }}>{stats?.total_doctors || 0}</div>
              <span style={{ fontSize: '0.72rem', color: '#2563eb', fontWeight: 600 }}>Across 15 Specialties</span>
            </div>
            <div style={{ width: '44px', height: '44px', borderRadius: '10px', background: '#dbeafe', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Users size={22} />
            </div>
          </div>

          <div
            onClick={() => { setActiveTab('slots'); setSlotPage(1); }}
            className="card"
            style={{ padding: '1.25rem', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderLeft: '4px solid #d97706' }}
          >
            <div>
              <span style={{ fontSize: '0.72rem', fontWeight: 'bold', color: 'var(--c-text-light)', textTransform: 'uppercase' }}>Slot Management</span>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--c-navy)' }}>5 / Slot</div>
              <span style={{ fontSize: '0.72rem', color: '#d97706', fontWeight: 600 }}>Capacity Checking & Cancel</span>
            </div>
            <div style={{ width: '44px', height: '44px', borderRadius: '10px', background: '#fef3c7', color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Clock size={22} />
            </div>
          </div>

          <div
            onClick={() => { setActiveTab('appointments'); setAppointmentPage(1); }}
            className="card"
            style={{ padding: '1.25rem', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderLeft: '4px solid #7c3aed' }}
          >
            <div>
              <span style={{ fontSize: '0.72rem', fontWeight: 'bold', color: 'var(--c-text-light)', textTransform: 'uppercase' }}>Consultations</span>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--c-navy)' }}>{stats?.total_appointments || 0}</div>
              <span style={{ fontSize: '0.72rem', color: '#7c3aed', fontWeight: 600 }}>Booking History</span>
            </div>
            <div style={{ width: '44px', height: '44px', borderRadius: '10px', background: '#ede9fe', color: '#7c3aed', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Calendar size={22} />
            </div>
          </div>
        </div>

        {/* ============================================================ */}
        {/* TAB 1: OVERVIEW */}
        {/* ============================================================ */}
        {activeTab === 'overview' && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
              <div className="card" style={{ padding: '1.5rem' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--c-navy)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Building size={18} style={{ color: '#0284c7' }} /> Hospital Network Overview
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {Object.entries(stats?.hospital_stats || {}).slice(0, 5).map(([hName, hData]) => (
                    <div key={hName} style={{ padding: '0.75rem', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                        <span style={{ fontWeight: 600, fontSize: '0.88rem', color: 'var(--c-navy)' }}>{hName}</span>
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#059669' }}>{hData.occupancy_rate || 0}% Occupancy</span>
                      </div>
                      <div className="occupancy-meter-bg" style={{ height: '6px' }}>
                        <div
                          className="occupancy-meter-fill"
                          style={{
                            width: `${Math.min(100, hData.occupancy_rate || 0)}%`,
                            background: (hData.occupancy_rate || 0) > 80 ? '#dc2626' : (hData.occupancy_rate || 0) > 40 ? '#d97706' : '#059669'
                          }}
                        />
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--c-text-light)' }}>
                        <span>{hData.doctors_count} Doctors</span>
                        <span>{hData.total_slots} Slots ({hData.booked_appts} Booked)</span>
                      </div>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('hospitals')}
                  className="btn btn-outline btn-sm"
                  style={{ width: '100%', marginTop: '1rem', fontSize: '0.8rem' }}
                >
                  View Full Hospital Dashboard &rarr;
                </button>
              </div>

              <div className="card" style={{ padding: '1.5rem' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--c-navy)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Calendar size={18} style={{ color: '#7c3aed' }} /> Appointment Lifecycle Breakdown
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  {Object.entries(stats?.status_breakdown || {}).map(([statusKey, count]) => (
                    <div key={statusKey} style={{ padding: '1rem', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--c-text-light)', textTransform: 'uppercase' }}>{statusKey}</span>
                      <span style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--c-navy)' }}>{count}</span>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => { setActiveTab('appointments'); setAppointmentPage(1); }}
                  className="btn btn-outline btn-sm"
                  style={{ width: '100%', marginTop: '1rem', fontSize: '0.8rem' }}
                >
                  Manage Appointments &rarr;
                </button>
              </div>
            </div>

            {/* RECENT APPOINTMENTS */}
            <div className="card" style={{ padding: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--c-navy)' }}>Recent Patient Bookings</h3>
                <button type="button" onClick={() => { setActiveTab('appointments'); setAppointmentPage(1); }} className="btn btn-outline btn-sm">
                  View All &rarr;
                </button>
              </div>
              <div className="table-responsive">
                <table className="payment-table">
                  <thead>
                    <tr>
                      <th>Patient</th>
                      <th>Doctor</th>
                      <th>Consultation Date</th>
                      <th>Status</th>
                      <th style={{ textAlign: 'right' }}>Fee</th>
                      <th style={{ textAlign: 'center' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(stats?.recent_appointments || []).map((appt) => (
                      <tr key={appt.id}>
                        <td>
                          <div style={{ fontWeight: 'bold' }}>{appt.patient_name || appt.patient_email}</div>
                          {appt.patient_relation && appt.patient_relation !== 'Self' && (
                            <span style={{ fontSize: '0.7rem', background: '#ecfdf5', color: '#059669', padding: '1px 6px', borderRadius: '4px', fontWeight: 600 }}>
                              {appt.patient_relation}
                            </span>
                          )}
                        </td>
                        <td>
                          <div style={{ fontWeight: 600 }}>Dr. {appt.doctor_name}</div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--c-text-light)' }}>{appt.doctor_specialization}</div>
                        </td>
                        <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }}>
                          {appt.slot_date} {appt.slot_time}
                        </td>
                        <td>
                          <span className={`status-badge status-${appt.status}`}>
                            {appt.status?.toUpperCase()}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 'bold' }}>₹{appt.fee_charged}</td>
                        <td style={{ textAlign: 'center' }}>
                          <button
                            type="button"
                            onClick={() => handleOpenRescheduleModal(appt)}
                            className="btn btn-sm btn-outline"
                            style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem' }}
                            title="Reschedule this appointment"
                          >
                            <RotateCcw size={12} style={{ marginRight: '4px' }} /> Reschedule
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* TAB 2: DYNAMIC HOSPITAL MANAGEMENT & NETWORK DASHBOARD */}
        {/* ============================================================ */}
        {activeTab === 'hospitals' && (
          <div>
            {/* Top Toolbar */}
            <div className="card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
                <div>
                  <h3 style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--c-navy)', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <Building size={24} style={{ color: 'var(--color-primary)' }} />
                    Enterprise Hospital Management
                  </h3>
                  <p style={{ fontSize: '0.84rem', color: 'var(--c-text-light)', margin: '0.2rem 0 0' }}>
                    Dynamically register hospital branches, auto-provision staff portal credentials, inspect slot capacities, and manage doctor rosters.
                  </p>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                  <div style={{ position: 'relative', width: '260px' }}>
                    <Search size={16} style={{ position: 'absolute', left: '10px', top: '10px', color: 'var(--c-text-light)' }} />
                    <input
                      type="text"
                      placeholder="Search name, city, address..."
                      value={hospitalSearch}
                      onChange={(e) => setHospitalSearch(e.target.value)}
                      style={{ width: '100%', paddingLeft: '32px', paddingRight: '12px', height: '36px', borderRadius: '8px', border: '1px solid var(--c-border)', fontSize: '0.85rem' }}
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => setAddHospitalModalOpen(true)}
                    className="btn btn-primary btn-sm"
                    style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', height: '36px', padding: '0 1rem', fontSize: '0.85rem' }}
                  >
                    <Plus size={16} /> Register New Hospital
                  </button>

                  <button
                    type="button"
                    onClick={fetchAdminHospitals}
                    disabled={hospitalsLoading}
                    className="btn btn-outline btn-sm"
                    style={{ height: '36px', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                  >
                    <RefreshCw size={14} className={hospitalsLoading ? 'animate-spin' : ''} />
                  </button>
                </div>
              </div>

              {/* Dynamic Metric Overview */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '1.5rem', background: '#f8fafc', padding: '1rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--c-text-light)', textTransform: 'uppercase', fontWeight: 700 }}>Total Registered Facilities</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--c-navy)' }}>{adminHospitals.length}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--c-text-light)', textTransform: 'uppercase', fontWeight: 700 }}>Active Hospital Branches</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#059669' }}>
                    {adminHospitals.filter((h) => h.is_active).length}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--c-text-light)', textTransform: 'uppercase', fontWeight: 700 }}>Doctors Affiliated</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0284c7' }}>
                    {adminHospitals.reduce((acc, h) => acc + (h.doctors_count || 0), 0)}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--c-text-light)', textTransform: 'uppercase', fontWeight: 700 }}>Total Bookings Handled</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#7c3aed' }}>
                    {adminHospitals.reduce((acc, h) => acc + (h.total_appointments || 0), 0)}
                  </div>
                </div>
              </div>

              {/* HOSPITAL CARDS GRID */}
              <div className="hospital-grid">
                {adminHospitals.filter((h) => {
                  if (!hospitalSearch) return true;
                  const q = hospitalSearch.toLowerCase();
                  return (
                    (h.name || '').toLowerCase().includes(q) ||
                    (h.city || '').toLowerCase().includes(q) ||
                    (h.address || '').toLowerCase().includes(q) ||
                    (h.slug || '').toLowerCase().includes(q)
                  );
                }).length > 0 ? (
                  adminHospitals
                    .filter((h) => {
                      if (!hospitalSearch) return true;
                      const q = hospitalSearch.toLowerCase();
                      return (
                        (h.name || '').toLowerCase().includes(q) ||
                        (h.city || '').toLowerCase().includes(q) ||
                        (h.address || '').toLowerCase().includes(q) ||
                        (h.slug || '').toLowerCase().includes(q)
                      );
                    })
                    .map((h) => {
                      const occupancy = h.occupancy_rate || 0;
                      return (
                        <div key={h.id} className="hospital-card" style={{ border: !h.is_active ? '1px dashed #cbd5e1' : undefined, opacity: !h.is_active ? 0.75 : 1 }}>
                          {/* Header */}
                          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.75rem', marginBottom: '0.75rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                              <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: h.is_active ? '#e0f2fe' : '#f1f5f9', color: h.is_active ? '#0284c7' : '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Building size={22} />
                              </div>
                              <div>
                                <h4 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--c-navy)', margin: 0 }}>{h.name}</h4>
                                <span style={{ fontSize: '0.75rem', color: 'var(--c-text-light)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                  <MapPin size={12} /> {h.city || 'Bangalore'} &bull; {h.doctors_count || 0} Doctors ({h.active_doctors || 0} Active)
                                </span>
                              </div>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                              <span style={{
                                fontSize: '0.72rem',
                                fontWeight: 700,
                                padding: '2px 8px',
                                borderRadius: '12px',
                                background: occupancy > 80 ? '#fee2e2' : occupancy > 40 ? '#fef3c7' : '#ecfdf5',
                                color: occupancy > 80 ? '#dc2626' : occupancy > 40 ? '#d97706' : '#059669',
                              }}>
                                {occupancy}% Occupancy
                              </span>
                              <span style={{ fontSize: '0.68rem', fontWeight: 700, padding: '1px 6px', borderRadius: '4px', background: h.is_active ? '#dcfce7' : '#fee2e2', color: h.is_active ? '#16a34a' : '#dc2626' }}>
                                {h.is_active ? 'ACTIVE' : 'INACTIVE'}
                              </span>
                            </div>
                          </div>

                          {/* Address & Contact Details */}
                          <div style={{ fontSize: '0.78rem', color: 'var(--c-text-light)', marginBottom: '0.75rem', background: '#f8fafc', padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                            {h.address && (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <MapPin size={12} style={{ color: '#64748b', flexShrink: 0 }} />
                                <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{h.address}</span>
                              </div>
                            )}
                            <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '4px' }}>
                              {h.contact_phone && (
                                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                  <Phone size={12} style={{ color: '#059669' }} /> {h.contact_phone}
                                </span>
                              )}
                              {h.maps_url && (
                                <a
                                  href={h.maps_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  style={{ color: '#0284c7', textDecoration: 'none', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '3px' }}
                                >
                                  <Navigation size={11} /> Maps Link <ExternalLink size={10} />
                                </a>
                              )}
                            </div>
                          </div>

                          {/* Manager Credentials Box */}
                          <div style={{ background: '#f0fdf4', padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1px solid #bbf7d0', marginBottom: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div>
                              <div style={{ fontSize: '0.7rem', color: '#166534', fontWeight: 700, textTransform: 'uppercase' }}>
                                🔑 Staff Login Username
                              </div>
                              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.82rem', fontWeight: 700, color: '#15803d' }}>
                                {h.manager_username || h.slug}
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleCopyCredentials(h.manager_username || h.slug, 'hospital@123')}
                              className="btn btn-sm btn-outline"
                              style={{ fontSize: '0.72rem', padding: '0.2rem 0.5rem', borderColor: '#86efac', color: '#15803d', background: '#fff' }}
                              title="Copy username and default password"
                            >
                              {copiedSlug === (h.manager_username || h.slug) ? (
                                <><Check size={12} style={{ color: '#16a34a' }} /> Copied!</>
                              ) : (
                                <><Copy size={12} /> Copy Login Info</>
                              )}
                            </button>
                          </div>

                          {/* Occupancy Progress Bar */}
                          <div style={{ marginBottom: '0.85rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '4px', color: 'var(--c-text-light)' }}>
                              <span>Slot Capacity (5 pts / slot)</span>
                              <span style={{ fontWeight: 600, color: 'var(--c-navy)' }}>{h.booked_appts || 0} / {(h.total_slots || 0) * 5} Max</span>
                            </div>
                            <div className="occupancy-meter-bg">
                              <div
                                className="occupancy-meter-fill"
                                style={{
                                  width: `${Math.min(100, occupancy)}%`,
                                  background: occupancy > 80 ? '#dc2626' : occupancy > 40 ? '#d97706' : '#059669'
                                }}
                              />
                            </div>
                          </div>

                          {/* Hospital Key Metrics */}
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem', background: '#f8fafc', padding: '0.5rem', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '0.85rem', textAlign: 'center' }}>
                            <div>
                              <div style={{ fontSize: '0.68rem', color: 'var(--c-text-light)', textTransform: 'uppercase' }}>Slots</div>
                              <div style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--c-navy)' }}>{h.total_slots || 0}</div>
                            </div>
                            <div>
                              <div style={{ fontSize: '0.68rem', color: 'var(--c-text-light)', textTransform: 'uppercase' }}>Booked</div>
                              <div style={{ fontSize: '1rem', fontWeight: 800, color: '#0284c7' }}>{h.booked_appts || 0}</div>
                            </div>
                            <div>
                              <div style={{ fontSize: '0.68rem', color: 'var(--c-text-light)', textTransform: 'uppercase' }}>Doctors</div>
                              <div style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--c-navy)' }}>{h.doctors_count || 0}</div>
                            </div>
                          </div>

                          {/* Action Buttons Row */}
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem', marginBottom: '0.4rem' }}>
                            <Link
                              to={`/hospital/dashboard?hospital_id=${h.id}&hospital_name=${encodeURIComponent(h.name)}`}
                              className="btn btn-primary btn-sm"
                              style={{ textAlign: 'center', fontSize: '0.78rem', padding: '0.35rem 0.5rem', textDecoration: 'none' }}
                            >
                              🏥 Live Dashboard &rarr;
                            </Link>
                            <button
                              type="button"
                              onClick={() => {
                                setSlotHospitalFilter(h.name);
                                setActiveTab('slots');
                                setSlotPage(1);
                              }}
                              className="btn btn-outline btn-sm"
                              style={{ fontSize: '0.78rem', padding: '0.35rem 0.5rem' }}
                            >
                              📅 Inspect Slots
                            </button>
                          </div>

                          <div style={{ display: 'flex', gap: '0.4rem' }}>
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedHospital(h.name);
                                setActiveTab('doctors');
                                setDoctorPage(1);
                              }}
                              className="btn btn-ghost btn-sm"
                              style={{ flex: 1, fontSize: '0.75rem', padding: '0.3rem', border: '1px solid #e2e8f0' }}
                            >
                              👨‍⚕️ Doctors
                            </button>
                            <button
                              type="button"
                              onClick={() => handleOpenEditHospital(h)}
                              className="btn btn-ghost btn-sm"
                              style={{ flex: 1, fontSize: '0.75rem', padding: '0.3rem', border: '1px solid #e2e8f0', color: '#0284c7' }}
                            >
                              ✏️ Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => handleToggleHospitalActive(h)}
                              className="btn btn-ghost btn-sm"
                              style={{ fontSize: '0.75rem', padding: '0.3rem 0.6rem', border: '1px solid #e2e8f0', color: h.is_active ? '#dc2626' : '#16a34a' }}
                              title={h.is_active ? 'Deactivate Hospital' : 'Activate Hospital'}
                            >
                              <Power size={13} />
                            </button>
                          </div>
                        </div>
                      );
                    })
                ) : (
                  <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '3rem', color: 'var(--c-text-light)' }}>
                    No hospitals found matching "{hospitalSearch}". Click "Register New Hospital" above to add one.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* ADD NEW HOSPITAL MODAL */}
        {/* ============================================================ */}
        {addHospitalModalOpen && (
          <div className="modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
            <div className="card" style={{ width: '100%', maxWidth: '620px', maxHeight: '90vh', overflowY: 'auto', padding: '1.75rem', borderRadius: '16px', background: '#fff' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid var(--c-border)', paddingBottom: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <Building size={22} style={{ color: 'var(--color-primary)' }} />
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--c-navy)', margin: 0 }}>
                    Register New Hospital Facility
                  </h3>
                </div>
                <button type="button" onClick={() => setAddHospitalModalOpen(false)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--c-text-light)' }}>
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleCreateHospital}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
                  {/* Hospital Name */}
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--c-navy)', marginBottom: '4px' }}>
                      Hospital / Clinic Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Apollo Super Speciality Hospital"
                      value={newHospitalData.name}
                      onChange={(e) => {
                        const name = e.target.value;
                        const autoSlug = name.toLowerCase().replace(/[^a-zA-Z0-9]/g, '').slice(0, 25);
                        setNewHospitalData((prev) => ({
                          ...prev,
                          name,
                          manager_username: prev.manager_username === '' || prev.manager_username === autoSlug.slice(0, -1) ? autoSlug : prev.manager_username
                        }));
                      }}
                      style={{ width: '100%', height: '38px', borderRadius: '8px', border: '1px solid var(--c-border)', padding: '0 10px', fontSize: '0.9rem' }}
                    />
                  </div>

                  {/* Contact Phone */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--c-navy)', marginBottom: '4px' }}>
                      Contact Phone / Helpline
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. +91 80 4000 5000"
                      value={newHospitalData.contact_phone}
                      onChange={(e) => setNewHospitalData({ ...newHospitalData, contact_phone: e.target.value })}
                      style={{ width: '100%', height: '38px', borderRadius: '8px', border: '1px solid var(--c-border)', padding: '0 10px', fontSize: '0.9rem' }}
                    />
                  </div>

                  {/* Contact Email */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--c-navy)', marginBottom: '4px' }}>
                      Official Email Address
                    </label>
                    <input
                      type="email"
                      placeholder="e.g. contact@apollo.health"
                      value={newHospitalData.contact_email}
                      onChange={(e) => setNewHospitalData({ ...newHospitalData, contact_email: e.target.value })}
                      style={{ width: '100%', height: '38px', borderRadius: '8px', border: '1px solid var(--c-border)', padding: '0 10px', fontSize: '0.9rem' }}
                    />
                  </div>

                  {/* Physical Address */}
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--c-navy)', marginBottom: '4px' }}>
                      Street Address & Landmark
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 154/11, Opposite IIMB, Bannerghatta Main Rd"
                      value={newHospitalData.address}
                      onChange={(e) => setNewHospitalData({ ...newHospitalData, address: e.target.value })}
                      style={{ width: '100%', height: '38px', borderRadius: '8px', border: '1px solid var(--c-border)', padding: '0 10px', fontSize: '0.9rem' }}
                    />
                  </div>

                  {/* City */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--c-navy)', marginBottom: '4px' }}>
                      City / Area
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Bangalore"
                      value={newHospitalData.city}
                      onChange={(e) => setNewHospitalData({ ...newHospitalData, city: e.target.value })}
                      style={{ width: '100%', height: '38px', borderRadius: '8px', border: '1px solid var(--c-border)', padding: '0 10px', fontSize: '0.9rem' }}
                    />
                  </div>

                  {/* State */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--c-navy)', marginBottom: '4px' }}>
                      State / Province
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Karnataka"
                      value={newHospitalData.state}
                      onChange={(e) => setNewHospitalData({ ...newHospitalData, state: e.target.value })}
                      style={{ width: '100%', height: '38px', borderRadius: '8px', border: '1px solid var(--c-border)', padding: '0 10px', fontSize: '0.9rem' }}
                    />
                  </div>

                  {/* Google Maps Link */}
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--c-navy)', marginBottom: '4px' }}>
                      Google Maps Navigation Link
                    </label>
                    <input
                      type="url"
                      placeholder="https://maps.google.com/..."
                      value={newHospitalData.google_maps_url}
                      onChange={(e) => setNewHospitalData({ ...newHospitalData, google_maps_url: e.target.value })}
                      style={{ width: '100%', height: '38px', borderRadius: '8px', border: '1px solid var(--c-border)', padding: '0 10px', fontSize: '0.9rem' }}
                    />
                  </div>

                  {/* Staff Credentials Section */}
                  <div style={{ gridColumn: '1 / -1', background: '#f0fdf4', padding: '1rem', borderRadius: '10px', border: '1px solid #bbf7d0' }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#166534', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <ShieldCheck size={16} /> Hospital Manager Portal Credentials
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#166534', marginBottom: '3px' }}>
                          Manager Username (Slug)
                        </label>
                        <input
                          type="text"
                          required
                          value={newHospitalData.manager_username || newHospitalData.name.toLowerCase().replace(/[^a-zA-Z0-9]/g, '').slice(0, 25)}
                          onChange={(e) => setNewHospitalData({ ...newHospitalData, manager_username: e.target.value.toLowerCase().replace(/[^a-zA-Z0-9]/g, '') })}
                          style={{ width: '100%', height: '34px', borderRadius: '6px', border: '1px solid #86efac', padding: '0 8px', fontSize: '0.85rem', fontFamily: 'var(--font-mono)', background: '#fff' }}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#166534', marginBottom: '3px' }}>
                          Default Password
                        </label>
                        <input
                          type="text"
                          required
                          value={newHospitalData.manager_password}
                          onChange={(e) => setNewHospitalData({ ...newHospitalData, manager_password: e.target.value })}
                          style={{ width: '100%', height: '34px', borderRadius: '6px', border: '1px solid #86efac', padding: '0 8px', fontSize: '0.85rem', fontFamily: 'var(--font-mono)', background: '#fff' }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                  <button type="button" onClick={() => setAddHospitalModalOpen(false)} className="btn btn-outline btn-sm">
                    Cancel
                  </button>
                  <button type="submit" disabled={addHospitalLoading} className="btn btn-primary btn-sm">
                    {addHospitalLoading ? 'Provisioning Hospital...' : '✨ Create Hospital & Account'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* EDIT HOSPITAL MODAL */}
        {/* ============================================================ */}
        {editHospitalTarget && (
          <div className="modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
            <div className="card" style={{ width: '100%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto', padding: '1.75rem', borderRadius: '16px', background: '#fff' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid var(--c-border)', paddingBottom: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <Edit3 size={20} style={{ color: '#0284c7' }} />
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--c-navy)', margin: 0 }}>
                    Edit Hospital: {editHospitalTarget.name}
                  </h3>
                </div>
                <button type="button" onClick={() => setEditHospitalTarget(null)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--c-text-light)' }}>
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleUpdateHospital}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--c-navy)', marginBottom: '4px' }}>Hospital Name</label>
                    <input
                      type="text"
                      required
                      value={editHospitalData.name || ''}
                      onChange={(e) => setEditHospitalData({ ...editHospitalData, name: e.target.value })}
                      style={{ width: '100%', height: '38px', borderRadius: '8px', border: '1px solid var(--c-border)', padding: '0 10px', fontSize: '0.9rem' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--c-navy)', marginBottom: '4px' }}>Contact Phone</label>
                    <input
                      type="text"
                      value={editHospitalData.contact_phone || ''}
                      onChange={(e) => setEditHospitalData({ ...editHospitalData, contact_phone: e.target.value })}
                      style={{ width: '100%', height: '38px', borderRadius: '8px', border: '1px solid var(--c-border)', padding: '0 10px', fontSize: '0.9rem' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--c-navy)', marginBottom: '4px' }}>Contact Email</label>
                    <input
                      type="email"
                      value={editHospitalData.contact_email || ''}
                      onChange={(e) => setEditHospitalData({ ...editHospitalData, contact_email: e.target.value })}
                      style={{ width: '100%', height: '38px', borderRadius: '8px', border: '1px solid var(--c-border)', padding: '0 10px', fontSize: '0.9rem' }}
                    />
                  </div>

                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--c-navy)', marginBottom: '4px' }}>Physical Address</label>
                    <input
                      type="text"
                      value={editHospitalData.address || ''}
                      onChange={(e) => setEditHospitalData({ ...editHospitalData, address: e.target.value })}
                      style={{ width: '100%', height: '38px', borderRadius: '8px', border: '1px solid var(--c-border)', padding: '0 10px', fontSize: '0.9rem' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--c-navy)', marginBottom: '4px' }}>City</label>
                    <input
                      type="text"
                      value={editHospitalData.city || ''}
                      onChange={(e) => setEditHospitalData({ ...editHospitalData, city: e.target.value })}
                      style={{ width: '100%', height: '38px', borderRadius: '8px', border: '1px solid var(--c-border)', padding: '0 10px', fontSize: '0.9rem' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--c-navy)', marginBottom: '4px' }}>State</label>
                    <input
                      type="text"
                      value={editHospitalData.state || ''}
                      onChange={(e) => setEditHospitalData({ ...editHospitalData, state: e.target.value })}
                      style={{ width: '100%', height: '38px', borderRadius: '8px', border: '1px solid var(--c-border)', padding: '0 10px', fontSize: '0.9rem' }}
                    />
                  </div>

                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--c-navy)', marginBottom: '4px' }}>Google Maps URL</label>
                    <input
                      type="url"
                      value={editHospitalData.google_maps_url || ''}
                      onChange={(e) => setEditHospitalData({ ...editHospitalData, google_maps_url: e.target.value })}
                      style={{ width: '100%', height: '38px', borderRadius: '8px', border: '1px solid var(--c-border)', padding: '0 10px', fontSize: '0.9rem' }}
                    />
                  </div>

                  {/* Reset Password Optional */}
                  <div style={{ gridColumn: '1 / -1', background: '#f8fafc', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--c-navy)', marginBottom: '4px' }}>
                      🔑 Reset Manager Password (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="Leave blank to keep existing password"
                      value={editHospitalData.reset_password || ''}
                      onChange={(e) => setEditHospitalData({ ...editHospitalData, reset_password: e.target.value })}
                      style={{ width: '100%', height: '34px', borderRadius: '6px', border: '1px solid var(--c-border)', padding: '0 8px', fontSize: '0.85rem', fontFamily: 'var(--font-mono)', background: '#fff' }}
                    />
                  </div>

                  <div style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <input
                      type="checkbox"
                      id="hospital_is_active_edit"
                      checked={Boolean(editHospitalData.is_active)}
                      onChange={(e) => setEditHospitalData({ ...editHospitalData, is_active: e.target.checked })}
                    />
                    <label htmlFor="hospital_is_active_edit" style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--c-navy)', cursor: 'pointer' }}>
                      Hospital Facility is Active & Available for Bookings
                    </label>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                  <button type="button" onClick={() => setEditHospitalTarget(null)} className="btn btn-outline btn-sm">
                    Cancel
                  </button>
                  <button type="submit" disabled={editHospitalLoading} className="btn btn-primary btn-sm">
                    {editHospitalLoading ? 'Saving...' : 'Save Hospital Changes'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* CREDENTIALS GENERATED CONFIRMATION MODAL */}
        {/* ============================================================ */}
        {createdCredentialsModal.open && (
          <div className="modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, padding: '1rem' }}>
            <div className="card" style={{ width: '100%', maxWidth: '480px', padding: '2rem', borderRadius: '16px', background: '#fff', textAlign: 'center' }}>
              <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: '#dcfce7', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
                <CheckCircle size={32} />
              </div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--c-navy)', marginBottom: '0.35rem' }}>
                Hospital Registered Successfully!
              </h3>
              <p style={{ fontSize: '0.84rem', color: 'var(--c-text-light)', marginBottom: '1.25rem' }}>
                The hospital staff user account has been auto-provisioned. You can share these credentials with the facility administrator.
              </p>

              <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '10px', border: '1px solid #e2e8f0', textAlign: 'left', marginBottom: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--c-text-light)', textTransform: 'uppercase', fontWeight: 700 }}>Hospital Name:</span>
                  <div style={{ fontWeight: 800, color: 'var(--c-navy)' }}>{createdCredentialsModal.data?.name}</div>
                </div>
                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--c-text-light)', textTransform: 'uppercase', fontWeight: 700 }}>Portal Login URL:</span>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.82rem', color: '#0284c7' }}>{window.location.origin}/login</div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid #e2e8f0' }}>
                  <div>
                    <span style={{ fontSize: '0.72rem', color: 'var(--c-text-light)', textTransform: 'uppercase', fontWeight: 700 }}>Username (Slug):</span>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.9rem', fontWeight: 800, color: '#15803d' }}>
                      {createdCredentialsModal.data?.credentials?.username}
                    </div>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.72rem', color: 'var(--c-text-light)', textTransform: 'uppercase', fontWeight: 700 }}>Password:</span>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.9rem', fontWeight: 800, color: '#15803d' }}>
                      {createdCredentialsModal.data?.credentials?.password}
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button
                  type="button"
                  onClick={() => handleCopyCredentials(createdCredentialsModal.data?.credentials?.username, createdCredentialsModal.data?.credentials?.password)}
                  className="btn btn-outline btn-sm"
                  style={{ flex: 1 }}
                >
                  <Copy size={14} style={{ marginRight: '4px' }} /> Copy Credentials
                </button>
                <button
                  type="button"
                  onClick={() => setCreatedCredentialsModal({ open: false, data: null })}
                  className="btn btn-primary btn-sm"
                  style={{ flex: 1 }}
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* TAB 3: SLOT MANAGEMENT & CHECKING (NEW) */}
        {/* ============================================================ */}
        {activeTab === 'slots' && (
          <div className="card" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--c-navy)' }}>
                  📅 Doctor Slot Operations & Checking
                </h3>
                <p style={{ fontSize: '0.82rem', color: 'var(--c-text-light)', margin: 0 }}>
                  Inspect real-time slot capacity (0/5 to 5/5), block/unblock slots, or cancel specific slots with automated patient email notifications.
                </p>
              </div>
              <button
                type="button"
                onClick={fetchAdminSlots}
                disabled={slotsLoading}
                className="btn btn-outline btn-sm"
                style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
              >
                <RefreshCw size={14} className={slotsLoading ? 'animate-spin' : ''} /> {slotsLoading ? 'Checking...' : 'Refresh Slots'}
              </button>
            </div>

            {/* FILTER TOOLBAR */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem', marginBottom: '1.25rem', background: '#f8fafc', padding: '1rem', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: 'var(--c-text-light)', textTransform: 'uppercase', marginBottom: '4px' }}>Search Doctor / Hospital</label>
                <input
                  type="text"
                  placeholder="Doctor or clinic name..."
                  value={slotSearch}
                  onChange={(e) => { setSlotSearch(e.target.value); setSlotPage(1); }}
                  style={{ width: '100%', height: '34px', borderRadius: '6px', border: '1px solid var(--c-border)', padding: '0 8px', fontSize: '0.82rem' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: 'var(--c-text-light)', textTransform: 'uppercase', marginBottom: '4px' }}>Filter by Hospital</label>
                <select
                  value={slotHospitalFilter}
                  onChange={(e) => { setSlotHospitalFilter(e.target.value); setSlotPage(1); }}
                  style={{ width: '100%', height: '34px', borderRadius: '6px', border: '1px solid var(--c-border)', padding: '0 8px', fontSize: '0.82rem', background: '#fff' }}
                >
                  <option value="">All Hospitals</option>
                  {Object.keys(stats?.hospital_stats || {}).map((h) => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: 'var(--c-text-light)', textTransform: 'uppercase', marginBottom: '4px' }}>Filter by Date</label>
                <input
                  type="date"
                  value={slotDateFilter}
                  onChange={(e) => { setSlotDateFilter(e.target.value); setSlotPage(1); }}
                  style={{ width: '100%', height: '34px', borderRadius: '6px', border: '1px solid var(--c-border)', padding: '0 8px', fontSize: '0.82rem', background: '#fff' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: 'var(--c-text-light)', textTransform: 'uppercase', marginBottom: '4px' }}>Slot Status</label>
                <select
                  value={slotStatusFilter}
                  onChange={(e) => { setSlotStatusFilter(e.target.value); setSlotPage(1); }}
                  style={{ width: '100%', height: '34px', borderRadius: '6px', border: '1px solid var(--c-border)', padding: '0 8px', fontSize: '0.82rem', background: '#fff' }}
                >
                  <option value="all">All Slots</option>
                  <option value="available">Available (&lt; 5 Booked)</option>
                  <option value="full">Full (5/5 Booked)</option>
                  <option value="blocked">Blocked / Cancelled</option>
                </select>
              </div>
            </div>

            {/* SLOTS LIST / GRID */}
            {slotsLoading ? (
              <div style={{ textAlign: 'center', padding: '3rem' }}>
                <div className="spinner" style={{ margin: '0 auto 0.75rem', width: '32px', height: '32px', border: '3px solid #e2e8f0', borderTopColor: 'var(--color-primary)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }}></div>
                <div style={{ fontSize: '0.88rem', color: 'var(--c-text-light)' }}>Loading operational slots...</div>
              </div>
            ) : slotsList.length > 0 ? (
              <div className="slot-management-grid">
                {slotsList.map((slot) => {
                  const isBlocked = slot.is_blocked;
                  const isFull = slot.is_full;
                  return (
                    <div
                      key={slot.id}
                      className={`slot-admin-card ${isBlocked ? 'slot-blocked' : isFull ? 'slot-full' : ''}`}
                    >
                      <div>
                        {/* Slot Header */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                          <div>
                            <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--c-navy)' }}>
                              Dr. {slot.doctor_name}
                            </span>
                            <div style={{ fontSize: '0.72rem', color: 'var(--c-text-light)' }}>
                              {slot.doctor_specialization} · {slot.hospital_name}
                            </div>
                          </div>
                          {isBlocked ? (
                            <span className="capacity-chip blocked">
                              <Lock size={12} /> Blocked
                            </span>
                          ) : isFull ? (
                            <span className="capacity-chip full">
                              5/5 Full
                            </span>
                          ) : (
                            <span className="capacity-chip avail">
                              {slot.booked_count}/5 Booked
                            </span>
                          )}
                        </div>

                        {/* Date & Time Badge */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#f1f5f9', padding: '6px 10px', borderRadius: '6px', margin: '0.5rem 0 0.75rem', fontSize: '0.82rem', fontFamily: 'var(--font-mono)' }}>
                          <Clock size={14} style={{ color: 'var(--color-primary)' }} />
                          <strong>{slot.date}</strong> at <strong>{slot.start_time} {slot.end_time ? `– ${slot.end_time}` : ''}</strong>
                        </div>

                        {/* Capacity meter */}
                        <div style={{ marginBottom: '0.75rem' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--c-text-light)', marginBottom: '3px' }}>
                            <span>Patient Booking Capacity</span>
                            <span>{slot.booked_count} of 5 Patients</span>
                          </div>
                          <div style={{ width: '100%', height: '6px', background: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
                            <div
                              style={{
                                height: '100%',
                                width: `${(slot.booked_count / 5) * 100}%`,
                                background: isBlocked ? '#dc2626' : slot.booked_count >= 5 ? '#d97706' : '#059669',
                                transition: 'width 0.3s ease'
                              }}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div style={{ display: 'flex', gap: '0.4rem', borderTop: '1px solid #e2e8f0', paddingTop: '0.75rem', marginTop: '0.5rem' }}>
                        <button
                          type="button"
                          onClick={() => handleToggleSlotBlock(slot.id)}
                          className={`btn btn-sm ${isBlocked ? 'btn-primary' : 'btn-outline'}`}
                          style={{ flex: 1, fontSize: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                          title={isBlocked ? "Unblock this slot" : "Block this slot"}
                        >
                          {isBlocked ? <Unlock size={13} /> : <Lock size={13} />}
                          {isBlocked ? 'Unblock' : 'Block Slot'}
                        </button>

                        <button
                          type="button"
                          onClick={() => setCancelSlotTarget(slot)}
                          className="btn btn-sm btn-outline"
                          style={{ flex: 1, fontSize: '0.75rem', color: '#dc2626', borderColor: '#fca5a5', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                          title="Cancel this slot and notify all booked patients"
                        >
                          <ShieldAlert size={13} />
                          Cancel Slot
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--c-text-light)' }}>
                No slots found matching the selected filters.
              </div>
            )}

            {/* SLOTS PAGINATION */}
            {totalSlotsCount > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--c-border)', flexWrap: 'wrap', gap: '1rem' }}>
                <div style={{ fontSize: '0.85rem', color: 'var(--c-text-light)' }}>
                  Showing <strong>{(slotPage - 1) * slotPageSize + 1}–{Math.min(totalSlotsCount, slotPage * slotPageSize)}</strong> of <strong>{totalSlotsCount}</strong> Slots
                </div>
                <div style={{ display: 'flex', gap: '4px' }}>
                  <button
                    type="button"
                    onClick={() => setSlotPage((p) => Math.max(1, p - 1))}
                    disabled={slotPage === 1}
                    className="btn btn-sm btn-outline"
                  >
                    <ChevronLeft size={14} />
                  </button>
                  <span style={{ fontSize: '0.85rem', fontWeight: 600, padding: '0.25rem 0.5rem', display: 'flex', alignItems: 'center' }}>
                    {slotPage} / {totalSlotPages}
                  </span>
                  <button
                    type="button"
                    onClick={() => setSlotPage((p) => Math.min(totalSlotPages, p + 1))}
                    disabled={slotPage === totalSlotPages}
                    className="btn btn-sm btn-outline"
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ============================================================ */}
        {/* TAB 4: DOCTORS DIRECTORY */}
        {/* ============================================================ */}
        {activeTab === 'doctors' && (
          <div className="card" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--c-navy)' }}>Doctor Roster ({filteredDoctors.length} Doctors)</h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--c-text-light)' }}>Manage medical staff, working hours, and operational status.</p>
              </div>
              <div style={{ position: 'relative', width: '280px' }}>
                <Search size={16} style={{ position: 'absolute', left: '10px', top: '10px', color: 'var(--c-text-light)' }} />
                <input
                  type="text"
                  placeholder="Search doctor, specialty, hospital..."
                  value={doctorSearch}
                  onChange={(e) => { setDoctorSearch(e.target.value); setDoctorPage(1); }}
                  style={{ width: '100%', paddingLeft: '32px', paddingRight: '12px', height: '36px', borderRadius: '8px', border: '1px solid var(--c-border)', fontSize: '0.85rem' }}
                />
              </div>
            </div>

            {/* DOCTOR FILTERS */}
            <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
              <select
                value={selectedDoctorSpec}
                onChange={(e) => { setSelectedDoctorSpec(e.target.value); setDoctorPage(1); }}
                style={{ fontSize: '0.8rem', padding: '0.35rem 0.65rem', borderRadius: '6px', border: '1px solid var(--c-border)', background: '#fff' }}
              >
                <option value="">All Specializations</option>
                {(stats?.specializations || []).map((spec) => (
                  <option key={spec} value={spec}>{spec}</option>
                ))}
              </select>

              <select
                value={selectedHospital}
                onChange={(e) => { setSelectedHospital(e.target.value); setDoctorPage(1); }}
                style={{ fontSize: '0.8rem', padding: '0.35rem 0.65rem', borderRadius: '6px', border: '1px solid var(--c-border)', background: '#fff' }}
              >
                <option value="">All Hospitals</option>
                {Object.keys(stats?.hospital_stats || {}).map((h) => (
                  <option key={h} value={h}>{h}</option>
                ))}
              </select>

              <select
                value={doctorAvailability}
                onChange={(e) => { setDoctorAvailability(e.target.value); setDoctorPage(1); }}
                style={{ fontSize: '0.8rem', padding: '0.35rem 0.65rem', borderRadius: '6px', border: '1px solid var(--c-border)', background: '#fff' }}
              >
                <option value="all">All Doctors</option>
                <option value="today">🟢 Working Today</option>
                <option value="active">Active Doctors</option>
                <option value="available">Active with Slots</option>
                <option value="inactive">Inactive Doctors</option>
              </select>
            </div>

            {/* DOCTOR TABLE */}
            <div className="table-responsive">
              <table className="payment-table">
                <thead>
                  <tr>
                    <th>Doctor Profile</th>
                    <th>Specialization</th>
                    <th>Hospital</th>
                    <th>Fee</th>
                    <th>Active Slots</th>
                    <th>Booked Consultations</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedDoctors.length > 0 ? (
                    paginatedDoctors.map((doc) => (
                      <tr key={doc.doctor_id} style={{ opacity: doc.is_active ? 1 : 0.75 }}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div
                              onClick={() => handleOpenPhotoModal(doc)}
                              style={{
                                position: 'relative',
                                width: '42px',
                                height: '42px',
                                borderRadius: '50%',
                                background: '#e0f2fe',
                                overflow: 'hidden',
                                flexShrink: 0,
                                cursor: 'pointer',
                                border: '2px solid #e2e8f0',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                              title="Click to Change Doctor Profile Photo"
                            >
                              <img
                                src={getDoctorAvatar({ name: doc.doctor_name, image: doc.image })}
                                alt={doc.doctor_name}
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                onError={(e) => {
                                  e.target.onerror = null;
                                  e.target.src = getDoctorAvatar({ name: doc.doctor_name }, doc.doctor_name);
                                }}
                              />
                              <div
                                style={{
                                  position: 'absolute',
                                  inset: 0,
                                  background: 'rgba(15,23,42,0.45)',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  opacity: 0,
                                  transition: 'opacity 0.2s',
                                  color: '#fff',
                                }}
                                onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
                                onMouseLeave={(e) => (e.currentTarget.style.opacity = '0')}
                              >
                                <Camera size={15} />
                              </div>
                            </div>
                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <div style={{ fontWeight: 'bold', color: 'var(--c-navy)' }}>Dr. {doc.doctor_name}</div>
                                {doc.is_available_today ? (
                                  <span style={{ fontSize: '0.68rem', fontWeight: 700, padding: '1px 6px', borderRadius: '8px', background: '#d1fae5', color: '#065f46', border: '1px solid rgba(16,185,129,0.3)' }}>
                                    🟢 Today
                                  </span>
                                ) : (
                                  <span style={{ fontSize: '0.68rem', fontWeight: 500, padding: '1px 6px', borderRadius: '8px', background: '#f1f5f9', color: '#64748b' }}>
                                    ⚪ Off Today
                                  </span>
                                )}
                              </div>
                              <div style={{ fontSize: '0.72rem', color: 'var(--c-text-light)' }}>{doc.qualification} · {doc.experience_years} yrs exp</div>
                              {doc.contact_number && (
                                <div style={{ fontSize: '0.7rem', color: '#059669', display: 'flex', alignItems: 'center', gap: '3px', marginTop: '2px' }}>
                                  <Phone size={10} /> {doc.contact_number}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td>
                          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#0284c7' }}>
                            {doc.specialization}
                          </span>
                        </td>
                        <td>
                          <div style={{ fontSize: '0.8rem', color: 'var(--c-navy)', fontWeight: 600 }}>
                            {doc.hospital_name || 'CareConnect Hospital'}
                          </div>
                          {doc.clinic_address && (
                            <div style={{ fontSize: '0.72rem', color: 'var(--c-text-light)', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={doc.clinic_address}>
                              📍 {doc.clinic_address}
                            </div>
                          )}
                          <a
                            href={doc.maps_url || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent((doc.hospital_name || '') + ' ' + (doc.clinic_address || ''))}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              fontSize: '0.7rem',
                              color: '#0284c7',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '2px',
                              marginTop: '2px',
                              textDecoration: 'none',
                              fontWeight: 600
                            }}
                          >
                            <Navigation size={10} /> Google Maps
                          </a>
                        </td>
                        <td style={{ fontWeight: 'bold' }}>₹{doc.fee}</td>
                        <td>
                          <span style={{ fontSize: '0.82rem', fontWeight: 700, color: doc.total_slots > 0 ? 'var(--c-emerald)' : '#dc2626' }}>
                            {doc.total_slots} Slots
                          </span>
                        </td>
                        <td>
                          <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--c-navy)' }}>
                            {doc.booked_appts} Patients
                          </span>
                        </td>
                        <td>
                          <button
                            type="button"
                            onClick={() => handleToggleDoctorActive(doc.doctor_id, doc.is_active, doc.doctor_name)}
                            style={{
                              border: 'none',
                              background: doc.is_active ? '#ecfdf5' : '#fee2e2',
                              color: doc.is_active ? '#059669' : '#dc2626',
                              padding: '3px 8px',
                              borderRadius: '12px',
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              cursor: 'pointer'
                            }}
                          >
                            {doc.is_active ? 'Active' : 'Inactive'}
                          </button>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'flex', gap: '0.35rem', justifyContent: 'flex-end' }}>
                            <button
                              type="button"
                              onClick={() => handleOpenPhotoModal(doc)}
                              className="btn btn-sm btn-outline"
                              style={{ padding: '0.2rem 0.45rem', color: '#0284c7', borderColor: '#bae6fd' }}
                              title="Change Profile Photo"
                            >
                              <Camera size={13} />
                            </button>
                            <Link
                              to={`/admin/doctors/${doc.doctor_id}/edit`}
                              className="btn btn-sm btn-outline"
                              style={{ padding: '0.2rem 0.45rem' }}
                              title="Edit Doctor Details"
                            >
                              <Edit3 size={13} />
                            </Link>
                            <button
                              type="button"
                              onClick={() => {
                                setSlotDoctorFilter(String(doc.doctor_id));
                                setActiveTab('slots');
                                setSlotPage(1);
                              }}
                              className="btn btn-sm btn-outline"
                              style={{ padding: '0.2rem 0.45rem' }}
                              title="Inspect Doctor Slots"
                            >
                              <Clock size={13} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteDoctor(doc.doctor_id, doc.doctor_name)}
                              className="btn btn-sm btn-outline"
                              style={{ padding: '0.2rem 0.45rem', color: '#dc2626', borderColor: '#fca5a5' }}
                              title="Delete Doctor"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={8} style={{ textAlign: 'center', padding: '2rem', color: 'var(--c-text-light)' }}>
                        No doctors match the selected search and filter criteria.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* DOCTOR PAGINATION */}
            {filteredDoctors.length > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid var(--c-border)', flexWrap: 'wrap', gap: '1rem' }}>
                <div style={{ fontSize: '0.85rem', color: 'var(--c-text-light)' }}>
                  Showing <strong>{(doctorPage - 1) * doctorPageSize + 1}–{Math.min(filteredDoctors.length, doctorPage * doctorPageSize)}</strong> of <strong>{filteredDoctors.length}</strong> Doctors
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <select
                    value={doctorPageSize}
                    onChange={(e) => { setDoctorPageSize(Number(e.target.value)); setDoctorPage(1); }}
                    style={{ fontSize: '0.8rem', padding: '4px 8px', borderRadius: '6px', border: '1px solid var(--c-border)', background: '#fff' }}
                  >
                    <option value={10}>10 / page</option>
                    <option value={20}>20 / page</option>
                    <option value={50}>50 / page</option>
                  </select>

                  {totalDoctorPages > 1 && (
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <button
                        type="button"
                        onClick={() => setDoctorPage((p) => Math.max(1, p - 1))}
                        disabled={doctorPage === 1}
                        className="btn btn-sm btn-outline"
                        style={{ padding: '0.25rem 0.5rem' }}
                      >
                        <ChevronLeft size={14} />
                      </button>
                      <span style={{ fontSize: '0.85rem', fontWeight: 600, padding: '0.25rem 0.5rem', display: 'flex', alignItems: 'center' }}>
                        {doctorPage} / {totalDoctorPages}
                      </span>
                      <button
                        type="button"
                        onClick={() => setDoctorPage((p) => Math.min(totalDoctorPages, p + 1))}
                        disabled={doctorPage === totalDoctorPages}
                        className="btn btn-sm btn-outline"
                        style={{ padding: '0.25rem 0.5rem' }}
                      >
                        <ChevronRight size={14} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ============================================================ */}
        {/* DOCTOR PROFILE PHOTO STUDIO MODAL */}
        {/* ============================================================ */}
        {photoModalDoctor && (
          <div className="modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.7)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1200, padding: '1rem' }}>
            <div className="card" style={{ width: '100%', maxWidth: '780px', maxHeight: '92vh', overflowY: 'auto', padding: '1.75rem', borderRadius: '20px', background: '#fff', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}>
              {/* Modal Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem', borderBottom: '1px solid var(--c-border)', paddingBottom: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                  <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(2,132,199,0.3)' }}>
                    <Camera size={24} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--c-navy)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                      Change Doctor Profile Photo
                    </h3>
                    <p style={{ fontSize: '0.82rem', color: 'var(--c-text-light)', margin: '3px 0 0' }}>
                      Dr. {photoModalDoctor.doctor_name} · {photoModalDoctor.specialization || 'Specialist'}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setPhotoModalDoctor(null)}
                  style={{ border: 'none', background: '#f1f5f9', width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--c-navy)' }}
                >
                  <X size={18} />
                </button>
              </div>

              {/* Main Studio Area */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 240px', gap: '1.5rem', marginBottom: '1.5rem' }}>
                {/* Left Column: Photo Chooser Options */}
                <div>
                  {/* Tabs */}
                  <div style={{ display: 'flex', gap: '6px', background: '#f1f5f9', padding: '4px', borderRadius: '10px', marginBottom: '1.25rem' }}>
                    <button
                      type="button"
                      onClick={() => setPhotoMode('presets')}
                      style={{
                        flex: 1,
                        border: 'none',
                        background: photoMode === 'presets' ? '#fff' : 'transparent',
                        color: photoMode === 'presets' ? '#0284c7' : '#64748b',
                        fontWeight: photoMode === 'presets' ? 700 : 600,
                        fontSize: '0.82rem',
                        padding: '0.5rem 0.75rem',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        boxShadow: photoMode === 'presets' ? '0 2px 4px rgba(0,0,0,0.06)' : 'none',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px'
                      }}
                    >
                      <Sparkles size={14} /> Studio Portraits
                    </button>
                    <button
                      type="button"
                      onClick={() => setPhotoMode('upload')}
                      style={{
                        flex: 1,
                        border: 'none',
                        background: photoMode === 'upload' ? '#fff' : 'transparent',
                        color: photoMode === 'upload' ? '#0284c7' : '#64748b',
                        fontWeight: photoMode === 'upload' ? 700 : 600,
                        fontSize: '0.82rem',
                        padding: '0.5rem 0.75rem',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        boxShadow: photoMode === 'upload' ? '0 2px 4px rgba(0,0,0,0.06)' : 'none',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px'
                      }}
                    >
                      <UploadCloud size={14} /> Upload Custom Photo
                    </button>
                    <button
                      type="button"
                      onClick={() => setPhotoMode('url')}
                      style={{
                        flex: 1,
                        border: 'none',
                        background: photoMode === 'url' ? '#fff' : 'transparent',
                        color: photoMode === 'url' ? '#0284c7' : '#64748b',
                        fontWeight: photoMode === 'url' ? 700 : 600,
                        fontSize: '0.82rem',
                        padding: '0.5rem 0.75rem',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        boxShadow: photoMode === 'url' ? '0 2px 4px rgba(0,0,0,0.06)' : 'none',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px'
                      }}
                    >
                      <Image size={14} /> Direct URL
                    </button>
                  </div>

                  {/* Mode 1: Presets */}
                  {photoMode === 'presets' && (
                    <div>
                      {/* Gender Filter Pills */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
                        <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--c-navy)' }}>
                          Select Curated Clinical Portrait:
                        </span>
                        <div style={{ display: 'flex', gap: '4px' }}>
                          {['all', 'Male', 'Female'].map((g) => (
                            <button
                              key={g}
                              type="button"
                              onClick={() => setPhotoGenderFilter(g)}
                              style={{
                                border: '1px solid var(--c-border)',
                                background: photoGenderFilter === g ? '#0284c7' : '#fff',
                                color: photoGenderFilter === g ? '#fff' : 'var(--c-navy)',
                                padding: '2px 8px',
                                borderRadius: '12px',
                                fontSize: '0.72rem',
                                fontWeight: 600,
                                cursor: 'pointer'
                              }}
                            >
                              {g === 'all' ? 'All' : `${g} Doctors`}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Grid of Presets */}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem', maxHeight: '280px', overflowY: 'auto', paddingRight: '4px' }}>
                        {DOCTOR_AVATAR_PRESETS
                          .filter((p) => photoGenderFilter === 'all' || p.gender === photoGenderFilter)
                          .map((preset) => {
                            const isSelected = selectedPresetUrl === preset.url || photoPreview === preset.url;
                            return (
                              <div
                                key={preset.id}
                                onClick={() => handleSelectPresetPhoto(preset)}
                                style={{
                                  position: 'relative',
                                  borderRadius: '12px',
                                  overflow: 'hidden',
                                  border: isSelected ? '2.5px solid #0284c7' : '1px solid #e2e8f0',
                                  boxShadow: isSelected ? '0 0 0 3px rgba(2,132,199,0.2)' : 'none',
                                  cursor: 'pointer',
                                  transition: 'all 0.15s ease',
                                  aspectRatio: '1 / 1',
                                  background: '#f8fafc',
                                }}
                              >
                                <img
                                  src={preset.url}
                                  alt={preset.name}
                                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                />
                                {isSelected && (
                                  <div style={{ position: 'absolute', top: '4px', right: '4px', background: '#0284c7', color: '#fff', borderRadius: '50%', width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <Check size={12} strokeWidth={3} />
                                  </div>
                                )}
                                <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'linear-gradient(to top, rgba(15,23,42,0.85) 0%, transparent 100%)', padding: '4px 6px', color: '#fff', fontSize: '0.68rem', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                  {preset.tag || preset.gender}
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    </div>
                  )}

                  {/* Mode 2: Upload File */}
                  {photoMode === 'upload' && (
                    <div>
                      <label
                        htmlFor="admin_doc_photo_upload_input"
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '0.75rem',
                          padding: '2.5rem 1.5rem',
                          border: '2px dashed #cbd5e1',
                          borderRadius: '14px',
                          background: '#f8fafc',
                          cursor: 'pointer',
                          textAlign: 'center',
                          transition: 'border-color 0.2s',
                        }}
                      >
                        <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#e0f2fe', color: '#0284c7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <UploadCloud size={24} />
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, color: 'var(--c-navy)', fontSize: '0.9rem' }}>
                            Click to Browse Custom Photo
                          </div>
                          <div style={{ fontSize: '0.76rem', color: 'var(--c-text-light)', marginTop: '2px' }}>
                            Supports JPG, PNG, WEBP (Max 10MB)
                          </div>
                        </div>
                        {photoFile && (
                          <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#15803d', background: '#dcfce7', padding: '4px 12px', borderRadius: '20px' }}>
                            ✓ Selected: {photoFile.name} ({(photoFile.size / 1024).toFixed(1)} KB)
                          </div>
                        )}
                      </label>
                      <input
                        id="admin_doc_photo_upload_input"
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/jpg"
                        onChange={handlePhotoFileChange}
                        style={{ display: 'none' }}
                      />
                    </div>
                  )}

                  {/* Mode 3: Direct URL */}
                  {photoMode === 'url' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--c-navy)', marginBottom: '4px' }}>
                          Paste Image URL (Unsplash, Cloudinary, CDN):
                        </label>
                        <input
                          type="url"
                          placeholder="https://images.unsplash.com/..."
                          value={customUrlInput}
                          onChange={(e) => {
                            const url = e.target.value;
                            setCustomUrlInput(url);
                            if (url.trim().startsWith('http')) {
                              setPhotoPreview(url.trim());
                              setSelectedPresetUrl(url.trim());
                              setPhotoFile(null);
                            }
                          }}
                          style={{ width: '100%', height: '40px', borderRadius: '8px', border: '1px solid var(--c-border)', padding: '0 12px', fontSize: '0.88rem' }}
                        />
                      </div>
                      <div style={{ fontSize: '0.76rem', color: 'var(--c-text-light)', background: '#f8fafc', padding: '0.75rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                        💡 Direct HTTPS image URLs from Unsplash, Cloudinary, AWS S3, or hospital servers are supported.
                      </div>
                    </div>
                  )}
                </div>

                {/* Right Column: Live High-Res Preview */}
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '1.25rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--c-text-light)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>
                    Live Preview
                  </span>
                  <div style={{ width: '130px', height: '130px', borderRadius: '50%', overflow: 'hidden', border: '3px solid #0284c7', boxShadow: '0 8px 20px rgba(2,132,199,0.2)', marginBottom: '0.85rem', background: '#e0f2fe' }}>
                    <img
                      src={photoPreview || getDoctorAvatar({ name: photoModalDoctor.doctor_name })}
                      alt={photoModalDoctor.doctor_name}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = getDoctorAvatar({ name: photoModalDoctor.doctor_name });
                      }}
                    />
                  </div>
                  <div style={{ fontWeight: 800, color: 'var(--c-navy)', fontSize: '0.92rem' }}>
                    Dr. {photoModalDoctor.doctor_name}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#0284c7', fontWeight: 600 }}>
                    {photoModalDoctor.specialization}
                  </div>
                </div>
              </div>

              {/* Modal Actions */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', borderTop: '1px solid var(--c-border)', paddingTop: '1rem' }}>
                <button
                  type="button"
                  onClick={() => setPhotoModalDoctor(null)}
                  className="btn btn-outline btn-sm"
                  disabled={photoSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveDoctorPhoto}
                  disabled={photoSubmitting}
                  className="btn btn-primary btn-sm"
                  style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <Check size={14} />
                  {photoSubmitting ? 'Saving Photo...' : 'Save Profile Photo'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* TAB 5: APPOINTMENTS (WITH RESCHEDULE & EMAIL CONFIRMATION) */}
        {/* ============================================================ */}
        {activeTab === 'appointments' && (
          <div className="card" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--c-navy)' }}>All Patient Consultations</h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--c-text-light)' }}>
                  Manage statuses, reschedule patient slots with email notifications, and download medical invoices.
                </p>
              </div>
              <div style={{ position: 'relative', width: '280px' }}>
                <Search size={16} style={{ position: 'absolute', left: '10px', top: '10px', color: 'var(--c-text-light)' }} />
                <input
                  type="text"
                  placeholder="Patient, doctor, date, receipt..."
                  value={appointmentSearch}
                  onChange={(e) => { setAppointmentSearch(e.target.value); setAppointmentPage(1); }}
                  style={{ width: '100%', paddingLeft: '32px', paddingRight: '12px', height: '36px', borderRadius: '8px', border: '1px solid var(--c-border)', fontSize: '0.85rem' }}
                />
              </div>
            </div>

            {/* Status Pills */}
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
              {['all', 'pending', 'confirmed', 'completed', 'cancelled', 'rescheduled'].map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => { setAppointmentStatusFilter(st); setAppointmentPage(1); }}
                  style={{
                    border: '1px solid var(--c-border)',
                    background: appointmentStatusFilter === st ? 'var(--color-primary)' : '#fff',
                    color: appointmentStatusFilter === st ? '#fff' : 'var(--c-navy)',
                    padding: '0.35rem 0.85rem',
                    borderRadius: '20px',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    textTransform: 'capitalize'
                  }}
                >
                  {st} {st !== 'all' && `(${stats?.status_breakdown?.[st] || 0})`}
                </button>
              ))}
            </div>

            <div className="table-responsive">
              <table className="payment-table">
                <thead>
                  <tr>
                    <th>Receipt / ID</th>
                    <th>Patient</th>
                    <th>Doctor Assigned</th>
                    <th>Consultation Date</th>
                    <th>Status</th>
                    <th>Status Action</th>
                    <th style={{ textAlign: 'right' }}>Fee Charged</th>
                    <th style={{ textAlign: 'center' }}>Reschedule / Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedAppointments.length > 0 ? (
                    paginatedAppointments.map((appt) => (
                      <tr key={appt.id}>
                        <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: 'var(--color-primary)', fontWeight: 600 }}>
                          {appt.receipt_id || `#${appt.id}`}
                        </td>
                        <td>
                          <div style={{ fontWeight: 'bold', color: 'var(--c-navy)' }}>
                            {appt.patient_name || appt.patient_email}
                            {appt.patient_relation && appt.patient_relation !== 'Self' && (
                              <span style={{ marginLeft: '0.4rem', fontSize: '0.7rem', background: '#ecfdf5', color: '#059669', padding: '1px 6px', borderRadius: '4px', fontWeight: 600 }}>
                                {appt.patient_relation}
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--c-text-light)' }}>
                            Acc: {appt.patient_email} {appt.patient_phone ? `· ${appt.patient_phone}` : ''}
                          </div>
                        </td>
                        <td>
                          <div style={{ fontWeight: 600 }}>Dr. {appt.doctor_name}</div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--c-text-light)' }}>{appt.doctor_specialization}</div>
                        </td>
                        <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }}>
                          {appt.slot_date} {appt.slot_time}
                        </td>
                        <td>
                          <span className={`status-badge status-${appt.status}`}>
                            {appt.status ? appt.status.toUpperCase() : 'PENDING'}
                          </span>
                        </td>
                        <td>
                          <select
                            value={appt.status}
                            onChange={(e) => handleUpdateStatus(appt.id, e.target.value)}
                            style={{ fontSize: '0.78rem', padding: '0.25rem 0.5rem', borderRadius: '6px', border: '1px solid var(--c-border)', background: '#fff' }}
                          >
                            <option value="pending">Pending</option>
                            <option value="confirmed">Confirmed</option>
                            <option value="completed">Completed</option>
                            <option value="cancelled">Cancelled</option>
                            <option value="rescheduled">Rescheduled</option>
                          </select>
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 'bold', color: 'var(--c-navy)' }}>
                          ₹{appt.fee_charged}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <div style={{ display: 'flex', gap: '0.35rem', justifyContent: 'center' }}>
                            <button
                              type="button"
                              onClick={() => handleOpenRescheduleModal(appt)}
                              className="btn btn-outline btn-sm"
                              style={{ fontSize: '0.75rem', padding: '0.25rem 0.55rem', display: 'flex', alignItems: 'center', gap: '3px' }}
                              title="Reschedule this appointment"
                            >
                              <RotateCcw size={12} /> Reschedule
                            </button>
                            <button
                              type="button"
                              className="btn btn-outline btn-sm"
                              onClick={() => setSelectedInvoice(appt)}
                              style={{ fontSize: '0.75rem', padding: '0.25rem 0.55rem' }}
                              title="Generate Medical Invoice"
                            >
                              🧾 Invoice
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={8} style={{ textAlign: 'center', padding: '2rem', color: 'var(--c-text-light)' }}>
                        No appointments found matching the current search / status filter.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* APPOINTMENT PAGINATION */}
            {filteredAppointments.length > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid var(--c-border)', flexWrap: 'wrap', gap: '1rem' }}>
                <div style={{ fontSize: '0.85rem', color: 'var(--c-text-light)' }}>
                  Showing <strong>{(appointmentPage - 1) * appointmentPageSize + 1}–{Math.min(filteredAppointments.length, appointmentPage * appointmentPageSize)}</strong> of <strong>{filteredAppointments.length}</strong> Appointments
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <select
                    value={appointmentPageSize}
                    onChange={(e) => { setAppointmentPageSize(Number(e.target.value)); setAppointmentPage(1); }}
                    style={{ fontSize: '0.8rem', padding: '4px 8px', borderRadius: '6px', border: '1px solid var(--c-border)', background: '#fff' }}
                  >
                    <option value={10}>10 / page</option>
                    <option value={25}>25 / page</option>
                    <option value={50}>50 / page</option>
                  </select>

                  {totalApptPages > 1 && (
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <button
                        type="button"
                        onClick={() => setAppointmentPage((p) => Math.max(1, p - 1))}
                        disabled={appointmentPage === 1}
                        className="btn btn-sm btn-outline"
                        style={{ padding: '0.25rem 0.5rem' }}
                      >
                        <ChevronLeft size={14} />
                      </button>
                      <span style={{ fontSize: '0.85rem', fontWeight: 600, padding: '0.25rem 0.5rem', display: 'flex', alignItems: 'center' }}>
                        {appointmentPage} / {totalApptPages}
                      </span>
                      <button
                        type="button"
                        onClick={() => setAppointmentPage((p) => Math.min(totalApptPages, p + 1))}
                        disabled={appointmentPage === totalApptPages}
                        className="btn btn-sm btn-outline"
                        style={{ padding: '0.25rem 0.5rem' }}
                      >
                        <ChevronRight size={14} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ============================================================ */}
        {/* TAB 6: PATIENTS */}
        {/* ============================================================ */}
        {activeTab === 'patients' && (
          <div className="card" style={{ padding: '1.5rem' }}>
            {/* Header & Filter Controls */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--c-navy)', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
                  <UserCog size={22} style={{ color: '#16a34a' }} /> Registered Patient Database
                </h3>
                <p style={{ fontSize: '0.82rem', color: 'var(--c-text-light)', margin: '0.25rem 0 0' }}>
                  Manage patient accounts, verify identities, check contact info, and inspect consultation history ({filteredPatients.length} accounts found).
                </p>
              </div>

              {/* Search Bar */}
              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
                <div style={{ position: 'relative', width: '280px' }}>
                  <Search size={16} style={{ position: 'absolute', left: '10px', top: '10px', color: 'var(--c-text-light)' }} />
                  <input
                    type="text"
                    placeholder="Search name, email, phone..."
                    value={patientSearch}
                    onChange={(e) => { setPatientSearch(e.target.value); setPatientPage(1); }}
                    style={{ width: '100%', paddingLeft: '32px', paddingRight: '12px', height: '36px', borderRadius: '8px', border: '1px solid var(--c-border)', fontSize: '0.85rem' }}
                  />
                </div>
              </div>
            </div>

            {/* Filter Pills */}
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
              {[
                { id: 'all', label: 'All Accounts' },
                { id: 'verified', label: 'Verified Accounts Only' },
                { id: 'with_phone', label: 'With Phone Number' },
              ].map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => { setPatientFilterType(f.id); setPatientPage(1); }}
                  style={{
                    border: '1px solid var(--c-border)',
                    background: patientFilterType === f.id ? '#16a34a' : '#fff',
                    color: patientFilterType === f.id ? '#fff' : 'var(--c-navy)',
                    padding: '0.35rem 0.85rem',
                    borderRadius: '20px',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Patients Grid */}
            {paginatedPatients.length > 0 ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.25rem' }}>
                {paginatedPatients.map((p) => {
                  const avatarLetter = (p.first_name ? p.first_name.charAt(0) : p.username.charAt(0)).toUpperCase();
                  const fullName = `${p.first_name || ''} ${p.last_name || ''}`.trim();
                  return (
                    <div
                      key={p.id}
                      style={{
                        background: '#ffffff',
                        border: '1px solid #e2e8f0',
                        borderRadius: '14px',
                        padding: '1.25rem',
                        boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        gap: '0.85rem',
                      }}
                    >
                      {/* Top Row: Avatar + Name + Status */}
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.75rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <div
                            style={{
                              width: '46px',
                              height: '46px',
                              borderRadius: '12px',
                              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                              color: '#ffffff',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 800,
                              fontSize: '1.1rem',
                              boxShadow: '0 2px 8px rgba(16,185,129,0.25)',
                              flexShrink: 0
                            }}
                          >
                            {avatarLetter}
                          </div>
                          <div style={{ minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <h4 style={{ fontSize: '0.98rem', fontWeight: 800, color: 'var(--c-navy)', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {p.username}
                              </h4>
                              {p.is_verified && (
                                <span title="Verified Account" style={{ color: '#16a34a', display: 'inline-flex' }}>
                                  <ShieldCheck size={16} />
                                </span>
                              )}
                            </div>
                            {fullName && (
                              <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600 }}>
                                {fullName}
                              </div>
                            )}
                          </div>
                        </div>

                        <span
                          style={{
                            fontSize: '0.7rem',
                            fontWeight: 700,
                            padding: '3px 8px',
                            borderRadius: '12px',
                            background: p.is_verified ? '#dcfce7' : '#f1f5f9',
                            color: p.is_verified ? '#15803d' : '#64748b',
                            border: p.is_verified ? '1px solid #bbf7d0' : '1px solid #e2e8f0',
                            whiteSpace: 'nowrap'
                          }}
                        >
                          {p.is_verified ? '✓ Verified' : 'Registered'}
                        </span>
                      </div>

                      {/* Contact Info Box */}
                      <div
                        style={{
                          background: '#f8fafc',
                          padding: '0.65rem 0.85rem',
                          borderRadius: '8px',
                          border: '1px solid #f1f5f9',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '6px',
                          fontSize: '0.78rem',
                          color: '#475569'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Mail size={13} style={{ color: '#0284c7', flexShrink: 0 }} />
                          <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={p.email}>
                            {p.email}
                          </span>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Phone size={13} style={{ color: p.phone ? '#16a34a' : '#94a3b8', flexShrink: 0 }} />
                            <span style={{ fontWeight: p.phone ? 600 : 400, color: p.phone ? '#1e293b' : '#94a3b8' }}>
                              {p.phone || 'No phone added'}
                            </span>
                          </span>

                          {p.date_joined_formatted && (
                            <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
                              Joined {p.date_joined_formatted}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Card Footer: Bookings & View Details Button */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '0.4rem', borderTop: '1px solid #f1f5f9' }}>
                        <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#0284c7', background: '#e0f2fe', padding: '2px 8px', borderRadius: '6px' }}>
                          🩺 {p.total_bookings !== undefined ? `${p.total_bookings} Bookings` : 'Active Patient'}
                        </span>

                        <button
                          type="button"
                          onClick={() => setSelectedPatientModal(p)}
                          className="btn btn-sm btn-outline"
                          style={{
                            fontSize: '0.74rem',
                            padding: '0.25rem 0.65rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontWeight: 600
                          }}
                        >
                          <Eye size={13} /> View Record
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '3rem 1rem', background: '#f8fafc', borderRadius: '12px', border: '1px dashed #cbd5e1' }}>
                <Users size={36} style={{ color: '#94a3b8', margin: '0 auto 0.5rem' }} />
                <h4 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--c-navy)', margin: '0 0 0.25rem' }}>No Patients Found</h4>
                <p style={{ fontSize: '0.82rem', color: 'var(--c-text-light)', margin: 0 }}>
                  No registered patient accounts matched your search query.
                </p>
              </div>
            )}

            {/* PATIENTS PAGINATION */}
            {filteredPatients.length > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--c-border)', flexWrap: 'wrap', gap: '1rem' }}>
                <div style={{ fontSize: '0.85rem', color: 'var(--c-text-light)' }}>
                  Showing <strong>{(patientPage - 1) * patientPageSize + 1}–{Math.min(filteredPatients.length, patientPage * patientPageSize)}</strong> of <strong>{filteredPatients.length}</strong> Patients
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <select
                    value={patientPageSize}
                    onChange={(e) => { setPatientPageSize(Number(e.target.value)); setPatientPage(1); }}
                    style={{ fontSize: '0.8rem', padding: '4px 8px', borderRadius: '6px', border: '1px solid var(--c-border)', background: '#fff' }}
                  >
                    <option value={12}>12 / page</option>
                    <option value={24}>24 / page</option>
                    <option value={48}>48 / page</option>
                  </select>

                  {totalPatientPages > 1 && (
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <button
                        type="button"
                        onClick={() => setPatientPage((p) => Math.max(1, p - 1))}
                        disabled={patientPage === 1}
                        className="btn btn-sm btn-outline"
                        style={{ padding: '0.25rem 0.5rem' }}
                      >
                        <ChevronLeft size={14} /> Prev
                      </button>
                      <span style={{ fontSize: '0.85rem', fontWeight: 600, padding: '0.25rem 0.5rem', display: 'flex', alignItems: 'center' }}>
                        {patientPage} / {totalPatientPages}
                      </span>
                      <button
                        type="button"
                        onClick={() => setPatientPage((p) => Math.min(totalPatientPages, p + 1))}
                        disabled={patientPage === totalPatientPages}
                        className="btn btn-sm btn-outline"
                        style={{ padding: '0.25rem 0.5rem' }}
                      >
                        Next <ChevronRight size={14} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}


        {/* ============================================================ */}
        {/* TAB 7: PAYMENTS */}
        {/* ============================================================ */}
        {activeTab === 'payments' && (
          <div className="card" style={{ padding: '1.5rem' }}>
            <div style={{ marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--c-navy)' }}>Financial Transaction Ledger</h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--c-text-light)' }}>Audit real-time consultation fees, Razorpay order IDs, and payment verification receipts.</p>
            </div>

            <div className="table-responsive">
              <table className="payment-table">
                <thead>
                  <tr>
                    <th>Patient Account</th>
                    <th>Payment Gateway IDs</th>
                    <th>Settlement Amount</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'right' }}>Timestamp</th>
                  </tr>
                </thead>
                <tbody>
                  {stats?.payments_list?.length > 0 ? (
                    stats.payments_list.map((p) => (
                      <tr key={p.id}>
                        <td style={{ fontWeight: 'bold' }}>{p.patient_name || 'Patient'}</td>
                        <td>
                          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--c-text-light)' }}>
                            Order: {p.razorpay_order_id}
                          </div>
                          {p.razorpay_payment_id && (
                            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--c-emerald)' }}>
                              Payment: {p.razorpay_payment_id}
                            </div>
                          )}
                        </td>
                        <td style={{ fontWeight: 700, color: 'var(--c-emerald)', fontSize: '0.95rem' }}>₹{p.amount}</td>
                        <td>
                          <span className={`status-badge ${p.status === 'paid' ? 'status-confirmed' : 'status-cancelled'}`}>
                            {p.status ? p.status.toUpperCase() : 'PENDING'}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right', fontSize: '0.78rem', color: 'var(--c-text-light)', fontFamily: 'var(--font-mono)' }}>
                          {p.created_at ? new Date(p.created_at).toLocaleDateString() : 'Recent'}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} style={{ textAlign: 'center', padding: '2rem', color: 'var(--c-text-light)' }}>
                        No transactions recorded yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* ============================================================ */}
      {/* MODAL 1: CANCEL SLOT WITH EMAIL NOTIFICATION TO PATIENTS */}
      {/* ============================================================ */}
      {cancelSlotTarget && (
        <div className="admin-modal-overlay">
          <div className="admin-modal-box">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#dc2626' }}>
                <ShieldAlert size={22} />
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800 }}>Cancel Particular Doctor Slot</h3>
              </div>
              <button
                type="button"
                onClick={() => setCancelSlotTarget(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--c-text-light)' }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '1rem', marginBottom: '1.25rem' }}>
              <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#991b1b', marginBottom: '4px' }}>
                Dr. {cancelSlotTarget.doctor_name} · {cancelSlotTarget.date} ({cancelSlotTarget.start_time})
              </div>
              <p style={{ fontSize: '0.78rem', color: '#b91c1c', margin: 0 }}>
                ⚠️ <strong>{cancelSlotTarget.booked_count} Patient(s)</strong> currently have active bookings in this slot.
                Cancelling will apply your chosen resolution and dispatch email notifications with doctor name, hospital name, and sincere apologies.
              </p>
            </div>

            {/* Resolution Options */}
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 800, color: 'var(--c-navy)', marginBottom: '8px' }}>
                Select Resolution Action for Booked Patients:
              </label>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '0.75rem',
                    padding: '0.85rem',
                    borderRadius: '8px',
                    border: cancelSlotAction === 'auto_reschedule' ? '2px solid #2563eb' : '1px solid var(--c-border)',
                    background: cancelSlotAction === 'auto_reschedule' ? '#eff6ff' : '#fff',
                    cursor: 'pointer'
                  }}
                >
                  <input
                    type="radio"
                    name="admin_cancel_action"
                    checked={cancelSlotAction === 'auto_reschedule'}
                    onChange={() => setCancelSlotAction('auto_reschedule')}
                    style={{ marginTop: '3px', accentColor: '#2563eb' }}
                  />
                  <div>
                    <div style={{ fontSize: '0.86rem', fontWeight: 800, color: '#1d4ed8' }}>
                      🔄 Auto-Reschedule to Doctor's Next Open Slot (Recommended)
                    </div>
                    <p style={{ fontSize: '0.76rem', color: 'var(--c-text-light)', margin: '2px 0 0', lineHeight: 1.35 }}>
                      Shifts booked patients automatically to doctor's next upcoming active slot and sends reschedule confirmation email with apologies.
                    </p>
                  </div>
                </label>

                <label
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '0.75rem',
                    padding: '0.85rem',
                    borderRadius: '8px',
                    border: cancelSlotAction === 'cancel_refund' ? '2px solid #dc2626' : '1px solid var(--c-border)',
                    background: cancelSlotAction === 'cancel_refund' ? '#fef2f2' : '#fff',
                    cursor: 'pointer'
                  }}
                >
                  <input
                    type="radio"
                    name="admin_cancel_action"
                    checked={cancelSlotAction === 'cancel_refund'}
                    onChange={() => setCancelSlotAction('cancel_refund')}
                    style={{ marginTop: '3px', accentColor: '#dc2626' }}
                  />
                  <div>
                    <div style={{ fontSize: '0.86rem', fontWeight: 800, color: '#991b1b' }}>
                      💰 100% Full Refund Cancellation (Zero Deductions)
                    </div>
                    <p style={{ fontSize: '0.76rem', color: 'var(--c-text-light)', margin: '2px 0 0', lineHeight: 1.35 }}>
                      Cancels all patient appointments on this slot, credits 100% refund (₹0 cut-off fee), and sends cancellation apology email.
                    </p>
                  </div>
                </label>
              </div>
            </div>

            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--c-navy)', marginBottom: '6px' }}>
                Reason for Cancellation (included in Patient Email):
              </label>
              <textarea
                rows={2}
                value={cancelSlotReason}
                onChange={(e) => setCancelSlotReason(e.target.value)}
                placeholder="Explain the reason (e.g., Doctor emergency, facility maintenance)..."
                style={{ width: '100%', borderRadius: '8px', border: '1px solid var(--c-border)', padding: '8px 12px', fontSize: '0.85rem' }}
              />
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setCancelSlotTarget(null)}
                className="btn btn-outline"
                disabled={cancelSlotLoading}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteCancelSlot}
                disabled={cancelSlotLoading}
                className="btn btn-primary"
                style={{ background: '#dc2626', borderColor: '#dc2626', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                {cancelSlotLoading ? 'Executing Resolution...' : 'Confirm Slot Action & Notify'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL 2: ADMIN RESCHEDULE APPOINTMENT */}
      {/* ============================================================ */}
      {rescheduleTargetAppt && (
        <div className="admin-modal-overlay">
          <div className="admin-modal-box">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#2563eb' }}>
                <RotateCcw size={22} />
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800 }}>Reschedule Patient Appointment</h3>
              </div>
              <button
                type="button"
                onClick={() => setRescheduleTargetAppt(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--c-text-light)' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Current Appointment Summary */}
            <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '8px', padding: '0.85rem', marginBottom: '1.25rem', fontSize: '0.82rem' }}>
              <div><strong>Patient:</strong> {rescheduleTargetAppt.patient_name || rescheduleTargetAppt.patient_email} ({rescheduleTargetAppt.patient_relation || 'Self'})</div>
              <div><strong>Doctor:</strong> Dr. {rescheduleTargetAppt.doctor_name} ({rescheduleTargetAppt.doctor_specialization})</div>
              <div><strong>Current Slot:</strong> {rescheduleTargetAppt.slot_date} at {rescheduleTargetAppt.slot_time}</div>
            </div>

            {/* Select Target Date */}
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--c-navy)', marginBottom: '6px' }}>
                1. Select New Consultation Date:
              </label>
              {fetchingDatesSlots ? (
                <div style={{ fontSize: '0.8rem', color: 'var(--c-text-light)' }}>Loading doctor schedule dates...</div>
              ) : rescheduleAvailableDates.length > 0 ? (
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {rescheduleAvailableDates.map((dateStr) => (
                    <button
                      key={dateStr}
                      type="button"
                      onClick={() => handleRescheduleDateSelect(dateStr)}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '6px',
                        border: rescheduleSelectedDate === dateStr ? '2px solid #2563eb' : '1px solid var(--c-border)',
                        background: rescheduleSelectedDate === dateStr ? '#dbeafe' : '#fff',
                        color: rescheduleSelectedDate === dateStr ? '#1d4ed8' : 'var(--c-navy)',
                        fontWeight: 600,
                        fontSize: '0.8rem',
                        cursor: 'pointer'
                      }}
                    >
                      {dateStr}
                    </button>
                  ))}
                </div>
              ) : (
                <div style={{ fontSize: '0.8rem', color: '#dc2626' }}>No future available dates found for this doctor.</div>
              )}
            </div>

            {/* Select Target Slot */}
            {rescheduleSelectedDate && (
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--c-navy)', marginBottom: '6px' }}>
                  2. Select New Time Slot on {rescheduleSelectedDate} (5 patients capacity):
                </label>
                {fetchingDatesSlots ? (
                  <div style={{ fontSize: '0.8rem', color: 'var(--c-text-light)' }}>Loading slots...</div>
                ) : rescheduleAvailableSlots.length > 0 ? (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '0.5rem' }}>
                    {rescheduleAvailableSlots.map((s) => {
                      const isFull = s.booked >= s.max_capacity;
                      return (
                        <button
                          key={s.id}
                          type="button"
                          disabled={isFull}
                          onClick={() => setRescheduleSelectedSlotId(s.id)}
                          style={{
                            padding: '8px 10px',
                            borderRadius: '6px',
                            border: rescheduleSelectedSlotId === s.id ? '2px solid #2563eb' : '1px solid var(--c-border)',
                            background: isFull ? '#f1f5f9' : rescheduleSelectedSlotId === s.id ? '#dbeafe' : '#fff',
                            color: isFull ? '#94a3b8' : rescheduleSelectedSlotId === s.id ? '#1d4ed8' : 'var(--c-navy)',
                            fontWeight: 600,
                            fontSize: '0.82rem',
                            cursor: isFull ? 'not-allowed' : 'pointer',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center'
                          }}
                        >
                          <span>{s.start_time} {s.end_time ? `– ${s.end_time}` : ''}</span>
                          <span style={{ fontSize: '0.7rem', color: isFull ? '#dc2626' : '#059669', fontWeight: 700 }}>
                            {isFull ? 'Full' : `${s.booked}/${s.max_capacity} Booked`}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div style={{ fontSize: '0.8rem', color: '#dc2626' }}>No available slots on this date.</div>
                )}
              </div>
            )}

            {/* Admin Notes */}
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--c-navy)', marginBottom: '6px' }}>
                Admin Notes / Reason:
              </label>
              <input
                type="text"
                value={rescheduleNotes}
                onChange={(e) => setRescheduleNotes(e.target.value)}
                placeholder="Reason for reschedule..."
                style={{ width: '100%', height: '36px', borderRadius: '6px', border: '1px solid var(--c-border)', padding: '0 10px', fontSize: '0.85rem' }}
              />
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setRescheduleTargetAppt(null)}
                className="btn btn-outline"
                disabled={rescheduleLoading}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteReschedule}
                disabled={rescheduleLoading || !rescheduleSelectedSlotId}
                className="btn btn-primary"
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                {rescheduleLoading ? 'Rescheduling & Notifying...' : 'Confirm Reschedule & Send Email'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Patient Record Inspection Modal */}
      {selectedPatientModal && (
        <div className="admin-modal-overlay">
          <div className="admin-modal-box" style={{ maxWidth: '640px' }}>
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: '#dcfce7', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '1.1rem' }}>
                  {(selectedPatientModal.first_name || selectedPatientModal.username).charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: 'var(--c-navy)' }}>
                    {selectedPatientModal.username}
                  </h3>
                  <span style={{ fontSize: '0.78rem', color: 'var(--c-text-light)' }}>
                    Patient Account #{selectedPatientModal.id} &bull; {selectedPatientModal.is_verified ? '✓ Verified' : 'Registered'}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedPatientModal(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--c-text-light)' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Profile Info Details Grid */}
            <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '10px', border: '1px solid #e2e8f0', marginBottom: '1.25rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
              <div>
                <span style={{ fontSize: '0.72rem', color: 'var(--c-text-light)', textTransform: 'uppercase', fontWeight: 700 }}>Full Name:</span>
                <div style={{ fontWeight: 700, color: 'var(--c-navy)', fontSize: '0.9rem' }}>
                  {`${selectedPatientModal.first_name || ''} ${selectedPatientModal.last_name || ''}`.trim() || '—'}
                </div>
              </div>

              <div>
                <span style={{ fontSize: '0.72rem', color: 'var(--c-text-light)', textTransform: 'uppercase', fontWeight: 700 }}>Email Address:</span>
                <div style={{ fontWeight: 600, color: '#0284c7', fontSize: '0.85rem' }}>
                  {selectedPatientModal.email}
                </div>
              </div>

              <div>
                <span style={{ fontSize: '0.72rem', color: 'var(--c-text-light)', textTransform: 'uppercase', fontWeight: 700 }}>Phone Number:</span>
                <div style={{ fontWeight: 600, color: 'var(--c-navy)', fontSize: '0.85rem' }}>
                  {selectedPatientModal.phone || 'Not Provided'}
                </div>
              </div>

              <div>
                <span style={{ fontSize: '0.72rem', color: 'var(--c-text-light)', textTransform: 'uppercase', fontWeight: 700 }}>Member Since:</span>
                <div style={{ fontWeight: 600, color: 'var(--c-navy)', fontSize: '0.85rem' }}>
                  {selectedPatientModal.date_joined_formatted || 'Active Patient'}
                </div>
              </div>

              {selectedPatientModal.gender && (
                <div>
                  <span style={{ fontSize: '0.72rem', color: 'var(--c-text-light)', textTransform: 'uppercase', fontWeight: 700 }}>Gender:</span>
                  <div style={{ fontWeight: 600, color: 'var(--c-navy)', fontSize: '0.85rem', textTransform: 'capitalize' }}>
                    {selectedPatientModal.gender}
                  </div>
                </div>
              )}

              {selectedPatientModal.address && (
                <div style={{ gridColumn: '1 / -1' }}>
                  <span style={{ fontSize: '0.72rem', color: 'var(--c-text-light)', textTransform: 'uppercase', fontWeight: 700 }}>Address:</span>
                  <div style={{ fontWeight: 600, color: 'var(--c-navy)', fontSize: '0.85rem' }}>
                    {selectedPatientModal.address}
                  </div>
                </div>
              )}
            </div>

            {/* Consultations Booked by this patient */}
            <div style={{ marginBottom: '1.25rem' }}>
              <h4 style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--c-navy)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span>Consultation Bookings History</span>
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#0284c7' }}>
                  {(stats?.all_appointments || []).filter(a => a.patient_email === selectedPatientModal.email || a.patient === selectedPatientModal.id).length} Found
                </span>
              </h4>

              <div style={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                {(stats?.all_appointments || []).filter(a => a.patient_email === selectedPatientModal.email || a.patient === selectedPatientModal.id).length > 0 ? (
                  <table style={{ width: '100%', fontSize: '0.8rem', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: '#f1f5f9', borderBottom: '1px solid #e2e8f0', textAlign: 'left' }}>
                        <th style={{ padding: '6px 10px' }}>Doctor</th>
                        <th style={{ padding: '6px 10px' }}>Date</th>
                        <th style={{ padding: '6px 10px' }}>Status</th>
                        <th style={{ padding: '6px 10px', textAlign: 'right' }}>Fee</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(stats?.all_appointments || []).filter(a => a.patient_email === selectedPatientModal.email || a.patient === selectedPatientModal.id).map(a => (
                        <tr key={a.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '6px 10px', fontWeight: 600 }}>Dr. {a.doctor_name}</td>
                          <td style={{ padding: '6px 10px', fontFamily: 'var(--font-mono)' }}>{a.slot_date} {a.slot_time}</td>
                          <td style={{ padding: '6px 10px' }}>
                            <span className={`status-badge status-${a.status}`} style={{ fontSize: '0.68rem', padding: '1px 6px' }}>
                              {a.status}
                            </span>
                          </td>
                          <td style={{ padding: '6px 10px', textAlign: 'right', fontWeight: 700 }}>₹{a.fee_charged}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div style={{ padding: '1rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.8rem' }}>
                    No consultation bookings recorded yet for this patient account.
                  </div>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => {
                  setAppointmentSearch(selectedPatientModal.email || selectedPatientModal.username);
                  setSelectedPatientModal(null);
                  setActiveTab('appointments');
                  setAppointmentPage(1);
                }}
                className="btn btn-sm btn-outline"
                style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
              >
                <Calendar size={14} /> View in Appointments Tab &rarr;
              </button>
              <button
                type="button"
                onClick={() => setSelectedPatientModal(null)}
                className="btn btn-sm btn-primary"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Invoice Modal for Admin */}
      {selectedInvoice && (
        <InvoiceModal
          data={selectedInvoice}
          onClose={() => setSelectedInvoice(null)}
        />
      )}
    </div>
  );
};

export default AdminDashboardPage;

