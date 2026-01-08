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
        label="รายการเดินบัญชี (Bank Statement)"
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
    <div class="financial-analysis-section" v-if="['Submitted', 'Reviewed', 'Approved', 'PendingFinance (ชั่วคราว)', 'PendingSales (ชั่วคราว)'].includes(store.requestStatus)">
      <div class="section-header">การวิเคราะห์ทางการเงินและคะแนนเครดิต (Financial Analysis & Scoring)</div>

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
            type="text"
            v-model="registeredCapital"
            @input="handleCapitalInput"
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
            {{ analyzing ? 'กำลังวิเคราะห์...' : 'วิเคราะห์และคำนวณคะแนน' }}
          </button>
        </div>
      </div>

      <!-- Analysis Results -->
      <div v-if="analysisResults" class="analysis-results">

        <!-- Scoring Highlight -->
        <div v-if="analysisResults.scoringResult" class="score-highlight">
            <div class="score-card">
                <div class="score-title">คะแนนเครดิต (Credit Score)</div>
                <div class="score-val" :class="getGradeClass(analysisResults.scoringResult.grade)">
                    {{ analysisResults.scoringResult.totalScore }} / 200
                </div>
                <div class="score-grade">เกรด {{ analysisResults.scoringResult.grade }}</div>
            </div>
            <div class="limit-card">
                <div class="score-title">วงเงินแนะนำ (Recommended Limit)</div>
                <div class="limit-val">{{ formatNumber(analysisResults.scoringResult.recommendedLimit) }}</div>
                <div class="limit-unit">บาท (THB)</div>
            </div>
        </div>

        <!-- Score Breakdown (New Section) -->
        <div v-if="analysisResults.scoringResult && analysisResults.scoringResult.breakdown" class="score-breakdown-section">
             <h4>รายละเอียดคะแนน (Score Breakdown)</h4>
             <div class="breakdown-grid">
                 <!-- C1 -->
                 <div class="breakdown-card">
                     <div class="bd-title">C1: ความแข็งแกร่งของบริษัท</div>
                     <div class="bd-subtitle">(Company Strength)</div>
                     <div class="bd-value">{{ formatDecimal(analysisResults.scoringResult.breakdown.c1.total) }}</div>
                 </div>
                 <!-- C2 -->
                 <div class="breakdown-card">
                     <div class="bd-title">C2: กระแสเงินสดและสภาพคล่อง</div>
                     <div class="bd-subtitle">(Cash Flow & Liquidity)</div>
                     <div class="bd-value">{{ formatDecimal(analysisResults.scoringResult.breakdown.c2.total) }}</div>
                 </div>
                 <!-- C3 -->
                 <div class="breakdown-card">
                     <div class="bd-title">C3: พฤติกรรมการซื้อและประวัติ</div>
                     <div class="bd-subtitle">(Purchase Behavior)</div>
                     <div class="bd-value">{{ formatDecimal(analysisResults.scoringResult.breakdown.c3.total) }}</div>
                 </div>
             </div>
        </div>

        <div class="results-header-row">
           <h4>ข้อมูลทางการเงิน (Financial Data)</h4>
           <div class="toggle-switch">
              <label class="switch">
                <input type="checkbox" v-model="showDebug">
                <span class="slider round"></span>
              </label>
              <span class="toggle-label">แสดงข้อมูล Debug</span>
           </div>
        </div>

        <!-- DEBUG TABLE VIEW -->
        <div v-if="showDebug && analysisResults.debugData" class="debug-table-container">
            <table class="debug-table">
                <thead>
                    <tr>
                        <th>รายการ (Item)</th>
                        <th>ค่า (Value)</th>
                        <th>คอลัมน์ (Column)</th>
                        <th>น้ำหนัก (Weight)</th>
                        <th>คะแนน (Score)</th>
                    </tr>
                </thead>
                <tbody>
                    <tr v-for="(item, index) in analysisResults.debugData" :key="index">
                        <td>{{ item.label }}</td>
                        <td class="text-right">{{ formatValue(item.value) }}</td>
                        <td class="text-center">{{ item.column || '-' }}</td>
                        <td class="text-right">{{ item.weight ? item.weight : '-' }}</td>
                        <td class="text-right">{{ item.score ? formatDecimal(item.score) : '-' }}</td>
                    </tr>
                </tbody>
            </table>
        </div>

        <!-- NORMAL GRID VIEW -->
        <div v-else class="result-grid">
          <div class="result-item">
            <span class="label">รายได้รวม (Total Revenue):</span>
            <span class="value">
              {{ formatNumber(analysisResults.extractedData.totalRevenue?.value) }}
            </span>
          </div>
          <div class="result-item">
            <span class="label">กำไรขั้นต้น (Gross Profit):</span>
            <span class="value">
              {{ formatNumber(analysisResults.extractedData.grossProfit?.value) }}
            </span>
          </div>
          <div class="result-item">
            <span class="label">หนี้สินไม่หมุนเวียน (Non-Current Liabilities):</span>
            <span class="value">
              {{ formatNumber(analysisResults.extractedData.nonCurrentLiabilities?.value) }}
            </span>
          </div>
          <div class="result-item">
            <span class="label">ส่วนของผู้ถือหุ้น (Equity):</span>
            <span class="value">
              {{ formatNumber(analysisResults.extractedData.shareholdersEquity?.value) }}
            </span>
          </div>
           <div class="result-item">
            <span class="label">อัตราหมุนเวียนสินค้าคงเหลือ (Inventory Turnover):</span>
            <span class="value">
              {{ formatNumber(analysisResults.extractedData.inventoryTurnover?.value) }}
            </span>
          </div>
           <div class="result-item">
            <span class="label">อัตราส่วนหนี้สินต่อทุน (D/E Ratio):</span>
            <span class="value">
              {{ formatNumber(analysisResults.extractedData.deRatio?.value) }}
            </span>
          </div>
        </div>

        <div class="calculated-ratios">
          <div class="ratio-card">
            <div class="ratio-title">อัตราส่วนความสามารถในการชำระหนี้ (DSCR)</div>
            <div class="ratio-value">{{ formatDecimal(analysisResults.calculations.dscr) }}</div>
          </div>
          <div class="ratio-card">
            <div class="ratio-title">สัดส่วนเครดิตต่อทุน (Credit / Capital Ratio)</div>
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
import { useFormValidation } from '@/composables/useFormValidation';
import { mandatoryStoreKeys } from '@/config/mandatoryFields';

