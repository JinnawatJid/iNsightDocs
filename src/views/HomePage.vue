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
        <button class="add-button">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-plus"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
          เพิ่มคำขอเครดิตใหม่
        </button>
      </div>
      <div class="table-container">
        <table>
          <thead>
            <tr>
              <th>รหัสลูกค้า</th>
              <th>ชื่อลูกค้า</th>
              <th>วันที่ขอเครดิต</th>
              <th>ประเภทลูกค้า</th>
              <th>เอกสารของลูกค้า</th>
              <th>ข้อมูลลูกค้า</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="customer in filteredCustomers" :key="customer.CustId">
              <td>{{ customer.CustId }}</td>
              <td>
                <div class="customer-name">
                  <div class="avatar"></div>
                  <div>
                    <p>{{ customer.bussinessName }}</p>
                    <p class="subtext">{{ customer.custType }}</p>
                  </div>
                </div>
              </td>
              <td>{{ formatDate(customer.lastCreditRequest) }}</td>
              <td>{{ customer.bussinessType }}</td>
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
    };
  },
  computed: {
    filteredCustomers() {
      let filtered = this.customers;

      if (this.searchQuery) {
        filtered = filtered.filter(customer =>
          customer.bussinessName.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
          customer.CustId.toLowerCase().includes(this.searchQuery.toLowerCase())
        );
      }

      if (this.filterCorporate && !this.filterContractor) {
        filtered = filtered.filter(customer => customer.custType === 'Corporate');
      } else if (!this.filterCorporate && this.filterContractor) {
        filtered = filtered.filter(customer => customer.custType === 'Retail/Contractor');
      }

      return filtered;
    },
  },
  methods: {
    getStatusClass(status) {
      return status === 'เอกสารครบ' ? 'status-complete' : 'status-incomplete';
    },
    formatDate(dateString) {
      const options = { year: 'numeric', month: '2-digit', day: '2-digit' };
      return new Date(dateString).toLocaleDateString('th-TH', options);
    },
    viewCustomerDetails(custId) {
      this.$router.push({ name: 'CreditApplication', params: { custId: custId } });
    }
  },
};
</script>

<style scoped>
.home-content {
  padding-top: 100px;
  padding-left: 2rem;
  padding-right: 2rem;
}

.header {
  margin-bottom: 2rem;
}

.header h1 {
  font-size: 2rem;
  font-weight: bold;
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
  font-size: 1rem;
  cursor: pointer;
}

.add-button svg {
  margin-right: 0.5rem;
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
  padding: 1rem;
  text-align: left;
  border-bottom: 1px solid #ddd;
}

th {
  background-color: #f8f9fa;
  font-weight: bold;
}

.customer-name {
  display: flex;
  align-items: center;
}

.avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background-color: #ccc;
  margin-right: 1rem;
}

.subtext {
  color: #888;
  font-size: 0.9rem;
}

.status-badge {
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.9rem;
  color: white;
}

.status-complete {
  background-color: #28a745;
}

.status-incomplete {
  background-color: #dc3545;
}

.details-button {
  background-color: #ffc107;
  color: black;
  border: none;
  border-radius: 4px;
  padding: 0.5rem 1rem;
  font-size: 0.9rem;
  cursor: pointer;
}
</style>
