<template>
  <div class="store-statement-tab">
    <!-- Guarantee Docs Section (Moved from Request Info) -->
    <div class="upload-grid-small">


        <div class="guarantee-section">
          <FileUploader
            label="Bank Guarantee"
            v-model="files.bankGuarantee"
            :disabled="!isEditing"
            multiple
          />

          <div v-if="files.bankGuarantee && files.bankGuarantee.length > 0" class="guarantee-details mt-2">
             <div v-for="(file, index) in files.bankGuarantee" :key="index" class="guarantee-detail-card mb-2">
                <div class="guarantee-file-name text-primary text-sm mb-1 font-semibold truncate" :title="file.name">
                    {{ file.name }}
                </div>
                <div class="guarantee-inputs row g-2">
                    <div class="col-6">
                        <label class="text-xs text-muted mb-1">จำนวนเงิน</label>
                        <input
                            type="text"
                            class="form-control form-control-sm"
                            placeholder="เช่น 1,000,000"
                            :value="formatGuaranteeAmount(getGuaranteeDetail('bankGuaranteeDetails', file.name, 'amount'))"
                            @input="(e) => handleGuaranteeAmountInput('bankGuaranteeDetails', file.name, 'amount', e.target.value)"
                            :disabled="!isEditing"
                        />
                    </div>
                    <div class="col-6">
                        <label class="text-xs text-muted mb-1">วันหมดอายุ</label>
                        <input
                            type="date"
                            class="form-control form-control-sm"
                            :value="getGuaranteeDetail('bankGuaranteeDetails', file.name, 'expiryDate')"
                            @input="(e) => updateGuaranteeDetail('bankGuaranteeDetails', file.name, 'expiryDate', e.target.value)"
                            :disabled="!isEditing"
                        />
                    </div>
                </div>
             </div>
          </div>
        </div>

        <div class="guarantee-section">
          <FileUploader
            label="เอกสารค้ำประกัน"
            v-model="files.letterGuarantee"
            :disabled="!isEditing"
            multiple
          />

          <div v-if="files.letterGuarantee && files.letterGuarantee.length > 0" class="guarantee-details mt-2">
             <div v-for="(file, index) in files.letterGuarantee" :key="index" class="guarantee-detail-card mb-2">
                <div class="guarantee-file-name text-primary text-sm mb-1 font-semibold truncate" :title="file.name">
                    {{ file.name }}
                </div>
                <div class="guarantee-inputs row g-2">
                    <div class="col-6">
                        <label class="text-xs text-muted mb-1">จำนวนเงิน</label>
                        <input
                            type="text"
                            class="form-control form-control-sm"
                            placeholder="เช่น 500,000"
                            :value="formatGuaranteeAmount(getGuaranteeDetail('letterGuaranteeDetails', file.name, 'amount'))"
                            @input="(e) => handleGuaranteeAmountInput('letterGuaranteeDetails', file.name, 'amount', e.target.value)"
                            :disabled="!isEditing"
                        />
                    </div>
                    <div class="col-6">
                        <label class="text-xs text-muted mb-1">วันหมดอายุ</label>
                        <input
                            type="date"
                            class="form-control form-control-sm"
                            :value="getGuaranteeDetail('letterGuaranteeDetails', file.name, 'expiryDate')"
                            @input="(e) => updateGuaranteeDetail('letterGuaranteeDetails', file.name, 'expiryDate', e.target.value)"
                            :disabled="!isEditing"
                        />
                    </div>
                </div>
             </div>
          </div>
        </div>

        <div class="guarantee-section">
          <FileUploader
            label="หลักฐานเงินสดมัดจำ"
            v-model="files.cashDeposit"
            :disabled="!isEditing"
            multiple
          />

          <div v-if="files.cashDeposit && files.cashDeposit.length > 0" class="guarantee-details mt-2">
             <div v-for="(file, index) in files.cashDeposit" :key="index" class="guarantee-detail-card mb-2">
                <div class="guarantee-file-name text-primary text-sm mb-1 font-semibold truncate" :title="file.name">
                    {{ file.name }}
                </div>
                <div class="guarantee-inputs row g-2">
                    <div class="col-6">
                        <label class="text-xs text-muted mb-1">จำนวนเงิน</label>
                        <input
                            type="text"
                            class="form-control form-control-sm"
                            placeholder="เช่น 500,000"
                            :value="formatGuaranteeAmount(getGuaranteeDetail('cashDepositDetails', file.name, 'amount'))"
                            @input="(e) => handleGuaranteeAmountInput('cashDepositDetails', file.name, 'amount', e.target.value)"
                            :disabled="!isEditing"
                        />
                    </div>
                    <div class="col-6">
                        <label class="text-xs text-muted mb-1">วันหมดอายุ</label>
                        <input
                            type="date"
                            class="form-control form-control-sm"
                            :value="getGuaranteeDetail('cashDepositDetails', file.name, 'expiryDate')"
                            @input="(e) => updateGuaranteeDetail('cashDepositDetails', file.name, 'expiryDate', e.target.value)"
                            :disabled="!isEditing"
                        />
                    </div>
                </div>
             </div>
          </div>
        </div>
    </div>

    <!-- Main Upload Section -->
    <div class="upload-section-large" v-if="!store.isCompany">
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

    <!-- Other Documents Section -->
    <OtherDocumentsSection tabName="storeStatement" :readOnly="!isEditing" />

    <!-- Financial Analysis Section -->
    <div class="financial-analysis-section" v-if="shouldShowFinancialAnalysis" data-testid="financial-analysis-section">
      <div class="section-header">การวิเคราะห์ทางการเงินและคะแนนเครดิต</div>

      <!-- Local DBD Status Banner (Moved Outside/Top of the Grey Box) -->
      <div class="dbd-status-banner mb-3" v-if="isEditing && store.isCompany && localDBDStatus.checked && localDBDStatus.exists && !localDBDStatus.isNoFinancialData">
         <div class="badge-success-data banner-style">
             <span class="badge-icon">✅</span>
             <span>พบข้อมูลทางการเงินในระบบแล้ว (ดึงข้อมูลล่าสุดเมื่อ {{ formatDBDDate(localDBDStatus.date) }})</span>
             <span v-if="loadingLocalFiles" class="loading-spinner ml-2">⏳ กำลังโหลดไฟล์...</span>
         </div>
      </div>

      <!-- DBD Auto Import Section -->
      <div class="dbd-section" :class="{'dbd-section-disabled': localDBDStatus.exists && !localDBDStatus.isNoFinancialData}" v-if="isEditing && store.isCompany">
         <div class="dbd-header" v-if="false">
            <span class="dbd-title">DBD Auto Import</span>
            <span class="dbd-subtitle">ดึงข้อมูลจาก DataWarehouse</span>
         </div>

         <!-- VAT Number Display -->
         <div class="form-group dbd-input-group mb-3">
            <label>เลขประจำตัวผู้เสียภาษี (VAT Number)</label>
            <input
              type="text"
              :value="dbdQuery"
              class="form-control disabled-input"
              disabled
            />
         </div>

         <!-- HIDDEN Original Controls (Kept for future use) -->
         <div class="dbd-controls" v-if="false">
            <div class="form-group dbd-input-group">
                <input
                  type="text"
                  v-model="dbdQuery" :data-empty="!dbdQuery"
                  class="form-control"
                  :class="{'disabled-input': localDBDStatus.exists && !localDBDStatus.isNoFinancialData}"
                  placeholder="เลขทะเบียนนิติบุคคล หรือ ชื่อบริษัท"
                  :disabled="localDBDStatus.exists && !localDBDStatus.isNoFinancialData"
                />
            </div>
            <button
                class="btn-dbd"
                :class="{'btn-dbd-disabled': localDBDStatus.exists && !localDBDStatus.isNoFinancialData}"
                @click="autoDownloadDBD"
                :disabled="downloadingDBD || !dbdQuery || (localDBDStatus.exists && !localDBDStatus.isNoFinancialData)"
            >
                <span v-if="downloadingDBD">กำลังดาวน์โหลด...</span>
                <span v-else>Auto Download</span>
            </button>
         </div>

         <!-- Local DBD No Data Status Badge (Kept under controls) -->
         <div class="dbd-local-status mt-2" v-if="localDBDStatus.checked && localDBDStatus.isNoFinancialData">
             <div class="badge-no-data">
                 <span class="badge-icon">⚠️</span> ลูกค้าไม่มีงบการเงิน
             </div>
         </div>

         <!-- Manual Bridge Host Override -->
         <div class="dbd-host-setting" v-if="false">
            <small class="text-muted cursor-pointer" @click="showBridgeInput = !showBridgeInput">
               ⚙️ ตั้งค่า Bridge IP {{ showBridgeInput ? '(ซ่อน)' : '' }}
            </small>
            <div v-if="showBridgeInput" class="mt-1">
                <input
                    type="text"
                    v-model="customBridgeHost" :data-empty="!customBridgeHost"
                    class="form-control form-control-sm"
                    placeholder="เช่น 10.10.10.9 หรือ localhost"
                >
                <small class="text-secondary" style="font-size: 0.75em;">
                    หากเชื่อมต่อไม่ได้ ให้ใส่ IP ของเครื่องคุณ (ดูจาก VPN/WiFi)
                </small>
            </div>
         </div>

         <!-- Manual No Financial Data Checkbox -->
         <div class="dbd-manual-override">
             <label class="dbd-checkbox-label">
                 <input
                     type="checkbox"
                     v-model="store.transactionData.noFinancialData"
                     :disabled="!isEditing"
                     class="dbd-checkbox"
                 />
                 <span class="dbd-checkbox-text"><b>ลูกค้าไม่ส่งงบการเงิน</b> <span class="text-muted">(ส่งเฉพาะ Company Profile ไม่ต้องส่งงบ Excel)</span></span>
             </label>
         </div>
      </div>

      <div class="upload-grid-small" v-if="store.isCompany">
        <FileUploader
          label="ข้อมูลบริษัท (Company Profile)"
          required
          v-model="files.companyProfile"
          :disabled="!isEditing"
          accept=".pdf"
        />
        <FileUploader
          label="งบแสดงฐานะการเงิน (Balance Sheet)"
          :required="!store.transactionData.noFinancialData"
          v-model="files.balanceSheet"
          :disabled="!isEditing || store.transactionData.noFinancialData"
          accept=".xlsx, .xls"
        />
        <FileUploader
          label="งบกำไรขาดทุน (Profit & Loss)"
          :required="!store.transactionData.noFinancialData"
          v-model="files.profitLoss"
          :disabled="!isEditing || store.transactionData.noFinancialData"
          accept=".xlsx, .xls"
        />
        <FileUploader
          label="งบอัตราส่วนทางการเงิน (Ratios)"
          :required="!store.transactionData.noFinancialData"
          v-model="files.financialRatios"
          :disabled="!isEditing || store.transactionData.noFinancialData"
          accept=".xlsx, .xls"
        />
      </div>

      <div class="manual-input-row" v-if="isEditing">
        <div class="form-group" v-if="store.isCompany">
          <label>ทุนจดทะเบียน <span class="text-red-500">*</span></label>
          <input
            type="text"
            v-model="registeredCapital" :data-empty="!registeredCapital"
            @blur="handleRegisteredCapitalBlur"
            class="form-control"
            :class="{ 'border-red-500': errors.registered_capital && store.showValidationErrors }"
            placeholder="ระบุทุนจดทะเบียน (บาท)"
          />
          <span v-if="errors.registered_capital && store.showValidationErrors" class="error-text">กรุณาระบุข้อมูล</span>
        </div>
        <div class="form-group">
          <label>ระยะเวลาการเป็นลูกค้า (ปี หรือ พ.ศ. ที่จัดตั้ง) <span class="text-red-500">*</span></label>
          <input
            type="text"
            v-model="customerDuration" :data-empty="!customerDuration"
            @input="handleDurationInput"
            @blur="handleDurationBlur"
            class="form-control"
            :class="{ 'border-red-500': errors.customer_duration_years && store.showValidationErrors }"
            placeholder="ระบุจำนวนปี (หรือปี พ.ศ. ที่เริ่มเป็นลูกค้า)"
          />
          <span v-if="errors.customer_duration_years && store.showValidationErrors" class="error-text">กรุณาระบุข้อมูล</span>
          <small v-if="customerSinceDate" class="text-muted d-block mt-1" style="font-size: 0.8em;">
            เป็นลูกค้าตั้งแต่: {{ formatDate(customerSinceDate) }} ({{ calculatedDuration }} ปี)
          </small>
          <small v-if="isInvalidDuration" class="text-danger d-block mt-1" style="font-size: 0.8em;">
             ⚠️ ข้อมูลระยะเวลาดูไม่ถูกต้อง ({{ calculatedDuration }} ปี) กรุณาระบุใหม่
          </small>
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
        <div class="results-actions">
           <button class="btn-full-report" @click="openFullReport">
              📄 ดูรายละเอียดเต็ม
           </button>
        </div>

        <!-- Credit Score Sheet removed from inline view, accessible via Full Report button -->
        <!-- <CreditScoreSheet :analysisResults="analysisResults" :inputs="sheetInputs" /> -->

        <!-- LEGACY VIEW (Restored) -->
        <div class="analysis-results-legacy">

        <!-- Scoring Highlight -->
        <div v-if="analysisResults.scoringResult" class="score-highlight">
            <!-- Card 1: Credit Score (Narrower) -->
            <div class="score-card card-narrow">
                <div class="score-title">คะแนนเครดิต</div>
                <div class="score-val-container" :class="getGradeClass(analysisResults.scoringResult.grade)">
                    <div class="score-main">{{ analysisResults.scoringResult.totalScore }}</div>
                    <div class="score-max">/ 200</div>
                </div>
            </div>

            <!-- Card 2: Size & Grade (Wider, Split Header) -->
            <div class="score-card card-wide">
                <div class="dual-layout">
                    <!-- Column 1: Size -->
                    <div class="dual-col">
                        <div class="score-title text-center">ขนาด</div>
                        <div class="dual-val text-primary">{{ analysisResults.scoringResult.sizeResult?.label || '-' }}</div>
                        <div class="dual-sub">คะแนน {{ formatNumber(analysisResults.scoringResult.sizeResult?.score) }}</div>
                    </div>
                    
                    <!-- Divider -->
                    <div class="dual-divider-vertical"></div>

                    <!-- Column 2: Grade -->
                    <div class="dual-col">
                        <div class="score-title text-center">เกรด</div>
                        <div class="dual-val" :class="getGradeClass(analysisResults.scoringResult.grade)">{{ analysisResults.scoringResult.grade }}</div>
                        <div class="dual-sub">คะแนน {{ formatNumber(analysisResults.scoringResult.gradeResult?.score) }}</div>
                    </div>
                </div>
            </div>

            <!-- Card 3: Limit -->
            <div class="limit-card">
                <div class="score-title">วงเงินแนะนำ</div>
                <div class="limit-val">{{ formatNumber(analysisResults.scoringResult.recommendedLimit) }}</div>
                <div class="limit-unit">บาท</div>
                <div v-if="store.customer.current_credit_limit" class="current-limit-sub">
                    (ปัจจุบัน: {{ formatNumber(Number(store.customer.current_credit_limit)) }})
                </div>
            </div>
        </div>

        <!-- Score Breakdown (New Section) -->
        <div v-if="analysisResults.scoringResult && analysisResults.scoringResult.breakdown" class="score-breakdown-section">
             <h4>รายละเอียดคะแนน</h4>
             <div class="breakdown-grid">
                 <!-- C1 -->
                 <div class="breakdown-card">
                     <div class="bd-title">C1: ความแข็งแกร่งของบริษัท</div>
                     <div class="score-val-container text-primary">
                         <div class="score-main">{{ Math.round(analysisResults.scoringResult.breakdown.c1.total) }}</div>
                         <div class="score-max">/ {{ getCMaxScore(analysisResults.scoringResult.breakdown.c1) }}</div>
                     </div>
                 </div>
                 <!-- C2 -->
                 <div class="breakdown-card">
                     <div class="bd-title">C2: กระแสเงินสด</div>
                     <div class="score-val-container text-primary">
                         <div class="score-main">{{ Math.round(analysisResults.scoringResult.breakdown.c2.total) }}</div>
                         <div class="score-max">/ {{ getCMaxScore(analysisResults.scoringResult.breakdown.c2) }}</div>
                     </div>
                 </div>
                 <!-- C3 -->
                 <div class="breakdown-card">
                     <div class="bd-title">C3: พฤติกรรมการซื้อ</div>
                     <div class="score-val-container text-primary">
                         <div class="score-main">{{ Math.round(analysisResults.scoringResult.breakdown.c3.total) }}</div>
                         <div class="score-max">/ {{ getCMaxScore(analysisResults.scoringResult.breakdown.c3) }}</div>
                     </div>
                 </div>
             </div>
        </div>

        <div class="results-header-row">
           <h4>ข้อมูลทางการเงิน</h4>
        </div>

        <!-- NORMAL GRID VIEW -->
        <div class="result-grid">
          <div class="result-item">
            <span class="label">รายได้รวม:</span>
            <span class="value">
              {{ formatNumber(analysisResults.extractedData.totalRevenue?.value) }}
            </span>
          </div>
          <div class="result-item">
            <span class="label">กำไรขั้นต้น:</span>
            <span class="value">
              {{ formatNumber(analysisResults.extractedData.grossProfit?.value) }}
            </span>
          </div>
          <div class="result-item">
            <span class="label">หนี้สินไม่หมุนเวียน:</span>
            <span class="value">
              {{ formatNumber(analysisResults.extractedData.nonCurrentLiabilities?.value) }}
            </span>
          </div>
          <div class="result-item">
            <span class="label">ส่วนของผู้ถือหุ้น:</span>
            <span class="value">
              {{ formatNumber(analysisResults.extractedData.shareholdersEquity?.value) }}
            </span>
          </div>
           <div class="result-item">
            <span class="label">อัตราหมุนเวียนสินค้าคงเหลือ:</span>
            <span class="value">
              {{ formatNumber(analysisResults.extractedData.inventoryTurnover?.value) }}
            </span>
          </div>
           <div class="result-item">
            <span class="label">อัตราส่วนหนี้สินต่อทุน:</span>
            <span class="value">
              {{ formatNumber(analysisResults.extractedData.deRatio?.value) }}
            </span>
          </div>
        </div>

        <div class="calculated-ratios">
          <div class="ratio-card">
            <div class="ratio-title">อัตราส่วนความสามารถในการชำระหนี้</div>
            <div class="ratio-value">{{ formatNumber(analysisResults.calculations.dscr) }}</div>
          </div>
          <div class="ratio-card">
            <div class="ratio-title">สัดส่วนเครดิตต่อทุน</div>
            <div class="ratio-value">{{ formatNumber(analysisResults.calculations.creditCapitalRatio) }}</div>
          </div>
        </div>
      </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { reactive, ref, watch, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import FileUploader from '@/components/shared/FileUploader.vue';
import OtherDocumentsSection from '../OtherDocumentsSection.vue';
import { useCreditRequestStore } from '@/stores/creditRequest';
import iconUploadMulti from '@/assets/icons/upload-multi.svg';
import CreditScoreSheet from '../CreditScoreSheet.vue';
import axios from '../../../utils/axios.js';
import Swal from 'sweetalert2';
import { useFormValidation } from '@/composables/useFormValidation';

const props = defineProps(['readOnly']);
const store = useCreditRequestStore();
const route = useRoute();
const router = useRouter();

const { errors, validateField } = useFormValidation();

const isEditing = ref(!props.readOnly);
const analyzing = ref(false);
const downloadingDBD = ref(false);
const dbdQuery = ref('');
const analysisResults = ref(null);
const showBridgeInput = ref(false);
const customBridgeHost = ref(localStorage.getItem('bridgeHost') || 'localhost');

const localDBDStatus = reactive({
    checked: false,
    exists: false,
    isNoFinancialData: false,
    date: null
});
const loadingLocalFiles = ref(false);

const showBridgeHelp = () => {
    Swal.fire({
        title: 'วิธีแก้ปัญหาการเชื่อมต่อ (Browser Block)',
        html: `
            <div style="text-align: left; font-size: 0.9em;">
                <p>หากคุณใช้ <b>HTTP</b> (ไม่ใช่ HTTPS) และพยายามเชื่อมต่อ IP ภายใน (เช่น 10.x.x.x) เบราว์เซอร์อาจบล็อกการเชื่อมต่อ (Private Network Access).</p>
                <p><b>วิธีแก้ไข (เลือก 1 วิธี):</b></p>
                <ol>
                    <li><b>วิธีที่ 1 (ใหม่):</b> ค้นหา <code>chrome://flags/#private-network-access-checks</code> หรือ <b>"Local Network Access Checks"</b> แล้วเลือก <b>Disabled</b></li>
                    <li><b>วิธีที่ 2 (เก่า):</b> ค้นหา <code>chrome://flags/#block-insecure-private-network-requests</code> แล้วเลือก <b>Disabled</b> (หากมี)</li>
                    <li><b>วิธีที่ 3 (ทางเลือก):</b> ค้นหา <code>chrome://flags/#private-network-access-respect-preflight-results</code> แล้วเลือก <b>Disabled</b></li>
                </ol>
                <p class="mt-2 text-danger"><b>อย่าลืมกดปุ่ม Relaunch ด้านล่างขวาหลังเปลี่ยนค่า</b></p>
            </div>
        `,
        icon: 'info',
        confirmButtonText: 'เข้าใจแล้ว',
        width: 600
    });
};

watch(customBridgeHost, (newVal) => {
    localStorage.setItem('bridgeHost', newVal);
});

// Computed Properties for Data Binding (Audit Trail)
const registeredCapital = computed({
    get: () => {
        if (!store.customer.registered_capital) return '';
        const parts = String(store.customer.registered_capital).split('.');
        let formatted = Number(parts[0]).toLocaleString('en-US');
        if (parts.length > 1) {
            formatted += '.' + parts[1];
        }
        return formatted;
    },
    set: (val) => {
        let num = val.replace(/[^0-9.]/g, '');
        const parts = num.split('.');
        if (parts.length > 2) {
            num = parts[0] + '.' + parts.slice(1).join('');
        }
        store.updateCustomerData({ registered_capital: num });
    }
});

const customerDuration = computed({
    get: () => store.customer.customer_duration_years,
    set: (val) => store.updateCustomerData({ customer_duration_years: val })
});

const customerSinceDate = computed(() => store.customer.customer_since);

const calculatedDuration = computed(() => {
    if (!customerSinceDate.value) return 0;
    const start = new Date(customerSinceDate.value);
    const now = new Date();
    // Simple year difference
    let age = now.getFullYear() - start.getFullYear();
    const m = now.getMonth() - start.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < start.getDate())) {
        age--;
    }
    return Math.max(0, age);
});

