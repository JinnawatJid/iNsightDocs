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

    <!-- Placeholders for other tabs -->
    <div class="tab-content" v-if="activeTab === 'address'">
       <p>ที่อยู่อาศัย Uploads...</p>
    </div>
    <div class="tab-content" v-if="activeTab === 'store'">
       <p>ที่อยู่ร้านค้า Uploads...</p>
    </div>
    <div class="tab-content" v-if="activeTab === 'finance'">
       <p>เอกสารการเงิน Uploads...</p>
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
    }
  }
};
</script>

<style scoped>
.document-upload-section {
  background: white;
  padding: 20px;
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
  border-radius: 20px;
  overflow: hidden;
  margin-bottom: 20px;
  width: fit-content;
}

.tab-btn {
  padding: 8px 20px;
  border: none;
  background: transparent;
  color: white;
  cursor: pointer;
  font-size: 14px;
}

.tab-btn.active {
  background-color: white;
  color: black;
  border-radius: 20px;
  font-weight: bold;
}

.upload-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
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
</style>
