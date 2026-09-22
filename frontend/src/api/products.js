import api from './client';

function toFormData(payload, imageFile) {
  const formData = new FormData();
  formData.append(
    'data',
    new Blob([JSON.stringify(payload)], { type: 'application/json' })
  );
  if (imageFile) {
    formData.append('image', imageFile);
  }
  return formData;
}

export async function fetchProducts(params = {}) {
  const { data } = await api.get('/products', { params });
  if (!data.success) throw new Error(data.message || 'Không tải được sản phẩm');
  return data.data;
}

export async function fetchProductById(id) {
  const { data } = await api.get(`/products/${id}`);
  if (!data.success) throw new Error(data.message || 'Không tìm thấy sản phẩm');
  return data.data;
}

export async function createProduct(payload, imageFile) {
  const { data } = await api.post('/products', toFormData(payload, imageFile));
  if (!data.success) throw new Error(data.message || 'Tạo sản phẩm thất bại');
  return data.data;
}

export async function updateProduct(id, payload, imageFile) {
  const { data } = await api.put(`/products/${id}`, toFormData(payload, imageFile || undefined));
  if (!data.success) throw new Error(data.message || 'Cập nhật sản phẩm thất bại');
  return data.data;
}

export async function deleteProduct(id) {
  const { data } = await api.delete(`/products/${id}`);
  if (!data.success) throw new Error(data.message || 'Xóa sản phẩm thất bại');
  return data;
}
