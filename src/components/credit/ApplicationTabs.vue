<template>
  <div class="application-tabs">
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

    <div class="tab-content">
      <keep-alive>
        <component :is="currentTabComponent" :customerData="customerData" />
      </keep-alive>
    </div>
  </div>
</template>

<script>
// Placeholder components for other tabs, implementing ResidenceTab specifically now.
import ResidenceTab from './tabs/ResidenceTab.vue';
import GeneralInfoTab from './tabs/GeneralInfoTab.vue';
// import StoreAddressTab from './tabs/StoreAddressTab.vue';
// import FinancialDocumentsTab from './tabs/FinancialDocumentsTab.vue';

export default {
  name: 'ApplicationTabs',
  components: {
    ResidenceTab,
    GeneralInfoTab
  },
  props: {
    customerData: {
      type: Object,
      default: () => ({})
    }
  },
  data() {
    return {
      currentTab: 'residence', // Default to residence as per screenshot request
      tabs: [
        { id: 'general', label: 'ข้อมูลทั่วไป' },
        { id: 'residence', label: 'ที่อยู่อาศัย' },
        { id: 'store', label: 'ที่อยู่ร้านค้า' },
        { id: 'financial', label: 'เอกสารการเงิน' }
      ]
    };
  },
  computed: {
    currentTabComponent() {
      switch (this.currentTab) {
        case 'general':
          return 'GeneralInfoTab';
        case 'residence':
          return 'ResidenceTab';
        // case 'store': return 'StoreAddressTab';
        // case 'financial': return 'FinancialDocumentsTab';
        default:
          return 'ResidenceTab';
      }
    }
  }
};
</script>

<style scoped>
.application-tabs {
  background: white;
  border-radius: 8px;
  /* border: 1px solid #e0e0e0; */ /* Border handled by container? */
}

.tabs-header {
  display: flex;
  border-bottom: 1px solid #e0e0e0;
}

.tab-item {
  padding: 15px 25px;
  cursor: pointer;
  font-weight: 500;
  color: #666;
  position: relative;
}

.tab-item.active {
  color: #0056FF;
  font-weight: bold;
}

.tab-item.active::after {
  content: '';
  position: absolute;
  bottom: -1px;
  left: 0;
  width: 100%;
  height: 3px;
  background-color: #0056FF;
}

.tab-content {
  padding: 20px;
}
</style>
