## Duplicate Payment Records Issue - Technical Analysis

### Issue Description

The **weight-baselatepayment** API endpoint returns duplicate records when a single invoice is associated with multiple check records.

**Example Response:**
```json
{
  "success": true,
  "data": [
    {
      "Invoice_No": "PLVR-6903/0276",
      "Payment_Doc_No": "PLPRV-6904/0131",
      "Check_Date": "2026-07-09",
      "Cleared_Date": "1753-01-01",
      "Late_Days": 0
    },
    {
      "Invoice_No": "PLVR-6903/0276",    // DUPLICATE
      "Payment_Doc_No": "PLPRV-6904/0131", // SAME PAYMENT
      "Check_Date": "2026-07-10",          // DIFFERENT CHECK
      "Cleared_Date": "1753-01-01",
      "Late_Days": 0
    }
  ]
}
```

### Root Cause

The SQL query joins `Cust_Ledger_Entry` → `Detailed_Cust_Ledg_Entry` → `Check_Ledger_Entry`:

```sql
SELECT ... 
FROM Cust_Ledger_Entry CLE
LEFT JOIN Detailed_Cust_Ledg_Entry DCLE_PAY ON ...
LEFT JOIN Check_Ledger_Entry Check_Main ON DCLE_PAY.Document_No = Check_Main.Document_No
```

**Problem:** When one payment (DCLE_PAY) matches multiple checks, the LEFT JOIN creates multiple result rows.

### Business Impact

1. **WADL Calculation Inflation**
   - Formula: `WADL = SUM(Amount × Late_Days) / SUM(Amount)`
   - Duplicates incorrectly increase `SUM(Amount)` artificially
   - Inflates the credit risk score

2. **Data Integrity Issues**
   - Financial reports show duplicate invoice entries
   - Users see same invoice multiple times
   - Difficulty reconciling with actual ledger

3. **Credit Decision Impact**
   - Late payment metrics become inaccurate
   - Credit limits may be set incorrectly
   - Score grades (A/B/C/D) become unreliable

### Solution

**Application-Level Deduplication** implemented in `sanitizeInvoices()` function:

```javascript
const deduplicatedMap = new Map();

invoices.forEach(inv => {
  const uniqueKey = `${inv.Invoice_No}|${inv.Payment_Doc_No}`;
  
  if (!deduplicatedMap.has(uniqueKey)) {
    deduplicatedMap.set(uniqueKey, inv);
  } else {
    // When duplicate found, keep the "best" record
    const existing = deduplicatedMap.get(uniqueKey);
    
    // Priority 1: Prefer valid Cleared_Date (not 1753-01-01)
    // Priority 2: Keep latest Check_Date
    // Priority 3: Keep existing
  }
});
```

### Deduplication Rules

| Scenario | Action | Rationale |
|----------|--------|-----------|
| One has valid cleared date, other doesn't | Keep one with valid date | Represents actual clearing |
| Both have valid cleared dates | Keep most recent | Latest status is most relevant |
| Both have invalid 1753 dates | Keep latest check date | Indicates intended payment date |
| Completely identical | Keep first occurrence | No difference to preserve |

### Performance Impact

- **Memory:** O(n) for Map storage (negligible)
- **CPU:** O(n) for iteration and deduplication (< 1ms for typical datasets)
- **Network:** No change (API still returns duplicates)
- **Latency:** Adds < 5ms to financial analysis endpoint

### Testing

Test file: `backend/scripts/test_duplicate_removal.js`

Verifies:
- ✓ Duplicates are correctly identified
- ✓ Best record is kept according to rules
- ✓ Different invoices are NOT deduplicated
- ✓ WADL calculation is accurate post-deduplication

Run:
```bash
node backend/scripts/test_duplicate_removal.js
```

### Monitoring

The implementation logs deduplication activity:

```
[Sanitize] Removed 9 duplicates. Original: 65, After: 56
```

Monitor for:
- Consistently high duplicate counts (may indicate API issue)
- Zero duplicates (normal for good data quality)
- Anomalies in deduplication patterns

### Recommended SQL Fix (Long-term)

If you control the API's SQL, implement source-level deduplication:

```sql
WITH RankedRecords AS (
  SELECT *,
    ROW_NUMBER() OVER (
      PARTITION BY CLE.Document_No, DCLE_PAY.Document_No 
      ORDER BY Check_Main.Cleared_Date DESC, Check_Main.Check_Date DESC
    ) AS rn
  FROM [source_query]
)
SELECT * FROM RankedRecords WHERE rn = 1
```

This prevents duplicates from leaving the database.

### Related Documentation

- [Late Payment API Specification](../specs/LATE_PAYMENT_WADL_API.md)
- [WADL Calculation Formula](../specs/LATE_PAYMENT_WADL.md)
- [Financial Analysis Controller](../../backend/controllers/financialController.js)

### Revision History

| Date | Change | Status |
|------|--------|--------|
| 2026-05-08 | Implemented application-level deduplication | ✓ Deployed |
| 2026-05-08 | Added monitoring & logging | ✓ Active |
| TBD | Implement SQL-level fix | ⏳ Pending |
