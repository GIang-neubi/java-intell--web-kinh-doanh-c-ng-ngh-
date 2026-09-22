import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Package, Heart, ShoppingCart, ChevronRight, Clock, CheckCircle, FileText } from 'lucide-react';
import { useAuthStore, useCartStore } from '../store';
import api, { getErrorMessage } from '../api/client';
import AccountLayout from '../layouts/AccountLayout';
import { formatPrice } from '../utils/helpers';

const STATUS_LABELS = {
  PENDING: 'Chờ xác nhận',
  CONFIRMED: 'Đã xác nhận',
  PROCESSING: 'Đang xử lý',
  SHIPPING: 'Đang giao',
  DELIVERED: 'Đã giao',
  CANCELLED: 'Đã hủy',
};

export default function AccountOverview() {
  const { user } = useAuthStore();
  const cartItems = useCartStore((s) => s.items);
  const storeCartCount = (cartItems || []).reduce((s, i) => s + (Number(i.quantity) || 0), 0);
  const navigate = useNavigate();

  const [orders, setOrders] = useState([]);
  const [wishlistIds, setWishlistIds] = useState([]);
  const [cartData, setCartData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      setLoading(true); setError('');
      try {
        const [ordersRes, wishlistRes, cartRes] = await Promise.all([
          api.get('/orders/me'),
          api.get('/wishlist'),
          api.get('/cart'),
        ]);
        if (ordersRes.data.success) setOrders(ordersRes.data.data || []);
        if (wishlistRes.data.success) setWishlistIds(wishlistRes.data.data || []);
        if (cartRes.data.success) setCartData(cartRes.data.data);
      } catch (err) {
        setError(getErrorMessage(err, 'Không tải được thông tin tài khoản'));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const totalOrders = orders.length;
  const pendingOrders = orders.filter(o => o.paymentStatus === 'PENDING' || o.status === 'PENDING').length;
  const completedOrders = orders.filter(o => o.status === 'DELIVERED').length;
  const processingOrders = orders.filter(o => ['CONFIRMED', 'PROCESSING', 'SHIPPING'].includes(o.status)).length;
  const wishlistCount = wishlistIds.length;
  const cartCount = storeCartCount || cartData?.items?.length || 0;

  const recentOrders = [...orders].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 5);

  if (loading) {
    return (
      <AccountLayout activeTab="overview">
        <div style={{ textAlign: 'center', padding: '80px 0' }}>
          <div className="spinner" style={{ margin: '0 auto 16px' }} />
          <div style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Đang tải thông tin tài khoản...</div>
        </div>
      </AccountLayout>
    );
  }

  return (
    <AccountLayout activeTab="overview">
      <div style={{ marginBottom: 'var(--space-8)' }}>
        <h1 style={{ fontSize: 'var(--text-3xl)', fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--text-primary)', marginBottom: 4 }}>
          Xin chào, {user?.fullName?.split(' ').pop() || user?.username || 'Friend'}
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: 15 }}>
          Đây là trang tổng quan tài khoản của bạn
        </p>
      </div>

      {error && (
        <div style={{ padding: '12px 16px', background: '#fef2f2', border: '1px solid #f87171', color: '#991b1b', borderRadius: 'var(--radius)', marginBottom: 'var(--space-6)', fontSize: 13 }}>
          {error}
        </div>
      )}

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 'var(--space-4)', marginBottom: 'var(--space-8)' }}>
        {[
          { label: 'Tổng đơn', value: totalOrders, icon: FileText, color: 'var(--primary)' },
          { label: 'Chờ xử lý', value: pendingOrders, icon: Clock, color: 'var(--warning)' },
          { label: 'Đang xử lý', value: processingOrders, icon: CheckCircle, color: 'var(--primary-light)' },
          { label: 'Hoàn thành', value: completedOrders, icon: CheckCircle, color: 'var(--success)' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-5)', textAlign: 'center' }}>
            <Icon size={24} style={{ color, marginBottom: 8 }} />
            <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>{value}</div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-4)', marginBottom: 'var(--space-8)' }}>
        <Link to="/orders" style={{ textDecoration: 'none' }}>
          <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-6)', display: 'flex', alignItems: 'center', gap: 'var(--space-4)', transition: 'box-shadow .2s', cursor: 'pointer' }}
               onMouseOver={(e) => e.currentTarget.style.boxShadow = 'var(--shadow)'}
               onMouseOut={(e) => e.currentTarget.style.boxShadow = 'none'}>
            <div style={{ width: 48, height: 48, borderRadius: 'var(--radius-lg)', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Package size={24} color="var(--primary)" />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)' }}>Đơn hàng</div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{totalOrders} đơn</div>
            </div>
            <ChevronRight size={18} style={{ marginLeft: 'auto', color: 'var(--text-muted)' }} />
          </div>
        </Link>
        <Link to="/wishlist" style={{ textDecoration: 'none' }}>
          <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-6)', display: 'flex', alignItems: 'center', gap: 'var(--space-4)', transition: 'box-shadow .2s', cursor: 'pointer' }}
               onMouseOver={(e) => e.currentTarget.style.boxShadow = 'var(--shadow)'}
               onMouseOut={(e) => e.currentTarget.style.boxShadow = 'none'}>
            <div style={{ width: 48, height: 48, borderRadius: 'var(--radius-lg)', background: '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Heart size={24} color="#ef4444" />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)' }}>Yêu thích</div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{wishlistCount} sản phẩm</div>
            </div>
            <ChevronRight size={18} style={{ marginLeft: 'auto', color: 'var(--text-muted)' }} />
          </div>
        </Link>
        <Link to="/cart" style={{ textDecoration: 'none' }}>
          <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-6)', display: 'flex', alignItems: 'center', gap: 'var(--space-4)', transition: 'box-shadow .2s', cursor: 'pointer' }}
               onMouseOver={(e) => e.currentTarget.style.boxShadow = 'var(--shadow)'}
               onMouseOut={(e) => e.currentTarget.style.boxShadow = 'none'}>
            <div style={{ width: 48, height: 48, borderRadius: 'var(--radius-lg)', background: '#fffbeb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ShoppingCart size={24} color="#d97706" />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)' }}>Giỏ hàng</div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{cartCount} sản phẩm</div>
            </div>
            <ChevronRight size={18} style={{ marginLeft: 'auto', color: 'var(--text-muted)' }} />
          </div>
        </Link>
      </div>

      {/* Recent Orders */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-4)' }}>
          <h2 style={{ fontSize: 'var(--text-xl)', fontWeight: 800, color: 'var(--text-primary)' }}>Đơn hàng gần đây</h2>
          <Link to="/orders" style={{ fontSize: 13, color: 'var(--primary)', fontWeight: 600, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
            Xem tất cả <ChevronRight size={14} />
          </Link>
        </div>

        {recentOrders.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 0', background: '#fff', border: '1px solid var(--border)', borderRadius: 'var(--radius-xl)' }}>
            <FileText size={40} style={{ color: 'var(--border)', margin: '0 auto 16px' }} />
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>Chưa có đơn hàng</div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 24 }}>Bắt đầu mua sắm</div>
            <Link to="/products" className="btn btn-primary" style={{ padding: '10px 24px', borderRadius: 'var(--radius-full)', fontWeight: 700, textDecoration: 'none' }}>
              Mua sắm ngay
            </Link>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            {recentOrders.map(order => (
              <div key={order.id} style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-4)', display: 'flex', alignItems: 'center', gap: 'var(--space-4)', flexWrap: 'wrap', cursor: 'pointer' }}
                   onClick={() => navigate(`/orders/${order.id}`)}>
                <div style={{ flex: 1, minWidth: 120 }}>
                  <div style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: 14, color: 'var(--text-primary)', marginBottom: 4 }}>
                    {order.orderCode}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                    {order.createdAt ? new Date(order.createdAt).toLocaleDateString('vi-VN') : '—'} · {order.items?.length || 0} sản phẩm
                  </div>
                </div>
                <div style={{ fontWeight: 800, fontSize: 15, color: 'var(--text-primary)' }}>
                  {formatPrice(order.totalAmount)}
                </div>
                <span className={`status-badge ${order.status ? 'status-' + order.status.toLowerCase() : ''}`} style={{ fontSize: 11, padding: '4px 10px' }}>
                  {STATUS_LABELS[order.status] || order.status}
                </span>
                <ChevronRight size={16} style={{ color: 'var(--text-muted)' }} />
              </div>
            ))}
          </div>
        )}
      </div>
    </AccountLayout>
  );
}
