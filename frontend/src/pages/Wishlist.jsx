import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Heart, ShoppingCart, Trash2, Package } from 'lucide-react';
import { useWishlistStore, useCartStore } from '../store';
import api from '../api/client';
import { formatPrice } from '../utils/helpers';
import { resolveImageUrl } from '../utils/imageUrl';
import AccountLayout from '../layouts/AccountLayout';
import { useToast } from '../components/Toast';

export default function Wishlist() {
  const { ids, toggle } = useWishlistStore();
  const { addItem } = useCartStore();
  const { showToast } = useToast();

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [addingIds, setAddingIds] = useState(new Set());
  const [removingId, setRemovingId] = useState(null);

  const fetchProducts = useCallback(async () => {
    if (ids.length === 0) { setProducts([]); return; }
    setLoading(true);
    try {
      const results = await Promise.all(
        ids.map(id => api.get(`/products/${id}`).then(r => r.data?.data).catch(() => null))
      );
      setProducts(results.filter(Boolean));
    } finally {
      setLoading(false);
    }
  }, [ids]);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  const handleAddToCart = useCallback((product) => {
    if (!product.stock || product.stock === 0) {
      showToast('Sản phẩm đã hết hàng', 'warning');
      return;
    }
    addItem(product, 1);
    setAddingIds(prev => new Set([...prev, product.id]));
    showToast('Đã thêm vào giỏ hàng', 'success');
    setTimeout(() => setAddingIds(prev => { const s = new Set(prev); s.delete(product.id); return s; }), 2000);
  }, [addItem, showToast]);

  const handleRemove = useCallback((id, name) => {
    setRemovingId(id);
    setTimeout(() => {
      toggle(id);
      showToast(`Đã xóa "${name}" khỏi yêu thích`, 'info');
      setRemovingId(null);
    }, 150);
  }, [toggle, showToast]);

  return (
    <AccountLayout activeTab="wishlist">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-6)', paddingBottom: 'var(--space-4)', borderBottom: '1px solid var(--border)' }}>
        <h1 style={{ fontSize: 'var(--text-xl)', fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
          Danh sách yêu thích
          {ids.length > 0 && <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)', letterSpacing: 0 }}>{ids.length} sản phẩm</span>}
        </h1>
      </div>

      {loading && (
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
          <div className="spinner" style={{ margin: '0 auto 16px' }} />
          <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Đang tải danh sách yêu thích...</div>
        </div>
      )}

      {!loading && ids.length === 0 && (
        <div style={{ textAlign: 'center', padding: '80px 0' }}>
          <Heart size={48} style={{ color: 'var(--border)', margin: '0 auto 16px' }} />
          <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>Danh sách yêu thích trống</div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 24 }}>
            Lưu sản phẩm bạn thích bằng cách nhấn biểu tượng tim.
          </div>
          <Link to="/products" className="btn btn-primary" style={{ padding: '12px 24px', borderRadius: 'var(--radius-lg)', fontWeight: 700 }}>
            Khám phá sản phẩm
          </Link>
        </div>
      )}

      {!loading && products.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          {products.map(product => {
            const added = addingIds.has(product.id);
            const isRemoving = removingId === product.id;
            const imgSrc = resolveImageUrl(product.images?.[0] || product.image || '');
            const sellPrice = product.salePrice != null ? product.salePrice : product.price;
            const origPrice = product.price;
            const hasDiscount = product.salePrice != null && product.salePrice < product.price;
            const discount = hasDiscount ? Math.round(((origPrice - product.salePrice) / origPrice) * 100) : 0;
            const inStock = product.stock > 0 && product.status;
            const isLowStock = product.stock > 0 && product.stock <= 5;

            return (
              <div
                key={product.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 16,
                  padding: '16px 0',
                  borderBottom: '1px solid var(--border)',
                  opacity: isRemoving ? 0.4 : 1,
                  transition: 'opacity 0.2s'
                }}
              >
                {/* Image */}
                <Link to={`/products/${product.id}`} style={{ flexShrink: 0, textDecoration: 'none', color: 'inherit' }}>
                  <div style={{ width: 80, height: 80, borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)', background: '#f9fafb', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 8, transition: 'border-color .2s' }}>
                    {imgSrc
                      ? <img src={imgSrc} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'contain' }} onError={(e) => { e.target.style.display = 'none'; }} />
                      : <Package size={28} style={{ color: 'var(--text-muted)' }} />
                    }
                  </div>
                </Link>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  {product.brandName && (
                    <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 4 }}>
                      {product.brandName}
                    </div>
                  )}
                  <Link to={`/products/${product.id}`} style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)', textDecoration: 'none', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {product.name}
                  </Link>
                  <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 800, fontSize: 16, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
                      {formatPrice(sellPrice)}
                    </span>
                    {hasDiscount && (
                      <span style={{ fontSize: 13, color: 'var(--text-muted)', textDecoration: 'line-through' }}>
                        {formatPrice(origPrice)}
                      </span>
                    )}
                    {hasDiscount && (
                      <span style={{ fontSize: 11, fontWeight: 700, background: 'var(--primary)', color: '#fff', padding: '2px 8px', borderRadius: 'var(--radius-full)' }}>
                        -{discount}%
                      </span>
                    )}
                    {!inStock && (
                      <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--danger)', background: '#fef2f2', padding: '2px 8px', borderRadius: 'var(--radius-full)' }}>
                        Hết hàng
                      </span>
                    )}
                    {inStock && isLowStock && (
                      <span style={{ fontSize: 11, fontWeight: 600, color: '#d97706', background: '#fffbeb', padding: '2px 8px', borderRadius: 'var(--radius-full)' }}>
                        Còn {product.stock}
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                  <button
                    type="button"
                    onClick={() => handleAddToCart(product)}
                    disabled={added || !inStock}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      padding: '10px 16px', borderRadius: 'var(--radius-lg)',
                      background: added ? 'var(--success)' : inStock ? 'var(--text-primary)' : '#e5e7eb',
                      color: '#fff', border: 'none', cursor: inStock ? 'pointer' : 'not-allowed',
                      fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em',
                      transition: 'background .2s', opacity: added || !inStock ? 0.7 : 1,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    <ShoppingCart size={14} />
                    {added ? 'Đã thêm!' : 'Thêm vào giỏ'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRemove(product.id, product.name)}
                    disabled={isRemoving}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 38, height: 38, borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: '#fff', cursor: 'pointer', color: 'var(--text-muted)', transition: 'all .2s' }}
                    title="Xóa khỏi yêu thích"
                    onMouseOver={e => { e.currentTarget.style.background = '#fef2f2'; e.currentTarget.style.borderColor = '#f87171'; e.currentTarget.style.color = '#ef4444'; }}
                    onMouseOut={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-muted)'; }}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </AccountLayout>
  );
}