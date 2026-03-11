import api from './api';

export const getCart = async () => {
  const res = await api.get('/cart');
  return res.data.items;
};

export const addToCart = async (productId, quantity) => {
  return api.post('/cart/add', { productId, quantity });
};

export const updateCartItem = async (cartItemId, quantity) => {
  return api.put('/cart/update', { cartItemId, quantity });
};

export const removeCartItem = async (cartItemId) => {
  return api.delete('/cart/remove', { data: { cartItemId } });
};

export const clearCart = async () => {
  return api.delete('/cart/clear');
};
