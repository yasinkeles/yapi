import api from './api';

// Admin pages API
export const listPages = (params = {}) => api.get('/admin/pages', { params });
export const getPage = (id) => api.get(`/admin/pages/${id}`);
export const createPage = (payload) => api.post('/admin/pages', payload);
export const updatePage = (id, payload) => api.put(`/admin/pages/${id}`, payload);
export const addPageVersion = (id, payload) => api.post(`/admin/pages/${id}/versions`, payload);
export const listPageVersions = (id) => api.get(`/admin/pages/${id}/versions`);
export const publishPage = (id, payload) => api.post(`/admin/pages/${id}/publish`, payload);
export const archivePage = (id) => api.delete(`/admin/pages/${id}`);
export const hardDeletePage = (id) => api.delete(`/admin/pages/${id}/hard`);
export const restorePage = (id) => api.post(`/admin/pages/${id}/restore`);
export const getPagePreviewBySlug = (slug) => api.get(`/admin/pages/preview/${slug}`);

// Runtime
export const getPublishedPageBySlug = (slug) => api.get(`/pages/${slug}`);
