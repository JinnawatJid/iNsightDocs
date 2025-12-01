import axios from 'axios';

const API_URL = '/api/credit-requests';

export default {
  async createCreditRequest(customerNo, customerName) {
    try {
      const response = await axios.post(`${API_URL}`, {
        customer_no: customerNo,
        customer_name: customerName
      });
      return response.data;
    } catch (error) {
      console.error('Error creating credit request:', error);
      throw error;
    }
  }
};
