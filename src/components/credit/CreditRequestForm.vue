<template>
  <div class="credit-request-form">
    <!-- Read Only Warning Banner -->
    <div v-if="isReadOnly" class="readonly-banner">
      <div class="banner-content">
        <span class="warning-icon">⚠️</span>
        <span>คำขอถูกส่งเรียบร้อยแล้ว (Read Only) หากต้องการแก้ไขข้อมูล กรุณายกเลิกคำขอก่อน</span>
      </div>
    </div>

    <div v-if="hasData" :key="store.customer.id" class="form-content-wrapper">
    <div class="unified-card">
      <div class="card-header">
        <h3>เอกสารประกอบการพิจารณา</h3>
      </div>
      <ApplicationTabs :readOnly="isReadOnly" />
    </div>

      <div class="form-footer">
        <!-- Unified Review Section (Terms + Comments) -->
        <CreditReviewSection
          :readOnly="isReadOnly"
          :showTerms="showTerms"
          :comments="comments"
          :currentRole="currentRoleLabel"
          v-model="newComment"
        />

        <div class="footer-info">
            <span class="author">Current Role: {{ currentRoleLabel }}</span>
        </div>

        <div class="action-buttons">
            <!-- Dynamic Actions based on Workflow Config -->
            <template v-for="(btn, index) in availableActions" :key="index">
                <button
                    :class="getButtonClass(btn.variant)"
                    @click="handleAction(btn)"
                >
                    {{ btn.label }}
                </button>
            </template>

            <!-- Cancel Button (Always available for active requests unless specifically excluded) -->
            <button
                v-if="canCancel"
                class="btn-cancel"
                @click="handleCancel"
            >
                ยกเลิกคำขอ
            </button>
        </div>
      </div>
    </div>
    
    <div v-else class="empty-state">
        <div class="empty-content">
            <img src="@/assets/icons/search-large.svg" alt="Search" class="empty-icon">
            <h3>กรุณาค้นหาข้อมูลลูกค้า</h3>
            <p>พิมพ์รหัสลูกค้าหรือชื่อบริษัทเพื่อเริ่มต้นสร้างคำขอเครดิต</p>
        </div>
    </div>
  </div>
</template>

<script setup>
import ApplicationTabs from './ApplicationTabs.vue';
import CreditReviewSection from './CreditReviewSection.vue';
import { useCreditRequestStore } from '@/stores/creditRequest';
import { workflowConfig, roleLabels } from '@/config/workflow';
import Swal from 'sweetalert2';
import axios from 'axios';
import { computed, ref } from 'vue';

const store = useCreditRequestStore();

// Computeds
const isReadOnly = computed(() => store.isReadOnly);
const comments = computed(() => store.comments);
const requestStatus = computed(() => store.requestStatus || 'Draft'); // Default to Draft
const currentRoleLabel = computed(() => roleLabels[requestStatus.value] || store.currentRole);
const hasData = computed(() => !!store.customer && !!store.customer.id);

// Logic for High Value > 300k
const isHighValue = computed(() => {
    const amtStr = store.transactionData.amount || '0';
    const amt = parseFloat(String(amtStr).replace(/,/g, ''));
    return amt > 300000;
});

// Logic for showing terms (Manager+)
const showTerms = computed(() => {
    return requestStatus.value && requestStatus.value !== 'Draft';
});

// Determine Available Actions
const availableActions = computed(() => {
    const actions = workflowConfig[requestStatus.value] || [];

    // Filter actions based on conditions (e.g., isHighValue)
    return actions.filter(action => {
        if (action.condition === 'isHighValue') return isHighValue.value;
        if (action.condition === 'isLowValue') return !isHighValue.value;
        return true;
    });
});

const canCancel = computed(() => {
    const finalStatuses = ['Approved', 'Rejected', 'Closed', 'Canceled', 'Draft'];
    return !finalStatuses.includes(requestStatus.value);
});

const newComment = ref('');

// Button Styling Map
const getButtonClass = (variant) => {
    switch (variant) {
        case 'primary': return 'btn-primary';
        case 'secondary': return 'btn-secondary'; // Grey
        case 'submit': return 'btn-submit'; // Blue
        case 'approve': return 'btn-approve'; // Green
        case 'reject': return 'btn-reject'; // Red
        default: return 'btn-secondary';
    }
};

const handleAction = async (btn) => {
    // 1. Validation Logic
    // Only validate fields if it's a "Submit" or "Approve" action moving forward
    // Save Draft (targetStatus === 'Draft') might skip full validation?
    // Let's enforce validation for everything EXCEPT Save Draft.
    const isSubmit = btn.targetStatus !== 'Draft' && btn.variant !== 'reject';

    // If it is a submit action, we run full validation
    if (isSubmit) {
        const validation = store.validateRequest(true); // true = check files too
        if (!validation.valid) {
             console.log('Validation Failed:', validation);
             store.triggerValidation();
             Swal.fire({
                icon: 'warning',
                title: 'ข้อมูลไม่ครบถ้วน',
                text: 'กรุณากรอกข้อมูลและแนบเอกสารให้ครบถ้วนตามรายการที่มีเครื่องหมาย *'
             });
             return;
        } else {
             store.clearValidation();
        }
    }

    // 2. Confirmation
    if (btn.confirmMessage) {
        const confirm = await Swal.fire({
            title: 'ยืนยันการทำรายการ?',
            text: btn.confirmText ? `คุณต้องการ "${btn.confirmText}" ใช่หรือไม่?` : 'ยืนยันการทำรายการ',
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'ใช่',
            cancelButtonText: 'ยกเลิก'
        });
        if (!confirm.isConfirmed) return;
    }

    // 3. Persist Data (Save Customer + Transaction)
    // We always save the current state before transitioning
    await store.saveCustomerData(store.customer);

    // 4. Submit Transaction
    await submitTransaction(btn);
};

