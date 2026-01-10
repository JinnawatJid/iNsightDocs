<template>
  <div class="request-info-tab">
    <!-- Upload Section -->
    <div class="upload-section">
      <div class="upload-grid">
        <FileUploader
          label="เอกสารขอเปิดเครดิต"
          required
          v-model="files.creditApp"
          :disabled="!isEditing"
        />
        <FileUploader
          label="ใบเสนอราคา (ถ้ามี)"
          v-model="files.quotation"
          :disabled="!isEditing"
        />
      </div>
    </div>

    <!-- Contact Info Section -->
    <div class="personal-info-section">
      <div class="section-header">
        <h3>ตรวจสอบข้อมูลผู้ติดต่อ</h3>
      </div>

      <!-- New Layout: 2 Rows -->
      <div class="contact-grid-layout">
        <!-- Row 1 -->
        <div class="form-group">
          <label>ชื่อผู้ติดต่อ <span v-if="isRequired('contact_person')" class="text-red-500">*</span></label>
          <input
            type="text"
            class="form-input"
            :class="{ 'border-red-500': errors.contact_person, 'disabled': !isEditing }"
            :disabled="!isEditing"
            v-model="store.customer.contact_person"
            placeholder="ระบุชื่อผู้ติดต่อ"
          />
        </div>
        <div class="form-group">
          <label>ตำแหน่ง <span v-if="isRequired('contact_position')" class="text-red-500">*</span></label>
           <input
            type="text"
            class="form-input"
            :class="{ 'border-red-500': errors.contact_position, 'disabled': !isEditing }"
            :disabled="!isEditing"
            v-model="store.customer.contact_position"
            placeholder="ระบุตำแหน่ง"
          />
        </div>
        <div class="form-group">
          <label>แผนก</label>
           <input
            type="text"
            class="form-input"
            :class="{ 'disabled': !isEditing }"
            :disabled="!isEditing"
            v-model="store.customer.contact_department"
            placeholder="ระบุแผนก"
          />
        </div>

        <!-- Row 2 -->
        <div class="form-group">
          <label>ฝ่าย</label>
           <input
            type="text"
            class="form-input"
            :class="{ 'disabled': !isEditing }"
            :disabled="!isEditing"
            v-model="store.customer.contact_division"
            placeholder="ระบุฝ่าย"
          />
        </div>
        <div class="form-group">
          <label>เบอร์โทรผู้ติดต่อ <span v-if="isRequired('contact_phone_number')" class="text-red-500">*</span></label>
           <input
            type="text"
            class="form-input"
            :class="{ 'border-red-500': errors.contact_phone_number, 'disabled': !isEditing }"
            :disabled="!isEditing"
            v-model="store.customer.contact_phone_number"
            placeholder="0XX-XXX-XXXX"
            @input="(e) => handlePhoneInput(e, 'contact_phone_number')"
          />
        </div>
        <div class="form-group"></div> <!-- Empty Placeholder -->
      </div>
    </div>

    <!-- Credit Details Section -->
    <div class="personal-info-section">
      <div class="section-header">
        <h3>รายละเอียดคำขอเครดิต</h3>
      </div>
      <div class="form-grid-three-columns">
            <div class="form-group" v-if="isDraftMode">
              <label>วงเงินเครดิตที่ต้องการ (บาท) <span v-if="isRequired('amount')" class="text-red-500">*</span></label>
              <input
                type="text"
                class="form-input"
                :class="{ 'border-red-500': errors.amount, 'disabled': !isEditing }"
                :disabled="!isEditing"
                placeholder="ระบุวงเงินที่ต้องการ"
                v-model="store.transactionData.amount"
                @input="restrictCreditAmountInput"
              />
            </div>

            <!-- New Split Terms for Draft Mode -->
            <template v-if="isDraftMode">
              <div class="form-group">
                <label>ระยะเวลาเครดิต (กระจก, กาว)</label>
                <input
                  type="text"
                  class="form-input"
                  :class="{ 'disabled': !isEditing }"
                  :disabled="!isEditing"
                  v-model="store.transactionData.termGS"
                  @input="(e) => handleNumericInput(e, 'termGS', true)"
                />
              </div>
              <div class="form-group">
                <label>ระยะเวลาเครดิต (อลูมิเนียม, Acc)</label>
                <input
                  type="text"
                  class="form-input"
                  :class="{ 'disabled': !isEditing }"
                  :disabled="!isEditing"
                  v-model="store.transactionData.termAE"
                  @input="(e) => handleNumericInput(e, 'termAE', true)"
                />
              </div>
              <div class="form-group">
                <label>ระยะเวลาเครดิต (ยิปซั่ม, ซีลาย)</label>
                <input
                  type="text"
                  class="form-input"
                  :class="{ 'disabled': !isEditing }"
                  :disabled="!isEditing"
                  v-model="store.transactionData.termYC"
                  @input="(e) => handleNumericInput(e, 'termYC', true)"
                />
              </div>
            </template>

            <div class="form-group">
              <label>เหตุผลการขอเครดิต <span v-if="isRequired('reason')" class="text-red-500">*</span></label>
              <select
                class="form-input"
                :class="{ 'border-red-500': errors.reason, 'disabled': !isEditing }"
                :disabled="!isEditing"
                v-model="store.transactionData.reason"
              >
                  <option value="" disabled>เลือกเหตุผล</option>
                  <option v-for="option in reasonOptions" :key="option" :value="option">
                    {{ option }}
                  </option>
              </select>
            </div>
      </div>

      <!-- Billing Information Section -->
      <div class="billing-info-section">

        <!-- New 3-Column Grid for Requirement, Method, and Schedule -->
        <div class="form-grid-three-columns">
            <div class="form-group">
               <label>ต้องมีการวางบิลหรือไม่ <span v-if="isRequired('billing_requirement')" class="text-red-500">*</span></label>
               <select
                  class="form-input"
                  :class="{ 'border-red-500': errors.billing_requirement, 'disabled': !isEditing }"
                  :disabled="!isEditing"
                  v-model="store.customer.billing_requirement"
                >
                    <option value="required">ต้องการ</option>
                    <option value="not_required">ไม่ต้องการ</option>
                    <option value="other">อื่นๆ (ระบุ)</option>
                </select>
                <!-- Other Input for Requirement -->
                <div v-if="store.customer.billing_requirement === 'other'" style="margin-top: 10px;">
                    <input
                        type="text"
                        class="form-input"
                        placeholder="ระบุ (ถ้ามี)"
                        v-model="store.customer.billing_requirement_note"
                        :disabled="!isEditing"
                    >
                </div>
            </div>

            <div class="form-group" v-if="store.customer.billing_requirement === 'required'">
               <label>กรณีต้องวางบิลขอให้เลือกวิธีวางบิล</label>
               <select
                  class="form-input"
                  :class="{ 'disabled': !isEditing }"
                  :disabled="!isEditing"
                  v-model="store.customer.billing_method"
                >
                    <option value="delivery">พร้อมการส่งมอบสินค้า</option>
                    <option value="mail">ทางไปรษณีย์</option>
                    <option value="company">ที่บริษัท ร้านค้า</option>
                    <option value="other">อื่นๆ</option>
                </select>
                 <!-- Other Input for Method -->
                 <div v-if="store.customer.billing_method === 'other'" style="margin-top: 10px;">
                    <input
                        type="text"
                        class="form-input"
                        placeholder="ระบุ"
                        v-model="store.customer.billing_method_note"
                        :disabled="!isEditing"
                    >
                </div>
            </div>

            <!-- Billing Schedule (Moved here, ensuring 3rd slot) -->
            <div class="form-group" v-if="store.customer.billing_requirement !== 'not_required'">
                <label>กำหนดวัน-เวลาวางบิล</label>
                <input
                  type="text"
                  class="form-input"
                  v-model="store.customer.billing_schedule"
                  placeholder="ระบุวันที่/เวลา"
                  :disabled="!isEditing"
                >
             </div>
        </div>

        <div v-if="store.customer.billing_requirement !== 'not_required'">
            <div class="billing-details-grid">
                 <div class="form-group full-width">
                    <label>ชื่อผู้ติดต่อรับวางบิล</label>
                    <input
                      type="text"
                      class="form-input"
                      v-model="store.customer.billing_contact"
                      placeholder="ระบุชื่อผู้รับวางบิล"
                      :disabled="!isEditing"
                    >
                 </div>
                 <div class="form-group full-width">
                    <label>แผนก</label>
                    <input
                      type="text"
                      class="form-input"
                      v-model="store.customer.billing_department"
                      placeholder="ระบุแผนก"
                      :disabled="!isEditing"
                    >
                 </div>
            </div>

            <div class="billing-contact-grid">
                 <div class="form-group">
                    <label>โทรศัพท์</label>
                    <input
                      type="text"
                      class="form-input"
                      v-model="store.customer.billing_phone"
                      placeholder="ระบุเบอร์โทรศัพท์"
                      :disabled="!isEditing"
                    >
                 </div>
                 <div class="form-group">
                    <label>มือถือ</label>
                    <input
                      type="text"
                      class="form-input"
                      v-model="store.customer.billing_mobile"
                      placeholder="ระบุเบอร์มือถือ"
                      :disabled="!isEditing"
                    >
                 </div>
                 <div class="form-group">
                    <label>อีเมล</label>
                    <input
                      type="text"
                      class="form-input"
                      v-model="store.customer.billing_email"
                      placeholder="ระบุอีเมล"
                      :disabled="!isEditing"
                    >
                 </div>
            </div>
        </div>

        <!-- Payment Details Section (Moved from Store Statement) -->
        <div class="section-separator"></div>
        <div class="section-header">
            <h3>รายละเอียดการชำระเงิน</h3>
        </div>

        <!-- Payment Method & Condition Grid (50/50) -->
        <div class="payment-method-grid">
            <div class="form-group">
                <label>ชำระเงินโดย <span v-if="isRequired('payment_method')" class="text-red-500">*</span></label>
                <select
                class="form-input"
                :class="{ 'border-red-500': errors.payment_method, 'disabled': !isEditing }"
                :disabled="!isEditing"
                v-model="store.customer.payment_method"
                >
                <option value="" disabled>เลือกวิธีการชำระเงิน</option>
                <option value="โอนเงิน">โอนเงิน</option>
                <option value="รับเช็ค">รับเช็ค</option>
                </select>
            </div>

             <!-- Conditional Payment Condition Input -->
             <div class="form-group" v-if="store.customer.payment_method">
                <label>{{ store.customer.payment_method === 'โอนเงิน' ? 'เงื่อนไขการโอนเงิน' : 'เงื่อนไขการรับเช็ค' }}</label>
                <input
                    type="text"
                    class="form-input"
                    v-model="store.customer.payment_condition"
                    :disabled="!isEditing"
                />
            </div>
        </div>

        <!-- Bank Details Grid (Visible only when method is selected) -->
        <div v-if="store.customer.payment_method" class="form-grid-three-columns">
            <div class="form-group">
            <label>จากบัญชีธนาคาร </label>
            <input
                type="text"
                class="form-input"
                :class="{ 'border-red-500': errors.payment_bank_name, 'disabled': !isEditing }"
                :disabled="!isEditing"
                v-model="store.customer.payment_bank_name"
                placeholder="ระบุชื่อธนาคาร"
            />
            </div>
            <div class="form-group">
            <label>สาขา </label>
            <input
                type="text"
                class="form-input"
                :class="{ 'border-red-500': errors.payment_bank_branch, 'disabled': !isEditing }"
                :disabled="!isEditing"
                v-model="store.customer.payment_bank_branch"
                placeholder="ระบุสาขา"
            />
            </div>
            <div class="form-group">
            <label>เลขที่บัญชี </label>
            <input
                type="text"
                class="form-input"
                :class="{ 'border-red-500': errors.payment_account_no, 'disabled': !isEditing }"
                :disabled="!isEditing"
                v-model="store.customer.payment_account_no"
                placeholder="ระบุเลขที่บัญชี"
                @input="(e) => handlePhoneInput(e, 'payment_account_no')"
            />
            </div>
        </div>

      </div>
    </div>

    <!-- Existing Credit Info Section -->
    <div class="personal-info-section">
      <div class="section-separator"></div>
      <div class="section-header">
        <h3>ข้อมูลบริษัทที่ท่านมีเครดิตอยู่</h3>
      </div>

      <div class="credit-history-container">
        <div v-for="(item, index) in store.customer.existing_credits" :key="index" class="credit-history-row">
            <div class="row-index">{{ index + 1 }}.</div>
            <div class="form-group flex-grow">
                <label>ชื่อบริษัท</label>
                <input
                  type="text"
                  class="form-input"
                  v-model="item.companyName"
                  :disabled="!isEditing"
                />
            </div>
            <div class="form-group flex-grow">
                <label>สินค้าที่ซื้อ</label>
                <input
                  type="text"
                  class="form-input"
                  v-model="item.goods"
                  :disabled="!isEditing"
                />
            </div>
            <div class="form-group small-width">
                <label>เครดิต (วัน)</label>
                <input
                  type="text"
                  class="form-input"
                  v-model="item.term"
                  :disabled="!isEditing"
                  @input="(e) => { e.target.value = e.target.value.replace(/\D/g, ''); item.term = e.target.value; }"
                />
            </div>
            <div class="form-group medium-width">
                <label>วงเงิน (บาท)</label>
                <input
                  type="text"
                  class="form-input"
                  v-model="item.limit"
                  :disabled="!isEditing"
                  @input="(e) => restrictLocalCreditInput(e, item, 'limit')"
                />
            </div>
            <div class="action-col" v-if="isEditing">
               <button class="delete-btn" @click="removeCreditRow(index)" title="ลบรายการ">
                 <img src="@/assets/icons/x-circle-red.svg" alt="Delete" style="width: 16px; height: 16px;">
               </button>
            </div>
        </div>
      </div>

      <div class="add-row-section" v-if="isEditing">
          <button class="add-btn" @click="addCreditRow">+ เพิ่มรายการ</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { reactive, watch, ref, computed } from 'vue';
