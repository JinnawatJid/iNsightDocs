# Project Structure & Deployment

This document outlines the directory structure used on the production server to ensure data persistence across version updates.

## Server Directory Layout

The application is deployed in a versioned manner under a root project directory.

**Root Directory:** `SP682/` (Located on the server, e.g., `C:\SP682\` or `/home/user/SP682/`)

### 1. Versioned Releases (Ephemeral)
Each deployment creates a new version folder. These folders are **temporary** and may be deleted when upgrading to a newer version to save space.
*   `SP682/SP682_1_4_9/` (Current Version)
*   `SP682/SP682_1_5_0/` (Next Version)

Inside a version folder:
*   `release/`
    *   `backend/` (Server Code - Execution Context)
    *   `dist/` (Frontend Build)
    *   `node_modules/`
    *   `start_server.bat`

### 2. Persistent Data Storage (Permanent)
To prevent data loss during version upgrades, customer files must be stored **outside** the version folders.

**Location:** `SP682/customers/`

**Structure:**
```text
SP682/
└── customers/
    └── {Customer_Code}/       <-- Strictly Customer Code (e.g., CUST001)
        └── {YYYYMMDD}/        <-- Date of download (e.g., 20231027)
            ├── DBD_Profile.pdf
            ├── DBD_BalanceSheet.xlsx
            ├── DBD_IncomeStatement.xlsx
            └── DBD_FinancialRatios.xlsx
```

## Key Rules
1.  **Persistence:** Files in `customers/` must survive when `SP682_x_x_x` folders are deleted.
2.  **Identifier:** Always use **Customer Code** for the folder name. Do not fallback to Tax ID or Name.
3.  **Overwrite:** If data for the same Customer and Date exists, it should be overwritten.
4.  **Date Format:** `YYYYMMDD` (Compact format).
