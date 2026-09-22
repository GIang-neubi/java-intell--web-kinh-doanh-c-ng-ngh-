import api from './client';

export async function fetchVouchers(params = {}) {
  const { data } = await api.get('/admin/vouchers', { params });
  if (!data.success) throw new Error(data.message || 'Không tải được danh sách voucher');
  return data.data; // PageResponse<VoucherDTO>
}

export async function fetchVoucherById(id) {
  const { data } = await api.get(`/admin/vouchers/${id}`);
  if (!data.success) throw new Error(data.message || 'Không tìm thấy voucher');
  return data.data;
}

export async function createVoucher(payload) {
  const { data } = await api.post('/admin/vouchers', payload);
  if (!data.success) throw new Error(data.message || 'Tạo voucher thất bại');
  return data.data;
}

export async function updateVoucher(id, payload) {
  const { data } = await api.put(`/admin/vouchers/${id}`, payload);
  if (!data.success) throw new Error(data.message || 'Cập nhật voucher thất bại');
  return data.data;
}

export async function deleteVoucher(id) {
  const { data } = await api.delete(`/admin/vouchers/${id}`);
  if (!data.success) throw new Error(data.message || 'Xóa voucher thất bại');
  return true;
}

export async function toggleVoucher(id) {
  const { data } = await api.put(`/admin/vouchers/${id}/toggle`);
  if (!data.success) throw new Error(data.message || 'Thay đổi trạng thái thất bại');
  return data.data;
}