const isInvalidDuration = computed(() => {
    return calculatedDuration.value > 100;
});

const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('th-TH');
};

// Auto-fill Duration from API Data if available and empty
watch(calculatedDuration, (val) => {
    // If duration is invalid (> 100 years), do not auto-fill
    if (isInvalidDuration.value) return;

    if (val !== undefined && val !== null && !customerDuration.value) {
        customerDuration.value = val;
    }
}, { immediate: true });

const sheetInputs = computed(() => {
    // Calculate Max Credit Term from Split Inputs
    const t1 = parseInt(store.transactionData?.termGS || 0);
    const t2 = parseInt(store.transactionData?.termAE || 0);
    const t3 = parseInt(store.transactionData?.termYC || 0);
    const splitMax = Math.max(t1, t2, t3);
    const finalTerm = store.transactionData?.creditTerm || splitMax || 0;

    return {
        customerName: store.customer?.name || '',
        registeredCapital: registeredCapital.value ? registeredCapital.value.replace(/,/g, '') : 0,
        yearsInBusiness: store.customer.years_in_business || 0,
        ownership: store.customer?.residence_ownership || '-',
        customerDuration: customerDuration.value || 0,
        requestAmount: store.transactionData?.amount || 0,
        creditTerm: finalTerm,
        billingCondition: store.customer?.billing_requirement || '-'
    };
});

