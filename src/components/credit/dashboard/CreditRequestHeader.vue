<template>
  <div class="credit-header">
    <!-- Section 1: Search (Left Side) -->
    <div class="header-section flex-grow">
      <div class="label-row">
        <label>ค้นหาข้อมูลลูกค้า</label>
      </div>
      <div class="search-group" ref="searchContainer">
        <div class="search-icon">
           <img :src="iconSearchBi" alt="Search" width="16" height="16" />
        </div>
        <input
          type="text"
          class="form-input"
          placeholder="ค้นหาด้วย รหัสลูกค้า, ชื่อ, เบอร์โทร หรือ ชื่อบริษัท"
          v-model="searchQuery"
          @input="onInput"
          @focus="onFocus"
          @keyup.enter="performSearch"
        />
        <button class="btn-search" @click="performSearch">ค้นหา</button>

        <!-- Dropdown Suggestions -->
        <div v-if="showDropdown" class="suggestions-dropdown">
           <div v-if="suggestions.length === 0" class="no-results">
             ไม่พบข้อมูลลูกค้า
           </div>
           <div
             v-else
             v-for="item in suggestions"
             :key="item.id"
             class="suggestion-item"
             @click="selectSuggestion(item)"
           >
             {{ getDisplayText(item) }}
           </div>
        </div>
      </div>
    </div>

    <!-- Section 2: Action (Right Side) -->
    <div class="header-section" v-if="rbacStore.hasPermission('create_request')">

      <!-- State 1: Before Search (Placeholder) -->
      <div v-if="!hasSearched" class="placeholder-wrapper">
         <label class="text-muted">การดำเนินการ</label>
         <div class="disabled-fake-input">กรุณาค้นหาลูกค้าก่อน...</div>
      </div>

      <!-- State 2: Context Mode (Start Button) -->
      <div v-else-if="hasSearched && !isRequestStarted" class="action-wrapper" ref="menuContainer">
         <label class="action-label">การดำเนินการ</label>
         <button class="btn-start-request" @click="toggleMenu">
            + เพิ่มคำขอเครดิตใหม่
         </button>

         <!-- Popover Menu -->
         <div v-if="showMenu" class="request-menu">
            <div class="menu-header">เลือกประเภทคำขอ</div>
            <div
               class="menu-item"
               :class="{ disabled: !canRequestNew }"
               @click="handleMenuSelect('เครดิตใหม่')"
            >
               เครดิตใหม่
               <span v-if="!canRequestNew" class="reason-hint">(ลูกค้ามีเครดิตแล้ว)</span>
            </div>
            <div class="menu-divider"></div>
            <div
               class="menu-item"
               :class="{ disabled: !canRequestExisting }"
               @click="handleMenuSelect('เครดิตเพิ่ม')"
            >
               เครดิตเพิ่ม
            </div>
            <div
               class="menu-item"
               :class="{ disabled: !canRequestExisting }"
               @click="handleMenuSelect('เปลี่ยนแปลงระยะเวลาเครดิต')"
            >
               เปลี่ยนแปลงระยะเวลาเครดิต
            </div>
             <div
               class="menu-item"
               :class="{ disabled: !canRequestExisting }"
               @click="handleMenuSelect('เปลี่ยนแปลงเงื่อนไขการชำระเงิน')"
            >
               เปลี่ยนแปลงเงื่อนไขการชำระเงิน
            </div>
            <div class="menu-divider"></div>
            <div
               class="menu-item"
               :class="{ disabled: !projectCreditEnabled }"
               @click="handleMenuSelect('เครดิตโครงการ')"
            >
               เครดิตโครงการ
               <span v-if="!projectCreditEnabled" class="reason-hint">(ยังไม่เปิดใช้งาน)</span>
            </div>
         </div>
      </div>

      <!-- State 3: Form Mode (MultiSelectDropdown) -->
      <div v-else class="selector-wrapper">
        <label>ประเภทคำขอเครดิต</label>
        <MultiSelectDropdown
          :options="requestTypeOptions"
          :modelValue="selectedTypes"
          :optionDisabledFn="isOptionDisabled"
          @update:modelValue="handleSelectionChange"
        />
      </div>

    </div>

  </div>
