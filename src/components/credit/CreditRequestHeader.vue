<template>
  <div class="credit-header">

    <!-- Section 1: Search (Left Side) -->
    <div class="header-section flex-grow">
      <div class="label-row">
        <label>ค้นหาข้อมูลลูกค้า</label>
        <span v-if="dataSource" class="source-badge" :class="sourceClass">
            {{ sourceLabel }}
        </span>
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

        <button
          v-if="showExportButton"
          class="btn-export"
          @click="exportPDF"
        >
          ดาวน์โหลด PDF
        </button>

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
    <div class="header-section">

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
               @click="handleMenuSelect('เครดิตโครงการ')"
            >
               เครดิตโครงการ
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
         </div>
      </div>

      <!-- State 3: Form Mode (Standard Selector) -->
      <div v-else class="selector-wrapper">
        <label>ประเภทคำขอเครดิต</label>
        <select class="form-select" v-model="selectedType" @change="updateType">
            <option value="เครดิตใหม่" :disabled="!canRequestNew">เครดิตใหม่</option>
            <option value="เครดิตเพิ่ม" :disabled="!canRequestExisting">เครดิตเพิ่ม</option>
            <option value="เครดิตโครงการ" :disabled="!canRequestExisting">เครดิตโครงการ</option>
            <option value="เปลี่ยนแปลงระยะเวลาเครดิต" :disabled="!canRequestExisting">เปลี่ยนแปลงระยะเวลาเครดิต</option>
            <option value="เปลี่ยนแปลงเงื่อนไขการชำระเงิน" :disabled="!canRequestExisting">เปลี่ยนแปลงเงื่อนไขการชำระเงิน</option>
        </select>
      </div>

    </div>

  </div>
</template>

<script>
import debounce from 'lodash/debounce';
import CustomerService from '@/services/CustomerService';
import iconSearchBi from '@/assets/icons/search-bi.svg';
import { useCreditRequestStore } from '@/stores/creditRequest';
import { computed, ref, onMounted, onUnmounted } from 'vue';

export default {
  name: 'CreditRequestHeader',
  props: {
      isRequestStarted: {
          type: Boolean,
          default: false
      }
  },
  setup(props, { emit }) {
    const creditStore = useCreditRequestStore();
    const showMenu = ref(false);
    const menuContainer = ref(null);

    const hasSearched = computed(() => creditStore.hasSearched);

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
        if (type !== 'เครดิตใหม่' && !canRequestExisting.value) return;

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
        creditStore,
        hasSearched,
        canRequestNew,
        canRequestExisting,
        showMenu,
        menuContainer,
        toggleMenu,
        handleMenuSelect
    };
  },
  data() {
    return {
      iconSearchBi,
      selectedType: 'เครดิตใหม่',
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
          this.selectedType = newVal;
        }
      }
    }
  },
  computed: {
    showExportButton() {
      // Show button if status is Opened (Branch Manager) or later
      const status = this.creditStore.requestStatus;
      const validStatuses = [
        'Opened',
        'Submitted',
        'PendingSales (ชั่วคราว)',
        'Reviewed',
        'PendingFinance (ชั่วคราว)',
        'Approved',
        'Rejected',
        'Closed',
        'Canceled'
      ];
      return validStatuses.includes(status);
    },
    dataSource() {
      return this.creditStore.dataSource;
    },
    sourceLabel() {
        if (this.dataSource === 'api') return 'Live API';
        if (this.dataSource === 'database') return 'Offline Mode';
        return '';
    },
    sourceClass() {
        if (this.dataSource === 'api') return 'badge-live';
        if (this.dataSource === 'database') return 'badge-offline';
        return '';
    }
  },
  created() {
    this.debouncedFetchSuggestions = debounce(this.fetchSuggestions, 300);
  },
  methods: {
    updateType() {
      this.creditStore.updateTransactionData({ requestType: this.selectedType });
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
      
      const phoneMatch = phone.includes(q) || mobile.includes(q);
      const idMatch = item.id.toLowerCase().includes(this.searchQuery.toLowerCase());

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
    exportPDF() {
      const txId = this.creditStore.requestId;

      if (!txId) {
        console.warn('Cannot export PDF: Missing Transaction ID (requestId is null)');
        return;
      }

      const encodedId = encodeURIComponent(txId);
      const url = `/api/credit-requests/${encodedId}/pdf`;
      window.open(url, '_blank');
    },
    handleClickOutside(event) {
        // Handled by setup() logic for menu, and here for search
        const container = this.$refs.searchContainer;
        if (container && !container.contains(event.target)) {
            this.showDropdown = false;
        }
    }
  },
  mounted() {
      document.addEventListener('click', this.handleClickOutside);
  },
  beforeUnmount() {
      document.removeEventListener('click', this.handleClickOutside);
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

.btn-export {
  padding: 10px 0;
  width: 120px;
  background-color: white;
  color: #0056FF;
  border: 1px solid #0056FF;
  border-radius: 8px;
  cursor: pointer;
  font-weight: bold;
  text-align: center;
  margin-left: 10px;
}

.btn-export:hover {
  background-color: #f0f5ff;
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

.source-badge {
    font-size: 11px;
    padding: 2px 6px;
    border-radius: 4px;
    font-weight: bold;
    text-transform: uppercase;
}

.badge-live {
    background-color: #d1e7dd;
    color: #0f5132;
    border: 1px solid #badbcc;
}

.badge-offline {
    background-color: #fff3cd;
    color: #856404;
    border: 1px solid #ffeeba;
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