const windowUrl = ref('');

onMounted(() => {
    // Capture URL on mount to ensure we have the browser's true state
    windowUrl.value = window.location.href;
});

// Initialize Analysis Results from Store (Persistence)
watch(() => store.financialSummary, (val) => {
    if (val && val.analysis_result) {
        analysisResults.value = val.analysis_result;
    }
}, { immediate: true, deep: true });

watch(() => props.readOnly, (val) => {
  isEditing.value = !val;
});

watch(() => store.showValidationErrors, (val) => {
    if (val) {
        validateField('registered_capital', registeredCapital.value, ['required']);
        validateField('customer_duration_years', customerDuration.value, ['required']);
    }
}, { immediate: true });

const files = reactive({
  bankStatement: [],
  bankGuarantee: null,
  letterGuarantee: null,
  cashDeposit: null,
  balanceSheet: null,
  profitLoss: null,
  financialRatios: null,
  companyProfile: null
});

// Watchers for store sync
watch(() => files.bankStatement, (v) => store.updateFile('bank_statement', v));
watch(() => files.bankGuarantee, (v) => store.updateFile('bank_guarantee_doc', v));
watch(() => files.letterGuarantee, (v) => store.updateFile('letter_guarantee_doc', v));
watch(() => files.cashDeposit, (v) => store.updateFile('cash_deposit_doc', v));
watch(() => files.balanceSheet, (v) => store.updateFile('balance_sheet_doc', v));
watch(() => files.profitLoss, (v) => store.updateFile('profit_loss_doc', v));
watch(() => files.financialRatios, (v) => store.updateFile('financial_ratios_doc', v));
watch(() => files.companyProfile, (v) => store.updateFile('company_profile_doc', v));