</template>

<script>
import debounce from 'lodash/debounce';
import { computed, ref, onMounted, onUnmounted } from 'vue';
import CustomerService from '@/services/CustomerService';
import iconSearchBi from '@/assets/icons/search-bi.svg';
import { useCreditRequestStore } from '@/stores/creditRequest';
import { useRbacStore } from '@/stores/rbac';
import { useAuthStore } from '@/stores/auth';
import MultiSelectDropdown from '@/components/shared/MultiSelectDropdown.vue';

export default {
  name: 'CreditRequestHeader',
  components: {
    MultiSelectDropdown
  },
  props: {
      isRequestStarted: {
          type: Boolean,
          default: false
      }
  },
  setup(props, { emit }) {
    const creditStore = useCreditRequestStore();
    const authStore = useAuthStore();
const rbacStore = useRbacStore();
    const showMenu = ref(false);
    const menuContainer = ref(null);

    const hasSearched = computed(() => creditStore.hasSearched);
    const projectCreditEnabled = computed(() => authStore.projectCreditEnabled);

    // Logic for Request Types
    const currentLimit = computed(() => {
        const val = creditStore.customer?.current_credit_limit;
        return val ? parseFloat(val) : 0;
    });

    const canRequestNew = computed(() => currentLimit.value <= 0);
    const canRequestExisting = computed(() => currentLimit.value > 0);

    const toggleMenu = () => {
        showMenu.value = !showMenu.value;
    };

    const handleMenuSelect = (type) => {
        // Validate selection against logic
        if (type === 'เครดิตใหม่' && !canRequestNew.value) return;
        if (type === 'เครดิตโครงการ' && !projectCreditEnabled.value) return;
        if (type !== 'เครดิตใหม่' && type !== 'เครดิตโครงการ' && !canRequestExisting.value) return;

        emit('start-request', type);
        showMenu.value = false;
    };

    // Click outside for menu
    const closeMenu = (e) => {
        if (menuContainer.value && !menuContainer.value.contains(e.target)) {
            showMenu.value = false;
        }
    };

    onMounted(() => {
        document.addEventListener('click', closeMenu);
    });

    onUnmounted(() => {
        document.removeEventListener('click', closeMenu);
    });

    return {
      rbacStore,
        creditStore,
        authStore,
        hasSearched,
        canRequestNew,
        canRequestExisting,
        showMenu,
        menuContainer,
        toggleMenu,
        handleMenuSelect,
        projectCreditEnabled
    };
  },
  data() {
    return {
      iconSearchBi,
      requestTypeOptions: [
        { label: 'เครดิตใหม่', value: 'เครดิตใหม่' },
        { label: 'เครดิตเพิ่ม', value: 'เครดิตเพิ่ม' },
        { label: 'เปลี่ยนแปลงระยะเวลาเครดิต', value: 'เปลี่ยนแปลงระยะเวลาเครดิต' },
        { label: 'เปลี่ยนแปลงเงื่อนไขการชำระเงิน', value: 'เปลี่ยนแปลงเงื่อนไขการชำระเงิน' },
        { label: 'เครดิตโครงการ', value: 'เครดิตโครงการ' }
      ],
      selectedTypes: ['เครดิตใหม่'],
      searchQuery: '',
      suggestions: [],
      showDropdown: false,
    };
  },
  watch: {
    // Sync local state with store when loading a request
    'creditStore.transactionData.requestType': {
      immediate: true,
      handler(newVal) {
        if (newVal) {
          // If comma separated string, split it
          if (newVal.includes(',')) {
              this.selectedTypes = newVal.split(',');
          } else {
              this.selectedTypes = [newVal];
          }
        } else {
            // Default if empty? Maybe nothing or default to 'เครดิตใหม่'
            // Only set default if truly empty/null to avoid overriding user's clear action?
            // Actually store init sets it to 'เครดิตใหม่'
            this.selectedTypes = ['เครดิตใหม่'];
        }
      }
    }
  },
  created() {
    this.debouncedFetchSuggestions = debounce(this.fetchSuggestions, 300);
  },
  methods: {
    isOptionDisabled(option) {
      if (option.value === 'เครดิตโครงการ' && !this.projectCreditEnabled) return true;
      if (option.value === 'เครดิตใหม่' && !this.canRequestNew) return true;
      if (option.value !== 'เครดิตใหม่' && option.value !== 'เครดิตโครงการ' && !this.canRequestExisting) return true;
      return false;
    },
    handleSelectionChange(newVal) {
      const oldVal = this.selectedTypes;
      // Find what was added
      const added = newVal.filter(x => !oldVal.includes(x));

      let final = [...newVal];
      const exclusives = ['เครดิตใหม่', 'เครดิตโครงการ'];

      if (added.length > 0) {
          const newItem = added[0];

          if (exclusives.includes(newItem)) {
              // If added an exclusive item, it becomes the ONLY item
              final = [newItem];
          } else {
              // If added a combinable item, remove any exclusive items
              final = final.filter(x => !exclusives.includes(x));
          }
      } else {
          // Nothing added (item removed), usually fine.
          // But check if we removed the last item?
          if (final.length === 0) {
               // Optional: prevent empty selection?
               // For now allow it, or default back to 'เครดิตใหม่'?
               // User might be clearing to select something else.
               // Let's leave it empty or maybe enforce at least one?
               // If empty, maybe default to 'เครดิตใหม่' to be safe?
               // No, let user decide.
          }
      }

      this.selectedTypes = final;
      this.updateType();
    },
    updateType() {
      // Sort the types to ensure consistent string order? Not strictly necessary but good practice
      // But maybe order matters? 'Increase' then 'Change Term'.
      // Let's just join them.
      const typeStr = this.selectedTypes.join(',');

      this.creditStore.updateTransactionData({ requestType: typeStr });

      // Trigger save if we have a customer loaded
      if (this.creditStore.requestId) {
        this.creditStore.saveTransactionData();
      }
    },
    onInput() {
      if (this.searchQuery.length >= 3) {
        this.debouncedFetchSuggestions();
      } else {
        this.showDropdown = false;
        this.suggestions = [];
      }
    },
    onFocus() {
       if (this.searchQuery.length >= 3) {
         this.fetchSuggestions();
       }
    },
    async fetchSuggestions() {
      if (!this.searchQuery) return;
      
      const results = await CustomerService.getSuggestions(this.searchQuery);
      this.suggestions = results;
      this.showDropdown = true;
    },
    getDisplayText(item) {
      const q = this.searchQuery.toLowerCase().replace(/[- ]/g, '');
      
      const normalize = (val) => val ? val.replace(/[- ]/g, '') : '';
      
      const phone = normalize(item.phone);
      const mobile = normalize(item.mobile);
      const vatNo = normalize(item.vatNo);
      
      const phoneMatch = phone.includes(q) || mobile.includes(q);
      const vatMatch = vatNo.includes(q);
      const idMatch = item.id.toLowerCase().includes(this.searchQuery.toLowerCase());

      if (vatMatch && vatNo !== '') {
        return `${item.vatNo} - ${item.name}`;
      }

      if (phoneMatch) {
        let displayPhone = item.phone || item.mobile;
        return `${displayPhone} - ${item.name}`;
      }
      
      if (idMatch) {
        return `${item.id} - ${item.name}`;
      }

      return `${item.name} - ${item.id}`;
    },
    selectSuggestion(item) {
      this.searchQuery = item.id;
      this.showDropdown = false;
      this.$emit('search', this.searchQuery);
    },
    performSearch() {
      this.showDropdown = false;
      this.$emit('search', this.searchQuery);
    },
    handleClickOutsideSearch(event) {
        const container = this.$refs.searchContainer;
        if (container && !container.contains(event.target)) {
            this.showDropdown = false;
        }
    }
  },
  mounted() {
      document.addEventListener('click', this.handleClickOutsideSearch);
  },
  beforeUnmount() {
      document.removeEventListener('click', this.handleClickOutsideSearch);
  }
};
</script>

