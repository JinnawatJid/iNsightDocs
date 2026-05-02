<template>
  <div class="region-management-tab">
    <div class="content-header">
      <div class="header-title">
        <div class="header-content">
          <h3>จัดการสาขาตามพื้นที่ (Region Management)</h3>
          <p>กำหนดการจับคู่ระหว่างพื้นที่ (Region) และรหัสสาขา/โซน (Branches/Zones)</p>
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
          {{ isSaving ? 'กำลังบันทึก...' : 'บันทึกการเปลี่ยนแปลง' }}
        </button>
      </div>
    </div>

    <div v-if="isLoading" class="loading-state">
      <div class="spinner"></div>
      <p>กำลังโหลดข้อมูล...</p>
    </div>

    <div v-else-if="error" class="error-state">
      <p class="error-text">{{ error }}</p>
      <button class="btn btn-primary" @click="loadConfig">ลองใหม่</button>
    </div>

    <div v-else class="content-body">
      <div class="action-bar mb-3">
         <button class="btn btn-primary btn-sm" @click="addRegion">
            + เพิ่มพื้นที่ใหม่ (Add Region)
         </button>
      </div>

      <div v-for="(region, rIndex) in regionsData" :key="rIndex" class="region-card">
        <div class="region-header">
          <div class="region-title-input">
            <label class="form-label mb-0 fw-bold">ชื่อพื้นที่ (Region Name):</label>
            <input
              v-model="region.region"
              class="form-control"
              placeholder="เช่น กทม (Metro)"
              @input="markAsChanged"
            />
          </div>
          <button class="btn btn-outline-danger btn-sm" @click="removeRegion(rIndex)">
            ลบพื้นที่นี้
          </button>
        </div>

        <div class="zones-container">
          <p class="section-subtitle">สาขาที่อยู่ภายใต้พื้นที่นี้ (Branches/Zones):</p>
          <div class="table-responsive">
            <table class="table zones-table">
              <thead>
                <tr>
                  <th style="width: 30%">รหัสสาขา (Code)</th>
                  <th style="width: 50%">ชื่อสาขา (Name)</th>
                  <th style="width: 20%" class="text-center">จัดการ</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(zone, zIndex) in region.zones" :key="zIndex">
                  <td>
                    <input v-model="zone.code" class="form-control form-control-sm" placeholder="เช่น TR" @input="markAsChanged" />
                  </td>
                  <td>
                    <input v-model="zone.name" class="form-control form-control-sm" placeholder="เช่น พระราม 2" @input="markAsChanged" />
                  </td>
                  <td class="text-center">
                    <button class="btn btn-outline-danger btn-sm" @click="removeZone(rIndex, zIndex)">ลบ</button>
                  </td>
                </tr>
                <tr v-if="!region.zones || region.zones.length === 0">
                  <td colspan="3" class="text-center empty-state">ยังไม่มีสาขาในพื้นที่นี้ กรุณากดเพิ่มสาขา</td>
                </tr>
              </tbody>
            </table>
          </div>
          <button class="btn btn-outline-secondary btn-sm mt-2" @click="addZone(rIndex)">
            + เพิ่มสาขาในพื้นที่นี้
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useConfigStore } from '@/stores/config';
import Swal from 'sweetalert2';

const configStore = useConfigStore();
const isLoading = ref(true);
const error = ref(null);
const isSaving = ref(false);
const hasChanges = ref(false);

const originalData = ref([]);
const regionsData = ref([]);

const loadConfig = async () => {
  isLoading.value = true;
  error.value = null;

  try {
    if (!configStore.configurations || Object.keys(configStore.configurations).length === 0) {
      await configStore.fetchConfigurations();
    }

    const sysConfigs = configStore.configurations['System'] || [];
    const regionConfig = sysConfigs.find(c => c.config_key === 'REGION_BRANCH_CONFIG');

    if (regionConfig && regionConfig.config_value) {
      try {
        const parsed = JSON.parse(regionConfig.config_value);
        originalData.value = JSON.parse(JSON.stringify(parsed));
        regionsData.value = JSON.parse(JSON.stringify(parsed));
      } catch (e) {
        console.error("Failed to parse REGION_BRANCH_CONFIG", e);
        error.value = 'ข้อมูลพื้นที่ไม่ถูกต้อง (Invalid JSON)';
        originalData.value = [];
        regionsData.value = [];
      }
    } else {
      originalData.value = [];
      regionsData.value = [];
    }
  } catch (err) {
    error.value = 'เกิดข้อผิดพลาดในการโหลดข้อมูล';
    console.error(err);
  } finally {
    hasChanges.value = false;
    isLoading.value = false;
  }
};

onMounted(() => {
  loadConfig();
});