// Helper to manage guarantee details in the store
const getGuaranteeDetail = (storeKey, fileName, field) => {
    if (!store.transactionData[storeKey]) return '';
    if (!store.transactionData[storeKey][fileName]) return '';
    return store.transactionData[storeKey][fileName][field] || '';
};

const formatGuaranteeAmount = (val) => {
    if (!val) return '';
    const parts = String(val).split('.');
    let formatted = Number(parts[0]).toLocaleString('en-US');
    if (parts.length > 1) {
        formatted += '.' + parts[1];
    }
    return formatted === 'NaN' ? val : formatted;
};

const handleGuaranteeAmountInput = (storeKey, fileName, field, rawValue) => {
    let num = rawValue.replace(/[^0-9.]/g, '');
    const parts = num.split('.');
    if (parts.length > 2) {
        num = parts[0] + '.' + parts.slice(1).join('');
    }
    updateGuaranteeDetail(storeKey, fileName, field, num);
};

const updateGuaranteeDetail = (storeKey, fileName, field, value) => {
    if (!store.transactionData[storeKey]) {
        store.transactionData[storeKey] = {};
    }
    if (!store.transactionData[storeKey][fileName]) {
        store.transactionData[storeKey][fileName] = {};
    }
    store.transactionData[storeKey][fileName][field] = value;
};
// Initialize files from store
watch(() => store.files, (newVal) => {
  files.bankGuarantee = newVal?.bank_guarantee_doc || [];
  files.letterGuarantee = newVal?.letter_guarantee_doc || [];
  files.cashDeposit = newVal?.cash_deposit_doc || [];
  files.balanceSheet = newVal?.balance_sheet_doc || null;
  files.profitLoss = newVal?.profit_loss_doc || null;
  files.financialRatios = newVal?.financial_ratios_doc || null;
  files.companyProfile = newVal?.company_profile_doc || null;

  if (newVal && newVal.bank_statement) {
      files.bankStatement = newVal.bank_statement;
  } else {
      files.bankStatement = [];
  }
}, { immediate: true, deep: true });

const handleRegisteredCapitalBlur = () => {
    if (store.showValidationErrors) {
        validateField('registered_capital', registeredCapital.value, ['required']);
    }
};

