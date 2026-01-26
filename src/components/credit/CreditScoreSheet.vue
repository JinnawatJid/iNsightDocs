<template>
  <div class="credit-score-sheet">
    <!-- Header -->
    <div class="sheet-header">
      <h3>Credit Scoring Model & Financial Analysis</h3>
    </div>

    <div class="sheet-grid">
      <!-- COLUMN 1: INPUTS (CASE) -->
      <div class="sheet-column input-column">
        <div class="column-header header-orange">Case:</div>

        <div class="input-row">
            <div class="label">ทุนจดทะเบียน</div>
            <div class="value">{{ formatMoney(inputs.registeredCapital) }}</div>
            <div class="unit">บาท</div>
        </div>
        <div class="input-row">
            <div class="label">ปีที่จัดตั้งธุรกิจ</div>
            <div class="value">{{ inputs.yearsInBusiness }}</div>
            <div class="unit">ปี</div>
        </div>
        <div class="input-row">
            <div class="label">หนี้สินไม่หมุนเวียน</div>
            <div class="value">{{ formatMoney(extracted.nonCurrentLiabilities?.value) }}</div>
            <div class="unit">บาท</div>
        </div>
         <div class="input-row">
            <div class="label">ส่วนของผู้ถือหุ้น</div>
            <div class="value">{{ formatMoney(extracted.shareholdersEquity?.value) }}</div>
            <div class="unit">บาท</div>
        </div>
        <div class="input-row highlight-green">
            <div class="label">กรรมสิทธิ์ทรัพย์สิน</div>
            <div class="value-text">{{ inputs.ownership || '-' }}</div>
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
      </div>

      <!-- ARROW -->
      <div class="arrow-column">
        <div class="arrow-box">➜</div>
      </div>

      <!-- COLUMN 2: SCORING BREAKDOWN -->
      <div class="sheet-column score-column">

        <!-- SECTION 1: COMPANY (C1) -->
        <div class="score-section">
            <div class="section-title header-pink">1: ข้อมูลบริษัท (Company Strength)</div>
            <div class="score-grid-3">
                <div class="score-item">
                    <div class="s-label">ระยะเวลาธุรกิจ</div>
                    <div class="s-val">{{ formatScore(breakdown.c1?.years) }}</div>
                </div>
                <div class="score-item">
                    <div class="s-label">สัดส่วนเครดิต/ทุน</div>
                    <div class="s-val">{{ formatScore(breakdown.c1?.leverage) }}</div>
                </div>
                <div class="score-item">
                    <div class="s-label">กรรมสิทธิ์ทรัพย์สิน</div>
                    <div class="s-val">{{ formatScore(breakdown.c1?.asset) }}</div>
                </div>
            </div>
            <div class="sub-total">Total C1: {{ formatScore(breakdown.c1?.total) }}</div>
        </div>

        <!-- SECTION 2: CASH FLOW (C2) -->
        <div class="score-section">
             <div class="section-title header-orange-light">3: CashFlow ของบริษัท</div>
             <div class="score-grid-3">
                <div class="score-item">
                    <div class="s-label">D/E Ratio</div>
                    <div class="s-val">{{ formatScore(breakdown.c2?.deRatio) }}</div>
                </div>
                <div class="score-item">
                    <div class="s-label">ความสามารถชำระหนี้ (DSCR)</div>
                    <div class="s-val">{{ formatScore(breakdown.c2?.dscr) }}</div>
                </div>
                <div class="score-item">
                    <div class="s-label">หมุนเวียนสินค้า</div>
                    <div class="s-val">{{ formatScore(breakdown.c2?.inventory) }}</div>
                </div>
             </div>
             <div class="sub-total">Total C2: {{ formatScore(breakdown.c2?.total) }}</div>
        </div>

        <!-- SECTION 3: PURCHASE HISTORY (C3) - TABLE VIEW -->
        <div class="score-section">
             <div class="section-title header-red">4: ยอดซื้อย้อนหลัง 3 เดือน (Purchase Behavior)</div>

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
                         <tr v-for="(m, i) in last3Months" :key="i">
                             <td>{{ m.label }}</td>
                             <td class="text-right">{{ formatMoney(m.amount) }}</td>
                         </tr>
                         <!-- Fallback if empty -->
                         <tr v-if="last3Months.length === 0">
                             <td colspan="2" class="text-center">- ไม่มีข้อมูล -</td>
                         </tr>
                     </tbody>
                 </table>

                 <!-- SUMMARY STATS -->
                 <div class="monthly-stats">
                     <div class="stat-box">
                         <div class="stat-label">ยอดรวม 3 เดือน</div>
                         <div class="stat-val">{{ formatMoney(stats.sumLast3) }}</div>
                     </div>
                     <div class="stat-box">
                         <div class="stat-label">เฉลี่ยต่อเดือน</div>
                         <div class="stat-val">{{ formatMoney(stats.sumLast3 / 3) }}</div>
                     </div>
                     <div class="stat-box">
                         <div class="stat-label">แนวโน้ม (Growth)</div>
                         <div class="stat-val">{{ formatTrend(stats.trendRatio) }}</div>
                     </div>
                 </div>
             </div>

             <!-- C3 SCORES -->
             <div class="score-grid-4">
                 <div class="score-item">
                    <div class="s-label">Rev/Cap</div>
                    <div class="s-val">{{ formatScore(breakdown.c3?.revenueCapital) }}</div>
                </div>
                 <div class="score-item">
                    <div class="s-label">Capacity Check</div>
                    <div class="s-val">{{ formatScore(breakdown.c3?.capacityCheck) }}</div>
                </div>
                 <div class="score-item">
                    <div class="s-label">Turnover Speed</div>
                    <div class="s-val">{{ formatScore(breakdown.c3?.turnover) }}</div>
                </div>
                 <div class="score-item">
                    <div class="s-label">Trend</div>
                    <div class="s-val">{{ formatScore(breakdown.c3?.trend) }}</div>
                </div>
             </div>
             <div class="sub-total">Total C3: {{ formatScore(breakdown.c3?.total) }}</div>
        </div>

      </div>

      <!-- ARROW -->
      <div class="arrow-column">
        <div class="arrow-box">➜</div>
      </div>

      <!-- COLUMN 3: FINAL RESULT -->
      <div class="sheet-column result-column">
          <div class="result-box">
              <div class="result-title">ขนาดกิจการ (Size)</div>
              <div class="result-value">S</div> <!-- Static 'S' based on Excel screenshot, or derive logic? -->
              <div class="result-score">{{ formatScore(totalScore) }}</div>
          </div>

          <div class="result-box result-grade" :class="getGradeClass(grade)">
              <div class="result-title">เกรดของลูกค้า</div>
              <div class="result-value">{{ grade }}</div>
          </div>

          <div class="result-box result-limit">
              <div class="result-title">วงเงินเครดิตใหม่</div>
              <div class="result-value">{{ formatMoney(recommendedLimit) }}</div>
          </div>
      </div>

    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';

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
const scoring = computed(() => props.analysisResults.scoringResult || {});
const breakdown = computed(() => scoring.value.breakdown || {});
const financialSummary = computed(() => props.analysisResults.financialSummary || {});

const totalScore = computed(() => scoring.value.totalScore || 0);
const grade = computed(() => scoring.value.grade || '-');
const recommendedLimit = computed(() => scoring.value.recommendedLimit || 0);

const last3Months = computed(() => {
    const history = financialSummary.value.monthlyHistory || [];
    // Take first 3 (which are newest 3 due to reverse in backend)
    return history.slice(0, 3);
});

const stats = computed(() => financialSummary.value.stats || { sumLast3: 0, trendRatio: 1 });

const formatMoney = (val) => {
    if (val === undefined || val === null) return '-';
    return Number(val).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
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

const getGradeClass = (g) => {
    if (g === 'A') return 'grade-a';
    if (g === 'B') return 'grade-b';
    return 'grade-c';
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

.input-row .label { font-weight: 500; flex: 1; }
.input-row .value { font-weight: bold; color: #007bff; text-align: right; margin-right: 5px; }
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

</style>
