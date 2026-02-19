-- SQL สำหรับทดสอบการดึงข้อมูล Late Payment Analysis ใน DBeaver
-- หมายเหตุ: **สำคัญมาก** กรุณาเปลี่ยนชื่อตารางให้ตรงกับชื่อตารางจริงใน Database ของคุณ
-- 1. [Cust. Ledger Entry] -> เช่น [TNG LIV$Cust. Ledger Entry$437dbf0e-84ff-417a-965d-ed2bb9650972]
-- 2. [Detailed Cust. Ledg. Entry] -> เช่น [TNG LIV$Detailed Cust. Ledg. Entry$437dbf0e-84ff-417a-965d-ed2bb9650972]
-- 3. [Check Ledger Entry] (Main) -> เช่น [TNG LIV$Check Ledger Entry$437dbf0e-84ff-417a-965d-ed2bb9650972]
-- 4. [Check Ledger Entry Ext] (Extension) -> เช่น [TNG LIV$Check Ledger Entry$437dbf0e-84ff-417a-965d-ed2bb9650972ext]

-- =====================================================================================
-- 1. ค้นหา Invoice (ใบแจ้งหนี้)
-- =====================================================================================

SELECT
    CLE.[Entry No_],
    CLE.[Document No_],
    CLE.[Posting Date],
    CLE.[Due Date],
    -- การคำนวณยอดคงเหลือ (Remaining Amount) จาก Detailed Customer Ledger Entries
    -- สูตร: ผลรวม (Debit - Credit) ของ Entry นี้
    (SELECT SUM(D.[Debit Amount]) - SUM(D.[Credit Amount])
     FROM [Detailed Cust. Ledg. Entry] D
     WHERE D.[Cust. Ledger Entry No_] = CLE.[Entry No_]) AS [Remaining Amount],
    CLE.[Sales (LCY)] AS [Original Amount]
FROM [Cust. Ledger Entry] CLE
WHERE
    CLE.[Customer No_] = 'CUST-001'    -- **เปลี่ยนรหัสลูกค้าที่นี่**
    AND CLE.[Document Type] = 2        -- 2 = Invoice
    AND CLE.[Document No_] LIKE 'AYVR%'
    AND CLE.[Posting Date] >= '2023-01-01'
ORDER BY CLE.[Posting Date] DESC;
GO


-- =====================================================================================
-- 2. ค้นหารายการชำระเงิน (Payment)
-- =====================================================================================

SELECT
    [Entry No_],
    [Document No_],
    [Posting Date],
    [Amount],
    [Entry Type],
    [Document Type]
FROM [Detailed Cust. Ledg. Entry]
WHERE
    [Cust. Ledger Entry No_] = 12345 -- **เปลี่ยนเป็น Entry No_ จากผลลัพธ์ข้อ 1**
    AND [Entry Type] = 2             -- Application (การจับคู่ชำระ)
    AND [Document Type] = 1;         -- Payment (การจ่ายเงิน)
GO


-- =====================================================================================
-- 3. ตรวจสอบสถานะเช็ค (Cheque Status) - *แก้ไขตาม User Request*
-- =====================================================================================
-- ต้อง Join ตาราง Extension (ลงท้ายด้วย ext) ด้วย Entry No_ เพื่อดึงสถานะและวันที่สถานะ

SELECT
    Check_Main.[Document No_],
    Check_Main.[Check Date],
    Check_Ext.[Check Status],      -- สถานะเช็ค (Integer/Option)
    Check_Ext.[Check Status Date], -- วันที่เปลี่ยนสถานะล่าสุด
    Check_Ext.[On Hand Date],      -- วันที่รับเช็ค
    Check_Ext.[Deposit Date],      -- วันที่นำฝาก
    Check_Ext.[Pass Date],         -- วันที่ผ่าน
    Check_Ext.[Cleared Date]       -- วันที่เคลียร์เช็ค
FROM [Check Ledger Entry] Check_Main
JOIN [Check Ledger Entry Ext] Check_Ext
    ON Check_Main.[Entry No_] = Check_Ext.[Entry No_]
WHERE
    Check_Main.[Document No_] = 'PAY-DOCUMENT-NO'; -- **เปลี่ยนเป็น Document No_ จากผลลัพธ์ข้อ 2**
GO


-- =====================================================================================
-- 4. Advance (Overview - เชื่อมตารางทั้งหมด)
-- =====================================================================================

SELECT
    CLE.[Document No_] AS Invoice_No,
    CLE.[Posting Date] AS Invoice_Date,
    CLE.[Due Date],

    DCLE_PAY.[Document No_] AS Payment_Doc_No,
    DCLE_PAY.[Posting Date] AS Payment_Date,

    -- ข้อมูลเช็ค (ถ้ามี)
    Check_Main.[Check Date],
    Check_Ext.[Check Status],
    Check_Ext.[Cleared Date],

    -- คำนวณวันจ่ายจริง (Effective Date)
    -- Logic: ถ้าจ่ายเช็ค ให้ใช้วันที่เช็คเคลียร์ (หรือเงื่อนไข 5 วัน) ถ้าไม่ใช่เช็ค ใช้วันที่ Posting Date ของ Payment
    CASE
        WHEN Check_Main.[Check Date] IS NOT NULL THEN
            -- ตัวอย่าง Logic 5 วัน (ปรับตาม Business Logic จริง)
            CASE
                WHEN Check_Ext.[Cleared Date] IS NOT NULL THEN Check_Ext.[Cleared Date]
                ELSE Check_Main.[Check Date] -- Fallback
            END
        ELSE DCLE_PAY.[Posting Date]
    END AS Effective_Payment_Date,

    -- ตรวจสอบสถานะ Late (เทียบกับ Due Date)
    CASE
        WHEN (
            CASE
                WHEN Check_Main.[Check Date] IS NOT NULL THEN
                    CASE WHEN Check_Ext.[Cleared Date] IS NOT NULL THEN Check_Ext.[Cleared Date] ELSE Check_Main.[Check Date] END
                ELSE DCLE_PAY.[Posting Date]
            END
        ) > CLE.[Due Date] THEN 'LATE'
        ELSE 'ON-TIME'
    END AS Status

FROM [Cust. Ledger Entry] CLE

-- 1. หา Payment (Detailed Cust Ledger)
LEFT JOIN [Detailed Cust. Ledg. Entry] DCLE_PAY
    ON CLE.[Entry No_] = DCLE_PAY.[Cust. Ledger Entry No_]
    AND DCLE_PAY.[Entry Type] = 2    -- Application
    AND DCLE_PAY.[Document Type] = 1 -- Payment

-- 2. หา Cheque Main (Check Ledger Entry)
LEFT JOIN [Check Ledger Entry] Check_Main
    ON DCLE_PAY.[Document No_] = Check_Main.[Document No_]

-- 3. หา Cheque Ext (Check Ledger Entry Ext)
LEFT JOIN [Check Ledger Entry Ext] Check_Ext
    ON Check_Main.[Entry No_] = Check_Ext.[Entry No_]

WHERE
    CLE.[Customer No_] = 'CUST-001'    -- **เปลี่ยนรหัสลูกค้าที่นี่**
    AND CLE.[Document Type] = 2        -- Invoice
    AND CLE.[Document No_] LIKE 'AYVR%'
    AND CLE.[Posting Date] >= '2023-01-01'
ORDER BY CLE.[Posting Date] DESC;
GO
