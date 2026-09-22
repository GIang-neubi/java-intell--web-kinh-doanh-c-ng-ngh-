import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  Truck, ArrowLeft, MapPin, Phone, CheckCircle2, AlertTriangle,
  Navigation, Package, DollarSign, Camera, X,
  ShieldAlert, Sparkles, Compass, Check, ExternalLink, Warehouse
} from 'lucide-react';
import {
  fetchShipperDeliveryDetail,
  shipperAcceptDelivery,
  shipperPickupPackage,
  shipperStartDelivery,
  shipperArrive,
  shipperCompleteDelivery,
  shipperFailDelivery,
  uploadProofImage,
  shipperUpdateProof
} from '../../api/delivery';
import { getErrorMessage } from '../../api/client';
import { resolveImageUrl } from '../../utils/imageUrl';
import LiveDeliveryMap from '../../components/delivery/LiveDeliveryMap';
import DeliveryMapModal from '../../components/delivery/DeliveryMapModal';
import { useShipperGps, ACTIVE_TRACKING_STATUSES } from '../../utils/useShipperGps';
import {
  formatPrice,
  formatDate,
  deliveryStatusLabel,
  deliveryStatusColor,
  shippingMethodLabel
} from '../../utils/helpers';
import {
  getDeliveryNavigationStage,
  buildWarehouseNavUrl,
  buildCustomerNavUrl,
  buildFullRouteUrl
} from '../../utils/navigation';

const FAILURE_REASONS = [
  'Khách hàng không nghe máy (Customer did not answer)',
  'Khách hàng hẹn giao lại (Customer requested reschedule)',
  'Sai địa chỉ (Wrong address)',
  'Không có người nhận (No recipient)',
  'Khách từ chối nhận hàng (Customer rejected package)',
  'Lý do khác (Other)',
];

