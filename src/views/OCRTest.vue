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
            v-model="selectedFile"
            :multiple="false"
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
          <div
            class="tab"
            :class="{ active: activeTab === 'visual' }"
            @click="handleVisualTab"
          >
            Visual Inspection
          </div>
        </div>

        <div class="tab-content" v-if="activeTab === 'text'">
          <pre class="text-output">{{ ocrResult.full_text }}</pre>
        </div>

        <div class="tab-content" v-if="activeTab === 'json'">
          <pre class="json-output">{{ JSON.stringify(ocrResult.details, null, 2) }}</pre>
        </div>

        <div class="tab-content" v-show="activeTab === 'visual'">
          <div class="visual-container" ref="visualContainer">
            <img
              ref="imageRef"
              :src="imageUrl"
              alt="Uploaded Document"
              @load="onImageLoad"
              class="visual-image"
            />
            <canvas ref="canvasRef" class="visual-canvas"></canvas>

            <div
              v-if="hoveredText"
              class="tooltip"
              :style="{ top: tooltipPos.y + 'px', left: tooltipPos.x + 'px' }"
            >
              {{ hoveredText }}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, onUnmounted, nextTick } from 'vue';
import FileUploader from '../components/shared/FileUploader.vue';
import axios from 'axios';

const selectedFile = ref(null);
const imageUrl = ref(null);
const isLoading = ref(false);
const ocrResult = ref(null);
const errorMessage = ref('');
const activeTab = ref('text');

// Visual Inspection Refs
const imageRef = ref(null);
const canvasRef = ref(null);
const visualContainer = ref(null);
const hoveredText = ref(null);
const tooltipPos = ref({ x: 0, y: 0 });

watch(selectedFile, (newFile) => {
  if (newFile) {
    ocrResult.value = null;
    errorMessage.value = '';
    // Create local URL for preview
    if (imageUrl.value) URL.revokeObjectURL(imageUrl.value);
    imageUrl.value = URL.createObjectURL(newFile);
  } else {
    if (imageUrl.value) URL.revokeObjectURL(imageUrl.value);
    imageUrl.value = null;
  }
});

onUnmounted(() => {
  if (imageUrl.value) URL.revokeObjectURL(imageUrl.value);
});

const handleVisualTab = () => {
  activeTab.value = 'visual';
  nextTick(() => {
    if (imageRef.value && imageRef.value.complete) {
      drawBoundingBoxes();
    }
  });
};

const onImageLoad = () => {
  if (activeTab.value === 'visual') {
    drawBoundingBoxes();
  }
};

const drawBoundingBoxes = () => {
  if (!canvasRef.value || !imageRef.value || !ocrResult.value) return;

  const canvas = canvasRef.value;
  const ctx = canvas.getContext('2d');
  const img = imageRef.value;

  // Match canvas size to displayed image size
  canvas.width = img.width;
  canvas.height = img.height;

  // EasyOCR coordinate system is usually based on the original image dimensions.
  // We need to scale coordinates if the displayed image is resized via CSS.
  // However, `img.width` and `img.height` give the *rendered* size in the DOM
  // if not explicitly set, but for <img> tags it usually reflects intrinsic unless CSS constrains it.
  // Let's rely on intrinsic size for drawing and CSS for scaling.
  // Better approach: Make canvas match image's *natural* size, then scale via CSS.

  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Style for boxes
  ctx.lineWidth = 4;
  ctx.strokeStyle = '#00ff00';
  ctx.fillStyle = 'rgba(0, 255, 0, 0.2)';

  ocrResult.value.details.forEach(item => {
    const bbox = item.bbox;
    // bbox is [[x1, y1], [x2, y1], [x2, y2], [x1, y2]] (Top-Left, Top-Right, Bottom-Right, Bottom-Left)

    const x = bbox[0][0];
    const y = bbox[0][1];
    const w = bbox[1][0] - bbox[0][0];
    const h = bbox[2][1] - bbox[1][1];

    ctx.beginPath();
    ctx.rect(x, y, w, h);
    ctx.stroke();
    ctx.fill();
  });

  // Add hover interaction
  canvas.onmousemove = (e) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const mouseX = (e.clientX - rect.left) * scaleX;
    const mouseY = (e.clientY - rect.top) * scaleY;

    let found = false;

    // Check in reverse order (topmost box first)
    for (let i = ocrResult.value.details.length - 1; i >= 0; i--) {
      const item = ocrResult.value.details[i];
      const bbox = item.bbox;
      const x = bbox[0][0];
      const y = bbox[0][1];
      const w = bbox[1][0] - bbox[0][0];
      const h = bbox[2][1] - bbox[1][1];

      if (mouseX >= x && mouseX <= x + w && mouseY >= y && mouseY <= y + h) {
        hoveredText.value = item.text + ` (${(item.confidence * 100).toFixed(1)}%)`;
        tooltipPos.value = {
          x: e.clientX - rect.left + 15,
          y: e.clientY - rect.top + 15
        };
        found = true;
        canvas.style.cursor = 'pointer';
        break;
      }
    }

    if (!found) {
      hoveredText.value = null;
      canvas.style.cursor = 'default';
    }
  };

  canvas.onmouseleave = () => {
    hoveredText.value = null;
  };
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
      // If we are already on visual tab, refresh it
      if (activeTab.value === 'visual') {
        nextTick(drawBoundingBoxes);
      }
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

/* Visual Tab Styles */
.visual-container {
  position: relative;
  width: 100%;
  overflow: auto;
  border: 1px solid #ddd;
  background: #f0f0f0;
}

.visual-image {
  display: block;
  max-width: 100%;
  height: auto;
}

.visual-canvas {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: auto; /* Allow mouse events for tooltip */
}

.tooltip {
  position: absolute;
  background: rgba(0, 0, 0, 0.8);
  color: white;
  padding: 5px 10px;
  border-radius: 4px;
  font-size: 12px;
  pointer-events: none;
  z-index: 10;
  white-space: nowrap;
}
</style>
