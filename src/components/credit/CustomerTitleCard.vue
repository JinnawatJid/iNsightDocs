<template>
  <div class="customer-title-card">
    <div class="card-content">
      <!-- Left: Icon & Info -->
      <div class="info-section">
        <div class="icon-wrapper">
          <img :src="iconUser" alt="Customer" width="24" height="24" />
        </div>
        <div class="text-content">
            <h2 class="customer-name">{{ customerName || '-' }}</h2>
            <span v-if="customerId" class="customer-id">ID: {{ customerId }}</span>
        </div>
      </div>

      <!-- Right: Actions & Badges -->
      <div class="action-section">
          <span class="request-type-badge">{{ requestType }}</span>

          <button
            v-if="canExport"
            class="btn-export"
            @click="exportPDF"
            title="Download PDF"
          >
            <img :src="iconDownload" alt="Download" width="16" height="16" />
            <span>PDF</span>
          </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useCreditRequestStore } from '@/stores/creditRequest';
import iconUser from '@/assets/icons/user.svg';
import iconDownload from '@/assets/icons/download.svg';

const store = useCreditRequestStore();

const customerName = computed(() => store.customer?.name);
const customerId = computed(() => store.customer?.id || store.customer?.No_);
const requestType = computed(() => store.transactionData?.requestType || 'เครดิตใหม่');

const canExport = computed(() => {
    // Show button if we have a valid request ID
    return !!store.requestId;
});

const exportPDF = () => {
    const txId = store.requestId;
    if (!txId) return;

    const encodedId = encodeURIComponent(txId);
    const url = `/api/credit-requests/${encodedId}/pdf`;
    window.open(url, '_blank');
};
</script>

<style scoped>
.customer-title-card {
  background: white;
  border-radius: 8px;
  border: 1px solid #e0e0e0;
  padding: 20px;
  margin-bottom: 20px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.02);
}

.card-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.info-section {
  display: flex;
  align-items: center;
  gap: 15px;
}

.icon-wrapper {
  width: 48px;
  height: 48px;
  background-color: #f5f5f5;
  border-radius: 50%;
  display: flex;
  justify-content: center;
  align-items: center;
  border: 1px solid #e0e0e0;
}

.text-content {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
}

.customer-name {
  margin: 0;
  font-size: 18px;
  font-weight: bold;
  color: #333;
}

.customer-id {
    font-size: 13px;
    color: #888;
    margin-top: 2px;
}

.action-section {
    display: flex;
    align-items: center;
    gap: 15px;
}

.request-type-badge {
    background-color: #e7f1ff;
    color: #0056b3;
    padding: 6px 12px;
    border-radius: 20px;
    font-size: 13px;
    font-weight: 500;
}

.btn-export {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  background-color: white;
  color: #0056FF;
  border: 1px solid #0056FF;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 500;
  font-size: 14px;
  transition: background-color 0.2s;
}

.btn-export:hover {
  background-color: #f0f5ff;
}

/* Responsive */
@media (max-width: 768px) {
    .card-content {
        flex-direction: column;
        align-items: flex-start;
        gap: 15px;
    }

    .action-section {
        width: 100%;
        justify-content: space-between;
    }
}
</style>
