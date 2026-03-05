/**
 * API Service
 * Axios instance with interceptors for authentication
 */

import axios from 'axios';

// Use relative URLs in development to leverage Vite proxy
// In production, use environment variable or default to same host
const getApiBaseUrl = () => {
  // If explicitly set in .env, use it (for production)
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }

  // In development, use relative URLs to go through Vite proxy
  if (import.meta.env.DEV) {
    return ''; // Empty string = relative URLs
  }

  // In production, use current hostname with backend port
  const hostname = window.location.hostname;
  const protocol = window.location.protocol;
  return `${protocol}//${hostname}:3000`;
};

const API_BASE_URL = getApiBaseUrl();

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request interceptor - add JWT token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If 401 and not already retrying
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refreshToken');

        if (!refreshToken) {
          throw new Error('No refresh token');
        }

        // Attempt to refresh token
        const { data } = await axios.post(`${API_BASE_URL}/admin/auth/refresh`, {
          refreshToken
        });

        // Save new access token
        localStorage.setItem('accessToken', data.data.accessToken);

        // Retry original request with new token
        originalRequest.headers.Authorization = `Bearer ${data.data.accessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        // Refresh failed - clear storage and redirect to login
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
