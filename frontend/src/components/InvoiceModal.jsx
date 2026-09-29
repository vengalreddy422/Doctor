import React from 'react';
import '../styles/Invoice.css';

const InvoiceModal = ({ data, onClose }) => {
  if (!data) return null;

  // Normalize data whether passed from appointment or payment
  const isPayment = !!data.razorpay_order_id || !!data.razorpay_payment_id;
  const receiptId = data.receipt_id || (isPayment ? `RCP-${data.id}` : `APT-${data.id}`);
  const doctorName = data.doctor_name || (data.doctor ? data.doctor.name : 'Specialist');
  const specialization = data.doctor_specialization || (data.doctor ? data.doctor.specialization : 'General Medicine');
  const hospitalName = data.hospital_name || (data.doctor ? data.doctor.hospital_name : 'CareConnect Super Specialty');
  
  const patientName = data.patient_name || data.patient_username || data.patient?.username || 'Valued Patient';
  const patientEmail = data.patient_email || data.patient?.email || 'patient@careconnect.health';
  
  const slotDate = data.slot_date || data.appointment?.slot_date || data.slot?.date || new Date().toISOString().split('T')[0];
  const slotTime = data.slot_time || data.appointment?.slot_time || data.slot?.start_time || '10:00';
  const slotEndTime = data.slot_end_time || data.appointment?.slot_end_time || data.slot?.end_time || '11:00';

  const feeCharged = Number(data.fee_charged || data.amount || 0);
  const discountAmount = Number(data.discount_amount || 0);
  const originalFee = Number(data.original_fee || (discountAmount > 0 ? feeCharged + discountAmount : feeCharged));
  const couponCode = data.coupon_code || null;

  const paymentStatus = (data.status === 'confirmed' || data.status === 'paid' || data.status === 'completed') ? 'PAID' : (data.status || 'PENDING').toUpperCase();
  const paymentMethod = data.razorpay_payment_id ? `Razorpay Online (${data.razorpay_payment_id})` : (paymentStatus === 'PAID' ? 'Online / Net Banking' : 'Pending Payment');
  
  const invoiceDate = data.created_at ? new Date(data.created_at).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
  }) : new Date().toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric'
  });

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="invoice-modal-overlay" onClick={onClose}>
      <div className="invoice-card" onClick={(e) => e.stopPropagation()}>
        <div className="invoice-content">
          {/* Header */}
          <div className="invoice-header">
            <div>
              <div className="invoice-brand-logo">
                Care<span>Connect</span>
              </div>
              <div className="invoice-subhead">
                Healthcare Digital Services &amp; Medical Consultations
              </div>
              <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.2rem' }}>
                GSTIN: 36AAACC1234F1Z5 &middot; CIN: U85110TG2026PTC099882
              </div>
            </div>

            <div className="invoice-meta">
              <span className="invoice-title-badge">TAX INVOICE &amp; RECEIPT</span>
              <div className="invoice-number">{receiptId}</div>
              <div className="invoice-date">Date: {invoiceDate}</div>
            </div>
          </div>

          {/* Parties */}
          <div className="invoice-parties">
            <div className="party-box">
              <div className="party-box-title">Billed To (Patient)</div>
              <div className="party-name">
                {patientName}
                {data.patient_relation && data.patient_relation !== 'Self' ? ` (${data.patient_relation})` : ''}
              </div>
              {data.patient_age && (
                <div className="party-detail">
                  Age &amp; Gender: <strong>{data.patient_age} yrs {data.patient_gender ? `, ${data.patient_gender}` : ''}</strong>
                </div>
              )}
              <div className="party-detail">Account User: {patientEmail}</div>
              <div className="party-detail">CareConnect ID: PAT-{data.patient || '001'}</div>
            </div>

            <div className="party-box">
              <div className="party-box-title">Doctor / Healthcare Provider</div>
              <div className="party-name">Dr. {doctorName}</div>
              <div className="party-detail">{specialization}</div>
              <div className="party-detail">🏥 {hospitalName}</div>
            </div>
          </div>

          {/* Appointment Schedule Pill */}
          <div className="invoice-appt-info">
            <div className="appt-info-item">
              📅 Appointment Date: <strong>{slotDate}</strong>
            </div>
            <div className="appt-info-item">
              🕒 Time Slot: <strong>{slotTime} - {slotEndTime}</strong>
            </div>
            <div className="appt-info-item">
              🏷️ Mode: <strong>In-Clinic / OPD Consultation</strong>
            </div>
          </div>

          {/* Table Breakdown */}
          <div className="invoice-table-wrapper">
            <table className="invoice-table">
              <thead>
                <tr>
                  <th>Description / SAC Code</th>
                  <th style={{ textAlign: 'center' }}>Qty</th>
                  <th style={{ textAlign: 'right' }}>Standard Fee</th>
                  <th style={{ textAlign: 'right' }}>Total</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>
                    <strong>Doctor Consultation &amp; Assessment</strong>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>SAC: 999312 (Healthcare Services)</div>
                  </td>
                  <td style={{ textAlign: 'center' }}>1</td>
                  <td style={{ textAlign: 'right' }}>₹{originalFee.toFixed(2)}</td>
                  <td style={{ textAlign: 'right', fontWeight: 700 }}>₹{originalFee.toFixed(2)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Summary & Stamp */}
          <div className="invoice-summary">
            <div className="invoice-payment-status">
              {paymentStatus === 'PAID' ? (
                <div className="paid-stamp">
                  ✓ PAYMENT RECEIVED
                </div>
              ) : (
                <div className="pending-stamp">
                  ⏳ PAYMENT PENDING
                </div>
              )}
              <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '0.35rem' }}>
                Payment Method: <strong>{paymentMethod}</strong>
              </div>
            </div>

            <div className="invoice-totals">
              <div className="totals-row">
                <span>Subtotal:</span>
                <span>₹{originalFee.toFixed(2)}</span>
              </div>
              {discountAmount > 0 && (
                <div className="totals-row discount">
                  <span>Coupon Discount ({couponCode}):</span>
                  <span>-₹{discountAmount.toFixed(2)}</span>
                </div>
              )}
              <div className="totals-row">
                <span>Healthcare GST (0% Exempt):</span>
                <span>₹0.00</span>
              </div>
              <div className="totals-row grand-total">
                <span>Total Paid:</span>
                <span>₹{feeCharged.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Legal / Footer Note */}
          <div className="invoice-footer-note">
            This is a computer-generated tax invoice and digital payment receipt for medical consultation services.<br />
            Registered with CareConnect Healthcare Portal &middot; Valid without physical signature.
          </div>
        </div>

        {/* Modal Action Bar */}
        <div className="invoice-actions-bar">
          <button type="button" className="btn btn-outline" onClick={onClose}>
            Close
          </button>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button type="button" className="btn btn-primary" onClick={handlePrint}>
              🖨️ Print / Download PDF
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InvoiceModal;
