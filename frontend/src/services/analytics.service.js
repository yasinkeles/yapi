/**
 * Analytics Service
 */

import api from './api';

const analyticsService = {
  /**
   * Get analytics overview
   * @param {number} days - Number of days to look back
   * @returns {Promise<Object>}
   */
  async getOverview(days = 7) {
    const response = await api.get('/admin/analytics', { params: { days } });
    return response.data.data;
  },

  /**
   * Get request logs
   * @param {Object} params - Query parameters (page, limit, endpointId, status)
   * @returns {Promise<Object>}
   */
  async getLogs(params = {}) {
    const response = await api.get('/admin/analytics/logs', { params });
    return response.data;
  }
};

export default analyticsService;
