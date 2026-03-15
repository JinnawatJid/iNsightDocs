<template>
  <div class="store-company-tab">
    <!-- Conditional Upload Section -->
    <div class="upload-section">
      <!-- Company Uploads -->
      <div v-if="isCompany" class="upload-grid">
        <FileUploader
          label="หนังสือรับรองนิติบุคคล"
          :required="isRequiredFile('legal_entity_certificate')"
          v-model="files.legalEntityCertificate"
          :disabled="!isEditing"
          multiple
        />
        <FileUploader
          label="เอกสารภพ.20"
          :required="isRequiredFile('vat_document')"
          v-model="files.vatDocument"
          :disabled="!isEditing"
          multiple
        />
        <FileUploader
          label="รูปถ่ายบริษัท"
          :required="isRequiredFile('company_photo')"
          v-model="files.companyPhoto"
          :disabled="!isEditing"
          multiple
        >
          <template #icon>
            <img :src="iconImage" alt="Image" width="24" height="24" />
          </template>
        </FileUploader>
        <FileUploader
          label="เอกสารเสียภาษีที่ดินบริษัท"
          :required="isRequiredFile('company_land_tax')"
          v-model="files.companyLandTax"
          :disabled="!isEditing"
          multiple
        />
      </div>
      <!-- Individual/Store Uploads -->
      <div v-else class="upload-grid">
        <FileUploader
          label="รูปร้านค้า"
          :required="isRequiredFile('store_photo')"
          v-model="files.storePhoto"
          :disabled="!isEditing"
          multiple
        >
          <template #icon>
             <img :src="iconImage" alt="Image" width="24" height="24" />
          </template>
        </FileUploader>
        <FileUploader
          label="ทะเบียนพาณิชย์"
          :required="isRequiredFile('commercial_reg')"
          v-model="files.commercialReg"
          :disabled="!isEditing"
          multiple
        />
        <FileUploader
          label="เอกสารเสียภาษีที่ดินร้านค้า"
          :required="isRequiredFile('store_land_tax')"
          v-model="files.storeLandTax"
          :disabled="!isEditing"
          multiple
        />
      </div>
    </div>

    <!-- Address Section -->
    <div class="address-verification">
      <div class="section-header">
        <h3>ตรวจสอบข้อมูลที่อยู่ร้านค้า/บริษัท</h3>
        <!-- Removed Edit button -->
      </div>

      <!-- Address Form -->
      <div class="form-grid-three-columns">
        <div class="form-group span-2">
          <label>ที่อยู่ (บ้านเลขที่, ถนน) <span v-if="isRequired('address')" class="text-red-500">*</span></label>
          <input
            type="text"
            class="form-control"
            :class="{ 'border-red-500': errors.houseAddress, 'disabled': !isEditing }"
            :disabled="!isEditing"
            v-model="formData.houseAddress" :data-empty="!formData.houseAddress"
            placeholder="ระบุบ้านเลขที่, ถนน"
            @input="validateField('houseAddress', formData.houseAddress, ['required'])"
            @blur="validateField('houseAddress', formData.houseAddress, ['required'])"
          />
          <span v-if="errors.houseAddress" class="error-text">{{ errors.houseAddress }}</span>
        </div>
        <div class="form-group">
          <label>ตำบล/แขวง <span v-if="isRequired('subdistrict')" class="text-red-500">*</span></label>
          <input
            type="text"
            class="form-control"
            :class="{ 'border-red-500': errors.subdistrict, 'disabled': !isEditing }"
            :disabled="!isEditing"
            v-model="formData.subdistrict" :data-empty="!formData.subdistrict"
            placeholder="ระบุตำบล/แขวง"
            @input="validateField('subdistrict', formData.subdistrict, ['required'])"
            @blur="validateField('subdistrict', formData.subdistrict, ['required'])"
          />
          <span v-if="errors.subdistrict" class="error-text">{{ errors.subdistrict }}</span>
        </div>
        <div class="form-group">
          <label>รหัสไปรษณีย์ <span v-if="isRequired('zipcode')" class="text-red-500">*</span></label>
          <input
            type="text"
            class="form-control"
            :class="{ 'border-red-500': errors.postCode, 'disabled': !isEditing }"
            :disabled="!isEditing"
            v-model="formData.postCode" :data-empty="!formData.postCode"
            placeholder="ระบุรหัสไปรษณีย์"
            @input="validateField('postCode', formData.postCode, ['required'])"
            @blur="validateField('postCode', formData.postCode, ['required'])"
          />
          <span v-if="errors.postCode" class="error-text">{{ errors.postCode }}</span>
        </div>
        <div class="form-group">
          <label>อำเภอ/เขต <span v-if="isRequired('district')" class="text-red-500">*</span></label>
          <input
            type="text"
            class="form-control"
            :class="{ 'border-red-500': errors.district, 'disabled': !isEditing }"
            :disabled="!isEditing"
            v-model="formData.district" :data-empty="!formData.district"
            placeholder="ระบุอำเภอ/เขต"
            @input="validateField('district', formData.district, ['required'])"
            @blur="validateField('district', formData.district, ['required'])"
          />
          <span v-if="errors.district" class="error-text">{{ errors.district }}</span>
        </div>
        <div class="form-group">
          <label>จังหวัด <span v-if="isRequired('province')" class="text-red-500">*</span></label>
          <input
            type="text"
            class="form-control"
            :class="{ 'border-red-500': errors.city, 'disabled': !isEditing }"
            :disabled="!isEditing"
            v-model="formData.city" :data-empty="!formData.city"
            placeholder="ระบุจังหวัด"
            @input="validateField('city', formData.city, ['required'])"
            @blur="validateField('city', formData.city, ['required'])"
          />
          <span v-if="errors.city" class="error-text">{{ errors.city }}</span>
        </div>
      </div>
      
      <!-- Phone | Fax | Email Grid -->
      <div class="form-grid-two-columns">
        <div class="form-group">
          <label>
            เบอร์โทรศัพท์ <span v-if="isRequired('phone')" class="text-red-500">*</span>
            <span v-if="!formData.phone" class="no-data-alert">ไม่พบข้อมูล</span>
          </label>
          <input
            type="text"
            class="form-control"
            :class="{ 'border-red-500': errors.phone, 'disabled': !isEditing }"
            :disabled="!isEditing"
            v-model="formData.phone" :data-empty="!formData.phone"
            placeholder="0XX-XXX-XXXX"
            @input="(e) => { validateField('phone', e.target.value, ['required']); }"
            @blur="validateField('phone', formData.phone, ['required']);"
          />
          <span v-if="errors.phone" class="error-text">{{ errors.phone }}</span>
        </div>
        <div class="form-group">
          <label>อีเมล</label>
          <input
            type="text"
            class="form-control"
            :class="{ 'disabled': !isEditing }"
            :disabled="!isEditing"
            v-model="formData.email" :data-empty="!formData.email"
            placeholder="example@email.com"
          />
        </div>
      </div>

        <!-- Location Type and Ownership Grid -->
        <div class="form-grid-four-columns">
            <div class="form-group">
               <label>ลักษณะที่ตั้ง <span v-if="isRequired('store_location_type')" class="text-red-500">*</span></label>
               <select
                  class="form-control"
                  :class="{ 'border-red-500': errors.locationType, 'disabled': !isEditing }"
                  :disabled="!isEditing"
                  v-model="formData.locationTypeSelect" :data-empty="!formData.locationTypeSelect"
                  @change="() => { validateField('locationType', formData.locationTypeSelect, ['required']); }"
                >
                  <option value="" disabled selected>เลือกประเภทที่ตั้ง</option>
                  <option value="บ้าน">บ้าน</option>
                  <option value="อาคารสำนักงาน">อาคารสำนักงาน</option>
                  <option value="ร้านค้า">ร้านค้า</option>
                  <option value="ตึกแถว">ตึกแถว</option>
                  <option value="โรงงาน">โรงงาน</option>
                </select>
                <span v-if="errors.locationType" class="error-text">{{ errors.locationType }}</span>
            </div>
             <div class="form-group">
               <label>กรรมสิทธิ์ทรัพย์สิน <span v-if="isRequired('store_ownership')" class="text-red-500">*</span></label>
               <select
                  class="form-control"
                  :class="{ 'border-red-500': errors.propertyOwnership, 'disabled': !isEditing }"
                  :disabled="!isEditing"
                  v-model="formData.ownershipSelect" :data-empty="!formData.ownershipSelect"
                  @change="() => { validateField('propertyOwnership', formData.ownershipSelect, ['required']); }"
                >
                  <option value="" disabled selected>เลือกประเภทกรรมสิทธิ์</option>
                  <option value="เป็นเจ้าของ">เป็นเจ้าของ</option>
                  <option value="เช่าซื้อ">เช่าซื้อ</option>
                  <option value="เช่า">เช่า</option>
                </select>
                <span v-if="errors.propertyOwnership" class="error-text">{{ errors.propertyOwnership }}</span>
             </div>
             <div class="form-group">
                <label>{{ storeValueLabel }} <span v-if="isRequired('store_value')" class="text-red-500">*</span></label>
                <input
                  type="text"
                  class="form-control"
                  :class="{ 'border-red-500': errors.storeValue, 'disabled': !isEditing }"
                  :disabled="!isEditing"
                  v-model="formattedStoreValue" :data-empty="!formattedStoreValue"
                  placeholder="ระบุจำนวนเงิน"
                />
                <span v-if="errors.storeValue" class="error-text">{{ errors.storeValue }}</span>
             </div>
             <div class="form-group">
                <label>คำอธิบายเพิ่มเติม</label>
                <input
                  type="text"
                  class="form-control"
                  :class="{ 'disabled': !isEditing }"
                  :disabled="!isEditing"
                  v-model="formData.locationTypeOther" :data-empty="!formData.locationTypeOther"
                  placeholder="ระบุ..."
                />
             </div>
        </div>

      <!-- Map Section -->
      <div class="section-header" style="margin-top: 20px;">
        <h3>แผนที่</h3>
      </div>
      <div class="map-container">
        <CoordinateMap
          :mapCode="formData.mapCode"
          :landmark="formData.landmark"
          :note="formData.note"
          :disabled="!isEditing"
          @change="onCoordinatesChange"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
