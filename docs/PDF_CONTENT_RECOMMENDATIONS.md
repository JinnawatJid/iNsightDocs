# PDF Content Recommendations & Design

This document outlines the improvements for the Credit Request PDF Summary to better support the "Risk Assessment" use case for the Credit Committee.

## 1. Header Design
*   **Layout:** Split Header (Left/Right or Left/Center/Right).
*   **Elements:**
    *   **Logo:** Company Logo (top-left).
    *   **Title:** "สรุปคำขอสินเชื่อ (Credit Request Summary)".
    *   **Request Type Badge:** A visually distinct box on the top-right indicating the nature of the request:
        *   `เครดิตใหม่` (New Credit)
        *   `เครดิตเพิ่ม` (Credit Increase)
        *   `เครดิตโครงการ` (Project Credit)
*   **Metadata:** Transaction ID and Date (below title or badge).

## 2. Risk Analysis Section (New)
*   **Goal:** Provide a quick snapshot of the customer's risk profile without needing to dig into details.
*   **Content:**
    *   **Credit Score:** e.g., "85/100 (Grade A)".
    *   **Approval Chance:** "High / Medium / Low" (Based on document completeness).
    *   **Financial Trend (3-Months):**
        *   Average Sales Volume.
        *   Trend Indicator (Increasing/Decreasing).
    *   **Payment History:** (If available from internal records).

## 3. Financial Summary
*   **Content:**
    *   Table showing monthly sales for the last 3 months (June, July, August).
    *   Total accumulated sales.

## 4. Billing & Payment Information
*   **Goal:** Assess cash flow risk based on agreed terms.
*   **Content:**
    *   Billing Method (e.g., Email, Mail).
    *   Payment Method (e.g., Transfer, Cheque).
    *   Payment Terms (Credit Term).

## 5. Implementation Strategy
*   **Data Source:** Ensure `request_type` is persisted in the DB.
*   **Rendering:** Use `pdfmake` columns for the header and "lightHorizontalLines" tables for data sections.
