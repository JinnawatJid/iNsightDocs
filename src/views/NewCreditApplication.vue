<template>
  <div>
    <Navbar />
    <div class="new-credit-application-content">
      <h1>คำขอเครดิตใหม่</h1>
      <p>This is the page for creating a new credit application.</p>
    </div>
  </div>
</template>

<script>
import Navbar from '@/components/Navbar.vue';

export default {
  name: 'NewCreditApplication',
  components: {
    Navbar,
  },
};
</script>

<style scoped>
.new-credit-application-content {
  padding-top: 100px;
  padding-left: 2rem;
  padding-right: 2rem;
  text-align: center;
}
</style>
