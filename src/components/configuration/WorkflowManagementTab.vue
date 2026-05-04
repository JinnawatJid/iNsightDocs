<template>
  <div class="workflow-management-tab">
    <div v-if="loading" class="loading-state">
      <div class="spinner"></div>
      <p>กำลังโหลดข้อมูล Workflow...</p>
    </div>

    <div v-else-if="error" class="error-state">
      <p class="error-text">{{ error }}</p>
      <button class="btn btn-secondary" @click="fetchConfig">ลองใหม่</button>
    </div>

    <div v-else class="workflow-content">
      <div class="header-actions text-start">
        <div class="header-titles">
          <h3>การจัดการ Workflow State Machine</h3>
          <p class="subtitle">คลิกที่การ์ดเพื่อขยายและตั้งค่าสิทธิ์การเข้าถึงในแต่ละขั้นตอนการอนุมัติ</p>
        </div>
        <div class="action-buttons">
          <button class="btn btn-primary" @click="addNewState">
            + สร้างสถานะใหม่
          </button>
          <button class="btn btn-primary" :disabled="!hasChanges || isSaving" @click="handleSave">
            {{ isSaving ? 'กำลังบันทึก...' : 'บันทึกการเปลี่ยนแปลง' }}
          </button>
        </div>
      </div>

      <div class="accordion-container">
        <div v-if="statesList.length === 0" class="empty-state">
          ไม่มีข้อมูลสถานะ
        </div>

        <div 
          v-for="state in statesList" 
          :key="state.key"
          class="accordion-card"
          :class="{ 'expanded': expandedStateKey === state.key }"
        >
          <!-- Card Header (Summary) -->
          <div class="accordion-header" @click="toggleExpand(state.key)">
            <div class="header-left">
              <span class="status-badge" :class="state.type">{{ state.type }}</span>
              <div class="state-info">
                <span class="state-label">{{ state.label }}</span>
                <span class="system-key">{{ state.key }}</span>
              </div>
            </div>
            
            <div class="header-right">
              <div class="summary-info">
                <span class="summary-text" v-if="state.roles.length > 0">
                  {{ state.roles.length }} Role(s)
                </span>
                <span class="summary-text" v-if="state.transitions.length > 0">
                  {{ state.transitions.length }} Next Step(s)
                </span>
              </div>
              <span class="chevron" :class="{ 'open': expandedStateKey === state.key }">▼</span>
            </div>
          </div>

          <div class="accordion-body" v-if="expandedStateKey === state.key">
            <div class="form-grid">
              <div class="form-group">
                <label>รหัสอ้างอิงสถานะ</label>
                <input type="text" class="form-control" :value="state.key" disabled />
              </div>

              <div class="form-group">
                <label>ชื่อแสดงผล</label>
                <input type="text" class="form-control" v-model="state.label" @input="markAsChanged" />
              </div>

              <div class="form-group">
                <label>ประเภทสถานะ</label>
                <select class="form-select" v-model="state.type" @change="markAsChanged">
                  <option value="initial">เริ่มต้น</option>
                  <option value="active">ระหว่างดำเนินการ</option>
                  <option value="final">สิ้นสุด</option>
                </select>
              </div>
            </div>

            <div class="form-row mt-4">
              <div class="form-group flex-1">
                <label>ผู้ที่มีสิทธิ์จัดการ</label>
                <MultiSelectTag 
                  v-model="state.roles" 
                  :options="availableRoles" 
                  placeholder="พิมพ์เพื่อค้นหา..."
                  @update:modelValue="markAsChanged"
                />
              </div>

              <div class="form-group flex-1">
                <label>สถานะถัดไป</label>
                <MultiSelectTag 
                  v-model="state.transitions" 
                  :options="availableStatuses.filter(s => s !== state.key)" 
                  placeholder="เลือกสถานะถัดไป..."
                  @update:modelValue="markAsChanged"
                />
              </div>
            </div>
            
            <div class="action-footer mt-5">
              <button class="btn btn-outline-danger btn-sm custom-danger-btn" @click="deleteState(state.key)">
                ลบสถานะนี้
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import { useConfigStore } from '../../stores/config';
import Swal from 'sweetalert2';

import MultiSelectTag from '../shared/MultiSelectTag.vue';

const configStore = useConfigStore();
const configKey = 'WORKFLOW_CONFIG';
const rbacKey = 'RBAC_MATRIX_CONFIG';

const loading = ref(true);
const error = ref(null);
const isSaving = ref(false);
const hasChanges = ref(false);

const originalConfigStr = ref('');
const availableRoles = ref([]);

// State List
const statesList = ref([]);
const expandedStateKey = ref(null);

