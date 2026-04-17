# Scoring Architecture

## Overview
The credit scoring system uses a **Policy-Based Strategy Pattern** (Decision Engine) to select the appropriate scoring model based on the customer's relationship with the company.

This architecture separates the "Controller" (which handles HTTP requests and data gathering) from the "Scoring Logic" (which calculates the grade and limit).

## Directory Structure
```text
backend/services/scoring/
├── ScoringEngine.js           # The Factory: Decides which strategy to use
├── strategies/
│   ├── BaseScorecard.js       # Shared logic (C1, C2, Helper methods)
│   ├── NewCustomerScorecard.js      # Logic for New Customers (Cap 500k)
│   └── ExistingCustomerScorecard.js # Logic for Existing Customers (Limit Adjustment)
```

## Strategies

### 1. New Customer (`NewCustomerScorecard.js`)
- **Trigger:** Request type is `เครดิตใหม่` (or passed to backend as `model_type="new"`).
- **Focus:** Financial stability and potential.
- **Output:**
  - Recommended Limit: **50,000 - 500,000 THB** (Calculated based on Score).
  - Grade: A+ to D.

### 2. Existing Customer (`ExistingCustomerScorecard.js`)
- **Trigger:** Request type implies an existing relationship, such as `เครดิตเพิ่ม`, `เปลี่ยนแปลงคำขอเครดิต`, `เปลี่ยนแปลงเงื่อนไขการชำระเงิน` (passed to backend as `model_type="existing"`).
- **Focus:** Purchase behavior and Payment history.
- **Output:**
  - Recommended Limit: **Current Limit * Adjustment Factor**.
  - **Adjustment Factors:**
    - Grade A+ (Score >= 81): **+20%**
    - Grade A  (Score >= 66): **+10%**
    - Grade B+ (Score >= 50): **+0%** (Maintain)
    - Grade B  (Score >= 35): **-10%** (Reduce)
    - Grade C  (Score >= 20): **-20%** (Reduce)
    - Grade D  (Score < 20):  **-50%** (Drastic Reduction)

## Adding New Features

### Implementing Late Payment Logic
Currently, `ExistingCustomerScorecard.js` contains a placeholder method `calculateLatePaymentScore`. To implement the real logic:

1. Update `financialController.js` to fetch the Late Payment data from the new API.
2. Pass this data into the `scoringContext` object.
3. Update `ExistingCustomerScorecard.js`:

```javascript
    calculateLatePaymentScore(paymentData) {
        // Example Implementation
        if (!paymentData) return 0;

        const avgLateDays = paymentData.averageDaysLate;

        if (avgLateDays > 30) return -20; // Heavy penalty
        if (avgLateDays > 7) return -10;  // Moderate penalty
        return 0; // Good payer
    }
```

## Maintenance Guide
- **To Change Weights & Thresholds:** Use the **Scorecard Management UI** in the Frontend Admin Panel to safely modify weights and thresholds without touching code. The UI directly updates the `backend/config/credit_scorecard_v1.json` and `credit_scorecard_existing_v1.json` files.
- **To Add a New Factor:** Add the new factor definition to the relevant JSON configuration file, then update the backend scoring components to pass the correct value to the `ScorecardEvaluator`.
- **To Add a New Strategy:**
  1. Create a new JSON configuration file in `backend/config/`.
  2. Create `strategies/VIPScorecard.js`.
  3. Extend `BaseScorecard`.
  4. Implement `calculateScore` and utilize `ScorecardEvaluator`.
  5. Update `ScoringEngine.js` to add the condition for selecting the VIP strategy.
