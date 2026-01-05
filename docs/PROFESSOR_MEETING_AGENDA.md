# Meeting Agenda: Credit Request System Development

**Objective:** Project Progress Report & Business Logic Validation
**Attendees:** Student, Professor
**Context:** Reviewing the development of the "Offline-First" Credit Request System, with a focus on the automated Credit Scoring Logic.

---

## 1. Project Progress & Architecture (Brief Overview)
*Goal: Demonstrate that the "Foundation" is solid and ready for the complex logic.*

*   **Current Status:**
    *   **Frontend:** Complete. All forms (General, Address, Financial) are implemented with strict Thai-language validation.
    *   **Backend:** Functioning. Handles file uploads, PDF generation, and database (SQLite) operations.
    *   **Deployment Strategy:** "Native Bundle" (Node.js + Source) for Windows 11 Home (Offline/Air-gapped).
*   **Demo Points:**
    *   Show the **"Phone-Assisted" Map Flow** (QR Code) – *innovative solution for offline constraints*.
    *   Show the **PDF Generation** – *proof of "End-to-End" completion*.

---

## 2. Deep Dive: Credit Scoring Logic (Main Discussion)
*Goal: Validate the mathematical model and business rules designed in `CREDIT_SCORING_DESIGN.md`.*

### A. The "Risk-Adjusted" Formula
We proposed a quadratic curve to penalize low scores more heavily than a linear line.
$$
Limit = Min + (Max - Min) \times \left( \frac{Score}{200} \right)^2
$$
*   **Discussion Point:** Is the exponent ($n=2$) sufficient for risk aversion? Should we be more aggressive ($n=2.5$) or lenient ($n=1.5$)?

### B. The "Hybrid" Data Strategy
*   **Concept:** We combine **Internal Data** (Purchase History from `AY_ACCUM`) with **External Data** (Financial Statements from DBD).
*   **Strategy:** Users will upload the **DBD Excel File**, and our backend will parse it to extract ratios (D/E, ROA, etc.).
*   **Discussion Point:** For "Individual" customers (who have no DBD Financial Statements), we currently rely purely on **Purchase Behavior** (C3). Is this sufficient, or should we introduce a "Personal Asset" score?

### C. "Gatekeeper" Logic (The Hard Blocks)
We designed rules that *block* a credit increase regardless of the score:
1.  **Late Payment Rule:** Block if any payment was >5 days late.
2.  **Utilization Rule:** Block if current credit utilization is < 50% (Why give more if they don't use what they have?).
*   **Crucial Question:** Are these rules too strict? Specifically, is the **50-60% utilization threshold** realistic for this industry?

### D. The "Dynamic Max" Limit
For existing customers, the Maximum Limit is capped at **$3 \times$ Average Monthly Sales**.
*   **Source:** Average of (Jun + Jul + Aug) / 2.
*   **Discussion Point:** Confirm the multiplier (3x). Does this align with the standard "Quarterly Operating Cycle" theory?

---

## 3. Future Roadmap & Technical Consultation
*Goal: Confirm the path forward.*

*   **Immediate Next Step:** Implement the **DBD Excel Parser** to feed the scoring model.
*   **OCR Integration:** Currently paused. We plan to move OCR to a separate Python Microservice later to keep the main Node.js app lightweight.
    *   *Question:* Is this architectural split acceptable?

---

## 4. Summary of Decisions Required
1.  [ ] Approval of the **$Score^2$ Formula**.
2.  [ ] Confirmation of the **Individual vs. Company** scoring separation.
3.  [ ] Validation of the **Gatekeeper Rules** (5-day late, 50% utilization).
