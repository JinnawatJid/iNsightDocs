<template>
  <div class="batch-automation-container">
    <div class="header-section">
      <h2>ระบบคำนวณวงเงินสินเชื่ออัตโนมัติ</h2>
      <p class="subtitle">อัปโหลดรายชื่อลูกค้าเพื่อคำนวณคะแนนและวงเงินสินเชื่ออัตโนมัติ</p>
    </div>

    <!-- Configuration & Upload -->
    <div class="control-panel">
      <div class="input-section">
          <!-- Input Type Toggle -->
          <div class="input-type-toggle">
              <button
                class="toggle-btn"
                :class="{ active: inputType === 'branch' }"
                @click="inputType = 'branch'"
              >
                ดึงข้อมูลตามสาขา
              </button>
              <button
                class="toggle-btn"
                :class="{ active: inputType === 'file' }"
                @click="inputType = 'file'"
              >
                อัปโหลด Excel
              </button>
          </div>

          <!-- File Upload -->
          <div v-if="inputType === 'file'" class="upload-area" @dragover.prevent @drop.prevent="handleDrop">
            <input
              type="file"
              ref="fileInput"
              class="hidden-input"
              accept=".xlsx, .xls"
              @change="handleFileSelect"
            />
            <div class="upload-content" @click="$refs.fileInput.click()">
              <span class="upload-icon" style="font-size: 2em; line-height: 1;">&#8681;</span>
              <span v-if="!queue.length">คลิกหรือลากไฟล์ Excel มาวางที่นี่</span>
              <span v-else>โหลดข้อมูลแล้ว {{ queue.length }} รายการ</span>
            </div>
          </div>

          <!-- Branch Selection -->
          <div v-else class="branch-area">
             <div class="d-flex align-items-center" style="gap: 15px;">
                <label style="white-space: nowrap; margin-bottom: 0;">เลือกสาขา (Branch):</label>
                <select v-model="selectedBranch" class="form-control branch-select" style="max-width: 300px;">
                    <option value="" disabled>-- กรุณาเลือกสาขา / ภูมิภาค --</option>
                    <optgroup v-for="region in branchData" :key="region.region" :label="region.region">
                        <option :value="`REGION:${region.region}`" style="font-weight: bold; color: #0056FF;">
                            รวมทั้งหมดใน {{ region.region }}
                        </option>
                        <option v-for="zone in region.zones" :key="zone.code" :value="zone.code">
                            {{ zone.code }} - {{ zone.name }}
                        </option>
                    </optgroup>
                </select>
                <button
                    class="btn-primary btn-fetch"
                    @click="fetchByBranch"
                    :disabled="!selectedBranch || isFetchingBranch"
                    style="white-space: nowrap;"
                >
                    {{ isFetchingBranch ? 'กำลังดึงข้อมูล...' : 'ดึงรายชื่อลูกค้า' }}
                </button>
             </div>
          </div>
      </div>

      <div class="settings-area" style="text-align: left;">
        <label style="display: block; margin-bottom: 5px;">การเชื่อมต่อ Bridge:</label>
        <div class="input-group" style="display: flex; gap: 10px;">
          <input
            type="text"
            v-model="bridgeHost"
            placeholder="Localhost หรือ Bridge IP"
            class="form-control"
            style="flex: 1; min-width: 150px;"
          />
          <button class="btn-check" @click="checkBridgeConnection" style="min-width: 120px;">ตรวจสอบ</button>
        </div>
        <small class="text-muted" style="display: block; margin-top: 5px;">สถานะ: {{ bridgeStatus }}</small>

        <div class="mt-4">
           <div class="section-header cursor-pointer" @click="showConcurrencySettings = !showConcurrencySettings">
             <span>ตั้งค่าขั้นสูง</span>
             <span class="toggle-icon">{{ showConcurrencySettings ? '▼' : '▶' }}</span>
           </div>

           <div v-if="showConcurrencySettings" class="clean-settings-card">
             <!-- Scoring Model Selection -->
             <div class="setting-row">
               <label class="setting-label">โมเดลการให้คะแนน:</label>
               <select v-model="selectedModel" class="form-control" style="width: 200px;">
                 <option value="new">ลูกค้าใหม่</option>
                 <option value="existing">ลูกค้าปัจจุบัน</option>
               </select>
             </div>

             <!-- Limit Exponent (Only for Existing) -->
             <div v-if="selectedModel === 'existing'" class="setting-row">
                <label class="setting-label">เลขยกกำลัง:</label>
                <div class="d-flex align-items-center" style="gap: 10px;">
                    <input type="number" step="0.1" min="1.0" max="5.0" v-model="limitExponent" class="form-control" style="width: 80px;" />
                    <small class="text-muted">(ค่าปกติ: 0.5)</small>
                </div>
             </div>

             <div class="divider"></div>

             <!-- Concurrency -->
             <div class="setting-row">
               <label class="setting-label">จำนวนเธรดการทำงาน:</label>
               <div class="d-flex align-items-center" style="gap: 10px; white-space: nowrap;">
                   <input type="number" min="1" max="8" v-model="concurrency" class="form-control" style="width: 50px; text-align: center;" />
                   <small class="text-muted">แนะนำ 2-4</small>
               </div>
             </div>
           </div>
        </div>
      </div>
    </div>

    <!-- Actions -->
    <div class="action-bar">
      <button
        class="btn-primary"
        @click="startBatch"
        :disabled="isProcessing || queue.length === 0"
      >
        {{ isProcessing ? 'กำลังประมวลผล...' : 'เริ่มประมวลผล' }}
      </button>

      <button
        class="btn-outline-danger"
        @click="stopBatch"
        :disabled="!isProcessing"
      >
        หยุด
      </button>

      <button
        class="btn-secondary"
        @click="checkReadiness"
        :disabled="isProcessing || queue.length === 0"
      >
        ตรวจสอบความพร้อม (DBD)
      </button>

      <!-- DROPDOWN FOR EXPORT -->
      <div class="dropdown" v-click-outside="closeExportDropdown">
        <button
          class="btn-secondary dropdown-toggle"
          @click="toggleExportDropdown"
          :disabled="queue.length === 0"
        >
          ส่งออกรายงาน
        </button>
        <div class="dropdown-menu" v-if="isExportDropdownOpen">
          <a class="dropdown-item" @click="exportSummarizedReport">แบบย่อ (Summary)</a>
          <a class="dropdown-item" @click="exportFullDetailReport">แบบละเอียด (Full Detail)</a>
        </div>
      </div>

      <div class="progress-info" v-if="queue.length > 0">
        <div class="d-flex justify-content-between">
           <span>ประมวลผลแล้ว: {{ processedCount }} / {{ queue.length }}</span>
           <span v-if="activeWorkers > 0" class="text-primary processing-badge">
             <span class="spinner-border spinner-border-sm"></span>
             กำลังทำงาน: {{ activeWorkers }}
           </span>
        </div>
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
            <th>ยอดซื้อรวม 3 เดือน</th>
            <th>เฉลี่ยการจ่ายเงินล่าช้า</th>
            <th>ระยะเวลาเครดิต</th>
            <th>ระยะเวลาการวางบิล</th>
            <th>วงเงินปัจจุบัน</th>
            <th>วงเงินแนะนำ ต่อเดือน</th>
            <th>วงเงินแนะนำ ต่อรอบบิล</th>
            <th>คะแนน</th>
            <th>สถานะ</th>
            <th>ไฟล์</th>
            <th>การดำเนินการ</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(item, index) in queue" :key="index" :class="getRowClass(item)">
            <td>{{ index + 1 }}</td>
            <td>{{ item.customerId }}</td>
            <td>{{ item.name || '-' }}</td>
            <td>{{ formatCurrency(item.totalPurchase3Months) }}</td>
            <td>{{ item.wadlScore !== null ? formatDays(item.wadlScore) : '-' }}</td>
            <td>{{ formatDays(item.paymentTerms) }}</td>
            <td>{{ getBillingDuration(item.billingTerms) }}</td>
            <td>{{ formatCurrency(item.currentLimit) }}</td>
            <td class="text-bold">{{ formatCurrency(item.newLimit) }}</td>
            <td class="text-bold">{{ formatCurrency(calculateCycleLimit(item.newLimit, item.paymentTerms, item.billingTerms)) }}</td>
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
                    v-if="item.debugFiles"
                    class="btn-debug-files"
                    @click="showDebugFiles(item)"
                >
                    Files
                </button>
                <span v-else class="text-muted small">-</span>
            </td>
            <td>
              <button
                v-if="['Done', 'Done (Int)'].includes(item.status)"
                class="btn-outline-primary"
                @click="openReport(item)"
                title="ดูรายงาน"
              >
                ดูรายงาน
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
const concurrency = ref(1);
const showConcurrencySettings = ref(false);
const selectedModel = ref('existing'); // 'new' or 'existing'
const limitExponent = ref(0.5);
const activeWorkers = ref(0);
const bridgeHost = ref(localStorage.getItem('bridgeHost') || 'localhost');
const bridgeStatus = ref('ไม่ทราบสถานะ');
const isExportDropdownOpen = ref(false); // State for dropdown

