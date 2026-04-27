const fs = require('fs');
const filepath = "src/components/credit/scoring/CreditScoreSummary.vue";
let content = fs.readFileSync(filepath, 'utf8');

// 1. Setup UI additions carefully
const headerOld = `<div v-if="creditScore && creditScore.totalScore !== undefined && !shouldHideValues" class="score-section">
        <h3 class="text-center m-0">ผลคะแนนเครดิต</h3>`;
const headerNew = `<div v-if="creditScore && creditScore.totalScore !== undefined && !shouldHideValues" class="score-section">
        <div class="score-header-row">
            <h3 class="flex-1 text-center m-0">ผลคะแนนเครดิต</h3>
            <button v-if="canOverrideScore" class="btn-edit-score" @click="openOverrideModal" title="ปรับปรุงผลลัพธ์การประเมิน">
                ⚙️ ปรับแก้
            </button>
        </div>`;
content = content.replace(headerOld, headerNew);

const modalHTML = `
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
</template>`;
content = content.replace("  </div>\n</template>", modalHTML);

// 2. Data
const dataOld = `    return {
      iconCheckCircle,
      iconShoppingCart,
      showMonthlyDetails: false,
      showAllCategories: false
    };`;
const dataNew = `    return {
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
    };`;
content = content.replace(dataOld, dataNew);

// 3. Computed
const computedOld = `  computed: {
    visibleCategories() {
        if (!this.financial?.category_breakdown) return [];
        return this.showAllCategories
            ? this.financial.category_breakdown
            : this.financial.category_breakdown.slice(0, 3);
    }
  },`;
const computedNew = `  computed: {
    visibleCategories() {
        if (!this.financial?.category_breakdown) return [];
        return this.showAllCategories
            ? this.financial.category_breakdown
            : this.financial.category_breakdown.slice(0, 3);
    },
    isWeightsValid() {
        return Math.abs(this.currentTotalWeight - 200) < 0.01;
    },
    currentTotalWeight() {
        if (!this.customWeights) return 0;
        let sum = 0;
        Object.values(this.customWeights).forEach(comp => {
            if (comp.factors && Array.isArray(comp.factors)) {
                comp.factors.forEach(f => {
                    sum += (f.weight || 0);
                });
            }
        });
        return sum;
    }
  },`;
content = content.replace(computedOld, computedNew);

// 4. Setup
const setupOld = `      const shouldHideValues = computed(() => {
          return authStore.hideCreditScoreEnabled && authStore.isInitiator && store.requestStatus !== 'Approved';
      });

      return {
          store,
          creditScore,
          shouldHideValues
      };`;
const setupNew = `      const shouldHideValues = computed(() => {
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
      };`;
content = content.replace(setupOld, setupNew);

// 5. Methods
const methodsAddition = `      async fetchPreviewScore() {
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
              const axios = (await import('axios')).default;
              const response = await axios.get(\`/api/scorecard/\${modelType}\`);
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
`;
const methodTarget = `getGradeClass(grade) {
          if (grade === 'A') return 'grade-a';
          if (grade === 'B') return 'grade-b';
          return 'grade-c';
      }`;
const methodReplaced = methodTarget + ",\n" + methodsAddition;
content = content.replace(methodTarget, methodReplaced);

// 6. CSS
const cssBlock = `
/* Override Header & Button */
.score-header-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    position: relative;
}

.score-header-row h3 {
    margin: 0;
}

.btn-edit-score {
    position: absolute;
    right: 0;
    top: -5px;
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
    margin-top: 15px;
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
`;
content = content.replace("</style>", cssBlock + "\n</style>");

fs.writeFileSync(filepath, content, 'utf8');
console.log("Vue component accurately patched with Javascript!");
