<template>
  <div v-if="isOpen" class="modal-overlay" @click.self="closeModal">
    <div class="modal-content">
      <div class="modal-header">
        <h2 class="modal-title">ข้อมูลงบการเงิน</h2>
        <button class="close-btn" @click="closeModal">&times;</button>
      </div>

      <div class="modal-body">
        <div v-if="loading" class="loading-state">
          <div class="spinner"></div>
          <p>กำลังโหลดข้อมูล...</p>
        </div>

        <div v-else-if="error" class="error-state">
            <p>{{ error }}</p>
        </div>

        <div v-else class="financial-container">
          <!-- Main Content Area -->
          <div class="main-table-area">
            <div class="table-header">
              <h3>{{ currentTitle }}</h3>
            </div>

            <div class="table-wrapper" :class="{ 'pdf-wrapper': currentTab === 'companyProfile' }">
                <!-- PDF Viewer for Company Profile -->
                <div v-if="currentTab === 'companyProfile'" class="pdf-container">
                    <div v-if="pdfLoading" class="loading-state">
                        <div class="spinner"></div>
                        <p>กำลังโหลดเอกสาร...</p>
                    </div>
                    <div v-else-if="pdfError" class="error-state">
                        <p>{{ pdfError }}</p>
                    </div>
                    <iframe v-else-if="pdfUrl" :src="pdfUrl" type="application/pdf" class="preview-iframe" title="PDF Preview"></iframe>
                    <div v-else class="no-data-msg">
                        <p>ไม่พบไฟล์ข้อมูลนิติบุคคล</p>
                    </div>
                </div>

                <!-- Financial Table for other tabs -->
                <table v-else-if="currentData && currentData.years" class="financial-table">
                  <thead>
                    <!-- Year Header Row -->
                    <tr>
                      <th rowspan="2" class="metric-col">หน่วย : บาท</th>
                      <th v-for="year in currentData.years" :key="year" colspan="2" class="year-col">
                        {{ year }}
                      </th>
                    </tr>
                    <!-- Sub-header Row -->
                    <tr>
                      <template v-for="year in currentData.years" :key="year + '-sub'">
                        <th class="sub-col">จำนวนเงิน</th>
                        <th class="sub-col percent-col">%เปลี่ยนแปลง</th>
                      </template>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="(row, index) in currentData.rows" :key="index" :class="{ 'alt-row': index % 2 !== 0 }">
                      <td class="metric-cell">{{ row.metric }}</td>
                      <template v-for="year in currentData.years" :key="year + '-val'">
                        <td class="val-cell amount">{{ formatNumber(row.values[year]?.amount) }}</td>
                        <td class="val-cell percent" :class="getPercentClass(row.values[year]?.percentChange)">
                            {{ formatNumber(row.values[year]?.percentChange) }}
                        </td>
                      </template>
                    </tr>
                  </tbody>
                </table>
                <div v-else class="no-data-msg">
                    <p>ไม่พบข้อมูลสำหรับเอกสารนี้ (อาจไม่มีไฟล์หรือไฟล์ไม่ถูกต้อง)</p>
                </div>
            </div>
          </div>

          <!-- Sidebar Toggles -->
          <div class="sidebar-area">
            <div class="sidebar-section">
                <h4>เลือกเอกสาร</h4>
                <div class="doc-buttons">
                    <button
                        class="doc-btn"
                        :class="{ active: currentTab === 'companyProfile' }"
                        @click="currentTab = 'companyProfile'"
                    >
                        ข้อมูลนิติบุคคล
                    </button>
                    <button
                        class="doc-btn"
                        :class="{ active: currentTab === 'financialPosition' }"
                        @click="currentTab = 'financialPosition'"
                    >
                        งบแสดงฐานะการเงิน
                    </button>
                    <button
                        class="doc-btn"
                        :class="{ active: currentTab === 'incomeStatement' }"
                        @click="currentTab = 'incomeStatement'"
                    >
                        งบกำไรขาดทุน
                    </button>
                    <button
                        class="doc-btn"
                        :class="{ active: currentTab === 'financialRatios' }"
                        @click="currentTab = 'financialRatios'"
                    >
                        อัตราส่วนทางการเงิน
                    </button>
                </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onUnmounted } from 'vue';
