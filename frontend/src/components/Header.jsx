import { ShoppingCart, User, Search, LogOut, Settings, Package, Menu, X, ChevronDown, Truck } from 'lucide-react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import { useCartStore, useAuthStore } from '../store';
import { fetchCategories } from '../api/categories';

export default function Header() {
  const [searchQuery, setSearchQuery] = useState('');
  const [categories, setCategories]   = useState([]);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [catMenuOpen, setCatMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const catMenuRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();

  const cartItems = useCartStore((s) => s.items);
  const { isAuthenticated, user, logout } = useAuthStore();
  const totalItems = cartItems.reduce((s, i) => s + i.quantity, 0);

  useEffect(() => {
    fetchCategories()
      .then((data) => setCategories(data.slice(0, 8)))
      .catch(() => {});
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react/set-state-in-effect
    setMobileMenuOpen(false);
    setCatMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setUserMenuOpen(false);
      }
      if (catMenuRef.current && !catMenuRef.current.contains(e.target)) {
        setCatMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/products?keyword=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery('');
    } else {
      navigate('/products');
    }
  };

  const handleLogout = () => {
    logout();
    setUserMenuOpen(false);
    navigate('/');
  };

  return (
    <header className="hg-header">
      <div className="hg-header-inner">
        {/* Logo */}
        <Link to="/" className="hg-logo">
          <div className="hg-logo-mark">H&G</div>
          <div className="hg-logo-text">H&G Store</div>
        </Link>

        {/* Desktop Nav */}
        <nav className="hg-nav" aria-label="Main navigation">
          <div className="hg-nav-cat" ref={catMenuRef}>
            <button
              type="button"
              className={`hg-nav-cat-btn ${catMenuOpen ? 'open' : ''}`}
              onClick={() => setCatMenuOpen(!catMenuOpen)}
              aria-expanded={catMenuOpen}
              aria-haspopup="true"
            >
              Danh mục <ChevronDown size={14} className={catMenuOpen ? 'rotated' : ''} />
            </button>
            {catMenuOpen && (
              <div className="hg-cat-dropdown">
                {categories.length > 0 ? (
                  categories.map((cat) => (
                    <Link
                      key={cat.id}
                      to={`/products?categoryId=${cat.id}`}
                      className="hg-cat-dropdown-item"
                      onClick={() => setCatMenuOpen(false)}
                    >
                      {cat.name}
                    </Link>
                  ))
                ) : (
                  [
                    { label: 'Máy ảnh DSLR & Mirrorless', kw: 'Máy ảnh' },
                    { label: 'Laptop Gaming & Đồ họa', kw: 'Laptop' },
                    { label: 'Ống kính & Lens', kw: 'Ống kính' },
                    { label: 'Phụ kiện máy ảnh', kw: 'Phụ kiện' }
                  ].map((item) => (
                    <Link
                      key={item.kw}
                      to={`/products?keyword=${encodeURIComponent(item.kw)}`}
                      className="hg-cat-dropdown-item"
                      onClick={() => setCatMenuOpen(false)}
                    >
                      {item.label}
                    </Link>
                  ))
                )}
                <Link to="/products" className="hg-cat-dropdown-item" onClick={() => setCatMenuOpen(false)} style={{ borderTop: '1px solid var(--border)', marginTop: 4, paddingTop: 8, fontWeight: 700 }}>
                  Tất cả sản phẩm →
                </Link>
              </div>
            )}
          </div>
          {categories.length > 0 ? (
            categories.slice(0, 4).map((cat) => (
              <Link key={cat.id} to={`/products?categoryId=${cat.id}`} className="hg-nav-link">
                {cat.name}
              </Link>
            ))
          ) : (
            ['Máy ảnh', 'Laptop', 'Điện thoại', 'Phụ kiện'].map((label) => (
              <Link key={label} to={`/products?keyword=${encodeURIComponent(label)}`} className="hg-nav-link">
                {label}
              </Link>
            ))
          )}
          <Link to="/products" className="hg-nav-link">Tất cả</Link>
        </nav>

        {/* Actions */}
        <div className="hg-actions">
          <form onSubmit={handleSearch} className="hg-search" role="search">
            <Search size={16} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
            <input
              type="text"
              placeholder="Tìm kiếm..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Tìm kiếm sản phẩm"
            />
          </form>

          <Link to="/cart" className="hg-action-btn" aria-label="Giỏ hàng">
            <ShoppingCart size={19} strokeWidth={1.5} />
            {totalItems > 0 && <span className="hg-action-badge">{totalItems}</span>}
          </Link>

          {isAuthenticated ? (
            <div ref={menuRef} className="hg-user-menu">
              <button
                type="button"
                className="hg-action-btn hg-user-btn"
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                aria-expanded={userMenuOpen}
                aria-label="Tài khoản"
              >
                {(user?.username || 'U')[0].toUpperCase()}
              </button>
              {userMenuOpen && (
                <div className="hg-dropdown">
                  <div className="hg-dropdown-header">
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{user?.fullName || user?.username}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{user?.email}</div>
                  </div>
                  <Link to="/account" onClick={() => setUserMenuOpen(false)}>
                    <User size={16} strokeWidth={1.5} /> Tài khoản
                  </Link>
                  <Link to="/orders" onClick={() => setUserMenuOpen(false)}>
                    <Package size={16} strokeWidth={1.5} /> Đơn hàng
                  </Link>
                  {(user?.role === 'ROLE_SHIPPER' || user?.role === 'SHIPPER' || user?.role === 'ROLE_ADMIN' || user?.role === 'ADMIN') && (
                    <Link to="/shipper" onClick={() => setUserMenuOpen(false)}>
                      <Truck size={16} strokeWidth={1.5} /> Cổng Shipper
                    </Link>
                  )}
                  {(user?.role === 'ROLE_ADMIN' || user?.role === 'ADMIN') && (
                    <Link to="/admin" onClick={() => setUserMenuOpen(false)}>
                      <Settings size={16} strokeWidth={1.5} /> Admin Dashboard
                    </Link>
                  )}
                  <button type="button" onClick={handleLogout} className="hg-dropdown-danger">
                    <LogOut size={16} strokeWidth={1.5} /> Đăng xuất
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link to="/login" className="hg-action-btn" aria-label="Đăng nhập">
              <User size={19} strokeWidth={1.5} />
            </Link>
          )}

          {/* Mobile menu toggle */}
          <button
            type="button"
            className="hg-mobile-menu-btn"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label={mobileMenuOpen ? 'Đóng menu' : 'Mở menu'}
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="hg-mobile-menu" role="dialog" aria-label="Menu điều hướng">
          <nav aria-label="Mobile navigation">
            {categories.slice(0, 6).map((cat) => (
              <Link key={cat.id} to={`/products?categoryId=${cat.id}`} onClick={() => setMobileMenuOpen(false)}>
                {cat.name}
              </Link>
            ))}
            <Link to="/products" onClick={() => setMobileMenuOpen(false)}>Tất cả sản phẩm</Link>
            {!isAuthenticated && <Link to="/login" onClick={() => setMobileMenuOpen(false)}>Đăng nhập</Link>}
            {isAuthenticated && (
              <>
                <Link to="/account" onClick={() => setMobileMenuOpen(false)}>Tài khoản</Link>
                <Link to="/orders" onClick={() => setMobileMenuOpen(false)}>Đơn hàng</Link>
                {(user?.role === 'ROLE_SHIPPER' || user?.role === 'SHIPPER' || user?.role === 'ROLE_ADMIN' || user?.role === 'ADMIN') && (
                  <Link to="/shipper" onClick={() => setMobileMenuOpen(false)}>Cổng Shipper</Link>
                )}
                {(user?.role === 'ROLE_ADMIN' || user?.role === 'ADMIN') && (
                  <Link to="/admin" onClick={() => setMobileMenuOpen(false)}>Admin Dashboard</Link>
                )}
                <button type="button" onClick={() => { handleLogout(); setMobileMenuOpen(false); }}>
                  Đăng xuất
                </button>
              </>
            )}
          </nav>
        </div>
      )}

      <style>{`
        .hg-header {
          position: sticky;
          top: 0;
          z-index: 100;
          padding: var(--space-3) var(--space-4);
        }
        .hg-header-inner {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: var(--space-6);
          max-width: var(--container);
          margin: 0 auto;
          background: rgba(255, 255, 255, 0.88);
          backdrop-filter: blur(16px);
          border: 1px solid rgba(0, 0, 0, 0.05);
          border-radius: var(--radius-full);
          padding: 10px 20px;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.04);
        }
        .hg-logo {
          display: flex;
          align-items: center;
          gap: 10px;
          text-decoration: none;
          color: var(--text-primary);
          flex-shrink: 0;
        }
        .hg-logo-mark {
          width: 34px;
          height: 34px;
          background: var(--primary);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #fff;
          font-weight: 800;
          font-size: 12px;
          letter-spacing: -0.05em;
          flex-shrink: 0;
        }
        .hg-logo-text {
          font-weight: 800;
          font-size: 17px;
          letter-spacing: -0.04em;
        }
        .hg-nav {
          display: flex;
          align-items: center;
          gap: 4px;
          position: relative;
        }
        .hg-nav-link {
          padding: 6px 12px;
          font-size: 14px;
          font-weight: 600;
          color: var(--text-secondary);
          text-decoration: none;
          border-radius: var(--radius-full);
          transition: color var(--transition), background var(--transition);
        }
        .hg-nav-link:hover {
          color: var(--text-primary);
          background: var(--bg);
        }
        .hg-nav-cat {
          position: relative;
        }
        .hg-nav-cat-btn {
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 6px 12px;
          font-size: 14px;
          font-weight: 600;
          color: var(--text-secondary);
          background: none;
          border: none;
          border-radius: var(--radius-full);
          cursor: pointer;
          transition: all var(--transition);
        }
        .hg-nav-cat-btn:hover {
          color: var(--text-primary);
          background: var(--bg);
        }
        .hg-nav-cat-btn svg { transition: transform var(--transition); }
        .hg-nav-cat-btn.open svg { transform: rotate(180deg); }
        .hg-cat-dropdown {
          position: absolute;
          top: calc(100% + 8px);
          left: 0;
          background: #fff;
          border: 1px solid var(--border);
          border-radius: var(--radius-lg);
          box-shadow: var(--shadow-lg);
          padding: 6px;
          min-width: 200px;
          z-index: var(--z-dropdown);
        }
        .hg-cat-dropdown-item {
          display: block;
          padding: 8px 14px;
          font-size: 14px;
          font-weight: 500;
          color: var(--text-secondary);
          text-decoration: none;
          border-radius: var(--radius);
          transition: all var(--transition);
        }
        .hg-cat-dropdown-item:hover {
          background: var(--bg);
          color: var(--primary);
        }
        .hg-actions {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .hg-search {
          display: flex;
          align-items: center;
          background: rgba(0, 0, 0, 0.03);
          border-radius: var(--radius-full);
          padding: 6px 14px;
          gap: 8px;
          transition: background var(--transition);
        }
        .hg-search:focus-within {
          background: rgba(0, 0, 0, 0.05);
        }
        .hg-search input {
          border: none;
          background: transparent;
          outline: none;
          font-size: 14px;
          width: 120px;
          color: var(--text-primary);
        }
        @media (min-width: 1024px) {
          .hg-search input { width: 180px; }
        }
        .hg-action-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 40px;
          height: 40px;
          border-radius: 50%;
          color: var(--text-primary);
          background: rgba(0, 0, 0, 0.03);
          transition: background var(--transition), color var(--transition);
          text-decoration: none;
          position: relative;
        }
        .hg-action-btn:hover { background: rgba(0, 0, 0, 0.06); }
        .hg-action-badge {
          position: absolute;
          top: -2px;
          right: -2px;
          background: var(--primary);
          color: #fff;
          width: 18px;
          height: 18px;
          border-radius: 50%;
          font-size: 10px;
          font-weight: 700;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .hg-user-menu {
          position: relative;
        }
        .hg-user-btn {
          font-weight: 700;
          font-size: 14px;
          color: #fff;
          background: var(--primary);
        }
        .hg-user-btn:hover { background: var(--primary-dark); }
        .hg-dropdown {
          position: absolute;
          top: calc(100% + 12px);
          right: 0;
          background: #fff;
          border-radius: 16px;
          padding: 8px;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.08);
          min-width: 220px;
          z-index: 300;
          border: 1px solid rgba(0, 0, 0, 0.05);
          animation: hg-dropdown-in 0.15s ease;
        }
        @keyframes hg-dropdown-in {
          from { opacity: 0; transform: translateY(-4px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .hg-dropdown a, .hg-dropdown button {
          display: flex;
          align-items: center;
          gap: 10px;
          width: 100%;
          padding: 10px 14px;
          font-size: 14px;
          color: var(--text-secondary);
          text-decoration: none;
          background: none;
          border: none;
          border-radius: 10px;
          cursor: pointer;
          transition: all var(--transition);
          text-align: left;
        }
        .hg-dropdown a:hover { background: var(--bg); color: var(--text-primary); }
        .hg-dropdown .hg-dropdown-header {
          padding: 10px 14px;
          margin-bottom: 6px;
          border-radius: 10px;
          background: var(--bg);
        }
        .hg-dropdown-danger {
          color: var(--danger) !important;
        }
        .hg-dropdown-danger:hover { background: #fef2f2 !important; }
        .hg-mobile-menu-btn {
          display: none;
          width: 40px;
          height: 40px;
          align-items: center;
          justify-content: center;
          border-radius: 10px;
          border: 1px solid var(--border);
          background: #fff;
          color: var(--text-primary);
          cursor: pointer;
        }
        .hg-mobile-menu {
          position: fixed;
          top: 72px;
          left: 0;
          right: 0;
          background: #fff;
          border-top: 1px solid var(--border);
          padding: var(--space-4);
          z-index: 99;
          box-shadow: var(--shadow-lg);
        }
        .hg-mobile-menu nav {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .hg-mobile-menu nav a, .hg-mobile-menu nav button {
          display: block;
          padding: var(--space-3) var(--space-4);
          font-size: var(--text-base);
          font-weight: 600;
          color: var(--text-secondary);
          text-decoration: none;
          background: none;
          border: none;
          border-radius: var(--radius);
          cursor: pointer;
          text-align: left;
          transition: all var(--transition);
        }
        .hg-mobile-menu nav a:hover { background: var(--bg); color: var(--primary); }
        @media (max-width: 900px) {
          .hg-nav { display: none; }
          .hg-search input { width: 100px; }
          .hg-mobile-menu-btn { display: inline-flex; }
        }
        @media (max-width: 480px) {
          .hg-header-inner { padding: 8px 14px; border-radius: var(--radius-lg); }
          .hg-logo-text { display: none; }
          .hg-search input { display: none; }
          .hg-action-btn { width: 36px; height: 36px; }
        }
      `}</style>
    </header>
  );
}
