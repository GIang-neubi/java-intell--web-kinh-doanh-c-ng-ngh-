import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Star, ShoppingCart, Heart, Shield, Truck, RefreshCw, Plus, Minus, Send, ChevronRight, ArrowLeft, ZoomIn, X } from 'lucide-react';
import { fetchProductById, fetchProducts } from '../api/products';
import { formatPrice, formatDate, discountPercent } from '../utils/helpers';
import { resolveImageUrl } from '../utils/imageUrl';
import { useCartStore, useAuthStore, useWishlistStore } from '../store';
import ProductCard from '../components/ProductCard';
import RecentlyViewed from '../components/RecentlyViewed';
import { useToast } from '../components/Toast';
import api, { getErrorMessage } from '../api/client';

function StarDisplay({ value, size = 14 }) {
  return (
    <div style={{ display: 'flex', gap: 2 }}>
      {[1, 2, 3, 4, 5].map((s) => (
        <Star key={s} size={size} fill={s <= Math.round(value) ? '#111' : 'none'} color={s <= Math.round(value) ? '#111' : '#d1d5db'} strokeWidth={1.5} />
      ))}
    </div>
  );
}

function ImageLightbox({ src, alt, productName, onClose }) {
  const overlayRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handler);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  return (
    <div
      ref={overlayRef}
      style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`${productName} - Phóng to`}
    >
      <div style={{ position: 'relative', maxWidth: '90vw', maxHeight: '90vh' }} onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          onClick={onClose}
          aria-label="Đóng"
          style={{ position: 'absolute', top: -48, right: 0, background: 'none', border: 'none', color: '#fff', cursor: 'pointer', padding: 8 }}
        >
          <X size={28} />
        </button>
        <img src={src} alt={alt} style={{ maxWidth: '90vw', maxHeight: '80vh', objectFit: 'contain', borderRadius: 8 }} />
      </div>
    </div>
  );
}

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const addItem = useCartStore((s) => s.addItem);
  const { isAuthenticated } = useAuthStore();
  const wishlistIds = useWishlistStore((s) => s.ids);
  const toggleWishlist = useWishlistStore((s) => s.toggle);
  const setWishlistIds = useWishlistStore((s) => s.setIds);
  const { showToast } = useToast();

  const [product, setProduct] = useState(null);
  const [related, setRelated] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [qty, setQty] = useState(1);
  const [activeTab, setActiveTab] = useState('desc');
  const [added, setAdded] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  // Reviews
  const [reviews, setReviews] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [myRating, setMyRating] = useState(0);
  const [myComment, setMyComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [reviewError, setReviewError] = useState('');
  const [reviewSuccess, setReviewSuccess] = useState('');
  const [alreadyReviewed, setAlreadyReviewed] = useState(false);

  const loadReviews = useCallback(async () => {
    if (!id) return;
    setReviewsLoading(true);
    try {
      const { data } = await api.get(`/reviews/product/${id}`);
      if (data.success) setReviews(data.data || []);
    } catch { /* ignore */ }
    finally { setReviewsLoading(false); }
  }, [id]);

  const checkAlreadyReviewed = useCallback(async () => {
    if (!isAuthenticated || !id) return;
    try {
      const { data } = await api.get(`/reviews/product/${id}/mine`);
      if (data.success) setAlreadyReviewed(data.data);
    } catch { /* ignore */ }
  }, [id, isAuthenticated]);

  // Track recently viewed in localStorage
  useEffect(() => {
    if (product?.id) {
      try {
        const stored = JSON.parse(localStorage.getItem('hg_recently_viewed') || '[]');
        const validIds = Array.isArray(stored) ? stored.filter((rid) => rid !== product.id).slice(0, 9) : [];
        validIds.unshift(product.id);
        localStorage.setItem('hg_recently_viewed', JSON.stringify(validIds.slice(0, 10)));
      } catch { /* ignore */ }
    }
  }, [product?.id]);

  useEffect(() => {
    let alive = true;
    // Reset state when product changes
    // eslint-disable-next-line react/set-state-in-effect
    setLoading(true); setError(''); setQty(1); setActiveTab('desc');
    // eslint-disable-next-line react/set-state-in-effect
    setReviews([]); setAlreadyReviewed(false); setMyRating(0); setMyComment('');

    fetchProductById(id)
      .then(async (p) => {
        if (!alive) return;
        setProduct(p);
        if (p.categoryId) {
          try {
            const rel = await fetchProducts({ categoryId: p.categoryId, pageSize: 6, pageNo: 0 });
            if (alive) setRelated((rel.content || []).filter((r) => r.id !== p.id).slice(0, 5));
          } catch { /* ignore */ }
        }
      })
      .catch(() => { if (alive) setError('Không tìm thấy sản phẩm này.'); })
      .finally(() => { if (alive) setLoading(false); });

    loadReviews();
    checkAlreadyReviewed();

    return () => { alive = false; };
  }, [id, loadReviews, checkAlreadyReviewed]);

  useEffect(() => {
    if (isAuthenticated) {
      api.get('/wishlist').then(({ data }) => {
        if (data.success) setWishlistIds(data.data || []);
      }).catch(() => {});
    }
  }, [isAuthenticated, setWishlistIds]);

  const handleAddToCart = () => {
    if (!product) return;
    const sellPrice = product.salePrice != null ? product.salePrice : product.price;
    addItem({ ...product, price: sellPrice }, qty);
    setAdded(true);
    showToast('Đã thêm vào giỏ hàng', 'success');
    setTimeout(() => setAdded(false), 2000);
  };

  const handleBuyNow = () => {
    if (!product) return;
    const sellPrice = product.salePrice != null ? product.salePrice : product.price;
    addItem({ ...product, price: sellPrice }, qty);
    if (isAuthenticated) {
      navigate('/checkout');
    } else {
      showToast('Vui lòng đăng nhập để tiến hành thanh toán', 'info');
      navigate('/login', { state: { from: '/checkout' } });
    }
  };

  const handleWishlistToggle = async () => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    try {
      const { data } = await api.post(`/wishlist/${id}/toggle`);
      if (data.success) {
        toggleWishlist(Number(id));
        showToast(!isWishlisted ? 'Đã thêm vào yêu thích' : 'Đã xóa khỏi yêu thích', 'success');
      }
    } catch {
      showToast('Không thể cập nhật yêu thích', 'error');
    }
  };

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    if (!myRating) { setReviewError('Vui lòng chọn số sao'); return; }
    setSubmitting(true); setReviewError('');
    try {
      await api.post(`/reviews/product/${id}`, { rating: myRating, comment: myComment.trim() || null });
      setReviewSuccess('Cảm ơn bạn đã đánh giá!');
      setMyRating(0); setMyComment('');
      setAlreadyReviewed(true);
      await loadReviews();
    } catch (err) {
      setReviewError(getErrorMessage(err, 'Đánh giá thất bại'));
    }
    finally { setSubmitting(false); }
  };

  /* ── Loading ── */
  if (loading) {
    return (
      <main className="page-content" style={{ background: 'var(--bg)' }}>
        <div className="container" style={{ textAlign: 'center', padding: '120px 0' }}>
          <div className="spinner" style={{ margin: '0 auto' }} />
        </div>
      </main>
    );
  }

  /* ── Error ── */
  if (error || !product) {
    return (
      <main className="page-content" style={{ background: 'var(--bg)' }}>
        <div className="container" style={{ textAlign: 'center', padding: '120px 0' }}>
          <div style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 24, textTransform: 'uppercase', letterSpacing: '0.1em' }}>404</div>
          <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-0.03em', marginBottom: 8 }}>{error || 'Product not found'}</div>
          <button onClick={() => navigate(-1)} style={{ marginTop: 16, display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 14, fontWeight: 600, color: 'var(--text-secondary)', background: 'none', border: 'none', cursor: 'pointer' }}>
            <ArrowLeft size={16} /> Quay lại
          </button>
        </div>
      </main>
    );
  }

  const sellPrice = product.salePrice != null ? product.salePrice : product.price;
  const discount = product.salePrice != null ? discountPercent(product.price, product.salePrice) : 0;
  const imageUrl = resolveImageUrl(product.image);
  const isWishlisted = wishlistIds.includes(Number(id));
  const avgRating = reviews.length ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1) : null;
  const inStock = product.stock > 0 && product.status;

  const TABS = [
    { key: 'desc', label: 'Mô tả' },
    { key: 'specs', label: 'Thông số' },
    { key: 'shipping', label: 'Giao hàng' },
    { key: 'reviews', label: `Đánh giá${reviews.length ? ` (${reviews.length})` : ''}` },
  ];

  return (
    <main className="page-content" style={{ background: 'var(--bg)' }}>
      <div className="container">

        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" style={{ display: 'flex', alignItems: 'center', gap: 6, padding: 'var(--space-6) 0 0', fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          <Link to="/" style={{ color: 'var(--text-muted)', transition: 'color .2s' }} onMouseOver={e => e.target.style.color = 'var(--text-primary)'} onMouseOut={e => e.target.style.color = 'var(--text-muted)'}>Trang chủ</Link>
          <ChevronRight size={12} />
          <Link to="/products" style={{ color: 'var(--text-muted)', transition: 'color .2s' }} onMouseOver={e => e.target.style.color = 'var(--text-primary)'} onMouseOut={e => e.target.style.color = 'var(--text-muted)'}>Sản phẩm</Link>
          {product.categoryName && (
            <>
              <ChevronRight size={12} />
              <Link to={`/products?categoryId=${product.categoryId}`} style={{ color: 'var(--text-muted)', transition: 'color .2s' }} onMouseOver={e => e.target.style.color = 'var(--text-primary)'} onMouseOut={e => e.target.style.color = 'var(--text-muted)'}>{product.categoryName}</Link>
            </>
          )}
          <ChevronRight size={12} />
          <span style={{ color: 'var(--text-primary)', fontWeight: 600 }} aria-current="page">{product.name}</span>
        </nav>

        {/* Main Product Layout */}
        <div className="product-detail-layout">

          {/* LEFT: Image Gallery */}
          <div className="product-images">
            <div className="product-img-main" onClick={() => imageUrl && setLightboxOpen(true)} style={{ cursor: imageUrl ? 'zoom-in' : 'default' }}>
              {imageUrl
                ? <img src={imageUrl} alt={product.name} onError={(e) => { e.target.style.display = 'none'; }} />
                : <div style={{ fontSize: 80, color: 'var(--text-muted)', opacity: 0.3 }}>📷</div>
              }
              {imageUrl && (
                <div style={{ position: 'absolute', bottom: 12, right: 12, background: 'rgba(0,0,0,0.5)', color: '#fff', padding: '6px 12px', borderRadius: 'var(--radius-full)', fontSize: 11, display: 'flex', alignItems: 'center', gap: 6, pointerEvents: 'none' }}>
                  <ZoomIn size={12} /> Phóng to
                </div>
              )}
            </div>
            {imageUrl && (
              <div className="product-img-thumbs">
                <div className="product-img-thumb active">
                  <img src={imageUrl} alt={product.name} onError={(e) => { e.target.style.display = 'none'; }} />
                </div>
              </div>
            )}
          </div>

          {/* RIGHT: Purchase Panel */}
          <div>
            {product.brandName && (
              <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 'var(--space-3)' }}>
                {product.brandName}
              </div>
            )}

            <h1 className="product-info-title">{product.name}</h1>

            {avgRating && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 'var(--space-4)', paddingBottom: 'var(--space-4)', borderBottom: '1px solid var(--border)' }}>
                <StarDisplay value={avgRating} size={14} />
                <span style={{ fontWeight: 700, fontSize: '13px', color: 'var(--text-primary)' }}>{avgRating}</span>
                <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>({reviews.length} {reviews.length === 1 ? 'đánh giá' : 'đánh giá'})</span>
              </div>
            )}

            <div className="product-info-price">
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 'var(--space-3)', flexWrap: 'wrap', marginBottom: product.salePrice != null ? 'var(--space-2)' : 0 }}>
                <div className="product-info-price-new">{formatPrice(sellPrice)}</div>
                {product.salePrice != null && (
                  <div className="product-info-price-old">{formatPrice(product.price)}</div>
                )}
                {discount > 0 && (
                  <span style={{ fontSize: '12px', fontWeight: 700, background: 'var(--primary)', color: '#fff', padding: '3px 10px', borderRadius: 'var(--radius-full)' }}>-{discount}%</span>
                )}
              </div>
              {product.salePrice != null && (
                <div style={{ fontSize: '13px', color: 'var(--success)', fontWeight: 600 }}>
                  Bạn tiết kiệm {formatPrice(product.price - product.salePrice)}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 'var(--space-5)' }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: inStock ? 'var(--success)' : 'var(--danger)' }} />
              <span style={{ fontSize: '13px', fontWeight: 600, color: inStock ? 'var(--success)' : 'var(--danger)' }}>
                {inStock ? `Còn hàng (${product.stock} sản phẩm)` : 'Hết hàng'}
              </span>
              {!product.status && (
                <span style={{ fontSize: '11px', padding: '2px 10px', background: '#fef2f2', color: 'var(--danger)', borderRadius: 'var(--radius-full)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Ngừng bán
                </span>
              )}
            </div>

            {inStock && (
              <div className="product-qty-row">
                <span className="product-qty-label">Số lượng</span>
                <div className="qty-control">
                  <button className="qty-btn" onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label="Giảm số lượng">
                    <Minus size={14} />
                  </button>
                  <input className="qty-value" value={qty} onChange={(e) => setQty(Math.max(1, Math.min(product.stock, Number(e.target.value) || 1)))} aria-label="Số lượng" />
                  <button className="qty-btn" onClick={() => setQty((q) => Math.min(product.stock, q + 1))} aria-label="Tăng số lượng">
                    <Plus size={14} />
                  </button>
                </div>
              </div>
            )}

            <div className="product-actions">
              <div className="product-actions-row">
                <button
                  onClick={handleAddToCart}
                  disabled={!inStock}
                  className="btn btn-primary"
                  style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                >
                  <ShoppingCart size={16} /> {added ? '✓ Đã thêm vào giỏ' : 'Thêm vào giỏ'}
                </button>
                <button
                  onClick={handleWishlistToggle}
                  title={isWishlisted ? 'Xóa khỏi yêu thích' : 'Thêm vào yêu thích'}
                  aria-label={isWishlisted ? 'Xóa khỏi yêu thích' : 'Thêm vào yêu thích'}
                  style={{
                    width: 52, height: 52, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    borderRadius: 'var(--radius-lg)', border: '1.5px solid var(--border)',
                    background: '#fff', color: isWishlisted ? 'var(--danger)' : 'var(--text-muted)',
                    transition: 'all 0.2s', flexShrink: 0, cursor: 'pointer'
                  }}
                >
                  <Heart size={18} fill={isWishlisted ? 'var(--danger)' : 'none'} color={isWishlisted ? 'var(--danger)' : 'currentColor'} />
                </button>
              </div>
              <button
                onClick={handleBuyNow}
                disabled={!inStock}
                className="btn btn-accent"
                style={{ width: '100%', marginTop: 8 }}
              >
                Mua ngay
              </button>
            </div>

            <div className="product-trust">
              {[
                { Icon: Shield, label: 'Bảo hành chính hãng' },
                { Icon: Truck, label: 'Giao hàng toàn quốc' },
                { Icon: RefreshCw, label: 'Đổi trả 30 ngày' },
                { label: 'Trả góp 0%', emoji: '💳' },
              ].map(({ Icon, label, emoji }) => (
                <div key={label} className="product-trust-item">
                  <div className="product-trust-icon">
                    {Icon ? <Icon size={14} /> : <span style={{ fontSize: 14 }}>{emoji}</span>}
                  </div>
                  <span style={{ fontSize: '12px', fontWeight: 600, lineHeight: 1.3 }}>{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ margin: 'var(--space-16) 0 var(--space-8)', borderTop: '1px solid var(--border)', paddingTop: 'var(--space-12)' }}>
          <div style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-8)', flexWrap: 'wrap' }}>
            {TABS.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={`btn ${activeTab === key ? 'btn-primary' : 'btn-outline'}`}
                style={{ borderRadius: 'var(--radius-full)' }}
              >
                {label}
              </button>
            ))}
          </div>

          {activeTab === 'desc' && (
            <div style={{ maxWidth: 760, lineHeight: 1.9, color: 'var(--text-secondary)', fontSize: 'var(--text-base)' }}>
              {product.description
                ? <div style={{ whiteSpace: 'pre-wrap' }}>{product.description}</div>
                : <p style={{ color: 'var(--text-muted)' }}>Sản phẩm này chưa có mô tả.</p>
              }
            </div>
          )}

          {activeTab === 'specs' && (
            <div style={{ maxWidth: 760 }}>
              {product.specifications ? (
                <div style={{ borderRadius: 'var(--radius-xl)', border: '1px solid var(--border)', overflow: 'hidden' }}>
                  {product.specifications.split('\n').filter(Boolean).map((line, i) => {
                    const parts = line.split(':');
                    const key = parts[0]?.trim();
                    const val = parts.slice(1).join(':')?.trim();
                    return (
                      <div key={i} style={{ display: 'grid', gridTemplateColumns: '200px 1fr', background: i % 2 === 0 ? '#fafafa' : '#fff', borderBottom: '1px solid var(--border)' }}>
                        <div style={{ padding: '12px 20px', fontWeight: 600, fontSize: 'var(--text-sm)', color: 'var(--text-primary)', borderRight: '1px solid var(--border)' }}>
                          {key}
                        </div>
                        <div style={{ padding: '12px 20px', fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
                          {val || '—'}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)' }}>Chưa có thông số kỹ thuật.</p>
              )}
            </div>
          )}

          {activeTab === 'shipping' && (
            <div style={{ maxWidth: 760, display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              {[
                { title: 'Giao hàng', content: 'Giao hàng toàn quốc. Thời gian giao hàng 1-3 ngày làm việc tùy khu vực.' },
                { title: 'Bảo hành', content: 'Tất cả sản phẩm đều được bảo hành chính hãng theo quy định của nhà sản xuất.' },
                { title: 'Đổi trả', content: 'Đổi trả miễn phí trong 7 ngày nếu sản phẩm lỗi do nhà sản xuất.' },
                { title: 'Thanh toán', content: 'Hỗ trợ thanh toán khi nhận hàng (COD) và chuyển khoản ngân hàng.' },
              ].map(({ title, content }) => (
                <div key={title} style={{ padding: 'var(--space-5)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', background: '#fff' }}>
                  <div style={{ fontWeight: 700, fontSize: 'var(--text-base)', marginBottom: 6 }}>{title}</div>
                  <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', lineHeight: 1.6 }}>{content}</div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'reviews' && (
            <div style={{ maxWidth: 760 }}>
              {reviews.length > 0 && avgRating && (
                <div style={{ display: 'flex', gap: 'var(--space-10)', padding: 'var(--space-8)', border: '1px solid var(--border)', borderRadius: 'var(--radius-xl)', marginBottom: 'var(--space-8)' }}>
                  <div style={{ textAlign: 'center', minWidth: 80 }}>
                    <div style={{ fontSize: 56, fontWeight: 800, letterSpacing: '-0.05em', lineHeight: 1, color: 'var(--text-primary)' }}>{avgRating}</div>
                    <StarDisplay value={avgRating} size={14} />
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: 6 }}>{reviews.length} đánh giá</div>
                  </div>
                  <div style={{ flex: 1 }}>
                    {[5, 4, 3, 2, 1].map((star) => {
                      const count = reviews.filter((r) => r.rating === star).length;
                      const pct = reviews.length ? (count / reviews.length * 100) : 0;
                      return (
                        <div key={star} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                          <span style={{ fontSize: '12px', fontWeight: 600, width: 16, textAlign: 'right', color: 'var(--text-muted)' }}>{star}</span>
                          <Star size={10} fill="#111" color="#111" />
                          <div style={{ flex: 1, height: 6, background: '#f1f1f1', borderRadius: 3, overflow: 'hidden' }}>
                            <div style={{ height: '100%', background: 'var(--primary)', width: `${pct}%`, borderRadius: 3, transition: 'width 0.6s' }} />
                          </div>
                          <span style={{ fontSize: '12px', color: 'var(--text-muted)', width: 20, textAlign: 'right' }}>{count}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              {isAuthenticated && !alreadyReviewed && (
                <form onSubmit={handleSubmitReview} style={{ padding: 'var(--space-6)', border: '1px solid var(--border)', borderRadius: 'var(--radius-xl)', marginBottom: 'var(--space-8)', background: '#fff' }}>
                  <div style={{ fontWeight: 700, fontSize: 'var(--text-base)', marginBottom: 'var(--space-5)', letterSpacing: '-0.01em' }}>Viết đánh giá</div>
                  {reviewError && <div className="alert alert-danger" style={{ marginBottom: 12, fontSize: 13 }}>{reviewError}</div>}
                  {reviewSuccess && <div className="alert alert-success" style={{ marginBottom: 12, fontSize: 13 }}>{reviewSuccess}</div>}
                  <div style={{ marginBottom: 'var(--space-4)' }}>
                    <label style={{ fontSize: 12, fontWeight: 700, marginBottom: 8, display: 'block', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)' }}>Đánh giá của bạn *</label>
                    {[1,2,3,4,5].map((s) => (
                      <button type="button" key={s} onClick={() => setMyRating(s)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, lineHeight: 0 }} aria-label={`${s} sao`}>
                        <Star size={28} fill={s <= myRating ? '#111' : 'none'} color={s <= myRating ? '#111' : '#d1d5db'} strokeWidth={1.5} />
                      </button>
                    ))}
                  </div>
                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)' }}>Nhận xét</label>
                    <textarea className="form-input" rows={3} value={myComment} onChange={(e) => setMyComment(e.target.value)} placeholder="Chia sẻ trải nghiệm của bạn..." style={{ resize: 'vertical', fontSize: 'var(--text-sm)' }} />
                  </div>
                  <button type="submit" disabled={submitting} className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 24px', borderRadius: 'var(--radius-full)' }}>
                    <Send size={14} /> {submitting ? 'Đang gửi...' : 'Gửi đánh giá'}
                  </button>
                </form>
              )}
              {alreadyReviewed && isAuthenticated && (
                <div style={{ padding: 'var(--space-4)', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 'var(--radius-lg)', marginBottom: 'var(--space-6)', fontSize: 'var(--text-sm)', color: '#15803d', fontWeight: 600 }}>
                  ✓ Bạn đã đánh giá sản phẩm này.
                </div>
              )}
              {!isAuthenticated && (
                <div style={{ padding: 'var(--space-4)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', marginBottom: 'var(--space-6)', fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
                  <Link to="/login" style={{ fontWeight: 700, color: 'var(--primary)' }}>Đăng nhập</Link> để viết đánh giá.
                </div>
              )}
              {reviewsLoading ? (
                <div style={{ textAlign: 'center', padding: 'var(--space-8)' }}>
                  <div className="spinner" style={{ margin: '0 auto' }} />
                </div>
              ) : reviews.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 'var(--space-16)', color: 'var(--text-muted)' }}>
                  <Star size={32} style={{ margin: '0 auto var(--space-4)', opacity: 0.15 }} />
                  <div style={{ fontSize: 'var(--text-base)', fontWeight: 600, color: 'var(--text-secondary)' }}>Chưa có đánh giá nào</div>
                  <div style={{ fontSize: 'var(--text-sm)', marginTop: 6 }}>Hãy là người đầu tiên chia sẻ trải nghiệm.</div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {reviews.map((r, i) => (
                    <div key={r.id} style={{ padding: 'var(--space-5) 0', borderBottom: i < reviews.length - 1 ? '1px solid var(--border)' : 'none' }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-4)' }}>
                        <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 14, flexShrink: 0 }}>
                          {(r.fullName || r.username || '?')[0].toUpperCase()}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                            <span style={{ fontWeight: 700, fontSize: 'var(--text-sm)' }}>{r.fullName || r.username}</span>
                            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{r.createdAt ? formatDate(r.createdAt) : ''}</span>
                          </div>
                          <div style={{ marginBottom: r.comment ? 8 : 0 }}>
                            <StarDisplay value={r.rating} size={12} />
                          </div>
                          {r.comment && <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', lineHeight: 1.7, margin: 0 }}>{r.comment}</p>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Related Products */}
        {related.length > 0 && (
          <section style={{ borderTop: '1px solid var(--border)', paddingTop: 'var(--space-12)', paddingBottom: 'var(--space-16)' }}>
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 'var(--space-8)' }}>
              <div>
                <div className="section-eyebrow" style={{ marginBottom: 'var(--space-3)' }}>Cùng danh mục</div>
                <h2 style={{ fontSize: 'var(--text-2xl)', fontWeight: 800, letterSpacing: '-0.03em', margin: 0 }}>Sản phẩm liên quan</h2>
              </div>
              <Link to={`/products?categoryId=${product.categoryId}`} style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 6, textDecoration: 'none' }}>
                Xem tất cả <ChevronRight size={14} />
              </Link>
            </div>
            <div className="product-grid" style={{ gridTemplateColumns: 'repeat(5, 1fr)' }}>
              {related.map((p) => <ProductCard key={p.id} product={p} />)}
            </div>
          </section>
        )}

        <RecentlyViewed />
      </div>

      {/* Lightbox */}
      {lightboxOpen && imageUrl && (
        <ImageLightbox src={imageUrl} alt={product.name} productName={product.name} onClose={() => setLightboxOpen(false)} />
      )}
    </main>
  );
}