import { reactive, computed, watch, ref } from 'vue';
import { searchAddressByZipcode } from 'thai-address-database';
import FileUploader from '@/components/shared/FileUploader.vue';
import CoordinateMap from '@/components/shared/CoordinateMap.vue';
import { useCreditRequestStore } from '@/stores/creditRequest';
import { useFormValidation } from '@/composables/useFormValidation';
import { mandatoryStoreKeys } from '@/config/mandatoryFields';
import iconImage from '@/assets/icons/image.svg';

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

function isRequiredFile(fileKey) {
    return mandatoryStoreKeys.files.common.includes(fileKey) ||
           mandatoryStoreKeys.files.company.includes(fileKey) ||
           mandatoryStoreKeys.files.individual.includes(fileKey);
}

const files = reactive({
  // Company
  legalEntityCertificate: null,
  vatDocument: null,
  companyPhoto: null,
  companyLandTax: null,
  // Individual
  storePhoto: null,
  commercialReg: null,
  storeLandTax: null,
});

// Watch store.files to hydrate local files (for Read Only view)
watch(() => store.files, (newVal) => {
  files.legalEntityCertificate = newVal?.legal_entity_certificate || [];
  files.vatDocument = newVal?.vat_document || [];
  files.companyPhoto = newVal?.company_photo || [];
  files.companyLandTax = newVal?.company_land_tax || [];
  files.storePhoto = newVal?.store_photo || [];
  files.commercialReg = newVal?.commercial_reg || [];
  files.storeLandTax = newVal?.store_land_tax || [];
}, { immediate: true, deep: true });

