import api from './api';

export const getAddresses = async () => {
  const res = await api.get('/addresses');
  return res.data.addresses;
};

export const getAddress = async (id) => {
  const res = await api.get(`/addresses/${id}`);
  return res.data.address;
};

export const createAddress = async (address) => {
  const res = await api.post('/addresses', address);
  return res.data.address;
};

export const updateAddress = async (id, address) => {
  const res = await api.put(`/addresses/${id}`, address);
  return res.data.address;
};

export const deleteAddress = async (id) => {
  return api.delete(`/addresses/${id}`);
};

export const setDefaultAddress = async (id) => {
  return api.put(`/addresses/${id}/default`);
};
