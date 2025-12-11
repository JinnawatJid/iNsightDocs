<template>
  <div v-if="store.requestId" class="request-status-component">
    <div class="header">
      <span class="label">เลขที่คำขอ:</span>
      <span class="value">{{ store.requestId }}</span>
    </div>
    <div class="status-row">
      <span class="label">สถานะ:</span>
      <div class="status-badge draft">
        <img :src="iconFile" alt="Draft" width="16" height="16" class="icon" />
        <span>แบบร่าง</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useCreditRequestStore } from '@/stores/creditRequest';
import iconFile from '@/assets/icons/file.svg';

const store = useCreditRequestStore();
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
  flex-direction: column;
  justify-content: center;
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

.status-badge {
  display: flex;
  align-items: center;
  gap: 6px;
  color: #666;
  font-weight: normal;
}

.status-badge.draft {
    /* Style for Draft status */
    color: #666;
}

.icon {
  color: #666;
}
</style>
