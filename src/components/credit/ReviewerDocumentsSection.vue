<template>
  <div class="reviewer-documents-section">
    <div class="section-header-row">
      <h3 class="section-title">เอกสารเพิ่มเติมจากการพิจารณา</h3>
      <!-- Only show add button if user has a role that can review, and request is not finalized -->
      <button v-if="canEdit" class="btn-add-category" @click="addCategory">
        + เพิ่มเอกสารพิจารณา
      </button>
    </div>

    <div v-if="hasReviewerDocs" class="other-docs-grid">
      <div v-for="(item, key) in reviewerDocs" :key="key" class="other-doc-item">
        <div class="doc-header">
           <span class="doc-label">{{ getLabel(key) }}</span>
           <div class="doc-actions">
               <span class="uploaded-by-badge" v-if="getUploader(key)">อัปโหลดโดย: {{ getUploader(key) }}</span>
               <button v-if="canRemove(key)" class="btn-remove-category" @click="removeCategory(key)">
                 ลบ
               </button>
           </div>
        </div>
        <FileUploader
          :label="getLabel(key)"
          v-model="store.files[key]"
          :disabled="!canRemove(key)"
          multiple
          @update:modelValue="(val) => updateFile(key, val)"
        />
      </div>
    </div>
    <div v-else class="empty-state">
        ไม่มีเอกสารเพิ่มเติมจากการพิจารณา
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useCreditRequestStore } from '@/stores/creditRequest';
import { useAuthStore } from '@/stores/auth';
import FileUploader from '@/components/shared/FileUploader.vue';
import Swal from 'sweetalert2';

const store = useCreditRequestStore();
const authStore = useAuthStore();

const prefix = 'reviewer_doc:';

// Check if current user has an active role and request is not finalized
const canEdit = computed(() => {
    const finalStatuses = ['Approved', 'Rejected', 'Closed', 'Canceled'];
    if (finalStatuses.includes(store.requestStatus)) return false;

    // Anyone in the flow (except basic Initiator, unless they have a role) can upload
    // For safety, let's just allow it if they are logged in and not in a read-only final state
    // but ideally only actual reviewers.
    // If they are an Initiator but it's not Draft, they technically shouldn't upload
    // unless they have another role.
    if (authStore.isInitiator && store.requestStatus !== 'Draft' && !authStore.isRegionalManager && !authStore.isSalesManager && !authStore.isFinanceOfficer && !authStore.isFinanceManager && !authStore.isCreditCommittee) {
        return false;
    }

    return true;
});

// Get all files from store that start with 'reviewer_doc:'
const reviewerDocs = computed(() => {
  const docs = {};
  if (store.files) {
    Object.keys(store.files).forEach(key => {
      if (key.startsWith(prefix)) {
        docs[key] = store.files[key];
      }
    });
  }
  return docs;
});

const hasReviewerDocs = computed(() => Object.keys(reviewerDocs.value).length > 0);

const getLabel = (key) => {
  return key.replace(prefix, '');
};

const getUploader = (key) => {
    // We check `store.files` directly because it contains the `isRemote` items with `uploaded_by` mapped from the backend
    if (store.files?.[key] && Array.isArray(store.files[key])) {
        // Find the first remote attachment matching this key to get its uploaded_by
        const firstAttachment = store.files[key].find(f => f.isRemote);
        if (firstAttachment && firstAttachment.uploaded_by && firstAttachment.uploaded_by !== 'unknown') {
            return firstAttachment.uploaded_by;
        }
    }
    // If it's a newly added file not yet saved, it belongs to the current user
    if (store.files?.[key] && store.files[key].length > 0 && !store.uploadedDocuments?.[key]) {
        return store.userRole;
    }
    return null;
};

const canRemove = (key) => {
    if (!canEdit.value) return false;

    const uploader = getUploader(key);
    // If we know who uploaded it, only they can remove it.
    // If it's a new file just added to the store but not uploaded, they can remove it.
    if (uploader) {
        return uploader === store.userRole;
    }
    return true; // If no uploader known (new file), assume they can remove it
};

const addCategory = async () => {
  const { value: label } = await Swal.fire({
    title: 'ระบุชื่อเอกสาร',
    input: 'text',
    inputPlaceholder: 'เช่น หนังสือรับรองการประชุม, เอกสารค้ำประกันเพิ่มเติม',
    showCancelButton: true,
    confirmButtonText: 'เพิ่ม',
    cancelButtonText: 'ยกเลิก',
    inputValidator: (value) => {
      if (!value) {
        return 'กรุณาระบุชื่อเอกสาร';
      }
      const key = `${prefix}${value.trim()}`;
      if (store.files[key]) {
          return 'มีเอกสารชื่อนี้อยู่แล้ว';
      }
    }
  });

  if (label) {
    const key = `${prefix}${label.trim()}`;
    store.updateFile(key, []);
  }
};

const removeCategory = async (key) => {
    const result = await Swal.fire({
        title: 'ยืนยันการลบ?',
        text: `คุณต้องการลบหมวดหมู่ "${getLabel(key)}" และไฟล์ทั้งหมดในหมวดนี้ใช่หรือไม่?`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'ลบ',
        cancelButtonText: 'ยกเลิก'
    });

    if (result.isConfirmed) {
        await store.removeFileKey(key);
    }
};

const updateFile = (key, val) => {
    store.updateFile(key, val);
};

</script>

<style scoped>
.reviewer-documents-section {
  margin-top: 20px;
  background: white;
  border-radius: 8px;
  border: 1px solid #e0e0e0;
  padding: 20px;
}

.section-header-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
  padding-bottom: 10px;
  border-bottom: 1px solid #f0f0f0;
}

.section-title {
  margin: 0;
  font-size: 1.1em;
  color: #333;
  font-weight: bold;
}

.btn-add-category {
  background-color: #0056FF;
  color: white;
  border: none;
  padding: 6px 12px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9em;
  transition: background-color 0.2s;
}

.btn-add-category:hover {
  background-color: #0046cc;
}

.other-docs-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}

.other-doc-item {
    background: #f9f9f9;
    padding: 10px;
    border-radius: 6px;
    border: 1px solid #eee;
}

.doc-header {
    display: flex;
    justify-content: flex-end; /* Align Remove button to right */
    align-items: center;
    margin-bottom: -25px; /* Pull remove button into FileUploader header area */
    position: relative;
    z-index: 10;
}

.doc-label {
    display: none;
}

.doc-actions {
    display: flex;
    align-items: center;
    gap: 10px;
}

.uploaded-by-badge {
    font-size: 11px;
    background: #e2e8f0;
    color: #475569;
    padding: 2px 6px;
    border-radius: 4px;
}

.btn-remove-category {
    font-size: 0.75em;
    color: #ef4444;
    background: none;
    border: 1px solid #ef4444;
    padding: 2px 6px;
    border-radius: 4px;
    cursor: pointer;
}

.btn-remove-category:hover {
    background-color: #fee2e2;
}

.empty-state {
    text-align: center;
    color: #999;
    font-style: italic;
    padding: 20px;
    background: #fafafa;
    border-radius: 6px;
}
</style>
