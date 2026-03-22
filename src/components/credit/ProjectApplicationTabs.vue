<template>
  <div class="project-application-tabs">
    <div class="tabs-container">
      <div class="tabs-header">
        <div
          v-for="(tab, index) in tabs"
          :key="index"
          :class="['tab-item', { active: currentTab === tab.id }]"
          @click="handleTabClick(tab.id)"
        >
          {{ tab.label }}
        </div>
      </div>
    </div>

    <div class="tab-content">
      <keep-alive>
        <component :is="currentTabComponent" :readOnly="readOnly" />
      </keep-alive>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import ProjectInfoTab from './tabs/ProjectInfoTab.vue';
import StoreCompanyTab from './tabs/StoreCompanyTab.vue';
import ProjectPhasingTab from './tabs/ProjectPhasingTab.vue';
import RequestInfoTab from './tabs/RequestInfoTab.vue';
import { useCreditRequestStore } from '@/stores/creditRequest';

const props = defineProps(['readOnly']);
const store = useCreditRequestStore();

const currentTab = computed({
  get: () => store.activeProjectTab,
  set: (val) => store.setActiveProjectTab(val)
});

const tabs = computed(() => {
  return [
    { id: 'projectInfo', label: 'ข้อมูลและเอกสารโครงการ' },
    { id: 'projectAddress', label: 'ที่อยู่โครงการ' },
    { id: 'projectPhasing', label: 'รอบเครดิตและการจ่ายเงิน' },
    { id: 'requestInfo', label: 'เงื่อนไขและคำขอ' }
  ];
});

const handleTabClick = (tabId) => {
  currentTab.value = tabId;
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

const currentTabComponent = computed(() => {
  switch (currentTab.value) {
    case 'projectInfo':
      return ProjectInfoTab;
    case 'projectAddress':
      return StoreCompanyTab;
    case 'projectPhasing':
      return ProjectPhasingTab;
    case 'requestInfo':
      return RequestInfoTab;
    default:
      return ProjectInfoTab;
  }
});
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