<template>
  <div class="request-sidebar">
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

const store = useCreditRequestStore();
const activeTab = ref('pending');

const requests = computed(() => store.requestsList);
const loading = computed(() => store.loading);

const switchTab = (tab) => {
  activeTab.value = tab;
  fetchData();
};

const fetchData = () => {
  if (activeTab.value === 'pending') {
    store.fetchRequests('Submitted,Reviewed');
  } else {
    store.fetchRequests('Approved,Rejected,Closed,Canceled');
  }
};

const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('th-TH', {
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
}

/* Tab Styles - Pill Shape */
.tabs {
  display: flex;
  background-color: #999;
  padding: 4px;
  border-radius: 20px;
  margin: 20px;
}

.tab-item {
  flex: 1;
  text-align: center;
  padding: 8px 0;
  cursor: pointer;
  border-radius: 16px;
  font-weight: bold;
  color: #fff;
  transition: all 0.3s ease;
}

.tab-item.active {
  background-color: white;
  color: #333;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

/* List Styles */
.request-list {
  flex: 1;
  overflow-y: auto;
  padding: 0 20px 20px;
}

.request-item {
  padding: 15px;
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
  margin-bottom: 5px;
}

.customer-name {
  font-weight: bold;
  color: #333;
}

.request-date {
  font-size: 12px;
  color: #888;
}

.item-body {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.request-amount {
  font-weight: 500;
  color: #333;
}

.status-badge {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 10px;
  color: white;
}

.status-submitted { background-color: #007bff; }
.status-reviewed { background-color: #ffc107; color: #333; }
.status-approved { background-color: #28a745; }
.status-rejected { background-color: #dc3545; }
.status-default { background-color: #6c757d; }

.loading-state, .empty-state {
  text-align: center;
  padding: 20px;
  color: #888;
}
</style>
