import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts';
import { Package, ShoppingBag, DollarSign, XCircle, AlertTriangle, ChevronDown, Calendar, BarChart3, TrendingUp } from 'lucide-react';
import { fetchReportSummary } from '../../api/admin';
import { getErrorMessage } from '../../api/client';
import { formatPrice } from '../../utils/helpers';
import { resolveImageUrl } from '../../utils/imageUrl';
import AdminLoading from '../../components/admin/AdminLoading';
import AdminError from '../../components/admin/AdminError';

const RANGES = [
  { label: '7 ngày', days: 7, granularity: 'day' },
  { label: '30 ngày', days: 30, granularity: 'day' },
  { label: '90 ngày', days: 90, granularity: 'week' },
  { label: '1 năm', days: 365, granularity: 'month' },
];

function toDateStr(date) {
  return date.toISOString().slice(0, 10);
}

function StatCard({ icon: Icon, label, value, color, subtitle }) {
  return (
    <div className="hg-stat-card hg-stat-card-report">
      <div className="hg-stat-icon" style={{ background: color }}>
        <Icon size={22} color="var(--primary)" />
      </div>
      <div className="hg-stat-content">
        <div className="hg-stat-value">{value}</div>
        <div className="hg-stat-label">{label}</div>
        {subtitle && <div className="hg-stat-subtitle">{subtitle}</div>}
      </div>
    </div>
  );
}

function fmtCompact(n) {
  return new Intl.NumberFormat('vi-VN').format(n ?? 0);
}

const COLORS = ['#0a3d8f', '#f97316', '#10b981', '#8b5cf6', '#ec4899', '#06b6d4', '#f59e0b', '#ef4444', '#6366f1', '#14b8a6'];

