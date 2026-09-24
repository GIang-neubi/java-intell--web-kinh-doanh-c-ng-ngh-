import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Building2, MapPin, Phone, ExternalLink, Pencil, Eye, CheckCircle2, AlertCircle } from 'lucide-react';
import { setupMapTiles } from '../../utils/mapTiles';

function createWarehouseMarkerIcon(status = 'ACTIVE') {
  const isActive = status === 'ACTIVE';
  const color = isActive ? '#10b981' : '#ef4444';
  const gradient = isActive ? 'linear-gradient(135deg, #10b981, #059669)' : 'linear-gradient(135deg, #ef4444, #dc2626)';

  return L.divIcon({
    className: 'hg-wh-overview-pin',
    html: `
      <div style="position: relative; display: flex; flex-direction: column; align-items: center; transform: translate(-50%, -100%);">
        <div style="
          width: 36px;
          height: 36px;
          background: ${gradient};
          border: 3px solid #ffffff;
          border-radius: 50% 50% 50% 0;
          transform: rotate(-45deg);
          box-shadow: 0 4px 14px rgba(0,0,0,0.35);
          display: flex;
          align-items: center;
          justify-content: center;
        ">
          <div style="
            transform: rotate(45deg);
            color: #ffffff;
            font-size: 15px;
            font-weight: 800;
          ">🏢</div>
        </div>
        <div style="
          width: 10px;
          height: 6px;
          background: rgba(0,0,0,0.3);
          border-radius: 50%;
          filter: blur(1px);
          margin-top: -2px;
        "></div>
      </div>
    `,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
    popupAnchor: [0, -44],
  });
}

