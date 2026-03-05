/**
 * API Key Service
 */

import apiClient from './api.client';

const apiKeyService = {
  /**
   * Get all API keys
   */
  getAll: async () => {
    const response = await apiClient.get('/admin/api-keys');
    return response.data;
  },

  /**
   * Get single API key
   */
  getOne: async (id) => {
    const response = await apiClient.get(`/admin/api-keys/${id}`);
    return response.data;
  },

  /**
   * Create new API key
   */
  create: async (data) => {
    const response = await apiClient.post('/admin/api-keys', data);
    return response.data;
  },

  /**
   * Update API key
   */
  update: async (id, data) => {
    const response = await apiClient.put(`/admin/api-keys/${id}`, data);
    return response.data;
  },

  /**
   * Revoke API key
   */
  revoke: async (id) => {
    const response = await apiClient.put(`/admin/api-keys/${id}/revoke`);
    return response.data;
  },

  /**
   * Activate API key
   */
  activate: async (id) => {
    const response = await apiClient.put(`/admin/api-keys/${id}/activate`);
    return response.data;
  },

  /**
   * Delete API key
   */
  delete: async (id) => {
    const response = await apiClient.delete(`/admin/api-keys/${id}`);
    return response.data;
  },

  /**
   * Get API key statistics
   */
  getStats: async (id, days = 7) => {
    const response = await apiClient.get(`/admin/api-keys/${id}/stats?days=${days}`);
    return response.data;
  }
};

export default apiKeyService;
