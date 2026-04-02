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
                 </div>
             </div>

             <div class="form-group full-width" style="margin-top: 30px; border-top: 1px solid #ddd; padding-top: 20px;">
                 <div class="form-grid-three-columns">
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
                     <div class="form-group">
                         <label>ทีมของลูกค้า</label>
                         <select
                             v-model="transactionData.customerTeam"
                             :disabled="props.readOnly"
                             class="form-control"
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

                 <div style="border-top: 1px solid #ddd; padding-top: 25px; margin-top: 25px;">
                     <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                         <label style="margin: 0;">รายการสินค้าหลัก:</label>
                         <button v-if="!props.readOnly" @click="addProduct" class="btn-text-add">+ เพิ่มสินค้า</button>
                     </div>
                     <div v-if="transactionData.adjustedProductList && transactionData.adjustedProductList.length > 0" class="product-list" style="gap: 15px;">
                         <div v-for="(prod, idx) in transactionData.adjustedProductList" :key="idx" class="product-item" style="display: grid; grid-template-columns: 2fr 1fr; gap: 30px; align-items: center;">
                             <input
                                 type="text"
                                 v-model="transactionData.adjustedProductList[idx].name"
                                 :disabled="props.readOnly"
                                 class="form-control"
                                 placeholder="ชื่อสินค้า..."
                            />
                            <div style="display: flex; align-items: center; gap: 10px;">
                                <input
                                    type="text"
                                    :value="transactionData.adjustedProductList[idx].price"
                                    @input="handleProductPriceInput($event, idx)"
                                    @blur="formatProductPrice(idx)"
                                    :disabled="props.readOnly"
                                    class="form-control text-right"
                                    placeholder="0.00"
                                    style="flex: 1; min-width: 0;"
                                />
                                <span class="text-muted" style="font-size: 13px; white-space: nowrap;">บาท/หน่วย</span>
                                <button v-if="!props.readOnly" class="btn-icon-delete-small" @click="removeProduct(idx)" style="padding: 8px; margin-left: auto;">✕</button>
                            </div>
                         </div>
                     </div>
                     <div v-else class="text-muted" style="font-size: 14px; margin-top: 5px;">
                         (ไม่มีรายการสินค้าหลัก)
                     </div>
                 </div>
             </div>

             <div class="form-group full-width" style="margin-top: 20px;">
                <div class="upload-grid">
                    <FileUploader
                        label="สัญญาโปรเจค/ป้ายหน้า Site งาน"
                        required
                        v-model="files.projectContract"
                        :disabled="props.readOnly"
                        multiple
                    />
                    <FileUploader
                        label="ใบเสนอราคาจากตังน้ำ"
                        required
                        v-model="files.quotation"
                        :disabled="props.readOnly"
                        multiple
                    />
                    <FileUploader
                        label="สำเนา Bank Guarantee / หลักฐานเงินมัดจำ"
                        v-model="files.projectSecurity"
                        :disabled="props.readOnly"
                        multiple
                    />
                </div>
             </div>

             <OtherDocumentsSection
                  v-if="transactionData.projectData"
                  tabName="projectInfo"
                  :readOnly="props.readOnly"
                  title="เอกสารอื่นๆ (Other Project Documents)"
             />
        </template>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, reactive, watch } from 'vue';
import { useCreditRequestStore } from '@/stores/creditRequest';
import OtherDocumentsSection from '../OtherDocumentsSection.vue';
import FileUploader from '@/components/shared/FileUploader.vue';

const props = defineProps(['readOnly']);
const store = useCreditRequestStore();

const files = reactive({
  quotation: null,
  projectContract: null,
  projectSecurity: null,
  contractorCompanyProfile: null,
  contractorBalanceSheet: null,
  contractorProfitLoss: null,
  contractorFinancialRatios: null,
});

// Watch for file changes to update store
watch(() => files.quotation, (newVal) => {
  store.updateFile('quotation_doc', newVal);
});

watch(() => files.projectContract, (newVal) => {
  store.updateFile('project_contract_doc', newVal);
});

watch(() => files.projectSecurity, (newVal) => {
  store.updateFile('project_security_doc', newVal);
});

watch(() => files.contractorCompanyProfile, (newVal) => {
  store.updateFile('contractor_company_profile_doc', newVal);
});

