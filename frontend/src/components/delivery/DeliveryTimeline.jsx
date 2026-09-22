import { useEffect, useState, useRef } from 'react';
import {
  Truck, Package, MapPin, Phone, CheckCircle2, AlertCircle,
  Clock, ChevronDown, ChevronUp,
  ExternalLink, User, X, Camera, Sparkles, Navigation, Bell, Check
} from 'lucide-react';
import { fetchDeliveryByOrderId, customerConfirmReceived } from '../../api/delivery';
import { getErrorMessage } from '../../api/client';
import { formatDate, formatPrice, deliveryStatusLabel, deliveryStatusColor, shippingMethodLabel } from '../../utils/helpers';
import { resolveImageUrl } from '../../utils/imageUrl';
import { playDeliveryChime } from '../../utils/audio';
import DeliveryMapModal from './DeliveryMapModal';
import LiveDeliveryMap from './LiveDeliveryMap';

const DELIVERY_STEPS = [
  { key: 'PENDING_ASSIGNMENT', label: 'Chờ xử lý', desc: 'Đơn mới tạo' },
  { key: 'ASSIGNED', label: 'Đã phân công', desc: 'Gán shipper' },
  { key: 'IN_TRANSIT', label: 'Đang giao', desc: 'Đang vận chuyển' },
  { key: 'ARRIVED', label: 'Đã đến nơi', desc: 'Sẵn sàng giao' },
  { key: 'DELIVERED', label: 'Hoàn tất', desc: 'Đã nhận hàng' },
];

function getActiveStepIndex(status) {
  switch (status) {
    case 'PENDING_ASSIGNMENT': return 0;
    case 'ASSIGNED':
    case 'SHIPPER_ACCEPTED': return 1;
    case 'PICKED_UP':
    case 'IN_TRANSIT': return 2;
    case 'ARRIVED': return 3;
    case 'DELIVERED': return 4;
    case 'DELIVERY_FAILED': return 2;
    case 'CANCELLED': return 0;
    default: return 0;
  }
}

