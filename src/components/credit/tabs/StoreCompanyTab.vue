<template>
  <div class="store-company-tab">
    <!-- Conditional Upload Section -->
    <div class="upload-section">
      <!-- Company Uploads -->
      <div v-if="isCompany" class="upload-grid">
        <div class="upload-item">
          <label>หนังสือรับรองนิติบุคคล <span class="required">*</span></label>
          <div class="upload-box" @click="triggerUpload('legalEntityCertificate')">
            <input type="file" ref="legalEntityCertificate" class="hidden-input" @change="handleFileChange($event, 'legalEntityCertificate')" />
            <div v-if="!files.legalEntityCertificate" class="upload-placeholder">
              <div class="icon-wrapper"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg></div>
              <p>Drop your files here or <span class="link">Click to upload</span></p>
              <span class="info">SVG, PNG, JPG or GIF (max. 800x400px)</span>
            </div>
            <div v-else class="file-preview">
              <span>{{ files.legalEntityCertificate.name }}</span>
              <button @click.stop="removeFile('legalEntityCertificate')">×</button>
            </div>
          </div>
        </div>
        <div class="upload-item">
          <label>เอกสารภพ.20 <span class="required">*</span></label>
          <div class="upload-box" @click="triggerUpload('vatDocument')">
            <input type="file" ref="vatDocument" class="hidden-input" @change="handleFileChange($event, 'vatDocument')" />
            <div v-if="!files.vatDocument" class="upload-placeholder">
              <div class="icon-wrapper"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg></div>
              <p>Drop your files here or <span class="link">Click to upload</span></p>
              <span class="info">SVG, PNG, JPG or GIF (max. 800x400px)</span>
            </div>
            <div v-else class="file-preview">
              <span>{{ files.vatDocument.name }}</span>
              <button @click.stop="removeFile('vatDocument')">×</button>
            </div>
          </div>
        </div>
        <div class="upload-item">
          <label>รูปถ่ายบริษัท <span class="required">*</span></label>
          <div class="upload-box" @click="triggerUpload('companyPhoto')">
            <input type="file" ref="companyPhoto" class="hidden-input" @change="handleFileChange($event, 'companyPhoto')" />
            <div v-if="!files.companyPhoto" class="upload-placeholder">
              <div class="icon-wrapper"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg></div>
              <p>Drop your files here or <span class="link">Click to upload</span></p>
              <span class="info">SVG, PNG, JPG or GIF (max. 800x400px)</span>
            </div>
            <div v-else class="file-preview">
              <span>{{ files.companyPhoto.name }}</span>
              <button @click.stop="removeFile('companyPhoto')">×</button>
            </div>
          </div>
        </div>
        <div class="upload-item">
          <label>เอกสารเสียภาษีที่ดินบริษัท <span class="required">*</span></label>
          <div class="upload-box" @click="triggerUpload('companyLandTax')">
            <input type="file" ref="companyLandTax" class="hidden-input" @change="handleFileChange($event, 'companyLandTax')" />
            <div v-if="!files.companyLandTax" class="upload-placeholder">
              <div class="icon-wrapper"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg></div>
              <p>Drop your files here or <span class="link">Click to upload</span></p>
              <span class="info">SVG, PNG, JPG or GIF (max. 800x400px)</span>
            </div>
            <div v-else class="file-preview">
              <span>{{ files.companyLandTax.name }}</span>
              <button @click.stop="removeFile('companyLandTax')">×</button>
            </div>
          </div>
        </div>
      </div>
      <!-- Individual/Store Uploads -->
      <div v-else class="upload-grid">
        <div class="upload-item">
          <label>รูปร้านค้า <span class="required">*</span></label>
           <div class="upload-box" @click="triggerUpload('storePhoto')">
            <input type="file" ref="storePhoto" class="hidden-input" @change="handleFileChange($event, 'storePhoto')" />
            <div v-if="!files.storePhoto" class="upload-placeholder">
              <div class="icon-wrapper"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg></div>
              <p>Drop your files here or <span class="link">Click to upload</span></p>
              <span class="info">SVG, PNG, JPG or GIF (max. 800x400px)</span>
            </div>
            <div v-else class="file-preview">
              <span>{{ files.storePhoto.name }}</span>
              <button @click.stop="removeFile('storePhoto')">×</button>
            </div>
          </div>
        </div>
        <div class="upload-item">
          <label>ทะเบียนพาณิชย์ <span class="required">*</span></label>
           <div class="upload-box" @click="triggerUpload('commercialReg')">
            <input type="file" ref="commercialReg" class="hidden-input" @change="handleFileChange($event, 'commercialReg')" />
            <div v-if="!files.commercialReg" class="upload-placeholder">
              <div class="icon-wrapper"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg></div>
              <p>Drop your files here or <span class="link">Click to upload</span></p>
              <span class="info">SVG, PNG, JPG or GIF (max. 800x400px)</span>
            </div>
            <div v-else class="file-preview">
              <span>{{ files.commercialReg.name }}</span>
              <button @click.stop="removeFile('commercialReg')">×</button>
            </div>
          </div>
        </div>
        <div class="upload-item">
          <label>เอกสารเสียภาษีที่ดินร้านค้า <span class="required">*</span></label>
           <div class="upload-box" @click="triggerUpload('storeLandTax')">
            <input type="file" ref="storeLandTax" class="hidden-input" @change="handleFileChange($event, 'storeLandTax')" />
            <div v-if="!files.storeLandTax" class="upload-placeholder">
              <div class="icon-wrapper"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg></div>
              <p>Drop your files here or <span class="link">Click to upload</span></p>
              <span class="info">SVG, PNG, JPG or GIF (max. 800x400px)</span>
            </div>
            <div v-else class="file-preview">
              <span>{{ files.storeLandTax.name }}</span>
              <button @click.stop="removeFile('storeLandTax')">×</button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Address Section -->
    <div class="address-verification">
      <div class="section-header">
        <h3>ตรวจสอบข้อมูลที่อยู่ร้านค้า/บริษัท</h3>
        <div class="checkbox-wrapper">
          <input type="checkbox" id="sameAddress" v-model="isSameAddress" />
          <label for="sameAddress">ที่อยู่เดียวกับที่อยู่อาศัย</label>
        </div>
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
  name: 'StoreCompanyTab',
  props: {
    customerData: {
      type: Object,
      default: () => ({})
    }
  },
  data() {
    return {
      isSameAddress: false,
      files: {
        // Company
        legalEntityCertificate: null,
        vatDocument: null,
        companyPhoto: null,
        companyLandTax: null,
        // Individual
        storePhoto: null,
        commercialReg: null,
        storeLandTax: null,
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
  computed: {
    isCompany() {
      return !!(this.customerData && this.customerData['VAT Registration No_']);
    }
  },
  watch: {
    customerData: {
      immediate: true,
      deep: true,
      handler() {
        // Data is now handled by the isSameAddress watcher
        // to avoid conflicts. Initial state is empty unless checkbox is checked.
      }
    },
    isSameAddress: {
        immediate: true,
        handler(isSame) {
            if (isSame) {
                this.formData.houseAddress = this.customerData.Address || '';
                this.formData.postCode = this.customerData['Post Code'] || '';
                this.formData.district = this.customerData.City || '';
                this.formData.city = this.customerData.County || '';
                this.formData.phone = this.customerData['Phone No_'] || '';
                this.formData.email = this.customerData.email || '';
                // Since subdistrict is not in the main data, we might need to trigger a lookup
                // if a post code exists.
                if (this.formData.postCode) {
                    const results = searchAddressByZipcode(this.formData.postCode);
                    if (results.length > 0) {
                        this.formData.subdistrict = results[0].district;
                    }
                }
            } else {
                // Clear the fields for manual entry
                this.formData.houseAddress = '';
                this.formData.subdistrict = '';
                this.formData.postCode = '';
                this.formData.district = '';
                this.formData.city = '';
                this.formData.phone = '';
                this.formData.email = '';
            }
        }
    },
    'formData.postCode'(newZip) {
      if (!this.isSameAddress && newZip && newZip.length === 5) {
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

.store-company-tab {
  padding: 10px;
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

.file-preview {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px;
}

.file-preview button {
  background: none;
  border: none;
  font-size: 18px;
  cursor: pointer;
  color: #999;
}
</style>
