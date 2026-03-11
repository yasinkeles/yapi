import api from './api';

export const getSalesOverview = (period = 30) => api.get('/seller/analytics/sales-overview', { params: { period } });
export const getProductPerformance = (period = 30) => api.get('/seller/analytics/product-performance', { params: { period } });
export const getCampaignPerformance = () => api.get('/seller/analytics/campaign-performance');
export const getInventoryHealth = () => api.get('/seller/analytics/inventory-health');
