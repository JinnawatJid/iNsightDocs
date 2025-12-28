<template>
  <div class="request-info-tab">
    <!-- Upload Section -->
    <div class="upload-section">
      <div class="upload-grid">
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
          label="Bank Guarantee (ถ้ามี)"
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

      <!-- New Layout: 2 Rows -->
      <div class="contact-grid-layout">
        <!-- Row 1 -->
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
          <label>ตำแหน่ง <span class="text-red-500">*</span></label>
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
          <label>แผนก</label>
           <input
            type="text"
            class="form-input"
            :class="{ 'border-red-500': errors.contactDepartment, 'disabled': !isEditing }"
            :disabled="!isEditing"
            v-model="formData.contactDepartment"
            @input="validateField('contactDepartment', formData.contactDepartment, ['text'])"
            @blur="handleBlur('contactDepartment')"
          />
          <span v-if="errors.contactDepartment" class="error-text">{{ errors.contactDepartment }}</span>
        </div>

        <!-- Row 2 -->
        <div class="form-group">
          <label>ฝ่าย</label>
           <input
            type="text"
            class="form-input"
            :class="{ 'border-red-500': errors.contactDivision, 'disabled': !isEditing }"
            :disabled="!isEditing"
            v-model="formData.contactDivision"
            @input="validateField('contactDivision', formData.contactDivision, ['text'])"
            @blur="handleBlur('contactDivision')"
          />
          <span v-if="errors.contactDivision" class="error-text">{{ errors.contactDivision }}</span>
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
        <div class="form-group"></div> <!-- Empty Placeholder -->
      </div>
    </div>

    <!-- Credit Details Section -->
    <div class="personal-info-section">
      <div class="section-header">
        <h3>รายละเอียดคำขอเครดิต</h3>
      </div>
      <div class="form-grid-three-columns">
            <div class="form-group">
              <label>วงเงินเครดิตทีต้องการ (บาท) <span class="text-red-500">*</span></label>
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

            <div class="form-group">
               <label>ระยะเวลาเครดิต (วัน)</label>
               <input
                type="text"
                class="form-input"
                :class="{ 'disabled': !isEditing }"
                :disabled="!isEditing"
                v-model="formData.creditTerm"
                @input="(e) => { e.target.value = e.target.value.replace(/\D/g, ''); formData.creditTerm = e.target.value; }"
                @blur="saveToBackend"
              />
            </div>

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

      <!-- Billing Information Section -->
      <div class="billing-info-section">

        <!-- New Dropdown Row -->
        <div class="billing-dropdown-grid">
            <div class="form-group">
               <label>ต้องมีการวางบิลหรือไม่</label>
               <select
                  class="form-input"
                  :class="{ 'disabled': !isEditing }"
                  :disabled="!isEditing"
                  v-model="formData.billingRequirement"
                  @change="saveToBackend"
                >
                    <option value="required">ต้องการ</option>
                    <option value="not_required">ไม่ต้องการ</option>
                    <option value="other">อื่นๆ (ระบุ)</option>
                </select>
                <!-- Other Input for Requirement -->
                <div v-if="formData.billingRequirement === 'other'" style="margin-top: 10px;">
                    <input
                        type="text"
                        class="form-input"
                        placeholder="ระบุ (ถ้ามี)"
                        v-model="formData.billingRequirementNote"
                        :disabled="!isEditing"
                        @blur="saveToBackend"
                    >
                </div>
            </div>

            <div class="form-group" v-if="formData.billingRequirement === 'required'">
               <label>กรณีต้องวางบิลขอให้เลือกวิธีวางบิล</label>
               <select
                  class="form-input"
                  :class="{ 'disabled': !isEditing }"
                  :disabled="!isEditing"
                  v-model="formData.billingMethod"
                  @change="saveToBackend"
                >
                    <option value="delivery">พร้อมการส่งมอบสินค้า</option>
                    <option value="mail">ทางไปรษณีย์</option>
                    <option value="company">ที่บริษัท ร้านค้า</option>
                    <option value="other">อื่นๆ</option>
                </select>
                 <!-- Other Input for Method -->
                 <div v-if="formData.billingMethod === 'other'" style="margin-top: 10px;">
                    <input
                        type="text"
                        class="form-input"
                        placeholder="ระบุ"
                        v-model="formData.billingMethodNote"
                        :disabled="!isEditing"
                        @blur="saveToBackend"
                    >
                </div>
            </div>
            <!-- Empty column if not required, to keep alignment if needed, or simply let the first col be alone -->
            <div class="form-group" v-else></div>
        </div>

        <div v-if="formData.billingRequirement !== 'not_required'">
            <div class="billing-details-grid">
                 <div class="form-group full-width">
                    <label>กำหนดวัน-เวลาวางบิล</label>
                    <input
                      type="text"
                      class="form-input"
                      v-model="formData.billingSchedule"
                      :disabled="!isEditing"
                      @blur="saveToBackend"
                    >
                 </div>
                 <div class="form-group full-width">
                    <label>ชื่อผู้ติดต่อรับวางบิล</label>
                    <input
                      type="text"
                      class="form-input"
                      v-model="formData.billingContact"
                      :disabled="!isEditing"
                      @blur="saveToBackend"
                    >
                 </div>
                 <div class="form-group full-width">
                    <label>แผนก</label>
                    <input
                      type="text"
                      class="form-input"
                      v-model="formData.billingDepartment"
                      :disabled="!isEditing"
                      @blur="saveToBackend"
                    >
                 </div>
            </div>

            <div class="billing-contact-grid">
                 <div class="form-group">
                    <label>โทรศัพท์</label>
                    <input
                      type="text"
                      class="form-input"
                      v-model="formData.billingPhone"
                      :disabled="!isEditing"
                      @blur="saveToBackend"
                    >
                 </div>
                 <div class="form-group">
                    <label>มือถือ</label>
                    <input
                      type="text"
                      class="form-input"
                      v-model="formData.billingMobile"
                      :disabled="!isEditing"
                      @blur="saveToBackend"
                    >
                 </div>
                 <div class="form-group">
                    <label>อีเมล</label>
                    <input
                      type="text"
                      class="form-input"
                      v-model="formData.billingEmail"
                      :disabled="!isEditing"
                      @blur="saveToBackend"
                    >
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
  contactDepartment: '',
  contactDivision: '',
  contactPhone: '',
  creditAmount: '',
  creditTerm: '',
  creditReason: 'สต๊อคสินค้า',
  // Billing Info
  billingRequirement: 'not_required', // default
  billingRequirementNote: '',
  billingMethod: '',
  billingMethodNote: '',
  billingSchedule: '',
  billingContact: '',
  billingDepartment: '',
  billingPhone: '',
  billingMobile: '',
  billingEmail: ''
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
    if (formData.contactDepartment !== newVal.contact_department) formData.contactDepartment = newVal.contact_department || '';
    if (formData.contactDivision !== newVal.contact_division) formData.contactDivision = newVal.contact_division || '';

    // Billing Info Initialization
    if (formData.billingRequirement !== newVal.billing_requirement && newVal.billing_requirement) formData.billingRequirement = newVal.billing_requirement;
    if (formData.billingRequirementNote !== newVal.billing_requirement_note) formData.billingRequirementNote = newVal.billing_requirement_note || '';
    if (formData.billingMethod !== newVal.billing_method) formData.billingMethod = newVal.billing_method || '';
    if (formData.billingMethodNote !== newVal.billing_method_note) formData.billingMethodNote = newVal.billing_method_note || '';
    if (formData.billingSchedule !== newVal.billing_schedule) formData.billingSchedule = newVal.billing_schedule || '';
    if (formData.billingContact !== newVal.billing_contact) formData.billingContact = newVal.billing_contact || '';
    if (formData.billingDepartment !== newVal.billing_department) formData.billingDepartment = newVal.billing_department || '';
    if (formData.billingPhone !== newVal.billing_phone) formData.billingPhone = newVal.billing_phone || '';
    if (formData.billingMobile !== newVal.billing_mobile) formData.billingMobile = newVal.billing_mobile || '';
    if (formData.billingEmail !== newVal.billing_email) formData.billingEmail = newVal.billing_email || '';
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
        if (newVal.creditTerm && formData.creditTerm !== newVal.creditTerm) {
             formData.creditTerm = newVal.creditTerm;
        }
    }
}, { immediate: true, deep: true });

