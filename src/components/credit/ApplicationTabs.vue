<template>
  <div class="application-tabs">
    <div class="tabs-container">
      <div class="tabs-header">
        <div
          v-for="(tab, index) in tabs"
          :key="index"
          :class="['tab-item', { active: currentTab === tab.id }]"
          @click="currentTab = tab.id"
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

<script>
import ResidenceTab from './tabs/ResidenceTab.vue';
import GeneralInfoTab from './tabs/GeneralInfoTab.vue';
import StoreCompanyTab from './tabs/StoreCompanyTab.vue';
import StoreStatementTab from './tabs/StoreStatementTab.vue';
import RequestInfoTab from './tabs/RequestInfoTab.vue';
import { useCreditRequestStore } from '@/stores/creditRequest';

export default {
  name: 'ApplicationTabs',
  components: {
    ResidenceTab,
    GeneralInfoTab,
    StoreCompanyTab,
    StoreStatementTab,
    RequestInfoTab
  },
  props: ['readOnly'],
  setup() {
    const creditRequestStore = useCreditRequestStore();
    return { creditRequestStore };
  },
  data() {
    return {
      currentTab: 'requestInfo'
    };
  },
  computed: {
    tabs() {
      // Determine label for Store/Company tab
      const storeLabel = this.creditRequestStore.isCompany ? 'ที่อยู่บริษัท' : 'ที่อยู่ร้านค้า';

      const allTabs = [
        { id: 'requestInfo', label: 'ข้อมูลคำขอ' },
        { id: 'general', label: 'ข้อมูลทั่วไป' },
        { id: 'residence', label: 'ที่อยู่อาศัย' },
        { id: 'store', label: storeLabel },
        { id: 'financial', label: 'เอกสารการเงิน' }
      ];

      // Logic: Financial tab is now shown for both (User requirement)
      return allTabs;
    },
    currentTabComponent() {
      switch (this.currentTab) {
        case 'requestInfo':
          return 'RequestInfoTab';
        case 'general':
          return 'GeneralInfoTab';
        case 'residence':
          return 'ResidenceTab';
        case 'store':
          return 'StoreCompanyTab';
        case 'financial':
          return 'StoreStatementTab';
        default:
          return 'RequestInfoTab';
      }
    }
  }
};
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
