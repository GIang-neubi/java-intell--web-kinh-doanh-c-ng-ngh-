import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Camera, Laptop, Smartphone, Headphones, Package, Shield, Truck, RotateCcw, ChevronRight } from 'lucide-react';
import ProductCard from '../components/ProductCard';
import RecentlyViewed from '../components/RecentlyViewed';
import PageLoading from '../components/PageStates';
import { fetchProducts } from '../api/products';
import { fetchCategories } from '../api/categories';
import { fetchBrands } from '../api/brands';
import { resolveImageUrl } from '../utils/imageUrl';

const CAT_ICONS = [Camera, Laptop, Smartphone, Headphones, Package, RotateCcw];

const WHY_ITEMS = [
  { icon: Shield, title: 'Chính hãng 100%', desc: 'Mọi sản phẩm đều được chứng nhận chính hãng, bảo hành đầy đủ.' },
  { icon: Truck, title: 'Giao hàng nhanh', desc: 'Giao hàng toàn quốc, thanh toán khi nhận hàng (COD).' },
  { icon: Headphones, title: 'Hỗ trợ 24/7', desc: 'Đội ngũ tư vấn viên sẵn sàng hỗ trợ mọi lúc.' },
  { icon: RotateCcw, title: 'Đổi trả dễ dàng', desc: 'Đổi trả miễn phí trong 7 ngày nếu sản phẩm lỗi.' },
];

const FAMOUS_CAMERA_BRANDS = [
  { name: 'Canon', desc: 'EOS R Mirrorless', tag: 'Máy ảnh' },
  { name: 'Sony', desc: 'Alpha Full-frame', tag: 'Máy ảnh' },
  { name: 'Nikon', desc: 'Z Mount System', tag: 'Máy ảnh' },
  { name: 'Fujifilm', desc: 'X & GFX Series', tag: 'Máy ảnh' },
  { name: 'Leica', desc: 'Huyền thoại nước Đức', tag: 'Máy ảnh' },
  { name: 'Lumix', desc: 'Panasonic Cinema', tag: 'Máy ảnh' },
  { name: 'Hasselblad', desc: 'Medium Format đỉnh cao', tag: 'Máy ảnh' },
  { name: 'Blackmagic', desc: 'Pocket Cinema Pro', tag: 'Máy ảnh' },
];

const FAMOUS_LAPTOP_BRANDS = [
  { name: 'Apple', desc: 'MacBook M-Series', tag: 'Laptop' },
  { name: 'ASUS', desc: 'ROG & ZenBook', tag: 'Laptop' },
  { name: 'Dell', desc: 'XPS & Alienware', tag: 'Laptop' },
  { name: 'Lenovo', desc: 'ThinkPad & Legion', tag: 'Laptop' },
  { name: 'HP', desc: 'Spectre & Omen', tag: 'Laptop' },
  { name: 'MSI', desc: 'Gaming & Creator', tag: 'Laptop' },
  { name: 'Acer', desc: 'Predator & Nitro', tag: 'Laptop' },
  { name: 'Razer', desc: 'Blade High-Performance', tag: 'Laptop' },
];