// Input Method State
const inputType = ref('branch'); // Default to 'branch'
const selectedBranch = ref('');
const isFetchingBranch = ref(false);

const branchData = [
  {
    region: 'กทม (Metro)',
    zones: [
      { code: 'TJ', name: 'ตรอกจันทน์' },
      { code: 'TR', name: 'พระราม 2' },
      { code: 'TS', name: 'สุขาภิบาล 3' },
      { code: 'TP', name: 'บางขุนเทียน' },
      { code: 'TL', name: 'ลำลูกกา' }
    ]
  },
  {
    region: 'กลาง (Central)',
    zones: [
      { code: 'BS', name: 'บางไทร' },
      { code: 'RB', name: 'ราชบุรี' },
      { code: 'AY', name: 'อยุธยา' },
      { code: 'PC', name: 'ประจวบ' },
      { code: 'SB', name: 'สระบุรี' }
    ]
  },
  {
    region: 'เหนือ (North)',
    zones: [
      { code: 'CM', name: 'เชียงใหม่' },
      { code: 'CR', name: 'เชียงราย' },
      { code: 'NS', name: 'นครสวรรค์' },
      { code: 'PL', name: 'พิษณุโลก' }
    ]
  },
  {
    region: 'ตะวันออก (East)',
    zones: [
      { code: 'RY', name: 'ระยอง' },
      { code: 'CB', name: 'ชลบุรี' }
    ]
  },
  {
    region: 'อีสาน (Northeast)',
    zones: [
      { code: 'KK', name: 'ขอนแก่น' },
      { code: 'SK', name: 'สกลนคร' },
      { code: 'UB', name: 'อุบลราชธานี' },
      { code: 'UD', name: 'อุดรธานี' },
      { code: 'NR', name: 'นครราชสีมา' }
    ]
  },
  {
    region: 'ใต้ (South)',
    zones: [
      { code: 'SR', name: 'สุราษฎร์ธานี' },
      { code: 'HY', name: 'หาดใหญ่' },
      { code: 'PK', name: 'ภูเก็ต' }
    ]
  }
];

// Click Outside Directive (Simple Implementation)
const vClickOutside = {
  mounted(el, binding) {
    el.clickOutsideEvent = (event) => {
      if (!(el === event.target || el.contains(event.target))) {
        binding.value(event);
      }
    };
    document.body.addEventListener('click', el.clickOutsideEvent);
  },
  unmounted(el) {
    document.body.removeEventListener('click', el.clickOutsideEvent);
  },
};

// Watch bridge host to save
watch(bridgeHost, (val) => {
  localStorage.setItem('bridgeHost', val);
});

// Computed
const processedCount = computed(() => {
  return queue.value.filter(i => ['Done', 'Done (Int)', 'Error', 'Skipped'].includes(i.status)).length;
});

// Helper: Get Billing Duration Value (Number)
const getBillingDurationValue = (code) => {
    if (!code) return 0;
    const match = String(code).match(/^B(\d+)/);
    return (match && match[1]) ? parseInt(match[1]) : 0;
};

// Helper: Get Billing Duration (Display)
const getBillingDuration = (code) => {
    if (!code) return '-';
    // Match B + digits
    const match = String(code).match(/^B(\d+)/);
    if (match && match[1]) {
        const val = parseInt(match[1]);
        if (val === 0) return 'ไม่มีวางบิล';
        return val + ' วัน';
    }
    return code; // Return raw text if not matching format
};

// Helper: Calculate Cycle Limit (Returns Number)
const calculateCycleLimit = (monthlyLimit, creditTerm, billingTerms) => {
    if (!monthlyLimit && monthlyLimit !== 0) return null;
    const limit = Number(monthlyLimit);
    if (isNaN(limit)) return null;

    let term = parseInt(creditTerm);
    if (isNaN(term)) term = 0;

    const billing = getBillingDurationValue(billingTerms);

    return limit * (term + billing) / 30;
};

// Helper: Format Number (No Unit)
const formatNumber = (num) => {
  if (num === null || num === undefined || num === '') return '-';
  return Number(num).toLocaleString('en-US');
};

