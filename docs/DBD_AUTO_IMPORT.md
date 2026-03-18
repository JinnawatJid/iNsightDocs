# DBD Auto Import & Local Bridge Documentation

> **Notice (March 2025 Update):** The interactive UI controls for the DBD Auto Import feature (Auto Download button, Manual Bridge IP setting) are currently **hidden from the user interface** on the frontend (`StoreStatementTab.vue`) using `v-if="false"` to declutter the form based on recent business requirements. The underlying logic, API endpoints, and Local Bridge functionality remain fully intact in the codebase to allow for easy reinstatement in the future. The documentation below describes the system as it operates when the UI is fully enabled.

## Overview

The **DBD Auto Import** feature allows users to automatically download financial documents (Balance Sheet, Income Statement, Financial Ratios) and Company Profiles from the **Department of Business Development (DBD)** DataWarehouse website directly into the Credit Management System.

Due to the security requirements of some deployments, the main application server is hosted in an **Air-Gapped Environment** (no internet access). This prevents the server from directly accessing the DBD website.

To solve this, we utilize a **Local Bridge (Sidecar) Approach**.

## Architecture

### 1. Local Cache Auto-Import (First Priority)
*   **Environment:** Internal Application Server.
*   **Flow:** Client Browser -> API (`/api/financials/check-local/:customer_no`) -> Server Storage (`customers/{customer_no}/`).
*   **Mechanism:** Before attempting to scrape any data, the frontend component (`StoreStatementTab.vue`) automatically checks the backend server to see if DBD files already exist for the customer (e.g., previously downloaded via the Batch Automation process).
    *   If files exist, the system automatically fetches them as Blobs via `/api/financials/download-local/...` and populates the UI inputs, bypassing the scraper entirely.
    *   **New Feature:** The API now parses the `DBD_Profile.pdf` using `extractDBDData` to automatically fill the "Registered Capital" (ทุนจดทะเบียน) and "Years in Business" (ระยะเวลาธุรกิจ) fields in the frontend store if they are currently empty.
    *   If a `DBD_NoFinancialData.txt` marker exists, it flags the customer appropriately.
    *   The UI updates to show a green success banner and greys out the manual download controls to prevent redundant requests.

### 2. Standard Mode (Server-Side Fallback)
*   **Environment:** Server has internet access.
*   **Flow:** Client Browser -> API (`/api/external/dbd-stream`) -> Server (Puppeteer) -> DBD Website.
*   **Mechanism:** The server launches a headless browser, scrapes the files, saves them to a temporary folder, and streams the file URLs back to the client.

