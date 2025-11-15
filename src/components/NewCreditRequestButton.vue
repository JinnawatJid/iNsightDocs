<template>
  <div class="dropdown" ref="dropdown">
    <button class="add-button" @click="toggleDropdown">
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-plus">
        <line x1="12" y1="5" x2="12" y2="19"></line>
        <line x1="5" y1="12" x2="19" y2="12"></line>
      </svg>
      เพิ่มคำขอเครดิตใหม่
    </button>
    <div v-if="showDropdown" class="dropdown-content">
      <a @click="handleNewCreditApplication">คำขอเครดิตใหม่</a>
      <a class="disabled">คำขอเครดิตเพิ่มเติม</a>
      <a class="disabled">คำขอเครดิตโครงการ</a>
    </div>
  </div>
</template>

<script>
export default {
  name: 'CreditRequestDropdown',
  data() {
    return {
      showDropdown: false,
    };
  },
  methods: {
    toggleDropdown() {
      this.showDropdown = !this.showDropdown;
    },
    handleNewCreditApplication() {
      this.$router.push({ name: 'NewCreditApplication' });
      this.showDropdown = false;
    },
    closeDropdown(event) {
      if (this.$refs.dropdown && !this.$refs.dropdown.contains(event.target)) {
        this.showDropdown = false;
      }
    },
  },
  mounted() {
    document.addEventListener('click', this.closeDropdown);
  },
  beforeUnmount() {
    document.removeEventListener('click', this.closeDropdown);
  },
};
</script>

<style scoped>
.dropdown {
  position: relative;
  display: inline-block;
}

.add-button {
  display: flex;
  align-items: center;
  background-color: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 0.75rem 1.5rem;
  font-size: 16px;
  cursor: pointer;
}

.add-button svg {
  margin-right: 0.5rem;
}

.dropdown-content {
  display: block;
  position: absolute;
  background-color: #f9f9f9;
  min-width: 200px;
  box-shadow: 0px 8px 16px 0px rgba(0,0,0,0.2);
  z-index: 1;
  border-radius: 4px;
  right: 0;
}

.dropdown-content a {
  color: black;
  padding: 12px 16px;
  text-decoration: none;
  display: block;
  cursor: pointer;
  text-align: left;
}

.dropdown-content a:hover {
  background-color: #ddd;
}

.dropdown-content a.disabled {
  color: #aaa;
  cursor: not-allowed;
}
</style>