import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api from '../api/client';
import { useToast } from '../context/ToastContext';
import SkeletonDoctorCard from '../components/SkeletonDoctorCard';
import '../styles/HomePage.css';
import {
  Search, Grid, HeartPulse, Brain, Bone, Smile, Baby, Sparkles,
  Ear, Stethoscope, Star, CheckCircle, Clock, ShieldCheck, Building2,
  BriefcaseMedical, CalendarCheck, ChevronDown, Phone, Ambulance,
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, MapPin, Navigation
} from 'lucide-react';
import { getDoctorAvatar } from '../utils/doctorAvatars';

const SPEC_ICONS = {
  Cardio: HeartPulse,
  Neuro: Brain,
  Ortho: Bone,
  Dent: Smile,
  Gyne: Baby,
  Derma: Sparkles,
  Pedia: Baby,
  ENT: Ear,
};

const getSpecIcon = (spec) => {
  for (const [key, IconComp] of Object.entries(SPEC_ICONS)) {
    if (spec?.toLowerCase().includes(key.toLowerCase())) {
      return IconComp;
    }
  }
  return Stethoscope;
};

const FEATURED_DEPARTMENTS = [
  {
    id: 'Cardiology',
    name: 'Cardiology',
    subtitle: 'Heart Care & Prevention',
    badgeClass: 'dept-card-cardio',
    icon: HeartPulse,
    bgImage: 'https://images.unsplash.com/photo-1628348068343-c6a848d2b6dd?w=600&auto=format&fit=crop&q=80',
    doctorsCount: '12 Specialists',
  },
  {
    id: 'Pediatrics',
    name: 'Pediatrics',
    subtitle: 'Child Health & Wellness',
    badgeClass: 'dept-card-pedia',
    icon: Baby,
    bgImage: 'https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?w=600&auto=format&fit=crop&q=80',
    doctorsCount: '8 Specialists',
  },
  {
    id: 'Orthopedics',
    name: 'Orthopedics',
    subtitle: 'Joints, Spine & Rehab',
    badgeClass: 'dept-card-ortho',
    icon: Bone,
    bgImage: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=600&auto=format&fit=crop&q=80',
    doctorsCount: '10 Specialists',
  },
  {
    id: 'Dermatology',
    name: 'Dermatology',
    subtitle: 'Skin Health & Aesthetics',
    badgeClass: 'dept-card-derma',
    icon: Sparkles,
    bgImage: 'https://images.unsplash.com/photo-1556760544-74068565f05c?w=600&auto=format&fit=crop&q=80',
    doctorsCount: '6 Specialists',
  },
  {
    id: 'Neurology',
    name: 'Neurology',
    subtitle: 'Brain & Nervous System',
    badgeClass: 'dept-card-neuro',
    icon: Brain,
    bgImage: 'https://images.unsplash.com/photo-1559757175-5700dde675bc?w=600&auto=format&fit=crop&q=80',
    doctorsCount: '7 Specialists',
  },
  {
    id: 'General Medicine',
    name: 'General Medicine',
    subtitle: 'Primary Care & Diagnostics',
    badgeClass: 'dept-card-gen',
    icon: Stethoscope,
    bgImage: 'https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?w=600&auto=format&fit=crop&q=80',
    doctorsCount: '15 Specialists',
  },
];

const DEFAULT_SPECIALTIES = [
  'Cardiology',
  'Pediatrics',
  'Orthopedics',
  'Dermatology',
  'Neurology',
  'General Medicine',
];

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

