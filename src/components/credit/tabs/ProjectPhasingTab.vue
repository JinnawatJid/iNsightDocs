<template>
  <div class="project-phasing-tab">
    <div v-if="!transactionData.projectData" class="empty-state">
      <p>กรุณาเลือกโครงการในแท็บ "ข้อมูลและเอกสารโครงการ" ก่อน</p>
    </div>

    <template v-else>
      <div class="form-section">
        <div class="phasing-header">
          <h3>แผนการใช้เครดิตแบบแบ่งงวด</h3>
          <div style="display: flex; gap: 10px; align-items: center;" v-if="!props.readOnly">
             <label style="font-size: 14px; color: #555;">รูปแบบการคำนวณวันจบ:</label>
             <select v-model="paymentCalculationMode" class="table-input" style="width: auto; padding: 4px 8px;">
               <option value="manual">กำหนดเอง</option>
               <option value="auto">คำนวณอัตโนมัติ (60 วัน)</option>
             </select>
          </div>
        </div>
        <table class="phasing-table">
          <thead>
            <tr>
              <th width="8%">งวด</th>
              <th width="38%">รายละเอียดงาน</th>
              <th width="15%">วันเบิก</th>
              <th width="15%">{{ paymentCalculationMode === 'auto' ? 'กำหนดชำระ' : 'วันจบ' }}</th>
              <th width="20%">จำนวนเงิน (บาท)</th>
              <th width="4%" v-if="!props.readOnly"></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(phase, idx) in transactionData.projectPhasing" :key="idx" class="phase-row">
              <td class="text-center font-bold" style="font-size: 16px;">{{ idx + 1 }}</td>
              <td>
                <input
                  type="text"
                  v-model="phase.description"
                  :disabled="props.readOnly"
                  class="table-input"
                  placeholder="เช่น เทพื้นชั้น 1-3"
                />
              </td>
              <td>
                <input
                  type="date"
                  v-model="phase.billingDate"
                  :disabled="props.readOnly"
                  @change="handleBillingDateChange(idx)"
                  class="table-input text-center"
                />
              </td>
              <td>
                <input
                  type="date"
                  v-model="phase.paymentDate"
                  :disabled="props.readOnly || paymentCalculationMode === 'auto'"
                  class="table-input text-center"
                />
              </td>
              <td>
                <input
                  type="text"
                  :value="phase.amount"
                  :disabled="props.readOnly"
                  @blur="formatPhaseAmount(idx)"
                  @input="handlePhaseAmountInput(idx, $event)"
                  class="table-input text-right"
                  placeholder="0.00"
                />
              </td>
              <td v-if="!props.readOnly" class="text-center action-col">
                <button class="btn-icon-delete" @click="removePhase(idx)" title="ลบงวดนี้">
                  ✕
                </button>
              </td>
            </tr>
            <tr v-if="transactionData.projectPhasing.length === 0 && props.readOnly">
              <td colspan="5" class="text-center empty-row">
                ไม่มีข้อมูลตารางแบ่งงวด
              </td>
            </tr>
          </tbody>
        </table>

        <!-- Add Phase Button below the table to match design -->
        <button v-if="!props.readOnly" class="btn-add-phase-dashed" @click="addPhase">
          + เพิ่มงวดใหม่
        </button>

        <div class="analyze-section" v-if="transactionData?.projectPhasing?.length > 0 && !showAnalysis">
           <button class="btn-primary" style="width: 100%; margin-top: 15px; padding: 12px; font-size: 16px; border-radius: 8px; color: white;" @click="showAnalysis = true">
               วิเคราะห์และคำนวณรอบส่ง
           </button>
        </div>


      </div>

      <!-- Credit Calculation Section -->
      <div v-if="showAnalysis" class="credit-calc-card" style="margin-top: 30px;">
        <div class="calc-header" style="display: flex; justify-content: space-between; align-items: center;">
          <h3>การวิเคราะห์วงเงินเครดิตโครงการ</h3>
          <div class="text-right" style="font-size: 14px;">
            <span class="text-muted">รวมมูลค่าตามงวด:</span>
            <span class="font-bold ml-2" style="font-size: 16px;">{{ formatNumber(totalPhaseAmount) }} บาท</span>
            <span v-if="currentProjectValueLimit > 0" :class="{'text-error': totalPhaseAmount > currentProjectValueLimit}" class="summary-note">
               (สูงสุดไม่เกินมูลค่าโครงการ {{ formatNumber(currentProjectValueLimit) }} บาท)
            </span>
          </div>
        </div>
        <div class="calc-body">
          <div class="calc-item">
            <span class="calc-label">วงเงินเครดิตปัจจุบัน</span>
            <span class="calc-value text-muted">{{ formatNumber(currentCreditLimit) }} บาท</span>
          </div>
          <div class="calc-operator">-</div>
          <div class="calc-item">
            <span class="calc-label">ยอดหนี้สะสมสูงสุด (Peak Exposure)</span>
            <span class="calc-value font-bold" :class="{'text-error': peakExposure > currentCreditLimit}">{{ formatNumber(peakExposure) }} บาท</span>
          </div>
          <div class="calc-operator">=</div>
          <div class="calc-item highlight">
            <span class="calc-label">ยอดขอเครดิตโครงการ</span>
            <span class="calc-value text-primary font-bold">{{ formatNumber(requestedCreditAmount) }} บาท</span>
          </div>
        </div>
        <div v-if="requestedCreditAmount > 0" class="alert-banner">
          ⚠️ วงเงินไม่เพียงพอสำหรับรอบการส่งมอบที่ซ้อนทับกัน ระบบได้คำนวณยอดขออนุมัติเพิ่มให้โดยอัตโนมัติ
        </div>
        <!-- Chart Control Section -->
        <div class="chart-controls" v-if="chartData" style="display: flex; justify-content: flex-end; padding: 15px 20px 0; border-top: 1px solid #eee;">
           <div style="display: flex; gap: 10px; align-items: center;">
             <label style="font-size: 14px; color: #555;">รูปแบบกราฟ (Chart Type):</label>
             <select v-model="chartType" class="table-input" style="width: auto; padding: 4px 8px;">
               <option value="stepped">Stepped Line (Industry Standard)</option>
               <option value="bar">Histogram (Area Chart)</option>
             </select>
           </div>
        </div>
        <!-- Chart Section -->
        <div class="chart-container" :style="{ position: 'relative', height: '400px', padding: '20px', 'border-top': !chartData ? '1px solid #eee' : 'none' }">
            <VueChart v-if="chartData" type="line" :data="chartData" :options="chartOptions" />
            <div v-else class="text-center text-muted" style="padding: 20px;">
                ไม่มีข้อมูลเพียงพอสำหรับสร้างกราฟ กรุณาระบุวันที่และจำนวนเงินให้ครบถ้วน
            </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { useCreditRequestStore } from '@/stores/creditRequest';
