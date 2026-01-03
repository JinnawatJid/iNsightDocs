<template>
  <div class="store-statement-tab">
    <!-- Guarantee Docs Section (Moved from Request Info) -->
    <div class="upload-grid-small">
        <FileUploader
          label="Bank Guarantee (ถ้ามี)"
          v-model="files.bankGuarantee"
          :disabled="!isEditing"
        />
        <FileUploader
          label="หนังสือค้ำประกัน (ถ้ามี)"
          v-model="files.letterGuarantee"
          :disabled="!isEditing"
        />
    </div>

    <!-- Main Upload Section -->
    <div class="upload-section-large">
      <FileUploader
        label="รายการเดินบัญชี"
        required
        multiple
        v-model="files.bankStatement"
        :disabled="!isEditing"
      >
        <template #icon>
           <img :src="iconUploadMulti" alt="Upload" width="48" height="48" />
        </template>
      </FileUploader>
    </div>
  </div>
</template>

<script setup>
import { reactive, ref, watch } from 'vue';
import FileUploader from '@/components/shared/FileUploader.vue';
import { useCreditRequestStore } from '@/stores/creditRequest';
import iconUploadMulti from '@/assets/icons/upload-multi.svg';

const props = defineProps(['readOnly']);
const store = useCreditRequestStore();

const isEditing = ref(!props.readOnly);
watch(() => props.readOnly, (val) => {
  isEditing.value = !val;
});

const files = reactive({
  bankStatement: [],
  bankGuarantee: null,
  letterGuarantee: null
});

watch(() => files.bankStatement, (v) => {
  store.updateFile('bank_statement', v);
});

watch(() => files.bankGuarantee, (newVal) => {
  store.updateFile('bank_guarantee_doc', newVal);
});

watch(() => files.letterGuarantee, (newVal) => {
  store.updateFile('letter_guarantee_doc', newVal);
});

// Initialize files from store
watch(() => store.files, (newVal) => {
  files.bankGuarantee = newVal?.bank_guarantee_doc || null;
  files.letterGuarantee = newVal?.letter_guarantee_doc || null;
  // Handle array type for bankStatement
  if (newVal && newVal.bank_statement) {
      files.bankStatement = newVal.bank_statement;
  } else {
      files.bankStatement = []; // Default to empty array for multiple files
  }
}, { immediate: true, deep: true });

</script>

<style scoped>
@import './shared-styles.css';

.store-statement-tab {
  padding: 10px;
}

.upload-section-large {
  margin-bottom: 30px;
}

.upload-grid-small {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  margin-bottom: 20px;
}
</style>