// Helper: Format Currency with Unit (For UI)
const formatCurrency = (num) => {
    if (num === null || num === undefined || num === '') return '-';
    return Number(num).toLocaleString('en-US') + ' บาท';
};

// Helper: Format Days (For UI)
const formatDays = (val) => {
    if (!val) return '-';
    return val + ' วัน';
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

const fetchByBranch = async () => {
    if (!selectedBranch.value) return;

    isFetchingBranch.value = true;

    try {
        let branchCodesToFetch = [];
        let locationName = '';

        if (selectedBranch.value.startsWith('REGION:')) {
            const regionName = selectedBranch.value.replace('REGION:', '');
            const regionObj = branchData.find(r => r.region === regionName);
            if (regionObj) {
                branchCodesToFetch = regionObj.zones.map(z => z.code);
                locationName = `ภูมิภาค ${regionName}`;
            }
        } else {
            branchCodesToFetch = [selectedBranch.value];
            locationName = `สาขา ${selectedBranch.value}`;
        }

        if (branchCodesToFetch.length === 0) return;

        let allData = [];
        let errorMessages = [];

        // Fetch data for all required branches
        for (const code of branchCodesToFetch) {
            try {
                const response = await axios.get(`/api/customers/by-branch`, {
                    params: { branchCode: code }
                });
                if (response.data && response.data.length > 0) {
                    allData = allData.concat(response.data);
                }
            } catch (err) {
                console.error(`Failed to fetch branch ${code}:`, err);
                errorMessages.push(`สาขา ${code}: ${err.response?.data?.error || err.message}`);
            }
        }

        if (allData.length === 0) {
            const msg = errorMessages.length > 0
                ? `ไม่พบข้อมูล และพบข้อผิดพลาด:\n${errorMessages.join('\n')}`
                : `ไม่พบลูกค้าที่มีวงเงินใน ${locationName}`;
            Swal.fire('ไม่พบข้อมูล', msg, 'warning');
            queue.value = [];
        } else {
             // Map to Queue Format
            queue.value = allData.map(item => {
                return {
                    customerId: item.No_,
                    name: item.Name,
                    taxId: item.VAT_Registration_No_ || '',
                    totalPurchase3Months: 0, // Will be fetched during process
                    latePaymentAverage: null,
                    wadlScore: null,
                    currentLimit: item.Fixed_Credit_Limit || 0,
                    paymentTerms: item.Payment_Terms_Code || '',
                    billingTerms: item.Billing_Terms_Code || '',
                    customerDate: item.Customer_Date || null,
                    newLimit: null,
                    score: null,
                    grade: '',
                    status: 'Pending',
                    log: '',
                    files: {},
                    debugFiles: null,
                    analysisResult: null,
                    modelType: null,
                    limitExponent: null
                };
            });

            let successMsg = `ดึงข้อมูลลูกค้า ${queue.value.length} รายการ จาก ${locationName}`;
            if (errorMessages.length > 0) {
                successMsg += `\n(พบข้อผิดพลาดบางสาขา: ${errorMessages.length} สาขา)`;
            }

            Swal.fire('สำเร็จ', successMsg, errorMessages.length > 0 ? 'warning' : 'success');
        }
    } catch (error) {
        console.error('Fetch by branch error:', error);
        Swal.fire('ข้อผิดพลาด', 'เกิดข้อผิดพลาดในการดึงข้อมูล: ' + (error.response?.data?.error || error.message), 'error');
    } finally {
        isFetchingBranch.value = false;
    }
};

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
        latePaymentAverage: null,
        wadlScore: null,
        currentLimit: 0,
        paymentTerms: '',
        billingTerms: '',
        newLimit: null,
        score: null,
        grade: '',
        status: 'Pending',
        log: '',
        files: {}, // to store downloaded blobs
        debugFiles: null, // to store file metadata for debug
        analysisResult: null,
        modelType: null, // Store model type for report
        limitExponent: null // Store limit exponent for report
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
    bridgeStatus.value = 'เชื่อมต่อสำเร็จ';
    return true;
  } catch (e) {
    bridgeStatus.value = 'ไม่สามารถเชื่อมต่อได้';
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
           let registeredCapital = 0;
           let registrationDate = null;

           if (data.data) {
             if (data.data.debug) {
                 console.log('[Batch Bridge Debug]', data.data.debug);
             }

             resultFiles = {
                profile: data.data.profile,
                balanceSheet: data.data.balanceSheet,
                incomeStatement: data.data.incomeStatement,
                financialRatios: data.data.financialRatios
             };
             yearsInBusiness = data.data.yearsInBusiness || 0;
             registeredCapital = data.data.registeredCapital || 0;
             registrationDate = data.data.registrationDate || null;
           }
           resolve({ files: resultFiles, yearsInBusiness, registeredCapital, registrationDate });
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

// --- Debug Logic ---

const showDebugFiles = async (item) => {
    if (!item.debugFiles) return;

    const files = [
        { key: 'profile', label: 'Company Profile (PDF)', icon: '' },
        { key: 'balanceSheet', label: 'งบดุล (XLSX)', icon: '' },
        { key: 'incomeStatement', label: 'งบกำไรขาดทุน (XLSX)', icon: '' },
        { key: 'financialRatios', label: 'อัตราส่วนการเงิน (XLSX)', icon: '' }
    ];

    let htmlContent = '<div style="text-align: left; padding: 10px;">';
    htmlContent += '<p style="margin-bottom: 15px;">คลิกที่ปุ่มเพื่อดาวน์โหลดไฟล์ต้นฉบับ:</p>';

    files.forEach(f => {
        const fileData = item.debugFiles[f.key];
        if (fileData) {
            const size = fileData.size || 'Unknown';
            const style = 'color: #333;';
            const icon = f.icon;

            // Generate a unique ID for the button
            const btnId = `btn-dl-${f.key}`;

            htmlContent += `
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; padding: 8px; border: 1px solid #eee; border-radius: 4px; background: #fff;">
                    <span style="${style}">
                        ${icon} ${f.label} <br>
                        <small style="color: #666;">Size: ${size}</small>
                    </span>
                    <button id="${btnId}" class="swal2-confirm swal2-styled" style="padding: 5px 10px; font-size: 0.8em; margin: 0;">Download</button>
                </div>
            `;
        } else {
            htmlContent += `
                <div style="margin-bottom: 10px; padding: 8px; color: #999; border: 1px dashed #ccc;">
                    [ไม่มีไฟล์] ${f.label}
                </div>
            `;
        }
    });
    htmlContent += '</div>';

    const result = await Swal.fire({
        title: 'Debug Files',
        html: htmlContent,
        showCloseButton: true,
        showConfirmButton: false,
        didOpen: () => {
             // Attach event listeners to buttons
             files.forEach(f => {
                 const fileData = item.debugFiles[f.key];
                 if (fileData) {
                     const btn = document.getElementById(`btn-dl-${f.key}`);
                     if (btn) {
                         btn.onclick = () => {
                             // Case A: Local File (Server Download)
                             if (fileData.type === 'local') {
                                 // Construct URL: /api/financials/download-local/:customerId/:fileKey
                                 const url = `/api/financials/download-local/${item.customerId}/${f.key}`;
                                 window.open(url, '_blank');
                             }
                             // Case B: Bridge File (Base64 Blob)
                             else {
                                 const blob = base64ToBlob(fileData.content, fileData.mime);
                                 const url = window.URL.createObjectURL(blob);
                                 const a = document.createElement('a');
                                 a.href = url;
                                 a.download = fileData.filename || `debug_${f.key}.file`;
                                 document.body.appendChild(a);
                                 a.click();
                                 window.URL.revokeObjectURL(url);
                                 document.body.removeChild(a);
                             }
                         };
                     }
                 }
             });
        }
    });
};

// --- Batch Logic ---

const checkReadiness = async () => {
    if (queue.value.length === 0) return;

    Swal.fire({
        title: 'กำลังตรวจสอบ...',
        text: 'ระบบกำลังตรวจสอบไฟล์ DBD ในเซิร์ฟเวอร์',
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading()
    });

    try {
        const customerIds = queue.value.map(item => item.customerId);

        // Split into chunks if needed (let's say 100 per request, but for branches it's usually < 200, so one request is fine)
        const res = await axios.post('/api/financials/check-local-batch', { customer_ids: customerIds });

        if (res.data.success) {
            const results = res.data.results;
            const readyItems = results.filter(r => r.isReady);
            const notReadyItems = results.filter(r => !r.isReady);

            // Update queue logs/status to reflect readiness
            queue.value.forEach(item => {
                const checkRes = results.find(r => r.customerId === item.customerId);
                if (checkRes) {
                    item.isReady = checkRes.isReady; // Store for styling if needed
                    if (!checkRes.isReady && item.status === 'Pending') {
                        // Just an informative log, we don't change status to Error yet
                        item.log = `รอโหลดไฟล์ DBD (${checkRes.reason})`;
                    } else if (checkRes.isReady && item.status === 'Pending') {
                        item.log = `มีไฟล์พร้อมดำเนินการ`;
                    }
                }
            });

            // Show Summary
            const htmlContent = `
                <div style="text-align: left; padding: 10px;">
                    <p><strong>ทั้งหมด:</strong> ${results.length} รายการ</p>
                    <p style="color: #28a745;"><strong>พร้อมดำเนินการ (มีไฟล์ครบ):</strong> ${readyItems.length} รายการ</p>
                    <p style="color: #dc3545;"><strong>ต้องโหลดไฟล์ใหม่ (Bridge):</strong> ${notReadyItems.length} รายการ</p>
                    ${notReadyItems.length > 0 ? `<p style="font-size: 0.9em; margin-top: 10px; color: #666;">รายการที่ไม่พร้อม จะถูกดาวน์โหลดจาก DBD อัตโนมัติเมื่อกดเริ่มประมวลผล</p>` : ''}
                </div>
            `;

            Swal.fire({
                title: 'ผลการตรวจสอบไฟล์',
                html: htmlContent,
                icon: notReadyItems.length === 0 ? 'success' : 'info',
                showCancelButton: notReadyItems.length > 0,
                confirmButtonText: 'ตกลง',
                cancelButtonText: 'ส่งออกรายชื่อที่ไม่พร้อม (Excel)',
                cancelButtonColor: '#28a745'
            }).then((result) => {
                if (result.dismiss === Swal.DismissReason.cancel && notReadyItems.length > 0) {
                    // Export logic
                    const exportData = notReadyItems.map(nr => {
                        const originalItem = queue.value.find(q => q.customerId === nr.customerId);
                        return {
                            'รหัสลูกค้า': nr.customerId,
                            'ชื่อลูกค้า': originalItem ? originalItem.name : '-',
                            'สาเหตุ': nr.reason
                        };
                    });

                    const ws = XLSX.utils.json_to_sheet(exportData);
                    const wb = XLSX.utils.book_new();
                    XLSX.utils.book_append_sheet(wb, ws, "รายชื่อที่ต้องโหลดไฟล์ใหม่");
                    XLSX.writeFile(wb, "Not_Ready_DBD_List.xlsx");
                }
            });

        } else {
            throw new Error(res.data.message || 'Unknown API Error');
        }

    } catch (error) {
        console.error('Check Readiness Error:', error);
        Swal.fire('ข้อผิดพลาด', 'ไม่สามารถตรวจสอบไฟล์ได้: ' + error.message, 'error');
    }
};

const stopBatch = () => {
  shouldStop.value = true;
  isProcessing.value = false;
};

// Worker function to process items one by one from the shared queue
const processNextItem = async () => {
  while (!shouldStop.value) {
      // Find next pending item
      // We must be careful about race conditions if multiple workers pick the same item.
      // JS is single-threaded, so array access is safe, but async gaps are not.
      // We will search for the first 'Pending' item and mark it immediately.

      const index = queue.value.findIndex(i => i.status === 'Pending');
      if (index === -1) {
          // No more items
          return;
      }

      const item = queue.value[index];
      item.status = 'Processing';
      item.log = 'กำลังเริ่มต้น...';

      // Store current settings into the item for consistency in report
      item.modelType = selectedModel.value;
      item.limitExponent = limitExponent.value;

      activeWorkers.value++;

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
        item.billingTerms = customer.customer.billing_terms_code;

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

        // 2. Check for Local Files First
        let useLocalFiles = false;
        let downloadResult = null;
        let localCheck = null;

        if (!skipDBD) {
            try {
                item.log = 'กำลังตรวจสอบไฟล์ในระบบ...';
                const checkRes = await axios.get(`/api/financials/check-local/${item.customerId}`);
                localCheck = checkRes.data;

                if (localCheck && localCheck.exists) {
                    useLocalFiles = true;
                    item.log = 'ใช้ข้อมูลที่มีอยู่ (Local)';

                    // Create metadata for debugFiles (No Base64 content)
                    // We map the same keys as Bridge: profile, balanceSheet, incomeStatement, financialRatios
                    item.debugFiles = {
                        profile: { type: 'local', filename: 'DBD_Profile.pdf', mime: 'application/pdf' },
                        balanceSheet: { type: 'local', filename: 'DBD_BalanceSheet.xlsx', mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' },
                        incomeStatement: { type: 'local', filename: 'DBD_IncomeStatement.xlsx', mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' },
                        financialRatios: { type: 'local', filename: 'DBD_FinancialRatios.xlsx', mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }
                    };
                }
            } catch (err) {
                console.warn('Local check failed:', err);
                // Proceed to Bridge on error
            }
        }

        // 3. Download from Bridge (Retry Logic) - Only if not skipped AND not local
        if (!skipDBD && !useLocalFiles) {
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

        // 4. Prepare for Analysis
        if (!useLocalFiles) {
             item.log = 'กำลังวิเคราะห์...';
        }

        const formData = new FormData();

        let yearsInBusiness = 0;
        let registeredCapital = 0;

        if (useLocalFiles) {
            // Logic for Local Files
            formData.append('use_local', 'true');
            // We still need to pass yearsInBusiness if possible, or let backend fetch it?
            // Current backend logic for 'use_local' fetches files but relies on passed params for some data.
            // If local files are used, we might miss 'yearsInBusiness' from the Bridge metadata.
            // However, customer data from DB has 'customer_since'.
             if (customer.customer.customer_since) {
                const start = new Date(customer.customer.customer_since);
                const now = new Date();
                const diff = now.getFullYear() - start.getFullYear();
                yearsInBusiness = diff > 0 ? diff : 0;
            }
            // Registered Capital might be missing without Bridge metadata.
            // Ideally backend could parse it from Profile, but for now we might default to 0 or DB value.

        } else {
            // Logic for Bridge Download or Skip
            // STRICT VALIDATION: Ensure Companies have all 4 DBD files
            if (!skipDBD) {
                if (!downloadResult) {
                    throw new Error('ดาวน์โหลด DBD ไม่สำเร็จ (กรุณาลองใหม่)');
                }
                const required = ['profile', 'balanceSheet', 'incomeStatement', 'financialRatios'];
                const missing = required.filter(k => !downloadResult.files[k]);
                if (missing.length > 0) {
                    // Translate keys to readable names
                    const names = {
                        profile: 'Company Profile',
                        balanceSheet: 'งบดุล',
                        incomeStatement: 'งบกำไรขาดทุน',
                        financialRatios: 'อัตราส่วนทางการเงิน'
                    };
                    const missingNames = missing.map(k => names[k] || k).join(', ');
                    throw new Error(`DBD ไม่ครบ: ขาด ${missingNames}`);
                }
            }

            if (downloadResult) {
                // Save debug info
                item.debugFiles = downloadResult.files;

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
                if (downloadResult.files.profile) {
                    const f = downloadResult.files.profile;
                    formData.append('company_profile', base64ToBlob(f.content, f.mime), f.filename);
                }
                yearsInBusiness = downloadResult.yearsInBusiness || 0;
                registeredCapital = downloadResult.registeredCapital || 0;
            } else {
                // Fallback: Use Customer Date (Only for skipped items)
                item.log = 'ใช้ข้อมูลภายใน (ข้าม DBD)...';
                if (customer.customer.customer_since) {
                    const start = new Date(customer.customer.customer_since);
                    const now = new Date();
                    const diff = now.getFullYear() - start.getFullYear();
                    yearsInBusiness = diff > 0 ? diff : 0;
                }
            }
        }

        // Store yearsInBusiness for report
        item.yearsInBusiness = yearsInBusiness;
        item.registeredCapital = registeredCapital;

        // Append Meta Data
        formData.append('customer_no', item.customerId);
        formData.append('customer_name', item.name);
        formData.append('registered_capital', String(registeredCapital));
        formData.append('customer_duration', String(customerDuration)); // Use calculated duration
        formData.append('years_in_business', String(yearsInBusiness));
        formData.append('request_credit_term', item.paymentTerms || '30');
        formData.append('request_amount', String(item.currentLimit || 0)); // Fallback to current limit

        // Append Model Parameters
        formData.append('model_type', selectedModel.value);
        if (selectedModel.value === 'existing') {
            formData.append('limit_exponent', String(limitExponent.value));
        }

        // 4. Call Analysis API
        const analyzeRes = await axios.post('/api/financials/analyze', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });

        if (analyzeRes.data.success) {
            item.analysisResult = analyzeRes.data;
            item.newLimit = analyzeRes.data.scoringResult?.recommendedLimit || 0;
            item.score = analyzeRes.data.scoringResult?.totalScore || 0;
            item.grade = analyzeRes.data.scoringResult?.grade || '-';

            // Override inputs with Final Inputs from Backend (e.g. from local PDF extraction)
            if (analyzeRes.data.finalInputs) {
                if (analyzeRes.data.finalInputs.registeredCapital > 0) {
                    item.registeredCapital = analyzeRes.data.finalInputs.registeredCapital;
                }
                if (analyzeRes.data.finalInputs.yearsInBusiness > 0) {
                    item.yearsInBusiness = analyzeRes.data.finalInputs.yearsInBusiness;
                }
            }

            // Extract Late Payment Average
            if (analyzeRes.data.financialSummary?.latePaymentData?.average_late_days !== undefined) {
                 item.latePaymentAverage = analyzeRes.data.financialSummary.latePaymentData.average_late_days;
            }

            // Extract WADL Score
            if (analyzeRes.data.financialSummary?.wadlData?.score !== undefined) {
                 item.wadlScore = analyzeRes.data.financialSummary.wadlData.score;
            }

            item.status = skipDBD ? 'Done (Int)' : 'Done';

            // Check for warnings in suggestions
            const suggestions = item.analysisResult.creditScore?.suggestions || [];
            const warnings = suggestions.filter(s => s.includes('ไม่สามารถ') || s.includes('Error'));
            if (warnings.length > 0) {
                item.log = `เสร็จสิ้น (แจ้งเตือน: ${warnings[0]})`;
                item.warning = warnings[0]; // Store for export
            } else {
                item.log = 'เสร็จสิ้น';
            }

        } else {
            throw new Error('การวิเคราะห์ล้มเหลว');
        }

      } catch (err) {
        item.status = 'Error';
        item.log = err.message;
        console.error(err);
      } finally {
        activeWorkers.value--;
      }
  }
};

const startBatch = async () => {
  if (isProcessing.value) return;

  // RETRY LOGIC: If starting again, reset errors to pending
  const errorItems = queue.value.filter(i => i.status === 'Error');
  if (errorItems.length > 0) {
      errorItems.forEach(i => {
          i.status = 'Pending';
          i.log = 'รอคิว (Retry)';
      });
  }

  // Double check if there is anything to process
  const pendingCount = queue.value.filter(i => i.status === 'Pending').length;
  if (pendingCount === 0) {
      Swal.fire('เสร็จสมบูรณ์', 'ไม่มีรายการที่ต้องประมวลผล', 'info');
      return;
  }

  // Confirm Action
  const sourceText = inputType.value === 'branch' ? `สาขา ${selectedBranch.value}` : 'ไฟล์ Excel';
  const modelText = selectedModel.value === 'new' ? 'ลูกค้าใหม่' : 'ลูกค้าปัจจุบัน';

  const confirmResult = await Swal.fire({
      title: 'ยืนยันการประมวลผล',
      html: `
          <div style="font-size: 1.1em; margin-bottom: 15px;">
              ยืนยันการประมวลผล <b>${pendingCount}</b> รายการ จาก <b>${sourceText}</b> หรือไม่?
          </div>
          <div style="text-align: left; margin-top: 10px; padding: 15px; background: #f8f9fa; border-radius: 8px;">
              <p style="margin-bottom: 5px;"><strong>โมเดล:</strong> ${modelText}</p>
              <p style="margin-bottom: 0;"><strong>เลขยกกำลัง:</strong> ${limitExponent.value}</p>
          </div>
      `,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'ยืนยัน',
      cancelButtonText: 'ยกเลิก',
      confirmButtonColor: '#0056FF',
      cancelButtonColor: '#d33'
  });

  if (!confirmResult.isConfirmed) return;

  // Check Bridge first
  const isBridgeReady = await checkBridgeConnection();
  if (!isBridgeReady) {
    Swal.fire('ข้อผิดพลาด', 'ไม่สามารถเชื่อมต่อกับ Local Bridge กรุณาตรวจสอบการตั้งค่า', 'error');
    return;
  }

  isProcessing.value = true;
  shouldStop.value = false;
  activeWorkers.value = 0;

  // Validate concurrency
  let maxWorkers = parseInt(concurrency.value);
  if (isNaN(maxWorkers) || maxWorkers < 1) maxWorkers = 1;
  if (maxWorkers > 8) maxWorkers = 8;
  concurrency.value = maxWorkers; // Update UI to reflect limit

  // Start Worker Pool
  const workers = [];
  for (let i = 0; i < maxWorkers; i++) {
      workers.push(processNextItem());
  }

  await Promise.all(workers);

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
            registeredCapital: item.registeredCapital || 0,
            yearsInBusiness: item.yearsInBusiness || 0,
            customerDuration: item.customerDuration || 0,
            requestAmount: item.currentLimit || 0,
            creditTerm: item.paymentTerms || 30,
            billingCondition: '-',
            model_type: item.modelType || selectedModel.value,
            limit_exponent: item.limitExponent || limitExponent.value
        }
    };

    // Save to localStorage for the report page to consume
    localStorage.setItem('credit_report_data', JSON.stringify(reportData));

    // Open in new tab
    const routeData = window.open('/report/financial-analysis', '_blank');
};

