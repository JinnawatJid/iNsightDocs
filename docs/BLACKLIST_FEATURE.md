# Customer Blacklist Feature

## 1. Overview
The **Customer Blacklist** feature is a risk management tool integrated into the **Create Credit Request** workflow. Its purpose is to immediately alert users (Branch Managers/Sales) if they attempt to request credit for a customer who is on the company's restricted list (e.g., due to legal execution, bankruptcy, or bad debt).

## 2. Key Identification Logic
The system uses the **Tax ID (เลขที่บัตรประชาชน / เลขผู้เสียภาษี)** as the **sole identifier** for blacklist checks.

*   **Primary Key:** Tax ID (`VAT Registration No_` / `เลขที่บัตรประชาชน`)
*   **Case Sensitivity:** Not applicable (numeric/string comparison).
*   **Normalization:** All non-digit characters (spaces, dashes) are stripped before comparison.

## 3. Data Source & Import Process
The blacklist data is sourced from a CSV file maintained by the Credit Department.

*   **Source File:** `backend/CustomerBlacklist_rows.csv`
*   **Database Table:** `CustomerBlacklist` (SQLite)
*   **Import Behavior (at Server Startup):**
    1.  The system reads the CSV file.
    2.  It creates the `CustomerBlacklist` table if it doesn't exist.
    3.  **Normalization Step:** During import, the system automatically strips all non-digit characters from the `เลขที่บัตรประชาชน` column and stores the clean numeric string in a hidden column called `normalized_id`.
    4.  **Conflict Handling:** Duplicate Tax IDs are handled via `INSERT OR IGNORE` to prevent startup crashes.

## 4. Search & Detection Workflow

When a user searches for a customer in the `Create Credit Request` page:

1.  **API Search:** The system first queries the live Customer API.
2.  **Tax ID Extraction:** It retrieves the `VAT Registration No_` from the API response.
3.  **Smart Fallback:** If the API response is missing the Tax ID (empty or null), the system automatically queries the local `Customers` database using the Customer ID (`No_`) to find a stored Tax ID.
4.  **Blacklist Check:**
    *   The system normalizes the customer's Tax ID (removes non-digits).
    *   It queries the `CustomerBlacklist` table: `SELECT * FROM CustomerBlacklist WHERE normalized_id = ?`.
5.  **Result:**
    *   **Match Found:** Returns `is_blacklisted: true` along with the `Status` (สถานะ) and `Remark` (หมายเหตุ).
    *   **No Match:** Returns `is_blacklisted: false`.

## 5. User Interface Behavior

If a customer is identified as blacklisted:

### A. Immediate Modal Alert
A blocking modal (SweetAlert2) appears immediately after the search:
*   **Title:** "แจ้งเตือน: ลูกค้ารายนี้อยู่ในบัญชี Blacklist"
*   **Content:** Displays the specific **Status** (e.g., บังคับคดี) and **Remark** (e.g., ค้างชำระ 115,000 บาท).
*   **Action Buttons:**
    *   **"ยกเลิก" (Cancel):** Clears the search result and resets the page to a blank state.
    *   **"ดำเนินการต่อ" (Proceed):** Closes the modal but keeps a persistent warning on the screen.

### B. Persistent Warning Panel
If the user chooses to "Proceed", a yellow warning panel remains visible in the **Purchase Behavior (พฤติกรรมการซื้อ)** section:
*   **Icon:** ⚠️
*   **Text:** "คำเตือน: ลูกค้ารายนี้อยู่ในบัญชี Blacklist โปรดพิจารณาอย่างรอบคอบ"

## 6. Technical Implementation Details

### Backend
*   **File:** `backend/controllers/customerController.js`
*   **Function:** `checkBlacklist(taxId)`
*   **Query:** Uses the pre-calculated `normalized_id` column for 100% reliable matching, avoiding runtime SQL string manipulation issues.

### Frontend
*   **File:** `src/views/CreateCreditRequest.vue`
*   **State:** Uses `useCreditRequestStore` to track `blacklistAlert` state.
*   **Watcher:** Watches for changes in `blacklistAlert` to trigger the `Swal.fire` modal.

## 7. Maintenance
To update the blacklist:
1.  Replace the `backend/CustomerBlacklist_rows.csv` file with the latest version.
2.  Restart the backend server (`node server.js` or `npm start`).
3.  The system will automatically re-import and normalize the new data.
