<template>
  <div class="credit-history-sidebar">
    <div class="customer-header">
      <div class="avatar">
        <img :src="userIcon" alt="User" width="24" height="24" />
      </div>
      <div class="customer-info" v-if="customerName">
        <div class="customer-name">{{ customerName }}</div>
        <div class="customer-code" v-if="customerCode">ID: {{ customerCode }}</div>
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
            <div
              class="request-type"
              :class="getRequestTypeClass(item.requestType)"
              v-if="item.requestType"
            >
              {{ item.requestType }}
            </div>
            <!-- item.txId is the TxID, and item.requestAmount is the requested amount -->
            <div class="tx-id">{{ item.txId || item.amount }}</div>
            <div class="request-amount" v-if="item.requestAmount">
              วงเงินที่ขอ: {{ formatCurrency(item.requestAmount) }} บาท
            </div>
            <div class="date">{{ formatDate(item.date) }}</div>
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
        ไม่พบคำขอเครดิตก่อนหน้าในระบบ
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
  emits: ['request-selected'],
  props: {
    customerName: {
      type: String,
      default: ''
    },
    customerCode: {
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
      formatCurrency(val) {
          if (!val) return '0.00';
          const num = Number(val);
          if (isNaN(num)) return '0.00';
          return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      },
      handleClick(item) {
          // item.txId holds the TxId (fallback to item.amount for legacy compatibility)
          const txId = item.txId || item.amount;
          if (txId) {
              this.store.loadRequestDetail(txId);
              this.$emit('request-selected', item);
          }
      },
      getRequestTypeClass(type) {
          if (!type) return 'type-new'; // Default
          if (type.includes('เครดิตเพิ่ม')) return 'type-increase';
          if (type.includes('เครดิตโครงการ')) return 'type-project';
          if (type.includes('เปลี่ยนแปลง')) return 'type-change';
          return 'type-new';
      },
      formatDate(dateString) {
          if (!dateString) return '';

          // Apply the same timezone offset fix as RequestTimeline (strip 'Z')
          let normalizedDateString = dateString;
          if (normalizedDateString.endsWith('Z')) {
              normalizedDateString = normalizedDateString.slice(0, -1);
          }

          const date = new Date(normalizedDateString);

          // Check if date is invalid (e.g. if item.date is not an ISO string but pre-formatted)
          if (isNaN(date.getTime())) {
              return dateString; // Fallback to raw string if it can't be parsed
          }

          const d = String(date.getDate()).padStart(2, '0');
          const m = String(date.getMonth() + 1).padStart(2, '0');
          const y = date.getFullYear(); // Gregorian year
          const hh = String(date.getHours()).padStart(2, '0');
          const mm = String(date.getMinutes()).padStart(2, '0');

          return `${d}/${m}/${y} ${hh}:${mm} น.`;
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

.customer-info {
  display: flex;
  flex-direction: column;
}

.customer-code {
  font-size: 14px;
  color: #666;
  text-align: left;
  margin-top: 4px;
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

.request-type {
  font-weight: 500;
  font-size: 12px;
  padding: 2px 8px;
  border-radius: 12px;
  display: inline-block;
  width: fit-content;
  margin-bottom: 4px;
}

/* New Credit (Default - Blue) */
.type-new {
  color: #0056b3;
  background-color: #e7f1ff;
}

/* Increase Credit (Green) */
.type-increase {
  color: #0f5132;
  background-color: #d1e7dd;
}

/* Project Credit (Purple) */
.type-project {
  color: #6f42c1;
  background-color: #e0cffc;
}

/* Changes (Orange) - Term & Condition */
.type-change {
  color: #856404;
  background-color: #fff3cd;
}

.tx-id {
  font-weight: bold;
  font-size: 14px;
  color: #333;
  margin-bottom: 2px;
}

.request-amount {
  font-size: 13px;
  color: #555;
  margin-bottom: 2px;
}

.date {
  color: #888;
  font-size: 12px;
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
