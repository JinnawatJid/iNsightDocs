<template>
  <div class="store-company-tab">
    <!-- Conditional Upload Section -->
    <div class="upload-section">
      <!-- Company Uploads -->
      <div v-if="isCompany" class="upload-grid">
        <FileUploader
          label="หนังสือรับรองนิติบุคคล"
          required
          v-model="files.legalEntityCertificate"
          :disabled="!isEditing"
        />
        <FileUploader
          label="เอกสารภพ.20"
          required
          v-model="files.vatDocument"
          :disabled="!isEditing"
        />
        <FileUploader
          label="รูปถ่ายบริษัท"
          required
          v-model="files.companyPhoto"
          :disabled="!isEditing"
        >
          <template #icon>
            <img :src="iconImage" alt="Image" width="24" height="24" />
          </template>
        </FileUploader>
        <FileUploader
          label="เอกสารเสียภาษีที่ดินบริษัท"
          required
          v-model="files.companyLandTax"
          :disabled="!isEditing"
        />
      </div>
      <!-- Individual/Store Uploads -->
      <div v-else class="upload-grid">
        <FileUploader
          label="รูปร้านค้า"
          required
          v-model="files.storePhoto"
          :disabled="!isEditing"
        >
          <template #icon>
             <img :src="iconImage" alt="Image" width="24" height="24" />
          </template>
        </FileUploader>
        <FileUploader
          label="ทะเบียนพาณิชย์"
          required
          v-model="files.commercialReg"
          :disabled="!isEditing"
        />
        <FileUploader
          label="เอกสารเสียภาษีที่ดินร้านค้า"
          required
          v-model="files.storeLandTax"
          :disabled="!isEditing"
        />
      </div>
    </div>

    <!-- Address Section -->
    <div class="address-verification">
      <div class="section-header">
        <h3>ตรวจสอบข้อมูลที่อยู่ร้านค้า/บริษัท</h3>
        <div class="checkbox-wrapper">
          <input
            type="checkbox"
            id="sameAddress"
            v-model="isSameAddress"
            :disabled="!isEditing"
          />
          <label for="sameAddress">ที่อยู่เดียวกับที่อยู่อาศัย</label>
        </div>
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
            v-model="formData.houseAddress"
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
            v-model="formData.subdistrict"
            placeholder="อัตโนมัติ"
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
            v-model="formData.postCode"
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
            v-model="formData.district"
            placeholder="อัตโนมัติ"
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
            v-model="formData.city"
            placeholder="อัตโนมัติ"
            @input="validateField('city', formData.city, ['required'])"
            @blur="validateField('city', formData.city, ['required'])"
          />
          <span v-if="errors.city" class="error-text">{{ errors.city }}</span>
        </div>
      </div>
      
      <!-- Phone | Fax | Email Grid -->
      <div class="form-grid-three-columns">
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
            v-model="formData.phone"
            placeholder="0XX-XXX-XXXX"
            @input="(e) => { restrictPhoneInput(e); validateField('phone', e.target.value, ['required', 'phone']); }"
            @blur="validateField('phone', formData.phone, ['required', 'phone']); saveData('phone', formData.phone)"
          />
          <span v-if="errors.phone" class="error-text">{{ errors.phone }}</span>
        </div>
        <div class="form-group">
          <label>แฟกซ์</label>
          <input
            type="text"
            class="form-control"
            :class="{ 'disabled': !isEditing }"
            :disabled="!isEditing"
            v-model="formData.fax"
            placeholder="ระบุเบอร์แฟกซ์"
            @blur="saveData('fax', formData.fax)"
          />
        </div>
        <div class="form-group">
          <label>อีเมล</label>
          <input
            type="text"
            class="form-control"
            :class="{ 'disabled': !isEditing }"
            :disabled="!isEditing"
            v-model="formData.email"
            placeholder="example@email.com"
            @blur="saveData('email', formData.email)"
          />
        </div>
      </div>

        <!-- Location Type and Ownership Grid -->
        <div class="form-grid-four-columns">
            <div class="form-group">
               <label>ลักษณะที่ตั้ง </label>
               <select
                  class="form-control"
                  :class="{ 'disabled': !isEditing }"
                  :disabled="!isEditing"
                  v-model="formData.locationTypeSelect"
                >
                  <option value="" disabled selected>เลือกประเภทที่ตั้ง</option>
                  <option value="อาคารพาณิชย์">อาคารพาณิชย์</option>
                  <option value="สำนักงานบนอาคารชุด">สำนักงานบนอาคารชุด</option>
                  <option value="บ้าน">บ้าน</option>
                  <option value="โรงงาน">โรงงาน</option>
                </select>
            </div>
             <div class="form-group">
                <label>คำอธิบายเพิ่มเติม</label>
                <input
                  type="text"
                  class="form-control"
                  :class="{ 'disabled': !isEditing }"
                  :disabled="!isEditing"
                  v-model="formData.locationTypeOther"
                  placeholder="ระบุ..."
                />
             </div>
             <div class="form-group">
               <label>กรรมสิทธิ์ทรัพย์สิน </label>
               <select
                  class="form-control"
                  :class="{ 'disabled': !isEditing }"
                  :disabled="!isEditing"
                  v-model="formData.ownershipSelect"
                >
                  <option value="" disabled selected>เลือกประเภทกรรมสิทธิ์</option>
                  <option value="เป็นเจ้าของ">เป็นเจ้าของ</option>
                  <option value="เช่าซื้อ">เช่าซื้อ</option>
                </select>
             </div>
             <div class="form-group">
                <label>{{ ownershipLabel }}</label>
                <input
                  type="text"
                  class="form-control"
                  :class="{ 'disabled': !isEditing }"
                  :disabled="!isEditing"
                  v-model="formData.ownershipOther"
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
const { errors, validateField, restrictPhoneInput } = useFormValidation();

