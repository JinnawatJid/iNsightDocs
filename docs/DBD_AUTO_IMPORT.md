# DBD Auto Import & Local Bridge Documentation

## Overview

The **DBD Auto Import** feature allows users to automatically download financial documents (Balance Sheet, Income Statement, Financial Ratios) and Company Profiles from the **Department of Business Development (DBD)** DataWarehouse website directly into the Credit Management System.

Due to the security requirements of some deployments, the main application server is hosted in an **Air-Gapped Environment** (no internet access). This prevents the server from directly accessing the DBD website.

To solve this, we utilize a **Local Bridge (Sidecar) Approach**.

## Architecture

### 1. Standard Mode (Server-Side)
*   **Environment:** Server has internet access.
*   **Flow:** Client Browser -> API (`/api/external/dbd-stream`) -> Server (Puppeteer) -> DBD Website.
*   **Mechanism:** The server launches a headless browser, scrapes the files, saves them to a temporary folder, and streams the file URLs back to the client.

### 2. Air-Gapped Mode (Local Bridge)
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

### Bridge Application (`bridge-server/`)
-   **Location:** `/bridge-server` in the project root.
-   **Tech Stack:** Node.js, Express, Puppeteer.
-   **Endpoints:**
    -   `GET /health`: Returns `{ status: 'ok' }`.
    -   `GET /stream?taxId=...`: Initiates the scraping process.
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
