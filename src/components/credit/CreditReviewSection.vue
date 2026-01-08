<template>
  <div class="credit-review-section unified-card">
    <div class="review-header">
      <h4>บันทึกการพิจารณา (Review & Comments)</h4>
      <span v-if="showTerms" class="role-badge">สำหรับผู้จัดการและฝ่ายสินเชื่อ</span>
    </div>

    <div class="review-content">
      <!-- Comment History (Moved to Top) -->
      <div class="comments-history-wrapper">
         <CommentHistory :comments="comments" />
      </div>

      <!-- Separator if we have terms -->
      <div v-if="showTerms" class="section-separator"></div>

      <!-- Terms Section (Manager Only) -->
      <div v-if="showTerms" class="terms-grid-wrapper">
         <div class="form-grid-four">
            <!-- Credit Amount -->
            <div class="form-group">
                <label>วงเงินเครดิต (บาท)</label>
                <input
                type="text"
                class="form-input"
                v-model="displayAmount"
                @input="handleAmountInput"
                @blur="saveChanges"
                :disabled="readOnly"
                />
            </div>
             <!-- Terms -->
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

      <!-- New Comment Input (Bottom) -->
      <div class="new-comment-box">
        <h5 class="comment-label">ความคิดเห็น: {{ currentRole }}</h5>
        <textarea
            class="comment-input"
            placeholder="ระบุพฤติกรรมลูกค้า, ประวัติโครงการ, การซื้อขายล่าสุด, หรือข้อมูลประกอบการพิจารณาอื่นๆ..."
            :value="modelValue"
            @input="$emit('update:modelValue', $event.target.value)"
            rows="5"
            :disabled="readOnly"
        ></textarea>
      </div>
    </div>
  </div>
</template>

<script setup>
import { reactive, watch, toRefs, ref } from 'vue';
import { useCreditRequestStore } from '@/stores/creditRequest';
import CommentHistory from './CommentHistory.vue';

const props = defineProps({
  readOnly: { type: Boolean, default: false },
  showTerms: { type: Boolean, default: false },
  comments: { type: Array, default: () => [] },
  currentRole: { type: String, default: '' },
  modelValue: { type: String, default: '' } // For v-model of new comment
});

const emit = defineEmits(['update:modelValue']);

const store = useCreditRequestStore();
const { transactionData } = toRefs(store);

const formData = reactive({
  amount: '',
  termGS: '',
  termAE: '',
  termYC: ''
});

const displayAmount = ref('');

// Sync from store
watch(transactionData, (newVal) => {
  if (newVal) {
    if (formData.amount !== newVal.amount) {
        formData.amount = newVal.amount;
        // Update display amount with commas
        if (newVal.amount) {
            const num = parseFloat(newVal.amount);
            displayAmount.value = isNaN(num) ? newVal.amount : num.toLocaleString();
        } else {
            displayAmount.value = '';
        }
    }
    if (formData.termGS != newVal.termGS) formData.termGS = newVal.termGS;
    if (formData.termAE != newVal.termAE) formData.termAE = newVal.termAE;
    if (formData.termYC != newVal.termYC) formData.termYC = newVal.termYC;
  }
}, { immediate: true, deep: true });



function handleAmountInput(e) {
  // 1. Get raw value, remove commas
  let rawValue = e.target.value.replace(/,/g, '');
  
  // 2. Remove non-numeric chars (allow one dot)
  rawValue = rawValue.replace(/[^0-9.]/g, '');
  const parts = rawValue.split('.');
  if (parts.length > 2) rawValue = parts[0] + '.' + parts.slice(1).join('');

  // 3. Update internal formData (raw)
  formData.amount = rawValue;

  // 4. Update Display Value (Add Commas)
  if (rawValue) {
      const num = parseFloat(rawValue);
      // Prevent weird behavior while typing dot (e.g. "100.")
      if (rawValue.endsWith('.')) {
          displayAmount.value = num.toLocaleString() + '.';
      } else if (rawValue.includes('.') && parts[1].length > 0) {
          // Keep decimals
           displayAmount.value = rawValue.replace(/\d(?=(\d{3})+\.)/g, '$&,'); // Simplified regex or just use toLocale for display? 
           // Better user experience: just format integer part if possible, but simplest is:
           // If user is typing, we might want to just let them type and format on blur?
           // The user ASKED for "when user type 1000 I want it to display as 1,000"
           
           // Robust way:
           const parts = rawValue.split('.');
           parts[0] = parseInt(parts[0]).toLocaleString();
           displayAmount.value = parts.join('.');
      } else {
          displayAmount.value = num.toLocaleString();
      }
  } else {
      displayAmount.value = '';
  }
}

// Remove old restrictAmount if no longer used
function restrictAmount_OLD(e) {
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
.credit-review-section {
  margin-bottom: 20px;
  background-color: #f8f9fa; /* Unified light background */
  border: 1px solid #e0e0e0;
  border-radius: 8px;
}

.review-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px 20px;
  border-bottom: 1px solid #e0e0e0;
  background-color: #fff; /* Header white */
  border-radius: 8px 8px 0 0;
}

.review-header h4 {
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

.review-content {
  padding: 20px;
  display: flex;
  flex-direction: column;
}

.terms-grid-wrapper {
  margin-bottom: 20px;
}

.form-grid-four {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr 1fr; /* 4 columns for single row */
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
  width: 100%; /* Ensure full width in grid cell */
  box-sizing: border-box;
  background-color: #fff;
  color: #333;
}

.form-input:disabled {
  background-color: #e9ecef;
  color: #6c757d;
}

.section-separator {
  margin: 20px 0;
  border-top: 1px solid #e0e0e0;
}

.comments-history-wrapper {
  /* Margin handled by separator or bottom input */
}

.new-comment-box {
    /* If terms are shown, they have margin-bottom. If not, this needs top margin from history?
       Actually, if terms are hidden, we might want a separator or just margin.
    */
    margin-top: 20px;
}

/* If no terms shown, add separator after history?
   Or just spacing.
*/
.comments-history-wrapper:not(:last-child) {
    /* If followed by separator or input */
}


.comment-label {
    margin: 0 0 10px 0;
    font-size: 14px;
    font-weight: bold;
    color: #333;
}

.comment-input {
  width: 100%;
  padding: 12px;
  border: 1px solid #ced4da; /* Match input border */
  border-radius: 4px;
  background-color: #fff;
  box-sizing: border-box;
  color: black;
  font-family: inherit;
  resize: vertical;
}

/* Responsive */
@media (max-width: 768px) {
    .form-grid-four {
        grid-template-columns: 1fr 1fr; /* 2x2 on smaller screens */
    }
}
</style>
