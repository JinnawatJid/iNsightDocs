import { defineStore } from 'pinia';
import CustomerService from '@/services/CustomerService';
import CreditRequestService from '@/services/CreditRequestService';
import Swal from 'sweetalert2';
import { getMandatoryKeys } from '@/config/mandatoryFields';

export const useCreditRequestStore = defineStore('creditRequest', {
  state: () => ({
    hasSearched: false,
    customer: { payment_method: '', billing_requirement: '', billing_method: '' }, // Initialize with defaults for dropdowns
    originalCustomer: {}, // Deep clone of initial search result for comparison
    displayCustomer: {}, // Stable copy for sidebar display
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
      reason: '',
      requestType: 'เครดิตใหม่'
    },

    // List of requests (Pending/History)
    requestsList: [],

    // Comments
    comments: [],

    // Validation State
    showValidationErrors: false,

    // UI State
    activeTab: 'requestInfo',

    // Simulation State
    userRole: 'หัวหน้าสำนักงาน' // Default Role
  }),

  getters: {
    // Determine the role that *should* be acting on the current status
    targetRole: (state) => {
      const s = state.requestStatus;
      if (!s || s === 'Draft') return 'หัวหน้าสำนักงาน';
      if (s === 'Opened') return 'ผู้จัดการสาขา';
      if (s === 'Submitted') return 'ผู้จัดการฝ่ายขาย (HO)';
      if (s === 'PendingSales (ชั่วคราว)') return 'เจ้าหน้าที่ฝ่ายการเงิน';
      if (s === 'Reviewed') return 'ผู้จัดการฝ่ายการเงิน';
      if (s === 'PendingFinance (ชั่วคราว)') return 'กรรมการเครดิต';
      return '';
    },

    uploadedDocumentCount: (state) => {
      // Use the files object to count, ensuring we have actual files and ignoring empty arrays
      return Object.values(state.files).filter(f => f && (!Array.isArray(f) || f.length > 0)).length;
    },

    approvalChanceLevel: (state) => {
      // Total docs tracked = 5 (2 from GeneralInfo, 2 from Residence, 1 from RequestInfo)
      const totalDocs = 5;
      const count = Object.values(state.files).filter(f => f && (!Array.isArray(f) || f.length > 0)).length;
      const ratio = count / totalDocs;

      if (ratio < 1 / 3) return 'Low';
      if (ratio < 2 / 3) return 'Medium';
      return 'High';
    },

    approvalChancePercent: (state) => {
      const totalDocs = 5;
      const count = Object.values(state.files).filter(f => f && (!Array.isArray(f) || f.length > 0)).length;
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
    // Helper to safely parse existing_credits to an array
    parseExistingCredits(credits) {
       if (!credits) return [];
       if (Array.isArray(credits)) return credits;
       try {
           const parsed = JSON.parse(credits);
           return Array.isArray(parsed) ? parsed : [];
       } catch (e) {
           console.warn('Failed to parse existing_credits', e);
           return [];
       }
    },

    async loadRequestDetail(txId) {
      this.loading = true;
      this.error = null;
      // Reset active tab to default when loading a new request
      this.activeTab = 'requestInfo';
      try {
        const response = await CreditRequestService.getCreditRequestDetail(txId);
        const data = response.data.data;

        // Populate State
        this.requestId = data.txId; // tx_id
        this.requestStatus = data.status;

        // Handle snapshot_data parsing if it is a string (SQLite/Legacy behavior)
        let parsedSnapshot = data.snapshot_data || {};
        if (typeof parsedSnapshot === 'string') {
          try {
            parsedSnapshot = JSON.parse(parsedSnapshot);
          } catch (e) {
            console.error('Failed to parse snapshot_data in loadRequestDetail', e);
            parsedSnapshot = {};
          }
        }

        this.customer = parsedSnapshot;

        // Fallback: Use root-level data if snapshot is missing critical fields
        if (!this.customer.name && data.customer_name) {
             this.customer.name = data.customer_name;
        }
        if ((!this.customer.id && !this.customer.No_) && data.customer_no) {
             this.customer.id = data.customer_no;
        }

        // Ensure existing_credits is an array
        if (this.customer.existing_credits) {
            this.customer.existing_credits = this.parseExistingCredits(this.customer.existing_credits);
        } else {
             // Ensure it's initialized
            this.customer.existing_credits = [];
        }

        this.displayCustomer = { ...this.customer }; // Init display copy
        this.financialSummary = parsedSnapshot.financial_summary || {};
        this.creditScore = parsedSnapshot.credit_score || {};

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
          termYC: data.term_yc,
          requestType: data.request_type || 'เครดิตใหม่'
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
        Swal.fire({
          title: 'กำลังค้นหาข้อมูลลูกค้า',
          allowOutsideClick: false,
          didOpen: () => {
            Swal.showLoading();
          }
        });
        const results = await CustomerService.searchCustomers(query);

        if (results && results.length > 0) {
          this.clearFormData(); // Clear previous data
          const data = results[0];

          // Determine if company
          const name = data.customer.name || '';
          const keywords = ['บริษัท', 'ห้างหุ้นส่วนจำกัด', 'บ.', 'หจก.'];
          const isCompany = keywords.some(keyword => name.includes(keyword));

          if (!isCompany) {
             // For Individual: Map Address Fetch to Store Address keys
             // And clear Residence keys
             data.customer.store_address = data.customer.address;
             data.customer.store_subdistrict = data.customer.subdistrict;
             data.customer.store_zipcode = data.customer.zipcode;
             data.customer.store_district = data.customer.district;
             data.customer.store_province = data.customer.province;
             data.customer.store_phone = data.customer.phone;
             data.customer.store_fax = data.customer.fax;
             data.customer.store_email = data.customer.email;
             data.customer.store_map_code = data.customer.map_code;
             data.customer.store_landmark = data.customer.landmark;
             data.customer.store_note = data.customer.note;

             // Clear Residence
             data.customer.address = '';
             data.customer.subdistrict = '';
             data.customer.zipcode = '';
             data.customer.district = '';
             data.customer.province = '';
             data.customer.phone = '';
             data.customer.fax = '';
             data.customer.email = '';
             data.customer.map_code = '';
             data.customer.landmark = '';
             data.customer.note = '';
          } else {
             // For Company: Address is Company Address (Store Tab).
             // Residence Tab should be empty or distinct.
             // We ensure 'residence_' keys are empty or initialized if we use them
             // But usually they don't come from fetch unless specific columns exist.
             // No action needed if backend returns them as null/empty.
          }

          this.customer = data.customer;

          // Ensure dropdown defaults
          if (!this.customer.payment_method) this.customer.payment_method = '';
          if (!this.customer.billing_requirement) this.customer.billing_requirement = '';
          if (!this.customer.billing_method) this.customer.billing_method = '';

          // Parse existing_credits
          if (this.customer.existing_credits) {
              this.customer.existing_credits = this.parseExistingCredits(this.customer.existing_credits);
          } else {
              this.customer.existing_credits = [];
          }

          // Clone for original state comparison
          this.originalCustomer = JSON.parse(JSON.stringify(this.customer));

          this.displayCustomer = { ...this.customer }; // Init display copy
          this.history = data.history || [];
          this.financialSummary = data.financial_summary || {};
          this.creditScore = data.credit_score || {};
          this.hasSearched = true;

          await this.createCreditRequest(this.customer.id, this.customer.name);

          // Fetch comments
          await this.fetchComments();

          Swal.close();
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

              // Ensure dropdown defaults
              if (!this.customer.payment_method) this.customer.payment_method = '';
              if (!this.customer.billing_requirement) this.customer.billing_requirement = '';
              if (!this.customer.billing_method) this.customer.billing_method = '';

              // Ensure existing_credits is an array
              if (this.customer.existing_credits) {
                  this.customer.existing_credits = this.parseExistingCredits(this.customer.existing_credits);
              } else {
                  this.customer.existing_credits = [];
              }

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

          // Handle Attachments from initialization/resume
          if (resData.attachments && resData.attachments.length > 0) {
              this.files = {};
              this.uploadedDocuments = {};
              resData.attachments.forEach(att => {
                  this.files[att.file_type] = {
                      name: att.original_name,
                      id: att.id,
                      txId: att.tx_id,
                      isRemote: true
                  };
                  this.uploadedDocuments[att.file_type] = true;
              });
          }

          // Update transaction data (amount/reason) if present
          if (resData.request_amount || resData.request_reason || resData.request_credit_term || resData.term_gs) {
            this.transactionData = {
              amount: resData.request_amount || '',
              creditTerm: resData.request_credit_term || '',
              termGS: resData.term_gs || '',
              termAE: resData.term_ae || '',
              termYC: resData.term_yc || '',
              reason: resData.request_reason || '',
              requestType: resData.request_type || 'เครดิตใหม่'
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
      if (Array.isArray(file)) {
          this.uploadedDocuments[key] = file.length > 0;
      } else {
          this.uploadedDocuments[key] = !!file;
      }
    },

    updateCustomerData(updates) {
      if (this.customer) {
        this.customer = { ...this.customer, ...updates };
      }
    },

    updateFinancialAnalysis(analysisData) {
      if (!this.financialSummary) this.financialSummary = {};
      this.financialSummary.analysis_result = analysisData;
    },

    updateTransactionData(data) {
      this.transactionData = { ...this.transactionData, ...data };
    },

    // Helper to get full snapshot object for saving
    getSnapshot() {
      // Create a copy to modify
      const snapshot = {
        ...this.customer,
        financial_summary: this.financialSummary,
        credit_score: this.creditScore,
        // Include transactionData in snapshot for fallback?
        // Actually, transactionData is stored in dedicated columns, but having it here doesn't hurt.
        transaction_data: this.transactionData
      };

      // Ensure existing_credits is saved as Array (backend JSON stringify handles it if needed for column,
      // but for snapshot JSON, it's better to keep it as data)
      // Actually, snapshot_data is stored as JSON string.
      // So if existing_credits is an array here, it becomes an array in the JSON.
      // Which is fine.
      return snapshot;
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
        formData.append('request_type', this.transactionData.requestType || 'เครดิตใหม่');

        formData.append('snapshot_data', JSON.stringify(this.getSnapshot()));

        formData.append('is_submit', 'true');

        await CreditRequestService.createCreditRequest(formData);
      } catch (e) {
        console.error('Failed to save transaction data', e);
      }
    },

    async saveCustomerCoordinates(updates) {
      this.updateCustomerData(updates);
    },

    async saveCustomerData(updates) {
      if (!this.customer || !this.customer.id) return;

      this.updateCustomerData(updates);
      this.displayCustomer = { ...this.customer };

      try {
        // Backend CustomerController handles array/object stringification for 'existing_credits'
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

    // Validation Action
    validateRequest(isSubmit = false) {
        const reqType = this.transactionData.requestType;
        const isSpecial = ['เครดิตเพิ่ม', 'เปลี่ยนแปลงเงื่อนไขการชำระเงิน', 'เปลี่ยนแปลงระยะเวลาเครดิต'].includes(reqType);

        // 1. Get mandatory keys
        const { fields, files } = getMandatoryKeys(this.isCompany);
        const missingFields = [];

        // For special requests, we only validate RELEVANT fields and skip most file checks if strict mode isn't required
        // But the user said "documents tend to be the same".
        // Let's implement logic: If Special, only validate RequestInfoTab fields and Credit Application Doc.
        // We SKIP General/Residence/Store fields/files IF they are already populated (which they should be from search).
        // But actually, we just rely on what's visible? No, validation runs on data.

        // Refined Logic for Special Requests:
        // We assume existing data is valid. We only check fields that are actively being edited or Critical fields.

        let fieldsToCheck = fields;
        let filesToCheck = files;

        if (isSpecial) {
             // Filter to only check essential fields + Request Info fields
             const essential = ['amount', 'reason', 'contact_person', 'contact_phone_number', 'payment_method', 'billing_requirement'];
             fieldsToCheck = fields.filter(f => essential.includes(f));

             // Only require the Credit Application Doc for special requests
             // (Assuming other docs are on file from previous request)
             filesToCheck = ['credit_application_doc'];
        }

        // 2. Validate Fields
        fieldsToCheck.forEach(key => {
            let val;
            if (['amount', 'reason'].includes(key)) {
                val = this.transactionData[key];
            } else {
                val = this.customer[key];
            }
            if (!val || (typeof val === 'string' && val.trim() === '')) {
                missingFields.push(key);
            }
        });

        // 3. Conditional Checks (Residence & Store) - Skip for Special unless "Show All" is active?
        // Let's skip for special to be safe/lenient as requested ("Overlap" logic).
        if (!isSpecial) {
            const resOwnership = this.customer.residence_ownership;
            if (resOwnership === 'บ้านเช่า' || resOwnership === 'อื่นๆ') {
                 if (!this.customer.residence_ownership_other) missingFields.push('residence_ownership_other');
            }

            const storeOwnership = this.customer.store_ownership;
            if (storeOwnership === 'เช่าซื้อ' || storeOwnership === 'เช่า') {
                 if (!this.customer.store_ownership_other) missingFields.push('store_ownership_other');
            }
        }

        // 4. Validate Files (Only on Submit)
        const missingFiles = [];
        if (isSubmit) {
            filesToCheck.forEach(key => {
                const file = this.files[key];
                // Check if we have a file object OR if it's marked as uploaded
                const isUploaded = this.uploadedDocuments[key];

                if (!file && !isUploaded) {
                     missingFiles.push(key);
                } else if (Array.isArray(file) && file.length === 0) {
                     missingFiles.push(key);
                }
            });

            // Additional Check: Quotation is mandatory if reason is specific
            if (this.transactionData.reason === 'ขออนุมัติเครดิต (มีใบสั่งซื้อแนบมาพร้อม)') {
                const qKey = 'quotation_doc';
                const file = this.files[qKey];
                const isUploaded = this.uploadedDocuments[qKey];
                if ((!file && !isUploaded) || (Array.isArray(file) && file.length === 0)) {
                    missingFiles.push(qKey);
                }
            }
        }

        if (missingFields.length > 0 || missingFiles.length > 0) {
            this.showValidationErrors = true;
            return { valid: false, missingFields, missingFiles };
        }

        this.showValidationErrors = false;
        return { valid: true };
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
      this.customer = { payment_method: '', billing_requirement: '', billing_method: '' }; // Ensure defaults are empty
      this.originalCustomer = {};
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
      this.showValidationErrors = false;
      this.transactionData = {
        amount: '',
        creditTerm: '',
        termGS: '',
        termAE: '',
        termYC: '',
        reason: '',
        requestType: 'เครดิตใหม่'
      };
    },

    clearFormData() {
      this.customer = { payment_method: '', billing_requirement: '', billing_method: '' }; // Ensure defaults are empty
      this.originalCustomer = {};
      this.history = [];
      this.financialSummary = {};
      this.creditScore = {};
      this.requestId = null;
      this.requestStatus = null;
      this.uploadedDocuments = {};
      this.files = {};
      this.comments = [];
      this.showValidationErrors = false;
      this.transactionData = {
        amount: '',
        creditTerm: '',
        termGS: '',
        termAE: '',
        termYC: '',
        reason: '',
        requestType: 'เครดิตใหม่'
      };
    },

    triggerValidation() {
      this.showValidationErrors = true;
    },

    clearValidation() {
      this.showValidationErrors = false;
    },

    setActiveTab(tabId) {
      this.activeTab = tabId;
    },

    setUserRole(role) {
      this.userRole = role;
    },

    async updateStatus(newStatus, comment = '') {
      if (!this.requestId || !this.customer.id) return;

      this.loading = true;
      try {
        const formData = new FormData();
        formData.append('customer_no', this.customer.id);
        formData.append('customer_name', this.customer.name);

        // Pass current transaction data to avoid wiping it
        formData.append('request_amount', this.transactionData.amount || '');
        formData.append('request_reason', this.transactionData.reason || '');
        formData.append('request_credit_term', this.transactionData.creditTerm || '');
        formData.append('term_gs', this.transactionData.termGS || '');
        formData.append('term_ae', this.transactionData.termAE || '');
        formData.append('term_yc', this.transactionData.termYC || '');
        formData.append('request_type', this.transactionData.requestType || 'เครดิตใหม่');

        // Pass full snapshot
        formData.append('snapshot_data', JSON.stringify(this.getSnapshot()));

        // Workflow parameters
        formData.append('is_submit', 'true');
        formData.append('status', newStatus);
        formData.append('comment', comment);
        formData.append('actor_role', this.userRole);

        const result = await CreditRequestService.createCreditRequest(formData);

        if (result && result.data && result.data.data) {
           this.requestStatus = result.data.data.status;
           await this.fetchComments(); // Refresh comments

           // If status changed to something that removes it from the current user's list,
           // we might want to refresh the sidebar list too.
           // Triggering a list refresh for the current active tab
           const listStatus = this.activeTab === 'history' ? 'Approved,Rejected,Closed,Canceled' : 'Draft,Opened,Submitted,Reviewed,PendingSales (ชั่วคราว),PendingFinance (ชั่วคราว)';
           await this.fetchRequests(listStatus);
        }

        return true;
      } catch (e) {
        console.error('Failed to update status', e);
        Swal.fire('Error', 'Failed to update status', 'error');
        return false;
      } finally {
        this.loading = false;
      }
    }
  }
});
