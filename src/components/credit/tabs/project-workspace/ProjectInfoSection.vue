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
          </div>
      <div class="form-grid-three-columns" style="margin-top: 15px;">
          <div class="form-group">
              <label>มูลค่าสินค้าที่ขายให้กับโครงการ (บาท)</label>
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
              <label>กำไร</label>
              <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 10px;">
                  <div class="input-with-suffix">
                      <input
                          type="text"
                          v-model="project.projectProfit"
                          :disabled="props.readOnly"
                          @blur="formatProfit"
                          @input="handleProfitInput"
                          class="form-control"
                          placeholder="กำไร (บาท)"
                      />
                  </div>
                  <div class="input-with-suffix" style="position: relative;">
                      <input
                          type="text"
                          v-model="project.projectProfitPercent"
                          :disabled="props.readOnly"
                          @blur="formatProfitPercent"
                          @input="handleProfitPercentInput"
                          class="form-control"
                          placeholder="%"
                          style="padding-right: 25px;"
                      />
                      <span style="position: absolute; right: 10px; top: 50%; transform: translateY(-50%); color: #6c757d;">%</span>
                  </div>
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
        <div class="upload-grid">
            <FileUploader
                label="สัญญาโปรเจค/ป้ายหน้า Site งาน"
                required
                :modelValue="getFileList('project_contract_doc_' + project.projectId)"
                @update:modelValue="(newVal) => updateFileList('project_contract_doc_' + project.projectId, newVal)"
                :disabled="props.readOnly"
                multiple
            />
            <FileUploader
                label="ใบเสนอราคาจากตังน้ำ"
                required
                :modelValue="getFileList('quotation_doc_' + project.projectId)"
                @update:modelValue="(newVal) => updateFileList('quotation_doc_' + project.projectId, newVal)"
                :disabled="props.readOnly"
                multiple
            />
        </div>

        <div class="upload-grid-small" style="margin-top: 20px;">
            <div class="guarantee-section">
                <FileUploader
                    label="Bank Guarantee"
                    :modelValue="getFileList('project_security_doc_' + project.projectId)"
                    @update:modelValue="(newVal) => updateFileList('project_security_doc_' + project.projectId, newVal)"
                    :disabled="props.readOnly"
                    multiple
                />
                <div v-if="getFileList('project_security_doc_' + project.projectId) && getFileList('project_security_doc_' + project.projectId).length > 0" class="guarantee-details mt-2">
                    <div v-for="(file, fileIndex) in getFileList('project_security_doc_' + project.projectId)" :key="fileIndex" class="guarantee-detail-card mb-2">
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
                                    :value="formatGuaranteeAmount(getGuaranteeDetail('projectBankGuaranteeDetails', file.name, 'amount'))"
                                    @input="(e) => handleGuaranteeAmountInput('projectBankGuaranteeDetails', file.name, 'amount', e.target.value)"
                                    :disabled="props.readOnly"
                                />
                            </div>
                            <div class="col-6">
                                <label class="text-xs text-muted mb-1">วันหมดอายุ</label>
                                <input
                                    type="date"
                                    class="form-control form-control-sm"
                                    :value="getGuaranteeDetail('projectBankGuaranteeDetails', file.name, 'expiryDate')"
                                    @input="(e) => updateGuaranteeDetail('projectBankGuaranteeDetails', file.name, 'expiryDate', e.target.value)"
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
                    :modelValue="getFileList('project_cash_deposit_doc_' + project.projectId)"
                    @update:modelValue="(newVal) => updateFileList('project_cash_deposit_doc_' + project.projectId, newVal)"
                    :disabled="props.readOnly"
                    multiple
                />
                <div v-if="getFileList('project_cash_deposit_doc_' + project.projectId) && getFileList('project_cash_deposit_doc_' + project.projectId).length > 0" class="guarantee-details mt-2">
                    <div v-for="(file, fileIndex) in getFileList('project_cash_deposit_doc_' + project.projectId)" :key="fileIndex" class="guarantee-detail-card mb-2">
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
                                    :value="formatGuaranteeAmount(getGuaranteeDetail('projectCashDepositDetails', file.name, 'amount'))"
                                    @input="(e) => handleGuaranteeAmountInput('projectCashDepositDetails', file.name, 'amount', e.target.value)"
                                    :disabled="props.readOnly"
                                />
                            </div>
                            <div class="col-6">
                                <label class="text-xs text-muted mb-1">วันหมดอายุ</label>
                                <input
                                    type="date"
                                    class="form-control form-control-sm"
                                    :value="getGuaranteeDetail('projectCashDepositDetails', file.name, 'expiryDate')"
                                    @input="(e) => updateGuaranteeDetail('projectCashDepositDetails', file.name, 'expiryDate', e.target.value)"
                                    :disabled="props.readOnly"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
      </div>

      <!-- Pass a unique tabName per project to isolate other documents -->
      <OtherDocumentsSection
          :tabName="'projectInfo_' + project.projectId"
          :readOnly="props.readOnly"
          title="เอกสารอื่นๆ (Other Project Documents)"
          style="margin-top: 20px;"
      />
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useCreditRequestStore } from '@/stores/creditRequest';
import OtherDocumentsSection from '../../forms/OtherDocumentsSection.vue';
import FileUploader from '@/components/shared/FileUploader.vue';

