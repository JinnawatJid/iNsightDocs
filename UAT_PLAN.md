# User Acceptance Testing (UAT) Plan & Strategy

## 1. Introduction & Strategy
This document outlines the strategy, prerequisites, and step-by-step test cases for conducting a manual User Acceptance Testing (UAT) session for the Credit Request System before releasing it to Production.

The goal of this UAT is to ensure the system meets business requirements, functions correctly end-to-end, and is ready for real users.

**Testing Strategy:**
*   **Role-Based Testing:** Test scenarios are divided between **Makers** (users who create and submit credit requests, e.g., Branch Managers) and **Checkers/Approvers** (users who review and approve/reject requests, e.g., Regional Managers).
*   **End-to-End Flow:** Testing should follow the real-world lifecycle of a request: from creation, to submission, to review, to final decision.
*   **Data Strategy:** Do not use real production customer data if possible. Use dedicated "test customers with existing financial data" in the staging/UAT environment to verify all fields, calculations, and external integrations safely.

---

## 2. Environment Setup & Prerequisites Check
Before beginning UAT, the testing environment and its external dependencies must be verified to prevent false failures.

### 2.1 Verify Authentication (SSO)
*   **Check:** Access the frontend application URL.
*   **Expected:** You should be redirected to the external Identity Provider (Exchange Platform) to log in. Upon success, you should be redirected back to the application.
*   *Note: If testing locally with `ENABLE_AUTH=false`, ensure you are automatically logged in as `DEV_MODE_USER`. You can use the Dev Role dropdown in the Navbar to switch roles (e.g., Maker vs Checker).*

### 2.2 Verify External ERP/DataWarehouse Connection
*   **Why:** Customer search relies on an external API (`searchApiCustomers`). If this is down, users cannot start a request.
*   **Check:** Navigate to `/create-credit-request` and search for a known test customer ID or Name.
*   **Expected:** The search dropdown should populate with results. Selecting a customer should successfully fetch their details and transition the UI to the form view.

---

## 3. UAT Test Cases

### Part A: The Maker (e.g., Branch Manager)
*The Maker is responsible for initiating, filling out, and submitting new credit requests.*

#### Test Case M-01: Customer Search & Initialization
1.  **Action:** Log in as a Maker. Navigate to **Create Credit Request** (`/create-credit-request`).
2.  **Action:** Enter the ID or Name of a **test customer with existing financial data** in the search bar.
3.  **Expected:** Search results appear.
4.  **Action:** Select the customer.
5.  **Expected:** The Customer Profile Dashboard loads with correct preliminary data (Name, Type: Corporate/Individual, Current Credit Limit).

#### Test Case M-02: Form Data Entry & Validation
1.  **Action:** Fill out all mandatory fields across the tabs (General Info, Request Info, Residence, Store/Company).
2.  **Action:** Attempt to submit or proceed without filling a known mandatory field (e.g., "Credit Request Amount").
3.  **Expected:** The system should block submission and highlight the missing required fields.

#### Test Case M-03: Document Uploads & Data Retrieval (Corporate Customer)
1.  **Action:** Navigate to the **Financial / Documents** tab (StoreStatementTab).
2.  **Action:** Click the button to pull financial data ("ดึงข้อมูลจาก DataWarehouse").
3.  **Expected:** Financial data and related documents are fetched successfully and displayed correctly on the interface.
4.  **Action:** Manually upload an additional required document (e.g., ID Card) in the "Other Documents" section.
5.  **Expected:** The document uploads successfully and appears in the global document checklist.

#### Test Case M-04: Credit Evaluation (Scoring)
1.  **Action:** Review the "Credit Evaluation" (`CreditScoreSummary.vue`) section.
2.  **Expected:** The system should display a calculated score, recommended limit, and risk grade based on the test customer's financial data. *(Note: This is fetched automatically upon customer selection).*

#### Test Case M-05: Request Submission
1.  **Action:** Ensure all mandatory fields and documents are complete.
2.  **Action:** Click **Submit Request** (ส่งคำขอ).
3.  **Expected:** A success confirmation appears. The request status changes from "Draft" to "Opened" or "Submitted" (depending on workflow config). The form becomes Read-Only for the Maker.

---

### Part B: The Checker / Approver (e.g., Regional Manager)
*The Approver is responsible for reviewing submitted requests, analyzing financials, and making a final decision.*

#### Test Case A-01: Access Pending Requests
1.  **Action:** Log in as an Approver. Navigate to **Pending Requests** (`/pending-requests`).
2.  **Expected:** The dashboard displays a list of requests awaiting review, including the request recently submitted by the Maker.

#### Test Case A-02: Review Request Data & Financials
1.  **Action:** Click on the pending request to open it.
2.  **Expected:** The request opens in Read-Only mode for the core customer data.
3.  **Action:** Navigate to the "Financial Statement (DBD)" section in the Review Dashboard.
4.  **Action:** Click to open the detailed Financial Statement Modal.
5.  **Expected:** The detailed multi-year financial tables (parsed from DBD Excel) load correctly.