watch(() => files.contractorBalanceSheet, (newVal) => {
  store.updateFile('contractor_balance_sheet_doc', newVal);
});

watch(() => files.contractorProfitLoss, (newVal) => {
  store.updateFile('contractor_profit_loss_doc', newVal);
});

watch(() => files.contractorFinancialRatios, (newVal) => {
  store.updateFile('contractor_financial_ratios_doc', newVal);
});


// Initialize files from store (to support Edit mode or tab switching)
watch(() => store.files, (newVal) => {
  files.quotation = newVal?.quotation_doc || null;
  files.projectContract = newVal?.project_contract_doc || null;
  files.projectSecurity = newVal?.project_security_doc || null;
  files.contractorCompanyProfile = newVal?.contractor_company_profile_doc || null;
  files.contractorBalanceSheet = newVal?.contractor_balance_sheet_doc || null;
  files.contractorProfitLoss = newVal?.contractor_profit_loss_doc || null;
  files.contractorFinancialRatios = newVal?.contractor_financial_ratios_doc || null;
}, { immediate: true, deep: true });

// Local State for Project Search
const projectSearchQuery = ref('');
const isSearchingProject = ref(false);
const projectSearchResults = ref([]);
const projectSearchMsg = ref('');

const transactionData = computed({
  get: () => store.transactionData,
  set: (val) => { store.transactionData = val; }
});

const formatNumber = (num) => {
    if (!num) return '0';
    return Number(num).toLocaleString('en-US');
};

const handleAdjustedValueInput = (event) => {
    let val = event.target.value;
    val = val.replace(/[^0-9]/g, '');
    store.transactionData.adjustedProjectValue = val;
};

const formatAdjustedValue = () => {
    const raw = store.transactionData.adjustedProjectValue;
    const num = parseFloat(String(raw).replace(/,/g, ''));
    if (!isNaN(num)) {
        store.transactionData.adjustedProjectValue = formatNumber(num);
    }
};

const handleProductPriceInput = (event, idx) => {
    let val = event.target.value;
    val = val.replace(/[^0-9.]/g, ''); // Allow decimals
    store.transactionData.adjustedProductList[idx].price = val;
};

const formatProductPrice = (idx) => {
    const raw = store.transactionData.adjustedProductList[idx].price;
    if (!raw) return;
    const num = parseFloat(String(raw).replace(/,/g, ''));
    if (!isNaN(num)) {
        store.transactionData.adjustedProductList[idx].price = formatNumber(num);
    }
};

const addProduct = () => {
    if (!store.transactionData) store.transactionData = {};
    if (!store.transactionData.adjustedProductList) {
        store.transactionData.adjustedProductList = [];
    }
    store.transactionData.adjustedProductList.push({ name: '', price: '' });
};

const removeProduct = (idx) => {
    store.transactionData.adjustedProductList.splice(idx, 1);
};

// Project Actions
const handleProjectSearch = async () => {
    isSearchingProject.value = true;
    projectSearchResults.value = [];
    projectSearchMsg.value = '';

    try {
        // Mock external API call
        const results = await mockFetchProjects(projectSearchQuery.value);
        if (results.length > 0) {
            projectSearchResults.value = results;
        } else {
            projectSearchMsg.value = 'ไม่พบโครงการที่ค้นหา';
        }
    } catch (e) {
        projectSearchMsg.value = 'เกิดข้อผิดพลาดในการค้นหา';
    } finally {
        isSearchingProject.value = false;
    }
};

const selectProject = (proj) => {
    store.transactionData.projectId = proj.id;
    store.transactionData.projectData = proj;
    projectSearchResults.value = [];
    projectSearchQuery.value = '';

    // Initialize Editable Values
    store.transactionData.adjustedProjectValue = formatNumber(proj.value);
    store.transactionData.adjustedProductList = proj.productList
        ? proj.productList.map(p => typeof p === 'string' ? { name: p, price: '' } : { ...p })
        : [];
    store.transactionData.adjustedStartDate = proj.startDate || '';
    store.transactionData.adjustedExpectedEndDate = proj.expectedEndDate || '';

    // Auto-fill amount based on project value initially (can be changed by user)
    store.transactionData.amount = String(proj.value);

    // Initialize Phasing if empty
    if (!store.transactionData.projectPhasing) {
         store.transactionData.projectPhasing = [];
    }
};

