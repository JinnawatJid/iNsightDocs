<template>
  <div class="credit-analysis-report">
    <div v-if="loading" class="loading">กำลังโหลดรายงาน...</div>
    <div v-else-if="!data" class="error">ไม่พบข้อมูลรายงาน กรุณาประมวลผลใหม่</div>

    <div v-else class="report-container">
      <div class="report-header">
         <div class="header-left">
             <h1>รายงานการวิเคราะห์สินเชื่อและการเงิน</h1>
             <p class="date">วันที่สร้าง: {{ new Date().toLocaleString('th-TH') }}</p>
         </div>
         <div class="header-right no-print">
             <button class="btn-print" @click="printReport">🖨️ พิมพ์รายงาน</button>
             <button class="btn-close" @click="closeWindow">ปิดหน้าต่าง</button>
         </div>
      </div>

      <!-- VISUAL SHEET -->
      <div class="section visual-section">
          <h2>สรุปผลการวิเคราะห์</h2>
          <CreditScoreSheet
            :analysisResults="data.analysisResults"
            :inputs="data.inputs"
          />
      </div>

      <!-- DETAILED BREAKDOWN (The "More Detail" part) -->
      <div class="section details-section">
          <div class="header-with-toggle" @click="toggleExtractionDetails">
              <h2>รายละเอียดการคำนวณคะแนน</h2>
              <button class="btn-toggle no-print">
                  {{ showExtractionDetails ? 'ซ่อนรายละเอียด ▲' : 'แสดงรายละเอียด ▼' }}
              </button>
          </div>

          <table class="detail-table" v-if="showExtractionDetails">
            <thead>
                <tr>
                    <th>รายการ / เกณฑ์ (Item / Criteria)</th>
                    <th>ค่าที่ได้ / คำนวณ (Value)</th>
                    <th>คอลัมน์ต้นทาง (Source)</th>
                    <th>เกณฑ์ที่ตรงกัน (Rule)</th>
                    <th>น้ำหนัก (Weight)</th>
                    <th>คะแนน (Score)</th>
                </tr>
            </thead>
            <tbody>
                <tr v-for="(item, index) in debugData" :key="index">
                    <td class="col-label">{{ item.label }}</td>
                    <td class="text-right">{{ formatValue(item.value) }}</td>
                    <td class="text-center">{{ item.column || '-' }}</td>
                    <td class="text-center font-italic">{{ item.matchedRule || '-' }}</td>
                    <td class="text-right">{{ item.weight || '-' }}</td>
                    <td class="text-right font-bold">{{ item.score ? formatDecimal(item.score) : '-' }}</td>
                </tr>
            </tbody>
          </table>
      </div>

      <!-- PAYMENT HISTORY (DEBUG) -->
      <div class="section payment-history-section" v-if="latePaymentInvoices && latePaymentInvoices.length > 0">
          <div class="header-with-toggle">
              <h2>ประวัติการชำระเงิน (Debug Log)</h2>
              <div class="text-right stats-wrapper">
                  <div class="calc-summary">
                      <strong>ค่าเฉลี่ยแบบนับจำนวน (Simple Average):</strong>
                      {{ latePaymentStats.totalLateDays }} (รวมวันล่าช้า) / {{ latePaymentStats.paidCount }} (รายการจ่ายแล้ว)
                      = <strong>{{ latePaymentStats.avg }}</strong> วัน
                  </div>
                  <div class="calc-summary wadl-summary clickable" v-if="wadlStats" @click="toggleWadlBreakdown">
                      <strong>ค่าเฉลี่ยแบบถ่วงน้ำหนัก (Weighted Average):</strong>
                      <span>
                          {{ formatValue(wadlBreakdown.totalWeightedDelay) }} (ผลรวมถ่วงน้ำหนัก) /
                          {{ formatValue(wadlBreakdown.totalAmount) }} (ยอดจ่ายรวม)
                          = <strong class="wadl-score">{{ wadlStats.score }}</strong> วัน
                      </span>
                      <span class="toggle-icon">{{ showWadlBreakdown ? '▼' : '▶' }} (แสดงการคำนวณ)</span>
                  </div>
              </div>
          </div>

          <!-- WADL BREAKDOWN SECTION -->
          <div class="wadl-breakdown-panel" v-if="showWadlBreakdown && wadlStats">
            <div class="breakdown-header-compact">
                <h3>
                    รายละเอียดการคำนวณ WADL
                    <span class="tooltip-container">
                        ℹ️
                        <span class="tooltip-text">
                            <strong>สูตร:</strong> Σ (ยอดบิล × วันล่าช้า) ÷ Σ (ยอดบิลทั้งหมด)<br>
                            <strong>ขอบเขต:</strong> บิลที่จ่ายแล้วใน 6 เดือนล่าสุด ไม่รวมบิลค้างจ่าย
                        </span>
                    </span>
                </h3>
            </div>

            <div class="breakdown-content-compact">
                <!-- Stacked Bar Visualization -->
                 <div class="stacked-bar-container">
                    <div
                        v-for="(seg, idx) in visualizationSegments"
                        :key="idx"
                        class="bar-segment"
                        :style="{ width: seg.width + '%', backgroundColor: seg.color }"
                        :title="seg.label + ': ' + seg.width.toFixed(2) + '%'"
                    ></div>
                 </div>
                 <div class="stacked-legend">
                    <span v-for="(seg, idx) in visualizationSegments" :key="idx" class="legend-item">
                        <span class="color-dot" :style="{ backgroundColor: seg.color }"></span>
                        {{ seg.label }}
                    </span>
                 </div>

                <!-- Compact Top 5 Table -->
                <div class="compact-table-wrapper">
                    <table class="compact-table">
                        <thead>
                            <tr>
                                <th style="width: 20%">Invoice No.</th>
                                <th style="width: 15%">วันที่</th>
                                <th style="width: 15%" class="text-center">ล่าช้า (วัน)</th>
                                <th style="width: 25%" class="text-right">ยอดเงิน</th>
                                <th style="width: 25%" class="text-right">สัดส่วน %</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-for="(item, idx) in top5Contributors" :key="idx">
                                <td class="font-bold">{{ item.inv.Invoice_No }}</td>
                                <td>{{ formatDate(item.inv.Invoice_Date) }}</td>
                                <td class="text-center" :class="item.lateDays > 0 ? 'text-danger' : 'text-success'">
                                    {{ item.lateDays }}
                                </td>
                                <td class="text-right">{{ formatValue(item.amount) }}</td>
                                <td class="text-right">
                                    <div class="percent-cell">
                                        <div class="percent-bar-bg">
                                            <div class="percent-bar-fill" :style="{ width: item.contribution + '%', backgroundColor: getSegmentColor(idx) }"></div>
                                        </div>
                                        <span>{{ item.contribution.toFixed(2) }}%</span>
                                    </div>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <p class="exclusion-note-compact">
                    * แสดง 5 อันดับแรกจาก {{ wadlBreakdown.invoices.length }} รายการ
                    (ไม่รวม: {{ wadlBreakdown.excludedOutstanding }} รายการค้างจ่าย, {{ wadlBreakdown.excludedOld }} รายการเกิน 6 เดือน)
                </p>
            </div>
          </div>
          <p class="section-desc">รายการประวัติการชำระเงินจากระบบ Dynamics 365 (ใช้คำนวณคะแนน)</p>

          <div class="table-responsive">
            <table class="detail-table payment-table">
                <thead>
                    <tr>
                        <th>เลขที่ใบแจ้งหนี้</th>
                        <th>วันที่เอกสาร</th>
                        <th>วันครบกำหนด</th>
                        <th>ยอดเงิน</th>
                        <th>วิธีการชำระ</th>
                        <th>วันที่ชำระจริง (Cleared Date)</th>
                        <th>วันล่าช้า</th>
                        <th>สถานะ</th>
                    </tr>
                </thead>
                <tbody>
                    <tr v-for="(inv, idx) in latePaymentInvoices" :key="idx" :class="getRowClass(inv)">
                        <td>{{ inv.Invoice_No }}</td>
                        <td>{{ formatDate(inv.Invoice_Date) }}</td>
                        <td>{{ formatDate(inv['Due Date']) }}</td>
                        <td class="text-right">{{ inv.Amount ? formatValue(inv.Amount) : '-' }}</td>
                        <td class="text-center">
                            <span v-if="getPaymentMethod(inv)" class="badge" :class="getPaymentMethodClass(inv)">
                                {{ getPaymentMethod(inv) }}
                            </span>
                            <span v-else>-</span>
                        </td>
                        <td>
                            {{ formatDate(inv.Effective_Payment_Date) }}
                            <small v-if="inv.Payment_Doc_No" class="d-block text-muted">({{ inv.Payment_Doc_No }})</small>
                        </td>
                        <td class="text-center font-bold" :class="getLateDaysClass(inv)">
                            {{ getLateDaysDisplay(inv) }}
                        </td>
                        <td class="text-center">
                            <span class="badge" :class="getStatusClass(inv)">
                                {{ getStatusLabel(inv) }}
                            </span>
                        </td>
                    </tr>
                </tbody>
            </table>
          </div>
      </div>
      <div class="section payment-history-section" v-else-if="latePaymentSummary">
           <h2>ประวัติการชำระเงิน (Debug Log)</h2>
           <p class="text-muted">ไม่พบข้อมูลรายการ Invoice หรือไม่มีประวัติการชำระเงินล่าช้าในระบบ</p>
      </div>

      <!-- RAW JSON (Optional, collapsed) -->
      <div class="section raw-section no-print">
          <details>
              <summary>ข้อมูลดิบ (JSON)</summary>
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
const showWadlBreakdown = ref(false);

