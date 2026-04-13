<template>
  <div class="dashboard-card reviewer-documents-section">
    <DocumentPreviewModal
      v-if="isPreviewOpen"
      :isOpen="isPreviewOpen"
      :documentType="previewDocType"
      :file="previewFile"
      @close="closePreviewModal"
    />
    <div class="card-header" style="display: flex; justify-content: space-between; align-items: center;">
      <h3>เอกสารเพิ่มเติม</h3>
      <button
        v-if="canUpload"
        class="btn-upload-doc"
        @click="openUploadModal"
      >
        <span>+ เพิ่มเอกสาร</span>
      </button>
    </div>

    <!-- Uploaded Documents List -->
    <div class="documents-list-section">
      <div v-if="additionalDocuments.length === 0" class="empty-state" @click="canUpload ? openUploadModal() : null" :style="{ cursor: canUpload ? 'pointer' : 'default' }">
        <div class="empty-icon-circle">
          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="12" y1="18" x2="12" y2="12"></line><line x1="9" y1="15" x2="15" y2="15"></line></svg>
        </div>
        <p class="empty-title">ยังไม่มีเอกสารเพิ่มเติม</p>
        <p class="empty-subtitle" v-if="canUpload">คลิกเพื่ออัปโหลดเอกสารใหม่เข้าระบบ</p>
      </div>

      <div v-else class="documents-cards-wrapper">
        <div class="doc-card" v-for="(doc, index) in additionalDocuments" :key="index">

          <div class="doc-card-main">
            <div class="doc-icon">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>
            </div>
            <div class="doc-details">
              <div class="file-name-cell" @click="previewDocument(doc)">
                <span class="file-name" :title="doc.name || doc.original_name">{{ doc.name || 'เอกสารไร้ชื่อ' }}</span>
              </div>
              <div class="file-original-name" :title="doc.original_name">
                 {{ doc.original_name }}
              </div>
              <div v-if="doc.created_at" class="file-date">
                 {{ formatDate(doc.created_at) }}
              </div>
            </div>
          </div>

          <div class="doc-card-meta">
            <div class="uploader-info">
              <div class="uploader-avatar">
                {{ getInitials(doc.uploaded_by) }}
              </div>
              <span class="uploader-name">{{ doc.uploaded_by || 'System' }}</span>
            </div>
          </div>

          <div class="doc-card-actions">
            <button class="btn-action view" @click="previewDocument(doc)" title="ดูเอกสาร">
              <svg style="display:block; width:16px; height:16px; stroke:currentColor; stroke-width:2px; fill:none;" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
              <span>ดู</span>
            </button>
            <button v-if="canDelete(doc)" class="btn-action delete" @click="handleDelete(doc)" title="ลบเอกสาร">
              <svg style="display:block; width:16px; height:16px; stroke:currentColor; stroke-width:2px; fill:none;" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
              <span>ลบ</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { formatDateString as normalizeDateString } from '@/utils/dateUtils';
import { ref, computed, inject } from 'vue';
import { useCreditRequestStore } from '@/stores/creditRequest';
import { useAuthStore } from '@/stores/auth';
import Swal from 'sweetalert2';
import DocumentPreviewModal from '@/components/shared/DocumentPreviewModal.vue';

const store = useCreditRequestStore();
const authStore = useAuthStore();
const openPreviewModal = inject('openPreviewModal', null);

const isPreviewOpen = ref(false);
const previewDocType = ref('');
const previewFile = ref(null);

const canUpload = computed(() => {
  if (store.requestStatus === 'Draft') return false;

  if (authStore.isInitiator) return true;

  const roles = authStore.userRoles || [];
  const isApprover = roles.some(r => r.role !== 'ผู้สร้างคำขอ (เครดิตใหม่/ปรับปรุง)');

  if (isApprover) return true;

  return false;
});

const canDelete = (doc) => {
  const currentUser = authStore.user?.empname || authStore.user?.username;
  const isCreditCommittee = authStore.isCreditCommittee;

  // You can only delete your own documents unless you are high level approval
  return doc.uploaded_by === currentUser || isCreditCommittee;
};

