import { defineStore } from 'pinia';
import Cookies from 'js-cookie';
import { jwtDecode } from 'jwt-decode';

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null,
    token: null,
    isAuthenticated: false,
  }),

  getters: {
    loginUrl: () => {
      const currentUrl = encodeURIComponent(window.location.href);
      return `http://192.192.0.37:53683/login?redirect=${currentUrl}&appName=Smart+Credit+Application`;
    },
    hubUrl: () => {
      return `http://192.192.0.37:53683/hub`;
    }
  },

  actions: {
    initAuth() {
      // 1. Check for token cookie
      const token = Cookies.get('token');

      if (token) {
        try {
          // 2. Decode the token without verifying signature
          const decoded = jwtDecode(token);

          // 3. Store the token and user data
          this.token = token;
          this.user = {
            userId: decoded.userId,
            username: decoded.username,
            roles: decoded.roles,
            branchCode: decoded.branchCode
          };
          this.isAuthenticated = true;
        } catch (error) {
          console.error('Failed to decode JWT token:', error);
          this.clearAuth();
        }
      } else {
        this.clearAuth();
      }
    },

    clearAuth() {
      this.token = null;
      this.user = null;
      this.isAuthenticated = false;
      Cookies.remove('token');
    },

    logout() {
      this.clearAuth();
      // Redirect to portal hub
      window.location.href = this.hubUrl;
    }
  }
});
