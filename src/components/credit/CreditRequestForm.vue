<template>
  <div class="credit-request-form">
    <!-- Read Only Warning Banner -->
    <div v-if="isReadOnly" class="readonly-banner">
      <div class="banner-content">
        <span class="warning-icon">⚠️</span>
        <span>คำขอถูกส่งเรียบร้อยแล้ว (Read Only) หากต้องการแก้ไขข้อมูล กรุณายกเลิกคำขอก่อน</span>
      </div>
    </div>

    <div class="unified-card">
      <div class="card-header">
        <h3>เอกสารประกอบการพิจารณา</h3>
      </div>
      <ApplicationTabs :readOnly="isReadOnly" />
    </div>

    <div class="form-footer">
      <div class="comment-section">
        <CommentHistory :comments="comments" />

        <!-- Manager Credit Term Island -->
        <div class="manager-island" v-if="!isDraft">
            <h3 class="island-title">ข้อมูลเครดิต (สำหรับผู้จัดการ)</h3>
            <div class="island-grid">
                 <div class="form-group">
                    <label>วงเงินเครดิตที่ต้องการ (บาท)</label>
                    <input
                        type="text"
                        class="form-input"
                        v-model="managerCreditData.amount"
                        @input="restrictAmountInput"
                    >
                </div>
                <div class="form-group">
                    <label>ระยะเวลาเครดิต (G, S)</label>
                    <input
                        type="text"
                        class="form-input"
                        v-model="managerCreditData.creditTermGS"
                        @input="(e) => restrictTermInput(e, 'creditTermGS')"
                    >
                </div>
                <div class="form-group">
                    <label>ระยะเวลาเครดิต (A, E)</label>
                    <input
                        type="text"
                        class="form-input"
                        v-model="managerCreditData.creditTermAE"
                        @input="(e) => restrictTermInput(e, 'creditTermAE')"
                    >
                </div>
                <div class="form-group">
                    <label>ระยะเวลาเครดิต (Y, C)</label>
                    <input
                        type="text"
                        class="form-input"
                        v-model="managerCreditData.creditTermYC"
                        @input="(e) => restrictTermInput(e, 'creditTermYC')"
                    >
                </div>
            </div>
        </div>

        <h3>ความคิดเห็น: {{ currentRoleLabel }}</h3>
        <textarea
            class="comment-input"
            placeholder="ระบุพฤติกรรมลูกค้า, ประวัติโครงการ, การซื้อขายล่าสุด, หรือข้อมูลประกอบการพิจารณาอื่นๆ..."
            v-model="newComment"
            rows="5"
            :disabled="isReadOnly"
        ></textarea>
      </div>

      <div class="footer-info">
         <span class="author">Current Role: {{ currentRoleLabel }}</span>
      </div>

      <div class="action-buttons">
        <!-- Dynamic Buttons based on Status -->

        <!-- Draft -> Opened -->
        <template v-if="requestStatus === 'Draft' || !requestStatus">
             <button class="btn-save" @click="saveDraft">บันทึกแบบร่าง</button>
             <button class="btn-submit" @click="submitAction('Opened', 'ส่งคำขอให้ผู้จัดการสาขา')">ส่งให้ผู้จัดการสาขา</button>
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
</template>

<script>
import ApplicationTabs from './ApplicationTabs.vue';
import CommentHistory from './CommentHistory.vue';
import { useCreditRequestStore } from '@/stores/creditRequest';
import { useRouter } from 'vue-router';
import Swal from 'sweetalert2';
import axios from 'axios';
import { computed, ref, watch, reactive } from 'vue';

