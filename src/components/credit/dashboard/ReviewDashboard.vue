<template>
  <div class="review-dashboard">
    <!-- Section 1: Deal Summary -->
    <div class="dashboard-card deal-summary">
      <div class="card-header">
        <h3>สรุปข้อมูลคำขอ</h3>
        <div class="request-meta">
            <span class="badge type">{{ store.transactionData.requestType }}</span>
            <span class="badge status">{{ store.requestStatus || 'ร่าง' }}</span>
        </div>
      </div>

      <div class="deal-grid">
        <div class="deal-item highlight">
            <label>วงเงินที่ขอ</label>
            <div v-if="isCreditIncrease" class="value amount">
                {{ formatNumber(totalCreditAmount) }} บาท
                <span class="increase-label">(ขอเพิ่ม {{ formatNumber(store.transactionData.amount) }})</span>
            </div>
            <div v-else class="value amount">{{ formatNumber(store.transactionData.amount) }} บาท</div>

            <div v-if="showOriginalValues && store.originalTransactionData?.amount !== undefined && store.originalTransactionData?.amount !== null && store.transactionData.amount != store.originalTransactionData.amount" class="original-value-label">
                เดิม: {{ formatNumber(store.originalTransactionData.amount) }} บาท
            </div>
            <div v-else-if="showOriginalValues && erpFallbackData && erpFallbackData.current_credit_limit !== undefined && store.transactionData.amount != erpFallbackData.current_credit_limit" class="original-value-label">
                เดิม (ERP): {{ formatNumber(erpFallbackData.current_credit_limit) }} บาท
            </div>
        </div>
        <div class="deal-item highlight-terms">
            <label>เครดิตเทอม (GS/AE/YC)</label>
            <div class="value terms-amount">{{ formatTerms(store.transactionData) }}</div>
            <div v-if="showOriginalValues && store.originalTransactionData && hasTermsChanged" class="original-value-label">
                เดิม: {{ formatTerms(store.originalTransactionData) }}
            </div>
            <div v-else-if="showOriginalValues && erpFallbackData && erpFallbackData.payment_terms_code && !isTermsEqual(store.transactionData, erpFallbackData.payment_terms_code)" class="original-value-label">
                เดิม (ERP): {{ erpFallbackData.payment_terms_code }}
            </div>
        </div>
        <div class="deal-item">
            <label>ที่มาของเครดิต</label>
            <div class="value reason-text">{{ store.transactionData.reason || '-' }}</div>
        </div>
        <div class="deal-item">
            <label>วิธีชำระเงิน</label>
            <div class="value">{{ store.customer.payment_method || '-' }}</div>
            <div v-if="showOriginalValues && store.originalInitiatorCustomer?.payment_method !== undefined && store.originalInitiatorCustomer?.payment_method !== null && store.customer.payment_method !== store.originalInitiatorCustomer.payment_method" class="original-value-label">
                เดิม: {{ store.originalInitiatorCustomer.payment_method || '-' }}
            </div>
            <!-- NOTE: ERP API may not map payment method identically, so skipping ERP fallback here unless mapped -->
        </div>
        <div class="deal-item">
            <label>เงื่อนไขการวางบิล</label>
            <div class="value">{{ store.customer.billing_schedule || '-' }}</div>
            <div v-if="showOriginalValues && store.originalInitiatorCustomer?.billing_schedule !== undefined && store.originalInitiatorCustomer?.billing_schedule !== null && store.customer.billing_schedule !== store.originalInitiatorCustomer.billing_schedule" class="original-value-label">
                เดิม: {{ store.originalInitiatorCustomer.billing_schedule || '-' }}
            </div>
        </div>
        <div class="deal-item">
            <label>เงื่อนไขการชำระเงิน</label>
            <div class="value">{{ store.customer.payment_condition || '-' }}</div>
            <div v-if="showOriginalValues && store.originalInitiatorCustomer?.payment_condition !== undefined && store.originalInitiatorCustomer?.payment_condition !== null && store.customer.payment_condition !== store.originalInitiatorCustomer.payment_condition" class="original-value-label">
                เดิม: {{ store.originalInitiatorCustomer.payment_condition || '-' }}
            </div>
            <div v-else-if="showOriginalValues && erpFallbackData && erpFallbackData.sales_billing_condition && store.customer.payment_condition !== erpFallbackData.sales_billing_condition" class="original-value-label">
                เดิม (ERP): {{ erpFallbackData.sales_billing_condition }}
            </div>
        </div>
      </div>
    </div>

    <!-- Section 2: Key Documents Snapshot -->
    <div class="dashboard-card documents-snapshot">
        <div class="card-header">
            <h3>สถานะเอกสาร</h3>
            <div class="doc-header-actions" style="display: flex; align-items: center; gap: 15px;">
                <span class="doc-count" :class="{ 'text-success': uploadedCount === documents.length, 'text-warning': uploadedCount < documents.length }">
                    {{ uploadedCount === documents.length ? `เอกสารครบถ้วน (${uploadedCount}/${documents.length} รายการ)` : `เอกสารยังไม่ครบ (${uploadedCount}/${documents.length} รายการ)` }}
                </span>
                <button class="btn-view-all-docs" @click="handleOpenAllDocs">
                   ดูเอกสารทั้งหมด
                </button>
            </div>
        </div>

        <div class="documents-grid">
            <div
                v-for="(doc, index) in documents"
                :key="index"
                class="doc-card list-item-style"
                :class="{ 'uploaded': doc.isUploaded, 'missing': !doc.isUploaded }"
            >
                <div class="doc-meta">
                    <span class="doc-name">{{ doc.label }}</span>
                    <span class="doc-status">{{ doc.isUploaded ? 'พร้อมตรวจสอบ' : 'ยังไม่แนบ' }}</span>
                </div>
            </div>
        </div>
    </div>


    <!-- Section 2.5: Financial Statements (งบการเงิน) - Only for corporate -->
    <div v-if="store.isCompany" class="dashboard-card dbd-snapshot">
        <div class="card-header">
            <h3>งบการเงิน (DBD)</h3>
            <button class="btn-view-financials" @click="openFinancialModal">
               ดูรายละเอียดงบการเงิน
            </button>
        </div>

        <div class="dbd-grid">
            <div class="doc-card list-item-style" :class="{ 'uploaded': dbdStatus.profile, 'missing': !dbdStatus.profile }">
                <div class="doc-meta">
                    <span class="doc-name">ข้อมูลนิติบุคคล</span>
                    <span class="doc-status">{{ dbdStatus.profile ? 'มีข้อมูล' : 'ไม่มีข้อมูล' }}</span>
                </div>
            </div>
            <div class="doc-card list-item-style" :class="{ 'uploaded': dbdStatus.position, 'missing': !dbdStatus.position }">
                <div class="doc-meta">
                    <span class="doc-name">งบแสดงฐานะการเงิน</span>
                    <span class="doc-status">{{ dbdStatus.position ? 'มีข้อมูล' : (dbdStatus.isNoDataFlag ? 'ลูกค้าไม่ส่งงบ' : 'ไม่มีข้อมูล') }}</span>
                </div>
            </div>
            <div class="doc-card list-item-style" :class="{ 'uploaded': dbdStatus.income, 'missing': !dbdStatus.income }">
                <div class="doc-meta">
                    <span class="doc-name">งบกำไรขาดทุน</span>
                    <span class="doc-status">{{ dbdStatus.income ? 'มีข้อมูล' : (dbdStatus.isNoDataFlag ? 'ลูกค้าไม่ส่งงบ' : 'ไม่มีข้อมูล') }}</span>
                </div>
            </div>
            <div class="doc-card list-item-style" :class="{ 'uploaded': dbdStatus.ratios, 'missing': !dbdStatus.ratios }">
                <div class="doc-meta">
                    <span class="doc-name">อัตราส่วนทางการเงิน</span>
                    <span class="doc-status">{{ dbdStatus.ratios ? 'มีข้อมูล' : (dbdStatus.isNoDataFlag ? 'ลูกค้าไม่ส่งงบ' : 'ไม่มีข้อมูล') }}</span>
                </div>
            </div>
        </div>
    </div>

    <!-- Financial Statement Modal -->

        <FinancialStatementModal
            :is-open="isFinancialModalOpen"
            :financial-data="financialData"
            :loading="financialLoading"
            :error="financialError"
            :customer-no="store.customer?.id"
            @close="isFinancialModalOpen = false"
        />


    <!-- Section 3: Full Details Toggle -->
    <!-- All Documents Modal -->
    <AllDocumentsModal
        :is-open="isAllDocsModalOpen"
        @close="isAllDocsModalOpen = false"
    />

    <div class="details-toggle-section">
        <button class="btn-toggle-details" @click="showFullDetails = !showFullDetails">
            <span v-if="!showFullDetails">ดูรายละเอียดข้อมูลลูกค้าแบบเต็ม</span>
            <span v-else>ซ่อนรายละเอียด</span>
            <svg :class="{ 'rotate': showFullDetails }" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
        </button>
    </div>

    <!-- Section 4: Full Application Form (Conditional) -->
    <div v-if="showFullDetails" class="full-details-wrapper">
        <ApplicationTabs :readOnly="true" viewMode="full" />
    </div>

    <!-- Section 5: Additional/Reviewer Documents -->
    <ReviewerDocumentsSection v-if="authStore.additionalDocumentsEnabled && store.requestStatus !== 'Draft'" />

  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue';
