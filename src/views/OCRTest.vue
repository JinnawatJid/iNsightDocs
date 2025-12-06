<template>
  <div class="ocr-test-container">
    <div class="header">
      <h1>OCR System Test</h1>
      <p class="subtitle">Upload a document (Thai ID, Statement, etc.) to test the backend OCR engine.</p>
    </div>

    <div class="content-grid">
      <!-- Upload Section -->
      <div class="card upload-section">
        <h2>Upload Document</h2>
        <div class="upload-area">
          <FileUploader
            label="Select Image"
            accept="image/*"
            @update:files="handleFileSelect"
            :maxFiles="1"
          />
        </div>

        <div v-if="selectedFile" class="file-info">
          <p><strong>Selected:</strong> {{ selectedFile.name }}</p>
          <button
            @click="analyzeImage"
            class="analyze-btn"
            :disabled="isLoading"
          >
            <span v-if="isLoading">Processing...</span>
            <span v-else>Run OCR Analysis</span>
          </button>
        </div>

        <div v-if="errorMessage" class="error-message">
          {{ errorMessage }}
        </div>
      </div>

      <!-- Results Section -->
      <div class="card results-section" v-if="ocrResult">
        <h2>Analysis Results</h2>

        <div class="result-tabs">
          <div
            class="tab"
            :class="{ active: activeTab === 'text' }"
            @click="activeTab = 'text'"
          >
            Extracted Text
          </div>
          <div
            class="tab"
            :class="{ active: activeTab === 'json' }"
            @click="activeTab = 'json'"
          >
            Raw JSON
          </div>
        </div>

        <div class="tab-content" v-if="activeTab === 'text'">
          <pre class="text-output">{{ ocrResult.full_text }}</pre>
        </div>

        <div class="tab-content" v-if="activeTab === 'json'">
          <pre class="json-output">{{ JSON.stringify(ocrResult.details, null, 2) }}</pre>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import FileUploader from '../components/shared/FileUploader.vue';
import axios from 'axios';

const selectedFile = ref(null);
const isLoading = ref(false);
const ocrResult = ref(null);
const errorMessage = ref('');
const activeTab = ref('text');

const handleFileSelect = (files) => {
  if (files && files.length > 0) {
    selectedFile.value = files[0];
    ocrResult.value = null;
    errorMessage.value = '';
  } else {
    selectedFile.value = null;
  }
};

const analyzeImage = async () => {
  if (!selectedFile.value) return;

  isLoading.value = true;
  errorMessage.value = '';
  ocrResult.value = null;

  const formData = new FormData();
  formData.append('document', selectedFile.value);

  try {
    const response = await axios.post('/api/ocr/analyze', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    if (response.data.success) {
      ocrResult.value = response.data;
    } else {
      errorMessage.value = response.data.error || 'OCR Analysis failed.';
    }
  } catch (error) {
    console.error('OCR Error:', error);
    errorMessage.value = error.response?.data?.error || 'Server error occurred during analysis.';
  } finally {
    isLoading.value = false;
  }
};
</script>

<style scoped>
.ocr-test-container {
  padding: 2rem;
  max-width: 1200px;
  margin: 0 auto;
  font-family: 'Noto Sans Thai', sans-serif;
}

.header {
  margin-bottom: 2rem;
  text-align: center;
}

.header h1 {
  font-size: 2rem;
  color: #333;
  margin-bottom: 0.5rem;
}

.subtitle {
  color: #666;
}

.content-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 2rem;
}

@media (min-width: 768px) {
  .content-grid {
    grid-template-columns: 1fr 1fr;
    align-items: start;
  }
}

.card {
  background: white;
  border-radius: 8px;
  padding: 1.5rem;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.card h2 {
  margin-top: 0;
  margin-bottom: 1.5rem;
  font-size: 1.25rem;
  color: #2c3e50;
  border-bottom: 2px solid #eee;
  padding-bottom: 0.5rem;
}

.upload-area {
  margin-bottom: 1.5rem;
}

.file-info {
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid #eee;
}

.analyze-btn {
  width: 100%;
  margin-top: 1rem;
  padding: 0.75rem;
  background-color: #3b82f6;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 1rem;
  cursor: pointer;
  transition: background 0.2s;
}

.analyze-btn:hover:not(:disabled) {
  background-color: #2563eb;
}

.analyze-btn:disabled {
  background-color: #93c5fd;
  cursor: not-allowed;
}

.error-message {
  margin-top: 1rem;
  color: #dc2626;
  background: #fee2e2;
  padding: 0.75rem;
  border-radius: 4px;
}

/* Results Styles */
.result-tabs {
  display: flex;
  margin-bottom: 1rem;
  border-bottom: 1px solid #ddd;
}

.tab {
  padding: 0.5rem 1rem;
  cursor: pointer;
  color: #666;
  border-bottom: 2px solid transparent;
  transition: all 0.2s;
}

.tab:hover {
  color: #333;
}

.tab.active {
  color: #3b82f6;
  border-bottom-color: #3b82f6;
  font-weight: 500;
}

.text-output, .json-output {
  background: #f8fafc;
  padding: 1rem;
  border-radius: 4px;
  border: 1px solid #e2e8f0;
  white-space: pre-wrap;
  overflow-x: auto;
  font-family: monospace;
  font-size: 0.9rem;
  max-height: 500px;
  overflow-y: auto;
}
</style>
