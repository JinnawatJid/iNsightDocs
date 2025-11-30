import { defineStore } from 'pinia';
import CustomerService from '@/services/CustomerService';
import CreditRequestService from '@/services/CreditRequestService';
import Swal from 'sweetalert2';

export const useCreditRequestStore = defineStore('creditRequest', {
  state: () => ({
    hasSearched: false,
    customer: {},
    history: [],
    financialSummary: {},
    creditScore: {},
    loading: false,
    error: null,

    // New state for Request Status and Approval Chance
    requestId: null, // Displayed as TxId
    requestStatus: null, // e.g. 'Draft'
    uploadedDocuments: {}, // Key: docName, Value: boolean (has file)
  }),

  getters: {
    uploadedDocumentCount: (state) => {
      return Object.values(state.uploadedDocuments).filter(val => val).length;
    },

    approvalChanceLevel: (state) => {
      // Total docs tracked = 4 (2 from GeneralInfo, 2 from Residence)
      const totalDocs = 4;
      const count = Object.values(state.uploadedDocuments).filter(val => val).length;
      const ratio = count / totalDocs;

      if (ratio < 1/3) return 'Low';
      if (ratio < 2/3) return 'Medium';
      return 'High';
    },

    approvalChancePercent: (state) => {
      const totalDocs = 4;
      const count = Object.values(state.uploadedDocuments).filter(val => val).length;
      return Math.min(100, Math.round((count / totalDocs) * 100));
    }
  },

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

          // Automatically create a credit request transaction
          await this.createCreditRequest(this.customer.name);

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

    async createCreditRequest(customerName) {
      try {
        const result = await CreditRequestService.createCreditRequest(customerName);
        if (result && result.data) {
          this.requestId = result.data.txId;
          this.requestStatus = 'Draft'; // API sets it to Draft
        }
      } catch (err) {
        console.error('Failed to create credit request transaction', err);
        // We don't block the UI flow, but maybe log it
      }
    },

    updateDocumentStatus(docKey, hasFile) {
      this.uploadedDocuments[docKey] = hasFile;
    },

    resetState() {
      this.hasSearched = false;
      this.customer = {};
      this.history = [];
      this.financialSummary = {};
      this.creditScore = {};
      this.error = null;
      this.requestId = null;
      this.requestStatus = null;
      this.uploadedDocuments = {};
    }
  }
});
