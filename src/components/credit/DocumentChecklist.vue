<template>
  <div class="document-checklist-component">
    <div class="header">
      <div class="title-row">
        <span class="title">รายการเอกสารที่ต้องใช้</span>
        <span class="count-badge">{{ uploadedCount }}/{{ documents.length }}</span>
      </div>
      <span class="subtitle">กรุณาแนบเอกสารให้ครบถ้วนเพื่อการพิจารณา</span>
    </div>

    <div class="checklist-container">
      <div
        v-for="(doc, index) in documents"
        :key="index"
        class="checklist-item"
        :class="{ 'uploaded': doc.isUploaded, 'missing': !doc.isUploaded }"
      >
        <div class="status-icon">
          <!-- Green Check -->
          <svg v-if="doc.isUploaded" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon-check"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>

          <!-- Orange Alert -->
          <svg v-else xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon-alert"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
        </div>

        <div class="doc-info">
          <span class="doc-name">{{ doc.label }}</span>
          <span class="doc-status">{{ doc.isUploaded ? 'แนบแล้ว' : 'ยังไม่แนบ' }}</span>
        </div>

        <div class="action-arrow">
           <!-- Chevron Right -->
           <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ccc" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';

// MOCK DATA FOR PREVIEW
const documents = ref([
  { id: 'id_card', label: 'สำเนาบัตรประชาชน', isUploaded: true },
  { id: 'home_reg', label: 'สำเนาทะเบียนบ้าน', isUploaded: true },
  { id: 'bank_statement', label: 'รายการเดินบัญชี (Bank Statement)', isUploaded: false },
  { id: 'store_photo', label: 'รูปถ่ายหน้าร้าน', isUploaded: false },
  { id: 'map', label: 'แผนที่ร้านค้า', isUploaded: false },
]);

const uploadedCount = computed(() => {
  return documents.value.filter(d => d.isUploaded).length;
});
</script>

<style scoped>
.document-checklist-component {
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 20px;
  display: flex;
  flex-direction: column;
  box-shadow: 0 2px 4px rgba(0,0,0,0.02);
}

.header {
  margin-bottom: 15px;
  border-bottom: 1px solid #f0f0f0;
  padding-bottom: 10px;
}

.title-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 5px;
}

.title {
  font-weight: bold;
  font-size: 16px;
  color: #333;
}

.count-badge {
  background-color: #f0f0f0;
  color: #666;
  font-size: 12px;
  padding: 2px 8px;
  border-radius: 12px;
  font-weight: bold;
}

.subtitle {
  font-size: 13px;
  color: #888;
}

.checklist-container {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.checklist-item {
  display: flex;
  align-items: center;
  padding: 10px;
  border-radius: 6px;
  border: 1px solid transparent;
  background-color: #fafafa;
  cursor: pointer;
  transition: all 0.2s ease;
}

.checklist-item:hover {
  background-color: #f0f7ff;
  border-color: #d0e1fd;
}

.status-icon {
  margin-right: 12px;
  display: flex;
  align-items: center;
}

.icon-check {
  color: #28a745; /* Green */
}

.icon-alert {
  color: #ffc107; /* Orange/Yellow */
  color: #f59e0b; /* Darker Orange for better visibility */
}

.doc-info {
  flex-grow: 1;
  display: flex;
  flex-direction: column;
}

.doc-name {
  font-size: 14px;
  font-weight: 500;
  color: #333;
}

.doc-status {
  font-size: 11px;
  color: #999;
}

/* Specific Styles for states */
.checklist-item.uploaded .doc-name {
  color: #28a745;
  text-decoration: none; /* Removed strikethrough for cleaner look, just green text */
}

.checklist-item.uploaded .doc-status {
  color: #28a745;
}

.checklist-item.missing .doc-name {
  color: #333;
}

.checklist-item.missing .doc-status {
  color: #f59e0b;
}

.action-arrow {
  opacity: 0.5;
}

.checklist-item:hover .action-arrow {
  opacity: 1;
}
</style>