import FileUploader from '@/components/shared/FileUploader.vue';
import { useCreditRequestStore } from '@/stores/creditRequest';
import { mandatoryStoreKeys } from '@/config/mandatoryFields';

const props = defineProps(['readOnly']);
const store = useCreditRequestStore();

const isEditing = ref(!props.readOnly);
watch(() => props.readOnly, (val) => {
  isEditing.value = !val;
});

const isDraftMode = computed(() => {
  return !store.requestStatus || store.requestStatus === 'Draft';
});

function isRequired(storeKey) {
    return mandatoryStoreKeys.fields.includes(storeKey);
}

// Simple computed error object based on store's validation logic
// We can check if field is missing IF showValidationErrors is true
const errors = computed(() => {
    if (!store.showValidationErrors) return {};

    // Check fields
    const e = {};
    const check = (key, val) => {
        if (!val || (typeof val === 'string' && val.trim() === '')) {
            e[key] = true;
        }
    };

    check('contact_person', store.customer.contact_person);
    check('contact_position', store.customer.contact_position);
    check('contact_phone_number', store.customer.contact_phone_number);
    check('amount', store.transactionData.amount);
    check('reason', store.transactionData.reason);
    check('billing_requirement', store.customer.billing_requirement);
    check('payment_method', store.customer.payment_method);

    if (store.customer.payment_method) {
        check('payment_bank_name', store.customer.payment_bank_name);
        check('payment_bank_branch', store.customer.payment_bank_branch);
        check('payment_account_no', store.customer.payment_account_no);
    }

    return e;
});

