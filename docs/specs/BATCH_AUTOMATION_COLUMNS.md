# Batch Automation Column Specifications

## Overview
This document details the logic, formatting, and calculation rules for the columns displayed in the Batch Automation interface (`/batch-automation`) and the generated Excel reports.

## UI Column Definitions

| Header (Thai) | Description | Source / Logic | Formatting (UI) | Special Cases |
| :--- | :--- | :--- | :--- | :--- |
| **รหัสลูกค้า** | Customer ID | `item.customerId` | Text | - |
| **ชื่อลูกค้า** | Customer Name | `item.name` | Text | - |
| **ยอดซื้อรวม 3 เดือน** | Total Purchase (3 Months) | `item.totalPurchase3Months` | `#,##0.00 บาท` | - |
| **เฉลี่ยการจ่ายเงินล่าช้า** | WADL Score | `item.wadlScore` | `X วัน` | If null: `-` |
| **ระยะเวลาเครดิต** | Credit Term | `item.paymentTerms` | `X วัน` | If null: `-` |
| **ระยะเวลาการวางบิล** | Billing Duration | Extracted from `Billing Terms Code` | `X วัน` or `ไม่มีวางบิล` | If code starts with `B0` or `B00`, display `ไม่มีวางบิล`. <br> Else, extract digits after 'B'. |
| **วงเงินปัจจุบัน** | Current Credit Limit | `item.currentLimit` | `#,##0.00 บาท` | - |
| **วงเงินแนะนำ ต่อเดือน** | Recommended Limit (Monthly) | `item.newLimit` (from Scoring Engine) | `#,##0.00 บาท` | - |
| **วงเงินแนะนำ ต่อรอบบิล** | Recommended Limit (Cycle) | Calculated Formula | `#,##0.00 บาท` | See Formula below. |
| **คะแนน** | Total Score | `item.score` | `Score (Grade)` | Color-coded (A=Green, B=Yellow, C=Red) |

## Calculations

### Billing Duration Extraction
The system extracts the duration from the `Billing Terms Code` (e.g., `B30CR45`).
*   **Pattern:** `^B(\d+)`
*   **Logic:**
    *   If matches `B30` -> 30 days.
    *   If matches `B0` or `B00` -> 0 days (Displayed as "ไม่มีวางบิล").
    *   If no match -> Returns raw code.

### Recommended Limit (Cycle) Formula
Calculates the recommended limit needed to cover the entire billing cycle (Credit Term + Billing Duration).

$$ \text{Cycle Limit} = \text{Monthly Limit} \times \frac{(\text{Credit Term} + \text{Billing Duration})}{30} $$

*   **Monthly Limit:** The recommended limit returned by the scoring engine (`item.newLimit`).
*   **Credit Term:** `item.paymentTerms` (e.g., 45).
*   **Billing Duration:** The extracted day count (e.g., 30).

**Example:**
*   Monthly Limit: 100,000
*   Credit Term: 45 days
*   Billing Duration: 30 days
*   Calculation: $100,000 \times \frac{(45 + 30)}{30} = 100,000 \times 2.5 = 250,000$

## Excel Export Specifications

The Excel export (`Batch_Credit_Automation_Report.xlsx`) serves as a data source for further analytics. Therefore, it **strictly excludes** UI formatting units ("บาท", "วัน").

| Header | Data Type | Value Example | Note |
| :--- | :--- | :--- | :--- |
| รหัสลูกค้า | String | `01001CB` | - |
| ยอดซื้อ 3 เดือน | Number | `2215863.25` | Raw number, no commas/units. |
| เฉลี่ยการจ่ายเงินล่าช้า | Number | `5.2` | WADL Score. |
| เครดิตเทอม | Number | `30` | - |
| ระยะเวลาการวางบิล | String / Number | `30` or `ไม่มีวางบิล` | **Correction:** Export uses `getBillingDuration` which returns text. *Wait, based on implementation:* <br> Actually, export code currently uses `getBillingDuration` (Text) for column display but analytics usually prefer numbers. <br> **Current Implementation:** Exports the UI text (e.g. "30 วัน" or "ไม่มีวางบิล"). <br> *Refined Requirement:* The user asked to "not include ' บาท', ' วัน'" for analytics. <br> **Final Implementation:** <br> - **Billing Duration**: Exports `getBillingDurationValue` (Number, e.g., 30 or 0). <br> - **Cycle Limit**: Exports raw calculated number (e.g., 250000). |
| วงเงินปัจจุบัน | Number | `500000` | Raw number. |
| วงเงินแนะนำ ต่อเดือน | Number | `100000` | Raw number. |
| วงเงินแนะนำ ต่อรอบบิล | Number | `250000` | Raw number. |

### Full Detail Report Columns Update
The system extracts dynamic monthly labels (e.g., ก.ย. 68) for the 6-month purchasing history.
*   **Problem:** If the first few rows have no history, the system defaults to "Month 1...6", creating duplicate mismatched headers when later rows supply the Thai months.
*   **Resolution:** The export function (`exportFullDetailReport`) scans the entire batch `queue` to find the *first valid customer* with financial history. It extracts the 6 correct Thai month labels and uses them globally for all rows in the report, padding 0s for customers without data.

### Export Logic Helper
To ensure data integrity for analytics, the system uses specific helpers for export:
*   `getBillingDurationValue(code)` -> Returns `Int` (e.g., 30, 0).
*   `calculateCycleLimit(...)` -> Returns `Float` (Raw Number).
