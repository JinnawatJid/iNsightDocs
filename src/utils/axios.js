import axios from 'axios';
import { useAuthStore } from '../stores/auth';

// Create a custom axios instance
const api = axios.create({
  // baseURL can be set if needed, e.g., baseURL: '/api'
});

// Request interceptor to attach the JWT token
api.interceptors.request.use(
  (config) => {
    const authStore = useAuthStore();

    // Ensure the token from the cookie is attached
    if (authStore.token) {
      config.headers['Authorization'] = `Bearer ${authStore.token}`;
    }

    // Also include credentials so that cookies are sent
    config.withCredentials = true;

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle 401 Unauthorized errors globally
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response && error.response.status === 401) {
      const authStore = useAuthStore();

      // Clear token and redirect to login if backend rejects it
      authStore.clearAuth();
      window.location.href = authStore.loginUrl;
    }

    return Promise.reject(error);
  }
);

export default api;
