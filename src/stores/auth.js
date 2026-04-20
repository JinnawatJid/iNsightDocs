import { defineStore } from 'pinia';
import Cookies from 'js-cookie';

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null,
    token: null,
    isAuthenticated: false,
    authRequired: true,
    projectCreditEnabled: false,
    additionalDocumentsEnabled: false,
    hideCreditScoreEnabled: false,
  }),

  getters: {
    loginUrl: () => {
      const currentUrl = encodeURIComponent(window.location.href);
      return `http://192.192.0.37:53683/login?redirect=${currentUrl}&appName=Smart+Credit+Application`;
    },
    hubUrl: () => {
      return `http://192.192.0.37:53683/hub`;
    },

    userRoles: (state) => {
      return state.user?.roles || [];
    },
    isAdmin: (state) => {
      // Standardizes admin check for settings/configurations
      return state.user?.roles?.some(r => r.role === 'ผู้ดูแลระบบ');
    },
    isInitiator: (state) => {
      return state.user?.roles?.some(r => r.role === 'ผู้สร้างคำขอ (เครดิตใหม่/ปรับปรุง)');
    },
    isRegionalManager: (state) => {
      return state.user?.roles?.some(r => r.role === 'ผู้พิจารณาของพื้นที่');
    },
    isSalesManager: (state) => {
      return state.user?.roles?.some(r => r.role === 'ผู้พิจารณาฝ่ายขาย');
    },
    isFinanceOfficer: (state) => {
      return state.user?.roles?.some(r => r.role === 'ผู้ตรวจสอบเอกสาร');
    },
    isFinanceManager: (state) => {
      return state.user?.roles?.some(r => ['ผู้อนุมัติ (วงเงิน <300K)', 'ผู้จัดการฝ่ายการเงิน'].includes(r.role));
    },
    isCreditCommittee: (state) => {
      return state.user?.roles?.some(r => ['ผู้อนุมัติ (วงเงิน > 300K)', 'กรรมการเครดิต', 'กรรมการเครดิต (Legacy)'].includes(r.role));
    }
  },

  actions: {
    async fetchAuthConfig() {
      try {
        const response = await fetch('/api/config/auth');
        if (response.ok) {
          const data = await response.json();
          this.authRequired = data.authRequired;
          this.projectCreditEnabled = data.projectCreditEnabled;
          this.additionalDocumentsEnabled = data.additionalDocumentsEnabled;
          this.hideCreditScoreEnabled = data.hideCreditScoreEnabled;
        }
      } catch (error) {
        console.error('Failed to fetch auth config:', error);
      }
    },

    async initAuth() {
      if (!this.authRequired) {
        const devRole = Cookies.get('dev_role') || "ผู้สร้างคำขอ (เครดิตใหม่/ปรับปรุง)";
        this.user = {
          userId: 99999,
          username: "DEV_MODE_USER",
          roles: [
            {
              app: "Smart Credit Application",
              role: devRole
            }
          ],
          branchCode: "00TR"
        };
        this.isAuthenticated = true;
        return;
      }

      try {
        const response = await fetch('/api/auth/me', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          const data = await response.json();
          this.user = {
            userId: data.user.userId,
            username: data.user.username,
            empname: data.user.empname,
            roles: data.user.roles,
            branchCode: data.user.branchCode
          };
          this.token = null;
          this.isAuthenticated = true;
        } else {
          console.warn('Authentication failed:', response.status);
          this.clearAuth();
        }
      } catch (error) {
        console.error('Failed to verify authentication:', error);
        this.clearAuth();
      }
    },

    setDevRole(role) {
      if (!this.authRequired) {
        Cookies.set('dev_role', role, { path: '/' });
        window.location.reload();
      }
    },

    clearAuth() {
      this.token = null;
      this.user = null;
      this.isAuthenticated = false;

      Cookies.remove('token');
      Cookies.remove('dev_role');
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
