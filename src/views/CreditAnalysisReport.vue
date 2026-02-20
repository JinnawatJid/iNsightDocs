<template>
  <div class="credit-analysis-report">
    <div v-if="loading" class="loading">Loading Report...</div>
    <div v-else-if="!data" class="error">No report data found. Please regenerate the analysis.</div>

    <div v-else class="report-container">
      <div class="report-header">
         <div class="header-left">
             <h1>Credit Scoring & Financial Analysis Report</h1>
             <p class="date">Generated on: {{ new Date().toLocaleString('th-TH') }}</p>
         </div>
         <div class="header-right no-print">
             <button class="btn-print" @click="printReport">🖨️ Print Report</button>
             <button class="btn-close" @click="closeWindow">Close</button>
         </div>
      </div>

      <!-- VISUAL SHEET -->
      <div class="section visual-section">
          <h2>Summary Sheet</h2>
          <CreditScoreSheet
            :analysisResults="data.analysisResults"
            :inputs="data.inputs"
          />
      </div>

      <!-- DETAILED BREAKDOWN (The "More Detail" part) -->
      <div class="section details-section">
          <div class="header-with-toggle" @click="toggleExtractionDetails">
              <h2>Detailed Extraction & Scoring Logic</h2>
              <button class="btn-toggle no-print">
                  {{ showExtractionDetails ? 'Hide Details ▲' : 'Show Details ▼' }}
              </button>
          </div>

          <table class="detail-table" v-if="showExtractionDetails">
            <thead>
                <tr>
                    <th>Item / Criteria</th>
                    <th>Extracted / Calculated Value</th>
                    <th>Source Column</th>
                    <th>Weight</th>
                    <th>Score</th>
                </tr>
            </thead>
            <tbody>
                <tr v-for="(item, index) in debugData" :key="index">
                    <td class="col-label">{{ item.label }}</td>
                    <td class="text-right">{{ formatValue(item.value) }}</td>
                    <td class="text-center">{{ item.column || '-' }}</td>
                    <td class="text-right">{{ item.weight || '-' }}</td>
                    <td class="text-right font-bold">{{ item.score ? formatDecimal(item.score) : '-' }}</td>
                </tr>
            </tbody>
          </table>
      </div>

      <!-- PAYMENT HISTORY (DEBUG) -->
      <div class="section payment-history-section" v-if="latePaymentInvoices && latePaymentInvoices.length > 0">
          <div class="header-with-toggle">
              <h2>Payment History (Debug Log)</h2>
              <div class="text-right">
                  <span class="calc-summary">
                      <strong>Average Late Days Calculation:</strong>
                      {{ latePaymentStats.totalLateDays }} (Total Late Days) / {{ latePaymentStats.count }} (Invoices)
                      = <strong>{{ latePaymentStats.avg }}</strong> Days
                  </span>
              </div>
          </div>
          <p class="section-desc">รายการประวัติการชำระเงินจากระบบ Dynamics 365 (ใช้คำนวณคะแนน)</p>

          <div class="table-responsive">
            <table class="detail-table payment-table">
                <thead>
                    <tr>
                        <th>Invoice No.</th>
                        <th>Invoice Date</th>
                        <th>Due Date</th>
                        <th>Effective Payment</th>
                        <th>Late Days</th>
                        <th>Status</th>
                    </tr>
                </thead>
                <tbody>
                    <tr v-for="(inv, idx) in latePaymentInvoices" :key="idx" :class="{'row-late': inv.Late_Days > 0}">
                        <td>{{ inv.Invoice_No }}</td>
                        <td>{{ formatDate(inv.Invoice_Date) }}</td>
                        <td>{{ formatDate(inv['Due Date']) }}</td>
                        <td>
                            {{ formatDate(inv.Effective_Payment_Date) }}
                            <small v-if="inv.Payment_Doc_No" class="d-block text-muted">({{ inv.Payment_Doc_No }})</small>
                        </td>
                        <td class="text-center font-bold" :class="inv.Late_Days > 0 ? 'text-danger' : 'text-success'">
                            {{ inv.Late_Days }}
                        </td>
                        <td class="text-center">
                            <span class="badge" :class="inv.Late_Days > 0 ? 'badge-late' : 'badge-ontime'">
                                {{ inv.Status }}
                            </span>
                        </td>
                    </tr>
                </tbody>
            </table>
          </div>
      </div>
      <div class="section payment-history-section" v-else-if="latePaymentSummary">
           <h2>Payment History (Debug Log)</h2>
           <p class="text-muted">ไม่พบข้อมูลรายการ Invoice หรือไม่มีประวัติการชำระเงินล่าช้าในระบบ</p>
      </div>

      <!-- RAW JSON (Optional, collapsed) -->
      <div class="section raw-section no-print">
          <details>
              <summary>Raw Data (JSON)</summary>
              <pre>{{ JSON.stringify(data, null, 2) }}</pre>
          </details>
      </div>

    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import CreditScoreSheet from '@/components/credit/CreditScoreSheet.vue';

const loading = ref(true);
const data = ref(null);
const showExtractionDetails = ref(false);

const toggleExtractionDetails = () => {
    showExtractionDetails.value = !showExtractionDetails.value;
};

onMounted(() => {
    try {
        const raw = localStorage.getItem('credit_report_data');
        if (raw) {
            data.value = JSON.parse(raw);
        }
    } catch (e) {
        console.error("Failed to load report data", e);
    } finally {
        loading.value = false;
    }
});

