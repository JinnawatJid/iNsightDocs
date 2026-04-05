import axios from '../utils/axios.js';

const API_URL = '/api/credit-requests';

export default {
  async createCreditRequest(data) {
    if (data instanceof FormData) {
      return axios.post(API_URL, data, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    }

    const formData = new FormData();
    for (const key in data) {
      formData.append(key, data[key]);
    }

    return axios.post(API_URL, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  async getCreditRequests(status) {
    let url = API_URL;
    if (status) {
      url += `?status=${status}`;
    }
    return axios.get(url);
  },

  async cancelCreditRequest(id) {
    return axios.patch(`${API_URL}/${encodeURIComponent(id)}/cancel`);
  },

  async reviseRequest(id) {
    return axios.post(`${API_URL}/${encodeURIComponent(id)}/revise`);
  },

  async getComments(txId) {
    return axios.get(`${API_URL}/${encodeURIComponent(txId)}/comments`);
  },

  async getCreditRequestDetail(txId) {
    return axios.get(`${API_URL}/${encodeURIComponent(txId)}/detail`);
  },

  async uploadAdditionalDocument(txId, formData) {
    return axios.post(`${API_URL}/${encodeURIComponent(txId)}/additional-documents`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  async deleteAdditionalDocument(txId, fileId, data) {
    return axios.delete(`${API_URL}/${encodeURIComponent(txId)}/files/${fileId}`, { data });
  },
};
