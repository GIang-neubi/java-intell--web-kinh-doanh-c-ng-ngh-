import api from './client';

export async function fetchMyRefunds(params = {}) {
  const res = await api.get('/refunds', { params });
  if (!res.data.success) throw new Error(res.data.message || 'Lỗi tải danh sách hoàn tiền');
  return res.data.data;
}

export async function fetchMyRefundById(id) {
  const res = await api.get(`/refunds/${id}`);
  if (!res.data.success) throw new Error(res.data.message || 'Lỗi tải chi tiết hoàn tiền');
  return res.data.data;
}

export async function fetchAdminRefunds(params = {}) {
  const res = await api.get('/admin/refunds', { params });
  if (!res.data.success) throw new Error(res.data.message || 'Lỗi tải danh sách hoàn tiền');
  return res.data.data;
}

export async function fetchAdminRefundById(id) {
  const res = await api.get(`/admin/refunds/${id}`);
  if (!res.data.success) throw new Error(res.data.message || 'Lỗi tải chi tiết hoàn tiền');
  return res.data.data;
}

export async function processRefund(id, status, transactionRef = '', adminNote = '') {
  const res = await api.put(`/admin/refunds/${id}/process`, null, { params: { status, transactionRef, adminNote } });
  if (!res.data.success) throw new Error(res.data.message || 'Xử lý hoàn tiền thất bại');
  return res.data.data;
}
