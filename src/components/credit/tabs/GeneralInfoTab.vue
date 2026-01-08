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
            <label>ชื่อร้าน/บริษัท <span v-if="isRequired('name')" class="text-red-500">*</span></label>
            <input
              type="text"
              class="form-input"
              :class="{ 'border-red-500': errors.companyName, 'disabled': !isEditing }"
              :disabled="!isEditing"
              v-model="formData.companyName"
              placeholder="ระบุชื่อบริษัท"
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

    <!-- Authorized Signatories Section -->
    <div class="personal-info-section">
      <!-- Signatory 1 -->
      <div class="form-layout-columns">
         <div class="column-layout">
           <div class="form-group">
            <label>ชื่อผู้มีอำนาจลงนาม 1 <span v-if="isRequired('authorized_person')" class="text-red-500">*</span></label>
            <input
              type="text"
              class="form-input"
              :class="{ 'border-red-500': errors.authorizedName, 'disabled': !isEditing }"
              :disabled="!isEditing"
              v-model="formData.authorizedName"
              placeholder="ระบุชื่อผู้มีอำนาจลงนาม"
              @input="validateField('authorizedName', formData.authorizedName, ['required', 'text'])"
              @blur="handleBlur('authorizedName')"
            />
            <span v-if="errors.authorizedName" class="error-text">{{ errors.authorizedName }}</span>
          </div>
         </div>
         <div class="column-layout">
            <div class="form-group">
             <label>ตำแหน่ง <span v-if="isRequired('authorized_position')" class="text-red-500">*</span></label>
            <input
              type="text"
              class="form-input"
              :class="{ 'border-red-500': errors.authorizedPosition, 'disabled': !isEditing }"
              :disabled="!isEditing"
              placeholder="ระบุตำแหน่ง"
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
             <label>ประเภทกิจการ <span v-if="isRequired('business_type')" class="text-red-500">*</span></label>
             <select
                class="form-input"
                :class="{ 'border-red-500': errors.businessType, 'disabled': !isEditing }"
                :disabled="!isEditing"
                v-model="formData.businessType"
                @change="() => { validateField('businessType', formData.businessType, ['required']); saveToBackend(); }"
              >
                  <option value="" disabled selected>เลือกประเภท</option>
                  <option v-for="type in validBusinessTypes" :key="type" :value="type">{{ type }}</option>
                  <option value="อื่นๆ">อื่นๆ</option>
              </select>
              <span v-if="errors.businessType" class="error-text">{{ errors.businessType }}</span>
              <input
                v-if="formData.businessType === 'อื่นๆ'"
                type="text"
                class="form-input"
                style="margin-top: 10px;"
                :class="{ 'border-red-500': errors.businessTypeOther, 'disabled': !isEditing }"
                :disabled="!isEditing"
                v-model="formData.businessTypeOther"
                placeholder="ระบุประเภทกิจการ"
                @input="validateField('businessTypeOther', formData.businessTypeOther, ['required'])"
                @blur="saveToBackend"
              />
          </div>
          <div class="form-group">
             <label>ระบุสินค้าหลัก <span v-if="isRequired('main_products')" class="text-red-500">*</span></label>
             <input
              type="text"
              class="form-input"
              :class="{ 'border-red-500': errors.mainProducts, 'disabled': !isEditing }"
              :disabled="!isEditing"
              v-model="formData.mainProducts"
              placeholder="ระบุสินค้า"
              @input="validateField('mainProducts', formData.mainProducts, ['required'])"
              @blur="saveToBackend"
            />
            <span v-if="errors.mainProducts" class="error-text">{{ errors.mainProducts }}</span>
          </div>
          <div class="form-group">
             <label>ดำเนินธุรกิจ (ปี) <span v-if="isRequired('years_in_business')" class="text-red-500">*</span></label>
             <input
              type="text"
              class="form-input"
              :class="{ 'border-red-500': errors.yearsInBusiness, 'disabled': !isEditing }"
              :disabled="!isEditing"
              v-model="formData.yearsInBusiness"
              placeholder="ระบุจำนวนปี"
              @input="(e) => { restrictNumeric(e); validateField('yearsInBusiness', formData.yearsInBusiness, ['required']); }"
              @blur="saveToBackend"
            />
            <span v-if="errors.yearsInBusiness" class="error-text">{{ errors.yearsInBusiness }}</span>
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
import { mandatoryStoreKeys } from '@/config/mandatoryFields';

const props = defineProps(['readOnly']);
const store = useCreditRequestStore();
const { errors, validateField } = useFormValidation();

const isEditing = ref(!props.readOnly);
watch(() => props.readOnly, (val) => {
  isEditing.value = !val;
});



function isRequired(storeKey) {
    return mandatoryStoreKeys.fields.includes(storeKey);
}