const clearProject = () => {
    store.transactionData.projectId = '';
    store.transactionData.projectData = null;
    store.transactionData.adjustedProjectValue = '';
    store.transactionData.adjustedProductList = [];
    store.transactionData.adjustedStartDate = '';
    store.transactionData.adjustedExpectedEndDate = '';
    store.transactionData.projectPhasing = [];
    store.transactionData.amount = '';
};

// Mock API for external Sales System
const mockFetchProjects = async (query) => {
    return new Promise((resolve) => {
        setTimeout(() => {
            const db = [
                {
                    id: 'PRJ-2023-001',
                    name: 'ก่อสร้างคอนโดหรู ใจกลางเมือง',
                    customerCode: 'CUST-001',
                    customerName: 'บริษัท แสนสิริ จำกัด (มหาชน)',
                    branch: 'สาขาสำนักงานใหญ่',
                    projectManager: 'นายสมชาย ขายเก่ง',
                    startDate: '01/06/2023',
                    expectedEndDate: '31/12/2024',
                    productList: [
                        { name: 'กระจกใส 6 มม.', price: '5,000,000' },
                        { name: 'กระจกเงา', price: '2,000,000' }
                    ],
                    value: 15000000,
                    status: 'Active'
                },
                {
                    id: 'PRJ-2023-002',
                    name: 'ปรับปรุงอาคารสำนักงาน กฟผ.',
                    customerCode: 'CUST-002',
                    customerName: 'การไฟฟ้าฝ่ายผลิตแห่งประเทศไทย',
                    branch: 'สาขานนทบุรี',
                    projectManager: 'นางสาวสุดสวย ปิดยอดไว',
                    startDate: '15/08/2023',
                    expectedEndDate: '15/05/2024',
                    productList: [
                        { name: 'อลูมิเนียมเส้น', price: '3,500,000' }
                    ],
                    value: 8500000,
                    status: 'Active'
                },
                {
                    id: 'PRJ-2024-003',
                    name: 'หมู่บ้านจัดสรร เฟส 3',
                    customerCode: 'CUST-003',
                    customerName: 'บริษัท แลนด์แอนด์เฮ้าส์ จำกัด',
                    branch: 'สาขารังสิต',
                    projectManager: 'นายยอดเยี่ยม ทะลุเป้า',
                    startDate: '10/01/2024',
                    expectedEndDate: '30/11/2025',
                    productList: [
                        { name: 'ซิลิโคน', price: '500,000' },
                        { name: 'อุปกรณ์ฟิตติ้ง', price: '1,200,000' }
                    ],
                    value: 25000000,
                    status: 'Planning'
                }
            ];
            if (!query.trim()) {
                 resolve(db);
                 return;
            }
            const q = query.toLowerCase();
            resolve(db.filter(p => p.id.toLowerCase().includes(q) || p.name.toLowerCase().includes(q)));
        }, 500);
    });
};
</script>

<style scoped>
@import './shared-styles.css';

.project-info-tab {
    padding: 20px;
}

.form-section {
    margin-bottom: 25px;
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

.section-header h3 {
  margin: 0;
}

.form-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 20px;
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

.search-wrapper {
    display: flex;
    gap: 10px;
}

.search-wrapper input {
    flex: 1;
    padding: 10px;
    border: 1px solid #ccc;
    border-radius: 4px;
}

.search-hint {
    font-size: 12px;
    color: #666;
    margin-top: 5px;
    margin-bottom: 5px;
}

.btn-search-project {
    padding: 8px 16px;
    background-color: #333;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
}

.btn-search-project:disabled {
    background-color: #ccc;
}

.project-results {
    margin-top: 10px;
    border: 1px solid #ddd;
    border-radius: 4px;
    max-height: 200px;
    overflow-y: auto;
}

.project-item {
    padding: 10px;
    border-bottom: 1px solid #eee;
    cursor: pointer;
}

.project-item:hover {
    background-color: #f5f5f5;
}

.proj-title {
    font-weight: bold;
    color: #0056FF;
}

.proj-desc {
    font-size: 12px;
    color: #666;
}

.project-search-msg {
    margin-top: 5px;
    font-size: 12px;
    color: red;
}

.btn-clear {
    background: none;
    border: 1px solid #dc3545;
    color: #dc3545;
    padding: 4px 10px;
    border-radius: 4px;
    font-size: 12px;
    cursor: pointer;
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