import axios from '@/utils/axios';

const props = defineProps({
  isOpen: {
    type: Boolean,
    default: false
  },
  financialData: {
    type: Object,
    default: () => ({})
  },
  loading: {
    type: Boolean,
    default: false
  },
  error: {
    type: String,
    default: null
  },
  customerNo: {
    type: String,
    default: null
  }
});

const emit = defineEmits(['close']);

const currentTab = ref('financialPosition');
const pdfUrl = ref(null);
const pdfLoading = ref(false);
const pdfError = ref(null);

const currentData = computed(() => {
    if (!props.financialData) return null;
    return props.financialData[currentTab.value];
});

const currentTitle = computed(() => {
    if (currentTab.value === 'companyProfile') return 'ข้อมูลนิติบุคคล';
    if (currentTab.value === 'financialPosition') return 'งบแสดงฐานะการเงิน';
    if (currentTab.value === 'incomeStatement') return 'งบกำไรขาดทุน';
    return 'อัตราส่วนทางการเงิน';
});

const fetchPdf = async () => {
    if (!props.customerNo) return;

    pdfLoading.value = true;
    pdfError.value = null;

    try {
        const response = await axios.get(`/api/financials/download-local/${props.customerNo}/profile`, {
            responseType: 'blob'
        });

        const blob = new Blob([response.data], { type: 'application/pdf' });

        // Revoke previous URL if exists
        if (pdfUrl.value) {
            URL.revokeObjectURL(pdfUrl.value);
        }

        pdfUrl.value = URL.createObjectURL(blob);
    } catch (err) {
        console.error('Failed to fetch PDF:', err);
        pdfError.value = 'ไม่สามารถดึงข้อมูลเอกสารได้ หรือไม่พบไฟล์';
    } finally {
        pdfLoading.value = false;
    }
};

watch(() => currentTab.value, (newTab) => {
    if (newTab === 'companyProfile' && !pdfUrl.value && !pdfLoading.value && !pdfError.value) {
        fetchPdf();
    }
});

watch(() => props.isOpen, (isOpen) => {
    if (isOpen && currentTab.value === 'companyProfile' && !pdfUrl.value) {
        fetchPdf();
    } else if (!isOpen) {
        // Reset tab to default when closed
        currentTab.value = 'financialPosition';
    }
});

const revokePdfUrl = () => {
    if (pdfUrl.value) {
        URL.revokeObjectURL(pdfUrl.value);
        pdfUrl.value = null;
    }
};

onUnmounted(() => {
    revokePdfUrl();
});

const closeModal = () => {
    emit('close');
};

const formatNumber = (num) => {
    if (num === null || num === undefined || num === "") return "-";
    const val = parseFloat(num);
    if (isNaN(val)) return String(num);
    return val.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const getPercentClass = (num) => {
    if (num === null || num === undefined || num === "") return "";
    const val = parseFloat(num);
    if (val > 0) return "text-success";
    if (val < 0) return "text-danger";
    return "";
};
</script>
<style scoped>
/* Modal Structure */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background-color: rgba(0, 0, 0, 0.6);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  padding: 20px;
}

.modal-content {
  background: #f8f9fa; /* Light grey background outside the table area */
  border-radius: 12px;
  width: 95%;
  max-width: 1400px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 10px 30px rgba(0,0,0,0.2);
  overflow: hidden;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px 20px;
  background: white;
  border-bottom: 1px solid #e0e0e0;
}

.modal-title {
  margin: 0;
  font-size: 20px;
  font-weight: bold;
  color: #333;
}

.close-btn {
  background: none;
  border: none;
  font-size: 28px;
  line-height: 1;
  color: #666;
  cursor: pointer;
}

.close-btn:hover {
  color: #000;
}

