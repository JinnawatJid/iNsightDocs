# Weighted Average Days Late (WADL) - Feature Specification

## 1. Overview
The **Weighted Average Days Late (WADL)** is an experimental credit risk metric designed to provide a more accurate representation of a customer's payment behavior than the traditional "Average Days Late" (Simple Average).

While the Simple Average treats every invoice equally (regardless of value), WADL weights the lateness by the invoice amount. This ensures that delaying payment on a large invoice impacts the score significantly more than delaying payment on a minor invoice.

## 2. Calculation Logic

### 2.1 Formula
> **WADL** = `SUM(Invoice Amount * Late Days) / SUM(Invoice Amount)`

### 2.2 Scope & Filters
*   **Invoices Included:** Only **PAID** invoices (where `Effective_Payment_Date` is not null).
*   **Timeframe:** Invoices with a `Posting Date` within the last **6 Months** from today.
*   **Late Days:** `Effective Payment Date` - `Due Date`. If paid on time or early, Late Days = 0.

### 2.3 Interpretation
*   **Lower Score is Better.**
*   **Scenario A:** Customer pays 10 small bills late (15 days) but 1 huge bill on time.
    *   *Simple Average:* High (Bad)
    *   *WADL:* Low (Good) -> **Reflects true financial risk.**
*   **Scenario B:** Customer pays small bills on time but delays a huge bill.
    *   *Simple Average:* Low (Good)
    *   *WADL:* High (Bad) -> **Captures the liquidity risk.**

### 2.4 Data Enrichment for UI
While the WADL score itself relies only on `Amount` and `Late Days`, the dataset returned by the WADL API is also used to power the "Payment History" table in the Financial Analysis Report.
*   **Payment Method Inference:** To ensure consistent reporting, the system infers the payment method even if not explicitly returned by the database.
    *   If `Check Date` or `Cleared Date` is present -> **Cheque**.
    *   Otherwise -> **Cash/Transfer**.
    *   *Note:* This logic is applied both in the backend (`financialController.js`) and as a fallback in the frontend (`CreditAnalysisReport.vue`).

## 3. Technical Implementation

### 3.1 Backend Service
*   **Controller:** `backend/controllers/financialController.js`
*   **Method:** `getLatePaymentBenchmark`
*   **Endpoint:** `GET /api/financials/late-payment-benchmark/:customer_no`

### 3.2 Data Deduplication Strategy
Due to the 1-to-many relationship in the ERP system between an Invoice and its Payments (e.g., partial payments or multiple cheques), the raw SQL query returns duplicate rows for the same `Invoice_No`.
To prevent these duplicates from artificially inflating the denominator (`SUM(Invoice Amount)`) in the WADL calculation and cluttering the UI, the system implements a strict deduplication pipeline:
1. **Backend Middleware (`financialController.js`)**:
   * Groups raw invoice records by `Invoice_No`.
   * Resolves ties by prioritizing the record with the highest `Late_Days` (the worst-case, final settlement delay).
   * If `Late_Days` are equal (e.g., both 0 for on-time payments), it prioritizes the record with a valid and most recent `Effective_Payment_Date`.
2. **Frontend Safety Net (`CreditAnalysisReport.vue`)**:
   * A secondary `Map`-based filter is applied within the `latePaymentInvoices` computed property to strictly enforce a 1-to-1 render mapping in the Payment History table.

### 3.3 SQL Requirement
To implement this in production, a new SQL query is required to fetch the `Amount` field (which is missing in the current V1 API).
*   **Spec:** `docs/specs/LATE_PAYMENT_WADL_QUERY.sql`

### 3.4 API Requirement
The backend currently simulates the data via a Mock Generator because the live API does not yet return invoice amounts.
*   **Spec:** `docs/specs/LATE_PAYMENT_WADL_API.md`

## 4. Benchmark Comparison Feature
The system currently exposes a comparison endpoint that returns both metrics side-by-side to allow the Credit Team to evaluate the efficacy of the new WADL metric before full adoption.

```json
"comparison": {
    "traditional": {
        "method": "Simple Average (Count-based)",
        "score": 12.50,
        "interpretation": "Heavily influenced by frequency of small late bills."
    },
    "wadl": {
        "method": "Weighted Average (Value-based)",
        "score": 1.36,
        "interpretation": "Reflects financial impact; lower score if large bills are paid on time."
    }
}
```
