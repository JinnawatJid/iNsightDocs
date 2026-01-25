<template>
 <div class="role-selector">
   <label class="label">จำลองสิทธิ์ (Role Simulator):</label>
   <select v-model="selectedRole" class="select-box">
     <option value="ผู้จัดการสาขา">ผู้จัดการสาขา (Branch Manager)</option>
     <option value="ผู้จัดการภาค">ผู้จัดการภาค (Regional Manager)</option>
     <option value="ผู้จัดการฝ่ายขาย">ผู้จัดการฝ่ายขาย (Sales Manager)</option>
     <option value="เจ้าหน้าที่ฝ่ายการเงิน">เจ้าหน้าที่ฝ่ายการเงิน (Finance Officer)</option>
     <option value="ผู้จัดการฝ่ายการเงิน">ผู้จัดการฝ่ายการเงิน (Finance Manager)</option>
     <option value="กรรมการเครดิต">กรรมการเครดิต (Credit Committee)</option>
   </select>
 </div>
</template>

<script setup>
import { computed } from 'vue';
import { useCreditRequestStore } from '@/stores/creditRequest';

const store = useCreditRequestStore();

const selectedRole = computed({
  get: () => store.userRole,
  set: (val) => store.setUserRole(val)
});
</script>

<style scoped>
.role-selector {
  display: flex;
  align-items: center;
  gap: 10px;
  background: #f0f0f0;
  padding: 8px 12px;
  border-radius: 6px;
  border: 1px dashed #999;
}

.label {
  font-size: 12px;
  font-weight: bold;
  color: #555;
  white-space: nowrap;
}

.select-box {
  padding: 4px 8px;
  border-radius: 4px;
  border: 1px solid #ccc;
  font-size: 12px;
  background: white;
  min-width: 200px;
}
</style>