const toggleExtractionDetails = () => {
    showExtractionDetails.value = !showExtractionDetails.value;
};

const toggleWadlBreakdown = () => {
    showWadlBreakdown.value = !showWadlBreakdown.value;
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

const wadlStats = computed(() => {
    if (!data.value || !data.value.analysisResults || !data.value.analysisResults.financialSummary) return null;
    return data.value.analysisResults.financialSummary.wadlData;
});

const latePaymentInvoices = computed(() => {
    // Prefer WADL invoices if available (contains Amount)
    const wadlInvoices = wadlStats.value?.invoices;
    const standardInvoices = latePaymentSummary.value?.invoices;

    const source = wadlInvoices || standardInvoices;

    if (source && Array.isArray(source)) {
        // Sort descending by Invoice Date (Newest first)
        return [...source].sort((a, b) => {
            const dateA = new Date(a.Invoice_Date);
            const dateB = new Date(b.Invoice_Date);
            return dateB - dateA;
        });
    }
    return [];
});

const latePaymentStats = computed(() => {
    const summary = latePaymentSummary.value;
    const invoices = latePaymentInvoices.value || [];

    // Identify Paid Invoices
    const paidInvoices = invoices.filter(inv => inv.Effective_Payment_Date && inv.Effective_Payment_Date.trim() !== '');

    // Check if backend provided pre-calculated stats (Preferred)
    let avg = 0;
    let paidCount = 0;

    if (summary && summary.average_late_days !== undefined) {
        avg = summary.average_late_days;
        paidCount = summary.paid_invoices_count !== undefined ? summary.paid_invoices_count : paidInvoices.length;
    } else {
        // Fallback Calc
        paidCount = paidInvoices.length;
        const sum = paidInvoices.reduce((acc, inv) => acc + (Number(inv.Late_Days) || 0), 0);
        avg = paidCount > 0 ? (sum / paidCount).toFixed(2) : 0;
    }

    // Total Late Days (Sum of paid invoices)
    const totalLateDays = paidInvoices.reduce((sum, inv) => sum + (Number(inv.Late_Days) || 0), 0);

    return {
        totalLateDays,
        count: invoices.length, // Total found (including outstanding)
        paidCount: paidCount,   // Used for denominator
        avg: avg
    };
});

const wadlBreakdown = computed(() => {
    const invoices = latePaymentInvoices.value || [];
    if (invoices.length === 0) return { totalAmount: 0, totalWeightedDelay: 0, invoices: [], excludedCount: 0 };

    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    let totalAmount = 0;
    let totalWeightedDelay = 0;
    let excludedOutstanding = 0;
    let excludedOld = 0;

    const breakdownInvoices = [];

    invoices.forEach(inv => {
        // 1. Check if Paid
        if (!inv.Effective_Payment_Date || inv.Effective_Payment_Date.trim() === '') {
            excludedOutstanding++;
            return;
        }

        // 2. Check Date (Last 6 Months)
        const dateStr = inv.Invoice_Date || inv.Posting_Date;
        const invDate = new Date(dateStr);
        if (invDate < sixMonthsAgo) {
            excludedOld++;
            return;
        }

        // 3. Calculate
        const amount = Number(inv.Amount || 0);
        const lateDays = Number(inv.Late_Days || 0);
        const weightedScore = amount * lateDays;

        totalAmount += amount;
        totalWeightedDelay += weightedScore;

        breakdownInvoices.push({
            inv,
            amount,
            lateDays,
            weightedScore
        });
    });

    // 4. Calculate Contribution %
    const resultInvoices = breakdownInvoices.map(item => ({
        ...item,
        contribution: totalWeightedDelay > 0 ? (item.weightedScore / totalWeightedDelay) * 100 : 0
    }));

    // Sort by contribution desc
    resultInvoices.sort((a, b) => b.weightedScore - a.weightedScore);

    return {
        totalAmount,
        totalWeightedDelay,
        invoices: resultInvoices,
        excludedCount: excludedOutstanding + excludedOld,
        excludedOutstanding,
        excludedOld
    };
});

const top5Contributors = computed(() => {
    if (!wadlBreakdown.value || !wadlBreakdown.value.invoices) return [];
    return wadlBreakdown.value.invoices.slice(0, 5);
});

// Segment colors for Stacked Bar
const segmentColors = ['#dc3545', '#fd7e14', '#ffc107', '#28a745', '#17a2b8'];

const getSegmentColor = (idx) => {
    return segmentColors[idx] || '#6c757d'; // Fallback gray
};

const visualizationSegments = computed(() => {
    const top5 = top5Contributors.value;
    if (top5.length === 0) return [];

    const segments = top5.map((item, idx) => ({
        label: item.inv.Invoice_No,
        width: item.contribution,
        color: getSegmentColor(idx)
    }));

    // Calculate 'Others'
    const top5Total = segments.reduce((sum, s) => sum + s.width, 0);
    if (top5Total < 100) {
        segments.push({
            label: 'อื่นๆ',
            width: 100 - top5Total,
            color: '#e9ecef' // Light gray for others
        });
    }

    return segments;
});

// Helper Methods for Table Display
const isPaid = (inv) => {
    return inv.Effective_Payment_Date && inv.Effective_Payment_Date.trim() !== '';
};

const getPaymentMethod = (inv) => {
    if (!isPaid(inv)) return null;

    // Check various possible locations for the field
    let method = inv.payment_method || inv.Payment_Method;
    if (inv.payment_detail && inv.payment_detail.payment_method) {
        method = inv.payment_detail.payment_method;
    }

    // Fallback Inference: Check dates if method is missing
    if (!method) {
        const checkDate = inv['Check Date'] || inv.check_date || inv.Check_Date;
        const clearedDate = inv['Cleared Date'] || inv.cleared_date || inv.Cleared_Date;

        if ((checkDate && String(checkDate).trim() !== '') || (clearedDate && String(clearedDate).trim() !== '')) {
             return 'เช็ค';
        }
    }

    // Spec Default: If paid but no explicit method, assume Cash/Transfer unless known otherwise
    if (!method) return 'เงินสด/โอน';

    return method;
};

const getPaymentMethodClass = (inv) => {
    const method = getPaymentMethod(inv);
    if (!method) return '';
    const m = method.toLowerCase();
    if (m.includes('cheque') || m.includes('check') || m.includes('เช็ค')) return 'badge-cheque';
    return 'badge-cash';
};

const getRowClass = (inv) => {
    if (!isPaid(inv)) return ''; // Default white for outstanding, or 'row-outstanding' if styled
    return inv.Late_Days > 0 ? 'row-late' : '';
};

const getLateDaysDisplay = (inv) => {
    if (!isPaid(inv)) return '-';
    return inv.Late_Days;
};

const getLateDaysClass = (inv) => {
    if (!isPaid(inv)) return 'text-muted';
    return inv.Late_Days > 0 ? 'text-danger' : 'text-success';
};

const getStatusLabel = (inv) => {
    if (!isPaid(inv)) return 'ค้างจ่าย';
    return inv.Late_Days > 0 ? 'ล่าช้า' : 'ตรงเวลา';
};

const getStatusClass = (inv) => {
    if (!isPaid(inv)) return 'badge-outstanding';
    return inv.Late_Days > 0 ? 'badge-late' : 'badge-ontime';
};

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
.font-italic { font-style: italic; color: #555; }

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
.badge-outstanding {
    background-color: #e2e3e5;
    color: #383d41;
}

.badge-cheque {
    background-color: #fff3cd;
    color: #856404;
}

.badge-cash {
    background-color: #d1ecf1;
    color: #0c5460;
}

.stats-wrapper {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 5px;
}

.calc-summary {
    font-size: 0.9em;
    color: #555;
    background: #f8f9fa;
    padding: 5px 10px;
    border-radius: 4px;
    border: 1px solid #e9ecef;
}

.wadl-summary {
    background: #e3f2fd;
    border-color: #bbdefb;
    color: #0d47a1;
}

.wadl-summary.clickable {
    cursor: pointer;
    transition: background-color 0.2s;
}

.wadl-summary.clickable:hover {
    background-color: #bbdefb;
}

.toggle-icon {
    font-size: 0.8em;
    margin-left: 8px;
    opacity: 0.7;
}

/* WADL Breakdown Panel */
.wadl-breakdown-panel {
    margin-top: 15px;
    padding: 15px;
    background: #f8f9fa;
    border: 1px solid #dee2e6;
    border-radius: 4px;
    animation: fadeIn 0.3s ease-in-out;
}

.breakdown-header-compact h3 {
    margin-top: 0;
    font-size: 1.0em;
    color: #333;
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 15px;
}

/* Tooltip Styles */
.tooltip-container {
    cursor: help;
    position: relative;
    font-size: 1.2em;
    line-height: 1;
}

.tooltip-text {
    visibility: hidden;
    width: 300px;
    background-color: #333;
    color: #fff;
    text-align: left;
    border-radius: 6px;
    padding: 10px;
    position: absolute;
    z-index: 10;
    bottom: 125%; /* Position above */
    left: 50%;
    margin-left: -150px;
    opacity: 0;
    transition: opacity 0.3s;
    font-size: 0.8rem;
    font-weight: normal;
    box-shadow: 0 4px 6px rgba(0,0,0,0.1);
}

.tooltip-text::after {
    content: "";
    position: absolute;
    top: 100%;
    left: 50%;
    margin-left: -5px;
    border-width: 5px;
    border-style: solid;
    border-color: #333 transparent transparent transparent;
}

.tooltip-container:hover .tooltip-text {
    visibility: visible;
    opacity: 1;
}

/* Stacked Bar */
.stacked-bar-container {
    display: flex;
    height: 25px;
    width: 100%;
    background-color: #e9ecef;
    border-radius: 4px;
    overflow: hidden;
    margin-bottom: 10px;
}

.bar-segment {
    height: 100%;
    transition: width 0.5s ease-out;
}

.bar-segment:hover {
    filter: brightness(0.9);
}

/* Legend */
.stacked-legend {
    display: flex;
    flex-wrap: wrap;
    gap: 15px;
    margin-bottom: 15px;
    font-size: 0.8rem;
    color: #666;
}

.legend-item {
    display: flex;
    align-items: center;
    gap: 5px;
}

.color-dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    display: inline-block;
}

/* Compact Table */
.compact-table-wrapper {
    background: white;
    border: 1px solid #eee;
    border-radius: 4px;
    overflow: hidden;
}

.compact-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.85rem;
}

