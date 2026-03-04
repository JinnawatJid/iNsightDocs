# DBD Local Bridge

This tool allows you to perform DBD Auto Import even if your main server is offline or air-gapped. It runs a small local server on your machine that performs the download and sends the files to the web application.

## Prerequisites

1.  **Node.js**: You need to have Node.js installed on your machine.
    *   Download from: [https://nodejs.org/](https://nodejs.org/) (LTS version recommended).

## Setup

1.  Open a terminal (Command Prompt or PowerShell) in this folder.
2.  Install dependencies (only needed once):
    ```bash
    npm install
    ```

## Usage

1.  Start the bridge server:
    ```bash
    npm start
    ```
    You should see: `DBD Local Bridge running at http://localhost:4343`

2.  Keep this window open.

3.  Go to the Credit Request Application in your web browser.
4.  Use the **DBD Auto Import** feature as normal. The application will automatically detect this local bridge and use it to download the files.

## Features

- **PNA Support:** Supports Private Network Access headers to allow connection from the main app securely.
- **Empty Financial Data Detection:** Automatically detects if a company has not submitted financial data to DBD (displays "ไม่พบข้อมูล"). Instead of timing out, the bridge quickly skips the download, returns a `noFinancialData: true` flag, and saves a `DBD_NoFinancialData.txt` marker file to cleanly inform the main app.

## Troubleshooting

*   **Port Conflict**: If you see an error about port 4343 being in use, check if another instance of this script is running.
*   **Browser Not Opening**: Ensure you are not running as Administrator if it causes permission issues, though typically it works fine.
*   **No Financial Data Error**: If the process flags a customer with "ไม่มีงบการเงินในระบบ DBD", this means the company has not submitted their financial statements to the Department of Business Development. This is expected behavior and accurately reflects the state of the DBD database.
