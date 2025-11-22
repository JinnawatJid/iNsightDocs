<template>
  <div class="document-upload-section">
    <h3>เอกสารประกอบการพิจารณา</h3>

    <div class="tabs">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        :class="['tab-btn', { active: activeTab === tab.id }]"
        @click="activeTab = tab.id"
      >
        {{ tab.label }}
      </button>
    </div>

    <!-- Tab 1: General Information -->
    <div class="tab-content" v-if="activeTab === 'general'">
      <div class="upload-grid">
        <div class="upload-item">
          <label>สำเนาบัตรประชาชน</label>
          <div class="upload-box" @click="triggerUpload('id-card')">
             <input type="file" ref="id-card" class="hidden-input" @change="handleFileChange($event, 'id_card')" />
             <div class="upload-placeholder">
                <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#0056FF" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" class="feather feather-file-text"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                <p>Drop your files here or <span class="link">Click to upload</span></p>
                <span class="info">SVG, PNG, JPG or GIF (max. 800x400px)</span>
             </div>
             <div v-if="files.id_card" class="file-preview">
               {{ files.id_card.name }}
             </div>
          </div>
        </div>

        <div class="upload-item">
          <label>สำเนาทะเบียนบ้าน</label>
          <div class="upload-box" @click="triggerUpload('home-reg')">
             <input type="file" ref="home-reg" class="hidden-input" @change="handleFileChange($event, 'home_reg')" />
             <div class="upload-placeholder">
                <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#0056FF" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" class="feather feather-file-text"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                <p>Drop your files here or <span class="link">Click to upload</span></p>
                <span class="info">SVG, PNG, JPG or GIF (max. 800x400px)</span>
             </div>
             <div v-if="files.home_reg" class="file-preview">
               {{ files.home_reg.name }}
             </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Tab 2: Residential Address -->
    <div class="tab-content" v-if="activeTab === 'address'">
      <div class="upload-grid">
        <div class="upload-item">
          <label>รูปถ่ายบ้าน</label>
          <div class="upload-box" @click="triggerUpload('home-photo')">
             <input type="file" ref="home-photo" class="hidden-input" @change="handleFileChange($event, 'home_photo')" />
             <div class="upload-placeholder">
                <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#0056FF" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" class="feather feather-image"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
                <p>Drop your files here or <span class="link">Click to upload</span></p>
                <span class="info">SVG, PNG, JPG or GIF (max. 800x400px)</span>
             </div>
             <div v-if="files.home_photo" class="file-preview">
               {{ files.home_photo.name }}
             </div>
          </div>
        </div>

        <div class="upload-item">
          <label>เอกสารเสียภาษีที่ดิน</label>
          <div class="upload-box" @click="triggerUpload('land-tax')">
             <input type="file" ref="land-tax" class="hidden-input" @change="handleFileChange($event, 'land_tax')" />
             <div class="upload-placeholder">
                <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#0056FF" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" class="feather feather-file-text"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                <p>Drop your files here or <span class="link">Click to upload</span></p>
                <span class="info">SVG, PNG, JPG or GIF (max. 800x400px)</span>
             </div>
             <div v-if="files.land_tax" class="file-preview">
               {{ files.land_tax.name }}
             </div>
          </div>
        </div>
      </div>

      <div class="address-details">
         <div class="map-placeholder">
            <span>Google Map Extension (Pin Location)</span>
         </div>
         <textarea class="form-input" placeholder="รายละเอียดที่อยู่..." rows="3" v-model="addressDetails.residential"></textarea>
      </div>
    </div>

    <!-- Tab 3: Store/Company Address -->
    <div class="tab-content" v-if="activeTab === 'store'">
      <div class="checkbox-row">
        <label class="checkbox-label">
          <input type="checkbox" v-model="sameAsResidential"> ที่อยู่เดียวกับที่อยู่อาศัย
        </label>
      </div>

      <div class="upload-grid" :class="{ disabled: sameAsResidential }">
        <div class="upload-item">
          <label>รูปถ่ายบริษัท/ร้านค้า</label>
          <div class="upload-box" @click="!sameAsResidential && triggerUpload('company-photo')">
             <input type="file" ref="company-photo" class="hidden-input" @change="handleFileChange($event, 'company_photo')" :disabled="sameAsResidential" />
             <div class="upload-placeholder">
                <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#0056FF" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" class="feather feather-image"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
                <p>Drop your files here or <span class="link">Click to upload</span></p>
                <span class="info">SVG, PNG, JPG or GIF (max. 800x400px)</span>
             </div>
             <div v-if="files.company_photo" class="file-preview">
               {{ files.company_photo.name }}
             </div>
          </div>
        </div>

        <div class="upload-item">
          <label>เอกสารเสียภาษีที่ดินบริษัท/ร้านค้า</label>
          <div class="upload-box" @click="!sameAsResidential && triggerUpload('company-land-tax')">
             <input type="file" ref="company-land-tax" class="hidden-input" @change="handleFileChange($event, 'company_land_tax')" :disabled="sameAsResidential" />
             <div class="upload-placeholder">
                <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#0056FF" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" class="feather feather-file-text"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                <p>Drop your files here or <span class="link">Click to upload</span></p>
                <span class="info">SVG, PNG, JPG or GIF (max. 800x400px)</span>
             </div>
             <div v-if="files.company_land_tax" class="file-preview">
               {{ files.company_land_tax.name }}
             </div>
          </div>
        </div>
      </div>

      <div class="address-details" :class="{ disabled: sameAsResidential }">
         <div class="map-placeholder">
            <span>Google Map Extension (Pin Location)</span>
         </div>
         <textarea class="form-input" placeholder="รายละเอียดที่อยู่..." rows="3" v-model="addressDetails.company" :disabled="sameAsResidential"></textarea>
      </div>
    </div>

    <!-- Tab 4: Financial Documents -->
    <div class="tab-content" v-if="activeTab === 'finance'">
       <div class="upload-grid single-col">
        <div class="upload-item">
          <label>Statement ย้อนหลัง 3 เดือน</label>
          <div class="upload-box" @click="triggerUpload('statement')">
             <input type="file" ref="statement" class="hidden-input" @change="handleFileChange($event, 'statement')" multiple />
             <div class="upload-placeholder">
                <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#0056FF" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" class="feather feather-file-text"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                <p>Drop your files here or <span class="link">Click to upload</span></p>
                <span class="info">SVG, PNG, JPG or GIF (max. 800x400px)</span>
             </div>
             <div v-if="files.statement" class="file-preview">
               {{ files.statement.name }} (and other selected files)
             </div>
          </div>
        </div>
       </div>
    </div>

  </div>