import { useCreditRequestStore } from '@/stores/creditRequest';
import { useAuthStore } from '@/stores/auth';
import ReviewerDocumentsSection from './ReviewerDocumentsSection.vue';
import { getMandatoryKeys } from '@/config/mandatoryFields';
import ApplicationTabs from '../forms/ApplicationTabs.vue';
import FinancialStatementModal from '../modals/FinancialStatementModal.vue';
import AllDocumentsModal from '../modals/AllDocumentsModal.vue';
import axios from '../../../utils/axios.js';
import CustomerService from '@/services/CustomerService';

const store = useCreditRequestStore();
const authStore = useAuthStore();
const showFullDetails = ref(false);

const formatNumber = (num) => {
    if (!num) return '0';
    // If num is string with comma, return as is, else format
    const val = parseFloat(String(num).replace(/,/g, ''));
    if (isNaN(val)) return '0';
    return val.toLocaleString('th-TH');
};

const formatTerms = (data) => {
    if (!data) return '-';
    const gs = data.termGS || 0;
    const ae = data.termAE || 0;
    const yc = data.termYC || 0;

    if (gs === ae && ae === yc) {
        return `${gs}`;
    }
    return `${gs} / ${ae} / ${yc}`;
};

const isCreditIncrease = computed(() => {
    return store.transactionData.requestType?.includes('เครดิตเพิ่ม') || false;
});

