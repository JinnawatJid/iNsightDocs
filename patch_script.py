import re

with open('src/components/credit/tabs/ProjectInfoTab.vue', 'r') as f:
    content = f.read()

# Replace <template> content to use a loop over projects
# The layout should have a search bar at top, and then a list of cards for each added project.

template_content = """<template>
  <div class="project-info-tab">
    <div class="form-section">
      <div class="section-header">
        <h3>เลือกโครงการ (Project Selection)</h3>
      </div>
      <div class="form-grid">
        <div class="form-group full-width">
          <label class="required">ค้นหาและเพิ่มโครงการจากระบบ (Sales System)</label>
          <div class="search-wrapper">
             <input
               type="text"
               v-model="projectSearchQuery"
               placeholder="ค้นหาชื่อโครงการ หรือ รหัสโครงการ..."
               :disabled="props.readOnly"
               @keyup.enter="handleProjectSearch"
             />
             <button class="btn-search-project" @click="handleProjectSearch" :disabled="props.readOnly || isSearchingProject">
                 {{ isSearchingProject ? 'กำลังค้นหา...' : 'ค้นหา' }}
             </button>
          </div>
          <div class="search-hint">พิมพ์ชื่อ/รหัสโครงการ หรือกดปุ่ม "ค้นหา" ทันทีเพื่อดูโครงการทั้งหมด</div>

          <div v-if="projectSearchResults.length > 0" class="project-results">
              <div
                  v-for="proj in projectSearchResults"
                  :key="proj.id"
                  class="project-item"
                  @click="addProject(proj)"
              >
                 <div class="proj-title">{{ proj.id }} - {{ proj.name }}</div>
                 <div class="proj-desc">ลูกค้า: {{ proj.customerName }} | ผู้รับผิดชอบ: {{ proj.projectManager }}</div>
                 <div class="proj-add-hint text-primary text-xs mt-1">+ คลิกเพื่อเพิ่มโครงการ</div>
              </div>
          </div>
          <div v-if="projectSearchMsg" class="project-search-msg">{{ projectSearchMsg }}</div>
        </div>
      </div>

      <!-- List of Added Projects -->
      <div v-if="transactionData.projects && transactionData.projects.length > 0" class="added-projects-container mt-4">
        <div v-for="(project, projectIndex) in transactionData.projects" :key="projectIndex" class="project-card mb-4" style="border: 1px solid #ccc; border-radius: 8px; padding: 20px; background-color: #fff;">
             <div class="section-header">
                 <h3>โครงการที่ {{ projectIndex + 1 }}: {{ project.projectData.name }}</h3>
                 <button v-if="!props.readOnly" class="btn-clear" @click="removeProjectCard(projectIndex)" style="margin-left: auto;">ลบโครงการนี้</button>
             </div>

             <div class="form-grid-three-columns">
                 <div class="form-group">
                     <label>รหัสโครงการ</label>
                     <input type="text" class="form-control" disabled :value="project.projectData.id" />
                 </div>
                 <div class="form-group">
                     <label>ชื่อโครงการ</label>
                     <input type="text" class="form-control" disabled :value="project.projectData.name" />
                 </div>
                 <div class="form-group">
                     <label>รหัสลูกค้า</label>
                     <input type="text" class="form-control" disabled :value="project.projectData.customerCode" />
                 </div>
                 <div class="form-group">
                     <label>ชื่อลูกค้า</label>
                     <input type="text" class="form-control" disabled :value="project.projectData.customerName" />
                 </div>
                 <div class="form-group">
                     <label>สาขา</label>
                     <input type="text" class="form-control" disabled :value="project.projectData.branch" />
                 </div>
                 <div class="form-group">
                     <label>ผู้รับผิดชอบโครงการ</label>
                     <input type="text" class="form-control" disabled :value="project.projectData.projectManager" />
                 </div>
                 <div class="form-group">
                     <label>วันเริ่มโครงการ</label>
                     <input
                         type="text"
                         v-model="project.adjustedStartDate"
                         :disabled="props.readOnly"
                         class="form-control"
                         placeholder="DD/MM/YYYY"
                     />
                 </div>
                 <div class="form-group">
                     <label>วันที่คาดว่าจะแล้วเสร็จ</label>
                     <input
                         type="text"
                         v-model="project.adjustedExpectedEndDate"
                         :disabled="props.readOnly"
                         class="form-control"
                         placeholder="DD/MM/YYYY"
                     />
                 </div>
                 <div class="form-group">
                     <label>มูลค่าโครงการรวม (บาท)</label>
                     <input
                         type="text"
                         v-model="project.adjustedProjectValue"
                         :disabled="props.readOnly"
                         @blur="formatAdjustedValue(projectIndex)"
                         @input="handleAdjustedValueInput($event, projectIndex)"
                         class="form-control text-primary font-bold"
                         placeholder="ระบุมูลค่าโครงการ"
                     />
                 </div>
             </div>

             <div class="form-group full-width" style="margin-top: 30px; border-top: 1px solid #ddd; padding-top: 20px;">
                 <div class="section-header" style="margin-bottom: 15px;">
                     <h3>ข้อมูลเพิ่มเติม</h3>
                 </div>
                 <div class="form-grid-three-columns">
                     <div class="form-group">
                         <label>ประเภทการรับเหมา</label>
                         <select
                             v-model="project.contractorType"
                             :disabled="props.readOnly"
                             class="form-control"
                             :class="{ 'is-empty': !project.contractorType }"
                         >
                             <option value="" disabled selected>เลือกประเภทการรับเหมา</option>
                             <option value="Main-Contractor">ผู้รับเหมาหลัก (Main-Contractor)</option>
                             <option value="Sub-Contractor">ผู้รับเหมาช่วง (Sub-Contractor)</option>
                         </select>
                     </div>
                     <div class="form-group">
                         <label>ทีมของลูกค้า</label>
                         <select
                             v-model="project.customerTeam"
                             :disabled="props.readOnly"
                             class="form-control"
                             :class="{ 'is-empty': !project.customerTeam }"
                         >
                             <option value="" disabled selected>เลือกจำนวน</option>
                             <option value="1-10 คน">1-10 คน</option>
                             <option value="11-20 คน">11-20 คน</option>
                             <option value="21-50 คน">21-50 คน</option>
                             <option value="51-100 คน">51-100 คน</option>
                             <option value="มากกว่า 100 คน">มากกว่า 100 คน</option>
                         </select>
                     </div>
                 </div>
             </div>

             <div v-if="project.contractorType === 'Sub-Contractor'" class="form-group full-width" style="margin-top: 10px;">
                 <div class="form-grid-two-columns">
                     <div class="form-group">
                         <label>ชื่อผู้รับเหมาหลัก</label>
                         <input
                             type="text"
                             v-model="project.mainContractorName"
                             :disabled="props.readOnly"
                             class="form-control"
                             placeholder="ระบุชื่อผู้รับเหมาหลัก"
                         />
                     </div>
                     <div class="form-group">
                         <label>เลขประจำตัวผู้เสียภาษี (VAT Number)</label>
                         <input
                             type="text"
                             v-model="project.mainContractorVat"
                             :disabled="props.readOnly"
                             class="form-control"
                             placeholder="ระบุเลขประจำตัวผู้เสียภาษี 13 หลัก"
                         />
                     </div>
                 </div>

                 <!-- Contractor DBD Uploaders -->
                 <div style="margin-top: 15px;">
                     <div class="upload-grid-small">
                        <FileUploader
                          label="ข้อมูลบริษัท (Company Profile)"
                          :modelValue="getFileList('contractor_company_profile_doc_' + projectIndex)"
                          @update:modelValue="(newVal) => updateFileList('contractor_company_profile_doc_' + projectIndex, newVal)"
                          :disabled="props.readOnly"
                          accept=".pdf"
                        />
                        <FileUploader
                          label="งบแสดงฐานะการเงิน (Balance Sheet)"
                          :modelValue="getFileList('contractor_balance_sheet_doc_' + projectIndex)"
                          @update:modelValue="(newVal) => updateFileList('contractor_balance_sheet_doc_' + projectIndex, newVal)"
                          :disabled="props.readOnly"
                          accept=".xlsx, .xls"
                        />
                        <FileUploader
                          label="งบกำไรขาดทุน (Profit & Loss)"
                          :modelValue="getFileList('contractor_profit_loss_doc_' + projectIndex)"
                          @update:modelValue="(newVal) => updateFileList('contractor_profit_loss_doc_' + projectIndex, newVal)"
                          :disabled="props.readOnly"
                          accept=".xlsx, .xls"
                        />
                        <FileUploader
                          label="งบอัตราส่วนทางการเงิน (Ratios)"
                          :modelValue="getFileList('contractor_financial_ratios_doc_' + projectIndex)"
                          @update:modelValue="(newVal) => updateFileList('contractor_financial_ratios_doc_' + projectIndex, newVal)"
                          :disabled="props.readOnly"
                          accept=".xlsx, .xls"
                        />
                      </div>
                 </div>
             </div>

             <div class="form-group full-width" style="border-top: 1px solid #ddd; padding-top: 25px; margin-top: 25px;">
                 <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                     <label style="margin: 0;">รายการสินค้าหลัก:</label>
                     <button v-if="!props.readOnly" @click="addProductItem(projectIndex)" class="btn-text-add">+ เพิ่มสินค้า</button>
                 </div>
                 <div v-if="project.adjustedProductList && project.adjustedProductList.length > 0" class="product-list" style="gap: 15px;">
                     <div v-for="(prod, idx) in project.adjustedProductList" :key="idx" class="product-item" style="display: grid; grid-template-columns: 2fr 1fr; gap: 30px; align-items: center;">
                         <input
                             type="text"
                             v-model="project.adjustedProductList[idx].name"
                             :disabled="props.readOnly"
                             class="form-control"
                             placeholder="ชื่อสินค้า..."
                        />
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <input
                                type="text"
                                :value="project.adjustedProductList[idx].price"
                                @input="handleProductPriceInput($event, projectIndex, idx)"
                                @blur="formatProductPrice(projectIndex, idx)"
                                :disabled="props.readOnly"
                                class="form-control text-right"
                                placeholder="0.00"
                                style="flex: 1; min-width: 0;"
                            />
                            <span class="text-muted" style="font-size: 13px; white-space: nowrap;">บาท/หน่วย</span>
                            <button v-if="!props.readOnly" class="btn-icon-delete-small" @click="removeProductItem(projectIndex, idx)" style="padding: 8px; margin-left: auto;">✕</button>
                        </div>
                     </div>
                 </div>
                 <div v-else class="text-muted" style="font-size: 14px; margin-top: 5px;">
                     (ไม่มีรายการสินค้าหลัก)
                 </div>
             </div>

             <div class="form-group full-width" style="margin-top: 20px;">
                <div class="upload-grid">
                    <FileUploader
                        label="สัญญาโปรเจค/ป้ายหน้า Site งาน"
                        required
                        :modelValue="getFileList('project_contract_doc_' + projectIndex)"
                        @update:modelValue="(newVal) => updateFileList('project_contract_doc_' + projectIndex, newVal)"
                        :disabled="props.readOnly"
                        multiple
                    />
                    <FileUploader
                        label="ใบเสนอราคาจากตังน้ำ"
                        required
                        :modelValue="getFileList('quotation_doc_' + projectIndex)"
                        @update:modelValue="(newVal) => updateFileList('quotation_doc_' + projectIndex, newVal)"
                        :disabled="props.readOnly"
                        multiple
                    />
                </div>

                <div class="upload-grid-small" style="margin-top: 20px;">
                    <div class="guarantee-section">
                        <FileUploader
                            label="Bank Guarantee"
                            :modelValue="getFileList('project_security_doc_' + projectIndex)"
                            @update:modelValue="(newVal) => updateFileList('project_security_doc_' + projectIndex, newVal)"
                            :disabled="props.readOnly"
                            multiple
                        />
                        <div v-if="getFileList('project_security_doc_' + projectIndex) && getFileList('project_security_doc_' + projectIndex).length > 0" class="guarantee-details mt-2">
                            <div v-for="(file, fileIndex) in getFileList('project_security_doc_' + projectIndex)" :key="fileIndex" class="guarantee-detail-card mb-2">
                                <div class="guarantee-file-name text-primary text-sm mb-1 font-semibold truncate" :title="file.name">
                                    {{ file.name }}
                                </div>
                                <div class="guarantee-inputs row g-2">
                                    <div class="col-6">
                                        <label class="text-xs text-muted mb-1">จำนวนเงิน</label>
                                        <input
                                            type="text"
                                            class="form-control form-control-sm"
                                            placeholder="เช่น 1,000,000"
                                            :value="formatGuaranteeAmount(getGuaranteeDetail(projectIndex, 'projectBankGuaranteeDetails', file.name, 'amount'))"
                                            @input="(e) => handleGuaranteeAmountInput(projectIndex, 'projectBankGuaranteeDetails', file.name, 'amount', e.target.value)"
                                            :disabled="props.readOnly"
                                        />
                                    </div>
                                    <div class="col-6">
                                        <label class="text-xs text-muted mb-1">วันหมดอายุ</label>
                                        <input
                                            type="date"
                                            class="form-control form-control-sm"
                                            :value="getGuaranteeDetail(projectIndex, 'projectBankGuaranteeDetails', file.name, 'expiryDate')"
                                            @input="(e) => updateGuaranteeDetail(projectIndex, 'projectBankGuaranteeDetails', file.name, 'expiryDate', e.target.value)"
                                            :disabled="props.readOnly"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="guarantee-section">
                        <FileUploader
                            label="หลักฐานเงินสดมัดจำ"
                            :modelValue="getFileList('project_cash_deposit_doc_' + projectIndex)"
                            @update:modelValue="(newVal) => updateFileList('project_cash_deposit_doc_' + projectIndex, newVal)"
                            :disabled="props.readOnly"
                            multiple
                        />
                        <div v-if="getFileList('project_cash_deposit_doc_' + projectIndex) && getFileList('project_cash_deposit_doc_' + projectIndex).length > 0" class="guarantee-details mt-2">
                            <div v-for="(file, fileIndex) in getFileList('project_cash_deposit_doc_' + projectIndex)" :key="fileIndex" class="guarantee-detail-card mb-2">
                                <div class="guarantee-file-name text-primary text-sm mb-1 font-semibold truncate" :title="file.name">
                                    {{ file.name }}
                                </div>
                                <div class="guarantee-inputs row g-2">
                                    <div class="col-6">
                                        <label class="text-xs text-muted mb-1">จำนวนเงิน</label>
                                        <input
                                            type="text"
                                            class="form-control form-control-sm"
                                            placeholder="เช่น 500,000"
                                            :value="formatGuaranteeAmount(getGuaranteeDetail(projectIndex, 'projectCashDepositDetails', file.name, 'amount'))"
                                            @input="(e) => handleGuaranteeAmountInput(projectIndex, 'projectCashDepositDetails', file.name, 'amount', e.target.value)"
                                            :disabled="props.readOnly"
                                        />
                                    </div>
                                    <div class="col-6">
                                        <label class="text-xs text-muted mb-1">วันหมดอายุ</label>
                                        <input
                                            type="date"
                                            class="form-control form-control-sm"
                                            :value="getGuaranteeDetail(projectIndex, 'projectCashDepositDetails', file.name, 'expiryDate')"
                                            @input="(e) => updateGuaranteeDetail(projectIndex, 'projectCashDepositDetails', file.name, 'expiryDate', e.target.value)"
                                            :disabled="props.readOnly"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
             </div>
        </div>
      </div>

      <OtherDocumentsSection
          v-if="transactionData.projects && transactionData.projects.length > 0"
          tabName="projectInfo"
          :readOnly="props.readOnly"
          title="เอกสารอื่นๆ (Other Project Documents)"
      />
    </div>
  </div>
</template>"""

import re
import sys

# Perform the replacement of <template> ... </template>
new_content = re.sub(r'<template>.*?</template>', template_content, content, flags=re.DOTALL)

with open('src/components/credit/tabs/ProjectInfoTab.vue', 'w') as f:
    f.write(new_content)
