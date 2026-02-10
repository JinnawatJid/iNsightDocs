<template>
  <div class="create-credit-request">
    <Navbar />

    <!-- Close Preview Banner -->
    <div v-if="store.viewingHistory" class="preview-banner">
        <span>กำลังดูประวัติคำขอ: {{ store.requestId }} (Read Only)</span>
        <button class="btn-close-preview" @click="closePreview">ปิดการดูประวัติ / สร้างคำขอใหม่</button>
    </div>

    <!-- Temporary Debug Banner -->
    <div class="debug-banner">
        <span>⚠️ แจ้งเตือน: ปิดการตรวจสอบข้อมูลบังคับชั่วคราวสำหรับการทดสอบ (Validation Disabled)</span>
    </div>

    <div class="page-content">
      <!-- Header row aligned with center column -->
      <div class="main-grid header-row">
        <div class="grid-col left">
          <RequestStatus v-if="store.hasSearched" />
        </div>
        <div class="grid-col center">
          <div v-if="isOcrEnabled" class="smart-import-wrapper">
             <button class="btn-smart-import" @click="showSmartImport = true">
                📷 Smart Import (Thai ID)
             </button>
          </div>

          <!-- Search & Action Container (Side-by-Side) -->
          <div class="search-action-container">
            <!-- Search Header -->
            <CreditRequestHeader @search="store.searchCustomer" class="flex-grow-header" />

            <!-- Create Request Action Bar (Outside Header) -->
            <div v-if="store.hasSearched" class="action-bar flex-fixed-action">
                <div class="action-bar-content">
                    <div class="dropdown-container" ref="typeDropdown">
                        <button class="btn-create-request" @click="toggleTypeDropdown">
                        {{ selectedType || 'สร้างคำขอเครดิต +' }}
                        <span class="arrow-down">▼</span>
                        </button>

                        <div v-if="showTypeDropdown" class="type-dropdown-menu">
                        <div
                            v-for="type in availableCreditTypes"
                            :key="type.value"
                            class="type-item"
                            :class="{ disabled: type.disabled, active: selectedType === type.value }"
                            @click="selectType(type)"
                        >
                            {{ type.label }}
                            <span v-if="type.disabled" class="disabled-reason">({{ type.reason }})</span>
                        </div>
                        </div>
                    </div>
                </div>
            </div>
          </div>

        </div>
        <div class="grid-col right">
          <DocumentChecklist v-if="store.hasSearched" />
        </div>
      </div>

      <div class="main-grid">
        <!-- Left Column: History -->
        <div class="grid-col left">
          <CreditHistorySidebar
            v-if="store.hasSearched"
            :customerName="store.displayCustomer.name"
            :customerCode="store.displayCustomer.id"
            :historyItems="store.history"
            :searched="store.hasSearched"
          />
        </div>

        <!-- Center Column: Purpose/Form -->
        <div class="grid-col center">
           <div v-if="!store.hasSearched" class="placeholder-state">
             <div class="placeholder-content">
               <img :src="iconSearchLarge" alt="Search" width="64" height="64" />
               <h3>ค้นหาลูกค้า เพื่อเริ่มสร้างคำขอเครดิต</h3>
             </div>
           </div>

           <CreditRequestForm v-else />
        </div>

        <!-- Right Column: Idea/Summary -->
        <div class="grid-col right">
           <CreditScoreSummary
             v-if="store.hasSearched"
             :financial="store.financialSummary"
             :canRequest="store.creditScore.can_request_credit"
             :badges="store.creditScore.badges"
             :suggestions="store.creditScore.suggestions"
           />
        </div>
      </div>
    </div>

    <!-- Smart Import Modal -->
    <SmartImportModal
      v-if="showSmartImport"
      @close="showSmartImport = false"
      @data-extracted="handleOcrData"
    />
  </div>
</template>

<script setup>
import Navbar from '@/components/shared/Navbar.vue';
import CreditRequestHeader from '@/components/credit/CreditRequestHeader.vue';
import CreditHistorySidebar from '@/components/credit/CreditHistorySidebar.vue';
import RequestStatus from '@/components/credit/RequestStatus.vue';
import CreditRequestForm from '@/components/credit/CreditRequestForm.vue';
import CreditScoreSummary from '@/components/credit/CreditScoreSummary.vue';
import DocumentChecklist from '@/components/credit/DocumentChecklist.vue';
import SmartImportModal from '@/components/credit/SmartImportModal.vue';
import { useCreditRequestStore } from '@/stores/creditRequest';
import { useFeatureFlag } from '@/composables/useFeatureFlag';
import iconSearchLarge from '@/assets/icons/search-large.svg';
import { ref, computed, onMounted, onUnmounted } from 'vue';

