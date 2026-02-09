# DBD Caching Strategy

This document outlines the strategy for caching DBD (Department of Business Development) financial documents to improve performance and reduce redundant external downloads.

## Purpose

Downloading financial documents (Balance Sheet, Profit & Loss, Ratios) via the Bridge/DBD is a time-consuming process involving CAPTCHA solving and navigation. Caching these files allows subsequent analyses for the same customer to be nearly instantaneous.

## File Directory Strategy

To ensure cache persistence across application updates and deployments, the cache directory is located **outside** the versioned project root.

### 1. Root Directory Location

The system determines the root cache directory in the following order:

1.  **Environment Variable:** `DBD_CACHE_PATH` (Recommended for Production)
    *   Set this on the server to a permanent path (e.g., `D:\CreditApp\Data\dbd_cache` or `/var/lib/credit-app/dbd_cache`).
2.  **Default Fallback:** `../../../../dbd_cache` (Relative to `backend/services/dbdCacheService.js`)
    *   This places the `dbd_cache` folder parallel to the main project folder.
    *   Example:
        ```
        /Apps/
          ├── SP682_1_4_9/       <-- Current App Version
          ├── SP682_1_4_10/      <-- Future App Version
          └── dbd_cache/         <-- Persistent Cache
        ```

### 2. Folder Structure

Files are organized by **Customer Code** and **Fiscal Year**.

```
dbd_cache/
├── 01013AY/                 <-- Customer Code (Sanitized)
│   ├── 2024/                <-- Fiscal Year (Calendar Year of Download)
│   │   ├── balance_sheet.xlsx
│   │   ├── profit_loss.xlsx
│   │   └── financial_ratios.xlsx
│   └── 2025/
│       └── ...
├── 02045BB/
│   └── ...
```

### 3. Versioning Logic

*   **Fiscal Year:** The system currently uses the calendar year (`new Date().getFullYear()`) as the version key.
*   **Validity:** If files exist for the current year, they are considered valid and used. If not, a new download is triggered.

## Implementation Details

*   **Service:** `backend/services/dbdCacheService.js` handles all file I/O.
*   **Sanitization:** Customer Codes are sanitized (alphanumeric only) before being used as folder names to prevent file system errors.
