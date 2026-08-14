<template>
  <div class="credit-score-sheet">
    <!-- Header -->
    <div class="sheet-header">
      <h3>แบบจำลองการให้คะแนนเครดิตและการวิเคราะห์ทางการเงิน</h3>
    </div>

    <div class="sheet-grid">
      <!-- COLUMN 1: INPUTS (CASE) -->
      <div class="sheet-column input-column">
        <div class="column-header header-orange">ลูกค้า: {{ inputs.customerName }}</div>

        <div class="input-row">
            <div class="label">ทุนจดทะเบียน</div>
            <div class="value">{{ formatMoney(inputs.registeredCapital) }}</div>
            <div class="unit">บาท</div>
        </div>
        <div class="input-row">
            <div class="label">ปีที่จัดตั้งธุรกิจ</div>
            <div class="value">{{ formatEstablishmentYear(inputs.yearsInBusiness) }}</div>
            <div class="unit"></div>
        </div>
        <div class="input-row">
            <div class="label">หนี้สินไม่หมุนเวียน</div>
            <div class="value">{{ formatMoney(extracted.nonCurrentLiabilities?.value) }}</div>
            <div class="unit">บาท</div>
        </div>
        <div class="input-row">
            <div class="label">หนี้สินไม่หมุนเวียน 30%</div>
            <div class="value">{{ formatMoney((extracted.nonCurrentLiabilities?.value || 0) * 0.3) }}</div>
            <div class="unit">บาท</div>
        </div>
        <div class="input-row">
            <div class="label">หนี้สินรวม</div>
            <div class="value">{{ formatMoney(extracted.totalLiabilities?.value) }}</div>
            <div class="unit">บาท</div>
        </div>
         <div class="input-row">
            <div class="label">ส่วนของผู้ถือหุ้น</div>
            <div class="value">{{ formatMoney(extracted.shareholdersEquity?.value) }}</div>
            <div class="unit">บาท</div>
        </div>
        <div class="input-row highlight-green">
            <div class="label">กรรมสิทธิ์ทรัพย์สิน</div>
            <div class="value-text">{{ inputs.ownership || 'ไม่ระบุ' }}</div>
        </div>
        <div class="input-row">
            <div class="label">ระยะเวลาการเป็นลูกค้า</div>
            <div class="value">{{ inputs.customerDuration || '-' }}</div>
            <div class="unit">ปี</div>
        </div>
        <div class="input-row">
            <div class="label">เครดิตที่ขอ</div>
            <div class="value">{{ formatMoney(inputs.requestAmount) }}</div>
            <div class="unit">บาท</div>
        </div>
         <div class="input-row">
            <div class="label">ระยะเวลาเครดิต</div>
            <div class="value">{{ inputs.creditTerm }}</div>
            <div class="unit">วัน</div>
        </div>
        <div class="input-row">
            <div class="label">เงื่อนไขการรวมบิล</div>
            <div class="value-text">{{ inputs.billingCondition || '-' }}</div>
        </div>
      </div>

      <!-- ARROW -->
      <div class="arrow-column">
        <div class="arrow-box">➜</div>
      </div>

      <!-- COLUMN 2: SCORING BREAKDOWN -->
      <div class="sheet-column score-column">

        <!-- SECTION 2: REVENUE (New) -->
        <div class="score-section">
            <div class="section-title header-pink">2: รายได้</div>
            <div class="revenue-grid">
               <!-- Header Row -->
               <div class="rev-header">รายได้ในแต่ละปี</div>
               <div class="rev-header-y">ปีที่ 1</div>
               <div class="rev-header-y">ปีที่ 2</div>
               <div class="rev-header-y">ปีที่ 3<br>(ปีล่าสุด)</div>
               <div class="rev-header-avg">รายได้เฉลี่ย</div>
               <div class="rev-header-gp">กำไรขั้นต้น<br>ปีล่าสุด</div>

               <!-- Value Row -->
               <div class="rev-val empty-cell"></div>

               <div class="rev-val">{{ formatMoney(getRevenueYear(0)) }}</div>
               <div class="rev-val">{{ formatMoney(getRevenueYear(1)) }}</div>
               <div class="rev-val">{{ formatMoney(getRevenueYear(2)) }}</div>

               <div class="rev-val val-gray">{{ formatMoney(extracted.averageRevenue) }}</div>
               <div class="rev-val">{{ formatMoney(extracted.grossProfit?.value) }}</div>
            </div>
        </div>

        <!-- SECTION 3: CASH FLOW (Renamed/Refactored) -->
        <div class="score-section">
             <div class="section-title header-pink">3: กระแสเงินสดของบริษัท (CashFlow)</div>

             <div class="score-grid-3" style="margin-top: 10px;">
                 <!-- D/E Ratio -->
                 <div class="cashflow-box">
                     <div class="inv-label">D/E Ratio</div>
                     <div class="inv-value">{{ formatScore(extracted.deRatio?.value) }}</div>
                 </div>

                 <!-- DSCR -->
                 <div class="cashflow-box">
                     <div class="inv-label">ความสามารถชำระหนี้ (DSCR)</div>
                     <div class="inv-value">{{ formatScore(calculations.dscr) }}</div>
                 </div>

                 <!-- Inventory Turnover -->
                 <div class="cashflow-box">
                     <div class="inv-label">อัตราการหมุนเวียนของสินค้าคงเหลือ</div>
                     <div class="inv-value">{{ formatScore(extracted.inventoryTurnover?.value) }}</div>
                 </div>
             </div>
        </div>

        <!-- SECTION 3: PURCHASE HISTORY (C3) - TABLE VIEW -->
        <div class="score-section">
             <div class="section-title header-red">4: ยอดซื้อย้อนหลัง {{ purchaseMonthCount }} เดือน</div>

             <!-- MONTHLY TABLE -->
             <div class="monthly-table-container">
                 <table class="monthly-table">
                     <thead>
                         <tr>
                             <th>เดือน</th>
                             <th>ยอดซื้อ (บาท)</th>
                         </tr>
                     </thead>
                     <tbody>
                         <tr v-for="(m, i) in purchaseHistory" :key="i">
                             <td>{{ m.label }}</td>
                             <td class="text-right">{{ formatMoney(getMonthlyAmount(m)) }}</td>
                         </tr>
                         <!-- Fallback if empty -->
                         <tr v-if="purchaseHistory.length === 0">
                             <td colspan="2" class="text-center">- ไม่มีข้อมูล -</td>
                         </tr>
                     </tbody>
                 </table>

                 <!-- SUMMARY STATS -->
                 <div class="monthly-stats">
                     <div class="stat-box">
                         <div class="stat-label">เฉลี่ย 1.5 เดือน</div>
                         <!-- Dynamic Display based on stats.avg1_5m if available, else fallback -->
                         <div class="stat-val">{{ formatMoney(stats.avg1_5m !== undefined ? stats.avg1_5m : (stats.sumLast3 / 2)) }}</div>
                     </div>
                     <div class="stat-box">
                         <div class="stat-label">แนวโน้ม</div>
                         <div class="stat-val">{{ formatTrendDecimal(stats.trendRatio) }}</div>
                     </div>
                     <div class="stat-box">
                         <div class="stat-label">SLOPE</div>
                         <div class="stat-val">{{ formatSlope(stats.slope) }}</div>
                     </div>
                 </div>
             </div>

        </div>

      </div>

    </div>

    <!-- SCORING BREAKDOWN GRID -->
    <ScoringBreakdownGrid :scoringResult="scoring" />

  </div>
