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
      <div class="header-actions">
        <h3>การจัดการ Workflow State Machine</h3>
        <button class="btn btn-primary" :disabled="!hasChanges || isSaving" @click="handleSave">
          {{ isSaving ? 'กำลังบันทึก...' : 'บันทึกการเปลี่ยนแปลง' }}
        </button>
      </div>

      <p class="subtitle">ตั้งค่าสถานะและสิทธิ์การเข้าถึงในแต่ละขั้นตอนการอนุมัติ</p>

      <div class="states-list">
        <div v-for="(stateData, stateKey) in workflowConfig.states" :key="stateKey" class="state-card">
          <div class="state-header">
            <div class="state-title">
              <span class="status-badge" :class="stateData.type">{{ stateData.type }}</span>
              <h4>{{ stateData.label }}</h4>
              <span class="state-key">({{ stateKey }})</span>
            </div>
          </div>

          <div class="state-body">
            <div class="config-row">
              <label>ผู้ที่มีสิทธิ์จัดการ (Roles)</label>
              <div class="tags-input-container">
                <div class="tags-list">
                  <span v-for="(role, index) in stateData.actionableByRoles" :key="index" class="tag role-tag">
                    {{ role }}
                    <button class="remove-tag" @click="removeRole(stateKey, index)">&times;</button>
                  </span>
                </div>
                <div class="add-tag-form">
                  <select v-model="newRoles[stateKey]" class="form-select">
                    <option value="" disabled>เพิ่ม Role...</option>
                    <option v-for="role in availableRoles" :key="role" :value="role" :disabled="stateData.actionableByRoles.includes(role)">
                      {{ role }}
                    </option>
                  </select>
                  <button class="btn btn-sm btn-outline-primary" @click="addRole(stateKey)" :disabled="!newRoles[stateKey]">เพิ่ม</button>
                </div>
              </div>
            </div>

            <div class="config-row">
              <label>สถานะถัดไปที่อนุญาต (Allowed Transitions)</label>
              <div class="tags-input-container">
                <div class="tags-list">
                  <span v-for="(transition, index) in stateData.allowedTransitions" :key="index" class="tag transition-tag">
                    {{ getStatusLabel(transition) }}
                    <button class="remove-tag" @click="removeTransition(stateKey, index)">&times;</button>
                  </span>
                </div>
                <div class="add-tag-form">
                  <select v-model="newTransitions[stateKey]" class="form-select">
                    <option value="" disabled>เพิ่ม สถานะถัดไป...</option>
                    <option v-for="status in availableStatuses" :key="status" :value="status" :disabled="stateData.allowedTransitions.includes(status) || status === stateKey">
                      {{ getStatusLabel(status) }}
                    </option>
                  </select>
                  <button class="btn btn-sm btn-outline-primary" @click="addTransition(stateKey)" :disabled="!newTransitions[stateKey]">เพิ่ม</button>
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
import { ref, onMounted, computed } from 'vue';
import { useConfigStore } from '../../stores/config';
import Swal from 'sweetalert2';

const configStore = useConfigStore();
const configKey = 'WORKFLOW_CONFIG';
const rbacKey = 'RBAC_MATRIX_CONFIG';

const loading = ref(true);
const error = ref(null);
const isSaving = ref(false);
const hasChanges = ref(false);

const workflowConfig = ref({ states: {} });
const originalConfigStr = ref('');

const newRoles = ref({});
const newTransitions = ref({});

const availableRoles = ref([]);

const availableStatuses = computed(() => {
  return Object.keys(workflowConfig.value.states || {});
});

const getStatusLabel = (statusKey) => {
  if (workflowConfig.value.states && workflowConfig.value.states[statusKey]) {
    return workflowConfig.value.states[statusKey].label;
  }
  return statusKey;
};

