<template>
  <div class="scorecard-management">
    <div class="config-container">
      <div class="config-header">
        <div class="header-content">
          <h2>จัดการโมเดลให้คะแนน</h2>
          <p>ปรับปรุงน้ำหนักและเกณฑ์การให้คะแนนสำหรับแบบจำลองเครดิต</p>
        </div>
        <div class="header-actions">
          <select v-model="selectedModel" @change="handleModelChange" class="model-select">
            <option value="new">ลูกค้าใหม่ (New Customer Model)</option>
            <option value="existing">ลูกค้าปัจจุบัน (Existing Customer Model)</option>
          </select>
          <button
            class="btn btn-primary"
            :disabled="!store.hasChanges || !isWeightValid || store.isLoading"
            @click="handleSave"
          >
            {{ store.isLoading ? 'กำลังบันทึก...' : 'บันทึกการเปลี่ยนแปลง' }}
          </button>
        </div>
      </div>

      <div class="config-body">
        <div v-if="store.isLoading && !store.configData" class="loading-state">
          <div class="spinner"></div>
          <p>กำลังโหลดข้อมูลโมเดล...</p>
        </div>

        <div v-else-if="store.error" class="error-state">
          <p class="error-text">{{ store.error }}</p>
          <button class="btn btn-secondary" @click="fetchScorecard">ลองใหม่</button>
        </div>

        <div v-else-if="store.configData" class="scorecard-content">

          <div class="validation-banner" :class="{ 'is-valid': isWeightValid, 'is-invalid': !isWeightValid }">
            <div class="validation-info">
              <strong>ผลรวมน้ำหนักทั้งหมด:</strong> {{ totalWeight.toFixed(2) }}
              <span v-if="!isWeightValid" class="validation-warning">
                (ระบบอนุญาตให้บันทึกเมื่อผลรวมเท่ากับ {{ expectedTotalWeight }} เท่านั้น)
              </span>
            </div>
            <button
              v-if="store.hasChanges"
              class="btn btn-outline"
              @click="handleReset"
            >
              คืนค่าเดิม
            </button>
          </div>

          <div v-for="(component, compKey) in store.components" :key="compKey" class="component-card">
            <div class="component-header">
              <h3>{{ compKey.toUpperCase() }}: {{ component.name || 'ไม่มีชื่อหมวดหมู่' }}</h3>
            </div>

            <div class="factors-list">
              <div v-for="(factor, fIndex) in component.factors" :key="factor.key" class="factor-item">
                <div class="factor-header">
                  <div class="factor-title">
                    <h4>{{ factor.label }}</h4>
                    <span class="factor-key">{{ factor.key }}</span>
                  </div>
                  <div class="factor-weight">
                    <label>น้ำหนัก (Weight):</label>
                    <input
                      type="number"
                      v-model.number="factor.weight"
                      step="0.01"
                      class="form-control weight-input"
                    />
                  </div>
                </div>

                <div class="rules-container">
                  <table class="rules-table">
                    <thead>
                      <tr>
                        <th>คำอธิบาย (Label)</th>
                        <th>Min (>=)</th>
                        <th>Max (<)</th>
                        <th>เงื่อนไขพิเศษ (Match)</th>
                        <th>คะแนน (Score)</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="(rule, rIndex) in factor.rules" :key="rIndex">
                        <td>
                          <input type="text" v-model="rule.label" class="form-control text-input" />
                        </td>
                        <td>
                          <input
                            v-if="rule.min !== undefined || (rule.max === undefined && !rule.match && !rule.default)"
                            type="number"
                            v-model.number="rule.min"
                            step="0.01"
                            class="form-control num-input"
                          />
                          <span v-else class="na-text">-</span>
                        </td>
                        <td>
                          <input
                            v-if="rule.max !== undefined || (rule.min === undefined && !rule.match && !rule.default)"
                            type="number"
                            v-model.number="rule.max"
                            step="0.01"
                            class="form-control num-input"
                          />
                          <span v-else class="na-text">-</span>
                        </td>
                        <td>
                           <input
                            v-if="rule.match"
                            type="text"
                            :value="rule.match.join(', ')"
                            @input="e => updateMatchArray(rule, e.target.value)"
                            class="form-control text-input"
                            placeholder="comma separated"
                          />
                          <span v-else-if="rule.default" class="badge default">Default Rule</span>
                          <span v-else class="na-text">-</span>
                        </td>
                        <td>
                          <input
                            type="number"
                            v-model.number="rule.score"
                            step="0.25"
                            class="form-control score-input"
                          />
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useScorecardStore } from '../../stores/scorecard';
import Swal from 'sweetalert2';

