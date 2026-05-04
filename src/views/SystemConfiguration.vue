<template>
  <div>
    <Navbar />
    <div class="system-configuration">
      <div class="config-container">
        <div class="config-header">
          <h2>การตั้งค่าระบบ</h2>
          <p>จัดการการตั้งค่าและกฎเกณฑ์ต่างๆ ของระบบ</p>
        </div>

        <div class="config-body">
          <div v-if="configStore.isLoading" class="loading-state">
            <div class="spinner"></div>
            <p>กำลังโหลดการตั้งค่า...</p>
          </div>

          <div v-else-if="configStore.error" class="error-state">
            <p class="error-text">{{ configStore.error }}</p>
            <button class="btn btn-secondary" @click="fetchConfigs">ลองใหม่</button>
          </div>

          <div v-else class="layout-wrapper">
            <!-- Sidebar: Categories -->
            <div class="config-sidebar">
              <ul>
                <li
                  v-for="category in categories"
                  :key="category"
                  :class="{ active: activeCategory === category }"
                  @click="activeCategory = category"
                >
                  {{ getCategoryLabel(category) }}
                </li>
              </ul>
            </div>

            <!-- Content Pane: Configuration Inputs -->
            <div class="config-content">
              <ScorecardManagementTab v-if="activeCategory === 'Scorecards'" />
              <RoleManagementTab v-else-if="activeCategory === 'UserRoles'" />
              <WorkflowManagementTab v-else-if="activeCategory === 'WorkflowMgmt'" />
              <RegionManagementTab v-else-if="activeCategory === 'RegionMgmt'" />
              <div v-else class="config-items-container">
                <div class="content-header">
                  <div class="header-title">
                    <span class="icon-sliders">⚙️</span>
                    <h3>หมวดหมู่: {{ getCategoryLabel(activeCategory) }}</h3>
                  </div>
                  <button
                    class="btn btn-primary"
                    @click="handleSave"
                    :disabled="!hasChanges || isSaving"
                  >
                    {{ isSaving ? 'กำลังบันทึก...' : 'บันทึกการเปลี่ยนแปลง' }}
                  </button>
                </div>

                <div class="config-items">
                <div
                  v-for="item in currentCategoryConfigs"
                  :key="item.config_key"
                  class="config-card"
                >
                  <div class="config-info">
                    <label :for="item.config_key">{{ item.label || item.config_key }}</label>
                    <p class="config-key-subtitle">{{ item.config_key }}</p>
                    <p class="description">{{ item.description }}</p>
                    <p class="audit-info">
                      แก้ไขล่าสุดเมื่อ: {{ formatDateString(item.updated_at).toLocaleString('th-TH') }} โดย {{ item.updated_by }}
                    </p>
                  </div>

                  <div class="config-input">
                    <div v-if="item.data_type === 'number'">
                      <input
                        v-if="item.config_key === 'COMMITTEE_APPROVAL_THRESHOLD_THB'"
                        :id="item.config_key"
                        type="text"
                        :value="formatConfigNumber(editState[item.config_key])"
                        @input="(e) => handleNumberInput(item.config_key, e.target.value)"
                        class="form-control"
                      />
                      <input
                        v-else
                        :id="item.config_key"
                        type="number"
                        v-model="editState[item.config_key]"
                        @input="markAsChanged"
                        class="form-control"
                      />
                    </div>
                    <div v-else-if="item.data_type === 'boolean'" class="toggle-switch">
                      <input
                        :id="item.config_key"
                        type="checkbox"
                        :checked="editState[item.config_key] === 'true' || editState[item.config_key] === true"
                        @change="(e) => handleBooleanChange(item.config_key, e.target.checked)"
                      />
                      <label :for="item.config_key" class="slider round"></label>
                    </div>
                    <input
                      v-else
                      :id="item.config_key"
                      type="text"
                      v-model="editState[item.config_key]"
                      @input="markAsChanged"
                      class="form-control"
                    />
                  </div>
                </div>

                <div v-if="currentCategoryConfigs.length === 0" class="empty-state">
                  ไม่พบการตั้งค่าในหมวดหมู่นี้
                </div>
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
import { useConfigStore } from '../stores/config';
import { formatDateString } from '../utils/dateUtils';
import ScorecardManagementTab from '../components/configuration/ScorecardManagementTab.vue';
import RoleManagementTab from '../components/configuration/RoleManagementTab.vue';
import WorkflowManagementTab from '../components/configuration/WorkflowManagementTab.vue';
import RegionManagementTab from '../components/configuration/RegionManagementTab.vue';
import Navbar from '@/components/shared/Navbar.vue';
import Swal from 'sweetalert2';

// State
const configStore = useConfigStore();
const activeCategory = ref('');
const editState = ref({});
const hasChanges = ref(false);
const isSaving = ref(false);

