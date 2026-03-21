<template>
  <div class="project-phasing-tab">
    <div v-if="!transactionData.projectData" class="empty-state">
      <p>กรุณาเลือกโครงการในแท็บ "ข้อมูลและเอกสารโครงการ" ก่อน</p>
    </div>

    <template v-else>
      <div class="form-section">
        <div class="section-header">
          <h3>เงื่อนไขการรับประกันและการชำระเงิน</h3>
        </div>
        <div class="form-grid project-financials">
          <div class="financial-row">
            <div class="fin-col">
              <label>เงินมัดจำ (Deposit)</label>
              <div class="input-group">
                <input
                  type="number"
                  v-model="transactionData.projectDepositPercent"
                  :disabled="props.readOnly"
                  @input="calculateDepositAmount"
                  class="percent-input"
                />
                <span class="addon">%</span>
                <input
                  type="text"
                  v-model="transactionData.projectDepositAmount"
                  disabled
                  class="amount-input"
                />
                <span class="addon">บาท</span>
              </div>
            </div>
            <div class="fin-col">
              <label>หนังสือค้ำประกัน (Bank Guarantee)</label>
              <div class="input-group">
                <input
                  type="number"
                  v-model="transactionData.projectBgPercent"
                  :disabled="props.readOnly"
                  @input="calculateBgAmount"
                  class="percent-input"
                />
                <span class="addon">%</span>
                <input
                  type="text"
                  v-model="transactionData.projectBgAmount"
                  disabled
                  class="amount-input"
                />
                <span class="addon">บาท</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="form-section">
        <div class="phasing-header">
          <h3>ตารางแบ่งงวด (Phasing Plan) / แผนการสั่งซื้อ</h3>
          <button v-if="!props.readOnly" class="btn-add-phase" @click="addPhase">
            + เพิ่มงวด
          </button>
        </div>
        <table class="phasing-table">
          <thead>
            <tr>
              <th width="5%">งวดที่</th>
              <th width="35%">รายการ / รายละเอียด</th>
              <th width="20%">มูลค่า (บาท)</th>
              <th width="15%">วันคาดการณ์สั่งซื้อ</th>
              <th width="15%">วันคาดการณ์รับเงิน</th>
              <th width="10%" v-if="!props.readOnly">จัดการ</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(phase, idx) in transactionData.projectPhasing" :key="idx">
              <td class="text-center">{{ idx + 1 }}</td>
              <td>
                <input
                  type="text"
                  v-model="phase.description"
                  :disabled="props.readOnly"
                  class="table-input"
                />
              </td>
              <td>
                <input
                  type="text"
                  v-model="phase.amount"
                  :disabled="props.readOnly"
                  @blur="formatPhaseAmount(idx)"
                  @input="handlePhaseAmountInput(idx, $event)"
                  class="table-input"
                />
              </td>
              <td>
                <input
                  type="date"
                  v-model="phase.orderDate"
                  :disabled="props.readOnly"
                  class="table-input"
                />
              </td>
              <td>
                <input
                  type="date"
                  v-model="phase.paymentDate"
                  :disabled="props.readOnly"
                  class="table-input"
                />
              </td>
              <td v-if="!props.readOnly" class="text-center">
                <button class="btn-remove" @click="removePhase(idx)">ลบ</button>
              </td>
            </tr>
            <tr v-if="transactionData.projectPhasing.length === 0">
              <td :colspan="props.readOnly ? 5 : 6" class="text-center empty-row">
                ไม่มีข้อมูลตารางแบ่งงวด กดปุ่ม "เพิ่มงวด" เพื่อเพิ่มข้อมูล
              </td>
            </tr>
          </tbody>
          <tfoot>
            <tr>
              <td colspan="2" class="text-right font-bold">รวมมูลค่าตามงวด:</td>
              <td class="font-bold">{{ formatNumber(totalPhaseAmount) }}</td>
              <td :colspan="props.readOnly ? 2 : 3">
                <span
                  :class="{
                    'text-error': totalPhaseAmount > transactionData.projectData.value,
                  }"
                  class="summary-note"
                >
                  (สูงสุดไม่เกินมูลค่าโครงการ {{ formatNumber(transactionData.projectData.value) }} บาท)
                </span>
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </template>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useCreditRequestStore } from '@/stores/creditRequest';

