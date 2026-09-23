import { useEffect, useRef, useState, useMemo } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  Store, User, Navigation, MapPin, Compass, Clock, Phone,
  Truck, ShieldCheck, AlertCircle, RefreshCw, ExternalLink, Maximize2
} from 'lucide-react';
import { deliveryStatusLabel, deliveryStatusColor, shippingMethodLabel, formatPrice } from '../../utils/helpers';
import {
  buildWarehouseNavUrl,
  buildCustomerNavUrl,
  buildFullRouteUrl,
  getDeliveryNavigationStage
} from '../../utils/navigation';
import { setupMapTiles, getApproximateCoordsFromAddress } from '../../utils/mapTiles';

// Helper: tính thời gian "X giây/phút trước"
function getTimeAgo(dateString) {
  if (!dateString) return null;
  const now = Date.now();
  const past = new Date(dateString).getTime();
  if (isNaN(past)) return null;
  const diffSec = Math.max(0, Math.floor((now - past) / 1000));
  if (diffSec < 10) return 'Vừa xong';
  if (diffSec < 60) return `${diffSec} giây trước`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} phút trước`;
  const diffHour = Math.floor(diffMin / 60);
  return `${diffHour} giờ trước`;
}

// Marker Kho H&G
function createWarehouseIcon(name = 'Kho hàng H&G') {
  return L.divIcon({
    className: 'hg-wh-marker',
    html: `
      <div style="position: relative; display: flex; flex-direction: column; align-items: center; transform: translate(-50%, -100%);">
        <div style="
          background: #1e3a8a; color: #fff; font-size: 11px; font-weight: 700;
          padding: 3px 8px; border-radius: 6px; box-shadow: 0 4px 10px rgba(0,0,0,0.25);
          white-space: nowrap; margin-bottom: 3px; border: 1px solid rgba(255,255,255,0.4);
        ">
          🏢 ${name}
        </div>
        <div style="
          width: 34px; height: 34px; background: linear-gradient(135deg, #1d4ed8, #1e40af);
          border: 3px solid #ffffff; border-radius: 50% 50% 50% 0;
          transform: rotate(-45deg); box-shadow: 0 4px 14px rgba(0,0,0,0.3);
          display: flex; align-items: center; justify-content: center;
        ">
          <span style="transform: rotate(45deg); font-size: 14px;">🏪</span>
        </div>
        <div style="width: 8px; height: 6px; background: rgba(0,0,0,0.3); border-radius: 50%; filter: blur(1px);"></div>
      </div>
    `,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
    popupAnchor: [0, -42],
  });
}

// Marker Shipper 🛵 có radar pulse
function createShipperIcon(shipperName = 'Shipper', isMoving = true) {
  return L.divIcon({
    className: 'hg-shipper-marker',
    html: `
      <div style="position: relative; display: flex; flex-direction: column; align-items: center; transform: translate(-50%, -100%);">
        <div style="
          background: #d97706; color: #ffffff; font-size: 11px; font-weight: 800;
          padding: 3px 8px; border-radius: 6px; box-shadow: 0 4px 10px rgba(217,119,6,0.4);
          white-space: nowrap; margin-bottom: 3px; border: 1px solid rgba(255,255,255,0.5);
        ">
          🛵 ${shipperName}
        </div>
        <div style="position: relative; display: flex; align-items: center; justify-content: center;">
          ${isMoving ? `
            <div style="
              position: absolute; width: 44px; height: 44px; border-radius: 50%;
              background: rgba(245, 158, 11, 0.4);
              animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;
            "></div>
          ` : ''}
          <div style="
            width: 36px; height: 36px; background: linear-gradient(135deg, #f59e0b, #d97706);
            border: 3px solid #ffffff; border-radius: 50%;
            box-shadow: 0 4px 14px rgba(0,0,0,0.35);
            display: flex; align-items: center; justify-content: center; z-index: 2;
          ">
            <span style="font-size: 16px;">🛵</span>
          </div>
        </div>
        <div style="width: 10px; height: 6px; background: rgba(0,0,0,0.3); border-radius: 50%; filter: blur(1px); margin-top: 2px;"></div>
      </div>
    `,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
    popupAnchor: [0, -46],
  });
}

// Marker Khách hàng 📍
function createCustomerIcon(customerName = 'Khách hàng') {
  return L.divIcon({
    className: 'hg-customer-marker',
    html: `
      <div style="position: relative; display: flex; flex-direction: column; align-items: center; transform: translate(-50%, -100%);">
        <div style="
          background: #e11d48; color: #fff; font-size: 11px; font-weight: 700;
          padding: 3px 8px; border-radius: 6px; box-shadow: 0 4px 10px rgba(225,29,72,0.35);
          white-space: nowrap; margin-bottom: 3px; border: 1px solid rgba(255,255,255,0.4);
        ">
          📍 ${customerName}
        </div>
        <div style="
          width: 34px; height: 34px; background: linear-gradient(135deg, #e11d48, #be123c);
          border: 3px solid #ffffff; border-radius: 50% 50% 50% 0;
          transform: rotate(-45deg); box-shadow: 0 4px 14px rgba(0,0,0,0.3);
          display: flex; align-items: center; justify-content: center;
        ">
          <span style="transform: rotate(45deg); font-size: 14px;">🏠</span>
        </div>
        <div style="width: 8px; height: 6px; background: rgba(0,0,0,0.3); border-radius: 50%; filter: blur(1px);"></div>
      </div>
    `,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
    popupAnchor: [0, -42],
  });
}

/**
 * Bản đồ giao hàng trực quan đa năng (Dùng cho Admin, Shipper, Customer)
 * Tuân thủ tuyệt đối: "Do not create fake route lines. If real route calculation is unavailable, show the markers and addresses only."
 */
export default function LiveDeliveryMap({
  delivery,
  height = 420,
  mode = 'admin', // 'admin' | 'shipper' | 'customer'
  onRefresh = null,
  liveCoords = null,
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersGroupRef = useRef(null);
  const validBoundsRef = useRef([]);

  const currentLat = liveCoords?.latitude ?? delivery?.currentLatitude;
  const currentLng = liveCoords?.longitude ?? delivery?.currentLongitude;
  const hasShipperCoords = typeof currentLat === 'number' && typeof currentLng === 'number';

  const isBeforePickup = ['ASSIGNED', 'SHIPPER_ACCEPTED'].includes(delivery?.status);
  const isAfterPickup = ['PICKED_UP', 'IN_TRANSIT', 'ARRIVED'].includes(delivery?.status);
  const isDone = ['DELIVERED', 'DELIVERY_FAILED', 'CANCELLED'].includes(delivery?.status);

  const shipperCoords = hasShipperCoords ? { latitude: currentLat, longitude: currentLng } : null;
  const whNavUrl = buildWarehouseNavUrl(delivery, shipperCoords);
  const custNavUrl = buildCustomerNavUrl(delivery, shipperCoords);
  const fullRouteUrl = buildFullRouteUrl(delivery);
  const navStage = getDeliveryNavigationStage(delivery, shipperCoords);

  const [customerCoords, setCustomerCoords] = useState(null);
  const [timeAgoStr, setTimeAgoStr] = useState(getTimeAgo(delivery?.lastLocationUpdate));

  // Cập nhật nhãn "X giây trước" mỗi giây
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeAgoStr(getTimeAgo(delivery?.lastLocationUpdate));
    }, 1000);
    return () => clearInterval(timer);
  }, [delivery?.lastLocationUpdate]);

  // Lấy tọa độ khách hàng (nếu địa chỉ có và chưa có tọa độ, geocode 1 lần qua Nominatim)
  useEffect(() => {
    let alive = true;
    if (!delivery?.deliveryAddress) {
      setCustomerCoords(null);
      return;
    }

    // Tự động tìm tọa độ điểm nhận khách hàng nếu chưa có
    const query = delivery.deliveryAddress.trim();
    const approx = getApproximateCoordsFromAddress(query);
    if (approx) {
      setCustomerCoords(approx);
    }
    return () => { alive = false; };
  }, [delivery?.deliveryAddress]);

  // Khởi tạo bản đồ Leaflet
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [21.0285, 105.8542],
      zoom: 13,
      zoomControl: true,
      attributionControl: false,
    });

    setupMapTiles(map);

    const markersGroup = L.featureGroup().addTo(map);
    markersGroupRef.current = markersGroup;
    mapInstanceRef.current = map;

    setTimeout(() => {
      map.invalidateSize();
    }, 250);

    return () => {
      map.remove();
      mapInstanceRef.current = null;
      markersGroupRef.current = null;
    };
  }, []);

  // Vẽ các marker (Kho, Shipper, Khách) khi dữ liệu thay đổi
  useEffect(() => {
    if (!mapInstanceRef.current || !markersGroupRef.current || !delivery) return;

    markersGroupRef.current.clearLayers();
    const validBounds = [];

    // 1. Marker Kho H&G 📍
    if (delivery.warehouseLatitude && delivery.warehouseLongitude) {
      const whLat = delivery.warehouseLatitude;
      const whLng = delivery.warehouseLongitude;
      validBounds.push([whLat, whLng]);

      const whMarker = L.marker([whLat, whLng], {
        icon: createWarehouseIcon(delivery.warehouseName || delivery.warehouseCode || 'Kho xuất hàng'),
      });

      const whPopup = `
        <div style="min-width: 200px; padding: 2px;">
          <div style="font-size: 11px; font-weight: 700; color: #1e40af; text-transform: uppercase;">
            🏪 KHO XUẤT HÀNG
          </div>
          <div style="font-weight: 800; font-size: 13px; color: #0f172a; margin-top: 2px;">
            ${delivery.warehouseName || 'Kho H&G'}
          </div>
          <div style="font-size: 12px; color: #475569; margin-top: 4px; line-height: 1.35;">
            📍 ${delivery.warehouseAddress || 'Địa chỉ kho'}
          </div>
          ${delivery.warehousePhone ? `
            <div style="font-size: 11px; color: #64748b; margin-top: 4px;">
              📞 SĐT kho: <strong>${delivery.warehousePhone}</strong>
            </div>
          ` : ''}
          ${whNavUrl ? `
            <div style="margin-top: 8px; padding-top: 6px; border-top: 1px solid #e2e8f0;">
              <a href="${whNavUrl}" target="_blank" rel="noopener noreferrer" style="font-size: 11px; color: #1d4ed8; font-weight: 700; text-decoration: none; display: inline-flex; align-items: center; gap: 4px;">
                🧭 Dẫn đường xe máy đến kho ↗
              </a>
            </div>
          ` : ''}
        </div>
      `;
      whMarker.bindPopup(whPopup);
      markersGroupRef.current.addLayer(whMarker);
    }

    // 2. Marker Shipper 🛵 (Chỉ hiển thị khi có tọa độ thật, KHÔNG TẠO TỌA ĐỘ ẢO)
    const isMoving = ['IN_TRANSIT', 'ARRIVED'].includes(delivery.status);
    if (typeof currentLat === 'number' && typeof currentLng === 'number') {
      const shipLat = currentLat;
      const shipLng = currentLng;
      validBounds.push([shipLat, shipLng]);

      const shipperTitle = mode === 'shipper' ? 'Bạn (Vị trí hiện tại)' : (delivery.shipperName || 'Shipper H&G');
      const shipperMarker = L.marker([shipLat, shipLng], {
        icon: createShipperIcon(shipperTitle, isMoving),
      });

      const shipperPopup = `
        <div style="min-width: 210px; padding: 2px;">
          <div style="font-size: 11px; font-weight: 800; color: #d97706; text-transform: uppercase; display: flex; align-items: center; gap: 4px;">
            <span>🛵 ${mode === 'shipper' ? 'VỊ TRÍ CỦA BẠN' : 'VỊ TRÍ SHIPPER HIỆN TẠI'}</span>
          </div>
          <div style="font-weight: 800; font-size: 14px; color: #0f172a; margin-top: 2px;">
            ${shipperTitle}
          </div>
          ${delivery.shipperPhone && mode !== 'shipper' ? `
            <div style="font-size: 12px; color: #2563eb; margin-top: 4px;">
              📞 <a href="tel:${delivery.shipperPhone}" style="color: inherit; text-decoration: none; font-weight: 700;">${delivery.shipperPhone}</a>
            </div>
          ` : ''}
          <div style="font-size: 11px; color: #475569; margin-top: 6px; padding-top: 6px; border-top: 1px solid #e2e8f0;">
            Trạng thái: <strong>${deliveryStatusLabel[delivery.status] || delivery.status}</strong>
          </div>
          <div style="font-size: 11px; color: #64748b; margin-top: 2px;">
            Tọa độ: ${shipLat.toFixed(5)}, ${shipLng.toFixed(5)}
            ${liveCoords?.accuracy ? `<br/>Độ chính xác: ±${liveCoords.accuracy}m` : ''}
          </div>
          ${navStage?.navUrl ? `
            <div style="margin-top: 8px; padding-top: 6px; border-top: 1px solid #e2e8f0;">
              <a href="${navStage.navUrl}" target="_blank" rel="noopener noreferrer" style="font-size: 11px; color: #059669; font-weight: 700; text-decoration: none; display: inline-flex; align-items: center; gap: 4px;">
                🛵 ${navStage.buttonLabel} ↗
              </a>
            </div>
          ` : ''}
        </div>
      `;
      shipperMarker.bindPopup(shipperPopup);
      markersGroupRef.current.addLayer(shipperMarker);
    }

    // 3. Marker Khách hàng 📍
    if (customerCoords) {
      validBounds.push([customerCoords.lat, customerCoords.lng]);

      const custMarker = L.marker([customerCoords.lat, customerCoords.lng], {
        icon: createCustomerIcon(delivery.receiverName || 'Khách hàng'),
      });

      const custPopup = `
        <div style="min-width: 210px; padding: 2px;">
          <div style="font-size: 11px; font-weight: 800; color: #e11d48; text-transform: uppercase;">
            📍 ĐIỂM NHẬN HÀNG
          </div>
          <div style="font-weight: 800; font-size: 13px; color: #0f172a; margin-top: 2px;">
            ${delivery.receiverName || 'Khách hàng'}
          </div>
          <div style="font-size: 12px; color: #475569; margin-top: 4px; line-height: 1.35;">
            ${delivery.deliveryAddress}
          </div>
          ${delivery.receiverPhone ? `
            <div style="font-size: 11px; color: #64748b; margin-top: 4px;">
              📞 SĐT: <strong>${delivery.receiverPhone}</strong>
            </div>
          ` : ''}
          ${custNavUrl ? `
            <div style="margin-top: 8px; padding-top: 6px; border-top: 1px solid #e2e8f0;">
              <a href="${custNavUrl}" target="_blank" rel="noopener noreferrer" style="font-size: 11px; color: #be123c; font-weight: 700; text-decoration: none; display: inline-flex; align-items: center; gap: 4px;">
                🧭 Dẫn đường xe máy đến khách ↗
              </a>
            </div>
          ` : ''}
        </div>
      `;
      custMarker.bindPopup(custPopup);
      markersGroupRef.current.addLayer(custMarker);
    }

    validBoundsRef.current = validBounds;

    // Tự động căn góc nhìn vừa vặn các điểm
    if (validBounds.length > 1) {
      try {
        const bounds = L.latLngBounds(validBounds);
        mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 });
      } catch (e) {
        // ignore
      }
    } else if (validBounds.length === 1) {
      mapInstanceRef.current.setView(validBounds[0], 15);
    }
  }, [delivery, customerCoords, currentLat, currentLng, mode, liveCoords?.accuracy]);

  const handleFitBounds = () => {
    if (!mapInstanceRef.current || !validBoundsRef.current || validBoundsRef.current.length === 0) return;
    if (validBoundsRef.current.length > 1) {
      try {
        const bounds = L.latLngBounds(validBoundsRef.current);
        mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 });
      } catch (e) {
        // ignore
      }
    } else if (validBoundsRef.current.length === 1) {
      mapInstanceRef.current.setView(validBoundsRef.current[0], 15);
    }
  };

  if (!delivery) return null;

  const statusStyle = deliveryStatusColor[delivery.status] || { bg: '#eff6ff', text: '#1d4ed8' };

  return (
    <div style={{
      background: '#ffffff',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-xl, 16px)',
      overflow: 'hidden',
      boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
    }}>
      {/* Header bar: Giám sát vận hành */}
      <div style={{
        padding: '14px 18px',
        background: mode === 'shipper' ? '#fffbeb' : mode === 'customer' ? '#f0fdf4' : '#f8fafc',
        borderBottom: `1px solid ${mode === 'shipper' ? '#fde68a' : mode === 'customer' ? '#bbf7d0' : 'var(--border)'}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 12
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 36, height: 36, borderRadius: '10px',
            background: mode === 'shipper' ? '#fef3c7' : mode === 'customer' ? '#dcfce7' : '#eff6ff',
            color: mode === 'shipper' ? '#d97706' : mode === 'customer' ? '#16a34a' : '#2563eb',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <Compass size={20} className={['IN_TRANSIT', 'ARRIVED'].includes(delivery.status) ? 'animate-spin' : ''} />
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ fontWeight: 800, fontSize: '14px', color: 'var(--text-primary)' }}>
                {mode === 'shipper' ? (
                  isBeforePickup
                    ? '🎯 Chặng 1: Di chuyển đến Kho nhận hàng'
                    : isAfterPickup
                      ? '🎯 Chặng 2: Giao kiện hàng đến Khách hàng'
                      : 'Bản đồ lộ trình giao vận'
                ) : mode === 'customer' ? (
                  ['IN_TRANSIT', 'ARRIVED'].includes(delivery.status)
                    ? '🛵 Shipper đang trên đường giao hàng đến bạn'
                    : delivery.status === 'DELIVERED'
                      ? '✓ Kiện hàng đã được giao thành công'
                      : delivery.status === 'DELIVERY_FAILED'
                        ? '⚠️ Giao hàng tạm hoãn (Chờ giao lại)'
                        : '📦 Hành trình giao kiện hàng của bạn'
                ) : (
                  'Bản đồ Giám sát Hành trình Giao vận'
                )}
              </span>
              <span style={{
                fontSize: '11px', fontWeight: 800, padding: '2px 8px', borderRadius: '99px',
                backgroundColor: statusStyle.bg, color: statusStyle.text
              }}>
                {deliveryStatusLabel[delivery.status] || delivery.status}
              </span>
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: 2 }}>
              Đơn hàng #{delivery.orderCode || delivery.id} · Gói: <strong>{shippingMethodLabel[delivery.shippingMethod] || delivery.shippingMethod}</strong>
              {delivery.shippingFee != null && ` (${formatPrice(delivery.shippingFee)})`}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          {/* Ticker cập nhật thời gian thực */}
          {hasShipperCoords && (
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              fontSize: '12px', color: '#059669', background: '#ecfdf5',
              padding: '4px 10px', borderRadius: '8px', border: '1px solid #a7f3d0'
            }}>
              <span style={{ position: 'relative', display: 'flex', height: 8, width: 8 }}>
                <span style={{ position: 'absolute', height: '100%', width: '100%', borderRadius: '50%', background: '#34d399', opacity: 0.75, animation: 'ping 1.5s cubic-bezier(0,0,0.2,1) infinite' }}></span>
                <span style={{ position: 'relative', height: 8, width: 8, borderRadius: '50%', background: '#059669' }}></span>
              </span>
              <span>Cập nhật: <strong>{timeAgoStr || 'Vừa xong'}</strong></span>
            </div>
          )}

          {fullRouteUrl && (
            <a
              href={fullRouteUrl}
              target="_blank"
              rel="noreferrer"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                padding: '6px 10px', borderRadius: '8px',
                background: '#ffffff', color: '#1e40af', border: '1px solid #bfdbfe',
                fontSize: '11px', fontWeight: 700, textDecoration: 'none',
                boxShadow: '0 1px 2px rgba(0,0,0,0.04)'
              }}
              title="Mở lộ trình xe máy từ Kho đến Khách trên Google Maps"
            >
              <Navigation size={12} style={{ color: '#2563eb' }} />
              <span>Toàn tuyến (Kho ➔ Khách)</span>
              <ExternalLink size={10} style={{ opacity: 0.7 }} />
            </a>
          )}

          {onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              className="btn btn-secondary btn-sm"
              style={{ padding: '6px 10px', fontSize: '12px' }}
              title="Làm mới tọa độ"
            >
              <RefreshCw size={13} />
            </button>
          )}
        </div>
      </div>

      {/* Bản đồ Leaflet tương tác */}
      <div style={{ position: 'relative', width: '100%', height: height, background: '#f1f5f9' }}>
        <div ref={mapContainerRef} style={{ width: '100%', height: '100%' }} />

        {/* HUD Telemetry Overlay */}
        <div style={{
          position: 'absolute',
          top: 12,
          left: 12,
          zIndex: 1000,
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(8px)',
          padding: '8px 14px',
          borderRadius: 10,
          boxShadow: '0 2px 10px rgba(0,0,0,0.12)',
          fontSize: '12px',
          display: 'flex',
          flexDirection: 'column',
          gap: 4,
          maxWidth: '85%'
        }}>
          {mode === 'shipper' && (
            <div style={{
              fontSize: '11px', fontWeight: 800, color: isBeforePickup ? '#1d4ed8' : '#059669',
              display: 'flex', alignItems: 'center', gap: 5, paddingBottom: 4, borderBottom: '1px solid #f1f5f9'
            }}>
              <span>{isBeforePickup ? '🏢 ĐÍCH ĐẾN: KHO HÀNG' : '📍 ĐÍCH ĐẾN: KHÁCH NHẬN'}</span>
              <span style={{ color: '#0f172a', fontWeight: 700 }}>
                {isBeforePickup ? (delivery.warehouseName || 'Kho H&G') : (delivery.receiverName || 'Khách hàng')}
              </span>
            </div>
          )}

          {mode === 'customer' && (
            <div style={{
              fontSize: '11px', fontWeight: 800,
              color: ['IN_TRANSIT', 'ARRIVED'].includes(delivery.status) ? '#059669' : '#0284c7',
              display: 'flex', alignItems: 'center', gap: 5, paddingBottom: 4, borderBottom: '1px solid #f1f5f9'
            }}>
              <span>{['IN_TRANSIT', 'ARRIVED'].includes(delivery.status) ? '🛵 ĐANG TRÊN ĐƯỜNG ĐẾN' : '📍 ĐỊA CHỈ NHẬN CỦA BẠN'}</span>
              <span style={{ color: '#0f172a', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '240px' }}>
                {delivery.deliveryAddress || 'Địa chỉ nhận'}
              </span>
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Navigation size={13} style={{ color: mode === 'customer' ? '#059669' : '#2563eb' }} />
            <span style={{ fontWeight: 700, color: '#0f172a' }}>
              {hasShipperCoords
                ? (mode === 'customer'
                    ? 'Tài xế đang di chuyển giao hàng đến bạn (Live GPS)'
                    : `${mode === 'shipper' ? 'GPS của bạn' : 'Shipper GPS'}: ${currentLat.toFixed(5)}, ${currentLng.toFixed(5)}`)
                : (mode === 'customer'
                    ? (isDone
                        ? 'Đơn hàng đã hoàn tất giao thành công'
                        : 'Kiện hàng đang được chuẩn bị tại kho H&G')
                    : 'Chưa nhận được vị trí mới của Shipper')}
            </span>
          </div>

          {liveCoords?.accuracy && (
            <div style={{ fontSize: '10px', color: '#059669', fontWeight: 600 }}>
              Độ chính xác cảm biến GPS: ±{liveCoords.accuracy}m
            </div>
          )}

          {delivery.lastLocationUpdate && (
            <div style={{ fontSize: '11px', color: '#64748b', display: 'flex', alignItems: 'center', gap: 4 }}>
              <Clock size={11} />
              <span>Gửi lúc: {new Date(delivery.lastLocationUpdate).toLocaleTimeString('vi-VN')} ({timeAgoStr || 'mới'})</span>
            </div>
          )}
        </div>

        {/* Fit Bounds Button */}
        <button
          type="button"
          onClick={handleFitBounds}
          style={{
            position: 'absolute',
            top: 12,
            right: 12,
            zIndex: 1000,
            background: 'rgba(255, 255, 255, 0.94)',
            backdropFilter: 'blur(8px)',
            padding: '6px 12px',
            borderRadius: 8,
            border: '1px solid rgba(0, 0, 0, 0.1)',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.12)',
            fontSize: '11px',
            fontWeight: 700,
            color: '#1e293b',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 5
          }}
          title="Căn vừa toàn cảnh các điểm"
        >
          <Maximize2 size={13} />
          <span>Toàn cảnh</span>
        </button>

        {/* Legend Overlay */}
        <div style={{
          position: 'absolute',
          bottom: 12,
          left: 12,
          zIndex: 1000,
          background: 'rgba(255, 255, 255, 0.94)',
          backdropFilter: 'blur(8px)',
          padding: '6px 12px',
          borderRadius: 8,
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          fontSize: '11px',
          fontWeight: 600,
          color: '#334155'
        }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <span>🏪</span> Kho xuất
          </span>
          {hasShipperCoords && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <span>🛵</span> {mode === 'shipper' ? 'Bạn' : 'Shipper'}
            </span>
          )}
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <span>🏠</span> {mode === 'customer' ? 'Bạn nhận' : 'Khách nhận'}
          </span>
        </div>
      </div>

      {/* Footer bar: 3 Waypoint Cards (Kho xuất hàng -> Shipper -> Khách hàng) */}
      <div style={{
        padding: '14px 18px',
        background: '#fafafa',
        borderTop: '1px solid var(--border)',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: 12
      }}>
        {/* Điểm 1: Kho xuất hàng */}
        <div style={{
          background: '#fff',
          border: `1.5px solid ${mode === 'shipper' && isBeforePickup ? '#3b82f6' : '#e2e8f0'}`,
          borderRadius: 10,
          padding: 10,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          boxShadow: mode === 'shipper' && isBeforePickup ? '0 2px 10px rgba(59, 130, 246, 0.12)' : 'none'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#1e40af', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase' }}>
                <Store size={13} />
                <span>Kho xuất hàng</span>
              </div>
              {mode === 'shipper' && isBeforePickup && (
                <span style={{ fontSize: '10px', fontWeight: 800, padding: '1px 6px', borderRadius: 4, background: '#eff6ff', color: '#1d4ed8' }}>
                  🎯 ĐÍCH ĐẾN
                </span>
              )}
              {mode === 'shipper' && isAfterPickup && (
                <span style={{ fontSize: '10px', fontWeight: 800, padding: '1px 6px', borderRadius: 4, background: '#ecfdf5', color: '#047857' }}>
                  ✓ ĐÃ LẤY
                </span>
              )}
            </div>
            <div style={{ fontWeight: 700, fontSize: '13px', color: '#0f172a' }}>
              {delivery.warehouseName || 'Kho trung tâm H&G'}
            </div>
            <div style={{ fontSize: '11px', color: '#64748b', marginTop: 2, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }} title={delivery.warehouseAddress}>
              📍 {delivery.warehouseAddress || 'Địa chỉ kho'}
            </div>
          </div>
          {whNavUrl && (
            <div style={{ marginTop: 8, paddingTop: 6, borderTop: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <a
                href={whNavUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{ fontSize: '11px', color: '#1d4ed8', fontWeight: 700, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4 }}
              >
                <Navigation size={11} />
                <span>Chỉ đường xe máy đến kho</span>
                <ExternalLink size={10} />
              </a>
              {delivery.warehousePhone && (
                <a href={`tel:${delivery.warehousePhone}`} style={{ fontSize: '11px', color: '#2563eb', fontWeight: 600, textDecoration: 'none' }}>
                  📞 {delivery.warehousePhone}
                </a>
              )}
            </div>
          )}
        </div>

        {/* Điểm 2: Shipper phụ trách */}
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: 10, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#d97706', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>
              <Truck size={13} />
              <span>{mode === 'shipper' ? 'Tài xế (Bạn)' : 'Shipper phụ trách'}</span>
            </div>
            <div style={{ fontWeight: 700, fontSize: '13px', color: '#0f172a' }}>
              {mode === 'shipper' ? 'Bạn đang phụ trách đơn này' : (delivery.shipperName || 'Chưa phân công')}
            </div>
            <div style={{ fontSize: '11px', color: '#64748b', marginTop: 2 }}>
              {delivery.shipperPhone ? (
                <a href={`tel:${delivery.shipperPhone}`} style={{ color: '#2563eb', textDecoration: 'none', fontWeight: 600 }}>
                  📞 {delivery.shipperPhone}
                </a>
              ) : 'Chưa có SĐT'}
            </div>
          </div>
          {hasShipperCoords && (
            <div style={{ marginTop: 8, paddingTop: 6, borderTop: '1px solid #f1f5f9', fontSize: '11px', color: '#059669', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981' }} />
              <span>GPS hoạt động</span>
            </div>
          )}
        </div>

        {/* Điểm 3: Khách hàng & Điểm nhận */}
        <div style={{
          background: '#fff',
          border: `1.5px solid ${mode === 'shipper' && isAfterPickup ? '#10b981' : '#e2e8f0'}`,
          borderRadius: 10,
          padding: 10,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          boxShadow: mode === 'shipper' && isAfterPickup ? '0 2px 10px rgba(16, 185, 129, 0.12)' : 'none'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#e11d48', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase' }}>
                <MapPin size={13} />
                <span>{mode === 'customer' ? 'Địa chỉ nhận của bạn' : 'Điểm nhận hàng'}</span>
              </div>
              {mode === 'shipper' && isAfterPickup && (
                <span style={{ fontSize: '10px', fontWeight: 800, padding: '1px 6px', borderRadius: 4, background: '#ecfdf5', color: '#047857' }}>
                  🎯 ĐÍCH ĐẾN
                </span>
              )}
            </div>
            <div style={{ fontWeight: 700, fontSize: '13px', color: '#0f172a' }}>
              {delivery.receiverName || 'Khách hàng'}
            </div>
            <div style={{ fontSize: '11px', color: '#64748b', marginTop: 2, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }} title={delivery.deliveryAddress}>
              📍 {delivery.deliveryAddress || 'Địa chỉ nhận hàng'}
            </div>
          </div>
          {custNavUrl && (
            <div style={{ marginTop: 8, paddingTop: 6, borderTop: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <a
                href={custNavUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{ fontSize: '11px', color: '#be123c', fontWeight: 700, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4 }}
              >
                <Navigation size={11} />
                <span>Chỉ đường xe máy đến khách</span>
                <ExternalLink size={10} />
              </a>
              {delivery.receiverPhone && (
                <a href={`tel:${delivery.receiverPhone}`} style={{ fontSize: '11px', color: '#2563eb', fontWeight: 600, textDecoration: 'none' }}>
                  📞 {delivery.receiverPhone}
                </a>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
