<template>
  <div class="pending-requests">
    <Navbar />
    <div class="page-content">
      <div class="sim-role-wrapper">
        <RoleSelector />
      </div>

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
                   <!-- Unified Card Wrapper -->
                   <div class="unified-card">
                       <div class="card-header">
                           <h3>เอกสารประกอบการพิจารณา</h3>
                       </div>
                       <ApplicationTabs :readOnly="true" viewMode="full" />
                   </div>
               </div>

               <!-- Action Bar (Sticky at Bottom of Center Col) -->
               <WorkflowActionBar />
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
import Navbar from '@/components/shared/Navbar.vue';
import RequestSidebar from '@/components/credit/RequestSidebar.vue';
import CustomerTitleCard from '@/components/credit/CustomerTitleCard.vue';
import ApplicationTabs from '@/components/credit/ApplicationTabs.vue';
import CreditScoreSummary from '@/components/credit/CreditScoreSummary.vue';
import WorkflowActionBar from '@/components/credit/WorkflowActionBar.vue';
import RoleSelector from '@/components/credit/RoleSelector.vue';
import { useCreditRequestStore } from '@/stores/creditRequest';

const store = useCreditRequestStore();
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

.sim-role-wrapper {
  position: absolute;
  top: -60px;
  right: 40px;
  z-index: 100;
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

/* Unified Card Styles (Matching CreditRequestForm) */
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

/* Icon style */
.card-header h3::before {
  content: '';
  display: inline-block;
  width: 24px;
  height: 24px;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z'%3E%3C/path%3E%3Cpolyline points='14 2 14 8 20 8'%3E%3C/polyline%3E%3Cline x1='16' y1='13' x2='8' y2='13'%3E%3C/line%3E%3Cline x1='16' y1='17' x2='8' y2='17'%3E%3C/line%3E%3Cpolyline points='10 9 9 9 8 9'%3E%3C/polyline%3E%3C/svg%3E");
  background-repeat: no-repeat;
}

.placeholder-state {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100%;
  color: #888;
}
</style>
