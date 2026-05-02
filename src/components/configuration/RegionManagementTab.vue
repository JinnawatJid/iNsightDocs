<template>
  <div class="region-management">
    <div class="content-header">
      <div class="header-title">
        <div class="header-content">
          <h3>จัดการสาขาตามพื้นที่ (Region Management)</h3>
        </div>
      </div>
      <button class="btn btn-primary" @click="handleSave" :disabled="!hasChanges || isSaving">
        {{ isSaving ? 'กำลังบันทึก...' : 'บันทึกการเปลี่ยนแปลง' }}
      </button>
    </div>

    <div v-if="isLoading" class="loading-state">
      กำลังโหลดข้อมูล...
    </div>

    <div v-else class="regions-container">
      <div class="action-bar mb-4">
         <button class="btn btn-outline-primary" @click="addRegion">
            + เพิ่มพื้นที่ใหม่ (Add Region)
         </button>
      </div>

      <div v-for="(region, rIndex) in regionsData" :key="rIndex" class="region-card mb-4 p-4 border rounded">
        <div class="d-flex justify-content-between align-items-center mb-3">
          <div class="d-flex align-items-center gap-2">
            <h4 class="mb-0">พื้นที่: </h4>
            <input
              v-model="region.region"
              class="form-control"
              placeholder="ชื่อพื้นที่ เช่น กทม (Metro)"
              @input="markAsChanged"
            />
          </div>
          <button class="btn btn-danger btn-sm" @click="removeRegion(rIndex)">ลบพื้นที่</button>
        </div>

        <div class="zones-container mt-3">
          <h5>สาขาในพื้นที่ (Branches/Zones):</h5>
          <div class="table-responsive">
            <table class="table table-bordered table-sm mt-2">
              <thead class="table-light">
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
                  <td colspan="3" class="text-center text-muted">ยังไม่มีสาขาในพื้นที่นี้</td>
                </tr>
              </tbody>
            </table>
          </div>
          <button class="btn btn-outline-secondary btn-sm mt-2" @click="addZone(rIndex)">+ เพิ่มสาขา</button>
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
const isSaving = ref(false);
const hasChanges = ref(false);

const regionsData = ref([]);

const loadConfig = async () => {
  isLoading.value = true;
  await configStore.fetchConfigurations();

  const sysConfigs = configStore.configurations['System'] || [];
  const regionConfig = sysConfigs.find(c => c.config_key === 'REGION_BRANCH_CONFIG');

  if (regionConfig && regionConfig.config_value) {
    try {
      regionsData.value = JSON.parse(regionConfig.config_value);
    } catch (e) {
      console.error("Failed to parse REGION_BRANCH_CONFIG", e);
      regionsData.value = [];
    }
  } else {
    regionsData.value = [];
  }

  hasChanges.value = false;
  isLoading.value = false;
};

onMounted(() => {
  loadConfig();
});

const markAsChanged = () => {
  hasChanges.value = true;
};

const addRegion = () => {
  regionsData.value.unshift({
    region: "พื้นที่ใหม่",
    zones: []
  });
  markAsChanged();
};

const removeRegion = (index) => {
  Swal.fire({
    title: 'ยืนยันการลบพื้นที่?',
    text: "คุณต้องการลบพื้นที่นี้และสาขาทั้งหมดในพื้นที่นี้ใช่หรือไม่?",
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#d33',
    cancelButtonColor: '#3085d6',
    confirmButtonText: 'ลบข้อมูล',
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
      region: r.region,
      zones: (r.zones || []).filter(z => z.code.trim() !== "")
  }));

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
      Swal.fire('บันทึกสำเร็จ', 'อัปเดตข้อมูลพื้นที่และสาขาแล้ว', 'success');
      await loadConfig();
    } else {
      Swal.fire('ข้อผิดพลาด', 'ไม่สามารถบันทึกข้อมูลได้', 'error');
    }
  } catch (e) {
    Swal.fire('ข้อผิดพลาด', 'เกิดข้อผิดพลาดในการเชื่อมต่อ', 'error');
  } finally {
    isSaving.value = false;
  }
};
</script>

<style scoped>
.region-management {
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

.header-title {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.icon-map {
  font-size: 1.5rem;
}

.header-title h3 {
  margin: 0 0 4px 0;
  font-size: 20px;
  color: #2c3e50;
  font-weight: 600;
  text-align: left;
}

.action-bar {
  display: flex;
  justify-content: flex-end;
}

.region-card {
  background: white;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
  padding: 24px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.04);
}

.region-card h4 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #1e293b;
  min-width: 60px;
}

.zones-container {
  background-color: #f8fafc;
  padding: 16px;
  border-radius: 6px;
  border: 1px solid #e2e8f0;
  margin-top: 16px;
}

.zones-container h5 {
  font-size: 16px;
  font-weight: 600;
  color: #475569;
  margin-bottom: 12px;
}

.table {
  background: white;
  margin-bottom: 0;
}

.table th {
  background-color: #f1f5f9;
  font-weight: 600;
  color: #475569;
  border-bottom-width: 1px;
}

.table td {
  vertical-align: middle;
}
</style>
