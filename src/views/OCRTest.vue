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
            label="Select Document"
            accept="image/*,application/pdf"
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

            <!-- Controls for Multi-page (PDF) -->
            <div v-if="isPdf && totalPages > 1" class="page-controls">
              <button @click="prevPage" :disabled="currentPage <= 1">Previous</button>
              <span>Page {{ currentPage }} of {{ totalPages }}</span>
              <button @click="nextPage" :disabled="currentPage >= totalPages">Next</button>
            </div>

            <!-- PDF Mode: Canvas is the content -->
            <div v-if="isPdf" class="visual-content-wrapper pdf-wrapper">
               <canvas ref="canvasRef" class="visual-canvas pdf-mode"></canvas>
            </div>

            <!-- Image Mode: Image is content, Canvas is overlay -->
            <div v-else class="visual-content-wrapper image-wrapper">
              <img
                ref="imageRef"
                :src="imageUrl"
                alt="Uploaded Document"
                @load="onImageLoad"
                class="visual-image"
              />
              <canvas
                ref="canvasRef"
                class="visual-canvas image-mode"
              ></canvas>
            </div>

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
import { ref, watch, onUnmounted, nextTick, computed } from 'vue';
import FileUploader from '../components/shared/FileUploader.vue';
import axios from 'axios';
import * as pdfjsLib from 'pdfjs-dist';

// Use local worker file from public folder
pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.mjs';

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

// PDF State
const currentPage = ref(1);
const totalPages = ref(0);
const pdfDocument = ref(null);

const isPdf = computed(() => {
  return selectedFile.value && selectedFile.value.type === 'application/pdf';
});