// Sync changes locally to store
watch(formData, (newVal) => {
  const updates = {};
  updates.contact_person = newVal.contactName;
  updates.contact_position = newVal.contactPosition;
  updates.contact_phone_number = newVal.contactPhone;
  updates.contact_department = newVal.contactDepartment;
  updates.contact_division = newVal.contactDivision;

  // Billing Info Updates
  updates.billing_requirement = newVal.billingRequirement;
  updates.billing_requirement_note = newVal.billingRequirementNote;
  updates.billing_method = newVal.billingMethod;
  updates.billing_method_note = newVal.billingMethodNote;
  updates.billing_schedule = newVal.billingSchedule;
  updates.billing_contact = newVal.billingContact;
  updates.billing_department = newVal.billingDepartment;
  updates.billing_phone = newVal.billingPhone;
  updates.billing_mobile = newVal.billingMobile;
  updates.billing_email = newVal.billingEmail;

  // Update store
  store.updateCustomerData(updates);

  store.updateTransactionData({
    amount: newVal.creditAmount,
    reason: newVal.creditReason,
    creditTerm: newVal.creditTerm
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
    } else if (field === 'contactDepartment') {
        validateField('contactDepartment', formData.contactDepartment, ['text']);
    } else if (field === 'contactDivision') {
        validateField('contactDivision', formData.contactDivision, ['text']);
    }

    saveToBackend();
}

function saveToBackend() {
    const updates = {};
    updates.contact_person = formData.contactName;
    updates.contact_position = formData.contactPosition;
    updates.contact_phone_number = formData.contactPhone;
    updates.contact_department = formData.contactDepartment;
    updates.contact_division = formData.contactDivision;

    // Billing Info Save
    updates.billing_requirement = formData.billingRequirement;
    updates.billing_requirement_note = formData.billingRequirementNote;
    updates.billing_method = formData.billingMethod;
    updates.billing_method_note = formData.billingMethodNote;
    updates.billing_schedule = formData.billingSchedule;
    updates.billing_contact = formData.billingContact;
    updates.billing_department = formData.billingDepartment;
    updates.billing_phone = formData.billingPhone;
    updates.billing_mobile = formData.billingMobile;
    updates.billing_email = formData.billingEmail;

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

/* Updated Grid for 2 Rows */
.contact-grid-layout {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 15px;
  margin-top: 15px;
}

.upload-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  margin-bottom: 40px;
}

/* Billing Info Styles */
.billing-info-section {
  display: flex;
  flex-direction: column;
  gap: 20px;
  margin-top: 20px; /* Add margin-top since divider is gone */
}

.billing-dropdown-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 15px;
}

.billing-details-grid {
    display: grid;
    grid-template-columns: 1.5fr 1fr 1fr;
    gap: 15px;
}

.billing-contact-grid {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: 15px;
}

.full-width {
    width: 100%;
}
</style>
