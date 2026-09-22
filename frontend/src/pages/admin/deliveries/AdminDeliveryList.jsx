import { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Truck, Search, Eye, UserCheck, RefreshCw, AlertTriangle,
  CheckCircle2, Clock, MapPin, Phone, ShieldAlert, ArrowUpDown, DollarSign, RotateCcw,
  Compass, Table, Map as MapIcon
} from 'lucide-react';
import { fetchAdminDeliveries, fetchDeliveryStats, fetchShippers } from '../../../api/delivery';
import { getErrorMessage } from '../../../api/client';
import { formatDate, formatPrice, deliveryStatusLabel, deliveryStatusColor, shippingMethodLabel } from '../../../utils/helpers';
import AdminLoading from '../../../components/admin/AdminLoading';
import AdminError from '../../../components/admin/AdminError';
import AdminEmpty from '../../../components/admin/AdminEmpty';
import AdminPagination from '../../../components/admin/AdminPagination';
import AssignShipperModal from './AssignShipperModal';
import AdminCodModal from './AdminCodModal';
import AdminRedeliverModal from './AdminRedeliverModal';
import DeliveryMapModal from '../../../components/delivery/DeliveryMapModal';
import AdminFleetMap from '../../../components/delivery/AdminFleetMap';

const PAGE_SIZE = 10;

const STATUS_FILTERS = [
  { value: '', label: 'Tất cả trạng thái' },
  { value: 'PENDING_ASSIGNMENT', label: 'Chờ phân công' },
  { value: 'ASSIGNED', label: 'Đã gán shipper' },
  { value: 'SHIPPER_ACCEPTED', label: 'Shipper đã nhận' },
  { value: 'PICKED_UP', label: 'Đã lấy hàng' },
  { value: 'IN_TRANSIT', label: 'Đang giao hàng' },
  { value: 'ARRIVED', label: 'Đã đến nơi' },
  { value: 'DELIVERED', label: 'Giao thành công' },
  { value: 'DELIVERY_FAILED', label: 'Giao thất bại' },
  { value: 'CANCELLED', label: 'Đã hủy' },
];

const DATE_FILTERS = [
  { value: '', label: 'Tất cả thời gian' },
  { value: 'today', label: 'Hôm nay' },
  { value: 'week', label: '7 ngày qua' },
  { value: 'month', label: '30 ngày qua' },
];

