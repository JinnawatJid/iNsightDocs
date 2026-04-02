#!/bin/bash
cat << 'INNER_EOF' > /tmp/patch.diff
--- src/components/credit/tabs/ProjectInfoTab.vue
+++ src/components/credit/tabs/ProjectInfoTab.vue
@@ -35,6 +35,7 @@
         </div>

-        <template v-if="transactionData.projectData && transactionData.projectData.id">
-             <div class="form-group full-width" style="margin-top: 20px; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
+        <template v-if="transactionData.projects && transactionData.projects.length > 0">
+             <div v-for="(project, projectIndex) in transactionData.projects" :key="projectIndex" class="form-group full-width project-card-container" style="margin-top: 20px; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
                  <div class="section-header">
-                     <h3>ข้อมูลโครงการที่เลือก: {{ transactionData.projectData.name }}</h3>
-                     <button v-if="!props.readOnly" class="btn-clear" @click="clearProject" style="margin-left: auto;">ล้างข้อมูล (Clear)</button>
+                     <h3>ข้อมูลโครงการที่ {{ projectIndex + 1 }}: {{ project.projectData.name }}</h3>
+                     <button v-if="!props.readOnly" class="btn-clear" @click="removeProjectCard(projectIndex)" style="margin-left: auto;">ลบโครงการ</button>
                  </div>
                  <div class="form-grid-three-columns">
                      <div class="form-group">
                          <label>รหัสโครงการ</label>
-                         <input type="text" class="form-control" disabled :value="transactionData.projectData.id" />
+                         <input type="text" class="form-control" disabled :value="project.projectData.id" />
                      </div>
                      <div class="form-group">
                          <label>ชื่อโครงการ</label>
-                         <input type="text" class="form-control" disabled :value="transactionData.projectData.name" />
+                         <input type="text" class="form-control" disabled :value="project.projectData.name" />
                      </div>
                      <div class="form-group">
                          <label>รหัสลูกค้า</label>
-                         <input type="text" class="form-control" disabled :value="transactionData.projectData.customerCode" />
+                         <input type="text" class="form-control" disabled :value="project.projectData.customerCode" />
                      </div>
                      <div class="form-group">
                          <label>ชื่อลูกค้า</label>
-                         <input type="text" class="form-control" disabled :value="transactionData.projectData.customerName" />
+                         <input type="text" class="form-control" disabled :value="project.projectData.customerName" />
                      </div>
                      <div class="form-group">
                          <label>สาขา</label>
-                         <input type="text" class="form-control" disabled :value="transactionData.projectData.branch" />
+                         <input type="text" class="form-control" disabled :value="project.projectData.branch" />
                      </div>
                      <div class="form-group">
                          <label>ผู้รับผิดชอบโครงการ</label>
-                         <input type="text" class="form-control" disabled :value="transactionData.projectData.projectManager" />
+                         <input type="text" class="form-control" disabled :value="project.projectData.projectManager" />
                      </div>
                      <div class="form-group">
                          <label>วันเริ่มโครงการ</label>
                          <input
                              type="text"
-                             v-model="transactionData.adjustedStartDate"
+                             v-model="project.adjustedStartDate"
                              :disabled="props.readOnly"
                              class="form-control"
                              placeholder="DD/MM/YYYY"
@@ -62,7 +62,7 @@
                          <label>วันที่คาดว่าจะแล้วเสร็จ</label>
                          <input
                              type="text"
-                             v-model="transactionData.adjustedExpectedEndDate"
+                             v-model="project.adjustedExpectedEndDate"
                              :disabled="props.readOnly"
                              class="form-control"
                              placeholder="DD/MM/YYYY"
@@ -72,10 +72,10 @@
                          <label>มูลค่าโครงการรวม (บาท)</label>
                          <input
                              type="text"
-                             v-model="transactionData.adjustedProjectValue"
+                             v-model="project.adjustedProjectValue"
                              :disabled="props.readOnly"
-                             @blur="formatAdjustedValue"
-                             @input="handleAdjustedValueInput"
+                             @blur="formatAdjustedValue(projectIndex)"
+                             @input="handleAdjustedValueInput($event, projectIndex)"
                              class="form-control text-primary font-bold"
                              placeholder="ระบุมูลค่าโครงการ"
                          />
@@ -87,7 +87,7 @@
                  </div>
                  <div class="form-grid-three-columns">
                      <div class="form-group">
                          <label>ประเภทการรับเหมา</label>
                          <select
