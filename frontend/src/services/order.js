import api from './api';

export const placeOrder = async ({ shippingAddressId, paymentMethod, customerNote }) => {
  const res = await api.post('/orders/customer/checkout', {
    shippingAddressId,
    paymentMethod,
    customerNote,
  });
  return res.data;
};

export const getCustomerOrders = async () => {
  const res = await api.get('/orders/customer');
  return res.data.orders;
};

export const getCustomerOrderDetail = async (orderId) => {
  const res = await api.get(`/orders/customer/${orderId}`);
  return res.data.order;
};

export const getSellerOrders = async () => {
  const res = await api.get('/orders/seller');
  return res.data.orders;
};

export const getSellerOrderDetail = async (orderId) => {
  const res = await api.get(`/orders/seller/${orderId}`);
  return res.data.order;
};

export const updateSellerOrderStatus = async (orderId, status) => {
  return api.put(`/orders/seller/${orderId}/status`, { status });
};
