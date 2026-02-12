<template>
  <div class="credit-action-menu">
    <!-- Customer Snapshot Card -->
    <div class="customer-snapshot">
      <div class="snapshot-header">
        <h3>{{ customerName }}</h3>
        <span class="customer-id">{{ customerCode }}</span>
      </div>

      <div class="snapshot-details">
        <div class="detail-item">
          <label>วงเงินเครดิตปัจจุบัน</label>
          <span class="value" :class="{ 'has-credit': currentCredit > 0, 'no-credit': currentCredit === 0 }">
             {{ formatCurrency(currentCredit) }}
          </span>
        </div>
        <div class="detail-item">
          <label>เทอมการชำระเงิน</label>
          <span class="value">{{ currentTerms || '-' }}</span>
        </div>
      </div>
    </div>

    <!-- Action Buttons -->
    <div class="action-section">
      <h4>เลือกประเภทคำขอที่ต้องการทำรายการ</h4>

      <div v-if="hasExistingCredit" class="action-grid">
        <button class="action-btn increase" @click="selectType('เครดิตเพิ่ม')">
          <div class="icon-wrapper">📈</div>
          <span>ขอเพิ่มวงเงินเครดิต</span>
          <small>Increase Credit Limit</small>
        </button>

        <button class="action-btn terms" @click="selectType('เปลี่ยนแปลงเงื่อนไขการชำระเงิน')">
          <div class="icon-wrapper">📝</div>
          <span>เปลี่ยนแปลงเงื่อนไข</span>
          <small>Change Payment Terms</small>
        </button>

        <button class="action-btn project" @click="selectType('เครดิตโครงการ')">
          <div class="icon-wrapper">🏗️</div>
          <span>ขอเครดิตโครงการ</span>
          <small>Project Base Credit</small>
        </button>
      </div>

      <div v-else class="action-single">
         <button class="action-btn new-credit" @click="selectType('เครดิตใหม่')">
            <div class="icon-wrapper">✨</div>
            <span>ขอเปิดวงเงินเครดิตใหม่</span>
            <small>New Credit Request</small>
         </button>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'CreditActionMenu',
  props: {
    customerName: {
      type: String,
      default: ''
    },
    customerCode: {
      type: String,
      default: ''
    },
    currentCredit: {
      type: [Number, String],
      default: 0
    },
    currentTerms: {
      type: String,
      default: ''
    }
  },
  emits: ['select'],
  computed: {
    hasExistingCredit() {
      // Check if credit > 0. Handle string inputs safely.
      const val = parseFloat(String(this.currentCredit).replace(/,/g, ''));
      return !isNaN(val) && val > 0;
    }
  },
  methods: {
    formatCurrency(val) {
      if (!val) return '0.00';
      return Number(val).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    },
    selectType(type) {
      this.$emit('select', type);
    }
  }
};
</script>

<style scoped>
.credit-action-menu {
  background: white;
  border-radius: 12px;
  padding: 30px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.05);
  text-align: center;
  max-width: 800px;
  margin: 0 auto;
}

.customer-snapshot {
  border-bottom: 1px solid #eee;
  padding-bottom: 20px;
  margin-bottom: 30px;
}

.snapshot-header h3 {
  margin: 0 0 5px;
  color: #333;
  font-size: 24px;
}

.customer-id {
  color: #666;
  font-size: 14px;
  background: #f0f0f0;
  padding: 2px 8px;
  border-radius: 4px;
}

.snapshot-details {
  display: flex;
  justify-content: center;
  gap: 40px;
  margin-top: 20px;
}

.detail-item {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.detail-item label {
  font-size: 14px;
  color: #888;
  margin-bottom: 4px;
}

.detail-item .value {
  font-size: 20px;
  font-weight: bold;
  color: #333;
}

.value.has-credit {
  color: #2e7d32; /* Green */
}

.value.no-credit {
  color: #d32f2f; /* Red */
}

.action-section h4 {
  margin-bottom: 24px;
  color: #555;
  font-weight: normal;
}

.action-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
}

.action-single {
  display: flex;
  justify-content: center;
}

.action-btn {
  background: white;
  border: 2px solid #e0e0e0;
  border-radius: 12px;
  padding: 20px;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  min-height: 140px;
  width: 100%;
}

.action-single .action-btn {
    width: 300px; /* Wider for single button */
    border-color: #0056FF;
    background-color: #f0f5ff;
}

.action-btn:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 16px rgba(0,0,0,0.1);
  border-color: #0056FF;
}

.icon-wrapper {
  font-size: 32px;
  margin-bottom: 5px;
}

.action-btn span {
  font-weight: bold;
  font-size: 16px;
  color: #333;
}

.action-btn small {
  color: #888;
  font-size: 12px;
}

/* Colors for specific buttons */
.action-btn.new-credit:hover {
  background-color: #e3f2fd;
}

.action-btn.increase:hover {
  background-color: #e8f5e9;
  border-color: #2e7d32;
}

.action-btn.terms:hover {
  background-color: #fff3e0;
  border-color: #ef6c00;
}

.action-btn.project:hover {
  background-color: #f3e5f5;
  border-color: #7b1fa2;
}
</style>
