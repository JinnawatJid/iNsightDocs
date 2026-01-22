<template>
  <div class="multi-value-input">
    <div class="label-row" v-if="label">
      <label>
        {{ label }}
        <span v-if="required" class="text-red-500">*</span>
        <span v-if="required && (!modelValue || modelValue.length === 0)" class="no-data-alert"></span>
      </label>
    </div>

    <div class="chips-container" :class="{ 'has-error': hasError }">
      <!-- Chips Display -->
      <div
        v-for="(item, index) in localValues"
        :key="index"
        class="chip"
      >
        <span class="chip-text">{{ item }}</span>
        <button
          v-if="!disabled"
          type="button"
          class="chip-remove"
          @click.stop="removeItem(index)"
          tabindex="-1"
        >
          &times;
        </button>
      </div>

      <!-- Add Button -->
      <button
        v-if="!disabled && !isAdding"
        type="button"
        class="add-btn-icon"
        @click.stop="startAdding"
        aria-label="Add"
      >
        +
      </button>

      <!-- Placeholder Text if Empty -->
      <span v-if="localValues.length === 0 && !isAdding && placeholder" class="placeholder-text">
        {{ placeholder }}
      </span>

      <!-- Popup Input Modal -->
      <div v-if="isAdding" class="popup-input-wrapper" v-click-outside="cancelAdding">
        <input
          ref="inputRef"
          type="text"
          class="popup-input"
          v-model="newItemValue"
          :placeholder="placeholder"
          @keydown.enter.prevent="confirmAddItem"
          @keydown.esc.prevent="cancelAdding"
          @input="handleInput"
        />
        <button type="button" class="popup-confirm-btn" @click="confirmAddItem">
          ✓
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
const isAdding = ref(false);
const newItemValue = ref('');
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
        // Auto-format for display while typing?
        // Simple digit filter first
        const raw = val.replace(/\D/g, '');
        // We can apply partial formatting if desired, or just keep digits until save
        // The previous requirement asked for auto-formatting.
        // Let's implement partial formatting for better UX

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

        // Update model
        newItemValue.value = val;
    } else if (props.type === 'email') {
        newItemValue.value = val.replace(/,/g, '');
    }
}

function startAdding() {
    isAdding.value = true;
    newItemValue.value = '';
    nextTick(() => {
        if (inputRef.value) inputRef.value.focus();
    });
}

function cancelAdding() {
    isAdding.value = false;
    newItemValue.value = '';
    emit('blur');
}

function confirmAddItem() {
    let val = newItemValue.value.trim();
    if (!val) {
        cancelAdding();
        return;
    }

    // Final formatting for phone
    if (props.type === 'phone') {
        val = formatPhoneNumber(val);
    }

    // Add to list
    localValues.value.push(val);
    emitValues();

    // Reset but keep adding mode? Or close?
    // "minimal modals" usually imply one-off action. Let's close it.
    isAdding.value = false;
    newItemValue.value = '';
}

function removeItem(index) {
    localValues.value.splice(index, 1);
    emitValues();
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
  position: relative; /* For popup context if needed, though we use absolute inside */
}

.label-row {
  margin-bottom: 2px;
}

.label-row label {
  font-weight: 500;
  font-size: 14px;
  color: #374151;
}

.chips-container {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px;
    min-height: 38px; /* Standard input height */
    padding: 4px 8px;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    background-color: white;
    position: relative;
    transition: border-color 0.2s;
}

.chips-container.has-error {
    border-color: #ef4444;
}

.placeholder-text {
    color: #9ca3af;
    font-size: 14px;
}

/* Chip Styles */
.chip {
    display: flex;
    align-items: center;
    background-color: #e5e7eb;
    border-radius: 16px;
    padding: 4px 10px;
    font-size: 13px;
    color: #1f2937;
    gap: 6px;
}

.chip-text {
    line-height: 1;
}

.chip-remove {
    background: none;
    border: none;
    color: #6b7280;
    cursor: pointer;
    font-size: 16px;
    line-height: 1;
    padding: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 16px;
    height: 16px;
    border-radius: 50%;
}

.chip-remove:hover {
    color: #ef4444;
    background-color: #fee2e2;
}

/* Add Button */
.add-btn-icon {
    width: 24px;
    height: 24px;
    border-radius: 50%;
    border: 1px dashed #9ca3af;
    background: transparent;
    color: #6b7280;
    font-size: 18px;
    line-height: 1;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;
}

.add-btn-icon:hover {
    border-color: #3b82f6;
    color: #3b82f6;
    background-color: #eff6ff;
}

/* Popup Input */
.popup-input-wrapper {
    position: absolute;
    bottom: 100%; /* Above the container */
    left: 0;
    margin-bottom: 8px; /* Space between popup and container */
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

/* Little arrow pointing down */
.popup-input-wrapper::after {
    content: '';
    position: absolute;
    top: 100%;
    left: 20px; /* Adjust based on where button usually is, or center */
    border-width: 6px;
    border-style: solid;
    border-color: white transparent transparent transparent;
}

.popup-input-wrapper::before {
    content: '';
    position: absolute;
    top: 100%;
    left: 19px;
    border-width: 7px;
    border-style: solid;
    border-color: #e0e0e0 transparent transparent transparent;
}

.popup-input {
    border: 1px solid #d1d5db;
    border-radius: 4px;
    padding: 6px 10px;
    font-size: 14px;
    min-width: 200px;
    outline: none;
}

.popup-input:focus {
    border-color: #3b82f6;
}

.popup-confirm-btn {
    background-color: #10b981;
    color: white;
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

.popup-confirm-btn:hover {
    background-color: #059669;
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
