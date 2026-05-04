# RACI Matrix: Credit Request Approval Process

This document defines the Roles and Responsibilities for the Credit Request Application workflow, ensuring clarity on who is Responsible, Accountable, Consulted, and Informed for each key activity.

## Key Definitions

### RACI Definitions
*   **R - Responsible**: The person who performs the work or action.
*   **A - Accountable**: The person who is ultimately answerable for the correct completion of the task and the one who delegates the work to those Responsible. (Only one "A" per task).
*   **C - Consulted**: Those whose opinions are sought, typically subject matter experts; and with whom there is two-way communication.
*   **I - Informed**: Those who are kept up-to-date on progress, often only on completion of the task; and with whom there is just one-way communication.

### Roles
*   **BM**: Branch Manager (ผู้จัดการสาขา) - Initiator (`ผู้สร้างคำขอ (เครดิตใหม่/ปรับปรุง)`)
*   **RM**: Regional Manager (ผู้จัดการภาค) - First Level Approver (`ผู้พิจารณาของพื้นที่`)
*   **SM**: Sales Manager (ผู้จัดการฝ่ายขาย) - Sales Reviewer (`ผู้พิจารณาฝ่ายขาย`)
*   **FO**: Finance Officer (เจ้าหน้าที่ฝ่ายการเงิน) - Document Screener (`ผู้ตรวจสอบเอกสาร`)
*   **FM**: Finance Manager / Lower Approval (`ผู้อนุมัติ (วงเงินต่ำกว่าเกณฑ์)`)
*   **CC**: Credit Committee / Higher Approval (`ผู้อนุมัติ (วงเงินสูงกว่าเกณฑ์)`)

---

## RACI Matrix

| Activity | BM (Branch Manager) | RM (Regional Manager) | SM (Sales Manager) | FO (Finance Off) | FM (Finance Mgr) | CC (Credit Comm) |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **1. Create New Request** | **R** / A | - | - | - | - | - |
| **2. Edit Customer Data** | **R** | - | - | - | - | - |
| **3. Upload Documents** | **R** / A | - | - | - | - | - |
| **4. Submit to Regional** <br>*(Draft -> Opened)* | **R** / A | I | - | - | - | - |
| **5. Regional Review** <br>*(Opened -> RegionalSubmitted)* | I | **R** / A | I | - | - | - |
| **6. Sales Review** <br>*(RegionalSubmitted -> SalesSubmitted)* | I | I | **R** / A | - | I | - |
| **7. Finance Screening** <br>*(SalesSubmitted -> FinanceReviewed)* | I | I | I | **R** | A | - |
| **8. Final Approval (<= 300k)** <br>*(FinanceReviewed -> Approved/Reviewed)*| I | I | I | C | **R** / A | - |
| **9. Final Approval (> 300k)** <br>*(Reviewed -> Approved)*| I | I | I | C | C | **R** / A |
| **10. Rejection Decision** | I | I | I | - | **A** / R | - |
| **11. Cancel Request** | **R** | **A** | I | - | I | - |

---

## Notes on Specific Responsibilities

1.  **Editing Data**: The **Branch Manager** is **Responsible (R)** and **Accountable (A)** for ensuring customer data (General, Addresses, Financials) is accurate before submission. They initiate the request and act as the primary touchpoint.
    *   *Exception:* The **Finance Officer (FO)** is **Responsible (R)** for editing and finalizing specific financial terms (Credit Limit, Credit Terms, Billing Conditions, Payment Conditions) during the Finance Screening stage (`SalesSubmitted` -> `FinanceReviewed`).
2.  **Rejection**: The **Finance Manager** is **Accountable (A)** for final rejection decisions. If a request is rejected, the Branch Manager and Regional Manager are **Informed (I)** of the outcome and the reason.
3.  **High Value Requests**: For requests exceeding 300,000 THB, the **Credit Committee** becomes the **Accountable (A)** authority. The **Finance Manager** acts as a **Consultant (C)** to present the analysis.
