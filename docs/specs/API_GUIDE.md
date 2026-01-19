# Customer Credit Data API Guide

## Overview

This API allows authorized external systems (such as the Sales Department dashboards or ERP extensions) to retrieve the **current active credit limit and terms** for a specific customer.

It provides a real-time view of the most recent "Approved" credit request data.

## Authentication

All requests must include the API Key in the HTTP Header.

**Header Name:** `X-API-KEY`
**Value:** *(Contact the IT Admin for your system's specific key)*

---

## Endpoint Reference

### Get Credit Status

Retrieves the credit limit, status, and approved payment terms for a customer.

**Method:** `GET`
**URL:** `/api/external/credit-status/{customerId}`

#### Parameters

| Parameter | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `customerId` | String | Yes | The unique Customer ID (e.g., `01016AY`). |

#### Response (200 OK)

The API returns a JSON object containing the credit details.

```json
{
  "customer_id": "01016AY",
  "status": "Approved",
  "credit_limit": 500000.00,
  "credit_terms": {
    "gs": 30,
    "ae": 60,
    "yc": 45
  },
  "updated_at": "2023-10-25T14:30:00Z"
}
```

#### Errors

*   **404 Not Found:** The `customerId` does not exist, or the customer has no "Approved" credit record.
*   **401 Unauthorized:** Missing or invalid `X-API-KEY`.

---

## Code Examples

### cURL

```bash
curl -X GET "http://api.company.local/api/external/credit-status/01016AY" \
     -H "X-API-KEY: your_secret_key"
```

### JavaScript (Fetch API)

```javascript
const customerId = '01016AY';
const apiKey = 'your_secret_key';

fetch(`http://api.company.local/api/external/credit-status/${customerId}`, {
  method: 'GET',
  headers: {
    'Content-Type': 'application/json',
    'X-API-KEY': apiKey
  }
})
.then(response => {
  if (!response.ok) throw new Error('Customer not found');
  return response.json();
})
.then(data => {
  console.log(`Credit Limit: ${data.credit_limit}`);
  console.log(`Terms (GS): ${data.credit_terms.gs} days`);
})
.catch(error => console.error('Error:', error));
```
