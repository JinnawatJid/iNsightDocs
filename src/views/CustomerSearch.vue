<template>
  <div>
    <Navbar />
    <div class="customer-search-container">
      <h1>ค้นหาข้อมูลลูกค้า</h1>
      <div class="search-controls">
        <div class="search-and-badge">
          <div class="search-bar">
            <div class="search-input-container">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-search"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
              <input
                type="text"
                placeholder="ค้นหาด้วย รหัสลูกค้า, ชื่อ, เบอร์โทร หรือ ชื่อบริษัท"
                class="search-input"
                v-model="searchQuery"
                @keyup.enter="handleSearch"
              />
            </div>
          </div>
          <CreditBadge v-if="foundCustomer && foundCustomer.creditBadge" :status="foundCustomer.creditBadge" />
        </div>
        <NewCreditRequestButton v-if="foundCustomer" :credit-badge-status="foundCustomer.creditBadge" />
      </div>
      <div v-if="foundCustomer">
        <div class="customer-details-grid">
          <CustomerGeneralDetail :customer="foundCustomer" />
          <CustomerCredit :customer="foundCustomer" />
        </div>
        <CustomerInvoices :invoices="foundCustomer.invoices" />
      </div>
      <div v-else class="search-placeholder">
        <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-search"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
        <p>เริ่มค้นหาข้อมูลลูกค้าด้วย รหัสลูกค้า, ชื่อ หรือ เบอร์โทร</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import Navbar from '@/components/Navbar.vue';
import NewCreditRequestButton from '@/components/NewCreditRequestButton.vue';
import CustomerGeneralDetail from '@/components/CustomerGeneralDetail.vue';
import CustomerCredit from '@/components/CustomerCredit.vue';
import CustomerInvoices from '@/components/CustomerInvoices.vue';
import CreditBadge from '@/components/CreditBadge.vue';
import customers from '@/data/customers.json';
import Swal from 'sweetalert2';

const searchQuery = ref('');
const foundCustomer = ref(null);

const handleSearch = () => {
  const query = searchQuery.value.trim().toLowerCase();
  if (!query) {
    foundCustomer.value = null;
    return;
  }

  const result = customers.find(customer =>
    customer.CustId.toLowerCase().includes(query) ||
    customer.name.toLowerCase().includes(query) ||
    customer.phone.toLowerCase().includes(query) ||
    customer.bussinessName.toLowerCase().includes(query)
  );

  if (result) {
    foundCustomer.value = result;
  } else {
    foundCustomer.value = null;
    Swal.fire({
      icon: 'error',
      title: 'Oops...',
      text: 'ไม่พบข้อมูลลูกค้า',
    });
  }
};
</script>

<style scoped>
.customer-search-container {
  padding-top: 100px;
  color: #21272A;
  width: 80%;
  margin: 0 auto;
}

h1 {
  font-size: 36px;
  margin-bottom: 2rem;
  text-align: left;
}

.search-controls {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
}

.search-and-badge {
  display: flex;
  align-items: center;
}

.search-bar {
  display: flex;
  align-items: center;
  border: 1px solid #ccc;
  border-radius: 4px;
  padding: 0.5rem;
  margin-right: 1rem;
  width: 500px;
  height: 20px;
}

.search-bar input {
  border: none;
  outline: none;
  width: 400px;
  font-size: 1rem;
  color: #21272A;
  background-color: #ffffff;
}

.search-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #888;
  border: 1px solid #ccc;
  border-radius: 5px;
  padding: 4rem;
  height: 340px;
  text-align: center;
}

.search-input-container {
  display: flex;
  align-items: center;
}

.search-input-container svg {
  margin-right: 0.5rem;
  color: #888;
}

.customer-details-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  margin-bottom: 1rem;
}
</style>
