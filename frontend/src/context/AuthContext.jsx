/**
 * Auth Context
 * Manages authentication state globally
 */

import { createContext, useContext, useState, useEffect } from 'react';
import authService from '../services/auth.service';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      try {
        const storedUser = authService.getStoredUser();
        if (storedUser) {
          // Verify session and get fresh user data
          // This also ensures the token is valid or refreshed by interceptors
          const freshUser = await authService.getCurrentUser();
          setUser(freshUser);

          // Pre-fetch permissions while we are at it
          const { fetchRolePermissions } = await import('../config/permissions');
          await fetchRolePermissions(true);
        }
      } catch (error) {
        console.error('Auth initialization failed:', error);
        // If 401, user is definitely logged out
        if (error.response?.status === 401) {
          setUser(null);
        }
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, []);

  const login = async (username, password, twoFactorCode) => {
    const data = await authService.login(username, password, twoFactorCode);
    if (data && data.user) {
      setUser(data.user);

      // Also pre-fetch permissions immediately after login
      try {
        const { fetchRolePermissions } = await import('../config/permissions');
        await fetchRolePermissions(true);
      } catch (err) {
        console.warn('Failed to pre-fetch permissions after login', err);
      }
    }
    return data;
  };

  const logout = async () => {
    await authService.logout();
    setUser(null);
  };

  const value = {
    user,
    setUser,
    loading,
    login,
    logout,
    isAuthenticated: !!user
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
