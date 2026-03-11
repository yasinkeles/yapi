import api from './api';

// Admin menus API
export const listMenus = () => api.get('/admin/menus');
export const getMenu = (id) => api.get(`/admin/menus/${id}`);
export const createMenu = (payload) => api.post('/admin/menus', payload);
export const updateMenu = (id, payload) => api.put(`/admin/menus/${id}`, payload);
export const deleteMenu = (id) => api.delete(`/admin/menus/${id}`);

export const addMenuItem = (menuId, payload) => api.post(`/admin/menus/${menuId}/items`, payload);
export const updateMenuItem = (itemId, payload) => api.put(`/admin/menus/items/${itemId}`, payload);
export const deleteMenuItem = (itemId) => api.delete(`/admin/menus/items/${itemId}`);

// Runtime
export const getMenuByKey = (key) => api.get(`/menus/${key}`);
