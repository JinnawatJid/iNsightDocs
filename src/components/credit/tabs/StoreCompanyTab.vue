<template>
  <div class="store-company-tab">
    <!-- Address Section -->
    <div class="address-section">
      <div class="section-header">
        <h3>ที่อยู่ร้านค้า/บริษัท</h3>
        <span class="badge-edit">แก้ไขข้อมูล</span>
      </div>

      <div class="form-layout-columns">
        <!-- Left Column -->
        <div class="column-layout">
          <div class="form-group">
            <label>ที่อยู่</label>
            <input type="text" class="form-input disabled" :value="customerData.address" disabled placeholder="**ดึงข้อมูลจาก Dynamics**" />
          </div>
          <div class="row-two-col">
            <div class="form-group">
              <label>อำเภอ/เขต</label>
              <input type="text" class="form-input disabled" :value="customerData.district" disabled placeholder="**ดึงข้อมูลจาก Dynamics**" />
            </div>
            <div class="form-group">
              <label>รหัสไปรษณีย์</label>
              <input type="text" class="form-input disabled" :value="customerData.zipcode" disabled placeholder="**ดึงข้อมูลจาก Dynamics**" />
            </div>
          </div>
        </div>

        <!-- Right Column -->
        <div class="column-layout">
          <div class="row-two-col">
            <div class="form-group">
              <label>จังหวัด</label>
              <input type="text" class="form-input disabled" :value="customerData.province" disabled placeholder="**ดึงข้อมูลจาก Dynamics**" />
            </div>
             <div class="form-group">
              <label>ตำบล/แขวง</label>
              <input type="text" class="form-input disabled" :value="customerData.subdistrict" disabled placeholder="**ดึงข้อมูลจาก Dynamics**" />
            </div>
          </div>
           <div class="form-group">
                <button class="btn-check-map">ตรวจสอบในแผนที่</button>
           </div>
        </div>
      </div>
    </div>

    <!-- Upload Section -->
    <div class="upload-section">
      <div class="upload-grid">
        <div class="upload-item">
          <label>รูปร้านค้า <span class="required">*</span></label>
          <div class="upload-box" @click="triggerUpload('storePhoto')">
            <input type="file" ref="storePhoto" class="hidden-input" @change="handleFileChange($event, 'storePhoto')" />
            <div v-if="!files.storePhoto" class="upload-placeholder">
              <div class="icon-wrapper">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
              </div>
              <p>Drop your files here or <span class="link">Click to upload</span></p>
              <span class="info">SVG, PNG, JPG or GIF (max. 800x400px)</span>
            </div>
            <div v-else class="file-preview">
              <span class="file-name">{{ files.storePhoto.name }}</span>
              <button class="remove-btn" @click.stop="removeFile('storePhoto')">×</button>
            </div>
          </div>
        </div>

        <div class="upload-item">
          <label>ทะเบียนการค้า <span class="required">*</span></label>
          <div class="upload-box" @click="triggerUpload('commercialReg')">
            <input type="file" ref="commercialReg" class="hidden-input" @change="handleFileChange($event, 'commercialReg')" />
            <div v-if="!files.commercialReg" class="upload-placeholder">
              <div class="icon-wrapper">
                 <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
              </div>
              <p>Drop your files here or <span class="link">Click to upload</span></p>
              <span class="info">SVG, PNG, JPG or GIF (max. 800x400px)</span>
            </div>
            <div v-else class="file-preview">
              <span class="file-name">{{ files.commercialReg.name }}</span>
              <button class="remove-btn" @click.stop="removeFile('commercialReg')">×</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'StoreCompanyTab',
  props: {
    customerData: {
      type: Object,
      default: () => ({})
    }
  },
  data() {
    return {
      files: {
        storePhoto: null,
        commercialReg: null
      }
    };
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

.store-company-tab {
  padding: 10px;
}

.address-section {
  margin-bottom: 20px;
}

.btn-check-map {
    width: 100%;
    padding: 12px;
    background-color: #f0f0f0;
    border: 1px solid #e0e0e0;
    border-radius: 4px;
    cursor: pointer;
    text-align: center;
}
</style>