</template>

<script>
export default {
  name: 'DocumentUploadSection',
  data() {
    return {
      activeTab: 'general',
      tabs: [
        { id: 'general', label: 'ข้อมูลทั่วไป' },
        { id: 'address', label: 'ที่อยู่อาศัย' },
        { id: 'store', label: 'ที่อยู่ร้านค้า' },
        { id: 'finance', label: 'เอกสารการเงิน' },
      ],
      files: {
        id_card: null,
        home_reg: null,
        home_photo: null,
        land_tax: null,
        company_photo: null,
        company_land_tax: null,
        statement: null
      },
      addressDetails: {
        residential: '',
        company: ''
      },
      sameAsResidential: false
    };
  },
  methods: {
    triggerUpload(refName) {
      if (this.$refs[refName]) {
          this.$refs[refName].click();
      }
    },
    handleFileChange(event, key) {
      const file = event.target.files[0];
      if (file) {
        this.files[key] = file;
      }
    }
  }
};
</script>

<style scoped>
.document-upload-section {
  background: white;
  padding: 0px 20px 20px 20px;
  border-radius: 8px;
  border: 1px solid #e0e0e0;
  margin-bottom: 20px;
}

h3 {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 18px;
  font-weight: bold;
  margin-bottom: 20px;
}

h3::before {
  content: '';
  display: inline-block;
  width: 24px;
  height: 24px;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z'%3E%3C/path%3E%3Cpolyline points='14 2 14 8 20 8'%3E%3C/polyline%3E%3Cline x1='16' y1='13' x2='8' y2='13'%3E%3C/line%3E%3Cline x1='16' y1='17' x2='8' y2='17'%3E%3C/line%3E%3Cpolyline points='10 9 9 9 8 9'%3E%3C/polyline%3E%3C/svg%3E");
  background-repeat: no-repeat;
}

.tabs {
  display: flex;
  background-color: #888;
  border: 1px solid #ccc;
  border-radius: 52px;
  overflow: hidden;
  margin: 0 auto 20px auto; /* Centering with auto margins */
  width: fit-content;
}

.tab-btn {
  padding: 8px 20px;
  border: none;
  border-radius: 52px;
  background: transparent;
  color: white;
  cursor: pointer;
  font-size: 14px;
}

.tab-btn.active {
  background-color: white;
  border: 1px solid #ccc;
  color: black;
  border-radius: 52px;
  font-weight: bold;
}

.upload-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}

.upload-grid.single-col {
  grid-template-columns: 1fr;
}

.upload-item label {
  display: block;
  margin-bottom: 8px;
  font-weight: bold;
  font-size: 14px;
}

.upload-box {
  border: 1px dashed #ccc;
  border-radius: 8px;
  padding: 30px;
  text-align: center;
  cursor: pointer;
  position: relative;
  transition: border-color 0.2s;
  background-color: white;
}

.upload-box:hover {
  border-color: #0056FF;
}

.hidden-input {
  display: none;
}

.upload-placeholder p {
  margin: 10px 0 5px;
  font-size: 14px;
  color: #555;
}

.upload-placeholder .link {
  color: #0056FF;
  font-weight: bold;
  text-decoration: underline;
}

.upload-placeholder .info {
  font-size: 11px;
  color: #999;
}

.file-preview {
  margin-top: 10px;
  font-size: 12px;
  color: #28a745;
  font-weight: bold;
}

.checkbox-row {
  margin-bottom: 15px;
}

.checkbox-label {
  font-size: 14px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 5px;
}

.address-details {
  margin-top: 20px;
}

.map-placeholder {
  background-color: #eee;
  height: 150px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #888;
  border-radius: 4px;
  margin-bottom: 10px;
  border: 1px dashed #ccc;
}

.form-input {
  width: 100%;
  padding: 10px;
  border: 1px solid #ccc;
  border-radius: 4px;
  box-sizing: border-box;
  font-size: 14px;
  resize: vertical;
}

/* Disabled State Styles */
.upload-grid.disabled .upload-box,
.address-details.disabled .map-placeholder,
.address-details.disabled .form-input {
  opacity: 0.5;
  pointer-events: none;
  background-color: #f9f9f9;
}

</style>
