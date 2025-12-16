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
        <!-- Left Column: Company Name -->
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
        </div>

        <!-- Right Column: Authorized Signatory Name -->
        <div class="column-layout">
           <div class="form-group">
            <label>ชื่อผู้มีอำนาจลงนาม <span class="text-red-500">*</span></label>
            <input
              type="text"
              class="form-input"
              :class="{ 'border-red-500': errors.authorizedName, 'disabled': !isEditing }"
              :disabled="!isEditing"
              v-model="formData.authorizedName"
              placeholder="**ดึงข้อมูลจาก Dynamics**"
              @input="validateField('authorizedName', formData.authorizedName, ['required', 'text'])"
              @blur="validateField('authorizedName', formData.authorizedName, ['required', 'text'])"
            />
            <span v-if="errors.authorizedName" class="error-text">{{ errors.authorizedName }}</span>
          </div>
          <div class="form-group">
             <label>ตำแหน่ง <span class="text-red-500">*</span></label>
            <input
              type="text"
              class="form-input"
              :class="{ 'border-red-500': errors.authorizedPosition, 'disabled': !isEditing }"
              :disabled="!isEditing"
              placeholder="เจ้าหน้าที่ใส่"
              v-model="formData.authorizedPosition"
              @input="validateField('authorizedPosition', formData.authorizedPosition, ['required', 'text'])"
              @blur="validateField('authorizedPosition', formData.authorizedPosition, ['required', 'text'])"
            />
            <span v-if="errors.authorizedPosition" class="error-text">{{ errors.authorizedPosition }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Contact Info Section (New) -->
    <div class="personal-info-section">
      <div class="section-header">
        <h3>ตรวจสอบข้อมูลผู้ติดต่อ</h3>
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
            @blur="validateField('contactName', formData.contactName, ['required', 'text'])"
          />
          <span v-if="errors.contactName" class="error-text">{{ errors.contactName }}</span>
        </div>
        <div class="form-group">
          <label>ตำแหน่ง <span class="text-red-500">*</span></label>
           <input
            type="text"
            class="form-input"
            :class="{ 'border-red-500': errors.contactPosition, 'disabled': !isEditing }"
            :disabled="!isEditing"
            v-model="formData.contactPosition"
            @input="validateField('contactPosition', formData.contactPosition, ['required', 'text'])"
            @blur="validateField('contactPosition', formData.contactPosition, ['required', 'text'])"
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
            @blur="validateField('contactPhone', formData.contactPhone, ['required', 'numeric'])"
          />
          <span v-if="errors.contactPhone" class="error-text">{{ errors.contactPhone }}</span>
        </div>
      </div>
    </div>

    <!-- Credit Info Section (Reused existing logic layout for credit part, but separated visually if needed, though previously it was mixed) -->
    <!-- The previous layout had Credit Amount and Reason in the Right Column. Now we moved Company Name to Left. -->
    <!-- Where should Credit Amount/Reason go? The user request only specified the swap and the new section. -->
    <!-- I will put Credit Amount and Reason in a new row under the Personal Info Section (first section) to keep balance, or under Contact Info? -->
    <!-- Looking at the screenshot provided by user, the "Contact Info Check" section is NEW. The "Personal Info Check" section has the name/company fields. -->
    <!-- The screenshot shows:
         Checking Personal Info
         Name | Company
         Position | Credit Amount | Credit Reason (Wait, screenshot shows: Position (Left), Credit Amount (Right), Credit Reason (Right))
    -->
    <!-- Wait, let me look at the user screenshot again. -->
    <!-- Screenshot:
         Left: Name Surname
         Left Below: Position

         Right: Company Name
         Right Below: Credit Amount | Credit Reason
    -->
    <!-- User request: "Switch position... make Company Name appear first in LEFT and Name Surname on RIGHT". -->
    <!-- So Left: Company Name. Right: Authorized Name. -->
    <!-- What about Position, Credit Amount, Reason? -->
    <!-- User didn't explicitly say move them, but usually they follow the field. -->
    <!-- "Position" was under "Name". So Authorized Position should be under Authorized Name (Right). -->
    <!-- "Credit Amount/Reason" was under "Company Name". So it should be under Company Name (Left)? -->
    <!-- Let's assume this symmetry. -->

    <!-- Adjusted Layout based on logic: -->
    <!-- Row 1: Left: Company Name, Right: Authorized Name -->
    <!-- Row 2: Left: Credit Amount | Credit Reason, Right: Authorized Position -->
    <!-- But wait, I put Authorized Position under Authorized Name in the code above. -->
    <!-- Let's fix the layout to match this logic. -->

    <div class="form-layout-columns" style="margin-top: 15px;">
        <!-- Left Column -->
        <div class="column-layout">
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
        <!-- Right Column (Empty for now as Authorized Position is grouped with Name) -->
        <div class="column-layout">
           <!-- Spacer or empty -->
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
  companyName: '',
  authorizedName: '',
  authorizedPosition: '',
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

    const company = (newVal.name !== undefined && newVal.name !== null)
      ? newVal.name
      : '';

    // Authorized Name Logic: Use authorized_person if available, else fallback to contact (for migration)
    const authName = (newVal.authorized_person) ? newVal.authorized_person : contact;

    // Contact Name Logic: Use contact_person
    const contactName = contact;

    if (formData.companyName !== company) formData.companyName = company;

    if (formData.authorizedName !== authName) formData.authorizedName = authName;
    if (formData.authorizedPosition !== newVal.authorized_position) formData.authorizedPosition = newVal.authorized_position || '';

    if (formData.contactName !== contactName) formData.contactName = contactName;
    if (formData.contactPosition !== newVal.contact_position) formData.contactPosition = newVal.contact_position || '';
    if (formData.contactPhone !== newVal.contact_phone_number) formData.contactPhone = newVal.contact_phone_number || '';
  }
}, { immediate: true, deep: true });

// Sync changes back to store
watch(formData, (newVal) => {
  const updates = {};

  // Map fields back to DB columns
  updates.name = newVal.companyName;
  updates.authorized_person = newVal.authorizedName;
  updates.authorized_position = newVal.authorizedPosition;
  updates.contact_person = newVal.contactName; // Updates existing contact_person column
  updates.contact_position = newVal.contactPosition;
  updates.contact_phone_number = newVal.contactPhone;

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

.grid-three-col {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 15px;
  margin-top: 15px;
}
</style>
