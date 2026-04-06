<template>
  <div class="credit-request-form">
    <!-- Read Only Warning Banner -->
    <div v-if="isReadOnly" class="readonly-banner">
      <div class="banner-content">
        <span class="warning-icon">⚠️</span>
        <span>คำขอถูกส่งเรียบร้อยแล้ว หากต้องการแก้ไขข้อมูล กรุณายกเลิกคำขอก่อน</span>
      </div>
    </div>

    <div v-if="hasData" :key="store.customer.id" class="form-content-wrapper">
    <!-- Application Tabs (Customer Info) -->
    <div class="unified-card" :class="{ 'collapsed-card': isProjectCredit && !isCustomerInfoExpanded }">
      <div class="card-header">
        <h3>เอกสารประกอบการพิจารณา</h3>
        <div class="header-actions">
            <button
                v-if="isSpecialRequestType"
                class="toggle-details-btn"
                @click="showAllDetails = !showAllDetails"
            >
                {{ showAllDetails ? 'ซ่อนข้อมูลทั้งหมด' : 'แสดงข้อมูลทั้งหมด' }}
            </button>
            <button
                v-if="isProjectCredit"
                class="toggle-details-btn"
                @click="isCustomerInfoExpanded = !isCustomerInfoExpanded"
            >
                {{ isCustomerInfoExpanded ? 'พับข้อมูลลูกค้า' : 'แสดงข้อมูลลูกค้า' }}
            </button>
        </div>
      </div>
      <ApplicationTabs v-show="!isProjectCredit || isCustomerInfoExpanded" :readOnly="isReadOnly" :viewMode="viewMode" />
    </div>

    <!-- Project Tabs (Project Info) -->
    <template v-if="isProjectCredit">
      <div v-for="(project, index) in store.transactionData.projects" :key="index" class="unified-card project-card" :class="{ 'collapsed-card': collapsedProjects[index] }">
        <div class="card-header" :style="collapsedProjects[index] ? 'padding-bottom: 20px;' : 'padding-bottom: 20px; border-bottom: 1px solid #eee;'">
          <h3>ข้อมูลและเงื่อนไขโครงการ: <span style="font-weight: normal; color: #555;">{{ project.projectData.name }}</span></h3>
          <div class="header-actions">
             <button class="toggle-details-btn" @click="toggleProjectCollapse(index)">
                 {{ collapsedProjects[index] ? 'แสดงข้อมูลโครงการ' : 'พับข้อมูลโครงการ' }}
             </button>
             <button v-if="!isReadOnly" class="btn-clear" @click="removeProjectCard(index)">ลบโครงการนี้</button>
          </div>
        </div>
        <ProjectApplicationTabs v-show="!collapsedProjects[index]" :projectIndex="index" :readOnly="isReadOnly" />
      </div>

      <!-- Add New Project Section -->
      <div v-if="!isReadOnly" class="unified-card project-card add-project-card">
         <div class="card-header" style="padding-bottom: 20px; border-bottom: 1px solid #eee;">
            <h3>+ เพิ่มโครงการใหม่</h3>
         </div>
         <AddProjectTab />
      </div>

      <!-- Global Phasing Analysis (Cross-Project Cash Flow) -->
      <GlobalPhasingAnalysis v-if="store.transactionData.projects && store.transactionData.projects.length > 0" />

    </template>

      <div class="form-footer">
        <!-- Unified Review Section (Terms + Comments) -->
        <CreditReviewSection
          v-if="( (isProjectCredit && isLastTab) || (!isProjectCredit && store.activeTab === 'financial') || viewMode === 'focus')"
          :readOnly="isReadOnly"
          :showTerms="showTerms"
          :comments="comments"
          :currentRole="currentRoleLabel"
          v-model="newComment"
        />

        <div v-if="!isReadOnly" class="footer-info">
            <span class="author">สถานะปัจจุบัน: {{ currentRoleLabel }}</span>
        </div>

        <div class="action-buttons">
            <!-- Secondary Actions (e.g., Save, Reject) -->
            <template v-if="!isReadOnly">
                <template v-for="(btn, index) in secondaryActions" :key="'sec-'+index">
                    <button
                        :class="getButtonClass(btn.variant)"
                        @click="handleAction(btn)"
                        :disabled="isSubmitting"
                    >
                        {{ btn.label }}
                    </button>
                </template>
            </template>

            <!-- Next Button (Tab Navigation) -->
            <button
                v-if="!isLastTab"
                class="btn-primary"
                @click="handleNextTab"
                :disabled="isSubmitting"
            >
                ถัดไป
            </button>

            <!-- Primary Actions (Submit, Approve) only on last tab -->
            <template v-if="!isReadOnly && isLastTab">
                <template v-for="(btn, index) in primaryActions" :key="'pri-'+index">
                    <button
                        :class="getButtonClass(btn.variant)"
                        @click="handleAction(btn)"
                        :disabled="isSubmitting"
                    >
                        {{ btn.label }}
                    </button>
                </template>
            </template>
        </div>
      </div>
    </div>
    
    <div v-else class="empty-state">
        <div class="empty-content">
            <img src="@/assets/icons/search-large.svg" alt="Search" class="empty-icon">
            <h3>กรุณาค้นหาข้อมูลลูกค้า</h3>
            <p>พิมพ์รหัสลูกค้าหรือชื่อบริษัทเพื่อเริ่มต้นสร้างคำขอเครดิต</p>
        </div>
    </div>

    <!-- Change Summary Modal -->
    <ChangeSummaryModal
      :isOpen="showChangeSummary"
      :changes="changesToConfirm"
      @close="showChangeSummary = false"
      @confirm="handleConfirmChanges"
    />
  </div>
