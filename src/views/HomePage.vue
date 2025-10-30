<template>
  <div>
    <Navbar />
    <div class="home-content">
      <h1>หน้าหลัก</h1>
    </div>
  </div>
</template>

<script>
import Navbar from '@/components/Navbar.vue';

export default {
  name: 'HomePage',
  components: {
    Navbar,
  },
};
</script>

<style scoped>
.home-content {
  padding-top: 80px;
}
</style>