const showOriginalValues = computed(() => {
    const type = store.transactionData.requestType || '';
    return !type.includes('เครดิตใหม่') && !type.includes('เครดิตโครงการ');
});

const totalCreditAmount = computed(() => {
    const requestAmount = parseFloat(String(store.transactionData.amount || '0').replace(/,/g, ''));
    let baseAmount = 0;

    if (store.originalTransactionData?.amount !== undefined && store.originalTransactionData?.amount !== null) {
        baseAmount = parseFloat(String(store.originalTransactionData.amount).replace(/,/g, ''));
    } else if (erpFallbackData.value && erpFallbackData.value.current_credit_limit !== undefined) {
        baseAmount = parseFloat(String(erpFallbackData.value.current_credit_limit).replace(/,/g, ''));
    }

    return isNaN(requestAmount) ? baseAmount : (baseAmount + requestAmount);
});

const isTermsEqual = (data, erpTermsCode) => {
    if (!data) return false;
    const gs = String(data.termGS || 0);
    const ae = String(data.termAE || 0);
    const yc = String(data.termYC || 0);
    const code = String(erpTermsCode || 0).trim();

    // Simplistic check: If the code is equal to all of them or equal to the formatted string.
    if (gs === code && ae === code && yc === code) return true;
    if (formatTerms(data) === code) return true;

    return false;
}

const hasTermsChanged = computed(() => {
    if (!store.originalTransactionData) return false;
    return store.transactionData.termGS != store.originalTransactionData.termGS ||
           store.transactionData.termAE != store.originalTransactionData.termAE ||
           store.transactionData.termYC != store.originalTransactionData.termYC;
});

