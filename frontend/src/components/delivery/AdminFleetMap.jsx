import { useEffect, useRef, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  Truck, Store, MapPin, Compass, Navigation, RefreshCw,
  Search, Eye, Maximize2, AlertCircle, Clock, ExternalLink, ChevronRight
} from 'lucide-react';
import { deliveryStatusLabel, deliveryStatusColor, shippingMethodLabel, formatPrice } from '../../utils/helpers';
import { setupMapTiles } from '../../utils/mapTiles';

// Helper: Marker Kho H&G
function createWarehousePin(name) {
  return L.divIcon({
    className: 'hg-wh-pin',
    html: `
      <div style="position: relative; display: flex; flex-direction: column; align-items: center; transform: translate(-50%, -100%); cursor: pointer;">
        <div style="
          background: #1e3a8a; color: #fff; font-size: 10px; font-weight: 800;
          padding: 2px 7px; border-radius: 6px; box-shadow: 0 4px 10px rgba(0,0,0,0.3);
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
        <div style="width: 8px; height: 5px; background: rgba(0,0,0,0.3); border-radius: 50%; filter: blur(1px);"></div>
      </div>
    `,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
    popupAnchor: [0, -42],
  });
}

// Helper: Marker Shipper 🛵 có radar pulse
function createShipperFleetPin(shipperName, isMoving = true) {
  return L.divIcon({
    className: 'hg-shipper-fleet-pin',
    html: `
      <div style="position: relative; display: flex; flex-direction: column; align-items: center; transform: translate(-50%, -100%); cursor: pointer;">
        <div style="
          background: #d97706; color: #ffffff; font-size: 10px; font-weight: 800;
          padding: 2px 7px; border-radius: 6px; box-shadow: 0 4px 10px rgba(217,119,6,0.4);
          white-space: nowrap; margin-bottom: 3px; border: 1px solid rgba(255,255,255,0.5);
        ">
          🛵 ${shipperName}
        </div>
        <div style="position: relative; display: flex; align-items: center; justify-content: center;">
          ${isMoving ? `
            <div style="
              position: absolute; width: 42px; height: 42px; border-radius: 50%;
              background: rgba(245, 158, 11, 0.4);
              animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;
            "></div>
          ` : ''}
          <div style="
            width: 34px; height: 34px; background: linear-gradient(135deg, #f59e0b, #d97706);
            border: 3px solid #ffffff; border-radius: 50%;
            box-shadow: 0 4px 14px rgba(0,0,0,0.35);
            display: flex; align-items: center; justify-content: center; z-index: 2;
          ">
            <span style="font-size: 15px;">🛵</span>
          </div>
        </div>
        <div style="width: 10px; height: 6px; background: rgba(0,0,0,0.3); border-radius: 50%; filter: blur(1px); margin-top: 2px;"></div>
      </div>
    `,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
    popupAnchor: [0, -44],
  });
}

/**
 * Bản đồ Giám sát Toàn Đội xe / Giao vận Admin (Phase 4)
 * Cho phép Admin theo dõi tất cả các tài xế đang lưu thông trên đường theo thời gian thực.
 */