const props = defineProps(['readOnly']);
const store = useCreditRequestStore();

// This might be overkill for just file uploads, but ensures consistency with other tabs
// and handles potential future text inputs validation
const { errors, validateField } = useFormValidation();

const isEditing = ref(!props.readOnly);
const analyzing = ref(false);
const registeredCapital = ref(''); // Now a string to support commas
const analysisResults = ref(null);
const showDebug = ref(false);

watch(() => props.readOnly, (val) => {
  isEditing.value = !val;
});

// Validation Watcher (Boilerplate to satisfy "validation on inactive tabs" pattern)
watch(() => store.showValidationErrors, (val) => {
    if (val) {
        // If we had text fields here, we would validate them like this:
        // validateField('someField', formData.someField, ['required']);

        // For files, the parent CreditRequestForm usually handles "is file present" logic and alerts.
        // But if FileUploader supports :error prop, we could pass it.
        // Currently FileUploader only has visual 'required' indicator.
    }
}, { immediate: true });

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

// Input Handler for Auto-Comma
const handleCapitalInput = (event) => {
    let val = event.target.value;
    // Remove all non-digit characters
    val = val.replace(/[^0-9]/g, '');

    if (val) {
        // Format with commas
        registeredCapital.value = Number(val).toLocaleString('en-US');
    } else {
        registeredCapital.value = '';
    }
};