-                             v-model="transactionData.contractorType"
+                             v-model="project.contractorType"
                              :disabled="props.readOnly"
                              class="form-control"
-                             :class="{ 'is-empty': !transactionData.contractorType }"
+                             :class="{ 'is-empty': !project.contractorType }"
                          >
                              <option value="" disabled selected>เลือกประเภทการรับเหมา</option>
                              <option value="Main-Contractor">ผู้รับเหมาหลัก (Main-Contractor)</option>
@@ -96,7 +96,7 @@
                      <div class="form-group">
                          <label>ทีมของลูกค้า</label>
                          <select
-                             v-model="transactionData.customerTeam"
+                             v-model="project.customerTeam"
                              :disabled="props.readOnly"
                              class="form-control"
-                             :class="{ 'is-empty': !transactionData.customerTeam }"
+                             :class="{ 'is-empty': !project.customerTeam }"
                          >
                              <option value="" disabled selected>เลือกจำนวน</option>
                              <option value="1-10 คน">1-10 คน</option>
@@ -107,11 +107,11 @@
                  </div>
              </div>

-             <div v-if="transactionData.contractorType === 'Sub-Contractor'" class="form-group full-width" style="margin-top: 10px;">
+             <div v-if="project.contractorType === 'Sub-Contractor'" class="form-group full-width" style="margin-top: 10px;">
                  <div class="form-grid-two-columns">
                      <div class="form-group">
                          <label>ชื่อผู้รับเหมาหลัก</label>
                          <input
                              type="text"
-                             v-model="transactionData.mainContractorName"
+                             v-model="project.mainContractorName"
                              :disabled="props.readOnly"
                              class="form-control"
@@ -121,7 +121,7 @@
                          <label>เลขประจำตัวผู้เสียภาษี (VAT Number)</label>
                          <input
                              type="text"
-                             v-model="transactionData.mainContractorVat"
+                             v-model="project.mainContractorVat"
                              :disabled="props.readOnly"
                              class="form-control"
@@ -134,22 +134,22 @@
                      <div class="upload-grid-small">
                         <FileUploader
                           label="ข้อมูลบริษัท (Company Profile)"
-                          :modelValue="getFile('contractor_company_profile_doc')"
-                          @update:modelValue="(val) => updateFile('contractor_company_profile_doc', val)"
+                          :modelValue="getFile(`contractor_company_profile_doc_${projectIndex}`)"
+                          @update:modelValue="(val) => updateFile(`contractor_company_profile_doc_${projectIndex}`, val)"
                           :disabled="props.readOnly"
                           accept=".pdf"
                         />
                         <FileUploader
                           label="งบแสดงฐานะการเงิน (Balance Sheet)"
-                          :modelValue="getFile('contractor_balance_sheet_doc')"
-                          @update:modelValue="(val) => updateFile('contractor_balance_sheet_doc', val)"
+                          :modelValue="getFile(`contractor_balance_sheet_doc_${projectIndex}`)"
+                          @update:modelValue="(val) => updateFile(`contractor_balance_sheet_doc_${projectIndex}`, val)"
                           :disabled="props.readOnly"
                           accept=".xlsx, .xls"
                         />
                         <FileUploader
                           label="งบกำไรขาดทุน (Profit & Loss)"
-                          :modelValue="getFile('contractor_profit_loss_doc')"
-                          @update:modelValue="(val) => updateFile('contractor_profit_loss_doc', val)"
+                          :modelValue="getFile(`contractor_profit_loss_doc_${projectIndex}`)"
+                          @update:modelValue="(val) => updateFile(`contractor_profit_loss_doc_${projectIndex}`, val)"
                           :disabled="props.readOnly"
                           accept=".xlsx, .xls"
                         />
                         <FileUploader
                           label="งบอัตราส่วนทางการเงิน (Ratios)"
-                          :modelValue="getFile('contractor_financial_ratios_doc')"
-                          @update:modelValue="(val) => updateFile('contractor_financial_ratios_doc', val)"
+                          :modelValue="getFile(`contractor_financial_ratios_doc_${projectIndex}`)"
+                          @update:modelValue="(val) => updateFile(`contractor_financial_ratios_doc_${projectIndex}`, val)"
                           :disabled="props.readOnly"
                           accept=".xlsx, .xls"
@@ -160,25 +160,25 @@
              <div class="form-group full-width" style="border-top: 1px solid #ddd; padding-top: 25px; margin-top: 25px;">
                      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                          <label style="margin: 0;">รายการสินค้าหลัก:</label>
