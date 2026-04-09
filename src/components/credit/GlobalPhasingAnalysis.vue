<template>
  <div class="global-phasing-analysis">
    <div class="unified-card analysis-card">
      <div class="card-header" style="padding-bottom: 20px; border-bottom: 1px solid #eee;">
        <h3>สรุปการวิเคราะห์กระแสเงินสดรวม (Consolidated Cash Flow)</h3>
        <div class="header-actions">
           <button class="toggle-details-btn" @click="showAnalysis = !showAnalysis" :class="{'active': showAnalysis}">
               {{ showAnalysis ? 'ซ่อนการวิเคราะห์' : 'วิเคราะห์ยอดหนี้สะสมรวม' }}
           </button>
        </div>
      </div>

      <transition name="slide-fade">
        <div v-if="showAnalysis" class="analysis-body">

          <!-- Summary Metrics -->
          <div class="summary-metrics">
            <div class="metric-item">
              <span class="metric-label">ยอดหนี้สะสมรวมสูงสุด (Total Peak Exposure)</span>
              <span class="metric-value text-primary font-bold">{{ formatNumber(globalPeakExposure) }} บาท</span>
              <div class="metric-breakdown text-muted" style="display: flex; gap: 16px; font-size: 13px; margin-top: 8px; justify-content: center;">
                <div style="display: flex; align-items: center; gap: 6px;">
                  <span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background-color: #3b82f6;"></span>
                  <span>หนี้โครงการ: {{ formatNumber(globalPeakProjectDebt) }}</span>
                </div>
                <div style="display: flex; align-items: center; gap: 6px;">
                  <span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background-color: #9ca3af;"></span>
                  <span>หนี้การค้า: {{ formatNumber(globalPeakTradeDebt) }}</span>
                </div>
              </div>
            </div>
            <div class="metric-operator">-</div>
            <div class="metric-item">
              <span class="metric-label">วงเงินเครดิตปัจจุบัน</span>
              <span class="metric-value text-muted">{{ formatNumber(currentCreditLimit) }} บาท</span>
            </div>
            <div class="metric-operator">=</div>
            <div class="metric-item highlight">
              <span class="metric-label">วงเงินส่วนเพิ่มที่ควรขออนุมัติ (Suggested Increase)</span>
              <span class="metric-value text-danger font-bold">{{ formatNumber(suggestedIncrease) }} บาท</span>
            </div>
          </div>

          <div v-if="suggestedIncrease > 0" class="alert-banner">
            ⚠️ วงเงินปัจจุบันไม่เพียงพอต่อการเบิกของที่ซ้อนทับกันหลายโครงการ ระบบแนะนำให้ขออนุมัติวงเงินเพิ่ม
          </div>

          <!-- Chart Container -->
          <div class="chart-wrapper">
             <VueChart v-if="chartData" type="line" :data="chartData" :options="chartOptions" />
             <div v-else class="empty-state">
                <p>ไม่มีข้อมูลรอบส่งสินค้าเพียงพอสำหรับสร้างกราฟ กรุณาระบุวันที่และจำนวนเงินของโครงการต่างๆ ให้ครบถ้วน</p>
             </div>
          </div>

          <!-- Planned vs Actual Comparison Chart -->
          <div class="chart-section" v-if="chartData">
            <h4 class="section-subtitle">ติดตามสถานะหนี้จริงเทียบกับแผน (Planned vs Actual Tracking)</h4>
            <div class="chart-wrapper">
               <VueChart v-if="comparisonChartData" type="line" :data="comparisonChartData" :options="comparisonChartOptions" />
               <div v-else class="empty-state">
                  <p>กำลังประมวลผลข้อมูลเปรียบเทียบ...</p>
               </div>
            </div>
          </div>

        </div>
      </transition>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import axios from 'axios';
import { useCreditRequestStore } from '@/stores/creditRequest';
import { Line, Chart as VueChart } from 'vue-chartjs';
import {
  Chart as ChartJS,
  Title,
  Tooltip,
  Legend,
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
  CategoryScale,
  LinearScale,
  LineElement,
  LineController,
  PointElement,
  Filler
);

const store = useCreditRequestStore();
const showAnalysis = ref(false);

// Mock current trade debt
const currentTradeDebt = ref(0);




