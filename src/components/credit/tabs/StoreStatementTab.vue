<template>
  <div class="store-statement-tab">
    <!-- Guarantee Docs Section (Moved from Request Info) -->
    <div class="upload-grid-small">
        <FileUploader
          label="Bank Guarantee (ถ้ามี)"
          v-model="files.bankGuarantee"
          :disabled="!isEditing"
        />
        <FileUploader
          label="หนังสือค้ำประกัน (ถ้ามี)"
          v-model="files.letterGuarantee"
          :disabled="!isEditing"
        />
    </div>

    <!-- Main Upload Section -->
    <div class="upload-section-large">
      <FileUploader
        label="รายการเดินบัญชี"
        required
        multiple
        v-model="files.bankStatement"
        :disabled="!isEditing"
      >
        <template #icon>
           <img :src="iconUploadMulti" alt="Upload" width="48" height="48" />
        </template>
      </FileUploader>
    </div>

    <!-- Financial Analysis Section -->
    <div class="financial-analysis-section">
      <div class="section-header">Financial Analysis & Scoring</div>

      <div class="upload-grid-three">
        <FileUploader
          label="งบดุล (Balance Sheet)"
          v-model="files.balanceSheet"
          :disabled="!isEditing"
        />
        <FileUploader
          label="งบกำไรขาดทุน (Profit & Loss)"
          v-model="files.profitLoss"
          :disabled="!isEditing"
        />
        <FileUploader
          label="งบอัตราส่วนทางการเงิน (Ratios)"
          v-model="files.financialRatios"
          :disabled="!isEditing"
        />
      </div>

      <div class="manual-input-row" v-if="isEditing">
        <div class="form-group">
          <label>ทุนจดทะเบียน (Registered Capital)</label>
          <input
            type="number"
            v-model="registeredCapital"
            class="form-control"
            placeholder="ระบุทุนจดทะเบียน (บาท)"
          />
        </div>
        <div class="action-button">
          <button
            @click="analyzeFinancials"
            class="btn-primary"
            :disabled="analyzing"
          >
            {{ analyzing ? 'กำลังวิเคราะห์...' : 'Analyze & Calculate Score' }}
          </button>
        </div>
      </div>

      <!-- Analysis Results -->
      <div v-if="analysisResults" class="analysis-results">

        <!-- Scoring Highlight -->
        <div v-if="analysisResults.scoringResult" class="score-highlight">
            <div class="score-card">
                <div class="score-title">Credit Score</div>
                <div class="score-val" :class="getGradeClass(analysisResults.scoringResult.grade)">
                    {{ analysisResults.scoringResult.totalScore }} / 200
                </div>
                <div class="score-grade">Grade {{ analysisResults.scoringResult.grade }}</div>
            </div>
            <div class="limit-card">
                <div class="score-title">Recommended Limit</div>
                <div class="limit-val">{{ formatNumber(analysisResults.scoringResult.recommendedLimit) }}</div>
                <div class="limit-unit">THB</div>
            </div>
        </div>

        <h4>Extracted Financial Data</h4>
        <div class="result-grid">
          <div class="result-item">
            <span class="label">รายได้รวม (Total Revenue):</span>
            <span class="value">
              {{ formatNumber(analysisResults.extractedData.totalRevenue?.value) }}
              <span class="col-badge" v-if="analysisResults.extractedData.totalRevenue?.column">
                (Col: {{ analysisResults.extractedData.totalRevenue.column }})
              </span>
            </span>
          </div>
          <div class="result-item">
            <span class="label">กำไรขั้นต้น (Gross Profit):</span>
            <span class="value">
              {{ formatNumber(analysisResults.extractedData.grossProfit?.value) }}
              <span class="col-badge" v-if="analysisResults.extractedData.grossProfit?.column">
                (Col: {{ analysisResults.extractedData.grossProfit.column }})
              </span>
            </span>
          </div>
          <div class="result-item">
            <span class="label">หนี้สินไม่หมุนเวียน (Non-Current Liabilities):</span>
            <span class="value">
              {{ formatNumber(analysisResults.extractedData.nonCurrentLiabilities?.value) }}
              <span class="col-badge" v-if="analysisResults.extractedData.nonCurrentLiabilities?.column">
                (Col: {{ analysisResults.extractedData.nonCurrentLiabilities.column }})
              </span>
            </span>
          </div>
          <div class="result-item">
            <span class="label">ส่วนของผู้ถือหุ้น (Equity):</span>
            <span class="value">
              {{ formatNumber(analysisResults.extractedData.shareholdersEquity?.value) }}
              <span class="col-badge" v-if="analysisResults.extractedData.shareholdersEquity?.column">
                (Col: {{ analysisResults.extractedData.shareholdersEquity.column }})
              </span>
            </span>
          </div>
           <div class="result-item">
            <span class="label">Inventory Turnover:</span>
            <span class="value">
              {{ formatNumber(analysisResults.extractedData.inventoryTurnover?.value) }}
              <span class="col-badge" v-if="analysisResults.extractedData.inventoryTurnover?.column">
                (Col: {{ analysisResults.extractedData.inventoryTurnover.column }})
              </span>
            </span>
          </div>
           <div class="result-item">
            <span class="label">D/E Ratio:</span>
            <span class="value">
              {{ formatNumber(analysisResults.extractedData.deRatio?.value) }}
              <span class="col-badge" v-if="analysisResults.extractedData.deRatio?.column">
                (Col: {{ analysisResults.extractedData.deRatio.column }})
              </span>
            </span>
          </div>
        </div>

        <div class="calculated-ratios">
          <div class="ratio-card">
            <div class="ratio-title">DSCR</div>
            <div class="ratio-value">{{ formatDecimal(analysisResults.calculations.dscr) }}</div>
          </div>
          <div class="ratio-card">
            <div class="ratio-title">Credit / Capital Ratio</div>
            <div class="ratio-value">{{ formatDecimal(analysisResults.calculations.creditCapitalRatio) }}</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { reactive, ref, watch } from 'vue';
