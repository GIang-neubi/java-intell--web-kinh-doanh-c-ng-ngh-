import api, { getErrorMessage } from './client';

export const fetchWarehouses = async (params) => {
  try {
    const res = await api.get('/admin/warehouses', { params });
    return res.data.data;
  } catch (err) {
    throw new Error(getErrorMessage(err, 'Lỗi khi tải danh sách kho'));
  }
};

export const fetchActiveWarehouses = async () => {
  try {
    const res = await api.get('/admin/warehouses/active');
    return res.data.data;
  } catch (err) {
    throw new Error(getErrorMessage(err, 'Lỗi khi tải danh sách kho hoạt động'));
  }
};

export const fetchWarehouseDetail = async (id) => {
  try {
    const res = await api.get(`/admin/warehouses/${id}`);
    return res.data.data;
  } catch (err) {
    throw new Error(getErrorMessage(err, 'Lỗi khi tải chi tiết kho'));
  }
};

export const createWarehouse = async (data) => {
  try {
    const res = await api.post('/admin/warehouses', data);
    return res.data.data;
  } catch (err) {
    throw new Error(getErrorMessage(err, 'Lỗi khi tạo kho mới'));
  }
};

export const updateWarehouse = async (id, data) => {
  try {
    const res = await api.put(`/admin/warehouses/${id}`, data);
    return res.data.data;
  } catch (err) {
    throw new Error(getErrorMessage(err, 'Lỗi khi cập nhật kho'));
  }
};

export const updateWarehouseStatus = async (id, status) => {
  try {
    const res = await api.patch(`/admin/warehouses/${id}/status`, { status });
    return res.data.data;
  } catch (err) {
    throw new Error(getErrorMessage(err, 'Lỗi khi cập nhật trạng thái kho'));
  }
};

export const deleteWarehouse = async (id) => {
  try {
    const res = await api.delete(`/admin/warehouses/${id}`);
    return res.data;
  } catch (err) {
    throw new Error(getErrorMessage(err, 'Lỗi khi xóa kho'));
  }
};
