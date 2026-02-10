<template>
  <div class="credit-header">
    <!-- Left Section: Search (Moved from Right) -->
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

    <!-- Right Section: Create Request Button (New) -->
    <div class="header-section" v-if="creditStore.hasSearched">
      <label>ดำเนินการ</label>
      <div class="dropdown-container" ref="typeDropdown">
        <button class="btn-create-request" @click="toggleTypeDropdown">
          {{ selectedType || 'สร้างคำขอเครดิต +' }}
          <span class="arrow-down">▼</span>
        </button>

        <div v-if="showTypeDropdown" class="type-dropdown-menu">
          <div
            v-for="type in availableCreditTypes"
            :key="type.value"
            class="type-item"
            :class="{ disabled: type.disabled, active: selectedType === type.value }"
            @click="selectType(type)"
          >
            {{ type.label }}
            <span v-if="type.disabled" class="disabled-reason">({{ type.reason }})</span>
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
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';

export default {
  name: 'CreditRequestHeader',
  setup(props, { emit }) {
    const creditStore = useCreditRequestStore();

    // State
    const iconSearchBiSrc = iconSearchBi;
    const searchQuery = ref('');
    const suggestions = ref([]);
    const showDropdown = ref(false); // Search suggestions
    const showTypeDropdown = ref(false); // Request type dropdown
    const searchContainer = ref(null);
    const typeDropdown = ref(null);

    // Sync selected type with store
    const selectedType = computed(() => creditStore.transactionData.requestType);

    // Computed
    const dataSource = computed(() => creditStore.dataSource);
    const sourceLabel = computed(() => {
        if (dataSource.value === 'api') return 'Live API';
        if (dataSource.value === 'database') return 'Offline Mode';
        return '';
    });
    const sourceClass = computed(() => {
        if (dataSource.value === 'api') return 'badge-live';
        if (dataSource.value === 'database') return 'badge-offline';
        return '';
    });

    const showExportButton = computed(() => {
      const status = creditStore.requestStatus;
      const validStatuses = [
        'Opened', 'Submitted', 'PendingSales (ชั่วคราว)',
        'Reviewed', 'PendingFinance (ชั่วคราว)',
        'Approved', 'Rejected', 'Closed', 'Canceled'
      ];
      return validStatuses.includes(status);
    });

    const availableCreditTypes = computed(() => {
      const currentLimit = Number(creditStore.customer.current_credit_limit || 0);
      const isExisting = currentLimit > 0;

      return [
        {
          label: 'เครดิตใหม่',
          value: 'เครดิตใหม่',
          disabled: isExisting,
          reason: isExisting ? 'มีวงเงินเครดิตอยู่แล้ว' : ''
        },
        {
          label: 'เครดิตเพิ่ม',
          value: 'เครดิตเพิ่ม',
          disabled: !isExisting,
          reason: !isExisting ? 'ต้องมีวงเงินเครดิตก่อน' : ''
        },
        {
          label: 'เครดิตโครงการ',
          value: 'เครดิตโครงการ',
          disabled: !isExisting,
          reason: !isExisting ? 'ต้องมีวงเงินเครดิตก่อน' : ''
        },
        {
          label: 'เปลี่ยนแปลงระยะเวลาเครดิต',
          value: 'เปลี่ยนแปลงระยะเวลาเครดิต',
          disabled: !isExisting,
          reason: !isExisting ? 'ต้องมีวงเงินเครดิตก่อน' : ''
        },
        {
          label: 'เปลี่ยนแปลงเงื่อนไขการชำระเงิน',
          value: 'เปลี่ยนแปลงเงื่อนไขการชำระเงิน',
          disabled: !isExisting,
          reason: !isExisting ? 'ต้องมีวงเงินเครดิตก่อน' : ''
        }
      ];
    });

    // Methods
    const updateType = (typeValue) => {
      creditStore.updateTransactionData({ requestType: typeValue });
      if (creditStore.requestId) {
        creditStore.saveTransactionData();
      }
    };

    const toggleTypeDropdown = () => {
      showTypeDropdown.value = !showTypeDropdown.value;
    };

    const selectType = (type) => {
      if (type.disabled) return;
      updateType(type.value);
      showTypeDropdown.value = false;
    };

    // Search Logic
    const onInput = () => {
      if (searchQuery.value.length >= 3) {
        debouncedFetchSuggestions();
      } else {
        showDropdown.value = false;
        suggestions.value = [];
      }
    };

    const onFocus = () => {
       if (searchQuery.value.length >= 3) {
         fetchSuggestions();
       }
    };

    const fetchSuggestions = async () => {
      if (!searchQuery.value) return;
      const results = await CustomerService.getSuggestions(searchQuery.value);
      suggestions.value = results;
      showDropdown.value = true;
    };

    const debouncedFetchSuggestions = debounce(fetchSuggestions, 300);

    const getDisplayText = (item) => {
      const q = searchQuery.value.toLowerCase().replace(/[- ]/g, '');
      const normalize = (val) => val ? val.replace(/[- ]/g, '') : '';
      const phone = normalize(item.phone);
      const mobile = normalize(item.mobile);
      
      const phoneMatch = phone.includes(q) || mobile.includes(q);
      const idMatch = item.id.toLowerCase().includes(searchQuery.value.toLowerCase());

      if (phoneMatch) {
        let displayPhone = item.phone || item.mobile;
        return `${displayPhone} - ${item.name}`;
      }
      if (idMatch) {
        return `${item.id} - ${item.name}`;
      }
      return `${item.name} - ${item.id}`;
    };

    const selectSuggestion = (item) => {
      searchQuery.value = item.id;
      showDropdown.value = false;
      emit('search', searchQuery.value);
    };

    const performSearch = () => {
      showDropdown.value = false;
      emit('search', searchQuery.value);
    };

    const exportPDF = () => {
      const txId = creditStore.requestId;
      if (!txId) return;
      const encodedId = encodeURIComponent(txId);
      const url = `/api/credit-requests/${encodedId}/pdf`;
      window.open(url, '_blank');
    };

    // Click Outside
    const handleClickOutside = (event) => {
      if (searchContainer.value && !searchContainer.value.contains(event.target)) {
        showDropdown.value = false;
      }
      if (typeDropdown.value && !typeDropdown.value.contains(event.target)) {
        showTypeDropdown.value = false;
      }
    };

    onMounted(() => {
      document.addEventListener('click', handleClickOutside);
    });

    onUnmounted(() => {
      document.removeEventListener('click', handleClickOutside);
    });

    return {
      creditStore,
      iconSearchBi: iconSearchBiSrc,
      searchQuery,
      suggestions,
      showDropdown,
      showTypeDropdown,
      searchContainer,
      typeDropdown,
      selectedType,
      availableCreditTypes,
      dataSource,
      sourceLabel,
      sourceClass,
      showExportButton,
      onInput,
      onFocus,
      performSearch,
      selectSuggestion,
      getDisplayText,
      exportPDF,
      toggleTypeDropdown,
      selectType
    };
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

/* Search Styles */
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
  width: 260px;
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

/* Dropdown Suggestions (Search) */
.suggestions-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  width: 340px; /* Match input width */
  background: white;
  border: 1px solid #ccc;
  border-radius: 0 0 8px 8px;
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

/* Badge Styles */
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

/* New Dropdown Button Styles */
.dropdown-container {
  position: relative;
  width: 260px; /* Match similar width */
}

.btn-create-request {
  width: 100%;
  padding: 10px 15px;
  background-color: #0056FF;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-weight: bold;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 14px;
}

.btn-create-request:hover {
  background-color: #0046cc;
}

.arrow-down {
  font-size: 12px;
}

.type-dropdown-menu {
  position: absolute;
  top: 100%;
  left: 0;
  width: 100%;
  background: white;
  border: 1px solid #ccc;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  z-index: 1001;
  margin-top: 5px;
  overflow: hidden;
}

.type-item {
  padding: 12px 15px;
  cursor: pointer;
  border-bottom: 1px solid #f0f0f0;
  color: #333;
  text-align: left;
  transition: background 0.2s;
  font-size: 14px;
}

.type-item:last-child {
  border-bottom: none;
}

.type-item:hover {
  background-color: #f5f5f5;
}

.type-item.active {
  background-color: #e6f0ff;
  color: #0056FF;
  font-weight: bold;
}

.type-item.disabled {
  color: #aaa;
  cursor: not-allowed;
  background-color: #fafafa;
}

.type-item.disabled:hover {
  background-color: #fafafa;
}

.disabled-reason {
  font-size: 11px;
  color: #999;
  margin-left: 5px;
  font-style: italic;
}
</style>
