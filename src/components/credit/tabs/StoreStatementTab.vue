<template>
  <div class="store-statement-tab">
    <!-- Main Upload Section -->
    <div class="upload-section-large">
      <FileUploader
        label="รายการเดินบัญชี"
        required
        multiple
        v-model="files.bankStatement"
        :disabled="!isEditing"
      >
        <template #icon>
           <img :src="iconUploadMulti" alt="Upload" width="48" height="48" />
        </template>
      </FileUploader>
    </div>

    <!-- Payment Details Section -->
    <div class="details-section">
      <div class="section-header">
        <h3>รายละเอียดการชำระเงิน</h3>
      </div>

      <!-- Payment Method Dropdown -->
      <div class="form-group" style="max-width: 300px; margin-bottom: 20px;">
        <label>ชำระเงินโดย </label>
        <select
          class="form-control"
          :class="{ 'border-red-500': errors.paymentMethod, 'disabled': !isEditing }"
          :disabled="!isEditing"
          v-model="formData.paymentMethod"
          @change="onPaymentMethodChange"
        >
          <option value="" disabled>เลือกวิธีการชำระเงิน</option>
          <option value="โอนเงิน">โอนเงิน</option>
          <option value="รับเช็ค">รับเช็ค</option>
        </select>
        <span v-if="errors.paymentMethod" class="error-text">{{ errors.paymentMethod }}</span>
      </div>

      <!-- Bank Details Grid (Visible only when method is selected) -->
      <div v-if="formData.paymentMethod" class="form-grid-three-columns">
        <div class="form-group">
          <label>จากบัญชีธนาคาร </label>
          <input
            type="text"
            class="form-control"
            :class="{ 'border-red-500': errors.paymentBankName, 'disabled': !isEditing }"
            :disabled="!isEditing"
            v-model="formData.paymentBankName"
            placeholder="ระบุชื่อธนาคาร"
            @input="validateField('paymentBankName', formData.paymentBankName, ['required'])"
            @blur="validateField('paymentBankName', formData.paymentBankName, ['required'])"
          />
          <span v-if="errors.paymentBankName" class="error-text">{{ errors.paymentBankName }}</span>
        </div>
        <div class="form-group">
          <label>สาขา </label>
          <input
            type="text"
            class="form-control"
            :class="{ 'border-red-500': errors.paymentBankBranch, 'disabled': !isEditing }"
            :disabled="!isEditing"
            v-model="formData.paymentBankBranch"
            placeholder="ระบุสาขา"
            @input="validateField('paymentBankBranch', formData.paymentBankBranch, ['required'])"
            @blur="validateField('paymentBankBranch', formData.paymentBankBranch, ['required'])"
          />
          <span v-if="errors.paymentBankBranch" class="error-text">{{ errors.paymentBankBranch }}</span>
        </div>
        <div class="form-group">
          <label>เลขที่บัญชี </label>
          <input
            type="text"
            class="form-control"
            :class="{ 'border-red-500': errors.paymentAccountNo, 'disabled': !isEditing }"
            :disabled="!isEditing"
            v-model="formData.paymentAccountNo"
            placeholder="ระบุเลขที่บัญชี"
            @input="(e) => { restrictPhoneInput(e); validateField('paymentAccountNo', e.target.value, ['required', 'numeric']); }"
            @blur="validateField('paymentAccountNo', formData.paymentAccountNo, ['required', 'numeric'])"
          />
          <span v-if="errors.paymentAccountNo" class="error-text">{{ errors.paymentAccountNo }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { reactive, ref, watch } from 'vue';
import FileUploader from '@/components/shared/FileUploader.vue';
import { useCreditRequestStore } from '@/stores/creditRequest';
import { useFormValidation } from '@/composables/useFormValidation';
import iconUploadMulti from '@/assets/icons/upload-multi.svg';

const props = defineProps(['readOnly']);
const store = useCreditRequestStore();
const { errors, validateField, restrictPhoneInput } = useFormValidation();

const isEditing = ref(!props.readOnly);
watch(() => props.readOnly, (val) => {
  isEditing.value = !val;
});

const files = reactive({
  bankStatement: []
});

watch(() => files.bankStatement, (v) => {
  store.updateFile('bank_statement', v);
});

const formData = reactive({
  paymentMethod: '',
  paymentBankName: '',
  paymentBankBranch: '',
  paymentAccountNo: ''
});

// Watch store.customer to load initial data
watch(() => store.customer, (newVal) => {
  if (newVal) {
    formData.paymentMethod = newVal.payment_method || '';
    formData.paymentBankName = newVal.payment_bank_name || '';
    formData.paymentBankBranch = newVal.payment_bank_branch || '';
    formData.paymentAccountNo = newVal.payment_account_no || '';
  }
}, { immediate: true });

function onPaymentMethodChange() {
  validateField('paymentMethod', formData.paymentMethod, ['required']);
  saveData('payment_method', formData.paymentMethod);
}

// Watchers for other fields to save data
watch(() => formData.paymentBankName, (val) => {
  saveData('payment_bank_name', val);
});
watch(() => formData.paymentBankBranch, (val) => {
  saveData('payment_bank_branch', val);
});
watch(() => formData.paymentAccountNo, (val) => {
  saveData('payment_account_no', val);
});

function saveData(key, value) {
  const updates = {};
  updates[key] = value;
  store.saveCustomerData(updates);
}
</script>

<style scoped>
@import './shared-styles.css';

.store-statement-tab {
  padding: 10px;
}

.upload-section-large {
  margin-bottom: 30px;
}

.details-section {
  margin-top: 20px;
}

.text-red-500 {
  color: #ef4444;
}

.border-red-500 {
  border-color: #ef4444 !important;
}

.error-text {
  color: #ef4444;
  font-size: 0.8em;
  margin-top: 4px;
  display: block;
}

.form-control.disabled {
  background-color: #f5f5f5;
  color: #999;
  cursor: not-allowed;
}
</style>
