<template>
  <div class="modal-overlay" @click.self="$emit('close')">
    <div class="modal-content">
      <div class="modal-header">
        <h3>Smart Import (Thai ID)</h3>
        <button class="close-btn" @click="$emit('close')">&times;</button>
      </div>

      <div class="modal-body">
        <div v-if="!isLoading && !extractionComplete" class="upload-section">
          <p class="instruction">Upload a Thai National ID Card (Image or PDF) to auto-fill the form.</p>

          <div
            class="drop-zone"
            @dragover.prevent
            @drop.prevent="handleDrop"
            @click="$refs.fileInput.click()"
          >
            <input
              type="file"
              ref="fileInput"
              class="hidden-input"
              accept="image/jpeg, image/png, image/jpg, application/pdf"
              @change="handleFileSelect"
            >
            <div v-if="selectedFile" class="file-info">
              <span class="file-name">{{ selectedFile.name }}</span>
              <span class="file-size">({{ formatSize(selectedFile.size) }})</span>
            </div>
            <div v-else class="placeholder">
              <span class="icon">📷</span>
              <span>Click or Drag to Upload ID Card</span>
              <span class="sub-placeholder">(JPG, PNG, or PDF)</span>
            </div>
          </div>

          <button
            class="process-btn"
            :disabled="!selectedFile"
            @click="processFile"
          >
            Start Extraction
          </button>
        </div>

        <div v-if="isLoading" class="loading-section">
          <div class="spinner"></div>
          <p class="status-text">{{ statusMessage }}</p>
          <p class="sub-text">This runs locally on your server.</p>
        </div>

        <div v-if="error" class="error-section">
          <p class="error-msg">❌ {{ error }}</p>
          <button class="retry-btn" @click="resetState">Try Again</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import axios from 'axios';

const emit = defineEmits(['close', 'data-extracted']);

const selectedFile = ref(null);
const isLoading = ref(false);
const extractionComplete = ref(false);
const error = ref(null);
const statusMessage = ref('Initializing...');

const formatSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const handleFileSelect = (event) => {
  const file = event.target.files[0];
  if (file) validateAndSetFile(file);
};

const handleDrop = (event) => {
  const file = event.dataTransfer.files[0];
  if (file) validateAndSetFile(file);
};

const validateAndSetFile = (file) => {
  const validTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
  if (!validTypes.includes(file.type)) {
    error.value = 'Invalid file type. Please upload a JPG, PNG, or PDF.';
    return;
  }
  if (file.size > 5 * 1024 * 1024) {
    error.value = 'File is too large. Max size is 5MB.';
    return;
  }
  selectedFile.value = file;
  error.value = null;
};

const processFile = async () => {
  if (!selectedFile.value) return;

  isLoading.value = true;
  error.value = null;

  // Simulated progress messages for better UX on slow CPUs
  const messages = [
    "Uploading document...",
    "Analyzing image structure...",
    "Reading Thai text (this may take 30-60s on CPU)...",
    "Extracting data fields...",
    "Finalizing..."
  ];

  let msgIndex = 0;
  statusMessage.value = messages[0];

  const msgInterval = setInterval(() => {
    if (msgIndex < messages.length - 1) {
      msgIndex++;
      statusMessage.value = messages[msgIndex];
    }
  }, 4000); // Change message every 4 seconds

  try {
    const formData = new FormData();
    formData.append('document', selectedFile.value);

    // Use relative path for API (proxied by Vite or same origin)
    const response = await axios.post('/api/ocr/extract-id', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });

    clearInterval(msgInterval);

    if (response.data.success) {
      statusMessage.value = "Complete!";
      extractionComplete.value = true;
      // Short delay to show complete message
      setTimeout(() => {
        emit('data-extracted', response.data.data);
        emit('close');
      }, 500);
    } else {
      throw new Error(response.data.error || 'Unknown error');
    }

  } catch (err) {
    clearInterval(msgInterval);
    console.error('OCR Error:', err);
    error.value = err.response?.data?.error || err.message || 'Failed to extract data. Please try again.';
    isLoading.value = false;
  }
};

const resetState = () => {
  selectedFile.value = null;
  isLoading.value = false;
  extractionComplete.value = false;
  error.value = null;
};
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  padding: 25px;
  border-radius: 12px;
  width: 90%;
  max-width: 500px;
  box-shadow: 0 4px 20px rgba(0,0,0,0.15);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.modal-header h3 {
  margin: 0;
  color: #333;
}

.close-btn {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: #666;
}

.drop-zone {
  border: 2px dashed #0056FF;
  border-radius: 8px;
  padding: 40px 20px;
  text-align: center;
  cursor: pointer;
  background-color: #F0F7FF;
  transition: background-color 0.2s;
  margin-bottom: 20px;
}

.drop-zone:hover {
  background-color: #E6F0FF;
}

.placeholder {
  display: flex;
  flex-direction: column;
  gap: 10px;
  color: #0056FF;
  font-weight: 500;
}

.sub-placeholder {
  font-size: 12px;
  color: #888;
  font-weight: normal;
}

.icon {
  font-size: 32px;
}

.process-btn {
  width: 100%;
  padding: 12px;
  background-color: #0056FF;
  color: white;
  border: none;
  border-radius: 6px;
  font-weight: bold;
  cursor: pointer;
  font-size: 16px;
}

.process-btn:disabled {
  background-color: #ccc;
  cursor: not-allowed;
}

.loading-section {
  text-align: center;
  padding: 20px;
}

.spinner {
  border: 4px solid #f3f3f3;
  border-top: 4px solid #0056FF;
  border-radius: 50%;
  width: 40px;
  height: 40px;
  animation: spin 1s linear infinite;
  margin: 0 auto 15px auto;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.status-text {
  font-weight: bold;
  color: #333;
  margin-bottom: 5px;
}

.sub-text {
  font-size: 12px;
  color: #666;
}

.error-msg {
  color: #dc2626;
  background: #fef2f2;
  padding: 10px;
  border-radius: 4px;
  text-align: center;
  margin-bottom: 15px;
}

.retry-btn {
  width: 100%;
  padding: 10px;
  background-color: white;
  border: 1px solid #ccc;
  border-radius: 6px;
  cursor: pointer;
}
</style>
