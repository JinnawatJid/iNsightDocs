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

      <div class="form-layout-columns">
        <!-- Left Column -->
        <div class="column-layout">
          <div class="form-group">
            <label>ชื่อจริง นามสกุล</label>
            <input type="text" class="form-input disabled" :value="displayName" disabled placeholder="**ดึงข้อมูลจาก Dynamics**" />
          </div>
          <div class="form-group">
            <label>ตำแหน่ง</label>
            <input type="text" class="form-input" placeholder="เจ้าหน้าที่ใส่" v-model="formData.position" />
          </div>
        </div>

        <!-- Right Column -->
        <div class="column-layout">
          <div class="form-group">
            <label>ชื่อร้าน/บริษัท</label>
            <input type="text" class="form-input disabled" :value="displayCompany" disabled placeholder="**ดึงข้อมูลจาก Dynamics**" />
          </div>
          <div class="row-two-col">
            <div class="form-group">
              <label>วงเงินสินเชื่อที่ต้องการ</label>
              <input type="text" class="form-input" placeholder="เจ้าหน้าที่ใส่" v-model="formData.creditAmount" />
            </div>
            <div class="form-group">
              <label>สาเหตุการขอเครดิต</label>
              <select class="form-input" v-model="formData.creditReason">
                  <option value="สต๊อคสินค้า">สต๊อคสินค้า</option>
                  <option value="หมุนเวียนธุรกิจ">หมุนเวียนธุรกิจ</option>
                  <option value="ขยายกิจการ">ขยายกิจการ</option>
              </select>
            </div>
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
      },
      formData: {
        position: '',
        creditAmount: '',
        creditReason: 'สต๊อคสินค้า'
      }
    };
  },
  computed: {
    displayName() {
      // Logic: Contact Person > Name
      return this.customerData.contact_person || this.customerData.name || '';
    },
    displayCompany() {
      // Logic: If Contact Person exists, Name is Company.
      // If only Name exists (Individual), Company might be empty or same.
      // Assuming if VAT ID exists, it's a company.
      if (this.customerData.contact_person) {
        return this.customerData.name || '';
      }
      return this.customerData.name || '';
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

.general-info-tab {
  padding: 10px;
}

/* Personal Info Section */
.personal-info-section {
  margin-top: 20px;
}
</style>