import { Line, Chart as VueChart } from 'vue-chartjs';
import {
  Chart as ChartJS,
  Title,
  Tooltip,
  Legend,
  BarElement,
  BarController,
  CategoryScale,
  LinearScale,
  LineElement,
  LineController,
  PointElement,
  Filler
} from 'chart.js';

ChartJS.register(
  Title,
  Tooltip,
  Legend,
  BarElement,
  BarController,
  CategoryScale,
  LinearScale,
  LineElement,
  LineController,
  PointElement,
  Filler
);

const showAnalysis = ref(false);
const chartType = ref('stepped');
const paymentCalculationMode = ref('manual');

const props = defineProps(['readOnly']);
const store = useCreditRequestStore();

const transactionData = computed({
  get: () => store.transactionData,
  set: (val) => { store.transactionData = val; }
});

function formatNumber(num) {
    if (!num) return '0';
    return Number(num).toLocaleString('en-US');
}

// Phasing Array Actions
const addPhase = () => {
    if (!store.transactionData) store.transactionData = {};
    if (!store.transactionData.projectPhasing) {
        store.transactionData.projectPhasing = [];
    }
    store.transactionData.projectPhasing.push({
        description: '',
        billingDate: '',
        paymentDate: '',
        amount: ''
    });
};

const removePhase = (index) => {
    store.transactionData.projectPhasing.splice(index, 1);
};

const calculatePaymentDate = (billingDateStr) => {
    if (!billingDateStr) return '';
    const date = new Date(billingDateStr);
    if (isNaN(date.getTime())) return '';
    date.setDate(date.getDate() + 60);
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
};

const handleBillingDateChange = (index) => {
    if (paymentCalculationMode.value === 'auto') {
        const billingDate = store.transactionData.projectPhasing[index].billingDate;
        if (billingDate) {
            store.transactionData.projectPhasing[index].paymentDate = calculatePaymentDate(billingDate);
        }
    }
};

watch(paymentCalculationMode, (newMode) => {
    if (newMode === 'auto' && store.transactionData?.projectPhasing) {
        store.transactionData.projectPhasing.forEach((phase, index) => {
            if (phase.billingDate) {
                store.transactionData.projectPhasing[index].paymentDate = calculatePaymentDate(phase.billingDate);
            }
        });
    }
});

