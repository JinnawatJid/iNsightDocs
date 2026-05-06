<template>
  <div class="pending-requests">
    <Navbar />
    <div class="page-content">
      <div class="main-grid">
        <!-- Left Column: Request Sidebar -->
        <div class="grid-col left">
          <RequestSidebar />
        </div>

        <!-- Center Column: Content Placeholder -->
        <div class="grid-col center">
           <div v-if="!store.requestId" class="placeholder-state">
             <div class="placeholder-content">
               <h3>เลือกรายการทางซ้ายเพื่อดูรายละเอียด</h3>
             </div>
           </div>

           <div v-else class="content-wrapper">
               <div class="fixed-header">
                   <CustomerTitleCard />
               </div>
               <div class="scrollable-content">
                   <!-- NEW: Review Dashboard (replaces ApplicationTabs) -->
                   <div class="dashboard-wrapper mb-20">
                       <ReviewDashboard />
                   </div>

                   <!-- Credit Review Section (History + Comments + Terms) -->
                   <CreditReviewSection
                     :readOnly="isReadOnly"
                     :showTerms="showTerms"
                     :comments="store.comments"
                     :currentRole="store.userRole"
                     v-model="newComment"
                   />
               </div>

               <!-- Action Bar (Sticky at Bottom of Center Col) -->
               <WorkflowActionBar :comment="newComment" @update:comment="newComment = $event" />
           </div>
        </div>

        <!-- Right Column: Status Placeholder -->
        <div class="grid-col right">
           <CreditScoreSummary
             v-if="store.requestId"
             :financial="store.financialSummary"
             :canRequest="store.creditScore?.can_request_credit"
             :badges="store.creditScore?.badges"
             :suggestions="store.creditScore?.suggestions"
             @recalculate="handleRecalculateScore"
           />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue';
import Navbar from '@/components/shared/Navbar.vue';
import RequestSidebar from '@/components/credit/dashboard/RequestSidebar.vue';
import CustomerTitleCard from '@/components/credit/dashboard/CustomerTitleCard.vue';
import CreditScoreSummary from '@/components/credit/scoring/CreditScoreSummary.vue';
import WorkflowActionBar from '@/components/credit/dashboard/WorkflowActionBar.vue';
import CreditReviewSection from '@/components/credit/workflow/CreditReviewSection.vue';
import ReviewDashboard from '@/components/credit/dashboard/ReviewDashboard.vue';
import { useCreditRequestStore } from '@/stores/creditRequest';
import { useRbacStore } from '@/stores/rbac';
import { useAuthStore } from '@/stores/auth';
import { useWorkflowConfig } from '@/composables/useWorkflowConfig';

const store = useCreditRequestStore();
const authStore = useAuthStore();
const rbacStore = useRbacStore();
const { workflowStates, fetchWorkflowConfig } = useWorkflowConfig();

onMounted(() => {
    fetchWorkflowConfig();
    store.resetState();
});
const newComment = ref('');

let commentSaveTimeout;
watch(newComment, (newVal) => {
    if (store.requestId) {
        if (newVal === '') {
            localStorage.removeItem(`draftComment_${store.requestId}`);
            clearTimeout(commentSaveTimeout);

            // Only clear the DB draft if the active store draft wasn't ALREADY empty to avoid infinite loops
            if (store.transactionData?.draftComment) {
                 store.saveDraftCommentToDB('');
            }
        } else {
            localStorage.setItem(`draftComment_${store.requestId}`, newVal);
            // Auto-save to database after 1 second of inactivity to ensure cross-device persistence
            clearTimeout(commentSaveTimeout);
            commentSaveTimeout = setTimeout(() => {
                store.saveDraftCommentToDB(newVal);
            }, 1000);
        }
    }
});

