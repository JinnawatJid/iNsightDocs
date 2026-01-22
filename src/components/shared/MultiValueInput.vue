<template>
  <div class="multi-value-input">
    <div class="label-row" v-if="label">
      <label>
        {{ label }}
        <span v-if="required" class="text-red-500">*</span>
        <span v-if="required && (!modelValue || modelValue.length === 0)" class="no-data-alert">ไม่พบข้อมูล</span>
      </label>
    </div>

    <div class="input-container" :class="{ 'has-error': hasError }">
      <!-- Values List Wrapper -->
      <div class="values-list">
        <span v-for="(item, index) in localValues" :key="index" class="value-group">
          <span
            class="value-text"
            @click.stop="startEditing(index)"
          >
            {{ item }}
          </span><span v-if="index < localValues.length - 1" class="separator">, </span>
        </span>

        <!-- Placeholder Text if Empty -->
        <span v-if="localValues.length === 0 && !isPopupOpen && placeholder" class="placeholder-text">
          {{ placeholder }}
        </span>
      </div>

      <!-- Static Add Button -->
      <button
        v-if="!disabled"
        type="button"
        class="add-btn-static"
        @click.stop="startAdding"
        aria-label="Add"
        :class="{ 'active': isPopupOpen && editingIndex === -1 }"
      >
        +
      </button>

      <!-- Popup Input Modal -->
      <div v-if="isPopupOpen" class="popup-input-wrapper" v-click-outside="cancelPopup">
        <input
          ref="inputRef"
          type="text"
          class="popup-input"
          v-model="popupValue"
          :placeholder="placeholder"
          @keydown.enter.prevent="confirmPopup"
          @keydown.esc.prevent="cancelPopup"
          @input="handleInput"
        />

        <!-- Confirm Button -->
        <button type="button" class="popup-action-btn confirm-btn" @click="confirmPopup">
          ✓
        </button>

        <!-- Delete Button (Only in Edit Mode) -->
        <button
          v-if="editingIndex !== -1"
          type="button"
          class="popup-action-btn delete-btn"
          @click="deleteCurrentItem"
        >
          🗑️
        </button>
      </div>
    </div>

    <!-- Error Message -->
    <span v-if="error" class="error-text">{{ error }}</span>
  </div>
</template>

<script setup>
import { ref, watch, computed, nextTick } from 'vue';

// Custom directive for clicking outside
const vClickOutside = {
  mounted(el, binding) {
    el.clickOutsideEvent = function(event) {
      if (!(el === event.target || el.contains(event.target))) {
        binding.value(event);
      }
    };
    document.body.addEventListener('click', el.clickOutsideEvent);
  },
  unmounted(el) {
    document.body.removeEventListener('click', el.clickOutsideEvent);
  }
};

const props = defineProps({
  modelValue: {
    type: String,
    default: ''
  },
  label: String,
  type: {
    type: String, // 'phone' | 'email' | 'text'
    default: 'text'
  },
  required: Boolean,
  disabled: Boolean,
  placeholder: String,
  error: String
});

const emit = defineEmits(['update:modelValue', 'blur', 'input']);

const localValues = ref([]);
const isPopupOpen = ref(false);
const editingIndex = ref(-1); // -1 means adding new, >= 0 means editing index
const popupValue = ref('');
const inputRef = ref(null);

const hasError = computed(() => !!props.error);

// Sync from parent to local
watch(() => props.modelValue, (newVal) => {
  if (!newVal) {
    localValues.value = [];
    return;
  }

  const split = newVal.toString().split(',').map(s => s.trim()).filter(s => s !== '');
  // Avoid reactivity loops
  if (split.join(',') !== localValues.value.join(',')) {
     localValues.value = split;
  }
}, { immediate: true });

function formatPhoneNumber(val) {
    if (!val) return '';
    const digits = val.replace(/\D/g, '');
    if (digits.length > 10) return digits.slice(0, 10).replace(/(\d{3})(\d{3})(\d{4})/, '$1-$2-$3');
    if (digits.length === 10) return digits.replace(/(\d{3})(\d{3})(\d{4})/, '$1-$2-$3');
    if (digits.length === 9) {
        if (digits.startsWith('02')) return digits.replace(/(\d{2})(\d{3})(\d{4})/, '$1-$2-$3');
        return digits.replace(/(\d{3})(\d{3})(\d{3})/, '$1-$2-$3');
    }
    return digits;
}

function handleInput(e) {
    let val = e.target.value;
    if (props.type === 'phone') {
        const raw = val.replace(/\D/g, '');
        if (raw.length > 10) {
             val = raw.slice(0, 10);
        } else {
             val = raw;
        }

        // Simple formatting
        if (val.length > 6) {
             if (val.length === 9 && val.startsWith('02')) {
                 val = val.replace(/(\d{2})(\d{3})(\d{4})/, '$1-$2-$3');
             } else if (val.length === 10) {
                 val = val.replace(/(\d{3})(\d{3})(\d{4})/, '$1-$2-$3');
             }
        }
        popupValue.value = val;
    } else if (props.type === 'email') {
        popupValue.value = val.replace(/,/g, '');
    }
}

function startAdding() {
    editingIndex.value = -1;
    popupValue.value = '';
    openPopup();
}

