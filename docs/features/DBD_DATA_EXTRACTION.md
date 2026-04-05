# DBD Data Extraction Feature

## Overview
The **DBD Data Extraction Feature** enables the Credit Management System to read, parse, and display structural data from downloaded Department of Business Development (DBD) files. This includes:
1. **Financial Excel Parsing**: Extracting Balance Sheets, Income Statements, and Financial Ratios directly from downloaded `.xlsx` files. This is primarily used by approvers on the `/pending-requests` dashboard (specifically within the `ReviewDashboard.vue` component in `src/components/credit/dashboard/`) to view a company's financial health via a UI modal.
2. **Profile PDF Parsing**: Extracting basic company info (Registration Date, Registered Capital, Company Name, and Directors) from the `DBD_Profile.pdf` file. This data is utilized for populating frontend state and generating the "ข้อมูลนิติบุคคล (DBD Profile)" section in the exported Credit Request PDFs.

---

## Architecture

### 1. Data Flow (Excel & PDF Parsing)
1. **Trigger:** A user (Approver) opens a pending credit request for a corporate customer.
2. **Status Check:** The UI (`ReviewDashboard.vue`) calls `GET /api/financials/check-local/:customer_no` to determine if the local server has the required DBD documents stored in `/customers/{customer_no}/[DATE]/`.
3. **Data Request (Financial Data):** When the user clicks "ดูรายละเอียดงบการเงิน" (View Financial Details), the UI opens the `FinancialStatementModal.vue` (in `src/components/credit/modals/`) and defaults to the "ข้อมูลนิติบุคคล" (Company Profile) tab. For other tabs (Balance Sheet, Income Statement, Ratios), the UI calls `GET /api/financials/:customer_no/dbd-data`.
4. **Backend Parsing (Financial Data):** The `financialController.js` delegates the file reading to `backend/utils/dbdExcelParser.js`. The parser reads the `.xlsx` files into memory buffers and extracts the structured tabular data.
5. **Data Request (Profile PDF):** For the "ข้อมูลนิติบุคคล" tab, the UI calls `GET /api/financials/download-local/:customer_no/profile` to fetch the `DBD_Profile.pdf` file as a blob.
6. **UI Rendering:** The structured JSON for financial data is rendered in `FinancialStatementModal.vue` using dynamic tabs, color-coded percentage changes, and formatted currency values. The Profile PDF is rendered securely using an object URL in an `iframe` within the same modal.

### 2. File Parsing Mechanism (`dbdExcelParser.js` & `pdfExtractor.js`)
#### Excel Parser (`dbdExcelParser.js`)
The core extraction logic for financial tables utilizes the `xlsx` NPM library.
* **Buffer Mode:** Files are read synchronously using `fs.readFileSync(filePath)` to create a raw buffer, which is then passed to `xlsx.read(buffer, { type: 'buffer' })`. This completely bypasses the `Error: end of central directory record signature not found` (ZIP format error) that occurs when the `xlsx` library attempts to stream or read certain specific file paths directly on some OS configurations.
* **Dynamic Year Extraction:** DBD Excel files do not always have clean "2564", "2565" headers. They often contain text (e.g., "ปี 2565"). The parser uses the regex `/(25\d{2}|20\d{2})/` to safely scan the header row and dynamically identify which columns contain the 3 years of financial data.
* **Metric Mapping:** The parser scans down the first column (`row[0]`) to identify key financial metrics (e.g., "สินทรัพย์รวม", "กำไร (ขาดทุน) สุทธิ"). However, in specific sheets like "Financial Ratios", the first column contains numeric row indices (1, 2, 3...) and the actual metric name resides in the second column (`row[1]`). The parser intelligently falls back to `row[1]` if `row[0]` is empty or strictly numeric. It extracts the absolute values ("จำนวนเงิน") and percentage changes ("%เปลี่ยนแปลง") for the identified year columns while filtering out sub-headers (e.g. "อัตราส่วนแสดง...").

#### PDF Profile Parser (`pdfExtractor.js`)
The `extractDBDData` function utilizes the `pdf-parse` library to extract raw text from `DBD_Profile.pdf` buffers. It employs pattern matching (Regex) to extract data:
* **Company Name:** Looks for entity prefixes (บริษัท, หจก., etc.) or explicitly the `ชื่อนิติบุคคล:` label.
* **Registration Date:** Scans for the `วันที่จดทะเบียนจัดตั้ง` label and extracts the nearest valid `dd/mm/yyyy` date.
* **Registered Capital:** Scans for the `ทุนจดทะเบียน` label and extracts the nearest large comma-separated numeric value.
* **Directors (กรรมการ):** Locates the `รายชื่อกรรมการ` or `กรรมการ` label, scans the subsequent lines, and matches name prefixes (นาย, นาง, นางสาว, etc.) until it hits the next major section (like `อำนาจกรรมการ`).
* **Path Lookup:** When generating PDFs via `pdfController.js`, the system does not look for the `DBD_Profile.pdf` at the base customer directory. Instead, it dynamically reads the `customers/{customer_no}/` directory, identifies the latest date-stamped folder (e.g., `20260310`), and extracts the PDF from within that latest folder to ensure data freshness.

