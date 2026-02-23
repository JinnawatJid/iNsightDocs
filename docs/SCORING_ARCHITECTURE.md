# Scoring Architecture

## Overview
The credit scoring system uses a **Configuration-Driven Strategy Pattern** (Decision Engine) to evaluate customer creditworthiness.

This architecture separates the "Controller" (which handles HTTP requests and data gathering) from the "Scoring Logic" (which calculates the grade and limit).

## Directory Structure
```text
backend/services/scoring/
├── ScoringEngine.js           # The Factory: Entry point for scoring
├── ScorecardEvaluator.js      # The Evaluator: Generic service that processes JSON rules
├── strategies/
│   ├── BaseScorecard.js       # Shared logic (C1, C2) - Uses Evaluator
│   └── NewCustomerScorecard.js      # Logic for New Customers (C3) - Uses Evaluator
backend/config/
└── credit_scorecard_v1.json   # The Brain: All business rules, weights, and thresholds
```

## Configuration-Driven Logic
Instead of hardcoding rules in JavaScript (e.g., `if (years > 10)`), all business logic is stored in `backend/config/credit_scorecard_v1.json`.

### How it works:
1.  **ScoringEngine** selects the strategy (currently standardized on `NewCustomerScorecard`).
2.  **Strategies** (like `BaseScorecard`) calculate raw values (e.g., "5 Years").
3.  **Strategies** call `ScorecardEvaluator.evaluate('C1', 'yearsInBusiness', 5)`.
4.  **ScorecardEvaluator** loads the JSON, finds the matching rule, and returns the score and the **Matched Rule Label** (e.g., "Stable (5-10 Years)").

## Strategies

### 1. New Customer (`NewCustomerScorecard.js`)
- **Focus:** Financial stability (C1, C2) and Purchase Behavior (C3).
- **Output:**
  - Recommended Limit: **50,000 - 500,000 THB** (Calculated based on Score).
  - Grade: A+ to D.

*(Note: `ExistingCustomerScorecard` has been deprecated in favor of a unified V1 model)*

## Maintenance Guide

### How to Modify Scoring Rules
**Do not edit JavaScript files to change weights or thresholds.**

1.  Open `backend/config/credit_scorecard_v1.json`.
2.  Locate the Factor you want to change (e.g., `yearsInBusiness`).
3.  **To Change Weights:** Update the `"weight"` field.
4.  **To Change Thresholds:** Update the `"min"` or `"max"` fields in the `rules` array.
5.  **To Change Scores:** Update the `"score"` field (Range 0.0 - 2.0).
6.  **To Change Labels:** Update the `"label"` field. This text appears directly on the frontend report.

### Adding a New Factor
1.  Add the new factor definition to `credit_scorecard_v1.json`.
2.  Update `NewCustomerScorecard.js` (or Base) to calculate the value for this new factor.
3.  Call `evaluator.evaluate(...)` with the new factor key.