<style scoped>
.credit-header {
  background: white;
  padding: 20px;
  border-radius: 8px;
  display: flex;
  gap: 24px;
  border: 1px solid #e0e0e0;
  margin: 0 auto;
  margin-bottom: 20px;
  align-items: flex-end;
}

.header-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.label-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 260px; /* Match input width approx */
}

.header-section.flex-grow {
  flex-grow: 1;
}

label {
  font-weight: bold;
  font-size: 16px;
  color: #000;
  text-align: left;
}

.form-select {
  padding: 10px;
  border: 1px solid #ccc;
  border-radius: 8px;
  font-size: 14px;
  width: 220px;
  background-color: #f9f9f9;
  color: black;
}

.search-group {
  display: flex;
  align-items: center;
  position: relative;
}

.search-icon {
  position: absolute;
  left: 10px;
  color: #888;
  display: flex;
  align-items: center;
}

.form-input {
  padding: 10px 10px 10px 35px;
  border: 1px solid #ccc;
  border-radius: 8px;
  font-size: 14px;
  background-color: #ffffff;
  color: #000;
  width: 260px; /* Reduced from 340px to fit layout */
  margin-right: 16px;
}

.btn-search {
  padding: 10px 0;
  width: 100px;
  background-color: #0056FF;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-weight: bold;
  text-align: center;
}