const handlePhaseAmountInput = (index, event) => {
    let val = event.target.value;
    val = val.replace(/[^0-9.]/g, ''); // Allow decimals
    store.transactionData.projectPhasing[index].amount = val;
};

const formatPhaseAmount = (index) => {
    const raw = store.transactionData.projectPhasing[index].amount;
    const num = parseFloat(String(raw).replace(/,/g, ''));
    if (!isNaN(num)) {
        store.transactionData.projectPhasing[index].amount = formatNumber(num);
    }
};

const totalPhaseAmount = computed(() => {
    if (!store.transactionData?.projectPhasing) return 0;
    return store.transactionData.projectPhasing.reduce((sum, phase) => {
        const amt = parseFloat(String(phase.amount).replace(/,/g, '')) || 0;
        return sum + amt;
    }, 0);
});

const currentProjectValueLimit = computed(() => {
    if (!store.transactionData) return 0;

    // Prefer adjusted value if set, fallback to original project data value
    const adjusted = store.transactionData?.adjustedProjectValue;
    if (adjusted) {
         return parseFloat(String(adjusted).replace(/,/g, '')) || 0;
    }
    return store.transactionData?.projectData?.value || 0;
});

// Credit Calculation Logic
const currentCreditLimit = computed(() => {
  // Use mock for now, can be updated later when API is ready
  return Number(store.customer?.current_credit_limit) || 300000;
});

// Helper to parse dates securely
const parseDate = (dateString) => {
  if (!dateString) return null;
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return null;
  return d.getTime();
};

const peakExposure = computed(() => {
  if (!store.transactionData?.projectPhasing || store.transactionData.projectPhasing.length === 0) return 0;

  const events = [];
  store.transactionData.projectPhasing.forEach((p) => {
    const amt = parseFloat(String(p.amount || '0').replace(/,/g, '')) || 0;
    if (amt > 0) {
      if (p.billingDate) {
        events.push({ time: parseDate(p.billingDate), type: 'add', amount: amt });
      }
      if (p.paymentDate) {
        events.push({ time: parseDate(p.paymentDate), type: 'sub', amount: amt });
      }
    }
  });

  events.sort((a, b) => {
    if (a.time === null) return 1;
    if (b.time === null) return -1;
    if (a.time !== b.time) return a.time - b.time;
    if (a.type !== b.type) return a.type === 'add' ? -1 : 1;
    return 0;
  });

  let maxExp = 0;
  let currExp = 0;

  for (const ev of events) {
    if (ev.time !== null) {
      if (ev.type === 'add') currExp += ev.amount;
      if (ev.type === 'sub') currExp -= ev.amount;
      if (currExp > maxExp) maxExp = currExp;
    }
  }

  // If no dates are set at all, we can't calculate a timeline.
  // We could return sum or 0. Returning 0 is safer until dates are set.
  if (maxExp === 0 && totalPhaseAmount.value > 0 && events.filter(e => e.time !== null).length === 0) {
     return 0; // Wait for dates to be set
  }

  return Math.max(0, maxExp);
});

const requestedCreditAmount = computed(() => {
  const diff = peakExposure.value - currentCreditLimit.value;
  return Math.max(0, diff);
});

