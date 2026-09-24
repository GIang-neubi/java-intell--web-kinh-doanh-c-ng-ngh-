import { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin, Search, Navigation, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';
import { setupMapTiles, getApproximateCoordsFromAddress } from '../../utils/mapTiles';

// Tạo custom pin marker đẹp mắt, hiện đại, không phụ thuộc file ảnh tĩnh
function createWarehousePinIcon(label = 'Kho H&G') {
  return L.divIcon({
    className: 'hg-warehouse-pin',
    html: `
      <div style="position: relative; display: flex; flex-direction: column; align-items: center; transform: translate(-50%, -100%);">
        <div style="
          background: linear-gradient(135deg, #2563eb, #1d4ed8);
          color: #fff;
          font-weight: 700;
          font-size: 11px;
          padding: 4px 8px;
          border-radius: 6px;
          box-shadow: 0 4px 12px rgba(37,99,235,0.4);
          white-space: nowrap;
          margin-bottom: 2px;
          border: 1px solid rgba(255,255,255,0.4);
        ">
          📍 ${label}
        </div>
        <div style="
          width: 32px;
          height: 32px;
          background: #2563eb;
          border: 3px solid #ffffff;
          border-radius: 50% 50% 50% 0;
          transform: rotate(-45deg);
          box-shadow: 0 4px 14px rgba(0,0,0,0.35);
          display: flex;
          align-items: center;
          justify-content: center;
        ">
          <div style="
            width: 10px;
            height: 10px;
            background: var(--bg-card);
            border-radius: 50%;
            transform: rotate(45deg);
          "></div>
        </div>
        <div style="
          width: 8px;
          height: 8px;
          background: rgba(0,0,0,0.25);
          border-radius: 50%;
          filter: blur(1px);
          margin-top: -2px;
        "></div>
      </div>
    `,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
    popupAnchor: [0, -42],
  });
}

const DEFAULT_CENTER = { lat: 21.028511, lng: 105.804817 }; // Hà Nội trung tâm

export default function WarehouseMapPicker({
  address = '',
  name = '',
  latitude = null,
  longitude = null,
  onLocationChange,
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);

  const [geocoding, setGeocoding] = useState(false);
  const [geocodeMsg, setGeocodeMsg] = useState(null);
  const [isPinned, setIsPinned] = useState(Boolean(latitude && longitude));

  const hasCoords = typeof latitude === 'number' && !isNaN(latitude) &&
                    typeof longitude === 'number' && !isNaN(longitude);

  // Khởi tạo bản đồ Leaflet
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return;

    const initialLat = hasCoords ? latitude : DEFAULT_CENTER.lat;
    const initialLng = hasCoords ? longitude : DEFAULT_CENTER.lng;
    const initialZoom = hasCoords ? 15 : 12;

    const map = L.map(mapContainerRef.current, {
      center: [initialLat, initialLng],
      zoom: initialZoom,
      zoomControl: true,
      attributionControl: false,
    });

    setupMapTiles(map);

    // Nếu đã có tọa độ thì vẽ marker
    if (hasCoords) {
      const marker = L.marker([latitude, longitude], {
        draggable: true,
        icon: createWarehousePinIcon(name || 'Kho H&G'),
      }).addTo(map);

      marker.on('dragend', () => {
        const pos = marker.getLatLng();
        const newLat = parseFloat(pos.lat.toFixed(6));
        const newLng = parseFloat(pos.lng.toFixed(6));
        onLocationChange(newLat, newLng);
        setIsPinned(true);
        setGeocodeMsg({ type: 'success', text: 'Đã cập nhật vị trí từ thao tác kéo thả ghim.' });
      });

      markerRef.current = marker;
      setIsPinned(true);
    }

    // Cho phép click lên bản đồ để định vị/di chuyển marker
    map.on('click', (e) => {
      const { lat, lng } = e.latlng;
      const newLat = parseFloat(lat.toFixed(6));
      const newLng = parseFloat(lng.toFixed(6));

      if (markerRef.current) {
        markerRef.current.setLatLng([newLat, newLng]);
      } else {
        const marker = L.marker([newLat, newLng], {
          draggable: true,
          icon: createWarehousePinIcon(name || 'Kho H&G'),
        }).addTo(map);

        marker.on('dragend', () => {
          const pos = marker.getLatLng();
          const movedLat = parseFloat(pos.lat.toFixed(6));
          const movedLng = parseFloat(pos.lng.toFixed(6));
          onLocationChange(movedLat, movedLng);
          setIsPinned(true);
          setGeocodeMsg({ type: 'success', text: 'Đã cập nhật vị trí từ thao tác kéo thả ghim.' });
        });

        markerRef.current = marker;
      }

      onLocationChange(newLat, newLng);
      setIsPinned(true);
      setGeocodeMsg({ type: 'success', text: 'Đã ghim vị trí trên bản đồ!' });
    });

    mapInstanceRef.current = map;

    // Fix lỗi hiển thị tile khi render trong dialog/tab
    setTimeout(() => {
      map.invalidateSize();
    }, 250);

    return () => {
      map.remove();
      mapInstanceRef.current = null;
      markerRef.current = null;
    };
  }, []);

  // Cập nhật nhãn icon khi tên kho thay đổi
  useEffect(() => {
    if (markerRef.current) {
      markerRef.current.setIcon(createWarehousePinIcon(name || 'Kho H&G'));
    }
  }, [name]);

  // Cập nhật vị trí marker khi latitude/longitude từ props thay đổi (ví dụ khi load dữ liệu kho sửa)
  useEffect(() => {
    if (!mapInstanceRef.current || !hasCoords) return;

    if (markerRef.current) {
      markerRef.current.setLatLng([latitude, longitude]);
    } else {
      const marker = L.marker([latitude, longitude], {
        draggable: true,
        icon: createWarehousePinIcon(name || 'Kho H&G'),
      }).addTo(mapInstanceRef.current);

      marker.on('dragend', () => {
        const pos = marker.getLatLng();
        onLocationChange(parseFloat(pos.lat.toFixed(6)), parseFloat(pos.lng.toFixed(6)));
        setIsPinned(true);
      });

      markerRef.current = marker;
    }
    setIsPinned(true);
  }, [latitude, longitude, hasCoords, onLocationChange, name]);

  // Workflow Bước 3: Admin click "Tìm vị trí trên bản đồ"
  const handleSearchOnMap = useCallback(async () => {
    const query = address ? address.trim() : '';
    if (!query) {
      setGeocodeMsg({
        type: 'warning',
        text: 'Vui lòng nhập địa chỉ kho hàng trước khi tìm kiếm trên bản đồ.',
      });
      return;
    }

    setGeocoding(true);
    setGeocodeMsg(null);

    try {
      // Tìm kiếm qua Nominatim OpenStreetMap (miễn phí, ưu tiên Việt Nam)
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&countrycodes=vn&limit=1`;
      const res = await fetch(url, {
        headers: { 'Accept-Language': 'vi,en' }
      });
      const data = await res.json();

      if (data && data.length > 0) {
        const resultLat = parseFloat(parseFloat(data[0].lat).toFixed(6));
        const resultLng = parseFloat(parseFloat(data[0].lon).toFixed(6));

        if (mapInstanceRef.current) {
          mapInstanceRef.current.flyTo([resultLat, resultLng], 16, { duration: 1.2 });

          if (markerRef.current) {
            markerRef.current.setLatLng([resultLat, resultLng]);
          } else {
            const marker = L.marker([resultLat, resultLng], {
              draggable: true,
              icon: createWarehousePinIcon(name || 'Kho H&G'),
            }).addTo(mapInstanceRef.current);

            marker.on('dragend', () => {
              const pos = marker.getLatLng();
              onLocationChange(parseFloat(pos.lat.toFixed(6)), parseFloat(pos.lng.toFixed(6)));
              setIsPinned(true);
            });

            markerRef.current = marker;
          }
        }

        onLocationChange(resultLat, resultLng);
        setIsPinned(true);
        setGeocodeMsg({
          type: 'success',
          text: `Tìm thấy vị trí: "${data[0].display_name.split(',').slice(0, 3).join(',')}". Bạn có thể kéo ghim để tinh chỉnh tọa độ chính xác.`,
        });
      } else {
        setGeocodeMsg({
          type: 'warning',
          text: 'Không tìm thấy địa chỉ tự động. Bạn vui lòng nhấp chuột trực tiếp lên bản đồ bên dưới để đặt vị trí ghim kho hàng.',
        });
      }
    } catch (err) {
      const approx = getApproximateCoordsFromAddress(query);
      if (approx && mapInstanceRef.current) {
        mapInstanceRef.current.flyTo([approx.lat, approx.lng], 14, { duration: 1.2 });
        if (markerRef.current) {
          markerRef.current.setLatLng([approx.lat, approx.lng]);
        } else {
          const marker = L.marker([approx.lat, approx.lng], {
            draggable: true,
            icon: createWarehousePinIcon(name || 'Kho H&G'),
          }).addTo(mapInstanceRef.current);
          marker.on('dragend', () => {
            const pos = marker.getLatLng();
            onLocationChange(parseFloat(pos.lat.toFixed(6)), parseFloat(pos.lng.toFixed(6)));
            setIsPinned(true);
          });
          markerRef.current = marker;
        }
        onLocationChange(approx.lat, approx.lng);
        setIsPinned(true);
        setGeocodeMsg({
          type: 'success',
          text: 'Đã định vị theo khu vực tỉnh/thành phố. Bạn có thể kéo ghim đến đúng vị trí kho hàng.',
        });
      } else {
        setGeocodeMsg({
          type: 'warning',
          text: 'Không kết nối được dịch vụ tìm kiếm địa chỉ. Bạn có thể nhấp trực tiếp lên bản đồ để chọn vị trí.',
        });
      }
    } finally {
      setGeocoding(false);
    }
  }, [address, name, onLocationChange]);

  // Tiện ích: Lấy vị trí hiện tại qua Geolocation của trình duyệt
  const handleUseCurrentLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setGeocodeMsg({ type: 'danger', text: 'Trình duyệt của bạn không hỗ trợ định vị GPS.' });
      return;
    }

    setGeocoding(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const curLat = parseFloat(pos.coords.latitude.toFixed(6));
        const curLng = parseFloat(pos.coords.longitude.toFixed(6));

        if (mapInstanceRef.current) {
          mapInstanceRef.current.flyTo([curLat, curLng], 16, { duration: 1.2 });
          if (markerRef.current) {
            markerRef.current.setLatLng([curLat, curLng]);
          } else {
            const marker = L.marker([curLat, curLng], {
              draggable: true,
              icon: createWarehousePinIcon(name || 'Kho H&G'),
            }).addTo(mapInstanceRef.current);

            marker.on('dragend', () => {
              const p = marker.getLatLng();
              onLocationChange(parseFloat(p.lat.toFixed(6)), parseFloat(p.lng.toFixed(6)));
              setIsPinned(true);
            });

            markerRef.current = marker;
          }
        }

        onLocationChange(curLat, curLng);
        setIsPinned(true);
        setGeocodeMsg({
          type: 'success',
          text: 'Đã lấy tọa độ từ thiết bị hiện tại của bạn. Bạn có thể kéo ghim để điều chỉnh.',
        });
        setGeocoding(false);
      },
      (err) => {
        setGeocodeMsg({
          type: 'danger',
          text: `Không thể lấy vị trí hiện tại: ${err.message}`,
        });
        setGeocoding(false);
      },
      { timeout: 8000, enableHighAccuracy: true }
    );
  }, [name, onLocationChange]);

  return (
    <div style={{ marginTop: 24, border: '1px solid var(--border)', borderRadius: 'var(--radius-xl, 14px)', overflow: 'hidden', background: 'var(--bg-card)' }}>
      {/* Header bar điều khiển bản đồ */}
      <div style={{ padding: '16px 20px', background: 'var(--bg)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <MapPin size={20} />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)' }}>
              Vị trí kho trên bản đồ tương tác
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
              Nhấp chuột hoặc kéo thả ghim 📍 để cập nhật tọa độ tự động
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={handleSearchOnMap}
            disabled={geocoding || !address}
            className="btn btn-primary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, padding: '8px 14px', borderRadius: 'var(--radius-lg, 8px)' }}
          >
            {geocoding ? <RefreshCw size={14} className="animate-spin" /> : <Search size={14} />}
            <span>{geocoding ? 'Đang định vị...' : 'Tìm vị trí trên bản đồ'}</span>
          </button>

          <button
            type="button"
            onClick={handleUseCurrentLocation}
            disabled={geocoding}
            className="btn btn-secondary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, padding: '8px 12px', borderRadius: 'var(--radius-lg, 8px)' }}
            title="Sử dụng GPS thiết bị"
          >
            <Navigation size={14} />
            <span>Vị trí của tôi</span>
          </button>
        </div>
      </div>

      {/* Thông báo hướng dẫn / kết quả geocode */}
      {geocodeMsg && (
        <div style={{
          padding: '10px 16px',
          fontSize: 13,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          borderBottom: '1px solid var(--border)',
          background: geocodeMsg.type === 'success' ? '#f0fdf4' : geocodeMsg.type === 'danger' ? '#fef2f2' : '#fffbeb',
          color: geocodeMsg.type === 'success' ? '#166534' : geocodeMsg.type === 'danger' ? '#991b1b' : '#92400e',
        }}>
          {geocodeMsg.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          <span>{geocodeMsg.text}</span>
        </div>
      )}

      {/* Khung bản đồ Leaflet */}
      <div style={{ position: 'relative', width: '100%', height: 340, background: '#f1f5f9' }}>
        <div ref={mapContainerRef} style={{ width: '100%', height: '100%' }} />

        {/* Floating Hint Overlay */}
        <div style={{
          position: 'absolute',
          bottom: 12,
          left: 12,
          zIndex: 1000,
          background: 'rgba(255, 255, 255, 0.92)',
          backdropFilter: 'blur(6px)',
          padding: '6px 12px',
          borderRadius: 8,
          fontSize: 11,
          color: '#475569',
          boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          pointerEvents: 'none'
        }}>
          <span>💡 Nhấp bất kỳ đâu trên bản đồ hoặc kéo ghim để định vị</span>
        </div>
      </div>

      {/* Footer bar hiển thị trạng thái và 2 ô tọa độ Read-Only */}
      <div style={{ padding: '16px 20px', background: '#fafafa', borderTop: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14 }}>
          {/* Trạng thái ghim */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {isPinned && hasCoords ? (
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 12px',
                borderRadius: 'var(--radius-full, 9999px)',
                background: '#dcfce7',
                color: '#15803d',
                fontSize: 12,
                fontWeight: 700,
              }}>
                <CheckCircle2 size={15} /> Vị trí đã được ghim
              </span>
            ) : (
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 12px',
                borderRadius: 'var(--radius-full, 9999px)',
                background: '#fef3c7',
                color: '#b45309',
                fontSize: 12,
                fontWeight: 600,
              }}>
                <AlertCircle size={15} /> Chưa ghim vị trí (Nhấp trên bản đồ hoặc bấm Tìm vị trí)
              </span>
            )}
          </div>

          {/* Technical Read-Only Coordinates */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
              <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Latitude:</span>
              <span style={{
                padding: '4px 10px',
                borderRadius: 6,
                background: '#f1f5f9',
                fontFamily: 'monospace',
                fontWeight: 700,
                color: hasCoords ? '#0f172a' : '#94a3b8',
                border: '1px solid #e2e8f0',
              }}>
                {hasCoords ? latitude.toFixed(6) : '—'}
              </span>
              <span style={{ fontSize: 11, color: '#94a3b8' }}>(read-only)</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
              <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Longitude:</span>
              <span style={{
                padding: '4px 10px',
                borderRadius: 6,
                background: '#f1f5f9',
                fontFamily: 'monospace',
                fontWeight: 700,
                color: hasCoords ? '#0f172a' : '#94a3b8',
                border: '1px solid #e2e8f0',
              }}>
                {hasCoords ? longitude.toFixed(6) : '—'}
              </span>
              <span style={{ fontSize: 11, color: '#94a3b8' }}>(read-only)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
