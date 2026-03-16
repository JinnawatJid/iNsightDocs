import { defineStore } from 'pinia';
import Cookies from 'js-cookie';

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null,
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
        // We use a basic fetch here instead of axios to avoid circular dependencies with the interceptor
        const response = await fetch('/api/config/auth');
        if (response.ok) {
          const data = await response.json();
          this.authRequired = data.authRequired;
        }
      } catch (error) {
        console.error('Failed to fetch auth config:', error);
        // Default stays true on failure for safety
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
        // Fetch user data from backend which reads the HttpOnly cookie
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
            roles: data.user.roles,
            branchCode: data.user.branchCode
          };
          // We don't store the raw token anymore because it's HttpOnly,
          // and requests will automatically include the cookie
          this.token = null;
          this.isAuthenticated = true;
        } else {
          // 401 Unauthorized or other errors mean token is invalid or missing
          console.warn('Authentication failed:', response.status);
          this.clearAuth();
        }
      } catch (error) {
        console.error('Failed to verify authentication:', error);
        this.clearAuth();
      }
    },

    clearAuth() {
      this.token = null;
      this.user = null;
      this.isAuthenticated = false;
      // We can't remove HttpOnly cookies from JS,
      // but logout endpoint handles it backend-side.
      // Still good practice to try to clear any non-HttpOnly fallbacks
      Cookies.remove('token');
    },

    async logout() {
      try {
        // 1. Clear cookie on our backend first
        await fetch('/api/auth/logout', { method: 'POST' });

        // 2. Clear SSO session via external portal hub (no-cors to ignore typical cross-origin read limits, just post it)
        await fetch('http://192.192.0.37:52683/auth/logout', {
          method: 'POST',
          mode: 'no-cors',
          credentials: 'include'
        });
      } catch (error) {
        console.error('Logout request failed:', error);
        // Continue to clear local auth anyway to ensure user is logged out locally
      }

      // 3. Clear local store
      this.clearAuth();

      // 4. Redirect to portal hub
      window.location.href = this.hubUrl;
    }
  }
});