-                         <button v-if="!props.readOnly" @click="addProduct" class="btn-text-add">+ เพิ่มสินค้า</button>
+                         <button v-if="!props.readOnly" @click="addProduct(projectIndex)" class="btn-text-add">+ เพิ่มสินค้า</button>
                      </div>
-                     <div v-if="transactionData.adjustedProductList && transactionData.adjustedProductList.length > 0" class="product-list" style="gap: 15px;">
-                         <div v-for="(prod, idx) in transactionData.adjustedProductList" :key="idx" class="product-item" style="display: grid; grid-template-columns: 2fr 1fr; gap: 30px; align-items: center;">
+                     <div v-if="project.adjustedProductList && project.adjustedProductList.length > 0" class="product-list" style="gap: 15px;">
+                         <div v-for="(prod, idx) in project.adjustedProductList" :key="idx" class="product-item" style="display: grid; grid-template-columns: 2fr 1fr; gap: 30px; align-items: center;">
                              <input
                                  type="text"
-                                 v-model="transactionData.adjustedProductList[idx].name"
+                                 v-model="project.adjustedProductList[idx].name"
                                  :disabled="props.readOnly"
                                  class="form-control"
                                  placeholder="ชื่อสินค้า..."
                             />
                             <div style="display: flex; align-items: center; gap: 10px;">
                                 <input
                                     type="text"
-                                    :value="transactionData.adjustedProductList[idx].price"
-                                    @input="handleProductPriceInput($event, idx)"
-                                    @blur="formatProductPrice(idx)"
+                                    :value="project.adjustedProductList[idx].price"
+                                    @input="handleProductPriceInput($event, projectIndex, idx)"
+                                    @blur="formatProductPrice(projectIndex, idx)"
                                     :disabled="props.readOnly"
                                     class="form-control text-right"
                                     placeholder="0.00"
                                     style="flex: 1; min-width: 0;"
                                 />
                                 <span class="text-muted" style="font-size: 13px; white-space: nowrap;">บาท/หน่วย</span>
-                                <button v-if="!props.readOnly" class="btn-icon-delete-small" @click="removeProduct(idx)" style="padding: 8px; margin-left: auto;">✕</button>
+                                <button v-if="!props.readOnly" class="btn-icon-delete-small" @click="removeProduct(projectIndex, idx)" style="padding: 8px; margin-left: auto;">✕</button>
                             </div>
                          </div>
                      </div>
@@ -190,16 +190,16 @@
                 <div class="upload-grid">
                     <FileUploader
                         label="สัญญาโปรเจค/ป้ายหน้า Site งาน"
                         required
-                        :modelValue="getFile('project_contract_doc')"
-                        @update:modelValue="(val) => updateFile('project_contract_doc', val)"
+                        :modelValue="getFile(`project_contract_doc_${projectIndex}`)"
+                        @update:modelValue="(val) => updateFile(`project_contract_doc_${projectIndex}`, val)"
                         :disabled="props.readOnly"
                         multiple
                     />
                     <FileUploader
                         label="ใบเสนอราคาจากตังน้ำ"
                         required
-                        :modelValue="getFile('quotation_doc')"
-                        @update:modelValue="(val) => updateFile('quotation_doc', val)"
+                        :modelValue="getFile(`quotation_doc_${projectIndex}`)"
+                        @update:modelValue="(val) => updateFile(`quotation_doc_${projectIndex}`, val)"
                         :disabled="props.readOnly"
                         multiple
                     />
@@ -209,11 +209,11 @@
                     <div class="guarantee-section">
                         <FileUploader
                             label="Bank Guarantee"
-                            :modelValue="getFile('project_security_doc')"
-                            @update:modelValue="(val) => updateFile('project_security_doc', val)"
+                            :modelValue="getFile(`project_security_doc_${projectIndex}`)"
+                            @update:modelValue="(val) => updateFile(`project_security_doc_${projectIndex}`, val)"
                             :disabled="props.readOnly"
                             multiple
                         />
