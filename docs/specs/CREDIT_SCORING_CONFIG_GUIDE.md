# Credit Scoring Configuration Guide

## Overview

The Credit Scoring Model is configuration-driven, allowing business logic (weights, rules, formulas) to be adjusted without code changes. The system supports two distinct models:

1.  **New Customer Model** (Standard)
2.  **Existing Customer Model** (Advanced)

## Supported Models

### 1. New Customer Model
*   **Target:** New customers with no prior transaction history.
*   **Config File:** `backend/config/credit_scorecard_v1.json`
*   **Key Logic:** Heavy emphasis on external financial data (D/E Ratio, DSCR) and Company Strength.
*   **Credit Limit Formula:**
    $$ Limit = 50,000 + (450,000 \times (\frac{TotalScore}{200})^{1.2}) $$

### 2. Existing Customer Model
*   **Target:** Current customers requesting a credit increase.
*   **Config File:** `backend/config/credit_scorecard_existing_v1.json`
*   **Key Logic:** Prioritizes behavioral data (Payment History, Purchase Volume).
*   **New Factor:** **WADL (Weighted Average Days Late)** is a critical component in the C3 category.
*   **Credit Limit Formula:**
    $$ Limit = \frac{\text{Avg 1.5 Month Sales}}{2} \times (\frac{TotalScore}{200})^{\text{Exponent}} $$
    *   **Exponent:** Configurable. Defaults to `2.0` but can be overridden via API request.

---

## JSON Structure

The configuration files follow this hierarchical structure:

```json
{
  "version": "1.0",
  "limitExponent": 2.0,  // Default exponent for Existing Model
  "components": {
    "c1": {
      "name": "Company Strength",
      "factors": [
        {
          "key": "years_in_business",
          "label": "Years in Business",
          "weight": 3.056,
          "rules": [
             { "min": 10, "score": 2.0, "label": "Established (> 10 Years)" }
          ]
        }
      ]
    },
    "c3": {
       "factors": [
          {
             "key": "wadl",
             "label": "WADL (Weighted Average Days Late)",
             "weight": 18.6,
             "rules": [
                { "max": 5.01, "score": 2.0, "label": "Excellent (<= 5 Days)" }
             ]
          }
       ]
    }
  }
}
```

---

## How to Modify

### 1. Changing Weights
Locate the `weight` property under any factor and update it.
*Ensure total weights sum to 200 (or 100%).*

### 2. Updating Rules
*   `min`: Inclusive lower bound.
*   `max`: Exclusive upper bound.
*   `score`: The multiplier (0.25 - 2.0).

### 3. Configuring the Limit Curve (Existing Model)
To change the sensitivity of the credit limit calculation, adjust the `limitExponent` in `credit_scorecard_existing_v1.json`.
*   **Higher Exponent (e.g., 2.5):** Steeper curve. Low scores get very low limits; high scores get much higher limits.
*   **Lower Exponent (e.g., 1.0):** Linear relationship.

---

## API Usage

To trigger the **Existing Customer Model**, include the following parameters in the API request:

```json
{
  "modelType": "existing",
  "limitExponent": 2.0,  // Optional: Override default curve
  "wadl": 4.5,           // Required: Weighted Average Days Late
  ... other standard fields ...
}
```

If `modelType` is omitted or set to `"new"`, the system defaults to the Standard New Customer model.

### API Response Structure
The response includes the `modelType` used for calculation, which drives the frontend logic.

```json
{
  "success": true,
  "modelType": "existing",  // Indicates which model logic was applied
  "scoringResult": { ... },
  "financialSummary": {
      "wadlData": { "score": 4.5, "grade": "A" }
  }
}
```

---

## Visual Reporting & Debugging

The Credit Analysis Report UI (`CreditAnalysisReport.vue`) dynamically adapts based on the `modelType` returned by the backend.

### 1. Model Detection
The frontend inspects the API response for `modelType: 'existing'` or defaults to `'new'`.

### 2. Purchase Behavior Section (C3)
*   **New Customer:** Shows standard metrics (Avg Sales, Trend, Slope).
*   **Existing Customer:** Adds a **WADL Indicator** with traffic light color coding:
    *   **Green:** <= 5 Days (Excellent)
    *   **Yellow:** <= 15 Days (Warning)
    *   **Red:** > 15 Days (Critical)

### 3. Scoring Breakdown Grid
*   **Dynamic Columns:** The breakdown grid (`ScoringBreakdownGrid.vue`) automatically adjusts the number of columns in the C3 section based on the number of factors returned.
    *   **New Customer:** 5 Columns (Rev/Cap, Capacity, Turnover, Trend, Duration)
    *   **Existing Customer:** 6 Columns (+ WADL)

---

## Verification

After modifying any configuration:
1.  Run the verification script (if available).
2.  Test with a known customer profile.
3.  Verify that the **"Matched Rule"** in the report output aligns with your changes.

### Calculation Formula (Factor Level)
$$ \text{Final Score} = \text{Rule Score} \times \left( \frac{\text{Weight}}{2.0} \right) $$
