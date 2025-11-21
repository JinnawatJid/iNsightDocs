<template>
  <div class="create-credit-request">
    <div class="page-content">
      <CreditRequestHeader @search="handleSearch" />

      <div class="main-grid">
        <!-- Left Column: History -->
        <div class="grid-col left">
          <CreditHistorySidebar
            :customerName="customer.name"
            :historyItems="history"
            :searched="hasSearched"
          />
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
           <CreditScoreSummary
             v-if="hasSearched"
             :financial="financialSummary"
             :canRequest="creditScore.can_request_credit"
             :badges="creditScore.badges"
             :suggestions="creditScore.suggestions"
           />
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import CreditRequestHeader from '@/components/credit/CreditRequestHeader.vue';
import CreditHistorySidebar from '@/components/credit/CreditHistorySidebar.vue';
import CreditRequestForm from '@/components/credit/CreditRequestForm.vue';
import CreditScoreSummary from '@/components/credit/CreditScoreSummary.vue';
import mockData from '@/data/mock_customer_data.json';

export default {
  name: 'CreateCreditRequest',
  components: {
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
    handleSearch(query) {
      // In a real app, we would use the query. For now, load the mock data.
      console.log('Searching for:', query);

      // Simulate API delay
      setTimeout(() => {
          this.customer = mockData.customer;
          this.history = mockData.history;
          this.financialSummary = mockData.financial_summary;
          this.creditScore = mockData.credit_score;
          this.hasSearched = true;
      }, 300);
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
