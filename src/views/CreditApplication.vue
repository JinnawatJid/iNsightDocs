<template>
  <div>
    <Navbar />
    <div v-if="customer" class="customer-details-container">
      <CustomerGeneralDetail :customer="customer" />
      <CustomerCredit :customer="customer" />
    </div>
    <div v-else class="loading">
      <p>Loading customer data...</p>
    </div>
  </div>
</template>

<script>
import Navbar from '@/components/Navbar.vue';
import CustomerGeneralDetail from '@/components/CustomerGeneralDetail.vue';
import CustomerCredit from '@/components/CustomerCredit.vue';
import customers from '@/data/customers.json';

export default {
  name: 'CreditApplication',
  components: {
    Navbar,
    CustomerGeneralDetail,
    CustomerCredit,
  },
  data() {
    return {
      customer: null,
    };
  },
  created() {
    const custId = this.$route.params.custId;
    this.customer = customers.find(c => c.CustId === custId);
  },
};
</script>

<style scoped>
.customer-details-container {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2rem;
  padding: 100px 2rem 2rem;
  max-width: 1400px;
  margin: 0 auto;
}

.loading {
  padding-top: 100px;
  text-align: center;
}
</style>
