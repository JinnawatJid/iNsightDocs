<template>
  <div class="coordinate-map">
    <div class="map-container">
      <div class="coordinate-form-grid">

        <!-- Row 1: Map Code -->
        <div class="form-group">
           <label>Google Map Code / Coordinates</label>
           <input
             type="text"
             class="form-control"
             v-model="internalMapCode"
             placeholder="ตัวอย่าง: RGFF+F74 Bangkok หรือ 13.75, 100.50"
             @change="emitUpdate"
             :disabled="disabled"
           />
           <p class="helper-text" v-if="!hasMapCode">
             ระบุ Plus Code หรือพิกัด เพื่อสร้าง QR Code นำทาง
           </p>
        </div>

        <!-- Row 1: Landmark -->
        <div class="form-group">
           <label>จุดสังเกตใกล้เคียง (Landmark)</label>
           <input
             type="text"
             class="form-control"
             v-model="internalLandmark"
             placeholder="ระบุสถานที่ใกล้เคียง (เช่น Siam Paragon)"
             @change="emitUpdate"
             :disabled="disabled"
           />
        </div>

        <!-- Row 2: Note (Full Width) -->
        <div class="form-group span-2">
           <label>หมายเหตุจุดที่ตั้ง</label>
           <input
             type="text"
             class="form-control"
             v-model="internalNote"
             placeholder="รายละเอียดเพิ่มเติม (เช่น บ้านสีเหลือง)"
             @change="emitUpdate"
             :disabled="disabled"
           />
        </div>

      </div>

      <div class="qr-section">
        <!-- QR 1: Find Me (Display removed as per requirement, logic kept in script) -->

        <!-- QR 2: Navigate -->
        <div class="qr-item" :class="{ disabled: !canNavigate }">
          <span class="qr-label">นำทาง</span>
          <div class="qr-box">
             <img v-if="canNavigate && navigateQr" :src="navigateQr" alt="Navigate QR" />
             <div v-else class="qr-placeholder">
               <span>{{ navigatePlaceholderText }}</span>
             </div>
          </div>
          <span class="qr-desc">สแกนเพื่อนำทางไปยังจุดที่ระบุ</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, computed, onMounted } from 'vue';
import QRCode from 'qrcode';

const props = defineProps({
  mapCode: { type: String, default: '' },
  landmark: { type: String, default: '' },
  note: { type: String, default: '' },
  disabled: { type: Boolean, default: false }
});

const emit = defineEmits(['update:mapCode', 'update:landmark', 'update:note', 'change']);

const internalMapCode = ref(props.mapCode);
const internalLandmark = ref(props.landmark);
const internalNote = ref(props.note);

const findMeQr = ref('');
const navigateQr = ref('');

const hasMapCode = computed(() => !!internalMapCode.value);
const hasLandmark = computed(() => !!internalLandmark.value);
const canNavigate = computed(() => hasMapCode.value);

const navigatePlaceholderText = computed(() => {
  if (canNavigate.value) return "Loading...";
  return "รอข้อมูล";
});

// Watch props
watch(() => props.mapCode, (v) => internalMapCode.value = v);
watch(() => props.landmark, (v) => internalLandmark.value = v);
watch(() => props.note, (v) => internalNote.value = v);

// Watch internal for updates
watch([internalMapCode, internalLandmark], async () => {
  await generateNavigateQr();
});

const emitUpdate = () => {
  emit('update:mapCode', internalMapCode.value);
  emit('update:landmark', internalLandmark.value);
  emit('update:note', internalNote.value);

  emit('change', {
    mapCode: internalMapCode.value,
    landmark: internalLandmark.value,
    note: internalNote.value
  });
};

// Note: Logic retained but display removed as per user request
const generateFindMeQr = async () => {
  try {
    const url = 'https://www.google.com/maps';
    findMeQr.value = await QRCode.toDataURL(url, { margin: 2, width: 128 });
  } catch (err) {
    console.error('QR Generation Error:', err);
  }
};

const generateNavigateQr = async () => {
  try {
    navigateQr.value = '';
    let url = '';

    if (hasMapCode.value) {
      // Search for the code or coordinates
      const query = encodeURIComponent(internalMapCode.value);
      url = `https://www.google.com/maps/search/?api=1&query=${query}`;
    } else {
      return;
    }

    navigateQr.value = await QRCode.toDataURL(url, { margin: 2, width: 128 });
  } catch (err) {
    console.error('QR Generation Error:', err);
  }
};

onMounted(() => {
  generateFindMeQr();
  generateNavigateQr();
});
</script>

<style scoped>
.coordinate-map {
  background: #f9f9f9;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 15px;
}

.map-container {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

/*
   Refactored to use CSS Grid for consistent 2-column layout
   with perfect alignment and gap control.
*/
.coordinate-form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 15px;
}

.form-group {
    display: flex;
    flex-direction: column;
    gap: 5px;
}

.span-2 {
  grid-column: span 2;
}

.form-group label {
  font-size: 14px;
  font-weight: 600;
  color: #333;
}

.form-control {
  width: 100%;
  padding: 8px 12px;
  font-size: 14px;
  line-height: 1.5;
  color: #333;
  background-color: #fff;
  background-clip: padding-box;
  border: 1px solid #ced4da;
  border-radius: 0.25rem;
  transition: border-color 0.15s ease-in-out, box-shadow 0.15s ease-in-out;
  box-sizing: border-box; /* Ensure padding doesn't increase width */
}

.form-control:focus {
  border-color: #80bdff;
  outline: 0;
}

.form-control:disabled {
  background-color: #e9ecef;
  opacity: 1;
}

.helper-text {
  font-size: 12px;
  color: #666;
  margin: 2px 0 0 0;
}

.qr-section {
  display: flex;
  gap: 20px;
  justify-content: center;
}

.qr-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  width: 140px;
  text-align: center;
}

.qr-item.disabled {
  opacity: 0.5;
  pointer-events: none;
}

.qr-label {
  font-size: 13px;
  font-weight: 600;
  color: #333;
}

.qr-box {
  width: 128px;
  height: 128px;
  background: white;
  border: 1px solid #ddd;
  display: flex;
  align-items: center;
  justify-content: center;
}

.qr-box img {
  display: block;
}

.qr-placeholder {
  color: #999;
  font-size: 12px;
}

.qr-desc {
  font-size: 11px;
  color: #666;
  line-height: 1.4;
}
</style>
