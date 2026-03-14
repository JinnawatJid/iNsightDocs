# Financial Formatting Standardization

This document outlines the standard formatting rules for displaying financial amounts (e.g., total purchases, average monthly sales, category breakdowns) across both the backend APIs and frontend UI components.

## 1. Goal

To ensure a clean, consistent, and professional user interface, **all financial amounts must be formatted to exactly two decimal places** (e.g., `1,000.00`, `1,006,923.50`). This prevents jagged visual alignment in tables and summary sections (like the "พฤติกรรมการซื้อ" / Credit Score Summary) where numbers lacking decimals would otherwise clash with numbers containing them.

## 2. Backend Implementation (`customerController.js`)

All financial data served to the frontend (especially from `fetchPurchasingBehavior` and `fetchCategorySummary`) must pass through the standardized `formatCurrency` utility before being included in the payload.

### `formatCurrency` Utility
Located in `backend/controllers/customerController.js`:

*   **Logic:** It uses `Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })`.
*   **Safety:** It includes a `parseAmount` fallback that safely strips commas from string inputs (e.g., `"1,000"`) and parses them to a float before applying the `Intl.NumberFormat`, ensuring no `NaN` or formatting errors occur if raw API sources return pre-formatted strings.

## 3. Frontend Implementation (`CreditScoreSummary.vue`)

Even if the backend formats the data correctly, frontend components must rigorously enforce this standard locally to account for edge cases (e.g., reactive recalculations, alternative data sources, or raw unformatted numeric injections).

### `formatDecimal` Utility
Located in `src/components/credit/CreditScoreSummary.vue`:

*   **Usage:** Always wrap financial data variables in the Vue template with this function (e.g., `{{ formatDecimal(financial.total_purchase_3_months) }}`, `{{ formatDecimal(cat.value) }}`).
*   **Logic:** It also implements `Intl.NumberFormat` with exactly two fraction digits.
*   **Safety:** Similar to the backend, it detects if the input is a `string`, strips any existing commas (`replace(/,/g, '')`), and parses it to a `float` before applying the standardized decimal formatting.

## 4. Summary

Whenever introducing new financial metrics to the application, developers must ensure these specific formatting utilities are used to strictly enforce the two-decimal standard across the stack.