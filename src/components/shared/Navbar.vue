<template>
  <nav class="nav-bar">
    <div class="nav-left">
      <img src="@/assets/images/logo.png" alt="Company Logo" class="logo" />
      <router-link to="/create-credit-request" class="nav-link">
        {{ authStore.isInitiator ? 'สร้างคำขอ' : 'ค้นหาลูกค้า' }}
      </router-link>
      <router-link to="/pending-requests" class="nav-link">คำขอทั้งหมด</router-link>
    </div>
    <div class="nav-right">
      <div class="notification-bell">
        <img :src="iconBell" alt="Notifications" width="24" height="24" />
        <div class="notification-badge">1</div>
      </div>
      <div class="user-info">
        <span class="user-name">{{ authStore.user?.branchCode || 'N/A' }} : {{ authStore.user?.username || 'User' }}</span>
      </div>
      <button class="logout-btn" @click="handleLogout">ออกจากระบบ</button>
    </div>
  </nav>
</template>

<script>
import iconBell from '@/assets/icons/bell.svg';
import { useAuthStore } from '@/stores/auth';

export default {
  name: 'Navbar',
  data() {
    return {
      iconBell,
    };
  },
  computed: {
    authStore() {
      return useAuthStore();
    }
  },
  methods: {
    async handleLogout() {
      await this.authStore.logout();
    }
  },
};
</script>

<style scoped>
.nav-bar {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background-color: #1B1A1A;
  padding: 0 2rem;
  height: 80px;
  z-index: 1000;
  box-sizing: border-box;
}

.nav-left {
  display: flex;
  align-items: center;
}

.logo {
  height: 40px;
  margin-right: 2rem;
}

.nav-link {
  color: white;
  text-decoration: none;
  margin-right: 1.5rem;
  font-size: 18px;
}

.nav-link.router-link-active {
  font-weight: bold;
  text-decoration: underline;
}

.nav-right {
  display: flex;
  align-items: center;
  color: white;
}

.notification-bell {
  position: relative;
  margin-right: 1.5rem;
}

.notification-badge {
  position: absolute;
  top: -5px;
  right: -5px;
  background-color: red;
  color: white;
  border-radius: 50%;
  padding: 2px 6px;
  font-size: 12px;
}

.user-info {
  display: flex;
  align-items: center;
  margin-right: 1.5rem;
}

.user-name {
  font-size: 16px;
  color: #fff;
}

.logout-btn {
  background-color: #dc3545;
  color: #fff;
  border: none;
  padding: 8px 20px;
  border-radius: 4px;
  font-size: 14px;
  font-weight: bold;
  cursor: pointer;
  transition: background-color 0.2s;
  font-family: inherit;
}

.logout-btn:hover {
  background-color: #c82333;
}
</style>
