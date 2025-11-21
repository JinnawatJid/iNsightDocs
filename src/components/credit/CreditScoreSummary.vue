<template>
  <div class="credit-score-summary">
    <div v-if="canRequest" class="status-section">
      <div class="status-header">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="green" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-check-circle"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
        <span class="status-text">สามารถขอเครดิตใหม่ได้</span>
      </div>
      <div class="badges">
        <span v-for="(badge, index) in badges" :key="index" class="badge success">
          {{ badge.text }}
        </span>
      </div>
    </div>

    <hr class="divider" />

    <div class="summary-section">
      <h3>พฤติกรรมการซื้อ</h3>

      <div class="stat-item">
        <div class="stat-icon">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-shopping-cart"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>
          <span>ยอดซื้อรวม 3 เดือน</span>
        </div>
        <div class="stat-value highlight">{{ financial.total_purchase_3_months }}</div>
        <div class="stat-trend up" v-if="financial.total_purchase_growth">{{ financial.total_purchase_growth }}</div>
      </div>

      <div class="stat-item">
        <div class="stat-icon">
          <span class="currency-symbol">฿</span>
          <span>ค่าเฉลี่ยต่อเดือน</span>
        </div>
        <div class="stat-value blue">{{ financial.avg_monthly }}</div>
        <div class="stat-trend text-blue" v-if="financial.avg_monthly_trend">{{ financial.avg_monthly_trend }}</div>
      </div>
    </div>

    <div class="suggestion-section">
      <h3>คำแนะนำ</h3>
      <ul>
        <li v-for="(suggestion, index) in suggestions" :key="index">{{ suggestion }}</li>
      </ul>
    </div>
  </div>
</template>

<script>
export default {
  name: 'CreditScoreSummary',
  props: {
    financial: {
      type: Object,
      default: () => ({})
    },
    canRequest: {
      type: Boolean,
      default: false
    },
    badges: {
      type: Array,
      default: () => []
    },
    suggestions: {
      type: Array,
      default: () => []
    }
  }
};
</script>

<style scoped>
.credit-score-summary {
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 20px;
}

.status-section {
  margin-bottom: 20px;
}

.status-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
}

.status-text {
  font-weight: bold;
  font-size: 16px;
}

.badges {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.badge {
  display: inline-block;
  padding: 5px 15px;
  border-radius: 15px;
  font-size: 12px;
  color: white;
  text-align: center;
}

.badge.success {
  background-color: #28a745;
}

.divider {
  border: none;
  border-top: 1px solid #f0f0f0;
  margin: 20px 0;
}

h3 {
  font-size: 16px;
  font-weight: bold;
  margin-bottom: 15px;
}

.stat-item {
  margin-bottom: 20px;
}

.stat-icon {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #000;
  font-weight: bold;
  margin-bottom: 5px;
}

.currency-symbol {
  font-weight: bold;
  font-size: 18px;
}

.stat-value {
  font-size: 24px;
  font-weight: bold;
  margin-bottom: 2px;
}

.stat-value.highlight {
  color: #28a745;
}

.stat-value.blue {
  color: #0056FF;
}

.stat-trend {
  font-size: 12px;
}

.stat-trend.up {
  color: #28a745;
}

.stat-trend.text-blue {
  color: #0056FF; /* Light blue trend text */
}

.suggestion-section ul {
  padding-left: 20px;
  margin: 0;
}

.suggestion-section li {
  margin-bottom: 8px;
  font-size: 14px;
}
</style>
