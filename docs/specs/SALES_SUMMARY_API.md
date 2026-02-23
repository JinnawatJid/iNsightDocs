# Sales Summary API

## Overview

This API provides a 6-month summary of sales data for a specific customer. It is used to calculate the "3-Month Total Purchase" metric and visualize the purchasing trend in the Credit Analysis Report.

## Endpoint Details

- **URL:** `http://192.192.0.37:8280/sales-summary-6-months/1.0.0`
- **Method:** `POST`
- **Content-Type:** `application/json`

## Authentication

- **Header:** `apikey`
- **Value:** (Use the `CUSTOMER_API_KEY` from environment variables)

## Request Body

```json
{
    "customer_code": "01017AY"
}
```

## Response Format

The API returns a JSON object containing a `data` array with monthly sales figures.

### Example Response

```json
{
    "success": true,
    "data": [
        {
            "month": "2025-08",
            "amount": 34500.75
        },
        {
            "month": "2025-09",
            "amount": 107873
        },
        {
            "month": "2025-10",
            "amount": 65446.25
        },
        {
            "month": "2025-11",
            "amount": 20254.25
        },
        {
            "month": "2025-12",
            "amount": 2756
        },
        {
            "month": "2026-01",
            "amount": 62521.75
        },
        {
            "month": "2026-02",
            "amount": 9659.25
        }
    ],
    "meta": {
        "total": 7
    }
}
```

### Response Fields

- **success**: Boolean indicating if the request was successful.
- **data**: Array of monthly sales records.
    - **month**: The month of the record in `YYYY-MM` format.
    - **amount**: The total sales amount for that month (Decimal).
- **meta**: Metadata about the response (e.g., total count).

## Integration Logic

The backend controller (`backend/controllers/customerController.js`) consumes this API to:

1.  **Generate Timeline:** Uses the `month` and `amount` fields to create a continuous timeline of sales (filling gaps with 0).
2.  **Calculate Metrics:** Computes the total sales for the last 3 complete months to determine purchasing power tiers.
3.  **Determine Trend:** Analyzes the slope of sales over the period to identify growth or decline.

**Note:** The system uses the `generateContinuousTimeline` service to ensure data continuity even if months are missing from the API response.
