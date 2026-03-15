import { defineStore } from 'pinia';
import Cookies from 'js-cookie';
import { jwtDecode } from 'jwt-decode';

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

    async logout() {
      try {
        // 1. Clear cookie on our backend first
        await fetch('/api/auth/logout', { method: 'POST' });

        // 2. Clear SSO session via external portal hub (no-cors to ignore typical cross-origin read limits, just post it)
        await fetch('http://192.192.0.37:52683/auth/logout', {
          method: 'POST',
          mode: 'no-cors'
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