function startEditing(index) {
    if (props.disabled) return;
    editingIndex.value = index;
    popupValue.value = localValues.value[index];
    openPopup();
}

function openPopup() {
    isPopupOpen.value = true;
    nextTick(() => {
        if (inputRef.value) {
            inputRef.value.focus();
            if (editingIndex.value !== -1) {
                inputRef.value.select(); // Select all text when editing
            }
        }
    });
}

function cancelPopup() {
    isPopupOpen.value = false;
    popupValue.value = '';
    editingIndex.value = -1;
    emit('blur');
}

function confirmPopup() {
    let val = popupValue.value.trim();

    if (!val) {
        cancelPopup();
        return;
    }

    // Final formatting for phone
    if (props.type === 'phone') {
        val = formatPhoneNumber(val);
    }

    if (editingIndex.value === -1) {
        // Add Mode
        localValues.value.push(val);
    } else {
        // Edit Mode
        localValues.value[editingIndex.value] = val;
    }

    emitValues();
    isPopupOpen.value = false;
    popupValue.value = '';
    editingIndex.value = -1;
}

function deleteCurrentItem() {
    if (editingIndex.value !== -1) {
        localValues.value.splice(editingIndex.value, 1);
        emitValues();
        isPopupOpen.value = false;
        popupValue.value = '';
        editingIndex.value = -1;
    }
}

function emitValues() {
    const str = localValues.value.join(',');
    emit('update:modelValue', str);
    emit('input', str);
}

</script>

<style scoped>
.multi-value-input {
  display: flex;
  flex-direction: column;
  gap: 6px;
  position: relative;
}

.label-row {
  margin-bottom: 2px;
}

.label-row label {
  font-weight: 500;
  font-size: 14px;
  color: #374151;
}

.input-container {
    display: flex;
    align-items: center; /* Center items vertically by default */
    min-height: 38px;
    padding: 0 8px; /* Padding for the container */
    border: 1px solid #d1d5db;
    border-radius: 6px;
    background-color: white;
    position: relative;
    transition: border-color 0.2s;
}

.input-container.has-error {
    border-color: #ef4444;
}

/* List of values takes available space */
.values-list {
    flex: 1;
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0; /* No gap, relying on separator */
    padding: 4px 0;
    line-height: 1.5;
}

.value-group {
    display: inline-flex; /* Keep value and separator together */
    align-items: center;
}

.value-text {
    cursor: pointer;
    color: #1f2937;
    font-size: 14px;
    position: relative;
    transition: color 0.2s;
}

.value-text:hover {
    color: #3b82f6;
    text-decoration: underline;
}

.separator {
    color: #374151;
    font-size: 14px;
    white-space: pre; /* Ensure space is respected */
}

.placeholder-text {
    color: #9ca3af;
    font-size: 14px;
}

/* Static Add Button */
.add-btn-static {
    flex-shrink: 0;
    width: 24px;
    height: 24px;
    border-radius: 50%;
    border: 1px solid transparent;
    background: transparent;
    color: #6b7280;
    font-size: 20px;
    line-height: 1;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;
    margin-left: 8px; /* Space from list */
}

.add-btn-static:hover, .add-btn-static.active {
    color: #3b82f6;
    background-color: #eff6ff;
}

/* Popup Input - Positioned above */
.popup-input-wrapper {
    position: absolute;
    bottom: 100%;
    right: 0; /* Align right side with container */
    margin-bottom: 8px;
    background: white;
    border: 1px solid #e0e0e0;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    border-radius: 8px;
    padding: 8px;
    display: flex;
    align-items: center;
    gap: 8px;
    z-index: 100;
    animation: fadeIn 0.2s ease-out;
}

/* Arrow pointing down */
.popup-input-wrapper::after {
    content: '';
    position: absolute;
    top: 100%;
    right: 12px; /* Align with the + button roughly */
    border-width: 6px;
    border-style: solid;
    border-color: white transparent transparent transparent;
}

.popup-input-wrapper::before {
    content: '';
    position: absolute;
    top: 100%;
    right: 11px;
    border-width: 7px;
    border-style: solid;
    border-color: #e0e0e0 transparent transparent transparent;
}

.popup-input {
    border: 1px solid #d1d5db;
    border-radius: 4px;
    padding: 6px 10px;
    font-size: 14px;
    min-width: 180px;
    outline: none;
}

.popup-input:focus {
    border-color: #3b82f6;
}

.popup-action-btn {
    border: none;
    border-radius: 4px;
    width: 28px;
    height: 28px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    font-size: 14px;
}

.confirm-btn {
    background-color: #10b981;
    color: white;
}
.confirm-btn:hover {
    background-color: #059669;
}

.delete-btn {
    background-color: #ef4444;
    color: white;
    font-size: 12px;
}
.delete-btn:hover {
    background-color: #dc2626;
}

@keyframes fadeIn {
    from { opacity: 0; transform: translateY(5px); }
    to { opacity: 1; transform: translateY(0); }
}

.text-red-500 {
  color: #ef4444;
}

.error-text {
  color: #ef4444;
  font-size: 12px;
  margin-top: 2px;
}

.no-data-alert {
  color: red;
  font-size: 12px;
  margin-left: 8px;
  font-weight: normal;
}
</style>