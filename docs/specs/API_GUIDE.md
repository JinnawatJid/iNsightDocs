# System Integration API Guide

## Overview

This document serves as the central reference for all API integrations within the Credit Scoring System. It is divided into two parts:

*   **Part 1: Outbound API** - APIs we provide to external systems (e.g., Sales Department).
*   **Part 2: Inbound API Requirements** - APIs we require from external systems (e.g., Microsoft Dynamics 365).

---

# Part 1: Outbound API (For Sales Department)

## Overview

This API allows authorized external systems (such as the Sales Department dashboards or ERP extensions) to retrieve the **current active credit limit and terms** for a specific customer. It provides a real-time view of the most recent "Approved" credit request data.

## Authentication

All requests must include the API Key in the HTTP Header.

**Header Name:** `X-API-KEY`
**Value:** *(Contact the IT Admin for your system's specific key)*

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

---

# Part 2: Inbound API Requirements (From Dynamics 365)

## Overview

To facilitate the Credit Scoring System, we require the ERP Team (Microsoft Dynamics 365) to expose the following RESTful API endpoints. These will be used for **Real-time Customer Validation** and **Historical Sales Analysis**.

## Authentication Requirement

We expect to authenticate via **Bearer Token** or **API Key**. Please specify the preferred method in the final implementation.

## Endpoint 1: Customer Profile (Real-Time)

**Purpose:** To verify if a customer exists in the ERP and retrieve their basic details. This is called immediately when a user attempts to create a new Credit Request.

**Method:** `GET`
**URL:** `/api/erp/customers/{customerId}`

#### Parameters

| Parameter | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `customerId` | String | Yes | The unique Customer ID to search for. |

#### Expected Response (200 OK)

```json
{
  "customer_id": "01016AY",
  "customer_name": "ABC Construction Co., Ltd.",
  "tax_id": "1234567890123",
  "address": "123 Main St, Bangkok",
  "status": "Active"
}
```

#### Expected Errors
*   **404 Not Found:** If the customer does not exist in Dynamics 365.

---

## Endpoint 2: Sales Invoice History (Batch/Sync)

**Purpose:** To retrieve raw sales invoice headers for credit scoring calculations. This will be called by a **Nightly Background Job**.

**Method:** `GET`
**URL:** `/api/erp/invoices`

#### Parameters

| Parameter | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `date_from` | Date (YYYY-MM-DD) | Yes | Filter invoices posted on or after this date. |
| `date_to` | Date (YYYY-MM-DD) | Yes | Filter invoices posted on or before this date. |
| `page` | Integer | No | Pagination index (default: 1). |
| `limit` | Integer | No | Records per page (default: 1000). |

#### Expected Response (200 OK)

Returns a list of **Sales Invoice Headers**.

```json
{
  "data": [
    {
      "invoice_no": "INV-2023-0001",
      "customer_id": "01016AY",
      "posted_date": "2023-10-25",
      "amount": 50000.00,
      "sku": "A0101330012"
    },
    {
      "invoice_no": "INV-2023-0002",
      "customer_id": "01016AY",
      "posted_date": "2023-10-26",
      "amount": 12000.00,
      "sku": "G0505220011"
    }
  ],
  "pagination": {
    "current_page": 1,
    "total_pages": 50,
    "total_records": 50000
  }
}
```

### Data Dictionary for Response Fields

| Field Name | Type | Description | Usage in Credit System |
| :--- | :--- | :--- | :--- |
| `customer_id` | String | Customer Identifier | Grouping purchase volume. |
| `posted_date` | Date | Posting Date | Calculating monthly accumulation (6-month window). |
| `amount` | Decimal | Net Amount (THB) | Calculating Total Purchase Volume. |
| `sku` | String | Product Code | **Product Ratio Calculation:**<br>- `A...` = Aluminum<br>- `G...` = Glass<br>- `C...` = Celine |

---

## Data Usage & Calculation Logic

This section explains how the Credit Scoring System consumes the raw invoice data from Endpoint 2 to derive key metrics.

### 1. SKU Parsing (Product Categorization)
The system automatically categorizes sales transactions based on the **first character** of the `sku` field:

*   **`A`** → Aluminum
*   **`G`** → Glass
*   **`C`** → Celine
*   *(Any other character is categorized as 'Other')*

### 2. Month Accumulation
The system aggregates the `amount` field by `customer_id` and `posted_date` (grouped by month).
*   **Metric:** `Accum6Months`
*   **Calculation:** Sum of `amount` for the most recent 6-month period (rolling window).
*   **Purpose:** To determine the "Total Purchase Volume" tier (e.g., High, Medium, Normal).

### 3. Ratio Calculation
The system calculates the purchasing behavior ratio for specific product categories.
*   **Formula:** `Product Ratio = (Sum of Category Amount / Total Accum6Months)`
*   **Example:** If a customer bought 500,000 THB total, and 100,000 THB was for "Glass" (SKU starting with 'G'):
    *   Ratio = 100,000 / 500,000 = **0.20** (or 20%)

---

## Synchronization Strategy

1.  **Full Sync (Initial):** We will request data for the past 12 months.
2.  **Incremental Sync (Nightly):** We will request `date_from = yesterday` AND `date_to = yesterday`.