### 3. Air-Gapped Mode (Local Bridge Fallback)
*   **Environment:** Server has NO internet access. Client (User's PC) has internet access.
*   **Flow:** Client Browser -> Local Bridge (`localhost:4343`) -> Local Machine (Puppeteer) -> DBD Website.
*   **Mechanism:**
    1.  The User runs a small Node.js application (`bridge-server`) on their own machine.
    2.  The Frontend (`StoreStatementTab.vue`) attempts to connect to `http://localhost:4343/health`.
    3.  If successful, the Frontend sends the scraping request to the Local Bridge instead of the main Server.
    4.  The Local Bridge scrapes the files and returns the **file content as Base64 encoded strings** via Server-Sent Events (SSE).
    5.  The Frontend converts these Base64 strings into JavaScript `File` objects and attaches them to the upload forms.

## Components

### Frontend (`StoreStatementTab.vue`)
-   **Detection:** Automatically checks `localhost:4343` when the user clicks "Auto Download".
-   **Fallback:** If the bridge is not found, it falls back to the Server-Side API (which will fail in an air-gapped environment, but works in dev/standard envs).
-   **Data Handling:** Handles two types of responses:
    -   **URL-based:** `{ files: { profile: { url: '...' } } }` (Standard Mode)
    -   **Content-based:** `{ data: { profile: { content: 'Base64...', mime: '...' } } }` (Bridge Mode)
-   **Manual Bridge IP:** Users can specify a custom IP (e.g., VPN IP) via the settings icon if `localhost` connectivity is blocked by network policies.

### Bridge Application (`bridge-server/`)
-   **Location:** `/bridge-server` in the project root.
-   **Tech Stack:** Node.js, Express, Puppeteer.
-   **Endpoints:**
    -   `GET /health`: Returns `{ status: 'ok' }`.
    -   `GET /stream?taxId=...`: Initiates the scraping process.
-   **Configuration:**
    -   Binds to `0.0.0.0` (All interfaces) to support VPN/LAN connections.
    -   Supports **Private Network Access (PNA)** via CORS headers.
-   **Logic:**
    -   Launches a hidden Chrome browser.
    -   Navigates to `datawarehouse.dbd.go.th`.
    -   Handles popups, CAPTCHA (limited), and navigation.
    -   Downloads the 4 required files (Profile PDF + 3 Excel files).
    -   Reads the downloaded files into memory.
    -   Sends them back to the caller via an SSE stream.
    -   Cleans up temporary files.

## Maintenance Guide

### Updating the Scraper
If the DBD website changes its layout (which happens occasionally), the scraping logic needs to be updated.
1.  **Locate the Logic:**
    -   **Server-Side:** `backend/controllers/externalController.js`
    -   **Bridge-Side:** `bridge-server/server.js`
    -   *Note: Both files share very similar logic. Ensure updates are applied to BOTH.*
2.  **Common Issues:**
    -   **Selectors:** XPath or CSS selectors might change. Look for `page.click(...)` or `page.evaluate(...)`.
    -   **Popups:** New promotional banners might block clicks. Update `handlePopups()`.
    -   **Timing:** Slow network conditions might cause timeouts. Increase `page.waitFor...` timeouts.

### Deploying the Bridge to Users
1.  **Package:** Zip the `bridge-server` folder.
2.  **Distribute:** Send the Zip file to users.
3.  **User Instructions:**
    -   Install Node.js (LTS version).
    -   Unzip the folder.
    -   Open a terminal/command prompt inside the folder.
    -   Run `npm install` (first time only).
    -   Run `npm start` before using the Credit System.

## Troubleshooting

-   **"Local Bridge not found":** Ensure the user has started the bridge server (`npm start`) and the terminal shows "Running on http://localhost:4343".
-   **"Connection Refused":** Check if a firewall is blocking port 4343 on the local machine.
-   **"Puppeteer Error":** If the bridge fails to launch the browser, ensure Chrome is installed or allow `npm install` to download Chromium.

### Hosted App & VPN (Private Network Access)

If the web application is hosted on a server (e.g., `192.168.1.50`) but the user is running the Bridge locally (`127.0.0.1` or `10.10.x.x`), browsers (Chrome/Edge) may block the connection due to **Private Network Access (PNA)** security policies.

**Symptoms:**
- The bridge is running (`http://localhost:4343` works in a separate tab).
- The web app (on HTTP) cannot connect to the bridge.
- Console shows: `Block insecure private network requests`.

**Solution:**
1.  **Frontend Setting:** Click the **Gear Icon (⚙️)** in the DBD Auto Import section and enter your machine's VPN/LAN IP (e.g., `10.10.10.5`). Do not use `localhost`.
2.  **Browser Configuration (Chrome/Edge):**
    -   Open `chrome://flags` or `edge://flags`.
    -   Search for **"Local Network Access Checks"** (previously "Block Insecure Private Network Requests").
    -   Set it to **Disabled**.
    -   Click **Relaunch**.
3.  **Bridge Server:** Ensure the bridge server is listening on `0.0.0.0` (this is the default in the updated version).

**Technical Details:**
- The bridge server sends `Access-Control-Allow-Private-Network: true` to satisfy the PNA preflight check.
- The browser flag is currently required because the spec is still evolving and browsers default to strict blocking for mixed-content (Public/Private) on HTTP.
