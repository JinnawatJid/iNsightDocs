<template>
  <div class="dashboard-card reviewer-documents-section">
    <div class="card-header" style="display: flex; justify-content: space-between; align-items: center;">
      <h3>เอกสารเพิ่มเติม</h3>
      <button
        class="btn-upload-doc"
        @click="showUploadForm = !showUploadForm"
      >
        <span v-if="showUploadForm">ยกเลิก</span>
        <span v-else>+ อัปโหลดเอกสารเพิ่มเติม</span>
      </button>
    </div>

    <!-- Upload Form Section -->
    <div v-if="showUploadForm" class="upload-form-wrapper">
      <div class="form-grid-three-columns">
        <div class="form-group">
          <label>ประเภทเอกสาร <span class="text-red-500">*</span></label>
          <select v-model="uploadData.documentType" class="form-control" :class="{ 'error': errors.documentType, 'is-empty': !uploadData.documentType }">
            <option value="" disabled selected>เลือกประเภทเอกสาร</option>
            <option value="Bank Statement Update">อัปเดต Bank Statement</option>
            <option value="Clarification Letter">หนังสือชี้แจง</option>
            <option value="Financial Document">เอกสารทางการเงิน</option>
            <option value="Other">อื่นๆ</option>
          </select>
          <span class="error-msg" v-if="errors.documentType">{{ errors.documentType }}</span>
        </div>

        <div class="form-group">
          <label>รายละเอียด (ระบุถ้ามี)</label>
          <input
            type="text"
            v-model="uploadData.documentDescription"
            class="form-control"
            placeholder="เช่น คำอธิบายเพิ่มเติม"
          />
        </div>

        <div class="form-group">
          <label>ไฟล์เอกสาร <span class="text-red-500">*</span></label>
          <input
            type="file"
            ref="fileInput"
            @change="handleFileChange"
            class="form-control file-input"
            :class="{ 'error': errors.file }"
            accept=".pdf,.jpg,.jpeg,.png,.xlsx,.xls"
          />
          <span class="error-msg" v-if="errors.file">{{ errors.file }}</span>
        </div>
      </div>

      <div class="upload-actions">
        <button class="btn-submit-upload" @click="handleUpload" :disabled="isUploading">
          {{ isUploading ? 'กำลังอัปโหลด...' : 'ยืนยันอัปโหลด' }}
        </button>
      </div>
    </div>

    <!-- Uploaded Documents List -->
    <div class="documents-list-section">
      <div v-if="additionalDocuments.length === 0" class="empty-state">
        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="empty-icon"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="9" y1="15" x2="15" y2="15"></line></svg>
        <p>ยังไม่มีเอกสารเพิ่มเติม</p>
      </div>

      <div v-else class="documents-table-wrapper">
        <table class="documents-table">
          <thead>
            <tr>
              <th width="40%">ชื่อไฟล์</th>
              <th width="20%">ประเภท</th>
              <th width="25%">อัปโหลดโดย</th>
              <th width="15%" class="align-right">จัดการ</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(doc, index) in additionalDocuments" :key="index">
              <td>
                <div class="file-name-cell" @click="previewDocument(doc)">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>
                  <span class="file-name">{{ doc.name || doc.original_name || 'เอกสารไร้ชื่อ' }}</span>
                </div>
                <div v-if="doc.created_at" class="file-date">
                   {{ formatDate(doc.created_at) }}
                </div>
              </td>
              <td>
                <span class="doc-type-badge">
                  {{ formatDocType(doc.file_type || doc.type) }}
                </span>
              </td>
              <td>
                <div class="uploader-info">
                  <div class="uploader-avatar">
                    {{ getInitials(doc.uploaded_by) }}
                  </div>
                  <span class="uploader-name">{{ doc.uploaded_by || 'System' }}</span>
                </div>
              </td>
              <td class="align-right">
                <button class="btn-action view" @click="previewDocument(doc)" title="ดูเอกสาร">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, inject } from 'vue';
import { useCreditRequestStore } from '@/stores/creditRequest';
import Swal from 'sweetalert2';

const store = useCreditRequestStore();
const openPreviewModal = inject('openPreviewModal');

const showUploadForm = ref(false);
const isUploading = ref(false);
const fileInput = ref(null);

const uploadData = ref({
  documentType: '',
  documentDescription: '',
  file: null
});

const errors = ref({
  documentType: '',
  file: ''
});

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

const handleFileChange = (e) => {
  const file = e.target.files[0];
  if (file) {
    uploadData.value.file = file;
    errors.value.file = '';
  }
};

