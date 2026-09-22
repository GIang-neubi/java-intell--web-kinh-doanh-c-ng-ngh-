/**
 * Google Maps Navigation Utility for H&G Delivery
 * Tuân thủ quy chuẩn Universal Google Maps Intent URLs:
 * - Chế độ xe máy 2 bánh (chủ lực tại Việt Nam): travelmode=two-wheeler
 * - Kích hoạt điều hướng trực tiếp: dir_action=navigate
 * - Điểm xuất phát tự động: pre-fill origin từ GPS live của Shipper
 */

/**
 * Chuẩn hóa đối tượng tọa độ về { latitude, longitude }
 */
export function normalizeCoords(coords) {
  if (!coords) return null;
  const lat = typeof coords.latitude === 'number' ? coords.latitude : (typeof coords.lat === 'number' ? coords.lat : null);
  const lng = typeof coords.longitude === 'number' ? coords.longitude : (typeof coords.lng === 'number' ? coords.lng : null);
  if (lat == null || lng == null || isNaN(lat) || isNaN(lng)) return null;
  return { latitude: lat, longitude: lng };
}

/**
 * Tạo URL Google Maps dẫn đường chuyên nghiệp
 * @param {Object} params
 * @param {Object} [params.destinationCoords] - { latitude, longitude }
 * @param {string} [params.destinationAddress] - Địa chỉ text nếu không có tọa độ
 * @param {Object} [params.originCoords] - Tọa độ thực tế hiện tại của tài xế
 * @param {string} [params.travelMode='two-wheeler'] - 'two-wheeler' | 'driving' | 'bicycling' | 'walking'
 * @param {boolean} [params.startNavigation=true] - Bật dir_action=navigate
 */
