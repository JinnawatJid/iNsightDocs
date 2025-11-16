<template>
  <div class="customer-credit">
    <h3>ข้อมูลเครดิต</h3>
    <div class="credit-summary">
      <div>
        <label>วงเงินเครดิต</label>
        <p>{{ customer.creditLimit }}</p>
      </div>
      <div>
        <label>วงเงินคงเหลือ</label>
        <p>{{ customer.creditAvailable }}</p>
      </div>
      <div>
        <label>การใช้เครดิตเฉลี่ย</label>
        <p>{{ customer.avgCreditUsage }}</p>
      </div>
    </div>
    <div class="credit-usage">
      <label>การใช้วงเงิน</label>
      <div class="progress-bar">
        <div class="progress" :style="{ width: customer.creditUsagePercentage + '%' }"></div>
      </div>
      <div class="credit-details">
        <div>
          <label>ระยะเวลาเครดิต</label>
          <p>{{ customer.creditPeriod }}</p>
        </div>
        <div>
          <label>สถานะเครดิต</label>
          <p :class="getCreditStatusClass(customer.creditStatus)">{{ customer.creditStatus }}</p>
        </div>
        <div>
          <label>วันที่ชำระเงินล่าสุด</label>
          <p>{{ customer.lastPaymentDate }}</p>
        </div>
         <div>
          <label>ยอดค้างชำระ</label>
          <p :class="{ 'status-overdue': customer.overdueBalance !== '0 บาท' }">{{ customer.overdueBalance }}</p>
        </div>
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

const getCreditStatusClass = (status) => {
  if (status.startsWith('NPL')) {
    return 'status-npl';
  }
  return '';
};
</script>

<style scoped>
.customer-credit {
  border: 1px solid #ccc;
  border-radius: 5px;
  padding: 1rem;
}
.credit-summary {
  display: flex;
  justify-content: space-between;
  margin-bottom: 1rem;
}
.progress-bar {
  background-color: #e0e0e0;
  border-radius: 5px;
  height: 20px;
  width: 100%;
}
.progress {
  background-color: #4caf50;
  border-radius: 5px;
  height: 100%;
}
.credit-details {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 1rem;
    margin-top: 1rem;
}
.status-npl {
  color: red;
  font-weight: bold;
}
.status-overdue {
    color: orange;
    font-weight: bold;
}
label {
  font-weight: bold;
}
</style>