### 3. PDF PDF Generation (`pdfController.js`)
When generating the final Credit Request PDF, the system dynamically injects the parsed financial data (from `dbdExcelParser.js`) into a structured table.
* **Metric Mapping (Search vs. Display):** The DBD Excel files use long, specific strings (e.g., "อัตราส่วนหนี้สินรวมต่อส่วนของผู้ถือหุ้น (เท่า)"). To keep the PDF clean, the `targetMetrics` configuration in `pdfController.js` uses a `{ searchKey, displayLabel }` structure. This allows the backend to search the exact string required to parse the Excel file (`searchKey`), but output a much shorter, human-readable string (`displayLabel`, e.g., "หนี้สินรวมต่อผู้ถือหุ้น (เท่า)") in the generated PDF document.
* **Ratio Formatting:** Standard financial amounts are formatted as currency with 0 decimal places. However, financial ratios (defined in the `financialRatios` array) are explicitly formatted using a `formatRatio` helper to ensure they always display with exactly 2 decimal places.
* **Dynamic Table Widths:** To ensure metric labels (like "อัตราส่วนทุนหมุนเวียน (เท่า)") stay on a single line without wrapping, the first column of the financial table is given a relative width (e.g., `26%`), while the remaining year columns dynamically fill the remaining space (`*`).

---

## Known Obstacles & Troubleshooting Guide (Maintenance Handoff)

During the development of this feature, several critical edge cases and bugs were encountered. Maintenance teams should reference this guide before making modifications to the parsing logic or the UI.

### 1. The "Missing Files" UI Bug (API Route Mismatch)
* **Symptom:** Documents exist on the server, and the Excel parsing modal works, but the four document status badges (Profile, Position, Income, Ratios) on `ReviewDashboard.vue` show as "ไม่มีข้อมูล" (Missing).
* **Root Cause:** A mismatch between the frontend API call (`/api/financials/${customer_no}/check-local`) and the backend Express route definition (`/api/financials/check-local/:customer_no`). The mismatch caused Express to return a 404 HTML page instead of JSON, resulting in a falsy `response.data.exists` evaluation.
* **Resolution:** Ensure UI API paths perfectly match the `financialRoutes.js` definitions. The current correct path for checking status is `GET /api/financials/check-local/:customer_no`.

### 2. Missing Company Profile in Manual Upload (Frontend Payload)
* **Symptom:** A user manually uploads all 4 DBD documents (Profile, Balance Sheet, P&L, Ratios) in the Store Statement tab and clicks "Analyze". The Excel files parse correctly, but the "DBD Profile" shows up as missing/yellow on the pending requests page, and the backend logs "File NOT FOUND" for `DBD_Profile.pdf`.
* **Root Cause:** The `companyProfile` file was omitted from the `FormData` appended in the `analyzeFinancials` method of `StoreStatementTab.vue`. Only the three Excel files were being sent to the `/api/financials/analyze` backend endpoint.
* **Resolution:** Explicitly append the `companyProfile` to the `FormData` object as `company_profile` before issuing the POST request. This ensures the backend receives the file, saves it to the `customers/{customer_no}/{date}/` directory, and successfully extracts fallback data like Registered Capital and Years in Business.

### 3. `xlsx` Library "Central Directory" ZIP Error
* **Symptom:** The backend crashes with `Error: end of central directory record signature not found` when attempting to parse the Excel files.
* **Root Cause:** The `xlsx.readFile(filepath)` method occasionally struggles with file descriptors or slight stream corruptions created by Puppeteer downloads.
* **Resolution:** *Do not* use `xlsx.readFile()`. The parser must strictly use `fs.readFileSync()` to load the file into a Node.js `Buffer` first, and then use `xlsx.read(buffer, { type: 'buffer' })`.

### 3. Stale API Responses (The 304 Not Modified Issue)
* **Symptom:** A user uploads new DBD files, but the UI still shows them as missing, even after refreshing.
* **Root Cause:** Express.js automatically generates `ETag` headers for JSON responses. Browsers cache this and send `If-None-Match` headers on subsequent requests. If the file path structure didn't change (only the file contents), Express returns a `304 Not Modified`, serving the old "missing" state to the frontend.
* **Resolution:** The `checkLocalFiles` controller aggressively strips caching headers:
  ```javascript
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  delete req.headers['if-none-match'];
  delete req.headers['if-modified-since'];
  ```
  Additionally, the frontend appends a timestamp cache-buster to the GET request (`?t=${new Date().getTime()}`). Do not remove these mechanisms.

### 4. Target Path Resolution
* **Symptom:** Files are successfully downloaded via `/batch-automation` but the parsing API cannot find them, logging `[DEBUG] File NOT FOUND`.
* **Root Cause:** The `financialController.js` and `dbdExcelParser.js` must resolve paths relative to the project root, not the current directory of the script.
* **Resolution:** The `customers/` directory lives at the absolute project root (alongside `backend/` and `src/`). Scripts must use `path.resolve(__dirname, '../../../../customers')` (to support production deployments where the backend is nested in `dist/`) and gracefully fallback to `../../customers` for local development. Furthermore, always sanitize inputs using `path.basename(customer_no)` to prevent path traversal attacks.

---

## File References
* **Backend Utilities:** `backend/utils/dbdExcelParser.js`, `backend/utils/pdfExtractor.js`
* **Backend Controllers:**
  * `backend/controllers/financialController.js` (`getDBDData`, `checkLocalFiles`)
  * `backend/controllers/pdfController.js` (Export PDF logic, Profile info injection)
* **Frontend UI Components:**
  * `src/components/credit/dashboard/ReviewDashboard.vue`
  * `src/components/credit/modals/FinancialStatementModal.vue`
