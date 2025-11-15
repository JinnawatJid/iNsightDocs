<template>
  <div>
    <Navbar />
    <div class="customer-search-container">
      <h1>ค้นหาข้อมูลลูกค้า</h1>
      <div class="search-controls">
        <div class="search-bar">
          <input type="text" placeholder="ค้นหาด้วย รหัสลูกค้า, ชื่อ หรือ เบอร์โทร" />
        </div>
        <NewCreditRequestButton />
      </div>
      <div class="search-placeholder">
        <p>เริ่มค้นหาข้อมูลลูกค้าด้วย รหัสลูกค้า, ชื่อ หรือ เบอร์โทร</p>
      </div>
    </div>
  </div>
</template>

<script>
import Navbar from '@/components/Navbar.vue';
import NewCreditRequestButton from '@/components/NewCreditRequestButton.vue';

export default {
  name: 'CustomerSearch',
  components: {
    Navbar,
    NewCreditRequestButton,
  },
};
</script>

<style scoped>
.customer-search-container {
  padding: 2rem 4rem;
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
  width: 100%;
  font-size: 1rem;
}

.search-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #888;
  border: 1px dashed #ccc;
  border-radius: 5px;
  padding: 4rem;
  width: 100%;
  height: 400px;
  text-align: center;
}
</style>
