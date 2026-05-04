<template>
  <div class="credit-review-section unified-card">
    <div class="review-header">
      <h4>บันทึกการพิจารณา</h4>
      <span v-if="showTerms" class="role-badge">สำหรับผู้จัดการและฝ่ายสินเชื่อ</span>
    </div>

    <div class="review-content">
      <!-- Request Timeline (Moved to Top) -->
      <div class="comments-history-wrapper">
         <RequestTimeline :comments="comments" :currentStatus="store.requestStatus" :requestAmount="store.transactionData?.amount" />
      </div>

      <!-- Separator if we have terms -->
      <div v-if="showTerms" class="section-separator"></div>

      <!-- Terms Section (Manager Only) -->
      <div v-if="showTerms" class="terms-grid-wrapper">
         <div class="form-grid-four">
            <!-- Credit Amount -->
            <div class="form-group">
                <label>วงเงินเครดิต (บาท)</label>
                <input
                type="text"
                class="form-input"
                v-model="formattedAmount"
                :disabled="readOnly"
                />
            </div>
             <!-- Terms -->
            <div class="form-group">
                <label>เครดิต (กระจก, กาว)</label>
                <input
                type="text"
                class="form-input"
                v-model="store.transactionData.termGS"
                @input="restrictNumber('termGS', $event)"
                :disabled="readOnly"
                placeholder="0"
                />
            </div>
            <div class="form-group">
                <label>เครดิต (อลูมิเนียม, Acc)</label>
                <input
                type="text"
                class="form-input"
                v-model="store.transactionData.termAE"
                @input="restrictNumber('termAE', $event)"
                :disabled="readOnly"
                placeholder="0"
                />
            </div>
            <div class="form-group">
                <label>เครดิต (ยิปซั่ม, ซีลาย)</label>
                <input
                type="text"
                class="form-input"
                v-model="store.transactionData.termYC"
                @input="restrictNumber('termYC', $event)"
                :disabled="readOnly"
                placeholder="0"
                />
            </div>
         </div>
      </div>

      <!-- New Comment Input (Bottom) -->
      <div v-if="!readOnly" class="new-comment-box">
        <h5 class="comment-label">ความคิดเห็น: {{ currentRole }}</h5>
        <textarea
            class="comment-input"
            :placeholder="placeholderText"
            :value="modelValue"
            @input="$emit('update:modelValue', $event.target.value)"
            rows="5"
        ></textarea>
      </div>

      <!-- Revision Button for Maker on Rejected Requests -->
      <div v-if="showReviseButton" class="revision-action-wrapper">
        <button class="btn revise-btn" @click="handleReviseRequest" :disabled="isRevising">
            <span v-if="isRevising" class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
            สร้างคำขอใหม่ (แก้ไข)
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useCreditRequestStore } from '@/stores/creditRequest';
import { useRbacStore } from '@/stores/rbac';
import { useAuthStore } from '@/stores/auth';
import RequestTimeline from './RequestTimeline.vue';
import { commentPlaceholders } from '@/config/workflow';
import { computed, ref, onMounted, watch } from 'vue';
import { useRouter } from 'vue-router';
import Swal from 'sweetalert2';
import CustomerService from '@/services/CustomerService';

const props = defineProps({
  readOnly: { type: Boolean, default: false },
  showTerms: { type: Boolean, default: false },
  comments: { type: Array, default: () => [] },
  currentRole: { type: String, default: '' },
  modelValue: { type: String, default: '' } // For v-model of new comment
});

const emit = defineEmits(['update:modelValue']);

const store = useCreditRequestStore();
const authStore = useAuthStore();
const rbacStore = useRbacStore();
const router = useRouter();

const isRevising = ref(false);

const showReviseButton = computed(() => {
    const isRejected = store.requestStatus === 'Rejected';
    const isMaker = rbacStore.hasPermission('create_request');
    return isRejected && isMaker;
});

const handleReviseRequest = async () => {
    if (isRevising.value) return;

    try {
        const result = await Swal.fire({
            title: 'สร้างคำขอใหม่ (แก้ไข)',
            text: 'ระบบจะสร้างฉบับร่างใหม่จากข้อมูลเดิม โดยไม่คัดลอกประวัติการพิจารณา คุณต้องการดำเนินการต่อหรือไม่?',
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'ยืนยัน',
            cancelButtonText: 'ยกเลิก',
            confirmButtonColor: '#0052cc',
            cancelButtonColor: '#dc3545'
        });

        if (result.isConfirmed) {
            isRevising.value = true;
            const newTxId = await store.reviseRequest();
            if (newTxId) {
                await Swal.fire({
                    icon: 'success',
                    title: 'สร้างคำขอใหม่สำเร็จ',
                    text: `รหัสคำขอใหม่ของคุณคือ: ${newTxId}`,
                    timer: 2000,
                    showConfirmButton: false
                });
                // Redirect to create page
                // It's up to the user to select the new draft from the left side history
                // or we could force a page reload and then load it.
                // The easiest way is to pass a ?search and tell the store to load it
                // Navigate to the create-credit-request page with both search and txId query parameters.
                // This ensures the page automatically loads the customer and the specific draft request.
                await router.push({
                    path: '/create-credit-request',
                    query: { search: store.customer.id, txId: newTxId }
                });
            }
        }
    } catch (error) {
        Swal.fire({
            icon: 'error',
            title: 'เกิดข้อผิดพลาด',
            text: error.response?.data?.error || 'ไม่สามารถสร้างคำขอใหม่ได้',
        });
    } finally {
        isRevising.value = false;
    }
};