const handleDurationInput = (event) => {
    let val = event.target.value;
    val = val.replace(/[^0-9]/g, '');
    customerDuration.value = val; // Triggers setter
};

const handleDurationBlur = () => {
    let val = customerDuration.value;
    if (!val) return;

    // Smart Input Logic:
    // If user enters a 4-digit year (e.g. 2560), calculate duration.
    if (val.length === 4) {
        const inputYear = parseInt(val);
        const currentYear = new Date().getFullYear() + 543; // Current Buddhist Year

        // Simple sanity check: Year must be <= Current Year
        if (inputYear <= currentYear && inputYear > 2400) {
            const diff = currentYear - inputYear;
            // Ensure non-negative and minimum 1
            customerDuration.value = Math.max(1, diff).toString();
        }
    } else if (parseInt(val) === 0) {
        // Enforce minimum 1 for direct duration input
        customerDuration.value = '1';
    }

    if (store.showValidationErrors) {
        validateField('customer_duration_years', customerDuration.value, ['required']);
    }
};

// Format DBD date string (YYYYMMDD) to DD/MM/YYYY
const formatDBDDate = (dateStr) => {
    if (!dateStr || dateStr.length !== 8) return dateStr;
    const year = dateStr.substring(0, 4);
    const month = dateStr.substring(4, 6);
    const day = dateStr.substring(6, 8);
    return `${day}/${month}/${year}`;
};

