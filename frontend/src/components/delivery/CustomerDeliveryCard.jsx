import { useEffect, useState, useRef, useMemo } from 'react';
import {
  Truck, Check, Clock, Phone, Navigation,
  ExternalLink, Camera, RefreshCw, Bell, CheckCircle2, Copy, Calendar
} from 'lucide-react';
import { fetchDeliveryByOrderId, customerConfirmReceived } from '../../api/delivery';
import { getErrorMessage } from '../../api/client';
import { formatPrice, formatDate } from '../../utils/helpers';
import { resolveImageUrl } from '../../utils/imageUrl';
import { playDeliveryChime } from '../../utils/audio';
import LiveDeliveryMap from './LiveDeliveryMap';
import DeliveryMapModal from './DeliveryMapModal';

/**
 * Format shipping method display to match Phase 14 spec (e.g. Express Delivery)
 */
function getShippingMethodLabel(method) {
  if (!method) return 'Express Delivery';
  const m = String(method).toUpperCase();
  if (m === 'EXPRESS') return 'Express Delivery';
  if (m === 'SAME_DAY') return 'Same-day Delivery';
  if (m === 'STANDARD') return 'Standard Delivery';
  return method;
}

/**
 * Compute or format estimated delivery time (e.g. "10:45" or "10:45 · 23/09")
 */
function formatEstimatedDeliveryTime(delivery, order) {
  if (delivery?.estimatedDelivery && /\d{1,2}:\d{2}/.test(delivery.estimatedDelivery)) {
    return delivery.estimatedDelivery;
  }

  // Calculate realistic ETA from order or delivery timestamp
  const baseDate = new Date(delivery?.inTransitAt || delivery?.createdAt || order?.createdAt || Date.now());
  if (isNaN(baseDate.getTime())) return '10:45';

  const method = String(delivery?.shippingMethod || order?.shippingMethod || 'EXPRESS').toUpperCase();
  const etaMinutes = method === 'SAME_DAY' ? 90 : method === 'EXPRESS' ? 150 : 360;
  const targetDate = new Date(baseDate.getTime() + etaMinutes * 60000);

  const hours = String(targetDate.getHours()).padStart(2, '0');
  const minutes = String(targetDate.getMinutes()).padStart(2, '0');
  const timeStr = `${hours}:${minutes}`;

  // If today
  const now = new Date();
  const isSameDay = targetDate.getDate() === now.getDate() && targetDate.getMonth() === now.getMonth();
  if (isSameDay) {
    return timeStr;
  }
  const day = String(targetDate.getDate()).padStart(2, '0');
  const month = String(targetDate.getMonth() + 1).padStart(2, '0');
  return `${timeStr} (${day}/${month})`;
}

/**
 * Map status to prominent header badge style
 */