const availableStatuses = computed(() => {
  return statesList.value.map(s => s.key);
});

// Initialization
const fetchConfig = async () => {
  loading.value = true;
  error.value = null;

  try {
    if (!configStore.configurations || Object.keys(configStore.configurations).length === 0) {
      await configStore.fetchConfigurations();
    }

    let rbacConfig = null;
    if (configStore.configurations['UserRoles']) {
      const rbacObj = configStore.configurations['UserRoles'].find(c => c.config_key === rbacKey);
      if (rbacObj) {
        rbacConfig = JSON.parse(rbacObj.config_value);
        if (rbacConfig && rbacConfig.roles) {
          availableRoles.value = rbacConfig.roles;
        }
      }
    }

    let wfConfigObj = null;
    if (configStore.configurations['WorkflowMgmt']) {
       wfConfigObj = configStore.configurations['WorkflowMgmt'].find(c => c.config_key === configKey);
    }
    if (!wfConfigObj) {
       for (const cat in configStore.configurations) {
          const found = configStore.configurations[cat].find(c => c.config_key === configKey);
          if (found) {
             wfConfigObj = found;
             break;
          }
       }
    }

    if (wfConfigObj) {
      const parsed = JSON.parse(wfConfigObj.config_value);
      originalConfigStr.value = JSON.stringify(parsed);
      buildListFromConfig(parsed);
    } else {
      error.value = `ไม่พบการตั้งค่า ${configKey} ในระบบ`;
    }
  } catch (err) {
    console.error('Error fetching workflow config:', err);
    error.value = 'เกิดข้อผิดพลาดในการโหลดข้อมูล';
  } finally {
    loading.value = false;
  }
};

const buildListFromConfig = (config) => {
  const newList = [];
  Object.entries(config.states).forEach(([key, stateData]) => {
    newList.push({
      key: key,
      label: stateData.label,
      type: stateData.type,
      roles: [...stateData.actionableByRoles],
      transitions: [...stateData.allowedTransitions]
    });
  });
  
  // Custom sort: Initial -> Active -> Final
  const typeOrder = { 'initial': 1, 'active': 2, 'final': 3 };
  statesList.value = newList.sort((a, b) => typeOrder[a.type] - typeOrder[b.type]);
};

// Export to JSON Format
const exportListToConfig = () => {
  const states = {};
  statesList.value.forEach(state => {
    states[state.key] = {
      label: state.label,
      type: state.type,
      actionableByRoles: [...state.roles],
      allowedTransitions: [...state.transitions]
    };
  });
  return { states };
};

const markAsChanged = () => {
  const currentConfigStr = JSON.stringify(exportListToConfig());
  hasChanges.value = currentConfigStr !== originalConfigStr.value;
};

// Accordion Logic
const toggleExpand = (key) => {
  if (expandedStateKey.value === key) {
    expandedStateKey.value = null; // Close if already open
  } else {
    expandedStateKey.value = key; // Open the clicked one
  }
};

// Dynamic State Management
const addNewState = async () => {
  const { value: stateKey } = await Swal.fire({
    title: 'สร้างสถานะใหม่',
    input: 'text',
    inputLabel: 'ระบุ System Key (ภาษาอังกฤษ ตัวติดกัน เช่น PendingApproval)',
    inputPlaceholder: 'NewStateKey...',
    showCancelButton: true,
    inputValidator: (value) => {
      if (!value) return 'กรุณาระบุ System Key!';
      if (!/^[a-zA-Z0-9_]+$/.test(value)) return 'ใช้ได้เฉพาะตัวอักษร ตัวเลข และ _ เท่านั้น';
      if (statesList.value.find(s => s.key === value)) return 'Key นี้มีอยู่แล้ว!';
    }
  });

  if (stateKey) {
    statesList.value.push({
      key: stateKey,
      label: 'สถานะใหม่',
      type: 'active',
      roles: [],
      transitions: []
    });
    
    expandedStateKey.value = stateKey;
    markAsChanged();
  }
};

const deleteState = async (key) => {
  const result = await Swal.fire({
    title: 'ยืนยันการลบ?',
    text: `คุณต้องการลบสถานะ ${key} ใช่หรือไม่? สถานะอื่นๆ ที่อ้างอิงถึงจะถูกลบการเชื่อมต่อด้วย`,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#d33',
    confirmButtonText: 'ลบเลย',
    cancelButtonText: 'ยกเลิก'
  });

  if (result.isConfirmed) {
    statesList.value = statesList.value.filter(s => s.key !== key);
    
    // Remove from other states' allowedTransitions
    statesList.value.forEach(state => {
      state.transitions = state.transitions.filter(t => t !== key);
    });

    if (expandedStateKey.value === key) {
      expandedStateKey.value = null;
    }
    markAsChanged();
  }
};

