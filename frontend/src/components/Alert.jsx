import React from 'react';

const Alert = ({ type = 'info', message, onClose }) => {
  if (!message) return null;

  const icon =
    type === 'success' ? '✓' :
    type === 'error' || type === 'danger' ? '✕' :
    type === 'warning' ? '⚠' : 'ℹ';

  const alertClass = type === 'danger' ? 'alert-error' : `alert-${type}`;

  return (
    <div className={`alert ${alertClass}`} role="alert" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <div>
        <span style={{ marginRight: '8px', fontWeight: 'bold' }}>{icon}</span>
        <span>{message}</span>
      </div>
      {onClose && (
        <button
          onClick={onClose}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', fontSize: '1rem', marginLeft: '1rem' }}
          aria-label="Close"
        >
          &times;
        </button>
      )}
    </div>
  );
};

export default Alert;