const openUploadModal = () => {
  Swal.fire({
    title: 'อัปโหลดเอกสารเพิ่มเติม',
    html: `
      <div class="swal-upload-form" style="text-align: left;">
        <div style="margin-bottom: 16px;">
          <label style="display: block; margin-bottom: 8px; font-size: 14px; font-weight: 500;">ชื่อเอกสาร <span style="color: #e53e3e;">*</span></label>
          <input type="text" id="swal-doc-name" class="swal2-input" placeholder="กรุณาระบุชื่อเอกสารที่ต้องการให้แสดง" style="width: 100%; margin: 0; padding: 8px 12px; font-size: 14px; border: 1px solid #d9d9d9; border-radius: 6px; box-sizing: border-box;">
        </div>
        <div style="margin-bottom: 16px;">
          <label style="display: block; margin-bottom: 8px; font-size: 14px; font-weight: 500;">ไฟล์เอกสาร <span style="color: #e53e3e;">*</span></label>
          <input type="file" id="swal-doc-file" class="swal2-input" accept=".pdf,.jpg,.jpeg,.png,.xlsx,.xls" style="width: 100%; margin: 0; padding: 8px 12px; font-size: 14px; border: 1px solid #d9d9d9; border-radius: 6px; box-sizing: border-box;">
        </div>
      </div>
    `,
    showCancelButton: true,
    confirmButtonText: 'ยืนยันอัปโหลด',
    cancelButtonText: 'ยกเลิก',
    confirmButtonColor: '#0d6efd',
    preConfirm: () => {
      const docName = document.getElementById('swal-doc-name').value;
      const fileInput = document.getElementById('swal-doc-file');
      const file = fileInput.files.length > 0 ? fileInput.files[0] : null;

      if (!docName || docName.trim() === '') {
        Swal.showValidationMessage('กรุณาระบุชื่อเอกสาร');
        return false;
      }
      if (!file) {
        Swal.showValidationMessage('กรุณาเลือกไฟล์เอกสาร');
        return false;
      }
      return { docName: docName.trim(), file };
    }
  }).then(async (result) => {
    if (result.isConfirmed) {
      handleUpload(result.value);
    }
  });
};

// Computed property to filter additional documents
const additionalDocuments = computed(() => {
  const docs = [];

  if (!store.files) return docs;

  // Flatten the files object
  Object.keys(store.files).forEach(key => {
    // Check if the file type indicates it's an additional document
    if (key.startsWith('additional_doc')) {
      const fileEntry = store.files[key];

      // Inject the file_type from the key if it's missing in the fileObj
      const injectKey = (obj) => ({ ...obj, file_type: obj.file_type || key });

      if (Array.isArray(fileEntry)) {
        docs.push(...fileEntry.map(injectKey));
      } else if (fileEntry) {
        docs.push(injectKey(fileEntry));
      }
    }
  });

  // Sort by created_at descending (newest first)
  return docs.sort((a, b) => {
    const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
    const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
    return dateB - dateA;
  });
});

const handleUpload = async (uploadData) => {
  Swal.fire({
    title: 'กำลังอัปโหลด...',
    text: 'กรุณารอสักครู่',
    allowOutsideClick: false,
    didOpen: () => {
      Swal.showLoading();
    }
  });

  try {
    const formData = new FormData();
    formData.append('file', uploadData.file);

    // We send 'Additional Document' as the generic type since we removed the type selector
    formData.append('documentType', 'Additional Document');

    // The user's input docName acts as the description/name for the document
    formData.append('documentDescription', uploadData.docName);

    if (store.targetRole) {
       formData.append('actor_role', store.targetRole);
    }

    await store.uploadAdditionalDocument(store.requestId, formData);

    Swal.fire({
      icon: 'success',
      title: 'อัปโหลดสำเร็จ',
      text: 'เอกสารเพิ่มเติมถูกเพิ่มเข้าระบบแล้ว',
      confirmButtonColor: '#3085d6',
    });

  } catch (error) {
    Swal.fire({
      icon: 'error',
      title: 'เกิดข้อผิดพลาด',
      text: error.response?.data?.error || 'ไม่สามารถอัปโหลดเอกสารได้',
      confirmButtonColor: '#d33',
    });
  }
};

const handleDelete = (doc) => {
  Swal.fire({
    title: 'ยืนยันการลบเอกสาร',
    text: `คุณต้องการลบเอกสาร "${doc.name || doc.original_name}" ใช่หรือไม่?`,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#d33',
    cancelButtonColor: '#6c757d',
    confirmButtonText: 'ใช่, ลบเอกสาร',
    cancelButtonText: 'ยกเลิก'
  }).then(async (result) => {
    if (result.isConfirmed) {
      Swal.fire({
        title: 'กำลังลบ...',
        text: 'กรุณารอสักครู่',
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        }
      });

      try {
        await store.deleteAdditionalDocument(store.requestId, doc.id);
        Swal.fire({
          icon: 'success',
          title: 'ลบเอกสารสำเร็จ',
          text: 'ลบเอกสารออกจากระบบเรียบร้อยแล้ว',
          confirmButtonColor: '#3085d6',
        });
      } catch (error) {
        Swal.fire({
          icon: 'error',
          title: 'เกิดข้อผิดพลาด',
          text: error.response?.data?.error || 'ไม่สามารถลบเอกสารได้',
          confirmButtonColor: '#d33',
        });
      }
    }
  });
};

