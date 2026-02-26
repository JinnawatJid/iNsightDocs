# ข้อกำหนด API การวิเคราะห์การจ่ายเงินล่าช้า (Late Payment Analysis)

## 1. ภาพรวม (Overview)
เอกสารนี้ระบุข้อกำหนดและรายละเอียดทางเทคนิคสำหรับ **Late Payment Analysis API** โดยมีจุดประสงค์เพื่อดึงข้อมูลพฤติกรรมการจ่ายเงินของลูกค้าจากระบบ Dynamics 365 ERP

เป้าหมายหลักคือการตรวจสอบว่าลูกค้าจ่ายเงินตรงเวลาหรือไม่ โดยคำนึงถึงทั้งการจ่ายเงินสด/โอน (Cash/Transfer) และการจ่ายเช็ค (Cheque) ซึ่งมีเงื่อนไขการเคลียร์เงินที่ซับซ้อน

### ฟีเจอร์หลัก
- **Aggregated Data:** ส่งข้อมูลรายการหนี้ (Invoices) ทั้งหมดพร้อมสถานะการจ่ายเงินกลับมาในครั้งเดียว ลดการเรียก API หลายรอบ (Round-trip)
- **Business Logic Encapsulation:** ซ่อนความซับซ้อนของการคำนวณ (เช่น วันที่เช็คผ่าน, การจ่ายเงินบางส่วน) ไว้ที่หลังบ้าน
- **Auditability:** มีฟิลด์ `_meta_debug` เพื่อให้สามารถตรวจสอบย้อนกลับไปยังข้อมูลดิบใน ERP ได้

---

## 2. ข้อตกลงการใช้งาน API (API Contract)

### Endpoint
**URL:** `http://192.192.0.37:8280/customer-late-payment/1.0.0`
**Method:** `POST`

### Headers (ส่วนหัว)
| Header | Required | Description |
| :--- | :--- | :--- |
| `Content-Type` | Yes | `application/json` |
| `apikey` | Yes | API Key (กำหนดในตัวแปร `LATE_PAYMENT_API_KEY` ใน backend) |

### Request Body (JSON)
```json
{
  "Customer No_": "08015AY"
}
```

### โครงสร้างข้อมูลตอบกลับ (Response JSON Schema)
API จะส่งกลับ Array ของใบแจ้งหนี้ (หรือ Object ที่มี property `data` ซึ่งเป็น Array)

```json
{
  "success": true,
  "data": [
    {
      "document_no": "INV-2023-1001",
      "posting_date": "2023-01-01",
      "due_date": "2023-01-31",
      "amount": 10000.00,
      "remaining_amount": 0.00,
      "status": "Paid",
      "payment_detail": {
        "payment_date": "2023-02-02",
        "payment_method": "Cheque",
        "is_late": false,
        "late_days": 0,
        "remark": "Paid within 5-day buffer period (จ่ายภายในระยะเวลาอนุโลม 5 วัน)"
      },
      "Effective_Payment_Date": "2025-09-17T00:00:00.000Z",
      "Status": "ON-TIME",
      "Late_Days": 0
    },
    {
      "Invoice_No": "AYVR-6809/0126"
      // ...
    }
  ]
}
```

---

## 3. การตั้งค่าและการแก้ไขปัญหา (Configuration & Troubleshooting)

### ตัวแปรสภาพแวดล้อม (Environment Variables)
Backend ใช้ API Key แยกต่างหากสำหรับบริการนี้ โดยไม่ใช้ Key ของ Customer API หลัก

- **`LATE_PAYMENT_API_KEY`**: API Key สำหรับบริการ Late Payment
- **`CUSTOMER_API_KEY`**: Key สำรองหากไม่ได้ตั้งค่าตัวแปรข้างต้น

### การ Debug
หากพบปัญหาการเชื่อมต่อ (เช่น 403 Forbidden) ให้ใช้สคริปต์ตรวจสอบที่เตรียมไว้:

```bash
node backend/scripts/debug_late_payment.js
```

สคริปต์นี้จะทดสอบรูปแบบ Header ต่างๆ (`apikey`, `x-api-key` ฯลฯ) เพื่อให้มั่นใจว่าสามารถเชื่อมต่อกับ Gateway ได้ถูกต้อง

---

## 4. นิยามตรรกะทางธุรกิจ (Business Logic Definitions)

### 3.1 กฎวันที่มีผลชำระเงิน (Effective Payment Date Rule)
"วันที่ถือว่าชำระเงินจริง" จะคำนวณตามประเภทการจ่ายเงิน ดังนี้:

