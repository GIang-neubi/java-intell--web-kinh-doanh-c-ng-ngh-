import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { Truck, LogOut, Eye, RefreshCw, Shield } from 'lucide-react';
import { useAuthStore } from '../store';

export default function ShipperLayout() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isAdmin = user?.role === 'ROLE_ADMIN' || user?.role === 'ADMIN';

  return (
    <div className="hg-shipper-shell">
      <div className="hg-shipper-app-container">
        {/* Sticky Header Topbar */}
        <header className="hg-shipper-topbar">
          <Link to="/shipper" className="hg-shipper-topbar-brand">
            <div className="hg-shipper-topbar-icon">
              <Truck size={20} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontWeight: 800, fontSize: '15px', color: '#0f172a', letterSpacing: '-0.02em' }}>
                  H&G Express
                </span>
                <span style={{
                  padding: '1px 6px',
                  borderRadius: '6px',
                  fontSize: '10px',
                  fontWeight: 800,
                  background: '#ffedd5',
                  color: '#c2410c'
                }}>
                  {isAdmin ? 'ADMIN VIEW' : 'SHIPPER'}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#64748b', marginTop: '1px' }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981' }} />
                <span>Trực tuyến • {user?.fullName || user?.username || 'Tài xế'}</span>
              </div>
            </div>
          </Link>

          <div className="hg-shipper-topbar-actions">
            {isAdmin && (
              <Link
                to="/admin"
                className="hg-shipper-action-icon-btn"
                title="Quay lại trang Quản trị Admin"
                style={{ background: '#f1f5f9', color: '#0f172a' }}
              >
                <Shield size={16} />
              </Link>
            )}
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="hg-shipper-action-icon-btn"
              title="Làm mới trang"
            >
              <RefreshCw size={16} />
            </button>
            <button
              type="button"
              onClick={handleLogout}
              className="hg-shipper-action-icon-btn danger"
              title="Đăng xuất"
            >
              <LogOut size={16} />
            </button>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="hg-shipper-main-body">
          <Outlet />
        </main>

        {/* Sticky Bottom Navigation Bar */}
        <nav className="hg-shipper-bottom-nav">
          <Link
            to="/shipper"
            className={`hg-shipper-nav-tab ${location.pathname === '/shipper' ? 'active' : ''}`}
          >
            <Truck size={20} />
            <span>Đơn giao</span>
          </Link>

          {isAdmin && (
            <Link
              to="/admin/deliveries"
              className="hg-shipper-nav-tab"
              title="Trang quản lý đơn giao Admin"
            >
              <Shield size={20} />
              <span>Admin</span>
            </Link>
          )}

          <Link
            to="/"
            className="hg-shipper-nav-tab"
            title="Xem cửa hàng H&G"
          >
            <Eye size={20} />
            <span>Cửa hàng</span>
          </Link>

          <button
            type="button"
            onClick={handleLogout}
            className="hg-shipper-nav-tab danger"
          >
            <LogOut size={20} />
            <span>Thoát</span>
          </button>
        </nav>
      </div>
    </div>
  );
}
