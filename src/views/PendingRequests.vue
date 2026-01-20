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
               <CustomerTitleCard />
               <!-- Detailed Content will go here -->
           </div>
        </div>

        <!-- Right Column: Status Placeholder -->
        <div class="grid-col right">
           <!-- Placeholder for Approve Status -->
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import Navbar from '@/components/shared/Navbar.vue';
import RequestSidebar from '@/components/credit/RequestSidebar.vue';
import CustomerTitleCard from '@/components/credit/CustomerTitleCard.vue';
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
    overflow: visible;
}

.content-wrapper {
    height: 100%;
    display: flex;
    flex-direction: column;
}

.placeholder-state {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100%;
  color: #888;
}
</style>