// Chart.js Data Configuration
const chartData = computed(() => {
  if (!store.transactionData?.projectPhasing || store.transactionData.projectPhasing.length === 0) return null;

  const events = [];
  store.transactionData.projectPhasing.forEach((p, i) => {
    const amt = parseFloat(String(p.amount || '0').replace(/,/g, '')) || 0;
    if (amt > 0) {
      if (p.billingDate) {
        events.push({ time: parseDate(p.billingDate), rawDate: p.billingDate, type: 'add', amount: amt, phase: i + 1 });
      }
      if (p.paymentDate) {
        events.push({ time: parseDate(p.paymentDate), rawDate: p.paymentDate, type: 'sub', amount: amt, phase: i + 1 });
      }
    }
  });

  const validEvents = events.filter(e => e.time !== null);
  if (validEvents.length === 0) return null;

  validEvents.sort((a, b) => {
    if (a.time !== b.time) return a.time - b.time;
    if (a.type !== b.type) return a.type === 'add' ? -1 : 1;
    return 0;
  });

  const formatDateString = (dateObj) => {
    return `${dateObj.getDate().toString().padStart(2, '0')}/${(dateObj.getMonth() + 1).toString().padStart(2, '0')}/${dateObj.getFullYear()}`;
  };

  // Group events by exact date to prevent horizontal stretching of the same day
  const groupedEvents = [];
  validEvents.forEach(ev => {
    const dateObj = new Date(ev.time);
    const dayStart = new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate()).getTime();
    const labelDate = formatDateString(dateObj);
    const actionLabel = ev.type === 'add' ? `(เบิกรอบ ${ev.phase})` : `(รับเงินรอบ ${ev.phase})`;

    const lastGroup = groupedEvents.length > 0 ? groupedEvents[groupedEvents.length - 1] : null;
    if (lastGroup && lastGroup.time === dayStart) {
        lastGroup.events.push({ type: ev.type, amount: ev.amount, label: actionLabel });
    } else {
        groupedEvents.push({ time: dayStart, date: labelDate, events: [{ type: ev.type, amount: ev.amount, label: actionLabel }] });
    }
  });

  const labels = [];
  const exposureData = [];
  let currentExposure = 0;

  // 1. Initial padding (5 days before first event)
  if (groupedEvents.length > 0) {
      const firstEventDate = new Date(groupedEvents[0].time);
      firstEventDate.setDate(firstEventDate.getDate() - 5);
      labels.push([formatDateString(firstEventDate), 'เริ่มต้นโครงการ']);
      exposureData.push(0);
  }

  // 2. Main data points
  groupedEvents.forEach(group => {
     let dayActionLabels = [];
     group.events.forEach(ev => {
         if (ev.type === 'add') currentExposure += ev.amount;
         if (ev.type === 'sub') currentExposure -= ev.amount;
         dayActionLabels.push(ev.label);
     });
     labels.push([group.date, ...dayActionLabels]);
     exposureData.push(Math.max(0, currentExposure));
  });

  // 3. Final padding (5 days after last event)
  if (groupedEvents.length > 0) {
      const lastEventDate = new Date(groupedEvents[groupedEvents.length - 1].time);
      lastEventDate.setDate(lastEventDate.getDate() + 5);
      labels.push([formatDateString(lastEventDate), 'สิ้นสุดโครงการ']);
      exposureData.push(Math.max(0, currentExposure));
  }

  const limitData = labels.map(() => currentCreditLimit.value);
  const isBar = chartType.value === 'bar';

  return {
    labels: labels,
    datasets: [
      {
        type: 'line',
        label: 'ยอดหนี้สะสม (Exposure)',
        data: exposureData,
        borderColor: isBar ? 'transparent' : '#2563eb',
        backgroundColor: isBar ? 'rgba(37, 99, 235, 0.8)' : 'rgba(37, 99, 235, 0.1)',
        borderWidth: isBar ? 0 : 2,
        stepped: 'before',
        fill: true,
        pointBackgroundColor: '#2563eb',
        pointRadius: isBar ? 0 : 6,
        order: 2
      },
      {
        type: 'line',
        label: 'วงเงินเครดิตปัจจุบัน',
        data: limitData,
        borderColor: '#ef4444',
        borderWidth: 2,
        borderDash: [5, 5],
        fill: false,
        pointRadius: 0,
        stepped: false,
        order: 1
      }
    ]
  };
});

const chartOptions = computed(() => {
  return {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      display: false
    },
    title: {
      display: true,
      text: 'กราฟแสดงการทับซ้อนของยอดหนี้ (Exposure Over Time)',
      font: {
        size: 16,
        family: 'Kanit'
      }
    },
    tooltip: {
      mode: 'index',
      intersect: false,
      callbacks: {
        title: function(context) {
           if (context.length > 0) {
               return context[0].label || '';
           }
           return '';
        },
        label: function(context) {
          let label = context.dataset.label || '';
          if (label) {
            label += ': ';
          }
          if (context.parsed.y !== null) {
            label += new Intl.NumberFormat('en-US').format(context.parsed.y) + ' บาท';
          }
          return label;
        }
      }
    }
  },
  scales: {
    y: {
      beginAtZero: true,
      grid: {
          color: '#f1f5f9'
      },
      title: {
        display: true,
        text: 'จำนวนเงิน (บาท)',
        font: { family: 'Kanit' }
      },
      ticks: {
        callback: function(value) {
          return (value / 1000) + 'K';
        }
      }
    },
    x: {
      grid: {
          display: false
      },
      title: {
         display: true,
         text: 'ระยะเวลา (วันที่)',
         font: { family: 'Kanit' }
      },
      ticks: {
         maxRotation: 45,
         minRotation: 45,
         font: { size: 10 }
      }
    }
  }
  };
});

