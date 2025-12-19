<template>
  <div class="credit-request-form">
    <div class="unified-card">
      <div class="card-header">
        <h3>เอกสารประกอบการพิจารณา</h3>
      </div>
      <ApplicationTabs />
    </div>

    <div class="form-footer">
      <div class="comment-section">
        <h3>ความคิดเห็นเพิ่มเติม</h3>
        <input type="text" class="comment-input" placeholder="ความคิดเห็นเพิ่มเติม" />
      </div>

      <div class="footer-info">
         <span class="author">AY: จิณณวัฒน์ จิตเสนาะ</span>
      </div>

      <div class="action-buttons">
        <button class="btn-save">บันทึกแบบร่าง</button>
        <button class="btn-submit" @click="submitCreditRequest">ส่งคำขอเครดิต</button>
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

export default {
  name: 'CreditRequestForm',
  components: {
    ApplicationTabs
  },
  setup() {
    const store = useCreditRequestStore();
    const router = useRouter();

    const submitCreditRequest = async () => {
        // 1. Validation
        if (!store.customer || !store.customer.id) {
            Swal.fire('Error', 'กรุณาค้นหาลูกค้าก่อนทำรายการ', 'error');
            return;
        }

        // Check if mandatory files are present
        const commonFiles = ['id_card', 'home_reg', 'home_photo', 'land_tax'];
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
                title: 'Incomplete',
                text: 'กรุณาอัปโหลดเอกสารให้ครบถ้วน'
             });
             return;
        }

        // 2. Confirm Action
        const confirm = await Swal.fire({
            title: 'Confirm Action?',
            text: 'คุณต้องการส่งคำขอเครดิตใช่หรือไม่?',
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Yes, Submit',
            cancelButtonText: 'No'
        });

        if (!confirm.isConfirmed) return;

        // 3. Prepare Payload
        try {
            const formData = new FormData();
            formData.append('customer_no', store.customer.id);
            formData.append('customer_name', store.customer.name);

            // From Form (assuming store has latest data synced from tabs)
            // Wait, amount and reason are in GeneralInfoTab which syncs to store.customer?
            // Actually, GeneralInfoTab doesn't sync amount/reason to store.customer *columns* that exist in Customers table?
            // Let's check GeneralInfoTab again.
            // It syncs: name, authorized_person, authorized_position, contact_person, contact_position, contact_phone_number.
            // It DOES NOT sync 'request_amount' or 'request_reason' to store.customer because those are transaction specific.
            // Oops. I need to access them.
            // The user wants "Full Snapshot".

            // Workaround: We can't easily access the component state of GeneralInfoTab from here.
            // Solution: We should add 'request_amount' and 'request_reason' to the Store state explicitly,
            // OR bind them in the store.customer object temporarily?
            // Let's check GeneralInfoTab again.
            // The `formData` in GeneralInfoTab has `creditAmount` and `creditReason`.
            // But it doesn't sync them to `store.customer`.

            // I will update GeneralInfoTab to sync these to store.customer as well (even if they aren't strictly customer columns,
            // they are part of the "Current Request Context").
            // Alternatively, I can use a separate store property.

            // For now, assuming they are in store.customer (I will update GeneralInfoTab in next step or use what's there).
            // Actually, I should check GeneralInfoTab.vue content again.

            // Update: I will modify GeneralInfoTab to sync creditAmount/Reason to store.customer temporarily for submission.

            formData.append('request_amount', store.transactionData.amount || '');
            formData.append('request_reason', store.transactionData.reason || '');

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
            // Use axios directly or service. Service method expects args.
            // I'll use axios here for FormData or update service.
            // Let's use axios directly to match the FormData requirement easily.
            const response = await axios.post('/api/credit-requests', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            // 5. Success
            await Swal.fire({
                title: 'Success: Request Sent',
                text: 'บันทึกคำขอเครดิตเรียบร้อยแล้ว',
                icon: 'success'
            });

            // 6. Redirect
            // Refresh page or redirect to same route to reset
            window.location.reload();

        } catch (error) {
            console.error(error);
             Swal.fire({
                title: 'Error',
                text: 'เกิดข้อผิดพลาดในการส่งคำขอ',
                icon: 'error'
            });
        }
    };

    return {
        submitCreditRequest
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
</style>
