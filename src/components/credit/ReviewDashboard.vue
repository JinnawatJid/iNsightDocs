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
            <div class="value amount">{{ formatNumber(store.transactionData.amount) }} บาท</div>
        </div>
        <div class="deal-item">
            <label>เครดิตเทอม (GS/AE/YC)</label>
            <div class="value">{{ formatTerms(store.transactionData) }}</div>
        </div>
        <div class="deal-item">
            <label>วิธีชำระเงิน</label>
            <div class="value">{{ store.customer.payment_method || '-' }}</div>
        </div>
         <div class="deal-item full-width">
            <label>เหตุผล/วัตถุประสงค์</label>
            <div class="value reason-text">{{ store.transactionData.reason || '-' }}</div>
        </div>
      </div>
    </div>

    <!-- Section 2: Key Documents Snapshot -->
    <div class="dashboard-card documents-snapshot">
        <div class="card-header">
            <h3>สถานะเอกสาร</h3>
            <span class="doc-count">ครบแล้ว {{ uploadedCount }}/{{ documents.length }} รายการ</span>
        </div>

        <div class="documents-grid">
            <div
                v-for="(doc, index) in documents"
                :key="index"
                class="doc-card"
                :class="{ 'uploaded': doc.isUploaded, 'missing': !doc.isUploaded }"
            >
                <div class="doc-icon">
                    <svg v-if="doc.isUploaded" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                    <svg v-else xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                </div>
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
                        <div class="doc-card" :class="{ 'uploaded': dbdStatus.profile, 'missing': !dbdStatus.profile }">
                <div class="doc-icon">
                    <svg v-if="dbdStatus.profile" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                    <svg v-else xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                </div>
                <div class="doc-meta">
                    <span class="doc-name">ข้อมูลนิติบุคคล</span>
                    <span class="doc-status">{{ dbdStatus.profile ? 'มีข้อมูล' : 'ไม่มีข้อมูล' }}</span>
                </div>
            </div>
            <div class="doc-card" :class="{ 'uploaded': dbdStatus.position, 'missing': !dbdStatus.position }">
                <div class="doc-icon">
                    <svg v-if="dbdStatus.position" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                    <svg v-else xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                </div>
                <div class="doc-meta">
                    <span class="doc-name">งบแสดงฐานะการเงิน</span>
                    <span class="doc-status">{{ dbdStatus.position ? 'มีข้อมูล' : (dbdStatus.isNoDataFlag ? 'ลูกค้าไม่ส่งงบ' : 'ไม่มีข้อมูล') }}</span>
                </div>
            </div>
            <div class="doc-card" :class="{ 'uploaded': dbdStatus.income, 'missing': !dbdStatus.income }">
                <div class="doc-icon">
                    <svg v-if="dbdStatus.income" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                    <svg v-else xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                </div>
                <div class="doc-meta">
                    <span class="doc-name">งบกำไรขาดทุน</span>
                    <span class="doc-status">{{ dbdStatus.income ? 'มีข้อมูล' : (dbdStatus.isNoDataFlag ? 'ลูกค้าไม่ส่งงบ' : 'ไม่มีข้อมูล') }}</span>
                </div>
            </div>
            <div class="doc-card" :class="{ 'uploaded': dbdStatus.ratios, 'missing': !dbdStatus.ratios }">
                <div class="doc-icon">
                    <svg v-if="dbdStatus.ratios" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                    <svg v-else xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                </div>
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
            @close="isFinancialModalOpen = false"
        />


    <!-- Section 3: Full Details Toggle -->
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
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue';
import { useCreditRequestStore } from '@/stores/creditRequest';
import { getMandatoryKeys } from '@/config/mandatoryFields';
import ApplicationTabs from './ApplicationTabs.vue';
import FinancialStatementModal from './FinancialStatementModal.vue';
import axios from 'axios';

const store = useCreditRequestStore();
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
    return `${data.termGS || 0} / ${data.termAE || 0} / ${data.termYC || 0}`;
};

// Document Logic (Reused from DocumentChecklist)
const DOC_LABELS = {
  'credit_application_doc': 'เอกสารคำขอ',
  'id_card': 'บัตรประชาชน',
  'home_reg': 'ทะเบียนบ้าน',
  'home_photo': 'รูปที่อยู่',
  'store_photo': 'รูปหน้าร้าน',
  'map': 'แผนที่',
  'bank_statement': 'Statement',
  'legal_entity_certificate': 'หนังสือรับรอง',
  'vat_document': 'ภพ.20',
  'company_photo': 'รูปบริษัท'
};

const documents = computed(() => {
  const { files } = getMandatoryKeys(store.isCompany);
  return files.map(key => {
    const file = store.files[key];
    const hasLocalFile = file && (!Array.isArray(file) || file.length > 0);
    const hasFile = hasLocalFile || !!store.uploadedDocuments[key];

    return {
      key,
      label: DOC_LABELS[key] || key,
      isUploaded: hasFile
    };
  });
});

const uploadedCount = computed(() => documents.value.filter(d => d.isUploaded).length);

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
        const response = await axios.get(`/api/financials/${store.customer.id}/check-local?t=${new Date().getTime()}`);
        console.log('[DEBUG UI] check-local response:', response.data);
        if (response.data && response.data.exists) {
            if (response.data.isNoFinancialData) {
                // If the customer has been flagged as having no financial data explicitly
                dbdStatus.value = {
                    profile: !!(response.data.files && response.data.files.profile),
                    position: false,
                    income: false,
                    ratios: false,
                    isNoDataFlag: true
                };
            } else {
                const files = response.data.files || {};
                dbdStatus.value = {
                    profile: !!files.profile,
                    position: !!files.balanceSheet,
                    income: !!files.incomeStatement,
                    ratios: !!files.financialRatios,
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

onMounted(() => {
    if (store.customer?.id && store.isCompany) {
        checkDbdStatus();
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
}

.reason-text {
    font-style: italic;
    line-height: 1.5;
}


/* DBD Section Styles */
.dbd-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 15px;
}
.btn-view-financials {
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
.btn-view-financials:hover {
    background: #bbdefb;
}
.doc-icon {
    font-size: 20px;
}

/* Documents Grid */
.doc-count {
    font-size: 14px;
    color: #666;
}

.documents-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 15px;
}

.doc-card {
    display: flex;
    align-items: center;
    gap: 12px;
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
}

.doc-card.uploaded .doc-icon { color: #28a745; }
.doc-card.missing .doc-icon { color: #ffc107; }

.doc-meta {
    display: flex;
    flex-direction: column;
}

.doc-name {
    font-size: 14px;
    font-weight: 500;
}

.doc-status {
    font-size: 11px;
    color: #888;
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
