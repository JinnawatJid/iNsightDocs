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
            <!-- Dynamic Buttons based on Status -->

            <!-- Draft -> Opened -->
            <template v-if="requestStatus === 'Draft' || !requestStatus">
                 <button class="btn-secondary" @click="saveDraft" :disabled="!isFormValid && false">
                    บันทึกแบบร่าง (Save Draft)
                 </button>
                 <button class="btn-primary" @click="submitAction('Opened', 'ส่งคำขอให้ผู้จัดการสาขา')">
                    ส่งคำขอ (Submit)
                 </button>
            </template>

            <!-- Opened -> Submitted -->
            <template v-else-if="requestStatus === 'Opened'">
                 <button class="btn-submit" @click="submitAction('Submitted', 'ส่งคำขอให้ฝ่ายขาย (HO)')">ส่งให้ฝ่ายขาย (HO)</button>
            </template>

            <!-- Submitted -> PendingSales or Rejected -->
            <template v-else-if="requestStatus === 'Submitted'">
                 <button class="btn-reject" @click="submitAction('Rejected', 'ปฏิเสธคำขอ')">ปฏิเสธ</button>
                 <button class="btn-submit" @click="submitAction('PendingSales (ชั่วคราว)', 'ส่งต่อให้ฝ่ายการเงิน')">ส่งต่อให้ฝ่ายการเงิน</button>
            </template>

            <!-- PendingSales -> Reviewed or Rejected -->
            <template v-else-if="requestStatus === 'PendingSales (ชั่วคราว)'">
                 <button class="btn-reject" @click="submitAction('Rejected', 'ปฏิเสธคำขอ')">ปฏิเสธ</button>
                 <button class="btn-submit" @click="submitAction('Reviewed', 'ส่งต่อให้ผู้จัดการฝ่ายการเงิน')">ส่งต่อให้ผู้จัดการฝ่ายการเงิน</button>
            </template>

            <!-- Reviewed -> Approved or PendingFinance or Rejected -->
            <template v-else-if="requestStatus === 'Reviewed'">
                 <button class="btn-reject" @click="submitAction('Rejected', 'ปฏิเสธคำขอ')">ปฏิเสธ</button>
                 <template v-if="isHighValue">
                     <button class="btn-submit" @click="submitAction('PendingFinance (ชั่วคราว)', 'ส่งต่อให้กรรมการเครดิต')">ส่งต่อให้กรรมการเครดิต</button>
                 </template>
                 <template v-else>
                     <button class="btn-approve" @click="submitAction('Approved', 'อนุมัติคำขอ')">อนุมัติคำขอ</button>
                 </template>
            </template>

            <!-- PendingFinance -> Approved or Rejected -->
            <template v-else-if="requestStatus === 'PendingFinance (ชั่วคราว)'">
                 <button class="btn-reject" @click="submitAction('Rejected', 'ปฏิเสธคำขอ')">ปฏิเสธ</button>
                 <button class="btn-approve" @click="submitAction('Approved', 'อนุมัติคำขอ')">อนุมัติคำขอ</button>
            </template>

            <!-- Final Statuses -->
            <template v-else>
                 <button class="btn-cancel" @click="handleCancel" v-if="requestStatus !== 'Canceled'">ยกเลิกคำขอ</button>
            </template>
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

<script>
import ApplicationTabs from './ApplicationTabs.vue';
import CreditReviewSection from './CreditReviewSection.vue';
import { useCreditRequestStore } from '@/stores/creditRequest';
import { useRouter } from 'vue-router';
import Swal from 'sweetalert2';
import axios from 'axios';
import { computed, ref, watch } from 'vue';
import { getMandatoryKeys } from '@/config/mandatoryFields';

