import axios from '../utils/axios.js';

const API_URL = '/api/customers';

export default {
  async toggleBlacklist(data) {
    try {
      const response = await axios.post(`${API_URL}/blacklist`, data);
      return response.data;
    } catch (error) {
      console.error('Error upserting blacklist:', error);
      throw error;
    }
  },

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

  async checkCreditByVat(vatNo) {
    try {
      const response = await axios.get(`${API_URL}/check-credit-by-vat`, {
        params: { vatNo },
      });
      return response.data;
    } catch (error) {
      console.error('Error checking credit by VAT:', error);
      throw error;
    }
  },

  async getRecentApprovedRequest(customerNo) {
    try {
      const response = await axios.get(`/api/credit-requests/customer/${customerNo}/recent-approved`);
      return response.data;
    } catch (error) {
      console.error('Error fetching recent approved request:', error);
      throw error;
    }
  },

  async getCustomerProjects(customerNo) {
    try {
      const response = await axios.get(`${API_URL}/${encodeURIComponent(customerNo)}/projects`);
      return response.data;
    } catch (error) {
      console.error('Error fetching customer projects:', error);
      throw error;
    }
  },
};
