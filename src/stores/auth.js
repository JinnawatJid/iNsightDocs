import { defineStore } from 'pinia';
import Cookies from 'js-cookie';
import api from '../utils/axios';

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null,
    // We no longer strictly manage the token string in state here
    // because it will primarily be read from the HttpOnly cookie by the backend.
    token: null,
    isAuthenticated: false,
    authRequired: true, // Default to true until fetched from backend
  }),

  getters: {
    loginUrl: () => {
      const currentUrl = encodeURIComponent(window.location.href);
      return `http://192.192.0.37:53683/login?redirect=${currentUrl}&appName=Smart+Credit+Application`;
    },
    hubUrl: () => {
      return `http://192.192.0.37:53683/hub`;
    },
    // RBAC Getters
    userRoles: (state) => {
      return state.user?.roles || [];
    },
    isInitiator: (state) => {
      // BM: Branch Manager
      return state.user?.roles?.some(r => r.role === 'ผู้สร้างคำขอ (เครดิตใหม่/ปรับปรุง)');
    },
    isRegionalManager: (state) => {
      // RM: First Level Approver
      return state.user?.roles?.some(r => r.role === 'ผู้พิจารณาของพื้นที่');
    },
    isSalesManager: (state) => {
      // SM: Sales Reviewer
      return state.user?.roles?.some(r => r.role === 'ผู้พิจารณาฝ่ายขาย');
    },
    isFinanceOfficer: (state) => {
      // FO: Document Screener
      return state.user?.roles?.some(r => r.role === 'ผู้ตรวจสอบเอกสาร');
    },
    isFinanceManager: (state) => {
      // FM: Final Approver (< 300k)
      return state.user?.roles?.some(r => r.role === 'ผู้อนุมัติ (วงเงิน <300K)');
    },
    isCreditCommittee: (state) => {
      // CC: Final Approver (> 300k)
      return state.user?.roles?.some(r => r.role === 'ผู้อนุมัติ (วงเงิน > 300K)');
    }
  },

  actions: {
    async fetchAuthConfig() {
      try {
        const response = await fetch('/api/config/auth');
        if (response.ok) {
          const data = await response.json();
          this.authRequired = data.authRequired;
        }
      } catch (error) {
        console.error('Failed to fetch auth config:', error);
      }
    },

    async initAuth() {
      if (!this.authRequired) {
        this.user = {
          userId: 99999,
          username: "DEV_MODE_USER",
          roles: [
            {
              app: "Smart Credit Application",
              role: "ผู้สร้างคำขอ (เครดิตใหม่/ปรับปรุง)"
            }
          ],
          branchCode: "00TR"
        };
        this.isAuthenticated = true;
        return;
      }

      try {
        // Attempt to fetch user identity from backend
        // Backend reads the HttpOnly token cookie, decodes it, and returns the user object
        const response = await api.get('/api/auth/me');
        if (response.data && response.data.user) {
          this.user = response.data.user;
          this.isAuthenticated = true;
          // Note: we can't easily set `this.token` because we don't know the exact string
          // (it's HttpOnly), but backend uses the cookie natively anyway.
        } else {
          this.clearAuth();
        }
      } catch (error) {
        // If /api/auth/me fails (e.g. 401 Unauthorized), the user isn't logged in
        console.error('Authentication check failed:', error.response?.data?.message || error.message);
        this.clearAuth();
      }
    },

    clearAuth() {
      this.token = null;
      this.user = null;
      this.isAuthenticated = false;
      Cookies.remove('token');
    },

    async logout() {
      try {
        await fetch('/api/auth/logout', { method: 'POST' });
        await fetch('http://192.192.0.37:52683/auth/logout', {
          method: 'POST',
          mode: 'no-cors',
          credentials: 'include'
        });
      } catch (error) {
        console.error('Logout request failed:', error);
      }

      this.clearAuth();
      window.location.href = this.hubUrl;
    }
  }
});