// Watch for request ID changes to reset comment box
watch(() => store.requestId, async (newId) => {
    if (newId) {
        const savedDraft = localStorage.getItem(`draftComment_${newId}`);
        if (savedDraft) {
            newComment.value = savedDraft;
        } else {
            // Fallback to fetch from DB if no local storage draft exists
            const dbDraft = await store.fetchDraftCommentFromDB(newId);
            newComment.value = dbDraft || '';
        }
    } else {
        newComment.value = '';
    }
});

const handleRecalculateScore = async (payload) => {
    // If we have a request ID, we can trigger a recalculate by building a form data payload
    if (!store.requestId || !store.customer?.id) return;

    // Calculate total guarantee sum from snapshot data accurately
    let totalGuaranteeSum = 0;
    const tData = store.transactionData || {};
    const generalGuaranteeKeys = ['bankGuaranteeDetails', 'letterGuaranteeDetails', 'cashDepositDetails'];
    generalGuaranteeKeys.forEach(key => {
        const detailsMap = tData[key] || {};
        Object.values(detailsMap).forEach(detail => {
            if (detail.amount) {
                const num = parseFloat(String(detail.amount).replace(/,/g, ''));
                if (!isNaN(num)) totalGuaranteeSum += num;
            }
        });
    });
    if (tData.projectData && Array.isArray(tData.projectData)) {
        tData.projectData.forEach(project => {
            const projectGuaranteeKeys = ['projectBankGuaranteeDetails', 'projectCashDepositDetails'];
            projectGuaranteeKeys.forEach(key => {
                const detailsMap = project[key] || {};
                Object.values(detailsMap).forEach(detail => {
                    if (detail.amount) {
                        const num = parseFloat(String(detail.amount).replace(/,/g, ''));
                        if (!isNaN(num)) totalGuaranteeSum += num;
                    }
                });
            });
        });
    }

    // Calculate max credit term from snapshot data
    const t1 = parseInt(tData.termGS || 0);
    const t2 = parseInt(tData.termAE || 0);
    const t3 = parseInt(tData.termYC || 0);
    const requestTerm = tData.creditTerm || Math.max(t1, t2, t3) || '30';

    const cleanCapital = tData.registeredCapital ? String(tData.registeredCapital).replace(/,/g, '') : '0';

    const formData = new FormData();
    formData.append('customer_no', store.customer.id);
    formData.append('use_local', 'true');
    formData.append('model_type', tData.modelType || 'new');
    formData.append('registered_capital', cleanCapital);
    formData.append('request_amount', String(tData.amount || 0).replace(/,/g, ''));
    formData.append('request_credit_term', requestTerm);
    formData.append('customer_duration', tData.customerDuration || '0');
    formData.append('years_in_business', store.customer.years_in_business || '0');
    formData.append('residence_ownership', store.customer.residence_ownership || '');
    formData.append('residence_ownership_other', store.customer.residence_ownership_other || '');
    formData.append('wadl', tData.wadl || 0);
    formData.append('total_guarantee_amount', totalGuaranteeSum);

    if (payload.force_full_purchase_score) {
        formData.append('force_full_purchase_score', 'true');
    }

    if (payload.custom_weights) {
        formData.append('custom_weights', payload.custom_weights);
    }

    if (payload.max_score_factors) {
        formData.append('max_score_factors', payload.max_score_factors);
    }

    try {
        const axios = (await import('axios')).default;
        const response = await axios.post('/api/financials/analyze', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });

        if (response.data.success) {
            // If it's just a preview, return the score without saving
            if (payload.preview) {
                if (payload.callback) {
                    payload.callback(response.data.scoringResult);
                }
                return;
            }

            store.updateFinancialAnalysis(response.data);
            if (response.data.scoringResult) {
                store.creditScore = {
                    ...store.creditScore,
                    ...response.data.scoringResult
                };
            }
            await store.saveTransactionData();
        }
    } catch (error) {
        console.error("Recalculation error:", error);
        throw error;
    }
};

const finalStatuses = ['Approved', 'Rejected', 'Closed', 'Canceled'];