const submitTransaction = async (btn) => {
     try {
        const formData = new FormData();
        formData.append('customer_no', store.customer.id);
        formData.append('customer_name', store.customer.name);
        formData.append('request_amount', store.transactionData.amount || '');
        formData.append('request_reason', store.transactionData.reason || '');

        // Map split terms
        formData.append('term_gs', store.transactionData.termGS || '');
        formData.append('term_ae', store.transactionData.termAE || '');
        formData.append('term_yc', store.transactionData.termYC || '');

        // Snapshot
        const snapshot = store.getSnapshot();
        formData.append('snapshot_data', JSON.stringify(snapshot));

        // Status & Comment
        formData.append('status', btn.targetStatus);

        // is_submit logic: If changing status (not Draft), set to true
        // Actually, logic in backend uses is_submit to trigger history/notification.
        // Let's always set it to true unless it's just saving draft?
        // Logic: if btn.action === 'saveDraft', is_submit = false?
        // No, let's strictly follow the button intent.
        formData.append('is_submit', btn.action === 'saveDraft' ? 'false' : 'true');

        if (newComment.value.trim()) {
            formData.append('comment', newComment.value.trim());
            formData.append('actor_role', currentRoleLabel.value);
        }

        // Files
        for (const [key, file] of Object.entries(store.files)) {
            if (file) {
                if (Array.isArray(file)) {
                    file.forEach(f => formData.append(key, f));
                } else if (!file.isRemote) { // Only append actual File objects, not remote placeholders
                    formData.append(key, file);
                }
            }
        }

        await axios.post('/api/credit-requests', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });

        await Swal.fire({
            title: 'สำเร็จ',
            text: btn.confirmMessage || 'ทำรายการสำเร็จ',
            icon: 'success'
        });

        window.location.reload();

    } catch (error) {
        console.error(error);
         Swal.fire({
            title: 'เกิดข้อผิดพลาด',
            text: 'เกิดข้อผิดพลาดในการส่งคำขอ',
            icon: 'error'
        });
    }
};

const handleCancel = async () => {
    const result = await Swal.fire({
        title: 'ยกเลิกคำขอ?',
        text: 'คุณแน่ใจหรือไม่ที่จะยกเลิกคำขอนี้?',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'ใช่, ยกเลิก',
        cancelButtonText: 'ไม่',
        confirmButtonColor: '#d33',
    });

    if (result.isConfirmed) {
        try {
            await store.cancelRequest();
            await Swal.fire('ยกเลิกสำเร็จ', 'คำขอถูกยกเลิกแล้ว', 'success');
            window.location.reload();
        } catch (e) {
            Swal.fire('Error', 'ไม่สามารถยกเลิกคำขอได้', 'error');
        }
    }
};
</script>

<style scoped>
.credit-request-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.readonly-banner {
    background-color: #fff3cd;
    border: 1px solid #ffeeba;
    color: #856404;
    padding: 15px;
    border-radius: 8px;
    margin-bottom: 10px;
}

.banner-content {
    display: flex;
    align-items: center;
    gap: 10px;
    font-weight: 500;
}

.unified-card {
  background: white;
  border-radius: 8px;
  border: 1px solid #e0e0e0;
  overflow: hidden;
}

.card-header {
  padding: 0px 20px 0 20px;
}

.card-header h3 {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 18px;
  font-weight: bold;
  margin-bottom: 20px;
}

/* Icon style reused from previous version */
.card-header h3::before {
  content: '';
  display: inline-block;
  width: 24px;
  height: 24px;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z'%3E%3C/path%3E%3Cpolyline points='14 2 14 8 20 8'%3E%3C/polyline%3E%3Cline x1='16' y1='13' x2='8' y2='13'%3E%3C/line%3E%3Cline x1='16' y1='17' x2='8' y2='17'%3E%3C/line%3E%3Cpolyline points='10 9 9 9 8 9'%3E%3C/polyline%3E%3C/svg%3E");
  background-repeat: no-repeat;
}

.form-footer {
  margin-top: 20px;
}

.footer-info {
  text-align: right;
  margin-bottom: 15px;
}

.author {
  color: #888;
  font-size: 14px;
}

.action-buttons {
  display: flex;
  justify-content: flex-end;
  gap: 15px;
}

/* Button Variants */
.btn-secondary {
  padding: 12px 30px;
  background-color: #999; /* Grey */
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 16px;
  cursor: pointer;
}
.btn-secondary:hover {
  background-color: #888;
}

.btn-primary, .btn-submit {
  padding: 12px 30px;
  background-color: #0056FF; /* Blue */
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 16px;
  cursor: pointer;
}
.btn-primary:hover, .btn-submit:hover {
  background-color: #0046cc;
}

.btn-approve {
    padding: 12px 30px;
    background-color: #28a745; /* Green */
    color: white;
    border: none;
    border-radius: 4px;
    font-size: 16px;
    cursor: pointer;
}
.btn-approve:hover {
    background-color: #218838;
}

.btn-reject, .btn-cancel {
    padding: 12px 30px;
    background-color: #dc3545; /* Red */
    color: white;
    border: none;
    border-radius: 4px;
    font-size: 16px;
    cursor: pointer;
}
.btn-reject:hover, .btn-cancel:hover {
    background-color: #c82333;
}
</style>
