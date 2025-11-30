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
           <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21.2 15c.7-1.2 1-2.5.7-3.9-.6-2.4-3-4-5.4-4-1.3 0-2.5.6-3.4 1.5A5.6 5.6 0 0 0 8 5.1C5.2 5.1 3 7.3 3 10.1c0 .8.2 1.5.5 2.1"></path><path d="M12 13v9"></path><path d="m9 17 3 3 3-3"></path></svg>
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
