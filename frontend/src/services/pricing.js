import api from './api';

// Price List
export const getPriceList = () => api.get('/seller/pricing/price-list');
export const updatePrice = (id, payload) => api.put(`/seller/pricing/price-list/${id}`, payload);
export const bulkUpdatePrices = (updates) => api.put('/seller/pricing/price-list/bulk', { updates });

// Campaigns
export const getCampaigns = () => api.get('/seller/pricing/campaigns');
export const getCampaign = (id) => api.get(`/seller/pricing/campaigns/${id}`);
export const createCampaign = (payload) => api.post('/seller/pricing/campaigns', payload);
export const updateCampaign = (id, payload) => api.put(`/seller/pricing/campaigns/${id}`, payload);
export const deleteCampaign = (id) => api.delete(`/seller/pricing/campaigns/${id}`);

// Coupons
export const getCoupons = () => api.get('/seller/pricing/coupons');
export const createCoupon = (payload) => api.post('/seller/pricing/coupons', payload);
export const updateCoupon = (id, payload) => api.put(`/seller/pricing/coupons/${id}`, payload);
export const deleteCoupon = (id) => api.delete(`/seller/pricing/coupons/${id}`);

// Scheduled Prices
export const getScheduledPrices = () => api.get('/seller/pricing/scheduled');
export const createScheduledPrice = (payload) => api.post('/seller/pricing/scheduled', payload);
export const updateScheduledPrice = (id, payload) => api.put(`/seller/pricing/scheduled/${id}`, payload);
export const deleteScheduledPrice = (id) => api.delete(`/seller/pricing/scheduled/${id}`);