</template>

<script setup>
import ApplicationTabs from './ApplicationTabs.vue';
import ProjectApplicationTabs from './ProjectApplicationTabs.vue';
import AddProjectTab from '../tabs/project-workspace/AddProjectTab.vue';
import GlobalPhasingAnalysis from '../GlobalPhasingAnalysis.vue';
import CreditReviewSection from '../workflow/CreditReviewSection.vue';
import ChangeSummaryModal from '../modals/ChangeSummaryModal.vue';
import { useCreditRequestStore } from '@/stores/creditRequest';
import { workflowConfig, roleLabels } from '@/config/workflow';
import Swal from 'sweetalert2';
import axios from '@/utils/axios';
import { computed, ref, watch } from 'vue';
import { useRouter, useRoute } from 'vue-router';

const store = useCreditRequestStore();
const router = useRouter();
const route = useRoute();

// Local State for View Mode
const showAllDetails = ref(false);
const showChangeSummary = ref(false);
const collapsedProjects = ref({});

const toggleProjectCollapse = (index) => {
    collapsedProjects.value[index] = !collapsedProjects.value[index];
};

const removeProjectCard = (index) => {
    const project = store.transactionData.projects[index];
    if (!project) return;
    const projectId = project.projectId;
    store.transactionData.projects.splice(index, 1);

    // Cleanup files associated with this project ID
    store.updateFile('project_contract_doc_' + projectId, null);
    store.updateFile('quotation_doc_' + projectId, null);
    store.updateFile('project_security_doc_' + projectId, null);
    store.updateFile('project_cash_deposit_doc_' + projectId, null);
    store.updateFile('contractor_company_profile_doc_' + projectId, null);
    store.updateFile('contractor_balance_sheet_doc_' + projectId, null);
    store.updateFile('contractor_profit_loss_doc_' + projectId, null);
    store.updateFile('contractor_financial_ratios_doc_' + projectId, null);
};
const changesToConfirm = ref([]);
const pendingActionBtn = ref(null);
const isCustomerInfoExpanded = ref(true); // Control visibility of top section for Project Credits
const isSubmitting = ref(false);

// Computeds
const isReadOnly = computed(() => store.isReadOnly);
const comments = computed(() => store.comments);
const requestStatus = computed(() => store.requestStatus || 'Draft'); // Default to Draft
const currentRoleLabel = computed(() => roleLabels[requestStatus.value] || store.currentRole);
const hasData = computed(() => !!store.customer && !!store.customer.id);

// Logic for High Value > 300k
const isHighValue = computed(() => {
    const amtStr = store.transactionData.amount || '0';
    const amt = parseFloat(String(amtStr).replace(/,/g, ''));
    return amt > 300000;
});

