import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import Alert from '../components/Alert';
import '../styles/AdminDashboard.css';
import {
  UploadCloud, Image, Check, X, ArrowLeft, Save,
  Sparkles, Stethoscope, AlertCircle, Building2,
  MapPin, Phone, Mail, ExternalLink, Compass, RefreshCw, Wand2, Shuffle, CheckCircle2
} from 'lucide-react';
import { DOCTOR_AVATAR_PRESETS, getDoctorAvatar, urlToFile, compressImage } from '../utils/doctorAvatars';

const WEEKDAYS = [
  { code: 'mon', label: 'Monday' },
  { code: 'tue', label: 'Tuesday' },
  { code: 'wed', label: 'Wednesday' },
  { code: 'thu', label: 'Thursday' },
  { code: 'fri', label: 'Friday' },
  { code: 'sat', label: 'Saturday' },
  { code: 'sun', label: 'Sunday' },
];

const STANDARD_SPECIALIZATIONS = [
  'Cardiology',
  'Dermatology',
  'Neurology',
  'Orthopedics',
  'Pediatrics',
  'Gynecology & Obstetrics',
  'Psychiatry',
  'Ophthalmology',
  'ENT (Ear, Nose & Throat)',
  'General Medicine',
  'Gastroenterology',
  'Oncology',
  'Pulmonology',
  'Endocrinology',
  'Nephrology & Urology',
];

