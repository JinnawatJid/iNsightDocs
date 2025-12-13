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
        />
        <FileUploader
          label="เอกสารภพ.20"
          required
          v-model="files.vatDocument"
        />
        <FileUploader
          label="รูปถ่ายบริษัท"
          required
          v-model="files.companyPhoto"
        >
          <template #icon>
            <img :src="iconImage" alt="Image" width="24" height="24" />
          </template>
        </FileUploader>
        <FileUploader
          label="เอกสารเสียภาษีที่ดินบริษัท"
          required
          v-model="files.companyLandTax"
        />
      </div>
      <!-- Individual/Store Uploads -->
      <div v-else class="upload-grid">
        <FileUploader
          label="รูปร้านค้า"
          required
          v-model="files.storePhoto"
        >
          <template #icon>
             <img :src="iconImage" alt="Image" width="24" height="24" />
          </template>
        </FileUploader>
        <FileUploader
          label="ทะเบียนพาณิชย์"
          required
          v-model="files.commercialReg"
        />
        <FileUploader
          label="เอกสารเสียภาษีที่ดินร้านค้า"
          required
          v-model="files.storeLandTax"
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

      <!-- Map Component -->
      <div class="map-container">
        <CoordinateMap
          :mapCode="formData.mapCode"
          :landmark="formData.landmark"
          :note="formData.note"
          :disabled="!isEditing"
          @change="onCoordinatesChange"
        />
      </div>

      <!-- Address Form -->
      <div class="form-grid-complex">
        <div class="form-group span-2">
          <label>ที่อยู่ (บ้านเลขที่, ถนน) <span class="text-red-500">*</span></label>
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
          <label>ตำบล/แขวง <span class="text-red-500">*</span></label>
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
          <label>รหัสไปรษณีย์ <span class="text-red-500">*</span></label>
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
          <label>อำเภอ/เขต <span class="text-red-500">*</span></label>
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
          <label>จังหวัด <span class="text-red-500">*</span></label>
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
      <div class="bottom-grid">
        <div class="form-group">
          <label>
            เบอร์โทรศัพท์
            <span class="text-red-500">*</span>
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
            @blur="validateField('phone', formData.phone, ['required', 'phone'])"
          />
          <span v-if="errors.phone" class="error-text">{{ errors.phone }}</span>
        </div>
        <div class="form-group">
          <label>แฟกซ์/อีเมล</label>
          <input
            type="text"
            class="form-control"
            :class="{ 'disabled': !isEditing }"
            :disabled="!isEditing"
            v-model="formData.email"
            placeholder="example@email.com"
          />
        </div>
        <div class="form-group">
          <label>ลักษณะที่ตั้ง <span class="text-red-500">*</span></label>
          <div class="custom-select-group">
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
        <div class="form-group">
          <label>กรรมสิทธิ์ทรัพย์สิน <span class="text-red-500">*</span></label>
          <div class="custom-select-group">
            <select
              class="form-control"
              :class="{ 'disabled': !isEditing }"
              :disabled="!isEditing"
              v-model="formData.ownershipSelect"
            >
              <option value="" disabled selected>เลือกประเภทกรรมสิทธิ์</option>
              <option value="เป็นเจ้าของ">เป็นเจ้าของ</option>
              <option value="เช่า">เช่า</option>
            </select>
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
import iconImage from '@/assets/icons/image.svg';

const store = useCreditRequestStore();
const { errors, validateField, restrictPhoneInput } = useFormValidation();

const isEditing = ref(true); // Editable by default
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

const formData = reactive({
  houseAddress: '',
  subdistrict: '',
  postCode: '',
  district: '',
  city: '',
  phone: '',
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
    formData.email = store.customer.email || '';
    
    // Coordinates for Store - if copying from residence, we might want to copy coords too?
    // "sameAddress" logic implies store is at residence. So we copy residence coords.
    formData.mapCode = store.customer.residence_map_code || '';
    formData.landmark = store.customer.residence_landmark || '';
    formData.note = store.customer.residence_note || '';

    formData.subdistrict = '';
  } else {
    // Clear only if unchecking? Or keep? Usually clear if copying logic is off.
    // For now, let's clear to be safe, or user can edit.
    formData.houseAddress = '';
    formData.subdistrict = '';
    formData.postCode = '';
    formData.district = '';
    formData.city = '';
    formData.phone = '';
    formData.email = '';
  }
});

watch(formData, (newVal) => {
  if (isCompany.value) {
     const updates = {
      address: newVal.houseAddress,
      zipcode: newVal.postCode,
      district: newVal.district,
      province: newVal.city,
      phone: newVal.phone,
      email: newVal.email,
      store_map_code: newVal.mapCode,
      store_landmark: newVal.landmark,
      store_note: newVal.note
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

.checkbox-wrapper {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: #333;
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

.form-grid-complex {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 15px;
  margin-bottom: 15px;
}

.bottom-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 15px;
}

.form-group.span-2 {
  grid-column: span 2;
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

/* Also disable checkbox if not editing */
input[type="checkbox"]:disabled {
  cursor: not-allowed;
}
</style>
