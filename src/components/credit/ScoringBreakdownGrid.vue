<template>
  <div class="scoring-breakdown-grid">
    <!-- SECTION 1: SIZE (C1 + C2) -->
    <div class="grid-section section-1-grid">
      <!-- HEADERS -->
      <!-- C1 Header: Spans 3 columns (1-3) -->
      <div class="header-cell pink-bg header-c1">เกณฑ์การคิดขนาดกิจการ (ประวัติในอดีต)</div>

      <!-- C2 Header: Spans 3 columns (5-7) -->
      <div class="header-cell yellow-bg header-c2">เกณฑ์การคิด Cashflow ของกิจการ</div>

      <!-- C1 DATA COLS (Cols 1-3) -->
      <template v-for="(item, index) in c1Items" :key="'c1-'+index">
          <div class="cell weight yellow-bg" :style="{ gridColumn: index + 1, gridRow: 2 }">
            {{ formatNum(item.weight) }}
          </div>
          <div class="cell label gray-bg" :style="{ gridColumn: index + 1, gridRow: 3 }">
            {{ item.label }}
          </div>
          <div class="cell value white-bg" :style="{ gridColumn: index + 1, gridRow: 4 }">
            {{ item.displayValue }}
          </div>
          <div class="cell score white-bg" :style="{ gridColumn: index + 1, gridRow: 5 }">
            {{ formatNum(item.score) }}
          </div>
      </template>

      <!-- PLUS SIGN (Col 4, Rows 2-5) -->
      <div class="plus-sign" style="grid-column: 4; grid-row: 2 / span 4">+</div>

      <!-- C2 DATA COLS (Cols 5-7) -->
      <template v-for="(item, index) in c2Items" :key="'c2-'+index">
          <div class="cell weight yellow-bg" :style="{ gridColumn: index + 5, gridRow: 2 }">
            {{ formatNum(item.weight) }}
          </div>
          <div class="cell label gray-bg" :style="{ gridColumn: index + 5, gridRow: 3 }">
            {{ item.label }}
          </div>
          <div class="cell value white-bg" :style="{ gridColumn: index + 5, gridRow: 4 }">
            {{ item.displayValue }}
          </div>
          <div class="cell score white-bg" :style="{ gridColumn: index + 5, gridRow: 5 }">
             {{ formatNum(item.score) }}
          </div>
      </template>

      <!-- ARROW (Col 8, Rows 2-5) -->
      <div class="arrow-container" style="grid-column: 8; grid-row: 2 / span 4">
         <div class="arrow-box">➜</div>
      </div>

      <!-- RESULT: SIZE (Col 9, Rows 2-5) -->
      <div class="result-box green-bg" style="grid-column: 9; grid-row: 2 / span 4">
          <div class="res-title">ขนาดกิจการ</div>
          <div class="res-grade">{{ sizeResult.label }}</div>
          <div class="res-score">{{ formatNum(sizeResult.score) }}</div>
      </div>
    </div>

    <!-- SECTION 2: GRADE (C3) -->
    <div class="grid-section section-2-grid" :style="section2GridStyle">
      <!-- HEADER -->
      <!-- C3 Header: Spans c3Count columns -->
      <div class="header-cell blue-bg header-c3" :style="{ gridColumn: `1 / span ${c3Count}`, gridRow: 1 }">เกณฑ์การคิด Grade ของบริษัท (การซื้อขายในปัจจุบัน)</div>

      <!-- C3 DATA COLS (Cols 1-N) -->
      <template v-for="(item, index) in c3Items" :key="'c3-'+index">
          <div class="cell weight yellow-bg" :style="{ gridColumn: index + 1, gridRow: 2 }">
             {{ formatNum(item.weight) }}
          </div>
          <div class="cell label gray-bg" :style="{ gridColumn: index + 1, gridRow: 3 }">
             {{ item.label }}
          </div>
          <div class="cell value white-bg" :style="{ gridColumn: index + 1, gridRow: 4 }">
             {{ item.displayValue }}
          </div>
          <div class="cell score white-bg" :style="{ gridColumn: index + 1, gridRow: 5 }">
             {{ formatNum(item.score) }}
          </div>
      </template>

      <!-- ARROW -->
       <div class="arrow-container" :style="{ gridColumn: c3Count + 1, gridRow: '2 / span 4' }">
         <div class="arrow-box">➜</div>
      </div>

      <!-- RESULT: GRADE -->
      <div class="result-box green-bg" :style="{ gridColumn: c3Count + 2, gridRow: '2 / span 4' }">
          <div class="res-title">เกรดของลูกค้า</div>
          <div class="res-grade">{{ gradeResult.label }}</div>
          <div class="res-score">{{ formatNum(gradeResult.score) }}</div>
      </div>

       <!-- RESULT: LIMIT -->
       <div class="result-box green-bg" :style="{ gridColumn: c3Count + 3, gridRow: '2 / span 4' }">
             <div class="res-title">วงเงินเครดิตใหม่</div>
             <div class="res-grade limit-val">{{ formatMoney(recommendedLimit) }}</div>
             <div class="res-score">{{ formatNum(totalScore) }}</div>
        </div>

    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  scoringResult: {
    type: Object,
    required: true
  }
});