export default function Home() {
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [homeProducts, setHomeProducts] = useState([]);
  const [saleProducts, setSaleProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentHeroIndex, setCurrentHeroIndex] = useState(0);

  const getBrandLink = (brandName) => {
    const matched = brands.find((b) => b.name.toLowerCase() === brandName.toLowerCase());
    if (matched) return `/products?brandId=${matched.id}`;
    return `/products?keyword=${encodeURIComponent(brandName)}`;
  };

  useEffect(() => {
    Promise.all([
      fetchCategories(),
      fetchBrands(),
      fetchProducts({ pageNo: 0, pageSize: 15, sortBy: 'id', sortDir: 'desc' }),
    ])
      .then(([cats, brs, prodData]) => {
        setCategories(cats.slice(0, 6));
        setBrands(brs);
        const products = prodData.content || [];
        setFeaturedProducts(products.slice(0, 5));
        setHomeProducts(products.slice(0, 15));
        const withSale = products.filter((p) => p.salePrice != null);
        setSaleProducts(withSale.length > 0 ? withSale.slice(0, 5) : products.slice(0, 5));
      })
      .catch(() => {
        setFeaturedProducts([]);
        setHomeProducts([]);
        setSaleProducts([]);
        setCategories([]);
        setBrands([]);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (featuredProducts.length === 0) return;
    const interval = setInterval(() => {
      setCurrentHeroIndex((prev) => (prev + 1) % featuredProducts.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [featuredProducts]);

  if (loading) {
    return (
      <main className="page-content" style={{ background: 'var(--bg)', paddingBottom: 'var(--space-40)' }}>
        <div style={{ paddingTop: 'var(--space-20)' }}>
          <PageLoading text="Đang tải sản phẩm..." />
        </div>
      </main>
    );
  }

  return (
    <main className="page-content" style={{ background: 'var(--bg)', paddingBottom: 'var(--space-40)' }}>
      {/* 1. Hero Section */}
      <section className="hg-hero">
        <div className="container hg-hero-inner">
          <div>
            <div className="hg-hero-badge hg-hero-animate">
              <span className="hg-hero-badge-dot" />
              Công nghệ chính xác
            </div>
            <h1 className="hg-hero-title hg-hero-animate hg-hero-animate-d1">
              Công nghệ<br />
              <span className="hg-hero-title-accent">Không giới hạn</span>
            </h1>
            <p className="hg-hero-desc hg-hero-animate hg-hero-animate-d2">
              H&G tuyển chọn những thiết bị công nghệ và nhiếp ảnh tốt nhất dành cho những người đòi hỏi hiệu suất vượt trội.
            </p>
            <div className="hg-hero-actions hg-hero-animate hg-hero-animate-d3">
              <Link to="/products" className="btn btn-primary btn-lg">
                Khám phá ngay <ArrowRight size={16} />
              </Link>
            </div>
            <div className="hg-hero-stats hg-hero-animate hg-hero-animate-d4">
              <div>
                <div className="hg-hero-stat-val">200+</div>
                <div className="hg-hero-stat-label">Sản phẩm</div>
              </div>
              <div>
                <div className="hg-hero-stat-val">50+</div>
                <div className="hg-hero-stat-label">Thương hiệu</div>
              </div>
              <div>
                <div className="hg-hero-stat-val">10K+</div>
                <div className="hg-hero-stat-label">Khách hàng</div>
              </div>
            </div>
          </div>
          <div className="hg-hero-visual hg-hero-animate hg-hero-animate-d2" style={{ position: 'relative', width: '100%', height: '100%', minHeight: '400px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div className="hg-hero-glow" style={{ position: 'absolute', width: '100%', height: '100%', background: 'radial-gradient(circle, rgba(255,255,255,0.15) 0%, transparent 60%)', zIndex: 0 }} />
            {featuredProducts.length > 0 ? (
              featuredProducts.map((p, idx) => (
                <div
                  key={p.id}
                  className="hg-hero-carousel-item"
                  style={{
                    position: 'absolute',
                    opacity: idx === currentHeroIndex ? 1 : 0,
                    transform: idx === currentHeroIndex ? 'translateY(0) scale(1)' : 'translateY(20px) scale(0.95)',
                    transition: 'all 0.8s cubic-bezier(0.16, 1, 0.3, 1)',
                    pointerEvents: idx === currentHeroIndex ? 'auto' : 'none',
                    zIndex: idx === currentHeroIndex ? 10 : 1,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    background: 'rgba(255, 255, 255, 0.05)',
                    backdropFilter: 'blur(16px)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: 'var(--radius-2xl)',
                    padding: 'var(--space-6)',
                    boxShadow: '0 24px 48px rgba(0,0,0,0.15)',
                    width: '90%',
                    maxWidth: '380px'
                  }}
                >
                  <div style={{ background: '#fff', borderRadius: 'var(--radius-xl)', padding: 'var(--space-4)', width: '100%', aspectRatio: '1', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 'var(--space-5)' }}>
                    <img
                      src={resolveImageUrl(p.image)}
                      alt={p.name}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'contain',
                        filter: 'drop-shadow(0 12px 24px rgba(0,0,0,0.12))',
                      }}
                      onError={(e) => { e.target.style.display = 'none'; }}
                    />
                  </div>
                  <div style={{ textAlign: 'center', width: '100%' }}>
                    <h3 style={{ color: '#fff', fontSize: 'var(--text-xl)', fontWeight: 700, marginBottom: 'var(--space-2)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{p.name}</h3>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: 12, alignItems: 'center' }}>
                      <span style={{ color: 'var(--accent)', fontSize: 'var(--text-2xl)', fontWeight: 800 }}>
                        {p.salePrice ? p.salePrice.toLocaleString() : p.price?.toLocaleString()} đ
                      </span>
                      {p.salePrice && (
                        <span style={{ color: 'rgba(255,255,255,0.5)', textDecoration: 'line-through', fontSize: 'var(--text-sm)' }}>
                          {p.price?.toLocaleString()} đ
                        </span>
                      )}
                    </div>
                    <Link to={`/products/${p.id}`} className="btn btn-outline" style={{ marginTop: 'var(--space-4)', color: '#fff', borderColor: 'rgba(255,255,255,0.3)', width: '100%' }}>
                      Xem chi tiết
                    </Link>
                  </div>
                </div>
              ))
            ) : (
              <div className="hg-hero-card hg-hero-card-top" style={{ zIndex: 1 }}>
                <img
                  src="https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=600&q=80"
                  alt="Máy ảnh"
                  className="hg-hero-card-img"
                />
              </div>
            )}

            {/* Carousel Indicators */}
            {featuredProducts.length > 0 && (
              <div style={{ position: 'absolute', bottom: -24, display: 'flex', gap: 8, zIndex: 20 }}>
                {featuredProducts.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentHeroIndex(idx)}
                    style={{
                      width: idx === currentHeroIndex ? 24 : 8,
                      height: 8,
                      borderRadius: 4,
                      background: idx === currentHeroIndex ? '#fff' : 'rgba(255,255,255,0.3)',
                      transition: 'all 0.4s ease',
                      cursor: 'pointer',
                      border: 'none',
                      padding: 0
                    }}
                    aria-label={`Slide ${idx + 1}`}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* 2. Categories Section */}
      {categories.length > 0 && (
        <section className="section" style={{ background: '#fff', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>
          <div className="container">
            <div className="section-header" style={{ justifyContent: 'center', textAlign: 'center', flexDirection: 'column' }}>
              <div className="section-eyebrow">Danh mục</div>
              <h2 className="section-title">Khám phá danh mục</h2>
            </div>
            <div className="hg-cat-grid">
              {categories.slice(0, 3).map((cat, idx) => {
                const Icon = CAT_ICONS[idx % CAT_ICONS.length];
                return (
                  <Link to={`/products?categoryId=${cat.id}`} key={cat.id} className="hg-cat-card">
                    <div className="hg-cat-icon">
                      <Icon size={24} />
                    </div>
                    <div className="hg-cat-info">
                      <div className="hg-cat-name">{cat.name}</div>
                      <div className="hg-cat-count">Xem sản phẩm</div>
                    </div>
                    <ChevronRight size={20} className="hg-cat-arrow" />
                  </Link>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* 3. Featured Products */}
      <section className="section">
        <div className="container">
          <div className="section-header">
            <div>
              <div className="section-eyebrow">Bộ sưu tập</div>
              <h2 className="section-title">Danh sách sản phẩm</h2>
            </div>
            <Link to="/products" style={{ fontWeight: 600, fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 8 }}>
              Xem tất cả <ArrowRight size={14} />
            </Link>
          </div>
          {homeProducts.length > 0 ? (
            <div className="product-grid">
              {homeProducts.map((p) => <ProductCard key={p.id} product={p} />)}
            </div>
          ) : (
            <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 'var(--space-12) 0' }}>Chưa có sản phẩm nào.</div>
          )}
        </div>
      </section>



      {/* 5. Infinite Scrolling Ticker (Marquee) — Brands */}
      <section className="section hg-ticker-section">
        <div className="container">
          <div className="hg-ticker-box">
            <div className="hg-ticker-header">
              <div className="section-eyebrow" style={{ display: 'inline-block' }}>Đối tác toàn cầu</div>
              <h2 className="hg-ticker-title">Thương hiệu Laptop & Máy ảnh hàng đầu</h2>
              <p className="hg-ticker-desc">
                Hệ sinh thái thiết bị công nghệ & nhiếp ảnh danh tiếng, phân phối chính hãng và bảo hành toàn quốc tại H&G
              </p>
            </div>

            {/* Row 1: Camera Brands (Moving Left) */}
            <div className="hg-marquee-wrapper">
              <div className="hg-marquee-track">
                {[...FAMOUS_CAMERA_BRANDS, ...FAMOUS_CAMERA_BRANDS].map((b, idx) => (
                  <Link
                    key={`cam-${b.name}-${idx}`}
                    to={getBrandLink(b.name)}
                    className="hg-ticker-item"
                    title={`Khám phá sản phẩm ${b.name}`}
                  >
                    <div className="brand-icon-wrap">
                      <Camera size={15} />
                    </div>
                    <span className="brand-name">{b.name}</span>
                    <span className="brand-desc">{b.desc}</span>
                    <span className="brand-badge">{b.tag}</span>
                  </Link>
                ))}
              </div>
            </div>

            {/* Row 2: Laptop Brands (Moving Right) */}
            <div className="hg-marquee-wrapper">
              <div className="hg-marquee-track reverse">
                {[...FAMOUS_LAPTOP_BRANDS, ...FAMOUS_LAPTOP_BRANDS].map((b, idx) => (
                  <Link
                    key={`lap-${b.name}-${idx}`}
                    to={getBrandLink(b.name)}
                    className="hg-ticker-item"
                    title={`Khám phá sản phẩm ${b.name}`}
                  >
                    <div className="brand-icon-wrap">
                      <Laptop size={15} />
                    </div>
                    <span className="brand-name">{b.name}</span>
                    <span className="brand-desc">{b.desc}</span>
                    <span className="brand-badge">{b.tag}</span>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 6. Why H&G (NEW) */}
      <section className="section">
        <div className="container">
          <div className="section-header" style={{ justifyContent: 'center', textAlign: 'center', flexDirection: 'column' }}>
            <div className="section-eyebrow">Vì sao H&G?</div>
            <h2 className="section-title">Lợi thế của chúng tôi</h2>
          </div>
          <div className="hg-why-grid">
            {WHY_ITEMS.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="hg-why-card">
                <div className="hg-why-icon">
                  <Icon size={22} strokeWidth={1.5} />
                </div>
                <div className="hg-why-title">{title}</div>
                <div className="hg-why-desc">{desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 7. Promotional CTA (NEW) */}
      <section className="section">
        <div className="container">
          <div className="hg-cta-section">
            <div className="hg-cta-title">Bắt đầu khám phá ngay</div>
            <p className="hg-cta-desc">
              Đăng ký nhận bản tin để cập nhật sản phẩm mới, khuyến mãi đặc biệt và lời khuyên công nghệ hàng tuần.
            </p>
            <Link to="/products" className="btn btn-primary btn-lg">
              Xem sản phẩm <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>

    </main>
  );
}