1.  **เงินสด / โอน (Cash / Transfer):**
    *   `Effective Date` = `Posting Date` (จากตาราง Detailed Cust. Ledg. Entry).
2.  **เช็ค (Cheque):**
    *   **กรณี A (ปกติ):** ถ้า `Cleared Date` (วันที่เช็คผ่าน) ห่างจาก `Check Date` (วันที่หน้าเช็ค) **ไม่เกิน 5 วัน** ให้ใช้ `Check Date` เป็นวันที่มีผลชำระเงิน
    *   **กรณี B (ดำเนินการล่าช้า):** ถ้า `Cleared Date` ห่างจาก `Check Date` **เกิน 5 วัน** ให้ใช้ `Cleared Date` เป็นวันที่มีผลชำระเงิน
    *   *สูตร:* `IF DATEDIFF(day, CheckDate, ClearedDate) <= 5 THEN CheckDate ELSE ClearedDate`

### 3.1.1 กฎการตรวจสอบข้อมูล (Sanitization Rules)
เพื่อความถูกต้องของคะแนนเครดิต ระบบจะตรวจสอบความสมบูรณ์ของวันที่ก่อนกำหนดวันที่มีผลชำระเงิน หากรายการใดเข้าข่าย **"ยังไม่เกิดการจ่ายจริง" (Not Yet Realized)** จะถูกกำหนดให้ `Effective Payment Date` เป็น `null` (สถานะ Outstanding)

1.  **วันที่เช็คผ่านไม่ถูกต้อง (Invalid Cleared Date):**
    *   หาก `Cleared Date` เป็นค่าเริ่มต้นของ SQL คือ `1753-01-01` (แสดงว่ายังไม่มีการระบุวันที่จริงในบางเวอร์ชันของ ERP) ให้ถือว่าเป็น **หนี้คงค้าง (Outstanding)**
2.  **เช็คลงวันที่ล่วงหน้า (Future Post-Dated Cheques):**
    *   หาก `Check Date` เป็นวันที่ในอนาคต (เมื่อเทียบกับวันที่ปัจจุบันของ Server) ให้ถือว่าเป็น **หนี้คงค้าง (Outstanding)**
    *   *เหตุผล:* เช็คล่วงหน้ายังไม่สามารถนำไปขึ้นเงินได้ จึงไม่ควรนับเป็น "บิลที่จ่ายแล้ว" ในการคำนวณเครดิต

### 3.2 นิยามการจ่ายล่าช้า (Late Payment Definition)
การชำระเงินจะถือว่า **ล่าช้า (Late)** เมื่อ:
`Effective Payment Date` > `Due Date` (จากตาราง Cust. Ledger Entry)

**การคำนวณจำนวนวันล่าช้า (Late Days):**
*   ถ้า `is_late` เป็นจริง: `Late Days` = `Effective Payment Date` - `Due Date` (หน่วยเป็นวัน)
*   ถ้า `is_late` เป็นเท็จ: `Late Days` = 0

---

## 5. ตรรกะการนำไปใช้งาน (Consumption Logic)

API ส่งคืนข้อมูลรายการหนี้ (Invoices) แบบดิบ ระบบปลายทาง (เช่น Batch Automation Report) จะต้องนำข้อมูลไปคำนวณต่อดังนี้:

### 5.1 การจัดการหนี้คงค้าง (Outstanding Invoices)
Invoice ที่ยังไม่มี `Effective Payment Date` (หรือเป็นค่า `null`/ว่าง) ถือเป็น **หนี้คงค้าง (Outstanding)**

*   **กฎ:** หนี้คงค้างจะถูก **ไม่นำมาคิด** ในการหาค่าเฉลี่ยวันล่าช้า (Average Late Days)
*   **เหตุผล:** เนื่องจากยังไม่ได้ชำระเงิน จึงไม่สามารถสรุปได้ว่าจ่ายล่าช้ากี่วัน (หรืออาจจะเป็นหนี้เสีย) หากนำมาคิดเป็น "0 วัน" จะทำให้ค่าเฉลี่ยดูดีเกินจริง (Under-estimated risk)

### 5.2 สูตรการคำนวณค่าเฉลี่ย (Average Calculation)
ค่า "Average Late Days" ที่แสดงในรายงาน คำนวณจาก:

> **Average Late Days** = `ผลรวมวันล่าช้า (เฉพาะบิลที่จ่ายแล้ว)` / `จำนวนบิลที่จ่ายแล้ว`

*   **บิลที่จ่ายแล้ว (Paid Invoice):** Invoice ที่มี `Effective Payment Date` ระบุชัดเจน
*   **วันล่าช้า (Late Days):** ค่าที่ API ส่งมา (0 หากตรงเวลา, >0 หากล่าช้า)