const props = defineProps({
  projectIndex: {
    type: Number,
    required: true
  },
  readOnly: {
    type: Boolean,
    default: false
  }
});

const store = useCreditRequestStore();

const project = computed(() => {
  return store.transactionData.projects?.[props.projectIndex] || null;
});

const getFileList = (fileKey) => {
    return store.files[fileKey] || null;
};

const updateFileList = (fileKey, newVal) => {
    store.updateFile(fileKey, newVal);
};

const formatNumber = (num) => {
    if (!num) return '0';
    return Number(num).toLocaleString('en-US');
};

const calculateFromCost = () => {
    if (!project.value) return;
    const totalValue = parseFloat(String(project.value.adjustedProjectValue || '0').replace(/,/g, ''));
    const cost = parseFloat(String(project.value.projectCost || '0').replace(/,/g, ''));

    if (!isNaN(totalValue) && totalValue > 0 && !isNaN(cost)) {
        const profit = totalValue - cost;
        const profitPercent = (profit / totalValue) * 100;

        project.value.projectProfit = profit % 1 !== 0 ? profit.toFixed(2) : String(profit);
        project.value.projectProfitPercent = profitPercent % 1 !== 0 ? profitPercent.toFixed(2) : String(profitPercent);

        project.value.projectProfit = formatNumber(project.value.projectProfit);
    }
};

const handleCostInput = (event) => {
    if (!project.value) return;
    let val = event.target.value;
    val = val.replace(/[^0-9.-]/g, '');
    project.value.projectCost = val;
    calculateFromCost();
};

const formatCost = () => {
    if (!project.value) return;
    const raw = project.value.projectCost;
    if (!raw) return;
    const num = parseFloat(String(raw).replace(/,/g, ''));
    if (!isNaN(num)) {
        project.value.projectCost = formatNumber(num % 1 !== 0 ? num.toFixed(2) : num);
    }
};

const calculateFromProfit = () => {
    if (!project.value) return;
    const totalValue = parseFloat(String(project.value.adjustedProjectValue || '0').replace(/,/g, ''));
    const profit = parseFloat(String(project.value.projectProfit || '0').replace(/,/g, ''));

    if (!isNaN(totalValue) && totalValue > 0 && !isNaN(profit)) {
        const cost = totalValue - profit;
        const profitPercent = (profit / totalValue) * 100;

        project.value.projectCost = cost % 1 !== 0 ? cost.toFixed(2) : String(cost);
        project.value.projectProfitPercent = profitPercent % 1 !== 0 ? profitPercent.toFixed(2) : String(profitPercent);

        project.value.projectCost = formatNumber(project.value.projectCost);
    }
};

const handleProfitInput = (event) => {
    if (!project.value) return;
    let val = event.target.value;
    val = val.replace(/[^0-9.-]/g, '');
    project.value.projectProfit = val;
    calculateFromProfit();
};

const formatProfit = () => {
    if (!project.value) return;
    const raw = project.value.projectProfit;
    if (!raw) return;
    const num = parseFloat(String(raw).replace(/,/g, ''));
    if (!isNaN(num)) {
        project.value.projectProfit = formatNumber(num % 1 !== 0 ? num.toFixed(2) : num);
    }
};

