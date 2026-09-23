import api, { getErrorMessage } from './client';

export const fetchAddresses = async () => {
  try {
    const res = await api.get('/addresses');
    return res.data.data || [];
  } catch (err) {
    throw new Error(getErrorMessage(err, 'Lỗi khi tải danh sách địa chỉ'));
  }
};

export const fetchDefaultAddress = async () => {
  try {
    const res = await api.get('/addresses/default');
    return res.data.data;
  } catch (err) {
    throw new Error(getErrorMessage(err, 'Lỗi khi tải địa chỉ mặc định'));
  }
};

export const fetchAddressById = async (id) => {
  try {
    const res = await api.get(`/addresses/${id}`);
    return res.data.data;
  } catch (err) {
    throw new Error(getErrorMessage(err, 'Lỗi khi tải thông tin địa chỉ'));
  }
};

export const createAddress = async (data) => {
  try {
    const res = await api.post('/addresses', data);
    return res.data.data;
  } catch (err) {
    throw new Error(getErrorMessage(err, 'Lỗi khi thêm địa chỉ mới'));
  }
};

export const updateAddress = async (id, data) => {
  try {
    const res = await api.put(`/addresses/${id}`, data);
    return res.data.data;
  } catch (err) {
    throw new Error(getErrorMessage(err, 'Lỗi khi cập nhật địa chỉ'));
  }
};

export const setDefaultAddress = async (id) => {
  try {
    const res = await api.put(`/addresses/${id}/default`);
    return res.data.data;
  } catch (err) {
    throw new Error(getErrorMessage(err, 'Lỗi khi thiết lập địa chỉ mặc định'));
  }
};

export const deleteAddress = async (id) => {
  try {
    const res = await api.delete(`/addresses/${id}`);
    return res.data;
  } catch (err) {
    throw new Error(getErrorMessage(err, 'Lỗi khi xóa địa chỉ'));
  }
};
