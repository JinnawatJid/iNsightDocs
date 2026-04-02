<template>
  <div class="project-address-section">
    <div v-if="project" class="address-verification">
      <div class="section-header">
        <h3>ที่อยู่โครงการ</h3>
      </div>

      <!-- Address Form -->
      <div class="form-grid-three-columns">
        <div class="form-group span-2">
          <label>ที่อยู่ (บ้านเลขที่, ถนน)</label>
          <input
            type="text"
            class="form-control"
            :class="{ 'disabled': readOnly }"
            :disabled="readOnly"
            v-model="addressData.houseAddress"
            placeholder="ระบุบ้านเลขที่, ถนน"
          />
        </div>
        <div class="form-group">
          <label>ตำบล/แขวง</label>
          <input
            type="text"
            class="form-control"
            :class="{ 'disabled': readOnly }"
            :disabled="readOnly"
            v-model="addressData.subdistrict"
            placeholder="ระบุตำบล/แขวง"
          />
        </div>
        <div class="form-group">
          <label>รหัสไปรษณีย์</label>
          <input
            type="text"
            class="form-control"
            :class="{ 'disabled': readOnly }"
            :disabled="readOnly"
            v-model="addressData.postCode"
            placeholder="ระบุรหัสไปรษณีย์"
          />
        </div>
        <div class="form-group">
          <label>อำเภอ/เขต</label>
          <input
            type="text"
            class="form-control"
            :class="{ 'disabled': readOnly }"
            :disabled="readOnly"
            v-model="addressData.district"
            placeholder="ระบุอำเภอ/เขต"
          />
        </div>
        <div class="form-group">
          <label>จังหวัด</label>
          <input
            type="text"
            class="form-control"
            :class="{ 'disabled': readOnly }"
            :disabled="readOnly"
            v-model="addressData.city"
            placeholder="ระบุจังหวัด"
          />
        </div>
      </div>

      <!-- Phone | Fax | Email Grid -->
      <div class="form-grid-two-columns">
        <div class="form-group">
          <label>เบอร์โทรศัพท์ (ถ้ามี)</label>
          <input
            type="text"
            class="form-control"
            :class="{ 'disabled': readOnly }"
            :disabled="readOnly"
            v-model="addressData.phone"
            placeholder="0XX-XXX-XXXX"
          />
        </div>
        <div class="form-group">
          <label>อีเมล (ถ้ามี)</label>
          <input
            type="text"
            class="form-control"
            :class="{ 'disabled': readOnly }"
            :disabled="readOnly"
            v-model="addressData.email"
            placeholder="example@email.com"
          />
        </div>
      </div>

      <!-- Map Section -->
      <div class="section-header" style="margin-top: 20px;">
        <h3>แผนที่โครงการ</h3>
      </div>
      <div class="map-container">
        <CoordinateMap
          :mapCode="addressData.mapCode"
          :landmark="addressData.landmark"
          :note="addressData.note"
          :disabled="readOnly"
          @change="onCoordinatesChange"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, watch } from 'vue';
import CoordinateMap from '@/components/shared/CoordinateMap.vue';
import { useCreditRequestStore } from '@/stores/creditRequest';
import { searchAddressByZipcode } from 'thai-address-database';

const props = defineProps({
  projectIndex: {
    type: Number,
    required: true
  },
  readOnly: {
    type: Boolean,
    default: false
  }
});

const store = useCreditRequestStore();

const project = computed(() => {
  return store.transactionData.projects?.[props.projectIndex] || null;
});

const addressData = computed(() => {
  return project.value?.addressData || {};
});

function onCoordinatesChange({ mapCode, landmark, note }) {
  if (!project.value) return;
  project.value.addressData.mapCode = mapCode;
  project.value.addressData.landmark = landmark;
  project.value.addressData.note = note;
}

// Watch postCode to auto-fill district and city
watch(() => addressData.value.postCode, (newZip) => {
  if (newZip && newZip.length === 5) {
    const results = searchAddressByZipcode(newZip);
    if (results.length > 0) {
      if (!addressData.value.district) addressData.value.district = results[0].amphoe;
      if (!addressData.value.city) addressData.value.city = results[0].province;
    }
  }
});
</script>

<style scoped>
@import '../shared-styles.css';

.project-address-section {
  padding: 0;
}

.section-header {
  display: flex;
  align-items: center;
  gap: 20px;
  margin-bottom: 20px;
}

.section-header h3 {
  margin: 0;
}

.address-verification {
  margin-top: 10px;
}

.map-container {
  margin-bottom: 20px;
}

.form-group.span-2 {
  grid-column: span 2;
}

.disabled {
    background-color: #f5f5f5;
    color: #777;
}
</style>