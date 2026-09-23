import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Ticket, Copy, Check, Calendar, ArrowRight, ShieldAlert, Sparkles, ShoppingBag } from 'lucide-react';
import AccountLayout from '../layouts/AccountLayout';
import api, { getErrorMessage } from '../api/client';
import { formatPrice, formatDate } from '../utils/helpers';
import { useToast } from '../components/Toast';

const STATUS_TABS = [
  { key: 'ALL', label: 'Tất cả' },
  { key: 'AVAILABLE', label: 'Khả dụng' },
  { key: 'USED', label: 'Đã sử dụng' },
  { key: 'EXPIRED', label: 'Hết hạn' },
];

export default function MyVouchers() {
  const [activeTab, setActiveTab] = useState('ALL');
  const [vouchers, setVouchers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copiedCode, setCopiedCode] = useState('');
  const { showToast } = useToast();
  const navigate = useNavigate();

  const loadVouchers = useCallback(async (tab = activeTab) => {
    setLoading(true);
    setError('');
    try {
      const url = tab === 'ALL' ? '/vouchers/my' : `/vouchers/my?status=${tab}`;
      const { data } = await api.get(url);
      if (data.success && Array.isArray(data.data)) {
        setVouchers(data.data);
      } else {
        setVouchers([]);
      }
    } catch (err) {
      setError(getErrorMessage(err, 'Không tải được danh sách mã giảm giá'));
      setVouchers([]);
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    loadVouchers(activeTab);
  }, [activeTab, loadVouchers]);

  const handleCopy = (code) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    showToast(`Đã sao chép mã "${code}" vào bộ nhớ tạm`, 'success');
    setTimeout(() => {
      setCopiedCode((prev) => (prev === code ? '' : prev));
    }, 2500);
  };

  const getStatusBadge = (v) => {
    switch (v.status) {
      case 'AVAILABLE':
        return <span className="status-badge status-delivered" style={{ fontSize: 11, padding: '3px 10px' }}>Khả dụng</span>;
      case 'USED':
        return <span className="status-badge" style={{ background: '#f3f4f6', color: '#6b7280', fontSize: 11, padding: '3px 10px' }}>Đã sử dụng</span>;
      case 'EXPIRED':
        return <span className="status-badge status-cancelled" style={{ fontSize: 11, padding: '3px 10px' }}>Đã hết hạn</span>;
      case 'OUT_OF_STOCK':
        return <span className="status-badge status-in-transit" style={{ background: '#fef3c7', color: '#b45309', fontSize: 11, padding: '3px 10px' }}>Hết lượt</span>;
      case 'UPCOMING':
        return <span className="status-badge" style={{ background: '#e0f2fe', color: '#0369a1', fontSize: 11, padding: '3px 10px' }}>Sắp diễn ra</span>;
      case 'INACTIVE':
      default:
        return <span className="status-badge" style={{ background: '#f3f4f6', color: '#9ca3af', fontSize: 11, padding: '3px 10px' }}>Tạm dừng</span>;
    }
  };

  const getDaysLeftText = (endDateStr) => {
    if (!endDateStr) return '';
    const now = new Date();
    const end = new Date(endDateStr);
    const diffMs = end - now;
    if (diffMs <= 0) return 'Đã hết hạn';
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays === 1) return 'Hết hạn hôm nay';
    return `Còn ${diffDays} ngày`;
  };

  return (
    <AccountLayout activeTab="vouchers">
      <div className="account-card" style={{ padding: 'var(--space-6)' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 'var(--space-6)', paddingBottom: 'var(--space-4)', borderBottom: '1px solid var(--border)' }}>
          <div>
            <h1 style={{ fontSize: 'var(--text-xl)', fontWeight: 800, letterSpacing: '-0.02em', margin: '0 0 6px', display: 'flex', alignItems: 'center', gap: 10 }}>
              <Ticket size={24} color="var(--primary)" />
              Mã giảm giá của tôi
            </h1>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', margin: 0 }}>
              Lưu và áp dụng mã khuyến mại để nhận ưu đãi chiết khấu khi thanh toán đơn hàng.
            </p>
          </div>
          <Link
            to="/products"
            className="btn btn-outline btn-sm"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, borderRadius: 'var(--radius-full)' }}
          >
            <ShoppingBag size={14} /> Mua sắm ngay
          </Link>
        </div>

        {/* Status Filter Tabs */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 'var(--space-6)', overflowX: 'auto', paddingBottom: 4 }}>
          {STATUS_TABS.map((tab) => {
            const isSelected = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`btn btn-sm ${isSelected ? 'btn-primary' : 'btn-ghost'}`}
                style={{
                  borderRadius: 'var(--radius-full)',
                  padding: '6px 18px',
                  fontSize: '13px',
                  fontWeight: 600,
                  whiteSpace: 'nowrap',
                  background: isSelected ? 'var(--primary)' : 'var(--bg-card)',
                  border: isSelected ? '1px solid var(--primary)' : '1px solid var(--border)',
                  color: isSelected ? '#fff' : 'var(--text-secondary)',
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Error Alert */}
        {error && (
          <div className="alert alert-danger" style={{ marginBottom: 16 }}>
            <ShieldAlert size={16} /> {error}
          </div>
        )}

        {/* Content */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: 'var(--space-12) 0' }}>
            <div className="spinner" style={{ margin: '0 auto' }} />
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 12 }}>Đang tải danh sách ưu đãi...</p>
          </div>
        ) : vouchers.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 'var(--space-16) var(--space-4)', background: 'var(--bg)', borderRadius: 'var(--radius-xl)', border: '1px dashed var(--border)' }}>
            <Ticket size={48} style={{ margin: '0 auto var(--space-4)', opacity: 0.25, color: 'var(--text-muted)' }} />
            <h3 style={{ fontSize: 'var(--text-base)', fontWeight: 700, margin: '0 0 8px' }}>Chưa có mã giảm giá nào</h3>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', maxWidth: 400, margin: '0 auto 16px' }}>
              Hiện tại chưa có ưu đãi nào thuộc mục này. Hãy theo dõi các chương trình khuyến mãi tiếp theo từ H&G Store!
            </p>
            <Link to="/products" className="btn btn-primary btn-sm" style={{ borderRadius: 'var(--radius-full)', padding: '8px 20px' }}>
              Khám phá sản phẩm
            </Link>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 'var(--space-4)' }}>
            {vouchers.map((v) => {
              const isAvailable = v.status === 'AVAILABLE';
              const isCopied = copiedCode === v.code;
              const daysLeft = getDaysLeftText(v.endDate);

              return (
                <div
                  key={v.id}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-xl)',
                    background: isAvailable ? '#fff' : '#fafafa',
                    boxShadow: isAvailable ? '0 2px 8px rgba(0,0,0,0.04)' : 'none',
                    opacity: isAvailable ? 1 : 0.85,
                    overflow: 'hidden',
                    position: 'relative',
                    transition: 'transform 0.2s, box-shadow 0.2s',
                  }}
                >
                  {/* Top discount banner */}
                  <div
                    style={{
                      padding: 'var(--space-4)',
                      background: isAvailable
                        ? 'linear-gradient(135deg, #111827 0%, #1f2937 100%)'
                        : '#9ca3af',
                      color: '#fff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: 8,
                          background: 'rgba(255,255,255,0.15)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Ticket size={20} color="#fff" />
                      </div>
                      <div>
                        <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.2 }}>
                          {v.discountType === 'PERCENT' ? `Giảm ${v.discountValue}%` : `Giảm ${formatPrice(v.discountValue)}`}
                        </div>
                        <div style={{ fontSize: 11, opacity: 0.85, marginTop: 2 }}>
                          {v.minOrderValue && Number(v.minOrderValue) > 0
                            ? `Đơn tối thiểu ${formatPrice(v.minOrderValue)}`
                            : 'Mọi giá trị đơn hàng'}
                        </div>
                      </div>
                    </div>
                    <div>{getStatusBadge(v)}</div>
                  </div>

                  {/* Body details */}
                  <div style={{ padding: 'var(--space-4)', flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {/* Code box & copy button */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '6px 12px',
                        background: '#f8fafc',
                        border: '1px dashed #cbd5e1',
                        borderRadius: 8,
                      }}
                    >
                      <div style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: 15, letterSpacing: '0.08em', color: 'var(--text-primary)' }}>
                        {v.code}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleCopy(v.code)}
                        title="Sao chép mã"
                        style={{
                          background: isCopied ? '#dcfce7' : 'transparent',
                          border: isCopied ? '1px solid #86efac' : 'none',
                          color: isCopied ? '#166534' : 'var(--primary)',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                          fontSize: 12,
                          fontWeight: 700,
                          padding: '4px 10px',
                          borderRadius: 6,
                          transition: 'all .2s',
                        }}
                      >
                        {isCopied ? (
                          <>
                            <Check size={13} /> Đã chép
                          </>
                        ) : (
                          <>
                            <Copy size={13} /> Sao chép
                          </>
                        )}
                      </button>
                    </div>

                    {/* Description */}
                    {v.description && (
                      <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
                        {v.description}
                      </p>
                    )}

                    {/* Conditions: Max discount & Limits */}
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: 4 }}>
                      {v.discountType === 'PERCENT' && v.maxDiscount && Number(v.maxDiscount) > 0 && (
                        <div>• Giảm tối đa: <strong style={{ color: 'var(--text-secondary)' }}>{formatPrice(v.maxDiscount)}</strong></div>
                      )}
                      {v.quantity > 0 && (
                        <div>• Lượt dùng còn lại: <strong style={{ color: 'var(--text-secondary)' }}>{Math.max(0, v.quantity - (v.usedQuantity || 0))}</strong> / {v.quantity}</div>
                      )}
                    </div>

                    {/* Expiry */}
                    <div style={{ marginTop: 'auto', paddingTop: 8, borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-muted)' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <Calendar size={13} />
                        HSD: {v.endDate ? formatDate(v.endDate) : '—'}
                      </span>
                      {isAvailable && daysLeft && (
                        <span style={{ color: '#d97706', fontWeight: 600 }}>{daysLeft}</span>
                      )}
                    </div>
                  </div>

                  {/* Action bottom button */}
                  {isAvailable && (
                    <div style={{ padding: '0 var(--space-4) var(--space-4)' }}>
                      <button
                        type="button"
                        onClick={() => {
                          handleCopy(v.code);
                          navigate('/cart');
                        }}
                        className="btn btn-outline btn-sm"
                        style={{
                          width: '100%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 6,
                          borderRadius: 8,
                          fontWeight: 700,
                        }}
                      >
                        <Sparkles size={13} /> Áp dụng vào giỏ hàng <ArrowRight size={13} />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AccountLayout>
  );
}
