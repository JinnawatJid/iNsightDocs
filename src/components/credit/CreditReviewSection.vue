<template>
  <div class="credit-review-section unified-card">
    <div class="review-header">
      <h4>บันทึกการพิจารณา</h4>
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
                v-model="store.transactionData.amount"
                @input="handleAmountInput"
                :disabled="readOnly"
                />
            </div>
             <!-- Terms -->
            <div class="form-group">
                <label>เครดิต (กระจก, กาว)</label>
                <input
                type="text"
                class="form-input"
                v-model="store.transactionData.termGS"
                @input="restrictNumber('termGS', $event)"
                :disabled="readOnly"
                placeholder="0"
                />
            </div>
            <div class="form-group">
                <label>เครดิต (อลูมิเนียม, Acc)</label>
                <input
                type="text"
                class="form-input"
                v-model="store.transactionData.termAE"
                @input="restrictNumber('termAE', $event)"
                :disabled="readOnly"
                placeholder="0"
                />
            </div>
            <div class="form-group">
                <label>เครดิต (ยิปซั่ม, ซีลาย)</label>
                <input
                type="text"
                class="form-input"
                v-model="store.transactionData.termYC"
                @input="restrictNumber('termYC', $event)"
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
            :placeholder="placeholderText"
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
import { useCreditRequestStore } from '@/stores/creditRequest';
import CommentHistory from './CommentHistory.vue';
import { commentPlaceholders } from '@/config/workflow';
import { computed } from 'vue';

const props = defineProps({
  readOnly: { type: Boolean, default: false },
  showTerms: { type: Boolean, default: false },
  comments: { type: Array, default: () => [] },
  currentRole: { type: String, default: '' },
  modelValue: { type: String, default: '' } // For v-model of new comment
});

const emit = defineEmits(['update:modelValue']);

const store = useCreditRequestStore();

const placeholderText = computed(() => {
    const status = store.requestStatus || 'Draft';
    // Fallback if status not found in map
    return commentPlaceholders[status] || 'ระบุพฤติกรรมลูกค้า, ประวัติโครงการ, การซื้อขายล่าสุด, หรือข้อมูลประกอบการพิจารณาอื่นๆ...';
});

function handleAmountInput(e) {
  // 1. Get raw value, remove commas
  let rawValue = e.target.value.replace(/,/g, '');
  
  // 2. Remove non-numeric chars (allow one dot)
  rawValue = rawValue.replace(/[^0-9.]/g, '');
  const parts = rawValue.split('.');
  if (parts.length > 2) rawValue = parts[0] + '.' + parts.slice(1).join('');

  // 3. Update store directly
  store.transactionData.amount = rawValue;

  // 4. Update Display Value (Force it back if needed, but usually v-model handles it)
  // If we want commas while typing, we need a local display value.
  // BUT, to keep it simple and match RequestInfoTab logic, we'll store the raw value
  // and maybe just let the user type numbers.
  // OR we just update the DOM to show commas without changing the model?
  // Let's stick to the simplest "Raw Number" approach for now to avoid the cursor jumping issues common with comma formatting.
  // If the user REALLY wants commas, we'd need a directive or a computed property with get/set.

  e.target.value = rawValue;
}

function restrictNumber(field, e) {
  const val = e.target.value.replace(/\D/g, '');
  store.transactionData[field] = val;
  e.target.value = val;
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

.new-comment-box {
    margin-top: 20px;
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
