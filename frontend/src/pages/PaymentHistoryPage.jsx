import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import InvoiceModal from '../components/InvoiceModal';
import '../styles/Appointments.css';

const PaymentHistoryPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [payments, setPayments] = useState([]);
  const [pagination, setPagination] = useState({ count: 0, num_pages: 1, current_page: 1 });
  const [loading, setLoading] = useState(true);
  const [selectedInvoice, setSelectedInvoice] = useState(null);

  const { user } = useAuth();

  const page = searchParams.get('page') || 1;

  useEffect(() => {
    const fetchPayments = async () => {
      setLoading(true);
      try {
        const res = await api.get('/payments/my-payments/', {
          params: { page: page, page_size: 5 }
        });
        setPayments(res.data.results || []);
        setPagination({
          count: res.data.count,
          num_pages: res.data.num_pages,
          current_page: res.data.current_page,
          has_next: res.data.has_next,
          has_previous: res.data.has_previous,
        });
      } catch (err) {
        console.error("Error fetching payment history:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchPayments();
  }, [page]);

  const handlePageChange = (newPage) => {
    const params = new URLSearchParams(searchParams);
    params.set('page', newPage.toString());
    setSearchParams(params);
  };

  const formatDate = (isoString) => {
    if (!isoString) return '—';
    const d = new Date(isoString);
    return d.toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusBadgeClass = (status) => {
    if (status === 'paid') return 'status-completed';
    if (status === 'failed') return 'status-cancelled';
    return 'status-pending';
  };

  return (
    <div className="container" style={{ paddingTop: '2rem', paddingBottom: '3.5rem' }}>
      <div style={{ marginBottom: '2rem' }}>
        <span className="eyebrow">Account Billing</span>
        <h2>Transaction History</h2>
        <p style={{ color: 'var(--color-ink-soft)', fontSize: '0.95rem' }}>
          Review all consultation fees paid and print billing receipts.
        </p>
      </div>

      <div className="table-responsive">
        <table className="payment-table">
          <thead>
            <tr>
              <th>Date & Time</th>
              <th>Receipt ID</th>
              <th>Consultant / Doctor</th>
              <th>Razorpay ID</th>
              <th>Fee Charged</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="7" style={{ textAlign: 'center', padding: '3rem 0' }}>
                  <div className="spinner"></div>
                </td>
              </tr>
            ) : payments.length > 0 ? (
              payments.map((p) => (
                <tr key={p.id}>
                  <td>{formatDate(p.created_at)}</td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                    {p.receipt_id || `RCP-${p.id}`}
                  </td>
                  <td><strong>Dr. {p.doctor_name || 'Specialist'}</strong></td>
                  <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-ink-soft)', fontSize: '0.8rem' }}>
                    {p.razorpay_payment_id || '—'}
                  </td>
                  <td className="payment-amount">
                    <div style={{ fontWeight: 800 }}>₹{p.amount}</div>
                    {p.coupon_code && Number(p.discount_amount) > 0 && (
                      <div style={{ fontSize: '0.7rem', color: '#047857', fontWeight: 700, marginTop: '0.15rem' }}>
                        Saved ₹{p.discount_amount} ({p.coupon_code})
                      </div>
                    )}
                  </td>
                  <td>
                    <span className={`status-badge ${getStatusBadgeClass(p.status)}`}>
                      {p.status ? p.status.toUpperCase() : 'PENDING'}
                    </span>
                  </td>
                  <td>
                    <button
                      type="button"
                      className="btn btn-sm btn-outline"
                      onClick={() => setSelectedInvoice({
                        ...p,
                        patient_name: user?.username,
                        patient_email: user?.email,
                      })}
                      style={{ fontSize: '0.8rem', padding: '0.3rem 0.65rem' }}
                      title="Generate and Print Invoice"
                    >
                      🧾 Invoice
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="7" style={{ textAlign: 'center', padding: '3rem 1.5rem', color: 'var(--color-ink-muted)' }}>
                  <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem', opacity: 0.5 }}>💳</div>
                  <h4 style={{ marginBottom: '0.25rem' }}>No Transactions Found</h4>
                  <p style={{ fontSize: '0.88rem', marginBottom: 0 }}>You have not made any payments yet on CareConnect.</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination.num_pages > 1 && (
        <div className="pagination">
          {pagination.has_previous ? (
            <button
              type="button"
              onClick={() => handlePageChange(pagination.current_page - 1)}
              className="page-btn"
            >
              &larr;
            </button>
          ) : (
            <span className="disabled page-btn">&larr;</span>
          )}

          <span className="current page-btn active">
            {pagination.current_page} / {pagination.num_pages}
          </span>

          {pagination.has_next ? (
            <button
              type="button"
              onClick={() => handlePageChange(pagination.current_page + 1)}
              className="page-btn"
            >
              &rarr;
            </button>
          ) : (
            <span className="disabled page-btn">&rarr;</span>
          )}
        </div>
      )}

      {/* Invoice Modal */}
      {selectedInvoice && (
        <InvoiceModal
          data={selectedInvoice}
          onClose={() => setSelectedInvoice(null)}
        />
      )}
    </div>
  );
};

export default PaymentHistoryPage;
