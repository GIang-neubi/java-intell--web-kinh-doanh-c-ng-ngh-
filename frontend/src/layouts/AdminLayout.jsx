import { NavLink, Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import {
  LayoutDashboard, Package, FolderTree, Users, ShoppingBag,
  Ticket, BarChart3, LogOut, Eye, Menu, X, ChevronRight, Tag, Inbox,
  Bell, Settings, AlertTriangle, CheckCircle, Sparkles, MessageSquare,
  Truck, UserCheck, Building2
} from 'lucide-react';
import { useAuthStore } from '../store';
import { fetchAdminUnreadCount } from '../api/chat';

const NAV = [
  { to: '/admin', end: true, icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/admin/chat', icon: MessageSquare, label: 'Tin nhắn CSKH', badgeKey: 'chat' },
  { to: '/admin/products', icon: Package, label: 'Sản phẩm' },
  { to: '/admin/inventory', icon: Inbox, label: 'Nhập xuất kho' },
  { to: '/admin/warehouses', icon: Building2, label: 'Kho hàng' },
  { to: '/admin/categories', icon: FolderTree, label: 'Danh mục' },
  { to: '/admin/brands', icon: Tag, label: 'Thương hiệu' },
  { to: '/admin/users', icon: Users, label: 'Người dùng' },
  { to: '/admin/orders', icon: ShoppingBag, label: 'Đơn hàng' },
  { to: '/admin/deliveries', icon: Truck, label: 'Quản lý giao hàng' },
  { to: '/admin/shippers', icon: UserCheck, label: 'Đội ngũ Shipper' },
  { to: '/admin/vouchers', icon: Ticket, label: 'Mã giảm giá' },
  { to: '/admin/reports', icon: BarChart3, label: 'Báo cáo' },
];

const TITLES = {
  '/admin': 'Dashboard',
  '/admin/chat': 'Tin nhắn & Hỗ trợ khách hàng',
  '/admin/products': 'Quản lý sản phẩm',
  '/admin/inventory': 'Nhập xuất kho',
  '/admin/warehouses': 'Quản lý kho hàng',
  '/admin/categories': 'Quản lý danh mục',
  '/admin/brands': 'Quản lý thương hiệu',
  '/admin/users': 'Quản lý người dùng',
  '/admin/orders': 'Quản lý đơn hàng',
  '/admin/deliveries': 'Quản lý giao hàng',
  '/admin/shippers': 'Đội ngũ Shipper',
  '/admin/vouchers': 'Quản lý mã giảm giá',
  '/admin/reports': 'Báo cáo & thống kê',
  '/admin/ai': 'Cấu hình Trợ lý AI',
  '/admin/profile': 'Cài đặt tài khoản',
};

function resolveTitle(pathname) {
  if (pathname === '/admin/products/new') return 'Thêm sản phẩm';
  if (/^\/admin\/products\/\d+\/edit$/.test(pathname)) return 'Sửa sản phẩm';
  if (/^\/admin\/products\/\d+$/.test(pathname)) return 'Chi tiết sản phẩm';
  if (pathname === '/admin/warehouses/new') return 'Thêm kho hàng';
  if (/^\/admin\/warehouses\/\d+\/edit$/.test(pathname)) return 'Sửa kho hàng';
  if (/^\/admin\/warehouses\/\d+$/.test(pathname)) return 'Chi tiết kho hàng';
  if (/^\/admin\/deliveries\/\d+$/.test(pathname)) return 'Chi tiết phiếu giao hàng';
  if (pathname === '/admin/categories/new') return 'Thêm danh mục';
  if (/^\/admin\/categories\/\d+\/edit$/.test(pathname)) return 'Sửa danh mục';
  if (pathname === '/admin/vouchers/new') return 'Thêm mã giảm giá';
  if (/^\/admin\/vouchers\/\d+\/edit$/.test(pathname)) return 'Sửa mã giảm giá';
  if (/^\/admin\/orders\/\d+$/.test(pathname)) return 'Chi tiết đơn hàng';
  if (/^\/admin\/users\/\d+$/.test(pathname)) return 'Chi tiết người dùng';
  if (TITLES[pathname]) return TITLES[pathname];
  const match = Object.keys(TITLES)
    .filter((k) => k !== '/admin' && pathname.startsWith(k))
    .sort((a, b) => b.length - a.length)[0];
  return TITLES[match] || 'Admin';
}

function buildBreadcrumb(pathname) {
  const segments = pathname.split('/').filter(Boolean);
  if (segments.length === 0) return [{ label: 'Admin', href: '/admin' }];
  if (segments[0] !== 'admin') return [{ label: 'Admin', href: '/admin' }];

  const crumbs = [{ label: 'Admin', href: '/admin' }];
  let currentPath = '/admin';

  for (let i = 1; i < segments.length; i++) {
    currentPath += '/' + segments[i];
    const isLast = i === segments.length - 1;

    if (/^\d+$/.test(segments[i])) {
      continue;
    }
    if (segments[i] === 'new' || segments[i] === 'edit') {
      continue;
    }

    let label = TITLES[currentPath];
    if (!label) {
      label = segments[i].charAt(0).toUpperCase() + segments[i].slice(1);
    }
    crumbs.push({ label, href: isLast ? null : currentPath });
  }
  return crumbs;
}

export default function AdminLayout() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [unreadChatCount, setUnreadChatCount] = useState(0);
  const title = resolveTitle(location.pathname);
  const breadcrumbs = buildBreadcrumb(location.pathname);

  useEffect(() => {
    let isMounted = true;
    const checkUnread = async () => {
      try {
        const count = await fetchAdminUnreadCount();
        if (isMounted) setUnreadChatCount(count);
      } catch (e) {}
    };
    checkUnread();
    const timer = setInterval(checkUnread, 5000);
    return () => {
      isMounted = false;
      clearInterval(timer);
    };
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="hg-admin">
      {sidebarOpen && (
        <button
          type="button"
          className="hg-admin-overlay"
          aria-label="Đóng menu"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside className={`hg-admin-sidebar ${sidebarOpen ? 'open' : ''}`} role="navigation" aria-label="Admin navigation">
        <div className="hg-admin-brand">
          <div className="hg-admin-brand-mark">H&G</div>
          <div>
            <div className="hg-admin-brand-title">Admin Panel</div>
            <div className="hg-admin-brand-sub">Technology & Camera</div>
          </div>
        </div>

        <nav className="hg-admin-nav">
          {NAV.map(({ to, end, icon: Icon, label, badgeKey }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) => `hg-admin-nav-item ${isActive ? 'active' : ''}`}
              onClick={() => setSidebarOpen(false)}
            >
              <Icon size={17} />
              <span>{label}</span>
              {badgeKey === 'chat' && unreadChatCount > 0 && (
                <span className="hg-admin-nav-badge">{unreadChatCount}</span>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="hg-admin-sidebar-foot">
          <Link to="/shipper" className="hg-admin-nav-item" onClick={() => setSidebarOpen(false)} style={{ color: '#ea580c', fontWeight: 600 }}>
            <Truck size={16} />
            <span>Cổng Shipper</span>
          </Link>
          <Link to="/" className="hg-admin-nav-item" onClick={() => setSidebarOpen(false)}>
            <Eye size={16} />
            <span>Xem website</span>
          </Link>
          <button type="button" className="hg-admin-nav-item danger" onClick={handleLogout}>
            <LogOut size={16} />
            <span>Đăng xuất</span>
          </button>
        </div>
      </aside>

      <div className="hg-admin-main">
        <header className="hg-admin-header">
          <div className="hg-admin-header-left">
            <button
              type="button"
              className="hg-admin-menu-btn"
              onClick={() => setSidebarOpen(true)}
              aria-label="Mở menu"
            >
              <Menu size={20} />
            </button>

            <nav className="hg-admin-breadcrumb" aria-label="Breadcrumb">
              {breadcrumbs.map((crumb, idx) => (
                <span key={crumb.href || idx} className="breadcrumb-item">
                  {idx > 0 && <ChevronRight size={13} className="breadcrumb-sep" />}
                  {crumb.href ? (
                    <Link to={crumb.href} className="breadcrumb-link">{crumb.label}</Link>
                  ) : (
                    <span className="breadcrumb-current">{crumb.label}</span>
                  )}
                </span>
              ))}
            </nav>

            <h1 className="hg-admin-page-title">{title}</h1>
          </div>

          <div className="hg-admin-header-right">
            <button
              type="button"
              className="hg-admin-header-btn"
              onClick={() => setNotificationsOpen(!notificationsOpen)}
              aria-label="Thông báo"
              aria-expanded={notificationsOpen}
            >
              <Bell size={20} />
              <span className="hg-admin-badge">3</span>
            </button>

            <div className={`hg-admin-dropdown ${notificationsOpen ? 'open' : ''}`}>
              <div className="hg-admin-dropdown-arrow" />
              <div className="hg-admin-dropdown-panel">
                <div className="hg-admin-dropdown-header">
                  <h3>Thông báo</h3>
                  <span className="text-muted text-sm">3 mới</span>
                </div>
                <div className="hg-admin-notification-list">
                  <div className="hg-admin-notification-item unread">
                    <div className="hg-admin-notification-icon">
                      <Package size={16} />
                    </div>
                    <div className="hg-admin-notification-content">
                      <div className="hg-admin-notification-title">Sản phẩm mới cần duyệt</div>
                      <div className="hg-admin-notification-desc">Có 2 sản phẩm chờ phê duyệt</div>
                      <div className="hg-admin-notification-time">5 phút trước</div>
                    </div>
                  </div>
                  <div className="hg-admin-notification-item unread">
                    <div className="hg-admin-notification-icon warning">
                      <AlertTriangle size={16} />
                    </div>
                    <div className="hg-admin-notification-content">
                      <div className="hg-admin-notification-title">Tồn kho thấp</div>
                      <div className="hg-admin-notification-desc">5 sản phẩm sắp hết hàng</div>
                      <div className="hg-admin-notification-time">15 phút trước</div>
                    </div>
                  </div>
                  <div className="hg-admin-notification-item">
                    <div className="hg-admin-notification-icon success">
                      <CheckCircle size={16} />
                    </div>
                    <div className="hg-admin-notification-content">
                      <div className="hg-admin-notification-title">Đơn hàng #DH1234 đã giao</div>
                      <div className="hg-admin-notification-desc">Khách hàng xác nhận nhận hàng</div>
                      <div className="hg-admin-notification-time">1 giờ trước</div>
                    </div>
                  </div>
                </div>
                <Link to="/admin/reports" className="hg-admin-dropdown-footer">
                  Xem tất cả thông báo
                </Link>
              </div>
            </div>

            <div className="hg-admin-user-menu">
              <button
                type="button"
                className="hg-admin-user-btn"
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                aria-label="Tài khoản"
                aria-expanded={userMenuOpen}
              >
                <div className="hg-admin-avatar">
                  {(user?.username || 'A').charAt(0).toUpperCase()}
                </div>
                <div className="hg-admin-user-info">
                  <span className="hg-admin-user-name">{user?.fullName || user?.username || 'Admin'}</span>
                  <span className="hg-admin-user-role">Quản trị viên</span>
                </div>
                <ChevronRight size={14} className={`hg-admin-user-chevron ${userMenuOpen ? 'rotated' : ''}`} />
              </button>

              <div className={`hg-admin-dropdown ${userMenuOpen ? 'open' : ''}`}>
                <div className="hg-admin-dropdown-arrow" />
                <div className="hg-admin-dropdown-panel user-menu">
                  <div className="hg-admin-dropdown-header">
                    <div className="hg-admin-user-avatar-large">
                      {(user?.username || 'A').charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="hg-admin-user-name-large">{user?.fullName || user?.username || 'Admin'}</div>
                      <div className="hg-admin-user-email">{user?.email || 'admin@hg.com'}</div>
                    </div>
                  </div>
                  <div className="hg-admin-dropdown-divider" />
                  <Link to="/admin/profile" className="hg-admin-dropdown-item" onClick={() => setUserMenuOpen(false)}>
                    <Settings size={16} />
                    <span>Cài đặt tài khoản</span>
                  </Link>
                  <button type="button" className="hg-admin-dropdown-item danger" onClick={handleLogout}>
                    <LogOut size={16} />
                    <span>Đăng xuất</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </header>

        <main className="hg-admin-content" role="main">
          <Outlet />
        </main>
      </div>
    </div>
  );
}