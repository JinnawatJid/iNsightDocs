import re

with open('src/components/credit/tabs/ProjectInfoTab.vue', 'r') as f:
    content = f.read()

script_content = """<script setup>
import { ref, computed, reactive, watch, onMounted } from 'vue';
import { useCreditRequestStore } from '@/stores/creditRequest';
import OtherDocumentsSection from '../OtherDocumentsSection.vue';
import FileUploader from '@/components/shared/FileUploader.vue';

const props = defineProps(['readOnly']);
const store = useCreditRequestStore();

// Local State for Project Search
const projectSearchQuery = ref('');
const isSearchingProject = ref(false);
const projectSearchResults = ref([]);
const projectSearchMsg = ref('');

const transactionData = computed({
  get: () => store.transactionData,
  set: (val) => { store.transactionData = val; }
});

// Initialize projects array if it doesn't exist
onMounted(() => {
    if (!store.transactionData.projects) {
        store.transactionData.projects = [];
    }
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

const handleAdjustedValueInput = (event, projectIndex) => {
    let val = event.target.value;
    val = val.replace(/[^0-9]/g, '');
    store.transactionData.projects[projectIndex].adjustedProjectValue = val;
};

const formatAdjustedValue = (projectIndex) => {
    const raw = store.transactionData.projects[projectIndex].adjustedProjectValue;
    const num = parseFloat(String(raw).replace(/,/g, ''));
    if (!isNaN(num)) {
        store.transactionData.projects[projectIndex].adjustedProjectValue = formatNumber(num);
    }
};

const handleProductPriceInput = (event, projectIndex, idx) => {
    let val = event.target.value;
    val = val.replace(/[^0-9.]/g, ''); // Allow decimals
    store.transactionData.projects[projectIndex].adjustedProductList[idx].price = val;
};

const formatProductPrice = (projectIndex, idx) => {
    const raw = store.transactionData.projects[projectIndex].adjustedProductList[idx].price;
    if (!raw) return;
    const num = parseFloat(String(raw).replace(/,/g, ''));
    if (!isNaN(num)) {
        store.transactionData.projects[projectIndex].adjustedProductList[idx].price = formatNumber(num);
    }
};

// Guarantee Details Handlers
const getGuaranteeDetail = (projectIndex, storeKey, fileName, field) => {
    const proj = store.transactionData.projects[projectIndex];
    if (!proj[storeKey]) return '';
    if (!proj[storeKey][fileName]) return '';
    return proj[storeKey][fileName][field] || '';
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

const handleGuaranteeAmountInput = (projectIndex, storeKey, fileName, field, rawValue) => {
    let num = rawValue.replace(/[^0-9.]/g, '');
    const parts = num.split('.');
    if (parts.length > 2) {
        num = parts[0] + '.' + parts.slice(1).join('');
    }
    updateGuaranteeDetail(projectIndex, storeKey, fileName, field, num);
};

const updateGuaranteeDetail = (projectIndex, storeKey, fileName, field, value) => {
    const proj = store.transactionData.projects[projectIndex];
    if (!proj[storeKey]) {
        proj[storeKey] = {};
    }
    if (!proj[storeKey][fileName]) {
        proj[storeKey][fileName] = {};
    }
    proj[storeKey][fileName][field] = value;
};

const addProductItem = (projectIndex) => {
    const proj = store.transactionData.projects[projectIndex];
    if (!proj.adjustedProductList) {
        proj.adjustedProductList = [];
    }
    proj.adjustedProductList.push({ name: '', price: '' });
};

const removeProductItem = (projectIndex, idx) => {
    store.transactionData.projects[projectIndex].adjustedProductList.splice(idx, 1);
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
        projectPhasing: []
    };

    store.transactionData.projects.push(newProject);
    projectSearchResults.value = [];
    projectSearchQuery.value = '';
    projectSearchMsg.value = '';
};

const removeProjectCard = (projectIndex) => {
    store.transactionData.projects.splice(projectIndex, 1);

    // Also cleanup files associated with this index if necessary
    // Here we clear the file keys, though ideally they might be completely removed.
    store.updateFile('project_contract_doc_' + projectIndex, null);
    store.updateFile('quotation_doc_' + projectIndex, null);
    store.updateFile('project_security_doc_' + projectIndex, null);
    store.updateFile('project_cash_deposit_doc_' + projectIndex, null);
    store.updateFile('contractor_company_profile_doc_' + projectIndex, null);
    store.updateFile('contractor_balance_sheet_doc_' + projectIndex, null);
    store.updateFile('contractor_profit_loss_doc_' + projectIndex, null);
    store.updateFile('contractor_financial_ratios_doc_' + projectIndex, null);
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
</script>"""

new_content = re.sub(r'<script setup>.*?</script>', script_content, content, flags=re.DOTALL)

with open('src/components/credit/tabs/ProjectInfoTab.vue', 'w') as f:
    f.write(new_content)
