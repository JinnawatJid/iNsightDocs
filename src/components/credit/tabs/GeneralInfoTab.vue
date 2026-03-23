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
          multiple
        />
        <FileUploader
          label="สำเนาทะเบียนบ้าน"
          required
          v-model="files.homeReg"
          :disabled="!isEditing"
          multiple
        />
      </div>

      <!-- Other Documents Section -->
      <OtherDocumentsSection tabName="general" :readOnly="!isEditing" />
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
              v-model="formData.companyName" :data-empty="!formData.companyName"
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
              v-model="formData.taxId" :data-empty="!formData.taxId"
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
            <label>ชื่อผู้มีอำนาจลงนาม <span v-if="isRequired('authorized_person')" class="text-red-500">*</span></label>
            <input
              type="text"
              class="form-input"
              :class="{ 'border-red-500': errors.authorizedName, 'disabled': !isEditing }"
              :disabled="!isEditing"
              v-model="formData.authorizedName" :data-empty="!formData.authorizedName"
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
              v-model="formData.authorizedPosition" :data-empty="!formData.authorizedPosition"
              @input="validateField('authorizedPosition', formData.authorizedPosition, ['required', 'text'])"
              @blur="handleBlur('authorizedPosition')"
            />
            <span v-if="errors.authorizedPosition" class="error-text">{{ errors.authorizedPosition }}</span>
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
                v-model="formData.businessType" :data-empty="!formData.businessType"
                @change="() => { validateField('businessType', formData.businessType, ['required']); saveToBackend(); }"
              >
                  <option value="" disabled selected>เลือกประเภท</option>
                  <option v-for="type in businessTypeOptions" :key="type.code" :value="type.name">{{ type.code }} - {{ type.name }}</option>
                  <option value="Other">O - Other</option>
              </select>
              <span v-if="errors.businessType" class="error-text">{{ errors.businessType }}</span>
              <input
                v-if="formData.businessType === 'Other'"
                type="text"
                class="form-input"
                style="margin-top: 10px;"
                :class="{ 'border-red-500': errors.businessTypeOther, 'disabled': !isEditing }"
                :disabled="!isEditing"
                v-model="formData.businessTypeOther" :data-empty="!formData.businessTypeOther"
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
              v-model="formData.mainProducts" :data-empty="!formData.mainProducts"
              placeholder="ระบุสินค้า"
              @input="validateField('mainProducts', formData.mainProducts, ['required'])"
              @blur="saveToBackend"
            />
            <span v-if="errors.mainProducts" class="error-text">{{ errors.mainProducts }}</span>
          </div>
          <div class="form-group">
             <label>ดำเนินธุรกิจ (ปี หรือ พ.ศ. ที่จัดตั้ง) <span v-if="isRequired('years_in_business')" class="text-red-500">*</span></label>
             <input
              type="text"
              class="form-input"
              :class="{ 'border-red-500': errors.yearsInBusiness, 'disabled': !isEditing }"
              :disabled="!isEditing"
              v-model="formData.yearsInBusiness" :data-empty="!formData.yearsInBusiness"
              placeholder="ระบุจำนวนปี (หรือปี พ.ศ. ที่จัดตั้ง)"
              @input="(e) => { restrictNumeric(e); validateField('yearsInBusiness', formData.yearsInBusiness, ['required']); }"
              @blur="handleYearsInBusinessBlur"
            />
            <span v-if="errors.yearsInBusiness" class="error-text">{{ errors.yearsInBusiness }}</span>
          </div>
      </div>
    </div>


    <!-- Tungnam Relationship Section -->
    <div class="personal-info-section">
      <div class="section-separator"></div>
      <div class="section-header">
        <h3>ความสัมพันธ์กับลูกค้ารายอื่นของตังน้ำ <span v-if="isRequired('has_tungnam_relationship')" class="text-red-500">*</span></h3>
      </div>

      <div class="form-group" style="margin-bottom: 20px;">
        <div class="radio-group-horizontal">
            <label class="radio-label">
              <input
                type="radio"
                value="yes"
                v-model="store.customer.has_tungnam_relationship" :data-empty="!store.customer.has_tungnam_relationship"
                :disabled="!isEditing"
                @change="handleTungnamRelationshipChange"
              >
              มี
            </label>
            <label class="radio-label">
              <input
                type="radio"
                value="no"
                v-model="store.customer.has_tungnam_relationship" :data-empty="!store.customer.has_tungnam_relationship"
                :disabled="!isEditing"
                @change="handleTungnamRelationshipChange"
              >
              ไม่มี
            </label>
        </div>
        <span v-if="localErrors.has_tungnam_relationship" class="error-text">กรุณาระบุข้อมูล</span>
      </div>

      <div v-if="store.customer.has_tungnam_relationship === 'yes'" class="tungnam-relationship-container">
        <div class="form-layout-columns" style="margin-bottom: 20px; align-items: flex-start; grid-template-columns: 1fr 2fr;">
            <!-- Input field for explicit relationship description -->
            <div class="column-layout">
               <div class="form-group">
                   <label>ความสัมพันธ์ <span class="text-red-500">*</span></label>
                   <input
                      type="text"
                      class="form-input"
                      :class="{ 'border-red-500': localErrors.tungnam_relationship_note, 'disabled': !isEditing }"
                      :disabled="!isEditing"
                      v-model="store.customer.tungnam_relationship_note" :data-empty="!store.customer.tungnam_relationship_note"
                      placeholder="ระบุความสัมพันธ์"
                      @blur="saveTungnamRelationship"
                    />
                    <span v-if="localErrors.tungnam_relationship_note" class="error-text">กรุณาระบุข้อมูล</span>
                </div>
            </div>

            <!-- Search Input like CreditRequestHeader -->
            <div class="column-layout">
               <div class="form-group search-section" style="max-width: none; margin-bottom: 0;">
                    <label>รหัสลูกค้าหรือชื่อ <span class="text-red-500">*</span></label>
                    <div class="search-group" ref="searchContainer">
                        <div class="search-icon">
                           <img src="@/assets/icons/search-bi.svg" alt="Search" width="16" height="16" />
                        </div>
                        <input
                          type="text"
                          class="form-input search-input-field"
                          :class="{ 'border-red-500': localErrors.tungnam_relationship_customer_id, 'disabled': !isEditing }"
                          placeholder="ค้นหาด้วย รหัสลูกค้า, ชื่อ"
                          v-model="searchQuery"
                          @input="onInput"
                          @focus="onFocus"
                          @keyup.enter="performSearch"
                          :disabled="!isEditing"
                        />
                        <button class="btn-search" @click="performSearch" :disabled="!isEditing">ค้นหา</button>

                        <!-- Dropdown Suggestions -->
                        <div v-if="showDropdown" class="suggestions-dropdown">
                           <div v-if="suggestions.length === 0" class="no-results">
                             ไม่พบข้อมูลลูกค้า
                           </div>
                           <div
                             v-else
                             v-for="item in suggestions"
                             :key="item.id"
                             class="suggestion-item"
                             @click="selectSuggestion(item)"
                           >
                             {{ getDisplayText(item) }}
                           </div>
                        </div>
                    </div>
                    <span v-if="localErrors.tungnam_relationship_customer_id" class="error-text">กรุณาระบุข้อมูล</span>
                </div>
            </div>
        </div>

        <!-- Summary Section -->
        <div class="summary-section" v-if="summaryData">
            <h4 class="summary-title">ข้อมูลสรุป ({{ summaryData.name }})</h4>
            <div class="summary-grid">
                <div class="summary-item">
                    <span class="summary-label">วงเงินเครดิต</span>
                    <span class="summary-value">{{ formatCurrency(summaryData.creditLimit) }} บาท</span>
                </div>
                <div class="summary-item">
                    <span class="summary-label">ระยะเวลาเครดิต</span>
                    <span class="summary-value">{{ summaryData.paymentTerms }}</span>
                </div>
                <div class="summary-item">
                    <span class="summary-label">เงื่อนไขการชำระเงิน</span>
                    <span class="summary-value">{{ summaryData.paymentMethod || '-' }} {{ summaryData.paymentCondition ? `(${summaryData.paymentCondition})` : '' }}</span>
                </div>
                <div class="summary-item">
                    <span class="summary-label">เงื่อนไขการวางบิล/รับเช็ค</span>
                    <span class="summary-value">{{ summaryData.billingSchedule || '-' }}</span>
                </div>
            </div>
        </div>

      </div>
    </div>
  </div>