const markAsChanged = () => {
  hasChanges.value = true;
};

const handleReset = () => {
  if (originalData.value) {
    regionsData.value = JSON.parse(JSON.stringify(originalData.value));
    hasChanges.value = false;
  }
};

const addRegion = () => {
  regionsData.value.unshift({
    region: "พื้นที่ใหม่",
    zones: [{ code: "", name: "" }]
  });
  markAsChanged();
};

const removeRegion = (index) => {
  Swal.fire({
    title: 'ยืนยันการลบพื้นที่?',
    text: "คุณต้องการลบพื้นที่นี้และสาขาทั้งหมดในพื้นที่นี้ใช่หรือไม่?",
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#dc3545',
    cancelButtonColor: '#6c757d',
    confirmButtonText: 'ใช่, ลบข้อมูล',
    cancelButtonText: 'ยกเลิก'
  }).then((result) => {
    if (result.isConfirmed) {
      regionsData.value.splice(index, 1);
      markAsChanged();
    }
  });
};

const addZone = (rIndex) => {
  if (!regionsData.value[rIndex].zones) {
    regionsData.value[rIndex].zones = [];
  }
  regionsData.value[rIndex].zones.push({ code: "", name: "" });
  markAsChanged();
};

const removeZone = (rIndex, zIndex) => {
  regionsData.value[rIndex].zones.splice(zIndex, 1);
  markAsChanged();
};

const handleSave = async () => {
  if (!hasChanges.value) return;

  isSaving.value = true;

  // Clean empty zones before saving
  const cleanData = regionsData.value.map(r => ({
      region: r.region.trim(),
      zones: (r.zones || []).filter(z => z.code.trim() !== "")
  })).filter(r => r.region !== ""); // optionally filter out completely empty regions

  const payload = [
    {
      config_key: 'REGION_BRANCH_CONFIG',
      config_value: JSON.stringify(cleanData)
    }
  ];

  try {
    const success = await configStore.updateConfigurations(payload);
    if (success) {
      hasChanges.value = false;
      originalData.value = JSON.parse(JSON.stringify(cleanData));
      regionsData.value = JSON.parse(JSON.stringify(cleanData));

      Swal.mixin({
        toast: true,
        position: 'top-end',
        timer: 2000,
        showConfirmButton: false
      }).fire({
        icon: 'success',
        title: 'บันทึกข้อมูลพื้นที่สำเร็จ'
      });
    } else {
      Swal.mixin({
        toast: true,
        position: 'top-end',
        timer: 3000,
        showConfirmButton: false
      }).fire({
        icon: 'error',
        title: 'ไม่สามารถบันทึกข้อมูลได้'
      });
    }
  } catch (e) {
    Swal.fire('ข้อผิดพลาด', 'เกิดข้อผิดพลาดในการเชื่อมต่อ', 'error');
  } finally {
    isSaving.value = false;
  }
};
</script>

<style scoped>
.region-management-tab {
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

.content-body {
  background-color: transparent;
}

.action-bar {
  display: flex;
  justify-content: flex-end;
}

.region-card {
  background-color: #fff;
  border: 1px solid #eaeaea;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.02);
  margin-bottom: 24px;
  padding: 20px;
}

.region-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 1px dashed #e2e8f0;
}

.region-title-input {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 60%;
}

.region-title-input .form-label {
  white-space: nowrap;
  color: #495057;
  font-size: 15px;
}

.region-title-input .form-control {
  max-width: 300px;
}

.zones-container {
  padding: 0 10px;
}

.section-subtitle {
  font-size: 14px;
  font-weight: 600;
  color: #495057;
  margin-bottom: 12px;
}

.zones-table {
  width: 100%;
  border-collapse: collapse;
  border: 1px solid #eaeaea;
  border-radius: 6px;
  overflow: hidden;
}

.zones-table th,
.zones-table td {
  padding: 10px 16px;
  border-bottom: 1px solid #eaeaea;
  vertical-align: middle;
}

.zones-table th {
  background-color: #f8f9fa;
  color: #495057;
  font-weight: 600;
  font-size: 13px;
}

.empty-state {
  color: #6c757d;
  font-size: 13px;
  padding: 20px !important;
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

.btn-sm {
  padding: 6px 12px;
  font-size: 12px;
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

.btn-outline-danger {
  background-color: transparent;
  border: 1px solid #dc3545;
  color: #dc3545;
}

.btn-outline-danger:hover {
  background-color: #dc3545;
  color: white;
}

.btn-outline-secondary {
  background-color: transparent;
  border: 1px solid #6c757d;
  color: #6c757d;
}

.btn-outline-secondary:hover {
  background-color: #6c757d;
  color: white;
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
