<template>
  <div class="add-project-tab">
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
               @keyup.enter="handleProjectSearch"
             />
             <button class="btn-search-project" @click="handleProjectSearch" :disabled="isSearchingProject">
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
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useCreditRequestStore } from '@/stores/creditRequest';

const store = useCreditRequestStore();

// Local State for Project Search
const projectSearchQuery = ref('');
const isSearchingProject = ref(false);
const projectSearchResults = ref([]);
const projectSearchMsg = ref('');

const formatNumber = (num) => {
    if (!num) return '0';
    return Number(num).toLocaleString('en-US');
};

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

const addProject = (proj) => {
    if (!store.transactionData.projects) {
        store.transactionData.projects = [];
    }

    // Check if project is already added
    if (store.transactionData.projects.some(p => p.projectData.id === proj.id)) {
        projectSearchMsg.value = 'โครงการนี้ถูกเพิ่มแล้ว';
        return;
    }

    const newProject = {
        projectId: proj.id,
        projectData: proj,
        adjustedProjectValue: formatNumber(proj.value),
        adjustedProductList: proj.productList
            ? proj.productList.map(p => typeof p === 'string' ? { name: p, price: '' } : { ...p })
            : [],
        adjustedStartDate: proj.startDate || '',
        adjustedExpectedEndDate: proj.expectedEndDate || '',
        contractorType: '',
        customerTeam: '',
        mainContractorName: '',
        mainContractorVat: '',
        projectPhasing: [],
        addressData: {
            houseAddress: '',
            subdistrict: '',
            postCode: '',
            district: '',
            city: '',
            phone: '',
            email: '',
            locationTypeSelect: '',
            locationTypeOther: '',
            ownershipSelect: '',
            ownershipOther: '',
            storeValue: '',
            mapCode: '',
            landmark: '',
            note: ''
        }
    };

    store.transactionData.projects.push(newProject);
    projectSearchResults.value = [];
    projectSearchQuery.value = '';
    projectSearchMsg.value = '';
};

// Mock API for external Sales System
const mockFetchProjects = async (query) => {
    return new Promise((resolve) => {
        setTimeout(() => {
            const db = [
                {
                    id: 'PJ6904001',
                    name: 'โรงพยาบาลเกษมราษฏร์ จังหวัดระยอง',
                    customerCode: '693026RY',
                    customerName: 'บริษัท เอ็กซ์คอน คอนสตรัคชั่น จำกัด',
                    branch: 'ระยอง',
                    projectManager: 'นายพีระพัฒน์ สีแจจันทร์',
                    startDate: '01/08/2025',
                    expectedEndDate: '31/07/2027',
                    productList: [],
                    value: 0,
                    status: 'Active'
                },
                {
                    id: 'PJ6904002',
                    name: 'คอนโดมิเนียมออริจิน สาทร',
                    customerCode: '01131TS',
                    customerName: 'บริษัท แสนสิริ จำกัด (มหาชน)',
                    branch: 'พระราม 2',
                    projectManager: 'นางสาวทิพวัลย์ ริ้วงาม',
                    startDate: '01/07/2024',
                    expectedEndDate: '28/06/2026',
                    productList: [
                        { name: 'กระจกใส 6 มม.', price: '5,000,000' },
                        { name: 'กระจกเงา', price: '2,000,000' }
                    ],
                    value: 15000000,
                    status: 'Active'
                },
                {
                    id: 'PJ6904003',
                    name: 'ปรับปรุงอาคารสำนักงานการไฟฟ้าฝ่ายผลิต อยุธยา',
                    customerCode: '01013AY',
                    customerName: 'ร้านกระจกอำนวย',
                    branch: 'อยุธยา',
                    projectManager: 'ว่าที่ ร.ต.จุไรรัตน์ ชนะประโคน',
                    startDate: '15/08/2023',
                    expectedEndDate: '15/05/2024',
                    productList: [
                        { name: 'อลูมิเนียมเส้น', price: '3,500,000' }
                    ],
                    value: 8500000,
                    status: 'Active'
                },
                {
                    id: 'PJ6904004',
                    name: 'หมู่บ้านจัดสรร ชลบุรี',
                    customerCode: '10001CB',
                    customerName: 'บริษัท โชคชัย 2 กระจกพัทยา จำกัด',
                    branch: 'ชลบุรี',
                    projectManager: 'นายธวัชชัย  อุทัย',
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
@import '../shared-styles.css';

.add-project-tab {
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
    text-align: left;
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
    text-align: left;
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

.required::after {
    content: " *";
    color: red;
}

.text-primary {
    color: #0056FF;
}
</style>