import FileUploader from '@/components/shared/FileUploader.vue';
import { useCreditRequestStore } from '@/stores/creditRequest';
import iconUploadMulti from '@/assets/icons/upload-multi.svg';
import axios from 'axios';
import Swal from 'sweetalert2';

const props = defineProps(['readOnly']);
const store = useCreditRequestStore();

const isEditing = ref(!props.readOnly);
const analyzing = ref(false);
const registeredCapital = ref('');
const analysisResults = ref(null);

watch(() => props.readOnly, (val) => {
  isEditing.value = !val;
});

const files = reactive({
  bankStatement: [],
  bankGuarantee: null,
  letterGuarantee: null,
  balanceSheet: null,
  profitLoss: null,
  financialRatios: null
});

// Watchers for store sync
watch(() => files.bankStatement, (v) => store.updateFile('bank_statement', v));
watch(() => files.bankGuarantee, (v) => store.updateFile('bank_guarantee_doc', v));
watch(() => files.letterGuarantee, (v) => store.updateFile('letter_guarantee_doc', v));
watch(() => files.balanceSheet, (v) => store.updateFile('balance_sheet_doc', v));
watch(() => files.profitLoss, (v) => store.updateFile('profit_loss_doc', v));
watch(() => files.financialRatios, (v) => store.updateFile('financial_ratios_doc', v));

// Initialize files from store
watch(() => store.files, (newVal) => {
  files.bankGuarantee = newVal?.bank_guarantee_doc || null;
  files.letterGuarantee = newVal?.letter_guarantee_doc || null;
  files.balanceSheet = newVal?.balance_sheet_doc || null;
  files.profitLoss = newVal?.profit_loss_doc || null;
  files.financialRatios = newVal?.financial_ratios_doc || null;

  if (newVal && newVal.bank_statement) {
      files.bankStatement = newVal.bank_statement;
  } else {
      files.bankStatement = [];
  }
}, { immediate: true, deep: true });

