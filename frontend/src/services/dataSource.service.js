/**
 * DataSource Service
 * Handles data source operations
 */

import api from './api';

const dataSourceService = {
  async getAll(params = {}) {
    const { data } = await api.get('/admin/data-sources', { params });
    return data;
  },

  async getOne(id) {
    const { data } = await api.get(`/admin/data-sources/${id}`);
    return data.data;
  },

  async create(dataSource) {
    const { data } = await api.post('/admin/data-sources', dataSource);
    return data.data;
  },

  async update(id, updates) {
    const { data } = await api.put(`/admin/data-sources/${id}`, updates);
    return data.data;
  },

  async delete(id) {
    const { data } = await api.delete(`/admin/data-sources/${id}`);
    return data.data;
  },

  async testConnection(id) {
    const { data } = await api.post(`/admin/data-sources/${id}/test-connection`);
    return data.data;
  },

  async testConnectionBeforeSave(connectionData) {
    const { data } = await api.post('/admin/data-sources/test', connectionData);
    return data.data;
  },

  async exportData() {
    const response = await api.get('/admin/data-sources/export', { responseType: 'blob' });
    
    // Create blob link to download
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    
    // Get filename from header or default
    const contentDisposition = response.headers['content-disposition'];
    let fileName = `data-sources-${new Date().toISOString().slice(0, 10)}.json`;
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
    const response = await api.post('/admin/data-sources/import', { data });
    return response.data;
  }
};

export default dataSourceService;
