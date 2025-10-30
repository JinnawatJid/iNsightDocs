<template>
  <div>
    <Navbar />
    <div class="credit-application-content">
      <h1>Credit Application</h1>
      <p>Customer ID: {{ $route.params.custId }}</p>
    </div>
  </div>
</template>

<script>
import Navbar from '@/components/Navbar.vue';

export default {
  name: 'CreditApplication',
  components: {
    Navbar,
  },
};
</script>

<style scoped>
.credit-application-content {
  padding-top: 100px;
  padding-left: 2rem;
  padding-right: 2rem;
}
</style>
