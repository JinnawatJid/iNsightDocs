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
        <h3>รายละเอียด</h3>
        <!-- Removed Edit button -->
      </div>
      <div class="form-grid">
        <div class="form-group">
          <label>ชื่อบัญชี <span class="text-red-500">*</span></label>
          <input
            type="text"
            class="form-control"
            :class="{ 'border-red-500': errors.accountName, 'disabled': !isEditing }"
            :disabled="!isEditing"
            v-model="formData.accountName"
            placeholder="ระบุชื่อบัญชี"
            @input="validateField('accountName', formData.accountName, ['required'])"
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
            @input="(e) => { restrictPhoneInput(e); validateField('accountNumber', e.target.value, ['required', 'numeric']); }"
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
            @input="validateField('bank', formData.bank, ['required'])"
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
            @input="validateField('branch', formData.branch, ['required'])"
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
            @input="validateField('accountType', formData.accountType, ['required'])"
            @blur="validateField('accountType', formData.accountType, ['required'])"
          />
          <span v-if="errors.accountType" class="error-text">{{ errors.accountType }}</span>
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
  // Since it's multiple, we might want to store it as 'bank_statement' (array) or handle differently.
  // The store's `updateFile` expects a single value usually, but if we pass an array, we just need to handle it in FormData.
  store.updateFile('bank_statement', v);
});

const formData = reactive({
  accountName: '',
  accountNumber: '',
  bank: '',
  branch: '',
  accountType: ''
});

function toggleEdit() {
  isEditing.value = !isEditing.value;
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
