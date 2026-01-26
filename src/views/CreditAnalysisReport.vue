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
          <h2>Detailed Extraction & Scoring Logic</h2>
          <table class="detail-table">
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

h2 {
    border-left: 5px solid #0056FF;
    padding-left: 10px;
    margin-bottom: 20px;
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

@media print {
    .no-print { display: none; }
    .credit-analysis-report { padding: 0; background: white; }
    .report-container { box-shadow: none; padding: 0; max-width: 100%; }
}
</style>