const files = reactive({
  creditApp: null,
  quotation: null
});

// Watch for file changes to update store
watch(() => files.creditApp, (newVal) => {
  store.updateFile('credit_application_doc', newVal);
});

watch(() => files.quotation, (newVal) => {
  store.updateFile('quotation_doc', newVal);
});

// Initialize files from store (to support Edit mode or tab switching)
watch(() => store.files, (newVal) => {
  files.creditApp = newVal?.credit_application_doc || null;
  files.quotation = newVal?.quotation_doc || null;
}, { immediate: true, deep: true });

const reasonOptions = computed(() => {
  const standardOptions = [
    'ขออนุมัติเครดิตล่วงหน้า (ยังไม่มีใบสั่งซื้อ)',
    'ขออนุมัติเครดิต (มีใบสั่งซื้อแนบมาพร้อม)'
  ];

  // If current value is not in standard options and is not empty, add it (Legacy support)
  if (store.transactionData.reason && !standardOptions.includes(store.transactionData.reason)) {
    return [store.transactionData.reason, ...standardOptions];
  }

  return standardOptions;
});

function addCreditRow() {
    if (!store.customer.existing_credits) store.customer.existing_credits = [];
    store.customer.existing_credits.push({ companyName: '', goods: '', term: '', limit: '' });
}

