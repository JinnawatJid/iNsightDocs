<template>
  <div class="general-info-tab">
    <!-- Upload Section -->
    <div class="upload-section">
      <div class="upload-grid">
        <FileUploader
          label="สำเนาบัตรประชาชน"
          required
          v-model="files.idCard"
          :disabled="!isEditing"
        />
        <FileUploader
          label="สำเนาทะเบียนบ้าน"
          required
          v-model="files.homeReg"
          :disabled="!isEditing"
        />
      </div>
    </div>

    <!-- Company Info Section -->
    <div class="personal-info-section">
      <div class="section-header">
        <h3>ตรวจสอบข้อมูลบริษัท</h3>
      </div>
      <div class="form-layout-columns">
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
              @blur="handleBlur('companyName')"
            />
            <span v-if="errors.companyName" class="error-text">{{ errors.companyName }}</span>
          </div>
        </div>
        <div class="column-layout">
          <div class="form-group">
            <label>เลขประจำตัวผู้เสียภาษี</label>
            <input
              type="text"
              class="form-input"
              :class="{ 'disabled': !isEditing }"
              :disabled="!isEditing"
              v-model="formData.taxId"
              placeholder="ระบุเลขผู้เสียภาษี"
              @blur="saveToBackend"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- Authorized Signatories Section (Header removed) -->
    <div class="personal-info-section">
      <!-- Header removed -->

      <!-- Signatory 1 -->
      <div class="form-layout-columns">
         <div class="column-layout">
           <div class="form-group">
            <label>ชื่อผู้มีอำนาจลงนาม 1 <span class="text-red-500">*</span></label>
            <input
              type="text"
              class="form-input"
              :class="{ 'border-red-500': errors.authorizedName, 'disabled': !isEditing }"
              :disabled="!isEditing"
              v-model="formData.authorizedName"
              placeholder="**ดึงข้อมูลจาก Dynamics**"
              @input="validateField('authorizedName', formData.authorizedName, ['required', 'text'])"
              @blur="handleBlur('authorizedName')"
            />
            <span v-if="errors.authorizedName" class="error-text">{{ errors.authorizedName }}</span>
          </div>
         </div>
         <div class="column-layout">
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
              @blur="handleBlur('authorizedPosition')"
            />
            <span v-if="errors.authorizedPosition" class="error-text">{{ errors.authorizedPosition }}</span>
          </div>
         </div>
      </div>

      <!-- Signatory 2 -->
      <div class="form-layout-columns" style="margin-top: 15px;">
         <div class="column-layout">
           <div class="form-group">
            <label>ชื่อผู้มีอำนาจลงนาม 2</label>
            <input
              type="text"
              class="form-input"
              :class="{ 'disabled': !isEditing }"
              :disabled="!isEditing"
              v-model="formData.authorizedName2"
              placeholder="ระบุชื่อ"
              @blur="saveToBackend"
            />
          </div>
         </div>
         <div class="column-layout">
            <div class="form-group">
             <label>ตำแหน่ง</label>
            <input
              type="text"
              class="form-input"
              :class="{ 'disabled': !isEditing }"
              :disabled="!isEditing"
              placeholder="ระบุตำแหน่ง"
              v-model="formData.authorizedPosition2"
              @blur="saveToBackend"
            />
          </div>
         </div>
      </div>

      <!-- Business Details -->
      <div class="grid-three-col" style="margin-top: 15px;">
          <div class="form-group">
             <label>ประเภทกิจการ</label>
             <select
                class="form-input"
                :class="{ 'disabled': !isEditing }"
                :disabled="!isEditing"
                v-model="formData.businessType"
                @change="saveToBackend"
              >
                  <option value="" disabled selected>เลือกประเภท</option>
                  <option value="ซื้อมา-ขายไป">ซื้อมา-ขายไป</option>
                  <option value="บริการ">บริการ</option>
                  <option value="ผลิต">ผลิต</option>
                  <option value="รับเหมาก่อสร้าง">รับเหมาก่อสร้าง</option>
                  <option value="อื่นๆ">อื่นๆ</option>
              </select>
          </div>
          <div class="form-group">
             <label>ระบุสินค้าหลัก</label>
             <input
              type="text"
              class="form-input"
              :class="{ 'disabled': !isEditing }"
              :disabled="!isEditing"
              v-model="formData.mainProducts"
              placeholder="ระบุสินค้า"
              @blur="saveToBackend"
            />
          </div>
          <div class="form-group">
             <label>ดำเนินธุรกิจ (ปี)</label>
             <input
              type="text"
              class="form-input"
              :class="{ 'disabled': !isEditing }"
              :disabled="!isEditing"
              v-model="formData.yearsInBusiness"
              placeholder="ระบุจำนวนปี"
              @input="(e) => restrictNumeric(e)"
              @blur="saveToBackend"
            />
          </div>
      </div>
    </div>

    <!-- Contact Info Section -->
    <div class="personal-info-section">
      <div class="section-header">
        <h3>ตรวจสอบข้อมูลผู้ติดต่อ</h3>
        <div class="checkbox-wrapper">
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

    <!-- Credit Details Section (Moved to bottom) -->
    <div class="personal-info-section">
      <div class="section-header">
        <h3>รายละเอียดการขอเครดิต</h3>
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

const isSameAsAuthorized = ref(false);

const files = reactive({
  idCard: null,
  homeReg: null
});

// Watch for file changes to update store for Approval Chance logic
watch(() => files.idCard, (newVal) => {
  store.updateFile('id_card', newVal);
});

watch(() => files.homeReg, (newVal) => {
  store.updateFile('home_reg', newVal);
});

