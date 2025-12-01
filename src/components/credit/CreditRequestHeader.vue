<template>
  <div class="credit-header">
    <div class="header-section">
      <label>ประเภทคำขอเครดิต</label>
      <select class="form-select" v-model="selectedType" @change="$emit('update:type', selectedType)">
        <option value="เครดิตใหม่">เครดิตใหม่</option>
        <option value="เครดิตเพิ่ม">เครดิตเพิ่ม</option>
        <option value="เครดิตโครงการ">เครดิตโครงการ</option>
      </select>
    </div>
    <div class="header-section flex-grow">
      <label>ค้นหาข้อมูลลูกค้า</label>
      <div class="search-group" ref="searchContainer">
        <div class="search-icon">
           <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-search" viewBox="0 0 16 16"> <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001c.03.04.062.078.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1.007 1.007 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0z"/> </svg>
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
  </div>
</template>

<script>
import debounce from 'lodash/debounce';
import CustomerService from '@/services/CustomerService';

export default {
  name: 'CreditRequestHeader',
  data() {
    return {
      selectedType: 'เครดิตใหม่',
      searchQuery: '',
      suggestions: [],
      showDropdown: false,
    };
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
  width: 340px;
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
</style>
