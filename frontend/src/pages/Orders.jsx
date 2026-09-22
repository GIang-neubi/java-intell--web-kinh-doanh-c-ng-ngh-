import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Package, ChevronDown, ChevronUp, MapPin, Phone, Search } from 'lucide-react';
import { fetchMyOrders } from '../api/orders';
import { getErrorMessage } from '../api/client';
import { formatDate, formatPrice, statusLabel, statusClass, paymentStatusLabel } from '../utils/helpers';
import AccountLayout from '../layouts/AccountLayout';
import { resolveImageUrl } from '../utils/imageUrl';
import DeliveryTimeline from '../components/delivery/DeliveryTimeline';

const STATUS_STEPS = ['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPING', 'DELIVERED'];
const STATUS_STEP_LABELS = ['Đã đặt', 'Đã xác nhận', 'Đang xử lý', 'Đang giao', 'Đã giao'];
const PAYMENT_LABEL = { COD: 'Thanh toán khi nhận hàng', BANKING: 'Chuyển khoản ngân hàng' };

const STATUS_FILTER = [
  { value: '', label: 'Tất cả đơn hàng' },
  { value: 'PENDING',    label: 'Đang chờ' },
  { value: 'CONFIRMED',  label: 'Đã xác nhận' },
  { value: 'PROCESSING', label: 'Đang xử lý' },
  { value: 'SHIPPING',   label: 'Đang giao' },
  { value: 'DELIVERED',  label: 'Đã giao' },
  { value: 'CANCELLED',  label: 'Đã hủy' },
];

const PAGE_SIZE = 5;

