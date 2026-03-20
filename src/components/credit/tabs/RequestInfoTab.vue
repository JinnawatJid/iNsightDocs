<template>
  <div class="request-info-tab">
    <!-- Upload Section -->
    <!-- Project Selection Section -->
    <div class="personal-info-section" v-if="isProjectCredit">
      <div class="section-header">
        <h3>เลือกโครงการ (Project Selection)</h3>
      </div>
      <div class="form-grid-three-columns">
        <div class="form-group full-width-in-grid">
          <label>โครงการที่มีอยู่ <span class="text-red-500">*</span></label>
          <select
            class="form-input"
            :class="{ 'border-red-500': errors.project_code, 'disabled': !isEditing }"
            :disabled="!isEditing"
            v-model="store.transactionData.project_code"
            @change="handleProjectSelect"
          >
            <option value="" disabled>เลือกโครงการ</option>
            <option v-for="proj in availableProjects" :key="proj.code" :value="proj.code">
              {{ proj.code }} - {{ proj.name }}
            </option>
          </select>
          <span v-if="errors.project_code" class="error-text">กรุณาเลือกโครงการ</span>
        </div>
      </div>

      <!-- Project Details (Read-only after selection) -->
      <div class="form-grid-three-columns" v-if="store.transactionData.project_code" style="margin-top: 20px;">
        <div class="form-group">
          <label>รหัสโครงการ</label>
          <input type="text" class="form-input disabled" disabled :value="selectedProjectDetails?.code || '-'" />
        </div>
        <div class="form-group">
          <label>ชื่อโครงการ</label>
          <input type="text" class="form-input disabled" disabled :value="selectedProjectDetails?.name || '-'" />
        </div>
        <div class="form-group">
          <label>สาขา</label>
          <input type="text" class="form-input disabled" disabled :value="selectedProjectDetails?.branch || '-'" />
        </div>
        <div class="form-group">
          <label>ผู้ขอ</label>
          <input type="text" class="form-input disabled" disabled :value="selectedProjectDetails?.requester || '-'" />
        </div>
        <div class="form-group">
          <label>สินค้าหลัก</label>
          <input type="text" class="form-input disabled" disabled :value="selectedProjectDetails?.mainProduct || '-'" />
        </div>
      </div>
    </div>

    <!-- Project Credit Details -->
    <div class="personal-info-section" v-if="isProjectCredit && store.transactionData.project_code">
      <div class="section-separator"></div>
      <div class="section-header">
        <h3>รายละเอียดและหลักประกัน (Project Credit & Security)</h3>
      </div>
      <div class="form-grid-three-columns">
        <div class="form-group">
          <label>ประเภทลูกค้า <span class="text-red-500">*</span></label>
          <select
            class="form-input"
            :class="{ 'border-red-500': errors.customer_type_project, 'disabled': !isEditing }"
            :disabled="!isEditing"
            v-model="store.transactionData.customer_type_project"
          >
            <option value="" disabled>เลือกประเภทลูกค้า</option>
            <option value="ผู้ติดตั้งหลัก">ผู้ติดตั้งหลัก</option>
            <option value="ผู้ติดตั้งรายย่อย">ผู้ติดตั้งรายย่อย</option>
          </select>
          <span v-if="errors.customer_type_project" class="error-text">กรุณาระบุข้อมูล</span>
        </div>
        <div class="form-group">
          <label>วงเงินเครดิตโครงการที่ขอ (บาท) <span class="text-red-500">*</span></label>
          <input
            type="text"
            class="form-input"
            :class="{ 'border-red-500': errors.amount, 'disabled': !isEditing }"
            :disabled="!isEditing"
            placeholder="ระบุวงเงินเครดิต"
            v-model="formattedAmount"
            @input="handleAmountInput"
          />
          <span v-if="errors.amount" class="error-text">กรุณาระบุข้อมูล</span>
        </div>
      </div>

      <div class="form-grid-three-columns" style="margin-top: 15px;">
        <div class="form-group">
          <label style="display: flex; align-items: center; gap: 8px;">
            <input type="checkbox" v-model="store.transactionData.has_deposit" :disabled="!isEditing" />
            เงินมัดจำ (Deposit)
          </label>
          <input
            v-if="store.transactionData.has_deposit"
            type="text"
            class="form-input"
            :class="{ 'border-red-500': errors.deposit_amount, 'disabled': !isEditing }"
            :disabled="!isEditing"
            placeholder="ระบุจำนวนเงินมัดจำ"
            v-model="formattedDeposit"
            @input="handleDepositInput"
            style="margin-top: 8px;"
          />
        </div>
        <div class="form-group">
          <label style="display: flex; align-items: center; gap: 8px;">
            <input type="checkbox" v-model="store.transactionData.has_bg" :disabled="!isEditing" />
            Bank Guarantee
          </label>
          <input
            v-if="store.transactionData.has_bg"
            type="text"
            class="form-input"
            :class="{ 'border-red-500': errors.bg_amount, 'disabled': !isEditing }"
            :disabled="!isEditing"
            placeholder="ระบุจำนวนเงิน BG"
            v-model="formattedBg"
            @input="handleBgInput"
            style="margin-top: 8px;"
          />
        </div>
      </div>

      <!-- Simple Milestone Plan -->
      <div class="section-header" style="margin-top: 30px;">
        <h3>แผนการรับสินค้า / แบ่งงวด (Phasing Plan)</h3>
      </div>
      <div class="credit-history-container">
        <div v-for="(phase, index) in projectPhases" :key="index" class="credit-history-row">
            <div class="row-index">งวดที่ {{ index + 1 }}.</div>
            <div class="form-group medium-width">
                <label>วันที่คาดว่าจะรับ</label>
                <input
                  type="date"
                  class="form-input"
                  v-model="phase.expected_date"
                  :disabled="!isEditing"
                />
            </div>
            <div class="form-group flex-grow">
                <label>รายละเอียด/สินค้า</label>
                <input
                  type="text"
                  class="form-input"
                  v-model="phase.details"
                  placeholder="เช่น กระจกงวดแรก"
                  :disabled="!isEditing"
                />
            </div>
            <div class="form-group medium-width">
                <label>มูลค่า (บาท)</label>
                <input
                  type="text"
                  class="form-input"
                  :value="formatWithCommas(phase.amount)"
                  @input="(e) => restrictLocalCreditInput(e, phase, 'amount')"
                  :disabled="!isEditing"
                />
            </div>
            <div class="action-col" v-if="isEditing">
               <button class="delete-btn" @click="removePhase(index)" title="ลบงวด">
                 <img src="@/assets/icons/x-circle-red.svg" alt="Delete" style="width: 16px; height: 16px;">
               </button>
            </div>
        </div>
      </div>
      <div class="add-row-section" v-if="isEditing">
          <button class="add-btn" @click="addPhase">+ เพิ่มงวด</button>
      </div>
    </div>

    <transition name="slide-fade">
        <div class="upload-section" v-if="isUploadsVisible">
        <div class="upload-grid" v-if="!isProjectCredit">
            <FileUploader
            label="ใบขอเปิดเครดิต"
            required
            v-model="files.creditApp"
            :disabled="!isEditing"
            multiple
            />
            <FileUploader
            label="ใบเสนอราคา"
            :required="isQuotationRequired"
            v-model="files.quotation"
            :disabled="!isEditing"
            multiple
            />
        </div>

        <!-- Project Specific Uploads -->
        <div class="upload-grid" v-if="isProjectCredit">
            <FileUploader
            label="สัญญาโปรเจค/ป้ายหน้า Site งาน"
            required
            v-model="files.projectContract"
            :disabled="!isEditing"
            multiple
            />
            <FileUploader
            label="แผนการรับสินค้า"
            required
            v-model="files.projectPlan"
            :disabled="!isEditing"
            multiple
            />
            <FileUploader
            label="ใบเสนอราคาจากตังน้ำ"
            required
            v-model="files.quotation"
            :disabled="!isEditing"
            multiple
            />
            <FileUploader
            label="สำเนา Bank Guarantee / หลักฐานเงินมัดจำ"
            v-model="files.projectSecurity"
            :disabled="!isEditing"
            multiple
            />
        </div>

        <!-- Other Documents Section -->
        <OtherDocumentsSection tabName="requestInfo" :readOnly="!isEditing" />
        </div>
    </transition>

    <!-- Contact Info Section -->
    <transition name="slide-fade">
        <div class="personal-info-section" v-if="isContactInfoVisible && !isProjectCredit">
        <div class="section-header">
            <h3>ตรวจสอบข้อมูลผู้ติดต่อ</h3>
        </div>

        <!-- New Layout: 1 Row -->
        <div class="contact-grid-layout">
            <div class="form-group">
            <label>ชื่อผู้ติดต่อ <span v-if="isRequired('contact_person')" class="text-red-500">*</span></label>
            <input
                type="text"
                class="form-input"
                :class="{ 'border-red-500': errors.contact_person, 'disabled': !isEditing }"
                :disabled="!isEditing"
                v-model="store.customer.contact_person" :data-empty="!store.customer.contact_person"
                placeholder="ระบุชื่อผู้ติดต่อ"
            />
            <span v-if="errors.contact_person" class="error-text">กรุณาระบุข้อมูล</span>
            </div>
            <div class="form-group">
            <label>ตำแหน่ง <span v-if="isRequired('contact_position')" class="text-red-500">*</span></label>
            <input
                type="text"
                class="form-input"
                :class="{ 'border-red-500': errors.contact_position, 'disabled': !isEditing }"
                :disabled="!isEditing"
                v-model="store.customer.contact_position" :data-empty="!store.customer.contact_position"
                placeholder="ระบุตำแหน่ง"
            />
            <span v-if="errors.contact_position" class="error-text">กรุณาระบุข้อมูล</span>
            </div>
            <div class="form-group">
            <label>ฝ่าย</label>
            <input
                type="text"
                class="form-input"
                :class="{ 'disabled': !isEditing }"
                :disabled="!isEditing"
                v-model="store.customer.contact_division" :data-empty="!store.customer.contact_division"
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
                v-model="store.customer.contact_phone_number" :data-empty="!store.customer.contact_phone_number"
                placeholder="0XX-XXX-XXXX"
                @input="(e) => handlePhoneInput(e, 'contact_phone_number')"
            />
            <span v-if="errors.contact_phone_number" class="error-text">กรุณาระบุข้อมูล</span>
            </div>
        </div>
        </div>
    </transition>

    <!-- Credit Details Section -->
    <div class="personal-info-section" v-if="!isProjectCredit">
      <div class="section-header">
        <h3>รายละเอียดคำขอเครดิต</h3>
      </div>
      <div class="form-grid-three-columns">
            <!-- Field 1: Current Limit (Read Only) - Only for Credit Increase -->
            <div class="form-group" v-if="isRequestIncrease && isDraftMode">
              <label>วงเงินปัจจุบัน</label>
              <input
                type="text"
                class="form-input disabled"
                disabled
                :value="formattedCurrentCreditLimit" :data-empty="!store.customer.current_credit_limit"
              />
            </div>

            <div class="form-group" v-if="isDraftMode">
              <label>
                  {{ isRequestIncrease ? 'ต้องการวงเงินเพิ่ม' : 'วงเงินเครดิตที่ต้องการ (บาท)' }}
                  <span v-if="isRequired('amount')" class="text-red-500">*</span>
              </label>
              <input
                type="text"
                class="form-input"
                :class="{ 'border-red-500': errors.amount, 'disabled': !canEditAmount }"
                :disabled="!canEditAmount"
                placeholder="ระบุวงเงินที่ต้องการ"
                v-model="formattedAmount" :data-empty="!formattedAmount"
                @input="handleAmountInput"
              />
              <span v-if="errors.amount" class="error-text">กรุณาระบุข้อมูล</span>
            </div>

            <div class="form-group" v-if="isRequestIncrease && isDraftMode">
              <label>วงเงินรวมทั้งหมด</label>
              <input
                type="text"
                class="form-input disabled"
                disabled
                :value="totalLimit" :data-empty="totalLimit === 'N/A'"
              />
            </div>

            <!-- New Split Terms for Draft Mode -->
            <template v-if="isDraftMode && !isProjectCredit">
              <div class="form-group">
                <label>
                    ระยะเวลาเครดิต (กระจก, กาว)
                    <!-- Show current if special mode -->
                    <span v-if="isChangeTerm && store.originalCustomer.credit_term" class="text-sm text-gray-500 block">
                        (ปัจจุบัน: {{ store.originalCustomer.credit_term }})
                    </span>
                </label>
                <input
                  type="text"
                  class="form-input"
                  :class="{ 'disabled': !canEditTerms }"
                  :disabled="!canEditTerms"
                  placeholder="ระบุระยะเวลาเครดิต (กระจก, กาว)"
                  v-model="store.transactionData.termGS" :data-empty="!store.transactionData.termGS"
                  @input="(e) => handleNumericInput(e, 'termGS', true)"
                />
              </div>
              <div class="form-group">
                <label>
                    ระยะเวลาเครดิต (อลูมิเนียม, Acc)
                    <span v-if="isChangeTerm && store.originalCustomer.credit_term" class="text-sm text-gray-500 block">
                        (ปัจจุบัน: {{ store.originalCustomer.credit_term }})
                    </span>
                </label>
                <input
                  type="text"
                  class="form-input"
                  :class="{ 'disabled': !canEditTerms }"
                  :disabled="!canEditTerms"
                  placeholder="ระบุระยะเวลาเครดิต (อลูมิเนียม, Acc)"
                  v-model="store.transactionData.termAE" :data-empty="!store.transactionData.termAE"
                  @input="(e) => handleNumericInput(e, 'termAE', true)"
                />
              </div>
              <div class="form-group">
                <label>
                    ระยะเวลาเครดิต (ยิปซั่ม, ซีลาย)
                    <span v-if="isChangeTerm && store.originalCustomer.credit_term" class="text-sm text-gray-500 block">
                        (ปัจจุบัน: {{ store.originalCustomer.credit_term }})
                    </span>
                </label>
                <input
                  type="text"
                  class="form-input"
                  :class="{ 'disabled': !canEditTerms }"
                  :disabled="!canEditTerms"
                  placeholder="ระบุระยะเวลาเครดิต (ยิปซั่ม, ซีลาย)"
                  v-model="store.transactionData.termYC" :data-empty="!store.transactionData.termYC"
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
                v-model="store.transactionData.reason" :data-empty="!store.transactionData.reason"
              >
                  <option value="" disabled>เลือกเหตุผล</option>
                  <option v-for="option in reasonOptions" :key="option" :value="option">
                    {{ option }}
                  </option>
              </select>
              <span v-if="errors.reason" class="error-text">กรุณาระบุข้อมูล</span>
            </div>
      </div>

      <!-- Billing Information Section -->
      <transition name="slide-fade">
      <div class="billing-info-section" v-if="isBillingVisible && !isProjectCredit">

        <!-- New 3-Column Grid for Requirement, Method, and Schedule -->
        <div class="form-grid-three-columns">
            <div class="form-group">
               <label>ต้องมีการวางบิลหรือไม่ <span v-if="isRequired('billing_requirement')" class="text-red-500">*</span></label>
               <select
                  class="form-input"
                  :class="{ 'border-red-500': errors.billing_requirement, 'disabled': !isEditing }"
                  :disabled="!isEditing"
                  v-model="store.customer.billing_requirement" :data-empty="!store.customer.billing_requirement"
                >
                    <option value="" disabled>เลือกการวางบิล</option>
                    <option value="required">ต้องการ</option>
                    <option value="not_required">ไม่ต้องการ</option>
                    <option value="other">อื่นๆ (ระบุ)</option>
                </select>
                <span v-if="errors.billing_requirement" class="error-text">กรุณาระบุข้อมูล</span>
                <!-- Other Input for Requirement -->
                <div v-if="store.customer.billing_requirement === 'other'" style="margin-top: 10px;">
                    <input
                        type="text"
                        class="form-input"
                        placeholder="ระบุ"
                        v-model="store.customer.billing_requirement_note" :data-empty="!store.customer.billing_requirement_note"
                        :disabled="!isEditing"
                    >
                </div>
            </div>

            <div class="form-group" v-if="store.customer.billing_requirement === 'required'">
               <label>กรณีต้องวางบิลขอให้เลือกวิธีวางบิล <span class="text-red-500">*</span></label>
               <select
                  class="form-input"
                  :class="{ 'border-red-500': errors.billing_method, 'disabled': !isEditing }"
                  :disabled="!isEditing"
                  v-model="store.customer.billing_method" :data-empty="!store.customer.billing_method"
                >
                    <option value="" disabled>เลือกวิธีในการวางบิล</option>
                    <option value="delivery">พร้อมการส่งมอบสินค้า</option>
                    <option value="mail">ทางไปรษณีย์</option>
                    <option value="company">ที่บริษัท ร้านค้า</option>
                    <option value="other">อื่นๆ</option>
                </select>
                <span v-if="errors.billing_method" class="error-text">กรุณาระบุข้อมูล</span>
                 <!-- Other Input for Method -->
                 <div v-if="store.customer.billing_method === 'other'" style="margin-top: 10px;">
                    <input
                        type="text"
                        class="form-input"
                        :class="{ 'border-red-500': errors.billing_method_note, 'disabled': !isEditing }"
                        placeholder="ระบุ"
                        v-model="store.customer.billing_method_note" :data-empty="!store.customer.billing_method_note"
                        :disabled="!isEditing"
                    >
                    <span v-if="errors.billing_method_note" class="error-text">กรุณาระบุข้อมูล</span>
                </div>
            </div>

            <!-- Billing Schedule (Moved here, ensuring 3rd slot) -->
            <div class="form-group" v-if="store.customer.billing_requirement && store.customer.billing_requirement !== 'not_required'">
                <label>เงื่อนไขการวางบิล <span v-if="store.customer.billing_requirement === 'required'" class="text-red-500">*</span></label>
                <input
                  type="text"
                  class="form-input"
                  :class="{ 'border-red-500': errors.billing_schedule, 'disabled': !isEditing }"
                  v-model="store.customer.billing_schedule" :data-empty="!store.customer.billing_schedule"
                  placeholder="ระบุวันที่/เวลา"
                  :disabled="!isEditing"
                >
                <span v-if="errors.billing_schedule" class="error-text">กรุณาระบุข้อมูล</span>
             </div>
        </div>

        <div v-if="store.customer.billing_requirement && store.customer.billing_requirement !== 'not_required'">
            <div class="billing-contact-grid">
                 <div class="form-group">
                    <label>มือถือ</label>
                    <input
                      type="text"
                      class="form-input"
                      v-model="store.customer.billing_mobile" :data-empty="!store.customer.billing_mobile"
                      placeholder="ระบุเบอร์มือถือ"
                      :disabled="!isEditing"
                    >
                 </div>
                 <div class="form-group">
                    <label>อีเมล</label>
                    <input
                      type="text"
                      class="form-input"
                      v-model="store.customer.billing_email" :data-empty="!store.customer.billing_email"
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
                v-model="store.customer.payment_method" :data-empty="!store.customer.payment_method"
                >
                <option value="" disabled>เลือกวิธีการชำระเงิน</option>
                <option value="โอนเงิน">โอนเงิน</option>
                <option value="รับเช็ค">รับเช็ค</option>
                </select>
                <span v-if="errors.payment_method" class="error-text">กรุณาระบุข้อมูล</span>
            </div>

             <!-- Conditional Payment Condition Input -->
             <div class="form-group" v-if="store.customer.payment_method">
                <label>{{ store.customer.payment_method === 'โอนเงิน' ? 'เงื่อนไขการโอนเงิน' : 'เงื่อนไขการรับเช็ค' }} <span class="text-red-500">*</span></label>
                <input
                    type="text"
                    class="form-input"
                    :class="{ 'border-red-500': errors.payment_condition, 'disabled': !isEditing }"
                    v-model="store.customer.payment_condition" :data-empty="!store.customer.payment_condition"
                    :disabled="!isEditing"
                />
                <span v-if="errors.payment_condition" class="error-text">กรุณาระบุข้อมูล</span>
            </div>
        </div>

        <!-- Bank Details Grid (Visible only when method is selected) -->
        <div v-if="store.customer.payment_method" class="form-grid-three-columns">
            <div class="form-group">
            <label>จากบัญชีธนาคาร <span class="text-red-500">*</span></label>
            <input
                type="text"
                class="form-input"
                :class="{ 'border-red-500': errors.payment_bank_name, 'disabled': !isEditing }"
                :disabled="!isEditing"
                v-model="store.customer.payment_bank_name" :data-empty="!store.customer.payment_bank_name"
                placeholder="ระบุชื่อธนาคาร"
            />
            <span v-if="errors.payment_bank_name" class="error-text">กรุณาระบุข้อมูล</span>
            </div>
            <div class="form-group">
            <label>สาขา <span class="text-red-500">*</span></label>
            <input
                type="text"
                class="form-input"
                :class="{ 'border-red-500': errors.payment_bank_branch, 'disabled': !isEditing }"
                :disabled="!isEditing"
                v-model="store.customer.payment_bank_branch" :data-empty="!store.customer.payment_bank_branch"
                placeholder="ระบุสาขา"
            />
            <span v-if="errors.payment_bank_branch" class="error-text">กรุณาระบุข้อมูล</span>
            </div>
            <div class="form-group">
            <label>เลขที่บัญชี <span class="text-red-500">*</span></label>
            <input
                type="text"
                class="form-input"
                :class="{ 'border-red-500': errors.payment_account_no, 'disabled': !isEditing }"
                :disabled="!isEditing"
                v-model="store.customer.payment_account_no" :data-empty="!store.customer.payment_account_no"
                placeholder="ระบุเลขที่บัญชี"
                @input="(e) => handlePhoneInput(e, 'payment_account_no')"
            />
            <span v-if="errors.payment_account_no" class="error-text">กรุณาระบุข้อมูล</span>
            </div>
        </div>

      </div>
      </transition>
    </div>

    <!-- Existing Credit Info Section -->
    <div class="personal-info-section" v-if="!isProjectCredit">
      <div class="section-separator"></div>
      <div class="section-header">
        <h3>ลูกค้าได้เครดิตที่อื่นหรือไม่ <span v-if="isRequired('has_other_credit')" class="text-red-500">*</span></h3>
      </div>

      <!-- New Radio Button Group -->
      <div class="form-group" style="margin-bottom: 20px;">
        <div class="radio-group-horizontal">
            <label class="radio-label">
              <input
                type="radio"
                value="yes"
                v-model="store.customer.has_other_credit" :data-empty="!store.customer.has_other_credit"
                :disabled="!isEditing"
              >
              มีเครดิตจากที่อื่น
            </label>
            <label class="radio-label">
              <input
                type="radio"
                value="no"
                v-model="store.customer.has_other_credit" :data-empty="!store.customer.has_other_credit"
                :disabled="!isEditing"
              >
              ไม่มีเครดิตจากที่อื่น
            </label>
        </div>
        <span v-if="errors.has_other_credit" class="error-text">กรุณาระบุข้อมูล</span>
      </div>

      <div class="credit-history-container" v-if="store.customer.has_other_credit === 'yes'">
        <div v-for="(item, index) in store.customer.existing_credits" :key="index" class="credit-history-row">
            <div class="row-index">{{ index + 1 }}.</div>
            <div class="form-group flex-grow">
                <label>ชื่อบริษัท <span class="text-red-500">*</span></label>
                <input
                  type="text"
                  class="form-input"
                  :class="{ 'border-red-500': errors[`existing_credit_${index}_companyName`], 'disabled': !isEditing }"
                  v-model="item.companyName" :data-empty="!item.companyName"
                  :disabled="!isEditing"
                />
                <span v-if="errors[`existing_credit_${index}_companyName`]" class="error-text">กรุณาระบุข้อมูล</span>
            </div>
            <div class="form-group flex-grow">
                <label>สินค้าที่ซื้อ <span class="text-red-500">*</span></label>
                <input
                  type="text"
                  class="form-input"
                  :class="{ 'border-red-500': errors[`existing_credit_${index}_goods`], 'disabled': !isEditing }"
                  v-model="item.goods" :data-empty="!item.goods"
                  :disabled="!isEditing"
                />
                <span v-if="errors[`existing_credit_${index}_goods`]" class="error-text">กรุณาระบุข้อมูล</span>
            </div>
            <div class="form-group small-width">
                <label>เครดิต (วัน) <span class="text-red-500">*</span></label>
                <input
                  type="text"
                  class="form-input"
                  :class="{ 'border-red-500': errors[`existing_credit_${index}_term`], 'disabled': !isEditing }"
                  v-model="item.term" :data-empty="!item.term"
                  :disabled="!isEditing"
                  @input="(e) => { e.target.value = e.target.value.replace(/\D/g, ''); item.term = e.target.value; }"
                />
                <span v-if="errors[`existing_credit_${index}_term`]" class="error-text">กรุณาระบุข้อมูล</span>
            </div>
            <div class="form-group medium-width">
                <label>วงเงิน (บาท) <span class="text-red-500">*</span></label>
                <input
                  type="text"
                  class="form-input"
                  :class="{ 'border-red-500': errors[`existing_credit_${index}_limit`], 'disabled': !isEditing }"
                  :value="formatWithCommas(item.limit)" :data-empty="!formatWithCommas(item.limit)"
                  :disabled="!isEditing"
                  @input="(e) => restrictLocalCreditInput(e, item, 'limit')"
                />
                <span v-if="errors[`existing_credit_${index}_limit`]" class="error-text">กรุณาระบุข้อมูล</span>
            </div>
            <div class="action-col" v-if="isEditing">
               <button class="delete-btn" @click="removeCreditRow(index)" title="ลบรายการ">
                 <img src="@/assets/icons/x-circle-red.svg" alt="Delete" style="width: 16px; height: 16px;">
               </button>
            </div>
        </div>
      </div>

      <div class="add-row-section" v-if="isEditing && store.customer.has_other_credit === 'yes'">
          <button class="add-btn" @click="addCreditRow">+ เพิ่มรายการ</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { reactive, watch, ref, computed } from 'vue';
