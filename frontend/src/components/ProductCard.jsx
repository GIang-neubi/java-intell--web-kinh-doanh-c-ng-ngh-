import { useCallback, useState } from 'react';
import { Link } from 'react-router-dom';
import { Heart, ShoppingCart, Star, Eye } from 'lucide-react';
import { formatPrice, discountPercent } from '../utils/helpers';
import { resolveImageUrl } from '../utils/imageUrl';
import { useCartStore } from '../store';
import { useAuthStore } from '../store';
import { useToast } from './Toast.jsx';
import { useNavigate } from 'react-router-dom';
import QuickView from './QuickView';

export default function ProductCard({ product }) {
  const addItem = useCartStore((s) => s.addItem);
  const { isAuthenticated } = useAuthStore();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [quickView, setQuickView] = useState(false);

  const oldPrice = product.price ?? 0;
  const sellPrice = product.salePrice != null ? product.salePrice : oldPrice;
  const brandName = product.brandName ?? product.brand ?? '';
  const discount = product.salePrice != null ? discountPercent(oldPrice, product.salePrice) : 0;
  const inStock = product.stock > 0 && product.status;
  const imageUrl = resolveImageUrl(product.image);

  const handleAddToCart = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    addItem({ ...product, price: sellPrice }, 1);
    showToast('Đã thêm vào giỏ hàng', 'success');
  }, [addItem, product, sellPrice, showToast]);

  const handleWishlist = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    showToast('Tính năng yêu thích đang phát triển', 'info');
  }, [isAuthenticated, navigate, showToast]);

  const stockStatus = !product.status
    ? { label: 'Ngừng bán', color: 'var(--danger)', bg: '#fef2f2' }
    : product.stock === 0
      ? { label: 'Hết hàng', color: 'var(--danger)', bg: '#fef2f2' }
      : product.stock <= 5
        ? { label: `Còn ${product.stock}`, color: '#d97706', bg: '#fffbeb' }
        : { label: 'Còn hàng', color: 'var(--success)', bg: '#f0fdf4' };

  return (
    <>
      <div className="product-card" style={{ position: 'relative' }}>
        <Link to={`/products/${product.id}`} style={{ display: 'block', textDecoration: 'none', color: 'inherit' }}>
          <div className="product-card-img-wrap">
            <img src={imageUrl} alt={product.name} className="product-card-img" loading="lazy" onError={(e) => { e.target.style.display = 'none'; }} />
            <div className="product-card-badges">
              {discount > 0 && <span className="badge badge-sale">-{discount}%</span>}
              {!product.status && <span className="badge badge-stock" style={{ background: 'var(--danger)', color: '#fff' }}>Ngừng bán</span>}
            </div>
            <button
              className="product-card-wishlist"
              onClick={handleWishlist}
              title="Yêu thích"
              aria-label="Thêm vào yêu thích"
            >
              <Heart size={14} />
            </button>
          </div>
        </Link>
        <div className="product-card-body">
          <div className="product-card-brand">{brandName}</div>
          <Link to={`/products/${product.id}`} style={{ display: 'block', textDecoration: 'none', color: 'inherit' }}>
            <div className="product-card-name">{product.name}</div>
          </Link>
          <div className="product-card-rating">
            {[1,2,3,4,5].map(s => (
              <Star key={s} size={10} fill={s <= Math.round(product.rating || 0) ? '#111' : 'transparent'} color={s <= Math.round(product.rating || 0) ? '#111' : '#e5e7eb'} />
            ))}
            <span className="product-card-rating-count">({product.reviewCount || 0})</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 'var(--space-2)' }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: stockStatus.color, background: stockStatus.bg, padding: '2px 8px', borderRadius: 'var(--radius-full)', whiteSpace: 'nowrap' }}>
              {stockStatus.label}
            </span>
          </div>
          <div className="product-card-price">
            <div className="product-card-price-new">{formatPrice(sellPrice)}</div>
            {product.salePrice != null && oldPrice > sellPrice && (
              <div className="product-card-price-old">{formatPrice(oldPrice)}</div>
            )}
          </div>
          <div style={{ display: 'flex', gap: 6, marginTop: 'var(--space-3)' }}>
            <button className="product-card-add" onClick={handleAddToCart} aria-label="Thêm vào giỏ hàng" disabled={!inStock} style={!inStock ? { opacity: 0.4, cursor: 'not-allowed' } : undefined}>
              <ShoppingCart size={12} style={{ verticalAlign: 'middle', marginRight: 4 }} />Thêm vào giỏ
            </button>
            <button
              className="product-card-add"
              onClick={() => setQuickView(true)}
              aria-label="Xem nhanh"
              style={{ padding: '0 12px' }}
            >
              <Eye size={12} />
            </button>
          </div>
        </div>
      </div>

      {quickView && <QuickView product={product} onClose={() => setQuickView(false)} />}
    </>
  );
}
