import api from './client';

/**
 * Danh sách đơn của khách — search + filter + pagination (server-side)
 * @param {object} params - { keyword, status, pageNo, pageSize }
 */
export async function fetchMyOrders(params = {}) {
  const { data } = await api.get('/orders/me/search', { params });
  if (!data.success) throw new Error(data.message || 'Không tải được đơn hàng');
  return data.data;
}

/**
 * Chi tiết đơn của khách (ownership enforced on server)
 */
export async function fetchMyOrderById(id) {
  const { data } = await api.get(`/orders/me/${id}`);
  if (!data.success) throw new Error(data.message || 'Không tìm thấy đơn hàng');
  return data.data;
}

/**
 * Lấy danh sách đơn hàng (admin) — có search + filter + pagination
 * @param {object} params - { keyword, status, pageNo, pageSize }
 */
export async function fetchAdminOrders(params = {}) {
  const { data } = await api.get('/admin/orders', { params });
  if (!data.success) throw new Error(data.message || 'Không tải được danh sách đơn hàng');
  return data.data; // PageResponse<OrderDTO>
}

/**
 * Chi tiết đơn hàng (admin)
 */
export async function fetchAdminOrderById(id) {
  const { data } = await api.get(`/orders/${id}`);
  if (!data.success) throw new Error(data.message || 'Không tìm thấy đơn hàng');
  return data.data; // OrderDTO
}

/**
 * Cập nhật trạng thái đơn hàng
 * @param {number} id
 * @param {string} status - OrderStatus enum string
 */
export async function updateOrderStatus(id, status) {
  const { data } = await api.put(`/orders/${id}/status`, null, { params: { status } });
  if (!data.success) throw new Error(data.message || 'Cập nhật trạng thái thất bại');
  return data.data; // OrderDTO
}