</template>

<script setup>
import { reactive, watch, ref, computed, onMounted, onUnmounted } from 'vue';
import debounce from 'lodash/debounce';
import FileUploader from '@/components/shared/FileUploader.vue';
import OtherDocumentsSection from '../OtherDocumentsSection.vue';
import { useCreditRequestStore } from '@/stores/creditRequest';
import { useFormValidation } from '@/composables/useFormValidation';
import { mandatoryStoreKeys } from '@/config/mandatoryFields';
import CustomerService from '@/services/CustomerService';

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

const businessTypeOptions = [
  { code: 'M', name: 'Manufacturer' },
  { code: 'I', name: 'Industry' },
  { code: 'W', name: 'Wholesale' },
  { code: 'P', name: 'Project' },
  { code: 'R', name: 'Retailer' },
  { code: 'S', name: 'Small Project Installer' }
];

const validBusinessNames = businessTypeOptions.map(t => t.name);

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

function handleYearsInBusinessBlur() {
    let val = formData.yearsInBusiness;
    if (!val) {
        saveToBackend();
        return;
    }

    // Smart Input Logic:
    // If user enters a 4-digit year (e.g. 2560), calculate duration.
    // If user enters <= 3 digits (e.g. 5), treat as duration.

    // Check if it's a 4-digit year (Buddhist Era)
    if (val.length === 4) {
        const inputYear = parseInt(val);
        const currentYear = new Date().getFullYear() + 543; // Current Buddhist Year

        // Simple sanity check: Year must be <= Current Year
        if (inputYear <= currentYear && inputYear > 2400) {
            const diff = currentYear - inputYear;
            // Ensure non-negative and minimum 1
            formData.yearsInBusiness = Math.max(1, diff).toString();
        }
    } else if (parseInt(val) === 0) {
        // Enforce minimum 1 for direct duration input
        formData.yearsInBusiness = '1';
    }

    validateField('yearsInBusiness', formData.yearsInBusiness, ['required']);
    saveToBackend();
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

    const authName = newVal.authorized_person || '';

    if (formData.companyName !== company) formData.companyName = company;

    // Tax ID
    if (formData.taxId !== newVal.tax_id) formData.taxId = newVal.tax_id || '';

    if (formData.authorizedName !== authName) formData.authorizedName = authName;
    if (formData.authorizedPosition !== newVal.authorized_position) formData.authorizedPosition = newVal.authorized_position || '';

    // Business Type Logic
    const businessVal = newVal.business_type || '';
    if (validBusinessNames.includes(businessVal)) {
        formData.businessType = businessVal;
        formData.businessTypeOther = '';
    } else if (businessVal) {
        formData.businessType = 'Other';
        formData.businessTypeOther = businessVal;
    } else {
        if (isNewCustomer || formData.businessType !== 'Other') {
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

  // Combine Business Type
  updates.business_type = newVal.businessType === 'Other' ? newVal.businessTypeOther : newVal.businessType;

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

    // Combine Business Type
    updates.business_type = formData.businessType === 'Other' ? formData.businessTypeOther : formData.businessType;

    updates.main_products = formData.mainProducts;
    updates.years_in_business = formData.yearsInBusiness;

    // Call generic action to save to DB
    store.updateCustomerData(updates);
}

function toggleEdit() {
  isEditing.value = !isEditing.value;
}


// Tungnam Relationship Logic
const searchQuery = ref('');
const suggestions = ref([]);
const showDropdown = ref(false);
const summaryData = ref(null);
const searchContainer = ref(null);

const localErrors = computed(() => {
    if (!store.showValidationErrors) return {};

    const e = {};
    if (!store.customer.has_tungnam_relationship) e.has_tungnam_relationship = true;

    if (store.customer.has_tungnam_relationship === 'yes') {
        if (!store.customer.tungnam_relationship_customer_id) e.tungnam_relationship_customer_id = true;
        // Optionally require a note describing the relationship
        if (!store.customer.tungnam_relationship_note) e.tungnam_relationship_note = true;
    }

    return e;
});

function handleTungnamRelationshipChange() {
    if (store.customer.has_tungnam_relationship === 'no') {
        store.customer.tungnam_relationship_customer_id = '';
        store.customer.tungnam_relationship_note = '';
        searchQuery.value = '';
        summaryData.value = null;
    }
    saveTungnamRelationship();
}

function saveTungnamRelationship() {
    store.updateCustomerData({
        has_tungnam_relationship: store.customer.has_tungnam_relationship,
        tungnam_relationship_customer_id: store.customer.tungnam_relationship_customer_id,
        tungnam_relationship_note: store.customer.tungnam_relationship_note
    });
}

const fetchSuggestions = async () => {
    if (!searchQuery.value) return;
    const results = await CustomerService.getSuggestions(searchQuery.value);
    suggestions.value = results;
    showDropdown.value = true;
};

const debouncedFetchSuggestions = debounce(fetchSuggestions, 300);

function onInput() {
    if (searchQuery.value.length >= 3) {
        debouncedFetchSuggestions();
    } else {
        showDropdown.value = false;
        suggestions.value = [];
    }
}

function onFocus() {
    if (searchQuery.value.length >= 3) {
        fetchSuggestions();
    }
}

function getDisplayText(item) {
    const q = searchQuery.value.toLowerCase().replace(/[- ]/g, '');
    const normalize = (val) => val ? val.replace(/[- ]/g, '') : '';
    const phone = normalize(item.phone);
    const mobile = normalize(item.mobile);
    const vatNo = normalize(item.vatNo);

    if (vatNo.includes(q) && vatNo !== '') return `${item.vatNo} - ${item.name}`;
    if (phone.includes(q) || mobile.includes(q)) {
        let displayPhone = item.phone || item.mobile;
        return `${displayPhone} - ${item.name}`;
    }
    if (item.id.toLowerCase().includes(searchQuery.value.toLowerCase())) {
        return `${item.id} - ${item.name}`;
    }
    return `${item.name} - ${item.id}`;
}

async function selectSuggestion(item) {
    searchQuery.value = item.id;
    showDropdown.value = false;
    await performSearch();
}

async function performSearch() {
    showDropdown.value = false;
    if (!searchQuery.value) return;

    try {
        const results = await CustomerService.searchCustomers(searchQuery.value);
        if (results && results.length > 0) {
            const customer = results[0];
            store.customer.tungnam_relationship_customer_id = customer.customer.id;

            // Populate summary data
            summaryData.value = {
                name: customer.customer.name,
                creditLimit: customer.customer.current_credit_limit || 0,
                paymentTerms: customer.customer.payment_terms_code || '-',
                paymentMethod: customer.customer.payment_method,
                paymentCondition: customer.customer.payment_condition,
                billingSchedule: customer.customer.billing_schedule
            };

            saveTungnamRelationship();
        } else {
            summaryData.value = null;
        }
    } catch (error) {
        console.error("Failed to fetch customer details for Tungnam relationship", error);
        summaryData.value = null;
    }
}

function formatCurrency(value) {
    if (!value) return '0';
    return Number(value).toLocaleString('en-US');
}

function handleClickOutsideSearch(event) {
    if (searchContainer.value && !searchContainer.value.contains(event.target)) {
        showDropdown.value = false;
    }
}

onMounted(() => {
    document.addEventListener('click', handleClickOutsideSearch);
});

onUnmounted(() => {
    document.removeEventListener('click', handleClickOutsideSearch);
});

// Watch to load existing relationship on load
watch(() => store.customer, async (newVal) => {
    if (newVal && newVal.has_tungnam_relationship === 'yes' && newVal.tungnam_relationship_customer_id && !summaryData.value) {
        searchQuery.value = newVal.tungnam_relationship_customer_id;
        await performSearch();
    }
}, { immediate: true, deep: true });

// Validation Watcher (Moved to end)
watch(() => store.showValidationErrors, (val) => {
    if (val) {
        validateField('companyName', formData.companyName, ['required']);
        validateField('authorizedName', formData.authorizedName, ['required', 'text']);
        validateField('authorizedPosition', formData.authorizedPosition, ['required', 'text']);

        // Business Details Validation
        validateField('businessType', formData.businessType, ['required']);
        if (formData.businessType === 'Other') {
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


.grid-three-col {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 15px;
  margin-top: 15px;
}


/* Section Separator */
.section-separator {
  border-top: 1px solid #e0e0e0;
  margin: 30px 0 20px 0;
  width: 100%;
}

/* Radio Group Styles (from RequestInfoTab) */
.radio-group-horizontal {
  display: flex;
  gap: 30px;
  align-items: center;
  margin-top: 10px;
}

.radio-label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  font-size: 1rem;
  color: #333;
}

.radio-label input[type="radio"] {
  width: 18px;
  height: 18px;
  cursor: pointer;
}

.radio-label input[type="radio"]:disabled {
  cursor: not-allowed;
}

/* Search Component Styles */
.search-section {
    position: relative;
    max-width: 400px;
    margin-bottom: 20px;
}

.search-group {
    display: flex;
    align-items: center;
    position: relative;
    margin-top: 0;
}

/* Override padding for search input to align vertically with standard form inputs */
.search-group .form-input {
    padding-top: 10px;
    padding-bottom: 10px;
}

.search-icon {
    position: absolute;
    left: 10px;
    color: #888;
    display: flex;
    align-items: center;
}

.search-input-field {
    padding-left: 35px !important;
    width: 100%;
    margin-right: 10px;
}

.btn-search {
    padding: 10px 16px;
    background-color: #0056FF;
    color: white;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    font-weight: bold;
    flex-shrink: 0;
}

.btn-search:hover {
    background-color: #0046cc;
}

.btn-search:disabled {
    background-color: #ccc;
    cursor: not-allowed;
}

/* Dropdown Styles */
.suggestions-dropdown {
    position: absolute;
    top: 100%;
    left: 0;
    width: calc(100% - 65px); /* Match input width approx */
    background: white;
    border: 1px solid #ccc;
    border-radius: 0 0 8px 8px;
    box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    z-index: 1000;
    max-height: 250px;
    overflow-y: auto;
    margin-top: 2px;
}

.suggestion-item {
    padding: 10px 15px;
    cursor: pointer;
    border-bottom: 1px solid #f0f0f0;
    color: #333;
}

.suggestion-item:last-child {
    border-bottom: none;
}

.suggestion-item:hover {
    background-color: #f5f5f5;
}

.no-results {
    padding: 15px;
    color: #888;
    text-align: center;
    font-style: italic;
}

/* Summary Section Styles */
.summary-section {
    background-color: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    padding: 16px;
    margin-bottom: 16px;
}

.summary-title {
    margin-top: 0;
    margin-bottom: 12px;
    color: #334155;
    font-size: 1.1rem;
}

.summary-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
}

.summary-item {
    display: flex;
    flex-direction: column;
}

.summary-label {
    font-size: 0.85rem;
    color: #64748b;
    margin-bottom: 4px;
}

.summary-value {
    font-weight: 500;
    color: #0f172a;
}
</style>