const validBusinessTypes = [
  'ผู้ติดตั้งรายใหญ่',
  'ผู้ติดตั้งรายย่อย',
  'ซื้อมาขายไป',
  'โรงงานอุตสาหกรรม',
  'รับเหมาก่อสร้าง',
  'ร้านทำกรอบรูป'
];

const files = reactive({
  idCard: null,
  homeReg: null
});

// Watch store.files to hydrate local files (for Read Only view)
watch(() => store.files, (newVal) => {
  // Correctly sync local state with store, including clearing files if null/undefined
  files.idCard = newVal?.id_card || null;
  files.homeReg = newVal?.home_reg || null;
}, { immediate: true, deep: true });

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
  businessTypeOther: '',
  mainProducts: '',
  yearsInBusiness: ''
});

function restrictNumeric(e) {
  let val = e.target.value;
  val = val.replace(/[^0-9]/g, '');
  e.target.value = val;
  formData.yearsInBusiness = val;
}

// Initialize from store
watch(() => store.customer, (newVal, oldVal) => {
  if (newVal) {
    // Check if it's a new customer search (ID changed)
    const isNewCustomer = !oldVal || (newVal.id !== oldVal.id);

    const contact = (newVal.contact_person !== undefined && newVal.contact_person !== null)
      ? newVal.contact_person
      : '';

    const company = (newVal.name !== undefined && newVal.name !== null)
      ? newVal.name
      : '';

    const authName = (newVal.authorized_person) ? newVal.authorized_person : contact;

    if (formData.companyName !== company) formData.companyName = company;

    // Tax ID
    if (formData.taxId !== newVal.tax_id) formData.taxId = newVal.tax_id || '';

    if (formData.authorizedName !== authName) formData.authorizedName = authName;
    if (formData.authorizedPosition !== newVal.authorized_position) formData.authorizedPosition = newVal.authorized_position || '';

    // New Fields
    if (formData.authorizedName2 !== newVal.authorized_person_2) formData.authorizedName2 = newVal.authorized_person_2 || '';
    if (formData.authorizedPosition2 !== newVal.authorized_position_2) formData.authorizedPosition2 = newVal.authorized_position_2 || '';

    // Business Type Logic
    const businessVal = newVal.business_type || '';
    if (validBusinessTypes.includes(businessVal)) {
        formData.businessType = businessVal;
        formData.businessTypeOther = '';
    } else if (businessVal) {
        formData.businessType = 'อื่นๆ';
        formData.businessTypeOther = businessVal;
    } else {
        if (isNewCustomer || formData.businessType !== 'อื่นๆ') {
            formData.businessType = '';
            formData.businessTypeOther = '';
        }
    }

    if (formData.mainProducts !== newVal.main_products) formData.mainProducts = newVal.main_products || '';
    if (formData.yearsInBusiness !== newVal.years_in_business) formData.yearsInBusiness = newVal.years_in_business || '';
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

  // Combine Business Type
  updates.business_type = newVal.businessType === 'อื่นๆ' ? newVal.businessTypeOther : newVal.businessType;

  updates.main_products = newVal.mainProducts;
  updates.years_in_business = newVal.yearsInBusiness;

  // Update store ONLY (no API call)
  store.updateCustomerData(updates);
}, { deep: true });

// Handle Blur to Save to Backend + Validate
function handleBlur(field) {
    if (field === 'companyName') {
        validateField('companyName', formData.companyName, ['required']);
    } else if (field === 'authorizedName') {
        validateField('authorizedName', formData.authorizedName, ['required', 'text']);
    } else if (field === 'authorizedPosition') {
        validateField('authorizedPosition', formData.authorizedPosition, ['required', 'text']);
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

    // Combine Business Type
    updates.business_type = formData.businessType === 'อื่นๆ' ? formData.businessTypeOther : formData.businessType;

    updates.main_products = formData.mainProducts;
    updates.years_in_business = formData.yearsInBusiness;

    // Call generic action to save to DB
    store.updateCustomerData(updates);
}

function toggleEdit() {
  isEditing.value = !isEditing.value;
}

// Validation Watcher (Moved to end)
watch(() => store.showValidationErrors, (val) => {
    if (val) {
        validateField('companyName', formData.companyName, ['required']);
        validateField('authorizedName', formData.authorizedName, ['required', 'text']);
        validateField('authorizedPosition', formData.authorizedPosition, ['required', 'text']);

        // Business Details Validation
        validateField('businessType', formData.businessType, ['required']);
        if (formData.businessType === 'อื่นๆ') {
             validateField('businessTypeOther', formData.businessTypeOther, ['required']);
        }
        validateField('mainProducts', formData.mainProducts, ['required']);
        validateField('yearsInBusiness', formData.yearsInBusiness, ['required']);
    }
}, { immediate: true });
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
