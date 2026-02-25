# Batch Automation Documentation

## Overview
The Batch Automation system (`/batch-automation`) allows users to upload a list of customers (Excel) and automatically:
1.  Fetch customer data from the internal database.
2.  Download DBD documents (Financial Statements, Company Profile) via the **Bridge Server**.
3.  Analyze the financial data to generate credit scores and recommended limits.

## Input Methods
The system supports two methods for providing customer data:

### 1. Fetch by Branch (Default)
This is the primary method for batch processing. Users select a specific branch (Region/Zone) from a compact dropdown menu.
*   **Source**: Fetches directly from the Customer API (`/customer-sp682/1.0.0`).
*   **Filtering Logic**: To ensure only relevant, active customers are processed, the backend applies the following filters:
    *   `Branch Code`: Matches the selected branch.
    *   `Billing Terms Code`: Must not be empty (`$ne: " "`).
    *   `Fixed Credit Limit`: Must be greater than 1 (`$gt: 1`). This filters out inactive or placeholder accounts with nominal limits (e.g., 0.01).
*   **Capacity**: The system fetches up to 2,000 records per request to cover large branches.

### 2. Excel Upload
Users can upload an `.xlsx` file containing a list of Customer IDs.
*   **Format**: The system automatically detects the Customer ID column based on header heuristics (e.g., "Code", "Customer ID", "No.").
*   **Use Case**: Ideal for custom lists or cross-branch processing.

## Processing Workflow
The system includes a confirmation step to prevent accidental processing and ensure the correct configuration is applied.

1.  **Configuration**:
    *   **Default Model**: Existing Customer (ลูกค้าปัจจุบัน)
    *   **Default Limit Exponent**: 0.5 (Controls credit limit sensitivity)
    *   **Concurrency**: User can adjust the number of worker threads (Recommended: 2-4).

2.  **Confirmation**:
    Upon clicking **Start Processing**, a confirmation modal appears displaying:
    *   **Total Items**: The number of customers to be processed.
    *   **Source**: The selected branch or uploaded file name.
    *   **Model**: The selected scoring model.
    *   **Limit Exponent**: The active multiplier.

3.  **Execution**:
    Once confirmed, the system begins processing items in parallel based on the concurrency setting.

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

## File Metadata & Extraction
The system enhances the "Local Files" check to provide more context:
*   **Metadata**: The `check-local` endpoint now returns file size (bytes) and modification date (`mtime`) for each file. This is displayed in the "Debug Files" popup.
*   **Extraction Fallback**: If a request uses local files but lacks "Registered Capital" or "Years in Business" data (e.g., from an incomplete Excel upload), the backend (`financialController.js`) automatically extracts this data from the stored `DBD_Profile.pdf` using a dedicated utility (`backend/utils/pdfExtractor.js`).
*   **Download Links**: The `/download-local` endpoint supports both snake_case (`balance_sheet`) and camelCase (`balanceSheet`) keys to ensure compatibility with the frontend.
