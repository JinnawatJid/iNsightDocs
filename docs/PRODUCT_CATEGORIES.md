# Product Categories

This document defines the product category codes used in the Customer Analytics API and their corresponding display labels in the Credit Scoring system.

## Category Mappings

The following codes are used to categorize sales data:

| Code | Label (Display Name) | Description |
| :--- | :--- | :--- |
| **A** | **อลูมิเนียม (A)** | Aluminum products |
| **G** | **กระจก (G)** | Glass products |
| **Y** | **ยิปซั่ม (Y)** | Gypsum products |
| **C** | **ซีลาย (C)** | Ceiling products (C-Line) |
| **E** | **Accessory (E)** | Accessories |
| **S** | **กาว (S)** | Sealants/Glues |

## Implementation Details

-   **API Endpoint:** `http://192.192.0.37:8280/sales-by-category-6-months/1.0.0` (POST)
-   **Headers:** `apikey`, `Content-Type: application/json`
-   **Body:** `{"customer_code": "...", "months": 3}`
    -   `months`: Dynamically passed as `3` to determine behavior over the prior 3 months.
-   **Internal Processing:** The backend aggregates the raw `data` array (summing `total_amount` by `category`) into a `by_category` object (keys = category codes, values = total sales amounts). It also tracks `category_months_used` to inform the frontend.
-   **Field:** `by_category` (JSON object used internally after transformation).
-   **Display:** In the Credit Score Summary, these categories are shown in the "สัดส่วนสินค้าที่ซื้อ 3 เดือน" section, sorted by sales volume (descending).