const AdminDoctorFormPage = () => {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const toast = useToast();
  const { user } = useAuth();

  const [formData, setFormData] = useState({
    name: '',
    specialization: 'Cardiology',
    custom_specialization: '',
    qualification: '',
    experience_years: '5',
    fee: '500.00',
    hospital_name: user?.role === 'hospital' ? (user.hospital_name || '') : '',
    contact_number: '',
    contact_email: '',
    clinic_address: '',
    google_maps_url: '',
    bio: '',
    is_active: true,
    available_days: 'mon,tue,wed,thu,fri',
  });
  const [hospitals, setHospitals] = useState([]);
  const [selectedHospitalId, setSelectedHospitalId] = useState('');
  const [isCustomHospital, setIsCustomHospital] = useState(false);
  const [isCustomSpec, setIsCustomSpec] = useState(false);
  const [selectedDays, setSelectedDays] = useState(['mon', 'tue', 'wed', 'thu', 'fri']);
  const [imageFile, setImageFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [existingImageUrl, setExistingImageUrl] = useState('');
  const [avatarMode, setAvatarMode] = useState('presets'); // 'presets' | 'upload'
  const [selectedPresetId, setSelectedPresetId] = useState(null);
  const [presetGenderFilter, setPresetGenderFilter] = useState('all'); // 'all' | 'Male' | 'Female'
  const [avatarLoading, setAvatarLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(isEdit);
  const [alertInfo, setAlertInfo] = useState({ type: '', message: '' });

  // Fetch dynamic hospitals list
  useEffect(() => {
    const fetchHospitals = async () => {
      try {
        const res = await api.get('/doctors/hospitals/');
        const hospList = res.data || [];
        setHospitals(hospList);

        if (!isEdit && user?.role === 'hospital' && user.hospital_name) {
          const matched = hospList.find((h) => h.name.toLowerCase() === user.hospital_name.toLowerCase());
          if (matched) {
            setSelectedHospitalId(String(matched.id));
            setFormData((prev) => ({
              ...prev,
              hospital_name: matched.name,
              clinic_address: matched.address || prev.clinic_address,
              contact_number: matched.contact_phone || prev.contact_number,
              contact_email: matched.contact_email || prev.contact_email,
              google_maps_url: matched.google_maps_url || prev.google_maps_url,
            }));
          }
        }
      } catch (err) {
        console.error('Error loading hospitals:', err);
      }
    };
    fetchHospitals();
  }, [isEdit, user]);

  useEffect(() => {
    if (isEdit) {
      const fetchDoctor = async () => {
        try {
          const res = await api.get(`/doctors/admin/${id}/`);
          const doc = res.data;
          const isStandard = STANDARD_SPECIALIZATIONS.includes(doc.specialization);

          setFormData({
            name: doc.name || '',
            specialization: isStandard ? doc.specialization : 'custom',
            custom_specialization: isStandard ? '' : (doc.specialization || ''),
            qualification: doc.qualification || '',
            experience_years: doc.experience_years?.toString() || '0',
            fee: doc.fee?.toString() || '0',
            hospital_name: doc.hospital_name || '',
            contact_number: doc.contact_number || '',
            contact_email: doc.contact_email || '',
            clinic_address: doc.clinic_address || '',
            google_maps_url: doc.google_maps_url || '',
            bio: doc.bio || '',
            is_active: doc.is_active ?? true,
            available_days: doc.available_days || '',
          });
          setIsCustomSpec(!isStandard);

          if (doc.available_days) {
            setSelectedDays(doc.available_days.split(',').map((d) => d.trim()));
          }
          if (doc.image) {
            setPreviewUrl(doc.image);
            setExistingImageUrl(doc.image);
          }
        } catch (err) {
          setAlertInfo({ type: 'error', message: 'Failed to load doctor profile details.' });
        } finally {
          setInitialLoading(false);
        }
      };
      fetchDoctor();
    }
  }, [id, isEdit]);

  const handleHospitalSelect = (e) => {
    const val = e.target.value;
    setSelectedHospitalId(val);

    if (val === 'custom') {
      setIsCustomHospital(true);
    } else if (val === '') {
      setIsCustomHospital(false);
    } else {
      setIsCustomHospital(false);
      const matched = hospitals.find((h) => String(h.id) === val || h.name === val);
      if (matched) {
        setFormData((prev) => ({
          ...prev,
          hospital_name: matched.name,
          clinic_address: matched.address || prev.clinic_address,
          contact_number: matched.contact_phone || prev.contact_number,
          contact_email: matched.contact_email || prev.contact_email,
          google_maps_url: matched.google_maps_url || prev.google_maps_url,
        }));
      }
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (name === 'specialization') {
      if (value === 'custom') {
        setIsCustomSpec(true);
        setFormData((prev) => ({ ...prev, specialization: 'custom' }));
      } else {
        setIsCustomSpec(false);
        setFormData((prev) => ({ ...prev, specialization: value, custom_specialization: '' }));
      }
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : value,
      }));
    }
  };

  const handleDayToggle = (code) => {
    let updated;
    if (selectedDays.includes(code)) {
      updated = selectedDays.filter((d) => d !== code);
    } else {
      updated = [...selectedDays, code];
    }
    setSelectedDays(updated);
    setFormData((prev) => ({ ...prev, available_days: updated.join(',') }));
  };

  const handleSelectAllDays = () => {
    const all = WEEKDAYS.map((d) => d.code);
    setSelectedDays(all);
    setFormData((prev) => ({ ...prev, available_days: all.join(',') }));
  };

  const handleSelectWeekdaysOnly = () => {
    const weekdays = ['mon', 'tue', 'wed', 'thu', 'fri'];
    setSelectedDays(weekdays);
    setFormData((prev) => ({ ...prev, available_days: weekdays.join(',') }));
  };

  const handleSelectWeekendsOnly = () => {
    const weekends = ['sat', 'sun'];
    setSelectedDays(weekends);
    setFormData((prev) => ({ ...prev, available_days: weekends.join(',') }));
  };

  const handleImageChange = async (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        setAlertInfo({ type: 'error', message: 'Image size exceeds 10MB limit. Please choose a smaller photo.' });
        return;
      }
      setSelectedPresetId(null);
      setPreviewUrl(URL.createObjectURL(file));
      setAlertInfo({ type: '', message: '' });
      try {
        const compressed = await compressImage(file);
        setImageFile(compressed);
      } catch (err) {
        setImageFile(file);
      }
    }
  };

  const handleSelectPreset = (preset) => {
    setSelectedPresetId(preset.id);
    setPreviewUrl(preset.url);
    setImageFile(null); // Fast direct URL saving without client download delay
    setAvatarLoading(false);
    setAlertInfo({ type: '', message: '' });
  };

  const handleGenerateCustomAvatar = async (seed, style) => {
    const finalSeed = (seed || formData.name || 'SpecialistDoctor').trim();
    const bg = style === 'lorelei' ? 'ffd5dc,c0aede,ffdfbf' : 'b6e3f4,d1d4f9,c0aede';
    const url = `https://api.dicebear.com/7.x/${style || 'adventurer'}/svg?seed=${encodeURIComponent(finalSeed)}&backgroundColor=${bg}`;
    setSelectedPresetId(null);
    setPreviewUrl(url);
    setAvatarLoading(true);
    setAlertInfo({ type: '', message: '' });
    try {
      const file = await urlToFile(url, `avatar_${finalSeed.replace(/\s+/g, '_')}.svg`);
      if (file) {
        setImageFile(file);
      }
    } catch (err) {
      console.error('Failed generating avatar file:', err);
    } finally {
      setAvatarLoading(false);
    }
  };

  const handleRandomizeAvatar = () => {
    const prefixes = ['DrApex', 'DrNova', 'DrPulse', 'DrAtlas', 'DrZenith', 'DrAura', 'DrHorizon', 'DrPrime', 'DrVanguard', 'DrCare'];
    const randomSeed = prefixes[Math.floor(Math.random() * prefixes.length)] + Math.floor(Math.random() * 900 + 100);
    setCustomGenSeed(randomSeed);
    handleGenerateCustomAvatar(randomSeed, customGenStyle);
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    setSelectedPresetId(null);
    if (existingImageUrl) {
      setPreviewUrl(existingImageUrl);
    } else {
      const defaultUrl = getDoctorAvatar({ name: formData.name || 'Doctor' });
      setPreviewUrl(defaultUrl);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setAlertInfo({ type: '', message: '' });

    const finalSpecialization = isCustomSpec
      ? formData.custom_specialization.trim()
      : formData.specialization;

    if (!finalSpecialization) {
      setAlertInfo({ type: 'error', message: 'Please provide a valid medical specialization.' });
      setLoading(false);
      return;
    }

    if (selectedDays.length === 0) {
      setAlertInfo({ type: 'error', message: 'Please select at least one available working day.' });
      setLoading(false);
      return;
    }

    const payload = new FormData();
    payload.append('name', formData.name.trim());
    payload.append('specialization', finalSpecialization);
    payload.append('qualification', formData.qualification.trim());
    payload.append('experience_years', formData.experience_years ? parseInt(formData.experience_years, 10) : 0);
    payload.append('fee', formData.fee ? parseFloat(formData.fee).toFixed(2) : '500.00');
    payload.append('hospital_name', formData.hospital_name.trim());
    if (selectedHospitalId && selectedHospitalId !== 'custom' && selectedHospitalId !== '') {
      payload.append('hospital', selectedHospitalId);
    }
    payload.append('contact_number', formData.contact_number.trim());
    payload.append('contact_email', formData.contact_email.trim());
    payload.append('clinic_address', formData.clinic_address.trim());
    payload.append('google_maps_url', formData.google_maps_url.trim());
    payload.append('is_active', formData.is_active);
    payload.append('available_days', selectedDays.join(','));
    if (imageFile) {
      payload.append('image', imageFile);
    } else if (previewUrl && previewUrl !== existingImageUrl) {
      payload.append('image', previewUrl);
    }

    const returnDashboard = user?.role === 'hospital' ? '/hospital/dashboard' : '/admin/dashboard';
    const returnDashboardLabel = user?.role === 'hospital' ? 'Back to Hospital Dashboard' : 'Back to Admin Dashboard';

    try {
      if (isEdit) {
        await api.patch(`/doctors/admin/${id}/`, payload, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        navigate(returnDashboard, {
          state: { alert: { type: 'success', message: `Dr. ${formData.name}'s profile & image updated successfully!` } }
        });
      } else {
        await api.post('/doctors/admin/', payload, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        navigate(returnDashboard, {
          state: { alert: { type: 'success', message: `Dr. ${formData.name} has been added to the active database successfully!` } }
        });
      }
    } catch (err) {
      let errMsg = 'Failed to save doctor details. Please try again.';
      if (err.response?.data) {
        if (typeof err.response.data === 'string') {
          errMsg = err.response.data;
        } else if (typeof err.response.data === 'object') {
          const firstKey = Object.keys(err.response.data)[0];
          const firstVal = err.response.data[firstKey];
          if (Array.isArray(firstVal)) {
            errMsg = `${firstKey.replace(/_/g, ' ')}: ${firstVal[0]}`;
          } else if (typeof firstVal === 'string') {
            errMsg = firstVal;
          } else {
            errMsg = JSON.stringify(err.response.data);
          }
        }
      }
      setAlertInfo({ type: 'error', message: errMsg });
    } finally {
      setLoading(false);
    }
  };


  const returnDashboard = user?.role === 'hospital' ? '/hospital/dashboard' : '/admin/dashboard';
  const returnDashboardLabel = user?.role === 'hospital' ? 'Back to Hospital Dashboard' : 'Back to Admin Dashboard';

  if (initialLoading) {
    return (
      <div className="admin-container" style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div className="spinner" style={{ margin: '0 auto 1rem', width: '40px', height: '40px', border: '3px solid #e2e8f0', borderTopColor: 'var(--color-primary)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }}></div>
          <p style={{ color: 'var(--color-ink-soft)', fontSize: '0.9rem' }}>Loading doctor details...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container" style={{ paddingTop: '2.5rem', paddingBottom: '5rem' }}>
      <div style={{ marginBottom: '2rem', maxWidth: '880px' }}>
        <Link
          to={returnDashboard}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            color: 'var(--color-primary-dark)',
            background: 'var(--color-primary-light)',
            padding: '6px 14px',
            borderRadius: '20px',
            fontSize: '0.82rem',
            fontWeight: 700,
            marginBottom: '1rem',
            textDecoration: 'none',
            border: '1px solid rgba(16, 185, 129, 0.25)',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            transition: 'all 0.2s ease',
          }}
        >
          <ArrowLeft size={14} /> {returnDashboardLabel}
        </Link>
        <h1 style={{ fontSize: '1.9rem', fontWeight: 800, color: 'var(--color-navy)', margin: '0 0 0.4rem', letterSpacing: '-0.02em' }}>
          {isEdit ? `Edit Profile: Dr. ${formData.name}` : 'Add New Specialist Doctor'}
        </h1>
        <p style={{ color: 'var(--color-ink-soft)', fontSize: '0.92rem', margin: 0, lineHeight: 1.5 }}>
          Configure medical credentials, contact details, clinic location & Google Maps link, weekly slots, and Cloudinary photos.
        </p>
      </div>

      {alertInfo.message && (
        <div style={{ marginBottom: '1.5rem', maxWidth: '880px' }}>
          <Alert type={alertInfo.type} message={alertInfo.message} onClose={() => setAlertInfo({ type: '', message: '' })} />
        </div>
      )}

      <form onSubmit={handleSubmit} className="card" style={{ padding: '2.5rem', maxWidth: '880px', borderRadius: '18px', border: '1px solid var(--color-line)', boxShadow: 'var(--shadow-md)' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>

          {/* DOCTOR PROFESSIONAL PHOTO STUDIO */}
          <div style={{ padding: '1.5rem', background: '#f8fafc', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
              <div>
                <label style={{ fontWeight: 800, color: 'var(--color-navy)', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1rem', margin: 0 }}>
                  <Stethoscope size={18} style={{ color: '#0284c7' }} /> Doctor Profile Photo & Clinical Portrait Studio
                </label>
                <p style={{ fontSize: '0.8rem', color: 'var(--color-ink-soft)', margin: '0.2rem 0 0' }}>
                  Select a verified high-resolution professional doctor portrait or upload a custom medical photograph.
                </p>
              </div>

              {/* Mode Switcher Tabs */}
              <div style={{ display: 'flex', background: '#e2e8f0', padding: '3px', borderRadius: '10px', gap: '2px' }}>
                <button
                  type="button"
                  onClick={() => setAvatarMode('presets')}
                  style={{
                    border: 'none',
                    padding: '0.4rem 0.85rem',
                    borderRadius: '8px',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    background: avatarMode === 'presets' ? '#fff' : 'transparent',
                    color: avatarMode === 'presets' ? '#0284c7' : '#64748b',
                    boxShadow: avatarMode === 'presets' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                  }}
                >
                  <Stethoscope size={14} /> Professional Presets (12)
                </button>
                <button
                  type="button"
                  onClick={() => setAvatarMode('upload')}
                  style={{
                    border: 'none',
                    padding: '0.4rem 0.85rem',
                    borderRadius: '8px',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    background: avatarMode === 'upload' ? '#fff' : 'transparent',
                    color: avatarMode === 'upload' ? '#059669' : '#64748b',
                    boxShadow: avatarMode === 'upload' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                  }}
                >
                  <UploadCloud size={14} /> Upload Custom Photo
                </button>
              </div>
            </div>

            {/* Top Preview Bar */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', background: '#fff', padding: '1rem', borderRadius: '12px', border: '1px solid #cbd5e1', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
              <div style={{ position: 'relative', width: '84px', height: '84px', borderRadius: '50%', padding: '3px', background: 'linear-gradient(135deg, #0284c7 0%, #059669 100%)', boxShadow: '0 4px 14px rgba(2, 132, 199, 0.25)', flexShrink: 0 }}>
                <img
                  src={previewUrl || getDoctorAvatar({ name: formData.name || 'Doctor' })}
                  alt="Doctor Portrait"
                  style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover', background: '#fff' }}
                />
                {avatarLoading && (
                  <div style={{ position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.75)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <RefreshCw size={20} className="animate-spin" style={{ color: '#0284c7' }} />
                  </div>
                )}
              </div>

              <div style={{ flex: 1, minWidth: '220px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.25rem' }}>
                  <span style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--color-navy)' }}>
                    Active Doctor Profile Photo
                  </span>
                  {selectedPresetId ? (
                    <span style={{ fontSize: '0.72rem', background: '#e0f2fe', color: '#0369a1', padding: '2px 8px', borderRadius: '10px', fontWeight: 700 }}>
                      ✓ Professional Preset Selected
                    </span>
                  ) : imageFile ? (
                    <span style={{ fontSize: '0.72rem', background: '#dcfce7', color: '#15803d', padding: '2px 8px', borderRadius: '10px', fontWeight: 700 }}>
                      📁 Custom Photo Attached ({(imageFile.size / 1024).toFixed(1)} KB)
                    </span>
                  ) : (
                    <span style={{ fontSize: '0.72rem', background: '#f1f5f9', color: '#64748b', padding: '2px 8px', borderRadius: '10px', fontWeight: 700 }}>
                      ⚡ Specialty Default Portrait
                    </span>
                  )}
                </div>
                <p style={{ fontSize: '0.78rem', color: 'var(--color-ink-soft)', margin: '0 0 0.5rem' }}>
                  Shown to patients across doctor discovery cards, booking flows, and digital receipts.
                </p>
                {(imageFile || previewUrl !== existingImageUrl) && (
                  <button
                    type="button"
                    onClick={handleRemoveImage}
                    className="btn btn-ghost btn-sm"
                    style={{ fontSize: '0.75rem', padding: '2px 8px', color: '#dc2626', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                  >
                    <X size={13} /> Reset / Alter Photo
                  </button>
                )}
              </div>
            </div>

            {/* TAB 1: 12 PROFESSIONAL PORTRAITS GALLERY */}
            {avatarMode === 'presets' && (
              <div>
                {/* Gender Filter Pills */}
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-navy)', textTransform: 'uppercase' }}>Filter:</span>
                  {[
                    { id: 'all', label: 'All Specialists (12)' },
                    { id: 'Male', label: '👨‍⚕️ Male Doctors (6)' },
                    { id: 'Female', label: '👩‍⚕️ Female Doctors (6)' },
                  ].map((g) => (
                    <button
                      key={g.id}
                      type="button"
                      onClick={() => setPresetGenderFilter(g.id)}
                      style={{
                        border: presetGenderFilter === g.id ? '1px solid #0284c7' : '1px solid #cbd5e1',
                        background: presetGenderFilter === g.id ? '#e0f2fe' : '#fff',
                        color: presetGenderFilter === g.id ? '#0369a1' : 'var(--color-navy)',
                        padding: '0.25rem 0.65rem',
                        borderRadius: '20px',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      {g.label}
                    </button>
                  ))}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(135px, 1fr))', gap: '0.75rem' }}>
                  {DOCTOR_AVATAR_PRESETS.filter((p) => presetGenderFilter === 'all' || p.gender === presetGenderFilter).map((preset) => {
                    const isSelected = selectedPresetId === preset.id || previewUrl === preset.url;
                    return (
                      <div
                        key={preset.id}
                        onClick={() => handleSelectPreset(preset)}
                        style={{
                          background: isSelected ? '#eff6ff' : '#fff',
                          border: isSelected ? '2px solid #0284c7' : '1px solid #e2e8f0',
                          borderRadius: '12px',
                          padding: '0.75rem 0.5rem',
                          textAlign: 'center',
                          cursor: 'pointer',
                          position: 'relative',
                          transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                          boxShadow: isSelected ? '0 4px 12px rgba(2, 132, 199, 0.18)' : '0 1px 3px rgba(0,0,0,0.04)',
                          transform: isSelected ? 'translateY(-2px)' : 'none',
                        }}
                      >
                        {isSelected && (
                          <div style={{ position: 'absolute', top: '6px', right: '6px', background: '#0284c7', color: '#fff', borderRadius: '50%', width: '18px', height: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Check size={11} strokeWidth={3} />
                          </div>
                        )}
                        <div style={{ width: '60px', height: '60px', margin: '0 auto 0.5rem', borderRadius: '50%', overflow: 'hidden', background: '#f8fafc', border: '2px solid #cbd5e1' }}>
                          <img src={preset.url} alt={preset.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        </div>
                        <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--color-navy)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {preset.name}
                        </div>
                        <div style={{ fontSize: '0.7rem', color: '#0284c7', fontWeight: 600, marginTop: '2px' }}>
                          {preset.category}
                        </div>
                        <div style={{ fontSize: '0.65rem', color: '#64748b', marginTop: '1px' }}>
                          {preset.experience}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* TAB 2: CUSTOM PHOTO UPLOAD */}
            {avatarMode === 'upload' && (
              <div style={{ background: '#fff', padding: '1.75rem 1.25rem', borderRadius: '12px', border: '1.5px dashed #cbd5e1', textAlign: 'center' }}>
                <div style={{ width: '54px', height: '54px', borderRadius: '50%', background: '#e0f2fe', color: '#0284c7', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 0.75rem' }}>
                  <UploadCloud size={26} />
                </div>
                <h4 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--color-navy)', margin: '0 0 0.25rem' }}>
                  Upload Custom Doctor Portrait
                </h4>
                <p style={{ fontSize: '0.8rem', color: 'var(--color-ink-soft)', margin: '0 0 1.25rem', maxWidth: '400px', marginInline: 'auto' }}>
                  Upload high-resolution clinic photos in JPG, PNG, or WEBP format (up to 10MB). Hosted and encrypted via CDN.
                </p>

                <div style={{ display: 'flex', justifyContent: 'center', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
                  <label className="btn btn-primary btn-sm" style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.55rem 1.25rem' }}>
                    <UploadCloud size={16} /> Choose Photo File
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={handleImageChange}
                      style={{ display: 'none' }}
                    />
                  </label>
                  {imageFile && (
                    <button
                      type="button"
                      onClick={handleRemoveImage}
                      className="btn btn-ghost btn-sm"
                      style={{ color: '#dc2626', fontSize: '0.8rem' }}
                    >
                      <X size={14} /> Clear Selection
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
            {/* Doctor Name */}
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ fontWeight: 600, color: 'var(--color-navy)', display: 'block', marginBottom: '0.35rem' }}>
                Doctor Full Name *
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="e.g. Dr. Rajesh Sharma"
                required
                style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid var(--color-line)', fontSize: '0.92rem' }}
              />
            </div>

            {/* Specialization Selection */}
            <div>
              <label style={{ fontWeight: 600, color: 'var(--color-navy)', display: 'block', marginBottom: '0.35rem' }}>
                Specialization *
              </label>
              <select
                name="specialization"
                value={isCustomSpec ? 'custom' : formData.specialization}
                onChange={handleChange}
                style={{ width: '100%', height: '42px', padding: '0 0.85rem', borderRadius: '8px', border: '1px solid var(--color-line)', fontSize: '0.92rem', background: '#fff' }}
              >
                {STANDARD_SPECIALIZATIONS.map((spec) => (
                  <option key={spec} value={spec}>{spec}</option>
                ))}
                <option value="custom">+ Other / Custom Specialization</option>
              </select>
            </div>

            {/* Custom Specialization Input if selected */}
            {isCustomSpec ? (
              <div>
                <label style={{ fontWeight: 600, color: 'var(--color-navy)', display: 'block', marginBottom: '0.35rem' }}>
                  Custom Specialization Title *
                </label>
                <input
                  type="text"
                  name="custom_specialization"
                  value={formData.custom_specialization}
                  onChange={handleChange}
                  placeholder="e.g. Pediatric Cardiology, Sports Rehab"
                  required={isCustomSpec}
                  style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid var(--color-line)', fontSize: '0.92rem' }}
                />
              </div>
            ) : (
              <div>
                <label style={{ fontWeight: 600, color: 'var(--color-navy)', display: 'block', marginBottom: '0.35rem' }}>
                  Medical Qualification *
                </label>
                <input
                  type="text"
                  name="qualification"
                  value={formData.qualification}
                  onChange={handleChange}
                  placeholder="e.g. MBBS, MD, DM, FRCS"
                  required
                  style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid var(--color-line)', fontSize: '0.92rem' }}
                />
              </div>
            )}

            {isCustomSpec && (
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ fontWeight: 600, color: 'var(--color-navy)', display: 'block', marginBottom: '0.35rem' }}>
                  Medical Qualification *
                </label>
                <input
                  type="text"
                  name="qualification"
                  value={formData.qualification}
                  onChange={handleChange}
                  placeholder="e.g. MBBS, MD, DM, FRCS"
                  required
                  style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid var(--color-line)', fontSize: '0.92rem' }}
                />
              </div>
            )}

            {/* Experience */}
            <div>
              <label style={{ fontWeight: 600, color: 'var(--color-navy)', display: 'block', marginBottom: '0.35rem' }}>
                Experience (Years) *
              </label>
              <input
                type="number"
                name="experience_years"
                value={formData.experience_years}
                onChange={handleChange}
                min="0"
                max="60"
                required
                style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid var(--color-line)', fontSize: '0.92rem' }}
              />
            </div>

            {/* Consultation Fee */}
            <div>
              <label style={{ fontWeight: 600, color: 'var(--color-navy)', display: 'block', marginBottom: '0.35rem' }}>
                Consultation Fee (₹) *
              </label>
              <input
                type="number"
                step="0.01"
                name="fee"
                value={formData.fee}
                onChange={handleChange}
                min="0"
                required
                style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid var(--color-line)', fontSize: '0.92rem' }}
              />
            </div>

            {/* Dynamic Hospital Facility Selector */}
            <div style={{ gridColumn: '1 / -1' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                <label style={{ fontWeight: 600, color: 'var(--color-navy)' }}>
                  🏥 Associated Hospital / Medical Facility
                </label>
                <span style={{ fontSize: '0.75rem', color: 'var(--color-primary)', fontWeight: 600 }}>
                  Selecting a hospital auto-fills contact & address details
                </span>
              </div>

              <select
                value={isCustomHospital ? 'custom' : (hospitals.find((h) => h.name === formData.hospital_name)?.id || (formData.hospital_name ? formData.hospital_name : ''))}
                onChange={handleHospitalSelect}
                style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid var(--color-line)', fontSize: '0.92rem', background: '#fff', marginBottom: (isCustomHospital || !formData.hospital_name) ? '0.75rem' : '0' }}
              >
                <option value="">-- Select Registered Hospital Facility --</option>
                {hospitals.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.name} {h.city ? `(${h.city})` : ''}
                  </option>
                ))}
                <option value="custom">➕ Enter Custom Hospital / Clinic Name</option>
              </select>

              {(isCustomHospital || (!hospitals.some((h) => h.name === formData.hospital_name) && formData.hospital_name)) && (
                <input
                  type="text"
                  name="hospital_name"
                  value={formData.hospital_name}
                  onChange={handleChange}
                  placeholder="Type custom hospital or clinic name..."
                  style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid var(--color-line)', fontSize: '0.92rem' }}
                />
              )}
            </div>

            {/* Contact & Location Section */}
            <div style={{ gridColumn: '1 / -1', padding: '1.25rem', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <MapPin size={18} style={{ color: '#0284c7' }} />
                <h4 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 700, color: 'var(--color-navy)' }}>
                  Location & Patient Contact Details
                </h4>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                {/* Contact Phone */}
                <div>
                  <label style={{ fontWeight: 600, color: 'var(--color-navy)', display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.35rem', fontSize: '0.85rem' }}>
                    <Phone size={14} style={{ color: '#059669' }} /> Contact Phone / Helpline
                  </label>
                  <input
                    type="text"
                    name="contact_number"
                    value={formData.contact_number}
                    onChange={handleChange}
                    placeholder="e.g. +91 98765 43210 or 080-2345678"
                    style={{ width: '100%', padding: '0.6rem 0.85rem', borderRadius: '8px', border: '1px solid var(--color-line)', fontSize: '0.9rem', background: '#fff' }}
                  />
                </div>

                {/* Contact Email */}
                <div>
                  <label style={{ fontWeight: 600, color: 'var(--color-navy)', display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.35rem', fontSize: '0.85rem' }}>
                    <Mail size={14} style={{ color: '#2563eb' }} /> Doctor / Clinic Email
                  </label>
                  <input
                    type="email"
                    name="contact_email"
                    value={formData.contact_email}
                    onChange={handleChange}
                    placeholder="e.g. appointments@drsharma.com"
                    style={{ width: '100%', padding: '0.6rem 0.85rem', borderRadius: '8px', border: '1px solid var(--color-line)', fontSize: '0.9rem', background: '#fff' }}
                  />
                </div>

                {/* Clinic / Chamber Physical Address */}
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{ fontWeight: 600, color: 'var(--color-navy)', display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.35rem', fontSize: '0.85rem' }}>
                    <Building2 size={14} style={{ color: '#7c3aed' }} /> Physical Clinic / Chamber Address
                  </label>
                  <input
                    type="text"
                    name="clinic_address"
                    value={formData.clinic_address}
                    onChange={handleChange}
                    placeholder="e.g. Suite 402, 4th Floor, MediPlaza, 15th Main Road, Indiranagar, Bengaluru"
                    style={{ width: '100%', padding: '0.6rem 0.85rem', borderRadius: '8px', border: '1px solid var(--color-line)', fontSize: '0.9rem', background: '#fff' }}
                  />
                </div>

                {/* Google Maps URL */}
                <div style={{ gridColumn: '1 / -1' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                    <label style={{ fontWeight: 600, color: 'var(--color-navy)', display: 'flex', alignItems: 'center', gap: '0.35rem', margin: 0, fontSize: '0.85rem' }}>
                      <Compass size={14} style={{ color: '#ea4335' }} /> Custom Google Maps URL (Optional)
                    </label>
                    {formData.google_maps_url && (
                      <a
                        href={formData.google_maps_url}
                        target="_blank"
                        rel="noreferrer"
                        style={{ fontSize: '0.78rem', color: '#2563eb', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '3px', fontWeight: 600 }}
                      >
                        Test Map Link <ExternalLink size={12} />
                      </a>
                    )}
                  </div>
                  <input
                    type="url"
                    name="google_maps_url"
                    value={formData.google_maps_url}
                    onChange={handleChange}
                    placeholder="https://maps.google.com/?q=... (Leave blank to auto-generate from address & hospital)"
                    style={{ width: '100%', padding: '0.6rem 0.85rem', borderRadius: '8px', border: '1px solid var(--color-line)', fontSize: '0.9rem', background: '#fff' }}
                  />
                  <p style={{ fontSize: '0.75rem', color: 'var(--color-ink-soft)', margin: '0.35rem 0 0' }}>
                    💡 If empty, MediConnect automatically creates a one-click Google Maps location query from the hospital name and address.
                  </p>
                </div>
              </div>
            </div>

            {/* Available Days Checkboxes with quick presets */}
            <div style={{ gridColumn: '1 / -1', padding: '1.25rem', background: 'var(--color-bg-alt)', borderRadius: '12px', border: '1px solid var(--color-line)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                <label style={{ fontWeight: 700, color: 'var(--color-navy)', margin: 0, fontSize: '0.95rem' }}>
                  Weekly Availability Schedule *
                </label>
                <div style={{ display: 'flex', gap: '0.4rem' }}>
                  <button type="button" onClick={handleSelectWeekdaysOnly} className="btn btn-outline btn-sm" style={{ fontSize: '0.72rem', padding: '2px 8px', background: '#fff' }}>
                    Weekdays (Mon-Fri)
                  </button>
                  <button type="button" onClick={handleSelectWeekendsOnly} className="btn btn-outline btn-sm" style={{ fontSize: '0.72rem', padding: '2px 8px', background: '#fff' }}>
                    Weekends (Sat-Sun)
                  </button>
                  <button type="button" onClick={handleSelectAllDays} className="btn btn-outline btn-sm" style={{ fontSize: '0.72rem', padding: '2px 8px', background: '#fff' }}>
                    All 7 Days
                  </button>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: '0.65rem' }}>
                {WEEKDAYS.map((day) => {
                  const isChecked = selectedDays.includes(day.code);
                  return (
                    <label
                      key={day.code}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                        fontSize: '0.88rem',
                        cursor: 'pointer',
                        padding: '0.4rem 0.6rem',
                        background: isChecked ? 'var(--color-primary-subtle)' : '#fff',
                        border: `1px solid ${isChecked ? 'var(--color-primary)' : 'var(--color-line)'}`,
                        borderRadius: '8px',
                        fontWeight: isChecked ? 600 : 500,
                        color: isChecked ? 'var(--color-primary-dark)' : 'var(--color-navy)',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => handleDayToggle(day.code)}
                        style={{ width: '15px', height: '15px', accentColor: 'var(--color-primary)' }}
                      />
                      {day.label.slice(0, 3)}
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Bio / Summary */}
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ fontWeight: 600, color: 'var(--color-navy)', display: 'block', marginBottom: '0.35rem' }}>
                Doctor Bio / Professional Overview
              </label>
              <textarea
                name="bio"
                rows="3"
                value={formData.bio}
                onChange={handleChange}
                placeholder="Describe clinical experience, specializations, treatment methodologies, and patient care philosophy..."
                style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid var(--color-line)', fontFamily: 'inherit', fontSize: '0.92rem' }}
              ></textarea>
            </div>

            {/* Active Status Checkbox */}
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, color: 'var(--color-navy)', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  name="is_active"
                  checked={formData.is_active}
                  onChange={handleChange}
                  style={{ width: '17px', height: '17px', accentColor: 'var(--color-primary)' }}
                />
                Active Profile (Accepting Online Patient Appointments)
              </label>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '1rem', marginTop: '2.5rem', paddingTop: '1.25rem', borderTop: '1px solid var(--color-line)' }}>
            <button
              type="submit"
              className="btn btn-primary"
              style={{ flex: 1, height: '44px', fontSize: '0.95rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
              disabled={loading}
            >
              <Save size={18} /> {loading ? 'Saving Profile & Uploading to Cloudinary...' : (isEdit ? 'Save Changes' : 'Create Doctor')}
            </button>
            <Link
              to="/admin/dashboard"
              className="btn btn-outline"
              style={{ flex: 0.5, height: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              Cancel
            </Link>
          </div>
        </div>
      </form>
    </div>
  );
};

export default AdminDoctorFormPage;