.compact-table th {
    background-color: #f8f9fa;
    padding: 6px 10px;
    font-weight: 600;
    border-bottom: 2px solid #dee2e6;
    color: #495057;
    text-align: left;
}

.compact-table td {
    padding: 6px 10px;
    border-bottom: 1px solid #eee;
    vertical-align: middle;
}

.compact-table tr:last-child td {
    border-bottom: none;
}

.compact-table tr:hover {
    background-color: #f8f9fa;
}

/* Percent Bar in Table */
.percent-cell {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 8px;
}

.percent-bar-bg {
    width: 60px;
    height: 6px;
    background-color: #f1f3f5;
    border-radius: 3px;
    overflow: hidden;
}

.percent-bar-fill {
    height: 100%;
    border-radius: 3px;
}

.exclusion-note-compact {
    font-size: 0.8rem;
    color: #999;
    margin-top: 8px;
    text-align: right;
    font-style: italic;
}

/* Utility Overrides for this section */
.text-right { text-align: right; }
.text-center { text-align: center; }

@keyframes fadeIn {
    from { opacity: 0; transform: translateY(-5px); }
    to { opacity: 1; transform: translateY(0); }
}

.wadl-score {
    font-weight: bold;
    font-size: 1.1em;
}

@media print {
    .no-print { display: none; }
    .credit-analysis-report { padding: 0; background: white; }
    .report-container { box-shadow: none; padding: 0; max-width: 100%; }
}
</style>