<template>
  <div class="residence-tab">
    <!-- Upload Section -->
    <div class="upload-section">
      <div class="upload-grid">
        <!-- Home Photo -->
        <FileUploader
          label="รูปถ่ายบ้าน"
          required
          accept="image/*"
          v-model="files.homePhoto"
        >
          <template #icon>
             <img :src="iconImage" alt="Image" width="24" height="24" />
          </template>
        </FileUploader>

        <!-- Land Tax Document -->
        <FileUploader
          label="เอกสารเสียภาษีที่ดิน"
          required
          v-model="files.landTax"
        />
      </div>
    </div>

    <!-- Address Verification Section -->
    <div class="address-verification">
      <div class="section-header">
        <h3>ตรวจสอบข้อมูลที่อยู่</h3>
        <!-- Removed Edit button -->
      </div>

      <!-- Map Placeholder -->
      <div class="map-container">
        <div class="map-placeholder">
          <div class="map-content">
            <img :src="iconMapPin" alt="Map Pin" width="48" height="48" />
            <span>Google Map Area</span>
          </div>
        </div>
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
            <!-- Hybrid text input always enabled if isEditing is true -->
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
import { reactive, watch, ref } from 'vue';
import { searchAddressByZipcode } from 'thai-address-database';
import FileUploader from '@/components/shared/FileUploader.vue';
import { useCreditRequestStore } from '@/stores/creditRequest';
import { useFormValidation } from '@/composables/useFormValidation';
import iconImage from '@/assets/icons/image.svg';
import iconMapPin from '@/assets/icons/map-pin.svg';

const store = useCreditRequestStore();
const { errors, validateField, restrictPhoneInput } = useFormValidation();

const isEditing = ref(true); // Editable by default

const files = reactive({
  homePhoto: null,
  landTax: null
});

// Watch for file changes to update store for Approval Chance logic
watch(() => files.homePhoto, (newVal) => {
  store.updateDocumentStatus('home_photo', !!newVal);
});

watch(() => files.landTax, (newVal) => {
  store.updateDocumentStatus('land_tax', !!newVal);
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
  ownershipOther: ''
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

// Watch store.customer for changes
watch(() => store.customer, (newVal) => {
  if (newVal) {
    formData.houseAddress = newVal.address || '';
    formData.postCode = newVal.zipcode || '';
    formData.district = newVal.district || '';
    formData.city = newVal.province || '';
    formData.phone = formatPhoneNumber(newVal.phone || '');
    formData.email = newVal.email || '';
    
    // Ensure subdistrict is blank for manual entry
    formData.subdistrict = '';
  }
}, { immediate: true, deep: true });

// Sync changes back to store
watch(formData, (newVal) => {
  const updates = {
    address: newVal.houseAddress,
    zipcode: newVal.postCode,
    district: newVal.district,
    province: newVal.city,
    phone: newVal.phone, // We store formatted or cleaned? Store keeps what is passed.
    // Phone logic in backend likely expects digits, but formatPhoneNumber adds dashes.
    // If backend expects raw digits, we should clean it.
    // But formatPhoneNumber is used for display.
    // Let's store what is in the input.
    // Wait, createCreditRequest uses customer_no and customer_name.
    // If other fields are saved later, they might need cleaning.
    // For now, syncing the form value is enough for client-side persistence.
    email: newVal.email
  };
  store.updateCustomerData(updates);
}, { deep: true });

// Watch postCode for auto-completion
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
</style>
