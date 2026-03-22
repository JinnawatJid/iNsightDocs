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

          <!-- Project Results Dropdown -->
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

        <!-- Selected Project Details -->
        <template v-if="transactionData.projectData">
             <div class="form-group full-width selected-project-card">
                 <div class="card-header">
                     <h4>ข้อมูลโครงการที่เลือก</h4>
                     <button v-if="!props.readOnly" class="btn-clear" @click="clearProject">เปลี่ยนโครงการ</button>
                 </div>
                 <div class="project-details-grid">
                     <div class="detail-item"><span>รหัสโครงการ:</span> {{ transactionData.projectData.id }}</div>
                     <div class="detail-item"><span>ชื่อโครงการ:</span> {{ transactionData.projectData.name }}</div>
                     <div class="detail-item"><span>รหัสลูกค้า:</span> {{ transactionData.projectData.customerCode }}</div>
                     <div class="detail-item"><span>ชื่อลูกค้า:</span> {{ transactionData.projectData.customerName }}</div>
                     <div class="detail-item"><span>สาขา:</span> {{ transactionData.projectData.branch }}</div>
                     <div class="detail-item"><span>ผู้รับผิดชอบโครงการ:</span> {{ transactionData.projectData.projectManager }}</div>
                 </div>
             </div>

             <!-- Project Specific Uploads -->
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
                        label="แผนการรับสินค้า"
                        required
                        v-model="files.projectPlan"
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
  projectPlan: null,
  projectSecurity: null
});

// Watch for file changes to update store
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
  files.quotation = newVal?.quotation_doc || null;
  files.projectContract = newVal?.project_contract_doc || null;
  files.projectPlan = newVal?.project_plan_doc || null;
  files.projectSecurity = newVal?.project_security_doc || null;
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
    store.transactionData.adjustedProductList = proj.productList ? [...proj.productList] : [];

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
                    projectManager: 'นายช่างใหญ่ ใจดี',
                    productList: ['กระจกใส 6 มม.', 'กระจกเงา'],
                    value: 15000000,
                    status: 'Active'
                },
                {
                    id: 'PRJ-2023-002',
                    name: 'ปรับปรุงอาคารสำนักงาน กฟผ.',
                    customerCode: 'CUST-002',
                    customerName: 'การไฟฟ้าฝ่ายผลิตแห่งประเทศไทย',
                    branch: 'สาขานนทบุรี',
                    projectManager: 'นางสาววิศวกร เก่งงาน',
                    productList: ['อลูมิเนียมเส้น'],
                    value: 8500000,
                    status: 'Active'
                },
                {
                    id: 'PRJ-2024-003',
                    name: 'หมู่บ้านจัดสรร เฟส 3',
                    customerCode: 'CUST-003',
                    customerName: 'บริษัท แลนด์แอนด์เฮ้าส์ จำกัด',
                    branch: 'สาขารังสิต',
                    projectManager: 'นายนักพัฒนา ที่ดิน',
                    productList: ['ซิลิโคน', 'อุปกรณ์ฟิตติ้ง'],
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

.selected-project-card {
    background-color: #f8f9fa;
    border: 1px solid #e0e0e0;
    border-radius: 6px;
    padding: 15px;
}

.card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 15px;
    padding-bottom: 10px;
    border-bottom: 1px solid #ddd;
}

.card-header h4 {
    margin: 0;
    color: #333;
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

.project-details-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
}

.detail-item span {
    font-weight: 500;
    color: #555;
}

.required::after {
    content: " *";
    color: red;
}
</style>