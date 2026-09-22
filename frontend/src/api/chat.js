import api from './client';

/**
 * Gửi tin nhắn từ phía khách hàng
 */
export async function sendCustomerMessage({ conversationId, content, customerName, customerEmail }) {
  const response = await api.post('/chat/send', {
    conversationId,
    content,
    customerName,
    customerEmail,
  });
  return response.data?.data;
}

/**
 * Lấy lịch sử tin nhắn của cuộc trò chuyện (khách hàng)
 */
export async function fetchCustomerMessages(conversationId) {
  const response = await api.get('/chat/messages', {
    params: { conversationId },
  });
  return response.data?.data || [];
}

/**
 * Lấy danh sách cuộc trò chuyện (Admin)
 */
export async function fetchAdminConversations() {
  const response = await api.get('/admin/chat/conversations');
  return response.data?.data || [];
}

/**
 * Lấy lịch sử tin nhắn của 1 cuộc hội thoại (Admin)
 */
export async function fetchAdminConversationMessages(conversationId) {
  const response = await api.get(`/admin/chat/conversations/${conversationId}/messages`);
  return response.data?.data || [];
}

/**
 * Admin gửi tin nhắn trả lời khách hàng
 */
export async function sendAdminReply(conversationId, content) {
  const response = await api.post(`/admin/chat/conversations/${conversationId}/reply`, {
    content,
  });
  return response.data?.data;
}

/**
 * Lấy số tin nhắn chưa đọc của Admin
 */
export async function fetchAdminUnreadCount() {
  const response = await api.get('/admin/chat/unread-count');
  return response.data?.data?.unreadCount || 0;
}

/**
 * Admin xóa cuộc hội thoại
 */
export async function deleteAdminConversation(conversationId) {
  const response = await api.delete(`/admin/chat/conversations/${conversationId}`);
  return response.data;
}
