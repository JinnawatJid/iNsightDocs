<template>
  <div class="store-statement-tab">
    <div class="upload-section">
      <div class="upload-grid">
        <div class="upload-item">
          <label>Bank Statement 1 <span class="required">*</span></label>
          <div class="upload-box" @click="triggerUpload('bankStatement1')">
            <input type="file" ref="bankStatement1" class="hidden-input" @change="handleFileChange($event, 'bankStatement1')" />
            <div v-if="!files.bankStatement1" class="upload-placeholder">
              <div class="icon-wrapper">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
              </div>
              <p>Drop your files here or <span class="link">Click to upload</span></p>
              <span class="info">SVG, PNG, JPG or GIF (max. 800x400px)</span>
            </div>
            <div v-else class="file-preview">
              <span class="file-name">{{ files.bankStatement1.name }}</span>
              <button class="remove-btn" @click.stop="removeFile('bankStatement1')">×</button>
            </div>
          </div>
        </div>

        <div class="upload-item">
          <label>Bank Statement 2 <span class="required">*</span></label>
          <div class="upload-box" @click="triggerUpload('bankStatement2')">
            <input type="file" ref="bankStatement2" class="hidden-input" @change="handleFileChange($event, 'bankStatement2')" />
            <div v-if="!files.bankStatement2" class="upload-placeholder">
              <div class="icon-wrapper">
                 <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
              </div>
              <p>Drop your files here or <span class="link">Click to upload</span></p>
              <span class="info">SVG, PNG, JPG or GIF (max. 800x400px)</span>
            </div>
            <div v-else class="file-preview">
              <span class="file-name">{{ files.bankStatement2.name }}</span>
              <button class="remove-btn" @click.stop="removeFile('bankStatement2')">×</button>
            </div>
          </div>
        </div>

        <div class="upload-item">
          <label>Bank Statement 3 <span class="required">*</span></label>
          <div class="upload-box" @click="triggerUpload('bankStatement3')">
            <input type="file" ref="bankStatement3" class="hidden-input" @change="handleFileChange($event, 'bankStatement3')" />
            <div v-if="!files.bankStatement3" class="upload-placeholder">
              <div class="icon-wrapper">
                 <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
              </div>
              <p>Drop your files here or <span class="link">Click to upload</span></p>
              <span class="info">SVG, PNG, JPG or GIF (max. 800x400px)</span>
            </div>
            <div v-else class="file-preview">
              <span class="file-name">{{ files.bankStatement3.name }}</span>
              <button class="remove-btn" @click.stop="removeFile('bankStatement3')">×</button>
            </div>
          </div>
        </div>

        <div class="upload-item">
          <label>Bank Statement 4</label>
          <div class="upload-box" @click="triggerUpload('bankStatement4')">
            <input type="file" ref="bankStatement4" class="hidden-input" @change="handleFileChange($event, 'bankStatement4')" />
            <div v-if="!files.bankStatement4" class="upload-placeholder">
              <div class="icon-wrapper">
                 <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
              </div>
              <p>Drop your files here or <span class="link">Click to upload</span></p>
              <span class="info">SVG, PNG, JPG or GIF (max. 800x400px)</span>
            </div>
            <div v-else class="file-preview">
              <span class="file-name">{{ files.bankStatement4.name }}</span>
              <button class="remove-btn" @click.stop="removeFile('bankStatement4')">×</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'StoreStatementTab',
  props: {},
  data() {
    return {
      files: {
        bankStatement1: null,
        bankStatement2: null,
        bankStatement3: null,
        bankStatement4: null,
      }
    };
  },
  methods: {
    triggerUpload(refName) {
      this.$refs[refName].click();
    },
    handleFileChange(event, key) {
      const file = event.target.files[0];
      if (file) {
        this.files[key] = file;
      }
    },
    removeFile(key) {
      this.files[key] = null;
    }
  }
};
</script>

<style scoped>
@import './shared-styles.css';

.store-statement-tab {
  padding: 10px;
}
</style>
