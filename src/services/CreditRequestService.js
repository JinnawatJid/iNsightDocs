import axios from 'axios';

const API_URL = '/api/credit-requests';

export default {
  // Updated to accept an object (params) or distinct arguments, keeping backward compatibility if possible
  async createCreditRequest(paramsOrCustomerNo, customerName) {
    try {
      let payload = {};

      if (typeof paramsOrCustomerNo === 'object') {
        // New usage: pass object
        payload = paramsOrCustomerNo;
      } else {
        // Old usage: pass customerNo, customerName
        payload = {
            customer_no: paramsOrCustomerNo,
            customer_name: customerName
        };
      }

      const response = await axios.post(`${API_URL}`, payload);
      return response.data;
    } catch (error) {
      console.error('Error creating credit request:', error);
      throw error;
    }
  },

  async getCreditRequests(status) {
    try {
      const response = await axios.get(`${API_URL}`, {
        params: { status }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching credit requests:', error);
      throw error;
    }
  }
};
