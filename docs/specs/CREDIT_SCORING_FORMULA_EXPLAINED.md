# คำอธิบายสูตรการคำนวณวงเงินสินเชื่อ (Credit Limit Calculation Methodology)

เอกสารฉบับนี้จัดทำขึ้นเพื่ออธิบายที่มา หลักการทางคณิตศาสตร์ และทฤษฎีพื้นฐานของสูตรการคำนวณวงเงินสินเชื่อ (Credit Limit) ที่ใช้ในระบบปัจจุบัน โดยเน้นที่การวิเคราะห์เชิงปริมาณ (Quantitative Analysis) และการบริหารความเสี่ยง (Risk Management)

---

## 1. สูตรการคำนวณ (Mathematical Formulation)

สูตรที่ใช้ในการคำนวณวงเงินสินเชื่อจัดอยู่ในรูปแบบของ **Power Function Scaling** หรือ **Non-Linear Interpolation** ดังนี้:

$$ \text{Credit Limit} = \text{Min} + (\text{Max} - \text{Min}) \times \left( \frac{\text{Score}}{\text{TotalScore}} \right)^n $$

### นิยามตัวแปร (Variable Definitions)

| ตัวแปร | ความหมาย (Description) | ค่าที่ใช้ปัจจุบัน (Current Value) | ที่มา/หลักการ (Rationale) |
| :--- | :--- | :--- | :--- |
| **Credit Limit** | วงเงินสินเชื่อที่แนะนำ | (ผลลัพธ์) | เป้าหมายของการคำนวณ (Target Variable) |
| **Min** | วงเงินขั้นต่ำ | 50,000 บาท | **Minimum Viable Exposure:** จุดคุ้มทุนในการบริหารจัดการบัญชีลูกค้า (Operational Breakeven) |
| **Max** | เพดานวงเงินสูงสุด | 500,000 บาท | **Risk Appetite Cap:** เพดานความเสี่ยงสูงสุดที่บริษัทรับได้สำหรับลูกค้าใหม่ (Risk Tolerance Level) |
| **Score** | คะแนนที่ลูกค้าได้รับ | 0 - 200 คะแนน | **Risk Indicator:** ตัวชี้วัดคุณภาพเครดิต (Credit Quality) จากการประเมิน 3 ด้าน (Financial, Behavioral, Company) |
| **TotalScore** | คะแนนเต็ม | 200 คะแนน | **Normalization Factor:** ตัวหารเพื่อปรับฐานคะแนนให้อยู่ในช่วง 0-1 (Scaling Base) |
| **$n$** | ค่าเลขยกกำลัง | 1.2 (หรือ 2.0) | **Sensitivity Parameter:** ตัวกำหนดความโค้งของกราฟเพื่อสะท้อนนโยบายความเสี่ยง (Risk Aversion) |

---

## 2. ทฤษฎีเบื้องหลัง (Theoretical Framework)

สูตรนี้ไม่ได้ถูกสร้างขึ้นโดยไม่มีที่มา แต่เป็นการประยุกต์ใช้ทฤษฎีทางเศรษฐศาสตร์และการบริหารความเสี่ยงดังนี้:

### 2.1 Utility Theory & Risk Aversion (ทฤษฎีอรรถประโยชน์และความเสี่ยง)
ในทางเศรษฐศาสตร์ ฟังก์ชันความพึงพอใจ (Utility Function) ภายใต้ความเสี่ยงมักจะมีลักษณะเป็น **เส้นโค้งคว่ำ (Concave)** หรือ **เส้นโค้งหงาย (Convex)** ขึ้นอยู่กับทัศนคติต่อความเสี่ยง

*   สูตรของเราใช้ $n > 1$ ทำให้กราฟมีลักษณะ **Convex (เส้นโค้งหงาย)**
*   นี่คือการจำลองพฤติกรรม **Risk Aversion (การหลีกเลี่ยงความเสี่ยง)**:
    *   **Low Score (ความเสี่ยงสูง):** วงเงินจะถูกกดให้ต่ำกว่าสัดส่วนคะแนนจริงอย่างมาก (Penalized Disproportionately) เพื่อป้องกันความเสียหายรุนแรง (Principal Protection)
    *   **High Score (ความเสี่ยงต่ำ):** วงเงินจะเพิ่มขึ้นในอัตราเร่ง (Accelerated Reward) เพื่อจูงใจลูกค้าชั้นดี

