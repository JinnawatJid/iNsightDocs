<template>
  <div class="dashboard-card reviewer-documents-section">
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
                <span class="file-name" :title="doc.name || doc.original_name">{{ doc.name || doc.original_name || 'เอกสารไร้ชื่อ' }}</span>
              </div>
              <div v-if="doc.created_at" class="file-date">
                 {{ formatDate(doc.created_at) }}
              </div>
            </div>
          </div>

          <div class="doc-card-meta">
            <span class="doc-type-badge">
              {{ formatDocType(doc.file_type || doc.type) }}
            </span>
            <div class="uploader-info">
              <div class="uploader-avatar">
                {{ getInitials(doc.uploaded_by) }}
              </div>
              <span class="uploader-name">{{ doc.uploaded_by || 'System' }}</span>
            </div>
          </div>

          <div class="doc-card-actions">
            <button class="btn-action view" @click="previewDocument(doc)" title="ดูเอกสาร">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, inject } from 'vue';
import { useCreditRequestStore } from '@/stores/creditRequest';
import { useAuthStore } from '@/stores/auth';
import Swal from 'sweetalert2';

const store = useCreditRequestStore();
const authStore = useAuthStore();
const openPreviewModal = inject('openPreviewModal');

const canUpload = computed(() => {
  if (store.requestStatus === 'Draft') return false;

  if (authStore.isInitiator) return true;

  const roles = authStore.userRoles || [];
  const isApprover = roles.some(r => r.role !== 'ผู้สร้างคำขอ (เครดิตใหม่/ปรับปรุง)');

  if (isApprover) return true;

  return false;
});

const openUploadModal = () => {
  Swal.fire({
    title: 'อัปโหลดเอกสารเพิ่มเติม',
    html: `
      <div class="swal-upload-form" style="text-align: left;">
        <div style="margin-bottom: 16px;">
          <label style="display: block; margin-bottom: 8px; font-size: 14px; font-weight: 500;">ประเภทเอกสาร <span style="color: #e53e3e;">*</span></label>
          <select id="swal-doc-type" class="swal2-input" style="width: 100%; margin: 0; padding: 8px 12px; font-size: 14px; border: 1px solid #d9d9d9; border-radius: 6px;">
            <option value="" disabled selected>เลือกประเภทเอกสาร</option>
            <option value="Bank Statement Update">อัปเดต Bank Statement</option>
            <option value="Clarification Letter">หนังสือชี้แจง</option>
            <option value="Financial Document">เอกสารทางการเงิน</option>
            <option value="Other">อื่นๆ</option>
          </select>
        </div>
        <div style="margin-bottom: 16px;">
          <label style="display: block; margin-bottom: 8px; font-size: 14px; font-weight: 500;">รายละเอียด (ระบุถ้ามี)</label>
          <input type="text" id="swal-doc-desc" class="swal2-input" placeholder="เช่น คำอธิบายเพิ่มเติม" style="width: 100%; margin: 0; padding: 8px 12px; font-size: 14px; border: 1px solid #d9d9d9; border-radius: 6px; box-sizing: border-box;">
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
      const type = document.getElementById('swal-doc-type').value;
      const desc = document.getElementById('swal-doc-desc').value;
      const fileInput = document.getElementById('swal-doc-file');
      const file = fileInput.files.length > 0 ? fileInput.files[0] : null;

      if (!type) {
        Swal.showValidationMessage('กรุณาเลือกประเภทเอกสาร');
        return false;
      }
      if (!file) {
        Swal.showValidationMessage('กรุณาเลือกไฟล์เอกสาร');
        return false;
      }
      return { type, desc, file };
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
    formData.append('documentType', uploadData.type);

    if (uploadData.desc) {
      formData.append('documentDescription', uploadData.desc);
    }

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

const previewDocument = (doc) => {
  if (openPreviewModal && typeof openPreviewModal === 'function') {
    // We pass the document to the global preview modal
    // Constructing an object that the DocumentPreviewModal expects
    const fileForPreview = {
      ...doc,
      // The modal might expect file to be directly accessible or use url
      url: `/api/credit-requests/${store.requestId}/files/${doc.id}`
    };

    // We pass the key it was stored under as well
    openPreviewModal(doc.file_type, fileForPreview, doc.file_type);
  } else {
     // Fallback if inject fails
     window.open(`/api/credit-requests/${store.requestId}/files/${doc.id}`, '_blank');
  }
};

const formatDocType = (type) => {
  if (!type) return 'เอกสารทั่วไป';
  if (type.startsWith('additional_doc:')) {
    return type.substring('additional_doc:'.length);
  }
  return 'เอกสารเพิ่มเติม';
};

const formatDate = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
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

.file-date {
  font-size: 13px;
  color: #718096;
}

.doc-card-meta {
  display: flex;
  align-items: center;
  gap: 32px;
  flex: 1.5;
}

.doc-type-badge {
  display: inline-flex;
  background: #f1f5f9;
  color: #4a5568;
  padding: 6px 12px;
  border-radius: 100px;
  font-size: 13px;
  font-weight: 500;
  white-space: nowrap;
  border: 1px solid #e2e8f0;
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
  flex: 0.5;
}

.btn-action {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  width: 36px;
  height: 36px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: #4a5568;
  transition: all 0.2s;
}

.btn-action svg {
  color: #4a5568;
}

.btn-action:hover {
  background: #f8fafc;
  border-color: var(--primary-color, #0d6efd);
}

.btn-action:hover svg {
  color: var(--primary-color, #0d6efd);
}
</style>
