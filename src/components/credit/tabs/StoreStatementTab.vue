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

    <!-- Details Section -->
    <div class="details-section">
      <div class="section-header">
        <h3>Payment Details</h3>
      </div>
      <div class="form-grid">
        <!-- Payment Method -->
        <div class="form-group">
          <label>Payment Method <span class="text-red-500">*</span></label>
          <select
            class="form-control"
            :class="{ 'border-red-500': errors.paymentMethod, 'disabled': !isEditing }"
            :disabled="!isEditing"
            v-model="formData.paymentMethod"
            @change="updateStore('paymentMethod', formData.paymentMethod); validateField('paymentMethod', formData.paymentMethod, ['required'])"
            @blur="validateField('paymentMethod', formData.paymentMethod, ['required'])"
          >
            <option value="" disabled>Select Method</option>
            <option value="Transfer">Transfer</option>
            <option value="Cheque">Cheque</option>
          </select>
          <span v-if="errors.paymentMethod" class="error-text">{{ errors.paymentMethod }}</span>
        </div>

        <template v-if="formData.paymentMethod === 'Transfer' || formData.paymentMethod === 'Cheque'">
            <div class="form-group">
              <label>ชื่อบัญชี <span class="text-red-500">*</span></label>
              <input
                type="text"
                class="form-control"
                :class="{ 'border-red-500': errors.accountName, 'disabled': !isEditing }"
                :disabled="!isEditing"
                v-model="formData.accountName"
                placeholder="ระบุชื่อบัญชี"
                @input="updateStore('accountName', formData.accountName); validateField('accountName', formData.accountName, ['required'])"
                @blur="validateField('accountName', formData.accountName, ['required'])"
              />
              <span v-if="errors.accountName" class="error-text">{{ errors.accountName }}</span>
            </div>

            <div class="form-group">
              <label>เลขที่บัญชี <span class="text-red-500">*</span></label>
              <input
                type="text"
                class="form-control"
                :class="{ 'border-red-500': errors.accountNumber, 'disabled': !isEditing }"
                :disabled="!isEditing"
                v-model="formData.accountNumber"
                placeholder="ระบุเลขที่บัญชี"
                @input="(e) => { restrictPhoneInput(e); updateStore('paymentAccountNo', e.target.value); validateField('accountNumber', e.target.value, ['required', 'numeric']); }"
                @blur="validateField('accountNumber', formData.accountNumber, ['required', 'numeric'])"
              />
              <span v-if="errors.accountNumber" class="error-text">{{ errors.accountNumber }}</span>
            </div>

            <div class="form-group">
              <label>ธนาคาร <span class="text-red-500">*</span></label>
              <input
                type="text"
                class="form-control"
                :class="{ 'border-red-500': errors.bank, 'disabled': !isEditing }"
                :disabled="!isEditing"
                v-model="formData.bank"
                placeholder="ระบุธนาคาร"
                @input="updateStore('paymentBank', formData.bank); validateField('bank', formData.bank, ['required'])"
                @blur="validateField('bank', formData.bank, ['required'])"
              />
              <span v-if="errors.bank" class="error-text">{{ errors.bank }}</span>
            </div>

            <div class="form-group">
              <label>สาขา <span class="text-red-500">*</span></label>
              <input
                type="text"
                class="form-control"
                :class="{ 'border-red-500': errors.branch, 'disabled': !isEditing }"
                :disabled="!isEditing"
                v-model="formData.branch"
                placeholder="ระบุสาขา"
                @input="updateStore('paymentBranch', formData.branch); validateField('branch', formData.branch, ['required'])"
                @blur="validateField('branch', formData.branch, ['required'])"
              />
              <span v-if="errors.branch" class="error-text">{{ errors.branch }}</span>
            </div>

            <div class="form-group">
              <label>ประเภทบัญชี <span class="text-red-500">*</span></label>
              <input
                type="text"
                class="form-control"
                :class="{ 'border-red-500': errors.accountType, 'disabled': !isEditing }"
                :disabled="!isEditing"
                v-model="formData.accountType"
                placeholder="ระบุประเภทบัญชี"
                @input="updateStore('accountType', formData.accountType); validateField('accountType', formData.accountType, ['required'])"
                @blur="validateField('accountType', formData.accountType, ['required'])"
              />
              <span v-if="errors.accountType" class="error-text">{{ errors.accountType }}</span>
            </div>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup>
import { reactive, ref, watch, onMounted } from 'vue';
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
  accountName: '',
  accountNumber: '',
  bank: '',
  branch: '',
  accountType: '',
  paymentMethod: ''
});

// Sync from store on mount/update
watch(() => store.transactionData, (newVal) => {
  if (newVal) {
    formData.paymentMethod = newVal.paymentMethod || '';
    formData.bank = newVal.paymentBank || '';
    formData.branch = newVal.paymentBranch || '';
    formData.accountNumber = newVal.paymentAccountNo || '';
  }
}, { immediate: true, deep: true });

// Also check customer snapshot for non-persisted fields (accountName, accountType)
watch(() => store.customer, (newVal) => {
  if (newVal) {
    formData.accountName = newVal.accountName || '';
    formData.accountType = newVal.accountType || '';
  }
}, { immediate: true, deep: true });


function updateStore(field, value) {
  // Map local fields to store structure
  const transactionUpdates = {};
  const customerUpdates = {};

  if (field === 'paymentMethod') transactionUpdates.paymentMethod = value;
  if (field === 'paymentBank') transactionUpdates.paymentBank = value;
  if (field === 'paymentBranch') transactionUpdates.paymentBranch = value;
  if (field === 'paymentAccountNo') transactionUpdates.paymentAccountNo = value;

  // Non-persisted fields go to customer snapshot logic
  if (field === 'accountName') customerUpdates.accountName = value;
  if (field === 'accountType') customerUpdates.accountType = value;

  if (Object.keys(transactionUpdates).length > 0) {
    store.updateTransactionData(transactionUpdates);
  }

  if (Object.keys(customerUpdates).length > 0) {
    store.updateCustomerData(customerUpdates);
  }
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