export default function DeliveryTimeline({ orderId, onUpdated, collapsible = false, defaultOpen = true }) {
  const [delivery, setDelivery] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [showAllLogs, setShowAllLogs] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);
  const [mapOpen, setMapOpen] = useState(false);
  const [showInlineMap, setShowInlineMap] = useState(true);
  const [liveAlert, setLiveAlert] = useState(null);

  const prevStatusRef = useRef(null);

  const load = async () => {
    if (!orderId) return;
    setLoading(true);
    setError('');
    try {
      const data = await fetchDeliveryByOrderId(orderId);
      setDelivery(data);
    } catch (err) {
      setError(getErrorMessage(err, 'Chưa có thông tin vận chuyển'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [orderId]);

  // Polling thời gian thực khi đơn hàng đang trong tiến trình giao
  useEffect(() => {
    if (!orderId) return;
    const isOngoing = delivery && !['DELIVERED', 'DELIVERY_FAILED', 'CANCELLED'].includes(delivery.status);
    if (!isOngoing) return;

    if (!prevStatusRef.current && delivery?.status) {
      prevStatusRef.current = delivery.status;
    }

    const interval = setInterval(async () => {
      try {
        const latest = await fetchDeliveryByOrderId(orderId);
        if (latest && latest.status) {
          const oldStatus = prevStatusRef.current;
          if (oldStatus && oldStatus !== latest.status) {
            prevStatusRef.current = latest.status;
            setDelivery(latest);

            if (latest.status === 'ARRIVED') {
              playDeliveryChime('otp_arrived');
              setLiveAlert({
                type: 'arrived',
                message: 'Shipper đã đến nơi! Hãy chuẩn bị ra nhận hàng.'
              });
            } else if (latest.status === 'DELIVERED') {
              playDeliveryChime('success');
              setLiveAlert({
                type: 'delivered',
                message: 'Đơn hàng đã được bàn giao thành công. Cảm ơn bạn!'
              });
            } else if (latest.status === 'IN_TRANSIT') {
              playDeliveryChime('new_order');
              setLiveAlert({
                type: 'in_transit',
                message: 'Shipper đang trên lộ trình vận chuyển kiện hàng đến bạn!'
              });
            } else if (latest.status === 'DELIVERY_FAILED') {
              setLiveAlert({
                type: 'failed',
                message: `Giao hàng tạm hoãn: ${latest.failureReason || 'Chưa rõ lý do'}`
              });
            }

            if (onUpdated) onUpdated();
          } else {
            setDelivery((prev) => ({ ...prev, ...latest }));
          }
        }
      } catch (err) {
        // ignore polling error
      }
    }, 6000);

    return () => clearInterval(interval);
  }, [orderId, delivery?.status]);

  const handleCustomerConfirm = async () => {
    if (!delivery?.id) return;
    if (!window.confirm('Bạn xác nhận đã nhận được đầy đủ kiện hàng?')) return;

    setConfirming(true);
    try {
      const updated = await customerConfirmReceived(delivery.id);
      setDelivery((prev) => ({ ...prev, ...updated, status: 'DELIVERED' }));
      if (onUpdated) onUpdated();
    } catch (err) {
      alert(getErrorMessage(err, 'Xác nhận thất bại'));
    } finally {
      setConfirming(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '24px', borderRadius: '16px', background: '#f8fafc', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', fontSize: '13px', color: 'var(--text-muted)' }}>
        <div className="spinner" style={{ width: 18, height: 18 }} />
        <span>Đang kết nối hành trình vận chuyển thời gian thực...</span>
      </div>
    );
  }

  if (error || !delivery) {
    return null;
  }

  const stepIdx = getActiveStepIndex(delivery.status);
  const isFailed = delivery.status === 'DELIVERY_FAILED';
  const isCancelled = delivery.status === 'CANCELLED';
  const statusStyle = deliveryStatusColor[delivery.status] || { bg: '#f3f4f6', text: '#374151', border: '#e5e7eb' };
  const isLive = !isCancelled && !['DELIVERED', 'DELIVERY_FAILED'].includes(delivery.status);

  // Parse OTP digits (kept for backward compat, no longer displayed)
  // const otpDigits = delivery.confirmationOtp ? delivery.confirmationOtp.split('') : [];

  return (
    <div className="hg-timeline-box">
      {/* Header bar */}
      <div
        className="hg-timeline-header"
        style={{ cursor: collapsible ? 'pointer' : 'default' }}
        onClick={() => collapsible && setIsOpen(!isOpen)}
      >
        <div className="hg-timeline-title-wrap">
          <div className="hg-timeline-icon-box">
            <Truck size={20} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
                Hành trình giao vận
              </span>
              <span
                style={{
                  display: 'inline-block',
                  padding: '3px 10px',
                  borderRadius: '999px',
                  fontSize: '11px',
                  fontWeight: 700,
                  backgroundColor: statusStyle.bg,
                  color: statusStyle.text,
                  border: `1px solid ${statusStyle.border || statusStyle.bg}`
                }}
              >
                {deliveryStatusLabel[delivery.status] || delivery.statusDescription || delivery.status}
              </span>
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
              Giao thức: <strong style={{ color: 'var(--text-primary)' }}>{shippingMethodLabel[delivery.shippingMethod] || delivery.shippingMethod || 'Tiêu chuẩn'}</strong>
              {delivery.estimatedDelivery && ` · Dự kiến: ${delivery.estimatedDelivery}`}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {isLive && (
            <span className="hg-timeline-badge-live">
              <span className="hg-timeline-live-dot" />
              <span>Theo dõi trực tiếp</span>
            </span>
          )}
          {collapsible && (
            <button
              type="button"
              style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}
            >
              {isOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </button>
          )}
        </div>
      </div>

      {isOpen && (
        <div style={{ padding: '20px' }}>
          {/* Live Notification Alert */}
          {liveAlert && (
            <div style={{
              background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: '12px',
              padding: '12px 16px', marginBottom: '16px', display: 'flex', alignItems: 'center',
              justifyContent: 'space-between', gap: '12px', color: '#065f46', fontSize: '13px', fontWeight: 600
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Bell size={16} style={{ color: '#059669', flexShrink: 0 }} />
                <span>{liveAlert.message}</span>
              </div>
              <button
                type="button"
                onClick={() => setLiveAlert(null)}
                style={{ background: 'none', border: 'none', color: '#065f46', cursor: 'pointer', fontSize: '14px', padding: 0 }}
              >
                ✕
              </button>
            </div>
          )}

          {/* ARRIVED notice — no OTP required */}
          {delivery.status === 'ARRIVED' && (
            <div style={{
              background: '#f0fdf4', border: '1px solid #86efac', borderRadius: '14px',
              padding: '14px 16px', marginBottom: '16px', display: 'flex', alignItems: 'center',
              gap: '10px', color: '#15803d', fontSize: '13px', fontWeight: 600
            }}>
              <MapPin size={18} style={{ color: '#16a34a', flexShrink: 0 }} />
              <span>Shipper đã đến địa chỉ giao hàng. Hãy chuẩn bị ra nhận kiện hàng của bạn!</span>
            </div>
          )}

          {/* Failure Alert Banner */}
          {isFailed && (
            <div style={{
              background: '#fff1f2', border: '1px solid #fecdd3', borderRadius: '14px',
              padding: '16px', marginBottom: '16px', color: '#9f1239', fontSize: '13px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 800, fontSize: '14px' }}>
                  <AlertCircle size={18} style={{ color: '#e11d48' }} />
                  <span>Giao hàng tạm hoãn / Chưa thành công</span>
                </div>
                <span style={{ fontSize: '11px', fontWeight: 800, padding: '2px 8px', borderRadius: '6px', background: '#ffe4e6', color: '#be123c' }}>
                  Lần {delivery.deliveryAttempts || 1}/3
                </span>
              </div>
              <div style={{ marginTop: '6px' }}>
                <strong>Lý do:</strong> {delivery.failureReason || 'Shipper không liên lạc được với khách hàng'}
              </div>
              {delivery.failureNote && (
                <div style={{ marginTop: '4px' }}>
                  <strong>Ghi chú:</strong> {delivery.failureNote}
                </div>
              )}
              {delivery.nextDeliverySchedule && (
                <div style={{
                  marginTop: '10px', padding: '8px 12px', borderRadius: '8px',
                  background: '#ffffff', border: '1px solid #fecdd3', display: 'flex', alignItems: 'center', gap: '6px',
                  color: '#0a3d8f', fontWeight: 600, fontSize: '12px'
                }}>
                  <Clock size={14} />
                  <span>Lịch hẹn giao lại dự kiến: {formatDate(delivery.nextDeliverySchedule)}</span>
                </div>
              )}
            </div>
          )}

          {/* 5-Step Visual Stepper */}
          {!isCancelled && (
            <div className="hg-stepper-track-v2">
              {DELIVERY_STEPS.map((s, idx) => {
                const isDone = idx < stepIdx;
                const isCurrent = idx === stepIdx;

                return (
                  <div key={s.key} className="hg-stepper-step-v2">
                    {idx > 0 && (
                      <div className={`hg-stepper-line-v2 ${isDone || isCurrent ? 'done' : ''}`} />
                    )}
                    <div className={`hg-stepper-circle-v2 ${isDone ? 'done' : isCurrent ? 'active' : ''}`}>
                      {isDone ? <Check size={16} /> : idx + 1}
                    </div>
                    <div style={{ marginTop: '8px' }}>
                      <div style={{
                        fontSize: '12px',
                        fontWeight: isCurrent || isDone ? 700 : 500,
                        color: isCurrent ? '#0a3d8f' : isDone ? 'var(--text-primary)' : 'var(--text-muted)'
                      }}>
                        {s.label}
                      </div>
                      <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>
                        {s.desc}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Shipper & Delivery Address Bento Card */}
          <div className="hg-shipper-destination-card">
            {/* Shipper details */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: 44, height: 44, borderRadius: '12px',
                  background: 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)',
                  color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 800, fontSize: '16px', flexShrink: 0
                }}>
                  {delivery.shipperName ? delivery.shipperName.charAt(0).toUpperCase() : <User size={18} />}
                </div>
                <div>
                  <span style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', display: 'block' }}>
                    Shipper phụ trách
                  </span>
                  <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>
                    {delivery.shipperName || 'Đang phân công Shipper...'}
                  </span>
                </div>
              </div>

              {delivery.shipperPhone && (
                <a
                  href={`tel:${delivery.shipperPhone}`}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: '5px',
                    padding: '8px 12px', borderRadius: '8px',
                    background: '#eff6ff', color: '#1e40af', border: '1px solid #bfdbfe',
                    fontSize: '12px', fontWeight: 700, textDecoration: 'none', flexShrink: 0
                  }}
                >
                  <Phone size={13} />
                  <span>{delivery.shipperPhone}</span>
                </a>
              )}
            </div>

            {/* Delivery address */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', borderLeft: '1px solid #e2e8f0', paddingLeft: '16px' }}>
              <MapPin size={18} style={{ color: '#ef4444', flexShrink: 0, marginTop: '2px' }} />
              <div style={{ minWidth: 0 }}>
                <span style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', display: 'block' }}>
                  Địa chỉ giao nhận
                </span>
                <p style={{ margin: '2px 0 0', fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.4 }} title={delivery.deliveryAddress}>
                  {delivery.deliveryAddress || 'Chưa cập nhật địa chỉ giao'}
                </p>
                {delivery.warehouseName && (
                  <span style={{ fontSize: '11px', color: '#0284c7', display: 'block', marginTop: '4px', fontWeight: 500 }}>
                    Xuất phát từ: <strong>{delivery.warehouseName}</strong>
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Live Delivery Map for Customer */}
          <div style={{ marginTop: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Navigation size={13} style={{ color: '#0284c7' }} />
                <span>BẢN ĐỒ THEO DÕI HÀNH TRÌNH THỰC TẾ</span>
              </span>
              <button
                type="button"
                onClick={() => setShowInlineMap((prev) => !prev)}
                style={{
                  background: 'none', border: 'none', color: '#0284c7', fontSize: '12px', fontWeight: 700,
                  cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, padding: 0
                }}
              >
                <span>{showInlineMap ? 'Thu gọn bản đồ' : 'Xem bản đồ trực tiếp'}</span>
                {showInlineMap ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>
            </div>

            {showInlineMap && (
              <LiveDeliveryMap
                delivery={delivery}
                mode="customer"
                height={320}
                onRefresh={load}
              />
            )}
          </div>

          {/* Proof of delivery photo */}
          {delivery.proofImage && (
            <div style={{
              marginTop: '16px', padding: '14px', borderRadius: '12px',
              background: '#faf5ff', border: '1px solid #e9d5ff',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                <div
                  onClick={() => setPreviewImage(delivery.proofImage)}
                  style={{
                    width: 50, height: 50, borderRadius: '10px', overflow: 'hidden',
                    border: '1px solid #d8b4fe', cursor: 'pointer', flexShrink: 0
                  }}
                  title="Bấm xem phóng to ảnh"
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
                    Đã đối soát tại điểm giao thành công
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setPreviewImage(delivery.proofImage)}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '5px',
                  padding: '7px 12px', borderRadius: '8px',
                  background: '#f3e8ff', color: '#6b21a8', border: '1px solid #d8b4fe',
                  fontSize: '12px', fontWeight: 700, cursor: 'pointer', flexShrink: 0
                }}
              >
                <span>Xem ảnh</span>
                <ExternalLink size={12} />
              </button>
            </div>
          )}

          {/* Action Buttons: Bản đồ GPS & Xác nhận đã nhận hàng */}
          <div style={{ marginTop: '18px', display: 'grid', gridTemplateColumns: ['IN_TRANSIT', 'ARRIVED'].includes(delivery.status) ? '1fr 1fr' : '1fr', gap: '10px' }}>
            <button
              type="button"
              onClick={() => setMapOpen(true)}
              className="hg-btn-map-tracking"
            >
              <Navigation size={15} />
              <span>Xem vị trí Shipper & Lộ trình giao</span>
            </button>

            {['IN_TRANSIT', 'ARRIVED'].includes(delivery.status) && (
              <button
                type="button"
                disabled={confirming}
                onClick={handleCustomerConfirm}
                className="hg-btn-confirm-received"
              >
                <CheckCircle2 size={16} />
                <span>{confirming ? 'Đang xác nhận...' : 'Tôi đã nhận được hàng'}</span>
              </button>
            )}
          </div>

          {/* Detailed Tracking Events Logs */}
          {delivery.trackings && delivery.trackings.length > 0 && (
            <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid #f1f5f9' }}>
              <div
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}
                onClick={() => setShowAllLogs(!showAllLogs)}
              >
                <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
                  Lịch sử mốc giao vận ({delivery.trackings.length} sự kiện)
                </span>
                <span style={{ fontSize: '12px', color: '#0a3d8f', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  {showAllLogs ? 'Thu gọn' : 'Xem chi tiết'}
                  {showAllLogs ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </span>
              </div>

              {showAllLogs && (
                <div style={{ marginTop: '16px', paddingLeft: '8px' }}>
                  {delivery.trackings.map((t) => (
                    <div key={t.id} className="hg-timeline-log-step">
                      <div className="hg-timeline-log-dot" />
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' }}>
                        <strong style={{ fontSize: '13px', color: 'var(--text-primary)' }}>
                          {deliveryStatusLabel[t.status] || t.status}
                        </strong>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{formatDate(t.createdAt)}</span>
                      </div>
                      <p style={{ margin: '4px 0 0', fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                        {t.note}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Lightbox Preview Proof Modal */}
      {previewImage && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            background: 'rgba(0, 0, 0, 0.85)', backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px'
          }}
          onClick={() => setPreviewImage(null)}
        >
          <div style={{ position: 'relative', maxWidth: '600px', width: '100%', textAlign: 'center' }}>
            <button
              type="button"
              onClick={() => setPreviewImage(null)}
              style={{
                position: 'absolute', top: '-40px', right: 0,
                background: 'none', border: 'none', color: '#ffffff', cursor: 'pointer', padding: '6px'
              }}
            >
              <X size={28} />
            </button>
            <img
              src={resolveImageUrl(previewImage)}
              alt="Proof full"
              style={{ maxHeight: '80vh', maxWidth: '100%', borderRadius: '16px', boxShadow: '0 20px 40px rgba(0,0,0,0.5)' }}
            />
            <div style={{ color: '#ffffff', fontSize: '13px', marginTop: '12px', opacity: 0.9 }}>
              Ảnh chứng minh giao hàng thành công · Đơn #{delivery.orderCode || delivery.id}
            </div>
          </div>
        </div>
      )}

      {/* Modal Bản Đồ Lộ Trình Vận Chuyển */}
      <DeliveryMapModal
        isOpen={mapOpen}
        onClose={() => setMapOpen(false)}
        delivery={delivery}
      />
    </div>
  );
}
