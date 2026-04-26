import { defineStore } from 'pinia';
import { useAuthStore } from './auth';
import axios from '@/utils/axios';

export const useNotificationStore = defineStore('notification', {
  state: () => ({
    notifications: [],
    pollingInterval: null
  }),
  getters: {
    unreadCount: (state) => state.notifications.filter(n => !n.is_read).length,
    sortedNotifications: (state) => {
      return [...state.notifications].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    }
  },
  actions: {
    async fetchNotifications() {
      const authStore = useAuthStore();
      if (!authStore.isAuthenticated && authStore.authRequired) return;

      try {
        console.log('[Notification Debug] Fetching notifications from server...');
        const response = await axios.get('/api/notifications');
        this.notifications = response.data?.data || [];
        console.log('[Notification Debug] Received notifications:', this.notifications);
      } catch (error) {
        console.error('[Notification Debug] Failed to fetch notifications:', error);
      }
    },
    async markAsRead(id) {
      try {
        await axios.put(`/api/notifications/${id}/read`);
        const notif = this.notifications.find(n => n.id === id);
        if (notif) notif.is_read = 1;
      } catch (error) {
        console.error('Failed to mark notification as read:', error);
      }
    },
    async markAllAsRead() {
      try {
        await axios.put('/api/notifications/read-all');
        this.notifications.forEach(n => n.is_read = 1);
      } catch (error) {
        console.error('Failed to mark all notifications as read:', error);
      }
    },
    startPolling() {
      this.fetchNotifications();
      if (!this.pollingInterval) {
        this.pollingInterval = setInterval(() => {
          this.fetchNotifications();
        }, 30000); // 30 seconds
      }
    },
    stopPolling() {
      if (this.pollingInterval) {
        clearInterval(this.pollingInterval);
        this.pollingInterval = null;
      }
    }
  }
});