-                        <div v-if="getFile('project_security_doc') && getFile('project_security_doc').length > 0" class="guarantee-details mt-2">
-                            <div v-for="(file, index) in getFile('project_security_doc')" :key="index" class="guarantee-detail-card mb-2">
+                        <div v-if="getFile(`project_security_doc_${projectIndex}`) && getFile(`project_security_doc_${projectIndex}`).length > 0" class="guarantee-details mt-2">
+                            <div v-for="(file, index) in getFile(`project_security_doc_${projectIndex}`)" :key="index" class="guarantee-detail-card mb-2">
                                 <div class="guarantee-file-name text-primary text-sm mb-1 font-semibold truncate" :title="file.name">
                                     {{ file.name }}
@@ -224,8 +224,8 @@
                                             type="text"
                                             class="form-control form-control-sm"
                                             placeholder="เช่น 1,000,000"
-                                            :value="formatGuaranteeAmount(getGuaranteeDetail('projectBankGuaranteeDetails', file.name, 'amount'))"
-                                            @input="(e) => handleGuaranteeAmountInput('projectBankGuaranteeDetails', file.name, 'amount', e.target.value)"
+                                            :value="formatGuaranteeAmount(getGuaranteeDetail(projectIndex, 'projectBankGuaranteeDetails', file.name, 'amount'))"
+                                            @input="(e) => handleGuaranteeAmountInput(projectIndex, 'projectBankGuaranteeDetails', file.name, 'amount', e.target.value)"
                                             :disabled="props.readOnly"
                                         />
                                     </div>
@@ -234,8 +234,8 @@
                                         <input
                                             type="date"
                                             class="form-control form-control-sm"
-                                            :value="getGuaranteeDetail('projectBankGuaranteeDetails', file.name, 'expiryDate')"
-                                            @input="(e) => updateGuaranteeDetail('projectBankGuaranteeDetails', file.name, 'expiryDate', e.target.value)"
+                                            :value="getGuaranteeDetail(projectIndex, 'projectBankGuaranteeDetails', file.name, 'expiryDate')"
+                                            @input="(e) => updateGuaranteeDetail(projectIndex, 'projectBankGuaranteeDetails', file.name, 'expiryDate', e.target.value)"
                                             :disabled="props.readOnly"
                                         />
                                     </div>
@@ -248,11 +248,11 @@
                     <div class="guarantee-section">
                         <FileUploader
                             label="หลักฐานเงินสดมัดจำ"
-                            :modelValue="getFile('project_cash_deposit_doc')"
-                            @update:modelValue="(val) => updateFile('project_cash_deposit_doc', val)"
+                            :modelValue="getFile(`project_cash_deposit_doc_${projectIndex}`)"
+                            @update:modelValue="(val) => updateFile(`project_cash_deposit_doc_${projectIndex}`, val)"
                             :disabled="props.readOnly"
                             multiple
                         />
-                        <div v-if="getFile('project_cash_deposit_doc') && getFile('project_cash_deposit_doc').length > 0" class="guarantee-details mt-2">
-                            <div v-for="(file, index) in getFile('project_cash_deposit_doc')" :key="index" class="guarantee-detail-card mb-2">
+                        <div v-if="getFile(`project_cash_deposit_doc_${projectIndex}`) && getFile(`project_cash_deposit_doc_${projectIndex}`).length > 0" class="guarantee-details mt-2">
+                            <div v-for="(file, index) in getFile(`project_cash_deposit_doc_${projectIndex}`)" :key="index" class="guarantee-detail-card mb-2">
                                 <div class="guarantee-file-name text-primary text-sm mb-1 font-semibold truncate" :title="file.name">
                                     {{ file.name }}
@@ -263,8 +263,8 @@
                                             type="text"
                                             class="form-control form-control-sm"
                                             placeholder="เช่น 500,000"
-                                            :value="formatGuaranteeAmount(getGuaranteeDetail('projectCashDepositDetails', file.name, 'amount'))"
-                                            @input="(e) => handleGuaranteeAmountInput('projectCashDepositDetails', file.name, 'amount', e.target.value)"
+                                            :value="formatGuaranteeAmount(getGuaranteeDetail(projectIndex, 'projectCashDepositDetails', file.name, 'amount'))"
+                                            @input="(e) => handleGuaranteeAmountInput(projectIndex, 'projectCashDepositDetails', file.name, 'amount', e.target.value)"
                                             :disabled="props.readOnly"
                                         />
                                     </div>
@@ -273,8 +273,8 @@
                                         <input
                                             type="date"
                                             class="form-control form-control-sm"