export default function Reports() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const today = new Date();
  const [to, setTo] = useState(toDateStr(today));
  const [from, setFrom] = useState(toDateStr(new Date(today - 29 * 86400000)));
  const [activeRange, setActiveRange] = useState(30);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [viewMode, setViewMode] = useState('overview'); // overview, revenue, orders, categories, products

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const res = await fetchReportSummary({ from, to });
      setData(res);
    } catch (err) {
      setError(getErrorMessage(err, 'Không tải được báo cáo'));
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [from, to]);

  useEffect(() => { load(); }, [load]);

  const applyRange = (days) => {
    const t = new Date();
    const f = new Date(t - (days - 1) * 86400000);
    setTo(toDateStr(t));
    setFrom(toDateStr(f));
    setActiveRange(days);
    setDatePickerOpen(false);
  };

  const revenueChart = (data?.revenueByDay || []).map((p) => ({
    label: p.label,
    revenue: Number(p.value || 0),
  }));

  const ordersChart = (data?.ordersByDay || []).map((p) => ({
    label: p.label,
    orders: Number(p.count || p.value || 0),
  }));

  const topProducts = (data?.topProducts || []).slice(0, 10);
  const lowStock = data?.lowStockProducts || [];
  const categoryData = data?.categoryStats || [];

  // Prepare category performance data
  const categoryPerformance = categoryData.map((c, i) => ({
    name: c.name,
    revenue: Number(c.revenue || 0),
    orders: Number(c.orders || 0),
    products: Number(c.productCount || 0),
    color: COLORS[i % COLORS.length],
  }));

  // Monthly aggregation for yearly view
  const monthlyRevenue = (data?.revenueByMonth || []).map((m) => ({
    month: m.label,
    revenue: Number(m.value || 0),
  }));

  const monthlyOrders = (data?.ordersByMonth || []).map((m) => ({
    month: m.label,
    orders: Number(m.count || m.value || 0),
  }));

  const totalRevenue = data?.totalRevenue || 0;
  const totalOrders = data?.totalOrders || 0;
  const completedOrders = data?.completedOrders || 0;
  const cancelledOrders = data?.cancelledOrders || 0;
  const avgOrderValue = completedOrders > 0 ? totalRevenue / completedOrders : 0;

  if (loading) return <AdminLoading label="Đang tải báo cáo..." />;
  if (error) return <AdminError message={error} onRetry={load} />;
  if (!data) return null;

  return (
    <div className="hg-reports">
      {/* ── Header & Date Range ── */}
      <div className="hg-reports-header">
        <div>
          <h1 className="hg-reports-title">Báo cáo & Phân tích</h1>
          <p className="hg-reports-subtitle">Hiệu suất kinh doanh từ {from} đến {to}</p>
        </div>
        <div className="hg-reports-toolbar">
          <div className="hg-range-picker" onClick={(e) => e.stopPropagation()}>
            <div className="hg-range-value" onClick={() => setDatePickerOpen(!datePickerOpen)}>
              <span className="hg-range-label">Khoảng thời gian</span>
              <span className="hg-range-selected">{activeRange > 0 ? RANGES.find(r => r.days === activeRange)?.label : 'Tùy chỉnh'}</span>
              <ChevronDown size={14} />
            </div>
            {datePickerOpen && (
              <div className="hg-date-dropdown">
                <div className="hg-date-quick">
                  {RANGES.map((r) => (
                    <button
                      key={r.days}
                      type="button"
                      className={`hg-date-btn ${activeRange === r.days ? 'active' : ''}`}
                      onClick={() => applyRange(r.days)}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
                <div className="hg-date-divider" />
                <div className="hg-date-custom">
                  <label><Calendar size={14} /> Từ</label>
                  <input type="date" className="form-input form-input-sm" value={from} max={to}
                    onChange={(e) => { setFrom(e.target.value); setActiveRange(0); }} />
                  <label><Calendar size={14} /> Đến</label>
                  <input type="date" className="form-input form-input-sm" value={to} min={from} max={toDateStr(today)}
                    onChange={(e) => { setTo(e.target.value); setActiveRange(0); }} />
                  <button type="button" className="btn btn-primary btn-sm" onClick={() => { load(); setDatePickerOpen(false); }}>Áp dụng</button>
                </div>
              </div>
            )}
          </div>
          <div className="hg-view-tabs" role="tablist">
            {[
              { id: 'overview', label: 'Tổng quan', icon: BarChart3 },
              { id: 'revenue', label: 'Doanh thu', icon: DollarSign },
              { id: 'orders', label: 'Đơn hàng', icon: ShoppingBag },
              { id: 'categories', label: 'Danh mục', icon: Package },
              { id: 'products', label: 'Sản phẩm', icon: TrendingUp },
            ].map((tab) => (
              <button
                key={tab.id}
                role="tab"
                aria-selected={viewMode === tab.id}
                className={`hg-view-tab ${viewMode === tab.id ? 'active' : ''}`}
                onClick={() => setViewMode(tab.id)}
              >
                <tab.icon size={16} />
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── KPI Cards ── */}
      <div className="hg-stat-grid hg-stat-grid-report">
        <StatCard icon={DollarSign} label="Doanh thu (không tính hủy)"
          value={formatPrice(totalRevenue)} color="#ffedd5"
          subtitle={completedOrders > 0 ? `TB ${formatPrice(avgOrderValue)}/đơn` : null} />
        <StatCard icon={ShoppingBag} label="Tổng đơn hàng"
          value={fmtCompact(totalOrders)} color="#dbeafe"
          subtitle={`Hoàn thành: ${fmtCompact(completedOrders)}`} />
        <StatCard icon={XCircle} label="Đơn đã hủy"
          value={fmtCompact(cancelledOrders)} color="#fee2e2"
          subtitle={totalOrders > 0 ? `${((cancelledOrders/totalOrders)*100).toFixed(1)}% tỷ lệ hủy` : null} />
        <StatCard icon={Package} label="Danh mục hoạt động"
          value={fmtCompact(categoryData.length)} color="#ede9fe"
          subtitle={`${fmtCompact(categoryData.reduce((s, c) => s + (c.productCount||0), 0))} sản phẩm`} />
      </div>

      {/* ── Content by View Mode ── */}
      {viewMode === 'overview' && (
        <>
          {/* Revenue Trend */}
          <div className="card hg-chart-card hg-chart-card-full">
            <div className="hg-chart-head">
              <div>
                <h3>Xu hướng doanh thu</h3>
                <span className="hg-chart-subtitle">Theo ngày — không tính đơn hủy</span>
              </div>
              <Link to="/admin/reports" className="hg-chart-link" onClick={() => setViewMode('revenue')}>Xem chi tiết</Link>
            </div>
            <div className="hg-chart-wrap">
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={revenueChart} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0a3d8f" stopOpacity={0.18} />
                      <stop offset="95%" stopColor="#0a3d8f" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false}
                    interval={revenueChart.length > 14 ? Math.floor(revenueChart.length / 7) : 0} />
                  <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} width={60} tickLine={false} axisLine={false}
                    tickFormatter={(v) => v >= 1e6 ? `${(v/1e6).toFixed(1)}M` : v >= 1e3 ? `${(v/1e3).toFixed(0)}K` : v} />
                  <Tooltip
                    contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
                    formatter={(v) => [formatPrice(v), 'Doanh thu']}
                    labelFormatter={(label) => `Ngày ${label}`} />
                  <Area type="monotone" dataKey="revenue" stroke="#0a3d8f" fill="url(#revGrad)" strokeWidth={2} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="hg-reports-grid hg-reports-grid-2col">
            {/* Orders Trend */}
            <div className="card hg-chart-card">
              <div className="hg-chart-head">
                <div>
                  <h3>Đơn hàng theo ngày</h3>
                  <span className="hg-chart-subtitle">Tất cả trạng thái</span>
                </div>
                <Link to="/admin/reports" className="hg-chart-link" onClick={() => setViewMode('orders')}>Xem chi tiết</Link>
              </div>
              <div className="hg-chart-wrap">
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={ordersChart} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false}
                      interval={ordersChart.length > 14 ? Math.floor(ordersChart.length / 7) : 0} />
                    <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} width={40} tickLine={false} axisLine={false} allowDecimals={false} />
                    <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
                      formatter={(v) => [v, 'Đơn hàng']} />
                    <Bar dataKey="orders" fill="#f97316" radius={[3, 3, 0, 0]} maxBarWidth={28} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Category Performance - Pie */}
            <div className="card hg-chart-card">
              <div className="hg-chart-head">
                <h3>Doanh thu theo danh mục</h3>
                <Link to="/admin/reports" className="hg-chart-link" onClick={() => setViewMode('categories')}>Xem chi tiết</Link>
              </div>
              {categoryPerformance.length === 0 ? (
                <div className="hg-empty-state">Chưa có dữ liệu danh mục</div>
              ) : (
                <div style={{ display: 'flex', height: 260, gap: 24 }}>
                  <ResponsiveContainer width="45%" height="100%">
                    <PieChart>
                      <Pie
                        data={categoryPerformance}
                        cx="50%" cy="50%"
                        innerRadius={60}
                        outerRadius={90}
                        paddingAngle={2}
                        dataKey="revenue"
                        nameKey="name"
                        label={({ name, percent }) => `${name} ${(percent*100).toFixed(1)}%`}
                        labelLine={false}
                        labelStyle={{ fontSize: 11, fill: '#374151' }}
                      >
                        {categoryPerformance.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip
                        contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
                        formatter={(v) => [formatPrice(v), 'Doanh thu']} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div style={{ flex: 1, overflowY: 'auto', paddingTop: 8 }}>
{categoryPerformance.map((c) => (
                      <div key={c.name} className="hg-legend-item">
                        <span className="hg-legend-color" style={{ background: c.color }} />
                        <div className="hg-legend-info">
                          <span className="hg-legend-name">{c.name}</span>
                          <span className="hg-legend-value">{formatPrice(c.revenue)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="hg-reports-grid hg-reports-grid-2col">
            {/* Top Products */}
            <div className="card hg-table-card">
              <div className="hg-card-head">
                <h3>Top sản phẩm bán chạy</h3>
                <Link to="/admin/reports" className="hg-chart-link" onClick={() => setViewMode('products')}>Xem chi tiết</Link>
              </div>
              {topProducts.length === 0 ? (
                <div className="hg-empty-state">Chưa có dữ liệu bán hàng</div>
              ) : (
                <div className="hg-top-products-table">
                  {topProducts.map((p, i) => (
                    <div key={p.productId} className="hg-top-product-row">
                      <span className="hg-rank">{i + 1}</span>
                      <div className="hg-product-thumb-sm">
                        {p.image ? <img src={resolveImageUrl(p.image)} alt="" loading="lazy" /> : <Package size={16} />}
                      </div>
                      <div className="hg-product-info">
                        <Link to={`/admin/products/${p.productId}`} className="hg-product-name-link">{p.productName}</Link>
                        <span className="hg-product-meta">{fmtCompact(p.totalSold)} SP • {formatPrice(p.revenue || 0)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Low Stock */}
            <div className="card hg-alert-card">
              <div className="hg-alert-head">
                <div className="hg-alert-icon">
                  <AlertTriangle size={18} />
                </div>
                <div>
                  <h3>Tồn kho thấp (≤ 10)</h3>
                  <p className="hg-alert-subtitle">{lowStock.length} sản phẩm cần nhập hàng</p>
                </div>
              </div>
              {lowStock.length === 0 ? (
                <div className="hg-alert-empty success">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--success)" strokeWidth="2">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                    <polyline points="22 4 12 14.01 9 11.01" />
                  </svg>
                  <p>Tất cả sản phẩm đều đủ hàng</p>
                </div>
              ) : (
                <div className="hg-low-stock-list">
                  {lowStock.slice(0, 8).map((p) => (
                    <div key={p.id} className="hg-low-stock-item">
                      <div className="hg-low-stock-thumb">
                        {p.image ? <img src={resolveImageUrl(p.image)} alt="" loading="lazy" /> : <Package size={16} />}
                      </div>
                      <div className="hg-low-stock-info">
                        <Link to={`/admin/products/${p.id}`} className="hg-low-stock-name">{p.name}</Link>
                        {p.categoryName && <span className="hg-low-stock-category">{p.categoryName}</span>}
                      </div>
                      <span className={`hg-low-stock-qty ${p.stock === 0 ? 'out' : p.stock <= 5 ? 'critical' : 'low'}`}>
                        {p.stock}
                      </span>
                    </div>
                  ))}
                </div>
              )}
              <Link to="/admin/inventory" className="hg-alert-footer">Xem quản lý kho</Link>
            </div>
          </div>
        </>
      )}

      {viewMode === 'revenue' && (
        <>
          {/* Revenue Detail - Monthly/Yearly */}
          {(monthlyRevenue.length > 0 || monthlyOrders.length > 0) && (
            <div className="card hg-chart-card hg-chart-card-full">
              <div className="hg-chart-head">
                <h3>Doanh thu & Đơn hàng theo tháng</h3>
                <span className="hg-chart-subtitle">Phân tích theo tháng</span>
              </div>
              <div className="hg-chart-wrap">
                <ResponsiveContainer width="100%" height={350}>
                  <LineChart data={monthlyRevenue.length > 0 ? monthlyRevenue : monthlyOrders} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                    <YAxis yAxisId="left" tick={{ fontSize: 11, fill: '#9ca3af' }} width={60} tickLine={false} axisLine={false}
                      tickFormatter={(v) => v >= 1e6 ? `${(v/1e6).toFixed(1)}M` : v >= 1e3 ? `${(v/1e3).toFixed(0)}K` : v} />
                    <YAxis yAxisId="right" tick={{ fontSize: 11, fill: '#9ca3af' }} width={50} tickLine={false} axisLine={false} orientation="right"
                      tickFormatter={(v) => v} />
                    <Tooltip
                      contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
                      formatter={(v, name) => name === 'revenue' ? [formatPrice(v), 'Doanh thu'] : [v, 'Đơn hàng']} />
                    <Line yAxisId="left" type="monotone" dataKey="revenue" stroke="#0a3d8f" strokeWidth={2.5} dot={false} name="Doanh thu" />
                    <Line yAxisId="right" type="monotone" dataKey="orders" stroke="#f97316" strokeWidth={2.5} dot={false} name="Đơn hàng" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Daily Revenue Detail */}
          <div className="card hg-chart-card hg-chart-card-full">
            <div className="hg-chart-head">
              <h3>Doanh thu chi tiết theo ngày</h3>
              <span className="hg-chart-subtitle">Không tính đơn hủy</span>
            </div>
            <div className="hg-chart-wrap">
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={revenueChart} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="revGrad2" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0a3d8f" stopOpacity={0.18} />
                      <stop offset="95%" stopColor="#0a3d8f" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false}
                    interval={revenueChart.length > 20 ? Math.floor(revenueChart.length / 10) : 0} />
                  <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} width={60} tickLine={false} axisLine={false}
                    tickFormatter={(v) => v >= 1e6 ? `${(v/1e6).toFixed(1)}M` : v >= 1e3 ? `${(v/1e3).toFixed(0)}K` : v} />
                  <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
                    formatter={(v) => [formatPrice(v), 'Doanh thu']} labelFormatter={(l) => `Ngày ${l}`} />
                  <Area type="monotone" dataKey="revenue" stroke="#0a3d8f" fill="url(#revGrad2)" strokeWidth={2} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}

      {viewMode === 'orders' && (
        <>
          <div className="hg-reports-grid hg-reports-grid-2col">
            <div className="card hg-chart-card">
              <div className="hg-chart-head"><h3>Đơn hàng theo ngày</h3></div>
              <div className="hg-chart-wrap">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={ordersChart} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false}
                      interval={ordersChart.length > 20 ? Math.floor(ordersChart.length / 10) : 0} />
                    <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} width={40} tickLine={false} axisLine={false} allowDecimals={false} />
                    <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
                      formatter={(v) => [v, 'Đơn hàng']} />
                    <Bar dataKey="orders" fill="#f97316" radius={[3, 3, 0, 0]} maxBarWidth={32} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="card hg-chart-card">
              <div className="hg-chart-head"><h3>Trạng thái đơn hàng</h3></div>
              <div style={{ padding: '16px 20px' }}>
                {[
                  { label: 'Hoàn thành', value: completedOrders, color: '#10b981', bg: '#d1fae5' },
                  { label: 'Đã hủy', value: cancelledOrders, color: '#ef4444', bg: '#fee2e2' },
                  { label: 'Đang xử lý', value: totalOrders - completedOrders - cancelledOrders, color: '#f59e0b', bg: '#fffbeb' },
                ].map((s) => (
                  <div key={s.label} className="hg-order-status-row">
                    <div className="hg-order-status-info">
                      <span className="hg-order-status-dot" style={{ background: s.color }} />
                      <span className="hg-order-status-label">{s.label}</span>
                    </div>
                    <div className="hg-order-status-value">
                      <span className="hg-order-status-count" style={{ color: s.color }}>{fmtCompact(s.value)}</span>
                      <span className="hg-order-status-pct">{totalOrders > 0 ? ((s.value/totalOrders)*100).toFixed(1) + '%' : '0%'}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Monthly Orders */}
          {monthlyOrders.length > 0 && (
            <div className="card hg-chart-card hg-chart-card-full">
              <div className="hg-chart-head"><h3>Đơn hàng theo tháng</h3></div>
              <div className="hg-chart-wrap">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={monthlyOrders} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={false} />
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} width={40} tickLine={false} axisLine={false} allowDecimals={false} />
                    <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
                      formatter={(v) => [v, 'Đơn hàng']} />
                    <Bar dataKey="orders" fill="#f97316" radius={[3, 3, 0, 0]} maxBarWidth={40} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </>
      )}

      {viewMode === 'categories' && (
        <>
          <div className="card hg-chart-card hg-chart-card-full">
            <div className="hg-chart-head"><h3>Hiệu suất danh mục</h3></div>
            <div className="hg-table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th style={{ width: 50 }}>#</th>
                    <th>Danh mục</th>
                    <th style={{ textAlign: 'right' }}>Sản phẩm</th>
                    <th style={{ textAlign: 'right' }}>Đơn hàng</th>
                    <th style={{ textAlign: 'right' }}>Doanh thu</th>
                    <th style={{ textAlign: 'right' }}>% Tổng</th>
                  </tr>
                </thead>
                <tbody>
                  {categoryPerformance.map((c, i) => (
                    <tr key={c.name}>
                      <td><span className="hg-rank-badge">{i + 1}</span></td>
                      <td><span className="hg-category-name">{c.name}</span></td>
                      <td style={{ textAlign: 'right' }}>{fmtCompact(c.products)}</td>
                      <td style={{ textAlign: 'right' }}>{fmtCompact(c.orders)}</td>
                      <td style={{ textAlign: 'right' }} className="hg-amount">{formatPrice(c.revenue)}</td>
                      <td style={{ textAlign: 'right' }}>
                        <span className="hg-pct-badge" style={{ background: c.color }}>{totalRevenue > 0 ? ((c.revenue/totalRevenue)*100).toFixed(1) + '%' : '0%'}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {viewMode === 'products' && (
        <>
          <div className="card hg-chart-card hg-chart-card-full">
            <div className="hg-chart-head"><h3>Top 10 sản phẩm bán chạy</h3></div>
            <div className="hg-chart-wrap">
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={topProducts} layout="vertical" margin={{ left: 8, right: 16, top: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11, fill: '#9ca3af' }} allowDecimals={false} />
                  <YAxis type="category" dataKey="productName" tick={{ fontSize: 11, fill: '#9ca3af' }} width={120} />
                  <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
                    formatter={(v, name, props) => [`${v} SP — ${formatPrice(props.payload.revenue)}`, 'Đã bán']} />
                  <Bar dataKey="totalSold" fill="#f97316" radius={[0, 4, 4, 0]} name="Đã bán" maxBarWidth={40} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="card hg-table-card">
            <div className="hg-card-head"><h3>Chi tiết top sản phẩm</h3></div>
            <div className="hg-table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th style={{ width: 50 }}>#</th>
                    <th>Sản phẩm</th>
                    <th style={{ textAlign: 'right' }}>Đã bán</th>
                    <th style={{ textAlign: 'right' }}>Doanh thu</th>
                  </tr>
                </thead>
                <tbody>
                  {topProducts.map((p, i) => (
                    <tr key={p.productId}>
                      <td><span className="hg-rank-badge">{i + 1}</span></td>
                      <td>
                        <Link to={`/admin/products/${p.productId}`} className="hg-product-link">
                          <div className="hg-product-thumb">{p.image ? <img src={resolveImageUrl(p.image)} alt="" loading="lazy" /> : <Package size={16} />}</div>
                          <span className="hg-product-name">{p.productName}</span>
                        </Link>
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 700 }}>{fmtCompact(p.totalSold)} SP</td>
                      <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--danger)' }}>{formatPrice(p.revenue || 0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}