### 5.3 ข้อกำหนดการแสดงผล UI/UX (Presentation Requirements)
ในหน้า Financial Analysis Report (`/report/financial-analysis`) จะต้องปฏิบัติตามข้อกำหนดการแสดงผลดังนี้:

1.  **การเรียงลำดับ (Sorting):**
    *   เรียงตาม **วันที่ใบแจ้งหนี้ (Invoice Date)** จาก **ล่าสุดไปเก่าสุด**
2.  **สัญลักษณ์สถานะ (Visual Badges):**
    *   **LATE:** แถบสีแดง (เมื่อ Late Days > 0)
    *   **ON-TIME:** แถบสีเขียว (เมื่อจ่ายตรงเวลา)
    *   **OUTSTANDING:** แถบสีเทา (สำหรับหนี้คงค้างที่ยังไม่จ่าย)
3.  **การแสดงจำนวนวันล่าช้า:**
    *   กรณี Outstanding ให้แสดงเครื่องหมาย `-` (ขีด) แทนเลข 0 เพื่อป้องกันความเข้าใจผิด
4.  **การซ่อน/แสดงข้อมูล (Section Toggle):**
    *   ส่วน "Detailed Extraction" (ตารางคะแนนละเอียด) ควรถูก **ซ่อน (Collapse)** เป็นค่าเริ่มต้น เพื่อความสะอาดของหน้าจอ

---

## 6. แนวทางการดึงข้อมูล (Backend Implementation Guide)

ส่วนนี้อธิบายขั้นตอนการ Query ข้อมูลจาก Dynamics 365 / NAV

### Step 1: ค้นหาหนี้ (Find Invoices)
Query ตาราง **Cust. Ledger Entry (Table 21)** เพื่อหาใบแจ้งหนี้

*   **Filter:**
    *   `Customer No.` = `{customer_no}`
    *   `Document Type` = `Invoice` (Option: 1 หรือ 2)
    *   `Document No.` LIKE `AYVR%` (ตามกฎบริษัท)
    *   `Posting Date` BETWEEN `{start_date}` AND `{end_date}`

*   **Select Columns:**
    *   `Entry No.` (Primary Key - สำคัญมากสำหรับการ Join)
    *   `Document No.`
    *   `Posting Date`
    *   `Due Date`
    *   **การคำนวณ `Remaining Amount` (สำคัญ):**
        *   ห้ามดึงจากตาราง Cust. Ledger Entry โดยตรงถ้าเป็น FlowField
        *   ให้ **Join** กับ **Detailed Cust. Ledg. Entry (Table 379)** ด้วยเงื่อนไข `Cust. Ledger Entry No.` = `Entry No.`
        *   **สูตรคำนวณ:** `SUM(Detailed Cust. Ledg. Entry.Debit Amount) - SUM(Detailed Cust. Ledg. Entry.Credit Amount)`
        *   ต้อง Group ตาม `Entry No.` เพื่อให้ได้ยอดคงเหลือที่ถูกต้องต่อบิล
    *   `Original Amount` (คำนวณจาก Detailed Entries หรือใช้ `Sales (LCY)`)

### Step 2: ค้นหาการจ่ายเงิน (Find Payment Details)
สำหรับ Invoice แต่ละใบที่พบใน Step 1 ให้ไปหาข้อมูลการจ่ายใน **Detailed Cust. Ledg. Entry (Table 379)**

*   **Join Condition:**
    *   `Cust. Ledger Entry No.` = `Step1.Entry_No`
*   **Filter (สำคัญมาก):**
    *   **`Entry Type` = `Application` (Option: 2)** เพื่อเอาเฉพาะรายการ "ตัดจ่ายหนี้" เท่านั้น (ไม่เอารายการตั้งหนี้หรือปรับปรุง)
    *   `Document Type` = `Payment` (Option: 1)
*   **Select Columns:**
    *   `Entry No.` (สำหรับ Debug)
    *   `Document No.` (เลขที่ใบเสร็จ/การจ่ายเงิน)
    *   `Posting Date` (วันที่ทำรายการ - ใช้เป็นวันจ่ายกรณีเงินสด)
    *   `Amount` (ยอดที่จ่าย)

### Step 3: ตรวจสอบสถานะเช็ค (Check Details)
สำหรับการจ่ายเงินแต่ละรายการใน Step 2 ให้ตรวจสอบว่าจ่ายด้วยเช็คหรือไม่ใน **Check Ledger Entry (Table 272)**

*   **Primary Join Condition:**
    *   `Detailed Cust. Ledg. Entry.Document No.` = `Check Ledger Entry.Document No.`
