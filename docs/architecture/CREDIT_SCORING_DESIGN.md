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

## 3. Data Strategy (Hybrid Source - Phase 1)

The scoring model relies on a hybrid data strategy, combining internal transaction history with verified external financial data.

### 3.1 Internal Data (Purchase Behavior)
*   **Source:** `AY_ACCUM` table in the application database.
*   **Content:** Monthly purchase history, trend analysis, and payment discipline.
*   **Usage:** Used primarily for **Category C3 (Purchase Behavior)** and the "Dynamic Max" calculation.

### 3.2 External Data (Financial Strength) - *Partially Automated*
*   **Source:** **DBD (Department of Business Development)** Financial Statements.
*   **Format:** Three separate Excel files (`.xlsx`): Balance Sheet, Profit & Loss, and Financial Ratios.
*   **Mechanism:**
    *   **Automated Parsing:** The user uploads the 3 Excel files to the Credit Request system (`StoreStatementTab`).
    *   **Manual Input:** The **Registered Capital** is entered manually (as it resides in the Company Profile image, not the Excel sheets).
    *   The system parses the Excel files to extract:
        *   Non-Current Liabilities (`หนี้สินไม่หมุนเวียน`)
        *   Shareholder's Equity (`ส่วนของผู้ถือหุ้น`)
        *   Total Revenue (`รายได้รวม`)
        *   Gross Profit (`กำไร(ขาดทุน) ขั้นต้น`)
        *   D/E Ratio (`อัตราส่วนหนี้สินรวมต่อส่วนของผู้ถือหุ้น`)
        *   Inventory Turnover (`อัตราการหมุนเวียนสินค้าคงเหลือ`)
    *   **Calculations:**
        *   **DSCR** = `(Gross Profit / Non-Current Liabilities) * 0.3`
        *   **Credit/Capital Ratio** = `Request Amount / Registered Capital`

## 4. The Mathematical Formula

The core formula for determining the Credit Limit is:

$$
Credit = Min + (Max - Min) \times \left( \frac{Score}{200} \right)^n
$$

*   **Min:** The lower bound of the credit range.
*   **Max:** The upper bound of the credit range.
*   **Score:** The calculated customer score (0 to 200).
*   **n (Exponent):** We use **$n=2$**. This creates a "Quadratic Curve" which is safer than a linear line. It grants strictly lower credit for mediocre scores, protecting the company from risk.

### 4.1 Scenario A: New Credit Request
For a customer who has never had credit with us before.
*   **Min:** 50,000 THB (System Policy Minimum)
*   **Max:** 500,000 THB (Company Policy Cap for New Customers)
*   **Logic:** A safe, bounded range to test the new relationship.

### 4.2 Scenario B: Credit Limit Increase
For an existing customer requesting more credit.
*   **Min:** **Current Credit Limit**.
    *   *Rationale:* We should never recommend a limit *lower* than what they already have and are paying for successfully.
*   **Max:** **$3 \times$ Average Monthly Sales**.
    *   *Source:* Calculated from `AY_ACCUM` table (Average of Jun, Jul, Aug / 2).
    *   *Rationale:* This ties the limit to their proven capability. If they buy 100k/month, their max theoretical limit is 300k.
*   **Logic:** This allows the "ceiling" to float upwards as the customer grows.

## 5. Scoring Criteria (The 200 Points)

The Score (0-200) is calculated from three pillars.
*   **Companies:** Score = C1 + C2 + C3.
*   **Individuals:** Score is derived heavily from Purchase Behavior (C3 logic adjusted or standalone).

### 5.1 C1: Company Strength (Performance) - Max 49 Points
*Data Source: DBD Excel File & Manual Input*

| Criterion | Weight (%) | Raw Score Criteria (Score/2) | Max Points |
| :--- | :---: | :--- | :---: |
| **1. Years in Business**<br>*(Stability)* | **7.21%** | ≥ 10 yrs: 2.0<br>≥ 5 yrs: 1.5<br>≥ 3 yrs: 1.0<br>≥ 1 yr: 0.5<br>< 1 yr: 0.25 | **14.42** |
| **2. Requested Credit / Registered Capital**<br>*(Leverage)* | **4.32%** | ≤ 0.5x: 2.0<br>0.51 - 0.9x: 1.5<br>0.91 - 1.5x: 1.0<br>1.51 - 1.99x: 0.5<br>≥ 2x: 0.25 | **8.64** |
| **3. Asset Ownership**<br>*(Collateral Potential)* | **12.97%** | Asset > Credit: 2.0<br>Asset < Credit: 1.5<br>Rental: 1.0 | **25.94** |
| **Total C1** | **24.5%** | | **49.00** |

### 5.2 C2: Cash Flow - Max 55.02 Points
*Data Source: DBD Excel File (Financial Ratios)*