const props = defineProps(['readOnly']);
const store = useCreditRequestStore();

const transactionData = computed({
  get: () => store.transactionData,
  set: (val) => { store.transactionData = val; }
});

const formatNumber = (num) => {
    if (!num) return '0';
    return Number(num).toLocaleString('en-US');
};

const calculateDepositAmount = () => {
    const val = store.transactionData.projectData?.value || 0;
    const pct = parseFloat(store.transactionData.projectDepositPercent) || 0;
    store.transactionData.projectDepositAmount = formatNumber((val * pct) / 100);
};

const calculateBgAmount = () => {
    const val = store.transactionData.projectData?.value || 0;
    const pct = parseFloat(store.transactionData.projectBgPercent) || 0;
    store.transactionData.projectBgAmount = formatNumber((val * pct) / 100);
};

// Phasing Array Actions
const addPhase = () => {
    if (!store.transactionData.projectPhasing) {
        store.transactionData.projectPhasing = [];
    }
    store.transactionData.projectPhasing.push({
        description: '',
        amount: '',
        orderDate: '',
        paymentDate: ''
    });
};

const removePhase = (index) => {
    store.transactionData.projectPhasing.splice(index, 1);
};

const handlePhaseAmountInput = (index, event) => {
    let val = event.target.value;
    val = val.replace(/[^0-9]/g, '');
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
    if (!store.transactionData.projectPhasing) return 0;
    return store.transactionData.projectPhasing.reduce((sum, phase) => {
        const amt = parseFloat(String(phase.amount).replace(/,/g, '')) || 0;
        return sum + amt;
    }, 0);
});
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

.form-section {
    margin-bottom: 30px;
}

.section-header {
  margin-bottom: 20px;
}

.section-header h3 {
  margin: 0;
}

.project-financials {
    padding: 20px;
    background-color: #f8f9fa;
    border: 1px solid #e0e0e0;
    border-radius: 6px;
}

.financial-row {
    display: flex;
    gap: 40px;
}

.fin-col {
    flex: 1;
}

.fin-col label {
    font-weight: 500;
    margin-bottom: 8px;
    display: block;
}

.input-group {
    display: flex;
    align-items: center;
    gap: 8px;
}

.percent-input {
    width: 80px;
    padding: 8px;
    border: 1px solid #ccc;
    border-radius: 4px;
    text-align: center;
}

.amount-input {
    flex: 1;
    padding: 8px;
    border: 1px solid #ccc;
    border-radius: 4px;
    background-color: #e9ecef;
}

.addon {
    color: #555;
    font-weight: 500;
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

.btn-add-phase {
    background-color: #28a745;
    color: white;
    border: none;
    padding: 8px 16px;
    border-radius: 4px;
    font-size: 14px;
    cursor: pointer;
    font-weight: 500;
}

.btn-add-phase:hover {
    background-color: #218838;
}

.phasing-table {
    width: 100%;
    border-collapse: collapse;
    background-color: white;
    border: 1px solid #ddd;
}

.phasing-table th, .phasing-table td {
    border: 1px solid #ddd;
    padding: 10px;
}

.phasing-table th {
    background-color: #f4f6f8;
    color: #333;
    font-weight: 600;
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

.btn-remove {
    background-color: white;
    color: #dc3545;
    border: 1px solid #dc3545;
    padding: 6px 12px;
    border-radius: 4px;
    font-size: 12px;
    cursor: pointer;
    transition: all 0.2s;
}

.btn-remove:hover {
    background-color: #dc3545;
    color: white;
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
</style>