.modal-body {
  padding: 20px;
  flex: 1;
  overflow-y: auto;
}

/* Layout */
.financial-container {
    display: flex;
    gap: 20px;
    align-items: flex-start;
}

.main-table-area {
    flex: 1;
    background: white;
    border-radius: 8px;
    padding: 20px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.05);
    overflow-x: auto;
}

.sidebar-area {
    width: 250px;
    flex-shrink: 0;
}

.sidebar-section {
    background: white;
    border-radius: 8px;
    padding: 15px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.05);
}

.sidebar-section h4 {
    margin: 0 0 15px 0;
    font-size: 14px;
    color: #555;
    border-bottom: 1px solid #eee;
    padding-bottom: 8px;
}

/* Buttons */
.doc-buttons {
    display: flex;
    flex-direction: column;
    gap: 10px;
}

.doc-btn {
    padding: 12px 15px;
    background: #f8f9fa;
    border: 1px solid #dee2e6;
    border-radius: 6px;
    text-align: left;
    font-size: 14px;
    color: #495057;
    cursor: pointer;
    transition: all 0.2s;
}

.doc-btn:hover {
    background: #e9ecef;
}

.doc-btn.active {
    background: #233e60; /* Dark blue matching header */
    color: white;
    border-color: #233e60;
    font-weight: bold;
}

/* Table Header */
.table-header {
    margin-bottom: 15px;
}

.table-header h3 {
    margin: 0;
    font-size: 18px;
    color: #233e60; /* Dark blue */
}

/* Table Styles */
.table-wrapper {
    overflow-x: auto;
    border-radius: 6px;
    border: 1px solid #e0e0e0;
    height: 100%;
}

.table-wrapper.pdf-wrapper {
    overflow: hidden;
    height: 70vh; /* Make sure PDF takes sufficient height */
}

.pdf-container {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
}

.preview-iframe {
    width: 100%;
    height: 100%;
    border: none;
    flex: 1;
}

.financial-table {
    width: 100%;
    border-collapse: collapse;
    min-width: 800px;
}

/* Matching the dark blue header from the image */
.financial-table thead {
    background-color: #233e60;
    color: white;
}

.financial-table th, .financial-table td {
    padding: 12px 10px;
    border: 1px solid rgba(255,255,255,0.1); /* subtle border in header */
}

.financial-table tbody td {
    border: 1px solid #e9ecef; /* Grey border for body */
}

.metric-col {
    text-align: left;
    font-weight: normal;
    font-size: 14px;
    width: 20%;
}

.year-col {
    text-align: center;
    font-weight: bold;
    font-size: 14px;
    border-left: 1px solid rgba(255,255,255,0.2) !important;
}

.sub-col {
    text-align: right;
    font-size: 12px;
    font-weight: normal;
    background-color: #2a4970; /* Slightly lighter blue for sub-header */
}

.sub-col.percent-col {
    width: 80px;
}

/* Body Styles */
.financial-table tbody tr {
    background-color: white;
}

.financial-table tbody tr.alt-row {
    background-color: #f8f9fa; /* Extremely light grey alternating row */
}

.metric-cell {
    font-weight: bold;
    color: #233e60; /* Dark blue text for row labels */
    font-size: 14px;
    padding: 12px 10px;
}

.val-cell {
    text-align: right;
    font-family: 'SF Pro Display', -apple-system, sans-serif;
    font-size: 13px;
    padding: 12px 10px;
    color: #333;
}

.val-cell.percent {
    border-right: 1px solid #e9ecef;
}

/* Colors */
.text-success { color: #28a745; }
.text-danger { color: #dc3545; }

/* States */
.loading-state, .error-state, .no-data-msg {
    text-align: center;
    padding: 50px;
    color: #666;
}

.spinner {
    border: 4px solid #f3f3f3;
    border-top: 4px solid #0056FF;
    border-radius: 50%;
    width: 40px;
    height: 40px;
    animation: spin 1s linear infinite;
    margin: 0 auto 15px auto;
}

@keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
}
</style>
