import api from './client';

export async function fetchCategories() {
  const { data } = await api.get('/categories');
  if (!data.success) throw new Error(data.message || 'Không tải được danh mục');
  return data.data || [];
}

export async function fetchCategoryById(id) {
  const { data } = await api.get(`/categories/${id}`);
  if (!data.success) throw new Error(data.message || 'Không tìm thấy danh mục');
  return data.data;
}

export async function createCategory(payload) {
  const { data } = await api.post('/categories', payload);
  if (!data.success) throw new Error(data.message || 'Tạo danh mục thất bại');
  return data.data;
}

export async function updateCategory(id, payload) {
  const { data } = await api.put(`/categories/${id}`, payload);
  if (!data.success) throw new Error(data.message || 'Cập nhật danh mục thất bại');
  return data.data;
}

export async function deleteCategory(id) {
  const { data } = await api.delete(`/categories/${id}`);
  if (!data.success) throw new Error(data.message || 'Xóa danh mục thất bại');
  return true;
}
