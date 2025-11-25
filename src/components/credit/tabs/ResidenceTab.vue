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

    <hr class="divider" />

    <!-- Address Verification Section -->
    <div class="address-verification">
      <div class="section-header">
        <h3>ตรวจสอบข้อมูลที่อยู่</h3>
        <span class="badge-edit">แก้ไขข้อมูลที่อยู่</span>
      </div>

      <!-- Map Placeholder -->
      <div class="map-container">
        <div class="map-placeholder">
          <!-- Temporary placeholder for Google Maps -->
          <div class="map-content">
            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#ccc" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"><map-pin></map-pin><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
            <span>Google Map Area</span>
          </div>
        </div>
      </div>

      <!-- Address Form -->
      <div class="form-grid">
        <div class="form-group full-width">
          <label>ตำแหน่งที่ตั้ง</label>
          <div class="input-with-icon">
            <input
              type="text"
              class="form-control readonly"
              value="ใส่ให้อัตโนมัติ อิงตามข้อมูลเอกสาร"
              readonly
            />
            <span class="icon-right">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
            </span>
          </div>
        </div>

        <div class="form-group">
          <label>เบอร์โทรศัพท์</label>
          <input
            type="text"
            class="form-control"
            v-model="formData.phone"
            placeholder="0XX-XXX-XXXX"
          />
        </div>

        <div class="form-group">
          <label>แฟกซ์/อีเมล</label>
          <input
            type="text"
            class="form-control"
            v-model="formData.email"
            placeholder="example@email.com"
          />
        </div>

        <div class="form-group">
          <label>ลักษณะที่ตั้ง</label>
          <div class="custom-select-group">
            <button class="select-trigger">
              เลือกประเภทที่ตั้ง
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
            </button>
            <input type="text" class="form-control" placeholder="ระบุ..." />
          </div>
        </div>

        <div class="form-group">
          <label>กรรมสิทธิ์ทรัพย์สิน</label>
          <div class="custom-select-group">
            <button class="select-trigger">
              เลือกประเภทกรรมสิทธิ์
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
            </button>
            <input type="text" class="form-control" placeholder="ระบุ..." />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
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
        phone: '',
        email: ''
      }
    };
  },
  watch: {
    customerData: {
      immediate: true,
      handler(newVal) {
        if (newVal) {
          this.formData.phone = newVal.phone || '';
          this.formData.email = newVal.email || '';
          // Map other fields as they become available in the backend response
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

.form-group.full-width {
  grid-column: 1 / -1;
}

.input-with-icon {
  position: relative;
}

.icon-right {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: #999;
}

/* Custom Select Group */
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
