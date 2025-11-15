<template>
  <div>
    <Navbar />
    <div class="customer-search-container">
      <h1>ค้นหาข้อมูลลูกค้า</h1>
      <div class="search-controls">
        <div class="search-bar">
          <div class="search-input-container">
            <div class="search-icon-container">
              <img src="/search-icon.png" alt="search-icon" class="search-icon" />
            </div>
            <input
              type="text"
              placeholder="ค้นหาด้วย รหัสลูกค้า, ชื่อ หรือ เบอร์โทร"
              class="search-input"
              v-model="searchQuery"
              @keyup.enter="handleSearch"
            />
          </div>
        </div>
        <NewCreditRequestButton />
      </div>
      <div v-if="foundCustomer">
        <div class="customer-details-grid">
          <CustomerGeneralDetail :customer="foundCustomer" />
          <CustomerCredit :customer="foundCustomer" />
        </div>
        <CustomerInvoices :invoices="foundCustomer.invoices" />
      </div>
      <div v-else class="search-placeholder">
        <div class="search-placeholder-image">
          <img src="/search-circle-outline.png" alt="search-circle-outline" />
        </div>
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
    customer.phone.toLowerCase().includes(query)
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
  padding: 2rem 4rem;
  padding-top: 100px;
  color: #21272A;
  width: 1200px;
  margin: 0 auto;
}

h1 {
  font-size: 2rem;
  margin-bottom: 2rem;
  text-align: left;
}

.search-controls {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
}

.search-bar {
  display: flex;
  align-items: center;
  border: 1px solid #ccc;
  border-radius: 5px;
  padding: 0.5rem;
  width: 500px;
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

.search-placeholder-image img {
  width: 80px;
  height: 80px;
}

.search-icon {
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
}

.search-input-container {
  display: flex;
  align-items: center;
}

.customer-details-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  margin-bottom: 1rem;
}
</style>
