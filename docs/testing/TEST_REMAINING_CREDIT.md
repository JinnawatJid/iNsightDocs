# Test Guide: Current Trade Debt (ยอดหนี้การค้าปัจจุบัน)

This document provides instructions on how to manually test the integration of the `silver_customerremainingcredit` API, which replaces the mocked "Current Trade Debt" in the Project Credit Request process.

## 1. Prerequisites
*   Ensure the backend and frontend development servers are running.
*   Ensure your local environment can reach the external API `http://192.192.0.37:8280`.

## 2. Testing via UI

1.  **Navigate to the Application:** Log into the system and initiate or open an existing **Project Credit Request** (เครดิตโครงการ).
2.  **Select a Customer:** Ensure the selected customer has existing data in the API. For example, use **Customer No.** `01013AY` (ร้าน กระจกอำนวย).
3.  **View Global Phasing Analysis:**
    *   Navigate to the component/tab containing the **Global Phasing Analysis** (การวิเคราะห์กระแสเงินสดและภาระหนี้ภาพรวม).
    *   Observe the line chart.
4.  **Verification Steps:**
    *   **Label:** Check the legend/labels on the chart. It should display **`ยอดหนี้การค้าปัจจุบัน`** (without the "(Mock)" suffix).
    *   **Billing Terms:** Confirm the selected customer has a `Billing Terms Code` loaded. The drop-out date in the chart should correspond to the parsed billing-term offset.
    *   **Data Consistency:** The line representing this debt should remain at the `Total Utilization` level until the billing-term offset is reached, then drop to 0 afterwards. If the customer lacks billing terms, the line may remain constant across the available timeline.
    *   **Value:** Hover over the line tooltips. The value should exactly match the `Total Utilization` field returned by the API (e.g., `218055` for customer `01013AY`), rather than the old hardcoded `200000` value.

## 3. Testing the Backend API Endpoint Directly

You can test the newly exposed backend proxy route to ensure it correctly fetches and parses the data.

```bash
curl -X GET http://localhost:8000/api/financials/remaining-credit/01013AY
```
*(Replace `8000` with your actual backend port if different).*

**Expected JSON Response:**
```json
{
  "totalUtilization": 218055
}
```

## 4. Troubleshooting
*   **Value is 0:** If the graph shows 0, verify the network tab in your browser's Developer Tools. Check if the call to `/api/financials/remaining-credit/<customer_no>` failed or returned `totalUtilization: 0`.
*   **Timeout/Error:** If the backend logs show a timeout, ensure you are connected to the corporate VPN or network that allows access to `192.192.0.37`.
