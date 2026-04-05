<template>
  <div class="dashboard-card reviewer-documents-section">
    <div class="card-header d-flex justify-content-between align-items-center">
      <h3>เอกสารเพิ่มเติม</h3>
      <button
        class="btn btn-outline-primary btn-sm"
        @click="showUploadForm = !showUploadForm"
      >
        <i class="bi" :class="showUploadForm ? 'bi-x-circle' : 'bi-plus-circle'"></i>
        {{ showUploadForm ? 'ยกเลิก' : 'อัปโหลดเอกสารเพิ่มเติม' }}
      </button>
    </div>

    <!-- Upload Form Section -->
    <div v-if="showUploadForm" class="upload-form-container mt-3 p-3 border rounded bg-light">
      <h5 class="mb-3"><i class="bi bi-cloud-upload text-primary me-2"></i>อัปโหลดเอกสารเพิ่มเติม</h5>
      <div class="row g-3">
        <div class="col-md-4">
          <label class="form-label text-muted small mb-1">ประเภทเอกสาร <span class="text-danger">*</span></label>
          <select v-model="uploadData.documentType" class="form-select form-select-sm" :class="{ 'is-invalid': errors.documentType }">
            <option value="" disabled selected>เลือกประเภทเอกสาร</option>
            <option value="Bank Statement Update">อัปเดต Bank Statement (Bank Statement Update)</option>
            <option value="Clarification Letter">หนังสือชี้แจง (Clarification Letter)</option>
            <option value="Financial Document">เอกสารทางการเงิน (Financial Document)</option>
            <option value="Other">อื่นๆ (Other)</option>
          </select>
          <div class="invalid-feedback" v-if="errors.documentType">{{ errors.documentType }}</div>
        </div>

        <div class="col-md-4">
          <label class="form-label text-muted small mb-1">รายละเอียด (ระบุถ้ามี)</label>
          <input
            type="text"
            v-model="uploadData.documentDescription"
            class="form-control form-control-sm"
            placeholder="เช่น คำอธิบายเพิ่มเติม"
          />
        </div>

        <div class="col-md-4">
          <label class="form-label text-muted small mb-1">ไฟล์เอกสาร <span class="text-danger">*</span></label>
          <input
            type="file"
            ref="fileInput"
            @change="handleFileChange"
            class="form-control form-control-sm"
            :class="{ 'is-invalid': errors.file }"
            accept=".pdf,.jpg,.jpeg,.png,.xlsx,.xls"
          />
          <div class="invalid-feedback" v-if="errors.file">{{ errors.file }}</div>
        </div>
      </div>

      <div class="mt-3 text-end">
        <button class="btn btn-primary btn-sm" @click="handleUpload" :disabled="isUploading">
          <span v-if="isUploading" class="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
          {{ isUploading ? 'กำลังอัปโหลด...' : 'อัปโหลด' }}
        </button>
      </div>
    </div>

    <!-- Uploaded Documents List -->
    <div class="mt-3">
      <div v-if="additionalDocuments.length === 0" class="text-center text-muted p-4 border rounded bg-light">
        <i class="bi bi-file-earmark-x display-6 text-secondary mb-2"></i>
        <p class="mb-0">ยังไม่มีเอกสารเพิ่มเติม</p>
      </div>

      <div v-else class="table-responsive">
        <table class="table table-hover table-sm border align-middle mb-0">
          <thead class="table-light text-muted small">
            <tr>
              <th scope="col" style="width: 50px;"></th>
              <th scope="col">ชื่อไฟล์</th>
              <th scope="col">ประเภท</th>
              <th scope="col">อัปโหลดโดย</th>
              <th scope="col" class="text-end" style="width: 100px;">จัดการ</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(doc, index) in additionalDocuments" :key="index">
              <td class="text-center text-muted">
                <i class="bi bi-file-earmark-text"></i>
              </td>
              <td>
                <span class="text-primary text-decoration-none" style="cursor: pointer;" @click="previewDocument(doc)">
                  {{ doc.original_name }}
                </span>
                <div v-if="doc.created_at" class="small text-muted" style="font-size: 0.75rem;">
                   {{ formatDate(doc.created_at) }}
                </div>
              </td>
              <td>
                <span class="badge bg-secondary rounded-pill fw-normal">
                  {{ formatDocType(doc.file_type) }}
                </span>
              </td>
              <td>
                <div class="d-flex align-items-center">
                  <div class="bg-primary text-white rounded-circle d-flex align-items-center justify-content-center me-2" style="width: 24px; height: 24px; font-size: 0.7rem;">
                    {{ getInitials(doc.uploaded_by) }}
                  </div>
                  <span class="small">{{ doc.uploaded_by || 'System' }}</span>
                </div>
              </td>
              <td class="text-end">
                <button class="btn btn-sm btn-light text-primary border" @click="previewDocument(doc)" title="ดูเอกสาร">
                  <i class="bi bi-eye"></i>
                </button>
                <!-- Note: Deletion is intentionally omitted for audit trail purposes as requested -->
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
      if (Array.isArray(fileEntry)) {
        docs.push(...fileEntry);
      } else if (fileEntry) {
        docs.push(fileEntry);
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
  margin-top: 1.5rem;
}

.upload-form-container {
  background-color: #f8f9fa;
  border: 1px dashed #dee2e6 !important;
}
</style>