export function buildGoogleMapsNavUrl({
  destinationCoords = null,
  destinationAddress = '',
  originCoords = null,
  travelMode = 'two-wheeler',
  startNavigation = true,
}) {
  const normDest = normalizeCoords(destinationCoords);
  const normOrigin = normalizeCoords(originCoords);

  let destParam = '';
  if (normDest) {
    destParam = `${normDest.latitude},${normDest.longitude}`;
  } else if (destinationAddress && destinationAddress.trim()) {
    destParam = destinationAddress.trim();
  } else {
    return null;
  }

  const params = new URLSearchParams({
    api: '1',
    destination: destParam,
  });

  if (normOrigin) {
    params.set('origin', `${normOrigin.latitude},${normOrigin.longitude}`);
  }

  if (travelMode) {
    params.set('travelmode', travelMode);
  }

  if (startNavigation) {
    params.set('dir_action', 'navigate');
  }

  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

/**
 * Lấy thông tin điều hướng mục tiêu đang hoạt động (Active Target) theo từng chặng
 * Chặng 1: Trước khi lấy hàng -> Đến Kho
 * Chặng 2: Sau khi lấy hàng -> Đến Khách
 */
export function getDeliveryNavigationStage(delivery, liveCoords = null) {
  if (!delivery) return null;

  const isBeforePickup = ['PENDING_ASSIGNMENT', 'ASSIGNED', 'SHIPPER_ACCEPTED'].includes(delivery.status);
  const isAfterPickup = ['PICKED_UP', 'IN_TRANSIT', 'ARRIVED'].includes(delivery.status);
  const isCompleted = ['DELIVERED', 'DELIVERY_FAILED', 'CANCELLED'].includes(delivery.status);

  // Tọa độ vị trí hiện tại của shipper
  const shipperCoords = normalizeCoords(liveCoords) || (
    typeof delivery.currentLatitude === 'number' && typeof delivery.currentLongitude === 'number'
      ? { latitude: delivery.currentLatitude, longitude: delivery.currentLongitude }
      : null
  );

  const warehouseCoords = (typeof delivery.warehouseLatitude === 'number' && typeof delivery.warehouseLongitude === 'number')
    ? { latitude: delivery.warehouseLatitude, longitude: delivery.warehouseLongitude }
    : null;

  const customerCoords = (typeof delivery.deliveryLatitude === 'number' && typeof delivery.deliveryLongitude === 'number')
    ? { latitude: delivery.deliveryLatitude, longitude: delivery.deliveryLongitude }
    : null;

  if (isBeforePickup) {
    const navUrl = buildGoogleMapsNavUrl({
      destinationCoords: warehouseCoords,
      destinationAddress: delivery.warehouseAddress,
      originCoords: shipperCoords,
      travelMode: 'two-wheeler',
      startNavigation: true,
    });

    return {
      stage: 'WAREHOUSE',
      isBeforePickup: true,
      isAfterPickup: false,
      isCompleted: false,
      title: 'Đến Kho lấy hàng',
      badge: 'Chặng 1: Kho hàng',
      targetName: delivery.warehouseName || 'Kho xuất hàng',
      targetCode: delivery.warehouseCode,
      targetAddress: delivery.warehouseAddress || 'Địa chỉ kho',
      targetPhone: delivery.warehousePhone,
      targetCoords: warehouseCoords,
      originCoords: shipperCoords,
      navUrl,
      buttonLabel: 'Dẫn đường đến Kho (Xe máy)',
    };
  }

  // Chặng 2 hoặc Đã xong: Khách hàng
  const navUrl = buildGoogleMapsNavUrl({
    destinationCoords: customerCoords,
    destinationAddress: delivery.deliveryAddress,
    originCoords: shipperCoords,
    travelMode: 'two-wheeler',
    startNavigation: !isCompleted,
  });

  return {
    stage: isCompleted ? 'COMPLETED' : 'CUSTOMER',
    isBeforePickup: false,
    isAfterPickup: true,
    isCompleted,
    title: isCompleted ? 'Điểm nhận hàng' : 'Đến Khách giao hàng',
    badge: isCompleted ? 'Đã giao' : 'Chặng 2: Khách hàng',
    targetName: delivery.receiverName || 'Khách hàng',
    targetAddress: delivery.deliveryAddress || 'Địa chỉ nhận hàng',
    targetPhone: delivery.receiverPhone,
    targetCoords: customerCoords,
    originCoords: shipperCoords,
    navUrl,
    buttonLabel: isCompleted ? 'Xem vị trí giao trên Google Maps' : 'Dẫn đường đến Khách (Xe máy)',
  };
}

/**
 * URL chỉ đường riêng đến kho
 */
export function buildWarehouseNavUrl(delivery, originCoords = null) {
  if (!delivery) return null;
  const warehouseCoords = (typeof delivery.warehouseLatitude === 'number' && typeof delivery.warehouseLongitude === 'number')
    ? { latitude: delivery.warehouseLatitude, longitude: delivery.warehouseLongitude }
    : null;

  return buildGoogleMapsNavUrl({
    destinationCoords: warehouseCoords,
    destinationAddress: delivery.warehouseAddress,
    originCoords: normalizeCoords(originCoords),
    travelMode: 'two-wheeler',
    startNavigation: true,
  });
}

/**
 * URL chỉ đường riêng đến khách hàng
 */
export function buildCustomerNavUrl(delivery, originCoords = null) {
  if (!delivery) return null;
  const customerCoords = (typeof delivery.deliveryLatitude === 'number' && typeof delivery.deliveryLongitude === 'number')
    ? { latitude: delivery.deliveryLatitude, longitude: delivery.deliveryLongitude }
    : null;

  return buildGoogleMapsNavUrl({
    destinationCoords: customerCoords,
    destinationAddress: delivery.deliveryAddress,
    originCoords: normalizeCoords(originCoords),
    travelMode: 'two-wheeler',
    startNavigation: true,
  });
}

/**
 * URL xem toàn bộ hành trình từ Kho -> Khách hàng (Dành cho Admin hoặc Shipper xem tổng quan)
 */
export function buildFullRouteUrl(delivery) {
  if (!delivery) return null;

  const originParam = (typeof delivery.warehouseLatitude === 'number' && typeof delivery.warehouseLongitude === 'number')
    ? `${delivery.warehouseLatitude},${delivery.warehouseLongitude}`
    : (delivery.warehouseAddress || '');

  const destParam = (typeof delivery.deliveryLatitude === 'number' && typeof delivery.deliveryLongitude === 'number')
    ? `${delivery.deliveryLatitude},${delivery.deliveryLongitude}`
    : (delivery.deliveryAddress || '');

  if (!destParam) return null;

  const params = new URLSearchParams({
    api: '1',
    destination: destParam,
    travelmode: 'two-wheeler',
  });

  if (originParam) {
    params.set('origin', originParam);
  }

  return `https://www.google.com/maps/dir/?${params.toString()}`;
}
