# Late Payment (WADL) API Specification

## Overview
This API provides the necessary data to calculate the **Weighted Average Days Late (WADL)**. Unlike the standard Late Payment API, this endpoint includes the **Amount** field for each invoice, which is critical for weighting the late days by financial value.

## Endpoint Details

- **URL**: `http://192.192.0.37:8280/weight-baselatepayment/1.0.0`
- **Method**: `POST`
- **Content-Type**: `application/json`

### Authentication
- **Header**: `apikey`
- **Value**: Must be provided via environment variable `LATE_PAYMENT_WADL_API_KEY`.
- **Note**: This key is distinct from the standard `CUSTOMER_API_KEY`.

## Request Format

```json
{
  "Customer No_": "01012PL"
}
```

## Response Format

The response returns a list of invoices with payment details, including the `Amount` field.

```json
{
    "success": true,
    "data": [
        {
            "Invoice_No": "PLVR-6809/0023",
            "Invoice_Date": "2025-09-03T00:00:00.000Z",
            "Due Date": "2025-11-02T00:00:00.000Z",
            "Customer No_": "01012PL",
            "Amount": 33567.44,
            "Payment_Doc_No": "PLPRV-6811/0007",
            "Payment_Date": "2025-11-04T00:00:00.000Z",
            "Check Date": null,
            "Cleared Date": null,
            "Effective_Payment_Date": "2025-11-04T00:00:00.000Z",
            "Status": "LATE",
            "Late_Days": 2
        },
        {
            "Invoice_No": "PLVR-6809/0024",
            "Invoice_Date": "2025-09-04T00:00:00.000Z",
            "Due Date": "2025-11-03T00:00:00.000Z",
            "Customer No_": "01012PL",
            "Amount": 15000.00,
            "Payment_Doc_No": "PLPRV-6811/0008",
            "Payment_Date": "2025-11-03T00:00:00.000Z",
            "Effective_Payment_Date": "2025-11-03T00:00:00.000Z",
            "Status": "ON-TIME",
            "Late_Days": 0
        }
    ]
}
```

## Field Mapping for WADL

| JSON Field | Usage in Calculation |
| :--- | :--- |
| `Amount` | Weight factor (numerator and denominator) |
| `Late_Days` | Delay factor (numerator) |
| `Effective_Payment_Date` | Used to filter *paid* invoices only. If null/empty, invoice is outstanding and excluded. |
| `Posting_Date` (or `Invoice_Date`) | Used to filter timeframe (e.g., Last 6 Months). |

## Calculation Logic
1. **Filter**: Include only invoices where `Effective_Payment_Date` is not null (Paid).
2. **Timeframe**: Include only invoices where `Invoice_Date` is within the last 6 months.
3. **Formula**:
   $$ WADL = \frac{\sum (Amount \times LateDays)}{\sum Amount} $$

## Implementation Notes
- The API key in the screenshots was truncated. A placeholder is used in the codebase until the full key is provided.
- The endpoint supports `POST` method, which differs from some other `GET` based APIs in the system.
