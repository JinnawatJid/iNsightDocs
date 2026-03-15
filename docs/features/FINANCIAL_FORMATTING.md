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

## 3. Frontend Implementation (`CreditScoreSummary.vue`, `StoreStatementTab.vue`)

Even if the backend formats the data correctly, frontend components must rigorously enforce this standard locally to account for edge cases (e.g., reactive recalculations, alternative data sources, or raw unformatted numeric injections).

### `formatDecimal` vs `formatNumber` Utility

*   **`formatDecimal`:** Typically used for precision values (e.g., up to 4 decimal places in certain specific legacy views).
*   **`formatNumber`:** Extensively used for displaying standard financial data, ratios, and limits with exactly two fraction digits (e.g., `toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })`).
*   **Specific Ratios:** Ratios like **DSCR (อัตราส่วนความสามารถในการชำระหนี้)** and **Credit / Capital Ratio (สัดส่วนเครดิตต่อทุน)** must explicitly use `formatNumber` to ensure exactly 2 decimal places are displayed consistently, rather than 4.

## 4. Score Breakdown UI Formatting

When displaying credit score breakdowns (e.g., C1, C2, C3 scores), the UI should clearly indicate the achieved score relative to the maximum possible score.

*   **HTML Structure:** Use the `score-val-container` wrapper class to match the main "คะแนนเครดิต" card design.
*   **Main Score:** The achieved score should be rounded to the nearest whole number and styled with the `.score-main` class (larger, bold font).
*   **Max Score:** The maximum possible component score should be displayed directly beneath the main score using the `.score-max` class (smaller, grey font, prefixed with `/ `).

Example usage in Vue templates:
```html
<div class="score-val-container text-primary">
    <div class="score-main">{{ Math.round(c1.total) }}</div>
    <div class="score-max">/ {{ getCMaxScore(c1) }}</div>
</div>
```

## 5. Summary

Whenever introducing new financial metrics to the application, developers must ensure these specific formatting utilities and UI conventions (like `.score-val-container`) are used to strictly enforce consistent presentation across the stack.