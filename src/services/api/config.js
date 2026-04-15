import axiosInstance from '../../utils/axios';

export const configApi = {
  /**
   * Fetch all configurations from the server.
   * Expected response format: { success: true, data: { 'Category': [{ config_key, config_value, ... }] } }
   */
  getConfigurations: async () => {
    const response = await axiosInstance.get('/api/config');
    return response.data;
  },

  /**
   * Update an array of configurations.
   * @param {Array} configs Array of objects: [{ config_key: 'KEY', config_value: 'VALUE' }]
   */
  updateConfigurations: async (configs) => {
    const response = await axiosInstance.put('/api/config', { configs });
    return response.data;
  }
};
