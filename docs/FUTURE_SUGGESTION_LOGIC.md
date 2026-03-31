# Credit Score Suggestion Logic & Standards

This document outlines the implemented logic and industry standards for the "Suggestions" (คำแนะนำ) section of the Credit Scoring System on the `/create-credit-request` dashboard.

## 1. Core Principles

Based on user feedback and financial industry standards, the suggestion text generation follows these core principles:
- **Conciseness:** Suggestions must be skimmable. Filler words (e.g., "มีการ", "ลูกค้ามี") and parentheses `()` are strictly avoided.
- **Data-Driven:** Recommendations dynamically parse real behavioral data (Sales Volume, Consistency, Slope/Trend, and Weighted Average Days Late - WADL).
- **Graceful Degradation:** If external APIs (like the WADL payment API) fail, the system renders a fallback message ("ไม่สามารถดึงข้อมูลประวัติการชำระเงินได้") instead of crashing the summary.

## 2. Implemented Logic & Text Strings

The system evaluates four distinct categories of a customer's purchasing behavior to generate the summary text.

### A. ยอดซื้อสะสม (Total Purchase Volume)
*Evaluated based on the sum of purchases over the last 3 completed months.*

| Condition | Risk Level | Output Text (Thai) |
| :--- | :--- | :--- |
| `> 1,000,000` บาท | 🟢 Green | `เป็นลูกค้าชั้นดี มียอดซื้อสะสมสูง` |
| `> 300,000` บาท | 🟡 Amber | `มียอดซื้อสะสมปานกลาง` |
| `> 0` บาท | 🟡 Amber | `ยอดซื้อสะสมอยู่ในระดับทั่วไป` |
| `0` บาท | 🔴 Red | `ไม่มียอดซื้อสะสมในช่วง 3 เดือนล่าสุด` |

### B. ความต่อเนื่องในการซื้อ (Purchase Consistency)
*Evaluated by checking how many of the last 3 months had active sales `> 0`.*

| Condition | Risk Level | Output Text (Thai) |
| :--- | :--- | :--- |
| Active in all 3 months | 🟢 Green | `สั่งซื้อต่อเนื่องทุกเดือนในช่วง 3 เดือนล่าสุด` |
| Active in 1-2 months | 🟡 Amber | `เว้นช่วงการสั่งซื้อบางเดือน` |
| **Churn Warning:** `0` in latest month (but `> 0` in previous) | 🔴 Red | `ไม่มียอดซื้อเดือนล่าสุด ควรติดต่อสอบถามสถานะ` |

### C. แนวโน้มการเติบโต (Trend / Slope Check)
*Evaluated using the mathematical slope of the last 3 months' purchases.*

| Condition | Risk Level | Output Text (Thai) |
| :--- | :--- | :--- |
| `Slope > 0` | 🟢 Green | `แนวโน้มยอดซื้อเติบโต เฉลี่ยเพิ่มขึ้น [X] บาท/เดือน` |
| `Slope < 0` | 🔴 Red | `แนวโน้มยอดซื้อลดลง เฉลี่ยลดลง [X] บาท/เดือน ควรติดตามสาเหตุ` |
| `Slope == 0` (and Sales `> 0`) | 🟢 Green | `ยอดซื้อสม่ำเสมอ` |

### D. ประวัติการชำระเงิน (WADL - Weighted Average Days Late)
*Evaluated using the dedicated WADL API to determine payment punctuality.*

| Condition (WADL Score) | Risk Level | Output Text (Thai) |
| :--- | :--- | :--- |
| `0` Days | 🟢 Green | `ชำระเงินตรงเวลา WADL 0 วัน` |
| `> 0` and `< 5` Days | 🟢 Green | `ประวัติชำระเงินดี จ่ายล่าช้าเฉลี่ย [X] วัน` |
| `>= 5` and `< 10` Days | 🟡 Amber | `ประวัติชำระเงินปานกลาง จ่ายล่าช้าเฉลี่ย [X] วัน` |
| `>= 10` Days | 🔴 Red | `ประวัติจ่ายล่าช้าเฉลี่ยสูงถึง [X] วัน` |
| API Error / Missing | 🔴 Red | `ไม่สามารถดึงข้อมูลประวัติการชำระเงินได้` |

---

## 3. Frontend UI Rendering & Sorting Rules

To maximize the readability and immediate risk-assessment capability of the dashboard, the frontend component (`CreditScoreSummary.vue`) applies the following industry-standard visual rules:

### A. Semantic Color Coding (Traffic Light System)
Colors are applied *exclusively* to the list item's bullet point (via the CSS `::marker` pseudo-element). This approach instantly communicates sentiment without turning the actual text into a hard-to-read "rainbow."
- **🟢 Positive (Green `#28a745`):** Good behaviors (e.g., 'ลูกค้าชั้นดี', 'เติบโต', 'ชำระเงินดี').
- **🟡 Warning (Amber `#ffc107`):** Irregular or average behaviors (e.g., 'ปานกลาง', 'เว้นช่วง').
- **🔴 Negative (Red `#dc3545`):** Risky behaviors or immediate concerns (e.g., 'ไม่มียอดซื้อ', 'ลดลง', 'สูงถึง', 'Error').

### B. Positive-First Sorting
When the backend returns the array of suggestions, the frontend dynamically sorts them by weight (sentiment) before rendering. The enforced top-to-bottom reading order is:
1. **🟢 Green (Positive) points**
2. **🟡 Amber (Warning) points**
3. **🔴 Red (Negative) points**

*Note: In the sorting logic, negative traits explicitly override warning traits if a single string contains keywords from both categories.*

### C. Scoring Breakdown Grid Visual Standards
When displaying detailed scorecards (e.g., in `ScoringBreakdownGrid.vue`), the grid must adhere to the following industry-standard visual hierarchies to ensure readability and quick data scannability:
1. **Top-Down Logical Flow:** Data rows must follow the order of reading comprehension:
   - Row 1: **หัวข้อการประเมิน** (Evaluation Criteria / Factor)
   - Row 2: **ข้อมูลจริง** (Actual Raw Data)
   - Row 3: **คะแนนเต็ม** (Maximum Possible Score / Weight)
   - Row 4: **คะแนนที่ได้** (Obtained Score)
2. **Row Headers (Legend):** A dedicated, fixed-width column (e.g., 140px) must be placed on the leftmost side of the grid to explicitly label what each row represents, preventing "floating numbers" without context.
3. **Performance Metric Highlighting:**
   - The **"คะแนนที่ได้" (Obtained Score)** is the primary performance metric and must be visually highlighted (e.g., using a `.yellow-bg` background).
   - The **"คะแนนเต็ม" (Max Score)** is secondary reference data and must visually recede using a neutral color (e.g., `.white-bg` or light gray). Highlighting the max score creates a false focal point and should be avoided.