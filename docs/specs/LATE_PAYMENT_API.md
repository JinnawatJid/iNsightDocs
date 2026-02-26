# Late Payment Analysis API Specification

## 1. Overview
This document outlines the requirements and technical specifications for the **Late Payment Analysis API**. This API is designed to retrieve consolidated payment behavior data for a specific customer from the Dynamics 365 ERP system.

The primary goal is to determine if a customer pays their invoices on time, considering both direct payments (Cash/Transfer) and Cheque payments (with specific clearing logic).

### Key Features
- **Aggregated Data:** Returns a single list of invoices with their corresponding payment status, eliminating the need for multiple round-trips.
- **Business Logic Encapsulation:** Handles complex logic (e.g., check clearing dates, partial payments) on the backend.
- **Auditability:** Includes a `_meta_debug` field to trace data back to original ERP records.

---

## 2. API Contract

### Endpoint
**URL:** `http://192.192.0.37:8280/customer-late-payment/1.0.0`
**Method:** `POST`

### Headers
| Header | Required | Description |
| :--- | :--- | :--- |
| `Content-Type` | Yes | `application/json` |
| `apikey` | Yes | API Key (configured as `LATE_PAYMENT_API_KEY` in backend) |

### Request Body (JSON)
```json
{
  "Customer No_": "08015AY"
}
```

### Response Schema (JSON)
The API returns an array of invoice objects (or an object with a `data` property containing the array).

```json
{
  "success": true,
  "data": [
    {
      "document_no": "INV-2023-1001",
      "posting_date": "2023-01-01",
      "due_date": "2023-01-31",
      "amount": 10000.00,
      "remaining_amount": 0.00,
      "status": "Paid",
      "payment_detail": {
        "payment_date": "2023-02-02",
        "payment_method": "Cheque",
        "is_late": false,
        "late_days": 0,
        "remark": "Paid within 5-day buffer period"
      },
      "Effective_Payment_Date": "2025-09-17T00:00:00.000Z",
      "Status": "ON-TIME",
      "Late_Days": 0
    },
    {
      "Invoice_No": "AYVR-6809/0126"
      // ...
    }
  ]
}
```

---

## 3. Configuration & Troubleshooting

### Environment Variables
The backend uses a specific API key for this service, separate from the main Customer API key.

- **`LATE_PAYMENT_API_KEY`**: The API Key for the Late Payment service.
- **`CUSTOMER_API_KEY`**: Fallback key if the above is not set.

### Debugging
If you encounter connection issues (e.g., 403 Forbidden), use the provided debug script to test connectivity directly from the server:

```bash
node backend/scripts/debug_late_payment.js
```

This script tests various header formats (`apikey`, `x-api-key`, etc.) to ensure compatibility with the gateway.

---

## 4. Business Logic Definitions

### 3.1 Effective Payment Date Rule
The "Effective Payment Date" is determined based on the payment method:

1.  **Cash / Transfer:**
    *   `Effective Date` = `Posting Date` (from Detailed Cust. Ledg. Entry).
2.  **Cheque:**
    *   **Scenario A (Normal):** If `Cleared Date` (Check Ledger) is within **5 days** of `Check Date`, use `Check Date` as the `Effective Date`.
    *   **Scenario B (Delayed Processing):** If `Cleared Date` is **more than 5 days** after `Check Date`, use `Cleared Date` as the `Effective Date`.
    *   *Logic:* `IF DATEDIFF(day, CheckDate, ClearedDate) <= 5 THEN CheckDate ELSE ClearedDate`

### 3.1.1 Sanitization Rules (Effective Payment Validity)
To ensure accurate scoring, the system validates the dates before determining the Effective Payment Date. If a payment is deemed **"Not Yet Realized"**, the `Effective Payment Date` is set to `null` (Outstanding).

1.  **Invalid Cleared Date:**
    *   If `Cleared Date` matches the SQL default `1753-01-01` (indicating a null/uncleared state in some ERP versions), the payment is treated as **Outstanding**.
