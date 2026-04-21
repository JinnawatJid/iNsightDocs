<template>
  <div class="role-management-tab">
    <div class="content-header">
      <div class="header-title">
        <div class="header-content">
          <h3>การจัดการสิทธิ์และผู้ใช้งาน (RBAC Matrix)</h3>
          <p>กำหนดสิทธิ์การเข้าถึงและการทำงานของแต่ละบทบาท</p>
        </div>
      </div>
      <div class="header-actions">
        <button
          class="btn btn-outline"
          @click="handleReset"
          :disabled="!hasChanges || isSaving"
        >
          รีเซ็ต
        </button>
        <button
          class="btn btn-primary"
          @click="handleSave"
          :disabled="!hasChanges || isSaving"
        >
          {{ isSaving ? 'กำลังบันทึก...' : 'บันทึก Matrix' }}
        </button>
      </div>
    </div>

    <div v-if="isLoading" class="loading-state">
      <div class="spinner"></div>
      <p>กำลังโหลดข้อมูล...</p>
    </div>

    <div v-else-if="error" class="error-state">
      <p class="error-text">{{ error }}</p>
      <button class="btn btn-primary" @click="fetchConfig">ลองใหม่</button>
    </div>

    <div v-else class="matrix-container">
      <div class="table-responsive">
        <table class="matrix-table">
          <thead>
            <tr>
              <th class="sticky-col permission-col">สิทธิ์การใช้งาน (Permissions)</th>
              <th v-for="role in matrixData.roles" :key="role" class="role-col">
                {{ role }}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="permission in matrixData.permissions" :key="permission.key">
              <td class="sticky-col permission-col">
                <div class="permission-label">
                  <span class="label-text">{{ permission.label }}</span>
                  <span class="key-text">{{ permission.key }}</span>
                </div>
              </td>
              <td v-for="role in matrixData.roles" :key="`${role}-${permission.key}`" class="checkbox-cell">
                <div class="custom-checkbox">
                  <input
                    type="checkbox"
                    :id="`${role}-${permission.key}`"
                    :checked="hasPermission(role, permission.key)"
                    @change="(e) => togglePermission(role, permission.key, e.target.checked)"
                  />
                  <label :for="`${role}-${permission.key}`"></label>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useConfigStore } from '../../stores/config';
import Swal from 'sweetalert2';

const configStore = useConfigStore();
const isLoading = ref(false);
const error = ref(null);
const isSaving = ref(false);
const hasChanges = ref(false);

const originalData = ref(null);
const matrixData = ref({
  roles: [],
  permissions: [],
  matrix: {}
});

const rbacConfigKey = 'RBAC_MATRIX_CONFIG';

const fetchConfig = async () => {
  isLoading.value = true;
  error.value = null;

  try {
    if (!configStore.configurations || Object.keys(configStore.configurations).length === 0) {
      await configStore.fetchConfigurations();
    }

    // Find the config in the 'UserRoles' category
    const userRolesConfigs = configStore.configurations['UserRoles'] || [];
    const rbacConfig = userRolesConfigs.find(c => c.config_key === rbacConfigKey);

    if (rbacConfig && rbacConfig.config_value) {
      try {
        const parsed = JSON.parse(rbacConfig.config_value);
        originalData.value = JSON.parse(JSON.stringify(parsed)); // Deep copy
        matrixData.value = JSON.parse(JSON.stringify(parsed)); // Deep copy
      } catch (e) {
        error.value = 'ข้อมูล Matrix มีรูปแบบไม่ถูกต้อง (Invalid JSON)';
      }
    } else {
      error.value = 'ไม่พบการตั้งค่า RBAC_MATRIX_CONFIG ในระบบ';
    }
  } catch (err) {
    error.value = 'เกิดข้อผิดพลาดในการโหลดข้อมูล';
    console.error(err);
  } finally {
    isLoading.value = false;
    hasChanges.value = false;
  }
};

const hasPermission = (role, permissionKey) => {
  return matrixData.value.matrix[role] && matrixData.value.matrix[role].includes(permissionKey);
};

const togglePermission = (role, permissionKey, isChecked) => {
  if (!matrixData.value.matrix[role]) {
    matrixData.value.matrix[role] = [];
  }

  if (isChecked) {
    if (!matrixData.value.matrix[role].includes(permissionKey)) {
      matrixData.value.matrix[role].push(permissionKey);
    }
  } else {
    matrixData.value.matrix[role] = matrixData.value.matrix[role].filter(k => k !== permissionKey);
  }

  hasChanges.value = true;
};