// Check if current request type is one of the special types
const isSpecialRequestType = computed(() => {
    const type = store.transactionData.requestType;
    if (!type) return false;
    const specialTypes = ['เครดิตเพิ่ม', 'เปลี่ยนแปลงระยะเวลาเครดิต', 'เปลี่ยนแปลงเงื่อนไขการชำระเงิน'];
    return specialTypes.some(t => type.includes(t));
});

const isProjectCredit = computed(() => {
    const type = store.transactionData.requestType;
    return type && type.includes('เครดิตโครงการ');
});

watch(isProjectCredit, (newVal) => {
    if (newVal) {
        // When switching to project credit, ensure the customer info starts expanded
        isCustomerInfoExpanded.value = true;
        // if activeTab is requestInfo, shift to store to hide the blank tab
        if (store.activeTab === 'requestInfo') {
            store.setActiveTab('store');
        }
    }
});

// View Mode Logic
const viewMode = computed(() => {
    // If not special type, or if user toggled "Show All", use 'full' mode
    if (!isSpecialRequestType.value || showAllDetails.value) {
        return 'full';
    }
    return 'focus';
});

// Logic for showing terms (Manager+)
const showTerms = computed(() => {
    return requestStatus.value && requestStatus.value !== 'Draft';
});

// Determine Available Actions
const availableActions = computed(() => {
    const actions = workflowConfig[requestStatus.value] || [];

    // Filter actions based on conditions (e.g., isHighValue)
    return actions.filter(action => {
        if (action.condition === 'isHighValue') return isHighValue.value;
        if (action.condition === 'isLowValue') return !isHighValue.value;
        return true;
    });
});

// Group Actions
const secondaryActions = computed(() => {
    // Actions that are not submit or approve (e.g., Save, Reject)
    return availableActions.value.filter(a => a.variant === 'secondary' || a.variant === 'reject');
});

const primaryActions = computed(() => {
    // Actions that push the workflow forward (e.g., Submit, Approve)
    return availableActions.value.filter(a => a.variant !== 'secondary' && a.variant !== 'reject');
});

// Tab navigation logic
const activeTabsList = computed(() => {
    if (isProjectCredit.value) {
        return ['projectCards']; // Reverting to single step representation since layout is vertical scroll
    }
    if (viewMode.value === 'focus') {
        return ['requestInfo'];
    }

    return ['requestInfo', 'store', 'general', 'residence', 'financial'];
});

const isLastTab = computed(() => {
    if (activeTabsList.value.length === 0) return true;
    if (isProjectCredit.value) {
        return true; // With vertical stacked cards, we don't have linear 'next' steps.
    }
    return store.activeTab === activeTabsList.value[activeTabsList.value.length - 1];
});

