# Dynamics 365 Integration Design

## Overview

This document outlines the strategy for integrating the Credit Scoring System with **Microsoft Dynamics 365 (ERP)**. The goal is to replace manual mock data (CSV/Excel) with automated data fetching for:
1.  **Customer Validation:** Verifying customer existence in real-time.
2.  **Purchase History:** Fetching sales invoices to calculate credit scores.

## Architecture Strategy: The Hybrid Approach

To support the "Customer Acquisition" workflow (where sales staff create a new customer in ERP and immediately request credit), we will use a **Hybrid Architecture** combining Real-time checks with Batch processing.

### 1. Real-Time Layer (Customer Existence)
*   **Trigger:** When a user searches for a Customer ID in the "Create Request" screen.
*   **Action:** The backend sends a direct API request to Dynamics 365.
*   **Purpose:** To confirm the customer exists and fetch basic profile data (Name, Address, Tax ID).
*   **Why:** Ensures we can process "New Customers" immediately after they are created in the ERP.

### 2. Async Layer (Purchase History Sync)
*   **Trigger:** Scheduled Nightly Job (e.g., 01:00 AM) or On-Demand "Recalculate" button.
*   **Action:** Fetches processed Invoice headers from Dynamics 365.
*   **Purpose:** To calculate "Accumulated Sales" (Accum) and "Product Ratios".
*   **Why:** Calculating 6-month aggregations from thousands of raw invoices is too slow for a real-time user interface.

---

## Data Requirements

We require an API endpoint from the Dynamics 365 team exposing the **Sales Invoice Header** table with the following columns:

| Field Name | Type | Description |
| :--- | :--- | :--- |
| `CustomerID` | String | The unique customer identifier. |
| `PostedDate` | Date | The date the invoice was posted. |
| `Amount` | Decimal | The net amount of the invoice. |
| `SKU` | String | The product code (e.g., `A0101330012`). Used for product categorization. |

---

## Business Logic

### 1. SKU Parsing (Product Categorization)
The system categorizes sales based on the **first character** of the SKU:

*   **`A`** = Aluminum
*   **`G`** = Glass
*   **`C`** = Celine
*   *(Other characters are ignored or categorized as 'Other')*

### 2. Month Accumulation
We aggregate `Amount` by `CustomerID` and `PostedDate` (Month/Year).

*   **Logic:** Sum `Amount` for the last 6 months (rolling window).
*   **Output:** `Accum6Months` (Total Purchase Volume).

### 3. Ratio Calculation
To determine the purchasing behavior for specific product types (e.g., Glass):

1.  **Filter:** Select invoices where SKU starts with the target letter (e.g., "G").
2.  **Sum:** Calculate the total amount for these filtered invoices over the period.
3.  **Divide:** `Product Ratio = (Sum of Target Product / Total Accum6Months)`

---

## Constraints & Trade-offs (Nightly Sync)

While the Hybrid Approach optimizes for both speed and freshness, the following constraints apply to the **Purchase History** component:

1.  **Data Latency (1-Day Delay):**
    *   Sales made *today* will not appear in the "Accumulated Sales" charts until *tomorrow*.
    *   *Impact:* Minimal for credit scoring, as long-term trends (6 months) are more important than a single day's purchase.

2.  **Sync Failures:**
    *   If the nightly job fails (e.g., ERP maintenance), data remains "as of yesterday".
    *   *Mitigation:* The system must display a "Data Last Updated: [Date]" timestamp to the user.

3.  **Volume Management:**
    *   Fetching *all* history every night is inefficient.
    *   *Strategy:* Use **Incremental Sync** (fetch only invoices where `PostedDate` > Last Sync Date).

---

## Future Roadmap

1.  **Phase 1:** Implement Real-Time Customer Profile lookup.
2.  **Phase 2:** Implement Nightly Sync for Invoices and replace `AY_ACCUM` mock data.
3.  **Phase 3:** Dashboard for Sync Status (Success/Fail logs).
