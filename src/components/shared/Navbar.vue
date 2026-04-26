<template>
  <nav class="nav-bar">
    <div class="nav-left">
      <img src="@/assets/images/logo.png" alt="Company Logo" class="logo" />
      <router-link to="/create-credit-request" class="nav-link">
        {{ authStore.isInitiator ? 'สร้างคำขอ' : 'ค้นหาลูกค้า' }}
      </router-link>
      <router-link to="/pending-requests" class="nav-link">คำขอทั้งหมด</router-link>
      <router-link
        v-if="authStore.isFinanceOfficer"
        to="/batch-automation"
        class="nav-link">
        ระบบอัตโนมัติ
      </router-link>
      <router-link
        v-if="authStore.isAdmin"
        to="/configuration"
        class="nav-link">
        ตั้งค่าระบบ
      </router-link>
    </div>
    <div class="nav-right">
      <div class="dev-role-switcher" v-if="!authStore.authRequired">
        <label for="dev-role-select">Dev Role:</label>
        <select id="dev-role-select" :value="currentDevRole" @change="handleDevRoleChange">
          <option v-for="role in devRoles" :key="role" :value="role">{{ role }}</option>
        </select>
      </div>
      <div class="notification-bell" @click="toggleDropdown" ref="bellContainer">
        <img :src="iconBell" alt="Notifications" width="24" height="24" />
        <span v-if="notificationStore.unreadCount > 0" class="notification-badge">{{ notificationStore.unreadCount }}</span>

        <!-- Notification Dropdown -->
        <div v-if="isDropdownOpen" class="notification-dropdown">
          <div class="dropdown-header">
            <h4>การแจ้งเตือน</h4>
            <button @click.stop="markAllAsRead" class="mark-all-btn">อ่านทั้งหมด</button>
          </div>
          <div class="dropdown-body">
            <div v-if="notificationStore.notifications.length === 0" class="empty-state">
              ไม่มีการแจ้งเตือน
            </div>
            <div v-for="notif in notificationStore.sortedNotifications" :key="notif.id"
                 class="notification-item" :class="{ unread: !notif.is_read }"
                 @click.stop="handleNotificationClick(notif)">
              <div class="notif-message">{{ notif.message }}</div>
              <div class="notif-time">{{ formatTime(notif.created_at) }}</div>
            </div>
          </div>
        </div>
      </div>
      <div class="user-info">
        <span class="user-name">{{ authStore.user?.branchCode || 'N/A' }} : {{ authStore.user?.username || 'User' }}{{ authStore.user?.empname ? ' - ' + authStore.user.empname : '' }}</span>
      </div>
      <button class="logout-btn" @click="handleLogout">ออกจากระบบ</button>
    </div>
  </nav>
</template>

<script>
import iconBell from '@/assets/icons/bell.svg';
import { useAuthStore } from '@/stores/auth';
import { useNotificationStore } from '@/stores/notification';

export default {
  name: 'Navbar',
  data() {
    return {
      iconBell,
      isDropdownOpen: false,
      devRoles: [
        'ผู้สร้างคำขอ (เครดิตใหม่/ปรับปรุง)',
        'ผู้พิจารณาของพื้นที่',
        'ผู้พิจารณาฝ่ายขาย',
        'ผู้ตรวจสอบเอกสาร',
        'ผู้อนุมัติ (วงเงิน <300K)',
        'ผู้อนุมัติ (วงเงิน > 300K)',
        'ผู้ดูแลระบบ'
      ]
    };
  },
  computed: {
    authStore() {
      return useAuthStore();
    },
    notificationStore() {
      return useNotificationStore();
    },
    currentDevRole() {
      // Default to initiator role if no specific dev role is set
      return this.authStore.user?.roles?.[0]?.role || 'ผู้สร้างคำขอ (เครดิตใหม่/ปรับปรุง)';
    }
  },
  mounted() {
    this.notificationStore.startPolling();
    document.addEventListener('click', this.handleClickOutside);
  },
  beforeUnmount() {
    this.notificationStore.stopPolling();
    document.removeEventListener('click', this.handleClickOutside);
  },
  methods: {
    toggleDropdown() {
      this.isDropdownOpen = !this.isDropdownOpen;
    },
    handleClickOutside(event) {
      if (this.$refs.bellContainer && !this.$refs.bellContainer.contains(event.target)) {
        this.isDropdownOpen = false;
      }
    },
    async markAllAsRead() {
      await this.notificationStore.markAllAsRead();
    },
    async handleNotificationClick(notif) {
      if (!notif.is_read) {
        await this.notificationStore.markAsRead(notif.id);
      }
      this.isDropdownOpen = false;
      // Navigate to pending requests and pre-fill search with txId
      this.$router.push({ path: '/pending-requests', query: { search: notif.tx_id } });
    },
    formatTime(timestamp) {
      if (!timestamp) return '';
      const date = new Date(timestamp);
      return date.toLocaleString('th-TH', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    },
    async handleLogout() {
      await this.authStore.logout();
    },
    handleDevRoleChange(event) {
      this.authStore.setDevRole(event.target.value);
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
  cursor: pointer;
}

.notification-dropdown {
  position: absolute;
  top: 100%;
  right: -20px;
  width: 300px;
  background-color: #fff;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 1001;
  margin-top: 10px;
  overflow: hidden;
}

.dropdown-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background-color: #f8f9fa;
  border-bottom: 1px solid #e9ecef;
}

.dropdown-header h4 {
  margin: 0;
  font-size: 14px;
  color: #333;
}

.mark-all-btn {
  background: none;
  border: none;
  color: #007bff;
  font-size: 12px;
  cursor: pointer;
}

.mark-all-btn:hover {
  text-decoration: underline;
}

.dropdown-body {
  max-height: 400px;
  overflow-y: auto;
  text-align: left;
}

.empty-state {
  padding: 20px;
  text-align: center;
  color: #6c757d;
  font-size: 14px;
}

.notification-item {
  padding: 12px 16px;
  border-bottom: 1px solid #f1f3f5;
  transition: background-color 0.2s;
}

.notification-item:last-child {
  border-bottom: none;
}

.notification-item:hover {
  background-color: #f8f9fa;
}

.notification-item.unread {
  background-color: #e6f2ff;
}

.notif-message {
  font-size: 13px;
  color: #333;
  margin-bottom: 4px;
}

.notif-time {
  font-size: 11px;
  color: #6c757d;
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

.dev-role-switcher {
  display: flex;
  align-items: center;
  margin-right: 1.5rem;
  background-color: #333;
  padding: 4px 8px;
  border-radius: 4px;
}

.dev-role-switcher label {
  font-size: 12px;
  color: #ccc;
  margin-right: 8px;
  white-space: nowrap;
}

.dev-role-switcher select {
  background-color: #222;
  color: #fff;
  border: 1px solid #555;
  border-radius: 4px;
  padding: 4px;
  font-size: 12px;
  font-family: inherit;
  outline: none;
  cursor: pointer;
}

.dev-role-switcher select:focus {
  border-color: #888;
}
</style>
