<template>
  <div v-if="isOpen" class="modal-overlay" @click.self="close">
    <div class="modal-container split-pane">
      <div class="modal-header">
        <h3 class="modal-title">ดูเอกสารทั้งหมด</h3>
        <button class="btn-close" @click="close" title="ปิด">×</button>
      </div>

      <div class="modal-body-split">
        <!-- Left Pane: Sidebar List -->
        <div class="sidebar-pane">
          <div class="sidebar-header">รายการเอกสาร</div>
          <div class="sidebar-list">
            <template v-for="(group, gIndex) in documentGroups" :key="gIndex">
              <div class="group-title" v-if="group.items.length > 0">{{ group.title }}</div>

              <div
                v-for="(doc, dIndex) in group.items"
                :key="`${gIndex}-${dIndex}`"
                class="sidebar-item"
                :class="{
                  'active': selectedFile === doc,
                  'missing': !doc.hasFile,
                  'uploaded': doc.hasFile
                }"
                @click="doc.hasFile ? selectFile(doc) : null"
              >
                <div class="item-icon">
                  <svg v-if="doc.hasFile" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon-check"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                  <svg v-else xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon-alert"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                </div>
                <div class="item-info">
                  <span class="item-name" :title="doc.displayName">{{ doc.displayName }}</span>
                  <span class="item-status">{{ doc.hasFile ? 'แนบแล้ว' : 'ยังไม่แนบ' }}</span>
                </div>
              </div>
            </template>
          </div>
        </div>

        <!-- Right Pane: Document Viewer -->
        <div class="viewer-pane">
          <template v-if="selectedFile">
            <div class="viewer-header">
              <h4>{{ selectedFile.displayName }}</h4>
              <button v-if="selectedFile.hasFile" class="btn-action download" @click="downloadFile(selectedFile)" title="ดาวน์โหลด">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                  <polyline points="7 10 12 15 17 10"></polyline>
                  <line x1="12" y1="15" x2="12" y2="3"></line>
                </svg>
                ดาวน์โหลด
              </button>
            </div>

            <div class="viewer-content">
              <div v-if="isLoadingFile" class="loading-state">
                  <div class="spinner"></div>
                  <p>กำลังโหลดเอกสาร...</p>
              </div>
              <template v-else>
                <template v-if="displayFileType === 'pdf'">
                  <iframe :src="currentFileUrl" type="application/pdf" class="preview-iframe" title="PDF Preview"></iframe>
                </template>
                <template v-else-if="['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(displayFileType)">
                  <div class="image-preview-container">
                      <img :src="currentFileUrl" :alt="selectedFile.displayName" class="preview-image" />
                  </div>
                </template>
              <template v-else>
                <div class="unsupported-preview">
                  <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#ccc" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                      <polyline points="14 2 14 8 20 8"></polyline>
                      <line x1="16" y1="13" x2="8" y2="13"></line>
                      <line x1="16" y1="17" x2="8" y2="17"></line>
                      <polyline points="10 9 9 9 8 9"></polyline>
                  </svg>
                  <p v-if="displayFileType !== 'unknown'">ไม่สามารถแสดงตัวอย่างไฟล์ประเภท <strong>.{{ displayFileType }}</strong> ได้</p>
                  <p v-else>ไม่สามารถแสดงตัวอย่างไฟล์ประเภทนี้ได้</p>
                  <p class="sub-text">กรุณาดาวน์โหลดเพื่อดูข้อมูล</p>
                  <button class="btn-download-large" @click="downloadFile(selectedFile)">
                      ดาวน์โหลดไฟล์
                  </button>
                </div>
              </template>
              </template>
            </div>
          </template>
          <div v-else class="empty-selection">
             <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#ddd" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="9" y1="21" x2="9" y2="9"></line></svg>
             <p>เลือกเอกสารจากรายการด้านซ้ายเพื่อดูตัวอย่าง</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, toRaw, onUnmounted } from 'vue';
import { useCreditRequestStore } from '@/stores/creditRequest';
import { getMandatoryKeys } from '@/config/mandatoryFields';
import axios from '@/utils/axios';

