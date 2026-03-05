/**
 * API Endpoint Service
 */

import api from './api';

const apiEndpointService = {
  async getAll(params = {}) {
    const { data } = await api.get('/admin/api-endpoints', { params });
    return data;
  },

  async getOne(id) {
    const { data } = await api.get(`/admin/api-endpoints/${id}`);
    return data.data;
  },

  async create(endpoint) {
    const { data } = await api.post('/admin/api-endpoints', endpoint);
    return data.data;
  },

  async update(id, updates) {
    const { data } = await api.put(`/admin/api-endpoints/${id}`, updates);
    return data.data;
  },

  async delete(id) {
    const { data } = await api.delete(`/admin/api-endpoints/${id}`);
    return data.data;
  },

  async test(id, parameters) {
    const { data } = await api.post(`/admin/api-endpoints/${id}/test`, { parameters });
    return data.data;
  },

  async getAnalytics(id, days = 7) {
    const { data } = await api.get(`/admin/api-endpoints/${id}/analytics`, {
      params: { days }
    });
    return data.data;
  },

  async analyzeQuery(dataSourceId, query) {
    const { data } = await api.post('/admin/api-endpoints/analyze-query', {
      data_source_id: dataSourceId,
      query
    });
    return data.data;
  },

  async exportData() {
    const response = await api.get('/admin/api-endpoints/export', { responseType: 'blob' });
    
    // Create blob link to download
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    
    // Get filename from header or default
    const contentDisposition = response.headers['content-disposition'];
    let fileName = `api-endpoints-${new Date().toISOString().slice(0, 10)}.json`;
    if (contentDisposition) {
      const match = contentDisposition.match(/filename="?([^"]+)"?/);
      if (match) fileName = match[1];
    }
    
    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();
    link.remove();
  },

  async importData(data) {
    const response = await api.post('/admin/api-endpoints/import', { data });
    return response.data;
  }
};

export default apiEndpointService;
