<template>
  <div class="other-documents-section">
    <div class="section-header-row">
      <h3 class="section-title">เอกสารอื่นๆ</h3>
      <button v-if="isEditing" class="btn-add-category" @click="addCategory">
        + เพิ่มเอกสารอื่นๆ
      </button>
    </div>

    <div v-if="hasOtherDocs" class="other-docs-grid">
      <div v-for="(item, key) in otherDocs" :key="key" class="other-doc-item">
        <div class="doc-header">
           <span class="doc-label">{{ getLabel(key) }}</span>
           <button v-if="isEditing" class="btn-remove-category" @click="removeCategory(key)">
             ลบ
           </button>
        </div>
        <FileUploader
          :label="getLabel(key)"
          v-model="store.files[key]"
          :disabled="!isEditing"
          multiple
          @update:modelValue="(val) => updateFile(key, val)"
        />
      </div>
    </div>
    <div v-else class="empty-state">
        ไม่มีเอกสารเพิ่มเติม
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useCreditRequestStore } from '@/stores/creditRequest';
import FileUploader from '@/components/shared/FileUploader.vue';
import Swal from 'sweetalert2';

const props = defineProps({
  readOnly: Boolean,
  tabName: {
    type: String,
    required: true
  }
});
const store = useCreditRequestStore();

const isEditing = computed(() => !props.readOnly);

const prefix = computed(() => `other_${props.tabName}:`);

// Computed property to get all 'other_tabName:' keys from the store's files
const otherDocs = computed(() => {
  const docs = {};
  if (store.files) {
    Object.keys(store.files).forEach(key => {
      if (key.startsWith(prefix.value)) {
        docs[key] = store.files[key];
      }
    });
  }
  return docs;
});

const hasOtherDocs = computed(() => Object.keys(otherDocs.value).length > 0);

const getLabel = (key) => {
  // Format: "other_tabName:LabelName" -> "LabelName"
  return key.replace(prefix.value, '');
};

const addCategory = async () => {
  const { value: label } = await Swal.fire({
    title: 'ระบุชื่อเอกสาร',
    input: 'text',
    inputPlaceholder: 'เช่น รูปถ่ายหน้างาน, เอกสารสัญญา',
    showCancelButton: true,
    confirmButtonText: 'เพิ่ม',
    cancelButtonText: 'ยกเลิก',
    inputValidator: (value) => {
      if (!value) {
        return 'กรุณาระบุชื่อเอกสาร';
      }
      // Check for duplicate key
      const key = `${prefix.value}${value.trim()}`;
      if (store.files[key]) {
          return 'มีเอกสารชื่อนี้อยู่แล้ว';
      }
    }
  });

  if (label) {
    const key = `${prefix.value}${label.trim()}`;
    // Initialize in store
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
        store.removeFileKey(key);
    }
};

const updateFile = (key, val) => {
    store.updateFile(key, val);
};

</script>

<style scoped>
.other-documents-section {
  margin-top: 30px;
  border-top: 1px dashed #e0e0e0;
  padding-top: 20px;
}

.section-header-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.section-title {
  margin: 0;
  font-size: 1.1em;
  color: #333;
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
