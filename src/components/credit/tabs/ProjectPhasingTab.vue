<template>
  <div class="project-phasing-tab">
    <div v-if="!transactionData.projectData" class="empty-state">
      <p>กรุณาเลือกโครงการในแท็บ "ข้อมูลและเอกสารโครงการ" ก่อน</p>
    </div>

    <template v-else>
      <div class="project-summary-card">
          <div class="summary-item" style="flex: 1; max-width: 300px;">
              <span class="summary-label">มูลค่าโครงการรวม (บาท):</span>
              <input
                  type="text"
                  v-model="transactionData.adjustedProjectValue"
                  :disabled="props.readOnly"
                  @blur="formatAdjustedValue"
                  @input="handleAdjustedValueInput"
                  class="summary-input text-primary font-bold"
                  placeholder="ระบุมูลค่าโครงการ"
              />
          </div>
          <div class="summary-item" style="flex: 2;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px;">
                  <span class="summary-label">รายการสินค้าหลัก:</span>
                  <button v-if="!props.readOnly" @click="addProduct" class="btn-text-add">+ เพิ่มสินค้า</button>
              </div>
              <div v-if="transactionData.adjustedProductList && transactionData.adjustedProductList.length > 0" class="product-list">
                  <div v-for="(prod, idx) in transactionData.adjustedProductList" :key="idx" class="product-item">
                      <input
                          type="text"
                          v-model="transactionData.adjustedProductList[idx]"
                          :disabled="props.readOnly"
                          class="summary-input"
                          placeholder="ชื่อสินค้า..."
                      />
                      <button v-if="!props.readOnly" class="btn-icon-delete-small" @click="removeProduct(idx)">✕</button>
                  </div>
              </div>
              <div v-else class="text-muted" style="font-size: 14px; margin-top: 5px;">
                  (ไม่มีรายการสินค้าหลัก)
              </div>
          </div>
      </div>

      <div class="form-section">
        <div class="phasing-header">
          <h3>แผนการใช้เครดิตแบบแบ่งงวด</h3>
        </div>
        <table class="phasing-table">
          <thead>
            <tr>
              <th width="8%">งวด</th>
              <th width="38%">รายละเอียดงาน</th>
              <th width="15%">วันเบิก</th>
              <th width="15%">วันจบ</th>
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
              <td v-if="!props.readOnly" class="text-center action-col">
                <button class="btn-icon-delete" @click="removePhase(idx)" title="ลบงวดนี้">
                  ✕
                </button>
              </td>
            </tr>
            <tr v-if="transactionData.projectPhasing.length === 0 && props.readOnly">
              <td colspan="6" class="text-center empty-row">
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
                  v-if="currentProjectValueLimit > 0"
                  :class="{
                    'text-error': totalPhaseAmount > currentProjectValueLimit,
                  }"
                  class="summary-note"
                >
                  <br>(สูงสุดไม่เกินมูลค่าโครงการ {{ formatNumber(currentProjectValueLimit) }} บาท)
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

// Editable Project Summary Actions
const handleAdjustedValueInput = (event) => {
    let val = event.target.value;
    val = val.replace(/[^0-9]/g, '');
    store.transactionData.adjustedProjectValue = val;
};

const formatAdjustedValue = () => {
    const raw = store.transactionData.adjustedProjectValue;
    const num = parseFloat(String(raw).replace(/,/g, ''));
    if (!isNaN(num)) {
        store.transactionData.adjustedProjectValue = formatNumber(num);
    }
};

const addProduct = () => {
    if (!store.transactionData.adjustedProductList) {
        store.transactionData.adjustedProductList = [];
    }
    store.transactionData.adjustedProductList.push('');
};

const removeProduct = (idx) => {
    store.transactionData.adjustedProductList.splice(idx, 1);
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

const currentProjectValueLimit = computed(() => {
    if (!store.transactionData) return 0;

    // Prefer adjusted value if set, fallback to original project data value
    const adjusted = store.transactionData.adjustedProjectValue;
    if (adjusted) {
         return parseFloat(String(adjusted).replace(/,/g, '')) || 0;
    }
    return store.transactionData.projectData?.value || 0;
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

.project-summary-card {
    background-color: #f4f5f7;
    border-radius: 8px;
    padding: 15px 20px;
    margin-bottom: 25px;
    display: flex;
    flex-wrap: wrap;
    gap: 30px;
}

.summary-item {
    display: flex;
    flex-direction: column;
    gap: 4px;
}

.summary-label {
    font-size: 13px;
    color: #666;
}

.summary-value {
    font-size: 16px;
    color: #333;
}

.summary-input {
    width: 100%;
    padding: 8px 12px;
    border: 1px solid #ddd;
    border-radius: 4px;
    font-size: 16px;
    transition: border-color 0.2s;
    background-color: white;
}

.summary-input:focus {
    outline: none;
    border-color: #0056FF;
}

.summary-input:disabled {
    background-color: transparent;
    border-color: transparent;
    padding-left: 0;
    color: #333;
}

.text-primary {
    color: #0056FF;
}

.btn-text-add {
    background: none;
    border: none;
    color: #0056FF;
    font-size: 13px;
    cursor: pointer;
    font-weight: 500;
}

.btn-text-add:hover {
    text-decoration: underline;
}

.product-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.product-item {
    display: flex;
    align-items: center;
    gap: 8px;
}

.btn-icon-delete-small {
    background: none;
    border: none;
    color: #999;
    cursor: pointer;
    padding: 4px;
    border-radius: 50%;
    font-size: 14px;
    display: flex;
    align-items: center;
    justify-content: center;
}

.btn-icon-delete-small:hover {
    color: #dc3545;
    background-color: #fee2e2;
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
</style>