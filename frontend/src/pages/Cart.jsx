import { Link } from 'react-router-dom';
import { Trash2, Plus, Minus, ShoppingBag, ArrowLeft, ChevronRight, Shield, Truck, RotateCcw, AlertCircle, Heart } from 'lucide-react';
import { useCartStore } from '../store';
import { useWishlistStore } from '../store';
import { useAuthStore } from '../store';
import { formatPrice } from '../utils/helpers';
import { resolveImageUrl } from '../utils/imageUrl';
import { useToast } from '../components/Toast';
import { useState, useCallback } from 'react';

export default function Cart() {
  const cartStore = useCartStore();
  const items = Array.isArray(cartStore.items) ? cartStore.items : [];
  const { updateQty, removeItem, clearCart } = cartStore;
  const { toggle: toggleWishlist } = useWishlistStore();
  const { isAuthenticated } = useAuthStore();
  const { showToast } = useToast();
  const [updatingIds, setUpdatingIds] = useState(new Set());
  const [removingId, setRemovingId] = useState(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const totalPrice = items.reduce((s, i) => s + (Number(i.price) || 0) * (Number(i.quantity) || 1), 0);
  const totalItems = items.reduce((s, i) => s + (Number(i.quantity) || 0), 0);

  const handleUpdateQty = useCallback((id, newQty, maxStock) => {
    if (newQty < 1) { removeItem(id); showToast('Đã xóa khỏi giỏ hàng', 'info'); return; }
    const safeStock = maxStock > 0 ? maxStock : 999;
    if (newQty > safeStock) { showToast(`Chỉ còn ${safeStock} sản phẩm trong kho`, 'warning'); return; }
    setUpdatingIds(prev => new Set([...prev, id]));
    updateQty(id, newQty);
    setTimeout(() => setUpdatingIds(prev => { const s = new Set(prev); s.delete(id); return s; }), 300);
  }, [updateQty, removeItem, showToast]);

  const handleRemove = useCallback((id, name) => {
    setRemovingId(id);
    setTimeout(() => {
      removeItem(id);
      showToast(`Đã xóa "${name}" khỏi giỏ hàng`, 'success');
      setRemovingId(null);
    }, 150);
  }, [removeItem, showToast]);

  const handleClearCart = useCallback(() => {
    clearCart();
    showToast('Đã xóa toàn bộ giỏ hàng', 'info');
    setShowClearConfirm(false);
  }, [clearCart, showToast]);

  const handleAddToWishlist = useCallback((product) => {
    if (!isAuthenticated) {
      showToast('Vui lòng đăng nhập để sử dụng yêu thích', 'info');
      return;
    }
    toggleWishlist(product.id);
    showToast('Đã thêm vào yêu thích', 'success');
  }, [isAuthenticated, toggleWishlist, showToast]);

  /* ── Empty state ── */
  if (items.length === 0) {
    return (
      <main className="page-content" style={{ background: 'var(--bg)' }}>
        <div className="container" style={{ textAlign: 'center', paddingTop: 'var(--space-40)', paddingBottom: 'var(--space-40)' }}>
          <ShoppingBag size={48} style={{ margin: '0 auto var(--space-6)', color: 'var(--text-muted)', opacity: 0.3 }} />
          <h2 style={{ fontSize: 'var(--text-2xl)', fontWeight: 800, letterSpacing: '-0.03em', marginBottom: 'var(--space-3)', color: 'var(--text-primary)' }}>
            Giỏ hàng trống
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)', marginBottom: 'var(--space-8)' }}>
            Thêm sản phẩm để bắt đầu đơn hàng.
          </p>
          <Link to="/products" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '12px 28px', borderRadius: 'var(--radius-full)', background: 'var(--primary)', color: '#fff', fontWeight: 600, fontSize: 'var(--text-sm)' }}>
            <ArrowLeft size={15} /> Tiếp tục mua sắm
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="page-content" style={{ background: 'var(--bg)' }}>
      <div className="container">

        {/* Breadcrumb */}
        <nav style={{ display: 'flex', alignItems: 'center', gap: 6, padding: 'var(--space-6) 0', fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          <Link to="/" style={{ color: 'var(--text-muted)' }}>Trang chủ</Link>
          <ChevronRight size={12} />
          <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>Giỏ hàng</span>
        </nav>

        <div className="cart-layout">

          {/* LEFT: Items */}
          <div>
            <div className="cart-items-header">
              <h1 className="cart-items-title">
                Giỏ hàng
                <span style={{ fontSize: 'var(--text-lg)', fontWeight: 400, color: 'var(--text-muted)', marginLeft: 10 }}>
                  ({totalItems} {totalItems === 1 ? 'sản phẩm' : 'sản phẩm'})
                </span>
              </h1>
              <button className="cart-clear-btn" onClick={() => setShowClearConfirm(true)} disabled={items.length === 0}>
                Xóa tất cả
              </button>
            </div>

            {/* Column headers */}
            <div className="cart-columns">
              <span>Sản phẩm</span>
              <span style={{ textAlign: 'center' }}>Số lượng</span>
              <span style={{ textAlign: 'right' }}>Thành tiền</span>
              <span />
            </div>

            {/* Item rows */}
            {items.map((item) => {
              const maxStock = (item.stock != null && item.stock > 0) ? Number(item.stock) : 999;
              const isUpdating = updatingIds.has(item.id);
              const isRemoving = removingId === item.id;
              const isLowStock = maxStock > 0 && maxStock <= 5;
              const isOutOfStock = item.status === false || (item.stock !== undefined && item.stock === 0);
              const itemTotal = (item.price || 0) * (item.quantity || 1);

              return (
                <div className="cart-item" key={item.id} style={{ opacity: isRemoving ? 0.4 : 1, transition: 'opacity 0.2s' }}>

                  {/* Product info */}
                  <div className="cart-item-product">
                    <Link to={`/products/${item.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                      <img src={resolveImageUrl(item.image)} alt={item.name} className="cart-item-img" onError={(e) => { e.target.style.display = 'none'; }} />
                    </Link>
                    <div className="cart-item-info">
                      {(item.brandName || item.brand) && <div className="cart-item-brand">{item.brandName || item.brand}</div>}
                      <Link to={`/products/${item.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                        <div className="cart-item-name">{item.name}</div>
                      </Link>
                      <div className="cart-item-price">{formatPrice(item.price)}</div>
                      {(isLowStock || isOutOfStock) && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                          <AlertCircle size={12} style={{ color: isOutOfStock ? 'var(--danger)' : '#d97706', flexShrink: 0 }} />
                          <span style={{ fontSize: 11, fontWeight: 600, color: isOutOfStock ? 'var(--danger)' : '#d97706' }}>
                            {isOutOfStock ? 'Hết hàng' : `Chỉ còn ${maxStock} sản phẩm`}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Qty control */}
                  <div style={{ display: 'flex', justifyContent: 'center' }}>
                    <div className="qty-control">
                      <button
                        className="qty-btn"
                        disabled={isUpdating || item.quantity <= 1 || isOutOfStock}
                        onClick={() => handleUpdateQty(item.id, item.quantity - 1, maxStock)}
                        aria-label="Giảm số lượng"
                      >
                        <Minus size={12} />
                      </button>
                      <input
                        className="qty-value"
                        value={item.quantity}
                        disabled={isUpdating || isOutOfStock}
                        onChange={(e) => {
                          const v = parseInt(e.target.value, 10);
                          if (!isNaN(v) && v >= 1) {
                            handleUpdateQty(item.id, Math.min(maxStock, v), maxStock);
                          }
                        }}
                        onBlur={(e) => {
                          const v = parseInt(e.target.value, 10);
                          if (isNaN(v) || v < 1) {
                            handleUpdateQty(item.id, 1, maxStock);
                          }
                        }}
                        aria-label="Số lượng"
                      />
                      <button
                        className="qty-btn"
                        disabled={isUpdating || item.quantity >= maxStock || isOutOfStock}
                        onClick={() => handleUpdateQty(item.id, item.quantity + 1, maxStock)}
                        aria-label="Tăng số lượng"
                      >
                        <Plus size={12} />
                      </button>
                    </div>
                  </div>

                  {/* Subtotal */}
                  <div className="cart-item-subtotal" style={{ color: isOutOfStock ? 'var(--text-muted)' : 'var(--text-primary)' }}>
                    {formatPrice(itemTotal)}
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                    <button
                      type="button"
                      className="cart-wishlist-btn"
                      onClick={() => handleAddToWishlist(item)}
                      title="Thêm vào yêu thích"
                      disabled={isRemoving}
                    >
                      <Heart size={16} />
                    </button>
                    <button
                      className="cart-remove-btn"
                      onClick={() => handleRemove(item.id, item.name)}
                      disabled={isRemoving}
                      title="Xóa khỏi giỏ hàng"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              );
            })}

            {/* Continue shopping */}
            <div style={{ marginTop: 'var(--space-6)' }}>
              <Link to="/products" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-secondary)', transition: 'color .2s' }} onMouseOver={e => e.currentTarget.style.color = 'var(--text-primary)'} onMouseOut={e => e.currentTarget.style.color = 'var(--text-secondary)'}>
                <ArrowLeft size={15} /> Tiếp tục mua sắm
              </Link>
            </div>
          </div>

          {/* RIGHT: Order Summary */}
          <div className="cart-summary-box">
            <div className="cart-summary-title">Tóm tắt đơn hàng</div>

            <div className="cart-summary-row">
              <span>Tạm tính ({totalItems} sản phẩm)</span>
              <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{formatPrice(totalPrice)}</span>
            </div>

            <div className="cart-summary-row">
              <span>Vận chuyển</span>
              <span style={{ fontWeight: 600, color: 'var(--success)' }}>Miễn phí</span>
            </div>

            <div className="cart-summary-row">
              <span>Giảm giá</span>
              <span style={{ color: 'var(--text-muted)' }}>—</span>
            </div>

            <div className="cart-summary-row total">
              <span>Tổng cộng</span>
              <span>{formatPrice(totalPrice)}</span>
            </div>

            {/* Trust badges */}
            <div className="cart-trust" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 'var(--space-3)', marginTop: 'var(--space-6)', paddingTop: 'var(--space-4)', borderTop: '1px solid var(--border)' }}>
              {[
                { Icon: Shield, label: 'Bảo hành chính hãng' },
                { Icon: Truck, label: 'Giao hàng toàn quốc' },
                { Icon: RotateCcw, label: 'Đổi trả 30 ngày' },
                { label: 'Thanh toán an toàn', emoji: '🔒' },
              ].map(({ Icon, label, emoji }) => (
                <div key={label} className="cart-trust-item" style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                  <div className="cart-trust-icon" style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--bg)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {Icon ? <Icon size={12} /> : <span style={{ fontSize: 11 }}>{emoji}</span>}
                  </div>
                  <span>{label}</span>
                </div>
              ))}
            </div>

            {/* Checkout CTA */}
            <Link to="/checkout" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%', marginTop: 'var(--space-6)', padding: '14px 20px', borderRadius: 'var(--radius-lg)', background: 'var(--primary)', color: '#fff', fontWeight: 700, fontSize: 'var(--text-sm)', transition: 'opacity .2s' }} onMouseOver={e => e.currentTarget.style.opacity = '0.85'} onMouseOut={e => e.currentTarget.style.opacity = '1'}>
              Tiến hành thanh toán <ChevronRight size={16} />
            </Link>

            {/* Trust note */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 'var(--space-4)', fontSize: '12px', color: 'var(--text-muted)' }}>
              <svg width="12" height="14" viewBox="0 0 12 14" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="0.5" y="5.5" width="11" height="8" rx="1.5" stroke="currentColor"/><path d="M3 5V4C3 2.34315 4.34315 1 6 1C7.65685 1 9 2.34315 9 4V5" stroke="currentColor" strokeLinecap="round"/></svg>
              Thanh toán an toàn & mã hóa
            </div>
          </div>
        </div>
      </div>

      {/* Clear cart confirmation modal */}
      {showClearConfirm && (
        <div className="modal-overlay" onClick={() => setShowClearConfirm(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 'var(--space-4)' }}>
          <div className="modal-content" style={{ background: 'var(--bg-card)', borderRadius: 'var(--radius-xl)', padding: 'var(--space-6)', maxWidth: 400, width: '100%', boxShadow: 'var(--shadow-lg)' }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 'var(--text-lg)', fontWeight: 700, marginBottom: 'var(--space-3)' }}>Xóa toàn bộ giỏ hàng?</div>
            <div style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-6)', fontSize: 'var(--text-sm)' }}>Hành động này không thể hoàn tác. Tất cả {totalItems} sản phẩm sẽ bị xóa.</div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => setShowClearConfirm(false)} className="btn btn-ghost" style={{ borderRadius: 'var(--radius-full)', padding: '10px 20px' }}>Hủy</button>
              <button onClick={handleClearCart} className="btn btn-danger" style={{ borderRadius: 'var(--radius-full)', padding: '10px 20px' }}>Xóa tất cả</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}