import FileUploader from '@/components/shared/FileUploader.vue';
import OtherDocumentsSection from '../OtherDocumentsSection.vue';
import { useCreditRequestStore } from '@/stores/creditRequest';
import { mandatoryStoreKeys } from '@/config/mandatoryFields';

const props = defineProps(['readOnly', 'viewMode']);
const store = useCreditRequestStore();

const isEditing = ref(!props.readOnly);
watch(() => props.readOnly, (val) => {
  isEditing.value = !val;
});

const isDraftMode = computed(() => {
  return !store.requestStatus || store.requestStatus === 'Draft';
});

const isRequestIncrease = computed(() => store.transactionData.requestType && store.transactionData.requestType.includes('เครดิตเพิ่ม'));
const isChangePayment = computed(() => store.transactionData.requestType && store.transactionData.requestType.includes('เปลี่ยนแปลงเงื่อนไขการชำระเงิน'));
const isChangeTerm = computed(() => store.transactionData.requestType && store.transactionData.requestType.includes('เปลี่ยนแปลงระยะเวลาเครดิต'));
const isNewRequest = computed(() => store.transactionData.requestType && store.transactionData.requestType.includes('เครดิตใหม่'));
const isProjectCredit = computed(() => store.transactionData.requestType && store.transactionData.requestType.includes('เครดิตโครงการ'));

