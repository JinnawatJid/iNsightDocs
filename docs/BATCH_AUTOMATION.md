# Batch Automation Documentation

## Overview
The Batch Automation system (`/batch-automation`) allows users to upload a list of customers (Excel) and automatically:
1.  Fetch customer data from the internal database.
2.  Download DBD documents (Financial Statements, Company Profile) via the **Bridge Server**.
3.  Analyze the financial data to generate credit scores and recommended limits.

## Folder Structure
The system stores downloaded DBD documents for future use to avoid redundant downloads. The structure is as follows:

```
SP682/
  customers/
    {Customer_ID}/
      {YYYYMMDD}/
        DBD_Profile.pdf
        DBD_BalanceSheet.xlsx
        DBD_IncomeStatement.xlsx
        DBD_FinancialRatios.xlsx
```

*   **Customer_ID**: The unique identifier of the customer (e.g., `01013AY`).
*   **YYYYMMDD**: The date the files were downloaded (e.g., `20251025`).

## Local File Priority Logic
To optimize performance and reduce costs, the system checks for existing local files before connecting to the Bridge.

1.  **Check**: The system calls `GET /api/financials/check-local/{Customer_ID}`.
2.  **Validity**: Files are considered valid if:
    *   They exist in the `SP682/customers/{Customer_ID}/{LatestDate}` folder.
    *   The folder date is within **180 days** of the current date.
    *   All 4 required files are present.
3.  **Action**:
    *   **If Valid**: The system skips the Bridge download and uses the local files for analysis (`use_local=true`). The status will reflect "Done (Local)".
    *   **If Invalid/Missing**: The system proceeds to download fresh files from the Bridge.

## File Access
Users can download the files used for analysis via the **Files** column in the Batch Automation table.
*   **Bridge Files**: Downloaded directly from memory (Base64).
*   **Local Files**: Downloaded from the server via `/api/financials/download-local/{Customer_ID}/{FileKey}`.
