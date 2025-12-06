<template>
  <div class="upload-item" :class="{ 'upload-item-large': multiple }">
    <label>{{ label }} <span v-if="required" class="required">*</span></label>
    <div class="upload-box" :class="{ 'upload-box-large': multiple }" @click="triggerUpload">
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
             <svg v-if="!multiple" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
             <svg v-else xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21.2 15c.7-1.2 1-2.5.7-3.9-.6-2.4-3-4-5.4-4-1.3 0-2.5.6-3.4 1.5A5.6 5.6 0 0 0 8 5.1C5.2 5.1 3 7.3 3 10.1c0 .8.2 1.5.5 2.1"></path><path d="M12 13v9"></path><path d="m9 17 3 3 3-3"></path></svg>
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
          <button class="remove-btn" @click.stop="removeFile()">×</button>
        </div>

        <!-- Multiple Files List -->
        <ul v-else class="file-list">
            <li v-for="(f, index) in file" :key="index" class="file-list-item">
                <span class="file-name">{{ f.name }}</span>
                <button class="remove-btn" @click.stop="removeFile(index)">×</button>
            </li>
        </ul>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'FileUploader',
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
    }
  },
  emits: ['update:modelValue', 'file-selected', 'file-removed'],
  data() {
    return {
      file: this.modelValue
    };
  },
  computed: {
    isEmpty() {
      if (this.multiple) {
        return !this.file || this.file.length === 0;
      }
      return !this.file;
    }
  },
  watch: {
    modelValue(newVal) {
      this.file = newVal;
    }
  },
  methods: {
    triggerUpload() {
      this.$refs.fileInput.click();
    },
    handleFileChange(event) {
      console.log('FileUploader: handleFileChange triggered');
      const files = event.target.files;
      if (!files || files.length === 0) {
          console.log('FileUploader: No files found');
          return;
      }

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
        console.log('FileUploader: Emitting single file', selectedFile.name);
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

.upload-box-large {
  border: 2px dashed #e0e0e0;
  padding: 40px;
}

.upload-box:hover {
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
</style>
