<template>
  <div class="project-application-tabs">
    <div class="tabs-container">
      <div class="tabs-header">
        <div
          v-for="tab in tabs"
          :key="tab.id"
          :class="['tab-item', { active: currentTab === tab.id }]"
          @click="handleTabClick(tab.id)"
        >
          {{ tab.label }}
        </div>
      </div>
    </div>

    <div class="tab-content">
      <keep-alive>
        <component
          :is="currentTabComponent"
          :readOnly="readOnly"
          :projectIndex="projectIndex"
        />
      </keep-alive>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import ProjectInfoSection from './tabs/project-workspace/ProjectInfoSection.vue';
import ProjectAddressSection from './tabs/project-workspace/ProjectAddressSection.vue';
import ProjectPhasingSection from './tabs/project-workspace/ProjectPhasingSection.vue';

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

// Use local state for inner tabs so each project box can switch independently
const currentTab = ref('projectInfo');

const tabs = [
  { id: 'projectInfo', label: 'ข้อมูลโครงการ' },
  { id: 'projectAddress', label: 'ที่อยู่โครงการ' },
  { id: 'projectPhasing', label: 'รอบส่งสินค้า' }
];

const handleTabClick = (tabId) => {
  currentTab.value = tabId;
};

const currentTabComponent = computed(() => {
  switch (currentTab.value) {
    case 'projectInfo':
      return ProjectInfoSection;
    case 'projectAddress':
      return ProjectAddressSection;
    case 'projectPhasing':
      return ProjectPhasingSection;
    default:
      return ProjectInfoSection;
  }
});
</script>

<style scoped>
.project-application-tabs {
  background: white;
  border-radius: 8px;
}

.tabs-container {
  padding: 20px;
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