// Save
const handleSave = async () => {
  isSaving.value = true;
  try {
    const currentConfig = exportListToConfig();
    const payload = [{
      config_key: configKey,
      config_value: JSON.stringify(currentConfig)
    }];

    const success = await configStore.updateConfigurations(payload);

    if (success) {
      originalConfigStr.value = JSON.stringify(currentConfig);
      hasChanges.value = false;
      Swal.mixin({
        toast: true, position: 'top-end', timer: 2000, showConfirmButton: false
      }).fire({ icon: 'success', title: 'บันทึก Workflow สำเร็จ' });
    } else {
      throw new Error("Update failed");
    }
  } catch (err) {
    Swal.fire('ข้อผิดพลาด', 'ไม่สามารถบันทึกข้อมูลได้', 'error');
  } finally {
    isSaving.value = false;
  }
};

onMounted(() => {
  fetchConfig();
});
</script>

<style scoped>
.workflow-management-tab {
  display: flex;
  flex-direction: column;
}

.header-actions {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 24px;
}

.text-start {
  text-align: left;
}

.header-titles {
  text-align: left;
}

.action-buttons {
  display: flex;
  gap: 16px;
}

.action-buttons .btn-primary {
  color: #ffffff;
}

.action-buttons .btn-outline-primary {
  color: #0d6efd;
}

.header-actions h3 {
  margin: 0 0 8px 0;
  font-size: 20px;
  color: inherit;
}

.subtitle {
  color: #adb5bd;
  font-size: 14px;
  margin: 0;
}

.accordion-container {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding-bottom: 40px;
}

.accordion-card {
  background-color: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  overflow: hidden;
  transition: all 0.2s ease;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.02);
}

.accordion-card:hover {
  border-color: #cbd5e1;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.04);
}

.accordion-card.expanded {
  border-color: #0d6efd;
  box-shadow: 0 0 0 1px #0d6efd, 0 4px 12px rgba(13, 110, 253, 0.08);
}

.accordion-header {
  padding: 16px 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
  user-select: none;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.state-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
  text-align: left;
  align-items: flex-start;
}

.state-label {
  font-size: 16px;
  font-weight: 600;
  color: #1e293b;
}

.system-key {
  font-family: monospace;
  font-size: 12px;
  color: #64748b;
}

.status-badge {
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  min-width: 80px;
  text-align: center;
}

/* Premium Light-mode badges */
.status-badge.initial { background-color: #e0f2fe; color: #0369a1; border: 1px solid #bae6fd; }
.status-badge.active { background-color: #fef3c7; color: #b45309; border: 1px solid #fde68a; }
.status-badge.final { background-color: #dcfce7; color: #15803d; border: 1px solid #bbf7d0; }

.header-right {
  display: flex;
  align-items: center;
  gap: 24px;
}

.summary-info {
  display: flex;
  gap: 16px;
}

.summary-text {
  font-size: 13px;
  color: #64748b;
  display: flex;
  align-items: center;
  gap: 6px;
}

.chevron {
  font-size: 12px;
  color: #adb5bd;
  transition: transform 0.3s ease;
}

.chevron.open {
  transform: rotate(180deg);
}

.accordion-body {
  padding: 24px;
  border-top: 1px solid #e2e8f0;
  background-color: #f8fafc;
}

.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 32px;
}

.form-row {
  display: flex;
  gap: 32px;
}

.flex-1 {
  flex: 1;
}

.mt-3 { margin-top: 20px; }
.mt-4 { margin-top: 32px; }

.form-group label {
  display: block;
  margin-bottom: 8px;
  font-size: 13px;
  font-weight: 600;
  color: #475569;
}

.form-control, .form-select {
  width: 100%;
  padding: 10px 14px;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  font-size: 14px;
  background-color: #ffffff;
  color: #1e293b;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}

.form-control:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.form-control:focus, .form-select:focus {
  outline: none;
  border-color: #0d6efd;
  box-shadow: 0 0 0 2px rgba(13, 110, 253, 0.25);
}

.action-footer {
  display: flex;
  justify-content: flex-end;
  padding-top: 24px;
  border-top: 1px dashed #cbd5e1;
}

.custom-danger-btn {
  color: #dc3545 !important;
  background-color: transparent !important;
  border-color: #dc3545 !important;
}

.custom-danger-btn:hover {
  background-color: #dc3545 !important;
  color: #ffffff !important;
}

.empty-state {
  text-align: center;
  padding: 40px;
  color: #64748b;
  border: 1px dashed #cbd5e1;
  border-radius: 8px;
  background-color: #f8fafc;
}

.loading-state, .error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 0;
}
</style>
