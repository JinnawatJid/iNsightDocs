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
      <div class="checklist-head">
        <span>รายการเอกสาร</span>
        <span>ไฟล์ที่แนบ</span>
      </div>
      <div
        v-for="(doc, index) in documents"
        :key="index"
        class="checklist-item"
        :class="{ 'uploaded': doc.isUploaded, 'missing': !doc.isUploaded }"
        @click="navigateToTab(doc.tab)"
      >
        <div class="doc-info left">
          <span class="doc-name">{{ doc.label }}</span>
          <span class="doc-status">{{ doc.isUploaded ? 'แนบแล้ว' : 'ยังไม่แนบ' }}</span>
        </div>

        <div class="doc-info right">
          <template v-if="doc.fileNames.length">
            <span
              v-for="(fileName, fileIndex) in doc.fileNames"
              :key="`${doc.id}-${fileIndex}`"
              class="doc-file-name"
              :title="fileName"
            >
              {{ fileName }}
            </span>
          </template>
          <span v-else class="doc-file-empty">-</span>
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

// Map keys to Labels and Target Tabs
const DOC_CONFIG = {
  'credit_application_doc': { label: 'ใบขอเปิดเครดิต', tab: 'requestInfo' },
  'id_card': { label: 'สำเนาบัตรประชาชน', tab: 'general' },
  'home_reg': { label: 'สำเนาทะเบียนบ้าน', tab: 'general' },
  'home_photo': { label: 'รูปถ่ายบ้าน', tab: 'residence' },
  'store_photo': { label: 'รูปร้านค้า', tab: 'store' },
  'map': { label: 'แผนที่ร้านค้า', tab: 'store' },
  'bank_statement': { label: 'รายการเดินบัญชี (Statement)', tab: 'financial' },
  'legal_entity_certificate': { label: 'หนังสือรับรองนิติบุคคล', tab: 'store' },
  'vat_document': { label: 'เอกสารภพ.20', tab: 'store' },
  'company_photo': { label: 'รูปถ่ายบริษัท', tab: 'store' }
};

const OTHER_TAB_TO_ROUTE_TAB = {
  requestInfo: 'requestInfo',
  general: 'general',
  residence: 'residence',
  store: 'store',
  financial: 'financial',
  project: 'requestInfo'
};

const getFilesAsArray = (fileValue) => {
  if (!fileValue) return [];
  return Array.isArray(fileValue) ? fileValue : [fileValue];
};

const getFileName = (file) => {
  return file?.original_name || file?.name || '';
};

const getOtherDocumentLabel = (key) => {
  const parts = key.split(':');
  return parts[1] || parts[0] || key;
};

const getOtherDocumentTab = (key) => {
  const tabName = key.replace(/^other_/, '').split(':')[0];
  return OTHER_TAB_TO_ROUTE_TAB[tabName] || 'requestInfo';
};

const documents = computed(() => {
  // Get mandatory file keys based on customer type (Company vs Individual)
  const { files } = getMandatoryKeys(store.isCompany);
  const mandatoryDocs = files.map(key => {
    const fileEntries = getFilesAsArray(store.files[key]);
    const fileNames = fileEntries.map(getFileName).filter(Boolean);
    const hasFile = fileNames.length > 0 || !!store.uploadedDocuments[key];
    const config = DOC_CONFIG[key] || { label: key, tab: 'requestInfo' };

    return {
      id: key,
      label: config.label,
      tab: config.tab,
      fileNames,
      isUploaded: hasFile
    };
  });

  const otherDocs = Object.keys(store.files || {})
    .filter((key) => key.startsWith('other_'))
    .map((key) => {
      const fileEntries = getFilesAsArray(store.files[key]);
      const fileNames = fileEntries.map(getFileName).filter(Boolean);
      return {
        id: key,
        label: getOtherDocumentLabel(key),
        tab: getOtherDocumentTab(key),
        fileNames,
        isUploaded: fileNames.length > 0
      };
    })
    .filter((doc) => doc.isUploaded);

  return [...mandatoryDocs, ...otherDocs];
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
  margin-bottom: 20px; /* Added to match neighbors */
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
  gap: 6px;
}

.checklist-head {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  padding: 6px 8px 8px 8px;
  border-bottom: 1px solid #e5e7eb;
  font-size: 12px;
  font-weight: 700;
  color: #64748b;
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
  display: grid;
  grid-template-columns: 1fr 1fr;
  align-items: start;
  gap: 12px;
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

.doc-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.doc-info.right {
  border-left: 1px dashed #e2e8f0;
  padding-left: 10px;
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

.doc-file-name {
  font-size: 12px;
  color: #334155;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.doc-file-empty {
  font-size: 12px;
  color: #94a3b8;
}

/* Specific Styles for states */
.checklist-item.uploaded .doc-name {
  color: #1f2937;
}

.checklist-item.uploaded .doc-status {
  color: #0ea5e9;
}

.checklist-item.missing .doc-name {
  color: #333;
}

.checklist-item.missing .doc-status {
  color: #f59e0b;
}
</style>
