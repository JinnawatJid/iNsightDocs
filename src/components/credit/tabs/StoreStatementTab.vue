<template>
  <div class="store-statement-tab">
    <!-- Main Upload Section -->
    <div class="upload-section-large">
      <FileUploader
        label="รายการเดินบัญชี"
        required
        multiple
        v-model="files.bankStatement"
      >
        <template #icon>
           <img :src="iconUploadMulti" alt="Upload" width="48" height="48" />
        </template>
      </FileUploader>
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

<script setup>
import { reactive } from 'vue';
import FileUploader from '@/components/shared/FileUploader.vue';
import { useCreditRequestStore } from '@/stores/creditRequest';
import iconUploadMulti from '@/assets/icons/upload-multi.svg';

// Although StoreStatementTab currently doesn't read customerData, we connect it to the store 
// for consistency and potential future needs (e.g. pre-filling bank info).
const store = useCreditRequestStore();

const files = reactive({
  bankStatement: []
});

const formData = reactive({
  accountName: '',
  accountNumber: '',
  bank: '',
  branch: '',
  accountType: ''
});
</script>

<style scoped>
@import './shared-styles.css';

.store-statement-tab {
  padding: 10px;
}

.upload-section-large {
  margin-bottom: 30px;
}

.details-section {
  margin-top: 20px;
}
</style>