const isQuotationRequired = computed(() => {
    return store.transactionData.reason === 'ขออนุมัติเครดิต (มีใบสั่งซื้อแนบมาพร้อม)';
});

// Mock Data for Projects
const availableProjects = ref([]);

const mockFetchProjects = (customerCode) => {
    // Simulate API call to Sales system
    const fakeProjects = [
        {
            code: 'PJ2024-001',
            name: 'โครงการคอนโดเลต รัชดา',
            branch: 'สำนักงานใหญ่',
            requester: 'นายสมศักดิ์ ขยันขาย',
            mainProduct: 'กระจกใส 6 มม.',
            customerCode: customerCode
        },
        {
            code: 'PJ2024-002',
            name: 'โครงการหมู่บ้านสราญสิริ',
            branch: 'สาขาบางนา',
            requester: 'นางสาวสุดา ใจดี',
            mainProduct: 'อลูมิเนียมเส้น',
            customerCode: customerCode
        }
    ];
    return fakeProjects;
};

// Fetch projects when it's a project credit request and customer is loaded
watch(() => [isProjectCredit.value, store.customer?.id], ([isProj, custId]) => {
    if (isProj && custId && custId !== 'NEW') {
        availableProjects.value = mockFetchProjects(custId);
    } else {
        availableProjects.value = [];
    }
}, { immediate: true });

