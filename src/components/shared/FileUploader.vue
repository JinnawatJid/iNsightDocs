<template>
  <div class="upload-item" :class="{ 'upload-item-large': multiple }">
    <label v-if="label">{{ label }} <span v-if="required" class="required">*</span></label>

    <!-- New Compact Upload Box -->
    <div class="upload-box-compact" :class="{ 'disabled': disabled, 'border-red-500': showError }" @click="triggerUpload">
      <input
        type="file"
        ref="fileInput"
        class="hidden-input"
        @change="handleFileChange"
        :accept="accept"
        :multiple="multiple"
      />

      <div class="upload-compact-content">
          <div class="icon-wrapper-small">
              <slot name="icon">
                  <img v-if="multiple" :src="iconUploadMulti" alt="Upload" width="24" height="24" />
                  <img v-else :src="iconFileBlue" alt="File" width="20" height="20" />
              </slot>
          </div>
          <div class="text-content">
              <span class="main-text" v-if="!disabled">
                  <span class="link">คลิกเพื่ออัปโหลด</span>
              </span>
              <span class="main-text disabled-text" v-else>
                  {{ isEmpty ? 'ไม่มีเอกสารแนบ' : 'ดูเอกสารแนบ' }}
              </span>
          </div>
      </div>
    </div>

    <div class="info-text" v-if="!disabled">
        {{ multiple ? 'รองรับการอัปโหลดหลายไฟล์' : 'รองรับ JPG, PNG, PDF (สูงสุด 5MB)' }}
    </div>

    <!-- File List (Outside box, scrollable) -->
    <div v-if="!isEmpty" class="file-list-container">
        <!-- Single File Preview -->
        <div v-if="!multiple && file" class="file-preview-row">
            <div class="file-info" @click.stop="openPreview(file)" style="cursor: pointer;">
                 <img :src="iconFileBlue" width="16" height="16" class="file-icon"/>
                 <span class="file-name" :title="file.name">{{ file.name }}</span>
            </div>

            <div class="file-actions">
                 <button class="action-btn view-btn" @click.stop="openPreview(file)" title="View">
                     <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-eye"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                 </button>
                 <button v-if="isRemote(file)" class="action-btn download-btn" @click.stop="downloadFile(file)" title="Download">
                     <img src="@/assets/icons/download.svg" alt="Download" />
                 </button>
                 <button v-if="!disabled" class="action-btn remove-btn" @click.stop="removeFile()">×</button>
            </div>
        </div>

        <!-- Multiple Files List -->
        <ul v-else-if="multiple && file && file.length > 0" class="file-list-scrollable">
            <li v-for="(f, index) in file" :key="index" class="file-preview-row">
                 <div class="file-info" @click.stop="openPreview(f)" style="cursor: pointer;">
                     <img :src="iconFileBlue" width="16" height="16" class="file-icon"/>
                     <span class="file-name" :title="f.name">{{ f.name }}</span>
                 </div>

                 <div class="file-actions">
                     <button class="action-btn view-btn" @click.stop="openPreview(f)" title="View">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-eye"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                     </button>
                     <button v-if="isRemote(f)" class="action-btn download-btn" @click.stop="downloadFile(f)" title="Download">
                        <img src="@/assets/icons/download.svg" alt="Download" />
                     </button>
                     <button v-if="!disabled" class="action-btn remove-btn" @click.stop="removeFile(index)">×</button>
                 </div>
            </li>
        </ul>
    </div>

    <!-- Document Preview Modal -->
    <DocumentPreviewModal
      :isOpen="previewModalOpen"
      :file="fileToPreview"
      @close="closePreview"
    />
  </div>
</template>

<script>
import iconFileBlue from '@/assets/icons/file-blue.svg';
import iconUploadMulti from '@/assets/icons/upload-multi.svg';
import { useCreditRequestStore } from '@/stores/creditRequest';
import { computed } from 'vue';
import Swal from 'sweetalert2';
import DocumentPreviewModal from '@/components/shared/DocumentPreviewModal.vue';

