import { useEffect, useRef, useState, useCallback } from 'react';
import { updateShipperDeliveryLocation } from '../api/delivery';

// Các trạng thái giao hàng được phép bật GPS theo dõi
export const ACTIVE_TRACKING_STATUSES = [
  'SHIPPER_ACCEPTED',
  'PICKED_UP',
  'IN_TRANSIT',
  'ARRIVED'
];

// Tính khoảng cách giữa 2 tọa độ theo công thức Haversine (đơn vị: mét)
function calculateDistanceMeters(lat1, lon1, lat2, lon2) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return 0;
  const R = 6371000; // Bán kính Trái Đất (mét)
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Custom hook quản lý GPS thời gian thực cho Shipper
 * @param {object} options
 * @param {number} options.deliveryId - ID phiếu giao hàng
 * @param {string} options.status - Trạng thái phiếu giao
 * @param {function} options.onLocationSync - Callback khi tọa độ được đồng bộ lên backend thành công
 * @param {number} [options.minDistanceMeters=15] - Ngưỡng di chuyển tối thiểu để gửi cập nhật (tránh spam)
 * @param {number} [options.minIntervalMs=4000] - Khoảng thời gian tối thiểu giữa 2 lần gửi (tránh dồn dập)
 * @param {number} [options.heartbeatMs=30000] - Chu kỳ gửi định kỳ ngay cả khi ít di chuyển
 */
export function useShipperGps({
  deliveryId,
  status,
  onLocationSync,
  minDistanceMeters = 15,
  minIntervalMs = 4000,
  heartbeatMs = 30000,
}) {
  const [isTracking, setIsTracking] = useState(false);
  const [coords, setCoords] = useState(null);
  const [gpsError, setGpsError] = useState(null);
  const [lastSyncedAt, setLastSyncedAt] = useState(null);

  const watchIdRef = useRef(null);
  const lastSentCoordsRef = useRef(null);
  const lastSentTimeRef = useRef(0);
  const sendingRef = useRef(false);

  const isDeliveryActive = Boolean(deliveryId && ACTIVE_TRACKING_STATUSES.includes(status));

  // Hàm dừng theo dõi và dọn dẹp Watch ID
  const stopTracking = useCallback(() => {
    if (watchIdRef.current !== null) {
      if (navigator.geolocation && navigator.geolocation.clearWatch) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
      watchIdRef.current = null;
    }
    setIsTracking(false);
  }, []);

  // Xử lý gửi vị trí lên server với chiến lược thông minh
  const handlePositionUpdate = useCallback(async (position) => {
    const lat = parseFloat(position.coords.latitude.toFixed(6));
    const lng = parseFloat(position.coords.longitude.toFixed(6));
    const accuracy = position.coords.accuracy ? Math.round(position.coords.accuracy) : null;
    const timestamp = position.timestamp || Date.now();

    const currentData = { latitude: lat, longitude: lng, accuracy, timestamp };
    setCoords(currentData);
    setGpsError(null);

    // Kiểm tra chiến lược gửi vị trí (Tránh gửi dồn dập & lãng phí tài nguyên)
    const now = Date.now();
    const timeElapsed = now - lastSentTimeRef.current;

    // Không gửi quá nhanh (nhỏ hơn minIntervalMs)
    if (timeElapsed < minIntervalMs) {
      return;
    }

    let shouldSend = false;

    if (!lastSentCoordsRef.current) {
      // Lần đầu tiên nhận được vị trí -> Gửi ngay
      shouldSend = true;
    } else {
      const dist = calculateDistanceMeters(
        lastSentCoordsRef.current.latitude,
        lastSentCoordsRef.current.longitude,
        lat,
        lng
      );

      // Nếu di chuyển vượt ngưỡng minDistanceMeters (15m) -> Gửi cập nhật
      if (dist >= minDistanceMeters) {
        shouldSend = true;
      }
      // Hoặc đã qua chu kỳ heartbeatMs (30s) và khoảng cách >= 3m -> Gửi giữ kết nối
      else if (timeElapsed >= heartbeatMs && dist >= 3) {
        shouldSend = true;
      }
    }

    if (!shouldSend || sendingRef.current) {
      return;
    }

    sendingRef.current = true;
    try {
      await updateShipperDeliveryLocation(deliveryId, currentData);
      lastSentCoordsRef.current = currentData;
      lastSentTimeRef.current = Date.now();
      setLastSyncedAt(new Date());

      if (onLocationSync) {
        onLocationSync(currentData);
      }
    } catch (err) {
      // Ghi log nhẹ nhàng và tiếp tục nhận tín hiệu định vị kế tiếp
      console.warn('[GPS Sync] Tạm thời chưa đồng bộ được tọa độ:', err.message);
    } finally {
      sendingRef.current = false;
    }
  }, [deliveryId, minDistanceMeters, minIntervalMs, heartbeatMs, onLocationSync]);

  // Xử lý lỗi Geolocation theo đúng quy chuẩn dự án
  const handlePositionError = useCallback((error) => {
    let message = 'Không thể xác định vị trí hiện tại.';
    if (error.code === 1) {
      // PERMISSION_DENIED
      message = 'Bạn cần cho phép truy cập vị trí để sử dụng tính năng này.';
    } else if (error.code === 2) {
      // POSITION_UNAVAILABLE
      message = 'Không thể xác định vị trí hiện tại.';
    } else if (error.code === 3) {
      // TIMEOUT
      message = 'Hết thời gian chờ phản hồi từ thiết bị GPS.';
    }

    setGpsError(message);
    // TUYỆT ĐỐI KHÔNG TẠO TỌA ĐỘ ẢO
  }, []);

  // Khởi động watchPosition khi đơn hàng trong trạng thái active
  useEffect(() => {
    if (!isDeliveryActive) {
      stopTracking();
      return;
    }

    if (!navigator.geolocation) {
      setGpsError('Trình duyệt hoặc thiết bị của bạn không hỗ trợ định vị GPS.');
      setIsTracking(false);
      return;
    }

    setIsTracking(true);
    setGpsError(null);

    const geoOptions = {
      enableHighAccuracy: true,
      maximumAge: 3000,
      timeout: 10000,
    };

    try {
      watchIdRef.current = navigator.geolocation.watchPosition(
        handlePositionUpdate,
        handlePositionError,
        geoOptions
      );
    } catch (e) {
      setGpsError('Lỗi khi kích hoạt cảm biến vị trí: ' + e.message);
      setIsTracking(false);
    }

    return () => {
      stopTracking();
    };
  }, [isDeliveryActive, handlePositionUpdate, handlePositionError, stopTracking]);

  return {
    isTracking,
    coords,
    gpsError,
    lastSyncedAt,
    stopTracking,
  };
}