watch(requestedCreditAmount, (newVal) => {
  if (!props.readOnly && newVal > 0) {
    store.transactionData.amount = formatNumber(newVal);
  }
}, { immediate: true });
</script>

<style scoped>
@import './shared-styles.css';

.project-phasing-tab {
    padding: 20px;
}

.empty-state {
    text-align: center;
    padding: 40px;
    background-color: #f9f9f9;
    border: 1px dashed #ccc;
    border-radius: 8px;
    color: #666;
}

.text-muted {
    color: #888;
}

.form-section {
    margin-bottom: 30px;
}

.phasing-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 15px;
}

.phasing-header h3 {
    margin: 0;
}

.btn-add-phase-dashed {
    width: 100%;
    background-color: white;
    color: #0056FF;
    border: 1px dashed #ccc;
    padding: 15px;
    border-radius: 8px;
    font-size: 16px;
    cursor: pointer;
    font-weight: bold;
    margin-top: 15px;
    transition: all 0.2s;
}

.btn-add-phase-dashed:hover {
    background-color: #f8f9fa;
    border-color: #0056FF;
}

.phasing-table {
    width: 100%;
    border-collapse: collapse;
    background-color: white;
}

.phasing-table th {
    background-color: #f4f5f7;
    color: #333;
    font-weight: bold;
    text-align: center;
    padding: 15px 10px;
    border: none;
}

.phasing-table td {
    padding: 15px 10px;
    border-bottom: 1px solid #eee;
    vertical-align: middle;
}

.phase-row {
    position: relative;
}

.action-col {
    padding: 0 !important;
}

.btn-icon-delete {
    background: none;
    border: none;
    color: #ccc;
    font-size: 16px;
    cursor: pointer;
    padding: 8px;
    border-radius: 50%;
    transition: all 0.2s;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
}

.btn-icon-delete:hover {
    color: #dc3545;
    background-color: #fee2e2;
}

.phasing-footer {
    display: flex;
    justify-content: flex-end;
    align-items: flex-start;
    margin-top: 20px;
    padding-top: 20px;
    border-top: 1px solid #eee;
    gap: 20px;
}

.total-label {
    font-size: 16px;
    color: #333;
}

.total-amount {
    font-size: 16px;
    text-align: right;
}

.table-input {
    width: 100%;
    padding: 8px;
    box-sizing: border-box;
    border: 1px solid #ccc;
    border-radius: 4px;
}

.table-input:focus {
    outline: none;
    border-color: #0056FF;
}

.table-input:disabled {
    background-color: #f5f5f5;
    color: #777;
}

.text-center { text-align: center; }
.text-right { text-align: right; }
.font-bold { font-weight: bold; }

.empty-row {
    color: #888;
    font-style: italic;
    padding: 20px !important;
}

.summary-note {
    font-size: 12px;
    color: #666;
    margin-left: 10px;
}

.text-error {
    color: #dc3545;
    font-weight: 500;
}

/* Credit Calculation Styles */
.credit-calc-card {
  background: white;
  border-radius: 8px;
  border: 1px solid #e0e0e0;
  margin-bottom: 25px;
  overflow: hidden;
  box-shadow: 0 2px 5px rgba(0,0,0,0.05);
}

.calc-header {
  background-color: #f8f9fa;
  padding: 15px 20px;
  border-bottom: 1px solid #eee;
}

.calc-header h3 {
  margin: 0;
  font-size: 16px;
  color: #333;
}

.calc-body {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 30px;
  gap: 10px;
}

@media (max-width: 768px) {
  .calc-body {
    flex-direction: column;
    align-items: stretch;
  }
  .calc-operator {
    text-align: center;
    transform: rotate(90deg);
  }
}

.calc-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex: 1;
}

.calc-item.highlight {
  background-color: #f0f5ff;
  padding: 15px;
  border-radius: 8px;
  border: 1px dashed #0056FF;
}

.calc-label {
  font-size: 14px;
  color: #666;
}

.calc-value {
  font-size: 20px;
}

.calc-operator {
  font-size: 24px;
  font-weight: bold;
  color: #ccc;
  padding: 0 10px;
}

.alert-banner {
  background-color: #fff3cd;
  color: #856404;
  padding: 12px 20px;
  font-size: 14px;
  border-top: 1px solid #ffeeba;
  display: flex;
  align-items: center;
  gap: 10px;
}
.ml-2 { margin-left: 8px; }
</style>