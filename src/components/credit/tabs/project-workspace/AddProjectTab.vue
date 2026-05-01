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
import CustomerService from '@/services/CustomerService';

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
        const customerNo = store.customer?.id || store.customer?.No_;
        if (!customerNo) {
            projectSearchMsg.value = 'ไม่พบรหัสลูกค้า กรุณาเลือกลูกค้าก่อนค้นหาโครงการ';
            return;
        }

        const response = await CustomerService.getCustomerProjects(customerNo);
        let results = response || [];

        // Map API response to expected frontend structure
        results = results.map(proj => ({
            id: proj.project_code,
            name: proj.project_name,
            customerCode: proj.customer_code,
            customerName: proj.customer_name,
            branch: proj.branch_code,
            projectManager: proj.request_by,
            value: 0,
            status: 'Active',
            remark: proj.remark
        }));

        // Filter by query if provided
        const query = projectSearchQuery.value.toLowerCase().trim();
        if (query) {
            results = results.filter(p =>
                (p.id && p.id.toLowerCase().includes(query)) ||
                (p.name && p.name.toLowerCase().includes(query))
            );
        }

        if (results.length > 0) {
            projectSearchResults.value = results;
        } else {
            projectSearchMsg.value = 'ไม่พบโครงการที่ค้นหา';
        }
    } catch (e) {
        console.error("Project search error:", e);
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