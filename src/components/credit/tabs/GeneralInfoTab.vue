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

    <!-- Personal Info Section -->
    <div class="personal-info-section">
      <div class="section-header">
        <h3>ตรวจสอบข้อมูลส่วนตัว</h3>
        <span class="badge-edit">แก้ไขข้อมูลส่วนตัว</span>
      </div>

      <div class="form-grid">
        <div class="form-group">
          <label>ชื่อจริง นามสกุล (ตัวอย่าง สมชาย เหล็กดี)</label>
          <div class="readonly-field">
            {{ displayName || '**ดึงข้อมูลจาก Dynamics**' }}
          </div>
        </div>

        <div class="form-group">
          <label>ชื่อร้าน/บริษัท</label>
          <div class="readonly-field">
            {{ displayCompany || '**ดึงข้อมูลจาก Dynamics**' }}
          </div>
        </div>

        <div class="form-group">
          <label>ตำแหน่ง</label>
          <input type="text" class="form-control" placeholder="เจ้าหน้าที่ใส่" />
        </div>

        <div class="form-group">
          <label>วงเงินสินเชื่อที่ต้องการ</label>
          <input type="text" class="form-control" placeholder="เจ้าหน้าที่ใส่" />
        </div>

        <div class="form-group">
           <label>สาเหตุการขอเครดิต</label>
           <div class="custom-select-wrapper">
              <select class="form-control select-input">
                <option value="" disabled selected>สต๊อคสินค้า</option>
                <option value="stock">สต๊อคสินค้า</option>
                <option value="expansion">ขยายกิจการ</option>
                <option value="other">อื่นๆ</option>
              </select>
           </div>
        </div>
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
      // Logic: Contact Person > Name
      return this.customerData.contact_person || this.customerData.name;
    },
    displayCompany() {
      // Logic: If Contact Person exists, Name is Company. Else maybe empty/same?
      if (this.customerData.contact_person) {
        return this.customerData.name;
      }
      return this.customerData.name; // Use main name as company fallback or let it be Dynamics placeholder if empty
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
  margin-bottom: 40px;
}

.upload-item label {
  display: block;
  font-weight: bold;
  margin-bottom: 10px;
  font-size: 14px;
}

.upload-item .required {
  color: red;
}

.upload-box {
  border: 1px dashed #e0e0e0;
  border-radius: 12px;
  height: 180px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  background-color: white;
  transition: border-color 0.2s;
}

.upload-box:hover {
  border-color: #0056FF;
}

.hidden-input {
  display: none;
}

.upload-placeholder {
  text-align: center;
}

.icon-wrapper {
  background-color: #E6F0FF; /* Light blue background for icon */
  width: 50px;
  height: 50px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 15px auto;
  color: #0056FF;
}

.upload-placeholder p {
  font-size: 14px;
  margin: 5px 0;
  color: #333;
}

.upload-placeholder .link {
  color: #0056FF;
  font-weight: 500;
  cursor: pointer;
  text-decoration: none;
}

.upload-placeholder .info {
  font-size: 12px;
  color: #999;
  display: block;
  margin-top: 5px;
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

/* Personal Info Section */
.personal-info-section {
  margin-top: 20px;
}

.section-header {
  display: flex;
  align-items: center;
  gap: 15px;
  margin-bottom: 20px;
}

.section-header h3 {
  font-size: 16px;
  font-weight: bold;
  margin: 0;
}

.badge-edit {
  background-color: #FBC02D; /* Yellow/Gold */
  color: white;
  font-size: 12px;
  padding: 4px 12px;
  border-radius: 12px;
  font-weight: 500;
  cursor: pointer;
}

.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  align-items: start;
}

.form-group {
  margin-bottom: 10px;
}

.form-group label {
  display: block;
  font-size: 14px;
  font-weight: bold;
  color: #333;
  margin-bottom: 8px;
}

.readonly-field {
  background-color: #F0F2F5; /* Light gray background */
  padding: 10px 12px;
  border-radius: 4px;
  color: #666;
  font-size: 14px;
  min-height: 20px; /* Ensure height if empty */
}

.form-control {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #e0e0e0; /* No border for input style in screenshot? Actually standard input style */
  background-color: #F0F2F5; /* Matches placeholder bg in screenshot */
  border-radius: 4px;
  font-size: 14px;
  box-sizing: border-box;
}

.form-control::placeholder {
  color: #999;
}

.custom-select-wrapper {
  position: relative;
}

/* Make select look consistent */
.select-input {
  appearance: none;
  -webkit-appearance: none;
  -moz-appearance: none;
  background-image: url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23333%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E");
  background-repeat: no-repeat;
  background-position: right .7em top 50%;
  background-size: .65em auto;
}
</style>