const props = defineProps({
  isOpen: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['close']);

const store = useCreditRequestStore();
const selectedFile = ref(null);

const DOC_CONFIG = {
  'credit_application_doc': { label: 'เอกสารคำขอเปิดเครดิต' },
  'id_card': { label: 'สำเนาบัตรประชาชน' },
  'home_reg': { label: 'สำเนาทะเบียนบ้าน' },
  'home_photo': { label: 'รูปถ่ายที่อยู่อาศัย' },
  'store_photo': { label: 'รูปถ่ายหน้าร้าน' },
  'map': { label: 'แผนที่ร้านค้า' },
  'bank_statement': { label: 'รายการเดินบัญชี (Statement)' },
  'legal_entity_certificate': { label: 'หนังสือรับรองบริษัท' },
  'vat_document': { label: 'ใบทะเบียนภาษีมูลค่าเพิ่ม (ภพ.20)' },
  'company_photo': { label: 'รูปถ่ายบริษัท' }
};

const documentGroups = computed(() => {
  const groups = [];

  // Group 1: Mandatory Documents
  const { files: mandatoryKeys } = getMandatoryKeys(store.isCompany);
  const mandatoryItems = [];

  mandatoryKeys.forEach(key => {
    const fileData = store.files[key];
    const isArray = Array.isArray(fileData);
    const hasLocalFile = fileData && (!isArray || fileData.length > 0);
    const uploadedMetadata = store.uploadedDocuments[key];
    const hasFile = hasLocalFile || !!uploadedMetadata;
    const config = DOC_CONFIG[key] || { label: key };

    // Handle multiple files under the same key
    if (hasFile) {
        if (isArray && fileData.length > 0) {
            fileData.forEach((f, index) => {
                mandatoryItems.push({
                    key: `${key}_${index}`,
                    displayName: `${config.label} (${index + 1})`,
                    hasFile: true,
                    fileData: f,
                    remoteMetadata: null
                });
            });
        } else if (hasLocalFile) {
             mandatoryItems.push({
                key,
                displayName: config.label,
                hasFile: true,
                fileData: fileData,
                remoteMetadata: null
            });
        } else if (uploadedMetadata) {
             // Remote file (metadata is often just 'true' in uploadedDocuments map,
             // but file array might hold the actual RemoteFile objects. If not, fallback to fileKey)
             const remoteFallback = { id: key, fileKey: key, name: key };
             mandatoryItems.push({
                key,
                displayName: config.label,
                hasFile: true,
                fileData: null,
                remoteMetadata: typeof uploadedMetadata === 'object' ? { ...uploadedMetadata, fileKey: key } : remoteFallback
            });
        }
    } else {
        // Missing
        mandatoryItems.push({
            key,
            displayName: config.label,
            hasFile: false,
            fileData: null,
            remoteMetadata: null
        });
    }
  });

  groups.push({ title: 'เอกสารหลัก', items: mandatoryItems });

  // Group 2: Other Documents
  const otherItems = [];
  if (store.files) {
    Object.keys(store.files).forEach(key => {
      if (key.startsWith('other_')) {
        const fileData = store.files[key];
        const isArray = Array.isArray(fileData);
        if (fileData && (!isArray || fileData.length > 0)) {
            // "other_tabName:LabelName"
            const parts = key.split(':');
            const labelName = parts.length > 1 ? parts[1] : key;

            if (isArray) {
                fileData.forEach((f, index) => {
                    otherItems.push({
                        key: `${key}_${index}`,
                        displayName: `${labelName} (${index + 1})`,
                        hasFile: true,
                        fileData: f,
                        remoteMetadata: null
                    });
                });
            } else {
                otherItems.push({
                    key,
                    displayName: labelName,
                    hasFile: true,
                    fileData: fileData,
                    remoteMetadata: null
                });
            }
        }
      }
    });
  }

  if (store.uploadedDocuments) {
       Object.keys(store.uploadedDocuments).forEach(key => {
           if (key.startsWith('other_') && !otherItems.some(i => i.key === key)) {
               const parts = key.split(':');
               const labelName = parts.length > 1 ? parts[1] : key;
               const uploadedMeta = store.uploadedDocuments[key];
               const remoteFallback = { id: key, fileKey: key, name: key };
               otherItems.push({
                    key,
                    displayName: labelName,
                    hasFile: true,
                    fileData: null,
                    remoteMetadata: typeof uploadedMeta === 'object' ? { ...uploadedMeta, fileKey: key } : remoteFallback
                });
           }
       });
  }

  if (otherItems.length > 0) {
      groups.push({ title: 'เอกสารอื่นๆ', items: otherItems });
  }

  return groups;
});


watch(() => props.isOpen, (newVal) => {
    console.log('[DEBUG AllDocsModal] isOpen changed to:', newVal);
    if (newVal) {
        // Auto-select first available file
        selectedFile.value = null;
        console.log('[DEBUG AllDocsModal] documentGroups length:', documentGroups.value.length);
        for (const group of documentGroups.value) {
            const firstWithFile = group.items.find(i => i.hasFile);
            if (firstWithFile) {
                selectedFile.value = firstWithFile;
                break;
            }
        }
    } else {
        selectedFile.value = null;
        if (activeObjectURL) {
            URL.revokeObjectURL(activeObjectURL);
            activeObjectURL = null;
        }
    }
});

const close = () => {
  emit('close');
};

const selectFile = (doc) => {
    selectedFile.value = doc;
};

// Utilities for File Viewer
const getActualFile = (doc) => {
    if (!doc) return null;
    if (doc.fileData) return doc.fileData; // Local File object or metadata if initialized from remote
    if (doc.remoteMetadata) return doc.remoteMetadata;
    return null;
};

const isRemote = (doc) => {
    const file = getActualFile(doc);
    // It's remote if it has remoteMetadata or if the fileData itself looks like remote metadata
    if (doc?.remoteMetadata) return true;
    if (file && ! (file instanceof File || file instanceof Blob) && (file.id || file.isRemote)) return true;
    return false;
};

const currentFileUrl = ref('');
const currentFileType = ref('');
const isLoadingFile = ref(false);
let activeObjectURL = null;

const updateFileUrl = async (doc) => {
    if (activeObjectURL) {
        URL.revokeObjectURL(activeObjectURL);
        activeObjectURL = null;
    }

    currentFileUrl.value = '';
    currentFileType.value = '';
    const file = getActualFile(doc);
    if (!file) return;

    let baseType = getBaseFileType(doc);

    if (isRemote(doc)) {
        isLoadingFile.value = true;
        try {
            // Extract id and txId from either remoteMetadata or the fileData object itself
            let fileId = doc.remoteMetadata?.fileKey || file.id;
            if (Array.isArray(file) && file.length > 0) fileId = file[0].id || fileId;
            const txId = store.requestId || file.txId || (Array.isArray(file) ? file[0]?.txId : null);

            if (!txId || !fileId) {
                 console.error('Missing transaction ID or file ID');
                 currentFileType.value = baseType;
                 return;
            }

            // Fetch file via axios to include auth headers
            const response = await axios.get(`/api/credit-requests/${encodeURIComponent(txId)}/files/${encodeURIComponent(fileId)}?inline=true`, {
                responseType: 'blob'
            });

            // Try to extract real type from Content-Type header if baseType is unknown
            if (baseType === 'unknown' && response.headers['content-type']) {
                const mimeType = response.headers['content-type'];
                if (mimeType.includes('pdf')) baseType = 'pdf';
                else if (mimeType.includes('jpeg') || mimeType.includes('jpg')) baseType = 'jpg';
                else if (mimeType.includes('png')) baseType = 'png';
                else if (mimeType.includes('webp')) baseType = 'webp';
            }
            currentFileType.value = baseType;

            // Force correct MIME type for PDF to prevent Edge/Chrome from blocking or downloading
            // application/octet-stream blobs, and to neutralize HTML/XSS uploads disguised as PDFs.
            let blobType = response.data.type;
            if (baseType === 'pdf') {
                 blobType = 'application/pdf';
            }
            const safeBlob = new Blob([response.data], { type: blobType });

            activeObjectURL = URL.createObjectURL(safeBlob);
            currentFileUrl.value = activeObjectURL;

        } catch (err) {
            console.error('Failed to load remote file for preview', err);
            currentFileType.value = baseType; // Still set it so fallback UI works
        } finally {
            isLoadingFile.value = false;
        }
    } else {
        const rawFile = toRaw(file);
        if (rawFile instanceof File || rawFile instanceof Blob) {
            activeObjectURL = URL.createObjectURL(rawFile);
            currentFileUrl.value = activeObjectURL;
        } else if (rawFile.url) {
            currentFileUrl.value = rawFile.url;
        }
        currentFileType.value = baseType;
    }
};

watch(selectedFile, (newDoc) => {
    updateFileUrl(newDoc);
});

onUnmounted(() => {
    if (activeObjectURL) {
        URL.revokeObjectURL(activeObjectURL);
    }
});

const getBaseFileType = (doc) => {
    const file = getActualFile(doc);
    if (!file) return '';
    let typeStr = file.originalName || file.name || file.fileKey || '';
    const parts = typeStr.split('.');
    return parts.length > 1 ? parts.pop().toLowerCase() : 'unknown';
};

const displayFileType = computed(() => {
    return currentFileType.value || getBaseFileType(selectedFile.value);
});

const downloadFile = async (doc) => {
    const file = getActualFile(doc);
    if (!file) return;

    if (isRemote(doc)) {
        let fileId = doc.remoteMetadata?.fileKey || file.id;
        if (Array.isArray(file) && file.length > 0) fileId = file[0].id || fileId;
        const txId = store.requestId || file.txId || (Array.isArray(file) ? file[0]?.txId : null);
        if (!txId) return;

        try {
            // Fetch as blob with auth cookies intact via axios
            const response = await axios.get(`/api/credit-requests/${txId}/files/${encodeURIComponent(fileId)}`, {
                responseType: 'blob'
            });

            // Extract original filename if available, or fallback
            let fileName = 'download';
            if (response.headers['content-disposition']) {
                const match = response.headers['content-disposition'].match(/filename="?([^"]+)"?/);
                if (match && match[1]) fileName = decodeURIComponent(match[1]);
            } else if (file.originalName || file.name) {
                fileName = file.originalName || file.name;
            }

            const url = URL.createObjectURL(response.data);
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (err) {
            console.error('Failed to download file', err);
            // Optionally notify user
        }
    } else {
        const rawFile = toRaw(file);
        if (rawFile instanceof File || rawFile instanceof Blob) {
            const url = URL.createObjectURL(rawFile);
            const a = document.createElement('a');
            a.href = url;
            a.download = rawFile.name || 'download';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } else if (rawFile.url) {
            window.open(rawFile.url, '_blank');
        }
    }
};

</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}

