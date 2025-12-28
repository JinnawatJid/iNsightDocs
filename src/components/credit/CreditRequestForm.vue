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
        <h3>ความคิดเห็นเพิ่มเติม</h3>
        <input type="text" class="comment-input" placeholder="ความคิดเห็นเพิ่มเติม" :disabled="isReadOnly" />
      </div>

      <div class="footer-info">
         <span class="author">AY: จิณณวัฒน์ จิตเสนาะ</span>
      </div>

      <div class="action-buttons">
        <template v-if="!isReadOnly">
            <button class="btn-save">บันทึกแบบร่าง</button>
            <button class="btn-submit" @click="submitCreditRequest">ส่งคำขอเครดิต</button>
        </template>
        <template v-else>
             <button class="btn-cancel" @click="handleCancel">ยกเลิกคำขอ</button>
        </template>
      </div>
    </div>
  </div>
</template>

<script>
import ApplicationTabs from './ApplicationTabs.vue';
import { useCreditRequestStore } from '@/stores/creditRequest';
import { useRouter } from 'vue-router';
import Swal from 'sweetalert2';
import axios from 'axios';
import { computed } from 'vue';

export default {
  name: 'CreditRequestForm',
  components: {
    ApplicationTabs
  },
  setup() {
    const store = useCreditRequestStore();
    const router = useRouter();

    const isReadOnly = computed(() => store.isReadOnly);

    const handleCancel = async () => {
        const result = await Swal.fire({
            title: 'ยกเลิกคำขอ?',
            text: 'คุณแน่ใจหรือไม่ที่จะยกเลิกคำขอนี้? คุณจะสามารถแก้ไขข้อมูลได้หลังจากยกเลิก',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'ใช่, ยกเลิก',
            cancelButtonText: 'ไม่',
            confirmButtonColor: '#d33',
        });

        if (result.isConfirmed) {
            try {
                await store.cancelRequest();
                await Swal.fire('ยกเลิกสำเร็จ', 'คำขอถูกยกเลิกแล้ว คุณสามารถแก้ไขข้อมูลได้ทันที', 'success');
                window.location.reload();
            } catch (e) {
                Swal.fire('Error', 'ไม่สามารถยกเลิกคำขอได้', 'error');
            }
        }
    };

    const submitCreditRequest = async () => {
        // 1. Validation
        if (!store.customer || !store.customer.id) {
            Swal.fire('Error', 'กรุณาค้นหาลูกค้าก่อนทำรายการ', 'error');
            return;
        }

        // Check if mandatory files are present
        const commonFiles = ['id_card', 'home_reg', 'home_photo', 'land_tax', 'credit_application_doc'];
        let requiredFiles = [...commonFiles];

        if (store.isCompany) {
            requiredFiles.push('legal_entity_certificate', 'vat_document', 'company_photo', 'company_land_tax');
        } else {
            requiredFiles.push('store_photo', 'commercial_reg', 'store_land_tax');
        }

        // Bank Statement is common
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

        // 2. Confirm Action
        const confirm = await Swal.fire({
            title: 'ยืนยันการส่งคำขอ?',
            text: 'คุณต้องการส่งคำขอเครดิตใช่หรือไม่?',
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'ใช่, ส่งคำขอ',
            cancelButtonText: 'ยกเลิก'
        });

        if (!confirm.isConfirmed) return;

        // 3. Prepare Payload
        try {
            const formData = new FormData();
            formData.append('customer_no', store.customer.id);
            formData.append('customer_name', store.customer.name);

            formData.append('request_amount', store.transactionData.amount || '');
            formData.append('request_reason', store.transactionData.reason || '');

            // Payment Details
            formData.append('payment_method', store.transactionData.paymentMethod || '');
            formData.append('payment_bank', store.transactionData.paymentBank || '');
            formData.append('payment_branch', store.transactionData.paymentBranch || '');
            formData.append('payment_account_no', store.transactionData.paymentAccountNo || '');

            // Full Snapshot
            formData.append('snapshot_data', JSON.stringify(store.customer));

            // Submission Flag
            formData.append('is_submit', 'true');

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

            // 4. API Call
            const response = await axios.post('/api/credit-requests', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            // 5. Success
            await Swal.fire({
                title: 'ส่งคำขอสำเร็จ',
                text: 'บันทึกคำขอเครดิตเรียบร้อยแล้ว',
                icon: 'success'
            });

            // 6. Redirect
            // Refresh page or redirect to same route to reset
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
        submitCreditRequest,
        isReadOnly,
        handleCancel
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

.btn-submit {
  padding: 12px 30px;
  background-color: #0056FF;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 16px;
  cursor: pointer;
}

.btn-submit:hover {
  background-color: #0046cc;
}

.btn-cancel {
    padding: 12px 30px;
    background-color: #dc3545;
    color: white;
    border: none;
    border-radius: 4px;
    font-size: 16px;
    cursor: pointer;
}
.btn-cancel:hover {
    background-color: #c82333;
}
</style>