// Document Logic (Reused from DocumentChecklist)
const DOC_LABELS = {
  'credit_application_doc': 'ใบขอเปิดเครดิต',
  'id_card': 'สำเนาบัตรประชาชน',
  'home_reg': 'สำเนาทะเบียนบ้าน',
  'home_photo': 'รูปถ่าย',
  'store_photo': 'รูปร้านค้า',
  'map': 'แผนที่',
  'bank_statement': 'รายการเดินบัญชี (Bank Statement)',
  'legal_entity_certificate': 'หนังสือรับรองนิติบุคคล',
  'vat_document': 'เอกสารภพ.20',
  'company_photo': 'รูปถ่ายบริษัท'
};

const documents = computed(() => {
  // Combine all keys from files and uploadedDocuments
  const allKeys = new Set([
    ...Object.keys(store.files || {}),
    ...Object.keys(store.uploadedDocuments || {})
  ]);

  // Ensure mandatory keys are included even if not uploaded
  const { files: mandatoryKeys } = getMandatoryKeys(store.isCompany);
  mandatoryKeys.forEach(k => allKeys.add(k));

  // Remove DBD specific keys as they have their own section
  const dbdKeys = ['company_profile_doc', 'balance_sheet_doc', 'profit_loss_doc', 'financial_ratios_doc'];
  dbdKeys.forEach(k => allKeys.delete(k));

  return Array.from(allKeys).map(key => {
    const file = store.files[key];
    const hasLocalFile = file && (!Array.isArray(file) || file.length > 0);
    const hasFile = hasLocalFile || !!store.uploadedDocuments[key];

    let label = DOC_LABELS[key] || key;
    if (key.startsWith('other_')) {
      const parts = key.split(':');
      if (parts.length > 1) {
        label = parts[1];
      }
    }

    return {
      key,
      label,
      isUploaded: hasFile
    };
  });
});

const uploadedCount = computed(() => documents.value.filter(d => d.isUploaded).length);

const isAllDocsModalOpen = ref(false);

const handleOpenAllDocs = () => {
    console.log('[DEBUG UI] Opening All Documents Modal');
    console.log('[DEBUG UI] isAllDocsModalOpen currently:', isAllDocsModalOpen.value);
    isAllDocsModalOpen.value = true;
};

const isFinancialModalOpen = ref(false);
const financialData = ref(null);
const financialLoading = ref(false);
const financialError = ref(null);


const dbdStatus = ref({
    profile: false,
    position: false,
    income: false,
    ratios: false
});

const isDbdLoading = ref(false);

const checkDbdStatus = async () => {
    if (!store.customer?.id) return;

    isDbdLoading.value = true;
    try {
        const response = await axios.get(`/api/financials/check-local/${store.customer.id}?t=${new Date().getTime()}`);
        console.log('[DEBUG UI] check-local response:', response.data);
        if (response.data && response.data.exists) {
            if (response.data.isNoFinancialData) {
                // If the customer has been flagged as having no financial data explicitly
                dbdStatus.value = {
                    profile: !!(response.data.files && response.data.files.profile) || !!store.uploadedDocuments['company_profile_doc'],
                    position: false,
                    income: false,
                    ratios: false,
                    isNoDataFlag: true
                };
            } else {
                const files = response.data.files || {};
                dbdStatus.value = {
                    profile: !!files.profile || !!store.uploadedDocuments['company_profile_doc'],
                    position: !!files.balanceSheet || !!store.uploadedDocuments['balance_sheet_doc'],
                    income: !!files.incomeStatement || !!store.uploadedDocuments['profit_loss_doc'],
                    ratios: !!files.financialRatios || !!store.uploadedDocuments['financial_ratios_doc'],
                    isNoDataFlag: false
                };
            }
        } else {
            // Reset to false if not found
            dbdStatus.value = { profile: false, position: false, income: false, ratios: false, isNoDataFlag: false };
        }
    } catch (err) {
        console.error('Failed to fetch DBD status', err);
    } finally {
        isDbdLoading.value = false;
    }
};

watch(() => store.customer?.id, (newVal) => {
    if (newVal && store.isCompany) {
        checkDbdStatus();
        financialData.value = null; // reset cache
    }
});

