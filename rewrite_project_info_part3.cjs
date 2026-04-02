const fs = require('fs');

const path = 'src/components/credit/tabs/ProjectInfoTab.vue';
let content = fs.readFileSync(path, 'utf8');

// Replace the <script setup> block logic
const oldScript = `
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

// Guarantee Details Handlers
const getGuaranteeDetail = (storeKey, fileName, field) => {
    if (!store.transactionData[storeKey]) return '';
    if (!store.transactionData[storeKey][fileName]) return '';
    return store.transactionData[storeKey][fileName][field] || '';
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
    let num = rawValue.replace(/[^0-9.]/g, '');
    const parts = num.split('.');
    if (parts.length > 2) {
        num = parts[0] + '.' + parts.slice(1).join('');
    }
    updateGuaranteeDetail(storeKey, fileName, field, num);
};

const updateGuaranteeDetail = (storeKey, fileName, field, value) => {
    if (!store.transactionData[storeKey]) {
        store.transactionData[storeKey] = {};
    }
    if (!store.transactionData[storeKey][fileName]) {
        store.transactionData[storeKey][fileName] = {};
    }
    store.transactionData[storeKey][fileName][field] = value;
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

    // Initialize dropdowns to empty strings so placeholders show
    if (!store.transactionData.contractorType) {
        store.transactionData.contractorType = '';
    }
    if (!store.transactionData.customerTeam) {
        store.transactionData.customerTeam = '';
    }

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
`;

const newScript = `
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
    if (!store.transactionData.projects[projectIndex][storeKey]) return '';
    if (!store.transactionData.projects[projectIndex][storeKey][fileName]) return '';
    return store.transactionData.projects[projectIndex][storeKey][fileName][field] || '';
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
    if (!store.transactionData.projects[projectIndex][storeKey]) {
        store.transactionData.projects[projectIndex][storeKey] = {};
    }
    if (!store.transactionData.projects[projectIndex][storeKey][fileName]) {
        store.transactionData.projects[projectIndex][storeKey][fileName] = {};
    }
    store.transactionData.projects[projectIndex][storeKey][fileName][field] = value;
};

const addProduct = (projectIndex) => {
    if (!store.transactionData.projects[projectIndex].adjustedProductList) {
        store.transactionData.projects[projectIndex].adjustedProductList = [];
    }
    store.transactionData.projects[projectIndex].adjustedProductList.push({ name: '', price: '' });
};

const removeProduct = (projectIndex, idx) => {
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

const selectProject = (proj) => {
    if (!store.transactionData.projects) {
        store.transactionData.projects = [];
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
        projectBankGuaranteeDetails: {},
        projectCashDepositDetails: {}
    };

    store.transactionData.projects.push(newProject);

    // Update total amount based on all projects
    recalculateTotalAmount();

    projectSearchResults.value = [];
    projectSearchQuery.value = '';
};

const removeProjectCard = (projectIndex) => {
    store.transactionData.projects.splice(projectIndex, 1);
    recalculateTotalAmount();
};

const recalculateTotalAmount = () => {
    let total = 0;
    if (store.transactionData.projects) {
        store.transactionData.projects.forEach(p => {
             const val = parseFloat(String(p.adjustedProjectValue || p.projectData.value).replace(/,/g, ''));
             if (!isNaN(val)) total += val;
        });
    }
    store.transactionData.amount = total > 0 ? String(total) : '';
};
`;

content = content.replace(oldScript, newScript);

fs.writeFileSync(path, content, 'utf8');