const fetchTradeDebt = async (customerNo) => {
    if (!customerNo) return;
    console.log(`[GlobalPhasingAnalysis] Fetching remaining credit for ${customerNo}`);
    try {
        const response = await axios.get(`/api/financials/remaining-credit/${encodeURIComponent(customerNo)}`);
        console.log('[GlobalPhasingAnalysis] API Response:', response.data);
        if (response.data && response.data.totalUtilization !== undefined) {
            currentTradeDebt.value = response.data.totalUtilization;
            console.log('[GlobalPhasingAnalysis] currentTradeDebt updated to:', currentTradeDebt.value);
        }
    } catch (error) {
        console.error('[GlobalPhasingAnalysis] Failed to fetch remaining credit:', error);
    }
};

watch(() => store.customer?.id || store.customer?.No_, (newId) => {
    if (newId) {
        console.log('[GlobalPhasingAnalysis] Customer changed to:', newId);
        fetchTradeDebt(newId);
    }
}, { immediate: true });

onMounted(async () => {
    ChartJS.register(Title, Tooltip, Legend, CategoryScale, LinearScale, LineElement, LineController, PointElement, Filler);
    console.log('[GlobalPhasingAnalysis] Mounted.');
});


function formatNumber(num) {
    if (!num) return '0';
    return Number(num).toLocaleString('en-US');
}

const currentCreditLimit = computed(() => {
  return Number(store.customer?.current_credit_limit) || 0;
});

// Helper to parse dates securely
const parseDate = (dateString) => {
  if (!dateString) return null;
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return null;
  return d.getTime();
};

const formatDateString = (dateObj) => {
    return `${dateObj.getDate().toString().padStart(2, '0')}/${(dateObj.getMonth() + 1).toString().padStart(2, '0')}/${dateObj.getFullYear()}`;
};

// Define accessible colors for up to 10 projects
const projectColors = [
    { border: '#2563eb', bg: 'rgba(37, 99, 235, 0.4)' },  // Blue
    { border: '#10b981', bg: 'rgba(16, 185, 129, 0.4)' }, // Green
    { border: '#f59e0b', bg: 'rgba(245, 158, 11, 0.4)' }, // Yellow
    { border: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.4)' }, // Purple
    { border: '#ec4899', bg: 'rgba(236, 72, 153, 0.4)' }, // Pink
    { border: '#06b6d4', bg: 'rgba(6, 182, 212, 0.4)' },  // Cyan
    { border: '#f43f5e', bg: 'rgba(244, 63, 94, 0.4)' },  // Rose
    { border: '#84cc16', bg: 'rgba(132, 204, 22, 0.4)' }, // Lime
    { border: '#f97316', bg: 'rgba(249, 115, 22, 0.4)' }, // Orange
    { border: '#64748b', bg: 'rgba(100, 116, 139, 0.4)' } // Slate
];

// Extract all valid events across all projects
const globalEvents = computed(() => {
    const projects = store.transactionData.projects || [];
    let allEvents = [];

    projects.forEach((proj, pIndex) => {
        const phasing = proj.projectPhasing || [];
        phasing.forEach((phase, i) => {
            const amt = parseFloat(String(phase.amount || '0').replace(/,/g, '')) || 0;
            if (amt > 0) {
                if (phase.billingDate) {
                    allEvents.push({
                        time: parseDate(phase.billingDate),
                        type: 'add',
                        amount: amt,
                        projectId: pIndex,
                        projectName: proj.projectData?.name || `โครงการ ${pIndex + 1}`
                    });
                }
                if (phase.paymentDate) {
                    allEvents.push({
                        time: parseDate(phase.paymentDate),
                        type: 'sub',
                        amount: amt,
                        projectId: pIndex,
                        projectName: proj.projectData?.name || `โครงการ ${pIndex + 1}`
                    });
                }
            }
        });
    });

    return allEvents.filter(e => e.time !== null).sort((a, b) => a.time - b.time);
});

