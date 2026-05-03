<template>
  <div class="customer-profile-dashboard">
    <!-- Identity Section -->
    <div class="dashboard-card identity-card">
      <div class="card-header">
        <h3 class="card-title">ข้อมูลลูกค้า</h3>
        <div class="header-actions-group">
          <div class="blacklist-toggle-group" v-if="canManageBlacklist">
             <span class="toggle-label" :class="{ 'is-active': isBlacklisted }">สถานะ NPL</span>
             <label class="switch">
                <input type="checkbox" :checked="isBlacklisted" @change="toggleBlacklistStatus">
                <span class="slider round"></span>
             </label>
          </div>
          <span class="badge-type" :class="customerTypeClass">{{ customerTypeLabel }}</span>
        </div>
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
import { useAuthStore } from '@/stores/auth';
import { computed } from 'vue';
import Swal from 'sweetalert2';
import CustomerService from '@/services/CustomerService';

export default {
  name: 'CustomerProfileDashboard',
  setup() {
    const store = useCreditRequestStore();
    const authStore = useAuthStore();

    const customer = computed(() => store.customer || {});

    const canManageBlacklist = computed(() => {
      return authStore.hasPermission('manage_blacklist');
    });

    const isBlacklisted = computed(() => store.financialSummary?.is_blacklisted || false);

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
      if (String(code).toUpperCase() === 'CASH') return 'เงินสด';
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



    const toggleBlacklistStatus = async (event) => {
      const newValue = event.target.checked;
      // Revert UI immediately until confirmed
      event.target.checked = !newValue;

      const confirmMsg = newValue
        ? 'คุณต้องการเพิ่มลูกค้ารายนี้ลงในบัญชี NPL ใช่หรือไม่?'
        : 'คุณต้องการปลดลูกค้ารายนี้ออกจากบัญชี NPL ใช่หรือไม่?';

      const { isConfirmed } = await Swal.fire({
        title: 'ยืนยันการเปลี่ยนแปลง',
        text: confirmMsg,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'ยืนยัน',
        cancelButtonText: 'ยกเลิก',
        confirmButtonColor: newValue ? '#dc3545' : '#28a745'
      });

      if (isConfirmed) {
        try {
          const payload = {
            taxId: customer.value.tax_id || customer.value["VAT Registration No_"] || '',
            name: customer.value.name || '',
            shopName: customerTypeLabel.value === 'ลูกค้าบริษัท' ? customer.value.name || '' : '',
            is_blacklisted: newValue
          };

          await CustomerService.toggleBlacklist(payload);

          Swal.fire({
            icon: 'success',
            title: 'สำเร็จ',
            text: 'อัปเดตข้อมูลสถานะ NPL เรียบร้อยแล้ว',
            timer: 1500,
            showConfirmButton: false
          });

          // Re-fetch customer to update UI
          if (customer.value.id || customer.value.tax_id) {
            await store.searchCustomer(customer.value.id || customer.value.tax_id);
          }
        } catch (error) {
          Swal.fire({
            icon: 'error',
            title: 'ข้อผิดพลาด',
            text: 'ไม่สามารถอัปเดตข้อมูลได้ กรุณาลองใหม่อีกครั้ง'
          });
        }
      }
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
      formatCurrency,
      isBlacklisted,
      canManageBlacklist,
      toggleBlacklistStatus
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

.header-actions-group {
  display: flex;
  align-items: center;
  gap: 15px;
}

.blacklist-toggle-group {
  display: flex;
  align-items: center;
  gap: 8px;
}

.toggle-label {
  font-size: 13px;
  font-weight: bold;
  color: #6c757d;
  transition: color 0.3s ease;
}

.toggle-label.is-active {
  color: #dc3545;
}

/* The switch - the box around the slider */
.switch {
  position: relative;
  display: inline-block;
  width: 40px;
  height: 22px;
  margin: 0;
}

/* Hide default HTML checkbox */
.switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

/* The slider */
.slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: #ccc;
  -webkit-transition: .4s;
  transition: .4s;
}

.slider:before {
  position: absolute;
  content: "";
  height: 16px;
  width: 16px;
  left: 3px;
  bottom: 3px;
  background-color: white;
  -webkit-transition: .4s;
  transition: .4s;
}

input:checked + .slider {
  background-color: #dc3545;
}

input:focus + .slider {
  box-shadow: 0 0 1px #dc3545;
}

input:checked + .slider:before {
  -webkit-transform: translateX(18px);
  -ms-transform: translateX(18px);
  transform: translateX(18px);
}

/* Rounded sliders */
.slider.round {
  border-radius: 22px;
}

.slider.round:before {
  border-radius: 50%;
}
</style>