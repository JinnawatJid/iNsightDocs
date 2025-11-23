// src/services/CustomerService.js
import axios from 'axios';

// In development with Vite proxy, this will go to http://localhost:3000/api/customers/search
const API_URL = '/api/customers';

export default {
  async searchCustomers(query) {
    try {
      const response = await axios.get(`${API_URL}/search`, {
        params: { q: query }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching customer data:', error);
      throw error;
    }
  }
};
