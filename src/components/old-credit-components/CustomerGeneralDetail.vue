<template>
  <div class="customer-general-detail">
    <div class="title-container">
      <img src="@/assets/icons/user-icon.svg" alt="User Icon" class="title-icon" />
      <h3>ข้อมูลส่วนตัว</h3>
    </div>
    <div class="detail-grid">
      <div>
        <label>รหัสลูกค้า</label>
        <p>{{ customer.CustId }}</p>
      </div>
      <div>
        <label>วันที่เริ่มเป็นลูกค้า</label>
        <p>{{ customer.registeredDate }}</p>
      </div>
      <div>
        <label>ชื่อบริษัท/ร้านค้า</label>
        <p>{{ customer.bussinessName }}</p>
      </div>
      <div>
        <label>เลขที่ผู้เสียภาษี</label>
        <p>{{ customer.taxId }}</p>
      </div>
      <div>
        <label>ผู้ติดต่อ</label>
        <p>{{ customer.name }}</p>
      </div>
      <div>
        <label>เบอร์โทรศัพท์</label>
        <p>{{ customer.phone }}</p>
      </div>
    </div>
    <div class="separator"></div>
    <div class="address-section">
      <label>ที่อยู่</label>
      <p>{{ customer.address }}</p>
    </div>
  </div>
</template>

<script setup>
defineProps({
  customer: {
    type: Object,
    required: true,
  },
});
</script>

<style scoped>
.customer-general-detail {
  background-color: #ffffff;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 24px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
}

.title-container {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 24px;
}

.title-icon {
  width: 24px;
  height: 24px;
}

h3 {
  font-size: 18px;
  font-weight: 600;
  color: #21272A;
  margin: 0;
}

.detail-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20px;
  padding-bottom: 24px;
}

.detail-grid div, .address-section {
  display: flex;
  flex-direction: column;
  gap: 4px;
  align-items: flex-start;
}

label {
  font-size: 14px;
  color: #697077;
  font-weight: 400;
}

p {
  font-size: 16px;
  color: #21272A;
  font-weight: 500;
  margin: 0;
}

.separator {
  border-bottom: 1px solid #e0e0e0;
  margin-bottom: 24px;
}

.address-section {
  text-align: left;
}
</style>
