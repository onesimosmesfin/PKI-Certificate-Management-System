import api from '../api/axios';

export const getMyCsrs = async () => {
  const response = await api.get('/csr/my');
  return Array.isArray(response.data) ? response.data : [];
};

export const getAllCsrs = async () => {
  const response = await api.get('/csr/list');
  if (Array.isArray(response.data)) {
    return response.data;
  }
  return Array.isArray(response.data?.data) ? response.data.data : [];
};

export const deleteCsrById = async (id) => {
  return api.delete(`/csr/${id}`);
};

export const exportCsrById = async (id) => {
  const response = await api.get(`/csr/export/${id}`, { responseType: 'blob' });
  return response.data;
};

export const importCsr = async ({ alias, pem }) => {
  return api.post(`/csr/import?alias=${encodeURIComponent(alias)}`, pem, {
    headers: {
      'Content-Type': 'text/plain',
    },
  });
};
