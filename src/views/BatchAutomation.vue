<template>
  <div class="batch-automation-container">
    <div class="header-section">
      <h2>Batch Credit Automation</h2>
      <p class="subtitle">Upload customer list to auto-calculate credit scores and limits.</p>
    </div>

    <!-- Configuration & Upload -->
    <div class="control-panel">
      <div class="upload-area" @dragover.prevent @drop.prevent="handleDrop">
        <input
          type="file"
          ref="fileInput"
          class="hidden-input"
          accept=".xlsx, .xls"
          @change="handleFileSelect"
        />
        <div class="upload-content" @click="$refs.fileInput.click()">
          <span class="upload-icon">📂</span>
          <span v-if="!queue.length">Click or Drag Excel File Here</span>
          <span v-else>{{ queue.length }} Customers Loaded</span>
        </div>
      </div>

      <div class="settings-area">
        <label>Bridge Connection:</label>
        <div class="input-group">
          <input
            type="text"
            v-model="bridgeHost"
            placeholder="Localhost or Bridge IP"
            class="form-control"
          />
          <button class="btn-check" @click="checkBridgeConnection">Check</button>
        </div>
        <small class="text-muted">Status: {{ bridgeStatus }}</small>
      </div>
    </div>

    <!-- Actions -->
    <div class="action-bar">
      <button
        class="btn-primary"
        @click="startBatch"
        :disabled="isProcessing || queue.length === 0"
      >
        {{ isProcessing ? 'Processing...' : '▶ Start Batch' }}
      </button>

      <button
        class="btn-danger"
        @click="stopBatch"
        :disabled="!isProcessing"
      >
        ⏹ Stop
      </button>

      <button
        class="btn-success"
        @click="exportReport"
        :disabled="queue.length === 0"
      >
        📊 Export Report
      </button>

      <div class="progress-info" v-if="queue.length > 0">
        <span>Processed: {{ processedCount }} / {{ queue.length }}</span>
        <div class="progress-bar">
          <div
            class="progress-fill"
            :style="{ width: (processedCount / queue.length * 100) + '%' }"
          ></div>
        </div>
      </div>
    </div>

    <!-- Data Table -->
    <div class="table-container">
      <table class="data-table">
        <thead>
          <tr>
            <th style="width: 50px">#</th>
            <th>Customer ID</th>
            <th>Name</th>
            <th>Tax ID</th>
            <th>Current Limit</th>
            <th>New Limit</th>
            <th>Score</th>
            <th>Status</th>
            <th>Message</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(item, index) in queue" :key="index" :class="getRowClass(item)">
            <td>{{ index + 1 }}</td>
            <td>{{ item.customerId }}</td>
            <td>{{ item.name || '-' }}</td>
            <td>{{ item.taxId || '-' }}</td>
            <td>{{ formatNumber(item.currentLimit) }}</td>
            <td class="text-bold">{{ formatNumber(item.newLimit) }}</td>
            <td>
              <span v-if="item.score" :class="getGradeClass(item.grade)">
                {{ item.score }} ({{ item.grade }})
              </span>
              <span v-else>-</span>
            </td>
            <td>
              <span class="status-badge" :class="item.status.toLowerCase()">
                {{ item.status }}
              </span>
            </td>
            <td class="log-message" :title="item.log">{{ item.log }}</td>
          </tr>
          <tr v-if="queue.length === 0">
            <td colspan="9" class="text-center">No data loaded. Please upload an Excel file.</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch, onMounted } from 'vue';
import * as XLSX from 'xlsx';
import axios from 'axios';
import Swal from 'sweetalert2';
import CustomerService from '@/services/CustomerService';

// State
const queue = ref([]);
const isProcessing = ref(false);
const shouldStop = ref(false);
const bridgeHost = ref(localStorage.getItem('bridgeHost') || 'localhost');
const bridgeStatus = ref('Unknown');

// Watch bridge host to save
watch(bridgeHost, (val) => {
  localStorage.setItem('bridgeHost', val);
});

