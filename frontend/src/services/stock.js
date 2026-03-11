import api from './api';

// Warehouses
export const getWarehouses = () => api.get('/seller/stock/warehouses');
export const createWarehouse = (payload) => api.post('/seller/stock/warehouses', payload);
export const updateWarehouse = (id, payload) => api.put(`/seller/stock/warehouses/${id}`, payload);
export const deleteWarehouse = (id) => api.delete(`/seller/stock/warehouses/${id}`);

// Inventory
export const getInventory = (params = {}) => api.get('/seller/stock/inventory', { params });
export const upsertInventory = (payload) => api.post('/seller/stock/inventory', payload);
export const deleteInventory = (id) => api.delete(`/seller/stock/inventory/${id}`);
export const transferStock = (payload) => api.post('/seller/stock/inventory/transfer', payload);

// Stock Movements
export const getMovements = (params = {}) => api.get('/seller/stock/movements', { params });
export const createMovement = (payload) => api.post('/seller/stock/movements', payload);
