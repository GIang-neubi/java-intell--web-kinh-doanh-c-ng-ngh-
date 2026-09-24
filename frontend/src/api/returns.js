import api from './client';

export async function createReturnRequest(data) {
  const res = await api.post('/returns', data);
  if (!res.data.success) throw new Error(res.data.message || 'Lỗi tạo yêu cầu trả hàng');
  return res.data.data;
}

export async function fetchMyReturns(params = {}) {
  const res = await api.get('/returns', { params });
  if (!res.data.success) throw new Error(res.data.message || 'Lỗi tải danh sách trả hàng');
  return res.data.data;
}

export async function fetchMyReturnById(id) {
  const res = await api.get(`/returns/${id}`);
  if (!res.data.success) throw new Error(res.data.message || 'Lỗi tải chi tiết trả hàng');
  return res.data.data;
}

export async function fetchAdminReturns(params = {}) {
  const res = await api.get('/admin/returns', { params });
  if (!res.data.success) throw new Error(res.data.message || 'Lỗi tải danh sách trả hàng');
  return res.data.data;
}

export async function fetchAdminReturnById(id) {
  const res = await api.get(`/admin/returns/${id}`);
  if (!res.data.success) throw new Error(res.data.message || 'Lỗi tải chi tiết trả hàng');
  return res.data.data;
}

export async function updateReturnStatus(id, status, adminNote = '') {
  const res = await api.put(`/admin/returns/${id}/status`, null, { params: { status, adminNote } });
  if (!res.data.success) throw new Error(res.data.message || 'Cập nhật trạng thái thất bại');
  return res.data.data;
}

