import { defineStore } from 'pinia';
import CustomerService from '@/services/CustomerService';
import Swal from 'sweetalert2';

export const useCreditRequestStore = defineStore('creditRequest', {
  state: () => ({
    hasSearched: false,
    customer: {},
    history: [],
    financialSummary: {},
    creditScore: {},
    loading: false,
    error: null
  }),

  actions: {
    async searchCustomer(query) {
      if (!query) return;

      this.loading = true;
      this.error = null;

      try {
        const results = await CustomerService.searchCustomers(query);

        if (results && results.length > 0) {
          const data = results[0];

          this.customer = data.customer;
          this.history = data.history || [];
          this.financialSummary = data.financial_summary || {};
          this.creditScore = data.credit_score || {};
          this.hasSearched = true;

          if (results.length > 1) {
            Swal.fire({
              icon: 'info',
              title: 'Found multiple results',
              text: `Found ${results.length} matches. Using the first one: ${data.customer.name}`
            });
          }
        } else {
          this.resetState();
          Swal.fire({
            icon: 'warning',
            title: 'Not Found',
            text: 'No customer found matching your query.'
          });
        }
      } catch (err) {
        console.error(err);
        this.error = err;
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'Failed to fetch customer data. Please try again.'
        });
      } finally {
        this.loading = false;
      }
    },

    resetState() {
      this.hasSearched = false;
      this.customer = {};
      this.history = [];
      this.financialSummary = {};
      this.creditScore = {};
      this.error = null;
    }
  }
});