// Dictionaries
const categoryLabels = {
  'System': 'การตั้งค่าระบบ',
  'Workflow': 'การตั้งค่าขั้นตอนอื่นๆ',
  'WorkflowMgmt': 'จัดการ Workflow',
  'RegionMgmt': 'จัดการพื้นที่และสาขา',
  'API': 'การเชื่อมต่อระบบ',
  'Business': 'กฎเกณฑ์ธุรกิจ',
  'Scorecards': 'โมเดลให้คะแนน',
  'UserRoles': 'จัดการสิทธิ์ผู้ใช้งาน'
};

const getCategoryLabel = (category) => {
  return categoryLabels[category] || category;
};

// Computed
const categories = computed(() => {
  const order = ['System', 'UserRoles', 'WorkflowMgmt', 'RegionMgmt', 'Scorecards'];
  
  if (!configStore.configurations) return order;
  
  const dbCategories = Object.keys(configStore.configurations);
  const allCategories = new Set(dbCategories);
  allCategories.add('Scorecards');
  allCategories.add('WorkflowMgmt');
  allCategories.add('RegionMgmt');
  allCategories.add('UserRoles');
  allCategories.add('System');
  
  // Hide Workflow category (การตั้งค่าขั้นตอนอื่นๆ)
  allCategories.delete('Workflow');
  
  return Array.from(allCategories).sort((a, b) => {
    const indexA = order.indexOf(a);
    const indexB = order.indexOf(b);
    
    if (indexA !== -1 && indexB !== -1) return indexA - indexB;
    if (indexA !== -1) return -1;
    if (indexB !== -1) return 1;
    return a.localeCompare(b);
  });
});

const currentCategoryConfigs = computed(() => {
  if (!activeCategory.value || !configStore.configurations[activeCategory.value]) {
    return [];
  }
  
  const hiddenSettings = [
    'ระยะเวลาจัดเก็บประวัติระบบ (วัน)',
    'โหมดปิดปรับปรุงระบบ',
    'จำนวนรายการต่อหน้า (ค่าเริ่มต้น)',
    'เปิดใช้งานระบบประมวลผลอัตโนมัติ (Batch)'
  ];

  return configStore.configurations[activeCategory.value].filter(c => {
    if (c.data_type === 'json') return false;
    
    const displayLabel = c.label || c.config_key;
    if (hiddenSettings.includes(displayLabel)) return false;
    
    return true;
  });
});

// Methods
const fetchConfigs = async () => {
  await configStore.fetchConfigurations();

  if (configStore.configurations) {
    // Initialize edit state
    const newState = {};
    Object.values(configStore.configurations).forEach(categoryGroup => {
      categoryGroup.forEach(config => {
        newState[config.config_key] = config.config_value;
      });
    });
    editState.value = newState;
    hasChanges.value = false;

    // Set default active category if none selected
    if (!activeCategory.value && categories.value.length > 0) {
      activeCategory.value = categories.value[0];
    }
  }
};

const markAsChanged = () => {
  hasChanges.value = true;
};

const handleBooleanChange = (key, isChecked) => {
  editState.value[key] = isChecked ? 'true' : 'false';
  markAsChanged();
};

const handleSave = async () => {
  if (!hasChanges.value) return;

  isSaving.value = true;

  // Extract only the fields that were modified compared to original store state
  const payload = [];
  Object.values(configStore.configurations).forEach(categoryGroup => {
    categoryGroup.forEach(originalConfig => {
      const currentVal = String(editState.value[originalConfig.config_key]);
      const originalVal = String(originalConfig.config_value);

      if (currentVal !== originalVal) {
        payload.push({
          config_key: originalConfig.config_key,
          config_value: currentVal
        });
      }
    });
  });

  if (payload.length > 0) {
    const success = await configStore.updateConfigurations(payload);

    if (success) {
      hasChanges.value = false;
      Swal.mixin({
        toast: true,
        position: 'top-end',
        timer: 2000,
        showConfirmButton: false
      }).fire({
        icon: 'success',
        title: 'บันทึกการตั้งค่าสำเร็จ'
      });

      // Sync editState back from store to ensure parity
      fetchConfigs();
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
  }

  isSaving.value = false;
};

// Lifecycle
onMounted(async () => {
  await fetchConfigs();
});

// Helpers for formatted numeric inputs
const formatConfigNumber = (raw) => {
  if (raw === null || raw === undefined || raw === '') return '';
  const parsed = String(raw).replace(/,/g, '');
  const n = Number(parsed);
  if (!Number.isFinite(n)) return raw;
  return n.toLocaleString('th-TH');
};

const handleNumberInput = (key, val) => {
  // keep only digits
  const onlyDigits = String(val).replace(/[^0-9]/g, '');
  editState.value[key] = onlyDigits;
  markAsChanged();
};
</script>

<style scoped>
.system-configuration {
  padding: 100px 20px 20px 20px;
  background-color: #f8f9fa;
  min-height: 100vh;
}

.config-container {
  max-width: 1200px;
  margin: 0 auto;
  background: white;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.05);
  overflow: hidden;
}

