<template>
  <div class="residence-tab">
    <!-- Upload Section -->
    <div class="upload-section">
      <div class="upload-grid">
        <!-- Home Photo -->
        <div class="upload-item">
          <label>รูปถ่ายบ้าน <span class="required">*</span></label>
          <div class="upload-box" @click="triggerUpload('homePhoto')">
            <input
              type="file"
              ref="homePhoto"
              class="hidden-input"
              @change="handleFileChange($event, 'homePhoto')"
              accept="image/*"
            />
            <div v-if="!files.homePhoto" class="upload-placeholder">
              <div class="icon-wrapper">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
              </div>
              <p>Drop your files here or <span class="link">Click to upload</span></p>
              <span class="info">SVG, PNG, JPG or GIF (max. 800x400px)</span>
            </div>
            <div v-else class="file-preview">
              <span class="file-name">{{ files.homePhoto.name }}</span>
              <button class="remove-btn" @click.stop="removeFile('homePhoto')">×</button>
            </div>
          </div>
        </div>

        <!-- Land Tax Document -->
        <div class="upload-item">
          <label>เอกสารเสียภาษีที่ดิน <span class="required">*</span></label>
          <div class="upload-box" @click="triggerUpload('landTax')">
            <input
              type="file"
              ref="landTax"
              class="hidden-input"
              @change="handleFileChange($event, 'landTax')"
            />
            <div v-if="!files.landTax" class="upload-placeholder">
              <div class="icon-wrapper">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
              </div>
              <p>Drop your files here or <span class="link">Click to upload</span></p>
              <span class="info">SVG, PNG, JPG or GIF (max. 800x400px)</span>
            </div>
            <div v-else class="file-preview">
              <span class="file-name">{{ files.landTax.name }}</span>
              <button class="remove-btn" @click.stop="removeFile('landTax')">×</button>
            </div>
          </div>
        </div>
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
          <label>เบอร์โทรศัพท์</label>
          <input type="text" class="form-control" v-model="formData.phone" placeholder="0XX-XXX-XXXX" />
        </div>
        <div class="form-group">
          <label>แฟกซ์/อีเมล</label>
          <input type="text" class="form-control" v-model="formData.email" placeholder="example@email.com" />
        </div>
        <div class="form-group">
          <label>ลักษณะที่ตั้ง</label>
           <div class="custom-select-group">
            <button class="select-trigger">เลือกประเภทที่ตั้ง</button>
            <input type="text" class="form-control" placeholder="ระบุ..." />
          </div>
        </div>
        <div class="form-group">
          <label>กรรมสิทธิ์ทรัพย์สิน</label>
           <div class="custom-select-group">
            <button class="select-trigger">เลือกประเภทกรรมสิทธิ์</button>
            <input type="text" class="form-control" placeholder="ระบุ..." />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { searchAddressByZipcode } from 'thai-address-database';

export default {
  name: 'ResidenceTab',
  props: {
    customerData: {
      type: Object,
      default: () => ({})
    }
  },
  data() {
    return {
      files: {
        homePhoto: null,
        landTax: null
      },
      formData: {
        houseAddress: '',
        subdistrict: '',
        postCode: '',
        district: '',
        city: '',
        phone: '',
        email: ''
      }
    };
  },
  watch: {
    customerData: {
      immediate: true,
      deep: true,
      handler(newVal) {
        if (newVal) {
          this.formData.houseAddress = newVal.Address || '';
          this.formData.postCode = newVal['Post Code'] || '';
          this.formData.district = newVal.City || '';
          this.formData.city = newVal.County || '';
          this.formData.phone = newVal['Phone No_'] || '';
          this.formData.email = newVal.email || '';
          // Assuming subdistrict is not in the initial fetch
        }
      }
    },
    'formData.postCode'(newZip) {
      if (newZip && newZip.length === 5) {
        const results = searchAddressByZipcode(newZip);
        if (results.length > 0) {
          this.formData.subdistrict = results[0].district;
          this.formData.district = results[0].amphoe;
          this.formData.city = results[0].province;
        }
      }
    }
  },
  methods: {
    triggerUpload(refName) {
      this.$refs[refName].click();
    },
    handleFileChange(event, key) {
      const file = event.target.files[0];
      if (file) {
        this.files[key] = file;
      }
    },
    removeFile(key) {
      this.files[key] = null;
    }
  }
};
</script>

<style scoped>
@import './shared-styles.css';

.residence-tab {
  padding: 10px;
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
