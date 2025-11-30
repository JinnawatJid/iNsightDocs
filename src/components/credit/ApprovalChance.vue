<template>
  <div v-if="store.requestId" class="approval-chance-component">
    <div class="header">
      <span class="title">โอกาสในการอนุมัติ</span>
      <span class="chance-level" :class="levelClass">{{ chanceText }}</span>
    </div>

    <div class="progress-container">
      <div class="progress-bar-bg">
        <div class="progress-bar-fill" :class="levelClass" :style="{ width: store.approvalChancePercent + '%' }"></div>
      </div>
    </div>

    <div class="footer">
      <span class="upload-text">อัปโหลดเอกสาร เพื่อเพิ่มโอกาสในการอนุมัติ</span>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useCreditRequestStore } from '@/stores/creditRequest';

const store = useCreditRequestStore();

const chanceText = computed(() => {
  const level = store.approvalChanceLevel;
  switch (level) {
    case 'Low': return 'น้อย';
    case 'Medium': return 'ปานกลาง';
    case 'High': return 'มาก';
    default: return 'น้อย';
  }
});

const levelClass = computed(() => {
  return store.approvalChanceLevel.toLowerCase();
});
</script>

<style scoped>
.approval-chance-component {
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 15px 20px;
  margin-bottom: 20px;
  text-align: left;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.title {
  font-weight: bold;
  font-size: 16px;
  color: #666;
}

.chance-level {
  font-weight: bold;
  font-size: 16px;
}

.chance-level.low {
  color: #dc3545; /* Red */
}

.chance-level.medium {
  color: #ffc107; /* Yellow/Orange - bootstrap warning color usually needs darker text on white */
  color: #ffaa00;
}

.chance-level.high {
  color: #28a745; /* Green */
}

.progress-container {
  margin-bottom: 10px;
}

.progress-bar-bg {
  width: 100%;
  height: 8px;
  background-color: #e9ecef;
  border-radius: 4px;
  overflow: hidden;
}

.progress-bar-fill {
  height: 100%;
  transition: width 0.3s ease;
}

.progress-bar-fill.low {
  background-color: #dc3545;
}

.progress-bar-fill.medium {
  background-color: #ffc107;
}

.progress-bar-fill.high {
  background-color: #28a745;
}

.footer {
  font-size: 14px;
  color: #666;
}
</style>
