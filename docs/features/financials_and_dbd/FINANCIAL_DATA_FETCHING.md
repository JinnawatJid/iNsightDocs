# External API Integrations: Financial Data Fetching

This document outlines the strategy and fallback mechanisms used by the backend when fetching external financial data (Purchasing Behavior and Category Summaries) for a given customer.

## 1. Goal

To reliably fetch a customer's monthly purchasing behavior and category-based sales summaries from external systems, prioritizing precision by using their Tax ID (VAT Registration Number). This maintains a robust fallback for individuals or edge cases where the Tax ID is missing.

## 2. API Endpoints

The system integrates with several external endpoints. **Important:** All requests to these external WSO2 API Gateway endpoints require a valid API key to be passed in the `apikey` HTTP header.

### Environment Variable Requirements
Ensure your `backend/.env` file contains the following variable:
```env
CUSTOMER_API_KEY="eyJ4NX..." # Your valid WSO2 API key
```
If this key is missing or invalid, the external APIs will immediately reject requests with a `401 Unauthorized` or timeout error (often caught and logged as a `500` error by Axios).

---

The system integrates with two different external endpoints depending on the available customer data.

### Purchasing Behavior (Monthly Summary)

*   **Primary API (`FINANCIAL_API_TAX_URL`)**
    *   **Method:** `GET`
    *   **Endpoint:** `http://192.192.0.37:8000/api/customer-analytics/monthly-summary`
    *   **Parameter:** `?tax_no=<VAT_Registration_No>`
    *   **Description:** This is the preferred method. It aggregates purchasing data across all accounts sharing the exact same Tax ID, providing a comprehensive view of a corporate entity's behavior.

*   **Fallback API (`FINANCIAL_API_URL`)**
    *   **Method:** `POST`
    *   **Endpoint:** `http://192.192.0.37:8280/sales-summary-6-months/1.0.0`
    *   **Body:** `{ "customer_code": "<Customer_No>" }`
    *   **Description:** This legacy endpoint fetches data strictly for a single, specific ERP customer code.


### Remaining Credit & Trade Debt

*   **API (`REMAINING_CREDIT_API_URL`)**
    *   **Method:** `POST`
    *   **Endpoint:** `http://192.192.0.37:8280/silver_customerremainingcredit/1.0.0`
    *   **Body:** `{ "Customer No.": { "$eq": "<Customer_No>" } }`
    *   **Description:** This endpoint fetches the current remaining credit and trade debt details for a specific customer. The system specifically extracts the `Total Utilization` field to be used continuously as the Current Trade Debt (`ยอดหนี้การค้าปัจจุบัน`) in the Global Phasing Analysis chart, without any artificial drop-off timeframes.

### Category Summary

*   **Primary API (`CATEGORY_API_TAX_URL`)**
    *   **Method:** `GET`
    *   **Endpoint:** `http://192.192.0.37:8000/api/customer-analytics/category-summary`
    *   **Parameter:** `?tax_no=<VAT_Registration_No>` (The `months` parameter is ignored by this endpoint, as it strictly returns a 6-month aggregate).
    *   **Description:** The preferred method for fetching sales broken down by product category, aggregated by Tax ID. It directly returns a `by_category` object in its response representing a 6-month total.

*   **Fallback API (`CATEGORY_API_URL`)**
    *   **Method:** `POST`
    *   **Endpoint:** `http://192.192.0.37:8280/sales-by-category-6-months/1.0.0`
    *   **Body:** `{ "customer_code": "<Customer_No>", "months": <months> }`
    *   **Description:** The legacy endpoint for fetching category data. Requires mapping an array of items (`.data`) into a consolidated `by_category` object.

## 3. Category Data Proportional Allocation

Because the Primary Category API strictly returns a 6-month aggregate (`by_category`), it causes a mismatch when evaluating New Customers (Credit Limit = 0), who require a 3-month purchasing behavior analysis.

To resolve this, the backend (`customerController.js`) employs a **Proportional Allocation** strategy:
1. It calculates the accurate total purchase sum for the desired timeframe (e.g., `sumLast3` for 3 months) using the granular `FINANCIAL_API_TAX_URL` (Monthly Summary) data.
2. It calculates the ratio of each product category over the 6-month period using the `CATEGORY_API_TAX_URL` data.
3. It multiplies the 6-month category ratio by the accurate 3-month total purchase sum to estimate the 3-month category breakdown.

This ensures the UI safely displays a "3 Month Category Breakdown" whose sum perfectly matches the "3 Month Total Purchases" without requiring the external API to support dynamic month filtering.

## 4. Fallback Logic (`fetchPurchasingBehavior` & `fetchCategorySummary`)

The logic is centralized in the `fetchPurchasingBehavior` and `fetchCategorySummary` functions (used in `customerController.js` and `financialController.js`).

1.  **Attempt Tax ID Fetch:** If the customer record possesses a valid, non-empty `VAT Registration No_` (passed as `taxId`), the system first attempts a `GET` request to the Primary API.
2.  **Graceful Degradation:** If the Primary API request fails (e.g., timeout, 404, or server error), the error is caught, a warning is logged, and the system immediately proceeds to the Fallback API.
3.  **Attempt Customer Code Fetch:** If the customer lacks a `taxId`, or if the Primary API failed, the system executes a `POST` request to the Fallback API using the specific `customerNo`.
4.  **Source Identification:** To ensure transparency for debugging and UI display, the returned data payload is dynamically injected with a `fetchSource` attribute:
    *   `fetchSource: 'tax_no'` (If data originated from the Primary API)
    *   `fetchSource: 'customer_code'` (If data originated from the Fallback API)
    *   `fetchSource: 'error'` (If both API calls failed or resulted in an empty dataset)

## 4. Context Extraction (`enrichCustomerData`)

When calculating credit scores or enriching customer data for the frontend dashboards:
*   The `enrichCustomerData` function (and `analyzeFinancials` in the scoring pipeline) extracts the `VAT Registration No_` from the local database query results or request payload.
*   It securely trims and validates this value before passing it down as the `taxId` parameter to the `fetchPurchasingBehavior` and `fetchCategorySummary` helpers.
*   The `fetchSource` flag is preserved and bubbled up to the final JSON response sent to the Vue.js frontend, allowing for potential UI indicators (e.g., displaying "Aggregated by Tax ID" vs "Specific Account Data").