### 2.2 Control Theory (Signal Conditioning)
ในทางวิศวกรรม นี่คือ **Non-Linear Mapping** หรือ **Gamma Correction**
*   ใช้เมื่อความสัมพันธ์ระหว่าง Input (Score) และ Output (Credit Limit) ไม่ใช่เชิงเส้น (Non-Linear)
*   **Linear ($n=1$):** Score ลด 50% $\rightarrow$ Limit ลด 50%
*   **Non-Linear ($n=1.2$):** Score ลด 50% $\rightarrow$ Limit ลดลงมากกว่า 50% (เช่น ~57%) สะท้อนความจริงที่ว่า "ความน่าจะเป็นในการผิดนัดชำระหนี้ (PD)" มักจะพุ่งสูงขึ้นแบบทวีคูณเมื่อคะแนนลดลง

---

## 3. การวิเคราะห์พารามิเตอร์ (Parameter Sensitivity Analysis)

การกำหนดค่าแต่ละส่วนมีผลต่อพฤติกรรมของโมเดลดังนี้:

### 3.1 ค่าเลขยกกำลัง $n$ (The Exponent)
ค่า $n$ คือ "คันเร่งความเสี่ยง" (Risk Accelerator):

*   **$n = 1.0$ (Linear):** *Risk Neutral*
    *   เหมาะสำหรับ: ธุรกิจที่มีกำไรสูง (High Margin) และยอมรับหนี้เสียได้มาก
*   **$n = 1.2$ (Mildly Convex):** *Moderate Risk Aversion* (ค่าปัจจุบัน)
    *   เหมาะสำหรับ: สินเชื่อ SME ทั่วไป ที่ต้องการความสมดุลระหว่างยอดขายและความเสี่ยง
*   **$n = 2.0$ (Quadratic):** *Strong Risk Aversion*
    *   เหมาะสำหรับ: สินเชื่อที่มีความเสี่ยงสูง (High Risk) หรือช่วงเศรษฐกิจถดถอย
*   **$n = 0.5$ (Square Root):** *Risk Seeking*
    *   เหมาะสำหรับ: Micro Finance หรือสินเชื่อที่ต้องการช่วยผู้มีรายได้น้อยให้เข้าถึงแหล่งเงินทุนได้ง่าย

### 3.2 ช่วงคะแนน 200 (Score Range)
*   เลข 200 เป็นเพียง **Arbitrary Scale** (สเกลสมมติ) เช่นเดียวกับ FICO Score (300-850) หรือ Credit Grade (AAA - D)
*   การเปลี่ยนตัวเลขนี้ (เช่นเป็น 100 หรือ 1000) **ไม่มีผลทางคณิตศาสตร์** ตราบใดที่สัดส่วน $\frac{\text{Score}}{\text{TotalScore}}$ ยังคงเดิม

### 3.3 Min / Max Boundaries
*   เป็นค่าคงที่ทางนโยบาย (Policy Constants) ที่มาจาก:
    *   **Min:** ต้นทุนคงที่ในการดูแลลูกค้า (Fixed Cost per Account)
    *   **Max:** เงินทุนหมุนเวียนของบริษัท (Working Capital) และการกระจายความเสี่ยง (Diversification)

---

## 4. บทสรุป (Conclusion)

สูตรการคำนวณวงเงินสินเชื่อนี้เป็น **Risk-Adjusted Model** ที่ออกแบบตามหลักการ **Expected Utility Theory** โดยใช้ฟังก์ชัน **Power Law ($X^n$)** เพื่อสร้างกลไกการป้องกันความเสี่ยง (Risk Shield) โดยอัตโนมัติ

การเลือกใช้ $n=1.2$ (หรือ 2.0) เป็นการตัดสินใจเชิงกลยุทธ์ (Strategic Decision) เพื่อให้น้ำหนักกับ **"ความปลอดภัยของเงินต้น" (Capital Preservation)** มากกว่าการเติบโตของยอดสินเชื่อเพียงอย่างเดียว ซึ่งสอดคล้องกับมาตรฐานการบริหารความเสี่ยงในสถาบันการเงินชั้นนำ
