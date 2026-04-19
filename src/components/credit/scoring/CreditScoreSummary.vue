<template>
  <div class="credit-score-summary">

    <!-- NEW: Credit Score Section -->
    <div v-if="creditScore && creditScore.totalScore !== undefined && !shouldHideValues" class="score-section">
        <div class="score-header-row">
            <h3 class="flex-1 m-0">ผลคะแนนเครดิต</h3>
            <button v-if="canOverrideScore" class="btn-edit-score" @click="openOverrideModal" title="ปรับปรุงผลลัพธ์การประเมิน">
                ⚙️ ปรับแก้
            </button>
        </div>

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

            <template v-if="creditScore.guaranteeAmount > 0">
                <div class="limit-breakdown">
                    <div class="breakdown-line">
                        <span class="breakdown-text">จากคะแนนเกณฑ์มาตรฐาน:</span>
                        <span class="breakdown-num">{{ formatNumber(creditScore.baseLimit) }}</span>
                    </div>
                    <div class="breakdown-line">
                        <span class="breakdown-text">จากหลักประกัน (บวกเพิ่ม):</span>
                        <span class="breakdown-num">+ {{ formatNumber(creditScore.guaranteeAmount) }}</span>
                    </div>
                    <hr class="breakdown-divider" />
                    <div class="breakdown-line total-line">
                        <span class="breakdown-text">รวมวงเงินแนะนำ:</span>
                        <span class="limit-value">{{ formatNumber(creditScore.recommendedLimit) }} บาท</span>
                    </div>
                </div>
            </template>
            <template v-else>
                <div class="limit-value">{{ formatNumber(creditScore.recommendedLimit) }} บาท</div>
            </template>
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

      <!-- Blacklist Warning Panel -->
      <div v-if="financial.is_blacklisted" class="blacklist-warning-panel">
          <div class="warning-icon">⚠️</div>
          <div class="warning-text">
              คำเตือน: ลูกค้ารายนี้อยู่ในบัญชี NPL โปรดพิจารณาอย่างรอบคอบ
          </div>
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
          <div class="stat-value highlight">{{ formatDecimal(financial.total_purchase_3_months) }} บาท</div>
          <div class="stat-trend" :class="getTrendClass(financial.total_purchase_growth)" v-if="financial.total_purchase_growth">
              {{ financial.total_purchase_growth }}
          </div>

          <div v-if="showMonthlyDetails" class="monthly-breakdown">
            <div v-for="(month, index) in financial.monthly_history" :key="index" class="month-row">
              <span class="month-label">{{ month.label }}</span>
              <span class="month-value">{{ formatDecimal(month.value) }} บาท</span>
            </div>
          </div>
        </div>

        <div class="stat-item">
          <div class="stat-icon">
            <span class="currency-symbol">฿</span>
            <span>ค่าเฉลี่ยต่อรอบการจ่ายเงิน</span>
          </div>
          <div class="stat-value blue">{{ formatDecimal(financial.avg_monthly) }} บาท</div>
          <div class="stat-trend" :class="getTrendClass(financial.avg_monthly_trend)" v-if="financial.avg_monthly_trend">
              {{ financial.avg_monthly_trend }}
          </div>
        </div>

        <!-- Category Breakdown -->
        <div class="stat-item" v-if="financial.category_breakdown && financial.category_breakdown.length > 0">
           <div class="stat-icon">
              <span class="currency-symbol">📊</span> <!-- You can replace with an SVG icon if preferred -->
              <span>สัดส่วนสินค้าที่ซื้อ {{ financial.category_months_used || 6 }} เดือน</span>
           </div>

           <div class="category-list">
              <div v-for="(cat, idx) in visibleCategories" :key="idx" class="category-row">
                  <div class="cat-info">
                      <span class="cat-label">{{ cat.label }}</span>
                      <span class="cat-value">{{ formatDecimal(cat.value) }} บาท</span>
                  </div>
                  <div class="progress-bar-bg">
                      <div class="progress-bar-fill" :style="{ width: cat.percentage + '%' }"></div>
                  </div>
              </div>

              <div v-if="financial.category_breakdown.length > 3" class="cat-toggle-container">
                  <button class="toggle-link" @click="showAllCategories = !showAllCategories">
                      {{ showAllCategories ? 'แสดงน้อยลง' : 'ดูทั้งหมด' }}
                  </button>
              </div>
           </div>
        </div>
      </template>
    </div>

    <div class="suggestion-section">
      <h3>คำแนะนำ</h3>
      <ul>
        <li
          v-for="(suggestion, index) in sortedSuggestions"
          :key="index"
          :class="getSuggestionClass(suggestion)"
        >
          {{ suggestion }}
        </li>
      </ul>
    </div>

    <!-- Override Modal -->
    <div v-if="showOverrideModal" class="modal-overlay" @click.self="closeOverrideModal">
      <div class="modal-content">
        <div class="modal-header">
          <h3>ปรับปรุงผลลัพธ์การประเมิน</h3>
          <button class="close-btn" @click="closeOverrideModal">×</button>
        </div>
        <div class="modal-body">
          <div class="custom-weights-container">
            <div class="validation-banner" :class="{ 'valid': isWeightsValid, 'invalid': !isWeightsValid }">
                <span>ผลรวมน้ำหนักทั้งหมด:</span>
                <span class="total-weight-val">{{ currentTotalWeight.toFixed(2) }} / 200.00</span>
                <span v-if="!isWeightsValid" class="validation-warning">⚠️ ผลรวมต้องเท่ากับ 200 พอดี</span>
            </div>

            <div v-if="isLoadingWeights" class="loading-weights">
                กำลังโหลดข้อมูลโมเดล...
            </div>

            <div v-else-if="!isLoadingWeights" class="weight-components-list">
                <div v-for="(comp, compKey) in customWeights" :key="compKey" class="weight-component">
                    <h5 class="comp-title">{{ comp.name || compKey }}</h5>
                    <div class="factor-grid">
                        <div v-for="factor in comp.factors" :key="factor.key" class="factor-row">
                            <div class="factor-info">
                                <span class="factor-label">{{ factor.label }}</span>
                                <span class="factor-key">{{ factor.key }}</span>
                            </div>
                            <div class="factor-input">
                                <label>น้ำหนัก:</label>
                                <input type="number" step="0.01" v-model.number="factor.weight" class="weight-input-field" @input="debouncePreview" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
          </div>

          <!-- Preview Section -->
          <div class="preview-section">
              <div v-if="isPreviewLoading" class="preview-loading">
                  กำลังคำนวณผลลัพธ์...
              </div>
              <div v-else-if="previewScore" class="preview-results">
                  <h4>เปรียบเทียบผลลัพธ์</h4>
                  <div class="preview-row">
                      <span class="preview-label">คะแนนเครดิต:</span>
                      <span class="preview-old">{{ creditScore?.totalScore || '-' }}</span>
                      <span class="preview-arrow">➔</span>
                      <span class="preview-new">{{ previewScore.totalScore }}</span>
                  </div>
                  <div class="preview-row">
                      <span class="preview-label">เกรด:</span>
                      <span class="preview-old" :class="getGradeClass(creditScore?.grade)">เกรด {{ creditScore?.grade || '-' }}</span>
                      <span class="preview-arrow">➔</span>
                      <span class="preview-new" :class="getGradeClass(previewScore.grade)">เกรด {{ previewScore.grade }}</span>
                  </div>
                  <div class="preview-row">
                      <span class="preview-label">วงเงินแนะนำ:</span>
                      <span class="preview-old">{{ formatNumber(creditScore?.recommendedLimit) }} บาท</span>
                      <span class="preview-arrow">➔</span>
                      <span class="preview-new highlight-limit">{{ formatNumber(previewScore.recommendedLimit) }} บาท</span>
                  </div>
              </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-cancel" @click="closeOverrideModal">ยกเลิก</button>
          <button class="btn-save" @click="saveOverride" :disabled="isRecalculating || !isWeightsValid">
            {{ isRecalculating ? 'กำลังคำนวณ...' : 'คำนวณใหม่และบันทึก' }}
          </button>
        </div>
      </div>
    </div>

  </div>
