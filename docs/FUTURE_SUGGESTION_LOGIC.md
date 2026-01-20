# Future Credit Suggestion Logic & Industry Standards

This document outlines the proposed logic for enhancing the "Suggestions" (คำแนะนำ) section of the Credit Scoring System. It focuses on handling negative behavioral indicators like Late Payments and Bounced Checks (Cheque Returns), based on industry standards and user feedback.

## 1. Industry Standards Overview

In standard Credit Risk Management systems, customer behavior is categorized not just by volume (Sales) but by **Payment Performance**.

### A. Days Past Due (DPD)
Late payments are typically bucketed into timeframes to determine risk severity:
- **0 Days:** Current / Good Standing.
- **1-30 Days (Watchlist):** Operational delay or minor liquidity issue. usually triggers a "Warning".
- **31-60 Days (Substandard):** Serious liquidity issue. usually triggers "Credit Hold".
- **61-90+ Days (Doubtful/Loss):** Default risk. usually triggers "Legal Action" or "Write-off".

### B. Cheque Returns (Bounced Checks)
A bounced check (Nonsufficient Funds - NSF) is a **High Severity** signal. Unlike a late transfer which might be forgetfulness, a bounced check indicates a failure of promised liquidity.
- **Industry Standard:** "Zero Tolerance" or "Strike System" (e.g., 3 strikes = Account Termination).
- **Implication:** Even one bounced check often overrides "High Purchase Volume" status.

---

## 2. Proposed Suggestion Logic & Texts

We propose replacing/augmenting the current hardcoded messages with dynamic logic based on the following conditions.

### Scenario A: Late Payments

| Condition (DPD) | Risk Level | Proposed Suggestion Text (Thai) | Actionable Advice |
| :--- | :--- | :--- | :--- |
| **Late < 5 Days** | Low | "มีการชำระเงินล่าช้าเล็กน้อย (ไม่เกิน 5 วัน) เป็นบางครั้ง" | "ควรตักเตือนเรื่องกำหนดชำระ" |
| **Late 5 - 15 Days** | Medium | "มีการชำระเงินล่าช้าเฉลี่ย 5-15 วัน ควรติดตามใกล้ชิด" | "พิจารณาลดระยะเวลาเครดิต (Credit Term)" |
| **Late > 15 Days** | High | "มีประวัติชำระเงินล่าช้าเกิน 15 วัน สม่ำเสมอ" | "ระงับการเพิ่มวงเงิน หรือขอหลักทรัพย์ค้ำประกัน" |

### Scenario B: Cheque Returns (Bounced Checks)

| Condition | Risk Level | Proposed Suggestion Text (Thai) | Actionable Advice |
| :--- | :--- | :--- | :--- |
| **History of Return** | Critical | "มีประวัติเช็คเด้ง (Cheque Return) ในระบบ" | "งดปล่อยสินเชื่อ หรือรับเฉพาะเงินสด (Cash Only)" |
| **Return > 3 times** | Blacklist | "เป็นลูกค้ากลุ่ม Blacklist (เช็คเด้งซ้ำซ้อน)" | "ห้ามอนุมัติวงเงินทุกกรณี" |

---

## 3. Display Logic & UI Recommendations

To ensure users notice these risks, we recommend a **"Traffic Light"** system and a **Priority Override** logic.

### A. Priority Override
**Negative Signals > Positive Signals.**
*Currently, the system might say "Good Customer (High Volume)" AND "Late Payment".*
**New Logic:** If Risk Level is **High/Critical**, the "High Volume" badge should be deemphasized or accompanied by a Warning.

**Example:**
> *Before:* "ลูกค้าชั้นดี มียอดซื้อสูง"
> *After (with Bounced Check):* "ยอดซื้อสูง **แต่มีความเสี่ยงสูง (มีประวัติเช็คเด้ง)**"

### B. Visual Coding (UI)
The `CreditScoreSummary.vue` component should update its list rendering to support types:

- **Green (Positive):**
  - "ลูกค้าชั้นดี มียอดซื้อสะสมสูง"
  - "มีการสั่งซื้อต่อเนื่อง"
- **Orange (Warning):**
  - "มีการชำระเงินล่าช้าเฉลี่ย 5-15 วัน"
  - "ยอดการสั่งซื้อมีแนวโน้มลดลง"
- **Red (Critical):**
  - "มีประวัติเช็คเด้ง"
  - "มีประวัติหนี้เสีย"

---

## 4. Data Requirements (Future Implementation)

To implement this, the backend (`customerController.js`) will need access to the following data points (likely in `AY_ACCUM` or a new `CustomerPerformance` table):

1.  **`AvgDaysOverdue` (Integer):** Average number of days payments are late.
2.  **`MaxDaysOverdue` (Integer):** The worst late payment record.
3.  **`ChequeReturnCount` (Integer):** Number of bounced checks in the last 12 months.
4.  **`LastPaymentDate` (Date):** To calculate recency.

### Example Mock Data Structure
```json
{
  "financial_behavior": {
    "avg_late_days": 7,
    "cheque_return_count": 1,
    "is_blacklist": false
  }
}
```

---

## 5. Alternative Suggestions for 'Trend' (User Preference: Total Purchase)

**Context:** Key users (P'Bee, P'Joy) have indicated that the "Purchase Trend" (Trend) metric is less relevant to their decision-making than "Total Purchase Amount" (Volume). They find the "Trend Down" warning (e.g., "ยอดการสั่งซื้อมีแนวโน้มลดลง") less helpful than knowing the absolute state of sales volume.

We propose replacing or supplementing the generic "Trend Down" warning with one of the following options that focus on **Sales Volume**.

### Option 1: "Period-over-Period Volume" (Comparison of Totals)
Focuses on the *fact* that the total amount has decreased, rather than a rate/percentage.
*   **Concept:** Compare `Total Purchase (Current 3 Months)` vs `Total Purchase (Previous 3 Months)`.
*   **Logic:** `If (CurrentTotal < PreviousTotal)`
*   **Proposed Text:** **"ยอดซื้อรวมลดลงเมื่อเทียบกับรอบก่อนหน้า"** (Total purchase amount decreased compared to previous round).
*   **Why:** Directly addresses the "Total Purchase" metric.

### Option 2: "Latest Month vs Average" (Immediate Volume Drop)
Highlights if the *most recent* month is performing poorly compared to the customer's usual standard.
*   **Concept:** Detect if the latest month is dragging down the average.
*   **Logic:** `If (LatestMonthSales < AverageMonthlySales)`
*   **Proposed Text:** **"ยอดซื้อเดือนล่าสุดต่ำกว่าค่าเฉลี่ยปกติ"** (Latest month purchase is below normal average).
*   **Why:** Actionable insight; suggests immediate contact is needed.

### Option 3: "High Volume Reassurance" (Ignore the dip)
If the customer is a "High Value" customer (Tier 1/2), minor trend fluctuations should not generate negative warnings.
*   **Concept:** Prioritize the "Good Standing" status over minor negative trends.
*   **Logic:** `If (TotalPurchase > 1,000,000) AND (Trend < 0)`
*   **Proposed Text:** **"ยอดซื้อรวมยังอยู่ในเกณฑ์ดีเยี่ยม"** (Total purchase remains at an excellent level).
*   **Why:** Prevents false alarms for VIP customers who might just have a slow month.