export default {
  name: 'CreditRequestForm',
  components: {
    ApplicationTabs,
    CreditReviewSection
  },
  setup() {
    const store = useCreditRequestStore();
    const router = useRouter();

    const isReadOnly = computed(() => store.isReadOnly);
    const comments = computed(() => store.comments);
    const requestStatus = computed(() => store.requestStatus);
    const currentRoleLabel = computed(() => store.currentRole);

    // Show Terms (Manager Mode) if NOT Draft
    const showTerms = computed(() => {
        return requestStatus.value && requestStatus.value !== 'Draft';
    });

    // Parse amount to check for > 300,000
    const isHighValue = computed(() => {
        const amtStr = store.transactionData.amount || '0';
        const amt = parseFloat(amtStr.replace(/,/g, ''));
        return amt > 300000;
    });

    const hasData = computed(() => !!store.customer && !!store.customer.id);

    const newComment = ref('');

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

    const saveDraft = async () => {
        await submitBase('Draft', 'บันทึกแบบร่างสำเร็จ', false);
    };

    const submitAction = async (targetStatus, confirmText) => {
        // Validation checks first
        if (!store.customer || !store.customer.id) {
            Swal.fire('Error', 'กรุณาค้นหาลูกค้าก่อนทำรายการ', 'error');
            return;
        }

        // Comprehensive Validation Logic (Enabled for Opened and Submitted)
        // Opened is the first "Submit" action for the user (Branch Head -> Manager)
        if (targetStatus === 'Opened' || targetStatus === 'Submitted') {
            const { fields, files } = getMandatoryKeys(store.isCompany);

            // Check Fields
            const missingFields = fields.filter(key => {
                let val;
                // Check if key is in transactionData (amount, reason) or customer
                if (key === 'amount' || key === 'reason') {
                    val = store.transactionData[key];
                } else {
                    val = store.customer[key];
                }
                return !val;
            });

            // Conditional Validation for Residence & Store Value/Rent
            // Residence Logic
            const resOwnership = store.customer.residence_ownership;
            if (resOwnership === 'บ้านเช่า') {
                // If house rent, value is in residence_ownership_other
                if (!store.customer.residence_ownership_other) missingFields.push('residence_ownership_other');
            } else if (resOwnership) {
                // For other ownerships, value is also in residence_ownership_other
                if (!store.customer.residence_ownership_other) missingFields.push('residence_ownership_other');
            }

            // Store/Company Address Logic
            // Note: Company reuses residence fields if 'isSameAddress' isn't handled differently in store.
            // StoreCompanyTab logic: if Company, it updates store_ownership keys IF separate.
            // But if Individual, it updates store_ownership keys.
            // Let's check store_ownership keys.
            const storeOwnership = store.customer.store_ownership;
            if (storeOwnership === 'เช่าซื้อ' || storeOwnership === 'เช่า') {
                 if (!store.customer.store_ownership_other) missingFields.push('store_ownership_other');
            } else if (storeOwnership) {
                 if (!store.customer.store_ownership_other) missingFields.push('store_ownership_other');
            }

            // Check Files
            const missingFiles = files.filter(key => {
                const val = store.files[key];
                if (Array.isArray(val)) return val.length === 0;
                return !val;
            });

            if (missingFields.length > 0 || missingFiles.length > 0) {
                 store.triggerValidation(); // Trigger visual cues

                 console.log('Missing Fields:', missingFields);
                 console.log('Missing Files:', missingFiles);

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

        const confirm = await Swal.fire({
            title: 'ยืนยันการทำรายการ?',
            text: `คุณต้องการ "${confirmText}" ใช่หรือไม่?`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'ใช่',
            cancelButtonText: 'ยกเลิก'
        });

        if (!confirm.isConfirmed) return;

        // Force Save Customer Data (Master) before creating transaction
        // This persists all the local edits (Name, Address, Map, etc.)
        await store.saveCustomerData(store.customer);

        await submitBase(targetStatus, 'ทำรายการสำเร็จ', true);
    };

    const submitBase = async (status, successMessage, isSubmitFlag) => {
         try {
            const formData = new FormData();
            formData.append('customer_no', store.customer.id);
            formData.append('customer_name', store.customer.name);
            formData.append('request_amount', store.transactionData.amount || '');
            formData.append('request_reason', store.transactionData.reason || '');
            formData.append('term_gs', store.transactionData.termGS || '');
            formData.append('term_ae', store.transactionData.termAE || '');
            formData.append('term_yc', store.transactionData.termYC || '');

            // Use store.getSnapshot() if available, otherwise fallback to store.customer
            // But we know we just added getSnapshot to the store.
            const snapshot = store.getSnapshot ? store.getSnapshot() : store.customer;
            formData.append('snapshot_data', JSON.stringify(snapshot));

            // Critical: Pass Status and Comment
            formData.append('status', status);
            formData.append('is_submit', isSubmitFlag ? 'true' : 'false');

            if (newComment.value.trim()) {
                formData.append('comment', newComment.value.trim());
                formData.append('actor_role', currentRoleLabel.value);
            }

            // Files
            for (const [key, file] of Object.entries(store.files)) {
                if (file) {
                    if (Array.isArray(file)) {
                        file.forEach(f => formData.append(key, f));
                    } else {
                        formData.append(key, file);
                    }
                }
            }

            await axios.post('/api/credit-requests', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            await Swal.fire({
                title: 'สำเร็จ',
                text: successMessage,
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

    return {
        submitAction,
        saveDraft,
        isReadOnly,
        handleCancel,
        comments,
        requestStatus,
        currentRoleLabel,
        newComment,
        isHighValue,
        showTerms,
        hasData,
        store
    };
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
  /* padding: 10px 0; */
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

.comment-section {
  margin-bottom: 20px;
}

.comment-section h3 {
  font-size: 16px;
  font-weight: bold;
  margin-bottom: 10px;
}

.comment-input {
  width: 100%;
  padding: 12px;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  background-color: #f5f6f8;
  box-sizing: border-box;
  color: black;
  font-family: inherit;
  resize: vertical;
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

.btn-save {
  padding: 12px 30px;
  background-color: #999;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 16px;
  cursor: pointer;
}

.btn-submit, .btn-approve {
  padding: 12px 30px;
  background-color: #0056FF;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 16px;
  cursor: pointer;
}

.btn-approve {
    background-color: #28a745;
}
.btn-approve:hover {
    background-color: #218838;
}

.btn-submit:hover {
  background-color: #0046cc;
}

.btn-cancel, .btn-reject {
    padding: 12px 30px;
    background-color: #dc3545;
    color: white;
    border: none;
    border-radius: 4px;
    font-size: 16px;
    cursor: pointer;
}
.btn-cancel:hover, .btn-reject:hover {
    background-color: #c82333;
}
</style>