-                                            :value="getGuaranteeDetail('projectCashDepositDetails', file.name, 'expiryDate')"
-                                            @input="(e) => updateGuaranteeDetail('projectCashDepositDetails', file.name, 'expiryDate', e.target.value)"
+                                            :value="getGuaranteeDetail(projectIndex, 'projectCashDepositDetails', file.name, 'expiryDate')"
+                                            @input="(e) => updateGuaranteeDetail(projectIndex, 'projectCashDepositDetails', file.name, 'expiryDate', e.target.value)"
                                             :disabled="props.readOnly"
                                         />
                                     </div>
@@ -285,10 +285,11 @@
                 </div>
              </div>
+             </div>
         </template>

              <OtherDocumentsSection
-                  v-if="transactionData.projectData && transactionData.projectData.id"
+                  v-if="transactionData.projects && transactionData.projects.length > 0"
                   tabName="projectInfo"
                   :readOnly="props.readOnly"
@@ -324,20 +325,20 @@
     return Number(num).toLocaleString('en-US');
 };

-const handleAdjustedValueInput = (event) => {
+const handleAdjustedValueInput = (event, projectIndex) => {
     let val = event.target.value;
     val = val.replace(/[^0-9]/g, '');
-    store.transactionData.adjustedProjectValue = val;
+    store.transactionData.projects[projectIndex].adjustedProjectValue = val;
 };

-const formatAdjustedValue = () => {
-    const raw = store.transactionData.adjustedProjectValue;
+const formatAdjustedValue = (projectIndex) => {
+    const raw = store.transactionData.projects[projectIndex].adjustedProjectValue;
     const num = parseFloat(String(raw).replace(/,/g, ''));
     if (!isNaN(num)) {
-        store.transactionData.adjustedProjectValue = formatNumber(num);
+        store.transactionData.projects[projectIndex].adjustedProjectValue = formatNumber(num);
     }
 };

-const handleProductPriceInput = (event, idx) => {
+const handleProductPriceInput = (event, projectIndex, idx) => {
     let val = event.target.value;
     val = val.replace(/[^0-9.]/g, ''); // Allow decimals
-    store.transactionData.adjustedProductList[idx].price = val;
+    store.transactionData.projects[projectIndex].adjustedProductList[idx].price = val;
 };

-const formatProductPrice = (idx) => {
-    const raw = store.transactionData.adjustedProductList[idx].price;
+const formatProductPrice = (projectIndex, idx) => {
+    const raw = store.transactionData.projects[projectIndex].adjustedProductList[idx].price;
     if (!raw) return;
     const num = parseFloat(String(raw).replace(/,/g, ''));
     if (!isNaN(num)) {
-        store.transactionData.adjustedProductList[idx].price = formatNumber(num);
+        store.transactionData.projects[projectIndex].adjustedProductList[idx].price = formatNumber(num);
     }
 };

 // Guarantee Details Handlers
-const getGuaranteeDetail = (storeKey, fileName, field) => {
-    if (!store.transactionData[storeKey]) return '';
-    if (!store.transactionData[storeKey][fileName]) return '';
-    return store.transactionData[storeKey][fileName][field] || '';
+const getGuaranteeDetail = (projectIndex, storeKey, fileName, field) => {
+    if (!store.transactionData.projects[projectIndex][storeKey]) return '';
+    if (!store.transactionData.projects[projectIndex][storeKey][fileName]) return '';
+    return store.transactionData.projects[projectIndex][storeKey][fileName][field] || '';
 };

@@ -351,32 +352,31 @@
     return formatted === 'NaN' ? val : formatted;
 };

-const handleGuaranteeAmountInput = (storeKey, fileName, field, rawValue) => {
+const handleGuaranteeAmountInput = (projectIndex, storeKey, fileName, field, rawValue) => {
     let num = rawValue.replace(/[^0-9.]/g, '');
     const parts = num.split('.');
     if (parts.length > 2) {
         num = parts[0] + '.' + parts.slice(1).join('');
     }
-    updateGuaranteeDetail(storeKey, fileName, field, num);
+    updateGuaranteeDetail(projectIndex, storeKey, fileName, field, num);
 };

-const updateGuaranteeDetail = (storeKey, fileName, field, value) => {
-    if (!store.transactionData[storeKey]) {
-        store.transactionData[storeKey] = {};
+const updateGuaranteeDetail = (projectIndex, storeKey, fileName, field, value) => {
+    if (!store.transactionData.projects[projectIndex][storeKey]) {
+        store.transactionData.projects[projectIndex][storeKey] = {};
     }
-    if (!store.transactionData[storeKey][fileName]) {
-        store.transactionData[storeKey][fileName] = {};
+    if (!store.transactionData.projects[projectIndex][storeKey][fileName]) {
+        store.transactionData.projects[projectIndex][storeKey][fileName] = {};
     }
-    store.transactionData[storeKey][fileName][field] = value;
+    store.transactionData.projects[projectIndex][storeKey][fileName][field] = value;
 };

-const addProduct = () => {
-    if (!store.transactionData) store.transactionData = {};
-    if (!store.transactionData.adjustedProductList) {
-        store.transactionData.adjustedProductList = [];
+const addProduct = (projectIndex) => {
+    if (!store.transactionData.projects[projectIndex].adjustedProductList) {
+        store.transactionData.projects[projectIndex].adjustedProductList = [];
     }
-    store.transactionData.adjustedProductList.push({ name: '', price: '' });
+    store.transactionData.projects[projectIndex].adjustedProductList.push({ name: '', price: '' });
 };

-const removeProduct = (idx) => {
-    store.transactionData.adjustedProductList.splice(idx, 1);
+const removeProduct = (projectIndex, idx) => {
+    store.transactionData.projects[projectIndex].adjustedProductList.splice(idx, 1);
 };

@@ -404,40 +404,47 @@
 };

 const selectProject = (proj) => {
-    store.transactionData.projectId = proj.id;
-    store.transactionData.projectData = proj;
+    if (!store.transactionData.projects) {
+        store.transactionData.projects = [];
+    }
+
+    const newProject = {
+        projectId: proj.id,
+        projectData: proj,
+        adjustedProjectValue: formatNumber(proj.value),
+        adjustedProductList: proj.productList
+            ? proj.productList.map(p => typeof p === 'string' ? { name: p, price: '' } : { ...p })
+            : [],
+        adjustedStartDate: proj.startDate || '',
+        adjustedExpectedEndDate: proj.expectedEndDate || '',
+        contractorType: '',
+        customerTeam: '',
+        mainContractorName: '',
+        mainContractorVat: '',
+        projectPhasing: [],
+        projectBankGuaranteeDetails: {},
+        projectCashDepositDetails: {}
+    };
+
+    store.transactionData.projects.push(newProject);
+
+    // Update total amount based on all projects
+    recalculateTotalAmount();
+
     projectSearchResults.value = [];
     projectSearchQuery.value = '';
-
-    // Initialize Editable Values
-    store.transactionData.adjustedProjectValue = formatNumber(proj.value);
-    store.transactionData.adjustedProductList = proj.productList
-        ? proj.productList.map(p => typeof p === 'string' ? { name: p, price: '' } : { ...p })
-        : [];
-    store.transactionData.adjustedStartDate = proj.startDate || '';
-    store.transactionData.adjustedExpectedEndDate = proj.expectedEndDate || '';
-
-    // Initialize dropdowns to empty strings so placeholders show
-    if (!store.transactionData.contractorType) {
-        store.transactionData.contractorType = '';
-    }
-    if (!store.transactionData.customerTeam) {
-        store.transactionData.customerTeam = '';
-    }
-
-    // Auto-fill amount based on project value initially (can be changed by user)
-    store.transactionData.amount = String(proj.value);
-
-    // Initialize Phasing if empty
-    if (!store.transactionData.projectPhasing) {
-         store.transactionData.projectPhasing = [];
-    }
 };

-const clearProject = () => {
-    store.transactionData.projectId = '';
-    store.transactionData.projectData = null;
-    store.transactionData.adjustedProjectValue = '';
-    store.transactionData.adjustedProductList = [];
-    store.transactionData.adjustedStartDate = '';
-    store.transactionData.adjustedExpectedEndDate = '';
-    store.transactionData.projectPhasing = [];
-    store.transactionData.amount = '';
+const removeProjectCard = (projectIndex) => {
+    store.transactionData.projects.splice(projectIndex, 1);
+    recalculateTotalAmount();
+};
+
+const recalculateTotalAmount = () => {
+    let total = 0;
+    if (store.transactionData.projects) {
+        store.transactionData.projects.forEach(p => {
+             const val = parseFloat(String(p.adjustedProjectValue || p.projectData.value).replace(/,/g, ''));
+             if (!isNaN(val)) total += val;
+        });
+    }
+    store.transactionData.amount = total > 0 ? String(total) : '';
 };

INNER_EOF
patch src/components/credit/tabs/ProjectInfoTab.vue < /tmp/patch.diff
