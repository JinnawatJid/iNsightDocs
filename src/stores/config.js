import { defineStore } from 'pinia';
import { configApi } from '../services/api/config';

export const useConfigStore = defineStore('config', {
  state: () => ({
    configurations: {},
    isLoading: false,
    error: null,
  }),

  actions: {
    async fetchConfigurations() {
      this.isLoading = true;
      this.error = null;
      try {
        const response = await configApi.getConfigurations();
        if (response.success) {
          this.configurations = response.data;
        } else {
          this.error = response.message || 'Failed to fetch configurations';
        }
      } catch (err) {
        this.error = err.message || 'An error occurred while fetching configurations';
      } finally {
        this.isLoading = false;
      }
    },

    async updateConfigurations(updatedConfigs) {
      this.isLoading = true;
      this.error = null;
      try {
        const response = await configApi.updateConfigurations(updatedConfigs);
        if (response.success) {
          // Re-fetch to ensure state is in sync with DB
          await this.fetchConfigurations();
          return true;
        } else {
          this.error = response.message || 'Failed to update configurations';
          return false;
        }
      } catch (err) {
        this.error = err.message || 'An error occurred while updating configurations';
        return false;
      } finally {
        this.isLoading = false;
      }
    }
  }
});
