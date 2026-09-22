import api, { getErrorMessage } from './client';

export const importInventory = async (data) => {
  try {
    const res = await api.post('/admin/inventory/import', data);
    return res.data;
  } catch (err) {
    throw new Error(getErrorMessage(err, 'Lỗi khi nhập kho'));
  }
};

export const fetchInventoryLogs = async (params) => {
  try {
    const res = await api.get('/admin/inventory/logs', { params });
    return res.data.data;
  } catch (err) {
    throw new Error(getErrorMessage(err, 'Lỗi khi tải lịch sử kho'));
  }
};