.modal-container {
  background: #fff;
  border-radius: 8px;
  width: 90vw;
  height: 90vh;
  max-width: 1400px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 0 10px 30px rgba(0,0,0,0.2);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px 20px;
  background: #f8f9fa;
  border-bottom: 1px solid #e9ecef;
}

.modal-title {
  margin: 0;
  font-size: 1.25rem;
  color: #333;
}

.btn-close {
  background: transparent;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: #666;
  line-height: 1;
}

.btn-close:hover {
  color: #000;
}

.modal-body-split {
  display: flex;
  flex: 1;
  overflow: hidden;
}

/* Left Pane: Sidebar */
.sidebar-pane {
  width: 320px;
  min-width: 250px;
  background: #fdfdfd;
  border-right: 1px solid #e0e0e0;
  display: flex;
  flex-direction: column;
}

.sidebar-header {
  padding: 12px 20px;
  font-weight: 600;
  background: #f4f6f8;
  border-bottom: 1px solid #e0e0e0;
  color: #555;
}

.sidebar-list {
  flex: 1;
  overflow-y: auto;
  padding: 10px 0;
}

.group-title {
  padding: 8px 20px 4px;
  font-size: 0.8rem;
  font-weight: bold;
  color: #888;
  text-transform: uppercase;
  margin-top: 10px;
}
.group-title:first-child {
    margin-top: 0;
}