const placeholderText = computed(() => {
    const status = store.requestStatus || 'Draft';
    // Fallback if status not found in map
    return commentPlaceholders[status] || 'ระบุพฤติกรรมลูกค้า, ประวัติโครงการ, การซื้อขายล่าสุด, หรือข้อมูลประกอบการพิจารณาอื่นๆ...';
});

const erpFallbackData = ref(null);
const fetchErpFallbackData = async () => {
    if (!store.customer?.id) return;
    try {
        const result = await CustomerService.searchCustomers(store.customer.id);
        if (Array.isArray(result) && result.length > 0 && result[0].customer) {
            erpFallbackData.value = result[0].customer;
        }
    } catch (e) {
        console.error('Failed to fetch ERP fallback data', e);
    }
};

onMounted(() => {
    if (store.customer?.id) fetchErpFallbackData();
});
watch(() => store.customer?.id, (newVal) => {
    if (newVal) fetchErpFallbackData();
});

const isCreditIncrease = computed(() => {
    return store.transactionData.requestType?.includes('เครดิตเพิ่ม') || false;
});

const getBaseAmount = () => {
    let base = 0;
    if (store.originalTransactionData?.amount !== undefined && store.originalTransactionData?.amount !== null) {
        base = parseFloat(String(store.originalTransactionData.amount).replace(/,/g, ''));
    } else if (erpFallbackData.value && erpFallbackData.value.current_credit_limit !== undefined) {
        base = parseFloat(String(erpFallbackData.value.current_credit_limit).replace(/,/g, ''));
    }
    return isNaN(base) ? 0 : base;
};

const formattedAmount = computed({
    get: () => {
        if (store.transactionData.amount === null || store.transactionData.amount === undefined || store.transactionData.amount === '') return '';
        const requestAmount = parseFloat(String(store.transactionData.amount).replace(/,/g, ''));
        if (isNaN(requestAmount)) return '';
        
        if (isCreditIncrease.value) {
            return (getBaseAmount() + requestAmount).toLocaleString('en-US');
        } else {
            return requestAmount.toLocaleString('en-US');
        }
    },
    set: (val) => {
        let num = String(val).replace(/[^0-9.]/g, '');
        const parts = num.split('.');
        if (parts.length > 2) num = parts[0] + '.' + parts.slice(1).join('');
        
        let totalInput = parseFloat(num);
        if (isNaN(totalInput)) {
            store.transactionData.amount = num;
            return;
        }

        if (isCreditIncrease.value) {
            const delta = totalInput - getBaseAmount();
            store.transactionData.amount = delta.toString();
        } else {
            store.transactionData.amount = num;
        }
    }
});

function restrictNumber(field, e) {
  const val = e.target.value.replace(/\D/g, '');
  store.transactionData[field] = val;
  e.target.value = val;
}
</script>

<style scoped>
.revision-action-wrapper {
  margin-top: 1.5rem;
  display: flex;
  justify-content: flex-end;
  border-top: 1px dashed #e2e8f0;
  padding-top: 1rem;
}

.revise-btn {
  background-color: transparent;
  color: #0056FF;
  border: 1px solid #0056FF;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  font-weight: 500;
  transition: all 0.2s;
  cursor: pointer;
}

.revise-btn:hover:not(:disabled) {
  background-color: #f0f5ff;
}

.revise-btn:disabled {
  opacity: 0.65;
  cursor: not-allowed;
}
.credit-review-section {
  margin-bottom: 20px;
  background-color: #f8f9fa; /* Unified light background */
  border: 1px solid #e0e0e0;
  border-radius: 8px;
}

.review-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px 20px;
  border-bottom: 1px solid #e0e0e0;
  background-color: #fff; /* Header white */
  border-radius: 8px 8px 0 0;
}

.review-header h4 {
  margin: 0;
  font-size: 16px;
  font-weight: bold;
  color: #333;
}

.role-badge {
  font-size: 12px;
  background-color: #e9ecef;
  color: #666;
  padding: 2px 8px;
  border-radius: 10px;
}

.review-content {
  padding: 20px;
  display: flex;
  flex-direction: column;
}

.terms-grid-wrapper {
  margin-bottom: 20px;
}

.form-grid-four {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr 1fr; /* 4 columns for single row */
  gap: 15px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.form-group label {
  font-size: 14px;
  color: #333;
  font-weight: 500;
}

.form-input {
  padding: 10px;
  border: 1px solid #ced4da;
  border-radius: 4px;
  font-size: 14px;
  font-family: inherit;
  width: 100%; /* Ensure full width in grid cell */
  box-sizing: border-box;
  background-color: #fff;
  color: #333;
}

.form-input:disabled {
  background-color: #e9ecef;
  color: #6c757d;
}

.section-separator {
  margin: 20px 0;
  border-top: 1px solid #e0e0e0;
}

.new-comment-box {
    margin-top: 20px;
}

.comment-label {
    margin: 0 0 10px 0;
    font-size: 14px;
    font-weight: bold;
    color: #333;
}

.comment-input {
  width: 100%;
  padding: 12px;
  border: 1px solid #ced4da; /* Match input border */
  border-radius: 4px;
  background-color: #fff;
  box-sizing: border-box;
  color: black;
  font-family: inherit;
  resize: vertical;
}

/* Responsive */
@media (max-width: 768px) {
    .form-grid-four {
        grid-template-columns: 1fr 1fr; /* 2x2 on smaller screens */
    }
}
</style>
