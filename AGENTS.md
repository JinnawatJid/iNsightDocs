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
*   **Architecture Verification:** Never infer or assume module locations (e.g. `backend/models`) without inspecting the filesystem via code search or listing tools. This project executes database operations directly via `db.query` rather than ORM/Model abstractions.
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
* **Juristic Entity Name Resolution in Financial Analysis:** When evaluating whether a customer is a juristic entity (`isCompanyByName`), the customer name must be resolved from `CreditRequests.customer_name` (or `req.body.customer_name`) as primary, or top-level snapshot properties (`parsedSnapshot.name || parsedSnapshot.Name || parsedSnapshot.company_name`). **Do NOT** query `parsedSnapshot.customer?.name` because `getSnapshot()` spreads `this.customer` at the snapshot root level, leaving `parsedSnapshot.customer` `undefined`. Resolving an empty name causes `isCompanyByName("")` to return `false`, mistakenly treating corporate entities as individual persons and zeroing out all C2 Cashflow scores.
* **Purchase Statistics Property Key Normalization:** `ExistingCustomerScorecard.js` and `NewCustomerScorecard.js` use `normalizeAccumData()` to support both camelCase (`sumLast6`, `sumLast3`, `slope`, `wadl`) and PascalCase (`SumLast6`, `SecondAccum`, `Slope6`, `WADL`) property keys. This ensures the recommended limit formula $\text{Limit} = (\frac{\text{SumLast6}}{4}) \times (\frac{\text{TotalScore}}{200})^2$ never evaluates to `0` due to casing mismatch.
* **Automatic Credit Score Evaluation on Request Submission:** When submitting a credit request (`createCreditRequest`), if `snapshot_data.credit_score.totalScore` is missing (e.g. when `noFinancialData === true` or when the initiator skipped manual evaluation), `creditRequestController.js` automatically runs `ScoringEngine.score()` to calculate C1, C2 fallback, and C3 purchase history scores. This guarantees that every submitted request in the system always contains a valid `credit_score` object for reviewer screens.
* **Zeroing C2 Scores for Requests Without Financial Statements:** In `NewCustomerScorecard` and `ExistingCustomerScorecard`, when `noFinancialData === true` (or when no financial statements are provided), all C2 Cashflow factors (D/E ratio, Inventory Turnover, DSCR) are explicitly zeroed out (`score = 0`) with `matchedRule = "N/A (ไม่ส่งงบการเงิน)"`. In addition, `creditRequestController.js` always populates an `analysis_result` structure during auto-evaluation so that `StoreStatementTab.vue` renders the main financial analysis summary card.

## 7. Request Sidebar Search & Performance Pagination