</template>

<script setup>
import { computed } from 'vue';
import ScoringBreakdownGrid from './ScoringBreakdownGrid.vue';

const props = defineProps({
  analysisResults: {
    type: Object,
    required: true
  },
  inputs: {
    type: Object,
    default: () => ({})
  }
});

const extracted = computed(() => props.analysisResults.extractedData || {});
const calculations = computed(() => props.analysisResults.calculations || {}); // Added
const scoring = computed(() => props.analysisResults.scoringResult || {});
const breakdown = computed(() => scoring.value.breakdown || {});
const financialSummary = computed(() => props.analysisResults.financialSummary || {});

const totalScore = computed(() => scoring.value.totalScore || 0);
const grade = computed(() => scoring.value.grade || '-');
const recommendedLimit = computed(() => scoring.value.recommendedLimit || 0);

const isExistingModel = computed(() => props.inputs.model_type === 'existing');
const purchaseMonthCount = computed(() => isExistingModel.value ? 6 : 3);

const getMonthlyAmount = (m) => {
    if (!m) return null;
    if (m.amount !== undefined && m.amount !== null && m.amount !== '') return m.amount;
    if (m.value !== undefined && m.value !== null && m.value !== '') return m.value;
    return null;
};

const purchaseHistory = computed(() => {
    let history = financialSummary.value.monthlyHistory || 
                  financialSummary.value.monthly_history || 
                  props.analysisResults.monthlyHistory || 
                  props.analysisResults.monthly_history || [];
    // Backend scoring excludes the current (incomplete) month.
    // Ensure table displays the same months used for calculation.
    if (history.length > 0 && String(history[0]?.label || '').includes('เดือนปัจจุบัน')) {
        history = history.slice(1);
    }
    // Return 6 months for existing, 3 for new
    return history.slice(0, purchaseMonthCount.value);
});

