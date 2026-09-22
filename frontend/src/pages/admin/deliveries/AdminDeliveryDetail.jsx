import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  Truck, ArrowLeft, UserCheck, MapPin, Phone, User, Calendar,
  Clock, CheckCircle2, AlertTriangle, ShieldCheck, ExternalLink,
  Package, DollarSign, Image as ImageIcon, X, Navigation, Compass,
  RotateCcw, CreditCard, Sparkles, Check
} from 'lucide-react';
import { fetchAdminDeliveryDetail, settleDeliveryCod } from '../../../api/delivery';
import { getErrorMessage } from '../../../api/client';
import { formatDate, formatPrice, deliveryStatusLabel, deliveryStatusColor, shippingMethodLabel } from '../../../utils/helpers';
import { resolveImageUrl } from '../../../utils/imageUrl';
import AdminLoading from '../../../components/admin/AdminLoading';
import AdminError from '../../../components/admin/AdminError';
import AssignShipperModal from './AssignShipperModal';
import AdminRedeliverModal from './AdminRedeliverModal';
import DeliveryMapModal from '../../../components/delivery/DeliveryMapModal';
import LiveDeliveryMap from '../../../components/delivery/LiveDeliveryMap';

const DELIVERY_STEPS = [
  { key: 'PENDING_ASSIGNMENT', label: 'Chờ phân công' },
  { key: 'ASSIGNED', label: 'Đã gán Shipper' },
  { key: 'IN_TRANSIT', label: 'Đang giao hàng' },
  { key: 'ARRIVED', label: 'Đã đến nơi' },
  { key: 'DELIVERED', label: 'Giao hoàn tất' },
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

export default function AdminDeliveryDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [delivery, setDelivery] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [redeliverModalOpen, setRedeliverModalOpen] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);
  const [mapModalOpen, setMapModalOpen] = useState(false);
  const [settlingCod, setSettlingCod] = useState(false);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchAdminDeliveryDetail(id);
      setDelivery(data);
    } catch (err) {
      setError(getErrorMessage(err, 'Không tải được chi tiết phiếu giao'));
    } finally {
      setLoading(false);
    }
  };

  const handleSettleCod = async () => {
    if (!delivery?.id) return;
    const note = window.prompt('Nhập ghi chú đối soát tiền mặt COD (tùy chọn):', 'Admin đã nhận đủ tiền mặt COD vào quỹ');
    if (note === null) return;

    setSettlingCod(true);
    try {
      await settleDeliveryCod(delivery.id, note);
      alert('Đã xác nhận đối soát thu tiền COD thành công!');
      load();
    } catch (err) {
      alert(getErrorMessage(err, 'Lỗi khi đối soát COD'));
    } finally {
      setSettlingCod(false);
    }
  };

  useEffect(() => {
    load();
  }, [id]);

  // Tự động làm mới dữ liệu GPS khi đơn đang giao (PICKED_UP, IN_TRANSIT, ARRIVED)
  useEffect(() => {
    if (!delivery) return;
    const isLive = ['PICKED_UP', 'IN_TRANSIT', 'ARRIVED'].includes(delivery.status);
    if (!isLive) return;

    const timer = setInterval(() => {
      fetchAdminDeliveryDetail(id).then((fresh) => {
        if (fresh) setDelivery(fresh);
      }).catch(() => {});
    }, 6000);

    return () => clearInterval(timer);
  }, [id, delivery?.status]);

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '80px 20px' }}>
        <AdminLoading label="Đang tải chi tiết phiếu giao hàng..." />
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '40px 20px' }}>
        <AdminError message={error} onRetry={load} />
      </div>
    );
  }

  if (!delivery) return null;

  const statusStyle = deliveryStatusColor[delivery.status] || { bg: '#f3f4f6', text: '#374151', border: '#e5e7eb' };
  const canAssign = ['PENDING_ASSIGNMENT', 'ASSIGNED', 'DELIVERY_FAILED'].includes(delivery.status);
  const stepIdx = getActiveStepIndex(delivery.status);

  return (
    <div className="hg-admin-detail-layout">
      {/* Top Header Bar */}
      <div className="hg-admin-detail-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <Link
            to="/admin/deliveries"
            style={{
              width: 40, height: 40, borderRadius: '12px', background: '#ffffff',
              border: '1px solid var(--border)', color: 'var(--text-primary)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none'
            }}
            title="Quay lại danh sách phiếu giao"
          >
            <ArrowLeft size={18} />
          </Link>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <h1 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                Phiếu vận chuyển #{delivery.id}
              </h1>
              <span style={{
                fontSize: '12px', fontWeight: 700, padding: '3px 12px', borderRadius: '999px',
                background: statusStyle.bg, color: statusStyle.text, border: `1px solid ${statusStyle.border || statusStyle.bg}`
              }}>
                {deliveryStatusLabel[delivery.status] || delivery.statusDescription || delivery.status}
              </span>
            </div>
            <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>
              Đơn hàng gốc: <Link to={`/admin/orders/${delivery.orderId}`} style={{ color: '#0a3d8f', fontWeight: 700, textDecoration: 'none' }}>#{delivery.orderCode}</Link>
              {delivery.createdAt && ` · Tạo ngày ${formatDate(delivery.createdAt)}`}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => {
              const el = document.getElementById('live-delivery-map-section');
              if (el) {
                el.scrollIntoView({ behavior: 'smooth', block: 'center' });
              } else {
                setMapModalOpen(true);
              }
            }}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '6px',
              padding: '9px 14px', borderRadius: '10px',
              background: '#eff6ff', color: '#1e40af', border: '1px solid #bfdbfe',
              fontSize: '13px', fontWeight: 700, cursor: 'pointer'
            }}
            title="Xem bản đồ giám sát GPS thời gian thực"
          >
            <Compass size={15} style={{ color: '#2563eb' }} className={['IN_TRANSIT', 'ARRIVED'].includes(delivery.status) ? 'animate-spin' : ''} />
            <span>Định vị GPS</span>
          </button>

          {canAssign && (
            <button
              type="button"
              onClick={() => setAssignModalOpen(true)}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '6px',
                padding: '9px 16px', borderRadius: '10px',
                background: '#0a3d8f', color: '#ffffff', border: 'none',
                fontSize: '13px', fontWeight: 700, cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(10, 61, 143, 0.25)'
              }}
            >
              <UserCheck size={15} />
              <span>{delivery.shipperId ? 'Đổi Shipper' : 'Phân công Shipper'}</span>
            </button>
          )}

          <Link
            to={`/admin/orders/${delivery.orderId}`}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '6px',
              padding: '9px 14px', borderRadius: '10px',
              background: '#ffffff', color: 'var(--text-primary)', border: '1px solid var(--border)',
              fontSize: '13px', fontWeight: 600, textDecoration: 'none'
            }}
          >
            <span>Xem đơn hàng</span>
            <ExternalLink size={13} />
          </Link>
        </div>
      </div>

      {/* Failure Hub if DELIVERY_FAILED */}
      {delivery.status === 'DELIVERY_FAILED' && (
        <div style={{
          background: 'linear-gradient(135deg, #fff1f2 0%, #fef2f2 100%)',
          border: '1.5px solid #fecdd3', borderRadius: '16px',
          padding: '18px 22px', marginBottom: '24px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px'
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
            <div style={{
              width: 40, height: 40, borderRadius: '12px', background: '#e11d48',
              color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
            }}>
              <AlertTriangle size={20} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '14px', fontWeight: 800, color: '#9f1239' }}>
                  GIAO HÀNG TẠM HOÃN / THẤT BẠI
                </span>
                <span style={{ fontSize: '11px', fontWeight: 800, padding: '2px 8px', borderRadius: '6px', background: '#ffe4e6', color: '#be123c' }}>
                  Lần {delivery.deliveryAttempts || 1}/3
                </span>
              </div>
              <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#be123c' }}>
                Lý do: <strong>{delivery.failureReason || 'Shipper không liên lạc được'}</strong>
                {delivery.failureNote && ` (${delivery.failureNote})`}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setRedeliverModalOpen(true)}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '6px',
              padding: '10px 18px', borderRadius: '10px',
              background: '#be123c', color: '#ffffff', border: 'none',
              fontSize: '13px', fontWeight: 700, cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(190, 18, 60, 0.25)'
            }}
          >
            <RotateCcw size={15} />
            <span>Xử lý giao lại / Hoàn kho</span>
          </button>
        </div>
      )}

      {/* 3-Card Information Bento Grid */}
      <div className="hg-admin-detail-grid">
        {/* Card 1: Customer info */}
        <div className="hg-admin-detail-card">
          <div className="hg-admin-detail-card-title">
            <User size={15} style={{ color: '#0a3d8f' }} />
            <span>Khách hàng & Điểm nhận</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px' }}>
            <div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Người nhận:</div>
              <strong style={{ fontSize: '15px', color: 'var(--text-primary)' }}>
                {delivery.receiverName || delivery.customerName || 'Khách hàng'}
              </strong>
            </div>

            <div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Số điện thoại:</div>
              {delivery.receiverPhone ? (
                <a
                  href={`tel:${delivery.receiverPhone}`}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: '6px',
                    color: '#0a3d8f', fontWeight: 700, textDecoration: 'none', marginTop: '2px'
                  }}
                >
                  <Phone size={13} />
                  <span>{delivery.receiverPhone}</span>
                </a>
              ) : (
                <span style={{ color: 'var(--text-muted)' }}>Chưa cập nhật</span>
              )}
            </div>

            <div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Địa chỉ giao nhận:</div>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '6px', marginTop: '4px', lineHeight: 1.35, color: 'var(--text-primary)' }}>
                <MapPin size={15} style={{ color: '#ef4444', flexShrink: 0, marginTop: '2px' }} />
                <span>{delivery.deliveryAddress || 'Chưa có địa chỉ'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Card 2: Logistics & Payment */}
        <div className="hg-admin-detail-card">
          <div className="hg-admin-detail-card-title">
            <CreditCard size={15} style={{ color: '#0a3d8f' }} />
            <span>Vận chuyển & Thanh toán</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: 'var(--text-muted)' }}>Phương thức ship:</span>
              <span style={{
                padding: '2px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 700,
                background: delivery.shippingMethod === 'EXPRESS' ? '#ede9fe' : '#e0f2fe',
                color: delivery.shippingMethod === 'EXPRESS' ? '#6d28d9' : '#0369a1'
              }}>
                {shippingMethodLabel[delivery.shippingMethod] || delivery.shippingMethod || 'Tiêu chuẩn'}
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Cước vận chuyển:</span>
              <strong style={{ color: 'var(--text-primary)' }}>{formatPrice(delivery.shippingFee || 0)}</strong>
            </div>

            {delivery.warehouseName && (
              <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '8px', marginTop: '4px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Kho xuất hàng:</span>
                  <span style={{ fontWeight: 700, color: '#0a3d8f' }}>
                    {delivery.warehouseName} ({delivery.warehouseCode})
                  </span>
                </div>
                {delivery.warehouseAddress && (
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                    📍 {delivery.warehouseAddress}
                  </div>
                )}
                {delivery.warehousePhone && (
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                    📞 Hotline kho: <a href={`tel:${delivery.warehousePhone}`} style={{ color: '#0a3d8f', fontWeight: 600, textDecoration: 'none' }}>{delivery.warehousePhone}</a>
                  </div>
                )}
              </div>
            )}

            {delivery.totalWeightKg != null && (
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Khối lượng kiện hàng:</span>
                <strong style={{ color: 'var(--text-primary)' }}>{delivery.totalWeightKg} kg</strong>
              </div>
            )}

            {delivery.distanceKm != null && (
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Khoảng cách ước tính:</span>
                <strong style={{ color: 'var(--text-primary)' }}>{delivery.distanceKm} km</strong>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Hình thức thanh toán:</span>
              <strong>{delivery.paymentMethod === 'COD' ? 'Tiền mặt COD' : 'Chuyển khoản Online'}</strong>
            </div>

            <div style={{
              marginTop: '4px', padding: '10px', borderRadius: '10px',
              background: '#f8fafc', border: '1px solid #f1f5f9',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between'
            }}>
              <div>
                <span style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, display: 'block' }}>
                  THU HỘ COD
                </span>
                <span style={{ fontSize: '16px', fontWeight: 900, color: '#b45309' }}>
                  {formatPrice(delivery.orderTotalAmount || 0)}
                </span>
              </div>

              {delivery.paymentMethod === 'COD' && (
                <button
                  type="button"
                  disabled={settlingCod || delivery.codSettled}
                  onClick={handleSettleCod}
                  style={{
                    padding: '6px 10px', borderRadius: '8px',
                    background: delivery.codSettled ? '#ecfdf5' : '#fef3c7',
                    color: delivery.codSettled ? '#047857' : '#92400e',
                    border: `1px solid ${delivery.codSettled ? '#a7f3d0' : '#fde68a'}`,
                    fontSize: '11px', fontWeight: 700, cursor: delivery.codSettled ? 'default' : 'pointer'
                  }}
                >
                  {delivery.codSettled ? '✓ Đã thu quỹ' : 'Đối soát COD'}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Card 3: Shipper profile */}
        <div className="hg-admin-detail-card">
          <div className="hg-admin-detail-card-title">
            <Truck size={15} style={{ color: '#0a3d8f' }} />
            <span>Shipper phụ trách</span>
          </div>

          {delivery.shipperId ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '13px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: 44, height: 44, borderRadius: '12px',
                  background: 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)',
                  color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 800, fontSize: '18px', flexShrink: 0
                }}>
                  {(delivery.shipperName || 'S').charAt(0).toUpperCase()}
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '15px', color: 'var(--text-primary)' }}>
                    {delivery.shipperName}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    SĐT: {delivery.shipperPhone || '—'}
                  </div>
                </div>
              </div>

              {canAssign && (
                <button
                  type="button"
                  onClick={() => setAssignModalOpen(true)}
                  style={{
                    width: '100%', padding: '8px 12px', borderRadius: '8px',
                    background: '#f1f5f9', border: '1px solid #e2e8f0', color: '#0a3d8f',
                    fontSize: '12px', fontWeight: 700, cursor: 'pointer', marginTop: '6px'
                  }}
                >
                  Đổi sang Shipper khác
                </button>
              )}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '16px 0' }}>
              <span style={{ display: 'inline-block', padding: '4px 12px', borderRadius: '8px', background: '#fef3c7', color: '#b45309', fontSize: '12px', fontWeight: 700, marginBottom: '12px' }}>
                Chưa gán Shipper
              </span>
              <p style={{ margin: '0 0 12px', fontSize: '12px', color: 'var(--text-muted)' }}>
                Đơn hàng đang chờ quản trị viên phân công nhân sự vận chuyển.
              </p>
              <button
                type="button"
                onClick={() => setAssignModalOpen(true)}
                style={{
                  padding: '8px 16px', borderRadius: '10px',
                  background: '#0a3d8f', color: '#ffffff', border: 'none',
                  fontSize: '12px', fontWeight: 700, cursor: 'pointer'
                }}
              >
                Phân công ngay
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Live Delivery Map Section (Phase 4) */}
      <div id="live-delivery-map-section" style={{ marginBottom: '24px' }}>
        <LiveDeliveryMap
          delivery={delivery}
          mode="admin"
          onRefresh={load}
        />
      </div>

      {/* Stepper Tracking Hub */}
      <div style={{
        background: '#ffffff', border: '1px solid var(--border)', borderRadius: '16px',
        padding: '24px', marginBottom: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
      }}>
        <div style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: '16px' }}>
          Tiến trình vận chuyển
        </div>

        {/* 5-Step Visual Stepper */}
        <div className="hg-stepper-track-v2" style={{ margin: '16px 0 24px' }}>
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
                </div>
              </div>
            );
          })}
        </div>

        {/* OTP Hero Box if generated */}
        {delivery.confirmationOtp && (
          <div className="hg-otp-hero-box" style={{ margin: '16px 0' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <div style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#065f46' }}>
                  MÃ XÁC THỰC OTP GIAO HÀNG
                </div>
                <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#047857' }}>
                  Khách hàng đọc mã này cho Shipper khi nhận kiện hàng.
                </p>
              </div>

              <div style={{
                fontFamily: 'monospace', fontSize: '24px', fontWeight: 900,
                letterSpacing: '6px', color: '#065f46', background: '#ffffff',
                padding: '6px 18px', borderRadius: '10px', border: '1px solid #10b981'
              }}>
                {delivery.confirmationOtp}
              </div>
            </div>
          </div>
        )}

        {/* Proof of Delivery Card if delivered */}
        {delivery.proofImage && (
          <div style={{
            marginTop: '16px', padding: '14px', borderRadius: '12px',
            background: '#faf5ff', border: '1px solid #e9d5ff',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <img
                src={resolveImageUrl(delivery.proofImage)}
                alt="Proof"
                onClick={() => setPreviewImage(delivery.proofImage)}
                style={{
                  width: 56, height: 56, borderRadius: '10px', objectFit: 'cover',
                  border: '1px solid #d8b4fe', cursor: 'pointer'
                }}
                title="Bấm để xem ảnh phóng to"
              />
              <div>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#6b21a8' }}>
                  Ảnh bằng chứng giao hàng thành công
                </div>
                <div style={{ fontSize: '11px', color: '#7e22ce', marginTop: '2px' }}>
                  Shipper đã chụp và lưu trữ đối soát
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setPreviewImage(delivery.proofImage)}
              style={{
                padding: '7px 12px', borderRadius: '8px',
                background: '#f3e8ff', color: '#6b21a8', border: '1px solid #d8b4fe',
                fontSize: '12px', fontWeight: 700, cursor: 'pointer'
              }}
            >
              Phóng to
            </button>
          </div>
        )}

        {/* Detailed Logs Timeline */}
        {delivery.trackings && delivery.trackings.length > 0 && (
          <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid #f1f5f9' }}>
            <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '14px' }}>
              Nhật ký hành trình ({delivery.trackings.length} mốc)
            </div>

            <div style={{ paddingLeft: '8px' }}>
              {delivery.trackings.map((t) => (
                <div key={t.id} className="hg-timeline-log-step">
                  <div className="hg-timeline-log-dot" />
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                    <strong style={{ fontSize: '13px', color: 'var(--text-primary)' }}>
                      {deliveryStatusLabel[t.status] || t.status}
                    </strong>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{formatDate(t.createdAt)}</span>
                  </div>
                  <p style={{ margin: '3px 0 0', fontSize: '12px', color: 'var(--text-secondary)' }}>
                    {t.note}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Package Products List */}
      <div style={{
        background: '#ffffff', border: '1px solid var(--border)', borderRadius: '16px',
        padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
      }}>
        <div style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: '16px' }}>
          Sản phẩm trong kiện ({delivery.items?.length || 0})
        </div>

        <div>
          {(delivery.items || []).map((item) => (
            <div key={item.id} className="hg-admin-detail-product-row">
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', minWidth: 0 }}>
                <img
                  src={item.productImage ? resolveImageUrl(item.productImage) : 'https://placehold.co/60x60?text=SP'}
                  alt={item.productName}
                  className="hg-admin-detail-thumb"
                  onError={(e) => { e.target.src = 'https://placehold.co/60x60?text=SP'; }}
                />
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {item.productName}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                    Số lượng: <strong style={{ color: 'var(--text-primary)' }}>x{item.quantity}</strong> · Đơn giá: {formatPrice(item.price)}
                  </div>
                </div>
              </div>

              <div style={{ fontWeight: 800, fontSize: '15px', color: 'var(--text-primary)', flexShrink: 0 }}>
                {formatPrice(item.subTotal || item.price * item.quantity)}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Proof Lightbox Modal */}
      {previewImage && (
        <div
          className="hg-modal-overlay"
          onClick={() => setPreviewImage(null)}
        >
          <div style={{ position: 'relative', maxWidth: '600px', width: '100%', textAlign: 'center' }}>
            <button
              type="button"
              onClick={() => setPreviewImage(null)}
              style={{ position: 'absolute', top: '-40px', right: 0, background: 'none', border: 'none', color: '#ffffff', cursor: 'pointer' }}
            >
              <X size={28} />
            </button>
            <img
              src={resolveImageUrl(previewImage)}
              alt="Proof"
              style={{ maxHeight: '80vh', maxWidth: '100%', borderRadius: '16px', boxShadow: '0 20px 40px rgba(0,0,0,0.5)' }}
            />
          </div>
        </div>
      )}

      {/* Modal Phân Công Shipper */}
      <AssignShipperModal
        isOpen={assignModalOpen}
        onClose={() => setAssignModalOpen(false)}
        delivery={delivery}
        onAssigned={load}
      />

      {/* Modal Lên Lịch Giao Lại */}
      <AdminRedeliverModal
        isOpen={redeliverModalOpen}
        onClose={() => setRedeliverModalOpen(false)}
        delivery={delivery}
        onSuccess={load}
      />

      {/* Modal Bản Đồ */}
      <DeliveryMapModal
        isOpen={mapModalOpen}
        onClose={() => setMapModalOpen(false)}
        delivery={delivery}
      />
    </div>
  );
}
