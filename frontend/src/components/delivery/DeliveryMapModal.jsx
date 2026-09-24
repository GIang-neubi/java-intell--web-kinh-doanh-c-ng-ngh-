import { useEffect, useState, useCallback } from 'react';
import {
  Compass, X, Navigation, ExternalLink, RefreshCw
} from 'lucide-react';
import { fetchAdminDeliveryDetail } from '../../api/delivery';
import { deliveryStatusLabel, deliveryStatusColor, shippingMethodLabel } from '../../utils/helpers';
import { getDeliveryNavigationStage, buildFullRouteUrl } from '../../utils/navigation';
import LiveDeliveryMap from './LiveDeliveryMap';

export default function DeliveryMapModal({ isOpen, onClose, delivery }) {
  const [freshDelivery, setFreshDelivery] = useState(delivery);
  const [loading, setLoading] = useState(false);

  const loadFresh = useCallback(async () => {
    if (!delivery?.id) return;
    setLoading(true);
    try {
      const data = await fetchAdminDeliveryDetail(delivery.id);
      if (data) setFreshDelivery(data);
    } catch (err) {
      // Keep existing delivery on error
    } finally {
      setLoading(false);
    }
  }, [delivery?.id]);

  useEffect(() => {
    if (isOpen && delivery) {
      setFreshDelivery(delivery);
      loadFresh();
    }
  }, [isOpen, delivery, loadFresh]);

  if (!isOpen || !delivery) return null;

  const current = freshDelivery || delivery;
  const statusStyle = deliveryStatusColor[current.status] || { bg: '#eff6ff', text: '#1d4ed8' };
  const isMoving = ['IN_TRANSIT', 'ARRIVED'].includes(current.status);

  // Link chỉ đường theo chặng hiện tại & toàn tuyến
  const navStage = getDeliveryNavigationStage(current);
  const fullRouteUrl = buildFullRouteUrl(current);
  const activeNavUrl = navStage?.navUrl || fullRouteUrl;

  return (
    <div className="hg-modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div
        className="hg-modal-dialog xl"
        onClick={(e) => e.stopPropagation()}
        style={{ padding: 0, overflow: 'hidden' }}
      >
        {/* Modal Header */}
        <div className="hg-modal-header" style={{ padding: '16px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: 38, height: 38, borderRadius: '10px',
              background: '#eff6ff', color: '#1e40af',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
            }}>
              <Compass size={20} className={isMoving ? 'animate-spin' : ''} />
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h2 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                  Giám sát lộ trình đơn #{current.orderCode || current.id}
                </h2>
                <span style={{
                  fontSize: '11px', fontWeight: 800, padding: '2px 8px', borderRadius: '999px',
                  backgroundColor: statusStyle.bg, color: statusStyle.text
                }}>
                  {deliveryStatusLabel[current.status] || current.status}
                </span>
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                Phương thức: <strong>{shippingMethodLabel[current.shippingMethod] || current.shippingMethod}</strong> · Phiếu DL#{current.id}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              onClick={loadFresh}
              className="btn btn-secondary btn-sm"
              style={{ padding: '7px 10px', fontSize: '12px' }}
              title="Làm mới tọa độ"
            >
              <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            </button>

            <button
              type="button"
              onClick={onClose}
              className="hg-modal-close-btn"
              title="Đóng modal"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Modal Body: Leaflet Live Map */}
        <div style={{ padding: '12px', background: 'var(--bg)' }}>
          <LiveDeliveryMap
            delivery={current}
            height={460}
            mode="admin"
            onRefresh={loadFresh}
          />
        </div>

        {/* Modal Footer */}
        <div className="hg-modal-footer" style={{ padding: '12px 20px', justifyContent: 'space-between' }}>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            Hệ thống định vị GPS tự động đồng bộ theo tọa độ thiết bị của Shipper.
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {activeNavUrl && (
              <a
                href={activeNavUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '6px',
                  padding: '8px 14px', borderRadius: '8px',
                  background: '#2563eb', color: '#ffffff',
                  fontSize: '12px', fontWeight: 700, textDecoration: 'none'
                }}
                title={navStage ? `Dẫn đường xe máy: ${navStage.title}` : 'Chỉ đường trên Google Maps'}
              >
                <Navigation size={13} />
                <span>{navStage ? navStage.badge : 'Google Maps'}</span>
                <ExternalLink size={12} />
              </a>
            )}

            {fullRouteUrl && fullRouteUrl !== activeNavUrl && (
              <a
                href={fullRouteUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '6px',
                  padding: '8px 12px', borderRadius: '8px',
                  background: '#f1f5f9', color: '#1e40af', border: '1px solid #bfdbfe',
                  fontSize: '12px', fontWeight: 600, textDecoration: 'none'
                }}
                title="Mở toàn tuyến từ Kho đến Khách"
              >
                <span>Kho ➔ Khách</span>
                <ExternalLink size={11} />
              </a>
            )}

            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary btn-sm"
              style={{ padding: '8px 14px', fontSize: '12px' }}
            >
              Đóng
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
