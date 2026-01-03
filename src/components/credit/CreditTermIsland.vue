<template>
  <div class="credit-term-island unified-card">
    <div class="island-header">
      <h4>เงื่อนไขเครดิต (Credit Terms)</h4>
      <span class="role-badge">สำหรับผู้จัดการและฝ่ายสินเชื่อ</span>
    </div>
    <div class="island-content">
      <div class="form-grid-two">
         <!-- Credit Amount (Moved here for Managers) -->
         <div class="form-group">
            <label>วงเงินเครดิตที่ต้องการ (บาท)</label>
            <input
              type="text"
              class="form-input"
              v-model="formData.amount"
              @input="restrictAmount"
              @blur="saveChanges"
              :disabled="readOnly"
            />
         </div>
      </div>

      <div class="form-grid-three">
          <div class="form-group">
            <label>เครดิต (กระจก, กาว)</label>
            <input
              type="text"
              class="form-input"
              v-model="formData.termGS"
              @input="restrictNumber('termGS', $event)"
              @blur="saveChanges"
              :disabled="readOnly"
              placeholder="0"
            />
          </div>
          <div class="form-group">
            <label>เครดิต (อลูมิเนียม, Acc)</label>
            <input
              type="text"
              class="form-input"
              v-model="formData.termAE"
              @input="restrictNumber('termAE', $event)"
              @blur="saveChanges"
              :disabled="readOnly"
              placeholder="0"
            />
          </div>
          <div class="form-group">
            <label>เครดิต (ยิปซั่ม, ซีลาย)</label>
            <input
              type="text"
              class="form-input"
              v-model="formData.termYC"
              @input="restrictNumber('termYC', $event)"
              @blur="saveChanges"
              :disabled="readOnly"
              placeholder="0"
            />
          </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { reactive, watch, toRefs } from 'vue';
import { useCreditRequestStore } from '@/stores/creditRequest';

const props = defineProps({
  readOnly: {
    type: Boolean,
    default: false
  }
});

const store = useCreditRequestStore();
const { transactionData } = toRefs(store);

const formData = reactive({
  amount: '',
  termGS: '',
  termAE: '',
  termYC: ''
});

// Sync from store
watch(transactionData, (newVal) => {
  if (newVal) {
    if (formData.amount !== newVal.amount) formData.amount = newVal.amount;
    if (formData.termGS != newVal.termGS) formData.termGS = newVal.termGS;
    if (formData.termAE != newVal.termAE) formData.termAE = newVal.termAE;
    if (formData.termYC != newVal.termYC) formData.termYC = newVal.termYC;
  }
}, { immediate: true, deep: true });

function restrictAmount(e) {
  let value = e.target.value.replace(/[^0-9.]/g, '');
  const parts = value.split('.');
  if (parts.length > 2) value = parts[0] + '.' + parts.slice(1).join('');
  formData.amount = value;
}

function restrictNumber(field, e) {
  const val = e.target.value.replace(/\D/g, '');
  formData[field] = val;
}

function saveChanges() {
  store.updateTransactionData({
    amount: formData.amount,
    termGS: formData.termGS,
    termAE: formData.termAE,
    termYC: formData.termYC
  });
  store.saveTransactionData();
}
</script>

<style scoped>
.credit-term-island {
  margin-bottom: 20px;
  background-color: #f8f9fa; /* Slightly different bg to stand out as island, or white if preferred */
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 15px;
}

.island-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
  border-bottom: 1px solid #eee;
  padding-bottom: 10px;
}

.island-header h4 {
  margin: 0;
  font-size: 16px;
  font-weight: bold;
  color: #333;
}

.role-badge {
  font-size: 12px;
  background-color: #e9ecef;
  color: #666;
  padding: 2px 8px;
  border-radius: 10px;
}

.island-content {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.form-grid-two {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 15px;
}

.form-grid-three {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 15px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.form-group label {
  font-size: 14px;
  color: #333;
  font-weight: 500;
}

.form-input {
  padding: 10px;
  border: 1px solid #ced4da;
  border-radius: 4px;
  font-size: 14px;
  font-family: inherit;
}

.form-input:disabled {
  background-color: #e9ecef;
  color: #6c757d;
}

/* Match unified card style from RequestForm */
.unified-card {
  background: white;
  /* If you want it separate like a small version */
  box-shadow: 0 1px 3px rgba(0,0,0,0.05);
}
</style>
