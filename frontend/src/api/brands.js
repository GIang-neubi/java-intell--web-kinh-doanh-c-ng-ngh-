import api from './client';

export async function fetchBrands() {
  const { data } = await api.get('/brands');
  if (!data.success) throw new Error(data.message || 'Không tải được thương hiệu');
  return data.data || [];
}

export async function createBrand(payload) {
  const { data } = await api.post('/brands', payload);
  if (!data.success) throw new Error(data.message || 'Tạo thương hiệu thất bại');
  return data.data;
}

export async function updateBrand(id, payload) {
  const { data } = await api.put(`/brands/${id}`, payload);
  if (!data.success) throw new Error(data.message || 'Cập nhật thương hiệu thất bại');
  return data.data;
}

export async function deleteBrand(id) {
  const { data } = await api.delete(`/brands/${id}`);
  if (!data.success) throw new Error(data.message || 'Xóa thương hiệu thất bại');
  return true;
}
