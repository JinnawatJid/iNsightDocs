<template>
  <div class="credit-score-summary">
    <div v-if="canRequest && badges.length > 0" class="status-section">
      <div class="status-header">
        <img :src="iconCheckCircle" alt="Check" width="24" height="24" />
        <span class="status-text">สามารถขอเครดิตใหม่ได้</span>
      </div>
      <div class="badges">
        <span v-for="(badge, index) in badges" :key="index" class="badge success">
          {{ badge.text }}
        </span>
      </div>
       <hr class="divider" />
    </div>

    <div class="summary-section">
      <h3>พฤติกรรมการซื้อ</h3>

      <div class="stat-item">
        <div class="stat-icon-row">
          <div class="stat-icon">
            <img :src="iconShoppingCart" alt="Cart" width="20" height="20" />
            <span>ยอดซื้อรวม 3 เดือน</span>
          </div>
          <button class="toggle-btn" @click="toggleMonthlyDetails" v-if="financial.monthly_history && financial.monthly_history.length > 0">
            {{ showMonthlyDetails ? 'ซ่อนรายละเอียด' : 'ดูรายละเอียด' }}
          </button>
        </div>
        <div class="stat-value highlight">{{ financial.total_purchase_3_months }} บาท</div>
        <div class="stat-trend" :class="getTrendClass(financial.total_purchase_growth)" v-if="financial.total_purchase_growth">
            {{ financial.total_purchase_growth }}
        </div>

        <div v-if="showMonthlyDetails" class="monthly-breakdown">
          <div v-for="(month, index) in financial.monthly_history" :key="index" class="month-row">
            <span class="month-label">{{ month.label }}</span>
            <span class="month-value">{{ month.value }} บาท</span>
          </div>
        </div>
      </div>

      <div class="stat-item">
        <div class="stat-icon">
          <span class="currency-symbol">฿</span>
          <span>ค่าเฉลี่ยต่อรอบการจ่ายเงิน</span>
        </div>
        <div class="stat-value blue">{{ financial.avg_monthly }} บาท</div>
        <div class="stat-trend" :class="getTrendClass(financial.avg_monthly_trend)" v-if="financial.avg_monthly_trend">
            {{ financial.avg_monthly_trend }}
        </div>
      </div>
    </div>

    <div class="suggestion-section">
      <h3>คำแนะนำ</h3>
      <ul>
        <li
          v-for="(suggestion, index) in suggestions"
          :key="index"
          :class="{ 'suggestion-positive': isPositiveSuggestion(suggestion) }"
        >
          {{ suggestion }}
        </li>
      </ul>
    </div>
  </div>
</template>

<script>
import iconCheckCircle from '@/assets/icons/check-circle-green.svg';
import iconShoppingCart from '@/assets/icons/shopping-cart.svg';

export default {
  name: 'CreditScoreSummary',
  data() {
    return {
      iconCheckCircle,
      iconShoppingCart,
      showMonthlyDetails: false
    };
  },
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
  },
  methods: {
      getTrendClass(trendString) {
          if (!trendString) return '';
          if (trendString.includes('เพิ่มขึ้น')) return 'up'; // Increase
          if (trendString.includes('ลดลง')) return 'down'; // Decrease
          return 'neutral';
      },
      isPositiveSuggestion(text) {
        // Highlight "Never had bad debt history" as requested
        return text === 'ไม่เคยมีประวัติหนี้เสีย';
      },
      toggleMonthlyDetails() {
        this.showMonthlyDetails = !this.showMonthlyDetails;
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
  width: fit-content;
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

.stat-icon-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 5px;
}

.stat-icon {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #000;
  font-weight: bold;
}

.toggle-btn {
  background: none;
  border: none;
  color: #007BFF;
  font-size: 12px;
  cursor: pointer;
  padding: 0;
  text-decoration: underline;
}

.toggle-btn:hover {
  color: #0056b3;
}

.monthly-breakdown {
  margin-top: 10px;
  padding: 10px;
  background-color: #f8f9fa;
  border-radius: 4px;
  border: 1px solid #dee2e6;
}

.month-row {
  display: flex;
  justify-content: space-between;
  font-size: 14px;
  margin-bottom: 5px;
}

.month-row:last-child {
  margin-bottom: 0;
}

.month-label {
  color: #666;
  font-weight: 500;
}

.month-value {
  color: #333;
  font-weight: bold;
}

.currency-symbol {
  font-weight: bold;
  font-size: 18px;
  line-height: 1;
}

.stat-value {
  font-size: 28px;
  font-weight: bold;
  margin-bottom: 2px;
}

.stat-value.highlight {
  color: #28a745;
}

.stat-value.blue {
  color: #007BFF;
}

.stat-trend {
  font-size: 14px;
}

.stat-trend.up {
  color: #28a745; /* Green */
}

.stat-trend.down {
    color: #dc3545; /* Red */
}

.stat-trend.neutral {
    color: #6c757d;
}

.suggestion-section {
  text-align: left;
}

.suggestion-section ul {
  padding-left: 20px;
  margin: 0;
}

.suggestion-section li {
  margin-bottom: 8px;
  font-size: 14px;
}

.suggestion-positive {
  color: #28a745; /* Green */
  font-weight: bold;
}

.summary-section {
  text-align: left;
}
</style>