const selectedProjectDetails = computed(() => {
    if (!store.transactionData.project_code || !availableProjects.value.length) return null;
    return availableProjects.value.find(p => p.code === store.transactionData.project_code);
});

const handleProjectSelect = (event) => {
    const selectedCode = event.target.value;
    const project = availableProjects.value.find(p => p.code === selectedCode);
    if (project) {
        store.transactionData.project_name = project.name;
    }
};

// VISIBILITY LOGIC
const showAll = computed(() => props.viewMode === 'full');

const isUploadsVisible = computed(() => {
    if (showAll.value) return true;
    if (isNewRequest.value) return true;
    if (isRequestIncrease.value) return true;
    if (isProjectCredit.value) return true;
    return false;
});

const isContactInfoVisible = computed(() => {
    if (showAll.value) return true;
    if (isNewRequest.value) return true;
    if (isProjectCredit.value) return true;
    return false;
});

const isBillingVisible = computed(() => {
    if (showAll.value) return true;
    if (isNewRequest.value) return true;
    if (isChangePayment.value) return true;
    if (isProjectCredit.value) return true;
    return false;
});

// Field Visibility / Editability Logic
const canEditAmount = computed(() => isEditing.value && isDraftMode.value && (isRequestIncrease.value || isNewRequest.value));
const canEditTerms = computed(() => isEditing.value && isDraftMode.value && (isRequestIncrease.value || isChangeTerm.value || isNewRequest.value) && !isProjectCredit.value);

