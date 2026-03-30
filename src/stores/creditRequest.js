import { defineStore } from "pinia";
import CustomerService from "@/services/CustomerService";
import CreditRequestService from "@/services/CreditRequestService";
import Swal from "sweetalert2";
import { getMandatoryKeys } from "@/config/mandatoryFields";
import { useAuthStore } from "@/stores/auth";

export const useCreditRequestStore = defineStore("creditRequest", {
  state: () => ({
    hasSearched: false,
    customer: {
      payment_method: "",
      billing_requirement: "",
      billing_method: "",
      registered_capital: "",
      years_in_business: "",
      customer_since: "",
    },
    originalCustomer: {},
    displayCustomer: {},
    history: [],
    financialSummary: {},
    creditScore: {},
    dataSource: null,
    loading: false,
    error: null,

    requestId: null,
    requestStatus: null,
    uploadedDocuments: {},
    files: {},
    transactionData: {
      amount: "",
      creditTerm: "",
      termGS: "",
      termAE: "",
      termYC: "",
      reason: "",
      requestType: "เครดิตใหม่",
      noFinancialData: false,
      draftComment: "",
      bankGuaranteeDetails: {},
      letterGuaranteeDetails: {},
      cashDepositDetails: {},
        mainContractorName: "",
        mainContractorVat: "",
        customerTeam: "",
    },

    requestsList: [],

    comments: [],

    showValidationErrors: false,

    blacklistAlert: null,

    activeTab: "requestInfo",
    activeProjectTab: "projectInfo",
  }),

  getters: {
    userRole: (state) => {
      const s = state.requestStatus;
      if (!s || s === "Draft") return "ผู้จัดการสาขา";
      if (s === "Opened") return "ผู้จัดการภาค";
      if (s === "RegionalSubmitted") return "ผู้จัดการฝ่ายขาย";
      if (s === "SalesSubmitted") return "เจ้าหน้าที่ฝ่ายการเงิน";
      if (s === "Reviewed") {
        const amount = Number(state.transactionData?.amount || 0);
        return amount <= 300000 ? "ผู้จัดการฝ่ายการเงิน" : "กรรมการเครดิต";
      }

      // Legacy support
      if (s === "Submitted") return "ผู้จัดการฝ่ายขาย (HO)";
      if (s === "PendingSales (ชั่วคราว)") return "เจ้าหน้าที่ฝ่ายการเงิน";
      if (s === "PendingFinance (ชั่วคราว)") return "กรรมการเครดิต";
      return "";
    },

    targetRole() {
      return this.userRole;
    },

    uploadedDocumentCount: (state) => {
      return Object.entries(state.files).filter(
        ([key, f]) =>
          !key.startsWith("other_") && f && (!Array.isArray(f) || f.length > 0),
      ).length;
    },

    approvalChanceLevel: (state) => {
      const totalDocs = 5;
      const count = Object.entries(state.files).filter(
        ([key, f]) =>
          !key.startsWith("other_") && f && (!Array.isArray(f) || f.length > 0),
      ).length;
      const ratio = count / totalDocs;

      if (ratio < 1 / 3) return "Low";
      if (ratio < 2 / 3) return "Medium";
      return "High";
    },

    approvalChancePercent: (state) => {
      const totalDocs = 5;
      const count = Object.entries(state.files).filter(
        ([key, f]) =>
          !key.startsWith("other_") && f && (!Array.isArray(f) || f.length > 0),
      ).length;
      return Math.min(100, Math.round((count / totalDocs) * 100));
    },

    isCompany: (state) => {
      if (!state.customer || !state.customer.name) return false;
      const name = state.customer.name;
      const keywords = ["บริษัท", "ห้างหุ้นส่วนจำกัด", "บ.", "หจก."];
      return keywords.some((keyword) => name.includes(keyword));
    },

    isReadOnly: (state) => {
      return !!state.requestStatus && state.requestStatus !== "Draft";
    },
  },

  actions: {
    parseExistingCredits(credits) {
      if (!credits) return [];
      if (Array.isArray(credits)) return credits;
      try {
        const parsed = JSON.parse(credits);
        return Array.isArray(parsed) ? parsed : [];
      } catch (e) {
        console.warn("Failed to parse existing_credits", e);
        return [];
      }
    },

    async loadRequestDetail(txId) {
      this.loading = true;
      this.error = null;
      this.activeTab = "requestInfo";
      try {
        const response =
          await CreditRequestService.getCreditRequestDetail(txId);
        const data = response.data.data;

        this.requestId = data.txId; // tx_id
        this.requestStatus = data.status;

        let parsedSnapshot = data.snapshot_data || {};
        if (typeof parsedSnapshot === "string") {
          try {
            parsedSnapshot = JSON.parse(parsedSnapshot);
          } catch (e) {
            console.error(
              "Failed to parse snapshot_data in loadRequestDetail",
              e,
            );
            parsedSnapshot = {};
          }
        }

        this.customer = parsedSnapshot;

        if (!this.customer.name && data.customer_name) {
          this.customer.name = data.customer_name;
        }
        if (!this.customer.id && !this.customer.No_ && data.customer_no) {
          this.customer.id = data.customer_no;
        }

        if (this.customer.existing_credits) {
          this.customer.existing_credits = this.parseExistingCredits(
            this.customer.existing_credits,
          );
        } else {
          this.customer.existing_credits = [];
        }

        if (!this.customer.has_other_credit) {
          this.customer.has_other_credit =
            this.customer.existing_credits.length > 0 ? "yes" : "";
        }

        this.displayCustomer = { ...this.customer };
        this.financialSummary = parsedSnapshot.financial_summary || {};
        this.creditScore = parsedSnapshot.credit_score || {};

        if (
          Object.keys(this.financialSummary).length === 0 &&
          data.customer_no
        ) {
          try {
            const results = await CustomerService.searchCustomers(
              data.customer_no,
            );
            if (results && results.length > 0) {
              const freshData = results[0];
              const resultId = freshData.customer.id || freshData.customer.No_;
              if (resultId === data.customer_no) {
                this.financialSummary = freshData.financial_summary || {};
                if (Object.keys(this.creditScore).length === 0) {
                  this.creditScore = freshData.credit_score || {};
                }
              }
            }
          } catch (e) {
            console.warn("Fallback fetch for financial summary failed", e);
          }
        }

        this.comments = data.comments || [];

        this.files = {};
        this.uploadedDocuments = {};
        if (data.attachments && data.attachments.length > 0) {
          data.attachments.forEach((att) => {
            const fileObj = {
              name: att.original_name,
              id: att.id,
              txId: att.tx_id,
              isRemote: true,
            };

            if (this.files[att.file_type]) {
              if (Array.isArray(this.files[att.file_type])) {
                this.files[att.file_type].push(fileObj);
              } else {
                this.files[att.file_type] = [
                  this.files[att.file_type],
                  fileObj,
                ];
              }
            } else {
              this.files[att.file_type] = fileObj;
            }
            this.uploadedDocuments[att.file_type] = true;
          });
        }

        this.transactionData = {
          amount: data.request_amount,
          reason: data.request_reason,
          creditTerm: data.request_credit_term,
          termGS: data.term_gs,
          termAE: data.term_ae,
          termYC: data.term_yc,
          requestType: data.request_type || "เครดิตใหม่",
          noFinancialData:
            parsedSnapshot.transaction_data?.noFinancialData || false,
          draftComment: parsedSnapshot.transaction_data?.draftComment || "",
          bankGuaranteeDetails: parsedSnapshot.transaction_data?.bankGuaranteeDetails || {},
          letterGuaranteeDetails: parsedSnapshot.transaction_data?.letterGuaranteeDetails || {},
          cashDepositDetails: parsedSnapshot.transaction_data?.cashDepositDetails || {},
          mainContractorName: parsedSnapshot.transaction_data?.mainContractorName || "",
          mainContractorVat: parsedSnapshot.transaction_data?.mainContractorVat || "",
          customerTeam: parsedSnapshot.transaction_data?.customerTeam || "",
        };

        this.hasSearched = true;
      } catch (err) {
        console.error("Failed to load request detail", err);
        Swal.fire("Error", "ไม่สามารถโหลดข้อมูลคำขอได้", "error");
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
        console.error("Failed to fetch comments", e);
      }
    },

    async searchCustomer(query) {
      if (!query) return;

      this.loading = true;
      this.error = null;

      try {
        Swal.fire({
          title: "กำลังค้นหาข้อมูลลูกค้า",
          allowOutsideClick: false,
          didOpen: () => {
            Swal.showLoading();
          },
        });
        const results = await CustomerService.searchCustomers(query);

        if (results && results.length > 0) {
          this.clearFormData();
          const data = results[0];

          const name = data.customer.name || "";
          const keywords = ["บริษัท", "ห้างหุ้นส่วนจำกัด", "บ.", "หจก."];
          const isCompany = keywords.some((keyword) => name.includes(keyword));

          if (!isCompany) {
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

            data.customer.address = "";
            data.customer.subdistrict = "";
            data.customer.zipcode = "";
            data.customer.district = "";
            data.customer.province = "";
            data.customer.phone = "";
            data.customer.fax = "";
            data.customer.email = "";
            data.customer.map_code = "";
            data.customer.landmark = "";
            data.customer.note = "";
          } else {
          }

          this.customer = data.customer;

          if (!this.customer.payment_method) this.customer.payment_method = "";
          if (!this.customer.billing_requirement)
            this.customer.billing_requirement = "";
          if (!this.customer.billing_method) this.customer.billing_method = "";
          if (!this.customer.registered_capital)
            this.customer.registered_capital = "";
          if (!this.customer.years_in_business)
            this.customer.years_in_business = "";
          if (!this.customer.customer_since) this.customer.customer_since = "";

          if (this.customer.current_credit_limit) {
            this.transactionData.amount = String(
              this.customer.current_credit_limit,
            );
          }
          if (this.customer.payment_terms_code) {
            const rawCode = String(this.customer.payment_terms_code);
            // Default to empty if the code is not a valid number (e.g., 'CASH')
            const code = isNaN(Number(rawCode)) || rawCode.trim() === '' ? "" : rawCode;
            this.transactionData.creditTerm = code;
            this.transactionData.termGS = code;
            this.transactionData.termAE = code;
            this.transactionData.termYC = code;
          }

          if (this.customer.existing_credits) {
            this.customer.existing_credits = this.parseExistingCredits(
              this.customer.existing_credits,
            );
          } else {
            this.customer.existing_credits = [];
          }

          if (!this.customer.has_other_credit) {
            this.customer.has_other_credit =
              this.customer.existing_credits.length > 0 ? "yes" : "";
          }

          this.originalCustomer = JSON.parse(JSON.stringify(this.customer));

          this.displayCustomer = { ...this.customer };
          this.history = data.history || [];
          this.financialSummary = data.financial_summary || {};

          let foundBlacklistData = null;
          if (this.financialSummary.is_blacklisted) {
            foundBlacklistData = this.financialSummary.blacklist_data;
          }
          this.blacklistAlert = null;
          this.creditScore = data.credit_score || {};
          this.dataSource = data._source || null;
          this.hasSearched = true;

          await this.fetchComments();

          Swal.close();

          if (foundBlacklistData) {
            setTimeout(() => {
              this.blacklistAlert = foundBlacklistData;
            }, 300);
          }
        } else {
          this.resetState();
          Swal.fire({
            icon: "warning",
            title: "Not Found",
            text: "No customer found matching your query.",
          });
        }
      } catch (err) {
        console.error(err);
        this.error = err;
        Swal.fire({
          icon: "error",
          title: "Error",
          text: "Failed to fetch customer data. Please try again.",
        });
      } finally {
        this.loading = false;
      }
    },

    async createCreditRequest(customerNo, customerName) {
      try {
        const payload = {
          customer_no: customerNo,
          customer_name: customerName,
        };
        // Provide the txId if we have one so backend can verify concurrency
        if (this.requestId) {
          payload.tx_id = this.requestId;
        }

        const result = await CreditRequestService.createCreditRequest(payload);
        if (result && result.data && result.data.data) {
          const resData = result.data.data;
          this.requestId = resData.txId;
          this.requestStatus = resData.status;

          if (resData.snapshot_data) {
            try {
              let parsedSnapshot = resData.snapshot_data;
              if (typeof parsedSnapshot === "string") {
                parsedSnapshot = JSON.parse(parsedSnapshot);
              }
              this.customer = { ...this.customer, ...parsedSnapshot };

              if (!this.customer.payment_method)
                this.customer.payment_method = "";
              if (!this.customer.billing_requirement)
                this.customer.billing_requirement = "";
              if (!this.customer.billing_method)
                this.customer.billing_method = "";

              if (this.customer.existing_credits) {
                this.customer.existing_credits = this.parseExistingCredits(
                  this.customer.existing_credits,
                );
              } else {
                this.customer.existing_credits = [];
              }

              if (!this.customer.has_other_credit) {
                this.customer.has_other_credit =
                  this.customer.existing_credits.length > 0 ? "yes" : "";
              }

              if (parsedSnapshot.financial_summary) {
                this.financialSummary = parsedSnapshot.financial_summary;
              }
              if (parsedSnapshot.credit_score) {
                this.creditScore = parsedSnapshot.credit_score;
              }
            } catch (e) {
              console.error("Failed to parse snapshot data", e);
            }
          }

          if (resData.attachments && resData.attachments.length > 0) {
            this.files = {};
            this.uploadedDocuments = {};
            resData.attachments.forEach((att) => {
              const fileObj = {
                name: att.original_name,
                id: att.id,
                txId: att.tx_id,
                isRemote: true,
              };

              if (this.files[att.file_type]) {
                if (Array.isArray(this.files[att.file_type])) {
                  this.files[att.file_type].push(fileObj);
                } else {
                  this.files[att.file_type] = [
                    this.files[att.file_type],
                    fileObj,
                  ];
                }
              } else {
                this.files[att.file_type] = fileObj;
              }
              this.uploadedDocuments[att.file_type] = true;
            });
          }

          if (
            resData.request_amount ||
            resData.request_reason ||
            resData.request_credit_term ||
            resData.term_gs ||
            resData.request_type
          ) {
            const parsedSnapshotTransactionData = resData.snapshot_data
                ? typeof resData.snapshot_data === "string"
                  ? JSON.parse(resData.snapshot_data).transaction_data || {}
                  : resData.snapshot_data.transaction_data || {}
                : {};
            this.transactionData = {
              amount: resData.request_amount || "",
              creditTerm: resData.request_credit_term || "",
              termGS: resData.term_gs || "",
              termAE: resData.term_ae || "",
              termYC: resData.term_yc || "",
              reason: resData.request_reason || "",
              requestType: resData.request_type || "เครดิตใหม่",
              noFinancialData: resData.snapshot_data
                ? typeof resData.snapshot_data === "string"
                  ? JSON.parse(resData.snapshot_data).transaction_data
                      ?.noFinancialData || false
                  : resData.snapshot_data.transaction_data?.noFinancialData ||
                    false
                : false,
              bankGuaranteeDetails: parsedSnapshotTransactionData.bankGuaranteeDetails || {},
              letterGuaranteeDetails: parsedSnapshotTransactionData.letterGuaranteeDetails || {},
              cashDepositDetails: parsedSnapshotTransactionData.cashDepositDetails || {},
              mainContractorName: parsedSnapshotTransactionData.mainContractorName || "",
              mainContractorVat: parsedSnapshotTransactionData.mainContractorVat || "",
              customerTeam: parsedSnapshotTransactionData.customerTeam || "",
            };
          }
        }
      } catch (err) {
        console.error("Failed to create credit request transaction", err);
      }
    },

    async cancelRequest() {
      if (!this.requestId) return;
      try {
        await CreditRequestService.cancelCreditRequest(this.requestId);
        this.requestStatus = "Canceled";
      } catch (err) {
        console.error("Failed to cancel request", err);
        throw err;
      }
    },

    async reviseRequest() {
      if (!this.requestId) return null;
      try {
        const response = await CreditRequestService.reviseRequest(
          this.requestId,
        );
        return response.data.newTxId;
      } catch (err) {
        console.error("Failed to revise request", err);
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

    removeFileKey(key) {
      if (this.files[key]) {
        delete this.files[key];
      }
      if (this.uploadedDocuments[key]) {
        delete this.uploadedDocuments[key];
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

    getSnapshot() {
      const snapshot = {
        ...this.customer,
        financial_summary: this.financialSummary,
        credit_score: this.creditScore,
        transaction_data: this.transactionData,
      };

      return snapshot;
    },

    async saveTransactionData() {
      if (!this.customer || !this.customer.id) return;
      try {
        const formData = new FormData();
        formData.append("customer_no", this.customer.id);
        formData.append("customer_name", this.customer.name);
        formData.append("request_amount", this.transactionData.amount || "");
        formData.append("request_reason", this.transactionData.reason || "");
        formData.append(
          "request_credit_term",
          this.transactionData.creditTerm || "",
        );
        formData.append("term_gs", this.transactionData.termGS || "");
        formData.append("term_ae", this.transactionData.termAE || "");
        formData.append("term_yc", this.transactionData.termYC || "");
        formData.append(
          "request_type",
          this.transactionData.requestType || "เครดิตใหม่",
        );

        formData.append("snapshot_data", JSON.stringify(this.getSnapshot()));

        formData.append("is_submit", "true");

        if (this.requestId) {
          formData.append("tx_id", this.requestId);
        }

        await CreditRequestService.createCreditRequest(formData);
      } catch (e) {
        console.error("Failed to save transaction data", e);
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
        await CustomerService.updateCustomer(this.customer.id, updates);
      } catch (err) {
        console.error("Failed to save customer data:", err);
        Swal.fire({
          icon: "error",
          title: "Error",
          text: "Failed to save customer data.",
        });
      }
    },

    validateRequest(isSubmit = false, isFinancialMandatory = false) {
      const reqType = this.transactionData.requestType;
      const isSpecial = [
        "เครดิตเพิ่ม",
        "เปลี่ยนแปลงเงื่อนไขการชำระเงิน",
        "เปลี่ยนแปลงระยะเวลาเครดิต",
      ].includes(reqType);
      const isProject = reqType && reqType.includes("เครดิตโครงการ");

      const { fields, files } = getMandatoryKeys(this.isCompany);
      const missingFields = [];

      let fieldsToCheck = fields;
      let filesToCheck = files;

      if (isSpecial && !isProject) {
        const essential = [
          "amount",
          "reason",
          "contact_person",
          "contact_phone_number",
          "payment_method",
          "billing_requirement",
        ];
        fieldsToCheck = fields.filter((f) => essential.includes(f));

        filesToCheck = ["credit_application_doc"];
      }

      fieldsToCheck.forEach((key) => {
        let val;
        if (["amount", "reason", "termGS", "termAE", "termYC"].includes(key)) {
          val = this.transactionData[key];
        } else {
          val = this.customer[key];
        }
        if (!val || (typeof val === "string" && val.trim() === "")) {
          missingFields.push(key);
        }
      });

      if (
        this.isCompany &&
        (!this.customer.registered_capital ||
          String(this.customer.registered_capital).trim() === "")
      ) {
        missingFields.push("registered_capital");
      }

      if (
        !this.customer.customer_duration_years ||
        String(this.customer.customer_duration_years).trim() === ""
      ) {
        missingFields.push("customer_duration_years");
      }

      if (this.customer.billing_requirement === "required") {
        if (!this.customer.billing_method) missingFields.push("billing_method");
        if (!this.customer.billing_schedule)
          missingFields.push("billing_schedule");
        if (
          this.customer.billing_method === "other" &&
          !this.customer.billing_method_note
        ) {
          missingFields.push("billing_method_note");
        }
      }

      if (this.customer.payment_method) {
        if (!this.customer.payment_condition)
          missingFields.push("payment_condition");
        if (!this.customer.payment_bank_name)
          missingFields.push("payment_bank_name");
        if (!this.customer.payment_bank_branch)
          missingFields.push("payment_bank_branch");
        if (!this.customer.payment_account_no)
          missingFields.push("payment_account_no");
      }

      if (
        this.customer.has_other_credit === "yes" &&
        this.customer.existing_credits
      ) {
        this.customer.existing_credits.forEach((item, index) => {
          if (!item.companyName)
            missingFields.push(`existing_credit_${index}_companyName`);
          if (!item.goods) missingFields.push(`existing_credit_${index}_goods`);
          if (!item.term) missingFields.push(`existing_credit_${index}_term`);
          if (!item.limit) missingFields.push(`existing_credit_${index}_limit`);
        });
      }

      if (this.customer.has_tungnam_relationship === "yes") {
        if (!this.customer.tungnam_relationship_customer_id) {
          missingFields.push("tungnam_relationship_customer_id");
        }
      }

      // Project specific validations
      if (isSubmit && isProject) {
          if (!this.transactionData.projectId) {
              missingFields.push('projectId');
          }
          filesToCheck.push('project_contract_doc');
          filesToCheck.push('project_plan_doc');
      }

      const missingFiles = [];
      if (isSubmit) {
        if (isFinancialMandatory && this.isCompany) {
          let financialFiles = [
            "company_profile_doc",
            "balance_sheet_doc",
            "profit_loss_doc",
            "financial_ratios_doc",
          ];

          if (this.transactionData.noFinancialData) {
            financialFiles = ["company_profile_doc"];
          }

          financialFiles.forEach((f) => {
            if (!filesToCheck.includes(f)) filesToCheck.push(f);
          });

          if (this.transactionData.noFinancialData) {
            filesToCheck = filesToCheck.filter(
              (f) =>
                ![
                  "balance_sheet_doc",
                  "profit_loss_doc",
                  "financial_ratios_doc",
                ].includes(f),
            );
          }
        }

        filesToCheck.forEach((key) => {
          const file = this.files[key];
          const isUploaded = this.uploadedDocuments[key];

          if (!file && !isUploaded) {
            missingFiles.push(key);
          } else if (Array.isArray(file) && file.length === 0) {
            missingFiles.push(key);
          }
        });

        if (
          this.transactionData.reason ===
          "ขออนุมัติเครดิต (มีใบสั่งซื้อแนบมาพร้อม)"
        ) {
          const qKey = "quotation_doc";
          const file = this.files[qKey];
          const isUploaded = this.uploadedDocuments[qKey];
          if (
            (!file && !isUploaded) ||
            (Array.isArray(file) && file.length === 0)
          ) {
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
        console.error("Failed to fetch requests", err);
        this.error = err;
      } finally {
        this.loading = false;
      }
    },

    resetState() {
      this.hasSearched = false;
      this.customer = {
        payment_method: "",
        billing_requirement: "",
        billing_method: "",
        registered_capital: "",
        years_in_business: "",
        customer_since: "",
        has_tungnam_relationship: "",
        tungnam_relationship_customer_id: "",
        tungnam_relationship_note: "",
      };
      this.originalCustomer = {};
      this.history = [];
      this.financialSummary = {};
      this.creditScore = {};
      this.dataSource = null;
      this.error = null;
      this.requestId = null;
      this.requestStatus = null;
      this.uploadedDocuments = {};
      this.files = {};
      this.comments = [];
      this.viewingHistory = false;
      this.showValidationErrors = false;
      this.blacklistAlert = null;
      this.transactionData = {
        amount: "",
        creditTerm: "",
        termGS: "",
        termAE: "",
        termYC: "",
        reason: "",
        requestType: "เครดิตใหม่",
        noFinancialData: false,
        draftComment: "",
        bankGuaranteeDetails: {},
        letterGuaranteeDetails: {},
        cashDepositDetails: {},
        mainContractorName: "",
        mainContractorVat: "",
        customerTeam: "",
      };
    },

    clearFormData() {
      this.customer = {
        payment_method: "",
        billing_requirement: "",
        billing_method: "",
        registered_capital: "",
        years_in_business: "",
        customer_since: "",
        has_tungnam_relationship: "",
        tungnam_relationship_customer_id: "",
        tungnam_relationship_note: "",
      };
      this.originalCustomer = {};
      this.history = [];
      this.financialSummary = {};
      this.creditScore = {};
      this.dataSource = null;
      this.requestId = null;
      this.requestStatus = null;
      this.uploadedDocuments = {};
      this.files = {};
      this.comments = [];
      this.showValidationErrors = false;
      this.blacklistAlert = null;
      this.transactionData = {
        amount: "",
        creditTerm: "",
        termGS: "",
        termAE: "",
        termYC: "",
        reason: "",
        requestType: "เครดิตใหม่",
        noFinancialData: false,
        draftComment: "",
        bankGuaranteeDetails: {},
        letterGuaranteeDetails: {},
        cashDepositDetails: {},
        mainContractorName: "",
        mainContractorVat: "",
        customerTeam: "",
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

    setActiveProjectTab(tabId) {
      this.activeProjectTab = tabId;
    },

    async updateStatus(newStatus, comment = "") {
      if (!this.requestId || !this.customer.id) return;

      this.loading = true;
      try {
        const formData = new FormData();
        formData.append("customer_no", this.customer.id);
        formData.append("customer_name", this.customer.name);

        formData.append("request_amount", this.transactionData.amount || "");
        formData.append("request_reason", this.transactionData.reason || "");
        formData.append(
          "request_credit_term",
          this.transactionData.creditTerm || "",
        );
        formData.append("term_gs", this.transactionData.termGS || "");
        formData.append("term_ae", this.transactionData.termAE || "");
        formData.append("term_yc", this.transactionData.termYC || "");
        formData.append(
          "request_type",
          this.transactionData.requestType || "เครดิตใหม่",
        );

        formData.append("snapshot_data", JSON.stringify(this.getSnapshot()));

        formData.append("is_submit", "true");
        formData.append("status", newStatus);
        formData.append("comment", comment);
        formData.append("actor_role", this.userRole);

        if (this.requestId) {
          formData.append("tx_id", this.requestId);
        }

        const result = await CreditRequestService.createCreditRequest(formData);

        if (result && result.data && result.data.data) {
          this.requestStatus = result.data.data.status;
          await this.fetchComments();
          let listStatus = "Approved,Rejected,Closed,Canceled";
          if (this.activeTab !== "history") {
            const authStore = useAuthStore();
            let allowedStatuses = [];

            if (authStore.isInitiator) {
              allowedStatuses.push(
                "Opened",
                "RegionalSubmitted",
                "SalesSubmitted",
                "Reviewed",
                "PendingSales (ชั่วคราว)",
                "PendingFinance (ชั่วคราว)",
              );
            }
            if (authStore.isRegionalManager) {
              allowedStatuses.push("Opened");
            }
            if (authStore.isSalesManager) {
              allowedStatuses.push("RegionalSubmitted");
            }
            if (authStore.isFinanceOfficer) {
              allowedStatuses.push("SalesSubmitted");
            }
            if (authStore.isFinanceManager || authStore.isCreditCommittee) {
              allowedStatuses.push("Reviewed");
            }

            if (allowedStatuses.length > 0) {
              listStatus = allowedStatuses.join(",");
            } else {
              listStatus = "";
            }
          }

          if (listStatus) {
            await this.fetchRequests(listStatus);
          } else {
            this.requestsList = [];
          }
        }

        return true;
      } catch (e) {
        console.error("Failed to update status", e);
        Swal.fire("Error", "Failed to update status", "error");
        return false;
      } finally {
        this.loading = false;
      }
    },
  },
});
