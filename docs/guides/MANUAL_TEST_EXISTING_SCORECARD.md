# Manual Testing Guide: Existing Customer Scorecard

This guide explains how to perform an End-to-End test for the "Existing Customer" credit scoring model using the Batch Automation tool.

## Prerequisites
- Access to the Batch Automation page (`/batch-automation`).
- A list of valid Customer IDs (e.g., `01234AY`) that have transaction history in the database.

## Step-by-Step Instructions

### 1. Prepare Your Data (Excel)
Create a simple Excel file (`.xlsx`) with a single column.
- **Header:** `Customer ID` (or `Code`, `No.`)
- **Rows:** The customer codes you want to test.
- *Note: You do not need to include financial data; the system fetches it automatically.*

### 2. Configure the Batch Automation Tool
1.  Navigate to the **Batch Automation** page.
2.  **Upload** your Excel file.
3.  Click on **"⚡ ตั้งค่าขั้นสูง" (Advanced Settings)** to expand the configuration panel.
4.  Change the **"โมเดลการให้คะแนน" (Scoring Model)** dropdown from "ลูกค้าใหม่" (New) to **"ลูกค้าปัจจุบัน" (Existing Customer)**.
5.  *(Optional)* Adjust the "ตัวคูณวงเงิน" (Limit Exponent) if testing credit limit sensitivity.

### 3. Run & Verify Results
1.  Click **"▶ เริ่มประมวลผล" (Start Processing)**.
2.  Wait for the status to change to "Done" or "Done (Int)".
3.  Check the results table for the following:
    -   **เฉลี่ยถ่วงน้ำหนัก (WADL):** This column should display a value (e.g., "4.5 วัน").
    -   **คะแนน (Score):** A calculated score (e.g., "135").
    -   **เกรด (Grade):** A letter grade (e.g., "A").
4.  Click **"📄 ดูรายงาน"** to view the detailed breakdown, including the WADL Traffic Light indicator.
