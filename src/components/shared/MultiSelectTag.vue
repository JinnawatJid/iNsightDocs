<template>
  <div class="multi-select-tag" @click="focusInput">
    <div class="tags-container">
      <span v-for="(item, index) in modelValue" :key="index" class="chip">
        {{ item }}
        <button class="chip-remove" @click.stop="removeItem(index)">&times;</button>
      </span>
      <div class="input-wrapper">
        <input
          ref="inputRef"
          type="text"
          v-model="search"
          :placeholder="modelValue.length === 0 ? placeholder : ''"
          @keydown.delete="handleDelete"
          @keydown.enter.prevent="handleEnter"
          @keydown.down.prevent="navigateOptions(1)"
          @keydown.up.prevent="navigateOptions(-1)"
          @focus="isOpen = true"
          @blur="handleBlur"
        />
      </div>
    </div>

    <!-- Dropdown Menu -->
    <ul v-if="isOpen && filteredOptions.length > 0" class="dropdown-menu">
      <li
        v-for="(option, index) in filteredOptions"
        :key="option"
        :class="{ 'highlighted': highlightedIndex === index }"
        @mousedown.prevent="selectOption(option)"
        @mouseenter="highlightedIndex = index"
      >
        {{ option }}
      </li>
    </ul>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue';

const props = defineProps({
  modelValue: {
    type: Array,
    required: true
  },
  options: {
    type: Array,
    default: () => []
  },
  placeholder: {
    type: String,
    default: 'เพิ่ม...'
  }
});

const emit = defineEmits(['update:modelValue']);

const search = ref('');
const isOpen = ref(false);
const inputRef = ref(null);
const highlightedIndex = ref(0);

const focusInput = () => {
  inputRef.value?.focus();
};

const filteredOptions = computed(() => {
  const lowercaseSearch = search.value.toLowerCase();
  return props.options.filter(option => {
    return option.toLowerCase().includes(lowercaseSearch) && !props.modelValue.includes(option);
  });
});

watch(search, () => {
  highlightedIndex.value = 0;
  isOpen.value = true;
});

const selectOption = (option) => {
  if (!option) return;
  const newValue = [...props.modelValue, option];
  emit('update:modelValue', newValue);
  search.value = '';
  inputRef.value?.focus();
};

const removeItem = (index) => {
  const newValue = [...props.modelValue];
  newValue.splice(index, 1);
  emit('update:modelValue', newValue);
};

const handleDelete = () => {
  if (search.value === '' && props.modelValue.length > 0) {
    removeItem(props.modelValue.length - 1);
  }
};

const handleEnter = () => {
  if (isOpen.value && filteredOptions.value.length > 0) {
    selectOption(filteredOptions.value[highlightedIndex.value]);
  }
};

const navigateOptions = (direction) => {
  if (!isOpen.value) {
    isOpen.value = true;
    return;
  }
  
  const nextIndex = highlightedIndex.value + direction;
  if (nextIndex >= 0 && nextIndex < filteredOptions.value.length) {
    highlightedIndex.value = nextIndex;
  }
};

const handleBlur = () => {
  // Give time for mousedown on dropdown to fire before closing
  setTimeout(() => {
    isOpen.value = false;
  }, 150);
};
</script>

<style scoped>
.multi-select-tag {
  position: relative;
  width: 100%;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  background-color: #ffffff;
  min-height: 40px;
  cursor: text;
  transition: border-color 0.15s ease-in-out, box-shadow 0.15s ease-in-out;
}

.multi-select-tag:focus-within {
  border-color: #86b7fe;
  outline: 0;
  box-shadow: 0 0 0 0.25rem rgba(13, 110, 253, 0.25);
}

.tags-container {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding: 6px;
}

.chip {
  display: inline-flex;
  align-items: center;
  background-color: #e0f2fe;
  color: #0369a1;
  border: 1px solid #bae6fd;
  padding: 2px 8px;
  border-radius: 16px;
  font-size: 13px;
  font-weight: 600;
}

.chip-remove {
  background: none;
  border: none;
  color: inherit;
  font-size: 16px;
  line-height: 1;
  margin-left: 6px;
  cursor: pointer;
  padding: 0 2px;
  opacity: 0.6;
}

.chip-remove:hover {
  opacity: 1;
}

.input-wrapper {
  flex: 1;
  min-width: 120px;
}

input {
  width: 100%;
  border: none;
  outline: none;
  background: transparent;
  padding: 2px 0;
  font-size: 14px;
  color: #1e293b;
}

.dropdown-menu {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  z-index: 1000;
  margin-top: 4px;
  padding: 4px 0;
  background-color: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
  max-height: 200px;
  overflow-y: auto;
  list-style: none;
}

.dropdown-menu li {
  padding: 8px 12px;
  cursor: pointer;
  font-size: 14px;
  color: #334155;
}

.dropdown-menu li:hover,
.dropdown-menu li.highlighted {
  background-color: #f1f5f9;
  color: #0d6efd;
}
</style>