const globalPeakExposureData = computed(() => {
    const events = globalEvents.value;
    let startTs = 0;
    if (events.length > 0) {
        const firstD = new Date(events[0].time);
        firstD.setDate(firstD.getDate() - 5);
        startTs = firstD.getTime();
    }

    let maxTotal = currentTradeDebt.value; // Initial check at start
    let peakTrade = currentTradeDebt.value;
    let peakProject = 0;

    let currProjectDebt = 0;

    events.forEach(ev => {
        if (ev.type === 'add') currProjectDebt += ev.amount;
        if (ev.type === 'sub') currProjectDebt -= ev.amount;

        const tradeDebt = currentTradeDebt.value;
        const total = currProjectDebt + tradeDebt;

        if (total > maxTotal) {
            maxTotal = total;
            peakTrade = tradeDebt;
            peakProject = currProjectDebt;
        }
    });

    return {
        total: Math.max(0, maxTotal),
        trade: peakTrade,
        project: peakProject
    };
});

const globalPeakExposure = computed(() => globalPeakExposureData.value.total);
const globalPeakTradeDebt = computed(() => globalPeakExposureData.value.trade);
const globalPeakProjectDebt = computed(() => globalPeakExposureData.value.project);

const suggestedIncrease = computed(() => {
    const diff = globalPeakExposure.value - currentCreditLimit.value;
    return Math.max(0, diff);
});


// Build Chart.js Datasets
const chartData = computed(() => {
    const events = globalEvents.value;

    // Fallback timeline if there are no events but we have trade debt to show
    if (events.length === 0) {
        if (currentTradeDebt.value > 0) {
            const today = new Date();
            const nextMonth = new Date(today);
            nextMonth.setMonth(today.getMonth() + 1);

            return {
                labels: [formatDateString(today), formatDateString(nextMonth)],
                datasets: [{
                    type: 'line',
                    label: 'ยอดหนี้การค้าปัจจุบัน',
                    data: [currentTradeDebt.value, currentTradeDebt.value],
                    borderColor: '#9e9e9e',
                    backgroundColor: 'rgba(158, 158, 158, 0.5)',
                    borderWidth: 2,
                    stepped: 'before',
                    fill: true,
                }]
            };
        }
        return null;
    }

    // 1. Find all unique timeline dates across ALL projects

    let uniqueDates = Array.from(new Set(events.map(e => {
        const d = new Date(e.time);
        return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    }))).sort((a, b) => a - b);

    // Add padding dates (5 days before first, 5 days after last)
    if (uniqueDates.length > 0) {
        const firstD = new Date(uniqueDates[0]);
        firstD.setDate(firstD.getDate() - 5);

        const lastD = new Date(uniqueDates[uniqueDates.length - 1]);
        lastD.setDate(lastD.getDate() + 5);
        uniqueDates.push(firstD.getTime(), lastD.getTime());
        uniqueDates = Array.from(new Set(uniqueDates)).sort((a, b) => a - b);
    }

    const labels = uniqueDates.map(ts => formatDateString(new Date(ts)));

    // 2. Track Running Balance PER Project
    const projects = store.transactionData.projects || [];
    const projectBalances = projects.map(() => 0); // Array of current exposure per project

    // Datasets structure
    const datasets = projects.map((proj, i) => {
        const color = projectColors[i % projectColors.length];
        return {
            type: 'line',
            label: proj.projectData?.name || `โครงการ ${i + 1}`,
            data: [], // Will fill below
            borderColor: color.border,
            backgroundColor: color.bg,
            borderWidth: 2,
            stepped: 'before',
            fill: true, // Crucial for area chart
            pointRadius: 0,
            pointHoverRadius: 6,
            stack: 'Stack 0' // Crucial: puts them in the same stack group
        };
    });

    // 3. Populate datasets at each unique date
    uniqueDates.forEach(ts => {
        // Find all events that happen ON this exact date
        const dayEvents = events.filter(e => {
            const ed = new Date(e.time);
            return new Date(ed.getFullYear(), ed.getMonth(), ed.getDate()).getTime() === ts;
        });

        // Apply events to running balances
        dayEvents.forEach(ev => {
            if (ev.type === 'add') projectBalances[ev.projectId] += ev.amount;
            if (ev.type === 'sub') projectBalances[ev.projectId] -= ev.amount;
        });

        // Record the end-of-day balance for each project dataset
        projects.forEach((proj, i) => {
            datasets[i].data.push(Math.max(0, projectBalances[i]));
        });
    });

    // 4. Add Mock Current Debt at the bottom layer (start of the array)
    const chartStartTs = uniqueDates.length > 0 ? uniqueDates[0] : 0;

    datasets.unshift({
        type: 'line',
        label: 'ยอดหนี้การค้าปัจจุบัน',
        data: uniqueDates.map(ts => currentTradeDebt.value),
        borderColor: '#9e9e9e',
        backgroundColor: 'rgba(158, 158, 158, 0.5)',
        borderWidth: 2,
        stepped: 'before',
        fill: true,
        pointRadius: 0,
        pointHoverRadius: 6,
        stack: 'Stack 0'
    });

    // 5. Add threshold line (Current Limit)
    // We add this as a separate, unstacked line.
    datasets.push({
        type: 'line',
        label: 'วงเงินเครดิตปัจจุบัน',
        data: labels.map(() => currentCreditLimit.value),
        borderColor: '#ef4444',
        borderWidth: 2,
        borderDash: [5, 5],
        fill: false,
        pointRadius: 0,
        stepped: false,
        stack: 'Limit' // Put in a different stack so it doesn't pile on top of the projects
    });

    // Add Requested Limit if it exists and is higher than current
    const reqAmount = parseFloat(String(store.transactionData.amount || '0').replace(/,/g, '')) || 0;
    const totalNewLimit = currentCreditLimit.value + reqAmount;
    if (totalNewLimit > currentCreditLimit.value) {
         datasets.push({
            type: 'line',
            label: 'วงเงินใหม่ (รวมส่วนที่ขอเพิ่ม)',
            data: labels.map(() => totalNewLimit),
            borderColor: '#10b981',
            borderWidth: 2,
            borderDash: [5, 5],
            fill: false,
            pointRadius: 0,
            stepped: false,
            stack: 'Requested'
        });
    }

    return {
        labels,
        datasets
    };
});

