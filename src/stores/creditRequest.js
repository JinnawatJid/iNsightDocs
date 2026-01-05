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
      creditTerm: '', // Legacy/Main
      termGS: '',
      termAE: '',
      termYC: '',
      reason: 'สต๊อคสินค้า'
    },

    // List of requests (Pending/History)
    requestsList: [],

    // Comments
    comments: []
  }),

  getters: {
    currentRole: (state) => {
      // Logic to determine role based on status
      const s = state.requestStatus;
      if (!s || s === 'Draft') return 'หัวหน้าสำนักงาน';
      if (s === 'Opened') return 'ผู้จัดการสาขา';
      if (s === 'Submitted') return 'ผู้จัดการฝ่ายขาย (HO)';
      if (s === 'PendingSales (ชั่วคราว)') return 'เลขานุการฝ่ายการเงิน';
      if (s === 'Reviewed') return 'ผู้จัดการฝ่ายการเงิน'; // or Committee if > 300k, handled in logic
      if (s === 'PendingFinance (ชั่วคราว)') return 'กรรมการเครดิต';
      return '';
    },

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
      const finalStatuses = ['Approved', 'Rejected', 'Closed', 'Canceled'];
      return finalStatuses.includes(state.requestStatus);
    }
  },

  actions: {
    async loadRequestDetail(txId) {
        this.loading = true;
        this.error = null;
        try {
            const response = await CreditRequestService.getCreditRequestDetail(txId);
            const data = response.data.data;

            // Populate State
            this.requestId = data.txId; // tx_id
            this.requestStatus = data.status;
            this.customer = data.snapshot_data || {};
            this.financialSummary = data.snapshot_data?.financial_summary || {};
            this.creditScore = data.snapshot_data?.credit_score || {};

            // Fallback for legacy snapshots (missing financial summary)
            if (Object.keys(this.financialSummary).length === 0 && data.customer_no) {
                try {
                    const results = await CustomerService.searchCustomers(data.customer_no);
                    if (results && results.length > 0) {
                        const freshData = results[0];
                        // Only use fallback if we really found the customer
                        const resultId = freshData.customer.id || freshData.customer.No_;
                        if (resultId === data.customer_no) {
                             this.financialSummary = freshData.financial_summary || {};
                             if (Object.keys(this.creditScore).length === 0) {
                                 this.creditScore = freshData.credit_score || {};
                             }
                        }
                    }
                } catch (e) {
                    console.warn('Fallback fetch for financial summary failed', e);
                }
            }

            this.comments = data.comments || [];

            // Handle Files
            this.files = {};
            if (data.attachments && data.attachments.length > 0) {
                data.attachments.forEach(att => {
                    // We store it as an object with specific props to indicate it's remote
                    this.files[att.file_type] = {
                        name: att.original_name,
                        id: att.id,
                        txId: att.tx_id,
                        isRemote: true
                    };
                    this.uploadedDocuments[att.file_type] = true;
                });
            }

            // Transaction Data
            this.transactionData = {
                amount: data.request_amount,
                reason: data.request_reason,
                creditTerm: data.request_credit_term,
                termGS: data.term_gs,
                termAE: data.term_ae,
                termYC: data.term_yc
            };

            this.hasSearched = true; // To show the form

        } catch (err) {
            console.error('Failed to load request detail', err);
            Swal.fire('Error', 'ไม่สามารถโหลดข้อมูลคำขอได้', 'error');
        } finally {
            this.loading = false;
        }
    },

    async fetchComments() {
        if (!this.requestId) return;
        try {
            const res = await CreditRequestService.getComments(this.requestId);
            if (res.data && res.data.data) {
                this.comments = res.data.data;
            }
        } catch (e) {
            console.error('Failed to fetch comments', e);
        }
    },

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

          await this.createCreditRequest(this.customer.id, this.customer.name);

          // Fetch comments
          await this.fetchComments();
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

              // Load financial data if present in snapshot
              if (parsedSnapshot.financial_summary) {
                  this.financialSummary = parsedSnapshot.financial_summary;
              }
              if (parsedSnapshot.credit_score) {
                  this.creditScore = parsedSnapshot.credit_score;
              }

            } catch (e) {
              console.error('Failed to parse snapshot data', e);
            }
          }

          // Update transaction data (amount/reason) if present
          if (resData.request_amount || resData.request_reason || resData.request_credit_term || resData.term_gs) {
            this.transactionData = {
              amount: resData.request_amount || '',
              creditTerm: resData.request_credit_term || '',
              termGS: resData.term_gs || '',
              termAE: resData.term_ae || '',
              termYC: resData.term_yc || '',
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

    updateCustomerData(updates) {
      if (this.customer) {
        this.customer = { ...this.customer, ...updates };
      }
    },

    updateFinancialAnalysis(analysisData) {
      if (!this.financialSummary) this.financialSummary = {};

      // Store the analysis result in a dedicated property within financialSummary
      // This will be persisted when getSnapshot() includes financialSummary
      this.financialSummary.analysis_result = analysisData;

      // We can also update top-level scores if they map directly,
      // but keeping it structured is better for Phase 2.
    },

    updateTransactionData(data) {
        this.transactionData = { ...this.transactionData, ...data };
    },

    // Helper to get full snapshot object for saving
    getSnapshot() {
        return {
            ...this.customer,
            financial_summary: this.financialSummary,
            credit_score: this.creditScore
        };
    },

    async saveTransactionData() {
        if (!this.customer || !this.customer.id) return;
        try {
            const formData = new FormData();
            formData.append('customer_no', this.customer.id);
            formData.append('customer_name', this.customer.name);
            formData.append('request_amount', this.transactionData.amount || '');
            formData.append('request_reason', this.transactionData.reason || '');
            formData.append('request_credit_term', this.transactionData.creditTerm || '');
            formData.append('term_gs', this.transactionData.termGS || '');
            formData.append('term_ae', this.transactionData.termAE || '');
            formData.append('term_yc', this.transactionData.termYC || '');

            // Use getSnapshot() to ensure all data including financials is saved
            formData.append('snapshot_data', JSON.stringify(this.getSnapshot()));

            // is_submit=true triggers update, but we don't pass 'status' so it keeps existing status
            formData.append('is_submit', 'true');

            await CreditRequestService.createCreditRequest(formData); // This endpoint handles updates too
        } catch (e) {
            console.error('Failed to save transaction data', e);
        }
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
      this.comments = [];
      this.viewingHistory = false;
    }
  }
});
