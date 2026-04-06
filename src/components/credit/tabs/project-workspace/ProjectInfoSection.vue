<template>
  <div class="project-info-section">
    <div v-if="project" class="form-section">
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
                  v-model="project.projectCost"
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
                  v-model="project.projectProfit"
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
                  v-model="project.projectProfitPercent"
                  :disabled="props.readOnly"
                  @blur="formatProfitPercent"
                  @input="handleProfitPercentInput"
                  class="form-control"
                  placeholder="ระบุ % กำไร"
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
                  :modelValue="getFileList('contractor_company_profile_doc_' + project.projectId)"
                  @update:modelValue="(newVal) => updateFileList('contractor_company_profile_doc_' + project.projectId, newVal)"
                  :disabled="props.readOnly"
                  accept=".pdf"
                />
                <FileUploader
                  label="งบแสดงฐานะการเงิน (Balance Sheet)"
                  :modelValue="getFileList('contractor_balance_sheet_doc_' + project.projectId)"
                  @update:modelValue="(newVal) => updateFileList('contractor_balance_sheet_doc_' + project.projectId, newVal)"
                  :disabled="props.readOnly"
                  accept=".xlsx, .xls"
                />
                <FileUploader
                  label="งบกำไรขาดทุน (Profit & Loss)"
                  :modelValue="getFileList('contractor_profit_loss_doc_' + project.projectId)"
                  @update:modelValue="(newVal) => updateFileList('contractor_profit_loss_doc_' + project.projectId, newVal)"
                  :disabled="props.readOnly"
                  accept=".xlsx, .xls"
                />
                <FileUploader
                  label="งบอัตราส่วนทางการเงิน (Ratios)"
                  :modelValue="getFileList('contractor_financial_ratios_doc_' + project.projectId)"
                  @update:modelValue="(newVal) => updateFileList('contractor_financial_ratios_doc_' + project.projectId, newVal)"
                  :disabled="props.readOnly"
                  accept=".xlsx, .xls"
                />
              </div>
          </div>
      </div>

      <div class="form-group full-width" style="margin-top: 20px;">