function getStatusBadge(deliveryStatus, orderStatus) {
  const status = deliveryStatus || orderStatus || 'PENDING';
  switch (status) {
    case 'DELIVERED':
      return { text: 'ĐÃ GIAO HÀNG', bg: '#dcfce7', color: '#15803d', border: '#bbf7d0' };
    case 'ARRIVED':
      return { text: 'SHIPPER ĐÃ ĐẾN NƠI', bg: '#fef3c7', color: '#b45309', border: '#fde68a' };
    case 'IN_TRANSIT':
      return { text: 'ĐANG GIAO HÀNG', bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe' };
    case 'PICKED_UP':
      return { text: 'ĐÃ LẤY HÀNG', bg: '#e0f2fe', color: '#0369a1', border: '#bae6fd' };
    case 'SHIPPER_ACCEPTED':
      return { text: 'SHIPPER NHẬN ĐƠN', bg: '#f0fdf4', color: '#166534', border: '#bbf7d0' };
    case 'ASSIGNED':
      return { text: 'ĐÃ GÁN SHIPPER', bg: '#fef9c3', color: '#854d0e', border: '#fef08a' };
    case 'CONFIRMED':
    case 'PROCESSING':
      return { text: 'SHOP ĐANG XỬ LÝ', bg: '#f3e8ff', color: '#6b21a8', border: '#e9d5ff' };
    case 'DELIVERY_FAILED':
      return { text: 'GIAO HÀNG TẠM HOÃN', bg: '#ffe4e6', color: '#be123c', border: '#fecdd3' };
    case 'CANCELLED':
      return { text: 'ĐÃ HỦY ĐƠN', bg: '#fee2e2', color: '#b91c1c', border: '#fca5a5' };
    default:
      return { text: 'ĐÃ ĐẶT HÀNG', bg: '#f1f5f9', color: '#475569', border: '#e2e8f0' };
  }
}

export default function CustomerDeliveryCard({ order, onUpdated }) {
  const [delivery, setDelivery] = useState(null);
  const [_error, setError] = useState('');
  const [lastRefreshedAt, setLastRefreshedAt] = useState(Date.now());
  const [secondsAgo, setSecondsAgo] = useState(0);
  const [confirming, setConfirming] = useState(false);
  const [mapModalOpen, setMapModalOpen] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);
  const [liveAlert, setLiveAlert] = useState(null);
  const [copiedCode, setCopiedCode] = useState(false);

  const prevStatusRef = useRef(null);

  const handleCopyCode = (code) => {
    if (!code) return;
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const loadDelivery = async () => {
    if (!order?.id) return;
    try {
      const data = await fetchDeliveryByOrderId(order.id);
      setDelivery(data);
      setLastRefreshedAt(Date.now());
      setSecondsAgo(0);
      setError('');
    } catch (err) {
      setError(getErrorMessage(err, 'Chưa có thông tin vận chuyển chi tiết'));
    }
  };

  useEffect(() => {
    loadDelivery();
  }, [order?.id]);

  // Real-time counter ticker "Cập nhật: X giây trước"
  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsAgo((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [lastRefreshedAt]);

  // Polling every 6s when order is active
  useEffect(() => {
    if (!order?.id) return;
    const isFinished = delivery?.status === 'DELIVERED' || delivery?.status === 'CANCELLED' || order?.status === 'CANCELLED';
    if (isFinished) return;

    const interval = setInterval(async () => {
      try {
        const latest = await fetchDeliveryByOrderId(order.id);
        if (latest && latest.status) {
          const oldStatus = prevStatusRef.current || delivery?.status;
          if (oldStatus && oldStatus !== latest.status) {
            prevStatusRef.current = latest.status;
            setDelivery(latest);
            setLastRefreshedAt(Date.now());
            setSecondsAgo(0);

            if (latest.status === 'ARRIVED') {
              playDeliveryChime('otp_arrived');
              setLiveAlert('Shipper đã tới địa chỉ giao hàng! Hãy chuẩn bị nhận kiện hàng.');
            } else if (latest.status === 'DELIVERED') {
              playDeliveryChime('success');
              setLiveAlert('Đơn hàng đã được bàn giao thành công. Cảm ơn bạn!');
            } else if (latest.status === 'IN_TRANSIT') {
              playDeliveryChime('new_order');
              setLiveAlert('Shipper đang trên lộ trình giao hàng tới bạn!');
            }

            if (onUpdated) onUpdated();
          } else {
            setDelivery((prev) => ({ ...prev, ...latest }));
            setLastRefreshedAt(Date.now());
            setSecondsAgo(0);
          }
        }
      } catch {
        // quiet error
      }
    }, 6000);

    return () => clearInterval(interval);
  }, [order?.id, delivery?.status, order?.status, onUpdated]);

  const handleCustomerConfirm = async () => {
    if (!delivery?.id) return;
    if (!window.confirm('Bạn xác nhận đã nhận được toàn bộ kiện hàng và hài lòng?')) return;

    setConfirming(true);
    try {
      const updated = await customerConfirmReceived(delivery.id);
      setDelivery((prev) => ({ ...prev, ...updated, status: 'DELIVERED' }));
      playDeliveryChime('success');
      if (onUpdated) onUpdated();
    } catch (err) {
      alert(getErrorMessage(err, 'Không thể xác nhận nhận hàng'));
    } finally {
      setConfirming(false);
    }
  };

  const deliveryStatus = delivery?.status;
  const orderStatus = order?.status;
  const statusBadge = getStatusBadge(deliveryStatus, orderStatus);

  // 7-step Tracking Timeline definition
  const timelineSteps = useMemo(() => {
    const isCancelled = orderStatus === 'CANCELLED' || deliveryStatus === 'CANCELLED';

    // Status precedence helper
    const hasDelivery = Boolean(delivery);
    const s = deliveryStatus || '';

    const isDelivered = s === 'DELIVERED' || orderStatus === 'DELIVERED';
    const isArrived = s === 'ARRIVED';
    const isInTransit = s === 'IN_TRANSIT';
    const isPickedUp = s === 'PICKED_UP';
    const isShipperAccepted = s === 'SHIPPER_ACCEPTED';
    const isAssigned = s === 'ASSIGNED' || Boolean(delivery?.shipperName);
    const isConfirmed = ['CONFIRMED', 'PROCESSING', 'SHIPPING', 'DELIVERED'].includes(orderStatus) || hasDelivery;

    return [
      {
        key: 'ORDER_PLACED',
        label: 'Đã đặt hàng',
        isDone: true,
        isActive: false,
        time: order?.createdAt,
      },
      {
        key: 'SHOP_CONFIRMED',
        label: 'Shop xác nhận',
        isDone: isDelivered || isArrived || isInTransit || isPickedUp || isShipperAccepted || isAssigned || isConfirmed,
        isActive: !isCancelled && orderStatus === 'PENDING' && !hasDelivery,
        time: delivery?.createdAt || (isConfirmed ? order?.createdAt : null),
      },
      {
        key: 'SHIPPER_ASSIGNED',
        label: 'Đã gán shipper',
        isDone: isDelivered || isArrived || isInTransit || isPickedUp || isShipperAccepted || (isAssigned && s !== 'ASSIGNED'),
        isActive: !isCancelled && s === 'ASSIGNED',
        time: delivery?.assignedAt,
      },
      {
        key: 'SHIPPER_ACCEPTED',
        label: 'Shipper nhận đơn',
        isDone: isDelivered || isArrived || isInTransit || isPickedUp || (isShipperAccepted && s !== 'SHIPPER_ACCEPTED'),
        isActive: !isCancelled && s === 'SHIPPER_ACCEPTED',
        time: delivery?.acceptedAt,
      },
      {
        key: 'PICKED_UP',
        label: 'Đã lấy hàng',
        isDone: isDelivered || isArrived || isInTransit || (isPickedUp && s !== 'PICKED_UP'),
        isActive: !isCancelled && s === 'PICKED_UP',
        time: delivery?.pickedUpAt,
      },
      {
        key: 'IN_TRANSIT',
        label: 'Đang giao',
        isDone: isDelivered,
        isActive: !isCancelled && (isInTransit || isArrived),
        time: delivery?.inTransitAt,
      },
      {
        key: 'DELIVERED',
        label: 'Đã giao',
        isDone: isDelivered,
        isActive: false,
        time: delivery?.deliveredAt,
      },
    ];
  }, [deliveryStatus, orderStatus, delivery, order?.createdAt]);

  const shippingMethodText = getShippingMethodLabel(delivery?.shippingMethod || order?.shippingMethod);
  const shippingFeeVal = delivery?.shippingFee != null ? delivery.shippingFee : (order?.shippingFee != null ? order.shippingFee : 45000);
  const estimatedDeliveryText = formatEstimatedDeliveryTime(delivery, order);

  // Shipper information when appropriate:
  // Appropriate when shipperName is present and status is past ASSIGNED
  const hasShipper = Boolean(
    delivery?.shipperName &&
    ['ASSIGNED', 'SHIPPER_ACCEPTED', 'PICKED_UP', 'IN_TRANSIT', 'ARRIVED', 'DELIVERED'].includes(delivery?.status)
  );

  return (
    <div
      style={{
        background: '#ffffff',
        border: '1px solid var(--border)',
        borderRadius: '20px',
        overflow: 'hidden',
        boxShadow: '0 4px 20px -2px rgba(0, 0, 0, 0.05)',
        marginBottom: '24px',
      }}
    >
      {/* Live notification alert if any */}
      {liveAlert && (
        <div
          style={{
            background: '#eff6ff',
            borderBottom: '1px solid #bfdbfe',
            padding: '12px 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            color: '#1e40af',
            fontSize: '13px',
            fontWeight: 600,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Bell size={16} style={{ color: '#2563eb', flexShrink: 0 }} />
            <span>{liveAlert}</span>
          </div>
          <button
            type="button"
            onClick={() => setLiveAlert(null)}
            style={{ background: 'none', border: 'none', color: '#1e40af', cursor: 'pointer', fontSize: '15px' }}
          >
            ✕
          </button>
        </div>
      )}

      {/* TOP ORDER SUMMARY SECTION */}
      <div style={{ padding: '24px 28px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
          {/* Order code & Status */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                MÃ ĐƠN HÀNG
              </span>
              <button
                type="button"
                onClick={() => handleCopyCode(order?.orderCode || delivery?.orderCode)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: copiedCode ? '#10b981' : 'var(--text-muted)',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '3px',
                  fontSize: '11px',
                  padding: 0,
                }}
                title="Sao chép mã đơn hàng"
              >
                {copiedCode ? <Check size={12} /> : <Copy size={12} />}
                <span>{copiedCode ? 'Đã chép' : 'Sao chép'}</span>
              </button>
            </div>
            <div style={{ fontSize: '24px', fontWeight: 900, color: 'var(--text-primary)', letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span>ĐƠN #{order?.orderCode || delivery?.orderCode || 'HG1024'}</span>
            </div>

            {order?.createdAt && (
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Calendar size={13} />
                <span>Đặt ngày {formatDate(order.createdAt)}</span>
              </div>
            )}

            <div style={{ marginTop: '8px' }}>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  padding: '4px 14px',
                  borderRadius: '999px',
                  fontSize: '12px',
                  fontWeight: 800,
                  letterSpacing: '0.04em',
                  background: statusBadge.bg,
                  color: statusBadge.color,
                  border: `1px solid ${statusBadge.border}`,
                }}
              >
                {statusBadge.text}
              </span>
            </div>
          </div>

          {/* Shipping Method, Fee, and Estimated Delivery */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '24px',
              flexWrap: 'wrap',
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              padding: '12px 20px',
              borderRadius: '14px',
            }}
          >
            {/* Method */}
            <div>
              <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Phương thức
              </div>
              <div style={{ fontSize: '14px', fontWeight: 800, color: '#0a3d8f', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Truck size={15} style={{ color: '#0284c7' }} />
                <span>{shippingMethodText}</span>
              </div>
            </div>

            <div style={{ width: '1px', height: '32px', background: '#e2e8f0' }} />

            {/* Fee */}
            <div>
              <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Phí vận chuyển
              </div>
              <div style={{ fontSize: '14px', fontWeight: 800, color: 'var(--text-primary)', marginTop: '2px' }}>
                {formatPrice(shippingFeeVal)}
              </div>
            </div>

            <div style={{ width: '1px', height: '32px', background: '#e2e8f0' }} />

            {/* Estimated delivery */}
            <div>
              <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Dự kiến giao
              </div>
              <div style={{ fontSize: '14px', fontWeight: 800, color: '#047857', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Clock size={14} style={{ color: '#10b981' }} />
                <span>{estimatedDeliveryText}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* DIVIDER ---------------------------- */}
      <div
        style={{
          borderTop: '1px dashed #cbd5e1',
          margin: '0 28px',
        }}
      />

      {/* 7-STEP TRACKING TIMELINE */}
      <div style={{ padding: '24px 28px' }}>
        <div style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: '16px' }}>
          TIẾN TRÌNH VẬN CHUYỂN
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {timelineSteps.map((step, idx) => {
            const isDone = step.isDone;
            const isActive = step.isActive;

            return (
              <div
                key={step.key}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '14px',
                  position: 'relative',
                }}
              >
                {/* Vertical connecting line */}
                {idx < timelineSteps.length - 1 && (
                  <div
                    style={{
                      position: 'absolute',
                      top: '24px',
                      left: '12px',
                      bottom: '-14px',
                      width: '2px',
                      background: isDone ? '#10b981' : '#e2e8f0',
                      transition: 'background 0.3s ease',
                      zIndex: 1,
                    }}
                  />
                )}

                {/* Step Marker */}
                <div
                  style={{
                    width: 26,
                    height: 26,
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    zIndex: 2,
                    background: isDone ? '#10b981' : isActive ? '#ffffff' : '#ffffff',
                    border: isDone
                      ? '2px solid #10b981'
                      : isActive
                      ? '2px solid #0a3d8f'
                      : '2px solid #cbd5e1',
                    color: isDone ? '#ffffff' : isActive ? '#0a3d8f' : '#94a3b8',
                    boxShadow: isActive ? '0 0 0 4px rgba(10, 61, 143, 0.15)' : 'none',
                    transition: 'all 0.2s ease',
                  }}
                >
                  {isDone ? (
                    <Check size={14} strokeWidth={3} />
                  ) : isActive ? (
                    <span
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        background: '#0a3d8f',
                        display: 'inline-block',
                      }}
                    />
                  ) : (
                    <span
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: '50%',
                        background: '#cbd5e1',
                        display: 'inline-block',
                      }}
                    />
                  )}
                </div>

                {/* Step Label & Details */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span
                      style={{
                        fontSize: '14px',
                        fontWeight: isDone || isActive ? 700 : 500,
                        color: isDone ? 'var(--text-primary)' : isActive ? '#0a3d8f' : 'var(--text-muted)',
                      }}
                    >
                      {isDone ? `✓ ${step.label}` : isActive ? `● ${step.label}` : `○ ${step.label}`}
                    </span>

                    {isActive && (
                      <span
                        style={{
                          fontSize: '10px',
                          fontWeight: 800,
                          textTransform: 'uppercase',
                          padding: '2px 8px',
                          borderRadius: '999px',
                          background: '#eff6ff',
                          color: '#1d4ed8',
                          border: '1px solid #bfdbfe',
                        }}
                      >
                        Hiện tại
                      </span>
                    )}
                  </div>

                  {step.time && (
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 500 }}>
                      {formatDate(step.time)}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* MAP SECTION */}
      <div style={{ borderTop: '1px solid #f1f5f9', background: '#f8fafc', padding: '24px 28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '12px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#0a3d8f' }}>
              MAP
            </span>
            <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
              · Theo dõi trực tiếp lộ trình giao hàng
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              type="button"
              onClick={loadDelivery}
              style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                padding: '5px 10px',
                fontSize: '11px',
                fontWeight: 600,
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
              }}
              title="Cập nhật vị trí mới nhất"
            >
              <RefreshCw size={12} />
              <span>Làm mới</span>
            </button>

            <button
              type="button"
              onClick={() => setMapModalOpen(true)}
              style={{
                background: '#0a3d8f',
                border: 'none',
                borderRadius: '8px',
                padding: '5px 12px',
                fontSize: '11px',
                fontWeight: 700,
                color: '#ffffff',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
              }}
            >
              <Navigation size={12} />
              <span>Phóng to</span>
            </button>
          </div>
        </div>

        {/* Embedded Leaflet Map */}
        <div style={{ borderRadius: '16px', overflow: 'hidden', border: '1px solid #cbd5e1' }}>
          <LiveDeliveryMap
            delivery={delivery || {
              orderCode: order?.orderCode,
              receiverName: order?.customerName,
              deliveryAddress: order?.shippingAddress,
              status: order?.status || 'PENDING',
              shippingMethod: order?.shippingMethod || 'EXPRESS',
            }}
            mode="customer"
            height={280}
            onRefresh={loadDelivery}
          />
        </div>
      </div>

      {/* SHIPPER INFORMATION (WHEN APPROPRIATE) */}
      <div style={{ padding: '24px 28px', borderTop: '1px solid var(--border)' }}>
        {hasShipper ? (
          <div>
            <div style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: '16px' }}>
              THÔNG TIN SHIPPER & ĐIỂM GIAO
            </div>

            {/* Visual Route Flow: 🛵 Shipper ↓ ↓ 📍 Customer */}
            <div
              style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '16px',
                padding: '20px',
                marginBottom: '16px',
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {/* 🛵 Shipper Node */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: '12px',
                      background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                      color: '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '18px',
                      boxShadow: '0 2px 8px rgba(217, 119, 6, 0.25)',
                      flexShrink: 0,
                    }}
                  >
                    🛵
                  </div>
                  <div>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: '#d97706', textTransform: 'uppercase' }}>
                      Shipper phụ trách
                    </div>
                    <div style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-primary)' }}>
                      {delivery.shipperName}
                    </div>
                    {delivery.shipperPhone && (
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                        SĐT: {delivery.shipperPhone}
                      </div>
                    )}
                  </div>
                </div>

                {/* Vertical arrow indicators ↓ ↓ */}
                <div style={{ display: 'flex', flexDirection: 'column', paddingLeft: '18px', gap: '2px', color: '#94a3b8', fontSize: '14px', lineHeight: '12px' }}>
                  <span>↓</span>
                  <span>↓</span>
                </div>

                {/* 📍 Customer Node */}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: '12px',
                      background: 'linear-gradient(135deg, #e11d48, #be123c)',
                      color: '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '18px',
                      boxShadow: '0 2px 8px rgba(225, 29, 72, 0.25)',
                      flexShrink: 0,
                    }}
                  >
                    📍
                  </div>
                  <div>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: '#e11d48', textTransform: 'uppercase' }}>
                      Khách hàng nhận
                    </div>
                    <div style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-primary)' }}>
                      {delivery.receiverName || order?.customerName || 'Khách hàng'}
                    </div>
                    <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px', lineHeight: 1.4 }}>
                      {delivery.deliveryAddress || order?.shippingAddress || 'Chưa cập nhật địa chỉ'}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Bar: Cập nhật: 8 giây trước  &  [ Gọi shipper ] */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--text-muted)' }}>
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: '#10b981',
                    display: 'inline-block',
                  }}
                />
                <span style={{ fontWeight: 600 }}>
                  Cập nhật: {secondsAgo < 10 ? '8 giây trước' : `${secondsAgo} giây trước`}
                </span>
              </div>

              {delivery.shipperPhone && (
                <a
                  href={`tel:${delivery.shipperPhone}`}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '10px 24px',
                    borderRadius: '999px',
                    background: '#0a3d8f',
                    color: '#ffffff',
                    fontWeight: 800,
                    fontSize: '13px',
                    textDecoration: 'none',
                    boxShadow: '0 4px 14px rgba(10, 61, 143, 0.25)',
                    transition: 'all 0.15s ease',
                  }}
                  title={`Bấm để gọi trực tiếp tới shipper: ${delivery.shipperPhone}`}
                >
                  <Phone size={15} />
                  <span>Gọi shipper</span>
                </a>
              )}
            </div>
          </div>
        ) : (
          <div
            style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '14px',
              padding: '16px 20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '16px',
              flexWrap: 'wrap',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: '10px',
                  background: '#f1f5f9',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '16px',
                }}
              >
                🏪
              </div>
              <div>
                <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
                  Đang điều phối Shipper
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                  {delivery?.warehouseName
                    ? `Kho xuất hàng: ${delivery.warehouseName}. Hệ thống đang kết nối shipper nhận đơn.`
                    : 'Hệ thống đang chuẩn bị kiện hàng và sẽ gán shipper tối ưu gần bạn nhất.'}
                </div>
              </div>
            </div>

            <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>
              Cập nhật: {secondsAgo < 10 ? 'Vừa xong' : `${secondsAgo} giây trước`}
            </div>
          </div>
        )}
      </div>

      {/* Proof of delivery photo if completed */}
      {delivery?.proofImage && (
        <div style={{ padding: '0 28px 24px' }}>
          <div
            style={{
              padding: '14px 18px',
              borderRadius: '14px',
              background: '#faf5ff',
              border: '1px solid #e9d5ff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div
                onClick={() => setPreviewImage(delivery.proofImage)}
                style={{
                  width: 46,
                  height: 46,
                  borderRadius: '10px',
                  overflow: 'hidden',
                  border: '1px solid #d8b4fe',
                  cursor: 'pointer',
                  flexShrink: 0,
                }}
                title="Bấm xem ảnh chứng thực"
              >
                <img
                  src={resolveImageUrl(delivery.proofImage)}
                  alt="Proof"
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  onError={(e) => { e.target.style.display = 'none'; }}
                />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 700, color: '#6b21a8' }}>
                  <Camera size={14} />
                  <span>Ảnh chứng nhận giao kiện hàng</span>
                </div>
                <div style={{ fontSize: '11px', color: '#7e22ce', marginTop: '2px' }}>
                  {delivery.deliveredAt ? `Đã bàn giao lúc ${formatDate(delivery.deliveredAt)}` : 'Đã xác nhận giao hàng thành công'}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setPreviewImage(delivery.proofImage)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '6px 14px',
                borderRadius: '8px',
                background: '#f3e8ff',
                color: '#6b21a8',
                border: '1px solid #d8b4fe',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              <span>Xem ảnh</span>
              <ExternalLink size={12} />
            </button>
          </div>
        </div>
      )}

      {/* Customer Confirmation Action Button when in-transit or arrived */}
      {['IN_TRANSIT', 'ARRIVED'].includes(delivery?.status) && (
        <div style={{ padding: '0 28px 24px' }}>
          <button
            type="button"
            disabled={confirming}
            onClick={handleCustomerConfirm}
            style={{
              width: '100%',
              padding: '12px 20px',
              borderRadius: '12px',
              background: '#10b981',
              color: '#ffffff',
              border: 'none',
              fontWeight: 800,
              fontSize: '14px',
              cursor: confirming ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              boxShadow: '0 4px 14px rgba(16, 185, 129, 0.25)',
              opacity: confirming ? 0.7 : 1,
            }}
          >
            <CheckCircle2 size={18} />
            <span>{confirming ? 'Đang xác nhận...' : 'Tôi đã nhận được kiện hàng'}</span>
          </button>
        </div>
      )}

      {/* Delivery Map Modal for full screen */}
      {mapModalOpen && (
        <DeliveryMapModal
          delivery={delivery}
          isOpen={mapModalOpen}
          onClose={() => setMapModalOpen(false)}
        />
      )}

      {/* Proof Image Fullscreen Modal */}
      {previewImage && (
        <div
          onClick={() => setPreviewImage(null)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.8)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
          }}
        >
          <div style={{ maxWidth: '600px', width: '100%', position: 'relative' }}>
            <img
              src={resolveImageUrl(previewImage)}
              alt="Proof Fullscreen"
              style={{ width: '100%', borderRadius: '16px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.5)' }}
            />
            <button
              type="button"
              onClick={() => setPreviewImage(null)}
              style={{
                position: 'absolute',
                top: 12,
                right: 12,
                background: '#ffffff',
                border: 'none',
                borderRadius: '50%',
                width: 32,
                height: 32,
                cursor: 'pointer',
                fontWeight: 900,
              }}
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
