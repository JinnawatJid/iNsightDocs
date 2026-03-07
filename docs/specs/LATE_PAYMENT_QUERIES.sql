-- SQL สำหรับทดสอบการดึงข้อมูล Late Payment Analysis ใน DBeaver
-- หมายเหตุ: **สำคัญมาก** ชื่อตารางและชื่อ Column ที่ลงท้ายด้วย GUID (เช่น $6ad92336...)
-- เป็นชื่อเฉพาะของ Environment นี้ (TNG LIV) กรุณาตรวจสอบชื่อจริงใน Database ของคุณก่อนใช้งานใน Environment อื่น

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
     FROM [TNG LIV$Detailed Cust_ Ledg_ Entry$437dbf0e-84ff-417a-965d-ed2bb9650972] D
     WHERE D.[Cust_ Ledger Entry No_] = CLE.[Entry No_]) AS [Remaining Amount],
    CLE.[Sales (LCY)] AS [Original Amount]
FROM [TNG LIV$Cust_ Ledger Entry$437dbf0e-84ff-417a-965d-ed2bb9650972] CLE
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
FROM [TNG LIV$Detailed Cust_ Ledg_ Entry$437dbf0e-84ff-417a-965d-ed2bb9650972]
WHERE
    [Cust_ Ledger Entry No_] = 12345 -- **เปลี่ยนเป็น Entry No_ จากผลลัพธ์ข้อ 1**
    AND [Entry Type] = 2             -- Application (การจับคู่ชำระ)
    AND [Document Type] = 1;         -- Payment (การจ่ายเงิน)
GO


-- =====================================================================================
-- 3. ตรวจสอบสถานะเช็ค (Cheque Status)
-- =====================================================================================

SELECT
    Check_Main.[Document No_],
    Check_Main.[Check Date],
    Check_Ext.[Check Status$6ad92336-3ccf-49e0-a46a-31561b26a7ad] AS [Check Status],           -- สถานะเช็ค
    Check_Ext.[Check Status Date$6ad92336-3ccf-49e0-a46a-31561b26a7ad] AS [Check Status Date], -- วันที่เปลี่ยนสถานะล่าสุด
    Check_Ext.[On Hand Date$6ad92336-3ccf-49e0-a46a-31561b26a7ad] AS [On Hand Date],           -- วันที่รับเช็ค
    Check_Ext.[Deposit Date$6ad92336-3ccf-49e0-a46a-31561b26a7ad] AS [Deposit Date],           -- วันที่นำฝาก
    Check_Ext.[Pass Date$6ad92336-3ccf-49e0-a46a-31561b26a7ad] AS [Pass Date],                 -- วันที่ผ่าน
    Check_Ext.[Cleared Date$6ad92336-3ccf-49e0-a46a-31561b26a7ad] AS [Cleared Date]            -- วันที่เคลียร์เช็ค
FROM [TNG LIV$Check Ledger Entry$437dbf0e-84ff-417a-965d-ed2bb9650972] Check_Main
JOIN [TNG LIV$Check Ledger Entry$437dbf0e-84ff-417a-965d-ed2bb9650972$ext] Check_Ext
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
    Check_Ext.[Check Status$6ad92336-3ccf-49e0-a46a-31561b26a7ad] AS [Check Status],
    Check_Ext.[Cleared Date$6ad92336-3ccf-49e0-a46a-31561b26a7ad] AS [Cleared Date],

    -- คำนวณวันจ่ายจริง (Effective Date)
    -- Logic: ถ้ามี Cleared Date ให้ใช้วันที่ Clear, ถ้าไม่มีให้ใช้วันที่เช็ค (ถ้าจ่ายเช็ค) หรือวันที่จ่ายเงิน (ถ้าโอน/เงินสด)
    CASE
        WHEN Check_Main.[Check Date] IS NOT NULL THEN
            CASE
                WHEN Check_Ext.[Cleared Date$6ad92336-3ccf-49e0-a46a-31561b26a7ad] IS NOT NULL
                THEN Check_Ext.[Cleared Date$6ad92336-3ccf-49e0-a46a-31561b26a7ad]
                ELSE Check_Main.[Check Date]
            END
        ELSE DCLE_PAY.[Posting Date]
    END AS Effective_Payment_Date,

    -- ตรวจสอบสถานะ Late (เทียบกับ Due Date)
    CASE
        WHEN (
            CASE
                WHEN Check_Main.[Check Date] IS NOT NULL THEN
                    CASE
                        WHEN Check_Ext.[Cleared Date$6ad92336-3ccf-49e0-a46a-31561b26a7ad] IS NOT NULL
                        THEN Check_Ext.[Cleared Date$6ad92336-3ccf-49e0-a46a-31561b26a7ad]
                        ELSE Check_Main.[Check Date]
                    END
                ELSE DCLE_PAY.[Posting Date]
            END
        ) > CLE.[Due Date] THEN 'LATE'
        ELSE 'ON-TIME'
    END AS Status,

    -- คำนวณจำนวนวันล่าช้า (Late Days)
    -- ถ้าจ่ายตรงเวลาหรือจ่ายก่อนกำหนด (<= 0) ให้เป็น 0
    CASE
        WHEN (
            CASE
                WHEN Check_Main.[Check Date] IS NOT NULL THEN
                    CASE
                        WHEN Check_Ext.[Cleared Date$6ad92336-3ccf-49e0-a46a-31561b26a7ad] IS NOT NULL
                        THEN Check_Ext.[Cleared Date$6ad92336-3ccf-49e0-a46a-31561b26a7ad]
                        ELSE Check_Main.[Check Date]
                    END
                ELSE DCLE_PAY.[Posting Date]
            END
        ) > CLE.[Due Date] THEN
            DATEDIFF(day, CLE.[Due Date], (
                CASE
                    WHEN Check_Main.[Check Date] IS NOT NULL THEN
                        CASE
                            WHEN Check_Ext.[Cleared Date$6ad92336-3ccf-49e0-a46a-31561b26a7ad] IS NOT NULL
                            THEN Check_Ext.[Cleared Date$6ad92336-3ccf-49e0-a46a-31561b26a7ad]
                            ELSE Check_Main.[Check Date]
                        END
                    ELSE DCLE_PAY.[Posting Date]
                END
            ))
        ELSE 0
    END AS Late_Days

FROM [TNG LIV$Cust_ Ledger Entry$437dbf0e-84ff-417a-965d-ed2bb9650972] CLE

LEFT JOIN [TNG LIV$Detailed Cust_ Ledg_ Entry$437dbf0e-84ff-417a-965d-ed2bb9650972] DCLE_PAY
    ON CLE.[Entry No_] = DCLE_PAY.[Cust_ Ledger Entry No_]
    AND DCLE_PAY.[Entry Type] = 2
    AND DCLE_PAY.[Document Type] = 1

LEFT JOIN [TNG LIV$Check Ledger Entry$437dbf0e-84ff-417a-965d-ed2bb9650972] Check_Main
    ON DCLE_PAY.[Document No_] = Check_Main.[Document No_]

LEFT JOIN [TNG LIV$Check Ledger Entry$437dbf0e-84ff-417a-965d-ed2bb9650972$ext] Check_Ext
    ON Check_Main.[Entry No_] = Check_Ext.[Entry No_]

WHERE
    CLE.[Customer No_] = '04003AY' -- **เปลี่ยนรหัสลูกค้าที่นี่**
    AND CLE.[Document Type] = 2
    AND CLE.[Document No_] LIKE 'AYVR%'
    AND CLE.[Posting Date] >= '2023-01-01'
ORDER BY CLE.[Posting Date] DESC;
GO