const formData = reactive({
  companyName: '',
  taxId: '',
  authorizedName: '',
  authorizedPosition: '',
  authorizedName2: '',
  authorizedPosition2: '',
  businessType: '',
  mainProducts: '',
  yearsInBusiness: '',
  contactName: '',
  contactPosition: '',
  contactPhone: '',
  creditAmount: '',
  creditReason: 'สต๊อคสินค้า'
});

function restrictNumeric(e) {
  let val = e.target.value;
  val = val.replace(/[^0-9]/g, '');
  e.target.value = val;
  formData.yearsInBusiness = val;
}

// Helper to format phone similar to StoreCompanyTab/ResidenceTab
function formatPhoneNumber(phone) {
  if (!phone) return '';
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 10) {
    return cleaned.replace(/(\d{3})(\d{3})(\d{4})/, '$1-$2-$3');
  } else if (cleaned.length === 9) {
     if (cleaned.startsWith('02')) {
       return cleaned.replace(/(\d{2})(\d{3})(\d{4})/, '$1-$2-$3');
     }
     return cleaned.replace(/(\d{3})(\d{3})(\d{3})/, '$1-$2-$3');
  }
  return phone;
}

// Watch isSameAsAuthorized for toggling
watch(isSameAsAuthorized, (isSame) => {
  if (isSame) {
    formData.contactName = formData.authorizedName;
    formData.contactPosition = formData.authorizedPosition;

    if (store.customer) {
        formData.contactPhone = formatPhoneNumber(store.customer.phone || '');
    }
  }
});

// Also watch authorized fields to sync if checkbox is checked
watch(() => [formData.authorizedName, formData.authorizedPosition], ([newName, newPos]) => {
    if (isSameAsAuthorized.value) {
        formData.contactName = newName;
        formData.contactPosition = newPos;
    }
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

    const authName = (newVal.authorized_person) ? newVal.authorized_person : contact;
    const contactName = contact;

    if (formData.companyName !== company) formData.companyName = company;

    // Tax ID
    if (formData.taxId !== newVal.tax_id) formData.taxId = newVal.tax_id || '';

    if (formData.authorizedName !== authName) formData.authorizedName = authName;
    if (formData.authorizedPosition !== newVal.authorized_position) formData.authorizedPosition = newVal.authorized_position || '';

    // New Fields
    if (formData.authorizedName2 !== newVal.authorized_person_2) formData.authorizedName2 = newVal.authorized_person_2 || '';
    if (formData.authorizedPosition2 !== newVal.authorized_position_2) formData.authorizedPosition2 = newVal.authorized_position_2 || '';
    if (formData.businessType !== newVal.business_type) formData.businessType = newVal.business_type || '';
    if (formData.mainProducts !== newVal.main_products) formData.mainProducts = newVal.main_products || '';
    if (formData.yearsInBusiness !== newVal.years_in_business) formData.yearsInBusiness = newVal.years_in_business || '';

    if (formData.contactName !== contactName) formData.contactName = contactName;
    if (formData.contactPosition !== newVal.contact_position) formData.contactPosition = newVal.contact_position || '';
    if (formData.contactPhone !== newVal.contact_phone_number) formData.contactPhone = newVal.contact_phone_number || '';
  }
}, { immediate: true, deep: true });

// Initialize Transaction Data from store (e.g. from existing request)
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

// Sync changes locally to store on change
watch(formData, (newVal) => {
  const updates = {};
  updates.name = newVal.companyName;
  updates['VAT Registration No_'] = newVal.taxId;
  updates.authorized_person = newVal.authorizedName;
  updates.authorized_position = newVal.authorizedPosition;

  updates.authorized_person_2 = newVal.authorizedName2;
  updates.authorized_position_2 = newVal.authorizedPosition2;
  updates.business_type = newVal.businessType;
  updates.main_products = newVal.mainProducts;
  updates.years_in_business = newVal.yearsInBusiness;

  updates.contact_person = newVal.contactName;
  updates.contact_position = newVal.contactPosition;
  updates.contact_phone_number = newVal.contactPhone;

  // Update store ONLY (no API call)
  store.updateCustomerData(updates);

  store.updateTransactionData({
    amount: newVal.creditAmount,
    reason: newVal.creditReason
  });
}, { deep: true });

// Handle Blur to Save to Backend + Validate
function handleBlur(field) {
    if (field === 'creditAmount') {
        validateField('creditAmount', formData.creditAmount, ['required', 'numeric']);
    } else if (field === 'companyName') {
        validateField('companyName', formData.companyName, ['required']);
    } else if (field === 'authorizedName') {
        validateField('authorizedName', formData.authorizedName, ['required', 'text']);
    } else if (field === 'authorizedPosition') {
        validateField('authorizedPosition', formData.authorizedPosition, ['required', 'text']);
    } else if (field === 'contactName') {
        validateField('contactName', formData.contactName, ['required', 'text']);
    } else if (field === 'contactPosition') {
        validateField('contactPosition', formData.contactPosition, ['required', 'text']);
    } else if (field === 'contactPhone') {
        validateField('contactPhone', formData.contactPhone, ['required', 'numeric']);
    }

    saveToBackend();
}

function saveToBackend() {
    const updates = {};
    updates.name = formData.companyName;
    updates['VAT Registration No_'] = formData.taxId;
    updates.authorized_person = formData.authorizedName;
    updates.authorized_position = formData.authorizedPosition;

    updates.authorized_person_2 = formData.authorizedName2;
    updates.authorized_position_2 = formData.authorizedPosition2;
    updates.business_type = formData.businessType;
    updates.main_products = formData.mainProducts;
    updates.years_in_business = formData.yearsInBusiness;

    updates.contact_person = formData.contactName;
    updates.contact_position = formData.contactPosition;
    updates.contact_phone_number = formData.contactPhone;

    // Call generic action to save to DB
    store.saveCustomerData(updates);
}

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
</style>
