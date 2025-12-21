import axios from 'axios';

// Assume base URL is configured in axios or via proxy
const API_URL = '/api/credit-requests';

export default {
  // Supports multipart/form-data
  async createCreditRequest(data) {
    if (data instanceof FormData) {
        return axios.post(API_URL, data, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
    } else {
        // If regular JSON (for initialization)
        // Convert to FormData or send as JSON?
        // Backend expects multipart/form-data due to upload.any()
        // But multer usually handles JSON body if no files too.
        // Let's safe bet: Convert simple object to FormData
        const formData = new FormData();
        for (const key in data) {
            formData.append(key, data[key]);
        }
        return axios.post(API_URL, formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
    }
  },

  async getCreditRequests(status) {
    let url = API_URL;
    if (status) {
      url += `?status=${status}`;
    }
    return axios.get(url);
  },

  async cancelCreditRequest(id) {
    return axios.patch(`${API_URL}/${id}/cancel`);
  }
};
