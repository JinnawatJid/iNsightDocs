<template>
  <div class="residence-tab">
    <!-- Upload Section -->
    <div class="upload-section">
      <div class="upload-grid">
        <!-- Home Photo -->
        <FileUploader
          label="รูปถ่ายบ้าน"
          :required="isRequiredFile('home_photo')"
          accept="image/*"
          v-model="files.homePhoto"
          :disabled="!isEditing"
        >
          <template #icon>
             <img :src="iconImage" alt="Image" width="24" height="24" />
          </template>
        </FileUploader>

        <!-- Land Tax Document -->
        <FileUploader
          label="เอกสารเสียภาษีที่ดิน"
          :required="isRequiredFile('land_tax')"
          v-model="files.landTax"
          :disabled="!isEditing"
        />
      </div>
    </div>

    <!-- Address Verification Section -->
    <div class="address-verification">
      <div class="section-header">
        <h3>ตรวจสอบข้อมูลที่อยู่</h3>
        <div class="checkbox-wrapper">
          <input
            type="checkbox"
            id="sameStoreAddress"
            v-model="isSameAddress"
            :disabled="!isEditing"
          />
          <label for="sameStoreAddress">ที่อยู่เดียวกับร้านค้า/บริษัท</label>
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
            v-model="formData.city"
            placeholder="ระบุจังหวัด"
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
            @blur="validateField('phone', formData.phone, ['required', 'phone']);"
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
          />
        </div>
       </div>

        <!-- Location Type and Ownership Grid -->
        <div class="form-grid-four-columns">
            <div class="form-group">
               <label>ลักษณะที่ตั้ง <span v-if="isRequired('residence_location_type')" class="text-red-500">*</span></label>
               <select
                  class="form-control"
                  :class="{ 'border-red-500': errors.locationType, 'disabled': !isEditing }"
                  :disabled="!isEditing"
                  v-model="formData.locationTypeSelect"
                  @change="() => { validateField('locationType', formData.locationTypeSelect, ['required']); }"
                >
                  <option value="" disabled selected>เลือกประเภทที่ตั้ง</option>
                  <option value="อาคารพาณิชย์">อาคารพาณิชย์</option>
                  <option value="สำนักงานบนอาคารชุด">สำนักงานบนอาคารชุด</option>
                  <option value="บ้าน">บ้าน</option>
                  <option value="โรงงาน">โรงงาน</option>
                </select>
                <span v-if="errors.locationType" class="error-text">{{ errors.locationType }}</span>
            </div>
             <div class="form-group">
               <label>กรรมสิทธิ์ทรัพย์สิน <span v-if="isRequired('residence_ownership')" class="text-red-500">*</span></label>
               <select
                  class="form-control"
                  :class="{ 'border-red-500': errors.propertyOwnership, 'disabled': !isEditing }"
                  :disabled="!isEditing"
                  v-model="formData.ownershipSelect"
                  @change="() => { validateField('propertyOwnership', formData.ownershipSelect, ['required']); }"
                >
                  <option value="" disabled selected>เลือกประเภทกรรมสิทธิ์</option>
                  <option value="บ้านตนเอง">บ้านตนเอง</option>
                  <option value="บ้านญาติ">บ้านญาติ</option>
                  <option value="บ้านเช่า">บ้านเช่า</option>
                  <option value="บ้านบิดา/มารดา">บ้านบิดา/มารดา</option>
                  <option value="เช่าซื้อ">เช่าซื้อ</option>
                </select>
                <span v-if="errors.propertyOwnership" class="error-text">{{ errors.propertyOwnership }}</span>
             </div>
             <div class="form-group span-2">
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
import { reactive, watch, ref, computed } from 'vue';
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



function isRequired(storeKey) {
    return mandatoryStoreKeys.fields.includes(storeKey);
}

function isRequiredFile(fileKey) {
    return mandatoryStoreKeys.files.common.includes(fileKey) ||
           mandatoryStoreKeys.files.company.includes(fileKey) ||
           mandatoryStoreKeys.files.individual.includes(fileKey);
}

const isSameAddress = ref(false);

const files = reactive({
  homePhoto: null,
  landTax: null
});

