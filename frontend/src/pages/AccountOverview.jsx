import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Package, Heart, ShoppingCart, ChevronRight, Clock, CheckCircle,
  FileText, Truck, MapPin, Award, ShieldCheck, Sparkles, Navigation,
  ExternalLink, Camera, X, Ticket, ArrowRight, RotateCcw, AlertCircle, Check
} from 'lucide-react';
import { useAuthStore, useCartStore } from '../store';
import api, { getErrorMessage } from '../api/client';
import { fetchDeliveryByOrderId } from '../api/delivery';
import AccountLayout from '../layouts/AccountLayout';
import { formatPrice, formatDate, statusLabel, statusClass, deliveryStatusColor } from '../utils/helpers';
import { resolveImageUrl } from '../utils/imageUrl';

export default function AccountOverview() {
  const { user } = useAuthStore();
  const cartItems = useCartStore((s) => s.items);
  const storeCartCount = (cartItems || []).reduce((s, i) => s + (Number(i.quantity) || 0), 0);
  const navigate = useNavigate();

  const [orders, setOrders] = useState([]);
  const [wishlistIds, setWishlistIds] = useState([]);
  const [cartData, setCartData] = useState(null);
  const [activeDelivery, setActiveDelivery] = useState(null);
  const [recentDeliveredDelivery, setRecentDeliveredDelivery] = useState(null);
  const [previewProof, setPreviewProof] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError('');
      try {
        const [ordersRes, wishlistRes, cartRes] = await Promise.all([
          api.get('/orders/me'),
          api.get('/wishlist'),
          api.get('/cart'),
        ]);

        const fetchedOrders = ordersRes.data.success ? (ordersRes.data.data || []) : [];
        setOrders(fetchedOrders);

        if (wishlistRes.data.success) setWishlistIds(wishlistRes.data.data || []);
        if (cartRes.data.success) setCartData(cartRes.data.data);

        // Tìm đơn hàng đang vận chuyển / xử lý gần nhất
        const activeOrder = fetchedOrders.find((o) =>
          ['SHIPPING', 'PROCESSING', 'CONFIRMED'].includes(o.status)
        );
        if (activeOrder) {
          try {
            const delData = await fetchDeliveryByOrderId(activeOrder.id);
            setActiveDelivery(delData);
          } catch (e) {
            // Không có phiếu giao hàng hoặc lỗi nhẹ -> bỏ qua
          }
        }

        // Tìm đơn giao thành công gần nhất để hiển thị chứng nhận POD
        const deliveredOrder = fetchedOrders.find((o) => o.status === 'DELIVERED');
        if (deliveredOrder) {
          try {
            const delDelivered = await fetchDeliveryByOrderId(deliveredOrder.id);
            setRecentDeliveredDelivery(delDelivered);
          } catch (e) {
            // bỏ qua
          }
        }
      } catch (err) {
        setError(getErrorMessage(err, 'Không tải được thông tin tài khoản'));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // ── Tính toán số liệu thống kê ──
  const totalOrders = orders.length;
  const pendingOrders = orders.filter(
    (o) => o.paymentStatus === 'PENDING' || o.status === 'PENDING'
  ).length;
  const completedOrders = orders.filter((o) => o.status === 'DELIVERED').length;
  const processingOrders = orders.filter((o) =>
    ['CONFIRMED', 'PROCESSING', 'SHIPPING'].includes(o.status)
  ).length;
  const wishlistCount = wishlistIds.length;
  const cartCount = storeCartCount || cartData?.items?.length || 0;

  // Tính tổng chi tiêu tích lũy
  const totalSpent = orders
    .filter((o) => o.status === 'DELIVERED' || o.paymentStatus === 'PAID')
    .reduce((sum, o) => sum + (Number(o.totalAmount) || 0), 0);

  // Đơn hàng gần nhất đang trong tiến trình
  const activeOrder = orders.find((o) =>
    ['SHIPPING', 'PROCESSING', 'CONFIRMED'].includes(o.status)
  );

  // Đơn hàng hoàn tất gần nhất
  const recentDeliveredOrder = orders.find((o) => o.status === 'DELIVERED');

  // Danh sách 5 đơn hàng mới nhất
  const recentOrders = [...orders]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 5);

  // ── Cấu hình Hạng Thành viên Thân Thiết (VIP Loyalty Tiers) ──
  const getTierInfo = (spent) => {
    if (spent >= 50000000) {
      return {
        name: 'H&G Diamond VIP',
        badge: '💎',
        tierLabel: 'Kim Cương',
        gradient: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0369a1 100%)',
        accentColor: '#38bdf8',
        progress: 100,
        nextText: 'Cấp độ cao nhất của khách hàng thân thiết H&G',
        perks: [
          'Miễn phí giao hàng hỏa tốc 100%',
          'Bảo hành đổi mới 1-1 trong 30 ngày',
          'Hotline hỗ trợ kỹ thuật VIP 24/7',
          'Ưu đãi voucher sinh nhật 20%',
        ],
      };
    }
    if (spent >= 20000000) {
      const needed = 50000000 - spent;
      const progress = Math.min(
        100,
        Math.round(((spent - 20000000) / 30000000) * 100)
      );
      return {
        name: 'H&G Gold VIP',
        badge: '🥇',
        tierLabel: 'Vàng',
        gradient: 'linear-gradient(135deg, #451a03 0%, #78350f 50%, #b45309 100%)',
        accentColor: '#fbbf24',
        progress,
        nextText: `Chi tiêu thêm ${formatPrice(needed)} để lên hạng Kim Cương`,
        perks: [
          'Miễn phí vận chuyển cho đơn từ 500.000 ₫',
          'Hoàn tiền tích lũy 2% cho đơn tiếp theo',
          'Bảo hành chính hãng mở rộng thêm 6 tháng',
        ],
      };
    }
    if (spent >= 5000000) {
      const needed = 20000000 - spent;
      const progress = Math.min(
        100,
        Math.round(((spent - 5000000) / 15000000) * 100)
      );
      return {
        name: 'H&G Silver Member',
        badge: '🥈',
        tierLabel: 'Bạc',
        gradient: 'linear-gradient(135deg, #1e293b 0%, #334155 50%, #475569 100%)',
        accentColor: '#94a3b8',
        progress,
        nextText: `Chi tiêu thêm ${formatPrice(needed)} để lên hạng Vàng`,
        perks: [
          'Tặng voucher giảm giá 5% cho đơn tiếp theo',
          'Ưu tiên giải quyết bảo hành & đổi trả',
        ],
      };
    }
    const needed = 5000000 - spent;
    const progress = Math.min(100, Math.round((spent / 5000000) * 100));
    return {
      name: 'H&G Standard Member',
      badge: '🥉',
      tierLabel: 'Tiêu Chuẩn',
      gradient: 'linear-gradient(135deg, #0a3d8f 0%, #1e40af 50%, #2563eb 100%)',
      accentColor: '#93c5fd',
      progress,
      nextText: `Chi tiêu thêm ${formatPrice(needed)} để lên hạng Bạc`,
      perks: [
        'Tích lũy điểm thưởng cho mọi giao dịch',
        'Hỗ trợ tư vấn kỹ thuật máy ảnh chính hãng',
      ],
    };
  };

  const currentTier = getTierInfo(totalSpent);

  // ── Phím tắt điều hướng nhanh (Bento Action Shortcuts) ──
  const shortcuts = [
    {
      id: 'orders',
      title: 'Đơn mua của tôi',
      desc: `${totalOrders} đơn hàng · ${processingOrders} đang xử lý`,
      icon: Package,
      path: '/orders',
      color: '#0a3d8f',
      bg: '#eff6ff',
      badge: processingOrders > 0 ? `${processingOrders} đang xử lý` : null,
      badgeColor: '#2563eb',
    },
    {
      id: 'active_tracking',
      title: 'Tra cứu giao vận',
      desc: activeOrder ? `Đơn #${activeOrder.orderCode} đang di chuyển` : 'Kiểm tra lộ trình kiện hàng',
      icon: Truck,
      path: activeOrder ? `/orders/${activeOrder.id}` : '/orders',
      color: '#059669',
      bg: '#ecfdf5',
      badge: activeOrder ? 'Trực tiếp' : null,
      badgeColor: '#059669',
    },
    {
      id: 'wishlist',
      title: 'Sản phẩm yêu thích',
      desc: `${wishlistCount} máy ảnh & lens đã lưu`,
      icon: Heart,
      path: '/wishlist',
      color: '#e11d48',
      bg: '#fff1f2',
      badge: wishlistCount > 0 ? `${wishlistCount}` : null,
      badgeColor: '#e11d48',
    },
    {
      id: 'cart',
      title: 'Giỏ hàng mua sắm',
      desc: `${cartCount} sản phẩm sẵn sàng đặt mua`,
      icon: ShoppingCart,
      path: '/cart',
      color: '#d97706',
      bg: '#fffbeb',
      badge: cartCount > 0 ? `${cartCount}` : null,
      badgeColor: '#d97706',
    },
    {
      id: 'addresses',
      title: 'Sổ địa chỉ nhận hàng',
      desc: user?.address || 'Quản lý thông tin giao hàng',
      icon: MapPin,
      path: '/account/addresses',
      color: '#7c3aed',
      bg: '#f5f3ff',
    },
    {
      id: 'vouchers',
      title: 'Mã giảm giá của tôi',
      desc: 'Kho voucher & mã khuyến mại ưu đãi',
      icon: Ticket,
      path: '/account/vouchers',
      color: '#059669',
      bg: '#ecfdf5',
      badge: 'Ưu đãi hot',
      badgeColor: '#059669',
    },
    {
      id: 'warranty',
      title: 'Trung tâm bảo hành',
      desc: 'Bảo hành chính hãng máy ảnh 12–24 tháng',
      icon: ShieldCheck,
      path: '/account/warranty',
      color: '#0284c7',
      bg: '#f0f9ff',
      badge: 'Chính hãng 100%',
      badgeColor: '#0284c7',
    },
  ];

  if (loading) {
    return (
      <AccountLayout activeTab="overview">
        <div style={{ textAlign: 'center', padding: '80px 0' }}>
          <div className="spinner" style={{ margin: '0 auto 16px' }} />
          <div style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
            Đang tải thông tin bảng điều khiển tài khoản...
          </div>
        </div>
      </AccountLayout>
    );
  }

  return (
    <AccountLayout activeTab="overview">
      {/* Header Welcome */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 style={{ fontSize: '26px', fontWeight: 900, letterSpacing: '-0.02em', color: 'var(--text-primary)', margin: 0 }}>
              Xin chào, {user?.fullName || user?.username || 'Quý khách'} 👋
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: 14, margin: '6px 0 0' }}>
              Chào mừng bạn trở lại Trung tâm Điều hành Khách hàng H&G Store
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{
              padding: '6px 12px', borderRadius: '999px', fontSize: '12px', fontWeight: 800,
              background: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0',
              display: 'inline-flex', alignItems: 'center', gap: 6
            }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981' }} />
              <span>Tài khoản chính thức</span>
            </span>
          </div>
        </div>
      </div>

      {error && (
        <div style={{
          padding: '12px 16px', background: '#fef2f2', border: '1px solid #f87171',
          color: '#991b1b', borderRadius: '12px', marginBottom: '20px', fontSize: 13,
          display: 'flex', alignItems: 'center', gap: 8
        }}>
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {/* ── CARD 1: VIP Loyalty Membership Tier ── */}
      <div style={{
        background: currentTier.gradient,
        borderRadius: '20px',
        padding: '22px 24px',
        color: '#ffffff',
        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.12)',
        marginBottom: '24px',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Background decorative watermark */}
        <div style={{
          position: 'absolute', right: -20, bottom: -20, fontSize: '110px',
          opacity: 0.1, pointerEvents: 'none', userSelect: 'none'
        }}>
          {currentTier.badge}
        </div>

        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16, position: 'relative', zIndex: 1 }}>
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.18)', backdropFilter: 'blur(4px)', padding: '4px 10px', borderRadius: '8px', fontSize: '12px', fontWeight: 800, letterSpacing: '0.04em' }}>
              <span>{currentTier.badge}</span>
              <span>{currentTier.name.toUpperCase()}</span>
            </div>
            <div style={{ fontSize: '22px', fontWeight: 900, marginTop: '10px', letterSpacing: '-0.01em' }}>
              Tổng tích lũy mua sắm: {formatPrice(totalSpent)}
            </div>
            <div style={{ fontSize: '13px', opacity: 0.9, marginTop: '4px' }}>
              {currentTier.nextText}
            </div>
          </div>

          <div style={{ textAlign: 'right', minWidth: '180px' }}>
            <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', opacity: 0.85, fontWeight: 700 }}>
              Tiến trình lên hạng
            </div>
            <div style={{ fontSize: '20px', fontWeight: 900, marginTop: '2px', color: currentTier.accentColor }}>
              {currentTier.progress}%
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div style={{
          height: '7px', width: '100%', background: 'rgba(255, 255, 255, 0.22)',
          borderRadius: '999px', overflow: 'hidden', margin: '16px 0 14px', position: 'relative', zIndex: 1
        }}>
          <div style={{
            height: '100%', width: `${currentTier.progress}%`,
            background: currentTier.accentColor, borderRadius: '999px',
            transition: 'width 0.8s ease'
          }} />
        </div>

        {/* Perks list */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap', fontSize: '12px', opacity: 0.95, position: 'relative', zIndex: 1 }}>
          <span style={{ fontWeight: 800, color: currentTier.accentColor, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <Sparkles size={14} />
            <span>Đặc quyền của bạn:</span>
          </span>
          {currentTier.perks.map((p, idx) => (
            <span key={idx} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <span style={{ opacity: 0.7 }}>•</span>
              <span>{p}</span>
            </span>
          ))}
        </div>
      </div>

      {/* ── CARD 2: Active Delivery Radar Hero (Nếu có đơn đang vận chuyển) ── */}
      {activeOrder && (
        <div style={{
          background: activeOrder.status === 'SHIPPING'
            ? 'linear-gradient(135deg, #064e3b 0%, #059669 100%)'
            : 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)',
          borderRadius: '20px',
          padding: '20px 22px',
          color: '#ffffff',
          boxShadow: '0 8px 24px rgba(5, 150, 105, 0.2)',
          marginBottom: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <span style={{
                position: 'relative', display: 'flex', height: 10, width: 10
              }}>
                <span style={{
                  position: 'absolute', inset: 0, borderRadius: '50%', background: '#ffffff', opacity: 0.75,
                  animation: 'ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite'
                }} />
                <span style={{
                  position: 'relative', borderRadius: '50%', height: 10, width: 10, background: '#ffffff'
                }} />
              </span>
              <span style={{
                fontSize: '11px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.06em',
                background: 'rgba(255, 255, 255, 0.2)', padding: '3px 10px', borderRadius: '6px'
              }}>
                {activeOrder.status === 'SHIPPING'
                  ? '🛵 TÀI XẾ ĐANG TRÊN ĐƯỜNG GIAO HÀNG ĐẾN BẠN'
                  : activeOrder.status === 'PROCESSING'
                  ? '📦 ĐANG ĐÓNG GÓI & KIỂM TRA TẠI KHO H&G'
                  : '✓ ĐƠN HÀNG ĐÃ XÁC NHẬN - CHỜ ĐIỀU PHỐI'}
              </span>
            </div>

            <span style={{ fontSize: '12px', opacity: 0.9, fontWeight: 600 }}>
              Đơn hàng: <strong>#{activeOrder.orderCode}</strong>
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
            <div style={{ flex: 1, minWidth: 240 }}>
              <div style={{ fontSize: '17px', fontWeight: 900, letterSpacing: '-0.01em' }}>
                {activeDelivery?.receiverName || activeOrder.customerName || 'Khách hàng'}
              </div>
              <div style={{ fontSize: '13px', opacity: 0.9, marginTop: '4px', display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                <MapPin size={15} style={{ flexShrink: 0, marginTop: 2 }} />
                <span>{activeDelivery?.deliveryAddress || activeOrder.shippingAddress || 'Địa chỉ giao hàng'}</span>
              </div>

              {activeDelivery?.warehouseName && (
                <div style={{ fontSize: '12px', opacity: 0.85, marginTop: '6px' }}>
                  Xuất phát từ: <strong>{activeDelivery.warehouseName}</strong>
                  {activeDelivery.shipperName && ` • Tài xế phụ trách: ${activeDelivery.shipperName}`}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <Link
                to={`/orders/${activeOrder.id}#live-delivery-map-section`}
                style={{
                  padding: '10px 18px', borderRadius: '12px',
                  background: '#ffffff', color: activeOrder.status === 'SHIPPING' ? '#065f46' : '#1e40af',
                  fontSize: '13px', fontWeight: 800, textDecoration: 'none',
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                }}
              >
                <Navigation size={15} />
                <span>THEO DÕI HÀNH TRÌNH LIVE</span>
                <ExternalLink size={13} />
              </Link>

              <Link
                to={`/orders/${activeOrder.id}`}
                style={{
                  padding: '10px 14px', borderRadius: '12px',
                  background: 'rgba(255, 255, 255, 0.15)', color: '#ffffff',
                  fontSize: '13px', fontWeight: 700, textDecoration: 'none',
                  border: '1px solid rgba(255, 255, 255, 0.3)'
                }}
              >
                Chi tiết đơn
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* ── CARD 2B: Recently Delivered Order with Proof of Delivery Showcase (nếu không có active shipping) ── */}
      {!activeOrder && recentDeliveredOrder && (
        <div style={{
          background: '#ffffff',
          borderRadius: '18px',
          padding: '18px 20px',
          border: '1px solid #d8b4fe',
          boxShadow: '0 4px 16px rgba(168, 85, 247, 0.08)',
          marginBottom: '24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 14
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 240 }}>
            {recentDeliveredDelivery?.proofImage ? (
              <div
                onClick={() => setPreviewProof(recentDeliveredDelivery.proofImage)}
                style={{
                  position: 'relative', width: 62, height: 62, borderRadius: '12px',
                  overflow: 'hidden', border: '1px solid #c084fc', cursor: 'pointer', flexShrink: 0
                }}
                title="Bấm để xem ảnh đối soát giao hàng"
              >
                <img
                  src={resolveImageUrl(recentDeliveredDelivery.proofImage)}
                  alt="POD"
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
                <div style={{
                  position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.25)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff'
                }}>
                  <Camera size={16} />
                </div>
              </div>
            ) : (
              <div style={{
                width: 52, height: 52, borderRadius: '12px', background: '#f5f3ff',
                color: '#7e22ce', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
              }}>
                <CheckCircle size={26} />
              </div>
            )}

            <div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: '11px', fontWeight: 800, color: '#7e22ce', background: '#faf5ff', padding: '2px 8px', borderRadius: '6px' }}>
                <Check size={12} />
                <span>GIAO HÀNG THÀNH CÔNG GẦN ĐÂY</span>
              </div>
              <div style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-primary)', marginTop: '4px' }}>
                Đơn hàng #{recentDeliveredOrder.orderCode} đã giao hoàn tất
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                {recentDeliveredDelivery?.deliveredAt
                  ? `Bàn giao lúc: ${formatDate(recentDeliveredDelivery.deliveredAt)}`
                  : 'Kiện hàng đã được đối soát thành công'}
                {recentDeliveredDelivery?.proofImage && (
                  <button
                    type="button"
                    onClick={() => setPreviewProof(recentDeliveredDelivery.proofImage)}
                    style={{
                      background: 'none', border: 'none', padding: '0 6px',
                      color: '#7e22ce', fontWeight: 700, cursor: 'pointer', textDecoration: 'underline'
                    }}
                  >
                    Xem ảnh ký nhận (POD)
                  </button>
                )}
              </div>
            </div>
          </div>

          <Link
            to={`/orders/${recentDeliveredOrder.id}`}
            style={{
              padding: '9px 16px', borderRadius: '10px',
              background: '#f3e8ff', color: '#6b21a8', border: '1px solid #d8b4fe',
              fontSize: '12px', fontWeight: 700, textDecoration: 'none',
              display: 'inline-flex', alignItems: 'center', gap: 6
            }}
          >
            <span>Xem lại đơn hàng</span>
            <ChevronRight size={14} />
          </Link>
        </div>
      )}

      {/* ── CARD 3: Key Metrics KPI Grid (6 chỉ số trọng tâm) ── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
        gap: '12px',
        marginBottom: '28px'
      }}>
        {[
          { label: 'Tổng đơn hàng', value: totalOrders, sub: 'Lịch sử mua sắm', icon: FileText, color: '#0a3d8f', bg: '#eff6ff' },
          { label: 'Đang giao vận', value: processingOrders, sub: 'Chờ nhận hàng', icon: Truck, color: '#059669', bg: '#ecfdf5' },
          { label: 'Giao thành công', value: completedOrders, sub: 'Đã nhận đủ', icon: CheckCircle, color: '#0284c7', bg: '#f0f9ff' },
          { label: 'Chờ thanh toán', value: pendingOrders, sub: 'Cần xử lý', icon: Clock, color: '#d97706', bg: '#fffbeb' },
          { label: 'Sản phẩm yêu thích', value: wishlistCount, sub: 'Đã lưu lại', icon: Heart, color: '#e11d48', bg: '#fff1f2' },
          { label: 'Giỏ hàng hiện tại', value: cartCount, sub: 'Sản phẩm', icon: ShoppingCart, color: '#7c3aed', bg: '#f5f3ff' },
        ].map(({ label, value, sub, icon: Icon, color, bg }) => (
          <div
            key={label}
            style={{
              background: '#ffffff',
              border: '1px solid var(--border)',
              borderRadius: '16px',
              padding: '16px',
              textAlign: 'center',
              boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
              transition: 'transform 0.2s, box-shadow 0.2s'
            }}
          >
            <div style={{
              width: 40, height: 40, borderRadius: '10px', background: bg,
              color: color, margin: '0 auto 8px', display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <Icon size={20} />
            </div>
            <div style={{ fontSize: 24, fontWeight: 900, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
              {value}
            </div>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', marginTop: 2 }}>
              {label}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
              {sub}
            </div>
          </div>
        ))}
      </div>

      {/* ── CARD 4: Quick Action Shortcuts Bento Hub ── */}
      <div style={{ marginBottom: '32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
          <h2 style={{ fontSize: '17px', fontWeight: 900, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.01em' }}>
            Truy Cập Nhanh Hệ Thống
          </h2>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            Lối tắt tiện ích H&G Store
          </span>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '14px'
        }}>
          {shortcuts.map(({ id, title, desc, icon: Icon, path, color, bg, badge, badgeColor }) => (
            <Link
              key={id}
              to={path}
              style={{
                textDecoration: 'none',
                background: '#ffffff',
                border: '1px solid var(--border)',
                borderRadius: '16px',
                padding: '18px',
                display: 'flex',
                alignItems: 'center',
                gap: '14px',
                transition: 'all 0.2s ease',
                boxShadow: '0 2px 6px rgba(0,0,0,0.02)'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 6px 18px rgba(0,0,0,0.06)';
                e.currentTarget.style.borderColor = color;
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.transform = 'none';
                e.currentTarget.style.boxShadow = '0 2px 6px rgba(0,0,0,0.02)';
                e.currentTarget.style.borderColor = 'var(--border)';
              }}
            >
              <div style={{
                width: 48, height: 48, borderRadius: '12px',
                background: bg, color: color,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0
              }}>
                <Icon size={24} />
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ fontWeight: 800, fontSize: '14px', color: 'var(--text-primary)' }}>
                    {title}
                  </div>
                  {badge && (
                    <span style={{
                      fontSize: '10px', fontWeight: 800, padding: '1px 6px',
                      borderRadius: '6px', background: `${badgeColor}18`, color: badgeColor
                    }}>
                      {badge}
                    </span>
                  )}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {desc}
                </div>
              </div>

              <ChevronRight size={18} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
            </Link>
          ))}
        </div>
      </div>

      {/* ── CARD 5: Recent Orders Showcase ── */}
      <div style={{ marginBottom: '32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: 900, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.01em' }}>
              Đơn Hàng Gần Đây
            </h2>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
              Xem nhanh tiến trình 5 đơn đặt hàng mới nhất
            </div>
          </div>

          <Link
            to="/orders"
            style={{
              fontSize: '13px', color: 'var(--primary)', fontWeight: 700,
              textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4
            }}
          >
            <span>Xem tất cả ({totalOrders})</span>
            <ChevronRight size={15} />
          </Link>
        </div>

        {recentOrders.length === 0 ? (
          <div style={{
            textAlign: 'center', padding: '48px 20px', background: '#ffffff',
            border: '1px dashed var(--border)', borderRadius: '18px'
          }}>
            <Package size={44} style={{ color: 'var(--text-muted)', margin: '0 auto 12px' }} />
            <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 6 }}>
              Bạn chưa có đơn đặt hàng nào
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 20 }}>
              Khám phá các sản phẩm công nghệ, máy ảnh & phụ kiện chính hãng tại H&G
            </div>
            <Link
              to="/products"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '10px 22px', borderRadius: '12px',
                background: '#0a3d8f', color: '#ffffff',
                fontWeight: 800, fontSize: '13px', textDecoration: 'none'
              }}
            >
              <span>Khám phá ngay</span>
              <ArrowRight size={14} />
            </Link>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {recentOrders.map((order) => {
              const itemsList = order.items || [];
              const itemsCount = itemsList.reduce((s, i) => s + (Number(i.quantity) || 1), 0);
              const isShipping = order.status === 'SHIPPING';
              const isDelivered = order.status === 'DELIVERED';

              return (
                <div
                  key={order.id}
                  onClick={() => navigate(`/orders/${order.id}`)}
                  style={{
                    background: '#ffffff',
                    border: '1px solid var(--border)',
                    borderRadius: '16px',
                    padding: '16px 18px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.borderColor = '#93c5fd';
                    e.currentTarget.style.boxShadow = '0 4px 14px rgba(0,0,0,0.05)';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.borderColor = 'var(--border)';
                    e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.02)';
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{
                        fontFamily: 'monospace', fontWeight: 800, fontSize: '14px',
                        color: '#0a3d8f', background: '#eff6ff', padding: '2px 8px', borderRadius: '6px'
                      }}>
                        #{order.orderCode}
                      </span>
                      <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                        {order.createdAt ? formatDate(order.createdAt) : '—'}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span className={`status-badge ${order.status ? 'status-' + order.status.toLowerCase() : ''}`} style={{ fontSize: 11, padding: '3px 10px', borderRadius: '999px', fontWeight: 700 }}>
                        {statusLabel[order.status] || order.status}
                      </span>

                      {isShipping && (
                        <span style={{
                          fontSize: '11px', padding: '2px 8px', borderRadius: '6px',
                          background: '#ecfdf5', color: '#047857', fontWeight: 800,
                          display: 'inline-flex', alignItems: 'center', gap: 4
                        }}>
                          <Truck size={12} />
                          <span>Đang giao</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Order items row */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                    <div style={{ flex: 1, minWidth: 200 }}>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                        {itemsList.length > 0
                          ? itemsList.map((i) => i.productName).join(', ')
                          : `${itemsCount} sản phẩm công nghệ`}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                        Giao đến: {order.shippingAddress || 'Địa chỉ mặc định'}
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '16px', fontWeight: 900, color: 'var(--text-primary)' }}>
                          {formatPrice(order.totalAmount)}
                        </div>
                        <div style={{ fontSize: '11px', color: order.paymentStatus === 'PAID' ? '#047857' : '#b45309', fontWeight: 700 }}>
                          {order.paymentStatus === 'PAID' ? '✓ Đã thanh toán' : 'Chờ thanh toán COD'}
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        {isShipping && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/orders/${order.id}#live-delivery-map-section`);
                            }}
                            style={{
                              padding: '6px 10px', borderRadius: '8px',
                              background: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0',
                              fontSize: '11px', fontWeight: 800, cursor: 'pointer',
                              display: 'inline-flex', alignItems: 'center', gap: 4
                            }}
                            title="Theo dõi định vị GPS của đơn này"
                          >
                            <Navigation size={12} />
                            <span>GPS</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/orders/${order.id}`);
                          }}
                          style={{
                            padding: '6px 12px', borderRadius: '8px',
                            background: '#f8fafc', color: 'var(--text-primary)', border: '1px solid var(--border)',
                            fontSize: '12px', fontWeight: 700, cursor: 'pointer',
                            display: 'inline-flex', alignItems: 'center', gap: 4
                          }}
                        >
                          <span>Chi tiết</span>
                          <ChevronRight size={13} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── CARD 6: Trust & Customer Assurance Banner ── */}
      <div style={{
        background: '#f8fafc',
        border: '1px solid var(--border)',
        borderRadius: '16px',
        padding: '16px 20px',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '16px',
        fontSize: '12px',
        color: 'var(--text-secondary)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <ShieldCheck size={20} style={{ color: '#0a3d8f', flexShrink: 0 }} />
          <div>
            <strong style={{ color: 'var(--text-primary)', display: 'block' }}>100% Chính Hãng</strong>
            <span>Cam kết sản phẩm mới và bảo hành tiêu chuẩn</span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <RotateCcw size={20} style={{ color: '#059669', flexShrink: 0 }} />
          <div>
            <strong style={{ color: 'var(--text-primary)', display: 'block' }}>Đổi mới 15 ngày</strong>
            <span>Hỗ trợ 1 đổi 1 nếu phát sinh lỗi nhà sản xuất</span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Truck size={20} style={{ color: '#d97706', flexShrink: 0 }} />
          <div>
            <strong style={{ color: 'var(--text-primary)', display: 'block' }}>Giao nhanh hỏa tốc</strong>
            <span>Shipper H&G giao hàng nội thành từ 2–4 giờ</span>
          </div>
        </div>
      </div>

      {/* Lightbox Modal: Xem ảnh đối soát POD */}
      {previewProof && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            background: 'rgba(0, 0, 0, 0.85)', backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px'
          }}
          onClick={() => setPreviewProof(null)}
        >
          <div
            style={{ position: 'relative', maxWidth: '600px', width: '100%', textAlign: 'center' }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setPreviewProof(null)}
              style={{
                position: 'absolute', top: '-40px', right: 0,
                background: 'none', border: 'none', color: '#ffffff', cursor: 'pointer', padding: '6px'
              }}
            >
              <X size={28} />
            </button>
            <img
              src={resolveImageUrl(previewProof)}
              alt="Ảnh bằng chứng giao hàng"
              style={{ maxHeight: '75vh', maxWidth: '100%', borderRadius: '16px', boxShadow: '0 20px 40px rgba(0,0,0,0.5)' }}
            />
            <div style={{ color: '#ffffff', fontSize: '13px', marginTop: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '14px' }}>
              <span>📸 Biên bản & Bằng chứng bàn giao kiện hàng (POD)</span>
              <a
                href={resolveImageUrl(previewProof)}
                target="_blank"
                rel="noreferrer"
                download="POD_Customer.jpg"
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '4px',
                  color: '#38bdf8', textDecoration: 'none', fontWeight: 600, fontSize: '12px'
                }}
              >
                <span>Mở ảnh gốc</span>
                <ExternalLink size={12} />
              </a>
            </div>
          </div>
        </div>
      )}
    </AccountLayout>
  );
}
