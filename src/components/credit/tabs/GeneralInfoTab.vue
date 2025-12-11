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
        <span
          class="badge-edit"
          @click="toggleEdit"
          style="cursor: pointer;"
        >
          แก้ไขข้อมูลส่วนตัว
        </span>
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
              @input="validateField('name', formData.name, ['required'])"
              @blur="validateField('name', formData.name, ['required'])"
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
              @input="validateField('position', formData.position, ['required'])"
              @blur="validateField('position', formData.position, ['required'])"
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

const isEditing = ref(false);

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
// If store.customer has data, populate local formData
// We prioritize existing local values if user already edited (handled by keep-alive implicitly, but good to be explicit if we re-mount).
// However, since we are implementing syncing, the store is the source of truth.
watch(() => store.customer, (newVal) => {
  if (newVal) {
    // Determine initial values logic.
    // If we have mapped fields in store.customer that match our form, use them.
    // The store's updateCustomerData merges updates into store.customer.
    // So store.customer always holds the latest state (original + edits).

    // Map store fields to form fields
    // Logic from original: contact_person || name
    const contact = newVal.contact_person || newVal.name || '';
    const company = newVal.contact_person ? (newVal.name || '') : (newVal.name || '');

    // Only update if formData is empty or we want to force sync?
    // Since we want 2-way sync, we should update formData if store changes.
    // But verify if it causes loop with the watcher below.
    if (formData.name !== contact) formData.name = contact;
    if (formData.companyName !== company) formData.companyName = company;

    // Other fields (position, creditAmount) might not be in store.customer initially?
    // The task is about validating and verifying inputs.
    // Assuming store.customer might hold these if we save them there.
  }
}, { immediate: true, deep: true });

// Sync changes back to store
watch(formData, (newVal) => {
  // Map back to store structure
  // We need to know which field maps to what in store.customer
  // Original logic:
  // displayName -> contact_person (or name?)
  // displayCompany -> name

  // If we edit 'name', we should update 'contact_person' if it exists, or 'name'?
  // To keep it simple and consistent with how we read it:
  // If contact_person exists, we assume 'name' maps to 'contact_person'.
  // If not, 'name' maps to 'name'.

  const updates = {};

  // Heuristic: check current store state
  if (store.customer.contact_person) {
    updates.contact_person = newVal.name;
    updates.name = newVal.companyName; // Company Name stays as Name
  } else {
    updates.name = newVal.name; // Individual name
    // If individual, Company Name might be same or separate?
    // In original code: displayCompany = data.name.
    // If we edit companyName, we update data.name.
    // This implies Name and Company Name might conflict if mapped to same field.
    // But in the UI they are separate inputs.
    // If data structure allows only one 'name', we have a problem.
    // The CSV has 'Name', 'Name 2', 'Contact'.
    // Let's assume 'name' (UI) -> 'Contact' (DB) or 'Name' (DB).

    // For now, let's update both to ensure persistence in UI at least.
    // Or better, check if we can add new properties to store.customer to hold these separately if needed.
    // But to respect the existing structure:
    updates.contact_person = newVal.name;
    // For Company Name, we update 'name' property
    updates.name = newVal.companyName;
  }

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
