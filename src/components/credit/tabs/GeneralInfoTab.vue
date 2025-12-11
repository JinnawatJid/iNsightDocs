<template>
  <div class="general-info-tab">
    <!-- Upload Section -->
    <div class="upload-section">
      <div class="upload-grid">
        <FileUploader
          label="สำเนาบัตรประชาชน"
          required
          v-model="files.idCard"
        />
        <FileUploader
          label="สำเนาทะเบียนบ้าน"
          required
          v-model="files.homeReg"
        />
      </div>
    </div>

    <!-- Personal Info Section -->
    <div class="personal-info-section">
      <div class="section-header">
        <h3>ตรวจสอบข้อมูลส่วนตัว</h3>
        <!-- Removed "Edit" button as per user request -->
      </div>

      <div class="form-layout-columns">
        <!-- Left Column -->
        <div class="column-layout">
          <div class="form-group">
            <label>ชื่อจริงและนามสกุล <span class="text-red-500">*</span></label>
            <input
              type="text"
              class="form-input"
              :class="{ 'border-red-500': errors.name, 'disabled': !isEditing }"
              :disabled="!isEditing"
              v-model="formData.name"
              placeholder="**ดึงข้อมูลจาก Dynamics**"
              @input="validateField('name', formData.name, ['required', 'text'])"
              @blur="validateField('name', formData.name, ['required', 'text'])"
            />
            <span v-if="errors.name" class="error-text">{{ errors.name }}</span>
          </div>
          <div class="form-group">
            <label>ตำแหน่ง <span class="text-red-500">*</span></label>
            <input
              type="text"
              class="form-input"
              :class="{ 'border-red-500': errors.position, 'disabled': !isEditing }"
              :disabled="!isEditing"
              placeholder="เจ้าหน้าที่ใส่"
              v-model="formData.position"
              @input="validateField('position', formData.position, ['required', 'text'])"
              @blur="validateField('position', formData.position, ['required', 'text'])"
            />
            <span v-if="errors.position" class="error-text">{{ errors.position }}</span>
          </div>
        </div>

        <!-- Right Column -->
        <div class="column-layout">
          <div class="form-group">
            <label>ชื่อร้าน/บริษัท <span class="text-red-500">*</span></label>
            <input
              type="text"
              class="form-input"
              :class="{ 'border-red-500': errors.companyName, 'disabled': !isEditing }"
              :disabled="!isEditing"
              v-model="formData.companyName"
              placeholder="**ดึงข้อมูลจาก Dynamics**"
              @input="validateField('companyName', formData.companyName, ['required'])"
              @blur="validateField('companyName', formData.companyName, ['required'])"
            />
            <span v-if="errors.companyName" class="error-text">{{ errors.companyName }}</span>
          </div>
          <div class="row-two-col">
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
                @blur="validateField('creditAmount', formData.creditAmount, ['required', 'numeric'])"
              />
              <span v-if="errors.creditAmount" class="error-text">{{ errors.creditAmount }}</span>
            </div>
            <div class="form-group">
              <label>เหตุผลการขอเครดิต <span class="text-red-500">*</span></label>
              <select
                class="form-input"
                :class="{ 'disabled': !isEditing }"
                :disabled="!isEditing"
                v-model="formData.creditReason"
              >
                  <option value="สต๊อคสินค้า">สต๊อคสินค้า</option>
                  <option value="รับโปรเจค">รับโปรเจค</option>
              </select>
            </div>
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

const store = useCreditRequestStore();
const { errors, validateField, restrictCreditAmountInput } = useFormValidation();

const isEditing = ref(true); // Editable by default

const files = reactive({
  idCard: null,
  homeReg: null
});

// Watch for file changes to update store for Approval Chance logic
watch(() => files.idCard, (newVal) => {
  store.updateDocumentStatus('id_card', !!newVal);
});

watch(() => files.homeReg, (newVal) => {
  store.updateDocumentStatus('home_reg', !!newVal);
});

const formData = reactive({
  name: '',
  companyName: '',
  position: '',
  creditAmount: '',
  creditReason: 'สต๊อคสินค้า'
});

// Initialize from store
watch(() => store.customer, (newVal) => {
  if (newVal) {
    // UPDATED LOGIC:
    // User confirmed: contact_person is Personal Name, name is Company Name.
    // If contact_person is undefined or null, we default to empty string.
    // We do NOT fallback to companyName for the personal name field anymore,
    // to strictly separate Personal Name vs Company Name.

    // Check if property exists.
    // If contact_person is "", it stays "".
    // If contact_person is undefined, we use "".
    const contact = (newVal.contact_person !== undefined && newVal.contact_person !== null)
      ? newVal.contact_person
      : '';

    const company = (newVal.name !== undefined && newVal.name !== null)
      ? newVal.name
      : '';

    // Only update if formData is DIFFERENT to avoid loops or unnecessary updates?
    // Actually, if we update formData, the watcher below triggers.
    // If we receive update from store, we update formData.
    // The watcher below updates store.
    // Store update triggers this watcher.
    // Loop?
    // Store update (customer obj ref change) -> this watcher -> formData update -> formData watcher -> store update -> store (obj ref change or not?)
    // If values are same, store might not trigger reactivity if object reference is same?
    // But `this.customer = { ...this.customer, ...updates }` creates new reference.
    // So we need to check equality before updating formData.

    if (formData.name !== contact) formData.name = contact;
    if (formData.companyName !== company) formData.companyName = company;
  }
}, { immediate: true, deep: true });

// Sync changes back to store
watch(formData, (newVal) => {
  const updates = {};

  // Mapping confirmed by user:
  // Personal Name (UI: name) -> contact_person (DB)
  // Company Name (UI: companyName) -> name (DB)

  updates.contact_person = newVal.name;
  updates.name = newVal.companyName;

  store.updateCustomerData(updates);
}, { deep: true });

function toggleEdit() {
  isEditing.value = !isEditing.value;
}
</script>

<style scoped>
@import './shared-styles.css';

.general-info-tab {
  padding: 10px;
}

/* Personal Info Section */
.personal-info-section {
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

/* Ensure disabled style is consistent */
.form-input.disabled {
  background-color: #f5f5f5;
  color: #999;
  cursor: not-allowed;
}
</style>
