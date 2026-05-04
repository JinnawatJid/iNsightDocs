import { defineStore } from 'pinia';
import axiosInstance from '../utils/axios';
import { useAuthStore } from './auth';

const APPROVAL_ROLE_ALIASES = {
  'ผู้อนุมัติ (วงเงิน <300K)': 'ผู้อนุมัติ (วงเงินต่ำกว่าเกณฑ์)',
  'ผู้อนุมัติ (วงเงิน > 300K)': 'ผู้อนุมัติ (วงเงินสูงกว่าเกณฑ์)'
};

const normalizeRoleName = (roleName) => APPROVAL_ROLE_ALIASES[roleName] || roleName;

export const useRbacStore = defineStore('rbac', {
  state: () => ({
    matrixConfig: null,
    isLoading: false,
    error: null,
  }),

  getters: {
    hasPermission: (state) => {
      return (permissionKey) => {
        // If config isn't loaded yet, default to false (secure by default)
        if (!state.matrixConfig || !state.matrixConfig.matrix) return false;

        const authStore = useAuthStore();
        if (!authStore.user || !authStore.user.roles) return false;

        // Check if any of the user's roles has the requested permission
        return authStore.user.roles.some((userRoleObj) => {
          const roleName = normalizeRoleName(userRoleObj.role);
          const rolePermissions = state.matrixConfig.matrix[roleName] || [];
          return rolePermissions.includes(permissionKey);
        });
      };
    },
  },

  actions: {
    async fetchRbacConfig() {
      this.isLoading = true;
      this.error = null;
      try {
        const response = await axiosInstance.get('/api/config/rbac');
        if (response.data && response.data.success) {
          this.matrixConfig = response.data.data;
        } else {
          this.error = 'Failed to load RBAC configuration';
        }
      } catch (err) {
        this.error = err.message || 'An error occurred while fetching RBAC config';
        console.error('RBAC Fetch Error:', err);
      } finally {
        this.isLoading = false;
      }
    },
  },
});