const isEditing = ref(!props.readOnly);
watch(() => props.readOnly, (val) => {
  isEditing.value = !val;
});

// Validation Watcher
watch(() => store.showValidationErrors, (val) => {
    if (val) {
        validateField('houseAddress', formData.houseAddress, ['required']);
        validateField('subdistrict', formData.subdistrict, ['required']);
        validateField('postCode', formData.postCode, ['required']);
        validateField('district', formData.district, ['required']);
        validateField('city', formData.city, ['required']);
        validateField('phone', formData.phone, ['required', 'phone']);
    }
});

function isRequired(storeKey) {
    return mandatoryStoreKeys.fields.includes(storeKey);
}

const isSameAddress = ref(false);

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
  files.legalEntityCertificate = newVal?.legal_entity_certificate || null;
  files.vatDocument = newVal?.vat_document || null;
  files.companyPhoto = newVal?.company_photo || null;
  files.companyLandTax = newVal?.company_land_tax || null;
  files.storePhoto = newVal?.store_photo || null;
  files.commercialReg = newVal?.commercial_reg || null;
  files.storeLandTax = newVal?.store_land_tax || null;
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
  ownershipOther: '',
  mapCode: '',
  landmark: '',
  note: ''
});

const isCompany = computed(() => {
  return !!(store.customer && store.customer['VAT Registration No_']);
});

