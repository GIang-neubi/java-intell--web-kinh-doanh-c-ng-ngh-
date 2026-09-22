import { useEffect, useState, useCallback } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Package, MapPin, Phone, CreditCard, Truck, CheckCircle, XCircle, Clock, AlertCircle } from 'lucide-react';
import { fetchAdminOrderById, updateOrderStatus } from '../../../api/orders';
import { getErrorMessage } from '../../../api/client';
import { formatDate, formatPrice, statusLabel } from '../../../utils/helpers';
import { resolveImageUrl } from '../../../utils/imageUrl';
import AdminLoading from '../../../components/admin/AdminLoading';
import AdminError from '../../../components/admin/AdminError';
import ConfirmDialog from '../../../components/admin/ConfirmDialog';

const PAYMENT_LABEL = { COD: 'Tiền mặt khi nhận hàng (COD)', BANKING: 'Chuyển khoản ngân hàng' };

const STATUS_FLOW = [
  { value: 'PENDING',    label: 'Chờ xác nhận',    icon: Clock },
  { value: 'CONFIRMED',  label: 'Đã xác nhận',     icon: CheckCircle },
  { value: 'PROCESSING', label: 'Đang xử lý',      icon: Truck },
  { value: 'SHIPPING',   label: 'Đang giao',       icon: Truck },
  { value: 'DELIVERED',  label: 'Đã giao',         icon: CheckCircle },
];

const NEXT_STATUSES = {
  PENDING:    [{ value: 'CONFIRMED',  label: 'Xác nhận đơn' },    { value: 'CANCELLED', label: 'Hủy đơn', danger: true }],
  CONFIRMED:  [{ value: 'PROCESSING', label: 'Bắt đầu xử lý' },   { value: 'CANCELLED', label: 'Hủy đơn', danger: true }],
  PROCESSING: [{ value: 'SHIPPING',   label: 'Giao cho vận chuyển' }, { value: 'CANCELLED', label: 'Hủy đơn', danger: true }],
  SHIPPING:   [{ value: 'DELIVERED',  label: 'Xác nhận đã giao' }, { value: 'CANCELLED', label: 'Hủy đơn', danger: true }],
  DELIVERED:  [],
  CANCELLED:  [],
};

const STATUS_STYLE = {
  PENDING:    { bg: '#fef3c7', color: '#92400e', border: '#fde68a' },
  CONFIRMED:  { bg: '#dbeafe', color: '#1e40af', border: '#93c5fd' },
  PROCESSING: { bg: '#e0e7ff', color: '#3730a3', border: '#a5b4fc' },
  SHIPPING:   { bg: '#ede9fe', color: '#5b21b6', border: '#c4b5fd' },
  DELIVERED:  { bg: '#d1fae5', color: '#065f46', border: '#86efac' },
  CANCELLED:  { bg: '#fee2e2', color: '#991b1b', border: '#fca5a5' },
};