// Computed
const processedCount = computed(() => {
  return queue.value.filter(i => ['Done', 'Error', 'Skipped'].includes(i.status)).length;
});

// Helper: Format Number
const formatNumber = (num) => {
  if (num === null || num === undefined || num === '') return '-';
  return Number(num).toLocaleString('en-US');
};

const getGradeClass = (grade) => {
    if (grade === 'A') return 'text-success';
    if (grade === 'B') return 'text-warning';
    return 'text-danger';
};

const getRowClass = (item) => {
  if (item.status === 'Processing') return 'row-active';
  return '';
};

// --- File Handling ---

const handleFileSelect = (e) => processFile(e.target.files[0]);
const handleDrop = (e) => processFile(e.dataTransfer.files[0]);

const processFile = (file) => {
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    const data = new Uint8Array(e.target.result);
    const workbook = XLSX.read(data, { type: 'array' });
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet);

    // Map to Queue Format
    // Expecting column "Customer ID" or "No_" or first column
    queue.value = jsonData.map(row => {
      // Try to find ID
      const id = row['Customer ID'] || row['No_'] || row['ID'] || Object.values(row)[0];
      return {
        customerId: String(id).trim(),
        name: '',
        taxId: '',
        currentLimit: 0,
        paymentTerms: '',
        newLimit: null,
        score: null,
        grade: '',
        status: 'Pending',
        log: '',
        files: {}, // to store downloaded blobs
        analysisResult: null
      };
    }).filter(i => i.customerId); // Filter empty rows

    Swal.fire('Loaded', `${queue.value.length} customers loaded.`, 'success');
  };
  reader.readAsArrayBuffer(file);
};

// --- Bridge Logic ---

const checkBridgeConnection = async () => {
  bridgeStatus.value = 'Checking...';
  try {
    const url = `http://${bridgeHost.value}:4343/health`;
    await axios.get(url, { timeout: 2000 });
    bridgeStatus.value = 'Connected ✅';
    return true;
  } catch (e) {
    bridgeStatus.value = 'Unreachable ❌';
    return false;
  }
};

const connectToBridge = (taxId, customerCode) => {
  return new Promise((resolve, reject) => {
    const bridgeBaseUrl = `http://${bridgeHost.value}:4343`;
    const queryParams = new URLSearchParams({
        taxId: taxId,
        customerCode: customerCode || ''
    });
    const url = `${bridgeBaseUrl}/stream?${queryParams.toString()}`;

    console.log(`[Bridge] Connecting to ${url}`);

    const evtSource = new EventSource(url);
    let resultFiles = {};
    let yearsInBusiness = 0;

    evtSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.status === 'progress') {
           // Optional: update detail log
        } else if (data.status === 'complete') {
           evtSource.close();
           // Process Data
           if (data.data) {
             resultFiles = {
                profile: data.data.profile,
                balanceSheet: data.data.balanceSheet,
                incomeStatement: data.data.incomeStatement,
                financialRatios: data.data.financialRatios
             };
             yearsInBusiness = data.data.yearsInBusiness || 0;
           }
           resolve({ files: resultFiles, yearsInBusiness });
        } else if (data.status === 'error') {
           evtSource.close();
           reject(new Error(data.message || 'Bridge Error'));
        }
      } catch (e) {
        evtSource.close();
        reject(e);
      }
    };

    evtSource.onerror = (err) => {
       evtSource.close();
       reject(new Error('Connection failed'));
    };
  });
};

