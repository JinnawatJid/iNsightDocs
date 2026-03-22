<template>
  <div class="project-phasing-tab">
    <div v-if="!transactionData.projectData" class="empty-state">
      <p>กรุณาเลือกโครงการในแท็บ "ข้อมูลและเอกสารโครงการ" ก่อน</p>
    </div>

    <template v-else>
      <div class="form-section">
        <div class="phasing-header">
          <h3>แผนการใช้เครดิตแบบแบ่งงวด</h3>
        </div>
        <table class="phasing-table">
          <thead>
            <tr>
              <th width="10%">งวดที่</th>
              <th width="40%">ชื่อระยะ / รายละเอียดงาน</th>
              <th width="15%">วันที่คาดว่าจะเบิก</th>
              <th width="15%">วันที่คาดว่าจะจบ</th>
              <th width="20%">จำนวนเงิน (บาท)</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(phase, idx) in transactionData.projectPhasing" :key="idx">
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
                  class="table-input text-center"
                />
              </td>
              <td>
                <input
                  type="date"
                  v-model="phase.paymentDate"
                  :disabled="props.readOnly"
                  class="table-input text-center"
                />
              </td>
              <td>
                <input
                  type="text"
                  v-model="phase.amount"
                  :disabled="props.readOnly"
                  @blur="formatPhaseAmount(idx)"
                  @input="handlePhaseAmountInput(idx, $event)"
                  class="table-input text-right"
                  placeholder="0.00"
                />
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

        <!-- Keep Total Footer separate to match design's clean table look -->
        <div class="phasing-footer">
            <div class="total-label font-bold">รวมมูลค่าตามงวด:</div>
            <div class="total-amount font-bold">
                {{ formatNumber(totalPhaseAmount) }} บาท
                <span
                  v-if="transactionData.projectData && transactionData.projectData.value"
                  :class="{
                    'text-error': totalPhaseAmount > transactionData.projectData.value,
                  }"
                  class="summary-note"
                >
                  <br>(สูงสุดไม่เกินมูลค่าโครงการ {{ formatNumber(transactionData.projectData.value) }} บาท)
                </span>
            </div>
        </div>
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

// Phasing Array Actions
const addPhase = () => {
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
</style>