const validateForm = () => {
  let isValid = true;
  errors.value = { documentType: '', file: '' };

  if (!uploadData.value.documentType) {
    errors.value.documentType = 'กรุณาเลือกประเภทเอกสาร';
    isValid = false;
  }

  if (!uploadData.value.file) {
    errors.value.file = 'กรุณาเลือกไฟล์เอกสาร';
    isValid = false;
  }

  return isValid;
};

const handleUpload = async () => {
  if (!validateForm()) return;

  isUploading.value = true;

  try {
    const formData = new FormData();
    formData.append('file', uploadData.value.file);
    formData.append('documentType', uploadData.value.documentType);

    if (uploadData.value.documentDescription) {
      formData.append('documentDescription', uploadData.value.documentDescription);
    }

    // Pass actor role for better attribution if needed
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

    // Reset form
    showUploadForm.value = false;
    uploadData.value = {
      documentType: '',
      documentDescription: '',
      file: null
    };
    if (fileInput.value) fileInput.value.value = '';

  } catch (error) {
    Swal.fire({
      icon: 'error',
      title: 'เกิดข้อผิดพลาด',
      text: error.response?.data?.error || 'ไม่สามารถอัปโหลดเอกสารได้',
      confirmButtonColor: '#d33',
    });
  } finally {
    isUploading.value = false;
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

.upload-form-wrapper {
  background: #f8f9fa;
  border-top: 1px solid #e2e8f0;
  padding: 24px;
}

.form-grid-three-columns {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  align-items: start;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
  text-align: left;
}

.form-group label {
  font-size: 13px;
  font-weight: 500;
  color: #4a5568;
}

.form-control {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #cbd5e0;
  border-radius: 6px;
  font-size: 14px;
  background-color: white;
  transition: border-color 0.2s;
  box-sizing: border-box;
}

.form-control:focus {
  outline: none;
  border-color: var(--primary-color, #0d6efd);
  box-shadow: 0 0 0 3px rgba(13, 110, 253, 0.1);
}

.form-control.error {
  border-color: #e53e3e;
}

.error-msg {
  color: #e53e3e;
  font-size: 12px;
  margin-top: 2px;
}

.upload-actions {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
}

.btn-submit-upload {
  background: var(--primary-color, #0d6efd);
  color: white;
  border: none;
  border-radius: 6px;
  padding: 8px 24px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
}

.btn-submit-upload:disabled {
  background: #a0aec0;
  cursor: not-allowed;
}

.file-input {
  padding: 6px;
}

.documents-list-section {
  padding: 0 24px 24px;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 32px 24px;
  color: #718096;
  background: #f8fafc;
  border-radius: 8px;
  border: 1px dashed #cbd5e0;
  margin-top: 24px;
}

.empty-icon {
  margin-bottom: 8px;
  color: #a0aec0;
}

.documents-table-wrapper {
  margin-top: 24px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  overflow: hidden;
}

.documents-table {
  width: 100%;
  border-collapse: collapse;
}

.documents-table th {
  background: #f8fafc;
  padding: 12px 16px;
  text-align: left;
  font-weight: 600;
  font-size: 13px;
  color: #4a5568;
  border-bottom: 1px solid #e2e8f0;
}

.documents-table td {
  padding: 16px;
  border-bottom: 1px solid #e2e8f0;
  vertical-align: middle;
}

.documents-table tr:last-child td {
  border-bottom: none;
}

.documents-table th.align-right,
.documents-table td.align-right {
  text-align: right;
}

.file-name-cell {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  color: var(--primary-color, #0d6efd);
  cursor: pointer;
  font-weight: 500;
}

.file-name-cell svg {
  flex-shrink: 0;
  margin-top: 2px;
}

.file-name-cell:hover {
  text-decoration: underline;
}

.file-name {
  word-break: break-word;
  line-height: 1.4;
}

.file-date {
  font-size: 12px;
  color: #718096;
  margin-top: 4px;
  margin-left: 24px;
}

.doc-type-badge {
  display: inline-block;
  background: #e2e8f0;
  color: #4a5568;
  padding: 4px 10px;
  border-radius: 100px;
  font-size: 12px;
  font-weight: 500;
  white-space: nowrap;
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

.btn-action {
  background: transparent;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  width: 32px;
  height: 32px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: #4a5568;
  transition: all 0.2s;
}

.btn-action:hover {
  background: #f8fafc;
  color: var(--primary-color, #0d6efd);
  border-color: var(--primary-color, #0d6efd);
}
</style>