.sidebar-item {
  display: flex;
  align-items: center;
  padding: 10px 20px;
  cursor: pointer;
  border-left: 3px solid transparent;
  transition: all 0.2s;
}

.sidebar-item:hover:not(.missing) {
  background-color: #f0f7ff;
}

.sidebar-item.active {
  background-color: #e6f2ff;
  border-left-color: #0056FF;
}

.sidebar-item.missing {
  cursor: default;
  opacity: 0.7;
}

.item-icon {
  margin-right: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.icon-check {
  color: #28a745;
}

.icon-alert {
  color: #f59e0b;
}

.item-info {
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.item-name {
  font-size: 14px;
  font-weight: 500;
  color: #333;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.item-status {
  font-size: 11px;
  color: #888;
  text-align: left;
}

.sidebar-item.uploaded .item-status {
  color: #28a745;
}

.sidebar-item.missing .item-status {
  color: #f59e0b;
}


/* Right Pane: Viewer */
.viewer-pane {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: #eaedf2;
  position: relative;
}

.viewer-header {
  padding: 12px 20px;
  background: white;
  border-bottom: 1px solid #e0e0e0;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.viewer-header h4 {
  margin: 0;
  font-size: 1rem;
  color: #333;
}

.btn-action {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 4px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  border: 1px solid #ccc;
  background: white;
  transition: background 0.2s;
}

.btn-action:hover {
  background: #f0f0f0;
}

.viewer-content {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  padding: 20px;
}

.preview-iframe {
  width: 100%;
  height: 100%;
  border: none;
  background: white;
  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
}

.image-preview-container {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
}

.preview-image {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
  background: white;
}

.unsupported-preview, .empty-selection {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  color: #666;
  background: white;
  padding: 40px;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.05);
}

.unsupported-preview p, .empty-selection p {
  margin: 15px 0 5px;
  font-size: 1.1rem;
}

.sub-text {
  font-size: 0.9rem;
  color: #888;
  margin-bottom: 20px !important;
}

.btn-download-large {
  padding: 10px 20px;
  background: #0056FF;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 14px;
  cursor: pointer;
  transition: background 0.2s;
}

.btn-download-large:hover {
  background: #0046d1;
}
</style>