watch(() => files.legalEntityCertificate, (v) => { store.updateFile('legal_entity_certificate', v); });
watch(() => files.vatDocument, (v) => { store.updateFile('vat_document', v); });
watch(() => files.companyPhoto, (v) => { store.updateFile('company_photo', v); });
watch(() => files.companyLandTax, (v) => { store.updateFile('company_land_tax', v); });
watch(() => files.storePhoto, (v) => { store.updateFile('store_photo', v); });
watch(() => files.commercialReg, (v) => { store.updateFile('commercial_reg', v); });
watch(() => files.storeLandTax, (v) => { store.updateFile('store_land_tax', v); });

const formData = reactive({
  houseAddress: '',
  subdistrict: '',
  postCode: '',
  district: '',
  city: '',
  phone: '',
  fax: '',
  email: '',
  locationTypeSelect: '',
  locationTypeOther: '',
  ownershipSelect: '',
  storeValue: '',
  mapCode: '',
  landmark: '',
  note: ''
});

const isCompany = computed(() => {
  return store.isCompany;
});

const storeValueLabel = computed(() => {
  const ownership = formData.ownershipSelect;
  if (ownership === 'เช่าซื้อ' || ownership === 'เช่า') {
    return 'ค่าเช่า';
  }
  return 'มูลค่าทรัพย์สิน';
});

