<template>
  <div class="document-checklist-component" ref="containerRef">
    <!-- Trigger Header -->
    <div class="header" @click="toggleDropdown">
      <div class="title-row">
        <span class="title">รายการเอกสารที่ต้องใช้</span>
        <span class="count-badge">{{ uploadedCount }}/{{ documents.length }}</span>

        <!-- Toggle Icon -->
        <svg
          :class="{ 'rotate-180': isOpen }"
          class="toggle-icon"
          xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
        >
          <polyline points="6 9 12 15 18 9"></polyline>
        </svg>
      </div>
      <span class="subtitle">กรุณาแนบเอกสารให้ครบถ้วนเพื่อการพิจารณา</span>
    </div>

    <!-- Dropdown Content (Absolute) -->
    <div v-if="isOpen" class="checklist-dropdown">
      <div
        v-for="(doc, index) in documents"
        :key="index"
        class="checklist-item"
        :class="{ 'uploaded': doc.isUploaded, 'missing': !doc.isUploaded }"
        @click="navigateToTab(doc.tab)"
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
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useCreditRequestStore } from '@/stores/creditRequest';
import { getMandatoryKeys } from '@/config/mandatoryFields';

const store = useCreditRequestStore();
const isOpen = ref(false);
const containerRef = ref(null);

const toggleDropdown = () => {
  isOpen.value = !isOpen.value;
};

const handleClickOutside = (event) => {
  if (containerRef.value && !containerRef.value.contains(event.target)) {
    isOpen.value = false;
  }
};

onMounted(() => {
  document.addEventListener('click', handleClickOutside);
});

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside);
});

// Map keys to Thai Labels and Target Tabs
const DOC_CONFIG = {
  'credit_application_doc': { label: 'เอกสารคำขอเปิดเครดิต', tab: 'requestInfo' },
  'id_card': { label: 'สำเนาบัตรประชาชน', tab: 'general' },
  'home_reg': { label: 'สำเนาทะเบียนบ้าน', tab: 'general' },
  'home_photo': { label: 'รูปถ่ายที่อยู่อาศัย', tab: 'residence' },
  'store_photo': { label: 'รูปถ่ายหน้าร้าน', tab: 'store' },
  'map': { label: 'แผนที่ร้านค้า', tab: 'store' },
  'bank_statement': { label: 'รายการเดินบัญชี (Statement)', tab: 'financial' },
  'legal_entity_certificate': { label: 'หนังสือรับรองบริษัท', tab: 'store' },
  'vat_document': { label: 'ใบทะเบียนภาษีมูลค่าเพิ่ม (ภพ.20)', tab: 'store' },
  'company_photo': { label: 'รูปถ่ายบริษัท', tab: 'store' }
};

const documents = computed(() => {
  // Get mandatory file keys based on customer type (Company vs Individual)
  const { files } = getMandatoryKeys(store.isCompany);

  return files.map(key => {
    // Check if uploaded (either in files object or marked in uploadedDocuments map)
    const hasFile = !!store.files[key] || !!store.uploadedDocuments[key];
    const config = DOC_CONFIG[key] || { label: key, tab: 'requestInfo' };

    return {
      id: key,
      label: config.label,
      tab: config.tab,
      isUploaded: hasFile
    };
  });
});

const navigateToTab = (tabId) => {
  if (tabId) {
    store.setActiveTab(tabId);
    isOpen.value = false; // Close dropdown after selection
  }
};

const uploadedCount = computed(() => {
  return documents.value.filter(d => d.isUploaded).length;
});
</script>

<style scoped>
.document-checklist-component {
  position: relative; /* For absolute dropdown positioning */
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 15px 20px;
  /* Match height of neighbor (Search Header) roughly */
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  box-shadow: 0 2px 4px rgba(0,0,0,0.02);
}

.header {
  cursor: pointer;
  user-select: none;
}

.title-row {
  display: flex;
  align-items: center;
  margin-bottom: 4px;
}

.title {
  font-weight: bold;
  font-size: 16px;
  color: #333;
  margin-right: 8px;
}

.count-badge {
  background-color: #f0f0f0;
  color: #666;
  font-size: 12px;
  padding: 2px 8px;
  border-radius: 12px;
  font-weight: bold;
  margin-right: auto; /* Push icon to right */
}

.toggle-icon {
  color: #999;
  transition: transform 0.3s ease;
}

.rotate-180 {
  transform: rotate(180deg);
}

.subtitle {
  font-size: 12px;
  color: #888;
  display: block;
}

/* Dropdown Styles */
.checklist-dropdown {
  position: absolute;
  top: calc(100% + 5px);
  left: 0;
  right: 0;
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 10px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
  z-index: 1000; /* Ensure overlay */

  display: flex;
  flex-direction: column;
  gap: 8px;
}

.checklist-container {
  display: flex;
  flex-direction: column;
  gap: 6px;
  /* Make list scrollable if needed in future, but dropdown usually expands */
  max-height: 400px;
  overflow-y: auto;
}

.checklist-item {
  display: flex;
  align-items: center;
  padding: 8px; /* Compact padding */
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