const analyzeFinancials = async () => {
  if (!files.balanceSheet || !files.profitLoss || !files.financialRatios) {
    Swal.fire('Error', 'Please upload Balance Sheet, Profit & Loss, and Ratios files.', 'error');
    return;
  }

  if (!registeredCapital.value) {
     Swal.fire('Warning', 'Please enter Registered Capital for accurate Credit/Capital calculation.', 'warning');
  }

  analyzing.value = true;
  const formData = new FormData();
  formData.append('balance_sheet', files.balanceSheet);
  formData.append('profit_loss', files.profitLoss);
  formData.append('financial_ratios', files.financialRatios);
  formData.append('registered_capital', registeredCapital.value);

  // Get request amount from store
  const requestAmount = store.transactionData?.amount || 0;
  formData.append('request_amount', requestAmount);

  // Get Customer No
  const customerNo = store.customer?.id || store.customer?.No_;
  if (customerNo) {
      formData.append('customer_no', customerNo);
  }

  try {
    const response = await axios.post('/api/financials/analyze', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });

    if (response.data.success) {
      analysisResults.value = response.data;

      // Update store with analysis result
      store.updateFinancialAnalysis(response.data);

      // Update store creditScore so the sidebar updates
      if (response.data.scoringResult) {
          store.creditScore = {
              ...store.creditScore,
              ...response.data.scoringResult
          };
      }

      Swal.fire('Success', 'Financial analysis & Scoring complete.', 'success');
    }
  } catch (error) {
    console.error(error);
    Swal.fire('Error', 'Failed to analyze files. Ensure they are valid Excel files.', 'error');
  } finally {
    analyzing.value = false;
  }
};

const formatNumber = (num) => {
  if (num === null || num === undefined) return '-';
  return num.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const formatDecimal = (num) => {
   if (num === null || num === undefined) return '-';
   return num.toLocaleString('th-TH', { minimumFractionDigits: 4, maximumFractionDigits: 4 });
};

const getGradeClass = (grade) => {
    if (grade === 'A') return 'text-success';
    if (grade === 'B') return 'text-warning';
    return 'text-danger';
};

</script>

<style scoped>
@import './shared-styles.css';

.store-statement-tab {
  padding: 10px;
}

.upload-section-large {
  margin-bottom: 30px;
}

.upload-grid-small {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  margin-bottom: 20px;
}

.financial-analysis-section {
  margin-top: 40px;
  padding-top: 20px;
  border-top: 1px solid #ddd;
}

.section-header {
  font-size: 1.1em;
  font-weight: bold;
  margin-bottom: 15px;
  color: #333;
}

.upload-grid-three {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 15px;
  margin-bottom: 20px;
}

.manual-input-row {
  display: flex;
  align-items: flex-end;
  gap: 20px;
  margin-bottom: 20px;
}

.form-group {
  flex: 1;
  max-width: 300px;
}

.form-group label {
  display: block;
  margin-bottom: 5px;
  font-weight: 500;
}

.btn-primary {
  background-color: #007bff;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 4px;
  cursor: pointer;
  height: 40px;
}

.btn-primary:disabled {
  background-color: #ccc;
  cursor: not-allowed;
}

.analysis-results {
  background-color: #f9f9f9;
  padding: 20px;
  border-radius: 8px;
  border: 1px solid #eee;
}

.score-highlight {
    display: flex;
    gap: 20px;
    margin-bottom: 20px;
    padding-bottom: 20px;
    border-bottom: 1px solid #ddd;
}

.score-card, .limit-card {
    flex: 1;
    background: white;
    padding: 15px;
    border-radius: 8px;
    text-align: center;
    box-shadow: 0 2px 4px rgba(0,0,0,0.05);
}

.score-val {
    font-size: 2em;
    font-weight: bold;
    margin: 10px 0;
}

.limit-val {
    font-size: 2em;
    font-weight: bold;
    color: #28a745;
    margin: 10px 0;
}

.text-success { color: #28a745; }
.text-warning { color: #ffc107; }
.text-danger { color: #dc3545; }

.result-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px 30px;
  margin-bottom: 20px;
}

.result-item {
  display: flex;
  justify-content: space-between;
  border-bottom: 1px dashed #ddd;
  padding-bottom: 5px;
}

.calculated-ratios {
  display: flex;
  gap: 20px;
}

.ratio-card {
  background-color: white;
  padding: 15px;
  border-radius: 6px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.05);
  flex: 1;
  text-align: center;
}

.ratio-title {
  font-weight: bold;
  color: #555;
  margin-bottom: 5px;
}

.ratio-value {
  font-size: 1.2em;
  color: #007bff;
  font-weight: bold;
}

.col-badge {
  font-size: 0.8em;
  color: #666;
  background-color: #eee;
  padding: 2px 6px;
  border-radius: 4px;
  margin-left: 8px;
  font-weight: normal;
}
</style>