const store = useCreditRequestStore();
const { isOcrEnabled } = useFeatureFlag();
const showSmartImport = ref(false);
const showTypeDropdown = ref(false);
const typeDropdown = ref(null);

const closePreview = () => {
    store.resetState();
};

const handleOcrData = (data) => {
  // Map extracted data to store
  console.log('Applying OCR Data to Form:', data);

  // 1. Name
  const fullName = `${data.title || ''} ${data.firstName} ${data.lastName}`.trim();
  store.customer.name = fullName;

  // 2. ID Number
  store.customer.tax_id = data.idNumber;
  // Ensure we have a customer ID so the form renders (hasData check)
  if (!store.customer.id) {
    store.customer.id = 'NEW';
  }

  // 3. Address Parsing
  const fullAddr = data.address || '';

  // Basic Regex for Thai Address Components
  const zipMatch = fullAddr.match(/\d{5}$/);
  const provinceMatch = fullAddr.match(/(?:จ\.|จังหวัด)\s*([^\s]+)/);
  const districtMatch = fullAddr.match(/(?:อ\.|อำเภอ|เขต)\s*([^\s]+)/);
  const subMatch = fullAddr.match(/(?:ต\.|ตำบล|แขวง)\s*([^\s]+)/);

  if (zipMatch) store.customer.zipcode = zipMatch[0];
  if (provinceMatch) store.customer.province = provinceMatch[1];
  if (districtMatch) store.customer.district = districtMatch[1];
  if (subMatch) store.customer.subdistrict = subMatch[1];

  // Put full address in line 1
  store.customer.address = fullAddr;

  // Also update Residence keys
  store.customer.residence_address = store.customer.address;
  store.customer.residence_province = store.customer.province;
  store.customer.residence_district = store.customer.district;
  store.customer.residence_subdistrict = store.customer.subdistrict;
  store.customer.residence_zipcode = store.customer.zipcode;

  // 4. Force UI Update
  store.displayCustomer = { ...store.customer };
  store.hasSearched = true; // Unlock the form
};

// Create Request Logic (Moved from Header)
const selectedType = computed(() => store.transactionData.requestType);

const availableCreditTypes = computed(() => {
  const currentLimit = Number(store.customer.current_credit_limit || 0);
  const isExisting = currentLimit > 0;

  return [
    {
      label: 'เครดิตใหม่',
      value: 'เครดิตใหม่',
      disabled: isExisting,
      reason: isExisting ? 'มีวงเงินเครดิตอยู่แล้ว' : ''
    },
    {
      label: 'เครดิตเพิ่ม',
      value: 'เครดิตเพิ่ม',
      disabled: !isExisting,
      reason: !isExisting ? 'ต้องมีวงเงินเครดิตก่อน' : ''
    },
    {
      label: 'เครดิตโครงการ',
      value: 'เครดิตโครงการ',
      disabled: !isExisting,
      reason: !isExisting ? 'ต้องมีวงเงินเครดิตก่อน' : ''
    },
    {
      label: 'เปลี่ยนแปลงระยะเวลาเครดิต',
      value: 'เปลี่ยนแปลงระยะเวลาเครดิต',
      disabled: !isExisting,
      reason: !isExisting ? 'ต้องมีวงเงินเครดิตก่อน' : ''
    },
    {
      label: 'เปลี่ยนแปลงเงื่อนไขการชำระเงิน',
      value: 'เปลี่ยนแปลงเงื่อนไขการชำระเงิน',
      disabled: !isExisting,
      reason: !isExisting ? 'ต้องมีวงเงินเครดิตก่อน' : ''
    }
  ];
});

const updateType = (typeValue) => {
  store.updateTransactionData({ requestType: typeValue });
  if (store.requestId) {
    store.saveTransactionData();
  }
};

const toggleTypeDropdown = () => {
  showTypeDropdown.value = !showTypeDropdown.value;
};

const selectType = (type) => {
  if (type.disabled) return;
  updateType(type.value);
  showTypeDropdown.value = false;
};

// Click Outside
const handleClickOutside = (event) => {
  if (typeDropdown.value && !typeDropdown.value.contains(event.target)) {
    showTypeDropdown.value = false;
  }
};

onMounted(() => {
  document.addEventListener('click', handleClickOutside);
});

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside);
});
</script>

<style scoped>
.create-credit-request {
  padding-top: 80px; /* Navbar height */
  min-height: 100vh;
  background-color: #F5F5F5;
}

.page-content {
  padding: 20px 40px;
  max-width: 1600px;
  margin: 0 auto;
}