const HomePage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const toast = useToast();
  const [doctors, setDoctors] = useState([]);
  const [specializations, setSpecializations] = useState([]);
  const [pagination, setPagination] = useState({ count: 0, num_pages: 1, current_page: 1, has_next: false, has_previous: false });
  const [pageSize, setPageSize] = useState(Number(searchParams.get('page_size')) || 12);
  const [loading, setLoading] = useState(true);

  // Search input state
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  const [selectedSpec, setSelectedSpec] = useState(searchParams.get('specialization') || '');
  const [locationQuery, setLocationQuery] = useState(searchParams.get('location') || '');
  const [detectingLocation, setDetectingLocation] = useState(false);
  const [locationFeedback, setLocationFeedback] = useState('');

  // Sync state with URL params
  useEffect(() => {
    setSearchQuery(searchParams.get('search') || '');
    setSelectedSpec(searchParams.get('specialization') || '');
    setLocationQuery(searchParams.get('location') || '');
  }, [searchParams]);

  // Live autocomplete results
  const [autocompleteResults, setAutocompleteResults] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);

  // Debounced search for doctor list
  useEffect(() => {
    const fetchDoctors = async () => {
      setLoading(true);
      try {
        const spec = searchParams.get('specialization') || '';
        const search = searchParams.get('search') || '';
        const location = searchParams.get('location') || '';
        const availableToday = searchParams.get('available_today') || '';
        const page = searchParams.get('page') || 1;
        const currentSize = Number(searchParams.get('page_size')) || pageSize;

        const params = {
          specialization: spec,
          search: search,
          location: location,
          page: page,
          page_size: currentSize,
        };
        if (availableToday === 'true') {
          params.available_today = 'true';
        }

        const res = await api.get('/doctors/', { params });
        setDoctors(res.data.results || []);
        setSpecializations(res.data.specializations || []);
        setPagination({
          count: res.data.count,
          num_pages: res.data.num_pages,
          current_page: res.data.current_page,
          has_next: res.data.has_next,
          has_previous: res.data.has_previous,
        });
      } catch (err) {
        console.error("Error fetching doctors:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchDoctors();
  }, [searchParams, pageSize]);

  // Autocomplete fetcher with debounce
  useEffect(() => {
    if (searchQuery.trim().length < 2) {
      setAutocompleteResults([]);
      setShowDropdown(false);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const res = await api.get(`/doctors/search/?q=${encodeURIComponent(searchQuery.trim())}`);
        setAutocompleteResults(res.data || []);
        setShowDropdown(true);
      } catch (err) {
        console.error("Autocomplete error:", err);
      }
    }, 280);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleSearchSubmit = (e) => {
    if (e) e.preventDefault();
    setShowDropdown(false);
    const params = new URLSearchParams();
    if (searchQuery.trim()) params.set('search', searchQuery.trim());
    if (selectedSpec.trim()) params.set('specialization', selectedSpec.trim());
    if (locationQuery.trim()) params.set('location', locationQuery.trim());
    if (searchParams.get('available_today') === 'true') params.set('available_today', 'true');
    params.set('page', '1');
    setSearchParams(params);
    const el = document.getElementById('doctor-list');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  const handleDetectLocation = () => {
    if (!navigator.geolocation) {
      setLocationFeedback('Geolocation is not supported by your browser.');
      setTimeout(() => setLocationFeedback(''), 4000);
      return;
    }
    setDetectingLocation(true);
    setLocationFeedback('📍 Detecting your location via GPS...');

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=12&addressdetails=1`,
            { headers: { 'Accept-Language': 'en' } }
          );
          const data = await res.json();
          const addr = data.address || {};
          const detectedCity =
            addr.city ||
            addr.town ||
            addr.suburb ||
            addr.city_district ||
            addr.state_district ||
            addr.state ||
            'Bangalore';

          setLocationQuery(detectedCity);
          setLocationFeedback(`📍 Detected: ${detectedCity}`);
          setTimeout(() => setLocationFeedback(''), 4000);

          const params = new URLSearchParams(searchParams);
          params.set('location', detectedCity);
          params.set('page', '1');
          setSearchParams(params);

          const el = document.getElementById('doctor-list');
          if (el) el.scrollIntoView({ behavior: 'smooth' });
        } catch (err) {
          console.error('Reverse geocode error:', err);
          const fallback = 'Bangalore';
          setLocationQuery(fallback);
          setLocationFeedback(`📍 Location set: ${fallback}`);
          setTimeout(() => setLocationFeedback(''), 4000);
          const params = new URLSearchParams(searchParams);
          params.set('location', fallback);
          params.set('page', '1');
          setSearchParams(params);
        } finally {
          setDetectingLocation(false);
        }
      },
      (err) => {
        console.warn('Geolocation error:', err.message);
        setDetectingLocation(false);
        setLocationFeedback('⚠️ Permission denied. Select a quick city below.');
        setTimeout(() => setLocationFeedback(''), 4000);
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 }
    );
  };

  const handleCityQuickSelect = (city) => {
    const isCurrent = (searchParams.get('location') || '').toLowerCase() === city.toLowerCase();
    const params = new URLSearchParams(searchParams);
    if (isCurrent) {
      params.delete('location');
      setLocationQuery('');
    } else {
      params.set('location', city);
      setLocationQuery(city);
    }
    params.set('page', '1');
    setSearchParams(params);
    const el = document.getElementById('doctor-list');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSpecSelect = (spec) => {
    setSelectedSpec(spec);
    const params = new URLSearchParams(searchParams);
    if (spec) {
      params.set('specialization', spec);
    } else {
      params.delete('specialization');
    }
    params.set('page', '1');
    setSearchParams(params);
  };

  const isAvailableTodayFilter = searchParams.get('available_today') === 'true';

  const toggleAvailableToday = () => {
    const params = new URLSearchParams(searchParams);
    if (isAvailableTodayFilter) {
      params.delete('available_today');
    } else {
      params.set('available_today', 'true');
    }
    params.set('page', '1');
    setSearchParams(params);
  };

  const handlePageChange = (newPage) => {
    if (newPage < 1 || newPage > pagination.num_pages) return;
    const params = new URLSearchParams(searchParams);
    params.set('page', newPage.toString());
    setSearchParams(params);
    const el = document.getElementById('doctor-list');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  const handlePageSizeChange = (newSize) => {
    const sizeNum = Number(newSize);
    setPageSize(sizeNum);
    const params = new URLSearchParams(searchParams);
    params.set('page_size', sizeNum.toString());
    params.set('page', '1');
    setSearchParams(params);
    const el = document.getElementById('doctor-list');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  // FAQ Accordion state
  const [openFaq, setOpenFaq] = useState(null);

  const toggleFaq = (idx) => {
    setOpenFaq(openFaq === idx ? null : idx);
  };

  return (
    <div>
      {/* HERO SECTION WITH ATMOSPHERIC LAYERS */}
      <div className="hero-wrap">
        <div className="hero-bg-layer"></div>
        <div className="hero-overlay-layer"></div>
        <div className="hero-ambient-blobs">
          <div className="blob-emerald"></div>
          <div className="blob-sky"></div>
        </div>

        <div className="container hero-grid" style={{ position: 'relative', zIndex: 10 }}>
          <div className="hero-content fade-up">
            <h1 className="title-40">Book Trusted Doctors in Minutes</h1>
            <p>
              Search verified specialists, see real availability, and lock in your appointment without wait times or phone calls. Premium healthcare made simple.
            </p>

            {/* ADVANCED SEARCH BAR */}
            <form onSubmit={handleSearchSubmit} className="search-box-adv" style={{ position: 'relative' }}>
              <div className="search-field flex-2">
                <Search className="icon" size={18} />
                <input
                  type="text"
                  placeholder="Doctor, hospital..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => autocompleteResults.length > 0 && setShowDropdown(true)}
                  autoComplete="off"
                />
              </div>
              <div className="search-divider"></div>
              <div className="search-field">
                <input
                  type="text"
                  placeholder="Specialty..."
                  value={selectedSpec}
                  onChange={(e) => setSelectedSpec(e.target.value)}
                  autoComplete="off"
                />
              </div>
              <div className="search-divider"></div>
              <div className="search-field" style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <MapPin className="icon" size={18} style={{ color: 'var(--color-primary)', flexShrink: 0 }} />
                <input
                  type="text"
                  placeholder="City or area (e.g. Bangalore)..."
                  value={locationQuery}
                  onChange={(e) => setLocationQuery(e.target.value)}
                  autoComplete="off"
                  style={{ paddingRight: '36px' }}
                />
                <button
                  type="button"
                  onClick={handleDetectLocation}
                  title="Detect Current Location via GPS"
                  disabled={detectingLocation}
                  style={{
                    position: 'absolute',
                    right: '6px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: detectingLocation ? 'rgba(16, 185, 129, 0.2)' : 'rgba(2, 132, 199, 0.1)',
                    border: '1px solid rgba(2, 132, 199, 0.25)',
                    borderRadius: '6px',
                    padding: '5px 7px',
                    cursor: detectingLocation ? 'wait' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: detectingLocation ? '#059669' : '#0284c7',
                    transition: 'all 0.2s',
                  }}
                >
                  <Navigation
                    size={14}
                    style={{
                      animation: detectingLocation ? 'spin 1s linear infinite' : 'none',
                      transform: detectingLocation ? 'none' : 'rotate(45deg)',
                    }}
                  />
                </button>
              </div>
              <button type="submit" className="search-btn-adv" aria-label="Search">
                Search
              </button>

              {/* Autocomplete Dropdown */}
              {showDropdown && autocompleteResults.length > 0 && (
                <div
                  style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    backgroundColor: '#fff',
                    borderRadius: '12px',
                    boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
                    marginTop: '8px',
                    zIndex: 100,
                    border: '1px solid var(--c-border)',
                    overflow: 'hidden',
                  }}
                >
                  {autocompleteResults.map((doc) => (
                    <Link
                      key={doc.id}
                      to={`/doctors/${doc.id}`}
                      onClick={() => setShowDropdown(false)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        padding: '10px 16px',
                        textDecoration: 'none',
                        color: 'var(--c-navy)',
                        borderBottom: '1px solid var(--c-border)',
                        transition: 'background 0.2s',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--c-bg)')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                    >
                      <img
                        src={getDoctorAvatar(doc)}
                        alt={doc.name}
                        loading="lazy"
                        style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover', background: '#f1f5f9' }}
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = getDoctorAvatar(doc, doc.name);
                        }}
                      />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: '14px' }}>Dr. {doc.name}</div>
                        <div style={{ fontSize: '12px', color: 'var(--c-text-light)' }}>
                          {doc.specialization} &middot; ₹{doc.fee}
                          {doc.hospital_name ? ` &middot; ${doc.hospital_name}` : ''}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </form>

            {/* Quick Location Pills & Feedback */}
            <div className="quick-cities-row fade-up" style={{ marginTop: '12px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '12px', fontWeight: 600, color: 'rgba(255, 255, 255, 0.9)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <MapPin size={13} /> Popular Cities:
              </span>
              {['Bangalore', 'Mumbai', 'Delhi NCR', 'Hyderabad', 'Chennai'].map((city) => {
                const isCurrent = (searchParams.get('location') || '').toLowerCase() === city.toLowerCase();
                return (
                  <button
                    key={city}
                    type="button"
                    onClick={() => handleCityQuickSelect(city)}
                    style={{
                      background: isCurrent ? '#ffffff' : 'rgba(255, 255, 255, 0.2)',
                      color: isCurrent ? '#0f172a' : '#ffffff',
                      border: isCurrent ? '1px solid #ffffff' : '1px solid rgba(255, 255, 255, 0.35)',
                      backdropFilter: 'blur(8px)',
                      borderRadius: '20px',
                      padding: '3px 10px',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      boxShadow: isCurrent ? '0 2px 6px rgba(0,0,0,0.15)' : 'none'
                    }}
                  >
                    {isCurrent ? `✓ ${city}` : city}
                  </button>
                );
              })}
              {locationFeedback && (
                <span style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#ffffff',
                  background: 'rgba(16, 185, 129, 0.4)',
                  border: '1px solid rgba(16, 185, 129, 0.6)',
                  borderRadius: '12px',
                  padding: '2px 8px',
                  animation: 'fadeIn 0.3s ease'
                }}>
                  {locationFeedback}
                </span>
              )}
            </div>

            {/* HERO STATS */}
            <div className="hero-stats fade-up" style={{ animationDelay: '100ms' }}>
              <div className="stat-item">
                <div className="stat-num">{pagination.count > 0 ? pagination.count : '50+'}</div>
                <div className="stat-label">Verified Doctors</div>
              </div>
              <div className="stat-item">
                <div className="stat-num">{specializations.length > 0 ? specializations.length : '12+'}</div>
                <div className="stat-label">Specialties</div>
              </div>
              <div className="stat-item">
                <div className="stat-num">24/7</div>
                <div className="stat-label">Online Access</div>
              </div>
            </div>
          </div>

          <div className="hero-visual fade-up" style={{ animationDelay: '200ms' }}>
            <div className="hero-circle-bg"></div>
            <div className="hero-image-wrap">
              {/* Animated ECG Pulse Badge */}
              <div className="hero-ecg-badge">
                <span className="ecg-pulse-dot"></span>
                <svg className="ecg-line" viewBox="0 0 100 24" fill="none">
                  <path d="M0 12 H25 L32 2 L38 22 L45 8 L50 16 L54 12 H100" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span>Live Care 24/7</span>
              </div>

              <img
                src="https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=800&auto=format&fit=crop&q=80"
                alt="Licensed Medical Specialist Consultation"
                className="hero-img"
                loading="eager"
                fetchPriority="high"
              />
              {/* Floating Badge 1: Top Right Rating */}
              <div className="hero-float-card float-card-top">
                <div className="float-icon-star">★</div>
                <div>
                  <div className="float-card-title">4.9 Rating</div>
                  <div className="float-card-sub">1,200+ Verified Reviews</div>
                </div>
              </div>

              {/* Floating Badge 2: Bottom Left Verified */}
              <div className="hero-float-card float-card-bottom">
                <div className="float-icon-check">✓</div>
                <div>
                  <div className="float-card-title">100% Verified</div>
                  <div className="float-card-sub" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span className="live-status-dot"></span> Available Today
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* FEATURED SPECIALTIES / DEPARTMENTS SECTION */}
      <div className="section-pad bg-white" style={{ borderBottom: '1px solid var(--color-line)' }}>
        <div className="container">
          <div className="section-head-center fade-up">
            <span className="eyebrow">Hospital Wings &amp; Specialties</span>
            <h2 className="section-title">Explore Care by Department</h2>
            <p className="section-desc">
              Staffed with board-certified physicians and specialists ready for in-person or video consultation.
            </p>
          </div>

          <div className="dept-grid fade-up">
            {FEATURED_DEPARTMENTS.map((dept) => {
              const IconComp = dept.icon;
              const isSelected = selectedSpec === dept.id;
              return (
                <button
                  key={dept.id}
                  type="button"
                  onClick={() => {
                    handleSpecSelect(dept.id);
                    const el = document.getElementById('doctor-list');
                    if (el) el.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className={`dept-card ${dept.badgeClass} ${isSelected ? 'active' : ''}`}
                >
                  <div
                    className="dept-card-bg"
                    style={{ backgroundImage: `url('${dept.bgImage}')` }}
                  />
                  <div className="dept-card-wash" />
                  <div className="dept-card-top">
                    <div className="dept-icon-badge">
                      <IconComp size={22} />
                    </div>
                    <span className="dept-tag">{dept.doctorsCount}</span>
                  </div>
                  <div className="dept-card-body">
                    <h3 className="dept-name">{dept.name}</h3>
                    <p className="dept-sub">{dept.subtitle}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* MAIN LISTING */}
      <div className="section-pad" id="doctor-list">
        <div className="container">
          <div className="section-head-center fade-up" style={{ marginBottom: '24px' }}>
            <span className="eyebrow">Verified Specialists</span>
            <h2 className="section-title">Find &amp; Book Top Doctors</h2>
            <p className="section-desc">Filter by department specialization, clinical experience, or location.</p>
          </div>

          <div className="main-layout">
            {/* CATEGORY SIDEBAR */}
            <aside className="sidebar fade-up">
              {/* Working Today Quick Filter */}
              <div style={{ marginBottom: '14px', paddingBottom: '14px', borderBottom: '1px solid var(--color-line)' }}>
                <button
                  type="button"
                  onClick={toggleAvailableToday}
                  className={`sidebar-item ${isAvailableTodayFilter ? 'active' : ''}`}
                  style={{
                    width: '100%',
                    border: isAvailableTodayFilter ? '1px solid var(--color-primary)' : '1px solid rgba(16, 185, 129, 0.25)',
                    background: isAvailableTodayFilter ? 'var(--color-primary)' : 'rgba(16, 185, 129, 0.08)',
                    color: isAvailableTodayFilter ? '#ffffff' : '#059669',
                    textAlign: 'left',
                    cursor: 'pointer',
                    fontWeight: 600,
                    borderRadius: '8px',
                    padding: '10px 14px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  <span style={{ fontSize: '14px' }}>🟢</span>
                  <span>Working Today Only</span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => handleSpecSelect('')}
                className={`sidebar-item ${!searchParams.get('specialization') ? 'active' : ''}`}
                style={{ width: '100%', border: 'none', background: 'none', textAlign: 'left', cursor: 'pointer' }}
              >
                <Grid size={16} />
                <span>All Specialties</span>
              </button>
              {Array.from(new Set([...DEFAULT_SPECIALTIES, ...(specializations || [])])).map((spec) => {
                const Icon = getSpecIcon(spec);
                const isActive = searchParams.get('specialization') === spec;
                return (
                  <button
                    key={spec}
                    type="button"
                    onClick={() => handleSpecSelect(spec)}
                    className={`sidebar-item ${isActive ? 'active' : ''}`}
                    style={{ width: '100%', border: 'none', background: 'none', textAlign: 'left', cursor: 'pointer' }}
                  >
                    <Icon size={16} />
                    <span>{spec}</span>
                  </button>
                );
              })}
            </aside>

            {/* DOCTOR GRID & CONTENT */}
            <div className="content-area">
              {/* Active Filter Indicators Bar */}
              {(isAvailableTodayFilter || searchParams.get('specialization') || searchParams.get('search') || searchParams.get('location')) && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '16px' }}>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-ink-muted)' }}>Active Filters:</span>
                  {isAvailableTodayFilter && (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#d1fae5', color: '#065f46', fontSize: '12px', fontWeight: 600, padding: '4px 10px', borderRadius: '16px' }}>
                      🟢 Working Today
                      <button onClick={toggleAvailableToday} style={{ background: 'none', border: 'none', color: '#065f46', cursor: 'pointer', fontWeight: 700, padding: '0 2px' }}>×</button>
                    </span>
                  )}
                  {searchParams.get('location') && (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#ede9fe', color: '#6d28d9', fontSize: '12px', fontWeight: 600, padding: '4px 10px', borderRadius: '16px' }}>
                      📍 {searchParams.get('location')}
                      <button onClick={() => { setLocationQuery(''); const p = new URLSearchParams(searchParams); p.delete('location'); p.set('page', '1'); setSearchParams(p); }} style={{ background: 'none', border: 'none', color: '#6d28d9', cursor: 'pointer', fontWeight: 700, padding: '0 2px' }}>×</button>
                    </span>
                  )}
                  {searchParams.get('specialization') && (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#e0f2fe', color: '#0369a1', fontSize: '12px', fontWeight: 600, padding: '4px 10px', borderRadius: '16px' }}>
                      🩺 {searchParams.get('specialization')}
                      <button onClick={() => handleSpecSelect('')} style={{ background: 'none', border: 'none', color: '#0369a1', cursor: 'pointer', fontWeight: 700, padding: '0 2px' }}>×</button>
                    </span>
                  )}
                  {searchParams.get('search') && (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#f1f5f9', color: '#334155', fontSize: '12px', fontWeight: 600, padding: '4px 10px', borderRadius: '16px' }}>
                      🔍 "{searchParams.get('search')}"
                      <button onClick={() => { setSearchQuery(''); const p = new URLSearchParams(searchParams); p.delete('search'); p.set('page', '1'); setSearchParams(p); }} style={{ background: 'none', border: 'none', color: '#334155', cursor: 'pointer', fontWeight: 700, padding: '0 2px' }}>×</button>
                    </span>
                  )}
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setSelectedSpec('');
                      setLocationQuery('');
                      setSearchParams({});
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--color-ink-muted)',
                      textDecoration: 'underline',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      marginLeft: '4px'
                    }}
                  >
                    Clear All
                  </button>
                </div>
              )}

              {loading ? (
                <div className="doc-grid">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <SkeletonDoctorCard key={i} />
                  ))}
                </div>
              ) : doctors.length > 0 ? (
                <div className="doc-grid">
                  {doctors.map((doctor, idx) => (
                    <div key={doctor.id} className="doc-card fade-up" style={{ animationDelay: `${(idx + 1) * 60}ms` }}>
                      <div className="doc-head">
                        <img
                          src={getDoctorAvatar(doctor)}
                          alt={`Dr. ${doctor.name}`}
                          className="doc-img"
                          loading="lazy"
                          style={{ background: '#f1f5f9' }}
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = getDoctorAvatar(doctor, doctor.name);
                          }}
                        />
                        <div>
                          <div className="doc-name">
                            {doctor.name}
                            <CheckCircle size={18} style={{ color: 'var(--color-primary)', flexShrink: 0 }} />
                          </div>
                          <div className="doc-spec">{doctor.specialization}</div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '6px', flexWrap: 'wrap' }}>
                            <div className="doc-badge">
                              <Star size={12} style={{ fill: 'currentColor' }} /> {doctor.rating || '4.5'}
                            </div>
                            {doctor.is_available_today ? (
                              <span style={{
                                background: '#d1fae5',
                                color: '#065f46',
                                padding: '2px 8px',
                                borderRadius: '10px',
                                fontSize: '11px',
                                fontWeight: 600,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '3px',
                                border: '1px solid rgba(16, 185, 129, 0.3)'
                              }}>
                                🟢 Today
                              </span>
                            ) : (
                              <span style={{
                                background: '#f8fafc',
                                color: '#64748b',
                                padding: '2px 7px',
                                borderRadius: '10px',
                                fontSize: '10.5px',
                                fontWeight: 500,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '3px',
                                border: '1px solid #e2e8f0'
                              }}>
                                ⚪ Next: {doctor.available_days ? doctor.available_days.split(',')[0].trim().toUpperCase() : 'Schedule'}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="doc-info">
                        <div className="info-row" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '4px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                            <Building2 size={14} style={{ flexShrink: 0 }} />
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }} title={doctor.clinic_address ? `${doctor.hospital_name || 'Clinic'} - ${doctor.clinic_address}` : doctor.hospital_name}>
                              {doctor.hospital_name || 'CareConnect Hospital'}
                            </span>
                          </div>
                          <a
                            href={doctor.maps_url || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent((doctor.hospital_name || '') + ' ' + (doctor.clinic_address || ''))}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            title="Open in Google Maps"
                            style={{
                              fontSize: '11px',
                              color: '#0284c7',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '2px',
                              fontWeight: 600,
                              textDecoration: 'none',
                              background: '#e0f2fe',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              flexShrink: 0
                            }}
                          >
                            <Navigation size={10} /> Maps
                          </a>
                        </div>
                        <div className="info-row">
                          <BriefcaseMedical size={14} />
                          <span>{doctor.experience_years} Years Exp.</span>
                        </div>
                        <div className="info-row" style={{ color: doctor.is_available_today ? 'var(--color-primary-dark)' : 'var(--color-ink-muted)', fontWeight: 600 }}>
                          <CalendarCheck size={14} style={{ color: doctor.is_available_today ? 'var(--color-primary)' : 'var(--color-ink-muted)' }} />
                          <span>{doctor.is_available_today ? 'Slots Available Today' : `Days: ${doctor.available_days || 'Mon-Fri'}`}</span>
                        </div>
                      </div>

                      <div className="doc-bottom">
                        <div className="fee-col">
                          <span className="fee-lbl">Consultation</span>
                          <span className="fee-val">₹{doctor.calculated_fee || doctor.fee}</span>
                        </div>
                        <Link to={`/doctors/${doctor.id}`} className="btn-book">
                          Book
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '48px 24px', background: '#fff', borderRadius: '16px', border: '1px solid var(--color-line)' }}>
                  <Search size={44} style={{ color: 'var(--color-ink-muted)', marginBottom: '14px' }} />
                  <h3 style={{ fontSize: '19px', fontWeight: 700, color: 'var(--color-navy)', marginBottom: '8px' }}>
                    {searchParams.get('location')
                      ? `No Doctors Found in "${searchParams.get('location')}"`
                      : searchParams.get('specialization')
                      ? `No ${searchParams.get('specialization')} Specialists Found`
                      : 'No Doctors Found'}
                  </h3>
                  <p style={{ fontSize: '14px', color: 'var(--color-ink-soft)', maxWidth: '420px', margin: '0 auto 18px' }}>
                    {searchParams.get('location') || searchParams.get('specialization') || searchParams.get('search')
                      ? 'Try selecting a different city, department specialty, or clearing your active filters.'
                      : 'Our network of verified doctors is expanding. Check back shortly!'}
                  </p>
                  {(searchParams.get('location') || searchParams.get('specialization') || searchParams.get('search')) && (
                    <button
                      type="button"
                      onClick={() => {
                        handleSpecSelect('');
                        setSearchQuery('');
                        setLocationQuery('');
                        setSearchParams({});
                      }}
                      className="btn btn-primary"
                      style={{ fontSize: '13.5px', height: '38px', padding: '0 20px', borderRadius: '10px' }}
                    >
                      Clear Filters &amp; View All Doctors
                    </button>
                  )}
                </div>
              )}

              {/* PAGINATION */}
              {pagination.count > 0 && (
                <div className="pagination-wrap fade-up">
                  <div className="pagination-top-info">
                    <div className="pagination-count-text">
                      Showing <strong>{Math.min(pagination.count, (pagination.current_page - 1) * pageSize + 1)}–{Math.min(pagination.count, pagination.current_page * pageSize)}</strong> of <strong>{pagination.count}</strong> Verified Doctors
                    </div>
                    <div className="pagination-size-box">
                      <span>Per page:</span>
                      <select
                        className="pagination-select"
                        value={pageSize}
                        onChange={(e) => handlePageSizeChange(e.target.value)}
                      >
                        <option value={6}>6 Doctors</option>
                        <option value={12}>12 Doctors</option>
                        <option value={24}>24 Doctors</option>
                        <option value={48}>48 Doctors</option>
                      </select>
                    </div>
                  </div>

                  {pagination.num_pages > 1 && (
                    <div className="pagination">
                      {/* First Page */}
                      <button
                        type="button"
                        onClick={() => handlePageChange(1)}
                        disabled={pagination.current_page === 1}
                        className="page-btn"
                        title="First Page"
                      >
                        <ChevronsLeft size={16} />
                      </button>

                      {/* Previous Page */}
                      <button
                        type="button"
                        onClick={() => handlePageChange(pagination.current_page - 1)}
                        disabled={!pagination.has_previous}
                        className="page-btn"
                        title="Previous Page"
                      >
                        <ChevronLeft size={16} />
                      </button>

                      {/* Page Numbers with Smart Ellipsis */}
                      {getPageNumbers(pagination.current_page, pagination.num_pages).map((pageNum, idx) => {
                        if (pageNum === '...') {
                          return (
                            <span key={`ellipsis-${idx}`} className="page-ellipsis">
                              ...
                            </span>
                          );
                        }
                        const isCurrent = pageNum === pagination.current_page;
                        return (
                          <button
                            key={`page-${pageNum}`}
                            type="button"
                            onClick={() => handlePageChange(pageNum)}
                            className={`page-btn ${isCurrent ? 'active' : ''}`}
                            aria-current={isCurrent ? 'page' : undefined}
                          >
                            {pageNum}
                          </button>
                        );
                      })}

                      {/* Next Page */}
                      <button
                        type="button"
                        onClick={() => handlePageChange(pagination.current_page + 1)}
                        disabled={!pagination.has_next}
                        className="page-btn"
                        title="Next Page"
                      >
                        <ChevronRight size={16} />
                      </button>

                      {/* Last Page */}
                      <button
                        type="button"
                        onClick={() => handlePageChange(pagination.num_pages)}
                        disabled={pagination.current_page === pagination.num_pages}
                        className="page-btn"
                        title="Last Page"
                      >
                        <ChevronsRight size={16} />
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* WHY CHOOSE US */}
      <div className="section-pad bg-white" style={{ borderTop: '1px solid var(--color-line)', borderBottom: '1px solid var(--color-line)' }}>
        <div className="container">
          <div className="section-head-center fade-up">
            <span className="eyebrow">Platform Highlights</span>
            <h2 className="section-title">Why Choose CareConnect</h2>
            <p className="section-desc">Experience the best healthcare booking platform designed for you and your family.</p>
          </div>
          <div className="doc-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
            <div className="feature-card fade-up">
              <div className="feature-icon"><Clock size={26} /></div>
              <h4 style={{ fontSize: '17px', fontWeight: 700, color: 'var(--color-navy)', marginBottom: '8px' }}>Instant Booking</h4>
              <p style={{ fontSize: '13.5px', color: 'var(--color-ink-soft)', lineHeight: 1.6, margin: 0 }}>View real-time doctor availability and lock your appointment slot instantly.</p>
            </div>
            <div className="feature-card fade-up" style={{ animationDelay: '100ms' }}>
              <div className="feature-icon"><CheckCircle size={26} /></div>
              <h4 style={{ fontSize: '17px', fontWeight: 700, color: 'var(--color-navy)', marginBottom: '8px' }}>Verified Doctors</h4>
              <p style={{ fontSize: '13.5px', color: 'var(--color-ink-soft)', lineHeight: 1.6, margin: 0 }}>Every doctor is thoroughly background checked and medically certified.</p>
            </div>
            <div className="feature-card fade-up" style={{ animationDelay: '200ms' }}>
              <div className="feature-icon"><ShieldCheck size={26} /></div>
              <h4 style={{ fontSize: '17px', fontWeight: 700, color: 'var(--color-navy)', marginBottom: '8px' }}>Secure Platform</h4>
              <p style={{ fontSize: '13.5px', color: 'var(--color-ink-soft)', lineHeight: 1.6, margin: 0 }}>Your medical records and consultation history are protected with 256-bit encryption.</p>
            </div>
          </div>
        </div>
      </div>

      {/* PATIENT TESTIMONIALS */}
      <div className="section-pad">
        <div className="container">
          <div className="section-head-center fade-up">
            <span className="eyebrow">Real Experiences</span>
            <h2 className="section-title">Patient Stories</h2>
            <p className="section-desc">See how CareConnect is transforming specialist access for thousands across the country.</p>
          </div>
          <div className="doc-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
            <div className="testi-card fade-up">
              <div className="testi-head">
                <div className="testi-av">AR</div>
                <div>
                  <div className="testi-name">Aarav Reddy</div>
                  <div className="testi-role">Patient</div>
                </div>
              </div>
              <div className="testi-text">"Booked an appointment in less than 2 minutes. The platform is incredibly fast and the doctor was very professional."</div>
            </div>
            <div className="testi-card fade-up" style={{ animationDelay: '100ms' }}>
              <div className="testi-head">
                <div className="testi-av">SP</div>
                <div>
                  <div className="testi-name">Sneha Patel</div>
                  <div className="testi-role">Patient</div>
                </div>
              </div>
              <div className="testi-text">"I love the clean interface and the fact that I don't have to wait in clinic queues anymore. Highly recommended!"</div>
            </div>
            <div className="testi-card fade-up" style={{ animationDelay: '200ms' }}>
              <div className="testi-head">
                <div className="testi-av">VK</div>
                <div>
                  <div className="testi-name">Vikram Kumar</div>
                  <div className="testi-role">Patient</div>
                </div>
              </div>
              <div className="testi-text">"The best healthcare app I've used. Found a great cardiologist instantly when I needed one urgently."</div>
            </div>
          </div>
        </div>
      </div>

      {/* EMERGENCY BANNER */}
      <div className="section-pad" style={{ paddingTop: 0 }}>
        <div className="container">
          <div className="fade-up" style={{ background: 'linear-gradient(135deg, #ef4444, #dc2626)', borderRadius: '20px', padding: '32px 36px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#fff', flexWrap: 'wrap', gap: '20px', boxShadow: '0 10px 30px rgba(239,68,68,0.25)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
              <div style={{ width: '56px', height: '56px', background: 'rgba(255,255,255,0.2)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Ambulance size={28} />
              </div>
              <div>
                <h3 style={{ fontSize: '22px', fontWeight: 700, marginBottom: '4px', color: '#fff' }}>Emergency Support Needed?</h3>
                <p style={{ opacity: 0.9, fontSize: '14.5px', margin: 0 }}>Our 24x7 emergency response team is just a call away.</p>
              </div>
            </div>
            <a href="tel:108" style={{ background: '#fff', color: '#dc2626', padding: '0 28px', height: '46px', borderRadius: '12px', display: 'inline-flex', alignItems: 'center', fontWeight: 700, textDecoration: 'none', fontSize: '16px', gap: '8px' }}>
              <Phone size={18} /> Call 108
            </a>
          </div>
        </div>
      </div>

      {/* FAQ SECTION */}
      <div className="section-pad bg-white" style={{ borderTop: '1px solid var(--color-line)' }}>
        <div className="container" style={{ maxWidth: '820px' }}>
          <div className="section-head-center fade-up">
            <span className="eyebrow">Got Questions?</span>
            <h2 className="section-title">Frequently Asked Questions</h2>
            <p className="section-desc">Everything you need to know about booking, cancellation, and privacy.</p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {[
              {
                q: "Are all doctors on CareConnect verified?",
                a: "Yes, every doctor undergoes a rigorous background check and credential verification process before they are listed on our platform."
              },
              {
                q: "How do I cancel or reschedule my appointment?",
                a: "You can cancel or reschedule your appointment from the 'My Consultations' dashboard up to 2 hours before the scheduled time."
              },
              {
                q: "Is my medical data secure?",
                a: "Absolutely. We use 256-bit end-to-end encryption to ensure your medical records and personal data are kept completely confidential."
              }
            ].map((faq, idx) => (
              <div
                key={idx}
                className="faq-item fade-up"
                onClick={() => toggleFaq(idx)}
                style={{ cursor: 'pointer' }}
              >
                <h4 style={{ fontSize: '15.5px', fontWeight: 700, color: 'var(--color-navy)', margin: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  {faq.q}
                  <ChevronDown
                    size={18}
                    style={{
                      color: 'var(--color-ink-muted)',
                      transform: openFaq === idx ? 'rotate(180deg)' : 'rotate(0deg)',
                      transition: 'transform 0.3s ease',
                      flexShrink: 0,
                      marginLeft: '12px',
                    }}
                  />
                </h4>
                {openFaq === idx && (
                  <p style={{ fontSize: '14px', color: 'var(--color-ink-soft)', marginTop: '10px', marginBottom: 0, lineHeight: 1.6 }} className="fade-up">
                    {faq.a}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CTA BANNER */}
      <div className="section-pad">
        <div className="container">
          <div className="cta-banner fade-up">
            <h2>Ready to Consult with a Specialist?</h2>
            <p style={{ marginBottom: '24px', opacity: 0.9, fontSize: '15.5px' }}>Book your appointment in under 2 minutes with verified healthcare professionals.</p>
            <a href="#doctor-list" className="btn-white">Find a Doctor Now</a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomePage;
