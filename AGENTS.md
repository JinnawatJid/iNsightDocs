# Agent Guidelines & Protocols

This file contains critical instructions and protocols for any AI agent or developer working on this repository.

## 1. Stability & Persistence Protocol (Atomic Commits)

**CRITICAL WARNING:** The development environment is susceptible to "Filesystem Reversion" during heavy process executions.

### Symptom
Files created but not yet committed may disappear if the environment resets or "crashes" (e.g., during a resource-intensive `npm install` or `npm start`).

### Protocol
*   **Atomic Commits:** Do not accumulate multiple uncommitted file creations.
*   **Immediate Persistence:** After creating a significant file or completing a logical step, **immediately commit** the change (or verify it is saved to disk and persistent).
*   **Resource Management:** Do not run heavy commands like `npm install` or `npm start` while the workspace contains valuable, uncommitted work. Commit first, then run commands.

## 2. Project Structure

*   `backend/`: Node.js backend (Express, SQLite/MSSQL).
*   `src/`: Vue.js frontend (Vite).
*   `docs/`: Documentation (organized by type).

## 3. General Directives
*   **Verification:** Always verify file creation and content using `read_file` or `list_files` before marking a task as complete.
*   **Testing:** Run relevant tests (or verify manually via `curl` for backend / Playwright for frontend) before submitting.

## 4. Verification Protocol for Autonomous Agents

**CRITICAL WARNING:** This project depends heavily on external infrastructure (Exchange Platforms, SSO Authentication Hubs, active VPN connections to internal corporate DBs, DBD Data Bridge API) that are **inaccessible** from isolated sandbox environments.

### Strict Verification Rules:
1. **DO NOT** attempt to execute automated end-to-end (E2E) UI verification scripts (e.g., Playwright, Puppeteer, Selenium) or start the frontend/backend servers for the purpose of visual verification.
2. The sandbox environment **will freeze or timeout** when attempting to load the frontend or reach backend endpoints, due to missing external APIs and SSO authentication requirements.
3. **Mandatory Protocol:** You must **bypass** any standard automated frontend verification or server testing steps.
4. Instead of running scripts, you must rely **exclusively** on rigorous **manual code review and static code auditing** to verify your logic.

## 5. Workflow Timeline Component
* **Timeline Rendering Logic:** The visual workflow timeline (`RequestTimeline.vue`) determines the required approval steps (e.g., Credit Committee vs. Finance Manager) by evaluating the `originalRequestedAmount` from the `creditRequest` Pinia store. This ensures the timeline consistently reflects the initial routing path, even if the final approved amount is later negotiated downwards.

## 6. Scorecard Selection and Override Modal Recalculation

* **Scorecard Strategy Resolution:** The system dynamically selects either the `NewCustomerScorecard` or the `ExistingCustomerScorecard` based on the request type and the presence of existing customer credit limit/history in the store (`currentModelType` getter in `creditRequest.js` store).
* **Override Weights Modal Recalculation:** When reviews recalculate or preview overridden weights inside the modal, they call the `/api/financials/analyze` POST API. This API requires the correct customer details:
  * `customer_no` must be retrieved via `store.customer?.id || store.customer?.No_` (fallback path, as snapshot fields vary).
  * `tax_id` must be passed explicitly from `store.customer?.tax_id || store.customer?.['VAT Registration No_'] || store.customer?.vat_registration_no` to avoid failing queries under sandboxed/UAT environments.
  * `registered_capital`, `customer_duration`, and `wadl` must be read from the correct state locations (i.e., `store.customer` and `store.financialSummary`) rather than `store.transactionData` (which does not store customer profile/API metrics).
