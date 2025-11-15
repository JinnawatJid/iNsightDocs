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
            <input type="text" placeholder="ค้นหาด้วย รหัสลูกค้า, ชื่อ หรือ เบอร์โทร" class="search-input" />
          </div>
        </div>
        <NewCreditRequestButton />
      </div>
      <div class="search-placeholder">
        <div class="search-placeholder-image">
          <img src="/search-circle-outline.png" alt="search-circle-outline" />
        </div>
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
</style>
