import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Package, MapPin, Phone, AlertCircle, ArrowLeft, CreditCard, User } from 'lucide-react';
import { getErrorMessage } from '../api/client';
import AccountLayout from '../layouts/AccountLayout';
import { formatPrice, paymentStatusLabel, orderItemsSubtotal, shippingMethodLabel } from '../utils/helpers';
import { fetchMyOrderById, cancelMyOrder } from '../api/orders';
import { resolveImageUrl } from '../utils/imageUrl';
import CustomerDeliveryCard from '../components/delivery/CustomerDeliveryCard';

const PAYMENT_LABEL = { COD: 'Thanh toán khi nhận hàng (COD)', BANKING: 'Chuyển khoản trực tuyến (QR / Banking)' };

export default function OrderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [canceling, setCanceling] = useState(false);

  const handleCancelOrder = async () => {
    if (!window.confirm('Bạn có chắc chắn muốn hủy đơn hàng này không?')) return;
    setCanceling(true);
    try {
      await cancelMyOrder(order.id);
      const updatedOrder = await fetchMyOrderById(order.id);
      setOrder(updatedOrder);
      alert('Hủy đơn hàng thành công');
    } catch (err) {
      alert(getErrorMessage(err, 'Hủy đơn hàng thất bại'));
    } finally {
      setCanceling(false);
    }
  };

  useEffect(() => {
    if (!id) return;
    (async () => {
      setLoading(true); setError('');
      try {
        const orderData = await fetchMyOrderById(id);
        setOrder(orderData);
      } catch (err) {
        const msg = getErrorMessage(err, 'Không tải được thông tin đơn hàng');
        setError(msg);
      } finally {
        setLoading(false);
      }
    })();
  }, [id, navigate]);

  if (loading) {
    return (
      <AccountLayout activeTab="orders">
        <div style={{ textAlign: 'center', padding: '80px 0' }}>
          <div className="spinner" style={{ margin: '0 auto 16px', width: 28, height: 28 }} />
          <div style={{ color: 'var(--text-secondary)', fontSize: 14, fontWeight: 500 }}>
            Đang tải thông tin chi tiết đơn hàng...
          </div>
        </div>
      </AccountLayout>
    );
  }

  if (error || !order) {
    return (
      <AccountLayout activeTab="orders">
        <div style={{ textAlign: 'center', padding: '80px 0' }}>
          <AlertCircle size={48} style={{ color: 'var(--danger)', margin: '0 auto 16px' }} />
          <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>
            {error || 'Không tìm thấy đơn hàng'}
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 24 }}>
            Đơn hàng không tồn tại hoặc bạn không có quyền xem.
          </div>
          <button
            type="button"
            className="btn btn-primary"
            style={{ padding: '10px 24px', fontWeight: 700, borderRadius: 'var(--radius-full)' }}
            onClick={() => navigate('/orders')}
          >
            <ArrowLeft size={14} style={{ marginRight: 6 }} /> Quay lại danh sách đơn hàng
          </button>
        </div>
      </AccountLayout>
    );
  }

  const subtotal = orderItemsSubtotal(order);
  const discount = Number(order.discountAmount) || 0;

  return (
    <AccountLayout activeTab="orders">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <button
          type="button"
          onClick={() => navigate('/orders')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            fontSize: 13,
            fontWeight: 600,
            color: 'var(--text-secondary)',
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            padding: '6px 0',
            transition: 'color 0.15s ease'
          }}
        >
          <ArrowLeft size={15} />
          <span>Quay lại đơn mua</span>
        </button>

        {(order.status === 'PENDING' || order.status === 'CONFIRMED') && (
          <button
            type="button"
            onClick={handleCancelOrder}
            disabled={canceling}
            style={{
              padding: '6px 12px',
              fontSize: 13,
              fontWeight: 700,
              color: '#dc2626',
              background: '#fee2e2',
              border: 'none',
              borderRadius: 'var(--radius-md)',
              cursor: canceling ? 'not-allowed' : 'pointer',
              opacity: canceling ? 0.7 : 1
            }}
          >
            {canceling ? 'Đang hủy...' : 'Hủy đơn hàng'}
          </button>
        )}

        {order.status === 'DELIVERED' && (
          <button
            type="button"
            onClick={() => navigate(`/account/returns/create/${order.id}`)}
            style={{
              padding: '6px 12px',
              fontSize: 13,
              fontWeight: 700,
              color: '#0284c7',
              background: '#e0f2fe',
              border: 'none',
              borderRadius: 'var(--radius-md)',
              cursor: 'pointer'
            }}
          >
            Yêu cầu trả hàng
          </button>
        )}
      </div>

      {/* Phase 14 — Unified Customer Delivery Experience Card */}
      <CustomerDeliveryCard
        order={order}
        onUpdated={() => fetchMyOrderById(id).then(setOrder)}
      />

      {/* Products Desktop Table */}
      <div className="order-detail-desktop" style={{ marginBottom: '18px' }}>
        <div style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: '16px',
          padding: '22px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
        }}>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: '16px' }}>
            Kiện hàng sản phẩm ({order.items?.length || 0})
          </div>
          {order.items?.map((item, idx) => (
            <div
              key={item.id || idx}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                padding: '14px 0',
                borderBottom: idx === order.items.length - 1 ? 'none' : '1px solid #f1f5f9'
              }}
            >
              <div style={{
                width: 60,
                height: 60,
                background: 'var(--bg)',
                borderRadius: '12px',
                border: '1px solid var(--border)',
                overflow: 'hidden',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 6,
                flexShrink: 0
              }}>
                {item.productImage ? (
                  <img
                    src={resolveImageUrl(item.productImage)}
                    alt={item.productName || 'Sản phẩm'}
                    style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                    onError={(e) => { e.target.style.display = 'none'; }}
                  />
                ) : (
                  <Package size={22} style={{ color: '#94a3b8' }} />
                )}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)', lineHeight: 1.4 }}>
                  {item.productName}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>
                  Số lượng: <strong style={{ color: 'var(--text-primary)' }}>{item.quantity}</strong> · Đơn giá: {formatPrice(item.price)}
                </div>
              </div>
              <div style={{ fontWeight: 800, fontSize: 15, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
                {formatPrice(item.price * item.quantity)}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Products Mobile Cards */}
      <div className="order-detail-mobile-cards" style={{ marginBottom: '18px' }}>
        {order.items?.map((item, idx) => (
          <div key={item.id || idx} style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: '14px',
            padding: '14px',
            marginBottom: '10px'
          }}>
            <div style={{ display: 'flex', gap: 12 }}>
              <div style={{
                width: 56, height: 56, background: 'var(--bg)', borderRadius: '10px',
                border: '1px solid var(--border)', overflow: 'hidden', display: 'flex',
                alignItems: 'center', justifyContent: 'center', padding: 4, flexShrink: 0
              }}>
                {item.productImage ? (
                  <img
                    src={resolveImageUrl(item.productImage)}
                    alt=""
                    style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                    onError={(e) => { e.target.style.display = 'none'; }}
                  />
                ) : (
                  <Package size={18} style={{ color: '#94a3b8' }} />
                )}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-primary)' }}>{item.productName}</div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
                  SL: {item.quantity} · {formatPrice(item.price)}/chiếc
                </div>
                <div style={{ fontWeight: 800, fontSize: 14, color: 'var(--text-primary)', marginTop: 4 }}>
                  {formatPrice(item.price * item.quantity)}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Shipping + Payment + Customer Bento Grid */}
      <div className="order-detail-info-grid" style={{ marginBottom: '18px' }}>
        {/* Shipping box */}
        <div style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: '16px',
          padding: '20px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: 12 }}>
            <MapPin size={14} style={{ color: '#ef4444' }} />
            <span>Địa chỉ nhận hàng</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13 }}>
            <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
              {order.customerName || 'Khách hàng'}
            </div>
            <div style={{ color: 'var(--text-secondary)', lineHeight: 1.4 }}>
              {order.shippingAddress || 'Chưa cung cấp địa chỉ'}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-secondary)', marginTop: 4 }}>
              <Phone size={13} style={{ color: '#94a3b8' }} />
              <strong style={{ color: 'var(--text-primary)' }}>{order.phone || '—'}</strong>
            </div>
          </div>
        </div>

        {/* Payment box */}
        <div style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: '16px',
          padding: '20px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: 12 }}>
            <CreditCard size={14} style={{ color: '#0a3d8f' }} />
            <span>Phương thức & Thanh toán</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13 }}>
            <div>
              <span style={{ color: 'var(--text-muted)' }}>Phương thức: </span>
              <strong>{PAYMENT_LABEL[order.paymentMethod] || order.paymentMethod}</strong>
            </div>
            <div>
              <span style={{ color: 'var(--text-muted)' }}>Trạng thái thanh toán: </span>
              <span style={{
                display: 'inline-block',
                padding: '2px 8px',
                borderRadius: '6px',
                fontSize: '11px',
                fontWeight: 700,
                background: order.paymentStatus === 'PAID' ? '#ecfdf5' : '#fef3c7',
                color: order.paymentStatus === 'PAID' ? '#047857' : '#b45309'
              }}>
                {paymentStatusLabel[order.paymentStatus] || order.paymentStatus}
              </span>
            </div>
            {order.transferContent && order.paymentMethod === 'BANKING' && (
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', background: 'var(--bg)', padding: '6px 10px', borderRadius: '8px', border: '1px solid #e2e8f0', marginTop: 4 }}>
                <span style={{ color: 'var(--text-muted)' }}>Nội dung CK: </span>
                <code style={{ fontFamily: 'monospace', fontWeight: 800, color: '#0a3d8f' }}>{order.transferContent}</code>
              </div>
            )}
          </div>
        </div>

        {/* Delivery Method box */}
        <div style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: '16px',
          padding: '20px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: 12 }}>
            <Package size={14} style={{ color: '#0284c7' }} />
            <span>Hình thức vận chuyển</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13 }}>
            <div>
              <span style={{ color: 'var(--text-muted)' }}>Gói dịch vụ: </span>
              <strong>{shippingMethodLabel[order.shippingMethod] || order.shippingMethod || 'Tiêu chuẩn'}</strong>
            </div>
            <div>
              <span style={{ color: 'var(--text-muted)' }}>Cước phí: </span>
              <strong>{Number(order.shippingFee) > 0 ? formatPrice(order.shippingFee) : 'Miễn phí'}</strong>
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
              Được bảo hiểm bưu phẩm và kiểm tra trước khi nhận
            </div>
          </div>
        </div>
      </div>

      {/* Financial Summary Receipt Card */}
      <div style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: '16px',
        padding: '24px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
      }}>
        <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: 16 }}>
          Tóm tắt hóa đơn
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 13 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--text-secondary)' }}>Tạm tính sản phẩm</span>
            <strong style={{ color: 'var(--text-primary)' }}>{formatPrice(subtotal)}</strong>
          </div>
          {discount > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#059669' }}>
              <span>Ưu đãi giảm giá{order.voucherCode ? ` (${order.voucherCode})` : ''}</span>
              <strong>-{formatPrice(discount)}</strong>
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--text-secondary)' }}>
              Phí vận chuyển ({shippingMethodLabel[order.shippingMethod] || 'Tiêu chuẩn'})
            </span>
            <strong style={{ color: 'var(--text-primary)' }}>
              {Number(order.shippingFee) > 0 ? formatPrice(order.shippingFee) : 'Miễn phí'}
            </strong>
          </div>

          <div style={{ height: 1, background: '#f1f5f9', margin: '6px 0' }} />

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-primary)' }}>Tổng cộng thanh toán</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Đã bao gồm thuế GTGT (VAT)</div>
            </div>
            <div style={{ fontSize: 22, fontWeight: 900, color: '#0a3d8f', letterSpacing: '-0.02em' }}>
              {formatPrice(order.totalAmount)}
            </div>
          </div>
        </div>
      </div>
    </AccountLayout>
  );
}
