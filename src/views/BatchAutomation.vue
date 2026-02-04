<template>
  <div class="batch-automation-container">
    <div class="header-section">
      <h2>ระบบคำนวณวงเงินสินเชื่ออัตโนมัติ (Batch)</h2>
      <p class="subtitle">อัปโหลดรายชื่อลูกค้าเพื่อคำนวณคะแนนและวงเงินสินเชื่ออัตโนมัติ</p>
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
          <span v-if="!queue.length">คลิกหรือลากไฟล์ Excel มาวางที่นี่</span>
          <span v-else>โหลดข้อมูลแล้ว {{ queue.length }} รายการ</span>
        </div>
      </div>

      <div class="settings-area">
        <label>การเชื่อมต่อ Bridge:</label>
        <div class="input-group">
          <input
            type="text"
            v-model="bridgeHost"
            placeholder="Localhost หรือ Bridge IP"
            class="form-control"
          />
          <button class="btn-check" @click="checkBridgeConnection">ตรวจสอบ</button>
        </div>
        <small class="text-muted">สถานะ: {{ bridgeStatus }}</small>
      </div>
    </div>

    <!-- Actions -->
    <div class="action-bar">
      <button
        class="btn-primary"
        @click="startBatch"
        :disabled="isProcessing || queue.length === 0"
      >
        {{ isProcessing ? 'กำลังประมวลผล...' : '▶ เริ่มประมวลผล' }}
      </button>

      <button
        class="btn-danger"
        @click="stopBatch"
        :disabled="!isProcessing"
      >
        ⏹ หยุด
      </button>

      <button
        class="btn-success"
        @click="exportReport"
        :disabled="queue.length === 0"
      >
        📊 ส่งออกรายงาน
      </button>

      <div class="progress-info" v-if="queue.length > 0">
        <span>ประมวลผลแล้ว: {{ processedCount }} / {{ queue.length }}</span>
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
            <th>รหัสลูกค้า</th>
            <th>ชื่อลูกค้า</th>
            <th>เลขผู้เสียภาษี</th>
            <th>ยอดซื้อรวม 3 เดือน</th>
            <th>ระยะเวลาเครดิต</th>
            <th>วงเงินปัจจุบัน</th>
            <th>วงเงินใหม่</th>
            <th>คะแนน</th>
            <th>สถานะ</th>
            <th>การดำเนินการ</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(item, index) in queue" :key="index" :class="getRowClass(item)">
            <td>{{ index + 1 }}</td>
            <td>{{ item.customerId }}</td>
            <td>{{ item.name || '-' }}</td>
            <td>{{ item.taxId || '-' }}</td>
            <td>{{ formatNumber(item.totalPurchase3Months) }}</td>
            <td>{{ item.paymentTerms || '-' }}</td>
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
                {{ translateStatus(item.status) }}
              </span>
            </td>
            <td>
              <button
                v-if="['Done', 'Done (Int)'].includes(item.status)"
                class="btn-view-report"
                @click="openReport(item)"
                title="ดูรายงาน"
              >
                📄 ดูรายงาน
              </button>
              <span v-else class="log-message" :title="item.log">{{ item.log }}</span>
            </td>
          </tr>
          <tr v-if="queue.length === 0">
            <td colspan="11" class="text-center">ไม่มีข้อมูล กรุณาอัปโหลดไฟล์ Excel</td>
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
const bridgeStatus = ref('ไม่ทราบสถานะ');

// Watch bridge host to save
watch(bridgeHost, (val) => {
  localStorage.setItem('bridgeHost', val);
});

