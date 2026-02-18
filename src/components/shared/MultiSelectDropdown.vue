<template>
  <div class="multi-select-dropdown" ref="dropdownRef">
    <div class="select-trigger" @click="toggleDropdown" :class="{ disabled: disabled }">
      <span v-if="modelValue.length === 0" class="placeholder">เลือกประเภทคำขอ...</span>
      <span v-else class="selected-text">{{ displayText }}</span>
      <span class="arrow" :class="{ open: isOpen }">▼</span>
    </div>

    <div v-if="isOpen" class="options-list">
      <div
        v-for="option in options"
        :key="option.value"
        class="option-item"
        @click="toggleOption(option)"
        :class="{ selected: isSelected(option.value), disabled: isOptionDisabled(option) }"
      >
        <input
          type="checkbox"
          :checked="isSelected(option.value)"
          @click.stop="toggleOption(option)"
          :disabled="isOptionDisabled(option)"
        />
        <span>{{ option.label }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';

const props = defineProps({
  options: {
    type: Array,
    required: true
  },
  modelValue: {
    type: Array,
    default: () => []
  },
  disabled: {
    type: Boolean,
    default: false
  },
  optionDisabledFn: {
      type: Function,
      default: () => false
  }
});

const emit = defineEmits(['update:modelValue', 'change']);

const isOpen = ref(false);
const dropdownRef = ref(null);

const displayText = computed(() => {
  if (props.modelValue.length === 0) return '';
  if (props.modelValue.length === 1) {
      const opt = props.options.find(o => o.value === props.modelValue[0]);
      return opt ? opt.label : props.modelValue[0];
  }
  return `${props.modelValue.length} รายการที่เลือก`;
});

const toggleDropdown = () => {
  if (props.disabled) return;
  isOpen.value = !isOpen.value;
};

const isSelected = (value) => {
  return props.modelValue.includes(value);
};

const isOptionDisabled = (option) => {
    return props.optionDisabledFn(option);
};

const toggleOption = (option) => {
  if (props.disabled || isOptionDisabled(option)) return;

  const newValue = [...props.modelValue];
  const index = newValue.indexOf(option.value);

  if (index === -1) {
    newValue.push(option.value);
  } else {
    newValue.splice(index, 1);
  }

  emit('update:modelValue', newValue);
  emit('change', newValue);
};

const handleClickOutside = (event) => {
  if (dropdownRef.value && !dropdownRef.value.contains(event.target)) {
    isOpen.value = false;
  }
};

onMounted(() => {
  document.addEventListener('click', handleClickOutside);
});

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside);
});
</script>

<style scoped>
.multi-select-dropdown {
  position: relative;
  width: 280px; /* Wider than before to accommodate text */
  user-select: none;
}

.select-trigger {
  padding: 10px;
  border: 1px solid #ccc;
  border-radius: 8px;
  background-color: #f9f9f9;
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 14px;
  color: #333;
}

.select-trigger.disabled {
  background-color: #eee;
  cursor: not-allowed;
  color: #999;
}

.selected-text {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-right: 10px;
}

.placeholder {
  color: #888;
}

.arrow {
  font-size: 10px;
  transition: transform 0.2s;
}

.arrow.open {
  transform: rotate(180deg);
}

.options-list {
  position: absolute;
  top: 100%;
  left: 0;
  width: 100%;
  background: white;
  border: 1px solid #ccc;
  border-radius: 8px;
  box-shadow: 0 4px 6px rgba(0,0,0,0.1);
  z-index: 1001;
  max-height: 300px;
  overflow-y: auto;
  margin-top: 4px;
}

.option-item {
  padding: 10px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 14px;
}

.option-item:hover {
  background-color: #f5f5f5;
}

.option-item.selected {
  background-color: #e6f0ff;
}

.option-item.disabled {
    color: #ccc;
    cursor: not-allowed;
    background-color: #fafafa;
}

input[type="checkbox"] {
    cursor: pointer;
}
</style>
