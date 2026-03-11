import api from './api';

export const getSellerSettings = () => api.get('/seller/settings');
export const saveSellerSettings = (payload) => api.put('/seller/settings', payload);
