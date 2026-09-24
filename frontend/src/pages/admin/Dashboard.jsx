import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Package, Users, ShoppingBag, DollarSign, ShoppingBasket,
  TrendingUp, TrendingDown, Minus, AlertTriangle, Clock, Eye, XCircle,
  Truck, CheckCircle2, ArrowRight, UserCheck, ShieldCheck, ChevronRight
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts';
import { fetchDashboard } from '../../api/admin';
import { fetchDeliveryStats, fetchCodReconciliation, fetchAdminDeliveries } from '../../api/delivery';
import { getErrorMessage } from '../../api/client';
import { formatPrice, formatDate, statusLabel, statusClass, deliveryStatusLabel, deliveryStatusColor, shippingMethodLabel } from '../../utils/helpers';
import AdminLoading from '../../components/admin/AdminLoading';
import AdminError from '../../components/admin/AdminError';
import AdminEmpty from '../../components/admin/AdminEmpty';
import AdminCodModal from './deliveries/AdminCodModal';

function StatCard({ icon: Icon, label, value, change, changeLabel, iconBg, iconColor }) {
  const isPositive = change && change > 0;
  const isNegative = change && change < 0;
  const ChangeIcon = isPositive ? TrendingUp : isNegative ? TrendingDown : Minus;
  const changeColor = isPositive ? 'var(--success)' : isNegative ? 'var(--danger)' : 'var(--text-muted)';
  
  return (
    <div className="hg-stat-card">
      <div className="hg-stat-icon" style={{ background: iconBg }}>
        <Icon size={22} color={iconColor} />
      </div>
      <div className="hg-stat-content">
        <div className="hg-stat-value">{value}</div>
        <div className="hg-stat-label">{label}</div>
        {change !== undefined && change !== null && (
          <div className="hg-stat-change" style={{ color: changeColor }}>
            <ChangeIcon size={12} />
            <span>{change >= 0 ? '+' : ''}{change.toFixed(1)}%</span>
            <span className="hg-stat-change-label">{changeLabel}</span>
          </div>
        )}
      </div>
    </div>
  );
}