export default function Orders() {
  const [orders, setOrders]               = useState([]);
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages]       = useState(0);
  const [loading, setLoading]             = useState(true);
  const [error, setError]                 = useState('');
  const [statusFilter, setStatusFilter]   = useState('');
  const [keyword, setKeyword]             = useState('');
  const [searchInput, setSearchInput]     = useState('');
  const [page, setPage]                   = useState(0);
  const [expandedId, setExpandedId]       = useState(null);

  const loadOrders = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await fetchMyOrders({
        keyword: keyword || undefined,
        status: statusFilter || undefined,
        pageNo: page,
        pageSize: PAGE_SIZE,
      });
      setOrders(result.content || []);
      setTotalElements(result.totalElements ?? 0);
      setTotalPages(result.totalPages ?? 0);
    } catch (err) {
      setError(getErrorMessage(err, 'Không tải được đơn hàng.'));
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, [keyword, statusFilter, page]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  useEffect(() => {
    const t = setTimeout(() => {
      setKeyword(searchInput.trim());
      setPage(0);
    }, 350);
    return () => clearTimeout(t);
  }, [searchInput]);

  const handleFilterChange = (val) => {
    setStatusFilter(val);
    setPage(0);
  };

  if (loading && orders.length === 0 && !error) {
    return (
      <AccountLayout activeTab="orders">
        <div style={{ textAlign: 'center', padding: '80px 0' }}>
          <div className="spinner" style={{ margin: '0 auto 16px' }} />
          <div style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Đang tải đơn hàng...</div>
        </div>
      </AccountLayout>
    );
  }

  return (
    <AccountLayout activeTab="orders">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 'var(--space-6)', paddingBottom: 'var(--space-4)', borderBottom: '1px solid var(--border)' }}>
        <h1 style={{ fontSize: 'var(--text-xl)', fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--text-primary)', margin: 0 }}>
          Lịch sử đơn hàng
          {totalElements > 0 && (
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)', marginLeft: 10, letterSpacing: 0 }}>
              {totalElements} đơn
            </span>
          )}
        </h1>
      </div>

      <div style={{ position: 'relative', marginBottom: 'var(--space-5)', maxWidth: 360 }}>
        <Search size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
        <input
          type="search"
          className="form-input"
          placeholder="Tìm theo mã đơn (VD: ORD-...)"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          style={{ paddingLeft: 40, width: '100%', fontSize: 14 }}
          aria-label="Tìm đơn hàng theo mã"
        />
      </div>

      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 'var(--space-6)' }}>
        {STATUS_FILTER.map(s => (
          <button key={s.value} type="button"
            onClick={() => handleFilterChange(s.value)}
            style={{
              padding: '6px 14px', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em',
              borderRadius: 'var(--radius-full)', border: '1px solid',
              cursor: 'pointer', transition: 'all .15s',
              background: statusFilter === s.value ? 'var(--text-primary)' : '#fff',
              color: statusFilter === s.value ? '#fff' : 'var(--text-secondary)',
              borderColor: statusFilter === s.value ? 'var(--text-primary)' : 'var(--border)',
            }}
          >
            {s.label}
          </button>
        ))}
      </div>

      {error && (
        <div style={{ padding: '12px 16px', background: '#fef2f2', border: '1px solid #f87171', color: '#991b1b', borderRadius: 'var(--radius)', marginBottom: 'var(--space-4)', fontSize: 13 }}>
          {error}
        </div>
      )}

      {orders.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '80px 0' }}>
          <Package size={48} style={{ color: 'var(--border)', margin: '0 auto 16px' }} />
          <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>
            {statusFilter || keyword ? 'Không tìm thấy đơn hàng phù hợp' : 'Bạn chưa đặt đơn hàng nào'}
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 24 }}>
            {statusFilter || keyword ? 'Thử bộ lọc hoặc từ khóa khác.' : 'Lịch sử đơn hàng sẽ hiển thị tại đây sau khi bạn mua sắm.'}
          </div>
          <Link to="/products" className="btn btn-primary" style={{ padding: '12px 24px', borderRadius: 'var(--radius-lg)', fontWeight: 700, textDecoration: 'none' }}>
            Mua sắm ngay
          </Link>
        </div>
      ) : (
        <>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', opacity: loading ? 0.6 : 1 }}>
            {orders.map(order => {
              const currentIdx = STATUS_STEPS.indexOf(order.status);
              const isExpanded = expandedId === order.id;
              return (
                <div key={order.id} style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-xl)', overflow: 'hidden', transition: 'box-shadow .2s' }}>
                  <div style={{ padding: '20px 24px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6, flexWrap: 'wrap' }}>
                        <span style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: 15, color: 'var(--text-primary)', letterSpacing: 1 }}>
                          #{order.orderCode}
                        </span>
                        <span className={`status-badge ${statusClass[order.status] || ''}`}>
                          {statusLabel[order.status] || order.status}
                        </span>
                        {order.paymentStatus && order.paymentStatus !== 'NOT_REQUIRED' && (
                          <span className={`status-badge ${order.paymentStatus === 'PAID' ? 'badge-success' : 'badge-warning'}`} style={{ fontSize: 10 }}>
                            {paymentStatusLabel[order.paymentStatus] || order.paymentStatus}
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                        <span>{order.createdAt ? formatDate(order.createdAt) : '—'}</span>
                        <span>·</span>
                        <span>{(order.items || []).length} sản phẩm</span>
                        <span>·</span>
                        <span>{PAYMENT_LABEL[order.paymentMethod] || order.paymentMethod}</span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0, flexWrap: 'wrap' }}>
                      <div style={{ fontWeight: 800, fontSize: 18, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
                        {formatPrice(order.totalAmount)}
                      </div>
                      <Link
                        to={`/orders/${order.id}`}
                        className="btn btn-primary"
                        style={{ padding: '8px 16px', fontSize: 12, fontWeight: 700, borderRadius: 'var(--radius-md)', textDecoration: 'none' }}
                      >
                        Xem
                      </Link>
                      <button
                        type="button"
                        onClick={() => setExpandedId(isExpanded ? null : order.id)}
                        style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '8px 12px', background: '#f9fafb', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', cursor: 'pointer', color: 'var(--text-secondary)', transition: 'all .15s' }}
                      >
                        {isExpanded ? <><ChevronUp size={14} /> Thu gọn</> : <><ChevronDown size={14} /> Nhanh</>}
                      </button>
                    </div>
                  </div>

                  {order.status !== 'CANCELLED' && (
                    <div style={{ padding: '0 24px 20px', display: 'flex', gap: 0, overflowX: 'auto' }}>
                      {STATUS_STEP_LABELS.map((step, i) => {
                        const done   = i < currentIdx;
                        const active = i === currentIdx;
                        return (
                          <div key={step} style={{ flex: 1, minWidth: 64, display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
                            {i > 0 && (
                              <div style={{ position: 'absolute', left: 0, right: '50%', top: 12, height: 2, background: done || active ? 'var(--text-primary)' : 'var(--border)' }} />
                            )}
                            {i < STATUS_STEP_LABELS.length - 1 && (
                              <div style={{ position: 'absolute', left: '50%', right: 0, top: 12, height: 2, background: done ? 'var(--text-primary)' : 'var(--border)' }} />
                            )}
                            <div style={{
                              width: 24, height: 24, borderRadius: '50%', zIndex: 1, flexShrink: 0,
                              background: done || active ? 'var(--text-primary)' : '#fff',
                              border: `2px solid ${done || active ? 'var(--text-primary)' : 'var(--border)'}`,
                              color: done || active ? '#fff' : 'var(--text-muted)',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: 10, fontWeight: 800,
                            }}>
                              {done ? '✓' : i + 1}
                            </div>
                            <div style={{ fontSize: 10, fontWeight: done || active ? 700 : 500, color: done || active ? 'var(--text-primary)' : 'var(--text-muted)', marginTop: 4, textTransform: 'uppercase', letterSpacing: '0.04em', textAlign: 'center' }}>
                              {step}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {isExpanded && (
                    <div style={{ borderTop: '1px solid var(--border)', background: '#fafafa', padding: '24px 24px' }}>
                      <div style={{ marginBottom: 'var(--space-6)' }}>
                        <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: 'var(--space-3)' }}>
                          Sản phẩm đã đặt
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                          {(order.items || []).map(item => (
                            <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                              <div style={{ width: 56, height: 56, background: '#fff', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)', flexShrink: 0, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 6 }}>
                                {item.productImage
                                  ? <img src={resolveImageUrl(item.productImage)} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} onError={(e) => { e.target.style.display = 'none'; }} />
                                  : <Package size={20} style={{ color: 'var(--text-muted)' }} />}
                              </div>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                  {item.productName}
                                </div>
                                <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
                                  {formatPrice(item.price)} × {item.quantity}
                                </div>
                              </div>
                              <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)', flexShrink: 0 }}>
                                {formatPrice(item.subTotal)}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Realtime Delivery Timeline & OTP */}
                      <DeliveryTimeline
                        orderId={order.id}
                        onUpdated={loadOrders}
                        collapsible={true}
                        defaultOpen={true}
                      />

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 24, alignItems: 'end' }}>
                        <div style={{ fontSize: 13 }}>
                          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: 8 }}>
                            Thông tin giao hàng
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6, color: 'var(--text-secondary)' }}>
                              <MapPin size={14} style={{ flexShrink: 0, marginTop: 1 }} />
                              <span>{order.shippingAddress}</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-secondary)' }}>
                              <Phone size={14} style={{ flexShrink: 0 }} />
                              <span>{order.phone}</span>
                            </div>
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: 4 }}>
                            Tổng cộng
                          </div>
                          <div style={{ fontWeight: 800, fontSize: 22, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
                            {formatPrice(order.totalAmount)}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {totalPages > 1 && (
            <div className="pagination" style={{ marginTop: 'var(--space-8)' }}>
              <button type="button" className="page-btn" disabled={page === 0 || loading} onClick={() => setPage(p => p - 1)}>‹</button>
              {Array.from({ length: totalPages }, (_, i) => (
                <button key={i} type="button" className={`page-btn ${i === page ? 'active' : ''}`} disabled={loading} onClick={() => setPage(i)}>{i + 1}</button>
              ))}
              <button type="button" className="page-btn" disabled={page >= totalPages - 1 || loading} onClick={() => setPage(p => p + 1)}>›</button>
            </div>
          )}
        </>
      )}
    </AccountLayout>
  );
}
