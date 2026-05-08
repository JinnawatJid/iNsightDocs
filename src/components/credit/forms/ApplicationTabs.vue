<template>
  <div class="application-tabs">
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
        <component :is="currentTabComponent" :readOnly="props.readOnly" :viewMode="props.viewMode" :baseline="props.baseline" />
      </keep-alive>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import ResidenceTab from '../tabs/ResidenceTab.vue';
import GeneralInfoTab from '../tabs/GeneralInfoTab.vue';
import StoreCompanyTab from '../tabs/StoreCompanyTab.vue';
import StoreStatementTab from '../tabs/StoreStatementTab.vue';
import RequestInfoTab from '../tabs/RequestInfoTab.vue';
import { useCreditRequestStore } from '@/stores/creditRequest';

const props = defineProps(['readOnly', 'viewMode', 'baseline']);
onMounted(() => {
  console.log('[ApplicationTabs MOUNT] mounted');
  console.log('[ApplicationTabs MOUNT] props.baseline:', props.baseline);
  console.log('[ApplicationTabs MOUNT] props.readOnly:', props.readOnly);
  console.log('[ApplicationTabs MOUNT] props.viewMode:', props.viewMode);
});
const store = useCreditRequestStore();

const currentTab = computed({
  get: () => store.activeTab,
  set: (val) => store.setActiveTab(val)
});

const tabs = computed(() => {
  const storeLabel = store.isCompany ? 'ข้อมูลบริษัท' : 'ข้อมูลร้านค้า';
  const requestType = store.transactionData.requestType;

  const isChangeRequest = [
    'เครดิตเพิ่ม',
    'เปลี่ยนแปลงระยะเวลาเครดิต',
    'เปลี่ยนแปลงเงื่อนไขการชำระเงิน'
  ].some(t => requestType && requestType.includes(t));

  let requestInfoLabel = 'เงื่อนไขและคำขอ';
  if (isChangeRequest && props.viewMode === 'focus') {
    requestInfoLabel = 'เปลี่ยนแปลงข้อมูลคำขอ';
  }

  const allTabs = [
    { id: 'requestInfo', label: requestInfoLabel },
    { id: 'store', label: storeLabel },
    { id: 'general', label: 'ข้อมูลผู้มีอำนาจ' },
    { id: 'residence', label: 'ที่อยู่อาศัย' },
    { id: 'financial', label: 'เอกสารการเงิน' }
  ];

  // If viewMode is 'focus', only show Request Info tab
  if (props.viewMode === 'focus') {
      return [allTabs[0]];
  }

  return allTabs;
});

const handleTabClick = (tabId) => {
  currentTab.value = tabId;
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

const currentTabComponent = computed(() => {
  switch (currentTab.value) {
    case 'requestInfo':
      return RequestInfoTab;
    case 'general':
      return GeneralInfoTab;
    case 'residence':
      return ResidenceTab;
    case 'store':
      return StoreCompanyTab;
    case 'financial':
      return StoreStatementTab;
    default:
      return RequestInfoTab;
  }
});
</script>

<style scoped>
.application-tabs {
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
