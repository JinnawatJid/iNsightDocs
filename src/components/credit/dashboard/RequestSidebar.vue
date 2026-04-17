<template>
  <div class="request-sidebar">
    <!-- Tabs -->
    <div class="tabs">
      <div
        class="tab-item"
        :class="{ active: activeTab === 'pending' }"
        @click="switchTab('pending')"
      >
        {{ pendingTabLabel }}
      </div>
      <div
        class="tab-item"
        :class="{ active: activeTab === 'history' }"
        @click="switchTab('history')"
      >
        ประวัติ
      </div>
    </div>

    <!-- Search Box -->
    <div class="search-container">
      <div class="search-box">
        <img :src="iconSearch" alt="Search" class="search-icon" />
        <input
          type="text"
          v-model="searchQuery"
          placeholder="ค้นหาด้วย รหัสลูกค้า, ชื่อ, เบอร์โทร หรือ ชื่อบริษัท"
          class="search-input"
        />
      </div>
    </div>

    <!-- Request List -->
    <div class="request-list">
      <div v-if="loading" class="loading-state">
        Loading...
      </div>
      <div v-else-if="requests.length === 0" class="empty-state">
        ไม่พบข้อมูล
      </div>
      <div
        v-else
        v-for="req in requests"
        :key="req.id"
        class="request-item"
        :class="{ active: store.requestId === req.tx_id }"
        @click="selectRequest(req)"
      >
        <!-- Top: Request Type Badge -->
        <div class="item-top">
          <span
            class="request-type-badge"
            :class="getRequestTypeClass(req.request_type)"
          >
            {{ req.request_type || 'เครดิตใหม่' }}
          </span>
        </div>

        <!-- Middle: Customer Name and Status Icon -->
        <div class="item-middle">
           <span class="customer-name">{{ req.customer_name }}</span>
           <div class="status-icon">
              <!-- Active Statuses (Clock) -->
              <img v-if="['Draft', 'Opened', 'RegionalSubmitted', 'SalesSubmitted', 'FinanceReviewed', 'Reviewed', 'Submitted', 'PendingSales (ชั่วคราว)', 'PendingFinance (ชั่วคราว)'].includes(req.status)" :src="iconClock" :alt="req.status" width="24" height="24" />
              <!-- Negative Statuses (X) -->
              <img v-else-if="['Rejected', 'Canceled'].includes(req.status)" :src="iconRejected" :alt="req.status" width="24" height="24" />
              <!-- Positive Statuses (Check) -->
              <img v-else-if="['Approved', 'Closed'].includes(req.status)" :src="iconApproved" :alt="req.status" width="24" height="24" />
              <!-- Default -->
              <img v-else :src="iconClock" alt="Status" width="24" height="24" />
           </div>
        </div>

        <!-- Bottom: TxID and Date -->
        <div class="item-bottom">
           <span class="tx-id">{{ req.tx_id }}</span>
           <span class="date">{{ formatDate(req.updated_at || req.created_at) }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { formatDateString as normalizeDateString } from '@/utils/dateUtils';
import { ref, computed, onMounted, watch } from 'vue';
import { useCreditRequestStore } from '@/stores/creditRequest';
import { useAuthStore } from '@/stores/auth';
import { debounce } from 'lodash';

// Import Icons
import iconSearch from '@/assets/icons/search.svg';
import iconClock from '@/assets/icons/clock-orange.svg';
import iconApproved from '@/assets/icons/check-circle-green.svg';
import iconRejected from '@/assets/icons/x-circle-red.svg';

const store = useCreditRequestStore();
const authStore = useAuthStore();
const activeTab = ref('pending');
const searchQuery = ref('');

const requests = computed(() => store.requestsList);
const loading = computed(() => store.loading);

const pendingTabLabel = computed(() => {
  return authStore.isInitiator ? 'ติดตามคำขอ' : 'รออนุมัติ';
});

const switchTab = (tab) => {
  activeTab.value = tab;
  fetchData();
};

const fetchData = () => {
  const query = searchQuery.value;

  if (activeTab.value === 'pending') {
    let allowedStatuses = [];

    // Determine allowed statuses based on the user's role
    if (authStore.isInitiator) {
      // Initiator (Branch Manager) should see all active requests they submitted
      allowedStatuses.push('Opened', 'RegionalSubmitted', 'SalesSubmitted', 'FinanceReviewed', 'Reviewed', 'PendingSales (ชั่วคราว)', 'PendingFinance (ชั่วคราว)');
    }
    if (authStore.isRegionalManager) {
      allowedStatuses.push('Opened');
    }
    if (authStore.isSalesManager) {
      allowedStatuses.push('RegionalSubmitted');
    }
    if (authStore.isFinanceOfficer) {
      allowedStatuses.push('SalesSubmitted');
    }
    if (authStore.isFinanceManager) {
      allowedStatuses.push('FinanceReviewed');
    }
    if (authStore.isCreditCommittee) {
      allowedStatuses.push('Reviewed');
    }

    // If no roles match or array is empty, fallback to a safe default so it doesn't break,
    // though in a perfect RBAC system, they might just see nothing.
    const statusQuery = allowedStatuses.length > 0
      ? allowedStatuses.join(',')
      : '';

    if (statusQuery) {
        store.fetchRequests(statusQuery, query);
    } else {
        // If there are no allowed statuses, don't fetch and clear the list
        store.requestsList = [];
    }
  } else {
    // History tab: everyone can see final statuses
    store.fetchRequests('Approved,Rejected,Closed,Canceled', query);
  }
};

// Debounce search input
const debouncedSearch = debounce(() => {
    fetchData();
}, 500);

watch(searchQuery, () => {
    debouncedSearch();
});

const formatDate = (dateString) => {
    if (!dateString) return '';


    const date = normalizeDateString(dateString);


    const d = String(date.getDate()).padStart(2, '0');
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const y = date.getFullYear(); // Gregorian year
    const hh = String(date.getHours()).padStart(2, '0');
    const mm = String(date.getMinutes()).padStart(2, '0');

    return `${d}/${m}/${y} ${hh}:${mm} น.`;
};

const selectRequest = (req) => {
    if (req.tx_id) {
        store.loadRequestDetail(req.tx_id);
    }
};

const getRequestTypeClass = (type) => {
    if (!type) return 'type-new';
    if (type.includes('เครดิตเพิ่ม')) return 'type-increase';
    if (type.includes('เครดิตโครงการ')) return 'type-project';
    if (type.includes('เปลี่ยนแปลง')) return 'type-change';
    return 'type-new';
};

onMounted(() => {
  fetchData();
});
</script>

<style scoped>
.request-sidebar {
  background: white;
  border-radius: 8px;
  overflow: hidden;
  height: 100%;
  display: flex;
  flex-direction: column;
  border: 1px solid #e0e0e0;
}

/* Tabs - Matching ApplicationTabs.vue */
.tabs {
  display: flex;
  background-color: #999;
  border-radius: 52px;
  overflow: hidden;
  width: 80%;
  margin: 20px auto 10px auto;
  flex-shrink: 0;
}

.tab-item {
  flex: 1;
  text-align: center;
  padding: 6px 0;
  cursor: pointer;
  border-radius: 50px;
  font-weight: 500;
  color: #fff;
  transition: all 0.2s;
  font-size: 14px;
}

.tab-item.active {
  background-color: white;
  color: #333;
  font-weight: bold;
  border: 1px solid #e0e0e0;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.tab-item:hover {
  background-color: rgba(255, 255, 255, 0.1);
}

/* Search Box */
.search-container {
    padding: 0 20px 15px 20px;
    margin-top: 10px;
    flex-shrink: 0;
}

.search-box {
    display: flex;
    align-items: center;
    border: 1px solid #e0e0e0;
    border-radius: 8px;
    padding: 8px 12px;
    background-color: #fff;
}

.search-icon {
    width: 16px;
    height: 16px;
    margin-right: 10px;
    opacity: 0.5;
}

.search-input {
    border: none;
    outline: none;
    width: 100%;
    font-size: 14px;
    color: #333;
    background-color: transparent;
    height: 24px;
    padding: 0;
    margin: 0;
    font-family: inherit;
}

.search-input::placeholder {
    color: #aaa;
}

/* List */
.request-list {
  flex: 1;
  overflow-y: auto;
  padding: 0;
}

.request-item {
  padding: 15px 20px;
  border-bottom: 1px solid #eee;
  cursor: pointer;
  transition: background-color 0.2s;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.request-item:hover {
  background-color: #f9f9f9;
}

.request-item.active {
    background-color: #e6f7ff; /* Light blue highlight for selection */
    border-left: 4px solid #007bff;
}

.item-top {
    display: flex;
    justify-content: flex-start;
}

.request-type-badge {
  font-weight: 500;
  font-size: 12px;
  padding: 2px 10px;
  border-radius: 12px;
  display: inline-block;
  margin-bottom: 4px;
}

/* Badge Colors matching History */
.type-new { color: #0056b3; background-color: #e7f1ff; } /* Blue */
.type-increase { color: #0f5132; background-color: #d1e7dd; } /* Green */
.type-project { color: #6f42c1; background-color: #e0cffc; } /* Purple */
.type-change { color: #856404; background-color: #fff3cd; } /* Orange */

.item-middle {
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.customer-name {
    font-weight: bold;
    font-size: 15px;
    color: #333;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    margin-right: 10px;
}

.status-icon img {
    display: block;
}

.item-bottom {
    display: flex;
    justify-content: flex-start;
    gap: 10px;
    font-size: 13px;
    color: #888;
}

.tx-id {
    font-weight: 500;
    color: #555;
}

.date {
    color: #999;
}

.loading-state, .empty-state {
  text-align: center;
  padding: 30px 20px;
  color: #888;
  font-size: 14px;
}
</style>
