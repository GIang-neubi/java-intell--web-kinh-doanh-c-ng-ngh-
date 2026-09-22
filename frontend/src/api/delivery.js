import api from './client';

// ================= ADMIN DELIVERY APIs =================

/**
 * Admin: Danh sách phiếu giao hàng (tìm kiếm + lọc trạng thái + shipper + phân trang)
 * @param {object} params - { keyword, status, shipperId, shippingMethod, page, size }
 */
export async function fetchAdminDeliveries(params = {}) {
  const { data } = await api.get('/admin/deliveries', { params });
  if (!data.success) throw new Error(data.message || 'Không tải được danh sách phiếu giao hàng');
  return data.data; // PageResponse<DeliveryResponse>
}

/**
 * Admin: Chi tiết phiếu giao hàng
 */
export async function fetchAdminDeliveryDetail(id) {
  const { data } = await api.get(`/admin/deliveries/${id}`);
  if (!data.success) throw new Error(data.message || 'Không tải được chi tiết phiếu giao');
  return data.data; // DeliveryDetailResponse
}

/**
 * Admin: Phân công hoặc đổi Shipper
 * @param {number} deliveryId
 * @param {object} payload - { shipperId, note }
 */
export async function assignShipper(deliveryId, payload) {
  const { data } = await api.post(`/admin/deliveries/${deliveryId}/assign`, payload);
  if (!data.success) throw new Error(data.message || 'Phân công Shipper thất bại');
  return data.data;
}

/**
 * Admin: Lấy danh sách toàn bộ Shipper kèm thống kê số lượng đơn
 */
export async function fetchShippers() {
  const { data } = await api.get('/admin/deliveries/shippers');
  if (!data.success) throw new Error(data.message || 'Không tải được danh sách shipper');
  return data.data; // List<ShipperSummaryDTO>
}

/**
 * Admin: Thống kê tổng quan đơn giao hàng
 */
export async function fetchDeliveryStats() {
  const { data } = await api.get('/admin/deliveries/stats');
  if (!data.success) throw new Error(data.message || 'Không tải được thống kê giao hàng');
  return data.data; // DeliveryStatsResponse
}

// ================= CUSTOMER DELIVERY APIs =================

/**
 * Khách hàng: Lấy chi tiết vận chuyển theo orderId
 */
export async function fetchDeliveryByOrderId(orderId) {
  const { data } = await api.get(`/deliveries/order/${orderId}`);
  if (!data.success) throw new Error(data.message || 'Không tải được thông tin vận chuyển');
  return data.data; // DeliveryDetailResponse
}

/**
 * Khách hàng: Lấy chi tiết vận chuyển theo deliveryId
 */
export async function fetchDeliveryDetail(id) {
  const { data } = await api.get(`/deliveries/${id}`);
  if (!data.success) throw new Error(data.message || 'Không tải được thông tin vận chuyển');
  return data.data;
}

/**
 * Khách hàng: Lấy lộ trình timeline của phiếu giao
 */
export async function fetchDeliveryTrackings(id) {
  const { data } = await api.get(`/deliveries/${id}/tracking`);
  if (!data.success) throw new Error(data.message || 'Không tải được lộ trình');
  return data.data; // List<DeliveryTrackingDTO>
}

/**
 * Khách hàng: Xác nhận đã nhận được hàng
 */
export async function customerConfirmReceived(id) {
  const { data } = await api.post(`/deliveries/${id}/confirm-received`);
  if (!data.success) throw new Error(data.message || 'Xác nhận nhận hàng thất bại');
  return data.data;
}

// ================= SHIPPER APIs =================

/**
 * Shipper: Lấy danh sách đơn hàng được gán cho mình
 * @param {object} params - { status, page, size }
 */
export async function fetchShipperDeliveries(params = {}) {
  const { data } = await api.get('/shipper/deliveries', { params });
  if (!data.success) throw new Error(data.message || 'Không tải được đơn hàng shipper');
  return data.data;
}

/**
 * Shipper: Thống kê trạng thái các đơn hàng cho dashboard
 */
export async function fetchShipperStats() {
  const { data } = await api.get('/shipper/deliveries/stats');
  if (!data.success) throw new Error(data.message || 'Không tải được thống kê đơn giao');
  return data.data;
}

/**
 * Shipper: Chi tiết đơn hàng được gán
 */
export async function fetchShipperDeliveryDetail(id) {
  const { data } = await api.get(`/shipper/deliveries/${id}`);
  if (!data.success) throw new Error(data.message || 'Không tải được chi tiết đơn hàng');
  return data.data;
}

/**
 * Shipper: Chấp nhận đơn giao
 */
export async function shipperAcceptDelivery(id) {
  const { data } = await api.post(`/shipper/deliveries/${id}/accept`);
  if (!data.success) throw new Error(data.message || 'Thao tác nhận đơn thất bại');
  return data.data;
}

/**
 * Shipper: Đã lấy gói hàng tại cửa hàng/kho
 */
export async function shipperPickupPackage(id) {
  const { data } = await api.post(`/shipper/deliveries/${id}/pickup`);
  if (!data.success) throw new Error(data.message || 'Thao tác lấy hàng thất bại');
  return data.data;
}

