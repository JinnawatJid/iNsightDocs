<template>
  <div class="credit-history-sidebar">
    <div class="customer-header">
      <div class="avatar">
        <img :src="userIcon" alt="User" width="24" height="24" />
      </div>
      <div class="customer-name" v-if="customerName">
        {{ customerName }}
      </div>
      <div class="customer-name placeholder" v-else>
        -- ชื่อลูกค้า --
      </div>
    </div>

    <div class="history-section">
      <h3>ประวัติการขอเครดิต</h3>
      <span class="subtitle" v-if="historyItems.length > 0">ทั้งหมด {{ historyItems.length }} รายการ</span>
      <hr v-if="historyItems.length > 0" />
      <div class="history-list" v-if="historyItems.length > 0">
        <div class="history-item clickable" v-for="(item, index) in historyItems" :key="item.id" @click="handleClick(item)">
          <div class="item-info">
            <div class="date">{{ item.date }}</div>
            <div class="request-type" v-if="item.requestType">{{ item.requestType }}</div>
            <!-- item.amount is actually the TxID in the current API mapping -->
            <div class="amount">{{ item.amount }}</div>
          </div>
          <div class="item-status">
             <!-- Active Statuses -->
             <img v-if="['Opened', 'Submitted', 'Reviewed'].includes(item.status)" :src="clockIcon" :alt="item.status" width="24" height="24" />
             <!-- Negative Statuses -->
             <img v-if="['Rejected', 'Canceled'].includes(item.status)" :src="rejectedIcon" :alt="item.status" width="24" height="24" />
             <!-- Positive/Final Statuses -->
             <img v-if="['Approved', 'Closed'].includes(item.status)" :src="approvedIcon" :alt="item.status" width="24" height="24" />
             <!-- Fallback for legacy data -->
             <img v-if="item.status === 'pending'" :src="clockIcon" alt="Pending" width="24" height="24" />
             <img v-if="item.status === 'rejected'" :src="rejectedIcon" alt="Rejected" width="24" height="24" />
             <img v-if="item.status === 'approved'" :src="approvedIcon" alt="Approved" width="24" height="24" />
             <!-- Draft -->
             <span v-if="item.status === 'Draft'" class="draft-badge">Draft</span>
          </div>
        </div>
      </div>

      <div class="no-history" v-else-if="searched">
        ลูกค้าไม่เคยได้รับเครดิตมาก่อน
      </div>
    </div>
  </div>
</template>

<script>
import userIcon from '@/assets/icons/user.svg';
import clockIcon from '@/assets/icons/clock-orange.svg';
import rejectedIcon from '@/assets/icons/x-circle-red.svg';
import approvedIcon from '@/assets/icons/check-circle-green.svg';
import { useCreditRequestStore } from '@/stores/creditRequest';

export default {
  name: 'CreditHistorySidebar',
  props: {
    customerName: {
      type: String,
      default: ''
    },
    historyItems: {
      type: Array,
      default: () => []
    },
    searched: {
      type: Boolean,
      default: false
    }
  },
  setup() {
      const store = useCreditRequestStore();
      return { store };
  },
  data() {
    return {
      userIcon,
      clockIcon,
      rejectedIcon,
      approvedIcon
    };
  },
  methods: {
      handleClick(item) {
          // item.amount holds the TxId (e.g. AYCA2501/014) based on customerController logic
          const txId = item.amount;
          if (txId) {
              this.store.loadRequestDetail(txId);
          }
      }
  }
};
</script>

<style scoped>
.credit-history-sidebar {
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  overflow: hidden;
}

.customer-header {
  padding: 20px;
  border-bottom: 1px solid #e0e0e0;
  display: flex;
  align-items: center;
  gap: 15px;
}

.avatar {
  width: 40px;
  height: 40px;
  background-color: #f0f0f0;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.customer-name {
  font-weight: bold;
  font-size: 16px;
  text-align: left;
}

.customer-name.placeholder {
  color: #aaa;
}

.history-section {
  padding: 20px;
  text-align: left;
}

h3 {
  margin: 0;
  font-size: 18px;
  font-weight: bold;
}

.subtitle {
  color: #888;
  font-size: 14px;
  display: block;
  margin-bottom: 15px;
}

.history-list {
  display: flex;
  flex-direction: column;
}

.history-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px 0;
  border-bottom: 1px solid #e6e6e6;
  transition: background-color 0.2s;
}

.history-item.clickable {
    cursor: pointer;
}

.history-item.clickable:hover {
    background-color: #f9f9f9;
}

.history-item:last-child {
  border-bottom: none;
}

.item-info {
  display: flex;
  flex-direction: column;
}

.date {
  color: #888;
  font-size: 14px;
  margin-bottom: 4px;
}

.request-type {
  font-weight: 500;
  color: #333;
  font-size: 14px;
  margin-bottom: 2px;
}

.amount {
  font-weight: bold;
  font-size: 16px;
  color: #666;
}

.no-history {
  color: #888;
  font-style: italic;
  margin-top: 10px;
}

hr {
  border: none;
  border-top: 1px solid #e6e6e6;
  margin: 15px 0;
}

.draft-badge {
    background-color: #e0e0e0;
    color: #333;
    padding: 2px 6px;
    border-radius: 4px;
    font-size: 12px;
}

</style>