* **Sidebar List Optimization:** In `creditRequestController.js`, `getCreditRequests` excludes `snapshot_data` from list SQL queries to keep payload size lightweight (<30ms load time).
* **Multi-Field Search:** SQL search filters across `customer_name`, `customer_no`, and `tx_id` using escaped SQL LIKE parameters.
* **Instant Chunk Loading & Pagination:** `RequestSidebar.vue` fetches an initial 20-item chunk for instant page 1 (10 items/page) rendering, followed by progressive background loading for subsequent items.
* **Layout Background Continuity:** Global `:root` / `body` background is set to `#F5F5F5` and `.pending-requests` container uses `box-sizing: border-box` and `min-height: 100vh` to eliminate white space gaps.
* **Pending Queue Visibility Policy:** Regional Managers (`ผู้พิจารณาของพื้นที่`) have actionable-only pending visibility (fetching `status = Opened` filtered by assigned branch codes via `REGION_BRANCH_CONFIG`). Other approver-chain roles (`broadPendingVisibilityRoles`: Sales, Finance, Credit Committee) see all active open workflow statuses for queue monitoring. See [PENDING_REQUESTS_VISIBILITY_POLICY.md](file:///c:/Users/Jinna/Desktop/Test/iNsightDocs/docs/features/credit_workflow/PENDING_REQUESTS_VISIBILITY_POLICY.md) and [BOARD_ACCESS_USER_VISIBILITY.md](file:///c:/Users/Jinna/Desktop/Test/iNsightDocs/docs/features/core_system/BOARD_ACCESS_USER_VISIBILITY.md).

## 8. Attachment File Path Resolution & Cross-Revision Document Preview

* **Physical File Resolution Architecture:** `fileResolver.js` (`resolveFilePath`) resolves uploaded attachment relative paths from `CreditRequestAttachments.file_path` against physical server storage across multiple candidate base roots (`uploadBase`, `projectRoot/uploads`, `projectRoot/backend/uploads`, `projectRoot/customers`, `process.cwd()/uploads`, etc.).
* **Cross-Revision & Subdirectory Fallback:** When requests undergo revision (e.g. `TLCA6908/01` -> `TLCA6908/01-R1` -> `TLCA6908/01-R2`), attachment DB records inherit original relative paths or new revision path segments. `resolveFilePath` handles:
  1. Primary key lookup in `CreditRequestAttachments` (`WHERE id = ?`) to support preview endpoints regardless of whether the preview modal requests via base TxID or revision TxID.
  2. Revision folder variations (`-R1`, `-R2`, etc.) under customer folders (`uploads/{customer_no}/...`).
  3. 3-part timestamp stripping (`_YYYYMMDD_HHMMSS_rrr.ext`) from DB filenames to extract core keywords.
  4. Token-based substring matching across Thai/English file names (`originalName` and `targetBasename`).
  5. 4-level deep recursive directory fallback scanning across candidate upload roots when exact relative paths fail.
* **Server Root Priority:** `projectRoot` resolution in `creditRequestController.js` prioritizes local release bundle directories (`path.resolve(__dirname, "../../")`) over parent workspace levels to prevent root leakage in production environment builds.

## 9. Financial Extraction Integrity, Inverted Ratio Guards & Remote API Diagnostics

* **Inverted Risk Ratio Guard (D/E Ratio):** In `NewCustomerScorecard.js` and `ExistingCustomerScorecard.js`, D/E ratio evaluates `de <= 1.0` as top-tier. To prevent missing/unextracted statements (`de = 0.00`) from erroneously receiving 11.00 points, the scoring engine checks whether `shareholdersEquity > 0`, `totalLiabilities > 0`, or `deRatio.column` is present. If statements are absent/unextracted, D/E is scored as `0` points with matched rule `"N/A (ไม่มีข้อมูลงบการเงิน)"`.
* **Revision Attachment Cloning Resiliency:** In `creditRequestController.js` (`reviseRequest`), `CreditRequestAttachments` records are always duplicated for the new revision `tx_id` regardless of whether local physical directory copying succeeds. This enables `fileResolver.js` to look up and resolve attachments across parent revision directories.
* **Remote Attachment Inspection & API Re-Trigger:** To inspect attachments and re-evaluate financial analysis on hosted/remote instances (e.g. `http://192.192.0.37:3000`):
  1. Generate an unsigned JWT token payload with a valid user/role (`Credit Committee`) to pass `authMiddleware`.
  2. Fetch request details from `GET /api/credit-requests/:txId/detail` (data is nested under `res.data.data.attachments`).
  3. Stream physical attachments via `GET /api/credit-requests/:txId/files/:fileId`.
  4. Trigger `POST /api/financials/analyze` with `multipart/form-data` containing the actual Excel/PDF files to execute the parser (`findValue`) against current submitted files and re-evaluate scoring.
* **Purchase History Table Rendering:** In `CreditScoreSheet.vue`, `purchaseHistory` items may carry figures under `m.amount` (numeric) or `m.value` (formatted string with commas). `getMonthlyAmount(m)` and `formatMoney()` sanitize commas before conversion to prevent `NaN` or dash fallback.

