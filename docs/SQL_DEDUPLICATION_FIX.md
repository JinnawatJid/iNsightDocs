# SQL-Level Deduplication: Industry Standard Fix

## Why SQL-Level Deduplication is Required

You are **absolutely correct** to see duplicates still appearing. The application-level fix I provided is a **temporary workaround**, not a permanent solution.

### The Problem with Application-Level Deduplication

| Aspect | Application-Level | SQL-Level |
|--------|---|---|
| **Data Source** | ❌ Corrupted data enters system | ✅ Clean data at source |
| **Audit Trail** | ❌ Unclear which data is real | ✅ Single source of truth |
| **Error Points** | ❌ Multiple places to break | ✅ One place to fix |
| **Financial Impact** | ❌ Risk of calculation errors | ✅ Trusted calculations |
| **Industry Standard** | ❌ Not recommended | ✅ Best practice |
| **Performance** | Slightly higher | Better (upstream filtering) |

### Financial System Reality

**For any system handling real money:**
- Data integrity must be guaranteed at the **source (database)**
- Not in application code that can be bypassed
- Every report must pull from clean data
- Audit trails must show only what actually happened

---

## Implementation Guide

### Step 1: Identify API Provider

Your API endpoint is: `http://192.192.0.37:8280/weight-baselatepayment/1.0.0`

This API is calling a SQL query on your **Dynamics 365 / NAV database** (SP683_SilverTier).

### Step 2: Get SQL Query to API Provider

Provide them with [docs/specs/LATE_PAYMENT_WADL_QUERY_FIXED.sql](./LATE_PAYMENT_WADL_QUERY_FIXED.sql)

**Key Changes:**
```sql
FROM (
  SELECT *,
    ROW_NUMBER() OVER (
      PARTITION BY CLE.Document_No, DCLE_PAY.Document_No
      ORDER BY Cleared_Date DESC, Check_Date DESC
    ) AS rn
  FROM [original_query]
) ranked_data
WHERE rn = 1  -- ← REMOVES DUPLICATES AT SOURCE
```

### Step 3: Request Implementation

Contact the API provider with:

> "Please update the weight-baselatepayment API to deduplicate at SQL level using ROW_NUMBER().
>  
> **Problem:** When one payment has multiple checks, duplicates inflate WADL calculations.
>  
> **Solution:** Wrap the current query in a CTE and filter WHERE rn = 1 (see attached SQL).
>  
> **Impact:** 65 records → 56 unique records, accurate financial scoring."

### Step 4: Verify the Fix

Once the API is updated, verify:

```bash
curl -X POST "http://192.192.0.37:8280/weight-baselatepayment/1.0.0" \
  -H "Content-Type: application/json" \
  -H "apikey: YOUR_KEY" \
  -d '{"Customer No_": "27006PL"}' | jq '.data | length'
```

**Before:** Returns 65 records (with duplicates)  
**After:** Returns 56 records (all unique)

---

## ROW_NUMBER() Explained

```sql
ROW_NUMBER() OVER (
  PARTITION BY CLE.Document_No, DCLE_PAY.Document_No
  ORDER BY Cleared_Date DESC, Check_Date DESC
)
```

### What This Does

1. **PARTITION BY:** Treats each `Invoice_No + Payment_Doc_No` combo as a separate group
2. **ORDER BY:** Sorts within each group by:
   - Latest Cleared_Date (valid payments first)
   - Latest Check_Date (most recent check)
3. **Result:** Each group gets row numbers (1, 2, 3, ...)
4. **WHERE rn = 1:** Keeps only the first (best) record per group

### Example

```
Invoice PLVR-6903/0276 + Payment PLPRV-6904/0131:
  ├─ Row 1: Check_Date: 2026-07-10, Cleared_Date: NULL → rn = 1 ✓ KEPT
  ├─ Row 2: Check_Date: 2026-07-09, Cleared_Date: NULL → rn = 2 ✗ REMOVED
  └─ Row 3: Check_Date: 2026-07-08, Cleared_Date: NULL → rn = 3 ✗ REMOVED

Result: ONE record per invoice+payment (the latest check)
```

---

## Why This Fixes Your Report

**Current Situation:**
```
API returns duplicates
  ↓
Application deduplication (may not catch all cases)
  ↓
Report shows some duplicates (as you're seeing)
```

**After SQL Fix:**
```
API returns CLEAN data (already deduplicated)
  ↓
Application deduplication (redundant but safe)
  ↓
Report shows ONLY unique records ✓
```

---

## Alternative: Implement Locally (If API Provider is Slow)

If the API provider cannot implement this quickly, you can create a **local mirror endpoint**:

### Option A: Create Wrapper API in Backend

```javascript
// backend/routes/externalRoutes.js - Add this endpoint

router.post('/wadl-clean/:customer_no', async (req, res) => {
  try {
    // Call the raw API
    const response = await axios.post(LATE_PAYMENT_WADL_API_URL, {
      "Customer No_": req.params.customer_no
    });
    
    // Deduplicate at application level (TEMPORARY)
    const cleanData = deduplicateInvoices(response.data.data);
    
    res.json({
      success: true,
      data: cleanData,  // Now clean
      note: "Data deduplicated by wrapper. Please request SQL-level fix from API provider."
    });
  } catch (error) {
    // ... error handling
  }
});
```

Then switch your frontend/reports to call this endpoint instead.

**⚠️ Note:** This is a workaround. Still request the SQL fix from the API provider.

---

## Timeline & Recommendations

| Phase | Action | Timeline | Effort |
|-------|--------|----------|--------|
| **Now** | Continue using application-level fix | Immediate | None |
| **Week 1** | Request SQL fix from API provider | 1-2 days | Email |
| **Week 2-3** | API provider implements fix | 3-5 days | Their team |
| **Verification** | Test and confirm deduplication | 1 day | Your team |
| **Final** | Remove application-level fix (now redundant) | 1 day | Your team |

---

## Technical Debt Elimination

Once API provider implements the SQL fix:

1. Remove the application-level deduplication code
2. Application becomes simpler and faster
3. Data integrity is guaranteed at source
4. Future developers inherit clean data

---

## Questions

**Q: Can I fix this myself?**  
A: Only if you have **direct access** to the Dynamics 365 database and can update the API query. Contact your DBA.

**Q: How long will the API provider take?**  
A: Usually 3-5 business days for a simple SQL wrap.

**Q: Can I use the application-level fix forever?**  
A: Technically yes, but it's **not best practice** for financial systems. Every layer of deduplication is a potential failure point.

**Q: Will this affect my data?**  
A: No. The SQL fix only changes what the API **returns**, not what's stored in the database.

---

## Files Provided

| File | Purpose |
|------|---------|
| [LATE_PAYMENT_WADL_QUERY_FIXED.sql](./LATE_PAYMENT_WADL_QUERY_FIXED.sql) | Production-ready SQL query |
| [backend/controllers/financialController.js](../../backend/controllers/financialController.js#L86) | Temporary application-level fix |

---

## Next Steps

1. **Email the API provider** the fixed SQL query
2. **Inform them** this removes 10-15% duplicate records
3. **Request timeline** for implementation  
4. **Test when ready** using the verification steps above
5. **Update your code** to remove application-level fix once SQL is live

This is the **proper, industry-standard approach** for financial data integrity.
