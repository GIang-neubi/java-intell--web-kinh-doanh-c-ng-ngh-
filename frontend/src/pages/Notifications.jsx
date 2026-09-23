import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell, CheckCheck, Trash2, CheckCircle2, ExternalLink,
  Package, Truck, CreditCard, Tag, Info, Filter, RotateCcw, Check
} from 'lucide-react';
import AccountLayout from '../layouts/AccountLayout';
import {
  fetchNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification
} from '../api/notifications';
import { useToast } from '../components/Toast';

function formatFullDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
}

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
  return formatFullDate(dateStr);
}

export default function Notifications() {
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [onlyUnread, setOnlyUnread] = useState(false);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(0);

  const loadData = async (currentPage = page, currentType = typeFilter) => {
    setLoading(true);
    try {
      const res = await fetchNotifications({
        page: currentPage,
        size: 10,
        type: currentType !== 'ALL' ? currentType : undefined
      });
      setNotifications(res?.content || []);
      setTotalPages(res?.totalPages || 1);
      setTotalElements(res?.totalElements || 0);
    } catch (err) {
      showToast(err.message || 'Không thể tải thông báo', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData(page, typeFilter);
  }, [page, typeFilter]);

  const handleTypeChange = (newType) => {
    setTypeFilter(newType);
    setPage(0);
  };

  const handleMarkRead = async (notif) => {
    if (notif.isRead) return;
    try {
      await markAsRead(notif.id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === notif.id ? { ...n, isRead: true } : n))
      );
      showToast('Đã đánh dấu đã đọc', 'success');
    } catch (err) {
      showToast(err.message || 'Lỗi khi cập nhật', 'error');
    }
  };

  const handleMarkAll = async () => {
    try {
      await markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      showToast('Đã đánh dấu tất cả thông báo là đã đọc', 'success');
    } catch (err) {
      showToast(err.message || 'Lỗi khi cập nhật', 'error');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa thông báo này?')) return;
    try {
      await deleteNotification(id);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      showToast('Đã xóa thông báo thành công', 'success');
    } catch (err) {
      showToast(err.message || 'Lỗi khi xóa', 'error');
    }
  };

  const handleItemClick = (notif) => {
    if (!notif.isRead) {
      markAsRead(notif.id).catch(() => {});
      setNotifications((prev) =>
        prev.map((n) => (n.id === notif.id ? { ...n, isRead: true } : n))
      );
    }
    if (notif.targetUrl) {
      navigate(notif.targetUrl);
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'ORDER':
        return <Package size={20} />;
      case 'DELIVERY':
        return <Truck size={20} />;
      case 'PAYMENT':
        return <CreditCard size={20} />;
      case 'PROMOTION':
        return <Tag size={20} />;
      default:
        return <Info size={20} />;
    }
  };

  const getTypeStyle = (type) => {
    switch (type) {
      case 'ORDER':
        return { bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe', label: 'Đơn hàng' };
      case 'DELIVERY':
        return { bg: '#ecfdf5', color: '#047857', border: '#a7f3d0', label: 'Vận chuyển' };
      case 'PAYMENT':
        return { bg: '#f0fdf4', color: '#15803d', border: '#bbf7d0', label: 'Thanh toán' };
      case 'PROMOTION':
        return { bg: '#fffbeb', color: '#b45309', border: '#fde68a', label: 'Khuyến mãi' };
      default:
        return { bg: '#f5f3ff', color: '#6d28d9', border: '#ddd6fe', label: 'Hệ thống' };
    }
  };

  const displayedList = onlyUnread
    ? notifications.filter((n) => !n.isRead)
    : notifications;

  return (
    <AccountLayout activeTab="notifications">
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 12,
        marginBottom: '20px',
        paddingBottom: '16px',
        borderBottom: '1px solid var(--border)'
      }}>
        <div>
          <h1 style={{
            fontSize: '22px',
            fontWeight: 900,
            letterSpacing: '-0.02em',
            color: 'var(--text-primary)',
            margin: 0,
            display: 'flex',
            alignItems: 'center',
            gap: 8
          }}>
            <Bell size={24} style={{ color: 'var(--primary)' }} />
            <span>Trung Tâm Thông Báo</span>
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 13, margin: '4px 0 0' }}>
            Theo dõi tiến trình đơn hàng, cập nhật giao vận trực tiếp và tin tức khuyến mãi H&G Store
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            type="button"
            onClick={() => loadData(page, typeFilter)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 14px',
              borderRadius: '10px',
              background: '#f8fafc',
              border: '1px solid var(--border)',
              color: 'var(--text-secondary)',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer'
            }}
            title="Tải lại thông báo"
          >
            <RotateCcw size={14} />
            <span>Làm mới</span>
          </button>

          <button
            type="button"
            onClick={handleMarkAll}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 14px',
              borderRadius: '10px',
              background: '#eff6ff',
              border: '1px solid #bfdbfe',
              color: 'var(--primary)',
              fontSize: '12px',
              fontWeight: 800,
              cursor: 'pointer'
            }}
          >
            <CheckCheck size={15} />
            <span>Đã đọc tất cả</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 12,
        marginBottom: '20px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          {[
            { key: 'ALL', label: 'Tất cả' },
            { key: 'ORDER', label: 'Đơn hàng' },
            { key: 'DELIVERY', label: 'Vận chuyển' },
            { key: 'PAYMENT', label: 'Thanh toán' },
            { key: 'PROMOTION', label: 'Khuyến mãi' },
            { key: 'SYSTEM', label: 'Hệ thống' },
          ].map(({ key, label }) => {
            const isSelected = typeFilter === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => handleTypeChange(key)}
                style={{
                  padding: '7px 14px',
                  borderRadius: '999px',
                  border: isSelected ? '1px solid var(--primary)' : '1px solid var(--border)',
                  background: isSelected ? 'var(--primary)' : '#ffffff',
                  color: isSelected ? '#ffffff' : 'var(--text-secondary)',
                  fontSize: '12px',
                  fontWeight: isSelected ? 800 : 600,
                  cursor: 'pointer',
                  transition: 'all 0.15s'
                }}
              >
                {label}
              </button>
            );
          })}
        </div>

        {/* Unread toggle */}
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={onlyUnread}
            onChange={(e) => setOnlyUnread(e.target.checked)}
            style={{ accentColor: 'var(--primary)', cursor: 'pointer' }}
          />
          <span>Chỉ xem chưa đọc</span>
        </label>
      </div>

      {/* List */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
          <div className="spinner" style={{ margin: '0 auto 12px' }} />
          <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Đang tải thông báo...</div>
        </div>
      ) : displayedList.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '60px 20px',
          background: '#ffffff',
          borderRadius: '16px',
          border: '1px dashed var(--border)'
        }}>
          <div style={{
            width: 52,
            height: 52,
            borderRadius: '50%',
            background: '#eff6ff',
            color: 'var(--primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 12px'
          }}>
            <Bell size={26} />
          </div>
          <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 4 }}>
            Không có thông báo nào
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
            {onlyUnread
              ? 'Tuyệt vời! Bạn không còn thông báo chưa đọc nào.'
              : 'Bạn chưa nhận được thông báo nào trong danh mục này.'}
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {displayedList.map((notif) => {
            const typeInfo = getTypeStyle(notif.type);
            return (
              <div
                key={notif.id}
                style={{
                  background: notif.isRead ? '#ffffff' : '#f8faff',
                  border: notif.isRead ? '1px solid var(--border)' : '1px solid #bfdbfe',
                  borderRadius: '16px',
                  padding: '18px 20px',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 16,
                  boxShadow: notif.isRead ? 'none' : '0 2px 10px rgba(59, 130, 246, 0.06)',
                  transition: 'all 0.15s'
                }}
              >
                {/* Type Icon */}
                <div style={{
                  width: 44,
                  height: 44,
                  borderRadius: '12px',
                  background: typeInfo.bg,
                  color: typeInfo.color,
                  border: `1px solid ${typeInfo.border}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  {getTypeIcon(notif.type)}
                </div>

                {/* Content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, marginBottom: 4 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{
                        fontSize: '11px',
                        fontWeight: 800,
                        padding: '2px 8px',
                        borderRadius: '6px',
                        background: typeInfo.bg,
                        color: typeInfo.color,
                        border: `1px solid ${typeInfo.border}`
                      }}>
                        {typeInfo.label}
                      </span>
                      <strong style={{ fontSize: '14px', color: notif.isRead ? 'var(--text-primary)' : '#0f172a' }}>
                        {notif.title}
                      </strong>
                      {!notif.isRead && (
                        <span style={{
                          fontSize: '10px',
                          fontWeight: 800,
                          background: '#ef4444',
                          color: '#fff',
                          padding: '1px 6px',
                          borderRadius: '999px'
                        }}>
                          MỚI
                        </span>
                      )}
                    </div>

                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                      {formatRelativeTime(notif.createdAt)}
                    </span>
                  </div>

                  <div style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: 12 }}>
                    {notif.message}
                  </div>

                  {/* Actions row */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, paddingTop: 10, borderTop: '1px solid #f1f5f9' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      {notif.targetUrl && (
                        <button
                          type="button"
                          onClick={() => handleItemClick(notif)}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                            background: 'none',
                            border: 'none',
                            color: 'var(--primary)',
                            fontSize: '12px',
                            fontWeight: 800,
                            cursor: 'pointer',
                            padding: 0
                          }}
                        >
                          <span>Xem chi tiết</span>
                          <ExternalLink size={13} />
                        </button>
                      )}

                      {!notif.isRead && (
                        <button
                          type="button"
                          onClick={() => handleMarkRead(notif)}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                            background: 'none',
                            border: 'none',
                            color: '#166534',
                            fontSize: '12px',
                            fontWeight: 700,
                            cursor: 'pointer',
                            padding: 0
                          }}
                        >
                          <Check size={13} />
                          <span>Đánh dấu đã đọc</span>
                        </button>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDelete(notif.id)}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                        background: 'none',
                        border: 'none',
                        color: 'var(--text-muted)',
                        fontSize: '12px',
                        cursor: 'pointer',
                        padding: 0
                      }}
                      title="Xóa thông báo"
                      onMouseOver={(e) => (e.currentTarget.style.color = '#ef4444')}
                      onMouseOut={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
                    >
                      <Trash2 size={13} />
                      <span>Xóa</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginTop: '24px' }}>
          <button
            type="button"
            className="btn btn-outline"
            disabled={page === 0}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            style={{ padding: '6px 14px', fontSize: '12px' }}
          >
            Trang trước
          </button>
          <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            Trang <strong>{page + 1}</strong> / {totalPages} (tổng {totalElements} thông báo)
          </span>
          <button
            type="button"
            className="btn btn-outline"
            disabled={page >= totalPages - 1}
            onClick={() => setPage((p) => p + 1)}
            style={{ padding: '6px 14px', fontSize: '12px' }}
          >
            Trang sau
          </button>
        </div>
      )}
    </AccountLayout>
  );
}