export default {
  name: 'CreditRequestForm',
  components: {
    ApplicationTabs,
    CommentHistory
  },
  setup() {
    const store = useCreditRequestStore();
    const router = useRouter();

    const isReadOnly = computed(() => store.isReadOnly);
    const comments = computed(() => store.comments);
    const requestStatus = computed(() => store.requestStatus);
    const currentRoleLabel = computed(() => store.currentRole);
    const isDraft = computed(() => !store.requestStatus || store.requestStatus === 'Draft');

    // Parse amount to check for > 300,000
    const isHighValue = computed(() => {
        const amtStr = store.transactionData.amount || '0';
        const amt = parseFloat(amtStr.replace(/,/g, ''));
        return amt > 300000;
    });

    const newComment = ref('');

    // Manager Island Data
    const managerCreditData = reactive({
        amount: '',
        creditTermGS: '',
        creditTermAE: '',
        creditTermYC: ''
    });

    // Initialize/Sync Manager Data with Store
    watch(() => store.transactionData, (newVal) => {
        if (newVal) {
            if (managerCreditData.amount !== newVal.amount) managerCreditData.amount = newVal.amount;
            if (managerCreditData.creditTermGS !== newVal.creditTermGS) managerCreditData.creditTermGS = newVal.creditTermGS;
            if (managerCreditData.creditTermAE !== newVal.creditTermAE) managerCreditData.creditTermAE = newVal.creditTermAE;
            if (managerCreditData.creditTermYC !== newVal.creditTermYC) managerCreditData.creditTermYC = newVal.creditTermYC;
        }
    }, { immediate: true, deep: true });

    // Save changes back to store
    watch(managerCreditData, (newVal) => {
        store.updateTransactionData({
            amount: newVal.amount,
            creditTermGS: newVal.creditTermGS,
            creditTermAE: newVal.creditTermAE,
            creditTermYC: newVal.creditTermYC
        });
    }, { deep: true });

    const restrictAmountInput = (e) => {
        let value = e.target.value.replace(/[^0-9.]/g, '');
        const parts = value.split('.');
        if (parts.length > 2) value = parts[0] + '.' + parts.slice(1).join('');
        // Add commas
        if (value && !value.endsWith('.')) {
             const raw = value.replace(/,/g, '');
             const formatted = Number(raw).toLocaleString('en-US');
             value = formatted;
        }
        e.target.value = value;
        managerCreditData.amount = value;
    };

    const restrictTermInput = (e, field) => {
         e.target.value = e.target.value.replace(/\D/g, '');
         managerCreditData[field] = e.target.value;
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

    const saveDraft = async () => {
        await submitBase('Draft', 'บันทึกแบบร่างสำเร็จ', false);
    };

    const submitAction = async (targetStatus, confirmText) => {
         // Validation checks first
        if (!store.customer || !store.customer.id) {
            Swal.fire('Error', 'กรุณาค้นหาลูกค้าก่อนทำรายการ', 'error');
            return;
        }

        // Check if mandatory files are present (Only for initial submission, maybe?)
        // Let's keep file check strict for "Submitted" step (Opened -> Submitted)
        if (targetStatus === 'Submitted') {
            const commonFiles = ['id_card', 'home_reg', 'home_photo', 'land_tax', 'credit_application_doc'];
            let requiredFiles = [...commonFiles];

            if (store.isCompany) {
                requiredFiles.push('legal_entity_certificate', 'vat_document', 'company_photo', 'company_land_tax');
            } else {
                requiredFiles.push('store_photo', 'commercial_reg', 'store_land_tax');
            }
            requiredFiles.push('bank_statement');

            const missing = requiredFiles.filter(key => {
                const val = store.files[key];
                if (Array.isArray(val)) return val.length === 0;
                return !val;
            });

            if (missing.length > 0) {
                 Swal.fire({
                    icon: 'warning',
                    title: 'เอกสารไม่ครบ',
                    text: 'กรุณาอัปโหลดเอกสารให้ครบถ้วน'
                 });
                 return;
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

        await submitBase(targetStatus, 'ทำรายการสำเร็จ', true);
    };

    const submitBase = async (status, successMessage, isSubmitFlag) => {
         try {
            const formData = new FormData();
            formData.append('customer_no', store.customer.id);
            formData.append('customer_name', store.customer.name);
            formData.append('request_amount', store.transactionData.amount || '');
            formData.append('request_reason', store.transactionData.reason || '');
            // New fields
            formData.append('request_credit_term_gs', store.transactionData.creditTermGS || '');
            formData.append('request_credit_term_ae', store.transactionData.creditTermAE || '');
            formData.append('request_credit_term_yc', store.transactionData.creditTermYC || '');
            formData.append('snapshot_data', JSON.stringify(store.customer));

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
        isDraft,
        managerCreditData,
        restrictAmountInput,
        restrictTermInput
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

.manager-island {
    background-color: #ffffff;
    border: 1px solid #e0e0e0;
    border-radius: 8px;
    padding: 15px;
    margin-bottom: 20px;
    box-shadow: 0 1px 3px rgba(0,0,0,0.05);
}

.island-title {
    font-size: 16px;
    font-weight: bold;
    margin-bottom: 15px;
    color: #333;
    border-bottom: 1px solid #f0f0f0;
    padding-bottom: 10px;
}

.island-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 15px;
}

.form-group label {
    display: block;
    margin-bottom: 5px;
    font-size: 14px;
    color: #333;
}

.form-input {
    width: 100%;
    padding: 10px;
    border: 1px solid #ccc;
    border-radius: 4px;
    font-family: inherit;
    box-sizing: border-box;
}

/* Responsive for Island */
@media (max-width: 1024px) {
    .island-grid {
        grid-template-columns: repeat(2, 1fr);
    }
}

@media (max-width: 600px) {
    .island-grid {
        grid-template-columns: 1fr;
    }
}
</style>