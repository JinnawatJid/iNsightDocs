<template>
  <div class="create-credit-request">
    <Navbar />
    <div class="page-content">
      <!-- Header row aligned with center column -->
      <div class="main-grid header-row">
        <div class="grid-col left"></div>
        <div class="grid-col center">
          <CreditRequestHeader @search="handleSearch" />
        </div>
        <div class="grid-col right"></div>
      </div>

      <div class="main-grid">
        <!-- Left Column: History -->
        <div class="grid-col left">
          <!-- <CreditHistorySidebar
            :customerName="customer.name"
            :historyItems="history"
            :searched="hasSearched"
          /> -->
        </div>

        <!-- Center Column: Purpose/Form -->
        <div class="grid-col center">
           <!-- Only show form if searched, or always show but empty?
                Design shows form with data. I'll show it always but it will be empty until search.
           -->
           <CreditRequestForm :customerData="customer" />
        </div>

        <!-- Right Column: Idea/Summary -->
        <div class="grid-col right">
           <!-- <CreditScoreSummary
             v-if="hasSearched"
             :financial="financialSummary"
             :canRequest="creditScore.can_request_credit"
             :badges="creditScore.badges"
             :suggestions="creditScore.suggestions"
           /> -->
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import Navbar from '@/components/Navbar.vue';
import CreditRequestHeader from '@/components/credit/CreditRequestHeader.vue';
import CreditHistorySidebar from '@/components/credit/CreditHistorySidebar.vue';
import CreditRequestForm from '@/components/credit/CreditRequestForm.vue';
import CreditScoreSummary from '@/components/credit/CreditScoreSummary.vue';
import CustomerService from '@/services/CustomerService';
import Swal from 'sweetalert2';

export default {
  name: 'CreateCreditRequest',
  components: {
    Navbar,
    CreditRequestHeader,
    CreditHistorySidebar,
    CreditRequestForm,
    CreditScoreSummary
  },
  data() {
    return {
      hasSearched: false,
      customer: {},
      history: [],
      financialSummary: {},
      creditScore: {}
    };
  },
  methods: {
    async handleSearch(query) {
      if (!query) return;

      console.log('Searching for:', query);
      try {
        const results = await CustomerService.searchCustomers(query);
        console.log('Search results received:', results);
        if (results && results.length > 0) {
          // Assuming we pick the first match for now, or we could show a list selection modal
          // The user logic implies we just want to fill the form with the result.
          const data = results[0];

          this.customer = data.customer;
          this.history = data.history;
          this.financialSummary = data.financial_summary;
          this.creditScore = data.credit_score;
          this.hasSearched = true;

          if (results.length > 1) {
             Swal.fire({
               icon: 'info',
               title: 'Found multiple results',
               text: `Found ${results.length} matches. Using the first one: ${data.customer.name}`
             });
          }
        } else {
          Swal.fire({
            icon: 'warning',
            title: 'Not Found',
            text: 'No customer found matching your query.'
          });
          this.hasSearched = false;
        }
      } catch (error) {
        console.error(error);
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'Failed to fetch customer data. Please try again.'
        });
      }
    }
  }
};
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
</style>
