/**
 * Main App Component
 */

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';

// Pages
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import DataSources from './pages/DataSources';
import ApiEndpoints from './pages/ApiEndpoints';
import ApiKeys from './pages/ApiKeys';
import Analytics from './pages/Analytics';
import Users from './pages/Users';
import Roles from './pages/Roles';
import Profile from './pages/Profile';
import PagesBuilder from './pages/PagesBuilder';
import MenusBuilder from './pages/MenusBuilder';
import DynamicPage from './pages/DynamicPage';
import PageEditor from './pages/PageEditor';
import MenuEditor from './pages/MenuEditor';
import PageBuilder from './pages/PageBuilder';
import StoreHome from './pages/StoreHome';
import ShopPage from './pages/ShopPage';
import Catalog from './pages/Catalog';
import CustomerDashboard from './pages/CustomerDashboard';
import Cart from './pages/Cart';
import Checkout from './pages/Checkout';
import Orders from './pages/Orders';
import OrderDetail from './pages/OrderDetail';
import Addresses from './pages/Addresses';
import Settings from './pages/Settings';
import SellerStorefront from './pages/SellerStorefront';
import SellerProducts from './pages/SellerProducts';
import SellerPricing from './pages/SellerPricing';
import SellerStock from './pages/SellerStock';
import SellerAnalytics from './pages/SellerAnalytics';
import SellerSettings from './pages/SellerSettings';
import SellerProductEditor from './pages/SellerProductEditor';
import StorefrontDesigner from './pages/StorefrontDesigner';
import SellerOrders from './pages/SellerOrders';
import SellerCampaigns from './pages/SellerCampaigns';
import ProductDetail from './pages/ProductDetail';

// Layout
import Layout from './components/layout/Layout';
import StoreLayout from './components/layout/StoreLayout';
import AppLayout from './components/layout/AppLayout';
import { hasPermissionSync } from './config/permissions';

// Protected Route Component
const ProtectedRoute = ({ children, roles }) => {
  const { isAuthenticated, loading, user } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (roles && user && !roles.includes(user.role)) return <Navigate to="/login" replace />;

  return children;
};

// Permission Guard Component
const PermissionGuard = ({ children, path }) => {
  const { user } = useAuth();

  const allowed = hasPermissionSync(user?.role, path) || hasPermissionSync(user?.role, path.replace('/admin', ''));
  if (!allowed) {
    return <Navigate to="/" replace />;
  }

  if (
    path !== '/admin/profile' &&
    user &&
    user.role === 'admin' && // sadece admin için zorunlu
    !user.two_factor_enabled
  ) {
    return <Navigate to="/admin/profile?2fa_required=true" replace />;
  }

  return children;
};

function App() {
  return (
    <BrowserRouter
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true
      }}
    >
      <AuthProvider>
        <Routes>
          {/* Public storefront */}
          <Route path="/" element={<StoreLayout />}>
            <Route index element={<StoreHome />} />
            <Route path="shop" element={<ShopPage />} />
            <Route path="product/:slug" element={<ProductDetail />} />
          </Route>

          <Route path="/login" element={<Login />} />
          <Route path="/p/:slug" element={<DynamicPage />} />

          {/* Customer app */}
          <Route
            path="/app"
            element={
              <ProtectedRoute roles={['customer', 'seller', 'admin']}>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/app/account" replace />} />
            <Route path="account" element={<CustomerDashboard />} />
            <Route path="catalog" element={<Catalog />} />
            <Route path="cart" element={<Cart />} />
            <Route path="checkout" element={<Checkout />} />
            <Route path="orders" element={<Orders />} />
            <Route path="orders/:id" element={<OrderDetail />} />
            <Route path="addresses" element={<Addresses />} />
            <Route path="settings" element={<Settings />} />
          </Route>

          {/* Seller panel */}
          <Route
            path="/seller"
            element={
              <ProtectedRoute roles={['seller', 'admin']}>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/seller/storefront-designer" replace />} />
            <Route path="storefront-designer" element={<StorefrontDesigner />} />
            <Route path="products" element={<SellerProducts />} />
            <Route path="products/new" element={<SellerProductEditor />} />
            <Route path="products/:id/edit" element={<SellerProductEditor />} />
            <Route path="orders" element={<SellerOrders />} />
            <Route path="pricing" element={<SellerPricing />} />
            <Route path="campaigns" element={<SellerCampaigns />} />
            <Route path="stock" element={<SellerStock />} />
            <Route path="analytics" element={<SellerAnalytics />} />
            <Route path="settings" element={<SellerSettings />} />
          </Route>

          {/* Admin panel */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute roles={['admin']}>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route index element={<PermissionGuard path="/admin"><Dashboard /></PermissionGuard>} />
            <Route path="data-sources" element={<PermissionGuard path="/admin/data-sources"><DataSources /></PermissionGuard>} />
            <Route path="api-endpoints" element={<PermissionGuard path="/admin/api-endpoints"><ApiEndpoints /></PermissionGuard>} />
            <Route path="api-keys" element={<PermissionGuard path="/admin/api-keys"><ApiKeys /></PermissionGuard>} />
            <Route path="analytics" element={<PermissionGuard path="/admin/analytics"><Analytics /></PermissionGuard>} />
            <Route path="profile" element={<PermissionGuard path="/admin/profile"><Profile /></PermissionGuard>} />
            <Route path="users" element={<PermissionGuard path="/admin/users"><Users /></PermissionGuard>} />
            <Route path="roles" element={<PermissionGuard path="/admin/roles"><Roles /></PermissionGuard>} />
            <Route path="pages-builder" element={<PermissionGuard path="/admin/pages-builder"><PagesBuilder /></PermissionGuard>} />
            <Route path="pages-builder/new" element={<PermissionGuard path="/admin/pages-builder/*"><PageEditor /></PermissionGuard>} />
            <Route path="pages-builder/:id/edit" element={<PermissionGuard path="/admin/pages-builder/*"><PageEditor /></PermissionGuard>} />
            <Route path="pages/new" element={<PermissionGuard path="/admin/pages"><PageBuilder /></PermissionGuard>} />
            <Route path="pages/:id/edit" element={<PermissionGuard path="/admin/pages"><PageBuilder /></PermissionGuard>} />
            <Route path="menus" element={<PermissionGuard path="/admin/menus"><MenusBuilder /></PermissionGuard>} />
            <Route path="menus/new" element={<PermissionGuard path="/admin/menus/*"><MenuEditor /></PermissionGuard>} />
            <Route path="menus/:id/edit" element={<PermissionGuard path="/admin/menus/*"><MenuEditor /></PermissionGuard>} />
            <Route path="pages/:slug" element={<DynamicPage />} />
          </Route>

          {/* 404 */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
