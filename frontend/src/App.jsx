import { BrowserRouter, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import Header from './components/Header';
import Footer from './components/Footer';
import Chatbot from './components/Chatbot';
import { ToastProvider } from './components/Toast';
import Home from './pages/Home';
import Products from './pages/Products';
import ProductDetail from './pages/ProductDetail';
import Cart from './pages/Cart';
import Checkout from './pages/Checkout';
import Login from './pages/Login';
import Register from './pages/Register';
import Profile from './pages/Profile';
import Orders from './pages/Orders';
import Wishlist from './pages/Wishlist';
import AccountOverview from './pages/AccountOverview';
import AdminLayout from './layouts/AdminLayout';
import Dashboard from './pages/admin/Dashboard';
import ProductList from './pages/admin/products/ProductList';
import ProductForm from './pages/admin/products/ProductForm';
import AdminProductDetail from './pages/admin/products/ProductDetail';
import CategoryList from './pages/admin/categories/CategoryList';
import UserList from './pages/admin/users/UserList';
import OrderList from './pages/admin/orders/OrderList';
import AdminOrderDetail from './pages/admin/orders/OrderDetail';
import CustomerOrderDetail from './pages/OrderDetail';
import VoucherList from './pages/admin/vouchers/VoucherList';
import Reports from './pages/admin/Reports';
import BrandList from './pages/admin/brands/BrandList';
import InventoryManager from './pages/admin/inventory/InventoryManager';
import AISettings from './pages/admin/AISettings';
import AdminChat from './pages/admin/chat/AdminChat';
import AdminDeliveryList from './pages/admin/deliveries/AdminDeliveryList';
import AdminDeliveryDetail from './pages/admin/deliveries/AdminDeliveryDetail';
import AdminShipperList from './pages/admin/deliveries/AdminShipperList';
import ShipperLayout from './layouts/ShipperLayout';
import ShipperDashboard from './pages/shipper/ShipperDashboard';
import ShipperDeliveryDetail from './pages/shipper/ShipperDeliveryDetail';
import WarehouseList from './pages/admin/warehouses/WarehouseList';
import WarehouseForm from './pages/admin/warehouses/WarehouseForm';
import WarehouseDetail from './pages/admin/warehouses/WarehouseDetail';
import AdminProfile from './pages/admin/AdminProfile';
import { useAuthStore } from './store';

function PrivateRoute({ children, adminOnly = false, shipperOnly = false }) {
  const { isAuthenticated, user } = useAuthStore();
  const location = useLocation();
  if (!isAuthenticated) return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  if (adminOnly && user?.role !== 'ROLE_ADMIN' && user?.role !== 'ADMIN') return <Navigate to="/" replace />;
  if (shipperOnly && user?.role !== 'ROLE_SHIPPER' && user?.role !== 'SHIPPER' && user?.role !== 'ROLE_ADMIN' && user?.role !== 'ADMIN') {
    return <Navigate to="/" replace />;
  }
  return children;
}

function MainLayout({ children }) {
  return (
    <>
      <Header />
      {children}
      <Footer />
      <Chatbot />
    </>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          <Route
            path="/admin"
            element={
              <PrivateRoute adminOnly>
                <AdminLayout />
              </PrivateRoute>
            }
          >
            <Route index element={<Dashboard />} />
            <Route path="inventory" element={<InventoryManager />} />
            <Route path="warehouses" element={<WarehouseList />} />
            <Route path="warehouses/new" element={<WarehouseForm />} />
            <Route path="warehouses/:id" element={<WarehouseDetail />} />
            <Route path="warehouses/:id/edit" element={<WarehouseForm />} />
            <Route path="products" element={<ProductList />} />
            <Route path="products/new" element={<ProductForm />} />
            <Route path="products/:id" element={<AdminProductDetail />} />
            <Route path="products/:id/edit" element={<ProductForm />} />
            <Route path="categories" element={<CategoryList />} />
            <Route path="users" element={<UserList />} />
            <Route path="orders" element={<OrderList />} />
            <Route path="orders/:id" element={<AdminOrderDetail />} />
            <Route path="deliveries" element={<AdminDeliveryList />} />
            <Route path="deliveries/:id" element={<AdminDeliveryDetail />} />
            <Route path="shippers" element={<AdminShipperList />} />
            <Route path="vouchers" element={<VoucherList />} />
            <Route path="brands" element={<BrandList />} />
            <Route path="reports" element={<Reports />} />
            <Route path="chat" element={<AdminChat />} />
            <Route path="ai" element={<AISettings />} />
            <Route path="profile" element={<AdminProfile />} />
          </Route>

          <Route
            path="/shipper"
            element={
              <PrivateRoute shipperOnly>
                <ShipperLayout />
              </PrivateRoute>
            }
          >
            <Route index element={<ShipperDashboard />} />
            <Route path="deliveries" element={<ShipperDashboard />} />
            <Route path="deliveries/:id" element={<ShipperDeliveryDetail />} />
            <Route path=":id" element={<ShipperDeliveryDetail />} />
          </Route>

          <Route path="/account" element={
            <MainLayout>
              <PrivateRoute><AccountOverview /></PrivateRoute>
            </MainLayout>
          } />
          <Route path="/" element={<MainLayout><Home /></MainLayout>} />
          <Route path="/products" element={<MainLayout><Products /></MainLayout>} />
          <Route path="/products/:id" element={<MainLayout><ProductDetail /></MainLayout>} />
          <Route path="/cart" element={<MainLayout><Cart /></MainLayout>} />
          <Route path="/checkout" element={
            <MainLayout>
              <PrivateRoute><Checkout /></PrivateRoute>
            </MainLayout>
          } />
          <Route path="/profile" element={
            <MainLayout>
              <PrivateRoute><Profile /></PrivateRoute>
            </MainLayout>
          } />
          <Route path="/orders" element={
            <MainLayout>
              <PrivateRoute><Orders /></PrivateRoute>
            </MainLayout>
          } />
          <Route path="/orders/:id" element={
            <MainLayout>
              <PrivateRoute><CustomerOrderDetail /></PrivateRoute>
            </MainLayout>
          } />
          <Route path="/wishlist" element={
            <MainLayout>
              <PrivateRoute><Wishlist /></PrivateRoute>
            </MainLayout>
          } />
          <Route path="*" element={
            <MainLayout>
              <div style={{ textAlign: 'center', padding: '120px 0', color: 'var(--text-muted)' }}>
                <div style={{ fontSize: '80px', marginBottom: '16px', opacity: 0.15 }}>404</div>
                <div style={{ fontSize: '20px', fontWeight: 700, marginBottom: '8px', color: 'var(--text-primary)' }}>Trang không tìm thấy</div>
                <p style={{ fontSize: '14px', marginBottom: '20px' }}>Trang bạn tìm kiếm không tồn tại hoặc đã bị xóa.</p>
                <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '12px 24px', borderRadius: 'var(--radius-full)', background: 'var(--primary)', color: '#fff', fontWeight: 600, fontSize: 'var(--text-sm)', textDecoration: 'none' }}>
                  Về trang chủ
                </Link>
              </div>
            </MainLayout>
          } />
        </Routes>
      </BrowserRouter>
    </ToastProvider>
  );
}
