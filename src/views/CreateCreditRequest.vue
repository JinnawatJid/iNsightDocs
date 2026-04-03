<template>
  <div class="create-credit-request">
    <Navbar />

    <!-- Close Preview Banner -->
    <div v-if="store.viewingHistory" class="preview-banner">
        <span>กำลังดูประวัติคำขอ: {{ store.requestId }} (Read Only)</span>
        <button class="btn-close-preview" @click="closePreview">ปิดการดูประวัติ / สร้างคำขอใหม่</button>
    </div>

    <div class="page-content">
      <!-- Header row aligned with center column -->
      <div class="main-grid header-row">
        <div class="grid-col left">
          <RequestStatus v-if="store.hasSearched" />
        </div>
        <div class="grid-col center">
          <div v-if="isOcrEnabled && authStore.isInitiator" class="smart-import-wrapper">
             <button class="btn-smart-import" @click="showSmartImport = true">
                📷 Smart Import (Thai ID)
             </button>
          </div>
          <CreditRequestHeader
             @search="handleSearch"
             @start-request="handleStartRequest"
             :isRequestStarted="isRequestStarted"
          />
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
            @request-selected="isRequestStarted = true"
          />
        </div>

        <!-- Center Column: Purpose/Form -->
        <div class="grid-col center">
           <!-- State 1: Placeholder -->
           <div v-if="!store.hasSearched" class="placeholder-state">
             <div class="placeholder-content">
               <img :src="iconSearchLarge" alt="Search" width="64" height="64" />
               <h3>{{ authStore.isInitiator ? 'ค้นหาลูกค้า เพื่อเริ่มสร้างคำขอเครดิต' : 'ค้นหาลูกค้า เพื่อดูข้อมูล' }}</h3>
             </div>
           </div>

           <!-- State 2: Dashboard (Context) -->
           <CustomerProfileDashboard v-else-if="!isRequestStarted" />

           <!-- State 3: Form (Action) -->
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
import CreditRequestHeader from '@/components/credit/dashboard/CreditRequestHeader.vue';
import CreditHistorySidebar from '@/components/credit/dashboard/CreditHistorySidebar.vue';
import RequestStatus from '@/components/credit/workflow/RequestStatus.vue';
import CreditRequestForm from '@/components/credit/forms/CreditRequestForm.vue';
import CustomerProfileDashboard from '@/components/credit/dashboard/CustomerProfileDashboard.vue';
import CreditScoreSummary from '@/components/credit/scoring/CreditScoreSummary.vue';
import DocumentChecklist from '@/components/credit/workflow/DocumentChecklist.vue';
import SmartImportModal from '@/components/credit/modals/SmartImportModal.vue';
import { useCreditRequestStore } from '@/stores/creditRequest';
import { useFeatureFlag } from '@/composables/useFeatureFlag';
import { useAuthStore } from '@/stores/auth';
import { useRoute } from 'vue-router';
import iconSearchLarge from '@/assets/icons/search-large.svg';
import { ref, watch , onMounted} from 'vue';
import Swal from 'sweetalert2';

const store = useCreditRequestStore();
const authStore = useAuthStore();
const route = useRoute();
const { isOcrEnabled } = useFeatureFlag();
const showSmartImport = ref(false);
const isRequestStarted = ref(false);

const closePreview = () => {
    store.resetState();
    isRequestStarted.value = false;
};

onMounted(async () => {
    // Reset state unconditionally when visiting the page to ensure a clean slate
    store.resetState();
    isRequestStarted.value = false;

    const { search, txId } = route.query;

    if (search) {
        // If we are given a search parameter, we should fetch it.
        await store.searchCustomer(search);
        if (txId) {
            // Load the specific draft and start the request
            await store.loadRequestDetail(txId);
            isRequestStarted.value = true;
        }
    }
});

const handleSearch = async (query) => {
    // Reset local state before search
    isRequestStarted.value = false;
    await store.searchCustomer(query);
};

const handleStartRequest = async (type) => {
    console.log('Starting Request Type:', type);
    store.updateTransactionData({ requestType: type });

    // Create the credit request now that a type is selected
    if (!store.requestId && store.customer && store.customer.id) {
        await store.createCreditRequest(store.customer.id, store.customer.name);
    }

    isRequestStarted.value = true;

    // Save to backend immediately so the Draft correctly reflects the chosen type
    if (store.requestId) {
        await store.saveTransactionData();
    }
};

// Watch for route changes to handle query parameters (e.g. from Revision flow)
watch(
  () => route.query,
  async (newQuery) => {
    const { search, txId } = newQuery;
    if (search) {
        // We need to re-fetch customer data if search parameter changes or if we need to load a new txId
        // store.requestId check prevents infinite loop if the route stays the same
        if (txId && store.requestId !== txId) {
             await store.searchCustomer(search);
             await store.loadRequestDetail(txId);
             isRequestStarted.value = true;
        } else if (!txId && store.customer?.id !== search) {
             await store.searchCustomer(search);
        }
    }
  }
);

// Watch for Blacklist Alert
watch(
  () => store.blacklistAlert,
  (newVal) => {
    if (newVal) {
      Swal.fire({
        icon: 'error',
        title: 'แจ้งเตือน: ลูกค้ารายนี้อยู่ในบัญชี NPL',
        showCancelButton: true,
        confirmButtonText: 'ดำเนินการต่อ',
        cancelButtonText: 'ยกเลิก',
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        reverseButtons: true
      }).then((result) => {
        if (!result.isConfirmed) {
          // If cancelled, clear state (reset search)
          store.resetState();
        }
        // If confirmed, do nothing (stay on page)
      });
    }
  }
);

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

  // Note: OCR Flow mimics a "Search" result but for a NEW customer.
  // We should decide if we auto-start request for OCR or show dashboard.
  // Given OCR is for "New Credit", maybe we should let them confirm on Dashboard?
  // Let's stick to Dashboard pattern for consistency.
  isRequestStarted.value = false;
};
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
</style>