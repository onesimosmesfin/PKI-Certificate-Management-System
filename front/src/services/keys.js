import api from '../api/axios';

export const getMyKeys = async () => {
  const response = await api.get('/hsm/my-keys');
  return Array.isArray(response.data) ? response.data : [];
};
export const getAllKeys = async () => {
  const response = await api.get('/hsm/all-keys');
  return Array.isArray(response.data) ? response.data : [];
};