import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Bell, CheckCheck, Package, Truck, CreditCard, Tag,
  Info, ChevronRight, Check
} from 'lucide-react';
import { fetchNotifications, fetchUnreadCount, markAsRead, markAllAsRead } from '../api/notifications';
import { useAuthStore } from '../store';

function formatRelativeTime(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now - d;
  const diffMin = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMin < 1) return 'Vừa xong';
  if (diffMin < 60) return `${diffMin} phút trước`;
  if (diffHours < 24) return `${diffHours} giờ trước`;
  if (diffDays < 7) return `${diffDays} ngày trước`;
  return d.toLocaleDateString('vi-VN');
}

export default function NotificationBell({ isAdmin = false }) {
  const { isAuthenticated } = useAuthStore();
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [open, setOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState('ALL'); // 'ALL' or 'UNREAD'
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  // Polling unread count
  const loadUnreadCount = async () => {
    if (!isAuthenticated) return;
    try {
      const count = await fetchUnreadCount();
      setUnreadCount(count);
    } catch (e) {
      // ignore
    }
  };

  const loadNotifications = async () => {
    if (!isAuthenticated) return;
    setLoading(true);
    try {
      const res = await fetchNotifications({ page: 0, size: 8 });
      setNotifications(res?.content || []);
    } catch (e) {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      loadUnreadCount();
      const timer = setInterval(loadUnreadCount, 30000); // 30s
      return () => clearInterval(timer);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (open) {
      loadNotifications();
    }
  }, [open]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const handleMarkAllRead = async (e) => {
    e.stopPropagation();
    try {
      await markAllAsRead();
      setUnreadCount(0);
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch (e) {
      console.warn('Lỗi đánh dấu đã đọc tất cả:', e);
    }
  };

  const handleClickItem = async (notif) => {
    if (!notif.isRead) {
      try {
        await markAsRead(notif.id);
        setUnreadCount((prev) => Math.max(0, prev - 1));
        setNotifications((prev) =>
          prev.map((n) => (n.id === notif.id ? { ...n, isRead: true } : n))
        );
      } catch (e) {
        // ignore
      }
    }
    setOpen(false);
    if (notif.targetUrl) {
      navigate(notif.targetUrl);
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'ORDER':
        return <Package size={16} />;
      case 'DELIVERY':
        return <Truck size={16} />;
      case 'PAYMENT':
        return <CreditCard size={16} />;
      case 'PROMOTION':
        return <Tag size={16} />;
      default:
        return <Info size={16} />;
    }
  };

  const getTypeBadgeStyle = (type) => {
    switch (type) {
      case 'ORDER':
        return { bg: '#eff6ff', color: '#1d4ed8' };
      case 'DELIVERY':
        return { bg: '#ecfdf5', color: '#047857' };
      case 'PAYMENT':
        return { bg: '#f0fdf4', color: '#15803d' };
      case 'PROMOTION':
        return { bg: '#fffbeb', color: '#b45309' };
      default:
        return { bg: '#f5f3ff', color: '#6d28d9' };
    }
  };

  if (!isAuthenticated) return null;

  const filteredNotifs = activeFilter === 'UNREAD'
    ? notifications.filter((n) => !n.isRead)
    : notifications;

  return (
    <div ref={dropdownRef} style={{ position: 'relative' }}>
      {/* Bell Action Button */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={isAdmin ? 'hg-admin-header-btn' : 'hg-action-btn'}
        aria-label="Thông báo"
        aria-expanded={open}
        style={isAdmin ? { position: 'relative' } : {
          position: 'relative',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '8px',
          borderRadius: '50%',
          color: 'var(--text-primary)',
          transition: 'background 0.15s',
        }}
      >
        <Bell size={20} strokeWidth={1.75} />
        {unreadCount > 0 && (
          <span
            className={isAdmin ? 'hg-admin-badge' : undefined}
            style={!isAdmin ? {
              position: 'absolute',
              top: 2,
              right: 2,
              minWidth: 18,
              height: 18,
              padding: '0 4px',
              borderRadius: '999px',
              background: '#ef4444',
              color: '#ffffff',
              fontSize: '11px',
              fontWeight: 800,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 0 2px #ffffff',
              lineHeight: 1,
            } : undefined}
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Popover Dropdown */}
      {open && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            right: 0,
            width: 360,
            maxWidth: '92vw',
            background: 'var(--bg-card)',
            borderRadius: '16px',
            border: '1px solid var(--border)',
            boxShadow: '0 12px 36px rgba(0, 0, 0, 0.15)',
            zIndex: 1000,
            overflow: 'hidden',
            animation: 'dropdownFadeIn 0.15s ease-out',
          }}
        >
          {/* Header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '14px 16px',
              borderBottom: '1px solid var(--border)',
              background: 'var(--bg-card)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-primary)' }}>
                Thông báo
              </span>
              {unreadCount > 0 && (
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 800,
                    padding: '2px 7px',
                    borderRadius: '999px',
                    background: '#fee2e2',
                    color: '#b91c1c',
                  }}
                >
                  {unreadCount} mới
                </span>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '12px',
                  fontWeight: 700,
                  color: 'var(--primary)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  padding: 0,
                }}
              >
                <CheckCheck size={14} />
                <span>Đã đọc tất cả</span>
              </button>
            )}
          </div>

          {/* Filter tabs */}
          <div
            style={{
              display: 'flex',
              gap: 8,
              padding: '8px 16px',
              background: 'var(--bg)',
              borderBottom: '1px solid var(--border)',
            }}
          >
            <button
              type="button"
              onClick={() => setActiveFilter('ALL')}
              style={{
                background: activeFilter === 'ALL' ? '#ffffff' : 'transparent',
                border: activeFilter === 'ALL' ? '1px solid var(--border)' : '1px solid transparent',
                padding: '4px 10px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: activeFilter === 'ALL' ? 800 : 600,
                color: activeFilter === 'ALL' ? 'var(--text-primary)' : 'var(--text-muted)',
                cursor: 'pointer',
              }}
            >
              Tất cả
            </button>
            <button
              type="button"
              onClick={() => setActiveFilter('UNREAD')}
              style={{
                background: activeFilter === 'UNREAD' ? '#ffffff' : 'transparent',
                border: activeFilter === 'UNREAD' ? '1px solid var(--border)' : '1px solid transparent',
                padding: '4px 10px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: activeFilter === 'UNREAD' ? 800 : 600,
                color: activeFilter === 'UNREAD' ? 'var(--text-primary)' : 'var(--text-muted)',
                cursor: 'pointer',
              }}
            >
              Chưa đọc {unreadCount > 0 ? `(${unreadCount})` : ''}
            </button>
          </div>

          {/* Notification Items List */}
          <div style={{ maxHeight: 380, overflowY: 'auto' }}>
            {loading ? (
              <div style={{ textAlign: 'center', padding: '30px 0' }}>
                <div className="spinner" style={{ width: 20, height: 20, margin: '0 auto 8px' }} />
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Đang tải thông báo...</div>
              </div>
            ) : filteredNotifs.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '36px 16px' }}>
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: '50%',
                    background: '#f1f5f9',
                    color: 'var(--text-muted)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 10px',
                  }}
                >
                  <Bell size={22} />
                </div>
                <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 2 }}>
                  {activeFilter === 'UNREAD' ? 'Không có thông báo chưa đọc' : 'Chưa có thông báo nào'}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  Hệ thống sẽ cập nhật trạng thái đơn hàng và ưu đãi tại đây
                </div>
              </div>
            ) : (
              filteredNotifs.map((notif) => {
                const style = getTypeBadgeStyle(notif.type);
                return (
                  <div
                    key={notif.id}
                    onClick={() => handleClickItem(notif)}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 12,
                      padding: '12px 16px',
                      background: notif.isRead ? '#ffffff' : '#f0f7ff',
                      borderBottom: '1px solid #f1f5f9',
                      cursor: 'pointer',
                      transition: 'background 0.15s',
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.background = notif.isRead ? '#f8fafc' : '#e5f0fe';
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.background = notif.isRead ? '#ffffff' : '#f0f7ff';
                    }}
                  >
                    {/* Icon */}
                    <div
                      style={{
                        width: 34,
                        height: 34,
                        borderRadius: '8px',
                        background: style.bg,
                        color: style.color,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        marginTop: 2,
                      }}
                    >
                      {getTypeIcon(notif.type)}
                    </div>

                    {/* Content */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                        <span
                          style={{
                            fontSize: '13px',
                            fontWeight: notif.isRead ? 700 : 800,
                            color: notif.isRead ? 'var(--text-primary)' : '#0f172a',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {notif.title}
                        </span>
                        {!notif.isRead && (
                          <span
                            style={{
                              width: 8,
                              height: 8,
                              borderRadius: '50%',
                              background: '#2563eb',
                              flexShrink: 0,
                            }}
                          />
                        )}
                      </div>

                      <div
                        style={{
                          fontSize: '12px',
                          color: 'var(--text-secondary)',
                          lineHeight: 1.4,
                          marginTop: 2,
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                        }}
                      >
                        {notif.message}
                      </div>

                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: 4 }}>
                        {formatRelativeTime(notif.createdAt)}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          <Link
            to={isAdmin ? '/admin/deliveries' : '/account/notifications'}
            onClick={() => setOpen(false)}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              padding: '12px 16px',
              borderTop: '1px solid var(--border)',
              background: 'var(--bg)',
              color: 'var(--primary)',
              fontWeight: 800,
              fontSize: '12px',
              textDecoration: 'none',
              transition: 'background 0.15s',
            }}
            onMouseOver={(e) => (e.currentTarget.style.background = '#eff6ff')}
            onMouseOut={(e) => (e.currentTarget.style.background = '#f8fafc')}
          >
            <span>Xem tất cả thông báo</span>
            <ChevronRight size={14} />
          </Link>
        </div>
      )}
    </div>
  );
}