watch(selectedFile, (newFile) => {
  if (newFile) {
    ocrResult.value = null;
    errorMessage.value = '';
    activeTab.value = 'text';
    currentPage.value = 1;
    totalPages.value = 0;
    pdfDocument.value = null;

    // Cleanup old URL
    if (imageUrl.value) URL.revokeObjectURL(imageUrl.value);

    if (newFile.type.startsWith('image/')) {
        imageUrl.value = URL.createObjectURL(newFile);
    } else {
        imageUrl.value = null;
    }
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
  nextTick(async () => {
    if (isPdf.value) {
      await renderPdfPage(currentPage.value);
    } else if (imageRef.value && imageRef.value.complete) {
      drawBoundingBoxesImage();
    }
  });
};

const onImageLoad = () => {
  if (activeTab.value === 'visual' && !isPdf.value) {
    drawBoundingBoxesImage();
  }
};

const prevPage = () => {
  if (currentPage.value > 1) {
    currentPage.value--;
    renderPdfPage(currentPage.value);
  }
};

const nextPage = () => {
  if (currentPage.value < totalPages.value) {
    currentPage.value++;
    renderPdfPage(currentPage.value);
  }
};

// --- PDF RENDER LOGIC ---
const renderPdfPage = async (pageNum) => {
  if (!selectedFile.value || !isPdf.value) return;
  if (!ocrResult.value || !ocrResult.value.page_dimensions) return;

  try {
    // Load PDF if not loaded
    if (!pdfDocument.value) {
      const arrayBuffer = await selectedFile.value.arrayBuffer();
      pdfDocument.value = await pdfjsLib.getDocument(arrayBuffer).promise;
      totalPages.value = pdfDocument.value.numPages;
    }

    const page = await pdfDocument.value.getPage(pageNum);
    const canvas = canvasRef.value;
    const ctx = canvas.getContext('2d');

    // Get Backend Dimensions for this page
    const dims = ocrResult.value.page_dimensions[pageNum] || ocrResult.value.page_dimensions[String(pageNum)];

    if (!dims) {
        console.error("No dimensions found for page", pageNum);
        return;
    }

    // Backend generated image at `dims.width` x `dims.height`.
    // We render PDF at scale 1.5 for better viewing quality
    const viewport = page.getViewport({ scale: 1.5 });

    canvas.width = viewport.width;
    canvas.height = viewport.height;

    const renderContext = {
      canvasContext: ctx,
      viewport: viewport,
    };

    await page.render(renderContext).promise;

    // After rendering PDF, draw the boxes on top
    drawBoxesOnPdf(ctx, pageNum, viewport.width, viewport.height, dims.width, dims.height);

  } catch (error) {
    console.error("Error rendering PDF:", error);
    errorMessage.value = "Failed to render PDF page. " + error.message;
  }
};

const drawBoxesOnPdf = (ctx, pageNum, renderedW, renderedH, backendW, backendH) => {
    // Calculate scaling factors
    const scaleX = renderedW / backendW;
    const scaleY = renderedH / backendH;

    drawBoxes(ctx, pageNum, scaleX, scaleY);
};


// --- IMAGE RENDER LOGIC ---
const drawBoundingBoxesImage = () => {
  if (!canvasRef.value || !imageRef.value || !ocrResult.value) return;

  const canvas = canvasRef.value;
  const ctx = canvas.getContext('2d');
  const img = imageRef.value;

  // Set internal canvas resolution to match image resolution
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // For images, we assume 1:1 scale relative to the image itself.
  // The backend processed the image at full resolution.
  let scaleX = 1;
  let scaleY = 1;

  // Optional: Verify against backend dims if available, but usually safe to assume 1:1 for images
  const dims = ocrResult.value.page_dimensions ? (ocrResult.value.page_dimensions[1] || ocrResult.value.page_dimensions['1']) : null;
  if (dims) {
      scaleX = canvas.width / dims.width;
      scaleY = canvas.height / dims.height;
  }

  drawBoxes(ctx, 1, scaleX, scaleY);
};

// --- SHARED DRAWING LOGIC ---
const drawBoxes = (ctx, pageNum, scaleX, scaleY) => {
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#00ff00';
  ctx.fillStyle = 'rgba(0, 255, 0, 0.2)';

  const pageDetails = ocrResult.value.details.filter(d => (d.page || 1) == pageNum);

  pageDetails.forEach(item => {
    const bbox = item.bbox;

    const x = bbox[0][0] * scaleX;
    const y = bbox[0][1] * scaleY;
    const w = (bbox[1][0] - bbox[0][0]) * scaleX;
    const h = (bbox[2][1] - bbox[1][1]) * scaleY;

    ctx.beginPath();
    ctx.rect(x, y, w, h);
    ctx.stroke();
    ctx.fill();
  });

  setupInteraction(ctx.canvas, pageDetails, scaleX, scaleY);
};

const setupInteraction = (canvas, details, scaleX, scaleY) => {
  canvas.onmousemove = (e) => {
    const rect = canvas.getBoundingClientRect();

    // Transform mouse coordinates (DOM space) to Canvas space
    const domScaleX = canvas.width / rect.width;
    const domScaleY = canvas.height / rect.height;

    const mouseX = (e.clientX - rect.left) * domScaleX;
    const mouseY = (e.clientY - rect.top) * domScaleY;

    let found = false;

    // Check boxes in reverse order (topmost first)
    for (let i = details.length - 1; i >= 0; i--) {
      const item = details[i];
      const bbox = item.bbox;

      const x = bbox[0][0] * scaleX;
      const y = bbox[0][1] * scaleY;
      const w = (bbox[1][0] - bbox[0][0]) * scaleX;
      const h = (bbox[2][1] - bbox[1][1]) * scaleY;

      if (mouseX >= x && mouseX <= x + w && mouseY >= y && mouseY <= y + h) {
        hoveredText.value = item.text + ` (${(item.confidence * 100).toFixed(1)}%)`;
        // Position tooltip near mouse pointer
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
      if (activeTab.value === 'visual') {
        nextTick(() => {
             if (isPdf.value) renderPdfPage(currentPage.value);
             else if (imageRef.value && imageRef.value.complete) drawBoundingBoxesImage();
        });
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
  display: flex;
  flex-direction: column;
  align-items: center;
}

.page-controls {
  padding: 10px;
  display: flex;
  gap: 15px;
  align-items: center;
  background: #e9ecef;
  width: 100%;
  justify-content: center;
  border-bottom: 1px solid #ccc;
}

.visual-content-wrapper {
  position: relative;
  /* Limits */
  max-width: 100%;
}

.image-wrapper {
  display: inline-block; /* Wraps tightly around the image */
}

.visual-image {
  display: block;
  max-width: 100%;
  height: auto;
}

/* PDF Mode: Canvas is just a block */
.visual-canvas.pdf-mode {
  display: block;
  max-width: 100%;
  height: auto;
}

/* Image Mode: Canvas is absolute overlay */
.visual-canvas.image-mode {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: auto; /* Allow interaction */
}

/* Tooltip */
.tooltip {
  position: absolute;
  background: rgba(0, 0, 0, 0.8);
  color: white;
  padding: 5px 10px;
  border-radius: 4px;
  font-size: 12px;
  pointer-events: none;
  z-index: 100;
  white-space: nowrap;
}
</style>