export default {
  name: 'FileUploader',
  components: {
    DocumentPreviewModal
  },
  data() {
    return {
      file: this.initializeFile(this.modelValue),
      iconFileBlue,
      iconUploadMulti,
      previewModalOpen: false,
      fileToPreview: null
    };
  },
  setup(props) {
      const store = useCreditRequestStore();
      const showError = computed(() => {
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
      default: '.jpg, .jpeg, .png, .pdf'
    },
    modelValue: {
      type: [Object, Array],
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
      this.file = this.initializeFile(newVal);
    },
    multiple(newVal) {
        // Re-initialize if mode changes dynamically
        this.file = this.initializeFile(this.modelValue);
    }
  },
  methods: {
    initializeFile(val) {
        if (!val) {
            return this.multiple ? [] : null;
        }
        if (this.multiple) {
            // Ensure array
            return Array.isArray(val) ? val : [val];
        } else {
            // Ensure object
            return Array.isArray(val) ? (val.length > 0 ? val[0] : null) : val;
        }
    },
    triggerUpload() {
      if (this.disabled) return;
      this.$refs.fileInput.click();
    },
    handleFileChange(event) {
      const files = event.target.files;
      if (!files || files.length === 0) return;

      const validFiles = [];
      const MAX_SIZE = 20 * 1024 * 1024; // 20MB
      const MAX_SIZE_MB = 20;

      console.log(`[FileUploader] Processing ${files.length} files. Max size allowed: ${MAX_SIZE_MB}MB`);

      const isExtensionValid = (fileName) => {
          if (this.accept === '*/*') return true;
          const allowedExts = this.accept.split(',').map(ext => ext.trim().toLowerCase());
          const fileExt = '.' + fileName.split('.').pop().toLowerCase();
          return allowedExts.includes(fileExt);
      };

      for (let i = 0; i < files.length; i++) {
          const file = files[i];
          const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);
          
          console.log(`[FileUploader] File ${i + 1}: "${file.name}" - Size: ${fileSizeMB}MB`);

          if (file.size > MAX_SIZE) {
              console.error(`[FileUploader] File rejected: "${file.name}" (${fileSizeMB}MB exceeds ${MAX_SIZE_MB}MB limit)`);
              Swal.fire({
                  icon: 'error',
                  title: 'File too large',
                  text: `File "${file.name}" exceeds the ${MAX_SIZE_MB}MB limit. (Size: ${fileSizeMB}MB)`
              });
              this.$refs.fileInput.value = '';
              return;
          }

          if (!isExtensionValid(file.name)) {
               console.error(`[FileUploader] File rejected: "${file.name}" - Invalid extension`);
               Swal.fire({
                  icon: 'error',
                  title: 'Invalid file type',
                  text: `File "${file.name}" is not allowed. Allowed types: ${this.accept}`
              });
              this.$refs.fileInput.value = '';
              return;
          }

          console.log(`[FileUploader] File accepted: "${file.name}"`);
          validFiles.push(file);
      }

      console.log(`[FileUploader] Total valid files: ${validFiles.length}`);

      if (this.multiple) {
        const currentFiles = this.file || [];
        const updatedFiles = [...currentFiles, ...validFiles];
        this.file = updatedFiles;
        this.$emit('update:modelValue', updatedFiles);
        this.$emit('file-selected', updatedFiles);
      } else {
        const selectedFile = validFiles[0];
        this.file = selectedFile;
        this.$emit('update:modelValue', selectedFile);
        this.$emit('file-selected', selectedFile);
      }

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
        } else if (file instanceof File) {
             const url = URL.createObjectURL(file);
             const link = document.createElement('a');
             link.href = url;
             link.download = file.name;
             document.body.appendChild(link);
             link.click();
             document.body.removeChild(link);
             URL.revokeObjectURL(url);
        }
    },
    openPreview(file) {
        this.fileToPreview = file;
        this.previewModalOpen = true;
    },
    closePreview() {
        this.previewModalOpen = false;
        setTimeout(() => {
            this.fileToPreview = null;
        }, 200); // Wait for transition if any
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
  margin-bottom: 15px;
}

label {
  font-weight: 600;
  font-size: 13px;
  margin-bottom: 6px;
  color: #444;
  text-align: left;
}

.required {
  color: #ef4444;
  margin-left: 3px;
}

/* Compact Upload Box Design */
.upload-box-compact {
  border: 1px dashed #ccc;
  border-radius: 6px;
  padding: 10px 15px; /* Compact Padding */
  cursor: pointer;
  background-color: #fff;
  transition: all 0.2s ease;
  min-height: 48px; /* Fixed small height */
  display: flex;
  align-items: center;
  justify-content: flex-start;
}

.upload-box-compact:hover:not(.disabled) {
  border-color: #0056FF;
  background-color: #f0f7ff;
}

.upload-box-compact.disabled {
  background-color: #f9f9f9;
  cursor: default;
  border-style: solid;
  border-color: #eee;
}

.border-red-500 {
  border-color: #ef4444 !important;
  background-color: #fff1f2;
}

.upload-compact-content {
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
}

.icon-wrapper-small {
    display: flex;
    align-items: center;
    color: #0056FF;
}

.text-content {
    flex: 1;
    font-size: 13px;
    color: #555;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.link {
    color: #0056FF;
    font-weight: 600;
    text-decoration: none;
}
.link:hover {
    text-decoration: underline;
}

.disabled-text {
    color: #999;
    font-style: italic;
}

.info-text {
    font-size: 11px;
    color: #999;
    margin-top: 4px;
    margin-left: 2px;
}

.hidden-input {
  display: none;
}

/* File List Design */
.file-list-container {
    margin-top: 8px;
    border: 1px solid #eee;
    border-radius: 4px;
    background: #fafafa;
}

.file-list-scrollable {
    list-style: none;
    padding: 0;
    margin: 0;
    max-height: 120px; /* Limit height to show ~3 items */
    overflow-y: auto;
}

.file-preview-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 6px 10px;
    border-bottom: 1px solid #eee;
    background: white;
}

.file-preview-row:last-child {
    border-bottom: none;
}

.file-info {
    display: flex;
    align-items: center;
    gap: 8px;
    overflow: hidden;
}

.file-info:hover .file-name {
    text-decoration: underline;
    color: #0056FF;
}

.file-icon {
    opacity: 0.7;
    flex-shrink: 0;
}

.file-name {
    font-size: 13px;
    color: #333;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 200px; /* Adjust based on container */
    transition: color 0.2s;
}

.file-actions {
    display: flex;
    align-items: center;
    gap: 5px;
}

.action-btn {
    background: none;
    border: none;
    cursor: pointer;
    padding: 4px;
    border-radius: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background 0.2s;
}

.download-btn img {
    width: 16px;
    height: 16px;
    filter: invert(32%) sepia(85%) saturate(2220%) hue-rotate(209deg) brightness(96%) contrast(106%); /* #0056FF */
}

.view-btn {
    color: #0056FF;
}

.download-btn:hover, .view-btn:hover {
    background-color: #e6f0ff;
}

.remove-btn {
    color: #ff4d4f;
    font-size: 18px;
    line-height: 1;
    font-weight: bold;
}

.remove-btn:hover {
    background-color: #fff1f0;
}

</style>
