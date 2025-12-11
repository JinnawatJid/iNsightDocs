<template>
  <div class="dropdown" ref="dropdown">
    <button class="add-button" @click="toggleDropdown">
      <img :src="iconPlus" alt="Add" width="20" height="20" />
      เพิ่มคำขอเครดิตใหม่
    </button>
    <div v-if="showDropdown" class="dropdown-content">
      <a :class="{ 'disabled': !menuItems.newCredit }" @click="!menuItems.newCredit ? null : handleNewCreditApplication()">คำขอเครดิตใหม่</a>
      <a :class="{ 'disabled': !menuItems.additionalCredit }">คำขอเครดิตเพิ่มเติม</a>
      <a :class="{ 'disabled': !menuItems.projectCredit }">คำขอเครดิตโครงการ</a>
    </div>
  </div>
</template>

<script>
import iconPlus from '@/assets/icons/plus.svg';

export default {
  name: 'CreditRequestDropdown',
  props: {
    creditBadgeStatus: {
      type: String,
      default: '',
    },
  },
  data() {
    return {
      iconPlus,
      showDropdown: false,
    };
  },
  computed: {
    menuItems() {
      const status = this.creditBadgeStatus;
      if (status === 'สามารถขอเครดิตได้') {
        return { newCredit: true, additionalCredit: false, projectCredit: false };
      } else if (status === 'ไม่สามารถขอเครดิตได้') {
        return { newCredit: false, additionalCredit: false, projectCredit: false };
      } else if (status === 'สามารถขอเครดิตเพิ่มได้') {
        return { newCredit: false, additionalCredit: true, projectCredit: true };
      } else if (status === 'ไม่สามารถขอเครดิตเพิ่มได้') {
        return { newCredit: false, additionalCredit: false, projectCredit: true };
      }
      // Default state when no customer is found or badge is not present
      return { newCredit: true, additionalCredit: false, projectCredit: false };
    }
  },
  methods: {
    toggleDropdown() {
      this.showDropdown = !this.showDropdown;
    },
    handleNewCreditApplication() {
      // this.$router.push({ name: 'NewCreditApplication' });
      console.log('New Credit Application clicked');
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

.add-button img {
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