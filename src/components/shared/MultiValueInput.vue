<template>
  <div class="multi-value-input">
    <div class="label-row" v-if="label">
      <label>
        {{ label }}
        <span v-if="required" class="text-red-500">*</span>
        <span v-if="required && (!modelValue || modelValue.length === 0)" class="no-data-alert"></span>
      </label>
    </div>

    <div class="input-list">
      <div
        v-for="(item, index) in localValues"
        :key="index"
        class="input-row"
      >
        <input
          type="text"
          class="form-control"
          :class="{ 'border-red-500': hasError, 'disabled': disabled }"
          :disabled="disabled"
          :placeholder="placeholder"
          :value="item"
          @input="(e) => updateItem(index, e.target.value)"
          @blur="onBlur"
        />

        <button
          v-if="!disabled && (localValues.length > 1 || index > 0)"
          type="button"
          class="remove-btn"
          @click="removeItem(index)"
          tabindex="-1"
        >
          &times;
        </button>
      </div>
    </div>

    <!-- Add Button -->
    <button
      v-if="!disabled"
      type="button"
      class="add-btn"
      @click="addItem"
    >
      + เพิ่ม{{ label }}
    </button>

    <!-- Error Message -->
    <span v-if="error" class="error-text">{{ error }}</span>
  </div>
</template>

<script setup>
import { ref, watch, computed } from 'vue';

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

const localValues = ref(['']);

const hasError = computed(() => !!props.error);

// Sync from parent to local
watch(() => props.modelValue, (newVal) => {
  if (newVal === null || newVal === undefined) {
    localValues.value = [''];
    return;
  }

  const split = newVal.toString().split(',').map(s => s.trim());
  // Determine if we need to update local to avoid cursor jumping?
  // Simple check: if joined matches, don't touch.
  if (split.join(',') !== localValues.value.join(',')) {
      if (split.length === 0 || (split.length === 1 && split[0] === '')) {
         localValues.value = [''];
      } else {
         localValues.value = split;
      }
  }
}, { immediate: true });

function formatPhoneNumber(value) {
  if (!value) return '';
  // Remove all non-digit characters
  const cleaned = value.replace(/\D/g, '');

  // Apply formatting based on length
  if (cleaned.length > 10) {
      // Truncate to 10 digits
      const truncated = cleaned.slice(0, 10);
      return truncated.replace(/(\d{3})(\d{3})(\d{4})/, '$1-$2-$3');
  } else if (cleaned.length === 10) {
    return cleaned.replace(/(\d{3})(\d{3})(\d{4})/, '$1-$2-$3');
  } else if (cleaned.length === 9) {
    if (cleaned.startsWith('02')) {
      return cleaned.replace(/(\d{2})(\d{3})(\d{4})/, '$1-$2-$3');
    }
    return cleaned.replace(/(\d{3})(\d{3})(\d{3})/, '$1-$2-$3');
  }

  // Partial formatting for typing experience?
  // Usually better to just let them type digits and format when possible,
  // or return cleaned if we want strict number input.
  // But returning 'cleaned' makes it hard to see groups.
  // Let's just return the raw input (but filtered) if it doesn't match a pattern yet,
  // OR apply partial formatting.
  // For simplicity and robustness like the previous code:
  // We'll just return what the user typed but stripped of invalid chars?
  // Actually, the previous code in StoreCompanyTab returned formatted string.

  return cleaned;
}

function updateItem(index, rawValue) {
  let newValue = rawValue;

  if (props.type === 'phone') {
     // Allow digits only (and maybe dashes if user types them, but we clean them anyway)
     const digits = newValue.replace(/\D/g, '');

     // Auto-format
     // If the user is deleting (backspace), this might be annoying if we aggressively re-format.
     // However, the requirement is "Auto format to work".
     // We will use the logic to format fully if length matches.

     if (digits.length === 10) {
        newValue = digits.replace(/(\d{3})(\d{3})(\d{4})/, '$1-$2-$3');
     } else if (digits.length === 9) {
         if (digits.startsWith('02')) {
             newValue = digits.replace(/(\d{2})(\d{3})(\d{4})/, '$1-$2-$3');
         } else {
             newValue = digits.replace(/(\d{3})(\d{3})(\d{3})/, '$1-$2-$3');
         }
     } else {
         // Just show digits if incomplete
         newValue = digits;
     }
  } else if (props.type === 'email') {
      // Prevent commas
      newValue = newValue.replace(/,/g, '');
  }

  localValues.value[index] = newValue;
  emitValues();
}

function addItem() {
  localValues.value.push('');
}

function removeItem(index) {
  localValues.value.splice(index, 1);
  if (localValues.value.length === 0) {
      localValues.value.push('');
  }
  emitValues();
}

function emitValues() {
  // Filter out empty strings before emitting?
  // Or emit empty string if all are empty?
  // If we have [''] -> emit ''
  // If we have ['081...', ''] -> emit '081...' (trim empty?)

  const validValues = localValues.value
    .map(v => v.trim())
    .filter(v => v !== '');

  emit('update:modelValue', validValues.join(','));
  emit('input', validValues.join(',')); // For validation listeners
}

function onBlur() {
    emit('blur');
}

</script>

<style scoped>
.multi-value-input {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.label-row {
  margin-bottom: 4px;
}

.label-row label {
  font-weight: 500;
  font-size: 14px;
  color: #374151;
}

.input-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.input-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.form-control {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 14px;
  outline: none;
  transition: border-color 0.2s;
}

.form-control:focus {
  border-color: #3b82f6;
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1);
}

.form-control.border-red-500 {
  border-color: #ef4444;
}

.form-control.disabled {
  background-color: #f3f4f6;
  cursor: not-allowed;
  color: #9ca3af;
}

.remove-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  border: none;
  background-color: #fee2e2;
  color: #ef4444;
  font-size: 18px;
  line-height: 1;
  cursor: pointer;
  transition: background-color 0.2s;
}

.remove-btn:hover {
  background-color: #fecaca;
}

.add-btn {
  align-self: flex-start;
  font-size: 12px;
  color: #3b82f6;
  background: none;
  border: none;
  padding: 4px 0;
  cursor: pointer;
  font-weight: 500;
}

.add-btn:hover {
  text-decoration: underline;
}

.text-red-500 {
  color: #ef4444;
}

.error-text {
  color: #ef4444;
  font-size: 12px;
  margin-top: -4px;
}

.no-data-alert {
  color: red;
  font-size: 12px;
  margin-left: 8px;
  font-weight: normal;
}
</style>