const toggleExportDropdown = () => {
    isExportDropdownOpen.value = !isExportDropdownOpen.value;
};

const closeExportDropdown = () => {
    isExportDropdownOpen.value = false;
};

const exportSummarizedReport = () => {
   closeExportDropdown();
   const data = queue.value.map(item => ({
      'รหัสลูกค้า': item.customerId,
      'ชื่อลูกค้า': item.name,
      'เลขผู้เสียภาษี': item.taxId,
      'ยอดซื้อ 3 เดือน': item.totalPurchase3Months,
      'เฉลี่ยการจ่ายเงินล่าช้า': item.wadlScore !== null ? item.wadlScore : 0,
      'เครดิตเทอม': item.paymentTerms || 0,
      'ระยะเวลาการวางบิล': getBillingDurationValue(item.billingTerms),
      'วงเงินปัจจุบัน': item.currentLimit,
      'วงเงินแนะนำ ต่อเดือน': item.newLimit,
      'วงเงินแนะนำ ต่อรอบบิล': calculateCycleLimit(item.newLimit, item.paymentTerms, item.billingTerms) || 0,
      'คะแนน': item.score,
      'เกรด': item.grade,
      'สถานะ': translateStatus(item.status),
      'บันทึกข้อความ': item.warning ? `${item.log} [${item.warning}]` : item.log
   }));

   const ws = XLSX.utils.json_to_sheet(data);
   const wb = XLSX.utils.book_new();
   XLSX.utils.book_append_sheet(wb, ws, "รายงาน Batch");
   XLSX.writeFile(wb, "Batch_Credit_Automation_Report.xlsx");
};

