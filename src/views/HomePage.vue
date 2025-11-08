<template>
  <div>
    <Navbar />
    <div class="home-content">
      <div class="header">
        <h1>คำขอเครดิตใหม่</h1>
      </div>
      <div class="actions">
        <div class="search-group">
          <div class="search-box">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-search"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
            <input type="text" placeholder="ค้นหาข้อมูลลูกค้า" v-model="searchQuery" />
          </div>
          <label class="checkbox-label">
            <input type="checkbox" v-model="filterCorporate" />
            ลูกค้าบริษัท
          </label>
          <label class="checkbox-label">
            <input type="checkbox" v-model="filterContractor" />
            ลูกค้าช่าง
          </label>
        </div>
        <div class="dropdown" ref="dropdown">
          <button class="add-button" @click="toggleDropdown">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-plus"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
            เพิ่มคำขอเครดิตใหม่
          </button>
          <div v-if="showDropdown" class="dropdown-content">
            <a @click="navigateToNewCreditApplication">คำขอเครดิตใหม่</a>
            <a class="disabled">คำขอเครดิตเพิ่มเติม</a>
            <a class="disabled">คำขอเครดิตโครงการ</a>
          </div>
        </div>
      </div>
      <div class="table-container">
        <table>
          <thead>
            <tr>
              <th @click="sortBy('CustId')">
                รหัสลูกค้า
                <span v-if="sortKey === 'CustId'">{{ sortDirection === 'asc' ? '▲' : '▼' }}</span>
              </th>
              <th @click="sortBy('bussinessName')">
                ชื่อลูกค้า
                <span v-if="sortKey === 'bussinessName'">{{ sortDirection === 'asc' ? '▲' : '▼' }}</span>
              </th>
              <th @click="sortBy('lastCreditRequest')">
                วันที่ขอเครดิต
                <span v-if="sortKey === 'lastCreditRequest'">{{ sortDirection === 'asc' ? '▲' : '▼' }}</span>
              </th>
              <th @click="sortBy('bussinessType')">
                ประเภทลูกค้า
                <span v-if="sortKey === 'bussinessType'">{{ sortDirection === 'asc' ? '▲' : '▼' }}</span>
              </th>
              <th @click="sortBy('creditRequestAmount')">
                วงเงินเครดิตที่ขอ
                <span v-if="sortKey === 'creditRequestAmount'">{{ sortDirection === 'asc' ? '▲' : '▼' }}</span>
              </th>
              <th>เอกสารของลูกค้า</th>
              <th>ข้อมูลลูกค้า</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="customer in filteredCustomers" :key="customer.CustId">
              <td>{{ customer.CustId }}</td>
              <td>
                <div class="customer-name">
                  <div>
                    <p>{{ customer.bussinessName }}</p>
                    <p class="subtext">{{ customer.custType }}</p>
                  </div>
                </div>
              </td>
              <td>{{ formatDate(customer.lastCreditRequest) }}</td>
              <td>{{ customer.bussinessType }}</td>
              <td>{{ customer.creditRequestAmount }}</td>
              <td>
                <span :class="['status-badge', getStatusClass(customer.documentStatus)]">
                  {{ customer.documentStatus }}
                </span>
              </td>
              <td>
                <button class="details-button" @click="viewCustomerDetails(customer.CustId)">ข้อมูลลูกค้า</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script>
import Navbar from '@/components/Navbar.vue';
import customers from '@/data/customers.json';

