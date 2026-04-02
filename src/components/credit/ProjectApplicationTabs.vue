<template>
  <div class="project-application-tabs" :class="{ 'vertical-layout': displayMode === 'vertical' }">
    <!-- Horizontal Layout -->
    <template v-if="displayMode === 'horizontal'">
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
    </template>

    <!-- Vertical Layout -->
    <template v-else>
       <div class="sidebar-container">
          <div class="sidebar-menu">
             <div
                v-if="!readOnly"
                :class="['sidebar-item', 'sidebar-add', { active: currentTab === 'add' }]"
                @click="handleTabClick('add')"
              >
                <span class="icon">+</span> เพิ่มโครงการใหม่
              </div>
              <div
                v-for="(project, index) in projects"
                :key="index"
                :class="['sidebar-item', { active: currentTab === index }]"
                @click="handleTabClick(index)"
              >
                <div class="sidebar-item-content">
                  <span class="project-title">{{ `โครงการที่ ${index + 1}` }}</span>
                  <span class="project-subtitle text-xs text-muted truncate" :title="project.projectData.name">{{ project.projectData.name }}</span>
                </div>
              </div>
          </div>
       </div>
       <div class="main-content">
          <div class="tab-content">
            <keep-alive>
              <AddProjectTab v-if="currentTab === 'add' && !readOnly" />
              <ProjectWorkspace v-else-if="typeof currentTab === 'number' && currentTab >= 0" :projectIndex="currentTab" :readOnly="readOnly" />
            </keep-alive>
          </div>
       </div>
    </template>

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

const displayMode = computed(() => store.projectDisplayMode);

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

/* Vertical Layout Styles */
.vertical-layout {
  display: flex;
  gap: 20px;
  padding: 20px;
}

.sidebar-container {
  width: 250px;
  flex-shrink: 0;
  border-right: 1px solid #eee;
  padding-right: 15px;
}

.main-content {
  flex: 1;
  min-width: 0; /* Prevents overflow */
}

.sidebar-menu {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.sidebar-item {
  padding: 12px 15px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  border: 1px solid transparent;
  display: flex;
  align-items: center;
}

.sidebar-item:hover {
  background-color: #f8f9fa;
  border-color: #e0e0e0;
}

.sidebar-item.active {
  background-color: #f0f5ff;
  border-color: #0056FF;
  box-shadow: 0 2px 4px rgba(0, 86, 255, 0.1);
}

.sidebar-add {
  color: #0056FF;
  font-weight: 500;
  justify-content: center;
  border: 1px dashed #0056FF;
  background-color: #f8fbff;
}

.sidebar-add:hover {
  background-color: #e6f0ff;
}

.sidebar-add .icon {
  margin-right: 8px;
  font-size: 18px;
  font-weight: bold;
}

.sidebar-item-content {
  display: flex;
  flex-direction: column;
  width: 100%;
  overflow: hidden;
}

.project-title {
  font-weight: 600;
  color: #333;
  margin-bottom: 4px;
}

.sidebar-item.active .project-title {
  color: #0056FF;
}

.text-muted {
  color: #888;
}

.truncate {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>