const isReadOnly = computed(() => {
    const status = store.requestStatus;

    if (!status) return true;
    if (finalStatuses.includes(status)) return true;

    if (rbacStore.hasPermission('create_request') && status !== 'Draft') {
        const trackingStatuses = ['Opened', 'RegionalSubmitted', 'SalesSubmitted', 'FinanceReviewed', 'Reviewed'];
        if (trackingStatuses.includes(status)) {
            return true;
        }
    }

    const currentState = workflowStates.value?.[status];
    if (currentState) {
        const myRoles = (authStore.user?.roles || []).map(r => r.role);
        const canAct = (currentState.actionableByRoles || []).some(role => myRoles.includes(role));
        return !canAct;
    }

    if (authStore.isRegionalManager && status === 'Opened') return false;
    if (authStore.isSalesManager && status === 'RegionalSubmitted') return false;
    if (authStore.isFinanceOfficer && ['SalesSubmitted', 'FinanceReviewed', 'PendingFinance (ชั่วคราว)'].includes(status)) return false;
    if (authStore.isFinanceManager && status === 'FinanceReviewed') return false;
    if (authStore.isCreditCommittee && ['Reviewed', 'PendingSales (ชั่วคราว)'].includes(status)) return false;

    return true;
});

const showTerms = computed(() => {
    const status = store.requestStatus;

    if (!status) return true;
    return status !== 'Draft';
});
</script>

<style scoped>
.pending-requests {
    padding-top: 80px; /* Navbar height */
    min-height: 100vh;
    background-color: #F5F5F5;
}

.page-content {
    padding: 20px 40px;
    max-width: 1600px;
    margin: 0 auto;
    position: relative;
}

.main-grid {
    display: grid;
    grid-template-columns: 300px 1fr 300px; /* Adjusted left column width for the list */
    gap: 20px;
    align-items: stretch;
    height: calc(100vh - 120px); /* Fill remaining height */
}

/* Responsive adjustments */
@media (max-width: 1200px) {
  .main-grid {
    grid-template-columns: 250px 1fr 250px;
  }
}

@media (max-width: 992px) {
  .main-grid {
    grid-template-columns: 1fr;
  }
}

.grid-col {
    background: white;
    border-radius: 8px;
    height: 100%;
    /* overflow: hidden; Removed to allow sticky headers or popups if needed */
    border: 1px solid #e0e0e0;
}

/* Override sidebar container style if needed, but RequestSidebar has its own styles */
.grid-col.left {
    padding: 0;
}

/* Center column background override to be transparent so cards have their own bg */
.grid-col.center {
    background: transparent;
    border: none;
    overflow: hidden; /* Changed to hidden to manage scroll internally */
}

.grid-col.right {
    background: transparent;
    border: none;
    overflow-y: auto;
    /* Scrollbar styling for webkit */
    scrollbar-width: thin;
    scrollbar-color: #ccc transparent;
}

.grid-col.right::-webkit-scrollbar {
    width: 6px;
}

.grid-col.right::-webkit-scrollbar-track {
    background: transparent;
}

.grid-col.right::-webkit-scrollbar-thumb {
    background-color: #ccc;
    border-radius: 20px;
}

.content-wrapper {
    height: 100%;
    display: flex;
    flex-direction: column;
}

.fixed-header {
    flex-shrink: 0;
    /* margin-bottom handled by CustomerTitleCard itself */
}

.scrollable-content {
    flex: 1;
    overflow-y: auto;
    padding-bottom: 20px; /* Add some breathing room at the bottom */

    /* Scrollbar styling for webkit */
    scrollbar-width: thin;
    scrollbar-color: #ccc transparent;
}

.scrollable-content::-webkit-scrollbar {
    width: 6px;
}

.scrollable-content::-webkit-scrollbar-track {
    background: transparent;
}

.scrollable-content::-webkit-scrollbar-thumb {
    background-color: #ccc;
    border-radius: 20px;
}

.mb-20 {
    margin-bottom: 20px;
}

.placeholder-state {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100%;
  color: #888;
}
</style>