.btn-search:hover {
  background-color: #0046cc;
}

/* Dropdown Styles */
.suggestions-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  width: 340px; /* Match input width */
  background: white;
  border: 1px solid #ccc;
  border-radius: 0 0 8px 8px; /* Rounded bottom */
  box-shadow: 0 4px 6px rgba(0,0,0,0.1);
  z-index: 1000;
  max-height: 300px;
  overflow-y: auto;
  margin-top: 2px;
}

.suggestion-item {
  padding: 10px 15px;
  cursor: pointer;
  border-bottom: 1px solid #f0f0f0;
  color: #333;
  text-align: left;
}

.suggestion-item:last-child {
  border-bottom: none;
}

.suggestion-item:hover {
  background-color: #f5f5f5;
}

.no-results {
  padding: 15px;
  color: #888;
  text-align: center;
  font-style: italic;
}

/* NEW: Styles for Action Wrapper and Menu */
.action-wrapper {
    position: relative;
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.placeholder-wrapper {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.text-muted {
    color: #888;
    font-size: 16px; /* Matched label size */
    font-weight: bold;
}

.disabled-fake-input {
    padding: 10px;
    border: 1px solid #ddd;
    border-radius: 8px;
    background-color: #f5f5f5;
    color: #aaa;
    width: 220px;
    font-size: 14px;
}

.btn-start-request {
    padding: 10px 16px;
    background-color: #0056FF;
    color: white;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    font-weight: bold;
    font-size: 14px;
    width: 220px;
    text-align: center;
    transition: background-color 0.2s;
}

.btn-start-request:hover {
    background-color: #0046cc;
}

.request-menu {
    position: absolute;
    top: 100%;
    right: 0; /* Align right since it's on the right edge */
    width: 260px;
    background: white;
    border: 1px solid #ddd;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    z-index: 1001;
    margin-top: 8px;
    overflow: hidden;
    padding: 8px 0;
}

.menu-header {
    padding: 8px 16px;
    font-size: 12px;
    color: #888;
    text-transform: uppercase;
    font-weight: bold;
    border-bottom: 1px solid #f0f0f0;
    margin-bottom: 4px;
}

.menu-item {
    padding: 10px 16px;
    cursor: pointer;
    font-size: 14px;
    color: #333;
    transition: background-color 0.1s;
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.menu-item:hover {
    background-color: #f5f5f5;
    color: #0056FF;
}

.menu-item.disabled {
    color: #ccc;
    cursor: not-allowed;
    background-color: white;
}

.menu-item.disabled:hover {
    color: #ccc;
    background-color: white;
}

.menu-divider {
    height: 1px;
    background-color: #f0f0f0;
    margin: 4px 0;
}

.reason-hint {
    font-size: 11px;
    color: #bbb;
}

.action-label {
    font-weight: bold;
    font-size: 16px;
    color: #000;
    text-align: left;
}

.selector-wrapper {
    display: flex;
    flex-direction: column;
    gap: 8px;
}
</style>
