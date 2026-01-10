<template>
  <div class="upload-item" :class="{ 'upload-item-large': multiple }">
    <label>{{ label }} <span v-if="required" class="required">*</span></label>
    <div class="upload-box" :class="{ 'upload-box-large': multiple, 'disabled': disabled, 'border-red-500': showError }" @click="triggerUpload">
      <input
        type="file"
        ref="fileInput"
        class="hidden-input"
        @change="handleFileChange"
        :accept="accept"
        :multiple="multiple"
      />

      <!-- Placeholder State -->
      <div v-if="isEmpty" class="upload-placeholder">
        <div class="icon-wrapper" :class="{ 'icon-large': multiple }">
          <slot name="icon">
             <!-- Default Icon -->
             <img v-if="!multiple" :src="iconFileBlue" alt="File" width="24" height="24" />
             <img v-else :src="iconUploadMulti" alt="Upload" width="48" height="48" />
          </slot>
        </div>
        <p>Drop your files here or <span class="link">Click to upload</span></p>
        <span class="info">
            {{ multiple ? 'Can add multiple files' : 'SVG, PNG, JPG or GIF (max. 800x400px)' }}
        </span>
      </div>

      <!-- Preview State -->
      <div v-else class="file-preview-container">
        <!-- Single File Preview -->
        <div v-if="!multiple" class="file-preview">
          <span class="file-name">{{ file.name }}</span>

          <!-- Download Button (Always if Remote) -->
          <button v-if="isRemote(file)" class="download-btn" @click.stop="downloadFile(file)" title="Download">
             <img src="@/assets/icons/download.svg" alt="Download" />
          </button>

          <!-- Remove Button (Editable) -->
          <button v-if="!disabled" class="remove-btn" @click.stop="removeFile()">×</button>
        </div>

        <!-- Multiple Files List -->
        <ul v-else class="file-list">
            <li v-for="(f, index) in file" :key="index" class="file-list-item">
                <span class="file-name">{{ f.name }}</span>

                <!-- Download Button (Always if Remote) -->
                 <button v-if="isRemote(f)" class="download-btn-small" @click.stop="downloadFile(f)" title="Download">
                    <img src="@/assets/icons/download.svg" alt="Download" />
                 </button>

                <button v-if="!disabled" class="remove-btn" @click.stop="removeFile(index)">×</button>
            </li>
        </ul>
      </div>
    </div>
  </div>
</template>

<script>
import iconFileBlue from '@/assets/icons/file-blue.svg';
import iconUploadMulti from '@/assets/icons/upload-multi.svg';
import { useCreditRequestStore } from '@/stores/creditRequest';
import { computed } from 'vue';

export default {
  name: 'FileUploader',
  data() {
    return {
      file: this.modelValue,
      iconFileBlue,
      iconUploadMulti
    };
  },
  setup(props) {
      const store = useCreditRequestStore();
      const showError = computed(() => {
          // Show error if required, empty, and global validation is triggered
          if (props.required && store.showValidationErrors) {
              if (props.multiple) {
                   return !props.modelValue || props.modelValue.length === 0;
              } else {
                   return !props.modelValue;
              }
          }
          return false;
      });
      return { showError };
  },
  props: {
    label: {
      type: String,
      required: true
    },
    required: {
      type: Boolean,
      default: false
    },
    accept: {
      type: String,
      default: '*/*'
    },
    modelValue: {
      type: [Object, Array], // Object for single, Array for multiple
      default: null
    },
    multiple: {
      type: Boolean,
      default: false
    },
    disabled: {
      type: Boolean,
      default: false
    }
  },
  emits: ['update:modelValue', 'file-selected', 'file-removed'],
  watch: {
    modelValue(newVal) {
      this.file = newVal;
    }
  },
  methods: {
    triggerUpload() {
      if (this.disabled) return;
      this.$refs.fileInput.click();
    },
    handleFileChange(event) {
      const files = event.target.files;
      if (!files || files.length === 0) return;

      if (this.multiple) {
        // Append new files to existing array
        const newFilesArray = Array.from(files);
        const currentFiles = this.file || [];
        const updatedFiles = [...currentFiles, ...newFilesArray];

        this.file = updatedFiles;
        this.$emit('update:modelValue', updatedFiles);
        this.$emit('file-selected', updatedFiles);
      } else {
        // Single file mode
        const selectedFile = files[0];
        this.file = selectedFile;
        this.$emit('update:modelValue', selectedFile);
        this.$emit('file-selected', selectedFile);
      }

      // Reset input to allow re-selection of same file if needed
      this.$refs.fileInput.value = '';
    },
    removeFile(index) {
      if (this.multiple) {
        const updatedFiles = [...this.file];
        updatedFiles.splice(index, 1);
        this.file = updatedFiles;
        this.$emit('update:modelValue', updatedFiles);
      } else {
        this.file = null;
        this.$emit('update:modelValue', null);
      }
      this.$emit('file-removed');
    },
    isRemote(file) {
        return file && file.isRemote && file.id && file.txId;
    },
    downloadFile(file) {
        if (this.isRemote(file)) {
             const url = `/api/credit-requests/${encodeURIComponent(file.txId)}/files/${file.id}`;
             window.open(url, '_blank');
        }
    }
  },
  computed: {
    isEmpty() {
      if (this.multiple) {
        return !this.file || this.file.length === 0;
      }
      return !this.file;
    }
  }
};
</script>