const erpFallbackData = ref(null);

const fetchErpFallbackData = async () => {
    if (!store.customer?.id) return;

    try {
        const result = await CustomerService.searchCustomers(store.customer.id);
        if (Array.isArray(result) && result.length > 0 && result[0].customer) {
            erpFallbackData.value = result[0].customer;
        }
    } catch (e) {
        console.error('Failed to fetch ERP fallback data', e);
    }
};

onMounted(() => {
    if (store.customer?.id) {
        if (store.isCompany) {
            checkDbdStatus();
        }
        fetchErpFallbackData();
    }
});

watch(() => store.customer?.id, (newVal) => {
    if (newVal) {
        fetchErpFallbackData();
    }
});


const openFinancialModal = async () => {
    isFinancialModalOpen.value = true;
    if (financialData.value) return; // already loaded

    financialLoading.value = true;
    financialError.value = null;

    try {
        const response = await axios.get(`/api/financials/${store.customer.id}/dbd-data?t=${new Date().getTime()}`);
        console.log('[DEBUG UI] dbd-data response:', response.data);
        if (response.data && response.data.success) {
            financialData.value = response.data.data;
        } else {
            financialError.value = 'ไม่สามารถดึงข้อมูลได้';
        }
    } catch (err) {
        console.error('Error fetching DBD data:', err);
        financialError.value = 'เกิดข้อผิดพลาดในการโหลดข้อมูลงบการเงิน';
    } finally {
        financialLoading.value = false;
    }
};

</script>

<style scoped>
.review-dashboard {
    display: flex;
    flex-direction: column;
    gap: 20px;
}

.dashboard-card {
    background: white;
    border-radius: 8px;
    border: 1px solid #e0e0e0;
    padding: 20px;
}

.card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 15px;
    padding-bottom: 10px;
    border-bottom: 1px solid #f0f0f0;
}

.card-header h3 {
    margin: 0;
    font-size: 18px;
    font-weight: bold;
    color: #333;
}

.request-meta {
    display: flex;
    gap: 10px;
}

.badge {
    padding: 4px 12px;
    border-radius: 4px;
    font-size: 12px;
    font-weight: bold;
}

.badge.type { background: #e3f2fd; color: #0d47a1; }
.badge.status { background: #fff3cd; color: #856404; }

/* Deal Grid */
.deal-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 20px;
}

.deal-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    gap: 5px;
}

.deal-item.full-width {
    grid-column: span 3;
    background: #f9f9f9;
    padding: 15px;
    border-radius: 6px;
}

.deal-item label {
    font-size: 12px;
    color: #888;
    text-transform: uppercase;
}

.deal-item .value {
    font-size: 16px;
    font-weight: 500;
    color: #333;
}

.deal-item.highlight .value.amount {
    font-size: 24px;
    font-weight: bold;
    color: #0056FF;
    display: flex;
    align-items: center;
    justify-content: center;
    text-align: center;
    gap: 8px;
    flex-wrap: wrap;
}

.increase-label {
    font-size: 14px;
    font-weight: 500;
    color: #e65100; /* Subtle orange to denote an increase */
    background: #fff3e0;
    padding: 2px 8px;
    border-radius: 4px;
}

.deal-item.highlight-terms .value.terms-amount {
    font-size: 20px;
    font-weight: bold;
    color: #333;
}

.original-value-label {
    font-size: 13px;
    color: #888;
    margin-top: 4px;
    line-height: 1.4;
    font-style: italic;
}

.reason-text {
    font-style: italic;
    line-height: 1.5;
}


/* DBD Section Styles */
.dbd-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 8px;
}
.btn-view-financials, .btn-view-all-docs {
    background: #e3f2fd;
    color: #0d47a1;
    border: 1px solid #bbdefb;
    padding: 6px 12px;
    border-radius: 4px;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
}
.btn-view-financials:hover, .btn-view-all-docs:hover {
    background: #bbdefb;
}
.doc-icon {
    font-size: 20px;
}

/* Documents Grid */
.doc-count {
    font-size: 14px;
    font-weight: 600;
}
.doc-count.text-success {
    color: #28a745;
}
.doc-count.text-warning {
    color: #ffc107;
}

