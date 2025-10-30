<template>
  <nav class="nav-bar">
    <div class="nav-left">
      <img src="@/assets/logo.png" alt="Company Logo" class="logo" />
      <router-link to="/home" class="nav-link">คำขอเครดิตใหม่</router-link>
      <router-link to="/credit-history" class="nav-link">ประวัติการขอเครดิต</router-link>
    </div>
    <div class="nav-right">
      <div class="notification-bell">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-bell"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
        <div class="notification-badge">1</div>
      </div>
      <div class="user-info" @click="toggleDropdown">
        <span>{{ user.branch }} : {{ user.firstName }} {{ user.lastName }}</span>
        <div v-if="dropdownOpen" class="dropdown-menu">
          <a href="#">Setting</a>
          <a href="#">Sign Out</a>
        </div>
      </div>
    </div>
  </nav>
</template>

<script>
import employees from '@/data/employee_details.json';

export default {
  name: 'Navbar',
  data() {
    return {
      user: employees[0],
      dropdownOpen: false,
    };
  },
  methods: {
    toggleDropdown() {
      this.dropdownOpen = !this.dropdownOpen;
    },
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
  cursor: pointer;
  position: relative;
}

.dropdown-menu {
  position: absolute;
  top: 100%;
  right: 0;
  background-color: white;
  border: 1px solid #ccc;
  border-radius: 4px;
  display: flex;
  flex-direction: column;
  padding: 0.5rem 0;
  z-index: 100;
}

.dropdown-menu a {
  color: black;
  text-decoration: none;
  padding: 0.5rem 1rem;
}

.dropdown-menu a:hover {
  background-color: #f0f0f0;
}
</style>
