<template>
  <div class="project-info-tab">
    <div class="form-section">
      <div class="section-header">
        <h3>เลือกโครงการ (Project Selection)</h3>
      </div>
      <div class="form-grid">
        <div class="form-group full-width">
          <label class="required">ค้นหาและเลือกโครงการจากระบบ (Sales System)</label>
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
                  @click="selectProject(proj)"
              >
                 <div class="proj-title">{{ proj.id }} - {{ proj.name }}</div>
                 <div class="proj-desc">ลูกค้า: {{ proj.customerName }} | ผู้รับผิดชอบ: {{ proj.projectManager }}</div>
              </div>
          </div>
          <div v-if="projectSearchMsg" class="project-search-msg">{{ projectSearchMsg }}</div>
        </div>

        <template v-if="transactionData.projectData">
             <div class="form-group full-width" style="margin-top: 20px;">
                 <div class="section-header">
                     <h3>ข้อมูลโครงการที่เลือก</h3>
                     <button v-if="!props.readOnly" class="btn-clear" @click="clearProject" style="margin-left: auto;">เปลี่ยนโครงการ</button>
                 </div>
                 <div class="form-grid-three-columns">
                     <div class="form-group">
                         <label>รหัสโครงการ</label>
                         <input type="text" class="form-control" disabled :value="transactionData.projectData.id" />
                     </div>
                     <div class="form-group">
                         <label>ชื่อโครงการ</label>
                         <input type="text" class="form-control" disabled :value="transactionData.projectData.name" />
                     </div>
                     <div class="form-group">
                         <label>รหัสลูกค้า</label>
                         <input type="text" class="form-control" disabled :value="transactionData.projectData.customerCode" />
                     </div>
                     <div class="form-group">
                         <label>ชื่อลูกค้า</label>
                         <input type="text" class="form-control" disabled :value="transactionData.projectData.customerName" />
                     </div>
                     <div class="form-group">
                         <label>สาขา</label>
                         <input type="text" class="form-control" disabled :value="transactionData.projectData.branch" />
                     </div>
                     <div class="form-group">
                         <label>ผู้รับผิดชอบโครงการ</label>
                         <input type="text" class="form-control" disabled :value="transactionData.projectData.projectManager" />
                     </div>
                     <div class="form-group">
                         <label>วันเริ่มโครงการ</label>
                         <input
                             type="text"
                             v-model="transactionData.adjustedStartDate"
                             :disabled="props.readOnly"
                             class="form-control"
                             placeholder="DD/MM/YYYY"
                         />
                     </div>
                     <div class="form-group">
                         <label>วันที่คาดว่าจะแล้วเสร็จ</label>
                         <input
                             type="text"
                             v-model="transactionData.adjustedExpectedEndDate"
                             :disabled="props.readOnly"
                             class="form-control"
                             placeholder="DD/MM/YYYY"
                         />
                     </div>
                     <div class="form-group">
                         <label>มูลค่าโครงการรวม (บาท)</label>
                         <input
                             type="text"
                             v-model="transactionData.adjustedProjectValue"
                             :disabled="props.readOnly"
                             @blur="formatAdjustedValue"
                             @input="handleAdjustedValueInput"
                             class="form-control text-primary font-bold"
                             placeholder="ระบุมูลค่าโครงการ"
                         />
                     </div>
                     <div class="form-group">
                         <label>ต้นทุนโครงการ (บาท)</label>
                         <input
                             type="text"
                             v-model="transactionData.projectCost"
                             :disabled="props.readOnly"
                             @blur="formatCost"
                             @input="handleCostInput"
                             class="form-control"
                             placeholder="ระบุต้นทุน"
                         />
                     </div>
                     <div class="form-group">
                         <label>กำไร (บาท)</label>
                         <input
                             type="text"
                             v-model="transactionData.projectProfit"
                             :disabled="props.readOnly"
                             @blur="formatProfit"
                             @input="handleProfitInput"
                             class="form-control"
                             placeholder="ระบุกำไร"
                         />
                     </div>
                     <div class="form-group">
                         <label>กำไร (%)</label>
                         <input
                             type="text"
                             v-model="transactionData.projectProfitPercent"
                             :disabled="props.readOnly"
                             @blur="formatProfitPercent"
                             @input="handleProfitPercentInput"
                             class="form-control"
                             placeholder="ระบุ % กำไร"
                         />
                     </div>
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
                             v-model="transactionData.contractorType"
                             :disabled="props.readOnly"
                             class="form-control"
                             :class="{ 'is-empty': !transactionData.contractorType }"
                         >
                             <option value="" disabled selected>เลือกประเภทการรับเหมา</option>
                             <option value="Main-Contractor">ผู้รับเหมาหลัก (Main-Contractor)</option>
                             <option value="Sub-Contractor">ผู้รับเหมาช่วง (Sub-Contractor)</option>
                         </select>
                     </div>
                     <div class="form-group">
                         <label>ทีมของลูกค้า</label>
                         <select
                             v-model="transactionData.customerTeam"
                             :disabled="props.readOnly"
                             class="form-control"
                             :class="{ 'is-empty': !transactionData.customerTeam }"
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

             <div v-if="transactionData.contractorType === 'Sub-Contractor'" class="form-group full-width" style="margin-top: 10px;">
                 <div class="form-grid-two-columns">
                     <div class="form-group">
                         <label>ชื่อผู้รับเหมาหลัก</label>
                         <input
                             type="text"
                             v-model="transactionData.mainContractorName"
                             :disabled="props.readOnly"
                             class="form-control"
                             placeholder="ระบุชื่อผู้รับเหมาหลัก"
                         />
                     </div>
                     <div class="form-group">
                         <label>เลขประจำตัวผู้เสียภาษี (VAT Number)</label>
                         <input
                             type="text"
                             v-model="transactionData.mainContractorVat"
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
                          v-model="files.contractorCompanyProfile"
                          :disabled="props.readOnly"
                          accept=".pdf"
                        />
                        <FileUploader
                          label="งบแสดงฐานะการเงิน (Balance Sheet)"
                          v-model="files.contractorBalanceSheet"
                          :disabled="props.readOnly"
                          accept=".xlsx, .xls"
                        />
                        <FileUploader
                          label="งบกำไรขาดทุน (Profit & Loss)"
                          v-model="files.contractorProfitLoss"
                          :disabled="props.readOnly"
                          accept=".xlsx, .xls"
                        />
                        <FileUploader
                          label="งบอัตราส่วนทางการเงิน (Ratios)"
                          v-model="files.contractorFinancialRatios"
                          :disabled="props.readOnly"
                          accept=".xlsx, .xls"
                        />
                      </div>
                 </div>
             </div>

             <div class="form-group full-width" style="margin-top: 20px;">
