# Customer Blacklist Feature

## 1. Overview
The **Customer Blacklist** feature is a risk management tool integrated into the **Create Credit Request** workflow. Its purpose is to immediately alert users (Branch Managers/Sales) if they attempt to request credit for a customer who is on the company's restricted list (e.g., due to legal execution, bankruptcy, or bad debt).

## 2. Key Identification Logic
The system now uses a **Multi-Factor Identification Strategy** to detect high-risk customers, checking both individuals and businesses.

### A. Primary Identifiers (High Confidence)
Matches on these fields are considered definite hits (Blocked).
1.  **Tax ID (เลขที่บัตรประชาชน / เลขผู้เสียภาษี)**: Numeric-only match.
2.  **Full Name (ชื่อ-นามสกุล)**: Matches against the "Customer Name" in the blacklist, after stripping titles (e.g., นาย, นาง, คุณ).
3.  **Shop/Company Name (ชื่อร้าน/บริษัท)**: Matches against the "Shop Name" in the blacklist, after stripping business keywords (e.g., หจก., บจก.).

### B. Secondary Identifiers (Warning)
Matches on these fields trigger a "Warning" but may not be the same person.
1.  **Last Name Only (นามสกุล)**: Checks if the candidate's last name matches a blacklisted person's last name. Useful for catching family members of blacklisted individuals.

## 3. Data Source & Import Process
The blacklist data is sourced from a CSV file maintained by the Credit Department.

*   **Source File:** `backend/CustomerBlacklist_rows.csv`
*   **Database Table:** `CustomerBlacklist` (SQLite)
*   **Import Behavior (at Server Startup):**
    1.  The system reads the CSV file.
    2.  It creates the `CustomerBlacklist` table if it doesn't exist.
    3.  **Normalization Step:**
        *   **Tax ID:** Strips non-digits -> `normalized_id`.
        *   **Customer Name:** Strips titles (Thai/English) and spaces -> `normalized_name`.
        *   **Shop Name:** Strips business prefixes -> `normalized_shop`.
    4.  **Conflict Handling:** Duplicate Tax IDs are handled via `INSERT OR IGNORE`.

## 4. Search & Detection Workflow

When a user searches for a customer in the `Create Credit Request` page, the system gathers the following fields from the search result (API or Local DB):
1.  **Tax ID**
2.  **Customer/Company Name**
3.  **Contact Person Name**
4.  **Authorized Signatory 1 & 2** (if available locally)

The system performs the following checks in order:

1.  **Tax ID Check:** `normalized_id` match. (Result: **Blocked**)
2.  **Person Name Check:** Checks Contact & Authorized Persons against `normalized_name`.
    *   **Full Name Match:** (Result: **Blocked**)
    *   **Last Name Match:** Checks if the name *ends with* a blacklisted last name. (Result: **Warning**)
3.  **Company Name Check:** Checks Company Name against `normalized_shop`. (Result: **Blocked**)

## 5. User Interface Behavior

If a match is found:

### A. Immediate Modal Alert
A blocking modal (SweetAlert2) appears immediately after the search.
*   **Title:** "แจ้งเตือน: ลูกค้ารายนี้อยู่ในบัญชี Blacklist"
*   **Content:**
    *   Displays **Status** (e.g., บังคับคดี) and **Remark**.
    *   **Match Detail:** Indicates *why* it matched (e.g., "Tax ID", "Full Name", "Last Name").
*   **Action Buttons:**
    *   **"ยกเลิก" (Cancel):** Clears the search result.
    *   **"ดำเนินการต่อ" (Proceed):** Allows proceeding (typically for "Warning" or manual override).

### B. Persistent Warning Panel
If the user chooses to "Proceed", a yellow warning panel remains visible in the **Purchase Behavior (พฤติกรรมการซื้อ)** section.

## 6. Technical Implementation Details

### Backend
*   **File:** `backend/controllers/customerController.js`
*   **Function:** `checkBlacklist({ taxId, personNames, companyNames })`
*   **Utility:** `backend/utils/nameNormalizer.js` handles title stripping and normalization.

### Frontend
*   **File:** `src/views/CreateCreditRequest.vue`
*   **State:** Uses `useCreditRequestStore` to track `blacklistAlert` state.
*   **Watcher:** Watches for changes in `blacklistAlert` to trigger the `Swal.fire` modal.

## 7. Maintenance
To update the blacklist:
1.  Replace the `backend/CustomerBlacklist_rows.csv` file with the latest version.
2.  Restart the backend server (`node server.js` or `npm start`).
3.  The system will automatically re-import and normalize the new data.