// Check for Local DBD files and auto-import
const checkAndLoadLocalDBD = async () => {
    const customerNo = store.customer?.id || store.customer?.No_;
    if (!customerNo || !store.isCompany || !isEditing.value) return;

    // Prevent checking multiple times unnecessarily
    if (localDBDStatus.checked) return;

    try {
        const checkRes = await axios.get(`/api/financials/check-local/${customerNo}`);
        const data = checkRes.data;

        localDBDStatus.checked = true;
        localDBDStatus.exists = data.exists;
        localDBDStatus.isNoFinancialData = data.isNoFinancialData || data.noFinancialData;
        localDBDStatus.date = data.date;

        // Auto-fill Registered Capital and Years in Business if missing
        if (data.dbdRegisteredCapital && !store.customer.registered_capital) {
            store.updateCustomerData({ registered_capital: data.dbdRegisteredCapital });
        }
        if (data.dbdYearsInBusiness && !store.customer.years_in_business) {
            store.updateCustomerData({ years_in_business: data.dbdYearsInBusiness });
        }

        // If files exist and we don't have NoFinancialData flag, auto-load them
        if (data.exists && !localDBDStatus.isNoFinancialData) {
            // Only auto-load if files aren't already populated in the component/store
            if (!files.balanceSheet && !files.profitLoss && !files.financialRatios) {
                loadingLocalFiles.value = true;

                // Helper to fetch file as Blob and convert to File
                const loadFile = async (fileKey, fileName, mimeType) => {
                    try {
                        const res = await axios.get(`/api/financials/download-local/${customerNo}/${fileKey}`, { responseType: 'blob' });
                        return new File([res.data], fileName, { type: mimeType });
                    } catch (err) {
                        console.error(`Failed to load ${fileKey}:`, err);
                        return null;
                    }
                };

                // Load required files
                const [profileFile, balanceSheetFile, profitLossFile, financialRatiosFile] = await Promise.all([
                    loadFile('profile', 'DBD_Profile.pdf', 'application/pdf'),
                    loadFile('balance_sheet', 'DBD_BalanceSheet.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'),
                    loadFile('income_statement', 'DBD_IncomeStatement.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'),
                    loadFile('financial_ratios', 'DBD_FinancialRatios.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
                ]);

                if (profileFile) files.companyProfile = profileFile;
                if (balanceSheetFile) files.balanceSheet = balanceSheetFile;
                if (profitLossFile) files.profitLoss = profitLossFile;
                if (financialRatiosFile) files.financialRatios = financialRatiosFile;

                loadingLocalFiles.value = false;
            }
        }
    } catch (error) {
        console.error('Failed to check local DBD files:', error);
        localDBDStatus.checked = true; // Mark checked even on error to avoid infinite loops
        loadingLocalFiles.value = false;
    }
};

// Initialize DBD Query from Customer Data
watch(() => store.customer, (val) => {
    if (val) {
        if (!dbdQuery.value) {
            // Prefer Tax ID, fallback to Name (if company)
            if (val.tax_id) {
                dbdQuery.value = val.tax_id;
            } else if (store.isCompany && val.name) {
                dbdQuery.value = val.name;
            }
        }

        // Auto-check for local files when customer data changes
        checkAndLoadLocalDBD();
    }
}, { immediate: true });

// Helper for Base64 conversion
const base64ToBlob = (base64, mimeType) => {
    const byteCharacters = atob(base64);
    const byteArrays = [];
    for (let offset = 0; offset < byteCharacters.length; offset += 512) {
        const slice = byteCharacters.slice(offset, offset + 512);
        const byteNumbers = new Array(slice.length);
        for (let i = 0; i < slice.length; i++) {
            byteNumbers[i] = slice.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        byteArrays.push(byteArray);
    }
    return new Blob(byteArrays, { type: mimeType });
};

const autoDownloadDBD = async () => {
    if (!dbdQuery.value) return;

    downloadingDBD.value = true;

    // Initial Popup
    const swalPromise = Swal.fire({
        title: 'กำลังเชื่อมต่อ...',
        text: 'กำลังเชื่อมต่อกับ Server...',
        allowOutsideClick: false,
        showCancelButton: true,
        cancelButtonText: 'ยกเลิก',
        showConfirmButton: false,
        didOpen: () => {
            Swal.showLoading();
        }
    });

    let bridgeUrl = null;

    // Check for Local Bridge (Port 4343)
    let isBridgeAvailable = false;
    let bridgeBaseUrl = 'http://localhost:4343';

    const checkBridge = async (host) => {
        try {
            const url = `http://${host}:4343`;
            console.log(`Checking bridge at ${url}...`);
            // We use a simple fetch to avoid complex axios interceptors if any
            // And we can catch network errors more directly
            await axios.get(`${url}/health`, { timeout: 2000 });
            return url;
        } catch (e) {
            console.warn(`Bridge check ${host} failed:`, e.message);
            return null;
        }
    };

    // Priority 0: Custom Manual Host (Highest Priority if set)
    if (customBridgeHost.value && customBridgeHost.value !== 'localhost') {
         const res = await checkBridge(customBridgeHost.value);
         if (res) {
             isBridgeAvailable = true;
             bridgeBaseUrl = res;
         } else {
             // Diagnostic for PNA (Private Network Access) Block
             // If on HTTP and trying to reach a different IP, Chrome likely blocks it.
             if (window.location.protocol === 'http:') {
                 console.warn('Bridge connection failed on HTTP. Likely PNA block.');
                 // We don't block flow here, just warn asynchronously or show if user persists
                 // But since this is priority 0, user explicitly asked for it.
                 // Let's show a toast or small alert?
                 // Better: Use a confirm to let them see the help immediately.
                 await Swal.fire({
                     title: 'การเชื่อมต่อล้มเหลว',
                     html: `
                        <div style="text-align: left;">
                            <p>ไม่สามารถเชื่อมต่อไปยัง <b>${customBridgeHost.value}</b> ได้</p>
                            <p class="text-danger" style="font-weight: bold;">เบราว์เซอร์อาจบล็อกการเชื่อมต่อนี้ (Private Network Access)</p>
                            <hr/>
                            <p>ลองปิด <b>Local Network Access Checks</b> ใน chrome://flags</p>
                        </div>
                     `,
                     icon: 'warning',
                     showCancelButton: true,
                     confirmButtonText: 'ดูวิธีแก้ไข',
                     cancelButtonText: 'ข้ามไปใช้วิธีอื่น'
                 }).then((res) => {
                     if (res.isConfirmed) {
                         showBridgeHelp();
                     }
                 });
             }
         }
    }

    if (!isBridgeAvailable) {
        // Priority 1: Current Hostname (Fixes PNA issue for Private IP access)
        const currentHost = window.location.hostname;
        if (currentHost !== 'localhost' && currentHost !== '127.0.0.1') {
            const res = await checkBridge(currentHost);
            if (res) {
                isBridgeAvailable = true;
                bridgeBaseUrl = res;
            }
        }
    }

    // Priority 2: localhost (Fallback if user is on localhost or if hostname fails)
    if (!isBridgeAvailable) {
        const res = await checkBridge('localhost');
        if (res) {
            isBridgeAvailable = true;
            bridgeBaseUrl = res;
        }
    }

    // Priority 3: 127.0.0.1 (Last resort)
    if (!isBridgeAvailable) {
        const res = await checkBridge('127.0.0.1');
        if (res) {
            isBridgeAvailable = true;
            bridgeBaseUrl = res;
        }
    }

    const customerNo = store.customer?.id || store.customer?.No_;
    const queryParams = new URLSearchParams({
        taxId: dbdQuery.value,
        customerCode: customerNo || ''
    });

    if (isBridgeAvailable) {
        bridgeUrl = `${bridgeBaseUrl}/stream?${queryParams.toString()}`;
        console.log(`Connected to Local Bridge at ${bridgeBaseUrl}`);
        Swal.update({ title: 'เชื่อมต่อกับ Local Bridge แล้ว', text: 'กำลังดึงข้อมูลจากเครื่องของคุณ...' });
    } else {
        console.log('Local Bridge not found, using Server Fallback');
        // Fallback to Server
        bridgeUrl = `/api/external/dbd-stream?${queryParams.toString()}`;

        // Notify user if we suspect they expected the bridge
        const isOfflineMode = window.location.hostname !== 'localhost' && !window.location.hostname.includes('vercel.app');
        if (isOfflineMode) {
             console.warn('Warning: Local Bridge not found in offline environment. Falling back to server which may fail if Puppeteer is missing.');
        }
    }

    // Use SSE for real-time progress updates
    const evtSource = new EventSource(bridgeUrl);

    // Handle User Cancel
    swalPromise.then((result) => {
        if (result.dismiss === Swal.DismissReason.cancel) {
            console.log('User cancelled DBD download');
            evtSource.close();
            downloadingDBD.value = false;
        }
    });

    evtSource.onmessage = async (event) => {
        try {
            const data = JSON.parse(event.data);

            if (data.status === 'progress') {
                // Update SweetAlert with new status
                Swal.update({
                    title: 'กำลังดำเนินการ...',
                    text: data.message
                });
            } else if (data.status === 'complete') {
                evtSource.close();

                Swal.update({ text: 'กำลังบันทึกไฟล์เข้าสู่ระบบ...' });

                try {
                    // 1. Process Company Profile (PDF)
                    // Check if data comes from Bridge (Base64) or Server (URL)
                    if (data.data && data.data.profile && data.data.profile.content) {
                         // FROM BRIDGE (Base64)
                         const blob = base64ToBlob(data.data.profile.content, data.data.profile.mime);
                         files.companyProfile = new File([blob], data.data.profile.filename, { type: data.data.profile.mime });
                    } else if (data.files && data.files.profile) {
                        // FROM SERVER (URL)
                        const pdfRes = await axios.get(data.files.profile.url, { responseType: 'blob' });
                        const pdfBlob = pdfRes.data;
                        const pdfName = data.files.profile.filename || `DBD_Profile_${dbdQuery.value}.pdf`;
                        files.companyProfile = new File([pdfBlob], pdfName, { type: 'application/pdf' });
                    }

                    // 2. Process Balance Sheet (Excel)
                    if (data.data && data.data.balanceSheet && data.data.balanceSheet.content) {
                         // FROM BRIDGE (Base64)
                         const blob = base64ToBlob(data.data.balanceSheet.content, data.data.balanceSheet.mime);
                         files.balanceSheet = new File([blob], data.data.balanceSheet.filename, { type: data.data.balanceSheet.mime });
                    } else if (data.files && data.files.balanceSheet) {
                        // FROM SERVER (URL)
                        const excelRes = await axios.get(data.files.balanceSheet.url, { responseType: 'blob' });
                        const excelBlob = excelRes.data;
                        const excelName = data.files.balanceSheet.filename || `DBD_BalanceSheet_${dbdQuery.value}.xlsx`;
                        files.balanceSheet = new File([excelBlob], excelName, { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
                    }

                    // 3. Process Income Statement (Excel)
                    if (data.data && data.data.incomeStatement && data.data.incomeStatement.content) {
                         // FROM BRIDGE (Base64)
                         const blob = base64ToBlob(data.data.incomeStatement.content, data.data.incomeStatement.mime);
                         files.profitLoss = new File([blob], data.data.incomeStatement.filename, { type: data.data.incomeStatement.mime });
                    } else if (data.files && data.files.incomeStatement) {
                        // FROM SERVER (URL)
                        const excelRes = await axios.get(data.files.incomeStatement.url, { responseType: 'blob' });
                        const excelBlob = excelRes.data;
                        const excelName = data.files.incomeStatement.filename || `DBD_IncomeStatement_${dbdQuery.value}.xlsx`;
                        files.profitLoss = new File([excelBlob], excelName, { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
                    }

                    // 4. Process Financial Ratios (Excel)
                    if (data.data && data.data.financialRatios && data.data.financialRatios.content) {
                         // FROM BRIDGE (Base64)
                         const blob = base64ToBlob(data.data.financialRatios.content, data.data.financialRatios.mime);
                         files.financialRatios = new File([blob], data.data.financialRatios.filename, { type: data.data.financialRatios.mime });
                    } else if (data.files && data.files.financialRatios) {
                        // FROM SERVER (URL)
                        const excelRes = await axios.get(data.files.financialRatios.url, { responseType: 'blob' });
                        const excelBlob = excelRes.data;
                        const excelName = data.files.financialRatios.filename || `DBD_FinancialRatios_${dbdQuery.value}.xlsx`;
                        files.financialRatios = new File([excelBlob], excelName, { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
                    }

                    // Update Years In Business if returned
                    if (data.yearsInBusiness !== undefined) {
                        store.updateCustomerData({ years_in_business: data.yearsInBusiness });
                    } else if (data.data && data.data.yearsInBusiness !== undefined) {
                        store.updateCustomerData({ years_in_business: data.data.yearsInBusiness });
                    }

                    Swal.fire({
                        title: 'Success',
                        text: 'ดาวน์โหลดและบันทึกข้อมูลเรียบร้อยแล้ว',
                        icon: 'success',
                        timer: 2000
                    });
                } catch (fetchErr) {
                    console.error(fetchErr);
                     Swal.fire('Error', 'ไม่สามารถบันทึกไฟล์ได้ (Network Error)', 'error');
                } finally {
                     downloadingDBD.value = false;
                }

            } else if (data.status === 'error') {
                evtSource.close();
                downloadingDBD.value = false;
                Swal.fire('Error', data.message || 'เกิดข้อผิดพลาดในการดาวน์โหลด', 'error');
            }
        } catch (e) {
            console.error('SSE Parse Error', e);
        }
    };

    evtSource.onerror = (err) => {
        console.error('EventSource failed:', err);
        evtSource.close();
        downloadingDBD.value = false;
        // If readyState is CLOSED (2), it might have just finished normally,
        // but typically 'complete' event handles that.
        // If this fires, it's usually a network error or server disconnect.
        Swal.fire('Error', 'การเชื่อมต่อถูกตัดขาด (Connection lost)', 'error');
    };
};

const analyzeFinancials = async () => {
  // Use global validation logic to ensure all required fields/files are present
  // Passing true, true to simulate strict submit-level validation including financials
  const validation = store.validateRequest(true, true);
  if (!validation.valid) {
      console.log('Validation Failed during Financial Analysis:', validation);
      store.triggerValidation();
      Swal.fire({
          icon: 'warning',
          title: 'ข้อมูลไม่ครบถ้วน',
          text: 'กรุณากรอกข้อมูลและแนบเอกสารให้ครบถ้วนตามรายการที่มีเครื่องหมาย * ก่อนทำการวิเคราะห์ข้อมูล'
      });
      return;
  } else {
      store.clearValidation();
  }

  // Extra validation specific to financial analysis
  if (store.isCompany) {
      const cleanCapital = registeredCapital.value ? registeredCapital.value.replace(/,/g, '') : '';
      if (!cleanCapital) {
         Swal.fire('Warning', 'กรุณาระบุทุนจดทะเบียนเพื่อการคำนวณที่ถูกต้อง', 'warning');
         return;
      }

      // If not marked as "no financial data", ensure excel files are present before analysis
      if (!store.transactionData.noFinancialData) {
          if (!files.balanceSheet || !files.profitLoss || !files.financialRatios) {
              Swal.fire('Warning', 'กรุณาแนบไฟล์งบการเงิน Excel ให้ครบถ้วน หรือติ๊กเลือก "ลูกค้าไม่ส่งงบการเงิน" หากไม่มีข้อมูล', 'warning');
              return;
          }
      }
  }

  analyzing.value = true;
  const formData = new FormData();
  if (files.balanceSheet) formData.append('balance_sheet', files.balanceSheet);
  if (files.profitLoss) formData.append('profit_loss', files.profitLoss);
  if (files.financialRatios) formData.append('financial_ratios', files.financialRatios);
  if (files.companyProfile) formData.append('company_profile', files.companyProfile);

  const cleanCapital = registeredCapital.value ? registeredCapital.value.replace(/,/g, '') : '0';
  formData.append('registered_capital', cleanCapital);
  formData.append('customer_duration', customerDuration.value || '0');
  formData.append('years_in_business', store.customer.years_in_business || '0');

  // Calculate Max Credit Term
  const t1 = parseInt(store.transactionData?.termGS || 0);
  const t2 = parseInt(store.transactionData?.termAE || 0);
  const t3 = parseInt(store.transactionData?.termYC || 0);
  const splitMax = Math.max(t1, t2, t3);
  const requestTerm = store.transactionData?.creditTerm || splitMax || '30';

  formData.append('request_credit_term', requestTerm);
  formData.append('residence_ownership', store.customer?.residence_ownership || '');
  formData.append('residence_ownership_other', store.customer?.residence_ownership_other || '');

  const requestAmount = store.transactionData?.amount || 0;
  formData.append('request_amount', requestAmount);

  const customerNo = store.customer?.id || store.customer?.No_;
  if (customerNo) {
      formData.append('customer_no', customerNo);
  }

  const taxId = store.customer?.tax_id || store.customer?.['VAT Registration No_'] || store.customer?.vat_registration_no || '';
  if (taxId) {
      formData.append('tax_id', taxId);
  }

  // Determine model_type
  formData.append('model_type', currentModelType.value);

  try {
    const response = await axios.post('/api/financials/analyze', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });

    if (response.data.success) {
      analysisResults.value = response.data;
      store.updateFinancialAnalysis(response.data);
      if (response.data.scoringResult) {
          store.creditScore = {
              ...store.creditScore,
              ...response.data.scoringResult
          };
      }
      
      // Auto-save transaction data (including analysis result & inputs)
      await store.saveTransactionData();
      
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

const getCMaxScore = (cObj) => {
    if (!cObj) return 0;
    // Check if factors, items, or debug arrays exist
    const factorList = cObj.factors || cObj.items || cObj.debug;
    if (!factorList || !Array.isArray(factorList)) return 0;

    const maxScore = factorList.reduce((sum, f) => sum + (f.weight || 0), 0);
    return Math.round(maxScore);
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

const openFullReport = () => {
    // Save current data to localStorage to pass to new tab
    const data = {
        analysisResults: analysisResults.value,
        inputs: {
            ...sheetInputs.value,
            model_type: currentModelType.value
        }
    };
    localStorage.setItem('credit_report_data', JSON.stringify(data));

    // Open in new tab
    const routeData = router.resolve({ name: 'CreditAnalysisReport' });
    window.open(routeData.href, '_blank');
};

// Computed for Diagnostics
const cleanStatus = computed(() => store.requestStatus ? String(store.requestStatus).trim().toLowerCase() : '');
const isDraft = computed(() => !store.requestStatus || cleanStatus.value === 'draft' || cleanStatus.value === '');

// Computed for Model Type
const currentModelType = computed(() => {
    const reqType = store.transactionData?.requestType || 'เครดิตใหม่';
    return reqType !== 'เครดิตใหม่' ? 'existing' : 'new';
});

// Visibility Logic for Financial Analysis
const shouldShowFinancialAnalysis = computed(() => {
    // 1. Always visible in Draft (moved to main form)
    if (isDraft.value) {
        return true;
    }

    // 2. Standard Visibility (Downstream roles)
    const visibleStatuses = [
        'opened',
        'regionalsubmitted',
        'salessubmitted',
        'submitted',
        'reviewed',
        'approved',
        'pendingfinance',
        'pendingsales',
        'pendingfinance (ชั่วคราว)',
        'pendingsales (ชั่วคราว)'
    ];

    if (visibleStatuses.some(s => cleanStatus.value.includes(s))) {
        return true;
    }

    return false;
});

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

.dbd-section {
    background-color: #e3f2fd;
    padding: 15px;
    border-radius: 8px;
    margin-bottom: 20px;
    border: 1px solid #90caf9;
    transition: all 0.3s ease;
}

.dbd-section-disabled {
    background-color: #f8f9fa;
    border-color: #dee2e6;
    box-shadow: inset 0 1px 3px rgba(0,0,0,0.02);
}

.dbd-section-disabled .dbd-title {
    color: #6c757d;
}

.dbd-section-disabled .dbd-subtitle {
    color: #adb5bd;
}


.btn-dbd-disabled {
    background-color: #e9ecef !important;
    color: #adb5bd !important;
    border: 1px solid #ced4da !important;
    cursor: not-allowed !important;
}

.cursor-pointer {
    cursor: pointer;
}

.dbd-header {
    margin-bottom: 10px;
}

.dbd-title {
    font-weight: bold;
    color: #1565c0;
    margin-right: 10px;
}

.dbd-subtitle {
    font-size: 0.9em;
    color: #555;
}

.dbd-controls {
    display: flex;
    gap: 10px;
}

.dbd-input-group {
    flex: 1;
    max-width: 400px;
}

.btn-dbd {
    background-color: #1976d2;
    color: white;
    border: none;
    padding: 8px 16px;
    border-radius: 4px;
    cursor: pointer;
    font-weight: 500;
}

.btn-dbd:disabled {
    background-color: #90caf9;
    cursor: not-allowed;
}

.dbd-manual-override {
    margin-top: 15px;
    padding-top: 15px;
    border-top: 1px dashed rgba(25, 118, 210, 0.3);
}

.dbd-section-disabled .dbd-manual-override {
    border-top: 1px dashed rgba(0, 0, 0, 0.1);
}

.dbd-checkbox-label {
    display: flex;
    align-items: center;
    margin: 0;
    cursor: pointer;
    user-select: none;
    transition: opacity 0.2s;
}

.dbd-checkbox-label:hover {
    opacity: 0.9;
}

.dbd-checkbox {
    appearance: none;
    -webkit-appearance: none;
    width: 18px;
    height: 18px;
    border: 2px solid #1976d2;
    border-radius: 4px;
    margin-right: 10px;
    position: relative;
    cursor: pointer;
    background-color: white;
    flex-shrink: 0;
}

.dbd-section-disabled .dbd-checkbox {
    border-color: #adb5bd;
}

.dbd-checkbox:checked {
    background-color: #1976d2;
    border-color: #1976d2;
}

.dbd-checkbox:checked::after {
    content: '';
    position: absolute;
    left: 5px;
    top: 1px;
    width: 5px;
    height: 10px;
    border: solid white;
    border-width: 0 2px 2px 0;
    transform: rotate(45deg);
}

.dbd-checkbox:disabled {
    cursor: not-allowed;
    opacity: 0.6;
}

.dbd-checkbox-text {
    font-size: 0.95em;
    color: #333;
}

.dbd-section-disabled .dbd-checkbox-text b {
    color: #6c757d;
}

.dbd-local-status {
    font-size: 0.9em;
    padding: 8px 12px;
    border-radius: 4px;
    background-color: white;
    display: inline-block;
    border: 1px solid #e0e0e0;
}

.badge-no-data {
    color: #e65100;
    font-weight: 500;
}

.badge-success-data {
    color: #2e7d32;
    font-weight: 500;
}

.banner-style {
    display: flex;
    align-items: center;
    padding: 10px 14px;
    background-color: #edf7ed;
    border: 1px solid #cce8cd;
    border-radius: 6px;
    font-size: 0.95em;
    color: #1e4620;
    width: 100%;
    box-sizing: border-box;
    margin-bottom: 15px;
}

.badge-icon {
    margin-right: 4px;
}

.loading-spinner {
    font-size: 0.85em;
    color: #666;
    margin-left: 10px;
    font-weight: normal;
}

.manual-input-row {
  display: flex;
  align-items: flex-start;
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

.action-button {
  margin-top: 25px;
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

.results-actions {
    display: flex;
    justify-content: flex-end;
    margin-bottom: 15px;
}

.btn-full-report {
    background-color: #0056FF;
    color: white;
    border: none;
    padding: 8px 16px;
    border-radius: 4px;
    cursor: pointer;
    font-weight: 500;
    display: flex;
    align-items: center;
    gap: 5px;
    font-size: 0.9em;
    transition: background-color 0.2s;
}

.btn-full-report:hover {
    background-color: #0046cc;
}

.score-highlight {
    display: flex;
    gap: 15px;
    margin-bottom: 20px;
    padding-bottom: 20px;
    border-bottom: 1px solid #ddd;
    align-items: stretch;
}

.score-card, .limit-card {
    background: white;
    padding: 15px;
    border-radius: 8px;
    text-align: center;
    box-shadow: 0 2px 4px rgba(0,0,0,0.05);
    display: flex;
    flex-direction: column;
    justify-content: flex-start;
}

/* Flex sizing adjustments */
.card-narrow {
    flex: 0.8; /* Uses less space */
    min-width: 120px;
}

.card-wide {
    flex: 1.5; /* Uses more space */
}

.limit-card {
    flex: 1;
}

.score-title {
    font-size: 1em; /* Standardized title size */
    font-weight: bold;
    color: #555;
    margin-bottom: 10px;
    min-height: 24px; /* Ensure alignment */
}

/* New Score Value Container */
.score-val-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    margin-top: 5px;
    line-height: 1;
}

.score-main {
    font-size: 2.8em; /* Bigger */
    font-weight: bold;
}

.score-max {
    font-size: 1em; /* Smaller */
    color: #888;
    margin-top: 2px;
}

.score-val {
    font-size: 2em;
    font-weight: bold;
    margin-top: 5px;
}

/* Dual Layout for Size & Grade */
.dual-layout {
    display: flex;
    align-items: stretch;
    height: 100%;
}

.dual-col {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
}

.dual-divider-vertical {
    width: 1px;
    background-color: #e0e0e0;
    margin: 0 10px;
}

.dual-val {
    font-size: 2.2em; /* Slightly larger for emphasis */
    font-weight: bold;
    line-height: 1.2;
    margin-top: 5px;
}

.dual-sub {
    font-size: 0.8em;
    color: #888;
    margin-top: auto; /* Push to bottom if needed */
}

.limit-val {
    font-size: 2em;
    font-weight: bold;
    color: #28a745;
    margin: 10px 0;
}

.current-limit-sub {
    font-size: 0.9em;
    color: #666;
    margin-top: 5px;
}

.text-primary { color: #007bff; }
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

.text-red-500 {
  color: #ef4444;
}

.border-red-500 {
  border-color: #ef4444 !important;
}

.error-text {
  color: #ef4444;
  font-size: 0.8em;
  margin-top: 4px;
  display: block;
}

.guarantee-section {
    display: flex;
    flex-direction: column;
}

.guarantee-detail-card {
    background-color: #f8f9fa;
    border: 1px solid #e0e0e0;
    border-radius: 6px;
    padding: 10px;
}

.truncate {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}
</style>
