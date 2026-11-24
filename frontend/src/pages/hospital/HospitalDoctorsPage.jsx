import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { useToast } from '../../context/ToastContext';
import api from '../../api/client';
import {
  Stethoscope,
  Search,
  CheckCircle2,
  XCircle,
  Edit2,
  ExternalLink,
  Phone,
  Mail,
  MapPin,
  IndianRupee,
  RefreshCw,
  X,
  Plus
} from 'lucide-react';
import './HospitalPages.css';
import './HospitalQueuePage.css';

export default function HospitalDoctorsPage() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [doctors, setDoctors] = useState([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [togglingId, setTogglingId] = useState(null);

  // Doctor Edit Modal State
  const [editModal, setEditModal] = useState({
    open: false,
    doctor: null,
    submitting: false,
    formData: {
      name: '',
      specialization: '',
      qualification: '',
      experience_years: 0,
      consultation_fee: 0,
      contact_phone: '',
      contact_email: '',
      clinic_address: '',
      google_maps_url: '',
      bio: '',
      is_active: true,
    }
  });

  const fetchDoctors = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (statusFilter !== 'all') params.set('status', statusFilter);
      const res = await api.get(`/appointments/hospital/doctors/?${params.toString()}`);
      setDoctors(res.data.doctors || []);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to fetch doctor roster.');
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter]);

  useEffect(() => {
    fetchDoctors();
  }, [fetchDoctors]);

  const handleToggleActive = async (doctor) => {
    setTogglingId(doctor.id);
    try {
      const res = await api.post('/appointments/hospital/doctors/', { doctor_id: doctor.id });
      toast.success(res.data.message || 'Doctor status updated.');
      fetchDoctors();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to toggle doctor status.');
    } finally {
      setTogglingId(null);
    }
  };

  const openEditModal = (doctor) => {
    setEditModal({
      open: true,
      doctor,
      submitting: false,
      formData: {
        name: doctor.name || '',
        specialization: doctor.specialization || '',
        qualification: doctor.qualification || '',
        experience_years: doctor.experience_years || 0,
        consultation_fee: doctor.consultation_fee || 0,
        contact_phone: doctor.contact_phone || '',
        contact_email: doctor.contact_email || '',
        clinic_address: doctor.clinic_address || '',
        google_maps_url: doctor.google_maps_url || '',
        bio: doctor.bio || '',
        is_active: doctor.is_active ?? true,
      }
    });
  };

  const handleSaveDoctor = async (e) => {
    e.preventDefault();
    const { doctor, formData } = editModal;
    if (!doctor) return;

    setEditModal((prev) => ({ ...prev, submitting: true }));
    try {
      const res = await api.patch(`/appointments/hospital/doctors/${doctor.id}/`, formData);
      toast.success(res.data.message || 'Doctor profile updated.');
      setEditModal((prev) => ({ ...prev, open: false, submitting: false }));
      fetchDoctors();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save doctor details.');
      setEditModal((prev) => ({ ...prev, submitting: false }));
    }
  };

  return (
    <DashboardLayout
      role="hospital"
      title="Specialists & Doctor Roster"
      subtitle="Manage attending clinical staff, consultation tariffs, schedules, and active duty."
      breadcrumbs={[
        { label: 'Hospital Portal', path: '/hospital/queue' },
        { label: 'Specialists' },
      ]}
      actions={
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            onClick={fetchDoctors}
            disabled={loading}
            className="cc-btn cc-btn-outline cc-btn-sm"
          >
            <RefreshCw size={14} className={loading ? 'spin' : ''} />
            <span>Refresh</span>
          </button>
        </div>
      }
    >
      <div className="cc-queue-container">
        {/* Filters & Search Toolbar */}
        <div className="cc-queue-toolbar">
          <div className="cc-queue-toolbar-top">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span className="cc-stat-chip admission">
                <Stethoscope size={15} />
                <span>{doctors.length} Doctors Registered</span>
              </span>
              <span className="cc-stat-chip completed">
                <CheckCircle2 size={15} />
                <span>{doctors.filter((d) => d.is_active).length} Active On Duty</span>
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{ position: 'relative', width: '220px' }}>
                <input
                  type="text"
                  placeholder="Search specialist..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="cc-filter-input"
                  style={{ paddingLeft: '2rem' }}
                />
                <Search size={14} style={{ position: 'absolute', left: '0.65rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              </div>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="cc-filter-select"
                style={{ width: '130px' }}
              >
                <option value="all">All Status</option>
                <option value="active">Active Only</option>
                <option value="inactive">Inactive Only</option>
              </select>
            </div>
          </div>
        </div>

        {/* Specialists Grid */}
        {loading && doctors.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
            <RefreshCw size={24} className="spin" style={{ margin: '0 auto 0.5rem', display: 'block', color: 'var(--cc-primary)' }} />
            Loading doctors roster...
          </div>
        ) : doctors.length === 0 ? (
          <div className="cc-card-table" style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
            <Stethoscope size={36} style={{ margin: '0 auto 0.75rem', display: 'block', opacity: 0.4 }} />
            No specialists found matching your search.
          </div>
        ) : (
          <div className="cc-roster-grid">
            {doctors.map((doc) => {
              const isToggling = togglingId === doc.id;
              return (
                <div key={doc.id} className="cc-doctor-card">
                  <div>
                    <div className="cc-doc-card-top">
                      <div className="cc-doc-avatar">
                        {doc.image ? (
                          <img src={doc.image} alt={doc.name} />
                        ) : (
                          <span>{doc.name.charAt(0)}</span>
                        )}
                      </div>
                      <div className="cc-doc-card-meta">
                        <div className="cc-doc-card-name">
                          <span>Dr. {doc.name}</span>
                          <span
                            className="cc-status-pill"
                            style={{
                              background: doc.is_active ? '#ecfdf5' : '#fef2f2',
                              color: doc.is_active ? '#065f46' : '#991b1b',
                              borderColor: doc.is_active ? '#a7f3d0' : '#fecaca',
                            }}
                          >
                            {doc.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                        <div className="cc-doc-card-spec">{doc.specialization}</div>
                        <div className="cc-doc-card-sub">
                          {doc.qualification} &middot; {doc.experience_years || 0} yrs experience
                        </div>
                      </div>
                    </div>

                    <div className="cc-doc-card-details">
                      <div className="cc-doc-card-row">
                        <IndianRupee size={14} color="#059669" />
                        <span style={{ fontWeight: 700, color: 'var(--cc-slate-900)' }}>
                          ₹{doc.consultation_fee || 0}
                        </span>
                        <span style={{ color: '#64748b', fontSize: '0.75rem' }}>per consultation</span>
                      </div>

                      {doc.contact_phone && (
                        <div className="cc-doc-card-row">
                          <Phone size={13} color="#64748b" />
                          <span>{doc.contact_phone}</span>
                        </div>
                      )}

                      {doc.clinic_address && (
                        <div className="cc-doc-card-row">
                          <MapPin size={13} color="#64748b" />
                          <span style={{ fontSize: '0.75rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {doc.clinic_address}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="cc-doc-card-actions">
                    <button
                      type="button"
                      onClick={() => handleToggleActive(doc)}
                      disabled={isToggling}
                      className={`cc-btn cc-btn-sm ${doc.is_active ? 'cc-btn-outline' : 'cc-btn-teal'}`}
                    >
                      {doc.is_active ? 'Deactivate' : 'Activate'}
                    </button>

                    <div style={{ display: 'flex', gap: '0.375rem' }}>
                      <button
                        type="button"
                        onClick={() => openEditModal(doc)}
                        className="cc-btn cc-btn-outline cc-btn-sm"
                        title="Edit Doctor Details"
                      >
                        <Edit2 size={13} />
                        <span>Edit</span>
                      </button>

                      <Link
                        to={`/doctors/${doc.id}`}
                        target="_blank"
                        className="cc-btn cc-btn-outline cc-btn-sm"
                        title="View Public Profile"
                      >
                        <ExternalLink size={13} />
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Doctor Edit Modal */}
      {editModal.open && editModal.doctor && (
        <div className="cc-modal-backdrop" onClick={() => setEditModal({ ...editModal, open: false })}>
          <div className="cc-modal-card" style={{ maxWidth: '600px' }} onClick={(e) => e.stopPropagation()}>
            <div className="cc-modal-header">
              <h3 className="cc-modal-title">
                <Edit2 size={18} color="var(--cc-primary)" />
                Edit Specialist Profile
              </h3>
              <button
                type="button"
                onClick={() => setEditModal({ ...editModal, open: false })}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveDoctor}>
              <div className="cc-modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
                <div className="cc-form-grid-2">
                  <div className="cc-form-group">
                    <label className="cc-form-label">Doctor Name</label>
                    <input
                      type="text"
                      required
                      value={editModal.formData.name}
                      onChange={(e) => setEditModal({ ...editModal, formData: { ...editModal.formData, name: e.target.value } })}
                      className="cc-filter-input"
                    />
                  </div>
                  <div className="cc-form-group">
                    <label className="cc-form-label">Specialization</label>
                    <input
                      type="text"
                      required
                      value={editModal.formData.specialization}
                      onChange={(e) => setEditModal({ ...editModal, formData: { ...editModal.formData, specialization: e.target.value } })}
                      className="cc-filter-input"
                    />
                  </div>
                </div>

                <div className="cc-form-grid-2">
                  <div className="cc-form-group">
                    <label className="cc-form-label">Qualification</label>
                    <input
                      type="text"
                      value={editModal.formData.qualification}
                      onChange={(e) => setEditModal({ ...editModal, formData: { ...editModal.formData, qualification: e.target.value } })}
                      className="cc-filter-input"
                    />
                  </div>
                  <div className="cc-form-group">
                    <label className="cc-form-label">Experience (Years)</label>
                    <input
                      type="number"
                      min="0"
                      value={editModal.formData.experience_years}
                      onChange={(e) => setEditModal({ ...editModal, formData: { ...editModal.formData, experience_years: parseInt(e.target.value, 10) || 0 } })}
                      className="cc-filter-input"
                    />
                  </div>
                </div>

                <div className="cc-form-grid-2">
                  <div className="cc-form-group">
                    <label className="cc-form-label">Consultation Fee (₹)</label>
                    <input
                      type="number"
                      min="0"
                      required
                      value={editModal.formData.consultation_fee}
                      onChange={(e) => setEditModal({ ...editModal, formData: { ...editModal.formData, consultation_fee: parseFloat(e.target.value) || 0 } })}
                      className="cc-filter-input"
                    />
                  </div>
                  <div className="cc-form-group">
                    <label className="cc-form-label">Contact Phone</label>
                    <input
                      type="text"
                      value={editModal.formData.contact_phone}
                      onChange={(e) => setEditModal({ ...editModal, formData: { ...editModal.formData, contact_phone: e.target.value } })}
                      className="cc-filter-input"
                    />
                  </div>
                </div>

                <div className="cc-form-group">
                  <label className="cc-form-label">Clinic / OPD Address</label>
                  <input
                    type="text"
                    value={editModal.formData.clinic_address}
                    onChange={(e) => setEditModal({ ...editModal, formData: { ...editModal.formData, clinic_address: e.target.value } })}
                    className="cc-filter-input"
                  />
                </div>

                <div className="cc-form-group">
                  <label className="cc-form-label">Bio / Profile Summary</label>
                  <textarea
                    rows={2}
                    value={editModal.formData.bio}
                    onChange={(e) => setEditModal({ ...editModal, formData: { ...editModal.formData, bio: e.target.value } })}
                    className="cc-filter-input"
                    style={{ height: 'auto', padding: '6px' }}
                  />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem' }}>
                  <input
                    type="checkbox"
                    id="doctor-active-chk"
                    checked={editModal.formData.is_active}
                    onChange={(e) => setEditModal({ ...editModal, formData: { ...editModal.formData, is_active: e.target.checked } })}
                    style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                  />
                  <label htmlFor="doctor-active-chk" style={{ fontSize: '0.8125rem', fontWeight: 600, cursor: 'pointer' }}>
                    Active and available for bookings
                  </label>
                </div>
              </div>

              <div className="cc-modal-footer">
                <button
                  type="button"
                  onClick={() => setEditModal({ ...editModal, open: false })}
                  className="cc-btn cc-btn-outline"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editModal.submitting}
                  className="cc-btn cc-btn-primary"
                >
                  {editModal.submitting ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