const calculateFromProfitPercent = () => {
    if (!project.value) return;
    const totalValue = parseFloat(String(project.value.adjustedProjectValue || '0').replace(/,/g, ''));
    const profitPercent = parseFloat(String(project.value.projectProfitPercent || '0').replace(/,/g, ''));

    if (!isNaN(totalValue) && totalValue > 0 && !isNaN(profitPercent)) {
        const profit = totalValue * (profitPercent / 100);
        const cost = totalValue - profit;

        project.value.projectProfit = profit % 1 !== 0 ? profit.toFixed(2) : String(profit);
        project.value.projectCost = cost % 1 !== 0 ? cost.toFixed(2) : String(cost);

        project.value.projectProfit = formatNumber(project.value.projectProfit);
        project.value.projectCost = formatNumber(project.value.projectCost);
    }
};

const handleProfitPercentInput = (event) => {
    if (!project.value) return;
    let val = event.target.value;
    val = val.replace(/[^0-9.-]/g, '');
    project.value.projectProfitPercent = val;
    calculateFromProfitPercent();
};

const formatProfitPercent = () => {
    if (!project.value) return;
    const raw = project.value.projectProfitPercent;
    if (!raw) return;
    const num = parseFloat(String(raw).replace(/,/g, ''));
    if (!isNaN(num)) {
        project.value.projectProfitPercent = String(num % 1 !== 0 ? num.toFixed(2) : num);
    }
};

const handleAdjustedValueInput = (event) => {
    if (!project.value) return;
    let val = event.target.value;
    val = val.replace(/[^0-9.-]/g, '');
    project.value.adjustedProjectValue = val;
    if (project.value.projectCost) {
        calculateFromCost();
    }
};

const formatAdjustedValue = () => {
    if (!project.value) return;
    const raw = project.value.adjustedProjectValue;
    const num = parseFloat(String(raw).replace(/,/g, ''));
    if (!isNaN(num)) {
        project.value.adjustedProjectValue = formatNumber(num % 1 !== 0 ? num.toFixed(2) : num);
    }
};

// Guarantee Details Handlers
const getGuaranteeDetail = (storeKey, fileName, field) => {
    if (!project.value || !project.value[storeKey]) return '';
    if (!project.value[storeKey][fileName]) return '';
    return project.value[storeKey][fileName][field] || '';
};

const formatGuaranteeAmount = (val) => {
    if (!val) return '';
    const parts = String(val).split('.');
    let formatted = Number(parts[0]).toLocaleString('en-US');
    if (parts.length > 1) {
        formatted += '.' + parts[1];
    }
    return formatted === 'NaN' ? val : formatted;
};

const handleGuaranteeAmountInput = (storeKey, fileName, field, rawValue) => {
    let num = rawValue.replace(/[^0-9.-]/g, '');
    const parts = num.split('.');
    if (parts.length > 2) {
        num = parts[0] + '.' + parts.slice(1).join('');
    }
    updateGuaranteeDetail(storeKey, fileName, field, num);
};

const updateGuaranteeDetail = (storeKey, fileName, field, value) => {
    if (!project.value) return;
    if (!project.value[storeKey]) {
        project.value[storeKey] = {};
    }
    if (!project.value[storeKey][fileName]) {
        project.value[storeKey][fileName] = {};
    }
    project.value[storeKey][fileName][field] = value;
};

</script>

<style scoped>
@import '../shared-styles.css';

.project-info-section {
    padding: 0;
}

.section-header {
  display: flex;
  align-items: center;
  gap: 20px;
  margin-bottom: 20px;
}

.upload-grid-small {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}

.guarantee-section {
    display: flex;
    flex-direction: column;
}

.guarantee-detail-card {
    background-color: #f8f9fa;
    border: 1px solid #e0e0e0;
    border-radius: 6px;
    padding: 10px;
}

.truncate {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.section-header h3 {
  margin: 0;
}

.upload-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  margin-bottom: 20px;
}

.form-group.full-width {
    grid-column: 1 / -1;
}

.required::after {
    content: " *";
    color: red;
}

.text-primary {
    color: #0056FF;
}

.btn-text-add {
    background: none;
    border: none;
    color: #0056FF;
    font-size: 13px;
    cursor: pointer;
    font-weight: 500;
    padding: 0;
    line-height: 1;
}

.btn-text-add:hover {
    text-decoration: underline;
}

.product-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.product-item {
    display: flex;
    align-items: center;
    gap: 8px;
}

.btn-icon-delete-small {
    background: none;
    border: none;
    color: #999;
    cursor: pointer;
    padding: 4px;
    border-radius: 50%;
    font-size: 14px;
    display: flex;
    align-items: center;
    justify-content: center;
}

.btn-icon-delete-small:hover {
    color: #dc3545;
    background-color: #fee2e2;
}

.text-muted {
    color: #888;
}
</style>