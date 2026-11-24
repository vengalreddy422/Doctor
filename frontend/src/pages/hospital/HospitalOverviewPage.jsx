import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { useToast } from '../../context/ToastContext';
import api from '../../api/client';
import {
  LayoutDashboard,
  Users,
  Clock,
  Stethoscope,
  IndianRupee,
  Star,
  CheckCircle2,
  TrendingUp,
  RefreshCw,
  CalendarCheck,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  Info
} from 'lucide-react';
import './HospitalOverviewPage.css';

function MiniSparkline({ data = [], strokeColor = '#0d9488', fillColor = 'rgba(13, 148, 136, 0.1)' }) {
  if (!data || data.length < 2) return null;
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const width = 80;
  const height = 24;
  const points = data.map((val, idx) => {
    const x = (idx / (data.length - 1)) * width;
    const y = height - ((val - min) / range) * (height - 6) - 3;
    return `${x},${y}`;
  });
  const pointsStr = points.join(' ');
  const areaPoints = `0,${height} ${pointsStr} ${width},${height}`;

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="cc-mini-sparkline" style={{ overflow: 'visible' }}>
      <polygon points={areaPoints} fill={fillColor} />
      <polyline fill="none" stroke={strokeColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" points={pointsStr} />
    </svg>
  );
}

