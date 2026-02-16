# Batch Credit Automation Implementation Guide

## 1. Overview
The **Batch Credit Automation** feature allows users to upload an Excel file containing a list of customer IDs. The system then automatically:
1.  Fetches customer details from the ERP API.
2.  Connects to the **Local DBD Bridge** to download financial documents (Balance Sheet, Income Statement, etc.).
3.  Analyzes the financial data to generate a **Credit Score** and **Recommended Limit**.
4.  Exports the results into a summary Excel report.

**Location:** `/batch-automation` (Hidden/Admin Route)

## 2. Architecture
The system uses a **Frontend-Coordinator Pattern**. Since the browser automation (Puppeteer) runs on the client's machine (via the Local Bridge), the Vue.js frontend acts as the queue manager and worker pool controller.

### Components:
*   **Frontend (`BatchAutomation.vue`):** Manages the queue, UI state, and concurrent worker pool (2-8 workers).
*   **Local Bridge (Port 4343):** A standalone Node.js app running on the user's machine that controls the browser to scrape DBD data.
*   **Backend API (`/api/financials/analyze`):** Performs the financial ratio calculations and scoring.

## 3. Data Flow

1.  **Input:** User uploads `.xlsx`. System looks for `Customer ID` or `No_` column.
2.  **Queue:** A list of customers is generated with status `Pending`.
3.  **Processing Loop (Concurrent Worker Pool):**
    *   The system spawns `N` workers (defined by user, default 2).
    *   Each worker picks the next `Pending` customer from the shared queue.
    *   **Step A (Fetch):** Query `CustomerService.searchCustomers(id)` to get Tax ID, Payment Terms, and Current Limit.
        *   *Rule:* If **Tax ID is missing**, the status is set to `Skipped` (Option A).
    *   **Step B (Bridge):** Connect to `http://<BRIDGE_IP>:4343/stream` via Server-Sent Events (SSE).
        *   The bridge opens a browser instance (isolated via unique temp directory), logs in, downloads the 4 files, and streams them back as Base64.
        *   *Retry:* If connection fails or times out, it retries up to 2 times.
    *   **Step C (Analyze):** The 4 files are sent to the backend API.
    *   **Step D (Result):** The computed Score and Limit are saved to the queue item.
4.  **Export:** User clicks "Export Report" to generate an Excel file with all results.

## 4. Key Implementation Details

### Concurrency
*   **Worker Pool:** The frontend allows users to set a concurrency level (1-8).
*   **Isolation:** The Bridge Server (`bridge-server`) creates a unique temporary directory for each request (`dbd-bridge-{timestamp}-{randomId}`) to prevent file conflicts when multiple browsers are downloading files simultaneously.

### File Upload
We use `xlsx` library to parse the browser-side file.
```javascript
const workbook = XLSX.read(data, { type: 'array' });
const jsonData = XLSX.utils.sheet_to_json(worksheet);
```

### Bridge Integration (SSE)
We use `EventSource` to listen for progress updates from the bridge.
*   **Host Configuration:** Stored in `localStorage` key `bridgeHost`. Defaults to `localhost`.
*   **PNA (Private Network Access):** If the user is on `https` or a different IP, Chrome may block access to `localhost`. The UI includes a "Check Connection" feature to diagnose this.

### Error Handling
*   **Missing Tax ID:** Immediately skipped. Logged as "Missing Tax ID (Option A)".
*   **Bridge Failure:** Retried 2 times with a 2-second delay. If all fail, marked as `Error`.
*   **Analysis Failure:** If the API returns success:false, marked as `Error`.

## 5. Maintenance & Debugging

### Common Issues
1.  **"Unreachable ❌" Status:**
    *   Check if the Bridge App is running (Black console window).
    *   Check if `bridgeHost` is correct (e.g., `localhost` vs `192.168.x.x`).
    *   Check Browser Console for "Private Network Access" errors.

2.  **Bridge stops mid-process:**
    *   The bridge handles one request at a time. If the user closes the browser window manually, the current item fails, and the loop moves to the next.

3.  **Captcha/Login Failures:**
    *   The bridge requires a valid DBD account. If the password changes or Captcha becomes too hard, the bridge logic (`bridge-server`) needs updating.

### Updating Logic
*   **Frontend Logic:** `src/views/BatchAutomation.vue`
*   **Backend Analysis:** `backend/controllers/financialController.js`
*   **Bridge Logic:** `bridge-server/server.js` (Separate deployment)

## 6. Deployment
This view is **hidden** by default. To make it accessible to general users, add a navigation link in `src/components/Sidebar.vue` pointing to `/batch-automation`.

## 7. Export Logic & Business Rules

### Full Detail Report Requirements
When exporting the "Full Detail" report, the system must adhere to the following specific business rules:

1.  **Branch Extraction (สาขา):**
    *   The branch code is **always** the last 2 characters of the Customer ID.
    *   Format: `XXXXXYY` -> Branch is `YY`.

2.  **Financial Ratios:**
    *   **Capacity Check (สัดส่วนยอดซื้อเฉลี่ย 1.5 เดือนย้อนหลัง 3 เดือน):** This value corresponds to the backend calculation `Average 1.5 Months` (Sum of Last 3 Months / 2) divided by the Requested Credit Amount. It matches the logic used for the "Capacity Check" score.

3.  **Sales History Layout:**
    *   **Timeline Logic:** The system generates a continuous timeline of the last **6 completed months** + the **Current Month** (Total 7 columns).
    *   **Gap Filling:** Any month with missing data from the API is explicitly filled with **0.00** to ensure a strictly continuous timeline.
    *   **Exclusion:** The **Current Month** (the 7th item) is excluded from financial calculations (Average, Slope) but is displayed in the UI/Report for reference.
    *   **Order:** Columns must be ordered from **Oldest (Left)** to **Newest (Right)**.
    *   **Spacer:** There must be an empty spacer column between the analysis data and the sales history columns to visually separate the sections.

### Summary Report
The standard report includes:
*   Customer ID, Name, Tax ID
*   Total Purchase (Last 3 Months)
*   Credit Term, Current Limit, Recommended Limit
*   Score, Grade, Status
