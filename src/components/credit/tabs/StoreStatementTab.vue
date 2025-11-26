<template>
  <div class="store-statement-tab">
    <!-- Main Upload Section -->
    <div class="upload-section-large">
      <label>รายการเดินบัญชี <span class="required">*</span></label>
      <div class="upload-box-large" @click="triggerUpload('bankStatement')">
        <input type="file" ref="bankStatement" class="hidden-input" @change="handleFileChange($event, 'bankStatement')" multiple />
        <div v-if="files.bankStatement.length === 0" class="upload-placeholder">
          <div class="icon-wrapper-large">
            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21.2 15c.7-1.2 1-2.5.7-3.9-.6-2.4-3-4-5.4-4-1.3 0-2.5.6-3.4 1.5A5.6 5.6 0 0 0 8 5.1C5.2 5.1 3 7.3 3 10.1c0 .8.2 1.5.5 2.1"></path><path d="M12 13v9"></path><path d="m9 17 3 3 3-3"></path></svg>
          </div>
          <p>Drop your files here or <span class="link">Click to upload</span></p>
          <span class="info">Can add up to 6 files</span>
        </div>
        <div v-else class="file-preview-list">
          <ul>
            <li v-for="(file, index) in files.bankStatement" :key="index">
              <span class="file-name">{{ file.name }}</span>
              <button class="remove-btn" @click.stop="removeFile('bankStatement', index)">×</button>
            </li>
          </ul>
        </div>
      </div>
    </div>

    <!-- Details Section -->
    <div class="details-section">
      <div class="section-header">
        <h3>รายละเอียด</h3>
        <span class="badge-edit">แก้ไขข้อมูล</span>
      </div>
      <div class="form-grid">
        <div class="form-group">
          <label>ชื่อบัญชี</label>
          <input type="text" class="form-control" v-model="formData.accountName" placeholder="ระบุชื่อบัญชี" />
        </div>
        <div class="form-group">
          <label>เลขที่บัญชี</label>
          <input type="text" class="form-control" v-model="formData.accountNumber" placeholder="ระบุเลขที่บัญชี" />
        </div>
        <div class="form-group">
          <label>ธนาคาร</label>
          <input type="text" class="form-control" v-model="formData.bank" placeholder="ระบุธนาคาร" />
        </div>
        <div class="form-group">
          <label>สาขา</label>
          <input type="text" class="form-control" v-model="formData.branch" placeholder="ระบุสาขา" />
        </div>
        <div class="form-group">
          <label>ประเภทบัญชี</label>
          <input type="text" class="form-control" v-model="formData.accountType" placeholder="ระบุประเภทบัญชี" />
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'StoreStatementTab',
  props: {
    customerData: {
      type: Object,
      default: () => ({})
    }
  },
  data() {
    return {
      files: {
        bankStatement: []
      },
      formData: {
        accountName: '',
        accountNumber: '',
        bank: '',
        branch: '',
        accountType: ''
      }
    };
  },
  methods: {
    triggerUpload(refName) {
      this.$refs[refName].click();
    },
    handleFileChange(event, key) {
      const newFiles = Array.from(event.target.files);
      if (newFiles.length > 0) {
        this.files[key].push(...newFiles);
      }
      // Reset the input value to allow re-uploading the same file
      this.$refs[key].value = '';
    },
    removeFile(key, index) {
      this.files[key].splice(index, 1);
    }
  }
};
</script>

<style scoped>
@import './shared-styles.css';

.store-statement-tab {
  padding: 10px;
}

.upload-section-large {
  margin-bottom: 30px;
}

.upload-section-large label {
  display: block;
  font-weight: bold;
  margin-bottom: 8px;
  font-size: 14px;
}

.upload-box-large {
  border: 2px dashed #e0e0e0;
  border-radius: 8px;
  padding: 20px;
  text-align: center;
  cursor: pointer;
  transition: border-color 0.2s;
}

.upload-box-large:hover {
  border-color: #0056FF;
}

.icon-wrapper-large {
  margin-bottom: 15px;
  color: #0056FF;
}

.upload-placeholder p {
  margin: 0;
  font-size: 14px;
  color: #666;
}

.upload-placeholder .link {
  color: #0056FF;
  font-weight: bold;
}

.upload-placeholder .info {
  font-size: 12px;
  color: #999;
  margin-top: 5px;
}

.file-preview-list ul {
  list-style: none;
  padding: 0;
  margin: 0;
  text-align: left;
}

.file-preview-list li {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background-color: #f9f9f9;
  border-radius: 4px;
  margin-bottom: 5px;
}

.file-name {
  font-size: 14px;
}

.remove-btn {
  background: none;
  border: none;
  font-size: 18px;
  cursor: pointer;
  color: #999;
}

.details-section {
  margin-top: 20px;
}
</style>
