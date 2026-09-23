import L from 'leaflet';

/**
 * Cấu hình Tile Layer chuẩn và nhanh nhất cho người dùng Việt Nam.
 * Sử dụng Google Maps Tiles làm nguồn chính (tốc độ cao, đầy đủ tên đường tiếng Việt, không bị ISP chặn)
 * Kèm OpenStreetMap France làm nguồn phụ (không bị chặn tại VN).
 */
export const GOOGLE_MAP_TILE_URL = 'https://mt{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}';
export const GOOGLE_MAP_TILE_OPTIONS = {
  subdomains: ['0', '1', '2', '3'],
  maxZoom: 20,
  attribution: '© Google Maps',
};

export const OSM_FR_TILE_URL = 'https://{s}.tile.openstreetmap.fr/osmfr/{z}/{x}/{y}.png';
export const OSM_FR_TILE_OPTIONS = {
  subdomains: ['a', 'b', 'c'],
  maxZoom: 19,
  attribution: '© OpenStreetMap France',
};

/**
 * Gán tile layer vào bản đồ Leaflet kèm nút chuyển đổi loại bản đồ
 * @param {L.Map} map - Đối tượng bản đồ Leaflet
 * @returns {L.TileLayer} Layer chính
 */
export function setupMapTiles(map) {
  if (!map) return null;

  const googleLayer = L.tileLayer(GOOGLE_MAP_TILE_URL, GOOGLE_MAP_TILE_OPTIONS);
  const osmFrLayer = L.tileLayer(OSM_FR_TILE_URL, OSM_FR_TILE_OPTIONS);

  // Mặc định nạp Google Maps
  googleLayer.addTo(map);

  // Layer control nhỏ gọn góc dưới bên trái
  try {
    L.control.layers(
      {
        'Bản đồ Google Maps': googleLayer,
        'Bản đồ OpenStreetMap': osmFrLayer,
      },
      null,
      { position: 'bottomleft', collapsed: true }
    ).addTo(map);
  } catch {
    // Bỏ qua nếu đã có control
  }

  return googleLayer;
}

// Bảng tọa độ dự phòng các tỉnh/thành phố lớn tại Việt Nam khi không thể geocode
const VIETNAM_PROVINCE_COORDS = [
  { keywords: ['hà nội', 'ha noi', 'hn'], lat: 21.028511, lng: 105.854167 },
  { keywords: ['hồ chí minh', 'ho chi minh', 'sài gòn', 'sai gon', 'tphcm', 'hcm'], lat: 10.823099, lng: 106.629664 },
  { keywords: ['đà nẵng', 'da nang'], lat: 16.054407, lng: 108.202167 },
  { keywords: ['hải phòng', 'hai phong'], lat: 20.844912, lng: 106.688084 },
  { keywords: ['cần thơ', 'can tho'], lat: 10.045162, lng: 105.746857 },
  { keywords: ['quảng ninh', 'hạ long', 'ha long'], lat: 20.959902, lng: 107.042542 },
  { keywords: ['bình dương', 'thủ dầu một'], lat: 10.980460, lng: 106.651878 },
  { keywords: ['đồng nai', 'biên hòa'], lat: 10.957438, lng: 106.842712 },
  { keywords: ['khánh hòa', 'nha trang'], lat: 12.238791, lng: 109.196749 },
  { keywords: ['thừa thiên huế', 'huế', 'hue'], lat: 16.463713, lng: 107.590866 },
  { keywords: ['lâm đồng', 'đà lạt', 'da lat'], lat: 11.940419, lng: 108.458313 },
  { keywords: ['nghệ an', 'vinh'], lat: 18.679585, lng: 105.681335 },
  { keywords: ['thanh hóa', 'thanh hoa'], lat: 19.806692, lng: 105.785187 },
  { keywords: ['bắc ninh', 'bac ninh'], lat: 21.186096, lng: 106.076317 },
  { keywords: ['vũng tàu', 'bà rịa'], lat: 10.345991, lng: 107.084297 },
];

/**
 * Tìm tọa độ gần đúng dựa trên tên tỉnh/thành phố trong địa chỉ
 * @param {string} address - Chuỗi địa chỉ
 * @returns {{lat: number, lng: number} | null}
 */
export function getApproximateCoordsFromAddress(address) {
  if (!address || typeof address !== 'string') return null;
  const lower = address.toLowerCase();
  for (const item of VIETNAM_PROVINCE_COORDS) {
    if (item.keywords.some((kw) => lower.includes(kw))) {
      return { lat: item.lat, lng: item.lng };
    }
  }
  return null;
}