</template>

<script>
import iconCheckCircle from '@/assets/icons/check-circle-green.svg';
import iconShoppingCart from '@/assets/icons/shopping-cart.svg';
import { useCreditRequestStore } from '@/stores/creditRequest';
import { useAuthStore } from '@/stores/auth';
import { computed } from 'vue';

export default {
  name: 'CreditScoreSummary',
  data() {
    return {
      iconCheckCircle,
      iconShoppingCart,
      showMonthlyDetails: false,
      showAllCategories: false,
      showOverrideModal: false,
      enableCustomWeights: false,
      isRecalculating: false,
      isPreviewLoading: false,
      previewScore: null,
      customWeights: {},
      previewTimeout: null,
      isLoadingWeights: false
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
  computed: {
    visibleCategories() {
        if (!this.financial?.category_breakdown) return [];
        if (this.showAllCategories) {
            return this.financial.category_breakdown;
        }
        return this.financial.category_breakdown.slice(0, 3);
    },
    sortedSuggestions() {
      if (!this.suggestions || this.suggestions.length === 0) return [];

      const getWeight = (suggestion) => {
          const positiveKeywords = ['ลูกค้าชั้นดี', 'มียอดซื้อสะสมสูง', 'สั่งซื้อต่อเนื่อง', 'เติบโต', 'ตรงเวลา', 'สม่ำเสมอ', 'ชำระเงินดี'];
          const negativeKeywords = ['ไม่มียอดซื้อ', 'สูงถึง', 'ลดลง', 'ไม่สามารถ', 'Error'];
          const warningKeywords = ['ปานกลาง', 'ทั่วไป', 'เว้นช่วง', 'ควรติดต่อ', 'ควรติดตาม'];

          if (positiveKeywords.some(kw => suggestion.includes(kw))) return 1; // Green
          if (negativeKeywords.some(kw => suggestion.includes(kw))) return 3; // Red
          if (warningKeywords.some(kw => suggestion.includes(kw))) return 2;  // Amber
          return 4; // Uncategorized fallback to bottom
      };

      return [...this.suggestions].sort((a, b) => getWeight(a) - getWeight(b));
    }
  },
  setup() {
      const store = useCreditRequestStore();
      const authStore = useAuthStore();
      const creditScore = computed(() => store.creditScore);

      const shouldHideValues = computed(() => {
          return authStore.hideCreditScoreEnabled && authStore.isInitiator && store.requestStatus !== 'Approved';
      });

      const canOverrideScore = computed(() => {
          return authStore.isFinanceOfficer || authStore.isFinanceManager || authStore.isCreditCommittee || authStore.isDocumentReviewer;
      });

      return {
          store,
          creditScore,
          shouldHideValues,
          canOverrideScore
      };
  },
  methods: {
      getTrendClass(trendString) {
          if (!trendString) return '';
          if (trendString.includes('เพิ่มขึ้น')) return 'up';
          if (trendString.includes('ลดลง')) return 'down';
          return 'neutral';
      },
      getSuggestionClass(suggestion) {
          if (!suggestion) return '';
          const positiveKeywords = ['ลูกค้าชั้นดี', 'มียอดซื้อสะสมสูง', 'สั่งซื้อต่อเนื่อง', 'เติบโต', 'ตรงเวลา', 'สม่ำเสมอ', 'ชำระเงินดี'];
          const negativeKeywords = ['ไม่มียอดซื้อ', 'สูงถึง', 'ลดลง', 'ไม่สามารถ', 'Error'];
          const warningKeywords = ['ปานกลาง', 'ทั่วไป', 'เว้นช่วง', 'ควรติดต่อ', 'ควรติดตาม'];

          if (positiveKeywords.some(kw => suggestion.includes(kw))) {
              return 'suggestion-positive';
          }
          if (negativeKeywords.some(kw => suggestion.includes(kw))) {
              return 'suggestion-negative';
          }
          if (warningKeywords.some(kw => suggestion.includes(kw))) {
              return 'suggestion-warning';
          }
          return ''; // default black bullet
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

         let parsedNum = num;
         if (typeof num === 'string') {
             // Remove commas before parsing to float
             parsedNum = parseFloat(num.replace(/,/g, ''));
         }

         if (isNaN(parsedNum)) return '-';

         return parsedNum.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      },
      getGradeClass(grade) {
          if (grade === 'A') return 'grade-a';
          if (grade === 'B') return 'grade-b';
          return 'grade-c';
      },
      async fetchPreviewScore() {
          if (!this.isWeightsValid) return;
          this.isPreviewLoading = true;
          try {
              await new Promise(resolve => {
                  const payload = {
                      preview: true,
                      callback: (result) => {
                          this.previewScore = result;
                          resolve();
                      }
                  };
                  if (this.enableCustomWeights && this.isWeightsValid) {
                      payload.custom_weights = JSON.stringify(this.customWeights);
                  }
                  this.$emit('recalculate', payload);
              });
          } catch (e) {
              console.error("Failed to fetch preview score", e);
          } finally {
              this.isPreviewLoading = false;
          }
      },
      async openOverrideModal() {
          this.showOverrideModal = true;
          this.enableCustomWeights = true;

          if (this.store.transactionData?.custom_weights) {
              this.customWeights = JSON.parse(JSON.stringify(this.store.transactionData.custom_weights));
              this.fetchPreviewScore();
          } else {
              await this.loadDefaultWeights();
              this.fetchPreviewScore();
          }
      },
      async loadDefaultWeights() {
          this.isLoadingWeights = true;
          try {
              const modelType = this.creditScore?.modelType || 'new';
              const axios = (await import('@/utils/axios')).default;
              const response = await axios.get(`/api/scorecard/${modelType}`);
              if (response.data && response.data.components) {
                  const weightsObj = {};
                  Object.entries(response.data.components).forEach(([compKey, compVal]) => {
                      weightsObj[compKey] = {
                          name: compVal.name,
                          factors: compVal.factors.map(f => ({
                              key: f.key,
                              label: f.label,
                              weight: f.weight
                          }))
                      };
                  });
                  this.customWeights = weightsObj;
              }
          } catch (e) {
              console.error("Failed to load default weights:", e);
          } finally {
              this.isLoadingWeights = false;
          }
      },
      debouncePreview() {
          if (this.previewTimeout) clearTimeout(this.previewTimeout);
          this.previewTimeout = setTimeout(() => {
              if (this.isWeightsValid) {
                  this.fetchPreviewScore();
              }
          }, 500);
      },
      closeOverrideModal() {
          this.showOverrideModal = false;
      },
      async saveOverride() {
          this.isRecalculating = true;
          try {
              const updateData = {};
              if (this.enableCustomWeights && this.isWeightsValid) {
                  updateData.custom_weights = this.customWeights;
              } else {
                  updateData.custom_weights = null;
              }
              this.store.updateTransactionData(updateData);

              const payload = {};
              if (updateData.custom_weights) {
                  payload.custom_weights = JSON.stringify(updateData.custom_weights);
              }
              this.$emit('recalculate', payload);

              this.closeOverrideModal();
          } catch (error) {
              console.error(error);
          } finally {
              this.isRecalculating = false;
          }
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

.limit-breakdown {
    margin-top: 10px;
    display: flex;
    flex-direction: column;
    gap: 5px;
}

.breakdown-line {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 14px;
}

.breakdown-text {
    color: #555;
}

.breakdown-num {
    font-weight: bold;
    color: #333;
}

.breakdown-divider {
    border: none;
    border-top: 1px dashed #ccc;
    margin: 5px 0;
}

.total-line {
    margin-top: 5px;
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

/* Bullet Point Colors */
.suggestion-positive::marker {
  color: #28a745; /* Green */
  font-size: 1.2em;
}

.suggestion-warning::marker {
  color: #ffc107; /* Amber/Yellow */
  font-size: 1.2em;
}

.suggestion-negative::marker {
  color: #dc3545; /* Red */
  font-size: 1.2em;
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

.cat-toggle-container {
    text-align: center;
    margin-top: 10px;
    padding-top: 5px;
    border-top: 1px dashed #e0e0e0;
}

.blacklist-warning-panel {
    display: flex;
    align-items: center;
    gap: 10px;
    background-color: #fff3cd;
    border: 1px solid #ffecb5;
    color: #856404;
    padding: 12px;
    border-radius: 6px;
    margin-bottom: 20px;
}

.blacklist-warning-panel .warning-icon {
    font-size: 20px;
}

.blacklist-warning-panel .warning-text {
    font-weight: bold;
    font-size: 14px;
}

.toggle-link {
    background: none;
    border: none;
    color: #007bff;
    font-size: 13px;
    cursor: pointer;
    text-decoration: underline;
    padding: 5px 10px;
}

.toggle-link:hover {
    color: #0056b3;
}

/* Alternate colors for variety if needed, but keeping it simple blue for now is clean */

@media (max-width: 1366px) {
  .credit-score-summary {
    padding: 15px;
  }
}

/* Override Header & Button */
.score-header-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    position: relative;
    margin-bottom: 10px;
}

.score-header-row h3 {
    margin: 0;
}

.btn-edit-score {
    background: transparent;
    border: 1px solid #dee2e6;
    color: #6c757d;
    padding: 4px 8px;
    border-radius: 12px;
    font-size: 12px;
    cursor: pointer;
    transition: all 0.2s ease;
    display: inline-flex;
    align-items: center;
    gap: 4px;
}

.btn-edit-score:hover {
    background: #f8f9fa;
    color: #495057;
    border-color: #ced4da;
}

/* Modal Styles */
.modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, 0.5);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 1000;
}

.modal-content {
    background: white;
    border-radius: 8px;
    width: 450px;
    max-width: 90%;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
}

.modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px 20px;
    border-bottom: 1px solid #eee;
}

.modal-header h3 {
    margin: 0;
    font-size: 16px;
    color: #333;
}

.close-btn {
    background: none;
    border: none;
    font-size: 24px;
    color: #999;
    cursor: pointer;
}

.close-btn:hover {
    color: #333;
}

.modal-body {
    padding: 20px;
}

.modal-footer {
    padding: 16px 20px;
    border-top: 1px solid #eee;
    display: flex;
    justify-content: flex-end;
    gap: 12px;
}

.btn-cancel {
    background-color: white;
    border: 1px solid #ced4da;
    color: #495057;
    padding: 8px 16px;
    border-radius: 4px;
    cursor: pointer;
    font-weight: 500;
}

.btn-save {
    background-color: #0d6efd;
    border: none;
    color: white;
    padding: 8px 16px;
    border-radius: 4px;
    cursor: pointer;
    font-weight: 500;
}

.btn-save:disabled {
    background-color: #6c757d;
    cursor: not-allowed;
}

/* Preview Section Styles */
.preview-section {
    margin-top: 16px;
    padding: 16px;
    background-color: #f0f7ff;
    border: 1px dashed #b8daff;
    border-radius: 6px;
}

.preview-loading {
    text-align: center;
    color: #0056b3;
    font-size: 14px;
    font-weight: 500;
}

.preview-results h4 {
    margin: 0 0 12px 0;
    font-size: 14px;
    color: #004085;
    text-align: left;
}

.preview-row {
    display: grid;
    grid-template-columns: 110px 100px 30px 1fr;
    align-items: center;
    margin-bottom: 8px;
    font-size: 14px;
}

.preview-row:last-child {
    margin-bottom: 0;
}

.preview-label {
    color: #495057;
    font-weight: 500;
}

.preview-old {
    text-align: left;
    color: #6c757d;
    text-decoration: line-through;
}

.preview-arrow {
    text-align: center;
    color: #adb5bd;
}

.preview-new {
    text-align: left;
    font-weight: bold;
    color: #28a745;
}

.preview-new.highlight-limit {
    color: #0d6efd;
    font-size: 15px;
}
.custom-weights-container {
    background: #fff;
    border: 1px solid #dee2e6;
    border-radius: 6px;
    overflow: hidden;
}

.validation-banner {
    padding: 10px 15px;
    background: #f8f9fa;
    border-bottom: 1px solid #dee2e6;
    font-size: 14px;
    display: flex;
    align-items: center;
    gap: 10px;
}

.validation-banner.valid {
    background: #d4edda;
    color: #155724;
}

.validation-banner.invalid {
    background: #fff3cd;
    color: #856404;
}

.total-weight-val {
    font-weight: bold;
    font-size: 16px;
}

.validation-warning {
    margin-left: auto;
    font-weight: bold;
    font-size: 12px;
}

.weight-components-list {
    max-height: 300px;
    overflow-y: auto;
    padding: 10px 15px;
}

.weight-component {
    margin-bottom: 15px;
}

.weight-component:last-child {
    margin-bottom: 0;
}

.comp-title {
    margin: 0 0 10px 0;
    font-size: 14px;
    color: #004085;
    border-bottom: 1px dashed #ccc;
    padding-bottom: 4px;
}

.factor-grid {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.factor-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: #f8f9fa;
    padding: 8px 12px;
    border-radius: 4px;
    border: 1px solid #e9ecef;
}

.factor-info {
    display: flex;
    flex-direction: column;
}

.factor-label {
    font-weight: 600;
    font-size: 13px;
    color: #333;
}

.factor-key {
    font-size: 11px;
    color: #888;
}

.factor-input {
    display: flex;
    align-items: center;
    gap: 8px;
}

.factor-input label {
    font-size: 12px;
    color: #555;
}

.weight-input-field {
    width: 60px;
    padding: 4px;
    border: 1px solid #ced4da;
    border-radius: 4px;
    text-align: center;
    font-weight: bold;
    color: #0d6efd;
}

.weight-input-field:focus {
    border-color: #80bdff;
    outline: none;
}

.loading-weights {
    padding: 20px;
    text-align: center;
    color: #666;
    font-size: 14px;
}

</style>
