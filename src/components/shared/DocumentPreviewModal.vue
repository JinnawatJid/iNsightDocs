<template>
  <div v-if="isOpen" class="modal-overlay" @click.self="close">
    <div class="modal-container">
      <div class="modal-header">
        <div class="modal-title-group">
          <h3 class="modal-title" :title="file?.name">{{ file?.name || 'Document Preview' }}</h3>
          <span v-if="file?.uploaded_by" class="modal-subtitle">
            อัพโหลดโดย {{ file.uploaded_by }}
            <template v-if="file?.created_at">เมื่อ {{ formatDateTime(file.created_at) }}</template>
          </span>
        </div>
        <div class="modal-actions">
          <button class="btn-action download" @click="downloadFile" title="Download">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="7 10 12 15 17 10"></polyline>
                <line x1="12" y1="15" x2="12" y2="3"></line>
            </svg>
            ดาวน์โหลด
          </button>
          <button class="btn-close" @click="close" title="Close">×</button>
        </div>
      </div>

      <div class="modal-body">
        <template v-if="fileType === 'pdf'">
          <iframe :src="fileUrl" type="application/pdf" class="preview-iframe" title="PDF Preview"></iframe>
        </template>
        <template v-else-if="['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(fileType)">
          <div class="image-preview-container">
              <img :src="fileUrl" :alt="file?.name" class="preview-image" />
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
            <p>ไม่สามารถแสดงตัวอย่างไฟล์ประเภท <strong>.{{ fileType }}</strong> ได้</p>
            <p class="sub-text">กรุณาดาวน์โหลดเพื่อดูข้อมูล</p>
            <button class="btn-download-large" @click="downloadFile">
                ดาวน์โหลดไฟล์
            </button>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted } from 'vue';

const props = defineProps({
  isOpen: {
    type: Boolean,
    required: true
  },
  file: {
    type: Object,
    default: null
  }
});

const emit = defineEmits(['close']);

const fileUrl = computed(() => {
    if (!props.file) return '';
    // If it's a remote file, use the API endpoint, otherwise use the object URL or local path
    if (props.file.id && props.file.txId) {
        // We append inline=true to suggest the backend to render it inline if possible
        // though the backend must support this.
        return `/api/credit-requests/${encodeURIComponent(props.file.txId)}/files/${props.file.id}?inline=true`;
    }
    // For newly uploaded (local) files before saving
    if (props.file instanceof File) {
         return URL.createObjectURL(props.file);
    }
    return props.file.url || '';
});

const fileType = computed(() => {
    console.log('[DEBUG] DocumentPreviewModal computing fileType for file:', props.file);
    if (!props.file || !props.file.name) {
        console.log('[DEBUG] No file or file.name in DocumentPreviewModal');
        return '';
    }
    const parts = props.file.name.split('.');
    const ext = parts.length > 1 ? parts.pop().toLowerCase() : '';
    console.log('[DEBUG] DocumentPreviewModal computed fileType:', ext);
    return ext;
});

const formatDateTime = (dateString) => {
    if (!dateString) return '';
    try {
        let normalizedDateString = dateString;
        if (typeof normalizedDateString === 'string') {
            if (!normalizedDateString.includes('T')) {
                normalizedDateString = normalizedDateString.replace(' ', 'T');
            }
            if (!normalizedDateString.endsWith('Z')) {
                normalizedDateString += 'Z';
            }
        }
        let dateObj = new Date(normalizedDateString);

        const day = String(dateObj.getDate()).padStart(2, '0');
        const month = String(dateObj.getMonth() + 1).padStart(2, '0');
        const year = dateObj.getFullYear();
        const hours = String(dateObj.getHours()).padStart(2, '0');
        const minutes = String(dateObj.getMinutes()).padStart(2, '0');

        return `${day}/${month}/${year} ${hours}:${minutes} น.`;
    } catch (e) {
        return dateString;
    }
};

const close = () => {
  emit('close');
};

const downloadFile = () => {
    if (fileUrl.value) {
        // If it's a remote file, download without the inline=true to force a download
        let downloadUrl = fileUrl.value;
        if (props.file.id && props.file.txId) {
             downloadUrl = `/api/credit-requests/${encodeURIComponent(props.file.txId)}/files/${props.file.id}`;
             const link = document.createElement('a');
             link.href = downloadUrl;
             link.target = '_blank'; // Open in new tab since we don't have download attribute control cross-origin natively without backend header
             link.download = props.file?.name || 'download';
             document.body.appendChild(link);
             link.click();
             document.body.removeChild(link);
        } else {
             const link = document.createElement('a');
             link.href = downloadUrl;
             link.download = props.file?.name || 'download';
             document.body.appendChild(link);
             link.click();
             document.body.removeChild(link);
        }
    }
};

const handleKeydown = (e) => {
    if (e.key === 'Escape' && props.isOpen) {
        close();
    }
};

onMounted(() => {
    document.addEventListener('keydown', handleKeydown);
});

onUnmounted(() => {
    document.removeEventListener('keydown', handleKeydown);
});
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background-color: rgba(0, 0, 0, 0.7);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 9999;
  backdrop-filter: blur(2px);
}

.modal-container {
  background: white;
  border-radius: 8px;
  width: 90%;
  max-width: 1000px;
  height: 90vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 10px 25px rgba(0,0,0,0.2);
  overflow: hidden;
}

.modal-header {
  padding: 15px 20px;
  border-bottom: 1px solid #eee;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background-color: #f8f9fa;
}

.modal-title-group {
  display: flex;
  flex-direction: column;
  max-width: 70%;
}

.modal-title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #333;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.modal-subtitle {
  font-size: 12px;
  color: #666;
  margin-top: 4px;
}

.modal-actions {
  display: flex;
  align-items: center;
  gap: 15px;
}

.btn-action {
  background: none;
  border: 1px solid #0056FF;
  color: #0056FF;
  padding: 6px 12px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 13px;
  display: flex;
  align-items: center;
  gap: 6px;
  font-weight: 500;
  transition: all 0.2s;
}

.btn-action:hover {
  background-color: #f0f7ff;
}

.btn-close {
  background: none;
  border: none;
  font-size: 24px;
  line-height: 1;
  color: #666;
  cursor: pointer;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-close:hover {
  color: #ff4d4f;
}

.modal-body {
  flex: 1;
  overflow: hidden;
  position: relative;
  background-color: #e9ecef;
  display: flex;
  justify-content: center;
  align-items: center;
}

.preview-iframe {
  width: 100%;
  height: 100%;
  border: none;
}

.image-preview-container {
  width: 100%;
  height: 100%;
  overflow: auto;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 20px;
}

.preview-image {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
  background-color: white;
}

.unsupported-preview {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  color: #666;
  background-color: white;
  padding: 40px;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.05);
}

.unsupported-preview p {
  margin: 15px 0 5px 0;
  font-size: 16px;
}

.unsupported-preview .sub-text {
  font-size: 14px;
  color: #999;
  margin-bottom: 25px;
}

.btn-download-large {
  background-color: #0056FF;
  color: white;
  border: none;
  padding: 10px 24px;
  border-radius: 4px;
  font-size: 15px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s;
}

.btn-download-large:hover {
  background-color: #0046cc;
}
</style>
