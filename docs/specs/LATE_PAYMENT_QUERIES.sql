----------------------------------------------------------------------------------------
-- 1. ค้นหา Invoice (ใบแจ้งหนี้)
----------------------------------------------------------------------------------------
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
    CLE.[Customer No_] = 'CUST-001'
    AND CLE.[Document Type] = 2
    AND CLE.[Document No_] LIKE 'AYVR%'
    AND CLE.[Posting Date] >= '2023-01-01'
GROUP BY
    CLE.[Entry No_],
    CLE.[Document No_],
    CLE.[Posting Date],
    CLE.[Due Date],
    CLE.[Sales (LCY)]
ORDER BY CLE.[Posting Date] DESC;


----------------------------------------------------------------------------------------
-- 2. ค้นหารายการชำระเงิน (Payment)
----------------------------------------------------------------------------------------
SELECT
    [Entry No_],
    [Document No_],
    [Posting Date],
    [Amount],
    [Entry Type],
    [Document Type]
FROM [Detailed Cust_ Ledg_ Entry]
WHERE
    [Cust_ Ledger Entry No_] = 12345 -- **เปลี่ยน Entry No_**
    AND [Entry Type] = 2
    AND [Document Type] = 1;


----------------------------------------------------------------------------------------
-- 3. ตรวจสอบสถานะเช็ค (Cheque Status)
----------------------------------------------------------------------------------------
SELECT
    [Check Date],
    [Cleared Date],
    [Entry Status]
FROM [Check Ledger Entry]
WHERE
    [Document No_] = 'PAY-DOCUMENT-NO'; -- **เปลี่ยน Document No_**


----------------------------------------------------------------------------------------
-- 4. Advance (Overview)
----------------------------------------------------------------------------------------
SELECT
    CLE.[Document No_] AS Invoice_No,
    CLE.[Posting Date] AS Invoice_Date,
    CLE.[Due Date],

    DCLE_PAY.[Document No_] AS Payment_Doc_No,
    DCLE_PAY.[Posting Date] AS Payment_Date,
    CHLE.[Check Date],
    CHLE.[Cleared Date],

    CASE
        WHEN CHLE.[Check Date] IS NOT NULL THEN
            CASE
                WHEN DATEDIFF(day, CHLE.[Check Date], CHLE.[Cleared Date]) <= 5 THEN CHLE.[Check Date]
                ELSE CHLE.[Cleared Date]
            END
        ELSE DCLE_PAY.[Posting Date]
    END AS Effective_Payment_Date,

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

LEFT JOIN [Detailed Cust_ Ledg_ Entry] DCLE_PAY
    ON CLE.[Entry No_] = DCLE_PAY.[Cust_ Ledger Entry No_]
    AND DCLE_PAY.[Entry Type] = 2
    AND DCLE_PAY.[Document Type] = 1

LEFT JOIN [Check Ledger Entry] CHLE
    ON DCLE_PAY.[Document No_] = CHLE.[Document No_]

WHERE
    CLE.[Customer No_] = 'CUST-001'
    AND CLE.[Document Type] = 2
    AND CLE.[Document No_] LIKE 'AYVR%'
    AND CLE.[Posting Date] >= '2023-01-01'
ORDER BY CLE.[Posting Date] DESC;