// Watch store.files to hydrate local files (for Read Only view)
watch(() => store.files, (newVal) => {
  files.homePhoto = newVal?.home_photo || null;
  files.landTax = newVal?.land_tax || null;
}, { immediate: true, deep: true });

// Watch for file changes to update store for Approval Chance logic
watch(() => files.homePhoto, (newVal) => {
  store.updateFile('home_photo', newVal);
});

watch(() => files.landTax, (newVal) => {
  store.updateFile('land_tax', newVal);
});

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
  mapCode: '',
  landmark: '',
  note: ''
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

const isCompany = computed(() => store.isCompany);

// Watch isSameAddress for toggling
watch(isSameAddress, (isSame) => {
  if (isSame && store.customer) {
    // Populate from Store Data
    if (!isCompany.value) {
        // Individual: Source = store_ keys
        formData.houseAddress = store.customer.store_address || '';
        formData.subdistrict = store.customer.store_subdistrict || '';
        formData.postCode = store.customer.store_zipcode || '';
        formData.district = store.customer.store_district || '';
        formData.city = store.customer.store_province || '';
        formData.phone = formatPhoneNumber(store.customer.store_phone || '');
        formData.fax = store.customer.store_fax || '';
        formData.email = store.customer.store_email || '';

        formData.mapCode = store.customer.store_map_code || '';
        formData.landmark = store.customer.store_landmark || '';
        formData.note = store.customer.store_note || '';
        formData.locationTypeSelect = store.customer.store_location_type || '';
        formData.locationTypeOther = store.customer.store_location_type_other || '';
        formData.ownershipSelect = store.customer.store_ownership || '';
    } else {
        // Company: Source = address keys (Company Address)
        formData.houseAddress = store.customer.address || '';
        formData.subdistrict = store.customer.subdistrict || '';
        formData.postCode = store.customer.zipcode || '';
        formData.district = store.customer.district || '';
        formData.city = store.customer.province || '';
        formData.phone = formatPhoneNumber(store.customer.phone || '');
        formData.fax = store.customer.fax || '';
        formData.email = store.customer.email || '';

        // Fallback to legacy map keys (map_code, etc) if store_ keys missing for Company.
        formData.mapCode = store.customer.store_map_code || store.customer.map_code || '';
        formData.landmark = store.customer.store_landmark || store.customer.landmark || '';
        formData.note = store.customer.store_note || store.customer.note || '';
        formData.locationTypeSelect = store.customer.store_location_type || '';
        formData.locationTypeOther = store.customer.store_location_type_other || '';
        formData.ownershipSelect = store.customer.store_ownership || '';
    }
  } else {
     // Revert / Clear or Reload from original Residence Fields
     if (store.customer) {
        if (!isCompany.value) {
            // Individual: Load 'address' fields (Residence)
            formData.houseAddress = store.customer.address || '';
            formData.subdistrict = store.customer.subdistrict || '';
            formData.postCode = store.customer.zipcode || '';
            formData.district = store.customer.district || '';
            formData.city = store.customer.province || '';
            formData.phone = formatPhoneNumber(store.customer.phone || '');
            formData.fax = store.customer.fax || '';
            formData.email = store.customer.email || '';

            formData.mapCode = store.customer.residence_map_code || '';
            formData.landmark = store.customer.residence_landmark || '';
            formData.note = store.customer.residence_note || '';
            formData.locationTypeSelect = store.customer.residence_location_type || '';
            formData.locationTypeOther = store.customer.residence_location_type_other || '';
            formData.ownershipSelect = store.customer.residence_ownership || '';
        } else {
            // Company: Load 'residence_' fields (if any)
            formData.houseAddress = store.customer.residence_address || '';
            formData.subdistrict = store.customer.residence_subdistrict || '';
            formData.postCode = store.customer.residence_zipcode || '';
            formData.district = store.customer.residence_district || '';
            formData.city = store.customer.residence_province || '';
            formData.phone = formatPhoneNumber(store.customer.residence_phone || '');
            formData.fax = store.customer.residence_fax || '';
            formData.email = store.customer.residence_email || '';

            formData.mapCode = store.customer.residence_map_code || '';
            formData.landmark = store.customer.residence_landmark || '';
            formData.note = store.customer.residence_note || '';
            formData.locationTypeSelect = store.customer.residence_location_type || '';
            formData.locationTypeOther = store.customer.residence_location_type_other || '';
            formData.ownershipSelect = store.customer.residence_ownership || '';
        }
     }
  }
});

