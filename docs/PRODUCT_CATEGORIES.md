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

-   **API Endpoint:** `/api/customer-analytics/category-summary`
-   **Field:** `by_category` (JSON object where keys are category codes and values are sales amounts).
-   **Display:** In the Credit Score Summary, these categories are shown in the "สัดส่วนสินค้าที่ซื้อ" section, sorted by sales volume (descending).
