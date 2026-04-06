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
To prevent data loss during version upgrades, data and logs must be stored **outside** the version folders.

**Locations:**
- `SP682/customers/` (Files)
- `SP682/logs/` (System Logs)

**Structure:**
```text
SP682/
├── customers/
│   └── {Customer_Code}/       <-- Strictly Customer Code (e.g., 00001AY)
│       ├── {YYYYMMDD}/        <-- Date of DBD automation download (e.g., 20260212)
│       │   ├── DBD_Profile.pdf
│       │   ├── DBD_BalanceSheet.xlsx
│       │   ├── DBD_IncomeStatement.xlsx
│       │   └── DBD_FinancialRatios.xlsx
│       └── {Transaction_ID}/  <-- Manually uploaded documents by users for a specific request
│           ├── my_uploaded_file.pdf
│           └── receipt.png
└── logs/                      <-- Rotating application logs
    ├── combined-YYYY-MM-DD.log
    └── error-YYYY-MM-DD.log
```

## Key Rules
1.  **Persistence:** All user-uploaded documents (`customers/`) and system logs (`logs/`) must survive when `SP682_x_x_x` version folders are deleted. The backend must map uploads dynamically to `../../customers` and logs to `../../logs` (via `.env`) to ensure state is decoupled from the current release folder.
2.  **Identifier:** Always use **Customer Code** for the root folder name. Do not fallback to Tax ID or Name.
3.  **Transaction Structure:** For user uploads, any slashes (`/`) in the Transaction ID (e.g., `AYCA2603/06`) must be converted to underscores (`_`) before creating the folder (`AYCA2603_06`) to ensure OS compatibility.
4.  **Date Format (DBD):** `YYYYMMDD` (Compact format).