.config-header {
  padding: 24px;
  border-bottom: 1px solid #eaeaea;
  background-color: #fff;
  text-align: left;
}

.config-header h2 {
  margin: 0 0 8px 0;
  font-size: 24px;
  color: #2c3e50;
}

.config-header p {
  margin: 0;
  color: #6c757d;
  font-size: 14px;
}

.config-body {
  min-height: 500px;
}

.layout-wrapper {
  display: flex;
  min-height: 500px;
}

.config-sidebar {
  width: 250px;
  background-color: #fdfdfd;
  border-right: 1px solid #eaeaea;
  padding: 16px 0;
}

.config-sidebar ul {
  list-style: none;
  padding: 0;
  margin: 0;
  text-align: left;
}

.config-sidebar li {
  padding: 12px 24px;
  cursor: pointer;
  color: #495057;
  font-weight: 500;
  transition: all 0.2s;
  border-left: 3px solid transparent;
}

.config-sidebar li:hover {
  background-color: #f1f3f5;
}

.config-sidebar li.active {
  background-color: #e9ecef;
  color: #0d6efd;
  border-left-color: #0d6efd;
}

.config-content {
  flex: 1;
  min-width: 0;
  padding: 24px;
  background-color: #fff;
}

.content-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  padding-bottom: 12px;
  border-bottom: 1px solid #f0f0f0;
}

.header-title {
  display: flex;
  align-items: center;
  gap: 10px;
}

.header-title .icon-sliders {
  font-size: 20px;
}

.content-header h3 {
  margin: 0;
  color: #2c3e50;
  font-size: 20px;
  font-weight: 600;
}

.config-items {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.config-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border: 1px solid #eaeaea;
  border-radius: 8px;
  background-color: #fcfcfc;
  transition: all 0.2s ease;
  box-shadow: 0 1px 3px rgba(0,0,0,0.02);
}

.config-card:hover {
  border-color: #dcdcdc;
  background-color: #fff;
  box-shadow: 0 2px 6px rgba(0,0,0,0.04);
}

.config-info {
  flex: 1;
  padding-right: 32px;
  text-align: left;
}

.config-info label {
  display: block;
  font-weight: 600;
  color: #2c3e50;
  margin-bottom: 2px;
  font-size: 15px;
  letter-spacing: 0.3px;
}

.config-info .config-key-subtitle {
  margin: 0 0 6px 0;
  color: #adb5bd;
  font-size: 11px;
  font-family: monospace;
}

.config-info .description {
  margin: 0 0 8px 0;
  color: #6c757d;
  font-size: 13px;
  line-height: 1.5;
}

.config-info .audit-info {
  margin: 0;
  color: #adb5bd;
  font-size: 11px;
}

.config-input {
  flex: 0 0 240px;
  display: flex;
  justify-content: flex-end;
  align-items: center;
}

.form-control {
  width: 100%;
  padding: 10px 14px;
  border: 1px solid #dcdcdc;
  border-radius: 6px;
  font-size: 14px;
  transition: all 0.2s;
  background-color: #fff;
}

.form-control[type="number"] {
  text-align: center;
  font-family: monospace;
  font-size: 15px;
  letter-spacing: 1px;
}

.form-control:focus {
  border-color: #86b7fe;
  outline: 0;
  box-shadow: 0 0 0 0.25rem rgba(13, 110, 253, 0.25);
}

.btn {
  padding: 8px 16px;
  border-radius: 4px;
  font-weight: 500;
  cursor: pointer;
  border: none;
  transition: background-color 0.2s;
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

.loading-state, .error-state, .empty-state {
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

/* Toggle Switch Styles */
.toggle-switch {
  position: relative;
  display: inline-block;
  width: 46px;
  height: 24px;
}

.toggle-switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: #ccc;
  transition: .4s;
}

.slider:before {
  position: absolute;
  content: "";
  height: 18px;
  width: 18px;
  left: 3px;
  bottom: 3px;
  background-color: white;
  transition: .4s;
}

input:checked + .slider {
  background-color: #2196F3;
}

input:checked + .slider:before {
  transform: translateX(22px);
}

.slider.round {
  border-radius: 24px;
}

.slider.round:before {
  border-radius: 50%;
}

.formatted-helper {
  margin-top: 8px;
  font-size: 13px;
  color: #495057;
  text-align: center;
}
</style>