function isRequired(storeKey) {
    return mandatoryStoreKeys.fields.includes(storeKey);
}

// Simple computed error object based on store's validation logic
const errors = computed(() => {
    if (!store.showValidationErrors) return {};

    // Check fields
    const e = {};
    const check = (key, val) => {
        if (!val || (typeof val === 'string' && val.trim() === '')) {
            e[key] = true;
        }
    };

    if (isProjectCredit.value) {
        check('project_code', store.transactionData.project_code);
        check('customer_type_project', store.transactionData.customer_type_project);
        check('amount', store.transactionData.amount);
        if (store.transactionData.has_deposit) check('deposit_amount', store.transactionData.deposit_amount);
        if (store.transactionData.has_bg) check('bg_amount', store.transactionData.bg_amount);
    } else {
        check('contact_person', store.customer.contact_person);
        check('contact_position', store.customer.contact_position);
        check('contact_phone_number', store.customer.contact_phone_number);
        check('amount', store.transactionData.amount);
        check('reason', store.transactionData.reason);
        check('billing_requirement', store.customer.billing_requirement);
        check('payment_method', store.customer.payment_method);
        check('has_other_credit', store.customer.has_other_credit);
    }

    if (!isProjectCredit.value) {
        if (store.customer.billing_requirement === 'required') {
            check('billing_method', store.customer.billing_method);
            check('billing_schedule', store.customer.billing_schedule);
            if (store.customer.billing_method === 'other') {
                check('billing_method_note', store.customer.billing_method_note);
            }
        }

        if (store.customer.payment_method) {
            check('payment_condition', store.customer.payment_condition);
            check('payment_bank_name', store.customer.payment_bank_name);
            check('payment_bank_branch', store.customer.payment_bank_branch);
            check('payment_account_no', store.customer.payment_account_no);
        }

        if (store.customer.has_other_credit === 'yes' && store.customer.existing_credits) {
            store.customer.existing_credits.forEach((item, index) => {
                check(`existing_credit_${index}_companyName`, item.companyName);
                check(`existing_credit_${index}_goods`, item.goods);
                check(`existing_credit_${index}_term`, item.term);
                check(`existing_credit_${index}_limit`, item.limit);
            });
        }
    }

    return e;
});