// Computed
const processedCount = computed(() => {
  return queue.value.filter(i => ['Done', 'Done (Int)', 'Error', 'Skipped'].includes(i.status)).length;
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

const translateStatus = (status) => {
  const map = {
    'Pending': 'รอคิว',
    'Processing': 'กำลังทำ',
    'Done': 'เสร็จสิ้น',
    'Done (Int)': 'เสร็จสิ้น (ภายใน)',
    'Error': 'ผิดพลาด',
    'Skipped': 'ข้าม'
  };
  return map[status] || status;
};

// --- File Handling ---

const handleFileSelect = (e) => processFile(e.target.files[0]);
const handleDrop = (e) => processFile(e.dataTransfer.files[0]);

const findBestIdColumn = (data) => {
    if (!data || data.length === 0) return null;

    const headers = Object.keys(data[0]);

    // Calculate score for each column to determine which is the Customer ID
    const candidates = headers.map(header => {
        let score = 0;

        // 1. Header Name Heuristics
        const h = header.toLowerCase().trim();
        // Strong preference for explicit ID headers
        if (h === 'customer id' || h === 'no.' || h === 'no_' || h === 'id' || h === 'code') score += 20;
        else if (h.includes('id') || h.includes('no') || h.includes('code')) score += 10;

        // 2. Content Analysis (Check first 20 rows to avoid performance hit)
        const samples = data.slice(0, 20).map(row => String(row[header] || '').trim());
        const nonEmptySamples = samples.filter(s => s);

        if (nonEmptySamples.length === 0) return { header, score: -100 }; // Empty column

        // A. Uniqueness (IDs should be unique)
        const uniqueCount = new Set(nonEmptySamples).size;
        const uniquenessRatio = uniqueCount / nonEmptySamples.length;

        if (uniquenessRatio === 1.0) score += 25; // Perfect uniqueness
        else if (uniquenessRatio >= 0.9) score += 15;
        else if (uniquenessRatio < 0.5) score -= 40; // High duplication -> Penalty (e.g. "AY", "AY", "AY")
        else if (uniquenessRatio < 0.8) score -= 20;

        // B. Format Checks
        const hasSpaces = nonEmptySamples.some(s => s.includes(' '));
        const hasThai = nonEmptySamples.some(s => /[\u0E00-\u0E7F]/.test(s));

        if (hasThai) score -= 50; // IDs rarely contain Thai characters
        if (hasSpaces) score -= 20; // IDs rarely contain spaces (Names do)

        // C. Alphanumeric Pattern
        // Check if values look like codes (e.g., 00001AY, CUST-01)
        const isAlphanumeric = nonEmptySamples.every(s => /^[A-Z0-9\-_.]+$/i.test(s));
        if (isAlphanumeric) score += 15;

        // D. Digits Check (IDs often have numbers, prefixes often don't)
        const hasDigits = nonEmptySamples.some(s => /\d/.test(s));
        if (hasDigits) score += 25;

        // E. Length
        // IDs are usually short (e.g. < 20 chars). Names/Descriptions are long.
        const avgLength = nonEmptySamples.reduce((a, b) => a + b.length, 0) / nonEmptySamples.length;
        if (avgLength > 25) score -= 10;

        return { header, score };
    });

    // Sort by score descending
    candidates.sort((a, b) => b.score - a.score);

    // Log for debugging
    console.log('[Batch] Column Analysis:', candidates);

    return candidates[0]?.header;
};

const processFile = (file) => {
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    const data = new Uint8Array(e.target.result);
    const workbook = XLSX.read(data, { type: 'array' });
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet);

    // Smart detection of ID column
    const idKey = findBestIdColumn(jsonData);
    if (!idKey) {
        Swal.fire('ข้อผิดพลาด', 'ไม่พบคอลัมน์ที่ระบุรหัสลูกค้า (Customer ID)', 'error');
        return;
    }
    console.log(`[Batch] Detected ID Column: "${idKey}"`);

    // Map to Queue Format
    queue.value = jsonData.map(row => {
      const id = row[idKey];
      return {
        customerId: String(id || '').trim(),
        name: '',
        taxId: '',
        totalPurchase3Months: 0,
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
    }).filter(i => i.customerId && i.customerId !== 'undefined'); // Filter empty rows

    Swal.fire('โหลดข้อมูลสำเร็จ', `โหลดรายชื่อลูกค้า ${queue.value.length} รายการ (ใช้คอลัมน์: ${idKey})`, 'success');
  };
  reader.readAsArrayBuffer(file);
};

// --- Bridge Logic ---

const checkBridgeConnection = async () => {
  bridgeStatus.value = 'กำลังตรวจสอบ...';
  try {
    const url = `http://${bridgeHost.value}:4343/health`;
    await axios.get(url, { timeout: 2000 });
    bridgeStatus.value = 'เชื่อมต่อสำเร็จ ✅';
    return true;
  } catch (e) {
    bridgeStatus.value = 'ไม่สามารถเชื่อมต่อได้ ❌';
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
       reject(new Error('การเชื่อมต่อล้มเหลว'));
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
    Swal.fire('ข้อผิดพลาด', 'ไม่สามารถเชื่อมต่อกับ Local Bridge กรุณาตรวจสอบการตั้งค่า', 'error');
    return;
  }

  isProcessing.value = true;
  shouldStop.value = false;

  for (let i = 0; i < queue.value.length; i++) {
    if (shouldStop.value) break;

    const item = queue.value[i];
    if (item.status === 'Done' || item.status === 'Done (Int)' || item.status === 'Skipped') continue;

    item.status = 'Processing';
    item.log = 'กำลังเริ่มต้น...';

    try {
      // 1. Fetch Customer Data
      item.log = 'กำลังดึงข้อมูลลูกค้า...';
      const searchRes = await CustomerService.searchCustomers(item.customerId);
      // Find exact match or first close match
      const customer = searchRes.find(c => c.customer.id === item.customerId) || searchRes[0];

      if (!customer) {
        throw new Error('ไม่พบข้อมูลลูกค้าในระบบ');
      }

      item.name = customer.customer.name;
      item.taxId = customer.customer.tax_id;
      item.currentLimit = customer.customer.current_credit_limit;
      item.paymentTerms = customer.customer.payment_terms_code;

      // Fix: Safely Extract Total Purchase (Handle NaN and Commas)
      item.totalPurchase3Months = 0;
      if (customer.financial_summary?.total_purchase_3_months) {
          // Remove commas before parsing
          const rawVal = String(customer.financial_summary.total_purchase_3_months).replace(/,/g, '');
          const val = Number(rawVal);
          item.totalPurchase3Months = isNaN(val) ? 0 : val;
      }

      // Calculate Customer Duration (Years)
      let customerDuration = 0;
      if (customer.customer.customer_since) {
          const start = new Date(customer.customer.customer_since);
          const now = new Date();
          const age = (now - start) / (365.25 * 24 * 60 * 60 * 1000);
          customerDuration = age > 0 ? Math.floor(age) : 0;
      }
      item.customerDuration = customerDuration;

      // RULE: Skip DBD if no Tax ID (Individual) OR Name doesn't look like a company
      let skipDBD = false;
      // Expanded keyword list for better detection
      const corporateKeywords = ['บริษัท', 'ห้างหุ้นส่วน', 'บ.', 'หจก.', 'ltd', 'limited', 'co.', 'plc', 'corp', 'inc', 'company'];
      const nameLower = (item.name || '').toLowerCase();
      const isCorporate = corporateKeywords.some(k => nameLower.includes(k));

      if (!item.taxId || item.taxId.length < 5) {
        item.log = 'ข้าม DBD (ไม่มี Tax ID)';
        skipDBD = true;
      } else if (!isCorporate) {
        item.log = 'ข้าม DBD (ไม่ใช่บริษัท)';
        skipDBD = true;
      }

      // 2. Download from Bridge (Retry Logic) - Only if not skipped
      let downloadResult = null;

      if (!skipDBD) {
          item.log = 'กำลังดาวน์โหลดไฟล์ DBD...';
          let retries = 0;
          const maxRetries = 2;

          while (retries <= maxRetries && !downloadResult) {
             try {
                downloadResult = await connectToBridge(item.taxId, item.customerId);
             } catch (e) {
                retries++;
                if (retries > maxRetries) {
                    console.warn('Bridge failed, proceeding with fallback');
                } else {
                    item.log = `ลองใหม่ DBD (${retries}/${maxRetries})...`;
                    // Wait 2 seconds before retry
                    await new Promise(r => setTimeout(r, 2000));
                }
             }
          }
      }

      // 3. Prepare for Analysis
      item.log = 'กำลังวิเคราะห์...';
      const formData = new FormData();

      let yearsInBusiness = 0;

      if (downloadResult) {
          // Append Files
          if (downloadResult.files.balanceSheet) {
             const f = downloadResult.files.balanceSheet;
             formData.append('balance_sheet', base64ToBlob(f.content, f.mime), f.filename);
          }
          if (downloadResult.files.incomeStatement) {
             const f = downloadResult.files.incomeStatement;
             formData.append('profit_loss', base64ToBlob(f.content, f.mime), f.filename);
          }
          if (downloadResult.files.financialRatios) {
             const f = downloadResult.files.financialRatios;
             formData.append('financial_ratios', base64ToBlob(f.content, f.mime), f.filename);
          }
          yearsInBusiness = downloadResult.yearsInBusiness || 0;
      } else {
          // Fallback: Use Customer Date
          item.log = 'DBD ล้มเหลว ใช้วันที่ลูกค้าแทน...';
          if (customer.customer.customer_since) {
             const start = new Date(customer.customer.customer_since);
             const now = new Date();
             const diff = now.getFullYear() - start.getFullYear();
             yearsInBusiness = diff > 0 ? diff : 0;
          }
      }

      // Store yearsInBusiness for report
      item.yearsInBusiness = yearsInBusiness;

      // Append Meta Data
      formData.append('customer_no', item.customerId);
      formData.append('customer_name', item.name);
      formData.append('registered_capital', '0');
      formData.append('customer_duration', String(customerDuration)); // Use calculated duration
      formData.append('years_in_business', String(yearsInBusiness));
      formData.append('request_credit_term', item.paymentTerms || '30');
      formData.append('request_amount', String(item.currentLimit || 0)); // Fallback to current limit

      // 4. Call Analysis API
      const analyzeRes = await axios.post('/api/financials/analyze', formData, {
         headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (analyzeRes.data.success) {
         item.analysisResult = analyzeRes.data;
         item.newLimit = analyzeRes.data.scoringResult?.recommendedLimit || 0;
         item.score = analyzeRes.data.scoringResult?.totalScore || 0;
         item.grade = analyzeRes.data.scoringResult?.grade || '-';
         item.status = skipDBD ? 'Done (Int)' : 'Done';
         item.log = 'เสร็จสิ้น';
      } else {
         throw new Error('การวิเคราะห์ล้มเหลว');
      }

    } catch (err) {
      item.status = 'Error';
      item.log = err.message;
      console.error(err);
    }
  }

  isProcessing.value = false;
  if (!shouldStop.value) {
     Swal.fire('เสร็จสมบูรณ์', 'การประมวลผลแบบ Batch เสร็จสิ้น', 'success');
  }
};

// --- Report & Export ---

const openReport = (item) => {
    if (!item.analysisResult) return;

    // Construct report data format
    const reportData = {
        analysisResults: item.analysisResult,
        inputs: {
            customerId: item.customerId,
            customerName: item.name,
            taxId: item.taxId,
            registeredCapital: item.analysisResult.extractedData?.registeredCapital || 0,
            yearsInBusiness: item.yearsInBusiness || 0,
            customerDuration: item.customerDuration || 0,
            requestAmount: item.currentLimit || 0,
            creditTerm: item.paymentTerms || 30,
            billingCondition: '-'
        }
    };

    // Save to localStorage for the report page to consume
    localStorage.setItem('credit_report_data', JSON.stringify(reportData));

    // Open in new tab
    const routeData = window.open('/report/financial-analysis', '_blank');
};

const exportReport = () => {
   const data = queue.value.map(item => ({
      'รหัสลูกค้า': item.customerId,
      'ชื่อลูกค้า': item.name,
      'เลขผู้เสียภาษี': item.taxId,
      'ยอดซื้อ 3 เดือน': item.totalPurchase3Months,
      'เครดิตเทอม': item.paymentTerms || '-',
      'วงเงินปัจจุบัน': item.currentLimit,
      'วงเงินใหม่ (แนะนำ)': item.newLimit,
      'คะแนน': item.score,
      'เกรด': item.grade,
      'สถานะ': translateStatus(item.status),
      'บันทึกข้อความ': item.log
   }));

   const ws = XLSX.utils.json_to_sheet(data);
   const wb = XLSX.utils.book_new();
   XLSX.utils.book_append_sheet(wb, ws, "รายงาน Batch");
   XLSX.writeFile(wb, "Batch_Credit_Automation_Report.xlsx");
};

onMounted(() => {
    checkBridgeConnection();
});

</script>

<style scoped>
.hidden-input {
  display: none;
}
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

.btn-view-report {
  background: #17a2b8;
  color: white;
  border: none;
  padding: 5px 10px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.85em;
  display: flex;
  align-items: center;
  gap: 5px;
}
.btn-view-report:hover {
  background: #138496;
}

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
  overflow-x: auto; /* Enable horizontal scrolling */
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
  white-space: nowrap; /* Prevent header wrapping */
}

/* Fix # Column Width */
.data-table th:first-child,
.data-table td:first-child {
  width: 50px;
  min-width: 50px;
  text-align: center;
}

/* Default min-width for other columns */
.data-table th:not(:first-child),
.data-table td:not(:first-child) {
  min-width: 100px;
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