function removeCreditRow(index) {
    if (store.customer.existing_credits.length > 1) {
        store.customer.existing_credits.splice(index, 1);
    } else {
        // If only 1 row, just clear it
        store.customer.existing_credits[0] = { companyName: '', goods: '', term: '', limit: '' };
    }
}

// Helper for credit amount input formatting
function restrictCreditAmountInput(e) {
    let value = e.target.value.replace(/[^0-9.]/g, '');
    const parts = value.split('.');
    if (parts.length > 2) value = parts[0] + '.' + parts.slice(1).join('');

    // Update model directly
    store.transactionData.amount = value;
    e.target.value = value;
}

// Helper for phone/numeric inputs to ensure model update
function handlePhoneInput(e, storeKey) {
    const value = e.target.value.replace(/\D/g, '');
    e.target.value = value;
    // Explicitly update store
    store.customer[storeKey] = value;
}

// Generic numeric input handler for transaction data
function handleNumericInput(e, storeKey, isTransactionData = false) {
    const value = e.target.value.replace(/\D/g, '');
    e.target.value = value;
    if (isTransactionData) {
        store.transactionData[storeKey] = value;
    } else {
        store.customer[storeKey] = value;
    }
}

// Helper for number input in loop
function restrictLocalCreditInput(e, item, field) {
    let value = e.target.value.replace(/[^0-9.]/g, '');
    const parts = value.split('.');
    if (parts.length > 2) value = parts[0] + '.' + parts.slice(1).join('');
    e.target.value = value;
    item[field] = value;
}

