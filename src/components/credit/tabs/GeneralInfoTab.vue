<template>
  <div class="general-info-tab">
    <!-- Upload Section -->
    <div class="upload-section">
      <div class="upload-grid">
        <div class="upload-item">
          <label>สำเนาบัตรประชาชน <span class="required">*</span></label>
          <div class="upload-box" @click="triggerUpload('idCard')">
            <input type="file" ref="idCard" class="hidden-input" @change="handleFileChange($event, 'idCard')" />
            <div v-if="!files.idCard" class="upload-placeholder">
              <div class="icon-wrapper">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
              </div>
              <p>Drop your files here or <span class="link">Click to upload</span></p>
              <span class="info">SVG, PNG, JPG or GIF (max. 800x400px)</span>
            </div>
            <div v-else class="file-preview">
              <span class="file-name">{{ files.idCard.name }}</span>
              <button class="remove-btn" @click.stop="removeFile('idCard')">×</button>
            </div>
          </div>
        </div>

        <div class="upload-item">
          <label>สำเนาทะเบียนบ้าน <span class="required">*</span></label>
          <div class="upload-box" @click="triggerUpload('homeReg')">
            <input type="file" ref="homeReg" class="hidden-input" @change="handleFileChange($event, 'homeReg')" />
            <div v-if="!files.homeReg" class="upload-placeholder">
              <div class="icon-wrapper">
                 <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
              </div>
              <p>Drop your files here or <span class="link">Click to upload</span></p>
              <span class="info">SVG, PNG, JPG or GIF (max. 800x400px)</span>
            </div>
            <div v-else class="file-preview">
              <span class="file-name">{{ files.homeReg.name }}</span>
              <button class="remove-btn" @click.stop="removeFile('homeReg')">×</button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <hr class="divider" />

    <!-- General Info Form -->
    <div class="form-grid">
      <div class="form-group">
        <label>ชื่อ-นามสกุล</label>
        <div class="info-value">{{ displayName || '-' }}</div>
      </div>

      <div class="form-group">
        <label>ตำแหน่ง</label>
        <input type="text" class="form-control" placeholder="-" />
      </div>

      <div class="form-group">
        <label>บริษัท</label>
        <div class="info-value">{{ displayCompany || '-' }}</div>
      </div>

      <div class="form-group">
        <label>วงเงินเครดิต</label>
        <div class="info-value">-</div>
      </div>

      <div class="form-group full-width">
         <label>เหตุผลขอเครดิต</label>
         <div class="info-value">-</div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'GeneralInfoTab',
  props: {
    customerData: {
      type: Object,
      default: () => ({})
    }
  },
  data() {
    return {
      files: {
        idCard: null,
        homeReg: null
      }
    };
  },
  computed: {
    displayName() {
      // If contact person exists, that's likely the individual's name.
      // Otherwise use the main name.
      return this.customerData.contact_person || this.customerData.name;
    },
    displayCompany() {
      // If contact person exists, the main name is likely the Company.
      // If not, and we used name for displayName, then Company might be blank or same?
      // For now: if contact_person exists, use name as Company.
      if (this.customerData.contact_person) {
        return this.customerData.name;
      }
      return '-';
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
.general-info-tab {
  padding: 10px;
}

.upload-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  margin-bottom: 30px;
}

.upload-item label {
  display: block;
  font-weight: 500;
  margin-bottom: 10px;
  font-size: 14px;
}

.upload-item .required {
  color: red;
}

.upload-box {
  border: 1px dashed #ccc;
  border-radius: 8px;
  height: 150px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  background-color: #fafafa;
  transition: border-color 0.2s;
}

.upload-box:hover {
  border-color: #0056FF;
  background-color: #f0f7ff;
}

.hidden-input {
  display: none;
}

.upload-placeholder {
  text-align: center;
}

.icon-wrapper {
  color: #0056FF;
  margin-bottom: 8px;
}

.upload-placeholder p {
  font-size: 13px;
  margin: 5px 0;
  color: #666;
}

.upload-placeholder .link {
  color: #0056FF;
  text-decoration: underline;
}

.upload-placeholder .info {
  font-size: 11px;
  color: #999;
  display: block;
}

.file-preview {
  display: flex;
  align-items: center;
  gap: 10px;
  background: white;
  padding: 5px 10px;
  border-radius: 4px;
  border: 1px solid #ddd;
}

.remove-btn {
  background: none;
  border: none;
  font-size: 16px;
  cursor: pointer;
  color: #999;
}

.divider {
  border: none;
  border-top: 1px solid #eee;
  margin: 20px 0;
}

.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}

.form-group {
  margin-bottom: 15px;
}

.form-group.full-width {
  grid-column: 1 / -1;
}

.form-group label {
  display: block;
  font-size: 14px;
  color: #888;
  margin-bottom: 5px;
}

.info-value {
  font-size: 16px;
  font-weight: 500;
  color: #333;
}

.form-control {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  font-size: 14px;
}
</style>
