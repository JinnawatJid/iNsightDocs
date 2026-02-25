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
*   **Gatekeeper:** If **Avg 1.5 Month Purchases (K10)** is `0`, the WADL score is automatically set to `0`.
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
                { "max": 0.000001, "score": 2.0, "label": "Perfect (0 Days)" },
                { "min": 0.000001, "max": 5.000001, "score": 1.5, "label": "Excellent (<= 5 Days)" },
                { "min": 5.000001, "max": 10.000001, "score": 1.0, "label": "Good (5-10 Days)" },
                { "min": 10.000001, "max": 15.000001, "score": 0.5, "label": "Fair (10-15 Days)" },
                { "min": 15.000001, "score": 0.0, "label": "Poor (> 15 Days)" }
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

---

## Verification

After modifying any configuration:
1.  Run the verification script (if available).
2.  Test with a known customer profile.
3.  Verify that the **"Matched Rule"** in the report output aligns with your changes.

### Calculation Formula (Factor Level)
$$ \text{Final Score} = \text{Rule Score} \times \left( \frac{\text{Weight}}{2.0} \right) $$
