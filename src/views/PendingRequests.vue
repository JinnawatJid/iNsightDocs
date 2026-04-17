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
               <WorkflowActionBar :comment="newComment" />
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
import { useAuthStore } from '@/stores/auth';

const store = useCreditRequestStore();
const authStore = useAuthStore();

onMounted(() => {
    store.resetState();
});
const newComment = ref('');

// Watch for request ID changes to reset comment box
watch(() => store.requestId, () => {
    newComment.value = '';
});

const isReadOnly = computed(() => {
    // If the user is a Finance Officer and the request is pending their review, allow editing
    if (authStore.isFinanceOfficer && store.requestStatus === 'SalesSubmitted') {
        return false;
    }

    if (authStore.isInitiator && store.requestStatus && store.requestStatus !== 'Draft') {
        const trackingStatuses = ['Opened', 'RegionalSubmitted', 'SalesSubmitted', 'FinanceReviewed', 'Reviewed'];
        if (trackingStatuses.includes(store.requestStatus)) {
             return true;
        }
    }

    const finalStatuses = ['Approved', 'Rejected', 'Closed', 'Canceled'];
    return finalStatuses.includes(store.requestStatus);
});

const showTerms = computed(() => {
    // Show terms if not Draft (meaning it's in the approval flow)
    return store.requestStatus && store.requestStatus !== 'Draft';
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