export default function WarehouseOverviewMap({ warehouses = [], loading = false }) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersLayerRef = useRef(null);

  const [selectedWarehouse, setSelectedWarehouse] = useState(null);

  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return;

    // Khởi tạo bản đồ toàn quốc Việt Nam
    const map = L.map(mapContainerRef.current, {
      center: [16.0544, 107.5], // Miền Trung VN
      zoom: 6,
      zoomControl: true,
      attributionControl: false,
    });

    setupMapTiles(map);

    const markersGroup = L.featureGroup().addTo(map);
    markersLayerRef.current = markersGroup;
    mapInstanceRef.current = map;

    setTimeout(() => {
      map.invalidateSize();
    }, 250);

    return () => {
      map.remove();
      mapInstanceRef.current = null;
      markersLayerRef.current = null;
    };
  }, []);

  // Vẽ các marker khi danh sách warehouses thay đổi
  useEffect(() => {
    if (!mapInstanceRef.current || !markersLayerRef.current) return;

    markersLayerRef.current.clearLayers();

    const validWarehouses = warehouses.filter(
      (w) => typeof w.latitude === 'number' && !isNaN(w.latitude) &&
             typeof w.longitude === 'number' && !isNaN(w.longitude)
    );

    if (validWarehouses.length === 0) return;

    validWarehouses.forEach((wh) => {
      const marker = L.marker([wh.latitude, wh.longitude], {
        icon: createWarehouseMarkerIcon(wh.status),
      });

      // Tạo nội dung popup chuẩn
      const popupHtml = `
        <div style="font-family: inherit; min-width: 220px; padding: 4px;">
          <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 6px;">
            <span style="font-size: 11px; font-weight: 700; background: #eff6ff; color: #2563eb; padding: 2px 6px; border-radius: 4px;">
              ${wh.warehouseCode}
            </span>
            <span style="font-size: 10px; font-weight: 700; padding: 2px 6px; border-radius: 10px; background: ${wh.status === 'ACTIVE' ? '#dcfce7' : '#fee2e2'}; color: ${wh.status === 'ACTIVE' ? '#15803d' : '#b91c1c'};">
              ${wh.status === 'ACTIVE' ? 'Hoạt động' : 'Tạm ngưng'}
            </span>
          </div>
          <div style="font-weight: 800; font-size: 14px; color: #0f172a; margin-bottom: 4px;">
            ${wh.name}
          </div>
          <div style="font-size: 12px; color: #475569; margin-bottom: 8px; line-height: 1.4;">
            📍 ${wh.address || 'Chưa cập nhật địa chỉ'}
          </div>
          <div style="font-size: 12px; color: #64748b; margin-bottom: 8px;">
            📞 ${wh.phone || 'Chưa có SĐT'}
          </div>
          <div style="border-top: 1px solid #e2e8f0; padding-top: 8px; display: flex; gap: 6px;">
            <a href="/admin/warehouses/${wh.id}" style="flex: 1; text-align: center; text-decoration: none; padding: 4px 8px; border-radius: 4px; background: #2563eb; color: #fff; font-size: 11px; font-weight: 700;">
              Chi tiết
            </a>
            <a href="/admin/warehouses/${wh.id}/edit" style="text-align: center; text-decoration: none; padding: 4px 8px; border-radius: 4px; background: #f1f5f9; color: #334155; font-size: 11px; font-weight: 600;">
              Sửa
            </a>
          </div>
        </div>
      `;

      marker.bindPopup(popupHtml);
      marker.on('click', () => {
        setSelectedWarehouse(wh);
      });

      markersLayerRef.current.addLayer(marker);
    });

    // Tự động fitBounds cho tất cả các kho
    try {
      const bounds = markersLayerRef.current.getBounds();
      if (bounds.isValid()) {
        mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
      }
    } catch (e) {
      // ignore
    }
  }, [warehouses]);

  const activeCount = warehouses.filter((w) => w.status === 'ACTIVE').length;
  const mappedCount = warehouses.filter((w) => typeof w.latitude === 'number' && typeof w.longitude === 'number').length;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 16, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-xl, 14px)', overflow: 'hidden' }}>
      {/* Cột bản đồ */}
      <div style={{ position: 'relative', height: 560, background: 'var(--bg)' }}>
        <div ref={mapContainerRef} style={{ width: '100%', height: '100%' }} />

        {/* Legend Overlay */}
        <div style={{
          position: 'absolute',
          top: 12,
          left: 12,
          zIndex: 1000,
          background: 'rgba(255, 255, 255, 0.94)',
          backdropFilter: 'blur(8px)',
          padding: '8px 14px',
          borderRadius: 10,
          boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
          display: 'flex',
          alignItems: 'center',
          gap: 14,
          fontSize: 12,
          fontWeight: 600,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#10b981' }}></span>
            <span>Kho hoạt động ({activeCount})</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#ef4444' }}></span>
            <span>Tạm ngưng ({warehouses.length - activeCount})</span>
          </div>
        </div>
      </div>

      {/* Cột danh sách thông tin kho bên cạnh bản đồ */}
      <div style={{ padding: '18px', borderLeft: '1px solid var(--border)', display: 'flex', flexDirection: 'column', height: 560, background: '#fafafa' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>
            Hệ thống kho ({mappedCount}/{warehouses.length} đã ghim)
          </h3>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10, paddingRight: 4 }}>
          {warehouses.map((wh) => {
            const isSelected = selectedWarehouse?.id === wh.id;
            const hasCoords = typeof wh.latitude === 'number' && typeof wh.longitude === 'number';

            return (
              <div
                key={wh.id}
                onClick={() => {
                  setSelectedWarehouse(wh);
                  if (mapInstanceRef.current && hasCoords) {
                    mapInstanceRef.current.flyTo([wh.latitude, wh.longitude], 15, { duration: 0.8 });
                  }
                }}
                style={{
                  background: isSelected ? '#eff6ff' : '#fff',
                  border: isSelected ? '2px solid #2563eb' : '1px solid var(--border)',
                  borderRadius: 10,
                  padding: 12,
                  cursor: 'pointer',
                  transition: 'all .2s',
                  boxShadow: isSelected ? '0 4px 12px rgba(37,99,235,0.15)' : 'none',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 4 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 6px', borderRadius: 4, background: '#f1f5f9', color: '#334155' }}>
                    {wh.warehouseCode}
                  </span>
                  <span style={{
                    fontSize: 10,
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: 99,
                    background: wh.status === 'ACTIVE' ? '#dcfce7' : '#fee2e2',
                    color: wh.status === 'ACTIVE' ? '#15803d' : '#b91c1c'
                  }}>
                    {wh.status === 'ACTIVE' ? 'Hoạt động' : 'Tạm ngưng'}
                  </span>
                </div>

                <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-primary)', marginBottom: 4 }}>
                  {wh.name}
                </div>

                <div style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'flex', alignItems: 'flex-start', gap: 4, marginBottom: 6 }}>
                  <MapPin size={12} style={{ marginTop: 2, flexShrink: 0 }} />
                  <span style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {wh.address}
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 11, borderTop: '1px solid #f1f5f9', paddingTop: 6 }}>
                  <span style={{ color: hasCoords ? '#2563eb' : '#94a3b8', fontWeight: 600 }}>
                    {hasCoords ? `📍 ${wh.latitude.toFixed(4)}, ${wh.longitude.toFixed(4)}` : '⚠️ Chưa có tọa độ'}
                  </span>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }} onClick={(e) => e.stopPropagation()}>
                    <Link to={`/admin/warehouses/${wh.id}`} className="btn btn-sm btn-outline" style={{ padding: '2px 6px', fontSize: 11 }} title="Xem chi tiết">
                      <Eye size={12} />
                    </Link>
                    <Link to={`/admin/warehouses/${wh.id}/edit`} className="btn btn-sm btn-outline" style={{ padding: '2px 6px', fontSize: 11 }} title="Chỉnh sửa">
                      <Pencil size={12} />
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