// Helper to safely extract analysis items (value or score)
const extractFinancialData = (item, key, prop = 'displayValue') => {
    if (!item.analysisResult || !item.analysisResult.scoringResult || !item.analysisResult.scoringResult.breakdown) {
        return prop === 'score' ? 0 : '-';
    }
    // Search in C1, C2, C3 breakdown items
    const groups = ['c1', 'c2', 'c3'];
    for (const g of groups) {
        const breakdown = item.analysisResult.scoringResult.breakdown[g];
        if (breakdown && breakdown.items) {
            const found = breakdown.items.find(i => i.key === key);
            if (found) {
                if (prop === 'score') return found.score || 0;
                if (prop === 'value') return found.value !== undefined ? found.value : found.displayValue;
                return found.displayValue || found.value;
            }
        }
    }
    return prop === 'score' ? 0 : '-';
};

const exportFullDetailReport = () => {
   closeExportDropdown();

   const data = queue.value.map(item => {
      // 1. Branch Extraction (Last 2 chars)
      const branchCode = item.customerId && item.customerId.length > 2
          ? item.customerId.slice(-2)
          : '-';

      const breakdown = item.analysisResult?.scoringResult?.breakdown || {};
      const c1Total = breakdown.c1?.total || 0;
      const c2Total = breakdown.c2?.total || 0;
      const c3Total = breakdown.c3?.total || 0;

      // Extract Financial History (Last 6 Months)
      let history = [];
      if (item.analysisResult && item.analysisResult.financialSummary && item.analysisResult.financialSummary.monthlyHistory) {
           // History is [Current, M-1, M-2, M-3...] (Newest First)
           // We exclude Current (Index 0) and take next 6 (Indices 1-6)
           history = item.analysisResult.financialSummary.monthlyHistory.slice(1, 7);
      }

      // Calculate Totals based on user formula
      // "Sum 6 month total"
      const total6 = history.reduce((sum, m) => sum + (Number(m.amount) || 0), 0);

      // "use 6 month/2 to find the 3 month" -> CORRECTED: Use actual 3-month sum if available for distinct values
      // Only resort to division if history is insufficient, but slicing handles it safely (empty array = 0)
      // We take the first 3 items of our 6-item history (which are M-1, M-2, M-3)
      const history3 = history.slice(0, 3);
      const total3Actual = history3.reduce((sum, m) => sum + (Number(m.amount) || 0), 0);

      // Use the actual sum for the column display, but keep the user requested "formula logic" for other derivations if needed?
      // User said: "display both columns for every customer, calculate both values if the raw sales data is available"
      // User also said: "use 6 month/2 to find the 3 month" as a calculation definition.
      // However, the flaw complaint is "display same value".
      // So I will use actual data for 3-month column to fix the "same value" issue.
      const total3 = total3Actual;

      // "use 3 month/2 to find the 1.5 months" -> This implies using the *result* of 3-month calc
      const avg1_5 = total3 / 2;

      // "use 3 month / 3 to find the 1 months"
      const avg1 = total3 / 3;

      const currentLimit = Number(item.currentLimit) || 0;

      // 2. Base Data
      const row = {
          'สาขา': branchCode,
          'ชื่อบริษัท/ร้านค้า': item.name || '-',
          'ทุนจดทะเบียน': item.registeredCapital,
          'ระยะเวลาของธุรกิจ': item.yearsInBusiness || 0,
          'คะแนนระยะเวลาธุรกิจ': extractFinancialData(item, 'years_in_business', 'score'),

          'สัดส่วนเครดิตที่ขอต่อทุนจดทะเบียน': extractFinancialData(item, 'leverage', 'value'),
          'คะแนน สัดส่วนเครดิตที่ขอต่อทุนจดทะเบียน': extractFinancialData(item, 'leverage', 'score'),
          'กรรมสิทธิ์ทรัพย์สิน': extractFinancialData(item, 'asset_ownership', 'value'),
          'คะแนน กรรมสิทธิ์ทรัพย์สิน': extractFinancialData(item, 'asset_ownership', 'score'),
          'รวมหมวด C1 Performance ของธุรกิจ': c1Total,

          'อัตราการส่วนหนี้สินรวม ต่อส่วนของผู้ถือหุ้น': extractFinancialData(item, 'de_ratio', 'value'),
          'คะแนน อัตราการส่วนหนี้สินรวม ต่อส่วนของผู้ถือหุุ้น': extractFinancialData(item, 'de_ratio', 'score'),
          'อัตราการหมุนเวียนของสินค้าคงเหลือ': extractFinancialData(item, 'inventory_turnover', 'value'),
          'คะแนน อัตราการหมุนเวียนของสินค้าคงเหลือ': extractFinancialData(item, 'inventory_turnover', 'score'),
          'ความสามารถในการชำระหนี้ (DSCR)': extractFinancialData(item, 'dscr', 'value'),
          'คะแนน อัตราส่วนความสามารถในการชำระหนี้ (DSCR)': extractFinancialData(item, 'dscr', 'score'),
          'รวมหมวด C2 CashFlow ของธุรกิจ': c2Total,

          'รวมคะแนน C1 + C2': c1Total + c2Total,

          'สัดส่วนรายได้ต่อทุนจดทะเบียน': extractFinancialData(item, 'revenue_capital_ratio', 'value'),
          'คะแนน สัดส่วนรายได้ ต่อทุนจดทะเบียน': extractFinancialData(item, 'revenue_capital_ratio', 'score'),

          'สัดส่วนยอดซื้อเฉลี่ย ย้อนหลัง 3 เดือนต่อเครดิตที่ขอ': (currentLimit > 0) ? ((total3 / 3) / currentLimit) : 0,
          'สัดส่วนยอดซื้อเฉลี่ย ย้อนหลัง 6 เดือนต่อเครดิตที่ขอ': (currentLimit > 0) ? ((total6 / 6) / currentLimit) : 0,
          'คะแนน สัดส่วนยอดซื้อเฉลี่ย ย้อนหลัง 6 เดือน ต่อเครดิตที่ขอ': extractFinancialData(item, 'capacity_check', 'score'),

          'สัดส่วนยอดซื้อต่อระยะเวลาเครดิตที่ขอ': extractFinancialData(item, 'turnover_speed', 'value'),
          // Manually calculate 6-month Turnover Speed if currentLimit > 0, otherwise use Model Value
          // Formula: (Avg 6M / Limit) * (Term / 30)? No, simply standardized to monthly capacity?
          // Since Turnover Speed in backend = (Avg1.5 / Limit) for Term 30, let's approximate with Capacity Ratio.
          // Or just output the model value if available.
          // User complaint is "same value".
          // If model is New (3m), then 'turnover_speed' is based on 3m. We want 6m here.
          // If model is Existing (6m), then 'turnover_speed' is based on 6m.
          // We will fallback to the Capacity Ratio (6m) which is a proxy for Turnover Speed at standard terms.
          'สัดส่วนยอดซื้อต่อระยะเวลาเครดิตที่ขอ (เฉลี่ย 6 เดือน)': (currentLimit > 0) ? ((total6 / 6) / currentLimit) : extractFinancialData(item, 'turnover_speed', 'value'),
          'คะแนน ยอดซื้อต่อระยะเวลาเครดิตที่ขอ': extractFinancialData(item, 'turnover_speed', 'score'),

          'SLOPE': extractFinancialData(item, 'purchase_trend', 'value'),
          'คะแนน แนวโน้มการซื้อ': extractFinancialData(item, 'purchase_trend', 'score'),
          'ระยะเวลาของการเป็นลูกค้า': extractFinancialData(item, 'customer_duration', 'value'),
          'คะแนน ระยะเวลาการเป็นลูกค้า': extractFinancialData(item, 'customer_duration', 'score'),

          'เฉลี่ยการจ่ายเงินล่าช้า (WADL)': item.wadlScore !== null ? item.wadlScore : 0,
          'คะแนนการจ่ายเงินล่าช้า': extractFinancialData(item, 'wadl', 'score'),

          'รวมหมวด C3 พฤติกรรมการซื้อ': c3Total,

          'คะแนนรวม': item.score || 0,
          'วงเงินแนะนำ ต่อเดือน': item.newLimit,
          'วงเงินแนะนำ ต่อรอบบิล': calculateCycleLimit(item.newLimit, item.paymentTerms, item.billingTerms) || 0,
          'เครดิตปัจจุบัน': item.currentLimit,
          'ระยะเวลาเครดิต': item.paymentTerms || 0,
          'ระยะเวลาเครดิตรวมวางบิล': (Number(item.paymentTerms) || 0) + getBillingDurationValue(item.billingTerms),
      };

      // Add Dynamic Months (Reverse Order: Oldest -> Newest)
      const exportMonths = [...history].reverse();

      // Ensure 6 columns are added (pad if necessary, though logic suggests 6 should exist if data is fine)
      for (let i = 0; i < 6; i++) {
          const m = exportMonths[i];
          const label = m ? m.label : `Month ${i+1}`;
          const val = m ? (Number(m.amount) || 0) : 0;
          row[label] = val;
      }

      // Add Calculated Totals
      row['ยอดซื้อรวม 6 เดือน'] = total6;
      row['ยอดซื้อรวม 3 เดือน'] = total3;
      row['ยอดซื้อเฉลี่ย 1.5 เดือน'] = avg1_5;
      row['ยอดซื้อเฉลี่ย 1 เดือน'] = avg1;

      return row;
   });

   const ws = XLSX.utils.json_to_sheet(data);
   const wb = XLSX.utils.book_new();
   XLSX.utils.book_append_sheet(wb, ws, "รายงาน Full Detail");
   XLSX.writeFile(wb, "Batch_Credit_Automation_Full_Report.xlsx");
};

