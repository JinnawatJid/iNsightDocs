<template>
  <div class="customer-credit">
    <div class="title-container">
      <img src="@/assets/wallet-icon.svg" alt="Wallet Icon" class="title-icon" />
      <h3>ข้อมูลเครดิต</h3>
    </div>
    <div class="credit-summary">
      <div class="summary-box">
        <label>วงเงินเครดิต</label>
        <p>{{ customer.creditLimit }}</p>
      </div>
      <div class="summary-box">
        <label>วงเงินคงเหลือ</label>
        <p>{{ customer.creditAvailable }}</p>
      </div>
      <div class="summary-box">
        <label>การใช้เครดิตเฉลี่ย</label>
        <p>{{ customer.avgCreditUsage }}</p>
      </div>
    </div>
    <div class="separator"></div>
    <div class="credit-usage">
      <div class="usage-header">
        <label>การใช้วงเงิน</label>
        <span>{{ customer.creditUsagePercentage }}%</span>
      </div>
      <div class="progress-bar">
        <div class="progress" :style="{ width: customer.creditUsagePercentage + '%' }"></div>
      </div>
    </div>
    <div class="credit-details">
      <div>
        <label>ระยะเวลาเครดิต</label>
        <p>{{ customer.creditPeriod }}</p>
      </div>
      <div>
        <label>สถานะเครดิต</label>
        <p :class="creditStatusInfo.class">{{ creditStatusInfo.text }}</p>
      </div>
      <div>
        <label>วันที่ชำระเงินล่าสุด</label>
        <p>{{ customer.lastPaymentDate }}</p>
      </div>
      <div>
        <label>ยอดค้างชำระ</label>
        <p :class="overdueBalanceClass">{{ customer.overdueBalance }}</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  customer: {
    type: Object,
    required: true,
  },
});

const creditStatusInfo = computed(() => {
  if (props.customer.creditBadge === "สามารถขอเครดิตเพิ่มได้") {
    return { text: 'ปกติ', class: 'status-normal' };
  } else if (props.customer.creditBadge === "ไม่สามารถขอเครดิตเพิ่มได้" || props.customer.creditStatus === "NPL: ประวัติเสีย") {
    return { text: 'NPL: เร่งรัดหนี้สิน', class: 'status-npl' };
  }
  return { text: props.customer.creditStatus, class: '' };
});

const overdueBalanceClass = computed(() => {
  return parseFloat(props.customer.overdueBalance.replace(/,/g, '')) > 0 ? 'status-overdue' : '';
});
</script>

<style scoped>
.customer-credit {
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

.credit-summary {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  margin-bottom: 24px;
}

.summary-box {
  padding: 16px;
  border-radius: 8px;
  text-align: left;
}

.summary-box:nth-child(1) {
  background-color: #F4F4F4;
}
.summary-box:nth-child(2) p {
  color: #36A155;
}
.summary-box:nth-child(3) p {
  color: #F67C00;
}

.summary-box label {
  font-size: 14px;
  color: #697077;
}

.summary-box p {
  font-size: 20px;
  font-weight: 600;
  margin: 4px 0 0;
}

.separator {
  border-bottom: 1px solid #e0e0e0;
  margin-bottom: 24px;
}

.credit-usage {
  margin-bottom: 24px;
}

.usage-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
}

.usage-header label, .usage-header span {
  font-size: 14px;
  color: #21272A;
}

.progress-bar {
  background-color: #e0e0e0;
  border-radius: 10px;
  height: 8px;
  width: 100%;
  overflow: hidden;
}

.progress {
  background-color: #007bff;
  height: 100%;
}

.credit-details {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20px;
}

.credit-details div {
  text-align: left;
}

label {
  font-size: 14px;
  color: #697077;
}

p {
  font-size: 16px;
  color: #21272A;
  font-weight: 500;
  margin: 4px 0 0;
}

.status-npl {
  background-color: #ffcdd2;
  color: #c62828;
  padding: 4px 8px;
  border-radius: 12px;
  font-weight: 600;
}

.status-normal {
  background-color: #c8e6c9;
  color: #2e7d32;
  padding: 4px 8px;
  border-radius: 12px;
  font-weight: 600;
}

.status-overdue {
    color: red;
}
</style>