const actualEvents = computed(() => {
    const events = globalEvents.value;
    return events.map(ev => {
        const delayDays = ev.type === 'add' ? 3 : 7; // Simulation delay: drawdowns 3 days late, repayments 7 days late
        const delayedTime = ev.time + (delayDays * 24 * 60 * 60 * 1000);
        return {
            ...ev,
            time: delayedTime,
            isActual: true
        };
    }).sort((a, b) => a.time - b.time);
});

const comparisonChartData = computed(() => {
    const pEvents = globalEvents.value;
    const aEvents = actualEvents.value;
    if (pEvents.length === 0) return null;

    let uniqueDates = Array.from(new Set([
        ...pEvents.map(e => {
            const d = new Date(e.time);
            return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
        }),
        ...aEvents.map(e => {
            const d = new Date(e.time);
            return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
        })
    ])).sort((a, b) => a - b);

    if (uniqueDates.length > 0) {
        const firstD = new Date(uniqueDates[0]);
        firstD.setDate(firstD.getDate() - 5);

        const lastD = new Date(uniqueDates[uniqueDates.length - 1]);
        lastD.setDate(lastD.getDate() + 5);

        uniqueDates.push(firstD.getTime(), lastD.getTime());
        uniqueDates = Array.from(new Set(uniqueDates)).sort((a, b) => a - b);
    }

    const labels = uniqueDates.map(ts => formatDateString(new Date(ts)));

    let plannedBalance = 0;
    let actualBalance = 0;

    const plannedData = [];
    const actualData = [];

    const chartStartTs = uniqueDates.length > 0 ? uniqueDates[0] : 0;

    uniqueDates.forEach(ts => {
        const tradeDebt = currentTradeDebt.value;

        const dayPEvents = pEvents.filter(e => {
            const ed = new Date(e.time);
            return new Date(ed.getFullYear(), ed.getMonth(), ed.getDate()).getTime() === ts;
        });
        dayPEvents.forEach(ev => {
            if (ev.type === 'add') plannedBalance += ev.amount;
            if (ev.type === 'sub') plannedBalance -= ev.amount;
        });
        plannedData.push(Math.max(0, plannedBalance) + tradeDebt);

        const dayAEvents = aEvents.filter(e => {
            const ed = new Date(e.time);
            return new Date(ed.getFullYear(), ed.getMonth(), ed.getDate()).getTime() === ts;
        });
        dayAEvents.forEach(ev => {
            if (ev.type === 'add') actualBalance += ev.amount;
            if (ev.type === 'sub') actualBalance -= ev.amount;
        });
        actualData.push(Math.max(0, actualBalance) + tradeDebt);
    });

    const datasets = [
        {
            type: 'line',
            label: 'ยอดหนี้การค้าปัจจุบัน',
            data: uniqueDates.map(ts => currentTradeDebt.value),
            borderColor: '#9e9e9e',
            backgroundColor: 'rgba(158, 158, 158, 0.5)',
            borderWidth: 2,
            stepped: 'before',
            fill: true,
            pointRadius: 0,
            pointHoverRadius: 6
        },
        {
            type: 'line',
            label: 'ยอดหนี้ตามแผน (Planned)',
            data: plannedData,
            borderColor: 'rgba(156, 163, 175, 1)',
            backgroundColor: 'rgba(156, 163, 175, 0.1)',
            borderWidth: 2,
            borderDash: [5, 5],
            stepped: 'before',
            fill: true,
            pointRadius: 0,
            pointHoverRadius: 6
        },
        {
            type: 'line',
            label: 'ยอดหนี้จริง (Actual)',
            data: actualData,
            borderColor: '#0056FF',
            backgroundColor: 'rgba(0, 86, 255, 0.1)',
            borderWidth: 3,
            stepped: 'before',
            fill: true,
            pointRadius: 0,
            pointHoverRadius: 6
        }
    ];

    datasets.push({
        type: 'line',
        label: 'วงเงินเครดิตปัจจุบัน',
        data: labels.map(() => currentCreditLimit.value),
        borderColor: '#ef4444',
        borderWidth: 2,
        borderDash: [5, 5],
        fill: false,
        pointRadius: 0,
        stepped: false
    });

    const reqAmount = parseFloat(String(store.transactionData.amount || '0').replace(/,/g, '')) || 0;
    const totalNewLimit = currentCreditLimit.value + reqAmount;
    if (totalNewLimit > currentCreditLimit.value) {
         datasets.push({
            type: 'line',
            label: 'วงเงินใหม่ (รวมส่วนที่ขอเพิ่ม)',
            data: labels.map(() => totalNewLimit),
            borderColor: '#10b981',
            borderWidth: 2,
            borderDash: [5, 5],
            fill: false,
            pointRadius: 0,
            stepped: false
        });
    }

    return {
        labels,
        datasets
    };
});

