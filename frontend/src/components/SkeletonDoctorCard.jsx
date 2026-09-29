import React from 'react';

const SkeletonDoctorCard = () => {
  return (
    <div className="doc-card skeleton-card-wrapper" style={{ cursor: 'default' }}>
      <div className="doc-head">
        <div className="skeleton skeleton-circle" style={{ width: '64px', height: '64px' }} />
        <div style={{ flex: 1 }}>
          <div className="skeleton skeleton-text" style={{ width: '70%', height: '18px', marginBottom: '8px' }} />
          <div className="skeleton skeleton-text" style={{ width: '45%', height: '14px', marginBottom: '8px' }} />
          <div style={{ display: 'flex', gap: '6px' }}>
            <div className="skeleton skeleton-text" style={{ width: '50px', height: '16px', borderRadius: '10px' }} />
            <div className="skeleton skeleton-text" style={{ width: '60px', height: '16px', borderRadius: '10px' }} />
          </div>
        </div>
      </div>

      <div className="doc-info" style={{ marginTop: '14px' }}>
        <div className="skeleton skeleton-text" style={{ width: '90%', height: '14px', marginBottom: '10px' }} />
        <div className="skeleton skeleton-text" style={{ width: '65%', height: '14px', marginBottom: '10px' }} />
        <div className="skeleton skeleton-text" style={{ width: '80%', height: '14px' }} />
      </div>

      <div className="doc-bottom" style={{ marginTop: '18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div className="skeleton skeleton-text" style={{ width: '50px', height: '11px', marginBottom: '4px' }} />
          <div className="skeleton skeleton-text" style={{ width: '65px', height: '18px' }} />
        </div>
        <div className="skeleton" style={{ width: '80px', height: '34px', borderRadius: '8px' }} />
      </div>
    </div>
  );
};

export default SkeletonDoctorCard;
