-- SQL สำหรับทดสอบการดึงข้อมูล Late Payment Analysis ใน DBeaver
-- หมายเหตุ: ชื่อตารางจริงใน DBeaver อาจมีชื่อบริษัทนำหน้า (เช่น [CRONUS Thailand Ltd_$Cust_ Ledger Entry])
-- กรุณาเปลี่ยนชื่อตารางให้ตรงกับใน Database ของคุณ

----------------------------------------------------------------------------------------
-- 1. ค้นหา Invoice (ใบแจ้งหนี้) ของลูกค้า
----------------------------------------------------------------------------------------
SELECT
    [Entry No_],       -- ใช้สำหรับ Join ในขั้นตอนต่อไป (สำคัญมาก)
    [Document No_],    -- เลขที่เอกสาร (เช่น AYVR...)
    [Posting Date],    -- วันที่ตั้งหนี้
    [Due Date],        -- วันครบกำหนดชำระ
    [Remaining Amount], -- ยอดคงเหลือ
    [Original Amount]   -- ยอดหนี้เต็มจำนวน (ถ้ามี)
FROM [Cust_ Ledger Entry]
WHERE
    [Customer No_] = 'CUST-001'    -- **เปลี่ยนรหัสลูกค้าที่นี่**
    AND [Document Type] = 2         -- 2 = Invoice (ใบแจ้งหนี้)
    AND [Document No_] LIKE 'AYVR%' -- กรองเฉพาะบิลขายเชื่อ (ตามเงื่อนไขบริษัท)
    AND [Posting Date] >= '2023-01-01' -- กรองวันที่เริ่มต้น
ORDER BY [Posting Date] DESC;


----------------------------------------------------------------------------------------
-- 2. ค้นหารายการชำระเงิน (Payment) ของ Invoice นั้นๆ
----------------------------------------------------------------------------------------
-- นำ [Entry No_] ที่ได้จากข้อ 1 มาใส่ใน WHERE clause ด้านล่าง
SELECT
    [Entry No_],
    [Document No_],    -- เลขที่ใบเสร็จ/การจ่ายเงิน
    [Posting Date],    -- วันที่ชำระเงิน (กรณีเงินสด/โอนใช้วันนี้)
    [Amount],          -- ยอดเงินที่ตัดจ่าย
    [Entry Type],      -- ต้องเป็น 2 (Application)
    [Document Type]    -- ต้องเป็น 1 (Payment)
FROM [Detailed Cust_ Ledg_ Entry]
WHERE
    [Cust_ Ledger Entry No_] = 12345 -- **ใส่ Entry No_ จากข้อ 1 ที่นี่**
    AND [Entry Type] = 2             -- กรองเอาเฉพาะการตัดจ่ายหนี้ (Application)
    AND [Document Type] = 1;         -- กรองเอาเฉพาะการจ่ายเงิน (Payment)


----------------------------------------------------------------------------------------
-- 3. ตรวจสอบสถานะเช็ค (Cheque Status)
----------------------------------------------------------------------------------------
-- นำ [Document No_] จากข้อ 2 (เช่น RCPT-001) มาใส่ใน WHERE clause
SELECT
    [Check Date],       -- วันที่หน้าเช็ค
    [Cleared Date],     -- วันที่เช็คผ่าน (Field นี้อาจเป็น Custom Field ID 50425 ตรวจสอบชื่อจริงอีกครั้ง)
    [Entry Status]      -- สถานะเช็ค
FROM [Check Ledger Entry]
WHERE
    [Document No_] = 'PAY-DOCUMENT-NO'; -- **ใส่ Document No_ จากข้อ 2 ที่นี่**


----------------------------------------------------------------------------------------
-- 4. (Advance) SQL แบบ JOIN ตารางเดียวจบ (ถ้าต้องการดูภาพรวม)
----------------------------------------------------------------------------------------
SELECT
    CLE.[Document No_] AS Invoice_No,
    CLE.[Posting Date] AS Invoice_Date,
    CLE.[Due Date],
    DCLE.[Document No_] AS Payment_Doc_No,
    DCLE.[Posting Date] AS Payment_Date, -- วันจ่าย (เบื้องต้น)
    CHLE.[Check Date],                   -- วันหน้าเช็ค (ถ้ามี)
    CHLE.[Cleared Date],                 -- วันเช็คผ่าน (ถ้ามี)

    -- คำนวณวันจ่ายจริง (Effective Date) ตาม Logic 5 วัน
    CASE
        WHEN CHLE.[Check Date] IS NOT NULL THEN -- ถ้าจ่ายด้วยเช็ค
            CASE
                -- ถ้า (วันเช็คผ่าน - วันหน้าเช็ค) <= 5 วัน ให้ใช้วันหน้าเช็ค
                WHEN DATEDIFF(day, CHLE.[Check Date], CHLE.[Cleared Date]) <= 5 THEN CHLE.[Check Date]
                -- ถ้าเกิน 5 วัน ให้ใช้วันเช็คผ่าน
                ELSE CHLE.[Cleared Date]
            END
        ELSE DCLE.[Posting Date] -- ถ้าไม่ใช่เช็ค ใช้วันที่จ่ายเลย
    END AS Effective_Payment_Date,

    -- ตรวจสอบว่า Late หรือไม่
    CASE
        WHEN (
            CASE
                WHEN CHLE.[Check Date] IS NOT NULL THEN
                    CASE WHEN DATEDIFF(day, CHLE.[Check Date], CHLE.[Cleared Date]) <= 5 THEN CHLE.[Check Date] ELSE CHLE.[Cleared Date] END
                ELSE DCLE.[Posting Date]
            END
        ) > CLE.[Due Date] THEN 'LATE'
        ELSE 'ON-TIME'
    END AS Status

FROM [Cust_ Ledger Entry] CLE
-- Join หา Payment
LEFT JOIN [Detailed Cust_ Ledg_ Entry] DCLE
    ON CLE.[Entry No_] = DCLE.[Cust_ Ledger Entry No_]
    AND DCLE.[Entry Type] = 2      -- Application
    AND DCLE.[Document Type] = 1   -- Payment

-- Join หา Cheque (ถ้ามี)
LEFT JOIN [Check Ledger Entry] CHLE
    ON DCLE.[Document No_] = CHLE.[Document No_]

WHERE
    CLE.[Customer No_] = 'CUST-001'    -- **เปลี่ยนรหัสลูกค้า**
    AND CLE.[Document Type] = 2        -- Invoice
    AND CLE.[Document No_] LIKE 'AYVR%'
    AND CLE.[Posting Date] >= '2023-01-01'
ORDER BY CLE.[Posting Date] DESC;
