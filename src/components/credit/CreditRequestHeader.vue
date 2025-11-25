<template>
  <div class="credit-header">
    <div class="header-section">
      <label>ประเภทคำขอเครดิต</label>
      <select class="form-select" v-model="selectedType" @change="$emit('update:type', selectedType)">
        <option value="เครดิตใหม่">เครดิตใหม่</option>
        <option value="เครดิตเพิ่ม">เครดิตเพิ่ม</option>
        <option value="เครดิตโครงการ">เครดิตโครงการ</option>
      </select>
    </div>
    <div class="header-section flex-grow">
      <label>ค้นหาข้อมูลลูกค้า</label>
      <div class="search-group">
        <div class="search-icon">
           <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-search" viewBox="0 0 16 16"> <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001c.03.04.062.078.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1.007 1.007 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0z"/> </svg>
        </div>
        <input
          type="text"
          class="form-input"
          placeholder="ค้นหาด้วย รหัสลูกค้า, ชื่อ, เบอร์โทร หรือ ชื่อบริษัท"
          v-model="searchQuery"
          @keyup.enter="$emit('search', searchQuery)"
        />
        <button class="btn-search" @click="$emit('search', searchQuery)">ค้นหา</button>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'CreditRequestHeader',
  data() {
    return {
      selectedType: 'เครดิตใหม่',
      searchQuery: '',
    };
  },
};
</script>

<style scoped>
.credit-header {
  background: white;
  padding: 20px;
  border-radius: 8px;
  display: flex;
  gap: 24px; /* Increased gap */
  border: 1px solid #e0e0e0;
  margin: 0 auto;
  margin-bottom: 20px;
  align-items: flex-end; /* Align bottoms */
}

.header-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.header-section.flex-grow {
  flex-grow: 1;
}

label {
  font-weight: bold;
  font-size: 16px;
  color: #000;
  text-align: left;
}

.form-select {
  padding: 10px;
  border: 1px solid #ccc;
  border-radius: 8px;
  font-size: 14px;
  width: 220px;
  background-color: #f9f9f9;
  color: black;
}

.search-group {
  display: flex;
  align-items: center;
  position: relative;
}

.search-icon {
  position: absolute;
  left: 10px;
  color: #888;
  display: flex;
  align-items: center;
}

.form-input {
  padding: 10px 10px 10px 35px; /* Space for icon */
  border: 1px solid #ccc;
  border-radius: 8px;
  font-size: 14px;
  background-color: #ffffff;
  color: #000;
  width: 340px;
  margin-right: 16px;
}

.btn-search {
  padding: 10px 0;
  width: 100px;
  background-color: #0056FF;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-weight: bold;
  text-align: center;
}

.btn-search:hover {
  background-color: #0046cc;
}
</style>
