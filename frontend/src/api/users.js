
import api from './client';

/**
 * Lấy danh sách user (admin only)
 * @param {object} params - { keyword, role, pageNo, pageSize }
 */
export async function fetchAdminUsers(params = {}) {
  const { data } = await api.get('/admin/users', { params });
  if (!data.success) throw new Error(data.message || 'Không tải được danh sách người dùng');
  return data.data; // PageResponse<AdminUserDTO>
}

/**
 * Chi tiết 1 user
 */
export async function fetchAdminUserById(id) {
  const { data } = await api.get(`/admin/users/${id}`);
  if (!data.success) throw new Error(data.message || 'Không tìm thấy người dùng');
  return data.data;
}

/**
 * Toggle khóa / mở khóa tài khoản
 */
export async function toggleUserStatus(id) {
  const { data } = await api.put(`/admin/users/${id}/status`);
  if (!data.success) throw new Error(data.message || 'Không thể thay đổi trạng thái');
  return data.data; // AdminUserDTO
}

/**
 * Thay đổi role (ROLE_USER | ROLE_ADMIN)
 */
export async function updateUserRole(id, role) {
  const { data } = await api.put(`/admin/users/${id}/role`, null, { params: { role } });
  if (!data.success) throw new Error(data.message || 'Không thể thay đổi quyền');
  return data.data;
}
