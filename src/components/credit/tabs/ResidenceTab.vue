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
             <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
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
        <span class="badge-edit">แก้ไขข้อมูลที่อยู่</span>
      </div>

      <!-- Map Placeholder -->
      <div class="map-container">
        <div class="map-placeholder">
          <div class="map-content">
            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#ccc" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
            <span>Google Map Area</span>
          </div>
        </div>
      </div>

      <!-- Address Form -->
      <div class="form-grid-complex">
        <div class="form-group span-2">
          <label>ที่อยู่ (บ้านเลขที่, ถนน)</label>
          <input type="text" class="form-control" v-model="formData.houseAddress" placeholder="ระบุบ้านเลขที่, ถนน" />
        </div>
        <div class="form-group">
          <label>ตำบล/แขวง</label>
          <input type="text" class="form-control" v-model="formData.subdistrict" placeholder="อัตโนมัติ" />
        </div>
        <div class="form-group">
          <label>รหัสไปรษณีย์</label>
          <input type="text" class="form-control" v-model="formData.postCode" placeholder="ระบุรหัสไปรษณีย์" />
        </div>
        <div class="form-group">
          <label>อำเภอ/เขต</label>
          <input type="text" class="form-control" v-model="formData.district" placeholder="อัตโนมัติ" />
        </div>
        <div class="form-group">
          <label>จังหวัด</label>
          <input type="text" class="form-control" v-model="formData.city" placeholder="อัตโนมัติ" />
        </div>
      </div>
       <div class="bottom-grid">
         <div class="form-group">
          <label>
            เบอร์โทรศัพท์ 
            <span v-if="!formData.phone" class="no-data-alert">ไม่พบข้อมูล</span>
          </label>
          <input type="text" class="form-control" v-model="formData.phone" placeholder="0XX-XXX-XXXX" />
        </div>
        <div class="form-group">
          <label>แฟกซ์/อีเมล</label>
          <input type="text" class="form-control" v-model="formData.email" placeholder="example@email.com" />
        </div>
        <div class="form-group">
          <label>ลักษณะที่ตั้ง</label>
           <div class="custom-select-group">
            <select class="form-control" v-model="formData.locationTypeSelect">
              <option value="" disabled selected>เลือกประเภทที่ตั้ง</option>
              <option value="อาคารพาณิชย์">อาคารพาณิชย์</option>
              <option value="สำนักงานบนอาคารชุด">สำนักงานบนอาคารชุด</option>
              <option value="บ้าน">บ้าน</option>
              <option value="โรงงาน">โรงงาน</option>
            </select>
            <input type="text" class="form-control" v-model="formData.locationTypeOther" placeholder="ระบุ..." />
          </div>
        </div>
        <div class="form-group">
          <label>กรรมสิทธิ์ทรัพย์สิน</label>
           <div class="custom-select-group">
            <select class="form-control" v-model="formData.ownershipSelect">
              <option value="" disabled selected>เลือกประเภทกรรมสิทธิ์</option>
              <option value="เป็นเจ้าของ">เป็นเจ้าของ</option>
              <option value="เช่า">เช่า</option>
            </select>
            <input type="text" class="form-control" v-model="formData.ownershipOther" placeholder="ระบุ..." />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { reactive, watch } from 'vue';
import { searchAddressByZipcode } from 'thai-address-database';
import FileUploader from '@/components/shared/FileUploader.vue';
import { useCreditRequestStore } from '@/stores/creditRequest';

const store = useCreditRequestStore();

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
</style>
