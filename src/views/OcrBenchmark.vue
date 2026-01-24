<template>
  <div class="ocr-benchmark-container">
    <div class="header-section">
      <h1>OCR Model Benchmark</h1>
      <p>Compare performance and accuracy of Typhoon (LowMem), Tesseract.js, and EasyOCR (Python).</p>
    </div>

    <div class="control-panel">
      <div class="file-input-group">
        <label for="benchmark-file" class="file-label">Select Document (Image/PDF)</label>
        <input
          id="benchmark-file"
          type="file"
          accept="image/*,application/pdf"
          @change="handleFileChange"
          :disabled="loading"
        />
      </div>
      <button
        class="btn-run"
        @click="runBenchmark"
        :disabled="!selectedFile || loading"
      >
        <span v-if="loading">Running Benchmark...</span>
        <span v-else>Run Benchmark</span>
      </button>
    </div>

    <div v-if="error" class="error-message">
      {{ error }}
    </div>

    <div v-if="results" class="results-grid">
      <!-- Typhoon OCR -->
      <div class="result-card typhoon">
        <div class="card-header">
          <h2>{{ results.typhoon.name }}</h2>
          <span class="time-badge">{{ (results.typhoon.timeMs / 1000).toFixed(2) }}s</span>
        </div>
        <div class="card-body">
          <div v-if="results.typhoon.result.success">
            <h3>Structured Data:</h3>
            <pre class="json-output">{{ JSON.stringify(results.typhoon.result.data, null, 2) }}</pre>
            <h3>Raw Output:</h3>
            <div class="text-output">{{ results.typhoon.result.rawText || 'No raw text returned' }}</div>
          </div>
          <div v-else class="error-text">
            Error: {{ results.typhoon.result.error }}
          </div>
        </div>
      </div>

      <!-- Tesseract.js -->
      <div class="result-card tesseract">
        <div class="card-header">
          <h2>{{ results.tesseract.name }}</h2>
          <span class="time-badge">{{ (results.tesseract.timeMs / 1000).toFixed(2) }}s</span>
        </div>
        <div class="card-body">
          <div v-if="results.tesseract.result.success">
            <h3>Raw Output:</h3>
            <div class="text-output">{{ results.tesseract.result.text }}</div>
          </div>
          <div v-else class="error-text">
            Error: {{ results.tesseract.result.error }}
          </div>
        </div>
      </div>

      <!-- EasyOCR -->
      <div class="result-card easyocr">
        <div class="card-header">
          <h2>{{ results.easyocr.name }}</h2>
          <span class="time-badge">{{ (results.easyocr.timeMs / 1000).toFixed(2) }}s</span>
        </div>
        <div class="card-body">
          <div v-if="results.easyocr.result.success">
            <h3>Raw Output:</h3>
            <div class="text-output">{{ results.easyocr.result.text }}</div>
          </div>
          <div v-else class="error-text">
            Error: {{ results.easyocr.result.error }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import axios from 'axios';

const selectedFile = ref(null);
const loading = ref(false);
const results = ref(null);
const error = ref(null);

const handleFileChange = (event) => {
  const file = event.target.files[0];
  if (file) {
    selectedFile.value = file;
    results.value = null;
    error.value = null;
  }
};

const runBenchmark = async () => {
  if (!selectedFile.value) return;

  loading.value = true;
  error.value = null;
  results.value = null;

  const formData = new FormData();
  formData.append('document', selectedFile.value);

  try {
    // Use relative path for production compatibility
    const response = await axios.post('/api/ocr/benchmark', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    results.value = response.data;
  } catch (err) {
    console.error(err);
    error.value = err.response?.data?.error || err.message || 'Benchmark failed';
  } finally {
    loading.value = false;
  }
};
</script>

<style scoped>
.ocr-benchmark-container {
  padding: 2rem;
  max-width: 1400px;
  margin: 0 auto;
  font-family: 'Inter', sans-serif;
}

.header-section {
  margin-bottom: 2rem;
  text-align: center;
}

.control-panel {
  display: flex;
  gap: 1rem;
  justify-content: center;
  align-items: center;
  margin-bottom: 2rem;
  padding: 1.5rem;
  background: #f8f9fa;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.05);
}

.file-input-group {
  display: flex;
  flex-direction: column;
}

.btn-run {
  background-color: #0d6efd;
  color: white;
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 4px;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.2s;
}

.btn-run:disabled {
  background-color: #6c757d;
  cursor: not-allowed;
}

.btn-run:hover:not(:disabled) {
  background-color: #0b5ed7;
}

.error-message {
  background-color: #f8d7da;
  color: #842029;
  padding: 1rem;
  border-radius: 4px;
  margin-bottom: 2rem;
  text-align: center;
}

.results-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
  gap: 1.5rem;
}

.result-card {
  border: 1px solid #dee2e6;
  border-radius: 8px;
  overflow: hidden;
  background: white;
  display: flex;
  flex-direction: column;
}

.card-header {
  background-color: #f1f3f5;
  padding: 1rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid #dee2e6;
}

.card-header h2 {
  margin: 0;
  font-size: 1.1rem;
  color: #495057;
}

.time-badge {
  background-color: #212529;
  color: white;
  padding: 0.25rem 0.6rem;
  border-radius: 12px;
  font-size: 0.85rem;
  font-weight: bold;
}

.card-body {
  padding: 1rem;
  flex-grow: 1;
  max-height: 600px;
  overflow-y: auto;
}

.json-output {
  background-color: #f8f9fa;
  padding: 0.5rem;
  border-radius: 4px;
  font-size: 0.8rem;
  overflow-x: auto;
  border: 1px solid #e9ecef;
}

.text-output {
  white-space: pre-wrap;
  font-family: monospace;
  background-color: #fff3cd;
  padding: 0.5rem;
  border-radius: 4px;
  font-size: 0.9rem;
  border: 1px solid #ffeeba;
}

.error-text {
  color: #dc3545;
  font-weight: bold;
}

h3 {
  font-size: 0.95rem;
  margin-top: 1rem;
  margin-bottom: 0.5rem;
  color: #6c757d;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}
</style>