// Watch store.customer for changes
watch(() => store.customer, (newVal) => {
  if (newVal) {
    if (!isSameAddress.value) {
        if (!isCompany.value) {
            formData.houseAddress = newVal.address || '';
            formData.subdistrict = newVal.subdistrict || '';
            formData.postCode = newVal.zipcode || '';
            formData.district = newVal.district || '';
            formData.city = newVal.province || '';
            formData.phone = formatPhoneNumber(newVal.phone || '');
            formData.fax = newVal.fax || '';
            formData.email = newVal.email || '';
        } else {
            // Company: Bind to residence_ keys
            formData.houseAddress = newVal.residence_address || '';
            formData.subdistrict = newVal.residence_subdistrict || '';
            formData.postCode = newVal.residence_zipcode || '';
            formData.district = newVal.residence_district || '';
            formData.city = newVal.residence_province || '';
            formData.phone = formatPhoneNumber(newVal.residence_phone || '');
            formData.fax = newVal.residence_fax || '';
            formData.email = newVal.residence_email || '';
        }

        // Coordinates/Extra fields are always residence_ keys for this tab
        formData.mapCode = newVal.residence_map_code || '';
        formData.landmark = newVal.residence_landmark || '';
        formData.note = newVal.residence_note || '';
        formData.locationTypeSelect = newVal.residence_location_type || '';
        formData.locationTypeOther = newVal.residence_location_type_other || '';
        formData.ownershipSelect = newVal.residence_ownership || '';
    }
  }
}, { immediate: true, deep: true });

// Sync changes back to store
watch(formData, (newVal) => {
  let updates = {};

  if (!isCompany.value) {
      // Individual: Update 'address' keys (Residence)
      updates = {
        address: newVal.houseAddress,
        subdistrict: newVal.subdistrict,
        zipcode: newVal.postCode,
        district: newVal.district,
        province: newVal.city,
        phone: newVal.phone,
        fax: newVal.fax,
        email: newVal.email,
      };
  } else {
      // Company: Update 'residence_' keys
      updates = {
        residence_address: newVal.houseAddress,
        residence_subdistrict: newVal.subdistrict,
        residence_zipcode: newVal.postCode,
        residence_district: newVal.district,
        residence_province: newVal.city,
        residence_phone: newVal.phone,
        residence_fax: newVal.fax,
        residence_email: newVal.email,
      };
  }

  // Common keys for this tab
  updates.residence_map_code = newVal.mapCode;
  updates.residence_landmark = newVal.landmark;
  updates.residence_note = newVal.note;
  updates.residence_location_type = newVal.locationTypeSelect;
  updates.residence_location_type_other = newVal.locationTypeOther;
  updates.residence_ownership = newVal.ownershipSelect;

  store.updateCustomerData(updates);
}, { deep: true });

function onCoordinatesChange({ mapCode, landmark, note }) {
  // Directly save coordinates when they change in the map component
  store.saveCustomerCoordinates({
    residence_map_code: mapCode,
    residence_landmark: landmark,
    residence_note: note
  });
}

// Watch postCode for auto-completion
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

// Validation Watcher (Moved to end)
watch(() => store.showValidationErrors, (val) => {
    if (val) {
        validateField('houseAddress', formData.houseAddress, ['required']);
        validateField('subdistrict', formData.subdistrict, ['required']);
        validateField('postCode', formData.postCode, ['required']);
        validateField('district', formData.district, ['required']);
        validateField('city', formData.city, ['required']);
        validateField('phone', formData.phone, ['required', 'phone']);

        // New Fields
        validateField('locationType', formData.locationTypeSelect, ['required']);
        validateField('propertyOwnership', formData.ownershipSelect, ['required']);
    }
}, { immediate: true });
</script>

<style scoped>
@import './shared-styles.css';

.residence-tab {
  padding: 10px;
}

.no-data-alert {
  color: red;
  font-size: 12px;
  margin-left: 8px;
  font-weight: normal;
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

/* Split Form Group */
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