const files = reactive({
  creditApp: null,
  quotation: null,
  projectContract: null,
  projectPlan: null,
  projectSecurity: null
});

watch(() => store.customer.has_other_credit, (newVal) => {
    if (newVal === 'no') {
        store.customer.existing_credits = [];
    } else if (newVal === 'yes') {
        // Automatically add one empty row if none exists
        if (!store.customer.existing_credits || store.customer.existing_credits.length === 0) {
            store.customer.existing_credits = [{ companyName: '', goods: '', term: '', limit: '' }];
        }
    }
});

// Watch for file changes to update store
watch(() => files.creditApp, (newVal) => {
  store.updateFile('credit_application_doc', newVal);
});

watch(() => files.quotation, (newVal) => {
  store.updateFile('quotation_doc', newVal);
});

watch(() => files.projectContract, (newVal) => {
  store.updateFile('project_contract_doc', newVal);
});

watch(() => files.projectPlan, (newVal) => {
  store.updateFile('project_plan_doc', newVal);
});

watch(() => files.projectSecurity, (newVal) => {
  store.updateFile('project_security_doc', newVal);
});

// Initialize files from store (to support Edit mode or tab switching)
watch(() => store.files, (newVal) => {
  files.creditApp = newVal?.credit_application_doc || null;
  files.quotation = newVal?.quotation_doc || null;
  files.projectContract = newVal?.project_contract_doc || null;
  files.projectPlan = newVal?.project_plan_doc || null;
  files.projectSecurity = newVal?.project_security_doc || null;
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

const formattedCurrentCreditLimit = computed(() => {
    return store.customer.current_credit_limit ? Number(store.customer.current_credit_limit).toLocaleString('en-US') : 'N/A';
});

const totalLimit = computed(() => {
    if (!isRequestIncrease.value) return 'N/A';

    const currentLimit = Number(store.customer.current_credit_limit || 0);
    const requestedAmount = Number(store.transactionData.amount || 0);

    const sum = currentLimit + requestedAmount;

    return sum ? sum.toLocaleString('en-US') : 'N/A';
});

const formattedAmount = computed({
    get: () => store.transactionData.amount ? Number(store.transactionData.amount).toLocaleString('en-US') : '',
    set: (val) => {
        const num = val.replace(/[^0-9]/g, '');
        store.transactionData.amount = num;
    }
});

const handleAmountInput = (event) => {
    let val = event.target.value;
    val = val.replace(/[^0-9]/g, '');
    // The setter in computed property handles the store update,
    // but we can ensure clean value in input if needed, though v-model handles it.
    // Similar to handleCapitalInput pattern in StoreStatementTab
    formattedAmount.value = val;
};

// Formatted properties for Project Security
const formattedDeposit = computed({
    get: () => store.transactionData.deposit_amount ? Number(store.transactionData.deposit_amount).toLocaleString('en-US') : '',
    set: (val) => {
        const num = val.replace(/[^0-9]/g, '');
        store.transactionData.deposit_amount = num;
    }
});

const handleDepositInput = (event) => {
    let val = event.target.value;
    val = val.replace(/[^0-9]/g, '');
    formattedDeposit.value = val;
};

const formattedBg = computed({
    get: () => store.transactionData.bg_amount ? Number(store.transactionData.bg_amount).toLocaleString('en-US') : '',
    set: (val) => {
        const num = val.replace(/[^0-9]/g, '');
        store.transactionData.bg_amount = num;
    }
});

const handleBgInput = (event) => {
    let val = event.target.value;
    val = val.replace(/[^0-9]/g, '');
    formattedBg.value = val;
};

// Project Phasing Logic
const projectPhases = ref(store.transactionData.project_phases || []);

watch(() => store.transactionData.project_phases, (newVal) => {
    if (newVal) projectPhases.value = newVal;
}, { immediate: true });

watch(projectPhases, (newVal) => {
    store.transactionData.project_phases = newVal;
}, { deep: true });

const addPhase = () => {
    projectPhases.value.push({ expected_date: '', details: '', amount: '' });
};

const removePhase = (index) => {
    projectPhases.value.splice(index, 1);
};

// Clean up security fields if untoggled
watch(() => store.transactionData.has_deposit, (val) => {
    if (!val) store.transactionData.deposit_amount = '';
});
watch(() => store.transactionData.has_bg, (val) => {
    if (!val) store.transactionData.bg_amount = '';
});

// Helper for phone/numeric inputs to ensure model update
function handlePhoneInput(e, storeKey) {
    // Allow digits and dashes
    const value = e.target.value.replace(/[^0-9-]/g, '');
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

// Helper for comma formatting
function formatWithCommas(val) {
    if (!val) return '';
    const parts = String(val).split('.');
    let formatted = Number(parts[0]).toLocaleString('en-US');
    if (parts.length > 1) {
        formatted += '.' + parts[1];
    }
    return formatted;
}

// Helper for number input in loop
function restrictLocalCreditInput(e, item, field) {
    let value = e.target.value.replace(/[^0-9.]/g, '');
    const parts = value.split('.');
    if (parts.length > 2) value = parts[0] + '.' + parts.slice(1).join('');
    // Store raw value
    item[field] = value;
    // Format display value
    e.target.value = formatWithCommas(value);
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



/* Updated Grid for 1 Row */
.contact-grid-layout {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr 1fr;
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
    grid-template-columns: 1fr 1fr;
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

/* Transition Animations */
.slide-fade-enter-active,
.slide-fade-leave-active {
  transition: all 0.3s ease-in-out;
  max-height: 500px; /* Arbitrary large height */
  opacity: 1;
}

.slide-fade-enter-from,
.slide-fade-leave-to {
  max-height: 0;
  opacity: 0;
  margin: 0;
  padding: 0;
  overflow: hidden;
}

/* Radio Group Styles */
.radio-group-horizontal {
  display: flex;
  gap: 30px;
  align-items: center;
  margin-top: 10px;
}

.radio-label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  font-size: 1rem;
  color: #333;
}

.radio-label input[type="radio"] {
  width: 18px;
  height: 18px;
  cursor: pointer;
}

.radio-label input[type="radio"]:disabled {
  cursor: not-allowed;
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