export default function ShipperDeliveryDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [delivery, setDelivery] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [toast, setToast] = useState('');

  // Form hoàn tất & Proof
  const [proofFile, setProofFile] = useState(null);
  const [proofPreview, setProofPreview] = useState(null);
  const [completeNote, setCompleteNote] = useState('');
  const [uploadingProof, setUploadingProof] = useState(false);
  const [showCompleteForm, setShowCompleteForm] = useState(false);

  // Lightbox xem ảnh bằng chứng
  const [previewImage, setPreviewImage] = useState(null);

  // Modal cập nhật / bổ sung ảnh POD sau khi giao
  const [showUpdateProofModal, setShowUpdateProofModal] = useState(false);
  const [updateProofFile, setUpdateProofFile] = useState(null);
  const [updateProofPreview, setUpdateProofPreview] = useState(null);
  const [updatingProof, setUpdatingProof] = useState(false);

  // Modal báo thất bại
  const [failModalOpen, setFailModalOpen] = useState(false);
  const [failReason, setFailReason] = useState(FAILURE_REASONS[0]);
  const [failNote, setFailNote] = useState('');

  // Modal bản đồ
  const [mapOpen, setMapOpen] = useState(false);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchShipperDeliveryDetail(id);
      setDelivery(data);
      if (data.proofImage) setProofPreview(data.proofImage);
    } catch (err) {
      setError(getErrorMessage(err, 'Không tải được chi tiết đơn hàng'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [id]);

  // Hook GPS tự động theo dõi vị trí Shipper qua watchPosition khi đơn hàng đang active
  const {
    isTracking,
    coords: liveCoords,
    gpsError,
    lastSyncedAt
  } = useShipperGps({
    deliveryId: delivery?.id,
    status: delivery?.status,
    onLocationSync: (newCoords) => {
      setDelivery((prev) => prev ? {
        ...prev,
        currentLatitude: newCoords.latitude,
        currentLongitude: newCoords.longitude,
      } : prev);
    },
  });

  const getSingleGeoLocation = () => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        setToast('Trình duyệt của bạn không hỗ trợ định vị GPS.');
        resolve(null);
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({
          latitude: parseFloat(pos.coords.latitude.toFixed(6)),
          longitude: parseFloat(pos.coords.longitude.toFixed(6)),
          accuracy: pos.coords.accuracy ? Math.round(pos.coords.accuracy) : null,
          timestamp: pos.timestamp || Date.now(),
        }),
        (err) => {
          if (err.code === 1) {
            alert('Bạn cần cho phép truy cập vị trí để sử dụng tính năng này.');
          } else {
            alert('Không thể xác định vị trí hiện tại.');
          }
          resolve(null);
        },
        { timeout: 8000, enableHighAccuracy: true }
      );
    });
  };

  const handleUseDemoProof = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 600;
    canvas.height = 400;
    const ctx = canvas.getContext('2d');

    const grad = ctx.createLinearGradient(0, 0, 600, 400);
    grad.addColorStop(0, '#0f172a');
    grad.addColorStop(1, '#1e293b');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 600, 400);

    ctx.fillStyle = '#f59e0b';
    ctx.fillRect(220, 120, 160, 140);
    ctx.fillStyle = '#d97706';
    ctx.fillRect(285, 120, 30, 140);

    ctx.fillStyle = '#10b981';
    ctx.beginPath();
    ctx.arc(300, 190, 30, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 30px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('✓', 300, 192);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 20px sans-serif';
    ctx.fillText('BIÊN BẢN GIAO HÀNG H&G STORE', 300, 60);

    ctx.font = 'bold 15px monospace';
    ctx.fillStyle = '#38bdf8';
    ctx.fillText(`ĐƠN HÀNG: #${delivery?.orderCode || id}`, 300, 300);

    ctx.font = '13px sans-serif';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText(`Khách nhận: ${delivery?.receiverName || 'Khách hàng'} • Đã ký nhận`, 300, 330);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
    setProofPreview(dataUrl);

    fetch(dataUrl)
      .then((res) => res.blob())
      .then((blob) => {
        const file = new File([blob], `proof_${delivery?.orderCode || 'demo'}.jpg`, { type: 'image/jpeg' });
        setProofFile(file);
      });
  };

  const handleUpdateProofFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setUpdateProofFile(file);
      setUpdateProofPreview(URL.createObjectURL(file));
    }
  };

  const handleUseDemoProofForUpdate = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 600;
    canvas.height = 400;
    const ctx = canvas.getContext('2d');

    const grad = ctx.createLinearGradient(0, 0, 600, 400);
    grad.addColorStop(0, '#0f172a');
    grad.addColorStop(1, '#1e293b');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 600, 400);

    ctx.fillStyle = '#f59e0b';
    ctx.fillRect(220, 120, 160, 140);
    ctx.fillStyle = '#d97706';
    ctx.fillRect(285, 120, 30, 140);

    ctx.fillStyle = '#10b981';
    ctx.beginPath();
    ctx.arc(300, 190, 30, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 30px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('✓', 300, 192);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 20px sans-serif';
    ctx.fillText('BIÊN BẢN GIAO HÀNG H&G STORE', 300, 60);

    ctx.font = 'bold 15px monospace';
    ctx.fillStyle = '#38bdf8';
    ctx.fillText(`ĐƠN HÀNG: #${delivery?.orderCode || id}`, 300, 300);

    ctx.font = '13px sans-serif';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText(`Khách nhận: ${delivery?.receiverName || 'Khách hàng'} • Đã ký nhận`, 300, 330);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
    setUpdateProofPreview(dataUrl);

    fetch(dataUrl)
      .then((res) => res.blob())
      .then((blob) => {
        const file = new File([blob], `proof_${delivery?.orderCode || 'demo'}.jpg`, { type: 'image/jpeg' });
        setUpdateProofFile(file);
      });
  };

  const handleUpdateProofSubmit = async (e) => {
    e?.preventDefault();
    if (!updateProofFile && !updateProofPreview) {
      alert('Vui lòng chọn ảnh chụp hoặc ảnh mẫu demo trước khi lưu.');
      return;
    }
    setUpdatingProof(true);
    try {
      let finalUrl = updateProofPreview;
      if (updateProofFile) {
        finalUrl = await uploadProofImage(updateProofFile);
      }
      await shipperUpdateProof(delivery.id, finalUrl);
      setToast('Đã cập nhật ảnh bằng chứng giao hàng thành công!');
      setShowUpdateProofModal(false);
      setUpdateProofFile(null);
      setUpdateProofPreview(null);
      load();
    } catch (err) {
      alert(getErrorMessage(err, 'Lỗi khi cập nhật ảnh bằng chứng'));
    } finally {
      setUpdatingProof(false);
    }
  };

  const handleAccept = async () => {
    setActionLoading(true);
    try {
      await shipperAcceptDelivery(delivery.id);
      setToast('Đã nhận đơn giao hàng thành công!');
      load();
    } catch (err) {
      alert(getErrorMessage(err, 'Lỗi khi nhận đơn'));
    } finally {
      setActionLoading(false);
    }
  };

  const handlePickup = async () => {
    setActionLoading(true);
    try {
      await shipperPickupPackage(delivery.id);
      setToast('Đã lấy hàng từ cửa hàng H&G!');
      load();
    } catch (err) {
      alert(getErrorMessage(err, 'Lỗi khi lấy hàng'));
    } finally {
      setActionLoading(false);
    }
  };

  const handleStartDelivery = async () => {
    setActionLoading(true);
    try {
      const coords = liveCoords || await getSingleGeoLocation();
      await shipperStartDelivery(delivery.id, coords || undefined);
      setToast('Bắt đầu di chuyển giao tới khách!');
      load();
    } catch (err) {
      alert(getErrorMessage(err, 'Lỗi khi bắt đầu giao'));
    } finally {
      setActionLoading(false);
    }
  };

  const handleArrive = async () => {
    setActionLoading(true);
    try {
      const coords = liveCoords || await getSingleGeoLocation();
      await shipperArrive(delivery.id, coords || undefined);
      setToast('Đã đến địa chỉ giao hàng!');
      load();
    } catch (err) {
      alert(getErrorMessage(err, 'Lỗi khi báo đến nơi'));
    } finally {
      setActionLoading(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setProofFile(file);
      setProofPreview(URL.createObjectURL(file));
    }
  };

  const handleComplete = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      let uploadedUrl = proofPreview;
      if (proofFile) {
        setUploadingProof(true);
        uploadedUrl = await uploadProofImage(proofFile);
      }

      await shipperCompleteDelivery(delivery.id, {
        proofImage: uploadedUrl || undefined,
        note: completeNote.trim() || undefined,
      });

      setToast('Giao hàng hoàn tất thành công! Xin cảm ơn.');
      setShowCompleteForm(false);
      load();
    } catch (err) {
      alert(getErrorMessage(err, 'Lỗi khi hoàn tất giao hàng'));
    } finally {
      setActionLoading(false);
      setUploadingProof(false);
    }
  };

  const handleFailSubmit = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      await shipperFailDelivery(delivery.id, {
        reason: failReason,
        note: failNote.trim() || undefined,
      });
      setToast('Đã báo cáo giao thất bại');
      setFailModalOpen(false);
      load();
    } catch (err) {
      alert(getErrorMessage(err, 'Lỗi khi báo thất bại'));
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '80px 20px' }}>
        <div className="spinner" style={{ margin: '0 auto 12px', width: 26, height: 26 }} />
        <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Đang tải thông tin đơn...</div>
      </div>
    );
  }

  if (error || !delivery) {
    return (
      <div style={{
        background: '#fff1f2', border: '1px solid #fecdd3', borderRadius: '14px',
        padding: '20px', color: '#9f1239', fontSize: '13px', textAlign: 'center'
      }}>
        <div>{error || 'Không tìm thấy thông tin đơn giao này'}</div>
        <Link to="/shipper" style={{ color: '#0a3d8f', fontWeight: 700, marginTop: '10px', display: 'inline-block' }}>
          Quay lại danh sách đơn
        </Link>
      </div>
    );
  }

  const statusStyle = deliveryStatusColor[delivery.status] || { bg: '#f3f4f6', text: '#374151', border: '#e5e7eb' };
  const isBeforePickup = ['ASSIGNED', 'SHIPPER_ACCEPTED'].includes(delivery.status);
  const isAfterPickup = ['PICKED_UP', 'IN_TRANSIT', 'ARRIVED'].includes(delivery.status);
  const isCompleted = ['DELIVERED', 'DELIVERY_FAILED', 'CANCELLED'].includes(delivery.status);

  const navStage = getDeliveryNavigationStage(delivery, liveCoords);
  const warehouseNavUrl = buildWarehouseNavUrl(delivery, liveCoords);
  const customerNavUrl = buildCustomerNavUrl(delivery, liveCoords);
  const fullRouteUrl = buildFullRouteUrl(delivery);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {/* Toast Alert */}
      {toast && (
        <div style={{
          background: '#059669', color: '#ffffff', borderRadius: '12px',
          padding: '12px 16px', fontSize: '13px', fontWeight: 700,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          boxShadow: '0 4px 12px rgba(5, 150, 105, 0.2)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CheckCircle2 size={16} />
            <span>{toast}</span>
          </div>
          <button type="button" onClick={() => setToast('')} style={{ background: 'none', border: 'none', color: '#ffffff', cursor: 'pointer', padding: 0 }}>
            ✕
          </button>
        </div>
      )}

      {/* Top Header Card */}
      <div style={{
        background: '#ffffff', border: '1px solid var(--border)', borderRadius: '14px',
        padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px'
      }}>
        <Link
          to="/shipper"
          style={{
            width: 36, height: 36, borderRadius: '10px', background: '#f8fafc',
            border: '1px solid #e2e8f0', color: 'var(--text-primary)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none'
          }}
          title="Quay lại danh sách"
        >
          <ArrowLeft size={18} />
        </Link>

        <div style={{ textAlign: 'center' }}>
          <div style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: '15px', color: 'var(--text-primary)' }}>
            #{delivery.orderCode}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
            {shippingMethodLabel[delivery.shippingMethod] || delivery.shippingMethod}
          </div>
        </div>

        <span style={{
          fontSize: '11px', fontWeight: 700, padding: '4px 10px', borderRadius: '999px',
          background: statusStyle.bg, color: statusStyle.text, border: `1px solid ${statusStyle.border || statusStyle.bg}`
        }}>
          {deliveryStatusLabel[delivery.status] || delivery.status}
        </span>
      </div>

      {/* GPS Tracking Live Telemetry Status Bar */}
      {ACTIVE_TRACKING_STATUSES.includes(delivery.status) && (
        <div style={{
          background: gpsError ? '#fef2f2' : isTracking ? '#f0fdf4' : '#f8fafc',
          border: `1px solid ${gpsError ? '#fca5a5' : isTracking ? '#86efac' : '#e2e8f0'}`,
          borderRadius: '14px',
          padding: '12px 16px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{
                  width: 10, height: 10, borderRadius: '50%',
                  background: gpsError ? '#ef4444' : isTracking ? '#10b981' : '#94a3b8'
                }} />
                {isTracking && !gpsError && (
                  <div style={{
                    position: 'absolute', width: 20, height: 20, borderRadius: '50%',
                    background: 'rgba(16, 185, 129, 0.4)',
                    animation: 'ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite'
                  }} />
                )}
              </div>

              <div>
                <div style={{
                  fontSize: '12px', fontWeight: 700,
                  color: gpsError ? '#991b1b' : isTracking ? '#15803d' : '#475569',
                  display: 'flex', alignItems: 'center', gap: 6
                }}>
                  <span>{gpsError ? 'Lỗi cảm biến GPS' : isTracking ? 'ĐANG THEO DÕI GPS THỰC TẾ' : 'Chưa bật định vị'}</span>
                  {isTracking && !gpsError && (
                    <span style={{ fontSize: '10px', background: '#dcfce7', color: '#166534', padding: '1px 6px', borderRadius: '4px' }}>
                      watchPosition() ACTIVE
                    </span>
                  )}
                </div>

                {gpsError ? (
                  <div style={{ fontSize: '12px', color: '#b91c1c', marginTop: 2 }}>
                    {gpsError}
                  </div>
                ) : (
                  <div style={{ fontSize: '11px', color: '#64748b', marginTop: 2 }}>
                    {liveCoords ? (
                      <span>
                        Tọa độ: <strong>{liveCoords.latitude.toFixed(5)}, {liveCoords.longitude.toFixed(5)}</strong>
                        {liveCoords.accuracy && ` · Sai số: ±${liveCoords.accuracy}m`}
                      </span>
                    ) : delivery.currentLatitude ? (
                      <span>Vị trí trước: {delivery.currentLatitude.toFixed(5)}, {delivery.currentLongitude.toFixed(5)}</span>
                    ) : (
                      <span>Đang chờ tín hiệu vệ tinh đầu tiên...</span>
                    )}
                  </div>
                )}
              </div>
            </div>

            {lastSyncedAt && !gpsError && (
              <div style={{ fontSize: '11px', color: '#059669', fontWeight: 600 }}>
                Đã gửi lúc: {lastSyncedAt.toLocaleTimeString('vi-VN')}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Hiển thị khi đơn đã hoàn tất hoặc thất bại -> GPS đã tự động ngắt */}
      {['DELIVERED', 'DELIVERY_FAILED', 'CANCELLED'].includes(delivery.status) && (
        <div style={{
          background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px',
          padding: '10px 14px', fontSize: '11px', color: '#64748b', display: 'flex', alignItems: 'center', gap: 6
        }}>
          <CheckCircle2 size={14} style={{ color: '#10b981' }} />
          <span>Định vị GPS đã tự động tắt sau khi kết thúc chặng giao hàng (clearWatch).</span>
        </div>
      )}

      {/* Re-delivery attempt notice */}
      {delivery.deliveryAttempts > 1 && (
        <div style={{
          background: '#fef3c7', border: '1px solid #fde68a', borderRadius: '12px',
          padding: '12px 14px', fontSize: '12px', color: '#92400e'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <AlertTriangle size={15} style={{ color: '#d97706' }} />
              <span>ĐƠN GIAO LẠI LẦN {delivery.deliveryAttempts}/3</span>
            </span>
            {delivery.nextDeliverySchedule && (
              <span style={{ fontSize: '11px', fontWeight: 700, color: '#1d4ed8' }}>
                Hẹn: {formatDate(delivery.nextDeliverySchedule)}
              </span>
            )}
          </div>
          {delivery.failureReason && (
            <div style={{ marginTop: '4px', fontSize: '11px' }}>
              Lý do giao thất bại trước: <strong>{delivery.failureReason}</strong>
            </div>
          )}
          {delivery.reAttemptNote && (
            <div style={{ marginTop: '2px', fontSize: '11px', fontStyle: 'italic' }}>
              Lời dặn: &ldquo;{delivery.reAttemptNote}&rdquo;
            </div>
          )}
        </div>
      )}

      {/* Real-time Turn-by-Turn Motorcycle Cockpit Navigation Banner */}
      {navStage && !isCompleted && (
        <div style={{
          background: isBeforePickup
            ? 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)'
            : 'linear-gradient(135deg, #064e3b 0%, #059669 100%)',
          borderRadius: '16px',
          padding: '16px 18px',
          color: '#ffffff',
          boxShadow: isBeforePickup
            ? '0 6px 20px rgba(37, 99, 235, 0.3)'
            : '0 6px 20px rgba(5, 150, 105, 0.3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 12
        }}>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em',
              background: 'rgba(255,255,255,0.2)', padding: '3px 8px', borderRadius: '6px'
            }}>
              <span>🛵 GOOGLE MAPS DẪN ĐƯỜNG XE MÁY</span>
              <span>•</span>
              <span>{navStage.badge}</span>
            </div>
            <div style={{ fontSize: '16px', fontWeight: 800, marginTop: 6, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {navStage.targetName}
            </div>
            <div style={{ fontSize: '12px', opacity: 0.9, marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              📍 {navStage.targetAddress}
            </div>
          </div>

          <a
            href={navStage.navUrl}
            target="_blank"
            rel="noreferrer"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '12px 18px', borderRadius: '12px',
              background: '#ffffff',
              color: isBeforePickup ? '#1e40af' : '#047857',
              fontSize: '13px', fontWeight: 800, textDecoration: 'none',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              flexShrink: 0
            }}
          >
            <Navigation size={16} />
            <span>MỞ DẪN ĐƯỜNG</span>
            <ExternalLink size={13} />
          </a>
        </div>
      )}

      {/* Live Interactive Map for Shipper Cockpit */}
      <LiveDeliveryMap
        delivery={delivery}
        mode="shipper"
        liveCoords={liveCoords}
        height={360}
        onRefresh={load}
      />

      {/* Dynamic Waypoint Cards Ordered by Current Delivery Stage */}
      {isBeforePickup ? (
        <>
          {/* STAGE 1 (PRIMARY): WAREHOUSE PICKUP */}
          {delivery.warehouseName && (
            <div style={{
              background: '#ffffff',
              border: '2px solid #3b82f6',
              borderRadius: '16px',
              padding: '16px',
              boxShadow: '0 4px 14px rgba(59, 130, 246, 0.12)'
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
                <div>
                  <span style={{
                    fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em',
                    color: '#2563eb', background: '#eff6ff', padding: '2px 8px', borderRadius: '6px',
                    display: 'inline-flex', alignItems: 'center', gap: 4
                  }}>
                    🎯 CHẶNG 1: ĐẾN KHO LẤY HÀNG (ƯU TIÊN)
                  </span>
                  <div style={{ fontWeight: 800, fontSize: '16px', color: 'var(--text-primary)', marginTop: '6px' }}>
                    {delivery.warehouseName} ({delivery.warehouseCode})
                  </div>
                </div>

                {delivery.warehousePhone && (
                  <a
                    href={`tel:${delivery.warehousePhone}`}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: '6px',
                      padding: '8px 14px', borderRadius: '10px',
                      background: '#2563eb', color: '#ffffff',
                      fontSize: '12px', fontWeight: 700, textDecoration: 'none',
                      boxShadow: '0 2px 8px rgba(37, 99, 235, 0.25)'
                    }}
                  >
                    <Phone size={13} />
                    <span>Gọi kho</span>
                  </a>
                )}
              </div>

              {delivery.warehouseAddress && (
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', color: 'var(--text-secondary)', marginTop: '8px', fontSize: '13px' }}>
                  <MapPin size={16} style={{ color: '#2563eb', flexShrink: 0, marginTop: '2px' }} />
                  <span style={{ fontWeight: 500 }}>{delivery.warehouseAddress}</span>
                </div>
              )}

              {delivery.totalWeightKg != null && (
                <div style={{ marginTop: '8px', fontSize: '12px', color: 'var(--text-muted)' }}>
                  Khối lượng kiện hàng: <strong style={{ color: 'var(--text-primary)' }}>{delivery.totalWeightKg} kg</strong>
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '14px' }}>
                <a
                  href={warehouseNavUrl}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    padding: '10px 12px', borderRadius: '10px',
                    background: '#2563eb', color: '#ffffff',
                    fontSize: '12px', fontWeight: 700, textDecoration: 'none',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                    boxShadow: '0 2px 6px rgba(37, 99, 235, 0.25)'
                  }}
                >
                  <Navigation size={14} />
                  <span>Đến kho (Xe máy)</span>
                  <ExternalLink size={12} style={{ opacity: 0.8 }} />
                </a>

                <button
                  type="button"
                  onClick={() => setMapOpen(true)}
                  style={{
                    padding: '10px 12px', borderRadius: '10px',
                    background: '#eff6ff', color: '#1e40af', border: '1px solid #bfdbfe',
                    fontSize: '12px', fontWeight: 700, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
                  }}
                >
                  <Compass size={14} style={{ color: '#2563eb' }} />
                  <span>Bản đồ hành trình</span>
                </button>
              </div>
            </div>
          )}

          {/* STAGE 2 (UPCOMING): CUSTOMER RECEIVER */}
          <div style={{
            background: '#ffffff', border: '1px solid var(--border)', borderRadius: '16px',
            padding: '16px', opacity: 0.9
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', marginBottom: '8px' }}>
              <div>
                <span style={{
                  fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em',
                  color: 'var(--text-muted)', background: '#f1f5f9', padding: '2px 8px', borderRadius: '6px',
                  display: 'inline-flex', alignItems: 'center', gap: 4
                }}>
                  📍 CHẶNG 2: GIAO CHO KHÁCH (TIẾP THEO)
                </span>
                <div style={{ fontWeight: 800, fontSize: '15px', color: 'var(--text-primary)', marginTop: '4px' }}>
                  {delivery.receiverName}
                </div>
              </div>

              {delivery.receiverPhone && (
                <a
                  href={`tel:${delivery.receiverPhone}`}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: '6px',
                    padding: '6px 12px', borderRadius: '8px',
                    background: '#f1f5f9', color: 'var(--text-primary)', border: '1px solid #cbd5e1',
                    fontSize: '12px', fontWeight: 600, textDecoration: 'none'
                  }}
                >
                  <Phone size={12} />
                  <span>Gọi khách</span>
                </a>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', color: 'var(--text-secondary)', fontSize: '13px' }}>
              <MapPin size={15} style={{ color: '#ef4444', flexShrink: 0, marginTop: '2px' }} />
              <span>{delivery.deliveryAddress}</span>
            </div>

            <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px solid #f1f5f9' }}>
              <a
                href={customerNavUrl}
                target="_blank"
                rel="noreferrer"
                style={{
                  fontSize: '11px', color: '#0284c7', textDecoration: 'none', fontWeight: 600,
                  display: 'inline-flex', alignItems: 'center', gap: 4
                }}
              >
                <span>Xem trước vị trí khách trên Google Maps</span>
                <ExternalLink size={11} />
              </a>
            </div>
          </div>
        </>
      ) : (
        <>
          {/* STAGE 2 (PRIMARY): CUSTOMER RECEIVER */}
          <div style={{
            background: '#ffffff',
            border: isCompleted ? '1px solid var(--border)' : '2px solid #059669',
            borderRadius: '16px',
            padding: '16px',
            boxShadow: isCompleted ? '0 1px 3px rgba(0,0,0,0.02)' : '0 4px 14px rgba(5, 150, 105, 0.12)'
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', marginBottom: '10px' }}>
              <div>
                <span style={{
                  fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em',
                  color: isCompleted ? 'var(--text-muted)' : '#047857',
                  background: isCompleted ? '#f1f5f9' : '#ecfdf5',
                  padding: '2px 8px', borderRadius: '6px',
                  display: 'inline-flex', alignItems: 'center', gap: 4
                }}>
                  {isCompleted ? '📍 ĐỊA CHỈ NHẬN HÀNG' : '🎯 CHẶNG 2: GIAO HÀNG CHO KHÁCH (ƯU TIÊN)'}
                </span>
                <div style={{ fontWeight: 800, fontSize: '16px', color: 'var(--text-primary)', marginTop: '6px' }}>
                  {delivery.receiverName}
                </div>
              </div>

              {delivery.receiverPhone && (
                <a
                  href={`tel:${delivery.receiverPhone}`}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: '6px',
                    padding: '8px 14px', borderRadius: '10px',
                    background: '#0a3d8f', color: '#ffffff',
                    fontSize: '12px', fontWeight: 700, textDecoration: 'none',
                    boxShadow: '0 2px 8px rgba(10, 61, 143, 0.25)'
                  }}
                >
                  <Phone size={13} />
                  <span>Gọi điện</span>
                </a>
              )}
            </div>

            <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '10px', fontSize: '13px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', color: 'var(--text-secondary)', lineHeight: 1.35 }}>
                <MapPin size={16} style={{ color: '#ef4444', flexShrink: 0, marginTop: '2px' }} />
                <span style={{ fontWeight: 500 }}>{delivery.deliveryAddress}</span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '12px' }}>
                <a
                  href={customerNavUrl}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    padding: '10px 12px', borderRadius: '10px',
                    background: '#059669', color: '#ffffff',
                    fontSize: '12px', fontWeight: 700, textDecoration: 'none',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                    boxShadow: '0 2px 6px rgba(5, 150, 105, 0.25)'
                  }}
                >
                  <Navigation size={14} />
                  <span>Đến khách (Xe máy)</span>
                  <ExternalLink size={12} style={{ opacity: 0.8 }} />
                </a>

                <button
                  type="button"
                  onClick={() => setMapOpen(true)}
                  style={{
                    padding: '10px 12px', borderRadius: '10px',
                    background: '#f0fdf4', color: '#047857', border: '1px solid #a7f3d0',
                    fontSize: '12px', fontWeight: 700, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
                  }}
                >
                  <Compass size={14} style={{ color: '#059669' }} />
                  <span>Bản đồ hành trình</span>
                </button>
              </div>
            </div>
          </div>

          {/* WAREHOUSE (ORIGIN / COMPLETED) */}
          {delivery.warehouseName && (
            <div style={{
              background: '#f8fafc', border: '1px solid var(--border)', borderRadius: '16px',
              padding: '14px 16px', opacity: 0.88
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
                <div>
                  <span style={{
                    fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em',
                    color: '#059669', background: '#ecfdf5', padding: '2px 8px', borderRadius: '6px',
                    display: 'inline-flex', alignItems: 'center', gap: 4
                  }}>
                    ✓ ĐIỂM XUẤT PHÁT: KHO HÀNG (ĐÃ HOÀN TẤT NHẬN)
                  </span>
                  <div style={{ fontWeight: 800, fontSize: '14px', color: 'var(--text-primary)', marginTop: '4px' }}>
                    {delivery.warehouseName} ({delivery.warehouseCode})
                  </div>
                </div>

                {delivery.warehousePhone && (
                  <a
                    href={`tel:${delivery.warehousePhone}`}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: '4px',
                      padding: '5px 10px', borderRadius: '8px',
                      background: '#ffffff', color: '#475569', border: '1px solid #cbd5e1',
                      fontSize: '11px', fontWeight: 600, textDecoration: 'none'
                    }}
                  >
                    <Phone size={11} />
                    <span>Gọi kho</span>
                  </a>
                )}
              </div>

              {delivery.warehouseAddress && (
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', color: 'var(--text-muted)', marginTop: '6px', fontSize: '12px' }}>
                  <MapPin size={14} style={{ color: '#94a3b8', flexShrink: 0, marginTop: '2px' }} />
                  <span>{delivery.warehouseAddress}</span>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Products list card */}
      {delivery.items && delivery.items.length > 0 && (
        <div style={{
          background: '#ffffff', border: '1px solid var(--border)', borderRadius: '16px',
          padding: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
        }}>
          <span style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', display: 'block', marginBottom: '8px' }}>
            DANH SÁCH SẢN PHẨM ({delivery.items.length})
          </span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {delivery.items.map((it, idx) => (
              <div key={it.id || idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '13px', padding: '6px 0', borderBottom: idx === delivery.items.length - 1 ? 'none' : '1px solid #f1f5f9' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Package size={15} style={{ color: '#0a3d8f', flexShrink: 0 }} />
                  <div>
                    <strong style={{ color: 'var(--text-primary)' }}>{it.productName}</strong>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Số lượng: x{it.quantity}</div>
                  </div>
                </div>
                <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                  {formatPrice(it.subTotal || it.price * it.quantity)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* COD Cash to collect */}
      <div style={{
        background: 'linear-gradient(135deg, #fffbeb 0%, #fff7ed 100%)',
        border: '1px solid #fed7aa', borderRadius: '16px', padding: '16px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: 38, height: 38, borderRadius: '10px',
              background: '#f59e0b', color: '#ffffff',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <DollarSign size={20} />
            </div>
            <div>
              <span style={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#92400e', display: 'block' }}>
                {delivery.paymentMethod === 'COD' ? 'THU HỘ TIỀN MẶT (COD)' : 'ĐÃ THANH TOÁN ONLINE'}
              </span>
              <div style={{ fontSize: '18px', fontWeight: 900, color: '#b45309' }}>
                {delivery.paymentMethod === 'COD' ? formatPrice(delivery.orderTotalAmount || 0) : '0 ₫ (Không thu tiền)'}
              </div>
            </div>
          </div>

          <span style={{
            padding: '4px 10px', borderRadius: '8px', fontSize: '11px', fontWeight: 700,
            background: delivery.paymentStatus === 'PAID' ? '#ecfdf5' : '#fef3c7',
            color: delivery.paymentStatus === 'PAID' ? '#047857' : '#b45309'
          }}>
            {delivery.paymentStatus === 'PAID' ? 'Đã thu tiền' : 'Chưa thu tiền'}
          </span>
        </div>
      </div>

      {/* Primary Touch Flow Buttons */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {/* Proof of Delivery Card when status is DELIVERED */}
        {delivery.status === 'DELIVERED' && (
          <div style={{
            background: '#ffffff',
            border: '2px solid #a855f7',
            borderRadius: '16px',
            padding: '18px',
            boxShadow: '0 4px 16px rgba(168, 85, 247, 0.12)',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
              <div>
                <span style={{
                  fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em',
                  color: '#7e22ce', background: '#faf5ff', border: '1px solid #e9d5ff',
                  padding: '3px 8px', borderRadius: '6px',
                  display: 'inline-flex', alignItems: 'center', gap: 4
                }}>
                  <Camera size={12} />
                  <span>BẰNG CHỨNG GIAO HÀNG (PROOF OF DELIVERY)</span>
                </span>
                <div style={{ fontWeight: 800, fontSize: '15px', color: 'var(--text-primary)', marginTop: '6px' }}>
                  Đã bàn giao cho {delivery.receiverName}
                </div>
                {delivery.deliveredAt && (
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                    Thời gian giao: {formatDate(delivery.deliveredAt)}
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={() => {
                  setUpdateProofFile(null);
                  setUpdateProofPreview(delivery.proofImage || null);
                  setShowUpdateProofModal(true);
                }}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '5px',
                  padding: '7px 12px', borderRadius: '8px',
                  background: '#faf5ff', color: '#7e22ce', border: '1px solid #d8b4fe',
                  fontSize: '11px', fontWeight: 700, cursor: 'pointer', flexShrink: 0
                }}
              >
                <Camera size={13} />
                <span>{delivery.proofImage ? 'Cập nhật ảnh' : 'Bổ sung ảnh POD'}</span>
              </button>
            </div>

            {delivery.proofImage ? (
              <div style={{
                display: 'flex', alignItems: 'center', gap: '14px',
                padding: '12px', borderRadius: '12px', background: '#faf5ff', border: '1px dashed #d8b4fe'
              }}>
                <div
                  onClick={() => setPreviewImage(delivery.proofImage)}
                  style={{
                    position: 'relative', width: 68, height: 68, borderRadius: '10px',
                    overflow: 'hidden', border: '1px solid #c084fc', cursor: 'pointer', flexShrink: 0
                  }}
                  title="Bấm để xem ảnh phóng to"
                >
                  <img
                    src={resolveImageUrl(delivery.proofImage)}
                    alt="Bằng chứng giao hàng"
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                  <div style={{
                    position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.25)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff',
                    opacity: 0.9
                  }}>
                    <Camera size={16} />
                  </div>
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#6b21a8' }}>
                    Ảnh ký nhận / bàn giao thành công
                  </div>
                  <div style={{ fontSize: '11px', color: '#7e22ce', marginTop: '2px' }}>
                    Đã lưu trữ hệ thống đối soát H&G
                  </div>
                  <button
                    type="button"
                    onClick={() => setPreviewImage(delivery.proofImage)}
                    style={{
                      marginTop: '6px', background: 'none', border: 'none', padding: 0,
                      color: '#7e22ce', fontSize: '11px', fontWeight: 700, cursor: 'pointer',
                      textDecoration: 'underline', display: 'inline-flex', alignItems: 'center', gap: 4
                    }}
                  >
                    <span>Xem phóng to ảnh</span>
                    <ExternalLink size={11} />
                  </button>
                </div>
              </div>
            ) : (
              <div style={{
                padding: '12px', borderRadius: '12px', background: '#fffbeb', border: '1px dashed #fde68a',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <AlertTriangle size={18} style={{ color: '#d97706', flexShrink: 0 }} />
                  <div style={{ fontSize: '12px', color: '#92400e' }}>
                    Đơn đã hoàn tất nhưng chưa có ảnh đối soát (POD).
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setUpdateProofFile(null);
                    setUpdateProofPreview(null);
                    setShowUpdateProofModal(true);
                  }}
                  style={{
                    padding: '6px 12px', borderRadius: '8px',
                    background: '#d97706', color: '#fff', border: 'none',
                    fontSize: '11px', fontWeight: 700, cursor: 'pointer', flexShrink: 0
                  }}
                >
                  Bổ sung ngay
                </button>
              </div>
            )}
          </div>
        )}
        {delivery.status === 'ASSIGNED' && (
          <button
            type="button"
            disabled={actionLoading}
            onClick={handleAccept}
            className="hg-shipper-btn-primary accept"
          >
            <CheckCircle2 size={18} />
            <span>{actionLoading ? 'ĐANG XỬ LÝ...' : 'CHẤP NHẬN ĐƠN NÀY'}</span>
          </button>
        )}

        {delivery.status === 'SHIPPER_ACCEPTED' && (
          <button
            type="button"
            disabled={actionLoading}
            onClick={handlePickup}
            className="hg-shipper-btn-primary pickup"
          >
            <Package size={18} />
            <span>{actionLoading ? 'ĐANG XÁC NHẬN...' : 'ĐÃ LẤY HÀNG TỪ CỬA HÀNG'}</span>
          </button>
        )}

        {delivery.status === 'PICKED_UP' && (
          <button
            type="button"
            disabled={actionLoading}
            onClick={handleStartDelivery}
            className="hg-shipper-btn-primary deliver"
          >
            <Navigation size={18} />
            <span>{actionLoading ? 'ĐANG ĐỒNG BỘ...' : 'BẮT ĐẦU DI CHUYỂN GIAO HÀNG'}</span>
          </button>
        )}

        {delivery.status === 'IN_TRANSIT' && (
          <>
            <button
              type="button"
              disabled={actionLoading}
              onClick={handleArrive}
              className="hg-shipper-btn-primary success"
            >
              <MapPin size={18} />
              <span>{actionLoading ? 'ĐANG CẬP NHẬT...' : 'TÔI ĐÃ ĐẾN NƠI NHẬN HÀNG'}</span>
            </button>

            {!showCompleteForm && (
              <button
                type="button"
                disabled={actionLoading}
                onClick={() => setShowCompleteForm(true)}
                style={{
                  width: '100%', padding: '13px', borderRadius: '12px',
                  background: '#059669', color: '#ffffff', border: 'none',
                  fontSize: '14px', fontWeight: 800, cursor: 'pointer',
                  boxShadow: '0 4px 14px rgba(5, 150, 105, 0.3)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                }}
              >
                <CheckCircle2 size={18} />
                <span>HOÀN TẤT GIAO HÀNG</span>
              </button>
            )}
          </>
        )}

        {/* ARRIVED — show complete button */}
        {delivery.status === 'ARRIVED' && !showCompleteForm && (
          <button
            type="button"
            disabled={actionLoading}
            onClick={() => setShowCompleteForm(true)}
            style={{
              width: '100%', padding: '13px', borderRadius: '12px',
              background: '#059669', color: '#ffffff', border: 'none',
              fontSize: '14px', fontWeight: 800, cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(5, 150, 105, 0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
            }}
          >
            <CheckCircle2 size={18} />
            <span>HOÀN TẤT GIAO HÀNG</span>
          </button>
        )}

        {/* Complete Form (IN_TRANSIT or ARRIVED) */}
        {(delivery.status === 'IN_TRANSIT' || delivery.status === 'ARRIVED') && showCompleteForm && (
          <form
            onSubmit={handleComplete}
            style={{
              background: '#ffffff', border: '2px solid #10b981', borderRadius: '16px',
              padding: '18px', boxShadow: '0 6px 20px rgba(16, 185, 129, 0.15)',
              display: 'flex', flexDirection: 'column', gap: '14px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#047857', fontWeight: 800, fontSize: '14px' }}>
                <CheckCircle2 size={18} />
                <span>Xác nhận hoàn tất giao hàng</span>
              </div>
              <button
                type="button"
                onClick={() => setShowCompleteForm(false)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: 0 }}
              >
                ✕
              </button>
            </div>

            {/* Proof Photo */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                <label style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)' }}>
                  Ảnh bằng chứng giao hàng (Tùy chọn)
                </label>
                <button
                  type="button"
                  onClick={handleUseDemoProof}
                  style={{
                    background: 'none', border: 'none', color: '#d97706',
                    fontSize: '11px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px'
                  }}
                >
                  <Sparkles size={12} />
                  <span>Ảnh mẫu demo</span>
                </button>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <label style={{
                  flex: 1, padding: '10px', borderRadius: '10px', border: '1px dashed #cbd5e1',
                  background: '#f8fafc', color: 'var(--text-secondary)', fontSize: '12px', fontWeight: 600,
                  textAlign: 'center', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
                }}>
                  <Camera size={16} />
                  <span>{proofFile ? 'Đổi ảnh chụp' : 'Chụp / Chọn ảnh'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handleFileChange}
                    style={{ display: 'none' }}
                  />
                </label>

                {proofPreview && (
                  <div
                    style={{ position: 'relative', width: 44, height: 44, borderRadius: '8px', overflow: 'hidden', border: '1px solid #cbd5e1', cursor: 'pointer' }}
                    onClick={() => setPreviewImage(proofPreview)}
                    title="Bấm để xem phóng to ảnh vừa chụp"
                  >
                    <img
                      src={resolveImageUrl(proofPreview)}
                      alt="Proof"
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setProofFile(null); setProofPreview(null); }}
                      style={{
                        position: 'absolute', top: 0, right: 0, background: '#ef4444',
                        color: '#fff', border: 'none', borderRadius: '50%', width: 16, height: 16,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: '10px'
                      }}
                    >
                      ✕
                    </button>
                  </div>
                )}
              </div>
            </div>

            <input
              type="text"
              value={completeNote}
              onChange={(e) => setCompleteNote(e.target.value)}
              placeholder="Ghi chú giao hàng (tùy chọn)..."
              style={{
                width: '100%', padding: '10px 12px', borderRadius: '10px',
                border: '1px solid var(--border)', fontSize: '12px', outline: 'none'
              }}
            />

            <button
              type="submit"
              disabled={actionLoading || uploadingProof}
              style={{
                width: '100%', padding: '14px', borderRadius: '12px',
                background: '#059669', color: '#ffffff', border: 'none',
                fontSize: '14px', fontWeight: 800, cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(5, 150, 105, 0.3)',
                opacity: (actionLoading || uploadingProof) ? 0.6 : 1
              }}
            >
              <span>{actionLoading ? 'Đang xử lý...' : 'HOÀN TẤT GIAO HÀNG THÀNH CÔNG'}</span>
            </button>
          </form>
        )}

        {/* Báo giao thất bại */}
        {['IN_TRANSIT', 'ARRIVED'].includes(delivery.status) && (
          <button
            type="button"
            onClick={() => setFailModalOpen(true)}
            style={{
              width: '100%', padding: '10px', borderRadius: '10px',
              background: '#fff1f2', color: '#e11d48', border: '1px solid #fecdd3',
              fontSize: '12px', fontWeight: 700, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
            }}
          >
            <ShieldAlert size={14} />
            <span>Báo không giao được hàng</span>
          </button>
        )}
      </div>

      {/* Package Items */}
      <div style={{
        background: '#ffffff', border: '1px solid var(--border)', borderRadius: '16px',
        padding: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
      }}>
        <div style={{
          fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em',
          color: 'var(--text-muted)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px'
        }}>
          <Package size={14} style={{ color: '#0a3d8f' }} />
          <span>Sản phẩm trong kiện ({delivery.items?.length || 0})</span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {(delivery.items || []).map((item) => (
            <div key={item.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', fontSize: '13px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                <img
                  src={item.productImage ? resolveImageUrl(item.productImage) : 'https://placehold.co/60x60?text=SP'}
                  alt={item.productName}
                  style={{ width: 42, height: 42, borderRadius: '8px', objectFit: 'cover', border: '1px solid var(--border)', flexShrink: 0 }}
                />
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {item.productName}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                    SL: x{item.quantity}
                  </div>
                </div>
              </div>
              <div style={{ fontWeight: 700, color: 'var(--text-primary)', flexShrink: 0 }}>
                {formatPrice(item.subTotal || item.price * item.quantity)}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modal Báo Giao Thất Bại */}
      {failModalOpen && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px'
        }}>
          <div style={{
            background: '#ffffff', borderRadius: '16px', maxWidth: '380px', width: '100%',
            padding: '20px', boxShadow: '0 20px 40px rgba(0,0,0,0.3)', border: '1px solid var(--border)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#e11d48', fontWeight: 800, fontSize: '15px' }}>
                <AlertTriangle size={18} />
                <span>Báo Giao Thất Bại</span>
              </div>
              <button
                type="button"
                onClick={() => setFailModalOpen(false)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: 0 }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleFailSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '13px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  Lý do chính:
                </label>
                <select
                  value={failReason}
                  onChange={(e) => setFailReason(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid var(--border)', background: '#ffffff', fontSize: '13px' }}
                >
                  {FAILURE_REASONS.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  Ghi chú cụ thể:
                </label>
                <textarea
                  rows={3}
                  value={failNote}
                  onChange={(e) => setFailNote(e.target.value)}
                  placeholder="Mô tả cụ thể để Admin và CSKH xử lý..."
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid var(--border)', fontSize: '12px', outline: 'none' }}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px', marginTop: '6px' }}>
                <button
                  type="button"
                  onClick={() => setFailModalOpen(false)}
                  style={{ padding: '8px 14px', borderRadius: '8px', background: '#f1f5f9', border: 'none', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  style={{ padding: '8px 16px', borderRadius: '8px', background: '#e11d48', color: '#fff', border: 'none', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}
                >
                  {actionLoading ? 'Đang gửi...' : 'Xác nhận thất bại'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Cập Nhật Ảnh Bằng Chứng (POD) */}
      {showUpdateProofModal && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px'
        }}>
          <div style={{
            background: '#ffffff', borderRadius: '16px', maxWidth: '420px', width: '100%',
            padding: '20px', boxShadow: '0 20px 40px rgba(0,0,0,0.3)', border: '1px solid var(--border)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#7e22ce', fontWeight: 800, fontSize: '15px' }}>
                <Camera size={18} />
                <span>Bằng Chứng Giao Hàng (POD)</span>
              </div>
              <button
                type="button"
                onClick={() => setShowUpdateProofModal(false)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: 0 }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdateProofSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '13px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <label style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)' }}>
                  Chọn hoặc chụp ảnh:
                </label>
                <button
                  type="button"
                  onClick={handleUseDemoProofForUpdate}
                  style={{
                    background: 'none', border: 'none', color: '#d97706',
                    fontSize: '11px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px'
                  }}
                >
                  <Sparkles size={12} />
                  <span>Tạo ảnh mẫu demo</span>
                </button>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <label style={{
                  flex: 1, padding: '12px', borderRadius: '10px', border: '1px dashed #cbd5e1',
                  background: '#f8fafc', color: 'var(--text-secondary)', fontSize: '12px', fontWeight: 600,
                  textAlign: 'center', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
                }}>
                  <Camera size={16} />
                  <span>{updateProofFile ? 'Đổi ảnh chụp' : 'Chụp / Chọn file ảnh'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handleUpdateProofFileChange}
                    style={{ display: 'none' }}
                  />
                </label>

                {updateProofPreview && (
                  <div style={{ position: 'relative', width: 50, height: 50, borderRadius: '8px', overflow: 'hidden', border: '1px solid #cbd5e1' }}>
                    <img
                      src={resolveImageUrl(updateProofPreview)}
                      alt="Proof preview"
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                    <button
                      type="button"
                      onClick={() => { setUpdateProofFile(null); setUpdateProofPreview(null); }}
                      style={{
                        position: 'absolute', top: 0, right: 0, background: '#ef4444',
                        color: '#fff', border: 'none', borderRadius: '50%', width: 16, height: 16,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: '10px'
                      }}
                    >
                      ✕
                    </button>
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px', marginTop: '6px' }}>
                <button
                  type="button"
                  onClick={() => setShowUpdateProofModal(false)}
                  style={{ padding: '8px 14px', borderRadius: '8px', background: '#f1f5f9', border: 'none', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={updatingProof}
                  style={{
                    padding: '8px 16px', borderRadius: '8px', background: '#7e22ce', color: '#fff', border: 'none',
                    fontSize: '12px', fontWeight: 700, cursor: 'pointer', opacity: updatingProof ? 0.7 : 1
                  }}
                >
                  {updatingProof ? 'Đang lưu...' : 'Lưu ảnh bằng chứng'}
                </button>
              </div>
            </form>
          </div>
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
          <div
            style={{ position: 'relative', maxWidth: '600px', width: '100%', textAlign: 'center' }}
            onClick={(e) => e.stopPropagation()}
          >
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
              alt="Bằng chứng giao hàng"
              style={{ maxHeight: '75vh', maxWidth: '100%', borderRadius: '16px', boxShadow: '0 20px 40px rgba(0,0,0,0.5)' }}
            />
            <div style={{ color: '#ffffff', fontSize: '13px', marginTop: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
              <span>📸 Bằng chứng giao hàng · Đơn #{delivery.orderCode || delivery.id}</span>
              <a
                href={resolveImageUrl(previewImage)}
                target="_blank"
                rel="noreferrer"
                download={`POD_${delivery.orderCode || delivery.id}.jpg`}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '4px',
                  color: '#38bdf8', textDecoration: 'none', fontWeight: 600, fontSize: '12px'
                }}
              >
                <span>Mở ảnh gốc</span>
                <ExternalLink size={12} />
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Modal Bản Đồ */}
      <DeliveryMapModal
        isOpen={mapOpen}
        onClose={() => setMapOpen(false)}
        delivery={delivery}
      />
    </div>
  );
}