export default {
  name: 'HomePage',
  components: {
    Navbar,
  },
  data() {
    return {
      customers: customers,
      searchQuery: '',
      filterCorporate: false,
      filterContractor: false,
      sortKey: '',
      sortDirection: 'asc',
      showDropdown: false,
    };
  },
  computed: {
    filteredCustomers() {
      let filtered = this.customers;

      if (this.searchQuery) {
        const lowerCaseQuery = this.searchQuery.toLowerCase();
        filtered = filtered.filter(customer =>
          Object.values(customer).some(value =>
            String(value).toLowerCase().includes(lowerCaseQuery)
          )
        );
      }

      if (this.filterCorporate && !this.filterContractor) {
        filtered = filtered.filter(customer => customer.custType === 'ลูกค้าบริษัท');
      } else if (!this.filterCorporate && this.filterContractor) {
        filtered = filtered.filter(customer => customer.custType === 'ลูกค้าช่าง');
      }

      if (this.sortKey) {
        filtered.sort((a, b) => {
          let aValue = a[this.sortKey];
          let bValue = b[this.sortKey];

          if (this.sortKey === 'creditRequestAmount') {
            aValue = parseFloat(aValue.replace(/,/g, ''));
            bValue = parseFloat(bValue.replace(/,/g, ''));
          }

          if (aValue < bValue) {
            return this.sortDirection === 'asc' ? -1 : 1;
          }
          if (aValue > bValue) {
            return this.sortDirection === 'asc' ? 1 : -1;
          }
          return 0;
        });
      }

      return filtered;
    },
  },
  methods: {
    toggleDropdown() {
      this.showDropdown = !this.showDropdown;
    },
    navigateToNewCreditApplication() {
      this.$router.push({ name: 'NewCreditApplication' });
      this.showDropdown = false;
    },
    closeDropdown(event) {
      if (this.$refs.dropdown && !this.$refs.dropdown.contains(event.target)) {
        this.showDropdown = false;
      }
    },
    getStatusClass(status) {
      return status === 'เอกสารครบ' ? 'status-complete' : 'status-incomplete';
    },
    formatDate(dateString) {
      const options = { year: 'numeric', month: '2-digit', day: '2-digit' };
      return new Date(dateString).toLocaleDateString('th-TH', options);
    },
    viewCustomerDetails(custId) {
      this.$router.push({ name: 'CreditApplication', params: { custId: custId } });
    },
    sortBy(key) {
      if (this.sortKey === key) {
        this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
      } else {
        this.sortKey = key;
        this.sortDirection = 'asc';
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
.home-content {
  width: 80%;
  margin: 0 auto;
  padding-top: 100px;
  color: #21272A;
}

.header {
  margin-bottom: 2rem;
}

.header h1 {
  font-size: 36px;
  font-weight: bold;
  text-align: left;
}

.actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
}

.search-group {
  display: flex;
  align-items: center;
}

.search-box {
  display: flex;
  align-items: center;
  border: 1px solid #ccc;
  border-radius: 4px;
  padding: 0.5rem;
  margin-right: 1rem;
}

.search-box svg {
  margin-right: 0.5rem;
  color: #888;
}

.search-box input {
  border: none;
  outline: none;
  font-size: 1rem;
  color: #21272A;
  background-color: #ffffff;
}

.checkbox-label {
  display: flex;
  align-items: center;
  margin-right: 1rem;
  font-size: 1rem;
}

.checkbox-label input {
  margin-right: 0.5rem;
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

.dropdown {
  position: relative;
  display: inline-block;
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

.table-container {
  width: 100%;
  border: 1px solid #ddd;
  border-radius: 4px;
  overflow: hidden;
}

table {
  width: 100%;
  border-collapse: collapse;
}

th, td {
  padding: 0.8rem;
  text-align: center;
  border-bottom: 1px solid #ddd;
  font-size: 14px;
}

th {
  background-color: #f8f9fa;
  font-weight: bold;
}

.customer-name {
  display: flex;
  align-items: center;
  font-weight: 500;
}

.subtext {
  display: flex;
  color: #697077;
  font-size: 12px;
  align-items: left;
}

.status-badge {
  padding: 0.25rem 1rem;
  border-radius: 12px;
  font-size: 14px;
  color: white;
}

.status-complete {
  background-color: #25A249;
}

.status-incomplete {
  background-color: #FF383C;
}

.details-button {
  background-color: #F1C21B;
  color: #ffffff;
  border: none;
  border-radius: 4px;
  padding: 0.5rem 1rem;
  font-size: 12px;
  cursor: pointer;
}
</style>