function formatCompact(n) {
  if (n == null) return '0';
  return new Intl.NumberFormat('vi-VN').format(n);
}

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [timeRange, setTimeRange] = useState(7);
  const [deliveryStats, setDeliveryStats] = useState(null);
  const [codStats, setCodStats] = useState(null);
  const [recentDeliveries, setRecentDeliveries] = useState([]);
  const [codModalOpen, setCodModalOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [dashRes, delStatsRes, codStatsRes, recentDelRes] = await Promise.all([
        fetchDashboard(),
        fetchDeliveryStats().catch(() => null),
        fetchCodReconciliation().catch(() => null),
        fetchAdminDeliveries({ page: 0, size: 5 }).catch(() => null),
      ]);
      setData(dashRes);
      if (delStatsRes) setDeliveryStats(delStatsRes);
      if (codStatsRes) setCodStats(codStatsRes);
      if (recentDelRes && recentDelRes.content) setRecentDeliveries(recentDelRes.content);
    } catch (err) {
      setError(getErrorMessage(err, 'Không tải được dashboard'));
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return <AdminLoading label="Đang tải dashboard..." />;
  if (error) return <AdminError message={error} onRetry={load} />;
  if (!data) return <AdminEmpty title="Chưa có dữ liệu dashboard" />;

  const revenueChart = (data.revenueByDay || []).slice(-timeRange).map((p) => ({
    label: p.label,
    revenue: Number(p.value || 0),
  }));
  const ordersChart = (data.ordersByDay || []).slice(-timeRange).map((p) => ({
    label: p.label,
    orders: Number(p.count || p.value || 0),
  }));

  const totalRevenue = data.totalRevenue || 0;
  const totalOrders = data.totalOrders || 0;
  const totalUsers = data.totalUsers || 0;
  const totalProducts = data.totalProducts || 0;
  const completedOrders = data.completedOrders || 0;
  const cancelledOrders = data.cancelledOrders || 0;
  const conversionRate = totalOrders > 0 ? ((completedOrders / totalOrders) * 100).toFixed(1) : 0;
  const avgOrderValue = completedOrders > 0 ? (totalRevenue / completedOrders) : 0;

  const lowStock = (data.lowStockProducts || []).slice(0, 5);
  const recentOrders = (data.recentOrders || []).slice(0, 5);
  const topProducts = (data.topProducts || []).slice(0, 5);

  return (
    <div className="hg-dashboard">
      {/* ── Header ── */}
      <div className="hg-dashboard-header">
        <div>
          <h1 className="hg-dashboard-title">Dashboard</h1>
          <p className="hg-dashboard-subtitle">Tổng quan hiệu suất kinh doanh</p>
        </div>
        <div className="hg-dashboard-range">
          <label className="hg-range-label">Khoảng thời gian</label>
          <select
            className="hg-range-select"
            value={timeRange}
            onChange={(e) => setTimeRange(Number(e.target.value))}
          >
            <option value={7}>7 ngày qua</option>
            <option value={30}>30 ngày qua</option>
            <option value={90}>90 ngày qua</option>
          </select>
        </div>
      </div>

      {/* ── Key Metrics ── */}
      <div className="hg-stat-grid">
        <StatCard
          icon={DollarSign}
          label="Tổng doanh thu"
          value={formatPrice(totalRevenue)}
          change={data.revenueChangePercent}
          changeLabel="so với kỳ trước"
          iconBg="#fef3c7"
          iconColor="#92400e"
        />
        <StatCard
          icon={ShoppingBag}
          label="Tổng đơn hàng"
          value={formatCompact(totalOrders)}
          change={data.ordersChangePercent}
          changeLabel="so với kỳ trước"
          iconBg="#dbeafe"
          iconColor="#1e40af"
        />
        <StatCard
          icon={Users}
          label="Khách hàng"
          value={formatCompact(totalUsers)}
          change={data.usersChangePercent}
          changeLabel="so với kỳ trước"
          iconBg="#d1fae5"
          iconColor="#065f46"
        />
        <StatCard
          icon={Package}
          label="Sản phẩm"
          value={formatCompact(totalProducts)}
          iconBg="#ede9fe"
          iconColor="#5b21b6"
        />
      </div>

      {/* ── Secondary Metrics ── */}
      <div className="hg-stat-grid hg-stat-grid-secondary">
        <div className="hg-stat-card hg-stat-card-secondary">
          <div className="hg-stat-icon" style={{ background: '#fff7ed' }}>
            <TrendingUp size={22} color="#ea580c" />
          </div>
          <div className="hg-stat-content">
            <div className="hg-stat-value" style={{ color: '#ea580c' }}>{conversionRate}%</div>
            <div className="hg-stat-label">Tỷ lệ hoàn thành</div>
            <div className="hg-stat-change-label">{completedOrders}/{totalOrders} đơn</div>
          </div>
        </div>
        <div className="hg-stat-card hg-stat-card-secondary">
          <div className="hg-stat-icon" style={{ background: '#fef2f2' }}>
            <XCircle size={22} color="#ef4444" />
          </div>
          <div className="hg-stat-content">
            <div className="hg-stat-value" style={{ color: '#ef4444' }}>{cancelledOrders}</div>
            <div className="hg-stat-label">Đơn đã hủy</div>
            <div className="hg-stat-change-label">{(totalOrders > 0 ? ((cancelledOrders / totalOrders) * 100).toFixed(1) : 0)}% tổng đơn</div>
          </div>
        </div>
        <div className="hg-stat-card hg-stat-card-secondary">
          <div className="hg-stat-icon" style={{ background: '#f0fdf4' }}>
            <DollarSign size={22} color="#10b981" />
          </div>
          <div className="hg-stat-content">
            <div className="hg-stat-value">{formatPrice(avgOrderValue)}</div>
            <div className="hg-stat-label">Giá trị đơn trung bình</div>
            <div className="hg-stat-change-label">Trên đơn hoàn thành</div>
          </div>
        </div>
        <div className="hg-stat-card hg-stat-card-secondary">
          <div className="hg-stat-icon" style={{ background: '#fafafa' }}>
            <Clock size={22} color="#6b7280" />
          </div>
          <div className="hg-stat-content">
            <div className="hg-stat-value">{timeRange} ngày</div>
            <div className="hg-stat-label">Khoảng phân tích</div>
            <div className="hg-stat-change-label">Doanh thu & đơn hàng</div>
          </div>
        </div>
      </div>

      {/* ── Logistics & Delivery Operations Hub (Phase 12) ── */}
      <div className="card hg-logistics-hub" style={{ padding: '24px', borderRadius: '16px', border: '1px solid var(--border)', background: 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)', boxShadow: '0 4px 20px -2px rgba(0,0,0,0.05)' }}>
        {/* Hub Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px', marginBottom: '20px', paddingBottom: '16px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{
              width: 48, height: 48, borderRadius: 14,
              background: 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 8px 16px -4px rgba(59, 130, 246, 0.35)'
            }}>
              <Truck size={24} color="#ffffff" />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
                  Trung Tâm Vận Chuyển & Logistics
                </h3>
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: '5px',
                  padding: '2px 8px', borderRadius: '12px',
                  fontSize: '11px', fontWeight: 700,
                  background: '#ecfdf5', color: '#059669', border: '1px solid #a7f3d0'
                }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />
                  Trực tiếp
                </span>
              </div>
              <p style={{ margin: '3px 0 0', fontSize: '13px', color: 'var(--text-muted)' }}>
                Giám sát điều phối đơn hàng, hiệu suất đội ngũ giao vận và dòng tiền thu hộ COD
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              type="button"
              onClick={() => setCodModalOpen(true)}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '6px',
                padding: '8px 14px', borderRadius: '10px',
                background: '#fef3c7', color: '#92400e', border: '1px solid #fde68a',
                fontSize: '13px', fontWeight: 600, cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = '#fde68a'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = '#fef3c7'; }}
            >
              <DollarSign size={15} />
              <span>Đối soát COD</span>
            </button>

            <Link
              to="/admin/deliveries"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '6px',
                padding: '8px 16px', borderRadius: '10px',
                background: '#0a3d8f', color: '#ffffff',
                fontSize: '13px', fontWeight: 600, textDecoration: 'none',
                boxShadow: '0 4px 12px rgba(10, 61, 143, 0.25)',
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-1px)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; }}
            >
              <span>Quản lý vận chuyển</span>
              <ArrowRight size={15} />
            </Link>
          </div>
        </div>

        {/* 5 Logistics Metric Cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '14px',
          marginBottom: '20px'
        }}>
          {/* Card 1: Chờ phân công */}
          <Link
            to="/admin/deliveries?status=PENDING_ASSIGNMENT"
            style={{ textDecoration: 'none', color: 'inherit' }}
            className="hg-delivery-metric-card"
          >
            <div style={{
              background: 'var(--bg-card)', border: '1px solid #fef08a', borderRadius: '12px',
              padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px',
              position: 'relative', overflow: 'hidden', height: '100%',
              boxShadow: '0 2px 6px rgba(0,0,0,0.02)', transition: 'all 0.2s ease'
            }}>
              <div style={{ position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', background: '#f59e0b' }} />
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '12px', fontWeight: 600, color: '#92400e' }}>Chờ phân công</span>
                <span style={{
                  padding: '2px 8px', borderRadius: '999px', fontSize: '10px', fontWeight: 700,
                  background: '#fef3c7', color: '#b45309'
                }}>Cần xử lý</span>
              </div>
              <div style={{ fontSize: '24px', fontWeight: 800, color: '#b45309' }}>
                {deliveryStats ? deliveryStats.pendingAssignment : 0}
              </div>
              <div style={{ fontSize: '11px', color: '#78350f', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Clock size={12} />
                <span>Đơn hàng chưa gán Shipper</span>
              </div>
            </div>
          </Link>

          {/* Card 2: Đang giao vận */}
          <Link
            to="/admin/deliveries?status=IN_TRANSIT"
            style={{ textDecoration: 'none', color: 'inherit' }}
            className="hg-delivery-metric-card"
          >
            <div style={{
              background: 'var(--bg-card)', border: '1px solid #bae6fd', borderRadius: '12px',
              padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px',
              position: 'relative', overflow: 'hidden', height: '100%',
              boxShadow: '0 2px 6px rgba(0,0,0,0.02)', transition: 'all 0.2s ease'
            }}>
              <div style={{ position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', background: '#0284c7' }} />
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '12px', fontWeight: 600, color: '#0369a1' }}>Đang lưu thông</span>
                <span style={{
                  padding: '2px 8px', borderRadius: '999px', fontSize: '10px', fontWeight: 700,
                  background: '#e0f2fe', color: '#0284c7'
                }}>Đang giao</span>
              </div>
              <div style={{ fontSize: '24px', fontWeight: 800, color: '#0284c7' }}>
                {deliveryStats ? (deliveryStats.inTransit + deliveryStats.pickedUp + deliveryStats.arrived + deliveryStats.assigned) : 0}
              </div>
              <div style={{ fontSize: '11px', color: '#0369a1', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Truck size={12} />
                <span>{deliveryStats?.inTransit || 0} trên đường • {deliveryStats?.pickedUp || 0} đã lấy</span>
              </div>
            </div>
          </Link>

          {/* Card 3: Giao thành công */}
          <Link
            to="/admin/deliveries?status=DELIVERED"
            style={{ textDecoration: 'none', color: 'inherit' }}
            className="hg-delivery-metric-card"
          >
            <div style={{
              background: 'var(--bg-card)', border: '1px solid #a7f3d0', borderRadius: '12px',
              padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px',
              position: 'relative', overflow: 'hidden', height: '100%',
              boxShadow: '0 2px 6px rgba(0,0,0,0.02)', transition: 'all 0.2s ease'
            }}>
              <div style={{ position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', background: '#10b981' }} />
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '12px', fontWeight: 600, color: '#047857' }}>Giao thành công</span>
                <span style={{
                  padding: '2px 8px', borderRadius: '999px', fontSize: '10px', fontWeight: 700,
                  background: '#d1fae5', color: '#047857'
                }}>Hoàn tất</span>
              </div>
              <div style={{ fontSize: '24px', fontWeight: 800, color: '#047857' }}>
                {deliveryStats ? deliveryStats.delivered : 0}
              </div>
              <div style={{ fontSize: '11px', color: '#065f46', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <CheckCircle2 size={12} />
                <span>Hoàn tất bảo mật OTP</span>
              </div>
            </div>
          </Link>

          {/* Card 4: Giao thất bại / Ngoại lệ */}
          <Link
            to="/admin/deliveries?status=DELIVERY_FAILED"
            style={{ textDecoration: 'none', color: 'inherit' }}
            className="hg-delivery-metric-card"
          >
            <div style={{
              background: 'var(--bg-card)', border: '1px solid #fecaca', borderRadius: '12px',
              padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px',
              position: 'relative', overflow: 'hidden', height: '100%',
              boxShadow: '0 2px 6px rgba(0,0,0,0.02)', transition: 'all 0.2s ease'
            }}>
              <div style={{ position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', background: '#ef4444' }} />
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '12px', fontWeight: 600, color: '#b91c1c' }}>Giao thất bại</span>
                <span style={{
                  padding: '2px 8px', borderRadius: '999px', fontSize: '10px', fontWeight: 700,
                  background: '#fee2e2', color: '#b91c1c'
                }}>Cần can thiệp</span>
              </div>
              <div style={{ fontSize: '24px', fontWeight: 800, color: '#dc2626' }}>
                {deliveryStats ? deliveryStats.failed : 0}
              </div>
              <div style={{ fontSize: '11px', color: '#991b1b', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <AlertTriangle size={12} />
                <span>Giao lại hoặc hoàn kho</span>
              </div>
            </div>
          </Link>

          {/* Card 5: Tiền COD đang giữ */}
          <div
            onClick={() => setCodModalOpen(true)}
            style={{ cursor: 'pointer' }}
            className="hg-delivery-metric-card"
          >
            <div style={{
              background: 'var(--bg-card)', border: '1px solid #fed7aa', borderRadius: '12px',
              padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px',
              position: 'relative', overflow: 'hidden', height: '100%',
              boxShadow: '0 2px 6px rgba(0,0,0,0.02)', transition: 'all 0.2s ease'
            }}>
              <div style={{ position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', background: '#ea580c' }} />
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '12px', fontWeight: 600, color: '#c2410c' }}>Tiền COD đang giữ</span>
                <span style={{
                  padding: '2px 8px', borderRadius: '999px', fontSize: '10px', fontWeight: 700,
                  background: '#ffedd5', color: '#c2410c'
                }}>Chờ nộp</span>
              </div>
              <div style={{ fontSize: '20px', fontWeight: 800, color: '#c2410c' }}>
                {formatPrice(codStats ? codStats.totalCodPending : 0)}
              </div>
              <div style={{ fontSize: '11px', color: '#9a3412', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <DollarSign size={12} />
                <span>{codStats?.totalDeliveredCodOrders || 0} đơn COD đã thu</span>
              </div>
            </div>
          </div>
        </div>

        {/* Operational 2-column breakdown */}
        <div className="hg-logistics-grid-details">
          {/* Operations & Success Rate breakdown */}
          <div style={{
            background: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--border)',
            padding: '18px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '16px'
          }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>
                  Hiệu Suất Vận Chuyển
                </h4>
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#059669' }}>
                  {deliveryStats && (deliveryStats.delivered + deliveryStats.failed > 0)
                    ? ((deliveryStats.delivered / (deliveryStats.delivered + deliveryStats.failed)) * 100).toFixed(1)
                    : 100}% thành công
                </span>
              </div>

              {/* Segmented Progress Bar */}
              {(() => {
                const delivered = deliveryStats?.delivered || 0;
                const inTransit = (deliveryStats?.inTransit || 0) + (deliveryStats?.pickedUp || 0) + (deliveryStats?.arrived || 0) + (deliveryStats?.assigned || 0);
                const failed = deliveryStats?.failed || 0;
                const total = delivered + inTransit + failed || 1;
                const pDelivered = (delivered / total) * 100;
                const pInTransit = (inTransit / total) * 100;
                const pFailed = (failed / total) * 100;

                return (
                  <div>
                    <div style={{
                      display: 'flex', height: '10px', borderRadius: '999px',
                      overflow: 'hidden', background: '#f1f5f9', marginBottom: '8px'
                    }}>
                      <div style={{ width: `${pDelivered}%`, background: '#10b981', transition: 'width 0.4s ease' }} title={`Giao thành công: ${delivered}`} />
                      <div style={{ width: `${pInTransit}%`, background: '#0ea5e9', transition: 'width 0.4s ease' }} title={`Đang giao: ${inTransit}`} />
                      <div style={{ width: `${pFailed}%`, background: '#ef4444', transition: 'width 0.4s ease' }} title={`Giao thất bại: ${failed}`} />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />
                        Giao thành công ({delivered})
                      </span>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#0ea5e9', display: 'inline-block' }} />
                        Đang lưu thông ({inTransit})
                      </span>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#ef4444', display: 'inline-block' }} />
                        Thất bại ({failed})
                      </span>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Quick Metrics List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', borderTop: '1px solid #f1f5f9', paddingTop: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px' }}>
                <span style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <UserCheck size={14} color="#0a3d8f" />
                  Đội ngũ Shipper hoạt động:
                </span>
                <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                  {deliveryStats?.activeShippers || 0} nhân sự
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px' }}>
                <span style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Package size={14} color="#059669" />
                  Tổng phiếu vận chuyển:
                </span>
                <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                  {deliveryStats?.total || 0} đơn
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px' }}>
                <span style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <ShieldCheck size={14} color="#f59e0b" />
                  COD đã quyết toán:
                </span>
                <span style={{ fontWeight: 700, color: '#059669' }}>
                  {formatPrice(codStats?.totalCodSettled || 0)}
                </span>
              </div>
            </div>

            {/* Quick Action Buttons */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', paddingTop: '8px' }}>
              <Link
                to="/admin/deliveries?status=PENDING_ASSIGNMENT"
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                  padding: '8px 10px', borderRadius: '8px',
                  background: '#fef3c7', color: '#92400e', textDecoration: 'none',
                  fontSize: '12px', fontWeight: 600, textAlign: 'center'
                }}
              >
                <span>Cần phân công</span>
                <span style={{ background: '#b45309', color: '#fff', borderRadius: '999px', padding: '1px 6px', fontSize: '10px' }}>
                  {deliveryStats?.pendingAssignment || 0}
                </span>
              </Link>
              <Link
                to="/admin/deliveries?status=DELIVERY_FAILED"
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                  padding: '8px 10px', borderRadius: '8px',
                  background: '#fee2e2', color: '#991b1b', textDecoration: 'none',
                  fontSize: '12px', fontWeight: 600, textAlign: 'center'
                }}
              >
                <span>Cần xử lý lại</span>
                <span style={{ background: '#dc2626', color: '#fff', borderRadius: '999px', padding: '1px 6px', fontSize: '10px' }}>
                  {deliveryStats?.failed || 0}
                </span>
              </Link>
            </div>
          </div>

          {/* Live Recent Deliveries Stream */}
          <div style={{
            background: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--border)',
            padding: '18px', display: 'flex', flexDirection: 'column'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Truck size={16} color="#0a3d8f" />
                Phiếu Giao Hàng Gần Đây
              </h4>
              <Link to="/admin/deliveries" style={{ fontSize: '12px', color: '#0a3d8f', fontWeight: 600, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '2px' }}>
                Xem tất cả ({deliveryStats?.total || 0}) <ChevronRight size={13} />
              </Link>
            </div>

            {recentDeliveries.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '30px 10px', color: 'var(--text-muted)', fontSize: '13px' }}>
                <Truck size={32} style={{ margin: '0 auto 8px', opacity: 0.3 }} />
                <p style={{ margin: 0 }}>Chưa có phiếu giao hàng nào trong hệ thống</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
                {recentDeliveries.map((del) => {
                  const statusStyle = deliveryStatusColor[del.status] || { bg: '#f3f4f6', text: '#374151', border: '#e5e7eb' };
                  return (
                    <div
                      key={del.id}
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '10px 12px', borderRadius: '10px',
                        background: 'var(--bg)', border: '1px solid #f1f5f9',
                        fontSize: '12px', gap: '10px', transition: 'all 0.15s ease'
                      }}
                    >
                      {/* Order & Recipient info */}
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <Link
                            to={`/admin/deliveries/${del.id}`}
                            style={{ fontWeight: 700, color: '#0a3d8f', textDecoration: 'none' }}
                          >
                            #{del.orderCode || del.id}
                          </Link>
                          <span style={{
                            fontSize: '10px', padding: '1px 6px', borderRadius: '4px',
                            background: del.shippingMethod === 'EXPRESS' ? '#ede9fe' : del.shippingMethod === 'SAME_DAY' ? '#ffedd5' : '#e0f2fe',
                            color: del.shippingMethod === 'EXPRESS' ? '#6d28d9' : del.shippingMethod === 'SAME_DAY' ? '#c2410c' : '#0369a1',
                            fontWeight: 600
                          }}>
                            {shippingMethodLabel[del.shippingMethod] || del.shippingMethod || 'Tiêu chuẩn'}
                          </span>
                        </div>
                        <div style={{ color: 'var(--text-secondary)', fontSize: '11px', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          <span style={{ fontWeight: 600 }}>{del.receiverName || del.customerName || 'Khách lẻ'}</span>
                          {del.deliveryAddress && ` • ${del.deliveryAddress}`}
                        </div>
                      </div>

                      {/* Shipper & Status */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                        <div style={{ textAlign: 'right' }}>
                          <span style={{
                            display: 'inline-block',
                            padding: '3px 8px', borderRadius: '6px',
                            fontSize: '11px', fontWeight: 600,
                            background: statusStyle.bg,
                            color: statusStyle.text,
                            border: `1px solid ${statusStyle.border || statusStyle.bg}`
                          }}>
                            {deliveryStatusLabel[del.status] || del.status}
                          </span>
                          <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>
                            {del.shipperName ? `Shipper: ${del.shipperName}` : 'Chưa gán'}
                          </div>
                        </div>

                        <Link
                          to={`/admin/deliveries/${del.id}`}
                          title="Xem chi tiết phiếu giao"
                          style={{
                            width: 28, height: 28, borderRadius: 6,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            background: 'var(--bg-card)', border: '1px solid var(--border)',
                            color: 'var(--text-primary)', textDecoration: 'none'
                          }}
                        >
                          <Eye size={13} />
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Charts Row ── */}
      <div className="hg-dashboard-charts">
        {/* Revenue Trend */}
        <div className="card hg-chart-card hg-chart-card-main">
          <div className="hg-chart-head">
            <div>
              <h3>Doanh thu {timeRange} ngày</h3>
              <span className="hg-chart-subtitle">Không tính đơn hủy</span>
            </div>
            <Link to="/admin/reports" className="hg-chart-link">Xem báo cáo chi tiết</Link>
          </div>
          <div className="hg-chart-wrap">
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={revenueChart} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="revFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0a3d8f" stopOpacity={0.2} />
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
                <Area type="monotone" dataKey="revenue" stroke="#0a3d8f" fill="url(#revFill)" strokeWidth={2} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Orders Trend */}
        <div className="card hg-chart-card hg-chart-card-side">
          <div className="hg-chart-head">
            <div>
              <h3>Đơn hàng {timeRange} ngày</h3>
              <span className="hg-chart-subtitle">Tất cả trạng thái</span>
            </div>
          </div>
          <div className="hg-chart-wrap">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={ordersChart} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false}
                  interval={ordersChart.length > 14 ? Math.floor(ordersChart.length / 7) : 0} />
                <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} width={40} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
                  formatter={(v) => [v, 'Đơn hàng']} />
                <Bar dataKey="orders" fill="#f97316" radius={[4, 4, 0, 0]} maxBarWidth={32} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* ── Actionable Tables ── */}
      <div className="hg-dashboard-sections">
        {/* Recent Orders */}
        <div className="card hg-table-card">
          <div className="hg-card-head">
            <h3>Đơn hàng gần đây</h3>
            <Link to="/admin/orders" className="hg-card-link">Xem tất cả <Eye size={14} /></Link>
          </div>
          {recentOrders.length === 0 ? (
            <AdminEmpty icon={ShoppingBag} title="Chưa có đơn hàng" description="Đơn hàng mới sẽ hiện tại đây." />
          ) : (
            <div className="hg-table-scroll">
              <table className="data-table hg-table-compact">
                <thead>
                  <tr>
                    <th style={{ width: 110 }}>Mã đơn</th>
                    <th>Khách hàng</th>
                    <th style={{ width: 120 }}>Trạng thái</th>
                    <th style={{ width: 130 }}>Giá trị</th>
                    <th style={{ width: 140 }}>Thời gian</th>
                    <th style={{ width: 40 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {recentOrders.map((order) => (
                    <tr key={order.id}>
                      <td>
                        <Link to={`/admin/orders/${order.id}`} className="hg-order-code">#{order.orderCode}</Link>
                      </td>
                      <td>
                        <div className="hg-customer-cell">
                          <span className="hg-customer-name">{order.customerName || order.customerUsername || '—'}</span>
                        </div>
                      </td>
                      <td>
                        <span className={`status-badge ${statusClass[order.status]}`}>
                          {statusLabel[order.status] || order.status}
                        </span>
                      </td>
                      <td className="hg-amount">{formatPrice(order.totalAmount)}</td>
                      <td className="text-muted text-sm">{formatDate(order.createdAt)}</td>
                      <td>
                        <Link to={`/admin/orders/${order.id}`} className="hg-action-btn" title="Xem chi tiết">
                          <Eye size={14} />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Top Products & Low Stock */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Top Products */}
          <div className="card hg-table-card">
            <div className="hg-card-head">
              <h3>Sản phẩm bán chạy</h3>
              <Link to="/admin/products" className="hg-card-link">Quản lý</Link>
            </div>
            {topProducts.length === 0 ? (
              <AdminEmpty icon={ShoppingBasket} title="Chưa có dữ liệu" description="Khi có đơn hàng, top sản phẩm sẽ được cập nhật." />
            ) : (
              <div className="hg-top-products-list">
                {topProducts.map((p, idx) => (
                  <div key={p.productId} className="hg-top-product-row">
                    <span className="hg-rank">{idx + 1}</span>
                    <div className="hg-product-thumb-sm">
                      {p.image ? <img src={p.image} alt="" loading="lazy" /> : <Package size={16} />}
                    </div>
                    <div className="hg-product-info">
                      <Link to={`/admin/products/${p.productId}`} className="hg-product-name-link">{p.productName}</Link>
                      <span className="hg-product-meta">Đã bán {formatCompact(p.totalSold)}</span>
                    </div>
                    <span className="hg-product-revenue">{formatPrice(p.revenue || 0)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Low Stock Alert */}
          <div className="card hg-alert-card">
            <div className="hg-alert-head">
              <div className="hg-alert-icon">
                <AlertTriangle size={18} />
              </div>
              <div>
                <h3>Sản phẩm sắp hết hàng</h3>
                <p className="hg-alert-subtitle">{lowStock.length} sản phẩm tồn kho ≤ 10</p>
              </div>
            </div>
            {lowStock.length === 0 ? (
              <div className="hg-alert-empty">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--success)" strokeWidth="2">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
                <p>Tất cả sản phẩm đều đủ hàng</p>
              </div>
            ) : (
              <div className="hg-low-stock-list">
                {lowStock.map((p) => (
                  <div key={p.id} className="hg-low-stock-item">
                    <div className="hg-low-stock-thumb">
                      {p.image ? <img src={p.image} alt="" loading="lazy" /> : <Package size={16} />}
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
            <Link to="/admin/inventory" className="hg-alert-footer">Xem quản lý kho <Eye size={14} /></Link>
          </div>
        </div>
      </div>

      {/* COD Modal */}
      <AdminCodModal
        isOpen={codModalOpen}
        onClose={() => setCodModalOpen(false)}
        onSettled={load}
      />
    </div>
  );
}