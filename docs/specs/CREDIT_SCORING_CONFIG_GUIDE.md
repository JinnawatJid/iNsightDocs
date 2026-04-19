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
    $$ Base Limit = 50,000 + (450,000 \times (\frac{TotalScore}{200})^{\text{Exponent}}) $$
    $$ Final Limit = Base Limit + Guarantee Amount $$
    *   **Exponent:** Configurable via `limitExponent`. Defaults to `2.0`.
    *   **Guarantee Amount:** Sum of submitted Bank Guarantees and Cash Deposits.

### 2. Existing Customer Model
*   **Target:** Current customers requesting a credit increase.
*   **Config File:** `backend/config/credit_scorecard_existing_v1.json`
*   **Key Logic:** Prioritizes behavioral data (Payment History, Purchase Volume).
*   **New Factor:** **WADL (Weighted Average Days Late)** is a critical component in the C3 category.
*   **Gatekeeper:** If **Avg 1.5 Month Purchases (K10)** is `0`, the WADL score is automatically set to `0`.
*   **Credit Limit Formula:**
    $$ Base Limit = \frac{\text{Avg 1.5 Month Sales}}{2} \times (\frac{TotalScore}{200})^{\text{Exponent}} $$
    $$ Final Limit = Base Limit + Guarantee Amount $$
    *   **Exponent:** Configurable. Defaults to `0.5` (as used in Batch Automation for safer initial limits), but can be overridden via API request.
    *   **Guarantee Amount:** Sum of submitted Bank Guarantees and Cash Deposits.

---

## JSON Structure

The configuration files follow this hierarchical structure:

```json
{
  "version": "1.0",
  "limitExponent": 0.5,  // Default exponent for the Model (0.5 for Existing, 2.0 for New)
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

**Recommended Approach:** Administrators can modify the scorecards via the **"Scorecard Management" (จัดการโมเดลให้คะแนน)** tab in the frontend UI. This provides a user-friendly dynamic form with built-in mathematical validation to ensure total weights remain perfectly balanced before saving.

**Manual Approach (Not Recommended):** If editing the JSON files directly:

### 1. Changing Weights
Locate the `weight` property under any factor and update it.
*Ensure total weights sum to the exact original total (e.g., 200).*

### 2. Updating Rules
*   `min`: Inclusive lower bound.
*   `max`: Exclusive upper bound.
*   `score`: The multiplier (0.25 - 2.0).

### 3. Size and Grade Definitions (Dynamic Calculation)
The system calculates Size (`S`, `M`, `L`) and Grade (`D` through `A+`) boundaries dynamically based on the total max possible score in their respective categories.

*   **Size**: Total max score of factors in components `C1` + `C2`.
*   **Grade**: Total max score of factors in component `C3`.

In the configuration file, you define these categories as an array of labels, **ordered from lowest to highest score**.

```json
  "size_definitions": ["S", "M", "L"],
  "grade_definitions": ["D", "C", "B", "B+", "A", "A+"]
```
The model automatically divides the maximum possible score evenly into sections to determine the thresholds. If factor weights change, the Size and Grade thresholds scale automatically.

### 4. Configuring the Limit Curve
To change the sensitivity of the credit limit calculation, adjust the `limitExponent` in the respective configuration file (`credit_scorecard_v1.json` or `credit_scorecard_existing_v1.json`).
*   **Higher Exponent (e.g., 2.5):** Steeper curve. Low scores get very low limits; high scores get much higher limits.
*   **Lower Exponent (e.g., 1.0 or 0.5):** Flatter/Linear relationship.

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

### Runtime Override Payload (Manual Review Modal)

In addition to static JSON configuration, the scoring API also supports runtime overrides from the reviewer modal.

```json
{
  "custom_weights": "{...}",
  "max_score_factors": "[\"capacity_check\", \"turnover_speed\", \"purchase_trend\"]"
}
```

Rules:
- `custom_weights` must preserve the same component/factor structure as the scorecard config.
- Total overridden weight must sum to exactly `200` (tolerance `0.01` for floating point variance).
- If weight sum is invalid, backend rejects `custom_weights` and falls back to default config weights.
- `max_score_factors` is optional and contains factor keys to force at the highest rule score during evaluation.

UI behavior:
- The reviewer modal validates total weight before recalculation/save.
- `Reset all weights` restores model default weights loaded from `/api/scorecard/:modelType`.

---

## Verification

After modifying any configuration:
1.  Run the verification script (if available).
2.  Test with a known customer profile.
3.  Verify that the **"Matched Rule"** in the report output aligns with your changes.
4.  If runtime overrides are used, verify payload fields (`custom_weights`, `max_score_factors`) are present in the analyze request.
5.  Confirm forced factors report a forced-max matched rule and produce expected score impact.

### Calculation Formula (Factor Level)
$$ \text{Final Score} = \text{Rule Score} \times \left( \frac{\text{Weight}}{2.0} \right) $$