.documents-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 8px;
}

.doc-card {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px;
    border-radius: 6px;
    border: 1px solid #eee;
    background: #fafafa;
}

.doc-card.uploaded {
    background: #f0fff4;
    border-color: #c3e6cb;
}

.doc-card.missing {
    background: #fff8e1;
    border-color: #ffeeba;
}

.doc-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
}

.doc-card.uploaded .doc-icon { color: #28a745; }
.doc-card.missing .doc-icon { color: #ffc107; }

.doc-meta {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
}

.doc-name {
    font-size: 14px;
    font-weight: 500;
    text-align: left;
}

.doc-status {
    font-size: 11px;
    color: #888;
    text-align: left;
}

/* Toggle Section */
.details-toggle-section {
    display: flex;
    justify-content: center;
}

.btn-toggle-details {
    display: flex;
    align-items: center;
    gap: 10px;
    background: white;
    border: 1px solid #ccc;
    padding: 10px 20px;
    border-radius: 20px;
    cursor: pointer;
    font-weight: 500;
    color: #555;
    transition: all 0.2s;
    box-shadow: 0 2px 5px rgba(0,0,0,0.05);
}

.btn-toggle-details:hover {
    background: #f8f8f8;
    color: #333;
    border-color: #bbb;
}

.btn-toggle-details svg {
    transition: transform 0.3s;
}

.btn-toggle-details svg.rotate {
    transform: rotate(180deg);
}

/* Full Details Wrapper */
.full-details-wrapper {
    background: white;
    border-radius: 8px;
    border: 1px solid #e0e0e0;
    padding: 20px 0;
    overflow: hidden;
    animation: slideDown 0.3s ease-out;
}

@keyframes slideDown {
    from { opacity: 0; transform: translateY(-10px); }
    to { opacity: 1; transform: translateY(0); }
}
</style>

<style scoped>
.documents-grid-old {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 15px;
}
.dbd-grid-old {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 15px;
}
.doc-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
}
.doc-card.uploaded .doc-icon { color: #28a745; }
.doc-card.missing .doc-icon { color: #ffc107; }
</style>

<style scoped>
/* New List Style Overrides */
.documents-grid .doc-card.list-item-style,
.dbd-grid .doc-card.list-item-style {
    padding: 8px 12px;
    background: transparent;
    border: none;
    border-bottom: 1px solid #eaeaea;
    border-radius: 0;
    gap: 12px;
}

.documents-grid .doc-card.list-item-style:last-child,
.dbd-grid .doc-card.list-item-style:last-child {
    border-bottom: none;
}

/* Bullet points instead of icons */
.documents-grid .doc-card.list-item-style::before,
.dbd-grid .doc-card.list-item-style::before {
    content: "•";
    color: #888;
    font-size: 18px;
    line-height: 1;
}

.documents-grid .doc-card.list-item-style.uploaded::before,
.dbd-grid .doc-card.list-item-style.uploaded::before {
    color: #28a745;
}

.documents-grid .doc-card.list-item-style.missing::before,
.dbd-grid .doc-card.list-item-style.missing::before {
    color: #dc3545;
}

.documents-grid .doc-card.list-item-style .doc-meta,
.dbd-grid .doc-card.list-item-style .doc-meta {
    flex-direction: row;
    align-items: center;
    gap: 8px;
    width: 100%;
}

.documents-grid .doc-card.list-item-style .doc-name,
.dbd-grid .doc-card.list-item-style .doc-name {
    font-size: 14px;
    flex-grow: 1;
}

.documents-grid .doc-card.list-item-style .doc-status,
.dbd-grid .doc-card.list-item-style .doc-status {
    font-size: 12px;
    padding: 2px 8px;
    border-radius: 12px;
    background: #f0f0f0;
    color: #555;
    font-weight: 500;
}

.documents-grid .doc-card.list-item-style.uploaded .doc-status,
.dbd-grid .doc-card.list-item-style.uploaded .doc-status {
    background: #e6f4ea;
    color: #28a745;
}

.documents-grid .doc-card.list-item-style.missing .doc-status,
.dbd-grid .doc-card.list-item-style.missing .doc-status {
    background: #fde8e8;
    color: #dc3545;
}
</style>
