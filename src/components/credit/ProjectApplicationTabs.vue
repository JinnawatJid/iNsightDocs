<template>
  <div class="project-application-tabs">
    <div class="tabs-container">
      <div class="tabs-header">
        <div
          v-if="!readOnly"
          :class="['tab-item', { active: currentTab === 'add' }]"
          @click="handleTabClick('add')"
        >
          + เพิ่มโครงการ
        </div>
        <div
          v-for="(project, index) in projects"
          :key="index"
          :class="['tab-item', { active: currentTab === index }]"
          @click="handleTabClick(index)"
        >
          {{ `โครงการที่ ${index + 1}` }}
        </div>
      </div>
    </div>

    <div class="tab-content">
      <keep-alive>
        <AddProjectTab v-if="currentTab === 'add' && !readOnly" />
        <ProjectWorkspace v-else-if="typeof currentTab === 'number' && currentTab >= 0" :projectIndex="currentTab" :readOnly="readOnly" />
      </keep-alive>
    </div>
  </div>
</template>

<script setup>
import { computed, watch, onMounted } from 'vue';
import { useCreditRequestStore } from '@/stores/creditRequest';
import AddProjectTab from './tabs/project-workspace/AddProjectTab.vue';
import ProjectWorkspace from './tabs/project-workspace/ProjectWorkspace.vue';

const props = defineProps(['readOnly']);
const store = useCreditRequestStore();

// Default to 'add' if not readOnly and no projects, else 0
onMounted(() => {
  if (!store.transactionData.projects) {
    store.transactionData.projects = [];
  }
  if (store.activeProjectTab === 'projectInfo' || store.activeProjectTab === 'requestInfo' || store.activeProjectTab === 'projectAddress' || store.activeProjectTab === 'projectPhasing') {
    if (store.transactionData.projects.length > 0) {
      store.setActiveProjectTab(0);
    } else {
      store.setActiveProjectTab('add');
    }
  }
});

const currentTab = computed({
  get: () => store.activeProjectTab,
  set: (val) => store.setActiveProjectTab(val)
});

const projects = computed(() => {
  return store.transactionData.projects || [];
});

watch(projects, (newProjects) => {
  if (newProjects.length === 0 && !props.readOnly) {
    currentTab.value = 'add';
  }
}, { deep: true });

const handleTabClick = (tabId) => {
  currentTab.value = tabId;
};
</script>

<style scoped>
.project-application-tabs {
  background: white;
  border-radius: 8px;
}

.tabs-container {
  padding: 0 20px 20px 20px;
}

.tabs-header {
  display: flex;
  background-color: #999;
  border-radius: 52px;
  overflow: hidden;
  width: 80%;
  height: fit-content;
  margin: 0 auto;
}

.tab-item {
  flex: 1;
  text-align: center;
  padding: 4px 0px;
  cursor: pointer;
  font-weight: 500;
  color: white;
  position: relative;
  transition: all 0.2s;
  border-radius: 50px;
}

.tab-item:hover {
  background-color: rgba(255, 255, 255, 0.1);
}

.tab-item.active {
  background-color: white;
  color: #333;
  font-weight: bold;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  border: 1px solid #e0e0e0;
}

.tab-content {
  padding: 0 20px 20px 20px;
  text-align: left;
}
</style>