# Credit Scoring Configuration Guide

## Overview

The Credit Scoring Model (Standard Scorecard) is now fully configurable via a JSON file. This allows business analysts and developers to adjust weights, thresholds, and scoring rules without modifying the core application code.

**Configuration File Location:**
`backend/config/credit_scorecard_v1.json`

---

## JSON Structure

The configuration file is structured hierarchically:
1.  **Components** (e.g., `c1` - Company Strength, `c2` - Financial Status)
2.  **Factors** (e.g., `years_in_business`, `de_ratio`)
3.  **Rules** (Specific criteria that map values to scores)

### Example Structure

```json
{
  "version": "1.0",
  "components": {
    "c1": {
      "name": "Company Strength",
      "factors": [
        {
          "key": "years_in_business",
          "label": "Years in Business",
          "weight": 14.42,
          "rules": [
            { "min": 10, "score": 2.0, "label": "Established (> 10 Years)" },
            { "max": 10, "score": 1.0, "label": "New (< 10 Years)" }
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
To change the importance of a factor, locate the `weight` property under the factor and update it.

**Example:** Increase importance of "Years in Business"
```json
// Old
"weight": 14.42

// New
"weight": 20.00
```
*Note: Ensure the total weights across all factors sum up to your desired total (usually 100 or 200 depending on the model scale).*

### 2. Updating Thresholds (Rules)
Rules are evaluated in order. The first rule that matches the input value is selected.

**Rule Properties:**
*   `min`: The value must be greater than or equal to this (`>=`).
*   `max`: The value must be strictly less than this (`<`).
*   `match`: (Array) Exact string match (case-insensitive).
*   `score`: The raw score multiplier (typically 0.25 to 2.0).
*   `label`: The description shown in the frontend report.

**Example:** Change the definition of a "Start-up" from < 1 Year to < 2 Years.

*Find the rule for `years_in_business` where label is "Startup":*

```json
// Old
{ "max": 1, "score": 0.25, "label": "Startup (< 1 Year)" }

// New
{ "max": 2, "score": 0.25, "label": "Startup (< 2 Years)" }
```

### 3. Adding New Rules
You can insert new ranges to create more granular scoring tiers.

**Example:** Add a "Very Established" tier for > 20 Years.

```json
// Insert at the TOP of the rules array (since evaluation stops at first match)
{ "min": 20, "score": 2.5, "label": "Very Established (> 20 Years)" },
{ "min": 10, "max": 20, "score": 2.0, "label": "Established (10-20 Years)" },
...
```

---

## Verification

After modifying the configuration, you **must** verify that the changes work as expected and do not introduce errors.

### Running the Verification Script
(Ideally, a dedicated script would exist here. For now, use the application in a test environment).

1.  Start the backend server.
2.  Generate a credit report for a test customer that falls into the modified range.
3.  Check the **Detailed Extraction & Scoring Logic** table in the report.
4.  Confirm that the **Matched Rule / Criteria** column shows your new label and the **Score** reflects the new calculation.

---

## Calculation Formula

The final score for a factor is calculated as:

$$
\text{Final Score} = \text{Rule Score} \times \left( \frac{\text{Weight}}{2.0} \right)
$$

*   **Rule Score:** The value from the JSON rule (e.g., 0.25, 1.0, 2.0).
*   **Weight:** The max weight defined for that factor.
*   **2.0:** The standard max multiplier in this model.

*Example:*
*   Weight: 14.42
*   Rule Score: 1.5
*   Result: $1.5 \times (14.42 / 2.0) = 10.815$