/**
 * Shipper: Bắt đầu di chuyển giao tới khách hàng
 * @param {number} id
 * @param {object} location - { latitude, longitude }
 */
export async function shipperStartDelivery(id, location) {
  const { data } = await api.post(`/shipper/deliveries/${id}/start`, location || {});
  if (!data.success) throw new Error(data.message || 'Thao tác bắt đầu giao thất bại');
  return data.data;
}

/**
 * Shipper: Đã tới địa chỉ nhận hàng
 * @param {number} id
 * @param {object} location - { latitude, longitude }
 */
export async function shipperArrive(id, location) {
  const { data } = await api.post(`/shipper/deliveries/${id}/arrive`, location || {});
  if (!data.success) throw new Error(data.message || 'Thao tác báo đến nơi thất bại');
  return data.data;
}

/**
 * Shipper: Cập nhật tọa độ GPS thời gian thực trong quá trình giao hàng
 * @param {number} id
 * @param {object} location - { latitude, longitude, accuracy, timestamp }
 */
export async function updateShipperDeliveryLocation(id, location) {
  const { data } = await api.post(`/shipper/deliveries/${id}/location`, location);
  if (!data.success) throw new Error(data.message || 'Cập nhật tọa độ GPS thất bại');
  return data.data;
}

/**
 * Shipper: Xác thực OTP và hoàn tất đơn hàng
 * @param {number} id
 * @param {object} payload - { otp, proofImage, note }
 */
export async function shipperCompleteDelivery(id, payload) {
  const { data } = await api.post(`/shipper/deliveries/${id}/complete`, payload);
  if (!data.success) throw new Error(data.message || 'Xác nhận hoàn tất giao hàng thất bại');
  return data.data;
}

/**
 * Shipper: Báo cáo giao hàng thất bại
 * @param {number} id
 * @param {object} payload - { reason, note }
 */
export async function shipperFailDelivery(id, payload) {
  const { data } = await api.post(`/shipper/deliveries/${id}/fail`, payload);
  if (!data.success) throw new Error(data.message || 'Báo cáo thất bại không thành công');
  return data.data;
}

/**
 * Shipper: Upload ảnh bằng chứng giao hàng
 */
export async function uploadProofImage(file) {
  const formData = new FormData();
  formData.append('file', file);
  const { data } = await api.post('/shipper/deliveries/upload-proof', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  if (!data.success) throw new Error(data.message || 'Tải ảnh thất bại');
  return data.data?.url;
}

/**
 * Shipper: Cập nhật link ảnh bằng chứng cho đơn giao
 */
export async function shipperUpdateProof(id, proofImage) {
  const { data } = await api.post(`/shipper/deliveries/${id}/proof`, { proofImage });
  if (!data.success) throw new Error(data.message || 'Cập nhật ảnh bằng chứng thất bại');
  return data.data;
}

// ================= COD RECONCILIATION APIs =================

/**
 * Admin: Lấy báo cáo đối soát tiền mặt COD toàn hệ thống
 */
export async function fetchCodReconciliation() {
  const { data } = await api.get('/admin/deliveries/cod-reconciliation');
  if (!data.success) throw new Error(data.message || 'Không tải được báo cáo đối soát COD');
  return data.data;
}

/**
 * Admin: Xác nhận đã nhận nộp tiền mặt COD của 1 đơn hàng
 */
export async function settleDeliveryCod(id, note) {
  const { data } = await api.post(`/admin/deliveries/${id}/settle-cod`, { note });
  if (!data.success) throw new Error(data.message || 'Xác nhận đối soát COD thất bại');
  return data.data;
}

/**
 * Admin: Đối soát quyết toán toàn bộ COD của một shipper
 */
export async function settleShipperCod(shipperId, note) {
  const { data } = await api.post(`/admin/deliveries/shippers/${shipperId}/settle-cod`, { note });
  if (!data.success) throw new Error(data.message || 'Đối soát toàn bộ COD thất bại');
  return data.data;
}

/**
 * Shipper: Lấy tổng kết tiền COD đang thu và nộp
 */
export async function fetchShipperCodSummary() {
  const { data } = await api.get('/shipper/deliveries/cod-summary');
  if (!data.success) throw new Error(data.message || 'Không tải được tổng kết tiền COD');
  return data.data;
}

// ================= REDELIVERY & EXCEPTION WORKFLOW APIs =================

/**
 * Admin: Lên lịch và kích hoạt giao lại cho đơn hàng giao thất bại
 * @param {number} id
 * @param {object} payload - { shipperId, nextDeliverySchedule, note }
 */
export async function redeliverOrder(id, payload = {}) {
  const { data } = await api.post(`/admin/deliveries/${id}/redeliver`, payload);
  if (!data.success) throw new Error(data.message || 'Lên lịch giao lại thất bại');
  return data.data;
}

/**
 * Admin: Hoàn hàng về kho và hủy đơn hàng khi giao thất bại nhiều lần
 * @param {number} id
 * @param {object} payload - { reason, restock, note }
 */
export async function returnDeliveryToWarehouse(id, payload = {}) {
  const { data } = await api.post(`/admin/deliveries/${id}/return-to-warehouse`, payload);
  if (!data.success) throw new Error(data.message || 'Hoàn hàng về kho thất bại');
  return data.data;
}


