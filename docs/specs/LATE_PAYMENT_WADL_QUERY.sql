-- SQL สำหรับดึงข้อมูลเพื่อคำนวณ Weighted Average Days Late (WADL)
-- จุดประสงค์: ดึงข้อมูล Invoice พร้อมยอดเงิน (Amount) เพื่อนำไปคำนวณค่าเฉลี่ยถ่วงน้ำหนัก
-- สูตร: WADL = SUM(Amount * Late Days) / SUM(Amount) (เฉพาะบิลที่จ่ายแล้ว)

-- หมายเหตุ: ชื่อตารางและ GUID อ้างอิงจาก Environment ปัจจุบัน (TNG LIV)

SELECT
    CLE.[Document No_] AS Invoice_No,
    CLE.[Posting Date] AS Invoice_Date,
    CLE.[Due Date],

    -- **CRITICAL FOR WADL**: ยอดเงินเพื่อใช้เป็นน้ำหนัก (Weight)
    CLE.[Sales (LCY)] AS [Amount],

    DCLE_PAY.[Document No_] AS Payment_Doc_No,
    DCLE_PAY.[Posting Date] AS Payment_Date,

    -- ข้อมูลเช็ค
    Check_Main.[Check Date],
    Check_Ext.[Cleared Date$6ad92336-3ccf-49e0-a46a-31561b26a7ad] AS [Cleared Date],

    -- คำนวณวันจ่ายจริง (Effective Payment Date)
    -- Logic: ถ้าจ่ายเช็ค และ Clear ภายใน 5 วัน ให้ใช้วันที่เช็ค, ถ้าเกินให้ใช้วันที่ Clear
    CASE
        WHEN Check_Main.[Check Date] IS NOT NULL THEN
            CASE
                WHEN Check_Ext.[Cleared Date$6ad92336-3ccf-49e0-a46a-31561b26a7ad] IS NOT NULL
                     AND DATEDIFF(day, Check_Main.[Check Date], Check_Ext.[Cleared Date$6ad92336-3ccf-49e0-a46a-31561b26a7ad]) > 5
                THEN Check_Ext.[Cleared Date$6ad92336-3ccf-49e0-a46a-31561b26a7ad]
                ELSE Check_Main.[Check Date]
            END
        ELSE DCLE_PAY.[Posting Date]
    END AS Effective_Payment_Date,

    -- สถานะ (เพื่อการตรวจสอบ)
    CASE
        WHEN (
            CASE
                WHEN Check_Main.[Check Date] IS NOT NULL THEN
                    CASE
                        WHEN Check_Ext.[Cleared Date$6ad92336-3ccf-49e0-a46a-31561b26a7ad] IS NOT NULL
                             AND DATEDIFF(day, Check_Main.[Check Date], Check_Ext.[Cleared Date$6ad92336-3ccf-49e0-a46a-31561b26a7ad]) > 5
                        THEN Check_Ext.[Cleared Date$6ad92336-3ccf-49e0-a46a-31561b26a7ad]
                        ELSE Check_Main.[Check Date]
                    END
                ELSE DCLE_PAY.[Posting Date]
            END
        ) > CLE.[Due Date] THEN 'LATE'
        ELSE 'ON-TIME'
    END AS Status,

    -- คำนวณจำนวนวันล่าช้า (Late Days)
    -- ถ้าจ่ายตรงเวลา (<= 0) ให้เป็น 0
    CASE
        WHEN (
            CASE
                WHEN Check_Main.[Check Date] IS NOT NULL THEN
                    CASE
                        WHEN Check_Ext.[Cleared Date$6ad92336-3ccf-49e0-a46a-31561b26a7ad] IS NOT NULL
                             AND DATEDIFF(day, Check_Main.[Check Date], Check_Ext.[Cleared Date$6ad92336-3ccf-49e0-a46a-31561b26a7ad]) > 5
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
                                 AND DATEDIFF(day, Check_Main.[Check Date], Check_Ext.[Cleared Date$6ad92336-3ccf-49e0-a46a-31561b26a7ad]) > 5
                            THEN Check_Ext.[Cleared Date$6ad92336-3ccf-49e0-a46a-31561b26a7ad]
                            ELSE Check_Main.[Check Date]
                        END
                    ELSE DCLE_PAY.[Posting Date]
                END
            ))
        ELSE 0
    END AS Late_Days

FROM [TNG LIV$Cust_ Ledger Entry$437dbf0e-84ff-417a-965d-ed2bb9650972] CLE

-- Join Payment Details
LEFT JOIN [TNG LIV$Detailed Cust_ Ledg_ Entry$437dbf0e-84ff-417a-965d-ed2bb9650972] DCLE_PAY
    ON CLE.[Entry No_] = DCLE_PAY.[Cust_ Ledger Entry No_]
    AND DCLE_PAY.[Entry Type] = 2       -- Application
    AND DCLE_PAY.[Document Type] = 1    -- Payment

-- Join Cheque Details (if any)
LEFT JOIN [TNG LIV$Check Ledger Entry$437dbf0e-84ff-417a-965d-ed2bb9650972] Check_Main
    ON DCLE_PAY.[Document No_] = Check_Main.[Document No_]

LEFT JOIN [TNG LIV$Check Ledger Entry$437dbf0e-84ff-417a-965d-ed2bb9650972$ext] Check_Ext
    ON Check_Main.[Entry No_] = Check_Ext.[Entry No_]

WHERE
    CLE.[Customer No_] = '{customer_no}'
    AND CLE.[Document Type] = 2 -- Invoice
    AND CLE.[Document No_] LIKE 'AYVR%'
    -- Filter: Last 6 Months Only (Dynamic)
    AND CLE.[Posting Date] >= DATEADD(month, -6, GETDATE())

ORDER BY CLE.[Posting Date] DESC;
GO