const stats = computed(() => financialSummary.value.stats || { sumLast3: 0, trendRatio: 1 });

const formatMoney = (val) => {
    if (val === undefined || val === null || val === '') return '-';
    const num = typeof val === 'number' ? val : Number(String(val).replace(/,/g, ''));
    if (isNaN(num)) return '-';
    return num.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const formatScore = (val) => {
    if (val === undefined || val === null) return '-';
    return Number(val).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const formatTrend = (ratio) => {
    if (!ratio) return '-';
    // ratio 1.20 = +20%
    const percent = (ratio - 1) * 100;
    return `${percent > 0 ? '+' : ''}${percent.toFixed(2)}%`;
};

const formatTrendDecimal = (ratio) => {
    if (!ratio) return '-';
    const percent = (ratio - 1) * 100;
    // Format: +33.00% (1.33 เท่า)
    return `${percent > 0 ? '+' : ''}${percent.toFixed(0)}% (${ratio.toFixed(2)} เท่า)`;
};

const formatSlope = (val) => {
    if (val === undefined || val === null) return '-';
    // Just a number, no formatting? Or maybe 2 decimals?
    // User asked "just number", but typically avoiding long floats is good.
    // Let's use standard number format without currency symbol, maybe 2 decimals.
    return Number(val).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const getGradeClass = (g) => {
    if (g === 'A') return 'grade-a';
    if (g === 'B') return 'grade-b';
    return 'grade-c';
};

const getRevenueYear = (index) => {
    const history = extracted.value.revenueHistory || [];
    if (history[index]) return history[index].amount;
    return 0;
};

const formatEstablishmentYear = (duration) => {
    if (!duration) return '-';
    // duration is number of years (e.g. 5)
    // We want to show the establishment year (e.g. 2564)
    const currentYear = new Date().getFullYear() + 543;
    const estYear = currentYear - parseInt(duration);
    return estYear;
};

</script>

<style scoped>
.credit-score-sheet {
    font-family: 'Sarabun', sans-serif;
    background: white;
    padding: 15px;
    border: 1px solid #ddd;
    overflow-x: auto;
}

.sheet-header h3 {
    margin-top: 0;
    color: #333;
    border-bottom: 2px solid #007bff;
    padding-bottom: 10px;
    margin-bottom: 20px;
}

.sheet-grid {
    display: flex;
    gap: 10px;
    align-items: flex-start;
}

.sheet-column {
    border: 1px solid #ccc;
    background: #fff;
}

/* INPUT COLUMN */
.input-column {
    width: 250px;
    flex-shrink: 0;
}

.column-header {
    padding: 10px;
    font-weight: bold;
    text-align: center;
    border-bottom: 1px solid #ccc;
}

.header-orange { background-color: #f4b084; }
.header-pink { background-color: #e6b8af; }
.header-orange-light { background-color: #ffe699; }
.header-red { background-color: #f4cccc; }

.input-row {
    display: flex;
    justify-content: space-between;
    padding: 8px;
    border-bottom: 1px solid #eee;
    font-size: 0.9em;
}

.input-row:last-child { border-bottom: none; }

.input-row .label {
    font-weight: 500;
    flex: 1;
    text-align: left;
    padding-left: 5px;
}
.input-row .value { font-weight: bold; color: #007bff; text-align: right; margin-right: 5px; }
.input-row .value-text { text-align: right; font-weight: bold; }
.input-row .unit { color: #888; width: 30px; text-align: right; }

.highlight-green {
    background-color: #d9ead3;
}

/* ARROW COLUMN */
.arrow-column {
    display: flex;
    align-items: center;
    justify-content: center;
    padding-top: 100px; /* Push arrow down */
}

.arrow-box {
    background: #4a86e8;
    color: white;
    padding: 5px 10px;
    border-radius: 4px;
    font-weight: bold;
}

/* SCORE COLUMN */
.score-column {
    flex: 1;
    min-width: 400px;
    display: flex;
    flex-direction: column;
    gap: 15px;
    padding: 10px;
    background: #f9f9f9;
}

.score-section {
    background: white;
    border: 1px solid #ddd;
    padding-bottom: 10px;
}

.section-title {
    padding: 8px;
    font-weight: bold;
    text-align: center;
    margin-bottom: 10px;
}

.score-grid-3, .score-grid-4 {
    display: grid;
    gap: 5px;
    padding: 0 10px;
}
.score-grid-3 { grid-template-columns: repeat(3, 1fr); }
.score-grid-4 { grid-template-columns: repeat(4, 1fr); }

.score-item {
    text-align: center;
    border: 1px solid #eee;
    padding: 5px;
}

.s-label { font-size: 0.8em; color: #666; height: 30px; display: flex; align-items: center; justify-content: center; }
.s-val { font-weight: bold; font-size: 1.1em; color: #333; }

.sub-total {
    text-align: right;
    padding: 5px 10px;
    font-weight: bold;
    color: #007bff;
    background: #f0f8ff;
    margin-top: 5px;
}

/* MONTHLY TABLE */
.monthly-table-container {
    padding: 10px;
    display: flex;
    gap: 15px;
}

.monthly-table {
    width: 60%;
    border-collapse: collapse;
    font-size: 0.9em;
}

.monthly-table th, .monthly-table td {
    border: 1px solid #ddd;
    padding: 5px;
}

.monthly-table th { background: #ffe699; }
.text-right { text-align: right; }
.text-center { text-align: center; }

.monthly-stats {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 5px;
}

.stat-box {
    background: #f4cccc;
    padding: 5px;
    text-align: center;
    border: 1px solid #e06666;
}
.stat-label { font-size: 0.8em; }
.stat-val { font-weight: bold; }


/* RESULT COLUMN */
.result-column {
    width: 180px;
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    gap: 20px;
    padding: 10px;
}

.result-box {
    border: 1px solid #333;
    text-align: center;
    padding: 0;
    background: #d9ead3;
}

.result-title {
    background: #d9ead3;
    padding: 5px;
    font-size: 0.9em;
    border-bottom: 1px solid #333;
}

.result-value {
    font-size: 1.5em;
    font-weight: bold;
    padding: 10px;
    background: white;
}

.result-score {
    background: #d9ead3;
    font-weight: bold;
    padding: 5px;
    border-top: 1px solid #333;
}

.grade-a .result-value { color: #28a745; }
.grade-b .result-value { color: #ffc107; }
.grade-c .result-value { color: #dc3545; }

.result-limit .result-value {
    font-size: 1.1em;
}

/* REVENUE GRID */
.revenue-grid {
    display: grid;
    grid-template-columns: 1.5fr 1fr 1fr 1fr 1fr 1.2fr;
    grid-template-rows: auto auto;
    border: 1px solid #ddd;
    text-align: center;
    font-size: 0.9em;
    margin: 5px;
}

.rev-header, .rev-header-y, .rev-header-avg, .rev-header-gp {
    padding: 8px 2px;
    font-weight: bold;
    border: 1px solid #ccc;
    background-color: #ffe699;
    display: flex;
    align-items: center;
    justify-content: center;
}

.rev-header-y, .rev-header-avg, .rev-header-gp { background-color: #f4b084; }

.rev-val {
    padding: 8px 2px;
    border: 1px solid #ccc;
    background-color: #cfe2f3;
    font-weight: bold;
    display: flex;
    align-items: center;
    justify-content: center;
}

.rev-val.empty-cell {
    background-color: transparent;
    border: none;
}

.val-gray { background-color: #eee; }

/* CASHFLOW / INVENTORY BOXES */
.cashflow-box {
    text-align: center;
    border: 1px solid #333;
    background-color: #f4b084;
}
.inv-label {
    padding: 5px;
    font-weight: bold;
    border-bottom: 1px solid #333;
    font-size: 0.9em;
}
.inv-value {
    background-color: #cfe2f3;
    padding: 10px;
    font-size: 1.2em;
    font-weight: bold;
}
</style>
