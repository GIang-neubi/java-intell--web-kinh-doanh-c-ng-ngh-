import { X, ShoppingCart, Star, Heart, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import Modal from './Modal.jsx';
import { formatPrice, discountPercent } from '../utils/helpers';
import { resolveImageUrl } from '../utils/imageUrl';
import { useCartStore } from '../store';
import { useAuthStore } from '../store';
import { useToast } from './Toast.jsx';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function QuickView({ product, onClose }) {
  const addItem = useCartStore((s) => s.addItem);
  const { isAuthenticated } = useAuthStore();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [qty, setQty] = useState(1);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    // Reset modal state when product changes
    // eslint-disable-next-line react/set-state-in-effect
    setQty(1);
    // eslint-disable-next-line react/set-state-in-effect
    setAdding(false);
  }, [product?.id]);

  if (!product) return null;

  const oldPrice = product.price ?? 0;
  const sellPrice = product.salePrice != null ? product.salePrice : oldPrice;
  const discount = product.salePrice != null ? discountPercent(oldPrice, product.salePrice) : 0;
  const inStock = product.stock > 0 && product.status;
  const brandName = product.brandName ?? product.brand ?? '';
  const imageUrl = resolveImageUrl(product.image);

  const handleAddToCart = () => {
    if (!inStock) return;
    setAdding(true);
    addItem({ ...product, price: sellPrice }, qty);
    setTimeout(() => {
      setAdding(false);
      showToast('Đã thêm vào giỏ hàng', 'success');
    }, 400);
  };

  const handleWishlist = () => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    showToast('Tính năng yêu thích đang phát triển', 'info');
  };

  return (
    <Modal open={!!product} onClose={onClose}>
      <div style={{ position: 'relative', maxWidth: 680, margin: '0 auto' }}>
        <button
          type="button"
          onClick={onClose}
          aria-label="Đóng"
          style={{ position: 'absolute', top: 12, right: 12, zIndex: 10, width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', border: '1px solid var(--border)', background: '#fff', cursor: 'pointer', color: 'var(--text-muted)' }}
        >
          <X size={16} />
        </button>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-6)' }}>
          {/* Image */}
          <div style={{ background: '#f9fafb', borderRadius: 'var(--radius-xl)', aspectRatio: '1', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', border: '1px solid var(--border)' }}>
            {imageUrl ? (
              <img src={imageUrl} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'contain', padding: 'var(--space-8)' }} />
            ) : (
              <div style={{ fontSize: 48, color: 'var(--text-muted)', opacity: 0.3 }}>📷</div>
            )}
          </div>

          {/* Info */}
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', paddingRight: 'var(--space-4)' }}>
            {brandName && (
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 8 }}>
                {brandName}
              </div>
            )}
            <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 700, lineHeight: 1.4, color: 'var(--text-primary)', margin: '0 0 var(--space-3) 0', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
              {product.name}
            </h3>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 'var(--space-4)' }}>
              {[1,2,3,4,5].map(s => <Star key={s} size={12} fill={s <= 3 ? '#111' : 'none'} color={s <= 3 ? '#111' : '#e5e7eb'} />)}
              <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>({product.reviewCount || 0})</span>
            </div>

            <div style={{ marginBottom: 'var(--space-4)' }}>
              <span style={{ fontSize: 28, fontWeight: 800, color: 'var(--primary)', letterSpacing: '-0.03em' }}>{formatPrice(sellPrice)}</span>
              {product.salePrice != null && (
                <span style={{ fontSize: 14, color: 'var(--text-muted)', textDecoration: 'line-through', marginLeft: 8 }}>{formatPrice(oldPrice)}</span>
              )}
              {discount > 0 && (
                <span style={{ fontSize: 11, fontWeight: 700, background: 'var(--primary)', color: '#fff', padding: '2px 8px', borderRadius: 'var(--radius-full)', marginLeft: 8 }}>-{discount}%</span>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 'var(--space-4)', fontSize: 13 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: inStock ? 'var(--success)' : 'var(--danger)' }} />
              <span style={{ color: inStock ? 'var(--success)' : 'var(--danger)', fontWeight: 600 }}>
                {inStock ? `Còn hàng (${product.stock})` : 'Hết hàng'}
              </span>
            </div>

            {/* Quantity */}
            {inStock && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 'var(--space-5)' }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>SL</span>
                <div className="qty-control">
                  <button className="qty-btn" onClick={() => setQty(Math.max(1, qty - 1))}><span style={{ fontSize: 14 }}>−</span></button>
                  <span style={{ width: 36, textAlign: 'center', fontSize: 14, fontWeight: 600 }}>{qty}</span>
                  <button className="qty-btn" onClick={() => setQty(qty + 1)}><span style={{ fontSize: 14 }}>+</span></button>
                </div>
              </div>
            )}

            {/* Actions */}
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={handleAddToCart}
                disabled={!inStock || adding}
                style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '12px 20px', borderRadius: 'var(--radius-lg)', background: inStock ? 'var(--primary)' : '#e5e7eb', color: inStock ? '#fff' : 'var(--text-muted)', border: 'none', fontWeight: 700, fontSize: 13, cursor: inStock ? 'pointer' : 'not-allowed', transition: 'opacity 0.2s', opacity: adding ? 0.7 : 1 }}
              >
                <ShoppingCart size={14} /> {adding ? 'Đang thêm...' : 'Thêm vào giỏ'}
              </button>
              <button
                onClick={handleWishlist}
                title="Yêu thích"
                style={{ width: 42, height: 42, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)', background: '#fff', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <Heart size={16} />
              </button>
            </div>

            <Link to={`/products/${product.id}`} onClick={onClose} style={{ marginTop: 'var(--space-4)', fontSize: 13, fontWeight: 600, color: 'var(--primary)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
              Xem chi tiết <ChevronRight size={14} />
            </Link>
          </div>
        </div>
      </div>
    </Modal>
  );
}

