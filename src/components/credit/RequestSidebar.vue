<template>
  <div class="request-sidebar">
    <!-- Tabs -->
    <div class="tabs">
      <div
        class="tab-item"
        :class="{ active: activeTab === 'pending' }"
        @click="switchTab('pending')"
      >
        คำขอทั้งหมด
      </div>
      <div
        class="tab-item"
        :class="{ active: activeTab === 'history' }"
        @click="switchTab('history')"
      >
        ประวัติคำขอ
      </div>
    </div>

    <!-- Search Box -->
    <div class="search-container">
      <div class="search-box">
        <img src="@/assets/icons/search.svg" alt="Search" class="search-icon" />
        <input
          type="text"
          v-model="searchQuery"
          placeholder="ค้นหาข้อมูลลูกค้า"
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
      >
        <div class="item-content">
           <div class="item-left">
               <span class="customer-name">{{ req.customer_name }}</span>
               <span class="request-date">{{ formatDate(req.created_at) }}</span>
           </div>
           <div class="item-right">
               <span class="request-amount">{{ formatCurrency(req.request_amount) }} บาท</span>
               <img :src="getStatusIcon(req.status)" class="status-icon" alt="status" />
           </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { useCreditRequestStore } from '@/stores/creditRequest';
import { debounce } from 'lodash';

// Icons
import clockIcon from '@/assets/icons/clock-orange.svg';
import checkIcon from '@/assets/icons/check-circle-green.svg';
import xIcon from '@/assets/icons/x-circle-red.svg';

const store = useCreditRequestStore();
const activeTab = ref('pending');
const searchQuery = ref('');

const requests = computed(() => store.requestsList);
const loading = computed(() => store.loading);

const switchTab = (tab) => {
  activeTab.value = tab;
  fetchData();
};

const fetchData = () => {
  const query = searchQuery.value;
  if (activeTab.value === 'pending') {
    store.fetchRequests('Opened,Submitted,Reviewed', query);
  } else {
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
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', { // 10/10/2025 format
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    });
};

const formatCurrency = (amount) => {
    if (amount === null || amount === undefined) return '0';
    return Number(amount).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
};

const getStatusIcon = (status) => {
    switch (status) {
        case 'Opened':
        case 'Submitted':
        case 'Reviewed':
            return clockIcon;
        case 'Approved':
        case 'Closed':
            return checkIcon;
        case 'Rejected':
        case 'Canceled':
            return xIcon;
        default:
            return clockIcon;
    }
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

/* Tabs */
.tabs {
  display: flex;
  background-color: #999;
  padding: 0;
  border-radius: 52px;
  margin: 20px 20px 10px 20px; /* adjusted bottom margin */
  overflow: hidden;
  border: 1px solid #999;
}

.tab-item {
  flex: 1;
  text-align: center;
  padding: 8px 0;
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
  border: 1px solid #999; /* Ensure visible separation */
}

/* Search Box */
.search-container {
    padding: 0 20px 15px 20px;
}

.search-box {
    display: flex;
    align-items: center;
    border: 1px solid #e0e0e0;
    border-radius: 8px; /* Standard input radius */
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
}

.search-input::placeholder {
    color: #aaa;
}

/* List */
.request-list {
  flex: 1;
  overflow-y: auto;
  padding: 0 0 20px 0; /* Remove side padding, handle in item */
}

.request-item {
  padding: 15px 20px;
  border-bottom: 1px solid #eee;
  cursor: pointer;
  transition: background-color 0.2s;
}

.request-item:hover {
  background-color: #f9f9f9;
}

.item-content {
    display: flex;
    justify-content: space-between;
    align-items: center; /* Center vertically relative to each other? Or top align? */
    /* Design shows text on left (2 lines) and right (amount + icon) */
}

.item-left {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 4px;
}

.customer-name {
    font-weight: bold;
    color: #333;
    font-size: 14px;
}

.request-date {
    color: #888;
    font-size: 12px;
}

.item-right {
    display: flex;
    align-items: center;
    gap: 15px; /* Spacing between amount and icon */
}

.request-amount {
    font-weight: 500;
    color: #333;
    font-size: 14px;
}

.status-icon {
    width: 24px;
    height: 24px;
}

.loading-state, .empty-state {
  text-align: center;
  padding: 20px;
  color: #888;
  font-size: 14px;
}
</style>