const handleNextTab = () => {
    if (isProjectCredit.value) {
        // No action needed for project credit as it's a single vertical scrolling page now
        window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
    } else {
        const currentIndex = activeTabsList.value.indexOf(store.activeTab);
        if (currentIndex >= 0 && currentIndex < activeTabsList.value.length - 1) {
            store.setActiveTab(activeTabsList.value[currentIndex + 1]);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    }
};

const newComment = computed({
    get: () => store.transactionData.draftComment || '',
    set: (val) => { store.transactionData.draftComment = val; }
});

// Button Styling Map
const getButtonClass = (variant) => {
    switch (variant) {
        case 'primary': return 'btn-primary';
        case 'secondary': return 'btn-secondary'; // Grey
        case 'submit': return 'btn-submit'; // Blue
        case 'approve': return 'btn-approve'; // Green
        case 'reject': return 'btn-reject'; // Red
        default: return 'btn-secondary';
    }
};

const handleAction = async (btn) => {
    // 1. Validation Logic
    // Only validate fields if it's a "Submit" or "Approve" action moving forward
    const isSubmit = btn.targetStatus !== 'Draft' && btn.variant !== 'reject';

    // If it is a submit action, we run full validation
    if (isSubmit) {
        // If status is Draft -> Opened (Submit action), make financial docs mandatory
        const isFinancialMandatory = (requestStatus.value === 'Draft' || !requestStatus.value);

        const validation = store.validateRequest(true, isFinancialMandatory); // true = check files too
        if (!validation.valid) {
             console.log('Validation Failed:', validation);
             store.triggerValidation();
             Swal.fire({
                icon: 'warning',
                title: 'ข้อมูลไม่ครบถ้วน',
                text: 'กรุณากรอกข้อมูลและแนบเอกสารให้ครบถ้วนตามรายการที่มีเครื่องหมาย *'
             });
             return;
        } else {
             store.clearValidation();
        }
    }

    // 2. Confirmation (Initial)
    if (btn.confirmMessage && btn.action !== 'saveDraft') {
        const confirm = await Swal.fire({
            title: 'ยืนยันการทำรายการ?',
            text: btn.confirmText ? `คุณต้องการ "${btn.confirmText}" ใช่หรือไม่?` : 'ยืนยันการทำรายการ',
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'ใช่',
            cancelButtonText: 'ยกเลิก'
        });
        if (!confirm.isConfirmed) return;
    }

    // 3. Check for Change Summary (Only on Submit/Approve for special types)
    const needsSummary = isSpecialRequestType.value && isSubmit && btn.targetStatus !== 'Draft';

    if (needsSummary) {
        const changes = computeChanges();
        if (changes.length > 0) {
            changesToConfirm.value = changes;
            pendingActionBtn.value = btn;
            showChangeSummary.value = true;
            return;
        }
    }

    // 4. Persist Data (Save Customer + Transaction)
    try {
        isSubmitting.value = true;
        Swal.fire({
            title: 'กำลังบันทึกข้อมูล กรุณารอสักครู่...',
            allowOutsideClick: false,
            didOpen: () => {
                Swal.showLoading();
            }
        });

        await store.saveCustomerData(store.customer);

        // 5. Submit Transaction
        await submitTransaction(btn);
    } catch (error) {
        console.error(error);
        // Error handling is mainly in submitTransaction, but catch here just in case saveCustomerData fails
        // We only show error here if it's not from submitTransaction (which already shows an error)
        if (!error.isSubmitTransactionError) {
            Swal.fire({
                title: 'เกิดข้อผิดพลาด',
                text: 'เกิดข้อผิดพลาดในการบันทึกข้อมูล',
                icon: 'error'
            });
        }
    } finally {
        isSubmitting.value = false;
    }
};

const handleConfirmChanges = async () => {
    showChangeSummary.value = false;
    if (pendingActionBtn.value) {
        try {
            isSubmitting.value = true;
            Swal.fire({
                title: 'กำลังบันทึกข้อมูล กรุณารอสักครู่...',
                allowOutsideClick: false,
                didOpen: () => {
                    Swal.showLoading();
                }
            });

            await store.saveCustomerData(store.customer);
            await submitTransaction(pendingActionBtn.value);
        } catch (error) {
            console.error(error);
            if (!error.isSubmitTransactionError) {
                Swal.fire({
                    title: 'เกิดข้อผิดพลาด',
                    text: 'เกิดข้อผิดพลาดในการบันทึกข้อมูล',
                    icon: 'error'
                });
            }
        } finally {
            isSubmitting.value = false;
            pendingActionBtn.value = null;
        }
    }
};

const computeChanges = () => {
    const changes = [];
    const type = store.transactionData.requestType;
    const old = store.originalCustomer || {};
    const curr = store.customer || {};
    const txn = store.transactionData || {};

    // Helper to format
    const fmt = (val) => (val === null || val === undefined || val === '') ? '-' : val;

    // 1. Credit Increase
    if (type && type.includes('เครดิตเพิ่ม')) {
        // Try to find current credit limit proxy
        let currentLimit = 'N/A';
        // Check financial summary for 3-months purchase as a weak proxy? No, that's sales.
        // Check existing_credits if any? No.
        // If we have history, maybe we can find last approved amount?
        // Ideally we should have "Current Limit" in store.financialSummary or store.customer
        // If not available, we stick to N/A but with better label if possible.

        // For now, check if financialSummary has a 'current_limit' property (future proofing)
        if (store.financialSummary && store.financialSummary.current_credit_limit) {
            currentLimit = store.financialSummary.current_credit_limit;
        }

        changes.push({
            label: 'วงเงินใหม่ที่ต้องการ (New Limit)',
            oldVal: currentLimit,
            newVal: fmt(txn.amount)
        });
    }

    // 2. Change Payment
    if (type && (type.includes('เปลี่ยนแปลงเงื่อนไขการชำระเงิน') || type.includes('เครดิตเพิ่ม'))) {
        const fields = [
            { key: 'billing_requirement', label: 'การวางบิล' },
            { key: 'billing_method', label: 'วิธีการวางบิล' },
            { key: 'billing_schedule', label: 'กำหนดวางบิล' },
            { key: 'payment_method', label: 'วิธีการชำระเงิน' },
            { key: 'payment_condition', label: 'เงื่อนไขการชำระเงิน' },
            { key: 'payment_bank_name', label: 'ธนาคาร' }
        ];

        fields.forEach(f => {
            if (old[f.key] !== curr[f.key]) {
                 changes.push({
                    label: f.label,
                    oldVal: fmt(old[f.key]),
                    newVal: fmt(curr[f.key])
                 });
            }
        });
    }

    // 3. Change Credit Term
    if (type && (type.includes('เปลี่ยนแปลงระยะเวลาเครดิต') || type.includes('เครดิตเพิ่ม'))) {
        if (txn.termGS) changes.push({ label: 'Term GS', oldVal: '-', newVal: txn.termGS });
        if (txn.termAE) changes.push({ label: 'Term AE', oldVal: '-', newVal: txn.termAE });
        if (txn.termYC) changes.push({ label: 'Term YC', oldVal: '-', newVal: txn.termYC });
    }

    return changes;
};

const submitTransaction = async (btn) => {
     try {
        const formData = new FormData();
        formData.append('customer_no', store.customer.id);
        formData.append('customer_name', store.customer.name);
        if (store.requestId) {
            formData.append('tx_id', store.requestId);
        }
        formData.append('request_amount', store.transactionData.amount || '');
        formData.append('request_reason', store.transactionData.reason || '');
        formData.append('request_type', store.transactionData.requestType || 'เครดิตใหม่');

        // Map split terms
        formData.append('term_gs', store.transactionData.termGS || '');
        formData.append('term_ae', store.transactionData.termAE || '');
        formData.append('term_yc', store.transactionData.termYC || '');

        // Status
        formData.append('status', btn.targetStatus);

        formData.append('is_submit', btn.action === 'saveDraft' ? 'false' : 'true');

        // Handle Comment Logic
        let originalDraftComment = '';
        if (newComment.value.trim()) {
            if (btn.action !== 'saveDraft') {
                // For actual submission, send as a permanent comment
                formData.append('comment', newComment.value.trim());
                formData.append('actor_role', currentRoleLabel.value);

                // Temporarily clear it from snapshot so it doesn't linger
                originalDraftComment = store.transactionData.draftComment;
                store.transactionData.draftComment = '';
            }
            // For saveDraft, we do NOT append 'comment' to formData.
            // It will naturally be saved within 'snapshot_data' since it's in transactionData.draftComment
        }

        // Snapshot MUST be taken AFTER modifying draftComment (if we cleared it)
        const snapshot = store.getSnapshot();
        formData.append('snapshot_data', JSON.stringify(snapshot));

        // Restore draftComment so the UI doesn't jump before the page reloads
        if (originalDraftComment) {
            store.transactionData.draftComment = originalDraftComment;
        }

        // Files
        for (const [key, file] of Object.entries(store.files)) {
            if (file) {
                if (Array.isArray(file)) {
                    file.forEach(f => {
                        if (!f.isRemote) {
                            formData.append(key, f);
                        }
                    });
                } else if (!file.isRemote) { // Only append actual File objects, not remote placeholders
                    formData.append(key, file);
                }
            }
        }

        const response = await axios.post('/api/credit-requests', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });

        await Swal.fire({
            title: 'สำเร็จ',
            text: btn.confirmMessage || 'ทำรายการสำเร็จ',
            icon: 'success'
        });

        if (btn.action === 'saveDraft') {
            const newTxId = response.data?.data?.tx_id || store.requestId;
            if (newTxId && newTxId !== route.query.txId) {
                router.replace({
                    query: {
                        ...route.query,
                        txId: newTxId
                    }
                });
                store.requestId = newTxId;
            }
            // Refresh state to map newly uploaded remote files properly
            if (store.requestId) {
                await store.loadRequestDetail(store.requestId);
            }
        } else {
            window.location.reload();
        }

    } catch (error) {
        console.error(error);
        if (error.response && error.response.status === 409) {
            Swal.fire({
                title: 'เกิดข้อผิดพลาด',
                text: error.response.data.error || 'มีคำขอเครดิตที่กำลังดำเนินการอยู่สำหรับลูกค้ารายนี้ โปรดรีเฟรชหน้าจอ',
                icon: 'error'
            });
        } else {
            Swal.fire({
                title: 'เกิดข้อผิดพลาด',
                text: 'เกิดข้อผิดพลาดในการส่งคำขอ',
                icon: 'error'
            });
        }
        error.isSubmitTransactionError = true;
        throw error; // Rethrow to let caller (handleAction) know it failed
    }
};
</script>