2.  **Future Post-Dated Cheques:**
    *   If `Check Date` is strictly in the future (relative to the server's current date), the payment is treated as **Outstanding**.
    *   *Reasoning:* A future check has not yet been cashed, so it cannot be counted as a "Paid" invoice for credit scoring purposes.

### 3.2 Late Payment Definition
A payment is considered **Late** if:
`Effective Payment Date` > `Due Date` (from Cust. Ledger Entry)

**Late Days Calculation:**
*   If `is_late` is true: `Late Days` = `Effective Payment Date` - `Due Date` (in days).
*   If `is_late` is false: `Late Days` = 0.

---

## 5. Consumption Logic (Client-Side / Reporting)

The API returns raw invoice data. The consuming client (e.g., Batch Automation Report) applies the following logic to calculate the **Average Late Days Score**:

### 5.1 Handling Outstanding Invoices
Invoices that do not have an `Effective Payment Date` (or where the date is `null`/empty) are considered **Outstanding**.

*   **Rule:** Outstanding invoices are **EXCLUDED** from the Average Late Days calculation.
*   **Reasoning:** An outstanding invoice has not been paid yet, so its "lateness" is indeterminate (or would be a different metric like "Days Sales Outstanding"). Treating it as "0 late days" would artificially lower the average late score, masking poor payment behavior on completed transactions.

### 5.2 Average Calculation Formula
The "Average Late Days" displayed in reports is calculated as:

> **Average Late Days** = `SUM(Late Days of Paid Invoices)` / `COUNT(Paid Invoices)`

*   **Paid Invoice:** An invoice with a valid `Effective Payment Date`.
*   **Late Days:** The value returned by the API (0 if on-time, >0 if late).

### 5.3 UI/UX Presentation Requirements
The Financial Analysis Report (`/report/financial-analysis`) must implement the following presentation logic for the Payment History section:

1.  **Sorting:**
    *   Invoices must be sorted by **Invoice Date Descending** (Newest first).
2.  **Visual Indicators (Badges):**
    *   **LATE:** Red Badge (Late Days > 0).
    *   **ON-TIME:** Green Badge (Late Days = 0 AND Paid).
    *   **OUTSTANDING:** Grey Badge (No `Effective Payment Date`).
3.  **Late Days Display:**
    *   For Outstanding invoices, the "Late Days" column must display `-` (dash) to indicate n/a.
4.  **Section Toggle:**
    *   The "Detailed Extraction" section (scoring debug) should be **hidden/collapsed by default** to reduce visual clutter, while the "Payment History" section remains visible.

---

## 6. Backend Implementation Guide (Dynamics 365 / NAV)

This section provides the SQL/Logic steps to retrieve the required data.

### Step 1: Find Invoices (The Source)
Query the **Cust. Ledger Entry (Table 21)** to find the invoices.

*   **Filter:**
    *   `Customer No.` = `{customer_no}`
    *   `Document Type` = `Invoice` (Option: 1 or 2)
    *   `Document No.` LIKE `AYVR%` (Specific business rule)
    *   `Posting Date` BETWEEN `{start_date}` AND `{end_date}`

*   **Select Columns:**
    *   `Entry No.` (Primary Key - Crucial for joining)
    *   `Document No.`
    *   `Posting Date`
    *   `Due Date`
    *   **`Remaining Amount` Calculation (Crucial):**
        *   Do NOT pull `Remaining Amount` directly from Table 21 if it is a FlowField.
        *   Instead, **Join** with **Detailed Cust. Ledg. Entry (Table 379)** on `Cust. Ledger Entry No.` = `Entry No.`
        *   **Calculation:** `SUM(Detailed Cust. Ledg. Entry.Debit Amount) - SUM(Detailed Cust. Ledg. Entry.Credit Amount)`
        *   Group by the `Entry No.` to get the correct balance per invoice.
    *   `Original Amount` (Calculated from Detailed Entries or use `Sales (LCY)`)

### Step 2: Find Payment Details (The Application)
For each Invoice found in Step 1, query the **Detailed Cust. Ledg. Entry (Table 379)** to find how it was paid.

*   **Join Condition:**
    *   `Cust. Ledger Entry No.` = `Step1.Entry_No`
*   **Filter (CRITICAL):**
    *   **`Entry Type` = `Application` (Option: 2)**. This ensures we only get records representing the *application* of a payment to the invoice, not the initial creation or other adjustments.
    *   `Document Type` = `Payment` (Option: 1)
*   **Select Columns:**
    *   `Entry No.` (For debug)
    *   `Document No.` (The Payment Document No., e.g., RCPT-XXXX)
    *   `Posting Date` (This is the potential payment date for Cash/Transfer)
    *   `Amount` (Credit Amount)

### Step 3: Check Details (If Paid by Cheque)
For each Payment found in Step 2, check if it relates to a Cheque in **Check Ledger Entry (Table 272)**.

*   **Primary Join Condition:**
    *   `Detailed Cust. Ledg. Entry.Document No.` = `Check Ledger Entry.Document No.`
*   **Extension Join Condition (CRITICAL):**
    *   To get status details, you must **JOIN** the **Check Ledger Entry Extension Table** (suffix `ext`) with the main table.
    *   **Join On:** `Check Ledger Entry.Entry No.` = `Check Ledger Entry Ext.Entry No.`
*   **Select Columns:**
    *   `Check Date` (Main Table)
    *   `Check Status` (Ext Table - ID 50411)
    *   `Check Status Date` (Ext Table - ID 50420)
    *   `On Hand Date` (Ext Table - ID 50422)
    *   `Deposit Date` (Ext Table - ID 50423)
    *   `Pass Date` (Ext Table - ID 50424)
    *   `Cleared Date` (Ext Table - ID 50425)

### Step 4: Data Aggregation & Logic Application
Combine the data from steps 1-3:

1.  **Iterate** through each Invoice (from Step 1).
2.  **Find** the corresponding Payment Application (from Step 2).
    *   *Note:* There might be multiple payments (partial payments). In this V1, focus on the latest payment or the one that clears the balance.
3.  **Determine** Payment Method:
    *   If a record exists in `Check Ledger Entry` (Step 3), treat as **Cheque**.
    *   Otherwise, treat as **Cash/Transfer**.
4.  **Calculate** `Effective Payment Date` using the rules in Section 3.1.
5.  **Compare** `Effective Payment Date` vs. `Due Date` to set `is_late`.
6.  **Calculate** `late_days` (`Effective Payment Date` - `Due Date` if late, else 0).
7.  **Populate** the `_meta_debug` object with the `Entry No.` from all 3 tables to allow easy auditing.

---

## 6. Standard Mapping Reference

**Note:** Extension fields (Check Status, Dates) often have GUID suffixes (e.g., `Check Status$6ad9...`). Please check your specific environment schema.

| Spec Field | Dynamics Table | Dynamics Field ID | Field Name Example | Note |
| :--- | :--- | :--- | :--- | :--- |
| **Invoice Info** | | | | |
| `document_no` | Cust. Ledger Entry (21) | 6 | `Document No.` | |
| `posting_date` | Cust. Ledger Entry (21) | 20 | `Posting Date` | |
| `due_date` | Cust. Ledger Entry (21) | 24 | `Due Date` | |
| `amount` | Detailed Cust. Ledg. Entry (379) | | `Debit - Credit` | **Must calculate sum from Detailed Entries** |
| **Payment Info** | | | | |
| `payment_doc_no` | Detailed Cust. Ledg. Entry (379) | 6 | `Document No.` | Filter `Entry Type`=`Application` |
| `payment_date` | Detailed Cust. Ledg. Entry (379) | 4 | `Posting Date` | Default date if no check |
| **Check Info** | | | | |
| `check_date` | Check Ledger Entry (272) | 9 | `Check Date` | |
| `check_status` | Check Ledger Entry **Ext** | 50411 | `Check Status$6ad9...` | **Requires Join on Entry No.** |
| `check_status_date` | Check Ledger Entry **Ext** | 50420 | `Check Status Date$6ad9...` | **Requires Join on Entry No.** |
| `on_hand_date` | Check Ledger Entry **Ext** | 50422 | `On Hand Date$6ad9...` | **Requires Join on Entry No.** |
| `deposit_date` | Check Ledger Entry **Ext** | 50423 | `Deposit Date$6ad9...` | **Requires Join on Entry No.** |
| `pass_date` | Check Ledger Entry **Ext** | 50424 | `Pass Date$6ad9...` | **Requires Join on Entry No.** |
| `cleared_date` | Check Ledger Entry **Ext** | 50425 | `Cleared Date$6ad9...` | **Requires Join on Entry No.** |

---

**End of Specification**
