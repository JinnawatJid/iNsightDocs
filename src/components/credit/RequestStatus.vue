<template>
  <div v-if="store.requestId" class="request-status-component">
    <div class="content-wrapper">
      <div class="info-section">
        <div class="header">
          <span class="label">เลขที่คำขอ:</span>
          <span class="value">{{ store.requestId }}</span>
        </div>
        <div class="status-row">
          <span class="label">สถานะ:</span>
          <div class="status-badge-container">
            <div :class="['status-badge', statusClass]">
              <img :src="statusIcon" alt="" width="16" height="16" class="icon" />
              <span>{{ statusLabel }}</span>
            </div>
            <button v-if="showExportButton" class="btn-icon-export" @click="exportPDF" title="ดาวน์โหลด PDF">
              <img src="@/assets/icons/download.svg" alt="ดาวน์โหลด PDF" width="18" height="18" />
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useCreditRequestStore } from '@/stores/creditRequest';
import iconFile from '@/assets/icons/file.svg';
import iconClock from '@/assets/icons/clock-orange.svg';
import iconCheck from '@/assets/icons/check-circle-green.svg';
import iconX from '@/assets/icons/x-circle-red.svg';
import iconUser from '@/assets/icons/user.svg';

const store = useCreditRequestStore();

// Status Mapping Logic
const statusConfig = {
  'Opened': { label: 'Opened', class: 'info', icon: iconFile },
  'Submitted': { label: 'Submitted', class: 'warning', icon: iconClock },
  'Reviewed': { label: 'Reviewed', class: 'purple', icon: iconUser },
  'Approved': { label: 'Approved', class: 'success', icon: iconCheck },
  'Rejected': { label: 'Rejected', class: 'error', icon: iconX },
  'Canceled': { label: 'Canceled', class: 'gray', icon: iconX },
  'Closed': { label: 'Closed', class: 'dark', icon: iconFile }
};

const currentStatus = computed(() => store.requestStatus || 'Opened');

const statusLabel = computed(() => {
  return statusConfig[currentStatus.value]?.label || currentStatus.value;
});

const statusClass = computed(() => {
  return statusConfig[currentStatus.value]?.class || 'default';
});

const statusIcon = computed(() => {
  return statusConfig[currentStatus.value]?.icon || iconFile;
});

const showExportButton = computed(() => {
  const status = store.requestStatus;
  const validStatuses = [
    'Opened',
    'Submitted',
    'PendingSales (ชั่วคราว)',
    'Reviewed',
    'PendingFinance (ชั่วคราว)',
    'Approved',
    'Rejected',
    'Closed',
    'Canceled'
  ];
  return validStatuses.includes(status);
});

const exportPDF = () => {
  const txId = store.requestId;
  if (!txId) {
    console.warn('Cannot export PDF: Missing Transaction ID (requestId is null)');
    return;
  }
  const encodedId = encodeURIComponent(txId);
  const url = `/api/credit-requests/${encodedId}/pdf`;
  window.open(url, '_blank');
};
</script>

<style scoped>
.request-status-component {
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 20px;
  text-align: left;
  height: 100%;
  display: flex;
  align-items: center;
}

.content-wrapper {
  display: flex;
  flex-direction: row; /* Horizontal layout */
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.info-section {
  display: flex;
  flex-direction: column;
}

.header {
  margin-bottom: 12px;
  font-size: 16px;
}

.label {
  font-weight: bold;
  margin-right: 8px;
  color: #000;
}

.value {
  color: #666;
  font-weight: normal;
}

.status-row {
  display: flex;
  align-items: center;
}

.status-badge-container {
  display: flex;
  align-items: center;
  gap: 12px;
}

.status-badge {
  display: flex;
  align-items: center;
  gap: 6px;
  font-weight: normal;
  padding: 4px 8px;
  border-radius: 4px;
}

/* Status Classes */
.status-badge.info {
  color: #0056b3;
  background-color: #e7f1ff;
}

.status-badge.warning {
  color: #856404;
  background-color: #fff3cd;
}

.status-badge.purple {
  color: #6f42c1;
  background-color: #f3e5f5;
}

.status-badge.success {
  color: #155724;
  background-color: #d4edda;
}

.status-badge.error {
  color: #721c24;
  background-color: #f8d7da;
}

.status-badge.gray {
  color: #666;
  background-color: #e2e3e5;
}

.status-badge.dark {
  color: #1b1e21;
  background-color: #d6d8d9;
}

.status-badge.default {
  color: #333;
}

.btn-icon-export {
  background: none;
  border: none;
  padding: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: background-color 0.2s;
}

.btn-icon-export:hover {
  background-color: #f0f5ff;
}
</style>