| Criterion | Weight (%) | Raw Score Criteria (Score/2) | Max Points |
| :--- | :---: | :--- | :---: |
| **1. D/E Ratio**<br>*(Debt to Equity)* | **12.38%** | ≤ 1: 2.0<br>≤ 1.5: 1.6<br>≤ 2: 1.2<br>≤ 3: 1.0<br>> 3: 0.0 | **24.76** |
| **2. Inventory Turnover**<br>*(Efficiency)* | **6.88%** | ≥ 12 times: 2.0<br>≥ 8 times: 1.5<br>≥ 6 times: 1.0<br>≥ 4 times: 0.5<br>< 4 times: 0.0 | **13.76** |
| **3. DSCR**<br>*(Debt Service Coverage)* | **8.25%** | ≥ 0.5: 2.0<br>≥ 0.4: 1.5<br>≥ 0.33: 1.0<br>≥ 0.25: 0.5<br>< 0.25: 0.0 | **16.50** |
| **Total C2** | **27.5%** | | **55.02** |

### 5.3 C3: Purchase Behavior - Max 95.98 Points
*Data Source: Internal `AY_ACCUM` & Request Data*

| Criterion | Weight (%) | Raw Score Criteria (Score/2) | Max Points |
| :--- | :---: | :--- | :---: |
| **1. Revenue / Registered Capital**<br>*(Efficiency)* | **1.52%** | ≥ 1.5x: 2.0<br>1.00 - 1.49x: 1.5<br>0.60 - 0.99x: 1.0<br>0.26 - 0.59x: 0.5<br>≤ 0.25x: 0.25 | **3.04** |
| **2. Avg Purchase (3mo) / Requested Credit**<br>*(Capacity Check)* | **17.52%** | ≥ 1.5x: 2.0<br>1.00 - 1.49x: 1.5<br>0.60 - 0.99x: 1.0<br>0.26 - 0.59x: 0.5<br>≤ 0.25x: 0.25 | **35.04** |
| **3. Purchase / Credit Term**<br>*(Turnover Speed)* | **9.14%** | **Formula:** $\frac{1.5 \times (AvgPurchase \times \frac{ReqDays}{30})}{ReqCredit}$<br><br>≥ 1.5x: 2.0<br>1.00 - 1.49x: 1.5<br>0.60 - 0.99x: 1.0<br>0.26 - 0.59x: 0.5<br>≤ 0.25x: 0.25<br>(If Ratio=0 with valid Term, Score is 0.5) | **18.28** |
| **4. Purchase Trend**<br>*(Growth)* | **14.48%** | **Based on Linear Regression Slope (Amount):**<br>Slope > 16,008.34: 2.0<br>Slope ≥ 205.52: 1.5<br>Slope ≥ -0.01: 1.0<br>Slope ≥ -4,654.54: 0.5<br>Else: 0.25<br>(If Total Purchase (3mo) = 0, Score is 0) | **28.96** |
| **5. Customer Duration**<br>*(Loyalty)* | **5.33%** | ≥ 7 yrs: 2.0<br>4 - 6 yrs: 1.5<br>1 - 3 yrs: 1.0<br>< 1 yr: 0.5 | **10.66** |
| **Total C3** | **48.0%** | | **95.98** |

**Grand Total Score: 200 Points**

## 6. Risk Control (Gatekeepers)

Before the formula is even applied, the customer must pass specific **"Eligibility Gates"**. If they fail these, the system will not recommend an increase, regardless of their score.

1.  **Payment Discipline:**
    *   **Rule:** No late payments exceeding **5 days** in the recent period.
    *   *Action:* If failed, **STOP**. Request is rejected automatically.
2.  **Credit Utilization:**
    *   **Rule:** Customer should be using **50-60%** of their existing limit.
    *   *Action:* If utilization is too low (e.g., <30%), the system raises a **WARNING**: "Current limit appears sufficient; increase may not be justified."

## 7. Technical Implementation Strategy

### 7.1 Database
*   **`Customers` Table:** Stores the `Current Credit Limit` and demographic data.
*   **`AY_ACCUM` Table:** Stores the monthly sales data used to calculate the "Dynamic Max".

### 7.2 Backend Logic (`financialController.js`)
*   **`analyzeFinancials` function:**
    *   Parses DBD Excel files (`xlsx` library).
    *   Extracts key financial figures using Thai header matching.
    *   Calculates Ratios (DSCR, D/E, etc.).
    *   Returns structured data to Frontend.

### 7.3 Future Roadmap
*   **Automated Payment Check:** Integrate with the Accounting/ERP system to automatically pull "Days Late" data for the Gatekeeper check.
*   **AI Scoring:** Eventually replace the fixed-weight scoring with a Machine Learning model trained on historical NPL data.