<style scoped>
.upload-item {
  display: flex;
  flex-direction: column;
}

label {
  font-weight: bold;
  font-size: 14px;
  margin-bottom: 8px;
  color: #333;
  text-align: left;
}

.required {
  color: red;
  margin-left: 4px;
}

.upload-box {
  border: 1px dashed #ccc;
  border-radius: 8px;
  padding: 20px;
  text-align: center;
  cursor: pointer;
  background-color: #fff;
  transition: border-color 0.2s, background-color 0.2s;
  min-height: 120px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.upload-box.disabled {
  background-color: #f5f5f5;
  cursor: default; /* Change from not-allowed to default for better UX when viewing */
  border-style: solid;
}

.upload-box-large {
  border: 2px dashed #e0e0e0;
  padding: 40px;
}

.upload-box:hover:not(.disabled) {
  border-color: #0056FF;
  background-color: #f8faff;
}

.hidden-input {
  display: none;
}

.upload-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  pointer-events: none;
  width: 100%;
}

.icon-wrapper {
  color: #0056FF;
  margin-bottom: 10px;
}

.icon-large {
  margin-bottom: 15px;
}

.upload-placeholder p {
  margin: 5px 0;
  font-size: 14px;
  color: #666;
}

.upload-placeholder .link {
  color: #0056FF;
  font-weight: bold;
  text-decoration: underline;
}

.upload-placeholder .info {
  font-size: 11px;
  color: #999;
  margin-top: 5px;
}

.file-preview-container {
    width: 100%;
}

.file-preview {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  justify-content: center;
}

.file-list {
    list-style: none;
    padding: 0;
    margin: 0;
    width: 100%;
}

.file-list-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 12px;
    background-color: #f9f9f9;
    border-radius: 4px;
    margin-bottom: 5px;
}

.file-name {
  font-size: 14px;
  font-weight: bold;
  color: #28a745;
  word-break: break-all;
}

.remove-btn {
  background: #ff4d4f;
  color: white;
  border: none;
  border-radius: 50%;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 16px;
  line-height: 1;
  padding: 0;
}

.remove-btn:hover {
  background: #d9363e;
}

.download-btn {
    background: #0056FF;
    color: white;
    border: none;
    border-radius: 4px;
    padding: 5px;
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
}

.download-btn img {
    width: 20px;
    height: 20px;
    filter: invert(1); /* Make icon white */
}

.download-btn-small {
    background: none;
    border: none;
    cursor: pointer;
    padding: 0;
    display: flex;
    align-items: center;
}
.download-btn-small img {
    width: 18px;
    height: 18px;
    /* color #0056FF */
}

.border-red-500 {
  border-color: #ef4444 !important;
  background-color: #fff1f2; /* Light red background for emphasis */
}

.required {
    color: #ef4444;
    margin-left: 4px;
}
</style>
