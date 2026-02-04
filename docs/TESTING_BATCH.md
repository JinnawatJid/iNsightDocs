# Batch Automation Testing Guide

This document outlines the steps to verify the fixes and improvements implemented in the Batch Automation feature.

## 1. System Verification (How we ensured it works)

Before deployment, the following automated checks were performed:
*   **Automated UI Testing (Playwright):** We simulated the full workflow using a mock environment.
    *   **NaN Handling:** Verified that customers with invalid/missing purchase data display as `0` instead of `NaN`.
    *   **Logic Branching:** Verified that "Individual" customers (without "Co., Ltd." or Tax ID) correctly skip the DBD download step and are marked as `Done (Int)`.
    *   **Layout:** Verified that the table columns are wide enough to read the data.

## 2. User Acceptance Testing (How you can test it)

Please follow these steps to verify the changes in your environment.

### Prerequisites
*   Ensure the application is running.
*   Ensure the Local Bridge is connected (if testing DBD downloads) OR disconnect it to test error handling.

### Test Case A: The "NaN" Fix
**Goal:** Ensure the "Total Purchase 3 Months" column does not show `NaN`.

1.  **Prepare Data:** Create an Excel file (`test_nan.xlsx`) with a customer who has **no** purchase history in the system (or a new customer ID).
2.  **Upload:** Go to "Batch Automation" and upload the file.
3.  **Run:** Click "Start Processing".
4.  **Verify:**
    *   Look at the "Total Purchase 3 Months" column.
    *   **Pass:** It should show `0` or a valid number.
    *   **Fail:** It shows `NaN`.

### Test Case B: Individual Logic (Skip DBD)
**Goal:** Ensure individuals or non-corporates do not trigger a DBD download loop.

1.  **Prepare Data:** Add a customer to your Excel file who:
    *   Does **not** have keywords like "Company", "Ltd", "หจก", "บริษัท" in their name.
    *   OR does not have a Tax ID.
2.  **Run:** Process this customer.
3.  **Verify:**
    *   **Status:** Should show `Done (Int)` (Done - Internal) or `Done`.
    *   **Log:** Should say `ข้าม DBD (ไม่ใช่บริษัท)` or `ข้าม DBD (ไม่มี Tax ID)`.
    *   **Speed:** It should process instantly without trying to open the browser for DBD.

### Test Case C: Report Data Completeness
**Goal:** Verify that the Financial Report receives all necessary data.

1.  **Action:** After processing a customer successfully (Status `Done` or `Done (Int)`), click the **"View Report" (ดูรายงาน)** button.
2.  **Verify the Report:**
    *   **Customer Duration:** Check "ระยะเวลาการเป็นลูกค้า". It should be a number (e.g., `5` ปี) calculated from the `Customer Since` date.
    *   **Credit Term:** Check "ระยะเวลาเครดิต". It should match the customer's payment term (e.g., `30` วัน).
    *   **Requested Credit:** Check "เครดิตที่ขอ". It should default to the customer's **Current Credit Limit** (instead of 0).
    *   **Years in Business:** Check "ปีที่จัดตั้งธุรกิจ". It should be populated (if DBD was successful, or calculated from customer date if skipped).

### Test Case D: UI Layout
**Goal:** Ensure the table is readable.

1.  **Action:** Upload a file with many columns or long customer names.
2.  **Verify:**
    *   Check that the table has a horizontal scrollbar if needed.
    *   Check that columns like "ชื่อลูกค้า" (Customer Name) are not squashed or unreadable.

---
**Note:** If you encounter any issues, please provide a screenshot of the specific row in the Batch table.
