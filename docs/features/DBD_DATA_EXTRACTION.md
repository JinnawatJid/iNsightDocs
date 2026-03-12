# DBD Data Extraction Feature

## Overview
The **DBD Data Extraction Feature** enables the Credit Management System to read, parse, and display structural data from downloaded Department of Business Development (DBD) files. This includes:
1. **Financial Excel Parsing**: Extracting Balance Sheets, Income Statements, and Financial Ratios directly from downloaded `.xlsx` files. This is primarily used by approvers on the `/pending-requests` dashboard (specifically within the `ReviewDashboard.vue` component) to view a company's financial health via a UI modal.
2. **Profile PDF Parsing**: Extracting basic company info (Registration Date, Registered Capital, Company Name, and Directors) from the `DBD_Profile.pdf` file. This data is utilized for populating frontend state and generating the "ข้อมูลนิติบุคคล (DBD Profile)" section in the exported Credit Request PDFs.

---

## Architecture

### 1. Excel Parsing Data Flow
1. **Trigger:** A user (Approver) opens a pending credit request for a corporate customer.
2. **Status Check:** The UI (`ReviewDashboard.vue`) calls `GET /api/financials/check-local/:customer_no` to determine if the local server has the required DBD documents stored in `/customers/{customer_no}/[DATE]/`.
3. **Data Request:** When the user clicks "ดูรายละเอียดงบการเงิน" (View Financial Details), the UI calls `GET /api/financials/:customer_no/dbd-data`.
4. **Backend Parsing:** The `financialController.js` delegates the file reading to `backend/utils/dbdExcelParser.js`. The parser reads the `.xlsx` files into memory buffers and extracts the structured tabular data.
5. **UI Rendering:** The structured JSON is sent back to the frontend and rendered in `FinancialStatementModal.vue`, utilizing dynamic tabs, color-coded percentage changes, and formatted currency values.

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

---

## Known Obstacles & Troubleshooting Guide (Maintenance Handoff)

During the development of this feature, several critical edge cases and bugs were encountered. Maintenance teams should reference this guide before making modifications to the parsing logic or the UI.

### 1. The "Missing Files" UI Bug (API Route Mismatch)
* **Symptom:** Documents exist on the server, and the Excel parsing modal works, but the four document status badges (Profile, Position, Income, Ratios) on `ReviewDashboard.vue` show as "ไม่มีข้อมูล" (Missing).
* **Root Cause:** A mismatch between the frontend API call (`/api/financials/${customer_no}/check-local`) and the backend Express route definition (`/api/financials/check-local/:customer_no`). The mismatch caused Express to return a 404 HTML page instead of JSON, resulting in a falsy `response.data.exists` evaluation.
* **Resolution:** Ensure UI API paths perfectly match the `financialRoutes.js` definitions. The current correct path for checking status is `GET /api/financials/check-local/:customer_no`.

### 2. `xlsx` Library "Central Directory" ZIP Error
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
  * `src/components/credit/ReviewDashboard.vue`
  * `src/components/credit/FinancialStatementModal.vue`