const sharedYAxisMax = computed(() => {
    // Top chart max
    const peakExposure = globalPeakExposure.value;

    // Bottom chart max (actual peak)
    const aEvents = actualEvents.value;
    let maxActual = currentTradeDebt.value;
    let currentActualProj = 0;

    if (aEvents.length > 0) {
        let startTs = new Date(aEvents[0].time);
        startTs.setDate(startTs.getDate() - 5);

        aEvents.forEach(ev => {
            if (ev.type === 'add') currentActualProj += ev.amount;
            if (ev.type === 'sub') currentActualProj -= ev.amount;

            const tradeDebt = currentTradeDebt.value;
            const total = currentActualProj + tradeDebt;
            if (total > maxActual) {
                maxActual = total;
            }
        });
    }

    // Limits
    const limit = currentCreditLimit.value;
    const reqAmount = parseFloat(String(store.transactionData.amount || '0').replace(/,/g, '')) || 0;
    const totalNewLimit = limit + reqAmount;

    return Math.max(peakExposure, maxActual, limit, totalNewLimit) * 1.1; // Add 10% padding
});

const comparisonChartOptions = computed(() => {
  return {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
          mode: 'index',
          intersect: false,
      },
      plugins: {
        legend: {
          display: true,
          position: 'top',
          labels: { font: { family: 'Kanit' } }
        },
        tooltip: {
          callbacks: {
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
          suggestedMax: sharedYAxisMax.value,
          grid: { color: '#f1f5f9' },
          title: {
            display: true,
            text: 'ยอดหนี้สะสม (บาท)',
            font: { family: 'Kanit' }
          },
          ticks: {
            callback: function(value) {
              if (value >= 1000000) return (value / 1000000).toFixed(1) + 'M';
              return (value / 1000) + 'K';
            }
          }
        },
        x: {
          grid: { display: false },
          title: {
             display: true,
             text: 'ระยะเวลา',
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

const chartOptions = computed(() => {
  return {
  responsive: true,
  maintainAspectRatio: false,
  interaction: {
      mode: 'index',
      intersect: false,
  },
  plugins: {
    legend: {
      display: true,
      position: 'top',
      labels: {
          font: { family: 'Kanit' }
      }
    },
    tooltip: {
      callbacks: {
        label: function(context) {
          let label = context.dataset.label || '';
          if (label) {
            label += ': ';
          }
          if (context.parsed.y !== null) {
            label += new Intl.NumberFormat('en-US').format(context.parsed.y) + ' บาท';
          }
          return label;
        },
        footer: function(tooltipItems) {
            // Calculate total stack value for the tooltip footer
            let total = 0;
            tooltipItems.forEach(function(tooltipItem) {
                // Only sum stacked project layers, ignore limit lines
                if (tooltipItem.dataset.stack === 'Stack 0') {
                    total += tooltipItem.parsed.y;
                }
            });
            return 'ยอดหนี้รวม ณ วันนี้: ' + new Intl.NumberFormat('en-US').format(total) + ' บาท';
        }
      }
    }
  },
  scales: {
    y: {
      stacked: true, // Enable Y-axis stacking!
      beginAtZero: true,
      suggestedMax: sharedYAxisMax.value,
      grid: {
          color: '#f1f5f9'
      },
      title: {
        display: true,
        text: 'ยอดหนี้สะสมซ้อนทับ (บาท)',
        font: { family: 'Kanit' }
      },
      ticks: {
        callback: function(value) {
          if (value >= 1000000) return (value / 1000000).toFixed(1) + 'M';
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
         text: 'ระยะเวลา',
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
</script>

<style scoped>
.analysis-card {
  margin-top: 20px;
  background: white;
  border-radius: 8px;
  border: 1px solid #e0e0e0;
  overflow: hidden;
}

.card-header {
  padding: 20px 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background-color: #f8fbff;
}

.card-header h3 {
  margin: 0;
  font-size: 16px;
  color: #0056FF;
  font-weight: bold;
}

.toggle-details-btn {
  background: white;
  border: 1px solid #0056FF;
  color: #0056FF;
  padding: 6px 15px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
}

.toggle-details-btn:hover {
  background-color: #f0f5ff;
}

.toggle-details-btn.active {
    background-color: #0056FF;
    color: white;
}

.analysis-body {
    padding: 20px;
}

/* Metrics Styles */
.summary-metrics {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px 30px;
  gap: 15px;
  background-color: #fff;
  border-radius: 8px;
  border: 1px solid #eee;
  margin-bottom: 20px;
}

@media (max-width: 768px) {
  .summary-metrics {
    flex-direction: column;
    align-items: stretch;
  }
  .metric-operator {
    text-align: center;
    transform: rotate(90deg);
  }
}

.metric-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-items: center;
  flex: 1;
}

.metric-item.highlight {
  background-color: #fff5f5;
  padding: 15px;
  border-radius: 8px;
  border: 1px dashed #dc3545;
}

.metric-label {
  font-size: 14px;
  color: #666;
}

.metric-value {
  font-size: 20px;
}

.metric-operator {
  font-size: 24px;
  font-weight: bold;
  color: #ccc;
  padding: 0 10px;
}

.text-primary { color: #0056FF; }
.text-danger { color: #dc3545; }
.text-muted { color: #888; }
.font-bold { font-weight: bold; }

.alert-banner {
  background-color: #fff3cd;
  color: #856404;
  padding: 12px 20px;
  font-size: 14px;
  border-top: 1px solid #ffeeba;
  display: flex;
  align-items: center;
  gap: 10px;
  border-radius: 6px;
  margin-bottom: 20px;
}

.chart-wrapper {
    height: 400px;
    position: relative;
    border: 1px solid #eee;
    border-radius: 8px;
    padding: 15px;
}

.chart-section {
  margin-top: 30px;
}

.section-subtitle {
  font-size: 15px;
  color: #333;
  font-weight: bold;
  margin-bottom: 15px;
  border-top: 1px dashed #eee;
  padding-top: 20px;
}

.empty-state {
    display: flex;
    justify-content: center;
    align-items: center;
    height: 100%;
    color: #888;
    font-style: italic;
    text-align: center;
}

/* Transitions */
.slide-fade-enter-active {
  transition: all 0.3s ease-out;
}
.slide-fade-leave-active {
  transition: all 0.3s cubic-bezier(1, 0.5, 0.8, 1);
}
.slide-fade-enter-from,
.slide-fade-leave-to {
  transform: translateY(-10px);
  opacity: 0;
}
</style>