const analyzeFinancials = async () => {
  if (!files.balanceSheet || !files.profitLoss || !files.financialRatios) {
    Swal.fire('Error', 'กรุณาอัปโหลดไฟล์ งบดุล, งบกำไรขาดทุน และ อัตราส่วนทางการเงิน', 'error');
    return;
  }

  // Parse raw number from formatted string
  const cleanCapital = registeredCapital.value ? registeredCapital.value.replace(/,/g, '') : '';

  if (!cleanCapital) {
     Swal.fire('Warning', 'กรุณาระบุทุนจดทะเบียนเพื่อการคำนวณที่ถูกต้อง', 'warning');
  }

  analyzing.value = true;
  const formData = new FormData();
  formData.append('balance_sheet', files.balanceSheet);
  formData.append('profit_loss', files.profitLoss);
  formData.append('financial_ratios', files.financialRatios);
  formData.append('registered_capital', cleanCapital);

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

      Swal.fire('Success', 'วิเคราะห์ข้อมูลเรียบร้อยแล้ว', 'success');
    }
  } catch (error) {
    console.error(error);
    Swal.fire('Error', 'ไม่สามารถวิเคราะห์ไฟล์ได้ กรุณาตรวจสอบว่าไฟล์เป็น Excel ที่ถูกต้อง', 'error');
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

const formatValue = (val) => {
    if (typeof val === 'number') {
        if (Number.isInteger(val)) return val.toLocaleString('th-TH');
        return val.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    return val;
}

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

/* HEADER ROW WITH TOGGLE */
.results-header-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 15px;
}

.results-header-row h4 {
    margin: 0;
}

.toggle-switch {
    display: flex;
    align-items: center;
    gap: 10px;
}

.toggle-label {
    font-size: 0.9em;
    font-weight: bold;
    color: #555;
}

/* TOGGLE CSS */
.switch {
  position: relative;
  display: inline-block;
  width: 40px;
  height: 20px;
}

.switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: #ccc;
  transition: .4s;
}

.slider:before {
  position: absolute;
  content: "";
  height: 16px;
  width: 16px;
  left: 2px;
  bottom: 2px;
  background-color: white;
  transition: .4s;
}

input:checked + .slider {
  background-color: #007bff;
}

input:checked + .slider:before {
  transform: translateX(20px);
}

.slider.round {
  border-radius: 20px;
}

.slider.round:before {
  border-radius: 50%;
}

/* DEBUG TABLE */
.debug-table-container {
    overflow-x: auto;
    margin-bottom: 20px;
}

.debug-table {
    width: 100%;
    border-collapse: collapse;
    background: white;
}

.debug-table th, .debug-table td {
    border: 1px solid #ddd;
    padding: 8px;
    font-size: 0.9em;
}

.debug-table th {
    background-color: #f2f2f2;
    text-align: left;
}

.debug-table td.text-right {
    text-align: right;
}

.debug-table td.text-center {
    text-align: center;
}

/* NORMAL GRID */
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

/* NEW BREAKDOWN STYLES */
.score-breakdown-section {
    margin-bottom: 25px;
}

.score-breakdown-section h4 {
    margin-bottom: 10px;
    font-size: 1em;
    color: #555;
    border-left: 4px solid #007bff;
    padding-left: 10px;
}

.breakdown-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 15px;
}

.breakdown-card {
    background: white;
    padding: 12px;
    border: 1px solid #e0e0e0;
    border-radius: 6px;
    text-align: center;
}

.bd-title {
    font-weight: bold;
    font-size: 0.95em;
    color: #333;
}

.bd-subtitle {
    font-size: 0.75em;
    color: #888;
    margin-bottom: 5px;
}

.bd-value {
    font-size: 1.4em;
    font-weight: bold;
    color: #007bff;
}

</style>
