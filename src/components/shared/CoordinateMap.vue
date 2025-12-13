<template>
  <div class="coordinate-map">
    <div class="map-container">
      <div class="inputs-section">
        <label>พิกัด (ละติจูด, ลองจิจูด)</label>
        <div class="input-group">
          <input
            type="text"
            v-model="internalLat"
            placeholder="Latitude"
            @change="emitUpdate"
            :disabled="disabled"
          />
          <input
            type="text"
            v-model="internalLong"
            placeholder="Longitude"
            @change="emitUpdate"
            :disabled="disabled"
          />
        </div>
        <p class="helper-text" v-if="!hasCoordinates">
          กรุณาระบุพิกัดเพื่อสร้าง QR Code นำทาง
        </p>
      </div>

      <div class="qr-section">
        <!-- QR 1: Find Me (Open Maps to find current location) -->
        <div class="qr-item">
          <span class="qr-label">1. ค้นหาพิกัด</span>
          <div class="qr-box">
            <img v-if="findMeQr" :src="findMeQr" alt="Find Me QR" />
          </div>
          <span class="qr-desc">สแกนเพื่อเปิด Google Maps บนมือถือ และปักหมุดเพื่อดูพิกัด</span>
        </div>

        <!-- QR 2: Navigate (Open Maps to specific coords) -->
        <div class="qr-item" :class="{ disabled: !hasCoordinates }">
          <span class="qr-label">2. นำทาง</span>
          <div class="qr-box">
             <img v-if="hasCoordinates && navigateQr" :src="navigateQr" alt="Navigate QR" />
             <div v-else class="qr-placeholder">
               <span v-if="!hasCoordinates">รอพิกัด</span>
               <span v-else>Loading...</span>
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
  latitude: {
    type: [String, Number],
    default: ''
  },
  longitude: {
    type: [String, Number],
    default: ''
  },
  disabled: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['update:latitude', 'update:longitude', 'change']);

const internalLat = ref(props.latitude);
const internalLong = ref(props.longitude);
const findMeQr = ref('');
const navigateQr = ref('');

const hasCoordinates = computed(() => {
  return internalLat.value && internalLong.value;
});

// Watch props to update internal state
watch(() => props.latitude, (newVal) => internalLat.value = newVal);
watch(() => props.longitude, (newVal) => internalLong.value = newVal);

// Watch internal state to regenerate QR
watch([internalLat, internalLong], async () => {
  if (hasCoordinates.value) {
    await generateNavigateQr();
  }
});

const emitUpdate = () => {
  emit('update:latitude', internalLat.value);
  emit('update:longitude', internalLong.value);
  emit('change', { lat: internalLat.value, long: internalLong.value });
};

const generateFindMeQr = async () => {
  try {
    // URL to open Google Maps (default view)
    const url = 'https://www.google.com/maps';
    findMeQr.value = await QRCode.toDataURL(url, { margin: 2, width: 128 });
  } catch (err) {
    console.error('QR Generation Error:', err);
  }
};

const generateNavigateQr = async () => {
  try {
    if (!hasCoordinates.value) return;
    // URL to navigate to specific coords
    const url = `https://www.google.com/maps/dir/?api=1&destination=${internalLat.value},${internalLong.value}`;
    navigateQr.value = await QRCode.toDataURL(url, { margin: 2, width: 128 });
  } catch (err) {
    console.error('QR Generation Error:', err);
  }
};

onMounted(() => {
  generateFindMeQr();
  if (hasCoordinates.value) {
    generateNavigateQr();
  }
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

.input-group input {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
}

.helper-text {
  font-size: 12px;
  color: #666;
  margin: 0;
}

.qr-section {
  display: flex;
  gap: 20px;
  justify-content: center; /* Center QRs */
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