const ownershipLabel = computed(() => {
  if (formData.ownershipSelect === 'เช่าซื้อ') {
    return 'เช่าซื้อ เดือนละ';
  }
  return 'มูลค่า';
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

// Watch isSameAddress for toggling
watch(isSameAddress, (isSame) => {
  if (isSame && store.customer) {
    formData.houseAddress = store.customer.address || '';
    formData.postCode = store.customer.zipcode || '';
    formData.district = store.customer.district || '';
    formData.city = store.customer.province || '';
    formData.phone = formatPhoneNumber(store.customer.phone || '');
    formData.fax = store.customer.fax || '';
    formData.email = store.customer.email || '';
    
    // Coordinates for Store - if copying from residence
    formData.mapCode = store.customer.residence_map_code || '';
    formData.landmark = store.customer.residence_landmark || '';
    formData.note = store.customer.residence_note || '';

    formData.subdistrict = store.customer.subdistrict || '';

    // Copy Location Type and Ownership from Residence
    formData.locationTypeSelect = store.customer.residence_location_type || '';
    formData.locationTypeOther = store.customer.residence_location_type_other || '';
    formData.ownershipSelect = store.customer.residence_ownership || '';
    formData.ownershipOther = store.customer.residence_ownership_other || '';

  } else {
    // Revert to store values if unchecked
    if (store.customer) {
       // Restore from store_xxx keys if not company, or general store_ keys
       formData.mapCode = store.customer.store_map_code || '';
       formData.landmark = store.customer.store_landmark || '';
       formData.note = store.customer.store_note || '';

       formData.locationTypeSelect = store.customer.store_location_type || '';
       formData.locationTypeOther = store.customer.store_location_type_other || '';
       formData.ownershipSelect = store.customer.store_ownership || '';
       formData.ownershipOther = store.customer.store_ownership_other || '';

       // Also restore address fields if they exist as store_xxx (for individuals)
       if (!isCompany.value) {
            formData.houseAddress = store.customer.store_address || '';
            formData.subdistrict = store.customer.store_subdistrict || '';
            formData.postCode = store.customer.store_zipcode || '';
            formData.district = store.customer.store_district || '';
            formData.city = store.customer.store_province || '';
            formData.phone = store.customer.store_phone || '';
            formData.fax = store.customer.store_fax || '';
            formData.email = store.customer.store_email || '';
       } else {
            // For Company, we clear.
            formData.houseAddress = '';
            formData.subdistrict = '';
            formData.postCode = '';
            formData.district = '';
            formData.city = '';
            formData.phone = '';
            formData.fax = '';
            formData.email = '';
       }
    } else {
       formData.mapCode = '';
       formData.landmark = '';
       formData.note = '';

       formData.locationTypeSelect = '';
       formData.locationTypeOther = '';
       formData.ownershipSelect = '';
       formData.ownershipOther = '';

       formData.houseAddress = '';
       formData.subdistrict = '';
       formData.postCode = '';
       formData.district = '';
       formData.city = '';
       formData.phone = '';
       formData.fax = '';
       formData.email = '';
    }
  }
});

// Watch store.customer for initial load
watch(() => store.customer, (newVal) => {
  if (newVal) {
    // Only populate if not "Same Address" (or if logic demands)
    // For now, simple population. User can toggle same address if needed.

    if (isSameAddress.value) {
         // Should stay synced with residence
    } else {
        formData.mapCode = newVal.store_map_code || '';
        formData.landmark = newVal.store_landmark || '';
        formData.note = newVal.store_note || '';

        formData.locationTypeSelect = newVal.store_location_type || '';
        formData.locationTypeOther = newVal.store_location_type_other || '';
        formData.ownershipSelect = newVal.store_ownership || '';
        formData.ownershipOther = newVal.store_ownership_other || '';

        // Hydrate address fields if Individual and data exists
        if (!isCompany.value && newVal.store_address) {
             formData.houseAddress = newVal.store_address || '';
             formData.subdistrict = newVal.store_subdistrict || '';
             formData.postCode = newVal.store_zipcode || '';
             formData.district = newVal.store_district || '';
             formData.city = newVal.store_province || '';
             formData.phone = newVal.store_phone || '';
             formData.fax = newVal.store_fax || '';
             formData.email = newVal.store_email || '';
        }
    }

    if (isSameAddress.value) {
        formData.subdistrict = newVal.subdistrict || '';
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
      store_map_code: newVal.mapCode,
      store_landmark: newVal.landmark,
      store_note: newVal.note,
      store_location_type: newVal.locationTypeSelect,
      store_location_type_other: newVal.locationTypeOther,
      store_ownership: newVal.ownershipSelect,
      store_ownership_other: newVal.ownershipOther
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
      store_ownership_other: newVal.ownershipOther
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

function saveData(key, value) {
  const updates = {};
  updates[key] = value;
  store.saveCustomerData(updates);
}

// Watch postCode
watch(() => formData.postCode, (newZip) => {
  if (!isSameAddress.value && newZip && newZip.length === 5) {
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