export default function AdminFleetMap({
  deliveries = [],
  loading = false,
  onRefresh = null,
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersGroupRef = useRef(null);
  const markerByDeliveryIdRef = useRef({});
  const validBoundsRef = useRef([]);

  const [selectedId, setSelectedId] = useState(null);
  const [filterType, setFilterType] = useState('ALL'); // 'ALL' | 'MOVING' | 'ARRIVED'
  const [searchQuery, setSearchQuery] = useState('');

  // Lọc danh sách các đơn giao có thể định vị
  const trackableDeliveries = useMemo(() => {
    return deliveries.filter((d) => {
      // Có tọa độ shipper hoặc tọa độ kho
      const hasShipperGps = typeof d.currentLatitude === 'number' && typeof d.currentLongitude === 'number';
      const hasWhGps = typeof d.warehouseLatitude === 'number' && typeof d.warehouseLongitude === 'number';
      return hasShipperGps || hasWhGps;
    });
  }, [deliveries]);

  // Lọc theo tabs & ô tìm kiếm
  const displayedDeliveries = useMemo(() => {
    return trackableDeliveries.filter((d) => {
      if (filterType === 'MOVING' && d.status !== 'IN_TRANSIT') return false;
      if (filterType === 'ARRIVED' && d.status !== 'ARRIVED') return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchCode = (d.orderCode || '').toLowerCase().includes(q);
        const matchShipper = (d.shipperName || '').toLowerCase().includes(q);
        const matchReceiver = (d.receiverName || '').toLowerCase().includes(q);
        const matchWh = (d.warehouseName || '').toLowerCase().includes(q);
        return matchCode || matchShipper || matchReceiver || matchWh;
      }
      return true;
    });
  }, [trackableDeliveries, filterType, searchQuery]);

  // Khởi tạo bản đồ Leaflet
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [21.0285, 105.8542], // Hà Nội mặc định
      zoom: 12,
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

  // Vẽ các marker trên bản đồ khi danh sách giao vận thay đổi
  useEffect(() => {
    if (!mapInstanceRef.current || !markersGroupRef.current) return;

    markersGroupRef.current.clearLayers();
    markerByDeliveryIdRef.current = {};
    const bounds = [];
    const drawnWarehouses = new Set();

    deliveries.forEach((d) => {
      // 1. Vẽ Kho xuất hàng (chỉ vẽ 1 lần cho mỗi kho để tránh trùng)
      if (
        d.warehouseId &&
        !drawnWarehouses.has(d.warehouseId) &&
        typeof d.warehouseLatitude === 'number' &&
        typeof d.warehouseLongitude === 'number'
      ) {
        drawnWarehouses.add(d.warehouseId);
        bounds.push([d.warehouseLatitude, d.warehouseLongitude]);

        const whMarker = L.marker([d.warehouseLatitude, d.warehouseLongitude], {
          icon: createWarehousePin(d.warehouseName || 'Kho H&G'),
        });

        const whPopup = `
          <div style="min-width: 200px; padding: 2px;">
            <div style="font-size: 11px; font-weight: 800; color: #1e40af; text-transform: uppercase;">
              🏪 KHO XUẤT HÀNG
            </div>
            <div style="font-weight: 800; font-size: 13px; color: #0f172a; margin-top: 2px;">
              ${d.warehouseName || 'Kho H&G'}
            </div>
            <div style="font-size: 12px; color: #475569; margin-top: 4px;">
              📍 ${d.warehouseAddress || 'Địa chỉ kho'}
            </div>
            ${d.warehousePhone ? `
              <div style="font-size: 11px; color: #64748b; margin-top: 4px;">
                📞 Hotline: <strong>${d.warehousePhone}</strong>
              </div>
            ` : ''}
          </div>
        `;
        whMarker.bindPopup(whPopup);
        markersGroupRef.current.addLayer(whMarker);
      }

      // 2. Vẽ vị trí Shipper đang giao hàng 🛵
      if (typeof d.currentLatitude === 'number' && typeof d.currentLongitude === 'number') {
        const isMoving = ['IN_TRANSIT', 'ARRIVED'].includes(d.status);
        bounds.push([d.currentLatitude, d.currentLongitude]);

        const shipperMarker = L.marker([d.currentLatitude, d.currentLongitude], {
          icon: createShipperFleetPin(d.shipperName || 'Shipper', isMoving),
        });

        const statusStyle = deliveryStatusColor[d.status] || { bg: '#eff6ff', text: '#1d4ed8' };

        const popupContent = `
          <div style="min-width: 220px; padding: 2px;">
            <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px;">
              <span style="font-size: 11px; font-weight: 800; color: #d97706; text-transform: uppercase;">
                🛵 SHIPPER ĐANG GIAO
              </span>
              <span style="font-size: 10px; font-weight: 700; padding: 1px 6px; border-radius: 99px; background: ${statusStyle.bg}; color: ${statusStyle.text};">
                ${deliveryStatusLabel[d.status] || d.status}
              </span>
            </div>

            <div style="font-weight: 800; font-size: 14px; color: #0f172a; margin-top: 4px;">
              ${d.shipperName || 'Tài xế'}
            </div>
            ${d.shipperPhone ? `
              <div style="font-size: 12px; color: #2563eb; margin-top: 2px;">
                📞 <a href="tel:${d.shipperPhone}" style="color: inherit; text-decoration: none; font-weight: 700;">${d.shipperPhone}</a>
              </div>
            ` : ''}

            <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #e2e8f0; font-size: 11px; color: #475569;">
              <div>Đơn hàng: <strong>#${d.orderCode || d.id}</strong></div>
              <div style="margin-top: 2px;">Khách nhận: <strong>${d.receiverName || 'Khách hàng'}</strong></div>
              <div style="margin-top: 2px; line-height: 1.35;" title="${d.deliveryAddress}">📍 ${d.deliveryAddress || '—'}</div>
            </div>

            <div style="margin-top: 8px; text-align: right;">
              <a href="/admin/deliveries/${d.id}" style="display: inline-block; padding: 4px 10px; border-radius: 6px; background: #0a3d8f; color: #fff; font-size: 11px; font-weight: 700; text-decoration: none;">
                Xem chi tiết ➔
              </a>
            </div>
          </div>
        `;
        shipperMarker.bindPopup(popupContent);
        markersGroupRef.current.addLayer(shipperMarker);
        markerByDeliveryIdRef.current[d.id] = shipperMarker;
      }
    });

    validBoundsRef.current = bounds;

    // Căn vừa tầm nhìn
    if (bounds.length > 1) {
      try {
        const b = L.latLngBounds(bounds);
        mapInstanceRef.current.fitBounds(b, { padding: [50, 50], maxZoom: 15 });
      } catch (e) {}
    } else if (bounds.length === 1) {
      mapInstanceRef.current.setView(bounds[0], 14);
    }
  }, [deliveries]);

  // Căn vừa toàn cảnh khi người dùng bấm nút
  const handleFitAll = () => {
    if (!mapInstanceRef.current || !validBoundsRef.current || validBoundsRef.current.length === 0) return;
    if (validBoundsRef.current.length > 1) {
      try {
        const b = L.latLngBounds(validBoundsRef.current);
        mapInstanceRef.current.fitBounds(b, { padding: [50, 50], maxZoom: 15 });
      } catch (e) {}
    } else if (validBoundsRef.current.length === 1) {
      mapInstanceRef.current.setView(validBoundsRef.current[0], 14);
    }
  };

  // Chọn một đơn giao để bay camera tới
  const handleSelectDelivery = (d) => {
    setSelectedId(d.id);
    if (!mapInstanceRef.current) return;

    if (typeof d.currentLatitude === 'number' && typeof d.currentLongitude === 'number') {
      mapInstanceRef.current.flyTo([d.currentLatitude, d.currentLongitude], 16, { duration: 1.2 });
      const marker = markerByDeliveryIdRef.current[d.id];
      if (marker) {
        setTimeout(() => marker.openPopup(), 1250);
      }
    } else if (typeof d.warehouseLatitude === 'number' && typeof d.warehouseLongitude === 'number') {
      mapInstanceRef.current.flyTo([d.warehouseLatitude, d.warehouseLongitude], 15, { duration: 1.2 });
    }
  };

  const movingCount = deliveries.filter((d) => d.status === 'IN_TRANSIT').length;
  const arrivedCount = deliveries.filter((d) => d.status === 'ARRIVED').length;

  return (
    <div style={{
      background: 'var(--bg-card)',
      borderRadius: '16px',
      border: '1px solid var(--border)',
      overflow: 'hidden',
      boxShadow: '0 4px 20px rgba(0,0,0,0.04)',
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* Header bar: Command Control */}
      <div style={{
        padding: '14px 18px',
        background: 'var(--bg)',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 12
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 36, height: 36, borderRadius: '10px',
            background: '#eff6ff', color: '#2563eb',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <Compass size={20} className={movingCount > 0 ? 'animate-spin' : ''} />
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: '15px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span>Bản đồ Giám sát Đội xe & Giao vận Toàn Hệ Thống</span>
              <span style={{
                fontSize: '11px', fontWeight: 800, padding: '2px 8px', borderRadius: '99px',
                background: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0'
              }}>
                {movingCount} xe đang di chuyển
              </span>
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: 2 }}>
              Theo dõi tọa độ GPS thực tế của các tài xế Shipper và nguồn kho xuất hàng H&G Store.
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            type="button"
            onClick={handleFitAll}
            className="btn btn-secondary btn-sm"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '12px', padding: '7px 12px' }}
            title="Căn vừa toàn bộ các điểm trên bản đồ"
          >
            <Maximize2 size={13} />
            <span>Toàn cảnh</span>
          </button>

          {onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              className="btn btn-secondary btn-sm"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '12px', padding: '7px 12px' }}
              title="Làm mới tọa độ đội xe"
            >
              <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
              <span>Cập nhật</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Layout: Sidebar List + Leaflet Map */}
      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', minHeight: '560px' }}>
        {/* Left Sidebar: Fleet List */}
        <div style={{
          borderRight: '1px solid var(--border)',
          display: 'flex',
          flexDirection: 'column',
          background: '#fafafa',
          maxHeight: '620px',
          overflow: 'hidden'
        }}>
          {/* Search box */}
          <div style={{ padding: '12px', borderBottom: '1px solid #f1f5f9', background: 'var(--bg-card)' }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              background: 'var(--bg)', border: '1px solid var(--border)',
              borderRadius: '8px', padding: '6px 10px', fontSize: '12px'
            }}>
              <Search size={14} style={{ color: 'var(--text-muted)' }} />
              <input
                type="text"
                placeholder="Tìm mã đơn, shipper, khách..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ border: 'none', background: 'transparent', outline: 'none', width: '100%', fontSize: '12px' }}
              />
            </div>

            {/* Filter Pills */}
            <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
              <button
                type="button"
                onClick={() => setFilterType('ALL')}
                style={{
                  fontSize: '11px', fontWeight: 700, padding: '3px 8px', borderRadius: '6px',
                  border: 'none', cursor: 'pointer',
                  background: filterType === 'ALL' ? '#0a3d8f' : '#f1f5f9',
                  color: filterType === 'ALL' ? '#ffffff' : 'var(--text-secondary)'
                }}
              >
                Tất cả ({trackableDeliveries.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterType('MOVING')}
                style={{
                  fontSize: '11px', fontWeight: 700, padding: '3px 8px', borderRadius: '6px',
                  border: 'none', cursor: 'pointer',
                  background: filterType === 'MOVING' ? '#0284c7' : '#f1f5f9',
                  color: filterType === 'MOVING' ? '#ffffff' : 'var(--text-secondary)'
                }}
              >
                Đang đi ({movingCount})
              </button>
              <button
                type="button"
                onClick={() => setFilterType('ARRIVED')}
                style={{
                  fontSize: '11px', fontWeight: 700, padding: '3px 8px', borderRadius: '6px',
                  border: 'none', cursor: 'pointer',
                  background: filterType === 'ARRIVED' ? '#059669' : '#f1f5f9',
                  color: filterType === 'ARRIVED' ? '#ffffff' : 'var(--text-secondary)'
                }}
              >
                Đến nơi ({arrivedCount})
              </button>
            </div>
          </div>

          {/* Deliveries List Scrollable */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '10px' }}>
            {displayedDeliveries.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 10px', color: 'var(--text-muted)', fontSize: '12px' }}>
                Không tìm thấy đơn giao nào khớp bộ lọc.
              </div>
            ) : (
              displayedDeliveries.map((d) => {
                const isSelected = selectedId === d.id;
                const statusStyle = deliveryStatusColor[d.status] || { bg: '#eff6ff', text: '#1d4ed8' };
                const hasGps = typeof d.currentLatitude === 'number' && typeof d.currentLongitude === 'number';

                return (
                  <div
                    key={d.id}
                    onClick={() => handleSelectDelivery(d)}
                    style={{
                      background: isSelected ? '#eff6ff' : '#ffffff',
                      border: `1px solid ${isSelected ? '#3b82f6' : '#e2e8f0'}`,
                      borderRadius: '10px',
                      padding: '10px 12px',
                      marginBottom: '8px',
                      cursor: 'pointer',
                      transition: 'all .15s ease',
                      boxShadow: isSelected ? '0 2px 8px rgba(59, 130, 246, 0.15)' : 'none'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                      <span style={{ fontWeight: 800, fontSize: '13px', color: '#0a3d8f' }}>
                        #{d.orderCode || d.id}
                      </span>
                      <span style={{
                        fontSize: '10px', fontWeight: 800, padding: '1px 6px', borderRadius: '4px',
                        backgroundColor: statusStyle.bg, color: statusStyle.text
                      }}>
                        {deliveryStatusLabel[d.status] || d.status}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4, fontSize: '12px', color: 'var(--text-primary)', fontWeight: 700 }}>
                      <Truck size={12} style={{ color: '#d97706' }} />
                      <span>{d.shipperName || 'Chưa gán Shipper'}</span>
                    </div>

                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: 2, display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      📍 {d.deliveryAddress || 'Chưa có địa chỉ'}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 6, paddingTop: 6, borderTop: '1px solid #f1f5f9', fontSize: '10px', color: 'var(--text-muted)' }}>
                      <span>
                        {hasGps ? (
                          <strong style={{ color: '#059669' }}>● Có GPS trực tiếp</strong>
                        ) : (
                          'Chưa phát GPS'
                        )}
                      </span>
                      <Link
                        to={`/admin/deliveries/${d.id}`}
                        onClick={(e) => e.stopPropagation()}
                        style={{ color: '#0a3d8f', fontWeight: 700, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 2 }}
                      >
                        <span>Chi tiết</span>
                        <ChevronRight size={10} />
                      </Link>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Map Canvas */}
        <div style={{ position: 'relative', width: '100%', height: '100%', minHeight: '560px' }}>
          <div ref={mapContainerRef} style={{ width: '100%', height: '100%' }} />

          {/* Map Floating Legend */}
          <div style={{
            position: 'absolute',
            bottom: 14,
            left: 14,
            zIndex: 1000,
            background: 'rgba(255, 255, 255, 0.94)',
            backdropFilter: 'blur(8px)',
            padding: '6px 14px',
            borderRadius: 8,
            boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            fontSize: '11px',
            fontWeight: 700,
            color: '#334155'
          }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <span>🏢</span> Kho xuất hàng
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <span>🛵</span> Shipper đang giao
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
