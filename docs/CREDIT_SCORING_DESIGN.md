# Credit Scoring Model Design Document

## 1. Executive Summary
This document outlines the design for the automated **Credit Scoring System** to be integrated into the Credit Request application. The system aims to replace subjective manual credit assessments with a scientific, risk-adjusted scoring model. It handles two primary scenarios: **New Credit Requests** (for new customers) and **Credit Limit Increases** (for existing customers).

The core of the system is an exponential scoring formula that calculates a recommended credit limit based on a customer's **Score (0-200)**, derived from Company Strength, Cash Flow, and Purchase Behavior.

## 2. Background & Significance

### 2.1 The Problem
*   **Subjectivity:** Manual credit limits are often determined by "gut feeling" rather than data, leading to inconsistency.
*   **Risk vs. Opportunity:** Setting limits too high increases Non-Performing Loans (NPL). Setting them too low ("Credit Strangulation") prevents good customers from growing their business with us.
*   **Scalability:** Manual review is slow and cannot scale as the customer base grows.

### 2.2 The Solution
We introduce a **Score-Based Dynamic Limit** system.
*   **Risk Control (NPL Prevention):** We use an **exponential curve ($Score^2$)** rather than a linear one. This means low scores are heavily penalized (getting very low limits), ensuring safety. High scores are rewarded disproportionately, encouraging growth for safe customers.
*   **Dynamic Growth:** For existing customers, the "Max Limit" is tied to their actual **Purchase Capacity** ($3 \times$ Average Sales). This allows the credit limit to grow naturally alongside the customer's business success.

## 3. The Mathematical Formula

The core formula for determining the Credit Limit is:

$$
Credit = Min + (Max - Min) \times \left( \frac{Score}{200} \right)^n
$$

*   **Min:** The lower bound of the credit range.
*   **Max:** The upper bound of the credit range.
*   **Score:** The calculated customer score (0 to 200).
*   **n (Exponent):** We use **$n=2$**. This creates a "Quadratic Curve" which is safer than a linear line. It grants strictly lower credit for mediocre scores, protecting the company from risk.

### 3.1 Scenario A: New Credit Request
For a customer who has never had credit with us before.
*   **Min:** 50,000 THB (System Policy Minimum)
*   **Max:** 500,000 THB (Company Policy Cap for New Customers)
*   **Logic:** A safe, bounded range to test the new relationship.

### 3.2 Scenario B: Credit Limit Increase
For an existing customer requesting more credit.
*   **Min:** **Current Credit Limit**.
    *   *Rationale:* We should never recommend a limit *lower* than what they already have and are paying for successfully.
*   **Max:** **$3 \times$ Average Monthly Sales**.
    *   *Source:* Calculated from `AY_ACCUM` table (Average of Jun, Jul, Aug / 2).
    *   *Rationale:* This ties the limit to their proven capability. If they buy 100k/month, their max theoretical limit is 300k.
*   **Logic:** This allows the "ceiling" to float upwards as the customer grows.

## 4. Scoring Criteria (The 200 Points)

The Score (0-200) is calculated from three pillars:

| Component | Description | Applicability |
| :--- | :--- | :--- |
| **1. Company Strength** | Registered capital, Years in business, Asset value. | Company Only |
| **2. Cash Flow** | Analysis of financial documents (Bank Statements). | Company Only |
| **3. Purchase Behavior** | Frequency, Amount, and Trend of purchases (from `AY_ACCUM`). | All Customers (Individual & Company) |

*   **Individuals:** Score is derived heavily from Purchase Behavior.
*   **Companies:** Score is a weighted average of all three components.

## 5. Risk Control (Gatekeepers)

Before the formula is even applied, the customer must pass specific **"Eligibility Gates"**. If they fail these, the system will not recommend an increase, regardless of their score.

1.  **Payment Discipline:**
    *   **Rule:** No late payments exceeding **5 days** in the recent period.
    *   *Action:* If failed, **STOP**. Request is rejected automatically.
2.  **Credit Utilization:**
    *   **Rule:** Customer should be using **50-60%** of their existing limit.
    *   *Action:* If utilization is too low (e.g., <30%), the system raises a **WARNING**: "Current limit appears sufficient; increase may not be justified."

## 6. Technical Implementation Strategy

### 6.1 Database
*   **`Customers` Table:** Stores the `Current Credit Limit` and demographic data.
*   **`AY_ACCUM` Table:** Stores the monthly sales data used to calculate the "Dynamic Max".

### 6.2 Backend Logic (`customerController.js`)
*   **`calculateCreditScore()` function:**
    1.  Fetches `AY_ACCUM` data.
    2.  Calculates `AvgMonthlySales`.
    3.  Determines `Max` (500k for New, $3 \times$ Avg for Increase).
    4.  Runs the Gatekeeper checks.
    5.  Applies the Formula.
    6.  Returns the `RecommendedLimit`.

### 6.3 Future Roadmap
*   **Automated Payment Check:** Integrate with the Accounting/ERP system to automatically pull "Days Late" data for the Gatekeeper check.
*   **AI Scoring:** Eventually replace the fixed-weight scoring with a Machine Learning model trained on historical NPL data.
