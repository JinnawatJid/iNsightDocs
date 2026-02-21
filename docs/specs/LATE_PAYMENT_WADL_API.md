# Late Payment Analysis (WADL) API Specification

## 1. Overview
This document specifies the interface for the **Weighted Average Days Late (WADL)** calculation service. This API extends the capabilities of the original Late Payment API by including invoice amounts, enabling value-weighted analysis of payment behavior.

## 2. API Contract

### Endpoint
**URL:** `http://192.192.0.37:8280/customer-late-payment-wadl/1.0.0`
**Method:** `POST`

### Headers
| Header | Required | Description |
| :--- | :--- | :--- |
| `Content-Type` | Yes | `application/json` |
| `apikey` | Yes | API Key (configured as `LATE_PAYMENT_API_KEY` in backend) |

### Request Body (JSON)
```json
{
  "Customer No_": "08015AY"
}
```

### Response Schema (JSON)
The API returns an array of invoice objects.

**Key Difference from V1:** Includes `Amount` field.

```json
{
  "success": true,
  "data": [
    {
      "document_no": "INV-2023-1001",
      "posting_date": "2023-01-01",
      "due_date": "2023-01-31",
      "amount": 50000.00,             // <--- CRITICAL NEW FIELD
      "effective_payment_date": "2023-02-05",
      "status": "LATE",
      "late_days": 5
    },
    {
      "document_no": "INV-2023-1002",
      "posting_date": "2023-01-05",
      "due_date": "2023-02-05",
      "amount": 2000.00,
      "effective_payment_date": "2023-02-20",
      "status": "LATE",
      "late_days": 15
    }
  ]
}
```

---

## 3. Business Logic: WADL Calculation

The consuming client (Backend Service) must apply the following logic to the API response:

### 3.1 Filtering Rules
1.  **Paid Invoices Only:** Include only records where `effective_payment_date` is present and valid. Exclude outstanding invoices.
2.  **Timeframe:** Include only invoices where `posting_date` is within the last **6 months** from today.

### 3.2 Formula
The **Weighted Average Days Late (WADL)** is calculated as:

> **WADL** = `SUM(Invoice Amount * Late Days) / SUM(Invoice Amount)`

### 3.3 Example Calculation
Given the response example above:

| Invoice | Amount (Weight) | Late Days | Weighted Late Days |
| :--- | :--- | :--- | :--- |
| INV-1001 | 50,000 | 5 | 250,000 |
| INV-1002 | 2,000 | 15 | 30,000 |
| **Total** | **52,000** | | **280,000** |

*   **Simple Average:** (5 + 15) / 2 = **10 Days**
*   **Weighted Average (WADL):** 280,000 / 52,000 = **5.38 Days**

*Interpretation:* The customer paid a large bill slightly late (5 days) and a small bill very late (15 days). The WADL (5.38) correctly reflects that the **majority of the value** was paid relatively on time, whereas the simple average (10) skews the perception negatively due to a small outlier.

---

## 4. Backend Implementation (Mock Mode)

Until the actual API is deployed, the backend will simulate this response structure in the `getLatePaymentBenchmark` controller.