function formatCurrency(val) {
  if (!val) return '';
  const num = String(val).replace(/,/g, '');
  if (isNaN(num)) return val;
  return new Intl.NumberFormat('en-US').format(num);
}

const formattedStoreValue = computed({
  get: () => {
    if (!formData.storeValue) return '';
    const parts = String(formData.storeValue).split('.');
    let formatted = Number(parts[0]).toLocaleString('en-US');
    if (parts.length > 1) {
      formatted += '.' + parts[1];
    }
    return formatted;
  },
  set: (val) => {
    let num = val.replace(/[^0-9.]/g, '');
    const parts = num.split('.');
    if (parts.length > 2) {
      num = parts[0] + '.' + parts.slice(1).join('');
    }
    formData.storeValue = num;
    validateField('storeValue', num, ['required']);
  }
});

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

// Watch store.customer for initial load
watch(() => store.customer, (newVal) => {
  if (newVal) {
    // Populate form data from store fields
    // Individual -> store_ keys
    // Company -> address (main) keys

    if (!isCompany.value) {
        // INDIVIDUAL
        formData.houseAddress = newVal.store_address || '';
        formData.subdistrict = newVal.store_subdistrict || '';
        formData.postCode = newVal.store_zipcode || '';
        formData.district = newVal.store_district || '';
        formData.city = newVal.store_province || '';
        formData.phone = newVal.store_phone || '';
        formData.fax = newVal.store_fax || '';
        formData.email = newVal.store_email || '';

        formData.mapCode = newVal.store_map_code || '';
        formData.landmark = newVal.store_landmark || '';
        formData.note = newVal.store_note || '';
        formData.locationTypeSelect = newVal.store_location_type || '';
        formData.locationTypeOther = newVal.store_location_type_other || '';
        formData.ownershipSelect = newVal.store_ownership || '';

        const storeVal = String(newVal.store_value || '');
        const currentFormVal = String(formData.storeValue || '').replace(/,/g, '');
        if (storeVal !== currentFormVal) {
             formData.storeValue = storeVal;
        }

    } else {
        // COMPANY
        formData.houseAddress = newVal.address || '';
        formData.subdistrict = newVal.subdistrict || '';
        formData.postCode = newVal.zipcode || '';
        formData.district = newVal.district || '';
        formData.city = newVal.province || '';
        formData.phone = newVal.phone || '';
        formData.fax = newVal.fax || '';
        formData.email = newVal.email || '';

        // Use store_ map keys? Or generic map keys?
        // Usually Company Address is Main Address, so maybe generic?
        // But map component binds to 'store_map_code' in previous logic for Individual.
        // For Company, if we used 'address', we likely use 'map_code' (Residence keys in legacy).
        // BUT, StoreCompanyTab previously updated 'store_map_code' if isCompany too!
        // Let's check the update logic below.

        // Logic below: if isCompany -> store_map_code.
        // Fallback to legacy map keys (map_code, etc) if store_ keys missing for Company.
        formData.mapCode = newVal.store_map_code || newVal.map_code || '';
        formData.landmark = newVal.store_landmark || newVal.landmark || '';
        formData.note = newVal.store_note || newVal.note || '';
        formData.locationTypeSelect = newVal.store_location_type || '';
        formData.locationTypeOther = newVal.store_location_type_other || '';
        formData.ownershipSelect = newVal.store_ownership || '';

        // Only update if changed
        const storeVal = String(newVal.store_value || '');
        const currentFormVal = String(formData.storeValue || '').replace(/,/g, '');
        if (storeVal !== currentFormVal) {
             formData.storeValue = storeVal;
        }
    }
  }
}, { immediate: true, deep: true });