</script>

<style scoped>
@import './shared-styles.css';

.request-info-tab {
  padding: 10px;
}

/* Personal Info Section */
.personal-info-section {
  margin-top: 20px;
}

.section-header {
  display: flex;
  align-items: center;
  gap: 20px;
  margin-bottom: 20px;
}

.section-header h3 {
  margin: 0;
}

.text-red-500 {
  color: #ef4444;
}

.border-red-500 {
  border-color: #ef4444 !important;
}

/* Ensure disabled style is consistent */
.form-input.disabled {
  background-color: #f5f5f5;
  color: #999;
  cursor: not-allowed;
}

/* Updated Grid for 2 Rows */
.contact-grid-layout {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 15px;
  margin-top: 15px;
}

.payment-method-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 15px;
  margin-bottom: 20px;
}

.upload-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  margin-bottom: 40px;
}

/* Billing Info Styles */
.billing-info-section {
  display: flex;
  flex-direction: column;
}

.billing-details-grid {
    display: grid;
    grid-template-columns: 1fr 1fr; /* Adjusted for 2 items */
    gap: 15px;
}

.billing-contact-grid {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: 15px;
    margin-top: 15px;
}

.full-width {
    width: 100%;
}

/* Section Separator */
.section-separator {
  border-top: 1px solid #e0e0e0;
  margin: 30px 0 20px 0;
  width: 100%;
}

/* Existing Credits Styles */
.credit-history-container {
    display: flex;
    flex-direction: column;
    gap: 15px;
}

.credit-history-row {
    display: flex;
    align-items: flex-end; /* Align inputs to bottom */
    gap: 10px;
}

.row-index {
    font-weight: bold;
    padding-bottom: 10px; /* Align with input text */
    min-width: 20px;
}

.flex-grow {
    flex-grow: 1;
}

.small-width {
    width: 100px;
    flex-shrink: 0;
}

.medium-width {
    width: 150px;
    flex-shrink: 0;
}

.action-col {
    padding-bottom: 5px;
}

.delete-btn {
    background: none;
    border: none;
    cursor: pointer;
    color: #ef4444;
    padding: 5px;
    display: flex;
    align-items: center;
    justify-content: center;
}

.delete-btn:hover {
    background-color: #fee2e2;
    border-radius: 4px;
}

.add-row-section {
    margin-top: 15px;
}

.add-btn {
    background-color: #fff;
    border: 1px solid #ddd;
    padding: 8px 16px;
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.9em;
    color: #666;
    transition: all 0.2s;
}

.add-btn:hover {
    background-color: #f9f9f9;
    border-color: #ccc;
    color: #333;
}

/* Responsive adjustments */
@media (max-width: 768px) {
    .credit-history-row {
        flex-wrap: wrap;
    }
    .small-width, .medium-width {
        width: 45%;
    }
    .flex-grow {
        width: 100%;
    }
}
</style>
