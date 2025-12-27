<template>
  <div class="request-info-tab">
    <!-- Upload Section -->
    <div class="upload-section">
      <div class="upload-grid-three">
        <FileUploader
          label="เอกสารขอเปิดเครดิต"
          required
          v-model="files.creditApp"
          :disabled="!isEditing"
        />
        <FileUploader
          label="ใบเสนอราคา (ถ้ามี)"
          v-model="files.quotation"
          :disabled="!isEditing"
        />
        <FileUploader
          label="Bank Gurantee (ถ้ามี)"
          v-model="files.bankGuarantee"
          :disabled="!isEditing"
        />
      </div>
    </div>

    <!-- Contact Info Section -->
    <div class="personal-info-section">
      <div class="section-header">
        <h3>ตรวจสอบข้อมูลผู้ติดต่อ</h3>
        <!-- Checkbox hidden as per requirement -->
        <div class="checkbox-wrapper" v-if="false">
          <input
            type="checkbox"
            id="sameAsAuthorized"
            v-model="isSameAsAuthorized"
            :disabled="!isEditing"
          />
          <label for="sameAsAuthorized">ข้อมูลเดียวกับผู้มีอำนาจลงนาม</label>
        </div>
      </div>
      <div class="grid-three-col">
        <div class="form-group">
          <label>ชื่อผู้ติดต่อ <span class="text-red-500">*</span></label>
          <input
            type="text"
            class="form-input"
            :class="{ 'border-red-500': errors.contactName, 'disabled': !isEditing }"
            :disabled="!isEditing"
            v-model="formData.contactName"
            @input="validateField('contactName', formData.contactName, ['required', 'text'])"
            @blur="handleBlur('contactName')"
          />
          <span v-if="errors.contactName" class="error-text">{{ errors.contactName }}</span>
        </div>
        <div class="form-group">
          <label>ตำแหน่งผู้ติดต่อ <span class="text-red-500">*</span></label>
           <input
            type="text"
            class="form-input"
            :class="{ 'border-red-500': errors.contactPosition, 'disabled': !isEditing }"
            :disabled="!isEditing"
            v-model="formData.contactPosition"
            @input="validateField('contactPosition', formData.contactPosition, ['required', 'text'])"
            @blur="handleBlur('contactPosition')"
          />
          <span v-if="errors.contactPosition" class="error-text">{{ errors.contactPosition }}</span>
        </div>
        <div class="form-group">
          <label>เบอร์โทรผู้ติดต่อ <span class="text-red-500">*</span></label>
           <input
            type="text"
            class="form-input"
            :class="{ 'border-red-500': errors.contactPhone, 'disabled': !isEditing }"
            :disabled="!isEditing"
            v-model="formData.contactPhone"
            @input="validateField('contactPhone', formData.contactPhone, ['required', 'numeric'])"
            @blur="handleBlur('contactPhone')"
          />
          <span v-if="errors.contactPhone" class="error-text">{{ errors.contactPhone }}</span>
        </div>
      </div>
    </div>

    <!-- Credit Details Section -->
    <div class="personal-info-section">
      <div class="section-header">
        <h3>รายละเอียดคำขอเครดิต</h3>
      </div>
      <div class="form-layout-columns">
         <div class="column-layout">
            <div class="form-group">
              <label>วงเงินสินเชื่อที่ต้องการ <span class="text-red-500">*</span></label>
              <input
                type="text"
                class="form-input"
                :class="{ 'border-red-500': errors.creditAmount, 'disabled': !isEditing }"
                :disabled="!isEditing"
                placeholder="เจ้าหน้าที่ใส่"
                v-model="formData.creditAmount"
                @input="(e) => { restrictCreditAmountInput(e); validateField('creditAmount', e.target.value, ['required', 'numeric']); }"
                @blur="handleBlur('creditAmount')"
              />
              <span v-if="errors.creditAmount" class="error-text">{{ errors.creditAmount }}</span>
            </div>
         </div>
         <div class="column-layout">
            <div class="form-group">
              <label>เหตุผลการขอเครดิต <span class="text-red-500">*</span></label>
              <select
                class="form-input"
                :class="{ 'disabled': !isEditing }"
                :disabled="!isEditing"
                v-model="formData.creditReason"
                @change="saveToBackend"
              >
                  <option value="สต๊อคสินค้า">สต๊อคสินค้า</option>
                  <option value="รับโปรเจค">รับโปรเจค</option>
              </select>
            </div>
         </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { reactive, watch, ref } from 'vue';
import FileUploader from '@/components/shared/FileUploader.vue';
import { useCreditRequestStore } from '@/stores/creditRequest';
import { useFormValidation } from '@/composables/useFormValidation';

