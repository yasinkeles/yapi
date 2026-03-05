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

// Layout
import Layout from './components/layout/Layout';
import { hasPermissionSync } from './config/permissions';

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

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

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

// Permission Guard Component
const PermissionGuard = ({ children, path }) => {
  const { user } = useAuth();

  if (!hasPermissionSync(user?.role, path)) {
    return <Navigate to="/" replace />;
  }

  // 2FA Enforcement: Redirect to profile if 2FA is required but not enabled
  // Exempt the profile page itself to avoid infinite loops
  if (path !== '/profile' && user && !user.two_factor_enabled) {
    return <Navigate to="/profile?2fa_required=true" replace />;
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
          {/* Public routes */}
          <Route path="/login" element={<Login />} />

          {/* Protected routes */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route index element={<PermissionGuard path="/"><Dashboard /></PermissionGuard>} />
            <Route path="data-sources" element={<PermissionGuard path="/data-sources"><DataSources /></PermissionGuard>} />
            <Route path="api-endpoints" element={<PermissionGuard path="/api-endpoints"><ApiEndpoints /></PermissionGuard>} />
            <Route path="api-keys" element={<PermissionGuard path="/api-keys"><ApiKeys /></PermissionGuard>} />
            <Route path="analytics" element={<PermissionGuard path="/analytics"><Analytics /></PermissionGuard>} />
            <Route path="profile" element={<PermissionGuard path="/profile"><Profile /></PermissionGuard>} />
            <Route path="users" element={<PermissionGuard path="/users"><Users /></PermissionGuard>} />
            <Route path="roles" element={<PermissionGuard path="/roles"><Roles /></PermissionGuard>} />
          </Route>

          {/* 404 */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
