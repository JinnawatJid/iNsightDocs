-- SQL สำหรับทดสอบการดึงข้อมูล Late Payment Analysis ใน DBeaver
-- หมายเหตุ: **สำคัญมาก** กรุณาเปลี่ยนชื่อตาราง [Cust_ Ledger Entry], [Detailed Cust_ Ledg_ Entry], [Check Ledger Entry]
-- ให้ตรงกับชื่อตารางจริงใน Database ของคุณ (เช่น [TNG LIV$Cust_ Ledger Entry$437dbf0e-84ff-417a-965d-ed2bb9650972])

-- =====================================================================================
-- 1. ค้นหา Invoice (ใบแจ้งหนี้)
-- =====================================================================================

SELECT
    CLE.[Entry No_],
    CLE.[Document No_],
    CLE.[Posting Date],
    CLE.[Due Date],
    SUM(DCLE.[Debit Amount]) - SUM(DCLE.[Credit Amount]) AS [Remaining Amount],
    CLE.[Sales (LCY)] AS [Original Amount]
FROM [Cust_ Ledger Entry] CLE
JOIN [Detailed Cust_ Ledg_ Entry] DCLE
    ON CLE.[Entry No_] = DCLE.[Cust_ Ledger Entry No_]
WHERE
    CLE.[Customer No_] = 'CUST-001'    -- **เปลี่ยนรหัสลูกค้าที่นี่**
    AND CLE.[Document Type] = 2        -- 2 = Invoice
    AND CLE.[Document No_] LIKE 'AYVR%'
    AND CLE.[Posting Date] >= '2023-01-01'
GROUP BY
    CLE.[Entry No_],
    CLE.[Document No_],
    CLE.[Posting Date],
    CLE.[Due Date],
    CLE.[Sales (LCY)]
ORDER BY CLE.[Posting Date] DESC;


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
FROM [Detailed Cust_ Ledg_ Entry]
WHERE
    [Cust_ Ledger Entry No_] = 12345 -- **เปลี่ยนเป็น Entry No_ จากผลลัพธ์ข้อ 1**
    AND [Entry Type] = 2             -- Application
    AND [Document Type] = 1;         -- Payment


-- =====================================================================================
-- 3. ตรวจสอบสถานะเช็ค (Cheque Status)
-- =====================================================================================

SELECT
    [Check Date],
    [Cleared Date],
    [Entry Status]
FROM [Check Ledger Entry]
WHERE
    [Document No_] = 'PAY-DOCUMENT-NO'; -- **เปลี่ยนเป็น Document No_ จากผลลัพธ์ข้อ 2**


-- =====================================================================================
-- 4. Advance (Overview - เชื่อมตาราง)
-- =====================================================================================

SELECT
    CLE.[Document No_] AS Invoice_No,
    CLE.[Posting Date] AS Invoice_Date,
    CLE.[Due Date],

    DCLE_PAY.[Document No_] AS Payment_Doc_No,
    DCLE_PAY.[Posting Date] AS Payment_Date,
    CHLE.[Check Date],
    CHLE.[Cleared Date],

    -- คำนวณวันจ่ายจริง (Effective Date) ตาม Logic 5 วัน
    CASE
        WHEN CHLE.[Check Date] IS NOT NULL THEN
            CASE
                WHEN DATEDIFF(day, CHLE.[Check Date], CHLE.[Cleared Date]) <= 5 THEN CHLE.[Check Date]
                ELSE CHLE.[Cleared Date]
            END
        ELSE DCLE_PAY.[Posting Date]
    END AS Effective_Payment_Date,

    -- ตรวจสอบสถานะ Late
    CASE
        WHEN (
            CASE
                WHEN CHLE.[Check Date] IS NOT NULL THEN
                    CASE WHEN DATEDIFF(day, CHLE.[Check Date], CHLE.[Cleared Date]) <= 5 THEN CHLE.[Check Date] ELSE CHLE.[Cleared Date] END
                ELSE DCLE_PAY.[Posting Date]
            END
        ) > CLE.[Due Date] THEN 'LATE'
        ELSE 'ON-TIME'
    END AS Status

FROM [Cust_ Ledger Entry] CLE

-- Join หา Payment (เฉพาะรายการ Application ที่เป็น Payment)
LEFT JOIN [Detailed Cust_ Ledg_ Entry] DCLE_PAY
    ON CLE.[Entry No_] = DCLE_PAY.[Cust_ Ledger Entry No_]
    AND DCLE_PAY.[Entry Type] = 2
    AND DCLE_PAY.[Document Type] = 1

-- Join หา Cheque (ถ้ามี)
LEFT JOIN [Check Ledger Entry] CHLE
    ON DCLE_PAY.[Document No_] = CHLE.[Document No_]

WHERE
    CLE.[Customer No_] = 'CUST-001'    -- **เปลี่ยนรหัสลูกค้าที่นี่**
    AND CLE.[Document Type] = 2
    AND CLE.[Document No_] LIKE 'AYVR%'
    AND CLE.[Posting Date] >= '2023-01-01'
ORDER BY CLE.[Posting Date] DESC;