export default function OrderDetail() {
  const { id } = useParams();

  const [order, setOrder]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState('');
  const [toast, setToast]   = useState('');
  const [toastType, setToastType] = useState('success');

  const [confirmTarget, setConfirmTarget] = useState(null);
  const [updating, setUpdating]           = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchAdminOrderById(id);
      setOrder(data);
    } catch (err) {
      setError(getErrorMessage(err, 'Không tải được đơn hàng'));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(''), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  const handleStatusUpdate = async () => {
    if (!confirmTarget) return;
    setUpdating(true);
    try {
      const updated = await updateOrderStatus(id, confirmTarget.value);
      setOrder(updated);
      setToast(`Cập nhật trạng thái thành "${statusLabel[confirmTarget.value]}" thành công`);
      setToastType('success');
      setConfirmTarget(null);
    } catch (err) {
      setToast(getErrorMessage(err, 'Cập nhật trạng thái thất bại'));
      setToastType('error');
      setConfirmTarget(null);
    } finally {
      setUpdating(false);
    }
  };

  if (loading) return <AdminLoading label="Đang tải đơn hàng..." />;
  if (error && !order) return <AdminError message={error} onRetry={load} />;
  if (!order) return null;

  const nextStatuses = NEXT_STATUSES[order.status] || [];
  const currentStyle = STATUS_STYLE[order.status] || STATUS_STYLE.PENDING;
  const statusFlow = STATUS_FLOW;
  const currentIdx = statusFlow.findIndex(s => s.value === order.status);

  return (
    <div className="hg-admin-module">
      {toast && (
        <div className={`alert ${toastType === 'success' ? 'alert-success' : 'alert-danger'}`} role="alert">
          {toast}
        </div>
      )}

      {/* ── Toolbar ── */}
      <div className="hg-admin-toolbar">
        <Link to="/admin/orders" className="btn btn-ghost btn-sm">
          <ArrowLeft size={15} /> Danh sách đơn
        </Link>
        {nextStatuses.length > 0 && (
          <div className="hg-toolbar-right">
            {nextStatuses.map((s) => (
              <button
                key={s.value}
                type="button"
                className={`btn btn-sm ${s.danger ? 'btn-danger' : 'btn-primary'}`}
                onClick={() => setConfirmTarget(s)}
              >
                {s.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Header Card ── */}
      <div className="card hg-order-header-card">
        <div className="hg-order-header-grid">
          <div className="hg-order-header-main">
            <div className="hg-order-code-row">
              <span className="hg-order-code-label">Mã đơn hàng</span>
              <span className="hg-order-code">{order.orderCode}</span>
            </div>
            <div className="hg-order-meta">
              <span>Đặt lúc: {order.createdAt ? formatDate(order.createdAt) : '—'}</span>
              <span className="hg-order-meta-divider" />
              <span>ID: {order.id}</span>
            </div>
          </div>
          <div className="hg-order-status-badge" style={{ ...currentStyle, borderColor: currentStyle.border }}>
            <span className="hg-status-dot" style={{ background: currentStyle.color }} />
            <span style={{ fontWeight: 700, fontSize: 14 }}>{statusLabel[order.status] || order.status}</span>
          </div>
        </div>
        {order.status === 'CANCELLED' && (
          <div className="hg-order-cancelled-notice">
            <XCircle size={16} /> Đơn hàng đã bị hủy — tồn kho đã được hoàn lại
          </div>
        )}
      </div>

      {/* ── Main Content ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 16, alignItems: 'start' }}>
        {/* ── Left: Products ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="card hg-order-items-card" style={{ overflow: 'hidden' }}>
            <div className="hg-card-head">
              <h3>Sản phẩm ({order.items?.length || 0} mặt hàng)</h3>
            </div>
            <div className="hg-order-items-list">
              {(order.items || []).map((item) => (
                <div
                  key={item.id}
                  className="hg-order-item-row"
                >
                  <div className="hg-order-item-image">
                    {item.productImage
                      ? <img src={resolveImageUrl(item.productImage)} alt={item.productName} loading="lazy" />
                      : <Package size={20} style={{ color: 'var(--text-muted)' }} />}
                  </div>
                  <div className="hg-order-item-info">
                    <div className="hg-order-item-name">{item.productName}</div>
                    <div className="hg-order-item-meta">
                      <span>{formatPrice(item.price)}</span>
                      <span className="hg-order-meta-divider" />
                      <span>SL: {item.quantity}</span>
                    </div>
                  </div>
                  <div className="hg-order-item-subtotal">
                    {formatPrice(item.subTotal)}
                  </div>
                </div>
              ))}
            </div>
            <div className="hg-order-total-row">
              <span>Tổng cộng:</span>
              <span className="hg-order-total-amount">{formatPrice(order.totalAmount)}</span>
            </div>
          </div>
        </div>

        {/* ── Right: Info Panels ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Customer Info */}
          <div className="card hg-info-card">
            <div className="hg-info-card-title">
              <MapPin size={16} /> Thông tin khách hàng
            </div>
            <div className="hg-info-grid">
              <div className="hg-info-row">
                <span className="hg-info-label">Họ tên</span>
                <span className="hg-info-value">{order.customerName || '—'}</span>
              </div>
              <div className="hg-info-row">
                <span className="hg-info-label">Username</span>
                <span className="hg-info-value">@{order.customerUsername || '—'}</span>
              </div>
              <div className="hg-info-row">
                <span className="hg-info-label">User ID</span>
                <span className="hg-info-value font-mono text-sm">{order.userId || '—'}</span>
              </div>
            </div>
          </div>

          {/* Shipping Info */}
          <div className="card hg-info-card">
            <div className="hg-info-card-title">
              <Truck size={16} /> Giao hàng & Thanh toán
            </div>
            <div className="hg-info-grid">
              <div className="hg-info-row hg-info-row-full">
                <span className="hg-info-label">Địa chỉ giao hàng</span>
                <span className="hg-info-value hg-shipping-address">{order.shippingAddress || '—'}</span>
              </div>
              <div className="hg-info-row">
                <span className="hg-info-label">
                  <Phone size={13} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                  Số điện thoại
                </span>
                <span className="hg-info-value">{order.phone || '—'}</span>
              </div>
              <div className="hg-info-row">
                <span className="hg-info-label">
                  <CreditCard size={13} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                  Thanh toán
                </span>
                <span className="hg-info-value hg-payment-badge">{PAYMENT_LABEL[order.paymentMethod] || order.paymentMethod}</span>
              </div>
              {order.voucherCode && (
                <div className="hg-info-row">
                  <span className="hg-info-label">Mã giảm giá</span>
                  <span className="hg-info-value hg-voucher-code">{order.voucherCode}</span>
                </div>
              )}
              {order.discountAmount && order.discountAmount > 0 && (
                <div className="hg-info-row">
                  <span className="hg-info-label">Giảm giá</span>
                  <span className="hg-info-value text-danger">−{formatPrice(order.discountAmount)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Status Timeline */}
          <div className="card hg-info-card hg-timeline-card">
            <div className="hg-info-card-title">
              <AlertCircle size={16} /> Luồng trạng thái
            </div>
            <div className="hg-timeline">
              {statusFlow.map((s, i) => {
                const sIdx = i;
                const isDone = order.status !== 'CANCELLED' && sIdx < currentIdx;
                const isCurrent = order.status !== 'CANCELLED' && sIdx === currentIdx;
                const isCancelled = order.status === 'CANCELLED';
                const Icon = s.icon;
                const stepStyle = isCancelled ? STATUS_STYLE.CANCELLED
                  : isDone ? STATUS_STYLE.DELIVERED
                  : isCurrent ? STATUS_STYLE[s.value] || STATUS_STYLE.PENDING
                  : { bg: 'transparent', color: 'var(--border)', border: 'var(--border)' };
                return (
                  <div key={s.value} className="hg-timeline-step">
                    <div className="hg-timeline-marker" style={{ ...stepStyle, borderColor: stepStyle.border || stepStyle.color }}>
                      {isCancelled ? (
                        <XCircle size={12} style={{ color: stepStyle.color }} />
                      ) : isDone ? (
                        <CheckCircle size={12} style={{ color: '#fff' }} />
                      ) : isCurrent ? (
                        <Icon size={12} style={{ color: '#fff' }} />
                      ) : (
                        <span style={{ color: stepStyle.color, fontWeight: 800, fontSize: 12 }}>{i + 1}</span>
                      )}
                    </div>
                    <div className="hg-timeline-content" style={{ color: isCancelled ? 'var(--text-muted)' : isCurrent ? 'var(--primary)' : isDone ? 'var(--success)' : 'var(--text-muted)' }}>
                      <div style={{ fontSize: 13, fontWeight: isCurrent ? 700 : 500 }}>{s.label}</div>
                    </div>
                    <div className="hg-timeline-connector" style={{ background: isCancelled ? '#fecaca' : isDone ? 'var(--success)' : 'var(--border)' }} />
                  </div>
                );
              })}
              {order.status === 'CANCELLED' && (
                <div className="hg-timeline-cancelled">
                  <XCircle size={14} style={{ color: 'var(--danger)' }} />
                  <span>Đơn hàng đã bị hủy tại bước: {statusLabel[order.status]}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Confirm dialog */}
      <ConfirmDialog
        open={!!confirmTarget}
        title={confirmTarget?.danger ? 'Hủy đơn hàng?' : `Xác nhận: ${confirmTarget?.label}?`}
        message={
          confirmTarget?.danger
            ? `Bạn có chắc muốn hủy đơn "${order.orderCode}"? Hàng tồn kho sẽ được hoàn lại.`
            : `Chuyển trạng thái đơn "${order.orderCode}" sang "${statusLabel[confirmTarget?.value]}"?`
        }
        confirmLabel={confirmTarget?.label || 'Xác nhận'}
        loading={updating}
        onCancel={() => setConfirmTarget(null)}
        onConfirm={handleStatusUpdate}
      />
    </div>
  );
}