#### Test Case A-03: Add Review Comments & Adjust Terms
1.  **Action:** Navigate to the **Review Section** (บันทึกการพิจารณา).
2.  **Action:** Adjust the approved credit terms (GS, AE, YC) or limit, if applicable.
3.  **Action:** Add a mandatory review comment/justification.
4.  **Expected:** The system allows the Approver to edit these specific review fields while the rest of the form remains locked.

#### Test Case A-04: Approve Request
1.  **Action:** Click the **Approve** (อนุมัติ) button.
2.  **Expected:** A success confirmation appears. The request status updates to "Approved". It disappears from the immediate "Pending" queue or is marked as completed.

#### Test Case A-05: Reject / Return Request (Alternative Flow)
1.  **Action:** Open another pending test request.
2.  **Action:** Click the **Reject** (ไม่อนุมัติ) or **Return** button.
3.  **Expected:** The system requires a rejection reason. Upon confirming, the status updates to "Rejected" or is returned to the Maker for edits.

---

### Part C: System Features & Automation

#### Test Case S-01: Batch Automation
1.  **Action:** Navigate to the **Batch Automation** (`/batch-automation`) module.
2.  **Action:** Select a batch of test corporate customers.
3.  **Action:** Trigger the batch processing.
4.  **Expected:** The system automatically processes the queue, downloads missing financial files where available, and updates the status indicators correctly. Check that the "📁 ไฟล์" button opens the modal to view the debug/downloaded files.

#### Test Case S-02: Export PDF Report
1.  **Action:** Open any request with a status of "Approved" or "Opened" (from the Pending Requests dashboard).
2.  **Action:** Click the **ดาวน์โหลด PDF** (Download PDF) button located next to the status badge.
3.  **Expected:** A comprehensive PDF "Credit Analysis Report" is generated and downloaded.
4.  **Action:** Open the PDF.
5.  **Expected:** Verify that the PDF correctly includes:
    *   Customer profile info
    *   DBD Registration details
    *   Dynamic multi-year financial tables (formatted to 2 decimal places for ratios, 0 for amounts)
    *   Score Breakdown
    *   *(Note: "Other Supporting Information" is intentionally excluded by design).*

---

### Part D: Edge Cases & Boundary Value Testing
*These tests ensure the system handles extreme or unusual data inputs gracefully without crashing or allowing invalid states.*

#### Test Case E-01: Numeric Boundaries (Credit Amounts)
1.  **Action:** In a new credit request, navigate to the field for "Credit Request Amount" or "Requested Additional Credit".
2.  **Action:** Enter an extremely high number (e.g., beyond typical maximum limits or standard integer bounds).
3.  **Expected:** The system either formats the large number correctly without breaking the UI, or displays a validation error if a maximum threshold is exceeded.
4.  **Action:** Enter a zero (`0`) or negative (`-50000`) value in the credit amount field.
5.  **Expected:** The system should display a clear validation error indicating that credit amounts must be greater than zero.

#### Test Case E-02: Text Field Boundaries (Long Comments/Justifications)
1.  **Action:** As an Approver reviewing a request, navigate to the "Review Section" (บันทึกการพิจารณา).
2.  **Action:** Paste an excessively long string of text (e.g., 5000+ characters) into the mandatory review comment/justification field.
3.  **Action:** Attempt to submit the approval/rejection.
4.  **Expected:** The system should either truncate the text gracefully, successfully save the long text without database errors, or show a clear validation error if a character limit is enforced. The UI layout should not break.

#### Test Case E-03: Zero/Null Financials (Scoring & PDF Handling)
1.  **Action:** Select or create a test customer where financial data (e.g., revenue, assets, liabilities) contains zeroes (`0`) or empty fields.
2.  **Action:** View the "Credit Evaluation" section.
3.  **Expected:** The scoring model processes the zeroes without crashing, returning a valid (though potentially low or rejected) score and limit.
4.  **Action:** Generate the Export PDF Report for this customer.
5.  **Expected:** The PDF is generated successfully. Financial tables should display `0` correctly, and ratios involving division by zero should be handled gracefully (e.g., showing `N/A` or `0.00` instead of `Infinity` or `NaN`).

---

## 4. Sign-Off & Issue Reporting
*   If any test case fails, log an issue detailing:
    *   The Role being tested.
    *   The specific step that failed.
    *   Expected vs. Actual behavior.
    *   Browser and Environment details.
    *   Any error messages in the console or UI.
*   Once all Critical and High-priority test cases pass successfully, the system is deemed ready for Production deployment.
### 3.4. Request Revision Feature
**Description:** Branch Managers can revise rejected requests without starting from scratch.
**Pre-conditions:** A credit request must be in the `Rejected` status.
**Test Steps:**
1. Login as a Maker (Branch Manager).
2. Navigate to Pending Requests -> History or search for a `Rejected` request.
3. Scroll to the bottom of the Credit Review Section.
4. Verify the "สร้างคำขอใหม่ (แก้ไข)" button is visible.
5. Click the button. Verify the confirmation SweetAlert appears.
6. Click "Confirm".
7. Verify the system redirects to `/create-credit-request` and loads a newly generated transaction ID (e.g., `-R1` suffix).
8. Verify that customer data, form fields, and uploaded documents are preserved.
9. Verify that previous approval comments and specific workflow timestamps are cleared.
10. Submit the new draft and verify it successfully enters the workflow as a new request.