// Deprecated: old export button called this, now handled by dropdown
const exportReport = () => {
    // Left for safety if button reused, defaults to Summary
    exportSummarizedReport();
};

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

.input-section {
    flex: 2;
    display: flex;
    flex-direction: column;
    gap: 15px;
}

.input-type-toggle {
    display: flex;
    gap: 10px;
    border-bottom: 1px solid #ddd;
    padding-bottom: 10px;
}

.toggle-btn {
    padding: 8px 15px;
    border: 1px solid #ddd;
    background: #fff;
    border-radius: 20px;
    cursor: pointer;
    font-weight: 500;
    color: #666;
    transition: all 0.2s;
}

.toggle-btn.active {
    background: #0056FF;
    color: #fff;
    border-color: #0056FF;
}

.branch-area {
    padding: 20px;
    background: #fff;
    border: 1px solid #eee;
    border-radius: 8px;
    display: flex;
    flex-direction: column;
    gap: 15px;
}

.branch-select {
    width: 100%;
    padding: 10px;
    font-size: 1em;
}

.btn-fetch {
    align-self: flex-start;
}

.upload-area {
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

.btn-primary {
  background: #0056FF;
  color: white;
  border: 1px solid #0056FF;
}

.btn-primary:hover:not(:disabled) {
  background: #0044cc;
}

.btn-secondary {
  background: white;
  color: #333;
  border: 1px solid #ccc;
}

.btn-secondary:hover:not(:disabled) {
  background: #f8f9fa;
  border-color: #bbb;
}

.btn-outline-danger {
  background: white;
  color: #dc3545;
  border: 1px solid #dc3545;
}

.btn-outline-danger:hover:not(:disabled) {
  background: #dc3545;
  color: white;
}

.btn-outline-primary {
  background: white;
  color: #0056FF;
  border: 1px solid #0056FF;
  padding: 5px 10px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.85em;
  display: flex;
  align-items: center;
  gap: 5px;
}

.btn-outline-primary:hover:not(:disabled) {
  background: #eef4ff;
}

.btn-debug-files {
    background: #6c757d;
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
.btn-debug-files:hover {
    background: #5a6268;
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
.processing-badge { font-weight: bold; margin-left: 10px; font-size: 0.9em; display: flex; align-items: center; gap: 5px; }
.mt-2 { margin-top: 10px; }
.mt-4 { margin-top: 20px; }
.d-flex { display: flex; align-items: center; }
.justify-content-between { justify-content: space-between; }

/* Clean Settings Card Style (Inspired by StoreStatementTab) */
.section-header {
    font-size: 1em;
    font-weight: 600;
    color: #555;
    margin-bottom: 10px;
    display: flex;
    align-items: center;
    gap: 8px;
    user-select: none;
}

.toggle-icon {
    font-size: 0.8em;
    color: #888;
}

.clean-settings-card {
    background-color: #ffffff;
    padding: 20px;
    border-radius: 8px;
    border: 1px solid #e0e0e0;
    box-shadow: 0 2px 4px rgba(0,0,0,0.02);
}

.setting-row {
    display: flex;
    align-items: center;
    justify-content: flex-start; /* Ensure left alignment */
    margin-bottom: 15px;
}

.setting-row:last-child {
    margin-bottom: 0;
}

.setting-label {
    width: auto;
    margin-right: 15px; /* Fixed spacing between label and input */
    font-weight: 500;
    color: #333;
    margin-bottom: 0;
    text-align: left; /* Explicitly align text left */
    white-space: nowrap; /* Prevent text wrapping */
}

.setting-label-block {
    display: block;
    width: 100%;
    font-weight: 500;
    color: #333;
    margin-bottom: 5px;
    text-align: left;
}

.setting-input {
    /* Removed flex: 1 to prevent stretching to the right */
    width: 100%;
    max-width: 300px;
}

.divider {
    height: 1px;
    background-color: #f0f0f0;
    margin: 15px 0;
}
.status-badge.done { background: #d4edda; color: #155724; }
.status-badge.error { background: #f8d7da; color: #721c24; }
.status-badge.skipped { background: #e2e3e5; color: #383d41; }

.cursor-pointer { cursor: pointer; }
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

/* Dropdown Styles */
.dropdown {
  position: relative;
  display: inline-block;
}
.dropdown-toggle::after {
  display: inline-block;
  margin-left: 0.255em;
  vertical-align: 0.255em;
  content: "";
  border-top: 0.3em solid;
  border-right: 0.3em solid transparent;
  border-bottom: 0;
  border-left: 0.3em solid transparent;
}
.dropdown-menu {
  position: absolute;
  top: 100%;
  left: 0;
  z-index: 1000;
  display: block;
  float: left;
  min-width: 10rem;
  padding: 0.5rem 0;
  margin: 0.125rem 0 0;
  font-size: 1rem;
  color: #212529;
  text-align: left;
  list-style: none;
  background-color: #fff;
  background-clip: padding-box;
  border: 1px solid rgba(0,0,0,.15);
  border-radius: 0.25rem;
  box-shadow: 0 0.5rem 1rem rgba(0, 0, 0, 0.15);
}
.dropdown-item {
  display: block;
  width: 100%;
  padding: 0.25rem 1.5rem;
  clear: both;
  font-weight: 400;
  color: #212529;
  text-align: inherit;
  white-space: nowrap;
  background-color: transparent;
  border: 0;
  cursor: pointer;
}
.dropdown-item:hover, .dropdown-item:focus {
  color: #16181b;
  text-decoration: none;
  background-color: #f8f9fa;
}
</style>