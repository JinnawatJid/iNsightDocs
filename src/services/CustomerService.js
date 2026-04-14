import axios from '../utils/axios.js';

const API_URL = '/api/customers';

export default {
  async searchCustomers(query, fetchBy = 'vat') {
    try {
      const response = await axios.get(`${API_URL}/search`, {
        params: { q: query, fetch_purchase_by: fetchBy },
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching customer data:', error);
      throw error;
    }
  },

  async getSuggestions(query) {
    try {
      const response = await axios.get(`${API_URL}/suggestions`, {
        params: { q: query },
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching suggestions:', error);
      return [];
    }
  },

  async updateCustomer(id, data) {
    try {
      const response = await axios.patch(`${API_URL}/${id}`, data);
      return response.data;
    } catch (error) {
      console.error('Error updating customer:', error);
      throw error;
    }
  },
};
