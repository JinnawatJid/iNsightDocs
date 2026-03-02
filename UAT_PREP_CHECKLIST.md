# UAT Preparation & Fix Checklist
*(Based on the Pre-UAT Audit Report for `/create-credit-request`)*

## 🚨 Critical Fixes (Must Complete Before UAT)

- [ ] **Restore Form Validation in Pinia Store**
    - **File:** `src/stores/creditRequest.js`
    - **Action:** Remove or comment out the temporary bypass `return { valid: true };` inside the `validateRequest` function (around line 40).
    - **Verification:** Attempt to submit a credit request with empty mandatory fields (like "Amount" or missing ID Card document). Ensure the system blocks the submission and displays the appropriate "ข้อมูลไม่ครบถ้วน" (Incomplete Data) warning.

## 🛠️ Environment Readiness Checks

- [ ] **Verify DBD Auto-Download Bridge Service**
    - **Context:** The "ดึงข้อมูลจาก DataWarehouse" (DBD Auto Import) feature relies on a local bridge API.
    - **Action:** Ensure the Python bridge service is actively running on the UAT testing environment (expected at `http://127.0.0.1:4343`).
    - **Verification:** Click the "ดึงข้อมูลจาก DataWarehouse" button for a test company customer and confirm the PDFs/Excels download successfully.

- [ ] **Prepare Test Customer Data**
    - **Context:** The system fetches customer history, financials, and scoring data via `enrichCustomerData` the moment a customer is searched.
    - **Action:** Compile a list of at least 2-3 valid "Customer IDs" or "Tax IDs" that exist in the connected ERP/DataWarehouse.
    - **Verification:** Ensure searching for these specific IDs in the UI actually returns results, bypassing the strict API-first search policy.

## 📢 UAT Tester Communication (To Be Communicated During Testing)

- [ ] **Explain Credit Evaluation Timing**
    - **Message:** Inform the UAT testers that "Credit Evaluation" results (the score out of 200, Grade, Size, etc.) are generated *automatically* in the background when they select a customer from the search results, not by clicking a specific "Evaluate" button at the end of the form.

- [ ] **Explain Document Validation Logistics**
    - **Message:** Inform testers that for "Special Request Types" (like Credit Increases), the system assumes general documents (like store photos) overlap from the previous request and only strictly mandates the *new* Credit Application Document.