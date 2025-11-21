<template>
  <div class="credit-history-sidebar">
    <div class="customer-header">
      <div class="avatar">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-user"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
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

      <div class="history-list" v-if="historyItems.length > 0">
        <div v-for="item in historyItems" :key="item.id" class="history-item">
          <div class="item-info">
            <div class="date">{{ item.date }}</div>
            <div class="amount">{{ item.amount }}</div>
          </div>
          <div class="item-status">
             <svg v-if="item.status === 'pending'" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#FFA500" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-clock"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
             <svg v-if="item.status === 'rejected'" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="red" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-x-circle"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>
             <svg v-if="item.status === 'approved'" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="green" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-check-circle"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
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
}

.customer-name.placeholder {
  color: #aaa;
}

.history-section {
  padding: 20px;
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
  border-bottom: 1px solid #f0f0f0;
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

.amount {
  font-weight: bold;
  font-size: 16px;
}

.no-history {
  color: #888;
  font-style: italic;
  margin-top: 10px;
}
</style>
