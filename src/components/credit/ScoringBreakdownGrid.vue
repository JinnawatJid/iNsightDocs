<template>
  <div class="scoring-breakdown-grid">
    <!-- SECTION 1: SIZE (C1 + C2) -->
    <div class="grid-section">
      <!-- HEADER ROW -->
      <div class="header-row">
        <div class="header-cell pink-bg c1-header">เกณฑ์การคิดขนาดกิจการ (ประวัติในอดีต)</div>
        <div class="header-cell yellow-bg c2-header">เกณฑ์การคิด Cashflow ของกิจการ</div>
        <div class="spacer-cell"></div>
      </div>

      <!-- DATA ROW -->
      <div class="data-row">
        <!-- C1 COLUMNS -->
        <div class="criteria-group c1-group">
           <div class="criteria-col" v-for="item in c1Items" :key="item.key">
               <div class="row-weight yellow-bg">{{ formatNum(item.weight) }}</div>
               <div class="row-label gray-bg">{{ item.label }}</div>
               <div class="row-value white-bg">{{ item.displayValue }}</div>
               <div class="row-score white-bg">{{ formatNum(item.score) }}</div>
           </div>
        </div>

        <!-- PLUS SIGN -->
        <div class="plus-sign">+</div>

        <!-- C2 COLUMNS -->
        <div class="criteria-group c2-group">
            <div class="criteria-col" v-for="item in c2Items" :key="item.key">
               <div class="row-weight yellow-bg">{{ formatNum(item.weight) }}</div>
               <div class="row-label gray-bg">{{ item.label }}</div>
               <div class="row-value white-bg">{{ item.displayValue }}</div>
               <div class="row-score white-bg">{{ formatNum(item.score) }}</div>
           </div>
        </div>

        <!-- ARROW -->
        <div class="arrow-box">➜</div>

        <!-- RESULT BOX: SIZE -->
        <div class="result-box green-bg">
            <div class="res-title">ขนาดกิจการ</div>
            <div class="res-grade">{{ sizeResult.label }}</div>
            <div class="res-score">{{ formatNum(sizeResult.score) }}</div>
        </div>
      </div>
    </div>

    <!-- SECTION 2: GRADE (C3) -->
    <div class="grid-section">
      <!-- HEADER ROW -->
      <div class="header-row">
        <div class="header-cell blue-bg c3-header">เกณฑ์การคิด Grade ของบริษัท (การซื้อขายในปัจจุบัน)</div>
        <div class="spacer-cell"></div>
      </div>

       <!-- DATA ROW -->
      <div class="data-row">
        <!-- C3 COLUMNS -->
        <div class="criteria-group c3-group">
             <div class="criteria-col" v-for="item in c3Items" :key="item.key">
               <div class="row-weight yellow-bg">{{ formatNum(item.weight) }}</div>
               <div class="row-label gray-bg">{{ item.label }}</div>
               <div class="row-value white-bg">{{ item.displayValue }}</div>
               <div class="row-score white-bg">{{ formatNum(item.score) }}</div>
           </div>
        </div>

        <!-- ARROW -->
        <div class="arrow-box">➜</div>

        <!-- RESULT BOX: GRADE -->
        <div class="result-box green-bg">
            <div class="res-title">เกรดของลูกค้า</div>
            <div class="res-grade">{{ gradeResult.label }}</div>
            <div class="res-score">{{ formatNum(gradeResult.score) }}</div>
        </div>

        <!-- RESULT BOX: LIMIT -->
        <div class="result-box green-bg limit-box">
             <div class="res-title">วงเงินเครดิตใหม่</div>
             <div class="res-grade limit-val">{{ formatMoney(recommendedLimit) }}</div>
             <div class="res-score">{{ formatNum(totalScore) }}</div>
        </div>

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

.grid-section {
    border: 1px solid #ddd;
    padding: 10px;
}

/* HEADERS */
.header-row {
    display: flex;
    gap: 10px;
    margin-bottom: 10px;
}

.header-cell {
    padding: 10px;
    font-weight: bold;
    text-align: center;
    border: 1px solid #ccc;
}

.pink-bg { background-color: #e6b8af; }
.yellow-bg { background-color: #ffe699; }
.blue-bg { background-color: #cfe2f3; }
.green-bg { background-color: #d9ead3; }
.gray-bg { background-color: #efefef; }
.white-bg { background-color: #fff; }

.c1-header { flex: 3; } /* 3 cols */
.c2-header { flex: 3; } /* 3 cols */
.c3-header { flex: 5; } /* 5 cols */

/* DATA ROWS */
.data-row {
    display: flex;
    align-items: flex-start; /* Align top */
    gap: 10px;
}

.criteria-group {
    display: flex;
    gap: 2px;
    flex-grow: 1;
}

.criteria-col {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-width: 100px;
    text-align: center;
    font-size: 0.85em;
}

.criteria-col > div {
    border: 1px solid #ccc;
    padding: 8px 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    height: 40px; /* Fixed height for alignment */
}

.row-weight { font-weight: bold; }
.row-label { font-size: 0.9em; line-height: 1.1; height: 60px !important; }
.row-value { color: #333; font-weight: 500; height: 50px !important; }
.row-score { font-weight: bold; }

.plus-sign {
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 20px;
    font-weight: bold;
    padding: 0 5px;
    height: 150px; /* Approximate height of rows */
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
    align-self: center;
    font-weight: bold;
}

/* RESULT BOXES */
.result-box {
    width: 120px;
    border: 1px solid #333;
    display: flex;
    flex-direction: column;
    text-align: center;
    align-self: center; /* Center vertically relative to the group */
}

.res-title {
    padding: 5px;
    border-bottom: 1px solid #333;
    font-weight: bold;
    font-size: 0.9em;
}

.res-grade {
    font-size: 2em;
    font-weight: bold;
    padding: 10px;
    background: white; /* Inner white box usually? Or green? Sheet shows green bg for title, green for box? */
    /* Sheet Image: Title Green, Grade Box Green BG? Actually looks like Grade Box is Light Green, Title is same. */
    background-color: #d9ead3;
}
/* Wait, in sheet: Title Box is Green. Grade "L" is in Green Box. Score is below in Green Box. */
/* Let's keep it simple: Green Container. */

.res-score {
    padding: 5px;
    border-top: 1px solid #333;
    font-weight: bold;
    background-color: #d9ead3;
}

.limit-box {
    margin-left: 10px;
    width: 150px;
}
.limit-val {
    font-size: 1.2em;
}

</style>
