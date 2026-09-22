import { useEffect, useState, useRef, useCallback } from 'react';
import {
  MessageSquare, Search, Send, User, ShieldCheck, Clock, CheckCircle2,
  Trash2, RefreshCw, AlertCircle, Bot, UserCheck, Inbox, CornerDownLeft
} from 'lucide-react';
import {
  fetchAdminConversations,
  fetchAdminConversationMessages,
  sendAdminReply,
  deleteAdminConversation
} from '../../../api/chat';
import { useAuthStore } from '../../../store';
import { useToast } from '../../../components/Toast';

const CANNED_RESPONSES = [
  'Dạ chào bạn! H&G có thể hỗ trợ gì cho bạn hôm nay ạ?',
  'Sản phẩm này hiện đang có sẵn tại cửa hàng bạn nhé!',
  'Bạn vui lòng cung cấp mã đơn hàng để shop kiểm tra tình trạng giúp bạn nhé!',
  'Dạ shop sẽ chuẩn bị đơn và gửi sớm nhất cho bạn ạ!',
  'Bạn cần thêm thông tin gì về bảo hành hay kỹ thuật không ạ?'
];

export default function AdminChat() {
  const { user: currentAdmin } = useAuthStore();
  const { showToast } = useToast();

  const [conversations, setConversations] = useState([]);
  const [selectedConvId, setSelectedConvId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all'); // 'all' | 'unread'
  const [isLoadingList, setIsLoadingList] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const scrollToBottom = useCallback((smooth = true) => {
    messagesEndRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto', block: 'end' });
  }, []);

  // Tải danh sách hội thoại
  const loadConversations = useCallback(async (silent = false) => {
    if (!silent) setIsLoadingList(true);
    try {
      const data = await fetchAdminConversations();
      setConversations(data);
      // Nếu chưa chọn hội thoại nào và có danh sách, tự chọn cuộc đầu tiên
      if (!selectedConvId && data.length > 0) {
        setSelectedConvId(data[0].id);
      }
    } catch (err) {
      console.error('Lỗi khi tải danh sách hội thoại:', err);
    } finally {
      if (!silent) setIsLoadingList(false);
    }
  }, [selectedConvId]);

  // Tải tin nhắn của cuộc hội thoại đang chọn
  const loadMessages = useCallback(async (convId, silent = false) => {
    if (!convId) return;
    if (!silent) setIsLoadingMessages(true);
    try {
      const msgs = await fetchAdminConversationMessages(convId);
      setMessages(msgs);
      // Cập nhật lại unreadAdmin cho hội thoại này trong danh sách local
      setConversations(prev =>
        prev.map(c => c.id === convId ? { ...c, unreadAdmin: 0 } : c)
      );
    } catch (err) {
      console.error('Lỗi khi tải tin nhắn:', err);
    } finally {
      if (!silent) setIsLoadingMessages(false);
    }
  }, []);

  // Lần đầu tải danh sách
  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  // Khi chọn hội thoại khác
  useEffect(() => {
    if (selectedConvId) {
      loadMessages(selectedConvId);
      setTimeout(() => {
        scrollToBottom(false);
        inputRef.current?.focus();
      }, 100);
    }
  }, [selectedConvId, loadMessages, scrollToBottom]);

  // Polling tự động mỗi 3.5 giây để cập nhật tin nhắn và danh sách
  useEffect(() => {
    const timer = setInterval(() => {
      loadConversations(true);
      if (selectedConvId) {
        loadMessages(selectedConvId, true);
      }
    }, 3500);

    return () => clearInterval(timer);
  }, [loadConversations, loadMessages, selectedConvId]);

  // Tự động scroll khi có thêm tin nhắn
  useEffect(() => {
    scrollToBottom(true);
  }, [messages.length, scrollToBottom]);

  const handleSend = async (e) => {
    if (e) e.preventDefault();
    const content = inputText.trim();
    if (!content || !selectedConvId || isSending) return;

    setIsSending(true);
    try {
      const newMsg = await sendAdminReply(selectedConvId, content);
      setMessages(prev => [...prev, newMsg]);
      setInputText('');

      // Cập nhật danh sách local
      setConversations(prev =>
        prev.map(c => c.id === selectedConvId ? {
          ...c,
          lastMessage: content,
          lastMessageAt: new Date().toISOString()
        } : c)
      );
      setTimeout(() => scrollToBottom(true), 50);
    } catch (err) {
      console.error('Lỗi khi gửi phản hồi:', err);
      showToast('Không thể gửi phản hồi. Vui lòng thử lại!', 'error');
    } finally {
      setIsSending(false);
    }
  };

  const handleDelete = async (convId) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa toàn bộ cuộc trò chuyện này?')) return;
    try {
      await deleteAdminConversation(convId);
      showToast('Đã xóa cuộc trò chuyện', 'success');
      const updated = conversations.filter(c => c.id !== convId);
      setConversations(updated);
      if (selectedConvId === convId) {
        setSelectedConvId(updated.length > 0 ? updated[0].id : null);
        setMessages([]);
      }
    } catch (err) {
      showToast('Không thể xóa cuộc trò chuyện', 'error');
    }
  };

  const handleCannedResponse = (text) => {
    setInputText(text);
    inputRef.current?.focus();
  };

  const selectedConv = conversations.find(c => c.id === selectedConvId);

  // Lọc hội thoại theo từ khóa và trạng thái
  const filteredConversations = conversations.filter(c => {
    const matchSearch =
      (c.customerName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.customerEmail || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.lastMessage || '').toLowerCase().includes(searchQuery.toLowerCase());
    if (filterType === 'unread') {
      return matchSearch && c.unreadAdmin > 0;
    }
    return matchSearch;
  });

  const totalUnread = conversations.reduce((sum, c) => sum + (c.unreadAdmin || 0), 0);

  const formatMsgTime = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) + ' - ' +
           date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
  };

  return (
    <div className="hg-admin-chat-page">
      {/* ── Page Header ── */}
      <div className="hg-admin-chat-header-bar">
        <div>
          <h1 className="hg-admin-chat-title">Trung tâm Tin nhắn & Live Chat</h1>
          <p className="hg-admin-chat-subtitle">
            Hỗ trợ và phản hồi tin nhắn của khách hàng theo thời gian thực
          </p>
        </div>
        <div className="hg-admin-chat-actions">
          {totalUnread > 0 && (
            <span className="hg-chat-unread-pill">
              {totalUnread} tin nhắn mới chưa đọc
            </span>
          )}
          <button
            type="button"
            className="hg-btn hg-btn-outline"
            onClick={() => {
              loadConversations();
              if (selectedConvId) loadMessages(selectedConvId);
            }}
            title="Làm mới dữ liệu"
          >
            <RefreshCw size={15} />
            <span>Làm mới</span>
          </button>
        </div>
      </div>

      {/* ── Main Chat Workspace ── */}
      <div className="hg-admin-chat-workspace">
        {/* ── Left Column: Conversation List ── */}
        <aside className="hg-admin-chat-sidebar">
          {/* Search & Filter */}
          <div className="hg-chat-sidebar-search">
            <div className="hg-chat-search-input-wrap">
              <Search size={16} className="hg-chat-search-icon" />
              <input
                type="text"
                placeholder="Tìm khách hàng hoặc tin nhắn..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button
                  type="button"
                  className="hg-chat-search-clear"
                  onClick={() => setSearchQuery('')}
                >
                  ✕
                </button>
              )}
            </div>
            <div className="hg-chat-filter-tabs">
              <button
                type="button"
                className={`hg-chat-filter-btn ${filterType === 'all' ? 'active' : ''}`}
                onClick={() => setFilterType('all')}
              >
                Tất cả ({conversations.length})
              </button>
              <button
                type="button"
                className={`hg-chat-filter-btn ${filterType === 'unread' ? 'active' : ''}`}
                onClick={() => setFilterType('unread')}
              >
                Chưa đọc ({totalUnread})
              </button>
            </div>
          </div>

          {/* List items */}
          <div className="hg-chat-conv-list">
            {isLoadingList && conversations.length === 0 ? (
              <div className="hg-chat-empty-list">Đang tải cuộc trò chuyện...</div>
            ) : filteredConversations.length === 0 ? (
              <div className="hg-chat-empty-list">
                <Inbox size={32} style={{ opacity: 0.3, marginBottom: 8 }} />
                <span>Không tìm thấy cuộc trò chuyện nào</span>
              </div>
            ) : (
              filteredConversations.map((conv) => {
                const isSelected = conv.id === selectedConvId;
                const isMember = conv.userId != null;
                const hasUnread = conv.unreadAdmin > 0;

                return (
                  <div
                    key={conv.id}
                    className={`hg-chat-conv-item ${isSelected ? 'active' : ''} ${hasUnread ? 'has-unread' : ''}`}
                    onClick={() => setSelectedConvId(conv.id)}
                  >
                    <div className="hg-chat-conv-avatar-wrap">
                      <div className={`hg-chat-conv-avatar ${isMember ? 'member' : 'guest'}`}>
                        {isMember ? <User size={18} /> : <UserCheck size={18} />}
                      </div>
                      {hasUnread && <span className="hg-chat-conv-unread-dot" />}
                    </div>

                    <div className="hg-chat-conv-details">
                      <div className="hg-chat-conv-top">
                        <span className="hg-chat-conv-name">{conv.customerName}</span>
                        {conv.lastMessageAt && (
                          <span className="hg-chat-conv-time">
                            {new Date(conv.lastMessageAt).toLocaleTimeString('vi-VN', {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        )}
                      </div>

                      <div className="hg-chat-conv-meta">
                        <span className={`hg-chat-tag ${isMember ? 'tag-member' : 'tag-guest'}`}>
                          {isMember ? 'Thành viên' : 'Khách vãng lai'}
                        </span>
                        {conv.customerEmail && (
                          <span className="hg-chat-conv-email" title={conv.customerEmail}>
                            {conv.customerEmail}
                          </span>
                        )}
                      </div>

                      <div className="hg-chat-conv-bottom">
                        <p className={`hg-chat-conv-snippet ${hasUnread ? 'unread-text' : ''}`}>
                          {conv.lastMessage || 'Bắt đầu cuộc trò chuyện...'}
                        </p>
                        {hasUnread && (
                          <span className="hg-chat-unread-badge">
                            {conv.unreadAdmin}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </aside>

        {/* ── Right Column: Active Conversation Messages ── */}
        <main className="hg-admin-chat-main">
          {selectedConv ? (
            <>
              {/* Active Conversation Top Bar */}
              <div className="hg-chat-main-header">
                <div className="hg-chat-main-user-info">
                  <div className={`hg-chat-main-avatar ${selectedConv.userId ? 'member' : 'guest'}`}>
                    <User size={20} />
                  </div>
                  <div>
                    <div className="hg-chat-main-name-row">
                      <strong className="hg-chat-main-name">{selectedConv.customerName}</strong>
                      <span className={`hg-chat-tag ${selectedConv.userId ? 'tag-member' : 'tag-guest'}`}>
                        {selectedConv.userId ? 'Tài khoản thành viên' : 'Khách vãng lai'}
                      </span>
                    </div>
                    <div className="hg-chat-main-subtext">
                      {selectedConv.customerEmail ? (
                        <span>Email: {selectedConv.customerEmail}</span>
                      ) : (
                        <span>Mã phiên: {selectedConv.id}</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="hg-chat-main-header-actions">
                  <button
                    type="button"
                    className="hg-btn-delete-conv"
                    onClick={() => handleDelete(selectedConv.id)}
                    title="Xóa cuộc trò chuyện này"
                  >
                    <Trash2 size={16} />
                    <span>Xóa</span>
                  </button>
                </div>
              </div>

              {/* Message List */}
              <div className="hg-chat-main-messages">
                {isLoadingMessages ? (
                  <div className="hg-chat-messages-loading">Đang tải tin nhắn...</div>
                ) : messages.length === 0 ? (
                  <div className="hg-chat-messages-empty">
                    <MessageSquare size={40} style={{ opacity: 0.25, marginBottom: 12 }} />
                    <p>Chưa có tin nhắn nào trong cuộc trò chuyện này.</p>
                  </div>
                ) : (
                  messages.map((msg, index) => {
                    const isAdmin = msg.senderRole === 'ADMIN';

                    return (
                      <div
                        key={msg.id || index}
                        className={`hg-admin-msg-row ${isAdmin ? 'admin' : 'customer'}`}
                      >
                        {!isAdmin && (
                          <div className="hg-admin-msg-avatar customer">
                            <User size={15} />
                          </div>
                        )}

                        <div className="hg-admin-msg-bubble-wrap">
                          <div className="hg-admin-msg-sender-name">
                            {isAdmin ? 'Bạn (Admin H&G)' : msg.senderName || selectedConv.customerName}
                          </div>
                          <div className={`hg-admin-msg-bubble ${isAdmin ? 'admin' : 'customer'}`}>
                            <p>{msg.content}</p>
                          </div>
                          <span className="hg-admin-msg-time">
                            {formatMsgTime(msg.createdAt)}
                          </span>
                        </div>

                        {isAdmin && (
                          <div className="hg-admin-msg-avatar admin">
                            <ShieldCheck size={15} />
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Canned Quick Replies */}
              <div className="hg-chat-canned-bar">
                <span className="hg-chat-canned-title">Phản hồi nhanh:</span>
                <div className="hg-chat-canned-list">
                  {CANNED_RESPONSES.map((resp, i) => (
                    <button
                      key={i}
                      type="button"
                      className="hg-chat-canned-chip"
                      onClick={() => handleCannedResponse(resp)}
                    >
                      {resp}
                    </button>
                  ))}
                </div>
              </div>

              {/* Message Input Box */}
              <form className="hg-chat-input-form" onSubmit={handleSend}>
                <div className="hg-chat-input-row">
                  <input
                    ref={inputRef}
                    type="text"
                    className="hg-chat-main-input"
                    placeholder={`Trả lời ${selectedConv.customerName}... (Nhấn Enter để gửi)`}
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    disabled={isSending}
                    autoComplete="off"
                  />
                  <button
                    type="submit"
                    className="hg-chat-send-action-btn"
                    disabled={isSending || !inputText.trim()}
                    title="Gửi tin nhắn"
                  >
                    <Send size={16} />
                    <span>Gửi</span>
                  </button>
                </div>
              </form>
            </>
          ) : (
            <div className="hg-chat-no-selection">
              <MessageSquare size={56} style={{ opacity: 0.2, marginBottom: 16 }} />
              <h3>Chọn một cuộc trò chuyện để bắt đầu</h3>
              <p>Chọn từ danh sách bên trái để xem nội dung trao đổi và trả lời khách hàng</p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