const debugData = computed(() => {
    if (!data.value || !data.value.analysisResults) return [];
    return data.value.analysisResults.debugData || [];
});

const latePaymentSummary = computed(() => {
    if (!data.value || !data.value.analysisResults || !data.value.analysisResults.financialSummary) return null;
    return data.value.analysisResults.financialSummary.latePaymentData;
});

const latePaymentInvoices = computed(() => {
    const summary = latePaymentSummary.value;
    if (summary && summary.invoices && Array.isArray(summary.invoices)) {
        // Sort descending by Invoice Date (Newest first)
        return [...summary.invoices].sort((a, b) => {
            const dateA = new Date(a.Invoice_Date);
            const dateB = new Date(b.Invoice_Date);
            return dateB - dateA;
        });
    }
    return [];
});

const latePaymentStats = computed(() => {
    const invoices = latePaymentInvoices.value;
    if (!invoices || invoices.length === 0) return { totalLateDays: 0, count: 0, avg: 0 };

    const totalLateDays = invoices.reduce((sum, inv) => sum + (Number(inv.Late_Days) || 0), 0);
    const count = invoices.length;
    const avg = count > 0 ? (totalLateDays / count).toFixed(2) : 0;

    return { totalLateDays, count, avg };
});

const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    try {
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return dateStr;
        return d.toLocaleDateString('th-TH', { year: 'numeric', month: '2-digit', day: '2-digit' });
    } catch (e) {
        return dateStr;
    }
};

const formatValue = (val) => {
    if (typeof val === 'number') {
        return val.toLocaleString('th-TH', { maximumFractionDigits: 2 });
    }
    return val;
};

const formatDecimal = (val) => {
    if (typeof val === 'number') {
        return val.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    return val;
};

const printReport = () => {
    window.print();
};

const closeWindow = () => {
    window.close();
};
</script>

<style scoped>
.credit-analysis-report {
    padding: 20px;
    background-color: #f5f5f5;
    min-height: 100vh;
    font-family: 'Sarabun', sans-serif;
}

.report-container {
    max-width: 1200px;
    margin: 0 auto;
    background: white;
    padding: 30px;
    box-shadow: 0 4px 10px rgba(0,0,0,0.1);
}

.report-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 2px solid #333;
    padding-bottom: 20px;
    margin-bottom: 30px;
}

.report-header h1 {
    margin: 0;
    color: #0056FF;
    font-size: 24px;
}

.date {
    color: #666;
    margin-top: 5px;
}

.header-right {
    display: flex;
    gap: 10px;
}

.btn-print {
    background-color: #0056FF;
    color: white;
    border: none;
    padding: 10px 20px;
    border-radius: 4px;
    cursor: pointer;
    font-weight: bold;
}

.btn-close {
    background-color: #666;
    color: white;
    border: none;
    padding: 10px 20px;
    border-radius: 4px;
    cursor: pointer;
}

.section {
    margin-bottom: 40px;
}

.header-with-toggle {
    display: flex;
    justify-content: space-between;
    align-items: center;
    cursor: pointer;
    margin-bottom: 20px;
}

.header-with-toggle:hover h2 {
    color: #0056FF;
}

.btn-toggle {
    background: none;
    border: 1px solid #ccc;
    padding: 5px 10px;
    border-radius: 4px;
    color: #666;
    font-size: 0.9em;
    cursor: pointer;
}
.btn-toggle:hover {
    background: #f0f0f0;
    color: #333;
}

h2 {
    border-left: 5px solid #0056FF;
    padding-left: 10px;
    margin: 0; /* Remove default margin as handled by flex container */
    color: #333;
}

/* TABLE STYLES */
.detail-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 14px;
}

.detail-table th, .detail-table td {
    border: 1px solid #ddd;
    padding: 10px;
}

.detail-table th {
    background-color: #f0f0f0;
    font-weight: bold;
    text-align: left;
}

.text-right { text-align: right; }
.text-center { text-align: center; }
.font-bold { font-weight: bold; }

.col-label {
    font-weight: 500;
    color: #333;
}

.loading, .error {
    text-align: center;
    margin-top: 50px;
    font-size: 1.2em;
}

.error { color: red; }

.section-desc {
    color: #666;
    margin-bottom: 10px;
    font-size: 0.9em;
}

.table-responsive {
    overflow-x: auto;
}

.payment-table th {
    background-color: #e9ecef;
}

.row-late {
    background-color: #fff5f5;
}

.text-danger { color: #dc3545; }
.text-success { color: #28a745; }
.d-block { display: block; }
.text-muted { color: #6c757d; }

.badge {
    padding: 4px 8px;
    border-radius: 4px;
    font-size: 0.8em;
    font-weight: bold;
}
.badge-late {
    background-color: #f8d7da;
    color: #721c24;
}
.badge-ontime {
    background-color: #d4edda;
    color: #155724;
}

.calc-summary {
    font-size: 0.9em;
    color: #555;
    background: #f8f9fa;
    padding: 5px 10px;
    border-radius: 4px;
    border: 1px solid #e9ecef;
}

@media print {
    .no-print { display: none; }
    .credit-analysis-report { padding: 0; background: white; }
    .report-container { box-shadow: none; padding: 0; max-width: 100%; }
}
</style>