const fetchConfig = async () => {
  loading.value = true;
  error.value = null;

  try {
    if (!configStore.configurations || Object.keys(configStore.configurations).length === 0) {
      await configStore.fetchConfigurations();
    }

    // Extract available roles from RBAC
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

    // Extract workflow config
    let wfConfigObj = null;
    if (configStore.configurations['Workflow']) {
       wfConfigObj = configStore.configurations['Workflow'].find(c => c.config_key === configKey);
    }
    // Check other categories if not found in Workflow directly
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
      workflowConfig.value = parsed;
      originalConfigStr.value = JSON.stringify(parsed);

      // Initialize temp inputs
      Object.keys(parsed.states).forEach(key => {
        newRoles.value[key] = '';
        newTransitions.value[key] = '';
      });
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

const markAsChanged = () => {
  hasChanges.value = JSON.stringify(workflowConfig.value) !== originalConfigStr.value;
};

const addRole = (stateKey) => {
  const role = newRoles.value[stateKey];
  if (role && !workflowConfig.value.states[stateKey].actionableByRoles.includes(role)) {
    workflowConfig.value.states[stateKey].actionableByRoles.push(role);
    newRoles.value[stateKey] = '';
    markAsChanged();
  }
};

const removeRole = (stateKey, index) => {
  workflowConfig.value.states[stateKey].actionableByRoles.splice(index, 1);
  markAsChanged();
};

const addTransition = (stateKey) => {
  const transition = newTransitions.value[stateKey];
  if (transition && !workflowConfig.value.states[stateKey].allowedTransitions.includes(transition)) {
    workflowConfig.value.states[stateKey].allowedTransitions.push(transition);
    newTransitions.value[stateKey] = '';
    markAsChanged();
  }
};

const removeTransition = (stateKey, index) => {
  workflowConfig.value.states[stateKey].allowedTransitions.splice(index, 1);
  markAsChanged();
};

const handleSave = async () => {
  isSaving.value = true;

  try {
    const payload = [{
      config_key: configKey,
      config_value: JSON.stringify(workflowConfig.value)
    }];

    const success = await configStore.updateConfigurations(payload);

    if (success) {
      originalConfigStr.value = JSON.stringify(workflowConfig.value);
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
  padding: 10px;
}

.header-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 5px;
}

.header-actions h3 {
  margin: 0;
  font-size: 18px;
  color: #2c3e50;
}

.subtitle {
  color: #6c757d;
  font-size: 14px;
  margin-bottom: 20px;
  text-align: left;
}

.states-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.state-card {
  border: 1px solid #eaeaea;
  border-radius: 8px;
  background-color: #fcfcfc;
  overflow: hidden;
}

.state-header {
  padding: 12px 16px;
  background-color: #f8f9fa;
  border-bottom: 1px solid #eaeaea;
}

.state-title {
  display: flex;
  align-items: center;
  gap: 10px;
}

.state-title h4 {
  margin: 0;
  font-size: 16px;
  color: #2c3e50;
}

.state-key {
  color: #adb5bd;
  font-size: 12px;
  font-family: monospace;
}

.status-badge {
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
}

.status-badge.initial { background-color: #e3f2fd; color: #1976d2; }
.status-badge.active { background-color: #fff3e0; color: #f57c00; }
.status-badge.final { background-color: #e8f5e9; color: #388e3c; }

.state-body {
  padding: 16px;
}

.config-row {
  margin-bottom: 16px;
  text-align: left;
}

.config-row:last-child {
  margin-bottom: 0;
}

.config-row label {
  display: block;
  font-weight: 600;
  color: #495057;
  margin-bottom: 8px;
  font-size: 14px;
}

.tags-input-container {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.tags-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  min-height: 28px;
}

.tag {
  display: inline-flex;
  align-items: center;
  padding: 4px 10px;
  border-radius: 16px;
  font-size: 13px;
  background-color: #e9ecef;
  color: #495057;
}

.tag.role-tag {
  background-color: #e3f2fd;
  color: #0d47a1;
  border: 1px solid #bbdefb;
}

.tag.transition-tag {
  background-color: #f3e5f5;
  color: #4a148c;
  border: 1px solid #e1bee7;
}

.remove-tag {
  background: none;
  border: none;
  color: inherit;
  font-size: 16px;
  line-height: 1;
  margin-left: 6px;
  cursor: pointer;
  padding: 0 2px;
  opacity: 0.6;
}

.remove-tag:hover {
  opacity: 1;
}

.add-tag-form {
  display: flex;
  gap: 8px;
  align-items: center;
  max-width: 400px;
}

.form-select {
  flex: 1;
  padding: 6px 12px;
  border: 1px solid #ced4da;
  border-radius: 4px;
  font-size: 13px;
}

.btn-sm {
  padding: 4px 12px;
  font-size: 13px;
}

.btn-outline-primary {
  color: #0d6efd;
  border: 1px solid #0d6efd;
  background: transparent;
}

.btn-outline-primary:hover:not(:disabled) {
  background-color: #0d6efd;
  color: white;
}

.btn-outline-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.loading-state, .error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 200px;
}
</style>