const props = defineProps(['readOnly']);
const store = useCreditRequestStore();
const { errors, validateField, restrictCreditAmountInput } = useFormValidation();

const isEditing = ref(!props.readOnly);
watch(() => props.readOnly, (val) => {
  isEditing.value = !val;
});

// Checkbox logic (kept but unused/hidden for now)
const isSameAsAuthorized = ref(false);

const files = reactive({
  creditApp: null,
  quotation: null,
  bankGuarantee: null
});

// Watch for file changes to update store
watch(() => files.creditApp, (newVal) => {
  store.updateFile('credit_application_doc', newVal);
});

watch(() => files.quotation, (newVal) => {
  store.updateFile('quotation_doc', newVal);
});

watch(() => files.bankGuarantee, (newVal) => {
  store.updateFile('bank_guarantee_doc', newVal);
});

// Initialize files from store (to support Edit mode or tab switching)
watch(() => store.files, (newVal) => {
  if (newVal) {
    if (newVal.credit_application_doc !== undefined) files.creditApp = newVal.credit_application_doc;
    if (newVal.quotation_doc !== undefined) files.quotation = newVal.quotation_doc;
    if (newVal.bank_guarantee_doc !== undefined) files.bankGuarantee = newVal.bank_guarantee_doc;
  }
}, { immediate: true, deep: true });

const formData = reactive({
  contactName: '',
  contactPosition: '',
  contactPhone: '',
  creditAmount: '',
  creditReason: 'สต๊อคสินค้า'
});

// Initialize from store
watch(() => store.customer, (newVal) => {
  if (newVal) {
    const contact = (newVal.contact_person !== undefined && newVal.contact_person !== null)
      ? newVal.contact_person
      : '';

    if (formData.contactName !== contact) formData.contactName = contact;
    if (formData.contactPosition !== newVal.contact_position) formData.contactPosition = newVal.contact_position || '';
    if (formData.contactPhone !== newVal.contact_phone_number) formData.contactPhone = newVal.contact_phone_number || '';
  }
}, { immediate: true, deep: true });

// Initialize Transaction Data from store
watch(() => store.transactionData, (newVal) => {
    if (newVal) {
        if (newVal.amount && formData.creditAmount !== newVal.amount) {
             formData.creditAmount = newVal.amount;
        }
        if (newVal.reason && formData.creditReason !== newVal.reason) {
             formData.creditReason = newVal.reason;
        }
    }
}, { immediate: true, deep: true });

// Sync changes locally to store
watch(formData, (newVal) => {
  const updates = {};
  updates.contact_person = newVal.contactName;
  updates.contact_position = newVal.contactPosition;
  updates.contact_phone_number = newVal.contactPhone;

  // Update store
  store.updateCustomerData(updates);

  store.updateTransactionData({
    amount: newVal.creditAmount,
    reason: newVal.creditReason
  });
}, { deep: true });

function handleBlur(field) {
    if (field === 'contactName') {
        validateField('contactName', formData.contactName, ['required', 'text']);
    } else if (field === 'contactPosition') {
        validateField('contactPosition', formData.contactPosition, ['required', 'text']);
    } else if (field === 'contactPhone') {
        validateField('contactPhone', formData.contactPhone, ['required', 'numeric']);
    } else if (field === 'creditAmount') {
        validateField('creditAmount', formData.creditAmount, ['required', 'numeric']);
    }

    saveToBackend();
}

function saveToBackend() {
    const updates = {};
    updates.contact_person = formData.contactName;
    updates.contact_position = formData.contactPosition;
    updates.contact_phone_number = formData.contactPhone;

    store.saveCustomerData(updates);
}
</script>

<style scoped>
@import './shared-styles.css';

.request-info-tab {
  padding: 10px;
}

/* Personal Info Section */
.personal-info-section {
  margin-top: 20px;
}

.section-header {
  display: flex;
  align-items: center;
  gap: 20px;
  margin-bottom: 20px;
}

.section-header h3 {
  margin: 0;
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

/* Ensure disabled style is consistent */
.form-input.disabled {
  background-color: #f5f5f5;
  color: #999;
  cursor: not-allowed;
}

.grid-three-col {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 15px;
  margin-top: 15px;
}

.upload-grid-three {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 20px;
  margin-bottom: 40px;
}

@media (max-width: 1024px) {
  .upload-grid-three {
    grid-template-columns: 1fr 1fr;
  }
}

@media (max-width: 600px) {
  .upload-grid-three {
    grid-template-columns: 1fr;
  }
}
</style>
