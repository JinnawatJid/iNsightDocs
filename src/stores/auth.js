import { defineStore } from 'pinia';
import Cookies from 'js-cookie';
import { useRbacStore } from './rbac';

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null,
    token: null,
    isAuthenticated: false,
    authRequired: true,
    projectCreditEnabled: false,
    additionalDocumentsEnabled: false,
    hideCreditScoreEnabled: false,
    combineRequestTypeEnabled: false,
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
      return state.user?.roles?.some(r => ['ผู้อนุมัติ (วงเงินต่ำกว่าเกณฑ์)', 'ผู้อนุมัติ (วงเงิน <300K)', 'ผู้จัดการฝ่ายการเงิน'].includes(r.role));
    },
    isCreditCommittee: (state) => {
      return state.user?.roles?.some(r => ['ผู้อนุมัติ (วงเงินสูงกว่าเกณฑ์)', 'ผู้อนุมัติ (วงเงิน > 300K)', 'กรรมการเครดิต', 'กรรมการเครดิต (Legacy)'].includes(r.role));
    }
  },

  actions: {
    resolveBranchCode(user) {
      if (!user || typeof user !== 'object') return '';

      if (Array.isArray(user.branches) && user.branches.length > 0) {
        return user.branches[0] || '';
      }

      return user.branchCode || user.branch_code || user.branch || user.office || user.officeCode || '';
    },

    async fetchAuthConfig() {
      try {
        const response = await fetch('/api/config/auth');
        if (response.ok) {
          const data = await response.json();
          this.authRequired = data.authRequired;
          this.projectCreditEnabled = data.projectCreditEnabled;
          this.additionalDocumentsEnabled = data.additionalDocumentsEnabled;
          this.hideCreditScoreEnabled = data.hideCreditScoreEnabled;
          this.combineRequestTypeEnabled = data.combineRequestTypeEnabled;
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
          branches: ["00TR"],
          roles: [
            {
              app: "Smart Credit Application",
              role: devRole
            }
          ],
          branchCode: "00TR"
        };
        this.isAuthenticated = true;

        const rbacStore = useRbacStore();
        await rbacStore.fetchRbacConfig();

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
          const branchCode = this.resolveBranchCode(data.user);
          this.user = {
            userId: data.user.userId,
            username: data.user.username,
            empname: data.user.empname,
            roles: data.user.roles,
            branches: data.user.branches,
            branchCode,
            branch_code: data.user.branch_code,
            branch: data.user.branch,
            office: data.user.office,
            officeCode: data.user.officeCode
          };
          this.token = null;
          this.isAuthenticated = true;

          // Fetch RBAC config so router has it before proceeding
          const rbacStore = useRbacStore();
          await rbacStore.fetchRbacConfig();
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
