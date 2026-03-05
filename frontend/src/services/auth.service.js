/**
 * Auth Service
 * Handles authentication operations
 */

import api from './api';

const authService = {
  /**
   * Login user
   */
  async login(username, password, twoFactorCode) {
    const { data } = await api.post('/admin/auth/login', {
      username,
      password,
      twoFactorCode
    });

    if (data.require2fa) {
      return data;
    }

    if (data.success && data.data && data.data.accessToken) {
      localStorage.setItem('accessToken', data.data.accessToken);
      localStorage.setItem('refreshToken', data.data.refreshToken);
      localStorage.setItem('user', JSON.stringify(data.data.user));
    }

    return data.data;
  },

  /**
   * Logout user
   */
  async logout() {
    const refreshToken = localStorage.getItem('refreshToken');

    try {
      await api.post('/admin/auth/logout', { refreshToken });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
    }
  },

  /**
   * Get current user
   */
  async getCurrentUser() {
    const { data } = await api.get('/admin/auth/me');
    return data.data;
  },

  /**
   * Change password
   */
  async changePassword(currentPassword, newPassword) {
    const { data } = await api.post('/admin/auth/change-password', {
      currentPassword,
      newPassword
    });
    return data.data;
  },

  /**
   * Get stored user from localStorage
   */
  getStoredUser() {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  },

  /**
   * Check if user is authenticated
   */
  isAuthenticated() {
    return !!localStorage.getItem('accessToken');
  }
};

export default authService;