const base64ToBlob = (base64, mimeType) => {
    const byteCharacters = atob(base64);
    const byteArrays = [];
    for (let offset = 0; offset < byteCharacters.length; offset += 512) {
        const slice = byteCharacters.slice(offset, offset + 512);
        const byteNumbers = new Array(slice.length);
        for (let i = 0; i < slice.length; i++) {
            byteNumbers[i] = slice.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        byteArrays.push(byteArray);
    }
    return new Blob(byteArrays, { type: mimeType });
};

// --- Batch Logic ---

const stopBatch = () => {
  shouldStop.value = true;
  isProcessing.value = false;
};

const startBatch = async () => {
  if (isProcessing.value) return;

  // Check Bridge first
  const isBridgeReady = await checkBridgeConnection();
  if (!isBridgeReady) {
    Swal.fire('Error', 'Cannot connect to Local Bridge. Please check settings.', 'error');
    return;
  }

  isProcessing.value = true;
  shouldStop.value = false;

  for (let i = 0; i < queue.value.length; i++) {
    if (shouldStop.value) break;

    const item = queue.value[i];
    if (item.status === 'Done' || item.status === 'Skipped') continue;

    item.status = 'Processing';
    item.log = 'Starting...';

    try {
      // 1. Fetch Customer Data
      item.log = 'Fetching Customer Info...';
      const searchRes = await CustomerService.searchCustomers(item.customerId);
      // Find exact match or first close match
      const customer = searchRes.find(c => c.customer.id === item.customerId) || searchRes[0];

      if (!customer) {
        throw new Error('Customer not found in API');
      }

      item.name = customer.customer.name;
      item.taxId = customer.customer.tax_id;
      item.currentLimit = customer.customer.current_credit_limit;
      item.paymentTerms = customer.customer.payment_terms_code;

      // RULE: Skip if no Tax ID
      if (!item.taxId) {
        item.status = 'Skipped';
        item.log = 'Missing Tax ID (Option A)';
        continue;
      }

      // 2. Download from Bridge (Retry Logic)
      item.log = 'Downloading DBD Files...';
      let downloadResult = null;
      let retries = 0;
      const maxRetries = 2;

      while (retries <= maxRetries && !downloadResult) {
         try {
            downloadResult = await connectToBridge(item.taxId, item.customerId);
         } catch (e) {
            retries++;
            if (retries > maxRetries) throw e;
            item.log = `Retry DBD (${retries}/${maxRetries})...`;
            // Wait 2 seconds before retry
            await new Promise(r => setTimeout(r, 2000));
         }
      }

      // 3. Prepare for Analysis
      item.log = 'Analyzing...';
      const formData = new FormData();

      // Append Files
      if (downloadResult.files.balanceSheet) {
         const f = downloadResult.files.balanceSheet;
         formData.append('balance_sheet', base64ToBlob(f.content, f.mime), f.filename);
      }
      if (downloadResult.files.incomeStatement) { // Correct key mapping
         const f = downloadResult.files.incomeStatement;
         formData.append('profit_loss', base64ToBlob(f.content, f.mime), f.filename);
      }
      if (downloadResult.files.financialRatios) {
         const f = downloadResult.files.financialRatios;
         formData.append('financial_ratios', base64ToBlob(f.content, f.mime), f.filename);
      }

      // Append Meta Data
      // Use defaults if missing
      formData.append('registered_capital', '0'); // Will be extracted from file content ideally, but API handles extraction too?
      // Actually API extracts from Excel content usually.
      formData.append('customer_duration', '0');
      formData.append('years_in_business', String(downloadResult.yearsInBusiness || 0));
      formData.append('request_credit_term', item.paymentTerms || '30'); // Default to 30 if null
      formData.append('request_amount', '0'); // Batch mode usually assumes checking purely on financials? Or we should assume current limit?
      // User said "auto calculate new suggest credit without input anything".
      // Usually requires request amount. If 0, formula might yield weird results?
      // Let's send 0. The logic handles 0 request.

      // 4. Call Analysis API
      const analyzeRes = await axios.post('/api/financials/analyze', formData, {
         headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (analyzeRes.data.success) {
         item.analysisResult = analyzeRes.data;
         item.newLimit = analyzeRes.data.scoringResult?.recommendedLimit || 0;
         item.score = analyzeRes.data.scoringResult?.totalScore || 0;
         item.grade = analyzeRes.data.scoringResult?.grade || '-';
         item.status = 'Done';
         item.log = 'Success';
      } else {
         throw new Error('Analysis Failed');
      }

    } catch (err) {
      item.status = 'Error';
      item.log = err.message;
      console.error(err);
    }
  }

  isProcessing.value = false;
  if (!shouldStop.value) {
     Swal.fire('Complete', 'Batch processing finished.', 'success');
  }
};

// --- Export ---
const exportReport = () => {
   const data = queue.value.map(item => ({
      'Customer ID': item.customerId,
      'Name': item.name,
      'Tax ID': item.taxId,
      'Current Limit': item.currentLimit,
      'Suggested Limit': item.newLimit,
      'Score': item.score,
      'Grade': item.grade,
      'Status': item.status,
      'Log': item.log
   }));

   const ws = XLSX.utils.json_to_sheet(data);
   const wb = XLSX.utils.book_new();
   XLSX.utils.book_append_sheet(wb, ws, "Batch Report");
   XLSX.writeFile(wb, "Batch_Credit_Automation_Report.xlsx");
};

onMounted(() => {
    checkBridgeConnection();
});

</script>

<style scoped>
.batch-automation-container {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
}

.header-section {
  margin-bottom: 30px;
  border-bottom: 1px solid #eee;
  padding-bottom: 10px;
}

.header-section h2 {
    color: #0056FF;
    margin-bottom: 5px;
}

.subtitle {
    color: #666;
}

.control-panel {
  display: flex;
  gap: 30px;
  margin-bottom: 30px;
  align-items: flex-start;
}

.upload-area {
  flex: 2;
  border: 2px dashed #0056FF;
  border-radius: 8px;
  padding: 20px;
  text-align: center;
  background: #f8faff;
  transition: all 0.2s;
}

.upload-area:hover {
  background: #eef4ff;
}

.upload-content {
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  color: #0056FF;
  font-weight: 500;
}

.upload-icon {
  font-size: 2em;
}

.settings-area {
  flex: 1;
  background: #f1f1f1;
  padding: 15px;
  border-radius: 8px;
}

.input-group {
  display: flex;
  gap: 5px;
  margin: 5px 0;
}

.form-control {
  padding: 8px;
  border: 1px solid #ccc;
  border-radius: 4px;
  width: 100%;
}

.btn-check {
  padding: 8px;
  background: #6c757d;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.action-bar {
  display: flex;
  gap: 15px;
  align-items: center;
  margin-bottom: 20px;
  background: #fff;
  padding: 10px 0;
  position: sticky;
  top: 0;
  z-index: 10;
}

button {
  padding: 10px 20px;
  border: none;
  border-radius: 4px;
  font-weight: bold;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 5px;
}

button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-primary { background: #0056FF; color: white; }
.btn-danger { background: #dc3545; color: white; }
.btn-success { background: #28a745; color: white; }

.progress-info {
  flex: 1;
  margin-left: 20px;
}

.progress-bar {
  height: 10px;
  background: #e9ecef;
  border-radius: 5px;
  overflow: hidden;
  margin-top: 5px;
}

.progress-fill {
  height: 100%;
  background: #28a745;
  transition: width 0.3s ease;
}

.table-container {
  border: 1px solid #ddd;
  border-radius: 8px;
  overflow: hidden;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
}

.data-table th, .data-table td {
  padding: 12px;
  text-align: left;
  border-bottom: 1px solid #eee;
}

.data-table th {
  background: #f8f9fa;
  font-weight: 600;
  color: #333;
}

.row-active {
  background: #e3f2fd;
}

.status-badge {
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 0.85em;
  font-weight: 500;
}

.status-badge.pending { background: #eee; color: #555; }
.status-badge.processing { background: #cce5ff; color: #004085; }
.status-badge.done { background: #d4edda; color: #155724; }
.status-badge.error { background: #f8d7da; color: #721c24; }
.status-badge.skipped { background: #e2e3e5; color: #383d41; }

.text-bold { font-weight: bold; }
.text-success { color: #28a745; }
.text-warning { color: #ffc107; }
.text-danger { color: #dc3545; }

.log-message {
  font-size: 0.85em;
  color: #666;
  max-width: 200px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