const store = useScorecardStore();
const selectedModel = ref('new');
const expectedTotalWeight = ref(100); // Standard, will update dynamically based on initial load

// Computed
const totalWeight = computed(() => {
  if (!store.components) return 0;
  let total = 0;
  Object.values(store.components).forEach(comp => {
    if (comp.factors) {
      comp.factors.forEach(factor => {
        total += (Number(factor.weight) || 0);
      });
    }
  });
  return total;
});

const isWeightValid = computed(() => {
  // Allow a tiny margin of error for floating point arithmetic
  return Math.abs(totalWeight.value - expectedTotalWeight.value) < 0.01;
});

// Methods
const fetchScorecard = async () => {
  await store.loadScorecard(selectedModel.value);
  if (store.configData) {
      // Calculate original total weight to set as the expected target
      expectedTotalWeight.value = totalWeight.value;
  }
};

const handleModelChange = () => {
  if (store.hasChanges) {
    Swal.fire({
      title: 'มีการเปลี่ยนแปลงที่ยังไม่บันทึก',
      text: "คุณต้องการละทิ้งการเปลี่ยนแปลงแล้วเปลี่ยนโมเดลใช่หรือไม่?",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'ใช่, เปลี่ยนเลย',
      cancelButtonText: 'ยกเลิก'
    }).then((result) => {
      if (result.isConfirmed) {
        fetchScorecard();
      } else {
        // Revert select back to activeType
        selectedModel.value = store.activeType;
      }
    });
  } else {
    fetchScorecard();
  }
};

const updateMatchArray = (rule, valString) => {
    rule.match = valString.split(',').map(s => s.trim()).filter(s => s);
};

const handleReset = () => {
   store.resetChanges();
};

const handleSave = async () => {
  if (!isWeightValid.value) {
      Swal.fire('ข้อผิดพลาด', `ผลรวมน้ำหนักต้องเท่ากับ ${expectedTotalWeight.value}`, 'error');
      return;
  }

  const success = await store.saveScorecard();

  if (success) {
    Swal.mixin({
      toast: true,
      position: 'top-end',
      timer: 2000,
      showConfirmButton: false
    }).fire({
      icon: 'success',
      title: 'บันทึกโมเดลสำเร็จ'
    });
  } else {
    Swal.fire('เกิดข้อผิดพลาด', store.error || 'ไม่สามารถบันทึกได้', 'error');
  }
};

// Lifecycle
onMounted(() => {
  fetchScorecard();
});
</script>

<style scoped>
.scorecard-management {
  background-color: #f8f9fa;
  border-radius: 8px;
}

.config-container {
  background: white;
  border-radius: 8px;
  overflow: hidden;
}

.config-header {
  padding: 24px;
  border-bottom: 1px solid #eaeaea;
  background-color: #fff;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-content h2 {
  margin: 0 0 8px 0;
  font-size: 24px;
  color: #2c3e50;
}

.header-content p {
  margin: 0;
  color: #6c757d;
  font-size: 14px;
}

.header-actions {
  display: flex;
  gap: 16px;
  align-items: center;
}

