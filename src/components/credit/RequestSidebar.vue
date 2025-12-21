<template>
  <div class="request-sidebar">
    <!-- Tabs -->
    <div class="tabs">
      <div
        class="tab-item"
        :class="{ active: activeTab === 'pending' }"
        @click="switchTab('pending')"
      >
        รออนุมัติ
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
        <div class="item-header">
           <span class="customer-name">{{ req.customer_name }}</span>
           <span class="request-date">{{ formatDate(req.created_at) }}</span>
        </div>
        <div class="item-body">
           <span class="request-amount">{{ formatCurrency(req.request_amount) }} บาท</span>
           <span class="status-badge" :class="getStatusClass(req.status)">{{ req.status }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { useCreditRequestStore } from '@/stores/creditRequest';
import { debounce } from 'lodash';

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
    return date.toLocaleDateString('en-GB', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    });
};

const formatCurrency = (amount) => {
    if (amount === null || amount === undefined) return '0';
    return Number(amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const getStatusClass = (status) => {
    switch (status) {
        case 'Submitted': return 'status-submitted';
        case 'Reviewed': return 'status-reviewed';
        case 'Approved': return 'status-approved';
        case 'Rejected': return 'status-rejected';
        case 'Opened': return 'status-opened';
        case 'Closed': return 'status-closed';
        default: return 'status-default';
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

/* Tabs - Matching ApplicationTabs.vue */
.tabs {
  display: flex;
  background-color: #999;
  padding: 0;
  border-radius: 52px;
  overflow: hidden;
  border: 1px solid #999;
  /* Key changes for matching shape */
  width: 80%;
  margin: 20px auto 10px auto;
}

.tab-item {
  flex: 1;
  text-align: center;
  padding: 4px 0; /* Reduced padding */
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
  border: 1px solid #999;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.tab-item:hover {
  background-color: rgba(255, 255, 255, 0.1);
}

/* Search Box */
.search-container {
    padding: 0 20px 15px 20px;
    margin-top: 10px;
}

.search-box {
    display: flex;
    align-items: center;
    border: 1px solid #e0e0e0;
    border-radius: 8px;
    padding: 8px 12px;
    background-color: #fff; /* Ensure white background */
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
    background-color: transparent; /* Fix grey background */
    height: 24px; /* Fix vertical alignment */
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
  padding: 0 0 20px 0;
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

.item-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 8px; /* Spacing between rows */
  text-align: left;
}

.customer-name {
  font-weight: bold;
  color: #333;
  flex: 1;
  margin-right: 10px;
  text-align: left;
  font-size: 14px;
  line-height: 1.4;
}

.request-date {
  font-size: 12px;
  color: #888;
  white-space: nowrap;
  flex-shrink: 0;
}

.item-body {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.request-amount {
  font-weight: 500;
  color: #333;
  font-size: 14px;
}

/* Status Badges */
.status-badge {
  font-size: 12px;
  padding: 4px 12px;
  border-radius: 12px; /* Pill shape */
  color: white;
  font-weight: 500;
  min-width: 80px;
  text-align: center;
}

.status-submitted { background-color: #007bff; } /* Blue */
.status-reviewed { background-color: #ffc107; color: #333; } /* Yellow */
.status-approved { background-color: #28a745; } /* Green */
.status-rejected { background-color: #dc3545; } /* Red */
.status-opened { background-color: #6c757d; } /* Grey */
.status-closed { background-color: #343a40; } /* Dark Grey */
.status-default { background-color: #6c757d; }

.loading-state, .empty-state {
  text-align: center;
  padding: 20px;
  color: #888;
  font-size: 14px;
}
</style>