const c1Items = computed(() => props.scoringResult.breakdown?.c1?.items || []);
const c2Items = computed(() => props.scoringResult.breakdown?.c2?.items || []);
const c3Items = computed(() => props.scoringResult.breakdown?.c3?.items || []);

const sizeResult = computed(() => props.scoringResult.sizeResult || { label: '-', score: 0 });
const gradeResult = computed(() => props.scoringResult.gradeResult || { label: '-', score: 0 });
const recommendedLimit = computed(() => props.scoringResult.recommendedLimit || 0);
const totalScore = computed(() => props.scoringResult.totalScore || 0);

const c3Count = computed(() => {
    const len = c3Items.value.length;
    // Default to 5 if empty or weird
    return len > 0 ? len : 5;
});

const section2GridStyle = computed(() => {
    // Cols: repeat(c3Count, 1fr) auto 150px 150px
    return {
        gridTemplateColumns: `repeat(${c3Count.value}, 1fr) auto 150px 150px`
    };
});

const formatNum = (val) => {
    if (val === undefined || val === null) return '-';
    return Number(val).toLocaleString('th-TH', { maximumFractionDigits: 2 });
};

const formatMoney = (val) => {
     if (val === undefined || val === null) return '-';
    return Number(val).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
</script>

<style scoped>
.scoring-breakdown-grid {
    font-family: 'Sarabun', sans-serif;
    display: flex;
    flex-direction: column;
    gap: 20px;
    margin-top: 20px;
    background: white;
    padding: 10px;
    overflow-x: auto;
}

/* Common Grid Setup */
.grid-section {
    display: grid;
    gap: 2px; /* Small gap between cells */
    border: 1px solid #ddd;
    padding: 10px;
    background-color: #fff;
    /* Center align text generally */
    text-align: center;
}

/* SECTION 1 GRID DEFINITION */
.section-1-grid {
    /*
       Cols:
       1-3: C1 Items (1fr each)
       4: Plus (auto)
       5-7: C2 Items (1fr each)
       8: Arrow (auto)
       9: Result (150px fixed)
    */
    grid-template-columns: repeat(3, 1fr) auto repeat(3, 1fr) auto 150px;

    /*
       Rows:
       1: Header (auto)
       2: Weight (auto)
       3: Label (auto - flexible height)
       4: Value (auto)
       5: Score (auto)
    */
    grid-template-rows: auto auto minmax(50px, auto) auto auto;
}

/* SECTION 2 GRID DEFINITION */
.section-2-grid {
    /*
       Cols: Dynamic via style binding
       1-N: C3 Items
       N+1: Arrow
       N+2: Grade
       N+3: Limit
    */
    /* grid-template-columns set via inline style now */
    grid-template-rows: auto auto minmax(50px, auto) auto auto;
}

/* HEADERS */
.header-cell {
    padding: 10px;
    font-weight: bold;
    border: 1px solid #ccc;
    display: flex;
    align-items: center;
    justify-content: center;
}

.header-c1 { grid-column: 1 / span 3; grid-row: 1; }
.header-c2 { grid-column: 5 / span 3; grid-row: 1; }
/* header-c3 grid-column set via inline style now */

/* CELLS */
.cell {
    border: 1px solid #ccc;
    padding: 8px 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.85em;
    min-height: 40px;
}

.weight { font-weight: bold; }
.label { line-height: 1.2; }
.value { color: #333; font-weight: 500; }
.score { font-weight: bold; }

/* COLORS */
.pink-bg { background-color: #e6b8af; }
.yellow-bg { background-color: #ffe699; }
.blue-bg { background-color: #cfe2f3; }
.green-bg { background-color: #d9ead3; }
.gray-bg { background-color: #efefef; }
.white-bg { background-color: #fff; }

/* SPECIAL ELEMENTS */
.plus-sign {
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 24px;
    font-weight: bold;
    padding: 0 10px;
}

.arrow-container {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0 10px;
}

.arrow-box {
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: #4a86e8;
    color: white;
    width: 40px;
    height: 40px;
    border-radius: 4px;
    font-weight: bold;
}

/* RESULTS */
.result-box {
    border: 1px solid #333;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
}

.res-title {
    padding: 8px;
    border-bottom: 1px solid #333;
    font-weight: bold;
    font-size: 0.9em;
    background-color: #d9ead3;
}

.res-grade {
    font-size: 2em;
    font-weight: bold;
    padding: 10px;
    background-color: #fff; /* Inner box white */
    flex-grow: 1;
    display: flex;
    align-items: center;
    justify-content: center;
}

.res-score {
    padding: 8px;
    border-top: 1px solid #333;
    font-weight: bold;
    background-color: #d9ead3;
}

.limit-val {
    font-size: 1.1em;
}

</style>