*   **Extension Join Condition (สำคัญ):**
    *   เพื่อดึงข้อมูลสถานะเช็คอย่างละเอียด ต้องทำการ **Join** กับตาราง **Check Ledger Entry Extension** (ลงท้ายด้วย `ext`)
    *   **Join Condition:** `Check Ledger Entry.Entry No.` = `Check Ledger Entry Ext.Entry No.`
*   **Select Columns:**
    *   `Check Date` (Main Table)
    *   `Check Status` (Ext Table - ID 50411)
    *   `Check Status Date` (Ext Table - ID 50420)
    *   `On Hand Date` (Ext Table - ID 50422)
    *   `Deposit Date` (Ext Table - ID 50423)
    *   `Pass Date` (Ext Table - ID 50424)
    *   `Cleared Date` (Ext Table - ID 50425)

### Step 4: การรวบรวมและคำนวณผล (Data Aggregation)
รวมข้อมูลจาก Step 1-3:

1.  **วนลูป** Invoice จาก Step 1
2.  **ค้นหา** รายการจ่ายเงินที่ตรงกันจาก Step 2
    *   *หมายเหตุ:* อาจมีการจ่ายหลายครั้ง (ผ่อนจ่าย) ในเวอร์ชันแรกนี้ให้ดูยอดล่าสุดหรือยอดที่ทำให้หนี้หมด
3.  **ตรวจสอบ** วิธีการชำระเงิน:
    *   ถ้าเจอข้อมูลใน `Check Ledger Entry` (Step 3) ถือเป็น **Cheque**
    *   ถ้าไม่เจอ ถือเป็น **Cash/Transfer**
4.  **คำนวณ** `Effective Payment Date` ตามกฎในข้อ 3.1
5.  **เปรียบเทียบ** กับ `Due Date` เพื่อระบุสถานะ `is_late`
6.  **คำนวณ** `late_days` (`Effective Payment Date` - `Due Date` ถ้าล่าช้า, ถ้าไม่ล่าช้าให้เป็น 0)
7.  **ใส่ข้อมูล** `_meta_debug` (Entry No. จากทั้ง 3 ตาราง) เพื่อให้ตรวจสอบย้อนหลังได้

---

## 6. ตารางอ้างอิงฟิลด์ (Mapping Reference)

**หมายเหตุ:** ฟิลด์ในตาราง Extension มักจะมีรหัส GUID ต่อท้าย (เช่น `Check Status$6ad9...`) โปรดตรวจสอบ Schema ในระบบของท่าน

| Spec Field | Dynamics Table | Dynamics Field ID | Field Name Example | Note |
| :--- | :--- | :--- | :--- | :--- |
| **Invoice Info** | | | | |
| `document_no` | Cust. Ledger Entry (21) | 6 | `Document No.` | |
| `posting_date` | Cust. Ledger Entry (21) | 20 | `Posting Date` | |
| `due_date` | Cust. Ledger Entry (21) | 24 | `Due Date` | |
| `amount` | Detailed Cust. Ledg. Entry (379) | | `Debit - Credit` | **ต้อง Sum จาก Detailed Entries** |
| **Payment Info** | | | | |
| `payment_doc_no` | Detailed Cust. Ledg. Entry (379) | 6 | `Document No.` | Filter `Entry Type`=`Application` |
| `payment_date` | Detailed Cust. Ledg. Entry (379) | 4 | `Posting Date` | ใช้วันนี้ถ้าไม่มีเช็ค |
| **Check Info** | | | | |
| `check_date` | Check Ledger Entry (272) | 9 | `Check Date` | |
| `check_status` | Check Ledger Entry **Ext** | 50411 | `Check Status$6ad9...` | **ต้อง Join ด้วย Entry No.** |
| `check_status_date` | Check Ledger Entry **Ext** | 50420 | `Check Status Date$6ad9...` | **ต้อง Join ด้วย Entry No.** |
| `on_hand_date` | Check Ledger Entry **Ext** | 50422 | `On Hand Date$6ad9...` | **ต้อง Join ด้วย Entry No.** |
| `deposit_date` | Check Ledger Entry **Ext** | 50423 | `Deposit Date$6ad9...` | **ต้อง Join ด้วย Entry No.** |
| `pass_date` | Check Ledger Entry **Ext** | 50424 | `Pass Date$6ad9...` | **ต้อง Join ด้วย Entry No.** |
| `cleared_date` | Check Ledger Entry **Ext** | 50425 | `Cleared Date$6ad9...` | **ต้อง Join ด้วย Entry No.** |

---

**จบเอกสารข้อกำหนด**
