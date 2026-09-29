import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import Alert from '../components/Alert';
import '../styles/Profile.css';
import { ArrowLeft, Save, UploadCloud, Image, X, User, Phone, MapPin, Calendar, Heart } from 'lucide-react';

const ProfileEditPage = () => {
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    phone: '',
    address: '',
    gender: '',
    birthday: '',
  });
  const [profileImageFile, setProfileImageFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [existingImageUrl, setExistingImageUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (user) {
      setFormData({
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        phone: user.phone || '',
        address: user.address || '',
        gender: user.gender || '',
        birthday: user.birthday || '',
      });
      const img = user.profile_image_url || user.profile_image;
      if (img) {
        setPreviewUrl(img);
        setExistingImageUrl(img);
      }
    }
  }, [user]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        setErrorMsg('Image file size must be less than 10MB.');
        return;
      }
      setProfileImageFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setErrorMsg('');
    }
  };

  const handleRemoveImage = () => {
    setProfileImageFile(null);
    setPreviewUrl(existingImageUrl);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    const payload = new FormData();
    payload.append('first_name', formData.first_name.trim());
    payload.append('last_name', formData.last_name.trim());
    payload.append('phone', formData.phone.trim());
    payload.append('address', formData.address.trim());
    if (formData.gender) payload.append('gender', formData.gender);
    if (formData.birthday) payload.append('birthday', formData.birthday);
    if (profileImageFile) payload.append('profile_image', profileImageFile);

    try {
      const res = await api.patch('/accounts/profile/', payload, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      updateUser(res.data.user || res.data);
      navigate('/profile', {
        state: { alert: { type: 'success', message: 'Your profile and avatar have been updated successfully!' } }
      });
    } catch (err) {
      const msg = err.response?.data?.error || err.response?.data?.detail || 'Failed to update profile details.';
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container" style={{ paddingTop: '2.5rem', paddingBottom: '4rem', maxWidth: '640px' }}>
      <Link
        to="/profile"
        className="btn btn-ghost btn-sm"
        style={{ marginBottom: '1.5rem', display: 'inline-flex', alignItems: 'center', gap: '0.4rem', color: 'var(--color-navy)', fontWeight: 600 }}
      >
        <ArrowLeft size={16} /> Back to Profile
      </Link>

      <div className="card" style={{ padding: '2.5rem', borderRadius: '16px', border: '1px solid var(--color-line)' }}>
        <span className="eyebrow" style={{ color: 'var(--color-primary)', fontWeight: 700 }}>
          Patient Account Settings
        </span>
        <h2 style={{ fontSize: '1.65rem', fontWeight: 800, color: 'var(--color-navy)', marginTop: '0.2rem', marginBottom: '0.5rem' }}>
          Edit Personal Profile
        </h2>
        <p style={{ color: 'var(--color-ink-soft)', fontSize: '0.85rem', marginBottom: '1.75rem' }}>
          Update your contact phone, residential address, date of birth, and Cloudinary avatar.
        </p>

        {errorMsg && (
          <div style={{ marginBottom: '1.5rem' }}>
            <Alert type="error" message={errorMsg} onClose={() => setErrorMsg('')} />
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Avatar Cloudinary Box */}
          <div style={{ padding: '1.25rem', background: 'var(--color-bg-alt)', borderRadius: '12px', border: '1.5px dashed var(--color-line)', display: 'flex', alignItems: 'center', gap: '1.25rem', flexWrap: 'wrap' }}>
            {previewUrl ? (
              <img
                src={previewUrl}
                alt="Profile Preview"
                style={{ width: '76px', height: '76px', borderRadius: '50%', objectFit: 'cover', border: '3px solid var(--color-primary)', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
              />
            ) : (
              <div style={{ width: '76px', height: '76px', borderRadius: '50%', background: 'var(--color-primary-subtle)', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.75rem', fontWeight: 'bold' }}>
                {user?.username?.charAt(0).toUpperCase() || 'U'}
              </div>
            )}

            <div style={{ flex: 1, minWidth: '200px' }}>
              <input
                type="file"
                id="profile-avatar-input"
                accept="image/*"
                onChange={handleImageChange}
                style={{ display: 'none' }}
              />
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                <label
                  htmlFor="profile-avatar-input"
                  className="btn btn-outline btn-sm"
                  style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.35rem', background: '#fff', fontSize: '0.82rem' }}
                >
                  <UploadCloud size={15} /> {previewUrl ? 'Change Avatar' : 'Upload Avatar'}
                </label>
                {profileImageFile && (
                  <button
                    type="button"
                    onClick={handleRemoveImage}
                    className="btn btn-ghost btn-sm"
                    style={{ color: 'var(--color-danger)', fontSize: '0.78rem' }}
                  >
                    <X size={14} /> Cancel Selection
                  </button>
                )}
              </div>
              <p style={{ fontSize: '0.72rem', color: 'var(--color-ink-soft)', margin: '0.35rem 0 0' }}>
                Image is automatically stored on Cloudinary CDN.
              </p>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label htmlFor="first_name" style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--color-navy)', display: 'block', marginBottom: '0.3rem' }}>
                First Name
              </label>
              <input
                type="text"
                id="first_name"
                name="first_name"
                value={formData.first_name}
                onChange={handleChange}
                placeholder="e.g. John"
                style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid var(--color-line)', fontSize: '0.9rem' }}
              />
            </div>

            <div>
              <label htmlFor="last_name" style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--color-navy)', display: 'block', marginBottom: '0.3rem' }}>
                Last Name
              </label>
              <input
                type="text"
                id="last_name"
                name="last_name"
                value={formData.last_name}
                onChange={handleChange}
                placeholder="e.g. Doe"
                style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid var(--color-line)', fontSize: '0.9rem' }}
              />
            </div>
          </div>

          <div>
            <label htmlFor="phone" style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--color-navy)', display: 'block', marginBottom: '0.3rem' }}>
              Phone Number
            </label>
            <input
              type="tel"
              id="phone"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              placeholder="e.g. +91 9876543210"
              style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid var(--color-line)', fontSize: '0.9rem' }}
            />
          </div>

          <div>
            <label htmlFor="address" style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--color-navy)', display: 'block', marginBottom: '0.3rem' }}>
              Residential / Mailing Address
            </label>
            <input
              type="text"
              id="address"
              name="address"
              value={formData.address}
              onChange={handleChange}
              placeholder="e.g. Flat 402, Green Valley Apartments, Bengaluru"
              style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid var(--color-line)', fontSize: '0.9rem' }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label htmlFor="gender" style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--color-navy)', display: 'block', marginBottom: '0.3rem' }}>
                Gender
              </label>
              <select
                id="gender"
                name="gender"
                value={formData.gender}
                onChange={handleChange}
                style={{ width: '100%', height: '42px', padding: '0 0.85rem', borderRadius: '8px', border: '1px solid var(--color-line)', background: '#fff', fontSize: '0.9rem' }}
              >
                <option value="">-- Select Gender --</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label htmlFor="birthday" style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--color-navy)', display: 'block', marginBottom: '0.3rem' }}>
                Date of Birth
              </label>
              <input
                type="date"
                id="birthday"
                name="birthday"
                value={formData.birthday}
                onChange={handleChange}
                style={{ width: '100%', height: '42px', padding: '0 0.85rem', borderRadius: '8px', border: '1px solid var(--color-line)', fontSize: '0.9rem' }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.25rem', paddingTop: '1.25rem', borderTop: '1px solid var(--color-line)' }}>
            <button
              type="submit"
              className="btn btn-primary"
              style={{ flex: 1, height: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', fontSize: '0.92rem' }}
              disabled={loading}
            >
              <Save size={17} /> {loading ? 'Saving to Cloudinary...' : 'Save Profile Changes'}
            </button>
            <Link to="/profile" className="btn btn-outline" style={{ flex: 0.5, height: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProfileEditPage;
