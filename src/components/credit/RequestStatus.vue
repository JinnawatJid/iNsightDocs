<template>
  <div v-if="store.requestId" class="request-status-component">
    <div class="header">
      <span class="label">เลขที่คำขอ:</span>
      <span class="value">{{ store.requestId }}</span>
    </div>
    <div class="status-row">
      <span class="label">สถานะ:</span>
      <div class="status-badge draft">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
        <span>แบบร่าง</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useCreditRequestStore } from '@/stores/creditRequest';

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
