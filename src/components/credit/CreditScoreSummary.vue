<template>
  <div class="credit-score-summary">

    <!-- NEW: Credit Score Section -->
    <div v-if="creditScore && creditScore.totalScore !== undefined" class="score-section">
        <h3>ผลคะแนนเครดิต</h3>

        <div class="score-display">
            <div class="score-circle" :class="getGradeClass(creditScore.grade)">
                <span class="score-number">{{ creditScore.totalScore }}</span>
                <span class="score-max">/ 200</span>
            </div>

            <div class="score-badges-row">
                 <div class="grade-badge" :class="getGradeClass(creditScore.grade)">
                    เกรด {{ creditScore.grade }}
                 </div>
                 <div class="size-badge text-primary" v-if="creditScore.sizeResult">
                    ขนาด {{ creditScore.sizeResult.label }}
                 </div>
            </div>
        </div>

        <div class="limit-display">
            <div class="limit-label">วงเงินแนะนำ</div>
            <div class="limit-value">{{ formatNumber(creditScore.recommendedLimit) }} บาท</div>
        </div>

        <hr class="divider" />

        <div class="score-breakdown">
            <div class="breakdown-item">
                <span>C1: ความแข็งแกร่งของบริษัท</span>
                <span class="breakdown-val">{{ formatDecimal(creditScore.breakdown?.c1?.total) }}</span>
            </div>
            <div class="breakdown-item">
                <span>C2: กระแสเงินสดและสภาพคล่อง</span>
                <span class="breakdown-val">{{ formatDecimal(creditScore.breakdown?.c2?.total) }}</span>
            </div>
            <div class="breakdown-item">
                <span>C3: พฤติกรรมการซื้อและประวัติ</span>
                <span class="breakdown-val">{{ formatDecimal(creditScore.breakdown?.c3?.total) }}</span>
            </div>
        </div>

        <hr class="divider" />
    </div>


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

      <div v-if="financial.error" class="error-message">
        {{ financial.error }}
      </div>

      <template v-else>
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

        <!-- Category Breakdown -->
        <div class="stat-item" v-if="financial.category_breakdown && financial.category_breakdown.length > 0">
           <div class="stat-icon">
              <span class="currency-symbol">📊</span> <!-- You can replace with an SVG icon if preferred -->
              <span>สัดส่วนสินค้าที่ซื้อ (6 เดือนย้อนหลัง)</span>
           </div>

           <div class="category-list">
              <div v-for="(cat, idx) in financial.category_breakdown" :key="idx" class="category-row">
                  <div class="cat-info">
                      <span class="cat-label">Category {{ cat.label }}</span>
                      <span class="cat-value">{{ cat.formattedValue }} บาท</span>
                  </div>
                  <div class="progress-bar-bg">
                      <div class="progress-bar-fill" :style="{ width: cat.percentage + '%' }"></div>
                  </div>
              </div>
           </div>
        </div>
      </template>
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
import { useCreditRequestStore } from '@/stores/creditRequest';
import { computed } from 'vue';

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
  setup() {
      const store = useCreditRequestStore();
      const creditScore = computed(() => store.creditScore);

      return {
          creditScore
      };
  },
  methods: {
      getTrendClass(trendString) {
          if (!trendString) return '';
          if (trendString.includes('เพิ่มขึ้น')) return 'up';
          if (trendString.includes('ลดลง')) return 'down';
          return 'neutral';
      },
      isPositiveSuggestion(text) {
        return text === 'ไม่เคยมีประวัติหนี้เสีย';
      },
      toggleMonthlyDetails() {
        this.showMonthlyDetails = !this.showMonthlyDetails;
      },
      formatNumber(num) {
        if (num === null || num === undefined) return '-';
        return num.toLocaleString('th-TH');
      },
      formatDecimal(num) {
         if (num === null || num === undefined) return '-';
         return num.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      },
      getGradeClass(grade) {
          if (grade === 'A') return 'grade-a';
          if (grade === 'B') return 'grade-b';
          return 'grade-c';
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

.score-section {
    text-align: center;
    margin-bottom: 20px;
}

.score-display {
    margin: 15px 0;
}

.score-circle {
    display: inline-flex;
    flex-direction: column;
    justify-content: center;
    width: 100px;
    height: 100px;
    border-radius: 50%;
    border: 5px solid #ccc;
    background: #f9f9f9;
}

.score-circle.grade-a { border-color: #28a745; color: #28a745; }
.score-circle.grade-b { border-color: #ffc107; color: #d39e00; }
.score-circle.grade-c { border-color: #dc3545; color: #dc3545; }

.score-number {
    font-size: 24px;
    font-weight: bold;
    line-height: 1;
}

.score-max {
    font-size: 10px;
    color: #666;
}

.score-grade-text {
    font-weight: bold;
    font-size: 18px;
    margin-top: 5px;
}

.score-badges-row {
    display: flex;
    justify-content: center;
    gap: 10px;
    margin-top: 10px;
}

.grade-badge, .size-badge {
    padding: 4px 12px;
    border-radius: 12px;
    font-weight: bold;
    font-size: 14px;
}

.grade-badge.grade-a { background-color: #d4edda; color: #155724; }
.grade-badge.grade-b { background-color: #fff3cd; color: #856404; }
.grade-badge.grade-c { background-color: #f8d7da; color: #721c24; }

.size-badge {
    background-color: #cce5ff;
    color: #004085;
}

.limit-display {
    background: #eef7ff;
    padding: 10px;
    border-radius: 8px;
    margin-top: 15px;
}

.limit-label {
    font-size: 12px;
    color: #555;
    text-transform: uppercase;
}

.limit-value {
    font-size: 20px;
    font-weight: bold;
    color: #007bff;
}

.score-breakdown {
    font-size: 14px;
}

.breakdown-item {
    display: flex;
    justify-content: space-between;
    margin-bottom: 5px;
}

.breakdown-val {
    font-weight: bold;
}

/* Original Styles Below */
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

.error-message {
  color: #dc3545;
  background-color: #f8d7da;
  border: 1px solid #f5c6cb;
  padding: 10px;
  border-radius: 4px;
  font-size: 14px;
  margin-bottom: 10px;
}

.category-list {
  margin-top: 15px;
  padding: 10px;
  background: #f8f9fa; /* Light background for contrast */
  border-radius: 8px;
}

.category-row {
  margin-bottom: 12px;
}

.category-row:last-child {
  margin-bottom: 0;
}

.cat-info {
  display: flex;
  justify-content: space-between;
  font-size: 13px;
  margin-bottom: 4px;
}

.cat-label {
  font-weight: 600;
  color: #555;
}

.cat-value {
  color: #333;
  font-weight: bold;
}

.progress-bar-bg {
  width: 100%;
  height: 6px;
  background-color: #e9ecef;
  border-radius: 3px;
  overflow: hidden;
}

.progress-bar-fill {
  height: 100%;
  background-color: #0d6efd; /* Bootstrap Primary Blue */
  border-radius: 3px;
  transition: width 0.5s ease-in-out;
}

/* Alternate colors for variety if needed, but keeping it simple blue for now is clean */

@media (max-width: 1366px) {
  .credit-score-summary {
    padding: 15px;
  }
}
</style>
