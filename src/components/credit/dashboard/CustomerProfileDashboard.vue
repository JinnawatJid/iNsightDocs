<template>
  <div class="customer-profile-dashboard">
    <!-- Identity Section -->
    <div class="dashboard-card identity-card">
      <div class="card-header">
        <h3 class="card-title">ข้อมูลลูกค้า</h3>
        <span class="badge-type" :class="customerTypeClass">{{ customerTypeLabel }}</span>
      </div>
      <div class="card-body">
        <div class="profile-main">
          <div class="avatar-placeholder">{{ avatarInitials }}</div>
          <div class="profile-details">
            <h2 class="customer-name">{{ customer.name || '-' }}</h2>
            <div class="detail-grid">
               <div class="detail-item">
                 <span class="label">รหัสลูกค้า:</span>
                 <span class="value">{{ customer.id || customer.No_ || '-' }}</span>
               </div>
               <div class="detail-item">
                 <span class="label">เลขประจำตัวผู้เสียภาษี:</span>
                 <span class="value">{{ customer.tax_id || '-' }}</span>
               </div>
               <div class="detail-item full-width">
                 <span class="label">ที่อยู่:</span>
                 <span class="value address-text">{{ fullAddress }}</span>
               </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Contract Status Section -->
    <div class="dashboard-grid">
      <!-- Credit Limit Card -->
      <div class="dashboard-card status-card">
        <div class="card-header-small">
          <span class="icon">💰</span>
          <span>วงเงินเครดิตปัจจุบัน</span>
        </div>
        <div class="card-body-centered">
          <div class="big-number" :class="{ 'zero-credit': !hasCredit }">
            {{ formatCurrency(currentCreditLimit) }}
          </div>
          <div class="sub-text">บาท (THB)</div>
        </div>
      </div>

      <!-- Payment Terms Card -->
      <div class="dashboard-card status-card">
        <div class="card-header-small">
          <span class="icon">📅</span>
          <span>เงื่อนไขการชำระเงิน</span>
        </div>
        <div class="card-body-centered">
          <div class="medium-text">{{ paymentTermsLabel }}</div>
          <div class="sub-text">เครดิตเทอม</div>
        </div>
      </div>

      <!-- Relationship Card -->
      <div class="dashboard-card status-card">
        <div class="card-header-small">
          <span class="icon">🤝</span>
          <span>ระยะเวลาความสัมพันธ์</span>
        </div>
        <div class="card-body-centered">
          <div class="medium-text">{{ customerSinceLabel }}</div>
          <div class="sub-text">เป็นลูกค้าตั้งแต่ {{ customerSinceYear }}</div>
        </div>
      </div>
    </div>

    <!-- Action Hint -->
    <div class="action-hint">
      <div class="hint-icon">ℹ️</div>
      <div class="hint-text">
        ตรวจสอบข้อมูลเบื้องต้นด้านบน หากถูกต้อง กรุณากดปุ่ม
        <strong>"+ เพิ่มคำขอเครดิต"</strong>
        ที่มุมขวาบนเพื่อดำเนินการต่อ
      </div>
    </div>
  </div>
</template>

<script>
import { useCreditRequestStore } from '@/stores/creditRequest';
import { computed } from 'vue';