export default function HospitalOverviewPage() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [showRevenueTooltip, setShowRevenueTooltip] = useState(false);
  const [data, setData] = useState({
    hospital: { name: 'CareConnect Hospital', city: '' },
    kpis: {
      total_patients: 0,
      completed: 0,
      confirmed: 0,
      pending: 0,
      cancelled: 0,
      checked_in: 0,
      net_revenue: '0.00',
      total_collected: '0.00',
      total_refunded: '0.00',
      active_doctors_count: 0,
      total_doctors_count: 0,
    },
    sparklines: {
      patients: [],
      revenue: [],
    },
    growth: {
      patients_pct: '0.0%',
      revenue_pct: '0.0%',
    },
    fourteen_day_trend: [],
    hourly_arrivals: [],
    doctors_occupancy: [],
    ratings: {
      average_doctor: 0,
      average_hospital: 0,
      average_management: 0,
      total_reviews: 0,
    }
  });

  const fetchAnalytics = useCallback(async (isRefresh = false) => {
    setLoading(true);
    try {
      const url = isRefresh ? '/appointments/hospital/analytics/?refresh=true' : '/appointments/hospital/analytics/';
      const res = await api.get(url);
      setData(res.data);
      if (isRefresh) {
        toast.success('Analytics refreshed with latest PostgreSQL data.');
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to load hospital analytics.');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchAnalytics(false);
  }, [fetchAnalytics]);

  const { kpis, hourly_arrivals, doctors_occupancy, ratings, hospital, sparklines, growth, fourteen_day_trend } = data;

  // Compute maximum arrival count for scaling chart
  const maxArrivalCount = Math.max(1, ...(hourly_arrivals || []).map((h) => h.count || 0));
  const maxTrendVolume = Math.max(1, ...(fourteen_day_trend || []).map((t) => t.volume || 0));

  return (
    <DashboardLayout
      role="hospital"
      title={`${hospital?.name || 'Hospital'} Overview`}
      subtitle="Real-time clinical throughput, doctor capacity utilization, and financial collections."
      breadcrumbs={[
        { label: 'Hospital Portal', path: '/hospital/queue' },
        { label: 'Overview & Analytics' },
      ]}
      actions={
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <Link to="/hospital/queue" className="cc-btn cc-btn-primary cc-btn-sm">
            <Users size={14} />
            <span>Open Queue</span>
          </Link>
          <button
            onClick={() => fetchAnalytics(true)}
            disabled={loading}
            className="cc-btn cc-btn-outline cc-btn-sm"
            title="Bypass 60-second cache and re-aggregate PostgreSQL metrics"
          >
            <RefreshCw size={14} className={loading ? 'spin' : ''} />
            <span>Refresh</span>
          </button>
        </div>
      }
    >
      <div className="cc-overview-container">
        {/* 4-Card Primary KPI Metrics */}
        <section className="cc-kpi-grid" aria-label="Key Performance Indicators">
          {/* Card 1: Total Patients */}
          <div className="cc-kpi-card">
            <div className="cc-kpi-header">
              <span className="cc-kpi-label">Total Patients</span>
              <div className="cc-kpi-icon-wrap navy">
                <Users size={20} />
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
              <div className="cc-kpi-value">{kpis?.total_patients || 0}</div>
              {sparklines?.patients && sparklines.patients.length > 0 && (
                <div title="7-day patient volume sparkline">
                  <MiniSparkline data={sparklines.patients} strokeColor="#2563eb" fillColor="rgba(37, 99, 235, 0.1)" />
                </div>
              )}
            </div>
            <div className="cc-kpi-footer" style={{ justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                <CheckCircle2 size={13} color="#059669" />
                <span>{kpis?.completed || 0} completed &middot; {kpis?.checked_in || 0} in OP</span>
              </div>
              {growth?.patients_pct && (
                <span style={{ fontSize: '0.7rem', fontWeight: 600, color: growth.patients_pct.startsWith('+') ? '#059669' : '#64748b' }}>
                  {growth.patients_pct} (7d)
                </span>
              )}
            </div>
          </div>

          {/* Card 2: Today's Inflow */}
          <div className="cc-kpi-card">
            <div className="cc-kpi-header">
              <span className="cc-kpi-label">Active Queue Inflow</span>
              <div className="cc-kpi-icon-wrap teal">
                <Clock size={20} />
              </div>
            </div>
            <div className="cc-kpi-value">{kpis?.confirmed || 0}</div>
            <div className="cc-kpi-footer">
              <TrendingUp size={13} color="#0d9488" />
              <span>{kpis?.pending || 0} pending confirmation</span>
            </div>
          </div>

          {/* Card 3: Doctors on Duty */}
          <div className="cc-kpi-card">
            <div className="cc-kpi-header">
              <span className="cc-kpi-label">Active Specialists</span>
              <div className="cc-kpi-icon-wrap amber">
                <Stethoscope size={20} />
              </div>
            </div>
            <div className="cc-kpi-value">
              {kpis?.active_doctors_count || 0}
              <span style={{ fontSize: '1rem', color: '#64748b', fontWeight: 500 }}>
                /{kpis?.total_doctors_count || 0}
              </span>
            </div>
            <div className="cc-kpi-footer">
              <ShieldCheck size={13} color="#d97706" />
              <span>Available for consultations today</span>
            </div>
          </div>

          {/* Card 4: Net Revenue */}
          <div className="cc-kpi-card">
            <div className="cc-kpi-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                <span className="cc-kpi-label">Net Revenue</span>
                <button
                  type="button"
                  onClick={() => setShowRevenueTooltip(!showRevenueTooltip)}
                  style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: '#94a3b8' }}
                  title="Revenue Formula Definition"
                  aria-label="Revenue Formula Information"
                >
                  <Info size={14} />
                </button>
              </div>
              <div className="cc-kpi-icon-wrap emerald">
                <IndianRupee size={20} />
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
              <div className="cc-kpi-value">₹{kpis?.net_revenue || '0.00'}</div>
              {sparklines?.revenue && sparklines.revenue.length > 0 && (
                <div title="7-day net revenue sparkline">
                  <MiniSparkline data={sparklines.revenue} strokeColor="#059669" fillColor="rgba(5, 150, 105, 0.1)" />
                </div>
              )}
            </div>
            <div className="cc-kpi-footer" style={{ justifyContent: 'space-between' }}>
              <span>Gross ₹{kpis?.total_collected || '0.00'} &middot; Refunded ₹{kpis?.total_refunded || '0.00'}</span>
              {growth?.revenue_pct && (
                <span style={{ fontSize: '0.7rem', fontWeight: 600, color: growth.revenue_pct.startsWith('+') ? '#059669' : '#64748b' }}>
                  {growth.revenue_pct} (7d)
                </span>
              )}
            </div>

            {/* Explanatory Definition Tooltip Popover */}
            {showRevenueTooltip && (
              <div style={{
                marginTop: '0.5rem',
                padding: '0.625rem 0.75rem',
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '6px',
                fontSize: '0.72rem',
                color: '#475569',
                lineHeight: 1.4
              }}>
                <div><strong>Gross Revenue:</strong> Total collected fees for confirmed/completed appointments.</div>
                <div><strong>Total Refunded:</strong> Sum of full & partial refunds processed on cancellations.</div>
                <div><strong>Net Revenue:</strong> Gross Collections minus Total Refunds retained by hospital.</div>
              </div>
            )}
          </div>
        </section>

        {/* 14-Day Volume & Revenue Trend Panel */}
        {fourteen_day_trend && fourteen_day_trend.length > 0 && (
          <section className="cc-panel-card" aria-label="14-Day Timeline Trend">
            <div className="cc-panel-title-bar">
              <h2 className="cc-panel-title">
                <TrendingUp size={18} color="var(--cc-primary)" />
                14-Day Clinical Volume & Financial Collections Trend
              </h2>
              <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Daily aggregated PostgreSQL series</span>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: `repeat(${fourteen_day_trend.length}, 1fr)`,
              gap: '0.5rem',
              alignItems: 'flex-end',
              height: '140px',
              padding: '1rem 0 0.5rem',
              borderBottom: '1px solid #f1f5f9'
            }}>
              {fourteen_day_trend.map((day) => {
                const heightPct = Math.max(12, (day.volume / maxTrendVolume) * 100);
                return (
                  <div
                    key={day.date}
                    style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end' }}
                    title={`${day.label}: ${day.volume} Appointments | Net ₹${day.net.toFixed(2)} (Gross ₹${day.gross.toFixed(2)} - Refund ₹${day.refunds.toFixed(2)})`}
                  >
                    <span style={{ fontSize: '0.65rem', fontWeight: 600, color: '#475569', marginBottom: '2px' }}>
                      {day.volume > 0 ? day.volume : ''}
                    </span>
                    <div
                      style={{
                        width: '100%',
                        maxWidth: '28px',
                        height: `${heightPct}%`,
                        background: 'linear-gradient(180deg, var(--cc-teal) 0%, var(--cc-primary) 100%)',
                        borderRadius: '4px 4px 0 0',
                        transition: 'height 0.2s ease'
                      }}
                    />
                    <span style={{ fontSize: '0.65rem', color: '#94a3b8', marginTop: '4px', whiteSpace: 'nowrap' }}>
                      {day.label}
                    </span>
                  </div>
                );
              })}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#64748b', marginTop: '0.5rem' }}>
              <span>Hover bars for volume, gross receipts, and refund breakdown</span>
              <span>Values anchored to Asia/Kolkata day boundaries</span>
            </div>
          </section>
        )}

        {/* Two-Column Visual Analytics Section */}
        <section className="cc-overview-panels-grid">
          {/* Panel 1: Hourly Arrivals Distribution */}
          <div className="cc-panel-card">
            <div className="cc-panel-title-bar">
              <h2 className="cc-panel-title">
                <Clock size={18} color="var(--cc-teal)" />
                Hourly Patient Arrival Distribution
              </h2>
              <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Today's Check-ins</span>
            </div>

            {hourly_arrivals && hourly_arrivals.length > 0 ? (
              <div className="cc-hourly-chart-container">
                {hourly_arrivals.map((slot) => {
                  const heightPercent = Math.max(15, (slot.count / maxArrivalCount) * 100);
                  return (
                    <div key={slot.hour} className="cc-hourly-bar-col">
                      <div
                        className="cc-bar-fill"
                        style={{ height: `${heightPercent}%` }}
                      >
                        <span className="cc-bar-count-label">{slot.count}</span>
                      </div>
                      <span className="cc-bar-hour-label">{slot.hour}</span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '2.5rem 1rem', color: '#64748b' }}>
                <Clock size={28} style={{ opacity: 0.4, margin: '0 auto 0.5rem', display: 'block' }} />
                No OP patient check-ins recorded for today yet.
              </div>
            )}
            <div style={{ fontSize: '0.75rem', color: '#64748b', display: 'flex', justifyContent: 'space-between' }}>
              <span>Tracks real admissions via OP Check-In timestamp</span>
              <Link to="/hospital/queue" style={{ color: 'var(--cc-primary)', fontWeight: 600, textDecoration: 'none' }}>
                View Queue &rarr;
              </Link>
            </div>
          </div>

          {/* Panel 2: Specialist Slot Capacity Monitor */}
          <div className="cc-panel-card">
            <div className="cc-panel-title-bar">
              <h2 className="cc-panel-title">
                <CalendarCheck size={18} color="var(--cc-primary)" />
                Specialist Slot Capacity & Occupancy
              </h2>
              <Link to="/hospital/slots" style={{ fontSize: '0.75rem', color: 'var(--cc-primary)', textDecoration: 'none', fontWeight: 600 }}>
                Manage Slots
              </Link>
            </div>

            <div className="cc-doc-occupancy-list">
              {doctors_occupancy && doctors_occupancy.length > 0 ? (
                doctors_occupancy.slice(0, 6).map((doc) => {
                  const rate = doc.occupancy_rate || 0;
                  const barClass = rate >= 80 ? 'red' : rate >= 50 ? 'amber' : 'green';
                  return (
                    <div key={doc.doctor_id} className="cc-doc-occupancy-item">
                      <div className="cc-doc-occupancy-header">
                        <span style={{ fontWeight: 600, color: 'var(--cc-slate-800)' }}>
                          Dr. {doc.doctor_name} ({doc.specialization})
                        </span>
                        <span style={{ fontWeight: 700, color: rate >= 80 ? '#dc2626' : 'var(--cc-slate-700)' }}>
                          {doc.booked_count}/{doc.total_capacity} ({rate}%)
                        </span>
                      </div>
                      <div className="cc-progress-track">
                        <div
                          className={`cc-progress-bar ${barClass}`}
                          style={{ width: `${Math.min(100, rate)}%` }}
                        />
                      </div>
                    </div>
                  );
                })
              ) : (
                <div style={{ textAlign: 'center', padding: '2rem 1rem', color: '#64748b' }}>
                  No active doctors or slots configured for today.
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Patient Satisfaction & Quick Links Section */}
        <section className="cc-overview-panels-grid">
          {/* Patient Satisfaction Score */}
          <div className="cc-panel-card">
            <div className="cc-panel-title-bar">
              <h2 className="cc-panel-title">
                <Star size={18} color="#eab308" />
                Patient Satisfaction & Ratings
              </h2>
              <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                {ratings?.total_reviews || 0} Reviews
              </span>
            </div>

            <div className="cc-ratings-summary-grid">
              <div className="cc-rating-tile">
                <span className="cc-rating-num">{ratings?.average_doctor || 0} ★</span>
                <span className="cc-rating-label">Doctor Care</span>
              </div>
              <div className="cc-rating-tile">
                <span className="cc-rating-num">{ratings?.average_hospital || 0} ★</span>
                <span className="cc-rating-label">Hospital Facilities</span>
              </div>
              <div className="cc-rating-tile">
                <span className="cc-rating-num">{ratings?.average_management || 0} ★</span>
                <span className="cc-rating-label">Staff & Support</span>
              </div>
            </div>
          </div>

          {/* Quick Operations Navigation */}
          <div className="cc-panel-card">
            <div className="cc-panel-title-bar">
              <h2 className="cc-panel-title">
                <LayoutDashboard size={18} color="var(--cc-primary)" />
                Direct Facility Operations
              </h2>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem' }}>
              <Link to="/hospital/doctors" className="cc-btn cc-btn-outline" style={{ justifyContent: 'space-between', padding: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Stethoscope size={16} color="var(--cc-teal)" />
                  <span>Doctors Roster</span>
                </div>
                <ArrowRight size={14} opacity={0.6} />
              </Link>

              <Link to="/hospital/slots" className="cc-btn cc-btn-outline" style={{ justifyContent: 'space-between', padding: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <CalendarCheck size={16} color="var(--cc-primary)" />
                  <span>Slots Monitor</span>
                </div>
                <ArrowRight size={14} opacity={0.6} />
              </Link>

              <Link to="/hospital/emergency" className="cc-btn cc-btn-outline" style={{ justifyContent: 'space-between', padding: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <AlertTriangle size={16} color="#d97706" />
                  <span>Emergency Hub</span>
                </div>
                <ArrowRight size={14} opacity={0.6} />
              </Link>

              <Link to="/hospital/payments" className="cc-btn cc-btn-outline" style={{ justifyContent: 'space-between', padding: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <IndianRupee size={16} color="#059669" />
                  <span>Cashier Ledger</span>
                </div>
                <ArrowRight size={14} opacity={0.6} />
              </Link>
            </div>
          </div>
        </section>
      </div>
    </DashboardLayout>
  );
}