const previewDocument = (doc) => {
  console.log('[DEBUG] previewDocument input doc:', doc);
  let nameWithExt = doc.original_name || doc.name;

  // Extract extension from file_path just in case
  let ext = '';
  if (doc.file_path) {
      const parts = doc.file_path.split('.');
      if (parts.length > 1) {
          ext = parts.pop().toLowerCase();
      }
  }
  console.log('[DEBUG] previewDocument extracted ext:', ext);

  if (nameWithExt && ext) {
      // Check if it already ends with the extension (e.g. MyDoc.pdf)
      if (!nameWithExt.toLowerCase().endsWith('.' + ext)) {
          nameWithExt += '.' + ext;
      }
  } else if (!nameWithExt && ext) {
      nameWithExt = 'document.' + ext;
  }
  console.log('[DEBUG] previewDocument nameWithExt resolved to:', nameWithExt);

  const fileForPreview = {
    ...doc,
    name: nameWithExt, // DocumentPreviewModal uses 'name' to extract file extension
    displayName: doc.name || doc.original_name, // For display purposes if supported
    txId: store.requestId, // DocumentPreviewModal uses this to build the backend URL
    url: `/api/credit-requests/${encodeURIComponent(store.requestId)}/files/${doc.id}`
  };

  console.log('[DEBUG] previewDocument final fileForPreview:', fileForPreview);

  // If a global modal inject exists, use it
  if (openPreviewModal && typeof openPreviewModal === 'function') {
    openPreviewModal(doc.file_type || 'เอกสารเพิ่มเติม', fileForPreview, doc.file_type);
  } else {
    // Otherwise use our local instance of the modal
    previewDocType.value = doc.file_type || 'เอกสารเพิ่มเติม';
    previewFile.value = fileForPreview;
    isPreviewOpen.value = true;
  }
};

const closePreviewModal = () => {
  isPreviewOpen.value = false;
  previewFile.value = null;
};

const formatDate = (dateString) => {
  if (!dateString) return '';

    const date = normalizeDateString(dateString);

  if (isNaN(date.getTime())) return dateString;

  return date.toLocaleString('th-TH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const getInitials = (name) => {
  if (!name) return '?';
  const parts = name.split(' ');
  if (parts.length > 1) {
    return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
};
</script>

<style scoped>
.reviewer-documents-section {
  margin-top: 24px;
}

.btn-upload-doc {
  background: var(--primary-color, #0d6efd);
  color: white;
  border: none;
  border-radius: 6px;
  padding: 8px 16px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s;
}

.btn-upload-doc:hover {
  background: #0b5ed7;
}

.documents-list-section {
  padding: 0 24px 24px;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 24px;
  background: #f8fafc;
  border-radius: 8px;
  border: 2px dashed #e2e8f0;
  margin-top: 16px;
  transition: all 0.2s;
}

.empty-state:hover {
  background: #f1f5f9;
  border-color: #cbd5e0;
}

.empty-icon-circle {
  width: 64px;
  height: 64px;
  background: #edf2f7;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #a0aec0;
  margin-bottom: 16px;
}

.empty-title {
  color: #4a5568;
  font-weight: 600;
  font-size: 16px;
  margin-bottom: 4px;
}

.empty-subtitle {
  color: #718096;
  font-size: 14px;
}

.documents-cards-wrapper {
  margin-top: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.doc-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  transition: box-shadow 0.2s, border-color 0.2s;
}

.doc-card:hover {
  box-shadow: 0 2px 8px rgba(0,0,0,0.05);
  border-color: #cbd5e0;
}

.doc-card-main {
  display: flex;
  align-items: center;
  gap: 16px;
  flex: 2;
  min-width: 0;
}

.doc-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  background: #eff6ff;
  color: var(--primary-color, #0d6efd);
  border-radius: 8px;
  flex-shrink: 0;
}

.doc-details {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
  text-align: left;
  align-items: flex-start;
}

.file-name-cell {
  color: #2d3748;
  font-weight: 600;
  font-size: 15px;
  cursor: pointer;
  display: flex;
  align-items: center;
}

.file-name {
  word-break: break-word;
  line-height: 1.4;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.file-name:hover {
  color: var(--primary-color, #0d6efd);
  text-decoration: underline;
}

.file-original-name {
  font-size: 12px;
  color: #a0aec0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 300px;
}

.file-date {
  font-size: 13px;
  color: #718096;
}

.doc-card-meta {
  display: flex;
  align-items: center;
  gap: 16px;
  flex: 1;
  justify-content: flex-end;
  padding-right: 24px;
}

.uploader-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.uploader-avatar {
  background: #cbd5e0;
  color: #2d3748;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 600;
}

.uploader-name {
  font-size: 14px;
  color: #2d3748;
}

.doc-card-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  flex: 0.5;
}

.btn-action {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  min-width: 36px;
  height: 36px;
  padding: 0 8px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  cursor: pointer;
  color: #4a5568 !important;
  font-size: 13px;
  font-weight: 500;
  transition: all 0.2s;
}

.btn-action svg {
  color: #4a5568 !important;
  stroke: #4a5568 !important;
}

.btn-action span {
  display: none; /* Hide text by default on small screens, show on hover or larger screens if desired, but for now we just show text explicitly */
  display: inline-block;
}

.btn-action:hover {
  background: #f8fafc;
  border-color: var(--primary-color, #0d6efd);
  color: var(--primary-color, #0d6efd) !important;
}

.btn-action:hover svg {
  color: var(--primary-color, #0d6efd) !important;
  stroke: var(--primary-color, #0d6efd) !important;
}

.btn-action.delete:hover {
  border-color: #e53e3e;
  background: #fff5f5;
  color: #e53e3e !important;
}

.btn-action.delete:hover svg {
  color: #e53e3e !important;
  stroke: #e53e3e !important;
}
</style>