export default {
  name: 'CustomerProfileDashboard',
  setup() {
    const store = useCreditRequestStore();

    const customer = computed(() => store.customer || {});

    const hasCredit = computed(() => {
      const limit = parseFloat(customer.value.current_credit_limit || 0);
      return limit > 0;
    });

    const currentCreditLimit = computed(() => {
      return parseFloat(customer.value.current_credit_limit || 0);
    });

    const customerTypeLabel = computed(() => {
      // Prioritize name-based check to fix issues where individual names are flagged as companies
      const name = customer.value.name || '';
      if (name.includes('บริษัท') || name.includes('จำกัด') || name.includes('หจก')) {
        return 'ลูกค้าบริษัท';
      }
      return 'ลูกค้าช่าง/ร้านค้า';
    });

    const customerTypeClass = computed(() => {
      return customerTypeLabel.value === 'ลูกค้าบริษัท' ? 'badge-corp' : 'badge-indiv';
    });

    const avatarInitials = computed(() => {
      const name = customer.value.name || '?';
      return name.substring(0, 1).toUpperCase();
    });

    const fullAddress = computed(() => {
      if (customer.value.address_company) return customer.value.address_company;

      const parts = [
        customer.value.address,
        customer.value.subdistrict,
        customer.value.district,
        customer.value.province,
        customer.value.zipcode
      ].filter(x => x && String(x).trim() !== '');

      return parts.length > 0 ? parts.join(' ') : '-';
    });

    const paymentTermsLabel = computed(() => {
      const code = customer.value.payment_terms_code;
      if (!code) return 'N/A';
      return `${code} วัน`;
    });

    const customerSinceYear = computed(() => {
       const val = customer.value.customer_since;
       if (!val) return '-';
       try {
           const date = new Date(val);
           if (isNaN(date.getTime())) return val;
           return date.getFullYear() + 543;
       } catch (e) {
           return val;
       }
    });

    const customerSinceLabel = computed(() => {
        const val = customer.value.customer_since;
        if (!val) return '-';
        try {
            const start = new Date(val);
            if (isNaN(start.getTime())) return '-';
            const now = new Date();
            const diffYears = now.getFullYear() - start.getFullYear();
            if (diffYears < 1) return '< 1 ปี';
            return `${diffYears} ปี`;
        } catch (e) {
            return '-';
        }
    });

    const formatCurrency = (val) => {
      if (val === undefined || val === null || isNaN(val)) return '0.00';
      return new Intl.NumberFormat('th-TH', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }).format(val);
    };

    return {
      customer,
      hasCredit,
      currentCreditLimit,
      customerTypeLabel,
      customerTypeClass,
      avatarInitials,
      fullAddress,
      paymentTermsLabel,
      customerSinceLabel,
      customerSinceYear,
      formatCurrency
    };
  }
};
</script>

<style scoped>
.customer-profile-dashboard {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.dashboard-card {
  background: white;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.05);
  border: 1px solid #f0f0f0;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.dashboard-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(0,0,0,0.08);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  border-bottom: 1px solid #f5f5f5;
  padding-bottom: 15px;
}

.card-title {
  margin: 0;
  font-size: 18px;
  color: #333;
  font-weight: 700;
}

.badge-type {
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: bold;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.badge-corp {
  background-color: #e3f2fd;
  color: #1976d2;
}

.badge-indiv {
  background-color: #e8f5e9;
  color: #2e7d32;
}

.profile-main {
  display: flex;
  gap: 24px;
  align-items: flex-start;
}

.avatar-placeholder {
  width: 72px;
  height: 72px;
  background: linear-gradient(135deg, #3f51b5 0%, #5c6bc0 100%);
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
  font-weight: bold;
  flex-shrink: 0;
  box-shadow: 0 4px 8px rgba(63, 81, 181, 0.3);
}

.profile-details {
  flex-grow: 1;
}

.customer-name {
  margin: 0 0 16px 0;
  font-size: 22px;
  color: #1a1a1a;
  font-weight: 700;
}

.detail-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
}

.detail-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.detail-item.full-width {
    grid-column: span 2;
}

.label {
  font-size: 12px;
  color: #666;
  font-weight: 600;
  text-transform: uppercase;
}

.value {
  color: #333;
  font-weight: 500;
  font-size: 15px;
}

.address-text {
    line-height: 1.5;
}

/* Grid for small cards */
.dashboard-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
}

.status-card {
  padding: 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.card-header-small {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: #666;
  margin-bottom: 15px;
  font-weight: 600;
  width: 100%;
}

.card-body-centered {
  flex-grow: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
}

.big-number {
  font-size: 32px;
  font-weight: 800;
  color: #0056FF;
  line-height: 1.2;
}

.big-number.zero-credit {
  color: #9e9e9e;
}

.medium-text {
  font-size: 24px;
  font-weight: 700;
  color: #333;
  line-height: 1.2;
}

.sub-text {
  font-size: 13px;
  color: #757575;
  margin-top: 6px;
}

.action-hint {
  display: flex;
  align-items: center;
  gap: 16px;
  background-color: #fff8e1;
  border: 1px solid #ffe082;
  padding: 16px 20px;
  border-radius: 8px;
  color: #5d4037;
  line-height: 1.5;
}

.hint-icon {
  font-size: 20px;
}

.hint-text {
  font-size: 15px;
}

@media (max-width: 992px) {
  .dashboard-grid {
    grid-template-columns: 1fr;
  }
  .profile-main {
      flex-direction: column;
      align-items: center;
      text-align: center;
  }
  .detail-grid {
      grid-template-columns: 1fr;
      text-align: left;
  }
  .detail-item.full-width {
      grid-column: span 1;
  }
}
</style>