<template>
  <div class="customer-general-detail">
    <h3>ข้อมูลส่วนตัว</h3>
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
      <div>
        <label>ที่อยู่</label>
        <p>{{ customer.address }}</p>
      </div>
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
  border: 1px solid #ccc;
  border-radius: 5px;
  padding: 1rem;
}
.detail-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem;
}
label {
  font-weight: bold;
}
</style>