.main-grid {
  display: grid;
  grid-template-columns: 300px 1fr 300px;
  gap: 20px;
  align-items: stretch;
}

/* Responsive adjustments */
@media (max-width: 1366px) {
  .main-grid {
    grid-template-columns: 220px 1fr 220px;
  }
  .page-content {
    padding: 20px 20px;
  }
}

/* Ensure header row columns stretch their children */
.header-row .grid-col {
  display: flex;
  flex-direction: column;
}

.header-row .grid-col > * {
  flex-grow: 1;
}

@media (max-width: 992px) {
  .main-grid {
    grid-template-columns: 1fr;
  }
  .grid-col.left {
    order: 2;
  }
  .grid-col.center {
    order: 1;
  }
  .grid-col.right {
    order: 3;
  }
}

.placeholder-state {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 400px;
  background: white;
  border-radius: 8px;
  border: 1px dashed #ccc;
}

.placeholder-content {
  text-align: center;
  color: #888;
}

.placeholder-content h3 {
  margin: 10px 0 5px;
  font-size: 18px;
  color: #555;
}

.placeholder-content p {
  font-size: 14px;
}

.preview-banner {
    background-color: #333;
    color: white;
    padding: 10px 20px;
    display: flex;
    justify-content: center; /* Center content */
    align-items: center;
    gap: 20px;
    width: 100%;
    z-index: 999;
}

.btn-close-preview {
    background-color: white;
    color: #333;
    border: none;
    padding: 5px 15px;
    border-radius: 4px;
    cursor: pointer;
    font-weight: bold;
}
.btn-close-preview:hover {
    background-color: #ddd;
}

.debug-banner {
    background-color: #ff9800; /* Orange */
    color: white;
    padding: 10px 20px;
    text-align: center;
    font-weight: bold;
    z-index: 998;
}

.smart-import-wrapper {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 10px;
}

.btn-smart-import {
  background: linear-gradient(135deg, #0056FF 0%, #0033cc 100%);
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 20px;
  cursor: pointer;
  font-weight: bold;
  font-size: 14px;
  box-shadow: 0 2px 5px rgba(0,0,0,0.2);
  transition: transform 0.2s;
  display: flex;
  align-items: center;
  gap: 8px;
}

.btn-smart-import:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0,0,0,0.2);
}

/* --- New Layout Styles --- */

.search-action-container {
  display: flex;
  gap: 20px;
  align-items: stretch;
  margin-bottom: 20px;
}

/* Make header grow to fill space */
.flex-grow-header {
  flex: 1;
  margin-bottom: 0 !important; /* Override default margin */
  height: 100%;
}

/* Action Bar Styles (Button Only) */
.action-bar {
  /* Removed island styles */
  display: flex;
  align-items: flex-end; /* Align bottom to match input line */
  justify-content: flex-end;
  flex-shrink: 0;
  min-width: 250px;
  padding-bottom: 20px; /* Align with header padding bottom */
}

/* Responsive: Stack on small screens */
@media (max-width: 992px) {
    .search-action-container {
        flex-direction: column;
    }
    .action-bar {
        width: 100%;
        justify-content: flex-end;
        padding-bottom: 0;
    }
}

.action-bar-content {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  width: 100%;
}

/* Dropdown Styles reused */
.dropdown-container {
  position: relative;
  width: 100%; /* Fill container */
}

.btn-create-request {
  width: 100%;
  padding: 10px 15px;
  background-color: #0056FF;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-weight: bold;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 14px;
}

.btn-create-request:hover {
  background-color: #0046cc;
}

.arrow-down {
  font-size: 12px;
}

.type-dropdown-menu {
  position: absolute;
  top: 100%;
  left: 0;
  width: 100%;
  background: white;
  border: 1px solid #ccc;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  z-index: 1001;
  margin-top: 5px;
  overflow: hidden;
}

.type-item {
  padding: 12px 15px;
  cursor: pointer;
  border-bottom: 1px solid #f0f0f0;
  color: #333;
  text-align: left;
  transition: background 0.2s;
  font-size: 14px;
}

.type-item:last-child {
  border-bottom: none;
}

.type-item:hover {
  background-color: #f5f5f5;
}

.type-item.active {
  background-color: #e6f0ff;
  color: #0056FF;
  font-weight: bold;
}

.type-item.disabled {
  color: #aaa;
  cursor: not-allowed;
  background-color: #fafafa;
}

.type-item.disabled:hover {
  background-color: #fafafa;
}

.disabled-reason {
  font-size: 11px;
  color: #999;
  margin-left: 5px;
  font-style: italic;
}
</style>
