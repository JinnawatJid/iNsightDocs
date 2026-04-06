# DBD Scraping & Data Extraction Workflow

This document details the technical, step-by-step process of how the Credit Management System automates the downloading and parsing of Department of Business Development (DBD) financial documents.

> **Note:** For a high-level overview of the feature's architecture (including Server-side vs. Local Bridge modes), please refer to [`DBD_AUTO_IMPORT.md`](./DBD_AUTO_IMPORT.md).

---

## 1. Sequence Diagram: Overall Interaction

The following sequence diagram illustrates the communication flow between the Frontend, the Scraper (either the Backend Server or the Local Bridge), Puppeteer, and the external DBD website.

```mermaid
sequenceDiagram
    participant UI as Frontend (Vue)
    participant API as API / Local Bridge
    participant Browser as Puppeteer (Headless Chrome)
    participant DBD as datawarehouse.dbd.go.th

    UI->>API: 1. Request Download (Tax ID / Name)
    Note over API: Uses SSE (Server-Sent Events)<br/>for real-time status updates.
    API-->>UI: 2. Status: "กำลังเปิดเบราว์เซอร์..."

    API->>Browser: 3. Launch & Configure Download Path (tmp/)
    Browser->>DBD: 4. Navigate to DataWarehouse URL
    API-->>UI: 5. Status: "กำลังเชื่อมต่อ..."

    DBD-->>Browser: Page Loaded
    Note over Browser: 6. Evaluate JS to detect<br/>and close Popups/Cookies.

    Browser->>DBD: 7. Type Search Query & Press Enter
    API-->>UI: 8. Status: "กำลังรอผลการค้นหา..."

    DBD-->>Browser: Search Results / Profile Page

    Note over Browser, DBD: 9. Profile PDF Extraction
    Browser->>DBD: Click Print Profile
    DBD-->>Browser: Download DBD_Profile.pdf to tmp/
    Note over API: Poll tmp/ folder until<br/>.pdf is detected.

    Note over Browser, DBD: 10. Financial Excel Extraction
    Browser->>DBD: Click "ข้อมูลงบการเงิน" Tab

    alt No Financial Data Found
        DBD-->>Browser: "ไม่พบข้อมูล" Text Visible
        API-->>UI: Status: "ไม่มีงบการเงินในระบบ" (Skip Excel)
    else Financial Data Exists
        Browser->>DBD: Click "งบการเงิน" (Balance Sheet) -> Print Excel
        DBD-->>Browser: Download .xlsx
        Note over API: Poll tmp/, rename to BalanceSheet.xlsx

        Browser->>DBD: Click "งบกำไรขาดทุน" (Income) -> Print Excel
        DBD-->>Browser: Download .xlsx
        Note over API: Poll tmp/, rename to IncomeStatement.xlsx

        Browser->>DBD: Click "อัตราส่วนทางการเงิน" (Ratios) -> Print Excel
        DBD-->>Browser: Download .xlsx
        Note over API: Poll tmp/, rename to FinancialRatios.xlsx
    end

    API->>API: 11. Parse PDF / Excel Files
    API-->>UI: 12. Return Data (Base64 or URLs) + Status: "Complete"
```

---

## 2. Step-by-Step Technical Workflow

Both the Server-side fallback (`externalController.js`) and the Local Bridge (`bridge-server/server.js`) share the exact same Puppeteer automation logic.

### 2.1 Browser Configuration
Puppeteer is launched in headless mode. Crucially, the download behavior is intercepted via the Chrome DevTools Protocol (`Page.setDownloadBehavior`). This forces all downloaded files to bypass the standard browser download prompt and save directly into a dynamically generated, unique temporary directory (`/tmp/dbd-[timestamp]-[random]/`).

### 2.2 Navigation & Popup Handling
1. The browser navigates to `https://datawarehouse.dbd.go.th/`.
2. **Popup Mitigation:** The site frequently displays promotional banners or cookie consent overlays. A utility function (`handlePopups`) simulates pressing the `Escape` key and uses `page.evaluate()` to scan the DOM for common close buttons (text containing "Close", "ปิด", "X") or consent buttons ("ยอมรับทั้งหมด"), clicking them programmatically.

### 2.3 Search Execution
The automation locates the search bar using CSS selectors (`input[placeholder*="ค้นหาด้วยชื่อ"]`). To ensure reliability:
* It clicks the input three times and presses `Backspace` to clear any existing text.
* It types the search query (Tax ID or Name) with a slight delay (`delay: 100ms`) to mimic human input.
* It verifies the input value matches the query before pressing `Enter`.

### 2.4 File Download Verification (Polling Mechanism)
Because file downloads are asynchronous and network-dependent, the system cannot simply "wait 5 seconds" after clicking a download button. Instead, it uses a **file system polling loop**:
1. After a download is triggered, a `while` loop starts with a maximum timeout (e.g., 60 seconds).
2. Inside the loop, `fs.readdir` checks the temporary directory every 500 milliseconds.
3. The system looks for files matching the expected extension (e.g., `f.toLowerCase().endsWith('.xlsx')`).
4. **Renaming Strategy:** Since the DBD website generates arbitrary filenames for Excel files, the scraper immediately renames the first detected `.xlsx` file (e.g., to `BalanceSheet.xlsx`). When downloading the next file (Income Statement), the loop specifically looks for a *new* `.xlsx` file that does *not* include the previously renamed string.
5. If the timeout is reached before the file appears, an error is thrown and propagated to the UI.

### 2.5 Data Parsing Mechanics

Once files are secured on the local disk, the system extracts structural data.

#### PDF Parsing (`pdfExtractor.js` / `externalController.js`)
* The PDF is read into memory, and `pdf-parse` extracts the raw text.
* The system uses **Regular Expressions (Regex)** to locate specific anchors. For example, it searches for `วันที่จดทะเบียนจัดตั้ง` (Registration Date).
* Once the anchor is found, it uses capturing groups to extract the adjacent data string (e.g., the date format `dd/mm/yyyy` or the numeric string for Registered Capital).

#### Excel Parsing (`dbdExcelParser.js`)
* The `.xlsx` files are read into a Node.js `Buffer` using `fs.readFileSync(filePath)`. This specific approach prevents ZIP corruption errors (`end of central directory record signature not found`) that occur when the `xlsx` library attempts to stream raw paths on certain OS environments.
* **Dynamic Header Resolution:** The parser converts the sheet to a JSON array. It scans the first 15 rows using a Regex pattern (`/(25\d{2}|20\d{2})/`) to find the row containing the years (e.g., 2564, 2565).
* **Data Mapping:** It iterates through the subsequent rows. It uses the first column (`row[0]`) or second column (`row[1]`) to determine the "Metric Name" (e.g., "สินทรัพย์รวม"). It then maps the values in adjacent columns back to the years identified in the header row.
