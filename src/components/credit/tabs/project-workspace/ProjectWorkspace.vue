<template>
  <div class="project-workspace">
    <div v-if="project" class="project-card">
      <div class="section-header workspace-header">
        <h3>ข้อมูลโครงการ: {{ project.projectData.name }}</h3>
        <button v-if="!readOnly" class="btn-clear" @click="removeProjectCard" style="margin-left: auto;">ลบโครงการนี้</button>
      </div>

      <!-- Scrollable workspace sections -->
      <div class="workspace-sections">
        <div class="workspace-section">
          <ProjectInfoSection :projectIndex="projectIndex" :readOnly="readOnly" />
        </div>

        <div class="workspace-section">
          <div class="section-divider"></div>
          <ProjectAddressSection :projectIndex="projectIndex" :readOnly="readOnly" />
        </div>

        <div class="workspace-section">
          <div class="section-divider"></div>
          <ProjectPhasingSection :projectIndex="projectIndex" :readOnly="readOnly" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useCreditRequestStore } from '@/stores/creditRequest';
import ProjectInfoSection from './ProjectInfoSection.vue';
import ProjectAddressSection from './ProjectAddressSection.vue';
import ProjectPhasingSection from './ProjectPhasingSection.vue';

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

const removeProjectCard = () => {
  if (!project.value) return;
  const projectId = project.value.projectId;
  store.transactionData.projects.splice(props.projectIndex, 1);

  // Cleanup files associated with this project ID
  store.updateFile('project_contract_doc_' + projectId, null);
  store.updateFile('quotation_doc_' + projectId, null);
  store.updateFile('project_security_doc_' + projectId, null);
  store.updateFile('project_cash_deposit_doc_' + projectId, null);
  store.updateFile('contractor_company_profile_doc_' + projectId, null);
  store.updateFile('contractor_balance_sheet_doc_' + projectId, null);
  store.updateFile('contractor_profit_loss_doc_' + projectId, null);
  store.updateFile('contractor_financial_ratios_doc_' + projectId, null);

  // Navigate back to Add tab or previous project
  if (store.transactionData.projects.length > 0) {
      store.setActiveProjectTab(Math.max(0, props.projectIndex - 1));
  } else {
      store.setActiveProjectTab('add');
  }
};
</script>

<style scoped>
@import '../shared-styles.css';

.project-workspace {
  padding: 10px 0;
}

.project-card {
  border: 1px solid #ccc;
  border-radius: 8px;
  padding: 20px;
  background-color: #fff;
}

.workspace-header {
  margin-bottom: 25px;
  padding-bottom: 15px;
  border-bottom: 2px solid #f0f0f0;
}

.section-divider {
  height: 1px;
  background-color: #ddd;
  margin: 30px 0;
}

.btn-clear {
  background: none;
  border: 1px solid #dc3545;
  color: #dc3545;
  padding: 6px 12px;
  border-radius: 4px;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-clear:hover {
  background-color: #fee2e2;
}
</style>