<template>
  <div class="create-credit-request">
    <Navbar />
    <div class="page-content">
      <!-- Header row aligned with center column -->
      <div class="main-grid header-row">
        <div class="grid-col left"></div>
        <div class="grid-col center">
          <CreditRequestHeader @search="store.searchCustomer" />
        </div>
        <div class="grid-col right"></div>
      </div>

      <div class="main-grid">
        <!-- Left Column: History -->
        <div class="grid-col left">
          <RequestStatus v-if="store.hasSearched" />
          <CreditHistorySidebar
            v-if="store.hasSearched"
            :customerName="store.customer.name"
            :historyItems="store.history"
            :searched="store.hasSearched"
          />
        </div>

        <!-- Center Column: Purpose/Form -->
        <div class="grid-col center">
           <div v-if="!store.hasSearched" class="placeholder-state">
             <div class="placeholder-content">
               <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#ccc" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" class="feather feather-search"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
               <h3>ค้นหาลูกค้า เพื่อเริ่มสร้างคำขอเครดิต</h3>
             </div>
           </div>

           <CreditRequestForm v-else />
        </div>

        <!-- Right Column: Idea/Summary -->
        <div class="grid-col right">
           <ApprovalChance v-if="store.hasSearched" />
           <CreditScoreSummary
             v-if="store.hasSearched"
             :financial="store.financialSummary"
             :canRequest="store.creditScore.can_request_credit"
             :badges="store.creditScore.badges"
             :suggestions="store.creditScore.suggestions"
           />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import Navbar from '@/components/shared/Navbar.vue';
import CreditRequestHeader from '@/components/credit/CreditRequestHeader.vue';
import CreditHistorySidebar from '@/components/credit/CreditHistorySidebar.vue';
import RequestStatus from '@/components/credit/RequestStatus.vue';
import CreditRequestForm from '@/components/credit/CreditRequestForm.vue';
import CreditScoreSummary from '@/components/credit/CreditScoreSummary.vue';
import ApprovalChance from '@/components/credit/ApprovalChance.vue';
import { useCreditRequestStore } from '@/stores/creditRequest';

const store = useCreditRequestStore();
</script>

<style scoped>
.create-credit-request {
  padding-top: 80px; /* Navbar height */
  min-height: 100vh;
  background-color: #F5F5F5;
}

.page-content {
  padding: 20px 40px;
  max-width: 1600px;
  margin: 0 auto;
}

.main-grid {
  display: grid;
  grid-template-columns: 300px 1fr 300px;
  gap: 20px;
  align-items: start;
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
  .grid-col.left {
    order: 2;
  }
  .grid-col.center {
    order: 1;
  }
  .grid-col.right {
    order: 3;
  }
}

.placeholder-state {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 400px;
  background: white;
  border-radius: 8px;
  border: 1px dashed #ccc;
}

.placeholder-content {
  text-align: center;
  color: #888;
}

.placeholder-content h3 {
  margin: 10px 0 5px;
  font-size: 18px;
  color: #555;
}

.placeholder-content p {
  font-size: 14px;
}
</style>
