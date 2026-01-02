<template>
  <div class="file-uploader">
    <div class="label-container">
      <label class="upload-label">
        {{ label }} <span v-if="required" class="required">*</span>
      </label>
      <span class="file-count" v-if="hasFile">
        (มีไฟล์แล้ว)
      </span>
    </div>

    <div class="upload-area"
         :class="{ 'has-file': hasFile, 'drag-active': isDragActive, 'disabled': disabled }"
         @dragover.prevent="onDragOver"
         @dragleave.prevent="onDragLeave"
         @drop.prevent="onDrop"
         @click="triggerFileInput">

      <input
        type="file"
        ref="fileInput"
        class="hidden-input"
        @change="onFileChange"
        :accept="accept"
        :disabled="disabled"
      />

      <div class="upload-content">
        <template v-if="!hasFile">
          <img src="@/assets/icons/upload-cloud.svg" alt="Upload" class="upload-icon" />
          <span class="upload-text" v-if="!disabled">Click or Drag file here</span>
          <span class="upload-text" v-else>No file uploaded</span>
        </template>

        <template v-else>
           <div class="file-info">
             <img src="@/assets/icons/file-text.svg" alt="File" class="file-icon" />
             <span class="file-name">{{ fileName }}</span>

             <!-- Download Button for Existing Files -->
             <button v-if="isRemoteFile" class="download-btn" @click.stop="downloadFile" title="Download">
               <span class="download-icon">⬇</span>
             </button>

             <button v-if="!disabled" class="remove-btn" @click.stop="removeFile" title="Remove">
               <img src="@/assets/icons/x.svg" alt="Remove" />
             </button>
           </div>
        </template>
      </div>
    </div>

    <div class="error-message" v-if="error">{{ error }}</div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import CreditRequestService from '@/services/CreditRequestService';

const props = defineProps({
  label: String,
  required: Boolean,
  modelValue: [Object, Array, File], // Can be File object, Array, or Metadata Object
  accept: {
    type: String,
    default: '.pdf,.jpg,.jpeg,.png'
  },
  disabled: Boolean
});

const emit = defineEmits(['update:modelValue']);
const fileInput = ref(null);
const isDragActive = ref(false);
const error = ref('');

// Helper to determine if we have a file
const hasFile = computed(() => {
  if (Array.isArray(props.modelValue)) return props.modelValue.length > 0;
  return !!props.modelValue;
});

const isRemoteFile = computed(() => {
    // If it has an ID, it's likely a remote file metadata object
    return props.modelValue && props.modelValue.id && ! (props.modelValue instanceof File);
});

const fileName = computed(() => {
  if (!hasFile.value) return '';
  if (props.modelValue instanceof File) return props.modelValue.name;

  // Handle Metadata Object
  if (props.modelValue.original_name) return props.modelValue.original_name;

  if (Array.isArray(props.modelValue) && props.modelValue.length > 0) {
      const f = props.modelValue[0];
      return f.name || f.original_name || 'Multiple files';
  }
  return 'File uploaded';
});

const triggerFileInput = () => {
  if (props.disabled) return;
  fileInput.value.click();
};

const onDragOver = () => {
  if (props.disabled) return;
  isDragActive.value = true;
};

const onDragLeave = () => {
  if (props.disabled) return;
  isDragActive.value = false;
};

const onDrop = (e) => {
  if (props.disabled) return;
  isDragActive.value = false;
  const files = e.dataTransfer.files;
  handleFiles(files);
};

const onFileChange = (e) => {
  handleFiles(e.target.files);
};

const handleFiles = (files) => {
  if (files.length === 0) return;

  const file = files[0]; // Handle single file for now based on current reqs

  error.value = '';
  emit('update:modelValue', file);
};

const removeFile = () => {
  emit('update:modelValue', null);
  if (fileInput.value) fileInput.value.value = '';
};

const downloadFile = async () => {
    if (!isRemoteFile.value) return;
    try {
        const { txId, id, original_name } = props.modelValue;
        const response = await CreditRequestService.downloadFile(txId, id);

        // Create Blob URL
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', original_name);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    } catch (e) {
        console.error('Download failed', e);
        error.value = 'Download failed';
    }
};

// Clear error if value changes externally
watch(() => props.modelValue, (val) => {
    if (val) error.value = '';
});

</script>

<style scoped>
.file-uploader {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.label-container {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.upload-label {
  font-size: 14px;
  font-weight: 500;
  color: #333;
}

.required {
  color: #dc3545;
  margin-left: 2px;
}

.file-count {
  font-size: 12px;
  color: #28a745;
}

.upload-area {
  border: 1px dashed #ced4da;
  border-radius: 6px;
  padding: 20px;
  text-align: center;
  cursor: pointer;
  background: #fff;
  transition: all 0.2s;
  min-height: 100px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.upload-area:hover:not(.disabled) {
  border-color: #0056FF;
  background: #f8faff;
}

.upload-area.drag-active {
  border-color: #0056FF;
  background: #e6f0ff;
}

.upload-area.has-file {
  border-style: solid;
  border-color: #e0e0e0;
  background: #f8f9fa;
}

.upload-area.disabled {
  background: #f3f3f3;
  cursor: not-allowed;
  border-style: solid;
}

.upload-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  width: 100%;
}

.upload-icon {
  width: 24px;
  height: 24px;
  opacity: 0.5;
}

.upload-text {
  font-size: 13px;
  color: #6c757d;
}

.hidden-input {
  display: none;
}

.file-info {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 0 10px;
}

.file-icon {
  width: 20px;
  height: 20px;
}

.file-name {
  font-size: 14px;
  color: #333;
  flex: 1;
  text-align: left;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.remove-btn {
  background: none;
  border: none;
  padding: 4px;
  cursor: pointer;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.remove-btn:hover {
  background: #fee2e2;
}

.remove-btn img {
  width: 16px;
  height: 16px;
}

/* Download Button Styles */
.download-btn {
    background: white;
    border: 1px solid #ddd;
    border-radius: 4px;
    width: 28px;
    height: 28px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    margin-left: 8px;
    color: #0056FF;
    transition: all 0.2s;
}

.download-btn:hover {
    background-color: #f0f7ff;
    border-color: #0056FF;
}

.download-icon {
    font-size: 14px;
    font-weight: bold;
}

.error-message {
  font-size: 12px;
  color: #dc3545;
  margin-top: 4px;
}
</style>
