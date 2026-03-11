import api from './api';

// Seller endpoints
export const getSellerProducts = (params = {}) => api.get('/seller/products', { params });
export const getSellerProduct = (id) => api.get(`/seller/products/${id}`);
export const createProduct = (payload) => api.post('/seller/products', payload);
export const updateProduct = (id, payload) => api.put(`/seller/products/${id}`, payload);
export const deleteProduct = (id) => api.delete(`/seller/products/${id}`);
export const replaceProductImages = (id, images) => api.put(`/seller/products/${id}/images`, { images });
export const replaceProductSpecifications = (id, specifications) => api.put(`/seller/products/${id}/specifications`, { specifications });

// Public endpoints
export const fetchCatalogProducts = (params = {}) => api.get('/store/products', { params });
export const fetchProductDetail = (slug) => api.get(`/store/products/${slug}`);