export default function AdminDeliveryList() {
  const [searchParams, setSearchParams] = useSearchParams();

  const [items, setItems] = useState([]);
  const [page, setPage] = useState(Number(searchParams.get('page') || 0));
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [selectedDelivery, setSelectedDelivery] = useState(null);
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [codModalOpen, setCodModalOpen] = useState(false);
  const [redeliverDelivery, setRedeliverDelivery] = useState(null);
  const [mapDelivery, setMapDelivery] = useState(null);
  const [viewMode, setViewMode] = useState('table'); // 'table' | 'fleet_map'
  const [autoRefresh, setAutoRefresh] = useState(true);

  const [stats, setStats] = useState(null);
  const [shippers, setShippers] = useState([]);

  const [keywordInput, setKeywordInput] = useState(searchParams.get('q') || '');
  const [keyword, setKeyword] = useState(searchParams.get('q') || '');
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || '');
  const [shipperFilter, setShipperFilter] = useState(searchParams.get('shipperId') || '');
  const [methodFilter, setMethodFilter] = useState(searchParams.get('method') || '');
  const [dateFilter, setDateFilter] = useState(searchParams.get('dateRange') || '');

  // Load stats and shippers list once
  useEffect(() => {
    fetchDeliveryStats().then(setStats).catch(() => {});
    fetchShippers().then(setShippers).catch(() => {});
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchAdminDeliveries({
        keyword: keyword.trim() || undefined,
        status: statusFilter || undefined,
        shipperId: shipperFilter ? Number(shipperFilter) : undefined,
        shippingMethod: methodFilter || undefined,
        page,
        size: PAGE_SIZE,
      });
      setItems(data.content || []);
      setTotalPages(data.totalPages || 0);
      setTotalElements(data.totalElements || 0);
    } catch (err) {
      setError(getErrorMessage(err, 'Không tải được danh sách phiếu giao hàng'));
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [keyword, statusFilter, shipperFilter, methodFilter, page]);

  useEffect(() => {
    load();
  }, [load]);

  // Tự động đồng bộ thời gian thực cho Admin mỗi 9 giây
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      fetchDeliveryStats().then(setStats).catch(() => {});
      fetchAdminDeliveries({
        keyword: keyword.trim() || undefined,
        status: statusFilter || undefined,
        shipperId: shipperFilter ? Number(shipperFilter) : undefined,
        shippingMethod: methodFilter || undefined,
        page,
        size: PAGE_SIZE,
      }).then((data) => {
        if (data && data.content) {
          setItems(data.content);
          setTotalElements(data.totalElements || 0);
          setTotalPages(data.totalPages || 0);
        }
      }).catch(() => {});
    }, 9000);

    return () => clearInterval(interval);
  }, [autoRefresh, keyword, statusFilter, shipperFilter, methodFilter, page]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(0);
    setKeyword(keywordInput);
    setSearchParams((prev) => {
      const n = new URLSearchParams(prev);
      if (keywordInput.trim()) n.set('q', keywordInput.trim());
      else n.delete('q');
      n.delete('page');
      return n;
    });
  };

  const handleStatusChange = (val) => {
    setStatusFilter(val);
    setPage(0);
    setSearchParams((prev) => {
      const n = new URLSearchParams(prev);
      if (val) n.set('status', val);
      else n.delete('status');
      n.delete('page');
      return n;
    });
  };

  const handleShipperChange = (val) => {
    setShipperFilter(val);
    setPage(0);
    setSearchParams((prev) => {
      const n = new URLSearchParams(prev);
      if (val) n.set('shipperId', val);
      else n.delete('shipperId');
      n.delete('page');
      return n;
    });
  };

  const handleAssignSuccess = (updated) => {
    setToast(`Đã phân công đơn #${updated.orderCode} cho shipper thành công!`);
    setTimeout(() => setToast(''), 4000);
    load();
    fetchDeliveryStats().then(setStats).catch(() => {});
  };

  const canAssign = (status) => {
    return ['PENDING_ASSIGNMENT', 'ASSIGNED', 'DELIVERY_FAILED'].includes(status);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Toast */}
      {toast && (
        <div style={{
          padding: '14px 18px', borderRadius: '12px',
          background: '#059669', color: '#ffffff',
          fontWeight: 600, fontSize: '13px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          boxShadow: '0 4px 14px rgba(5, 150, 105, 0.25)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CheckCircle2 size={18} />
            <span>{toast}</span>
          </div>
          <button type="button" onClick={() => setToast('')} style={{ background: 'none', border: 'none', color: '#ffffff', cursor: 'pointer', fontSize: '14px' }}>
            ✕
          </button>
        </div>
      )}

      {/* Header & Quick stats KPI Bento */}
      <div className="hg-delivery-kpi-grid">
        <div className="hg-delivery-kpi-card kpi-default">
          <div className="hg-kpi-label">Tổng phiếu giao</div>
          <div className="hg-kpi-value">{stats?.total ?? '0'}</div>
        </div>
        <div className="hg-delivery-kpi-card kpi-amber">
          <div className="hg-kpi-label" style={{ color: '#b45309' }}>Chờ gán Shipper</div>
          <div className="hg-kpi-value" style={{ color: '#b45309' }}>{stats?.pendingAssignment ?? '0'}</div>
        </div>
        <div className="hg-delivery-kpi-card kpi-blue">
          <div className="hg-kpi-label" style={{ color: '#1d4ed8' }}>Đã phân công</div>
          <div className="hg-kpi-value" style={{ color: '#1d4ed8' }}>{stats?.assigned ?? '0'}</div>
        </div>
        <div className="hg-delivery-kpi-card kpi-sky">
          <div className="hg-kpi-label" style={{ color: '#0284c7' }}>Đang lưu thông</div>
          <div className="hg-kpi-value" style={{ color: '#0284c7' }}>{stats?.inTransit ?? '0'}</div>
        </div>
        <div className="hg-delivery-kpi-card kpi-emerald">
          <div className="hg-kpi-label" style={{ color: '#047857' }}>Giao thành công</div>
          <div className="hg-kpi-value" style={{ color: '#047857' }}>{stats?.delivered ?? '0'}</div>
        </div>
        <div className="hg-delivery-kpi-card kpi-rose">
          <div className="hg-kpi-label" style={{ color: '#b91c1c' }}>Giao thất bại</div>
          <div className="hg-kpi-value" style={{ color: '#b91c1c' }}>{stats?.failed ?? '0'}</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="hg-delivery-filter-container">
        <div className="hg-delivery-filter-row">
          <form onSubmit={handleSearchSubmit} className="hg-delivery-search-box">
            <Search size={16} />
            <input
              type="text"
              value={keywordInput}
              onChange={(e) => setKeywordInput(e.target.value)}
              placeholder="Tìm theo mã phiếu DL, mã đơn, tên khách, SĐT, địa chỉ..."
            />
          </form>

          <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
            <select
              value={statusFilter}
              onChange={(e) => handleStatusChange(e.target.value)}
              className="hg-delivery-select"
            >
              {STATUS_FILTERS.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>

            <select
              value={shipperFilter}
              onChange={(e) => handleShipperChange(e.target.value)}
              className="hg-delivery-select"
            >
              <option value="">Tất cả Shipper</option>
              {shippers.map((sh) => (
                <option key={sh.id} value={sh.id}>{sh.fullName || sh.username}</option>
              ))}
            </select>

            <select
              value={methodFilter}
              onChange={(e) => { setMethodFilter(e.target.value); setPage(0); }}
              className="hg-delivery-select"
            >
              <option value="">Tất cả phương thức</option>
              <option value="STANDARD">Tiêu chuẩn</option>
              <option value="EXPRESS">Hỏa tốc</option>
              <option value="SAME_DAY">Trong ngày</option>
            </select>

            <select
              value={dateFilter}
              onChange={(e) => { setDateFilter(e.target.value); setPage(0); }}
              className="hg-delivery-select"
            >
              {DATE_FILTERS.map((df) => (
                <option key={df.value} value={df.value}>{df.label}</option>
              ))}
            </select>

            {/* Quick Actions */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: 'auto' }}>
              <Link
                to="/shipper"
                target="_blank"
                rel="noreferrer"
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '6px',
                  padding: '9px 14px', borderRadius: '10px',
                  background: 'linear-gradient(135deg, #ea580c 0%, #c2410c 100%)',
                  color: '#ffffff', textDecoration: 'none',
                  fontSize: '12px', fontWeight: 700, boxShadow: '0 2px 8px rgba(234, 88, 12, 0.25)'
                }}
                title="Mở giao diện dành cho Shipper để thử nghiệm nhận đơn và giao hàng"
              >
                <Truck size={14} />
                <span>Mở Cổng Shipper</span>
              </Link>

              <button
                type="button"
                onClick={() => setCodModalOpen(true)}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '6px',
                  padding: '9px 14px', borderRadius: '10px',
                  background: '#fef3c7', color: '#92400e', border: '1px solid #fde68a',
                  fontSize: '12px', fontWeight: 700, cursor: 'pointer'
                }}
                title="Mở bảng đối soát thu hộ tiền mặt COD"
              >
                <DollarSign size={14} />
                <span>Đối soát COD</span>
              </button>

              <button
                type="button"
                onClick={() => setAutoRefresh(!autoRefresh)}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '6px',
                  padding: '9px 12px', borderRadius: '10px',
                  background: autoRefresh ? '#ecfdf5' : '#f8fafc',
                  border: `1px solid ${autoRefresh ? '#a7f3d0' : 'var(--border)'}`,
                  color: autoRefresh ? '#065f46' : 'var(--text-muted)',
                  fontSize: '12px', fontWeight: 600, cursor: 'pointer'
                }}
                title="Bật/Tắt tự động đồng bộ thời gian thực"
              >
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: autoRefresh ? '#10b981' : '#94a3b8' }} />
                <span>{autoRefresh ? 'Live: BẬT' : 'Live: TẮT'}</span>
              </button>

              <button
                type="button"
                onClick={load}
                style={{
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  width: 36, height: 36, borderRadius: '10px',
                  background: '#ffffff', border: '1px solid var(--border)',
                  color: 'var(--text-primary)', cursor: 'pointer'
                }}
                title="Làm mới danh sách"
              >
                <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Switcher: Bảng danh sách vs Bản đồ giám sát đội xe */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'inline-flex', padding: 4, background: '#f1f5f9', borderRadius: 12, border: '1px solid var(--border)' }}>
          <button
            type="button"
            onClick={() => setViewMode('table')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '7px 16px',
              borderRadius: 9,
              border: 'none',
              background: viewMode === 'table' ? '#ffffff' : 'transparent',
              color: viewMode === 'table' ? '#0a3d8f' : 'var(--text-secondary)',
              fontWeight: viewMode === 'table' ? 800 : 600,
              fontSize: 13,
              cursor: 'pointer',
              boxShadow: viewMode === 'table' ? '0 1px 4px rgba(0,0,0,0.1)' : 'none',
              transition: 'all .15s ease'
            }}
          >
            <Table size={15} />
            <span>Danh sách bảng</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode('fleet_map')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '7px 16px',
              borderRadius: 9,
              border: 'none',
              background: viewMode === 'fleet_map' ? '#ffffff' : 'transparent',
              color: viewMode === 'fleet_map' ? '#0a3d8f' : 'var(--text-secondary)',
              fontWeight: viewMode === 'fleet_map' ? 800 : 600,
              fontSize: 13,
              cursor: 'pointer',
              boxShadow: viewMode === 'fleet_map' ? '0 1px 4px rgba(0,0,0,0.1)' : 'none',
              transition: 'all .15s ease'
            }}
          >
            <MapIcon size={15} />
            <span>Bản đồ giám sát đội xe</span>
          </button>
        </div>

        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
          {viewMode === 'table'
            ? `Hiển thị ${items.length} / ${totalElements} phiếu giao`
            : `Đang giám sát ${items.filter(d => typeof d.currentLatitude === 'number').length} tài xế phát GPS`}
        </div>
      </div>

      {viewMode === 'fleet_map' ? (
        <AdminFleetMap
          deliveries={items}
          loading={loading}
          onRefresh={load}
        />
      ) : (
        /* Main Table */
        <div className="hg-delivery-table-wrapper">
        {loading ? (
          <div style={{ padding: '60px 20px', textAlign: 'center' }}>
            <AdminLoading label="Đang tải danh sách phiếu giao hàng..." />
          </div>
        ) : error ? (
          <div style={{ padding: '40px 20px' }}>
            <AdminError message={error} onRetry={load} />
          </div>
        ) : items.length === 0 ? (
          <div style={{ padding: '60px 20px' }}>
            <AdminEmpty
              title="Không có phiếu giao hàng nào"
              description="Chưa có đơn giao nào khớp với tiêu chí tìm kiếm của bạn."
            />
          </div>
        ) : (
          <>
            <div style={{ overflowX: 'auto' }}>
              <table className="hg-delivery-table">
                <thead>
                  <tr>
                    <th style={{ width: '150px' }}>Mã Đơn Hàng</th>
                    <th>Người Nhận & Địa Chỉ</th>
                    <th style={{ width: '160px' }}>Phương Thức</th>
                    <th style={{ width: '180px' }}>Shipper Phụ Trách</th>
                    <th style={{ width: '150px' }}>Trạng Thái</th>
                    <th style={{ width: '140px' }}>Thời Gian</th>
                    <th style={{ width: '160px', textAlign: 'right' }}>Thao Tác</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((d) => {
                    const statusStyle = deliveryStatusColor[d.status] || { bg: '#f3f4f6', text: '#374151', border: '#e5e7eb' };
                    return (
                      <tr key={d.id}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                            <Link
                              to={`/admin/deliveries/${d.id}`}
                              style={{ fontWeight: 800, color: '#0a3d8f', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                            >
                              <Truck size={14} />
                              <span>#{d.orderCode || d.id}</span>
                            </Link>
                            <span style={{ fontSize: '10px', padding: '1px 5px', borderRadius: '4px', background: '#e0f2fe', color: '#0369a1', fontWeight: 700 }}>
                              DL#{d.id}
                            </span>
                            {d.deliveryAttempts > 1 && (
                              <span style={{ fontSize: '10px', padding: '1px 6px', borderRadius: '4px', background: '#fef3c7', color: '#b45309', fontWeight: 800 }}>
                                Lần {d.deliveryAttempts}/3
                              </span>
                            )}
                            {d.returnedToWarehouse && (
                              <span style={{ fontSize: '10px', padding: '1px 6px', borderRadius: '4px', background: '#f3e8ff', color: '#6b21a8', fontWeight: 800 }}>
                                Hoàn kho
                              </span>
                            )}
                          </div>
                          {d.warehouseName && (
                            <div style={{ fontSize: '11px', color: '#0369a1', marginTop: '3px', fontWeight: 600 }}>
                              Kho: {d.warehouseName} ({d.warehouseCode || 'WH'})
                            </div>
                          )}
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                            Giá trị: <strong style={{ color: 'var(--text-primary)' }}>{formatPrice(d.orderTotalAmount || 0)}</strong>
                          </div>
                        </td>
                        <td>
                          <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                            {d.receiverName || d.customerName || 'Khách hàng'}
                            {d.receiverPhone && <span style={{ color: 'var(--text-muted)', fontWeight: 400, marginLeft: '4px' }}>({d.receiverPhone})</span>}
                          </div>
                          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px', maxWidth: '320px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={d.deliveryAddress}>
                            {d.deliveryAddress || 'Chưa cập nhật địa chỉ'}
                          </div>
                          {d.itemsSummary && (
                            <div style={{ fontSize: '11px', color: '#0f766e', marginTop: '3px', fontWeight: 600, maxWidth: '320px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={d.itemsSummary}>
                              📦 {d.itemsSummary}
                            </div>
                          )}
                        </td>
                        <td>
                          <span style={{
                            display: 'inline-block', padding: '2px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 700,
                            background: d.shippingMethod === 'EXPRESS' ? '#ede9fe' : d.shippingMethod === 'SAME_DAY' ? '#ffedd5' : '#e0f2fe',
                            color: d.shippingMethod === 'EXPRESS' ? '#6d28d9' : d.shippingMethod === 'SAME_DAY' ? '#c2410c' : '#0369a1'
                          }}>
                            {shippingMethodLabel[d.shippingMethod] || d.shippingMethod || 'Tiêu chuẩn'}
                          </span>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '3px' }}>
                            Cước: {formatPrice(d.shippingFee || 0)}
                          </div>
                          {(d.totalWeightKg != null || d.distanceKm != null) && (
                            <div style={{ fontSize: '10px', color: '#64748b', marginTop: '2px' }}>
                              {d.totalWeightKg != null ? `${d.totalWeightKg} kg` : ''}
                              {d.totalWeightKg != null && d.distanceKm != null ? ' · ' : ''}
                              {d.distanceKm != null ? `${d.distanceKm} km` : ''}
                            </div>
                          )}
                        </td>
                        <td>
                          {d.shipperName ? (
                            <div>
                              <div style={{ fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#10b981' }} />
                                <span>{d.shipperName}</span>
                              </div>
                              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                                {d.shipperPhone || '—'}
                              </div>
                            </div>
                          ) : (
                            <span style={{ display: 'inline-block', fontSize: '11px', fontWeight: 600, color: '#b45309', background: '#fef3c7', padding: '2px 8px', borderRadius: '6px' }}>
                              Chưa gán Shipper
                            </span>
                          )}
                        </td>
                        <td>
                          <span
                            style={{
                              display: 'inline-block',
                              padding: '3px 10px', borderRadius: '999px',
                              fontSize: '11px', fontWeight: 700,
                              backgroundColor: statusStyle.bg,
                              color: statusStyle.text,
                              border: `1px solid ${statusStyle.border || statusStyle.bg}`
                            }}
                          >
                            {deliveryStatusLabel[d.status] || d.statusDescription || d.status}
                          </span>
                        </td>
                        <td>
                          <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{formatDate(d.createdAt)}</div>
                          {d.estimatedDelivery && (
                            <div style={{ fontSize: '11px', color: '#0a3d8f', marginTop: '2px' }}>Dự kiến: {d.estimatedDelivery}</div>
                          )}
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px' }}>
                            {d.status === 'DELIVERY_FAILED' && (
                              <button
                                type="button"
                                onClick={() => setRedeliverDelivery(d)}
                                style={{
                                  display: 'inline-flex', alignItems: 'center', gap: '4px',
                                  padding: '6px 10px', borderRadius: '8px',
                                  background: '#fee2e2', color: '#991b1b', border: '1px solid #fecaca',
                                  fontSize: '11px', fontWeight: 700, cursor: 'pointer'
                                }}
                                title="Lên lịch giao lại hoặc hoàn hàng về kho"
                              >
                                <RotateCcw size={12} />
                                <span>Xử lý ({d.deliveryAttempts || 1}/3)</span>
                              </button>
                            )}
                            {canAssign(d.status) && d.status !== 'DELIVERY_FAILED' && (
                              <button
                                type="button"
                                onClick={() => { setSelectedDelivery(d); setAssignModalOpen(true); }}
                                style={{
                                  display: 'inline-flex', alignItems: 'center', gap: '4px',
                                  padding: '6px 10px', borderRadius: '8px',
                                  background: '#dbeafe', color: '#1e40af', border: '1px solid #bfdbfe',
                                  fontSize: '11px', fontWeight: 700, cursor: 'pointer'
                                }}
                                title="Phân công Shipper"
                              >
                                <UserCheck size={12} />
                                <span>{d.shipperId ? 'Đổi' : 'Gán'}</span>
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => setMapDelivery(d)}
                              style={{
                                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                width: 30, height: 30, borderRadius: '8px',
                                background: ['IN_TRANSIT', 'ARRIVED'].includes(d.status) ? '#eff6ff' : '#f8fafc',
                                border: `1px solid ${['IN_TRANSIT', 'ARRIVED'].includes(d.status) ? '#bfdbfe' : 'var(--border)'}`,
                                color: ['IN_TRANSIT', 'ARRIVED'].includes(d.status) ? '#2563eb' : 'var(--text-secondary)',
                                cursor: 'pointer'
                              }}
                              title="Xem bản đồ giám sát GPS"
                            >
                              <Compass size={14} className={['IN_TRANSIT', 'ARRIVED'].includes(d.status) ? 'animate-spin' : ''} />
                            </button>
                            <Link
                              to={`/admin/deliveries/${d.id}`}
                              style={{
                                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                width: 30, height: 30, borderRadius: '8px',
                                background: '#f8fafc', border: '1px solid var(--border)',
                                color: 'var(--text-primary)', textDecoration: 'none'
                              }}
                              title="Xem chi tiết lộ trình"
                            >
                              <Eye size={14} />
                            </Link>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div style={{ padding: '14px 18px', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                Hiển thị <strong>{items.length}</strong> / <strong>{totalElements}</strong> phiếu giao hàng
              </div>
              <AdminPagination
                currentPage={page}
                totalPages={totalPages}
                onPageChange={(p) => {
                  setPage(p);
                  setSearchParams((prev) => {
                    const n = new URLSearchParams(prev);
                    n.set('page', String(p));
                    return n;
                  });
                }}
              />
            </div>
          </>
        )}
      </div>
      )}

      {/* Modal Phân Công Shipper */}
      <AssignShipperModal
        isOpen={assignModalOpen}
        onClose={() => { setAssignModalOpen(false); setSelectedDelivery(null); }}
        delivery={selectedDelivery}
        onAssigned={handleAssignSuccess}
      />

      {/* Modal Đối Soát COD */}
      <AdminCodModal
        isOpen={codModalOpen}
        onClose={() => setCodModalOpen(false)}
        onSettled={load}
      />

      {/* Modal Lên Lịch Giao Lại / Hoàn Hàng Về Kho */}
      <AdminRedeliverModal
        isOpen={!!redeliverDelivery}
        onClose={() => setRedeliverDelivery(null)}
        delivery={redeliverDelivery}
        onSuccess={() => {
          load();
        }}
      />

      {/* Modal Bản Đồ Giám Sát GPS */}
      <DeliveryMapModal
        isOpen={!!mapDelivery}
        onClose={() => setMapDelivery(null)}
        delivery={mapDelivery}
      />
    </div>
  );
}
