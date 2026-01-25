<template>
  <div class="ocr-comparison-container">
    <h1>OCR Model Comparison</h1>
    <div class="controls">
      <input type="file" @change="handleFileChange" accept="image/*,.pdf" />
      <button @click="compare" :disabled="!file || loading">
        {{ loading ? 'Comparing...' : 'Run Comparison' }}
      </button>
      <button v-if="results" @click="copyToClipboard" class="btn-secondary">
        Copy Stats to Clipboard
      </button>
    </div>

    <div v-if="error" class="error-message">
      {{ error }}
    </div>

    <div v-if="results" class="results-grid">
      <!-- Typhoon -->
      <div class="result-card">
        <h2>Typhoon (Ollama)</h2>
        <div v-if="results.typhoon">
          <p><strong>Time:</strong> {{ formatTime(results.typhoon.time) }}</p>
          <p v-if="results.typhoon.success" class="success">Success</p>
          <p v-else class="error">Failed: {{ results.typhoon.error }}</p>
          <textarea readonly>{{ results.typhoon.text }}</textarea>
        </div>
        <div v-else>No data</div>
      </div>

      <!-- Tesseract -->
      <div class="result-card">
        <h2>Tesseract.js</h2>
        <div v-if="results.tesseract">
          <p><strong>Time:</strong> {{ formatTime(results.tesseract.time) }}</p>
          <p v-if="results.tesseract.success" class="success">Success</p>
          <p v-else class="error">Failed: {{ results.tesseract.error }}</p>
          <textarea readonly>{{ results.tesseract.text }}</textarea>
        </div>
        <div v-else>No data</div>
      </div>

      <!-- EasyOCR -->
      <div class="result-card">
        <h2>EasyOCR (Python)</h2>
        <div v-if="results.easyocr">
          <p><strong>Time:</strong> {{ formatTime(results.easyocr.time) }}</p>
          <p v-if="results.easyocr.success" class="success">Success</p>
          <p v-else class="error">Failed: {{ results.easyocr.error }}</p>
          <textarea readonly>{{ results.easyocr.text }}</textarea>
        </div>
        <div v-else>No data</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import axios from 'axios';
import Swal from 'sweetalert2';

const file = ref(null);
const loading = ref(false);
const results = ref(null);
const error = ref(null);

const handleFileChange = (event) => {
  file.value = event.target.files[0];
  results.value = null;
  error.value = null;
};

const formatTime = (ms) => {
  if (!ms) return '0s';
  const seconds = (ms / 1000).toFixed(2);
  const minutes = (ms / 1000 / 60).toFixed(2);
  return `${minutes} min (${seconds}s)`;
};

const compare = async () => {
  if (!file.value) return;

  loading.value = true;
  error.value = null;
  results.value = null;

  const formData = new FormData();
  formData.append('document', file.value);

  try {
    const response = await axios.post('/api/ocr/compare', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    results.value = response.data;
  } catch (err) {
    console.error(err);
    error.value = err.response?.data?.error || err.message || 'Comparison failed';
  } finally {
    loading.value = false;
  }
};

const copyToClipboard = () => {
  if (!results.value) return;

  const typhoonTime = (results.value.typhoon.time / 1000).toFixed(2);
  const tesseractTime = (results.value.tesseract.time / 1000).toFixed(2);
  const easyocrTime = (results.value.easyocr.time / 1000).toFixed(2);
  const filename = file.value ? file.value.name : 'Unknown';

  // Format: Filename [TAB] TyphoonTime [TAB] TesseractTime [TAB] EasyOCRTime
  const textToCopy = `${filename}\t${typhoonTime}\t${tesseractTime}\t${easyocrTime}`;

  navigator.clipboard.writeText(textToCopy).then(() => {
    Swal.fire({
      icon: 'success',
      title: 'Copied!',
      text: 'Stats copied to clipboard. You can paste them into your spreadsheet.',
      timer: 1500,
      showConfirmButton: false
    });
  });
};
</script>

<style scoped>
.ocr-comparison-container {
  padding: 20px;
  font-family: sans-serif;
  max-width: 1400px;
  margin: 0 auto;
}

.controls {
  margin-bottom: 20px;
  display: flex;
  gap: 10px;
  align-items: center;
  padding: 15px;
  background: #f0f0f0;
  border-radius: 8px;
}

button {
  padding: 8px 16px;
  background-color: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: bold;
}

button:disabled {
  background-color: #ccc;
  cursor: not-allowed;
}

.btn-secondary {
  background-color: #6c757d;
}

.results-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
}

.result-card {
  border: 1px solid #ddd;
  padding: 15px;
  border-radius: 8px;
  background: white;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.result-card h2 {
  margin-top: 0;
  font-size: 1.2em;
  border-bottom: 2px solid #eee;
  padding-bottom: 10px;
  margin-bottom: 10px;
  color: #333;
}

textarea {
  width: 100%;
  height: 500px;
  margin-top: 10px;
  padding: 10px;
  border: 1px solid #ccc;
  border-radius: 4px;
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 14px;
  line-height: 1.4;
  white-space: pre-wrap;
  resize: vertical;
  background-color: #fcfcfc;
  color: #000000; /* Force black text */
}

.error-message {
  color: #721c24;
  background-color: #f8d7da;
  border-color: #f5c6cb;
  padding: 10px;
  border-radius: 4px;
  margin-bottom: 20px;
}

.success {
  color: #155724;
  background-color: #d4edda;
  padding: 4px 8px;
  border-radius: 4px;
  display: inline-block;
  font-size: 0.9em;
}

.error {
  color: #721c24;
  background-color: #f8d7da;
  padding: 4px 8px;
  border-radius: 4px;
  display: inline-block;
  font-size: 0.9em;
}

@media (max-width: 1024px) {
  .results-grid {
    grid-template-columns: 1fr;
  }
}
</style>
