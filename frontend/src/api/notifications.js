import api, { getErrorMessage } from './client';

export const fetchNotifications = async (params = {}) => {
  try {
    const res = await api.get('/notifications', { params });
    return res.data.data;
  } catch (err) {
    throw new Error(getErrorMessage(err, 'Lỗi khi tải thông báo'));
  }
};

export const fetchUnreadCount = async () => {
  try {
    const res = await api.get('/notifications/unread-count');
    return res.data.data?.unreadCount || 0;
  } catch (err) {
    console.warn('Lỗi tải số thông báo chưa đọc:', err);
    return 0;
  }
};

export const markAsRead = async (id) => {
  try {
    const res = await api.put(`/notifications/${id}/read`);
    return res.data.data;
  } catch (err) {
    throw new Error(getErrorMessage(err, 'Lỗi khi cập nhật thông báo'));
  }
};

export const markAllAsRead = async () => {
  try {
    const res = await api.put('/notifications/read-all');
    return res.data;
  } catch (err) {
    throw new Error(getErrorMessage(err, 'Lỗi khi đánh dấu đã đọc'));
  }
};

export const deleteNotification = async (id) => {
  try {
    const res = await api.delete(`/notifications/${id}`);
    return res.data;
  } catch (err) {
    throw new Error(getErrorMessage(err, 'Lỗi khi xóa thông báo'));
  }
};

export const broadcastNotification = async (data) => {
  try {
    const res = await api.post('/notifications/broadcast', data);
    return res.data;
  } catch (err) {
    throw new Error(getErrorMessage(err, 'Lỗi khi phát thông báo'));
  }
};
