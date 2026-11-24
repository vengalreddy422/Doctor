import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout';
import InvoiceModal from '../../components/InvoiceModal';
import { useToast } from '../../context/ToastContext';
import api from '../../api/client';
import {
  Receipt,
  Search,
  IndianRupee,
  TrendingUp,
  RotateCcw,
  CheckCircle2,
  FileText,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  CreditCard
} from 'lucide-react';
import './HospitalPages.css';
import './HospitalQueuePage.css';

export default function HospitalPaymentsPage() {
  const toast = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  const page = parseInt(searchParams.get('page') || '1', 10);
  const pageSize = parseInt(searchParams.get('page_size') || '10', 10);
  const search = searchParams.get('search') || '';
  const range = searchParams.get('range') || 'all';
  const statusFilter = searchParams.get('status') || 'all';

  const [loading, setLoading] = useState(true);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [data, setData] = useState({
    count: 0,
    total_pages: 1,
    current_page: 1,
    page_size: 10,
    totals: {
      gross_collected: '0.00',
      refunded: '0.00',
      net_collections: '0.00',
      transaction_volume: 0,
    },
    results: []
  });

  const fetchPayments = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', page.toString());
      params.set('page_size', pageSize.toString());
      if (search) params.set('search', search);
      if (range !== 'all') params.set('range', range);
      if (statusFilter !== 'all') params.set('status', statusFilter);

      const res = await api.get(`/appointments/hospital/payments/?${params.toString()}`);
      setData(res.data);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to fetch financial ledger.');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search, range, statusFilter]);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  const updateParam = (key, value) => {
    const nextParams = new URLSearchParams(searchParams);
    if (value && value !== 'all') {
      nextParams.set(key, value);
    } else {
      nextParams.delete(key);
    }
    if (key !== 'page') {
      nextParams.set('page', '1');
    }
    setSearchParams(nextParams);
  };

  const { totals } = data;

  return (
    <DashboardLayout
      role="hospital"
      title="OPD Cashier Financial Ledger"
      subtitle="Complete accounting ledger of consultation fees collected, Razorpay reconciliations, and refunds."
      breadcrumbs={[
        { label: 'Hospital Portal', path: '/hospital/queue' },
        { label: 'Financial Ledger' },
      ]}
      actions={
        <button
          onClick={fetchPayments}
          disabled={loading}
          className="cc-btn cc-btn-outline cc-btn-sm"
        >
          <RefreshCw size={14} className={loading ? 'spin' : ''} />
          <span>Refresh</span>
        </button>
      }
    >
      <div className="cc-queue-container">
        {/* Financial Summary Metric Cards */}
        <section className="cc-kpi-grid" aria-label="Financial Totals">
          <div className="cc-kpi-card">
            <div className="cc-kpi-header">
              <span className="cc-kpi-label">Net Collections</span>
              <div className="cc-kpi-icon-wrap emerald">
                <IndianRupee size={20} />
              </div>
            </div>
            <div className="cc-kpi-value">₹{totals?.net_collections || '0.00'}</div>
            <div className="cc-kpi-footer">
              <CheckCircle2 size={13} color="#059669" />
              <span>Net consultation revenue retained</span>
            </div>
          </div>

          <div className="cc-kpi-card">
            <div className="cc-kpi-header">
              <span className="cc-kpi-label">Gross Paid Fees</span>
              <div className="cc-kpi-icon-wrap teal">
                <TrendingUp size={20} />
              </div>
            </div>
            <div className="cc-kpi-value">₹{totals?.gross_collected || '0.00'}</div>
            <div className="cc-kpi-footer">
              <span>Total inward receipts</span>
            </div>
          </div>

          <div className="cc-kpi-card">
            <div className="cc-kpi-header">
              <span className="cc-kpi-label">Full Refunds Processed</span>
              <div className="cc-kpi-icon-wrap amber">
                <RotateCcw size={20} />
              </div>
            </div>
            <div className="cc-kpi-value" style={{ color: '#dc2626' }}>
              ₹{totals?.refunded || '0.00'}
            </div>
            <div className="cc-kpi-footer">
              <span>100% full patient refunds</span>
            </div>
          </div>

          <div className="cc-kpi-card">
            <div className="cc-kpi-header">
              <span className="cc-kpi-label">Transaction Volume</span>
              <div className="cc-kpi-icon-wrap navy">
                <Receipt size={20} />
              </div>
            </div>
            <div className="cc-kpi-value">{totals?.transaction_volume || 0}</div>
            <div className="cc-kpi-footer">
              <span>Electronic payment events</span>
            </div>
          </div>
        </section>

        {/* Filter Toolbar */}
        <div className="cc-queue-toolbar">
          <div className="cc-queue-toolbar-top">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              <div style={{ position: 'relative', width: '260px' }}>
                <input
                  type="text"
                  placeholder="Search patient, order, payment ID..."
                  value={search}
                  onChange={(e) => updateParam('search', e.target.value)}
                  className="cc-filter-input"
                  style={{ paddingLeft: '2rem' }}
                />
                <Search size={14} style={{ position: 'absolute', left: '0.65rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              </div>

              <select
                value={range}
                onChange={(e) => updateParam('range', e.target.value)}
                className="cc-filter-select"
                style={{ width: '150px' }}
              >
                <option value="all">All Dates</option>
                <option value="today">Today</option>
                <option value="yesterday">Yesterday</option>
                <option value="past_7">Past 7 Days</option>
                <option value="this_month">This Month</option>
              </select>

              <select
                value={statusFilter}
                onChange={(e) => updateParam('status', e.target.value)}
                className="cc-filter-select"
                style={{ width: '150px' }}
              >
                <option value="all">All Payment States</option>
                <option value="paid">Paid & Captured</option>
                <option value="refunded">100% Refunded</option>
              </select>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.8125rem', color: '#64748b' }}>Show:</span>
              <select
                value={pageSize}
                onChange={(e) => updateParam('page_size', e.target.value)}
                className="cc-filter-select"
                style={{ width: 'auto', height: '32px', fontSize: '0.8125rem' }}
              >
                <option value="10">10 / page</option>
                <option value="25">25 / page</option>
                <option value="50">50 / page</option>
              </select>
            </div>
          </div>
        </div>

        {/* Ledger Table */}
        <div className="cc-card-table">
          <div className="cc-table-wrapper">
            <table className="cc-table">
              <thead>
                <tr>
                  <th>Patient Account</th>
                  <th>Payment Gateway IDs</th>
                  <th>Attending Doctor</th>
                  <th>Amount</th>
                  <th>Gateway Status</th>
                  <th>Transaction Time</th>
                  <th>Tax Invoice</th>
                </tr>
              </thead>
              <tbody>
                {loading && data.results.length === 0 ? (
                  <tr>
                    <td colSpan="7" style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
                      <RefreshCw size={24} className="spin" style={{ margin: '0 auto 0.5rem', display: 'block', color: 'var(--cc-primary)' }} />
                      Loading cashier ledger...
                    </td>
                  </tr>
                ) : data.results.length === 0 ? (
                  <tr>
                    <td colSpan="7" style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
                      <Receipt size={36} style={{ margin: '0 auto 0.75rem', display: 'block', opacity: 0.4 }} />
                      No cashier payment transactions match your query.
                    </td>
                  </tr>
                ) : (
                  data.results.map((pay) => {
                    const isPaid = pay.status === 'paid';
                    const isRefunded = pay.status === 'refunded';
                    const patientName = pay.patient?.username || pay.patient?.email || 'Patient';
                    const doctorName = pay.appointment?.doctor?.name || 'Attending Doctor';
                    const formattedDate = pay.created_at ? new Date(pay.created_at).toLocaleString('en-IN', {
                      day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
                    }) : '';

                    return (
                      <tr key={pay.id}>
                        <td>
                          <div style={{ fontWeight: 600, color: 'var(--cc-slate-900)' }}>
                            {patientName}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                            {pay.patient?.email}
                          </div>
                        </td>

                        <td>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', fontFamily: 'var(--cc-font-mono)', fontSize: '0.75rem' }}>
                            {pay.razorpay_order_id && (
                              <span style={{ color: 'var(--cc-slate-700)' }}>
                                Order: {pay.razorpay_order_id}
                              </span>
                            )}
                            {pay.razorpay_payment_id ? (
                              <span style={{ color: '#0284c7' }}>
                                Pay: {pay.razorpay_payment_id}
                              </span>
                            ) : (
                              <span style={{ color: '#94a3b8' }}>Manual / Cashier</span>
                            )}
                          </div>
                        </td>

                        <td>
                          <div style={{ fontWeight: 600, color: 'var(--cc-slate-900)' }}>
                            Dr. {doctorName}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--cc-teal-dark)' }}>
                            {pay.appointment?.doctor?.specialization || 'Clinical Consultation'}
                          </div>
                        </td>

                        <td>
                          <span style={{ fontWeight: 800, color: isRefunded ? '#dc2626' : 'var(--cc-slate-900)' }}>
                            ₹{pay.amount || 0}
                          </span>
                        </td>

                        <td>
                          <span
                            className="cc-status-pill"
                            style={{
                              background: isPaid ? '#ecfdf5' : isRefunded ? '#fef2f2' : '#fffbeb',
                              color: isPaid ? '#065f46' : isRefunded ? '#991b1b' : '#92400e',
                              borderColor: isPaid ? '#a7f3d0' : isRefunded ? '#fecaca' : '#fde68a',
                            }}
                          >
                            {isPaid ? 'Paid & Captured' : isRefunded ? '100% Refunded' : pay.status}
                          </span>
                        </td>

                        <td>
                          <span style={{ fontSize: '0.8125rem', color: '#64748b' }}>
                            {formattedDate}
                          </span>
                        </td>

                        <td>
                          <button
                            type="button"
                            onClick={() => setSelectedInvoice(pay.appointment || pay)}
                            className="cc-btn cc-btn-outline cc-btn-sm"
                            title="Generate Official Receipt"
                          >
                            <FileText size={13} />
                            <span>Tax Invoice</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          <div className="cc-pagination-bar">
            <div className="cc-page-info">
              Showing <strong>{data.results.length}</strong> of <strong>{data.count}</strong> transactions &middot; Page <strong>{data.current_page}</strong> of <strong>{data.total_pages || 1}</strong>
            </div>

            <div className="cc-pagination-controls">
              <button
                type="button"
                onClick={() => updateParam('page', Math.max(1, page - 1).toString())}
                disabled={page <= 1 || loading}
                className="cc-btn cc-btn-outline cc-btn-sm"
              >
                <ChevronLeft size={14} />
                <span>Previous</span>
              </button>

              <span style={{ fontSize: '0.8125rem', padding: '0 0.5rem', fontWeight: 600 }}>
                {data.current_page} / {data.total_pages || 1}
              </span>

              <button
                type="button"
                onClick={() => updateParam('page', (page + 1).toString())}
                disabled={page >= data.total_pages || loading}
                className="cc-btn cc-btn-outline cc-btn-sm"
              >
                <span>Next</span>
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Invoice Modal */}
      {selectedInvoice && (
        <InvoiceModal
          data={selectedInvoice}
          onClose={() => setSelectedInvoice(null)}
        />
      )}
    </DashboardLayout>
  );
}
