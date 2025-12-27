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
    requestStatus: null, // e.g. 'Opened'
    uploadedDocuments: {}, // Key: docName, Value: boolean (has file)
    files: {}, // Store actual File objects

    // Transaction Data (Separate from Customer Data)
    transactionData: {
      amount: '',
      creditTerm: '',
      reason: 'สต๊อคสินค้า'
    },

    // List of requests (Pending/History)
    requestsList: []
  }),

  getters: {
    uploadedDocumentCount: (state) => {
      // Use the files object to count, ensuring we have actual files
      return Object.values(state.files).filter(f => !!f).length;
    },

    approvalChanceLevel: (state) => {
      // Total docs tracked = 5 (2 from GeneralInfo, 2 from Residence, 1 from RequestInfo)
      const totalDocs = 5;
      const count = Object.values(state.files).filter(f => !!f).length;
      const ratio = count / totalDocs;

      if (ratio < 1/3) return 'Low';
      if (ratio < 2/3) return 'Medium';
      return 'High';
    },

    approvalChancePercent: (state) => {
      const totalDocs = 5;
      const count = Object.values(state.files).filter(f => !!f).length;
      return Math.min(100, Math.round((count / totalDocs) * 100));
    },

    isCompany: (state) => {
      if (!state.customer || !state.customer.name) return false;
      const name = state.customer.name;
      const keywords = ['บริษัท', 'ห้างหุ้นส่วนจำกัด', 'บ.', 'หจก.'];
      return keywords.some(keyword => name.includes(keyword));
    },

    isReadOnly: (state) => {
      // Submitted, Reviewed, Approved, Rejected, Closed -> Read Only
      // Opened, Canceled -> Editable
      return ['Submitted', 'Reviewed', 'Approved', 'Rejected', 'Closed'].includes(state.requestStatus);
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

          // Automatically create a credit request transaction (or fetch existing)
          // We pass empty data initially, backend handles "Opened" creation or retrieval
          // Note: createCreditRequestService usually creates.
          // But here we want to just "Initialize" it.
          // The current backend createCreditRequest returns existing if Opened.
          await this.createCreditRequest(this.customer.id, this.customer.name);
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

    async createCreditRequest(customerNo, customerName) {
      try {
        // Just a basic init call
        const result = await CreditRequestService.createCreditRequest({
            customer_no: customerNo,
            customer_name: customerName
        });
        if (result && result.data && result.data.data) {
          const resData = result.data.data;
          this.requestId = resData.txId;
          this.requestStatus = resData.status;

          // If snapshot data is returned (from existing request), populate form
          if (resData.snapshot_data) {
            try {
              let parsedSnapshot = resData.snapshot_data;
              if (typeof parsedSnapshot === 'string') {
                parsedSnapshot = JSON.parse(parsedSnapshot);
              }
              // Merge into customer state
              this.customer = { ...this.customer, ...parsedSnapshot };
            } catch (e) {
              console.error('Failed to parse snapshot data', e);
            }
          }

          // Update transaction data (amount/reason) if present
          if (resData.request_amount || resData.request_reason || resData.request_credit_term) {
            this.transactionData = {
              amount: resData.request_amount || '',
              creditTerm: resData.request_credit_term || '',
              reason: resData.request_reason || 'สต๊อคสินค้า'
            };
          }
        }
      } catch (err) {
        console.error('Failed to create credit request transaction', err);
      }
    },

    async cancelRequest() {
      if (!this.requestId) return;
      try {
        await CreditRequestService.cancelCreditRequest(this.requestId);

        // Update local status to Canceled so it becomes editable (since Canceled is not in isReadOnly)
        // We do NOT reset state, so the user keeps their data to edit.
        this.requestStatus = 'Canceled';

      } catch (err) {
        console.error('Failed to cancel request', err);
        throw err;
      }
    },

    updateDocumentStatus(docKey, hasFile) {
      this.uploadedDocuments[docKey] = hasFile;
    },

    updateFile(key, file) {
      this.files[key] = file;
      this.uploadedDocuments[key] = !!file;
    },

    // Action to update customer data from form edits
    updateCustomerData(updates) {
      if (this.customer) {
        this.customer = { ...this.customer, ...updates };
      }
    },

    updateTransactionData(data) {
        this.transactionData = { ...this.transactionData, ...data };
    },

    // Action to persist coordinates to backend
    async saveCustomerCoordinates(updates) {
       await this.saveCustomerData(updates);
    },

    // Generic action to persist customer data to backend
    async saveCustomerData(updates) {
      if (!this.customer || !this.customer.id) return;

      // Optimistically update state
      this.updateCustomerData(updates);

      try {
        await CustomerService.updateCustomer(this.customer.id, updates);
      } catch (err) {
        console.error("Failed to save customer data:", err);
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'Failed to save customer data.'
        });
      }
    },

    async fetchRequests(status) {
      this.loading = true;
      this.error = null;
      try {
        const response = await CreditRequestService.getCreditRequests(status);
        if (response && response.data && response.data.data) {
          this.requestsList = response.data.data;
        } else {
          this.requestsList = [];
        }
      } catch (err) {
        console.error('Failed to fetch requests', err);
        this.error = err;
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
      this.requestId = null;
      this.requestStatus = null;
      this.uploadedDocuments = {};
      this.files = {};
    }
  }
});
