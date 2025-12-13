<template>
  <div class="coordinate-map">
    <div class="map-container">
      <div class="inputs-section">
        <label>พิกัด (ละติจูด, ลองจิจูด)</label>
        <div class="input-group">
          <input
            type="text"
            class="form-control"
            v-model="internalLat"
            placeholder="Latitude"
            @change="emitUpdate"
            :disabled="disabled"
          />
          <input
            type="text"
            class="form-control"
            v-model="internalLong"
            placeholder="Longitude"
            @change="emitUpdate"
            :disabled="disabled"
          />
        </div>
        <p class="helper-text" v-if="!hasCoordinates">
          กรุณาระบุพิกัดเพื่อสร้าง QR Code นำทาง
        </p>

        <!-- New Landmark & Note inputs -->
        <div class="extra-inputs">
           <div class="form-group">
              <label>จุดสังเกตใกล้เคียง (นำทาง)</label>
              <input
                type="text"
                class="form-control"
                v-model="internalLandmark"
                placeholder="ระบุสถานที่ใกล้เคียง (เช่น Siam Paragon)"
                @change="emitUpdate"
                :disabled="disabled"
              />
           </div>
           <div class="form-group">
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
      </div>

      <div class="qr-section">
        <!-- QR 1: Find Me -->
        <div class="qr-item">
          <span class="qr-label">1. ค้นหาพิกัด</span>
          <div class="qr-box">
            <img v-if="findMeQr" :src="findMeQr" alt="Find Me QR" />
          </div>
          <span class="qr-desc">สแกนเพื่อเปิด Google Maps บนมือถือ และปักหมุดเพื่อดูพิกัด</span>
        </div>

        <!-- QR 2: Navigate -->
        <div class="qr-item" :class="{ disabled: !canNavigate }">
          <span class="qr-label">2. นำทาง</span>
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
  latitude: { type: [String, Number], default: '' },
  longitude: { type: [String, Number], default: '' },
  landmark: { type: String, default: '' },
  note: { type: String, default: '' },
  disabled: { type: Boolean, default: false }
});

const emit = defineEmits(['update:latitude', 'update:longitude', 'update:landmark', 'update:note', 'change']);

const internalLat = ref(props.latitude);
const internalLong = ref(props.longitude);
const internalLandmark = ref(props.landmark);
const internalNote = ref(props.note);

const findMeQr = ref('');
const navigateQr = ref('');

const hasCoordinates = computed(() => !!(internalLat.value && internalLong.value));
const hasLandmark = computed(() => !!internalLandmark.value);
const canNavigate = computed(() => hasCoordinates.value || hasLandmark.value);

const navigatePlaceholderText = computed(() => {
  if (canNavigate.value) return "Loading...";
  return "รอข้อมูล";
});

// Watch props
watch(() => props.latitude, (v) => internalLat.value = v);
watch(() => props.longitude, (v) => internalLong.value = v);
watch(() => props.landmark, (v) => internalLandmark.value = v);
watch(() => props.note, (v) => internalNote.value = v);

// Watch internal for updates
watch([internalLat, internalLong, internalLandmark], async () => {
  await generateNavigateQr();
});

const emitUpdate = () => {
  emit('update:latitude', internalLat.value);
  emit('update:longitude', internalLong.value);
  emit('update:landmark', internalLandmark.value);
  emit('update:note', internalNote.value);

  emit('change', {
    lat: internalLat.value,
    long: internalLong.value,
    landmark: internalLandmark.value,
    note: internalNote.value
  });
};

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

    if (hasCoordinates.value) {
      url = `https://www.google.com/maps/dir/?api=1&destination=${internalLat.value},${internalLong.value}`;
    } else if (hasLandmark.value) {
      // Encode landmark
      const query = encodeURIComponent(internalLandmark.value);
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
  background: #fff; /* White background to match standard cards if needed, or stick to light gray */
  /* Actually user screenshot showed white background for the whole section? */
  /* The container in Tab is usually white. */
  /* But here we use a light gray box to group coordinate stuff? */
  /* User screenshot has a light gray border around the section. */
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

.inputs-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.inputs-section label {
  font-size: 14px;
  font-weight: 600;
  color: #333;
}

.input-group {
  display: flex;
  gap: 10px;
}

/* Use standard styling classes that match the app's other inputs if available */
/* Assuming .form-control is globally available or defined in shared-styles.css */
/* I will duplicate styles here just in case scope doesn't inherit, or rely on global */

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
}

.form-control:focus {
  border-color: #80bdff;
  outline: 0;
}

.form-control:disabled {
  background-color: #e9ecef;
  opacity: 1;
}

.extra-inputs {
    display: flex;
    gap: 15px;
    margin-top: 10px;
}

.form-group {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 5px;
}

.helper-text {
  font-size: 12px;
  color: #666;
  margin: 0;
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