<style scoped>
.credit-request-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.readonly-banner {
    background-color: #fff3cd;
    border: 1px solid #ffeeba;
    color: #856404;
    padding: 15px;
    border-radius: 8px;
    margin-bottom: 10px;
}

.banner-content {
    display: flex;
    align-items: center;
    gap: 10px;
    font-weight: 500;
}

.unified-card {
  background: white;
  border-radius: 8px;
  border: 1px solid #e0e0e0;
  overflow: hidden;
}

.card-header {
  padding: 20px 20px 0 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.card-header h3 {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 18px;
  font-weight: bold;
  margin: 0;
}

.header-actions {
  display: flex;
  gap: 10px;
}

.toggle-details-btn {
  background: none;
  border: 1px solid #0056FF;
  color: #0056FF;
  padding: 5px 15px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
}

.toggle-details-btn:hover {
  background-color: #f0f5ff;
}

.collapsed-card .card-header {
  margin-bottom: 0; /* Remove bottom margin when collapsed */
  padding-bottom: 20px;
}

/* Explicitly style the delete project button to be red */
.btn-clear {
  background-color: #dc3545 !important;
  color: white !important;
  border: none !important;
  padding: 6px 15px !important;
  border-radius: 4px !important;
  font-size: 14px !important;
  font-weight: 500 !important;
  cursor: pointer !important;
  transition: background-color 0.2s !important;
}

.btn-clear:hover {
  background-color: #c82333 !important;
}

.project-card {
  margin-top: 20px; /* Space between unified cards */
}

/* Icon style reused from previous version */
.card-header h3::before {
  content: '';
  display: inline-block;
  width: 24px;
  height: 24px;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z'%3E%3C/path%3E%3Cpolyline points='14 2 14 8 20 8'%3E%3C/polyline%3E%3Cline x1='16' y1='13' x2='8' y2='13'%3E%3C/line%3E%3Cline x1='16' y1='17' x2='8' y2='17'%3E%3C/line%3E%3Cpolyline points='10 9 9 9 8 9'%3E%3C/polyline%3E%3C/svg%3E");
  background-repeat: no-repeat;
}

.form-footer {
  margin-top: 20px;
}

.footer-info {
  text-align: right;
  margin-bottom: 15px;
}

.author {
  color: #888;
  font-size: 14px;
}

.action-buttons {
  display: flex;
  justify-content: flex-end;
  gap: 15px;
}

/* Button Variants */
.btn-secondary {
  padding: 12px 30px;
  background-color: #999; /* Grey */
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 16px;
  cursor: pointer;
}
.btn-secondary:hover {
  background-color: #888;
}

.btn-primary, .btn-submit {
  padding: 12px 30px;
  background-color: #0056FF; /* Blue */
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 16px;
  cursor: pointer;
}
.btn-primary:hover, .btn-submit:hover {
  background-color: #0046cc;
}

.btn-approve {
    padding: 12px 30px;
    background-color: #28a745; /* Green */
    color: white;
    border: none;
    border-radius: 4px;
    font-size: 16px;
    cursor: pointer;
}
.btn-approve:hover {
    background-color: #218838;
}

.btn-reject, .btn-cancel {
    padding: 12px 30px;
    background-color: #dc3545; /* Red */
    color: white;
    border: none;
    border-radius: 4px;
    font-size: 16px;
    cursor: pointer;
}
.btn-reject:hover, .btn-cancel:hover {
    background-color: #c82333;
}
</style>
