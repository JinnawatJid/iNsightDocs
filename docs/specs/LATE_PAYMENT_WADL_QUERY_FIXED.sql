-- ============================================================
-- LATE PAYMENT API: SQL-Level Deduplication Fix
-- ============================================================
-- 
-- PROBLEM: LEFT JOIN Check_Ledger_Entry creates duplicates
-- when one payment has multiple check records.
--
-- SOLUTION: Use ROW_NUMBER() to keep only best record per
-- invoice+payment combination.
--
-- IMPLEMENTATION: Replace the current API query with this
--
-- ============================================================

SELECT 
    CLE.Document_No AS Invoice_No, 
    CLE.Posting_Date AS Invoice_Date, 
    CLE.Due_Date AS [Due Date],           
    CLE.Customer_No AS [Customer No_],    
    CLE.Sales_LCY AS [Amount],            -- CRITICAL: Amount for WADL weighting
    
    DCLE_PAY.Document_No AS Payment_Doc_No, 
    DCLE_PAY.Posting_Date AS Payment_Date, 
    
    Check_Main.Check_Date AS [Check Date], 
    Check_Main.Cleared_Date AS [Cleared Date], 
    
    CASE 
        WHEN Check_Main.Check_Date IS NOT NULL THEN 
            CASE 
                WHEN Check_Main.Cleared_Date IS NOT NULL 
                THEN Check_Main.Cleared_Date 
                ELSE Check_Main.Check_Date 
            END 
        ELSE DCLE_PAY.Posting_Date 
    END AS Effective_Payment_Date, 
    
    CASE 
        WHEN ( 
            CASE 
                WHEN Check_Main.Check_Date IS NOT NULL THEN 
                    CASE 
                        WHEN Check_Main.Cleared_Date IS NOT NULL 
                        THEN Check_Main.Cleared_Date 
                        ELSE Check_Main.Check_Date 
                    END 
                ELSE DCLE_PAY.Posting_Date 
            END 
        ) > CLE.Due_Date THEN 'LATE' 
        ELSE 'ON-TIME' 
    END AS Status, 
    
    CASE 
        WHEN ( 
            CASE 
                WHEN Check_Main.Check_Date IS NOT NULL THEN 
                    CASE 
                        WHEN Check_Main.Cleared_Date IS NOT NULL 
                        THEN Check_Main.Cleared_Date 
                        ELSE Check_Main.Check_Date 
                    END 
                ELSE DCLE_PAY.Posting_Date 
            END 
        ) > CLE.Due_Date THEN 
            DATEDIFF(day, CLE.Due_Date, ( 
                CASE 
                    WHEN Check_Main.Check_Date IS NOT NULL THEN 
                        CASE 
                            WHEN Check_Main.Cleared_Date IS NOT NULL 
                            THEN Check_Main.Cleared_Date 
                            ELSE Check_Main.Check_Date 
                        END 
                    ELSE DCLE_PAY.Posting_Date 
                END 
            )) 
        ELSE 0 
    END AS Late_Days 

FROM (
    -- ============================================================
    -- DEDUPLICATION: Use ROW_NUMBER to keep only best record
    -- ============================================================
    SELECT *,
        ROW_NUMBER() OVER (
            PARTITION BY CLE.Document_No, DCLE_PAY.Document_No
            -- Priority: Valid Cleared_Date DESC, then Check_Date DESC, then Entry_No DESC
            ORDER BY 
                CASE 
                    WHEN Check_Main.Cleared_Date IS NOT NULL 
                    AND Check_Main.Cleared_Date NOT LIKE '1753%'
                    THEN 0 
                    ELSE 1 
                END,
                Check_Main.Cleared_Date DESC,
                Check_Main.Check_Date DESC,
                Check_Main.Entry_No DESC
        ) AS rn
    
    FROM SP683_SilverTier.dbo.Cust_Ledger_Entry CLE 
    
    LEFT JOIN SP683_SilverTier.dbo.Detailed_Cust_Ledg_Entry DCLE_PAY 
        ON CLE.Entry_No = DCLE_PAY.Cust_Ledger_Entry_No 
        AND DCLE_PAY.Entry_Type = 2        -- Application 
        AND DCLE_PAY.Document_Type = 1     -- Payment 
    
    LEFT JOIN SP683_SilverTier.dbo.Check_Ledger_Entry Check_Main 
        ON DCLE_PAY.Document_No = Check_Main.Document_No 
    
    WHERE 
        CLE.Document_Type = 2 
        [[ AND CLE.Customer_No = {{customer_no}} ]]
        AND CLE.Document_No LIKE '__VR%' 
        AND CLE.Posting_Date >= DATEADD(month, -6, GETDATE())
) ranked_data

WHERE rn = 1  -- ← KEEP ONLY FIRST RECORD PER INVOICE+PAYMENT

ORDER BY CLE.Posting_Date DESC