watch(formData, (newVal) => {
  // Logic updated: If isCompany, update MAIN address (Head Office = Address)
  // If NOT isCompany, update STORE address (new keys) so individual shop address is saved.

  if (isCompany.value) {
     const updates = {
      address: newVal.houseAddress,
      subdistrict: newVal.subdistrict,
      zipcode: newVal.postCode,
      district: newVal.district,
      province: newVal.city,
      phone: newVal.phone,
      fax: newVal.fax,
      email: newVal.email,
      // For company, we also sync back to main keys if store_ keys used?
      // Actually, if we read from map_code as fallback, we should save to both or just map_code?
      // To be safe and consistent with the new pattern, we save to store_ keys (which become the new standard for "Location Map")
      // AND we might want to sync legacy keys if needed, but let's stick to the store keys for components.
      store_map_code: newVal.mapCode,
      store_landmark: newVal.landmark,
      store_note: newVal.note,
      store_location_type: newVal.locationTypeSelect,
      store_location_type_other: newVal.locationTypeOther,
      store_ownership: newVal.ownershipSelect,
      // Save raw
      store_value: String(newVal.storeValue || '').replace(/,/g, ''),
    };
    store.updateCustomerData(updates);
  } else {
     // Individual: Save to Store Specific Keys (which will be in snapshot)
     const updates = {
      store_address: newVal.houseAddress,
      store_subdistrict: newVal.subdistrict,
      store_zipcode: newVal.postCode,
      store_district: newVal.district,
      store_province: newVal.city,
      store_phone: newVal.phone,
      store_fax: newVal.fax,
      store_email: newVal.email,

      store_map_code: newVal.mapCode,
      store_landmark: newVal.landmark,
      store_note: newVal.note,
      store_location_type: newVal.locationTypeSelect,
      store_location_type_other: newVal.locationTypeOther,
      store_ownership: newVal.ownershipSelect,
      // Save raw
      store_value: String(newVal.storeValue || '').replace(/,/g, ''),
    };
    store.updateCustomerData(updates);
  }
}, { deep: true });

function onCoordinatesChange({ mapCode, landmark, note }) {
  store.saveCustomerCoordinates({
    store_map_code: mapCode,
    store_landmark: landmark,
    store_note: note
  });
}

// Watch postCode
watch(() => formData.postCode, (newZip) => {
  if (newZip && newZip.length === 5) {
    const results = searchAddressByZipcode(newZip);
    if (results.length > 0) {
      formData.district = results[0].amphoe;
      formData.city = results[0].province;
    }
  }
});

function toggleEdit() {
  isEditing.value = !isEditing.value;
}

// Validation Watcher (Moved to end)
watch(() => store.showValidationErrors, (val) => {
    if (val) {
        validateField('houseAddress', formData.houseAddress, ['required']);
        validateField('subdistrict', formData.subdistrict, ['required']);
        validateField('postCode', formData.postCode, ['required']);
        validateField('district', formData.district, ['required']);
        validateField('city', formData.city, ['required']);
        validateField('phone', formData.phone, ['required']);

        // New Fields
        validateField('locationType', formData.locationTypeSelect, ['required']);
        validateField('propertyOwnership', formData.ownershipSelect, ['required']);
        validateField('storeValue', formData.storeValue, ['required']);
    }
}, { immediate: true });
</script>

<style scoped>
@import './shared-styles.css';

.store-company-tab {
  padding: 10px;
}

.no-data-alert {
  color: red;
  font-size: 12px;
  margin-left: 8px;
  font-weight: normal;
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

.address-verification {
  margin-top: 30px;
}

.map-container {
  margin-bottom: 20px;
}

.map-placeholder {
  width: 100%;
  height: 200px;
  background-color: #f0f0f0;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.map-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  color: #999;
  font-size: 14px;
  gap: 10px;
}

.bottom-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 15px;
}

.form-group.span-2 {
  grid-column: span 2;
}

/* Split Form Group for Side-by-Side Label/Inputs */
.split-form-group {
    display: flex;
    gap: 10px;
}

.half-width {
    flex: 1;
}

.custom-select-group {
  display: flex;
  gap: 10px;
}

.select-trigger {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  font-size: 14px;
  color: #666;
  cursor: pointer;
}

.custom-select-group .form-control {
  flex: 1;
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
