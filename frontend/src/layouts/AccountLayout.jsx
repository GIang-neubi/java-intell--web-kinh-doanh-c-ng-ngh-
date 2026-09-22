import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { User, Package, Heart, LogOut, Lock, LayoutDashboard, Menu, X, ShoppingCart } from 'lucide-react';
import { useAuthStore } from '../store';

export default function AccountLayout({ children, activeTab = 'profile' }) {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const menuItems = [
    { id: 'overview',  label: 'Tổng quan',  icon: LayoutDashboard, path: '/account' },
    { id: 'profile',   label: 'Hồ sơ',      icon: User,            path: '/profile' },
    { id: 'password',  label: 'Mật khẩu',   icon: Lock,            path: '/profile?tab=password' },
    { id: 'orders',    label: 'Đơn hàng',   icon: Package,         path: '/orders' },
    { id: 'wishlist',  label: 'Yêu thích',  icon: Heart,           path: '/wishlist' },
    { id: 'cart',      label: 'Giỏ hàng',   icon: ShoppingCart,    path: '/cart' },
  ];

  const isActive = (id) => {
    if (id === activeTab) return true;
    if (id === 'overview' && location.pathname === '/account') return true;
    if (id === 'profile' && location.pathname === '/profile') return true;
    if (id === 'password' && location.pathname === '/profile' && location.search === '?tab=password') return true;
    if (id === 'orders' && (location.pathname === '/orders' || location.pathname.startsWith('/orders/'))) return true;
    if (id === 'wishlist' && location.pathname === '/wishlist') return true;
    if (id === 'cart' && location.pathname === '/cart') return true;
    return false;
  };

  const sidebarNav = (
    <nav className="account-nav">
      {menuItems.map(({ id, label, icon: Icon, path }) => (
        <Link
          key={id}
          to={path}
          className={`account-nav-item ${isActive(id) ? 'active' : ''}`}
          onClick={() => setMobileOpen(false)}
        >
          <Icon size={16} />
          {label}
        </Link>
      ))}
      <button
        onClick={handleLogout}
        className="account-nav-item"
        style={{ width: '100%', marginTop: 'var(--space-4)', color: 'var(--danger)' }}
      >
        <LogOut size={16} />
        Đăng xuất
      </button>
    </nav>
  );

  return (
    <main className="page-content" style={{ background: 'var(--bg)' }}>
      <div className="container">

        <nav style={{ display: 'flex', alignItems: 'center', gap: 6, padding: 'var(--space-6) 0', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)' }}>
          <Link to="/" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>Trang chủ</Link>
          <span style={{ margin: '0 4px' }}>/</span>
          <span style={{ color: 'var(--text-primary)' }}>Tài khoản</span>
        </nav>

        <div className="account-layout">

          <aside className="account-sidebar">
            <div className="account-user-card">
              <div className="account-avatar">
                {(user?.fullName || user?.username || 'U')[0].toUpperCase()}
              </div>
              <div style={{ fontWeight: 800, fontSize: 16, color: 'var(--text-primary)', letterSpacing: '-0.01em', marginBottom: 2 }}>
                {user?.fullName || user?.username || 'User'}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                {user?.email || 'No email linked'}
              </div>
            </div>

            {sidebarNav}
          </aside>

          <div className="account-content">
            <div className="account-content-card">
              {children}
            </div>
          </div>

        </div>

        <button
          type="button"
          onClick={() => setMobileOpen(!mobileOpen)}
          style={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            zIndex: 100,
            width: 52,
            height: 52,
            borderRadius: '50%',
            background: 'var(--primary)',
            color: '#fff',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: 'var(--shadow-lg)',
            cursor: 'pointer',
            border: 'none',
          }}
          className="account-mobile-btn"
        >
          {mobileOpen ? <X size={20} /> : <Menu size={20} />}
        </button>

        {mobileOpen && (
          <div
            className="account-mobile-drawer"
            onClick={() => setMobileOpen(false)}
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 99,
              background: 'rgba(0,0,0,0.3)',
            }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                position: 'absolute',
                right: 0,
                top: 0,
                bottom: 0,
                width: 280,
                background: '#fff',
                padding: 'var(--space-6)',
                overflowY: 'auto',
                boxShadow: 'var(--shadow-lg)',
              }}
            >
              <div className="account-user-card" style={{ marginBottom: 'var(--space-4)' }}>
                <div className="account-avatar">
                  {(user?.fullName || user?.username || 'U')[0].toUpperCase()}
                </div>
                <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 2 }}>
                  {user?.fullName || user?.username || 'User'}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                  {user?.email || 'No email'}
                </div>
              </div>
              {sidebarNav}
            </div>
          </div>
        )}

      </div>
    </main>
  );
}
