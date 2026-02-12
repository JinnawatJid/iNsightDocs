<template>
  <div class="credit-header">
    <!-- Only show Request Type if one is selected -->
    <div v-if="creditStore.hasSelectedType" class="header-section">
      <label>ประเภทคำขอเครดิต</label>
      <div class="selected-type-display">
        <span class="type-label">{{ creditStore.transactionData.requestType }}</span>
        <!-- Allow changing type if not finalized (assuming logic permits) -->
        <button class="btn-change-type" @click="changeType">เปลี่ยน</button>
      </div>
    </div>
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
  </div>
</template>

<script>
import debounce from 'lodash/debounce';
import CustomerService from '@/services/CustomerService';
import iconSearchBi from '@/assets/icons/search-bi.svg';
import { useCreditRequestStore } from '@/stores/creditRequest';

export default {
  name: 'CreditRequestHeader',
  setup() {
    const creditStore = useCreditRequestStore();
    return { creditStore };
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
  mounted() {
    document.addEventListener('click', this.handleClickOutside);
  },
  beforeUnmount() {
    document.removeEventListener('click', this.handleClickOutside);
  },
  methods: {
    updateType() {
      // Legacy method, no longer used with readonly display
    },
    changeType() {
      // Clear selection to go back to Action Menu
      this.creditStore.clearRequestType();
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
         // Re-trigger fetch or just show if we have data?
         // Better to re-fetch to be safe
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
      const q = this.searchQuery.toLowerCase().replace(/[- ]/g, ''); // Normalize query
      
      const normalize = (val) => val ? val.replace(/[- ]/g, '') : '';
      
      const phone = normalize(item.phone);
      const mobile = normalize(item.mobile);
      
      const phoneMatch = phone.includes(q) || mobile.includes(q);
      const idMatch = item.id.toLowerCase().includes(this.searchQuery.toLowerCase());

      if (phoneMatch) {
        // Use whichever phone matched, or default to phone then mobile
        let displayPhone = item.phone || item.mobile;
        return `${displayPhone} - ${item.name}`;
      }
      
      if (idMatch) {
        return `${item.id} - ${item.name}`;
      }

      // Default: Name - ID
      return `${item.name} - ${item.id}`;
    },
    selectSuggestion(item) {
      // Set query to ID as requested by my plan logic to ensure search works exact
      // User said: "using the 10013AY - Some Company Name is great" for display.
      // But for searching, the backend searchCustomers uses LIKE.
      // If I set the text to "10013AY", it will find it.
      // If I set "10013AY - Some Company", it might fail if backend doesn't handle that format.
      // I will set it to ID to be safe and trigger search.
      this.searchQuery = item.id;
      this.showDropdown = false;
      this.$emit('search', this.searchQuery);
    },
    performSearch() {
      this.showDropdown = false;
      this.$emit('search', this.searchQuery);
    },
    exportPDF() {
      // Fixed: use requestId instead of non-existent transactionId
      const txId = this.creditStore.requestId;

      console.log('Exporting PDF for txId:', txId);

      if (!txId) {
        console.warn('Cannot export PDF: Missing Transaction ID (requestId is null)');
        return;
      }

      const encodedId = encodeURIComponent(txId);
      const url = `/api/credit-requests/${encodedId}/pdf`;
      console.log('PDF URL:', url);
      window.open(url, '_blank');
    },
    handleClickOutside(event) {
      const container = this.$refs.searchContainer;
      if (container && !container.contains(event.target)) {
        this.showDropdown = false;
      }
    }
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

.selected-type-display {
  display: flex;
  align-items: center;
  gap: 10px;
  background-color: #f0f7ff;
  border: 1px solid #cce5ff;
  padding: 8px 12px;
  border-radius: 8px;
}

.type-label {
  font-weight: bold;
  color: #004085;
}

.btn-change-type {
  font-size: 12px;
  color: #666;
  text-decoration: underline;
  border: none;
  background: none;
  cursor: pointer;
  padding: 0;
}

.btn-change-type:hover {
  color: #333;
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
</style>