.model-select {
  padding: 10px 14px;
  border: 1px solid #dcdcdc;
  border-radius: 6px;
  font-size: 14px;
  background-color: #fcfcfc;
  cursor: pointer;
}

.validation-banner {
  padding: 16px 24px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid #eaeaea;
  font-size: 15px;
}

.validation-banner.is-valid {
  background-color: #e8f5e9;
  color: #2e7d32;
}

.validation-banner.is-invalid {
  background-color: #ffebee;
  color: #c62828;
}

.validation-warning {
  font-size: 13px;
  margin-left: 8px;
  font-weight: 500;
}

.scorecard-content {
  background-color: #f8f9fa;
  padding: 24px;
}

.component-card {
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  margin-bottom: 24px;
  overflow: hidden;
  box-shadow: 0 2px 4px rgba(0,0,0,0.02);
}

.component-header {
  background-color: #f1f3f5;
  padding: 16px 24px;
  border-bottom: 1px solid #e0e0e0;
}

.component-header h3 {
  margin: 0;
  font-size: 18px;
  color: #343a40;
}

.factors-list {
  padding: 0;
}

.factor-item {
  padding: 24px;
  border-bottom: 1px solid #eee;
}

.factor-item:last-child {
  border-bottom: none;
}

.factor-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 16px;
}

.factor-title h4 {
  margin: 0 0 4px 0;
  font-size: 16px;
  color: #212529;
}

.factor-key {
  font-size: 12px;
  color: #868e96;
  font-family: monospace;
  background: #f8f9fa;
  padding: 2px 6px;
  border-radius: 4px;
}

.factor-weight {
  display: flex;
  align-items: center;
  gap: 12px;
  background: #fdfdfd;
  padding: 10px 16px;
  border: 1px solid #e9ecef;
  border-radius: 6px;
}

.factor-weight label {
  font-weight: 600;
  color: #495057;
  font-size: 14px;
}

.form-control {
  padding: 8px 12px;
  border: 1px solid #ced4da;
  border-radius: 4px;
  font-size: 14px;
}

.form-control:focus {
  border-color: #80bdff;
  outline: 0;
}

.weight-input {
  width: 100px;
  text-align: center;
  font-weight: bold;
  color: #0d6efd;
}

.rules-container {
  overflow-x: auto;
}

.rules-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}

.rules-table th {
  text-align: left;
  padding: 10px;
  background-color: #f8f9fa;
  color: #495057;
  font-weight: 600;
  border-bottom: 2px solid #dee2e6;
}

.rules-table td {
  padding: 8px 10px;
  border-bottom: 1px solid #e9ecef;
  vertical-align: middle;
}

.num-input, .score-input {
  width: 80px;
  text-align: center;
}

.text-input {
  width: 100%;
  min-width: 150px;
}

.na-text {
  color: #adb5bd;
  display: block;
  text-align: center;
}

.badge.default {
  background-color: #6c757d;
  color: white;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 11px;
}

.btn {
  padding: 10px 20px;
  border-radius: 6px;
  font-weight: 500;
  cursor: pointer;
  border: none;
  transition: all 0.2s;
}

.btn-primary {
  background-color: #0d6efd;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background-color: #0b5ed7;
}

.btn-primary:disabled {
  background-color: #6c757d;
  cursor: not-allowed;
  opacity: 0.65;
}

.btn-secondary {
  background-color: #6c757d;
  color: white;
}

.btn-outline {
  background-color: transparent;
  border: 1px solid #ced4da;
  color: #495057;
  padding: 6px 12px;
  font-size: 13px;
}

.btn-outline:hover {
  background-color: #f8f9fa;
}

.loading-state, .error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 400px;
  color: #6c757d;
}

.spinner {
  border: 3px solid rgba(0,0,0,0.1);
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border-left-color: #09f;
  animation: spin 1s ease infinite;
  margin-bottom: 16px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.error-text {
  color: #dc3545;
  margin-bottom: 16px;
}
</style>