const handleReset = () => {
  if (originalData.value) {
    matrixData.value = JSON.parse(JSON.stringify(originalData.value));
    hasChanges.value = false;
  }
};

const handleSave = async () => {
  isSaving.value = true;

  const payload = [
    {
      config_key: rbacConfigKey,
      config_value: JSON.stringify(matrixData.value)
    }
  ];

  const success = await configStore.updateConfigurations(payload);

  if (success) {
    hasChanges.value = false;
    originalData.value = JSON.parse(JSON.stringify(matrixData.value));
    Swal.mixin({
      toast: true,
      position: 'top-end',
      timer: 2000,
      showConfirmButton: false
    }).fire({
      icon: 'success',
      title: 'บันทึก Matrix สำเร็จ'
    });
  } else {
    Swal.mixin({
      toast: true,
      position: 'top-end',
      timer: 3000,
      showConfirmButton: false
    }).fire({
      icon: 'error',
      title: 'เกิดข้อผิดพลาดในการบันทึก'
    });
  }

  isSaving.value = false;
};

onMounted(() => {
  fetchConfig();
});
</script>

<style scoped>
.role-management-tab {
  width: 100%;
}

.content-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  padding-bottom: 12px;
  border-bottom: 1px solid #f0f0f0;
}

.header-content h3 {
  margin: 0 0 4px 0;
  font-size: 20px;
  color: #2c3e50;
  font-weight: 600;
  text-align: left;
}

.header-content p {
  margin: 0;
  color: #6c757d;
  font-size: 13px;
  text-align: left;
}

.header-actions {
  display: flex;
  gap: 12px;
  align-items: center;
}

.matrix-container {
  background-color: #fff;
  border: 1px solid #eaeaea;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.02);
  overflow: hidden;
}

.table-responsive {
  overflow-x: auto;
  max-width: 100%;
}

.matrix-table {
  width: 100%;
  border-collapse: collapse;
  min-width: 800px;
}

.matrix-table th,
.matrix-table td {
  padding: 12px 16px;
  border-bottom: 1px solid #eaeaea;
  border-right: 1px solid #eaeaea;
  vertical-align: middle;
}

.matrix-table th {
  background-color: #f8f9fa;
  color: #495057;
  font-weight: 600;
  font-size: 14px;
  text-align: center;
}

.matrix-table tbody tr:hover {
  background-color: #fdfdfd;
}

.sticky-col {
  position: sticky;
  left: 0;
  background-color: #fff;
  z-index: 1;
}

.matrix-table th.sticky-col {
  background-color: #f8f9fa;
  z-index: 2;
}

.permission-col {
  width: 250px;
  min-width: 250px;
  text-align: left !important;
}

.role-col {
  width: 150px;
  min-width: 150px;
}

.permission-label {
  display: flex;
  flex-direction: column;
  gap: 4px;
  text-align: left;
}

.label-text {
  font-weight: 500;
  color: #2c3e50;
  font-size: 14px;
}

.key-text {
  font-size: 11px;
  color: #868e96;
  font-family: monospace;
}

.checkbox-cell {
  text-align: center;
}

/* Custom Checkbox Styles */
.custom-checkbox {
  display: inline-block;
  position: relative;
}

.custom-checkbox input[type="checkbox"] {
  opacity: 0;
  position: absolute;
  z-index: -1;
}

.custom-checkbox label {
  position: relative;
  display: inline-block;
  width: 20px;
  height: 20px;
  background-color: #fff;
  border: 2px solid #ced4da;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
}

.custom-checkbox input[type="checkbox"]:checked + label {
  background-color: #0d6efd;
  border-color: #0d6efd;
}

.custom-checkbox input[type="checkbox"]:checked + label::after {
  content: '';
  position: absolute;
  left: 5px;
  top: 1px;
  width: 6px;
  height: 11px;
  border: solid white;
  border-width: 0 2px 2px 0;
  transform: rotate(45deg);
}

.btn {
  padding: 8px 16px;
  border-radius: 4px;
  font-weight: 500;
  cursor: pointer;
  border: none;
  transition: all 0.2s;
  font-size: 13px;
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

.btn-outline {
  background-color: transparent;
  border: 1px solid #ced4da;
  color: #495057;
}

.btn-outline:hover:not(:disabled) {
  background-color: #f8f9fa;
}

.loading-state, .error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 300px;
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
