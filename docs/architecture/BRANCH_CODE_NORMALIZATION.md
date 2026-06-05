# Branch Code Normalization & Filtering

## 1. Overview

This document describes the critical branch code normalization logic that ensures Regional Managers see only the credit requests from their assigned branches. **This is a critical system component** that must be maintained consistently across all parts of the application.

## 2. Problem Statement

Different systems and components represent branch codes in different formats:
- **JWT/User Token**: `00TR` (with numeric prefix)
- **TX_ID**: `TRCA6905/01` (without numeric prefix, or may have `00TRCA6905/01`)
- **Region Configuration**: `TR` (stored as non-normalized codes)

Without normalization, filtering logic fails silently, causing Regional Managers to see no requests even when requests exist in their branch.

### Example Failure Scenario
```
User Branch:    00TR
Region Config:  TR
TX_ID:          TRCA6905/01

// Without normalization:
"00TR" !== "TR"  // Mismatch! Region not found.
```

## 3. Solution: Branch Code Normalization

### 3.1 Normalization Rules

The `normalizeBranchCode()` function removes all leading digits to extract the core branch code:

```javascript
const normalizeBranchCode = (rawBranchCode) => {
  const code = String(rawBranchCode || "").trim().toUpperCase();
  const normalized = code.replace(/^\d+/, "");  // Remove leading digits
  return normalized || "XX";  // Fallback to "XX" if empty
};
```

**Examples:**
- `00TR` → `TR`
- `0010TR` → `TR`
- `TR` → `TR`
- `1234ABC` → `ABC`
- `00` → `XX` (all digits)
- `` (empty) → `XX`

### 3.2 Application Points

#### A. User Branch Code Extraction
**File**: `backend/controllers/creditRequestController.js` (getCreditRequests)

We use `getBranchCodesFromUser` to support multiple branches (e.g. for Regional Managers overseeing multiple regions).

```javascript
const rawBranchCodes = getBranchCodesFromUser(req.user);
const userBranchCodes = rawBranchCodes.map(normalizeBranchCode).filter(c => c !== "XX");
// Example: ["00TR", "01TJ"] → ["TR", "TJ"]
```

#### B. Region Configuration Normalization
**File**: `backend/controllers/creditRequestController.js` (getCreditRequests)

For each region in the REGION_BRANCH_CONFIG, normalize all zone codes, and accumulate branches from ALL regions that match any of the user's assigned branches:

```javascript
const normalizedZones = (region.zones || [])
  .map((zone) => ({
    ...zone,
    normalizedCode: normalizeBranchCode(zone.code),  // "TR" → "TR"
  }))
  .filter((zone) => zone.normalizedCode !== "XX");

const hasBranch = normalizedZones.some(
  (zone) => userBranchCodes.includes(zone.normalizedCode)
);
```

#### C. TX_ID Filtering Pattern
**File**: `backend/controllers/creditRequestController.js` (getCreditRequests)

After determining `allowedBranches`, construct SQL LIKE patterns:

```javascript
// Pattern MUST start with the normalized branch code
const branchParams = allowedBranches.map((code) => `${code}%`);
// Example: ["TR%", "TJ%", "TS%"]  ← NOT ["__TR%", "__TJ%"]

// SQL Query
const branchConditions = allowedBranches.map(() => `tx_id LIKE ?`).join(" OR ");
// WHERE (tx_id LIKE ? OR tx_id LIKE ? ...)
//       WITH PARAMS: ["TR%", "TJ%", ...]
```

This matches tx_ids like:
- `TRCA6905/01` ✓
- `00TRCA6905/01` ✓ (if stored with prefix)
- `TJCA6906/01` ✓
- `NRCA6904/01` ✗ (doesn't start with TR, TJ)

## 4. Critical Implementation Details

### 4.1 **DON'T Use `__` Prefix Pattern** ❌
```javascript
// ❌ WRONG: This assumes all tx_ids have 2-char prefix + branch code
const branchParams = allowedBranches.map((code) => `__${code}%`);
// "TR%" becomes "__TR%" which matches "??TR..." but NOT "TRCA1234/01"
```

### 4.2 **DO Use Direct Prefix** ✓
```javascript
// ✓ CORRECT: Branch code is at the start, follow with any wildcard
const branchParams = allowedBranches.map((code) => `${code}%`);
// "TR%" matches both "TRCA1234/01" and "00TRCA1234/01" (if both formats exist)
```

### 4.3 **Always Normalize Both Sides** ✓
```javascript
// User Branch
const userBranchCode = normalizeBranchCode(req.user.branchCode);

// Region Config Branches
const normalizedZones = region.zones.map(z => ({
  ...z,
  normalizedCode: normalizeBranchCode(z.code)
}));

// Only then compare
const hasBranch = normalizedZones.some(
  (zone) => zone.normalizedCode === userBranchCode
);
```

## 5. Testing & Validation

### Unit Tests
**File**: `backend/tests/normalizeBranchCode.test.cjs`

The test suite validates:
1. Branch code normalization rules
2. Region-to-branch matching with normalized codes
3. Edge cases (empty, all-digits, null)

**Run tests:**
```bash
node backend/tests/normalizeBranchCode.test.cjs
```

### Debug Logging
**File**: `backend/controllers/creditRequestController.js` (getCreditRequests)

Add `[DEBUG]` logs to trace the filtering process:

```javascript
logger.info(`[DEBUG] Raw branch: "${rawBranchCode}", Normalized: "${userBranchCode}"`);
logger.info(`[DEBUG] Normalized zones in region: ${JSON.stringify(normalizedZones)}`);
logger.info(`[DEBUG] Does region contain user branch "${userBranchCode}"? ${hasBranch}`);
logger.info(`[DEBUG] Branch filter: (${branchConditions}) with params: ${JSON.stringify(branchParams)}`);
```

## 6. Related Components to Audit

The following components interact with branch/region logic and should be audited to ensure consistency:

| Component | File | Status |
|-----------|------|--------|
| Pending Requests Filter | `backend/controllers/creditRequestController.js` `getCreditRequests` | ✓ Fixed (uses normalization) |
| Request Creation (TX_ID Generation) | `backend/controllers/creditRequestController.js` `createCreditRequest` | ✓ Uses `normalizeBranchCode` |
| Batch Automation Filter | `backend/controllers/externalController.js` | ⚠️ Audit needed |
| Notification Routing | `backend/controllers/notificationController.js` | ⚠️ Audit needed |
| Customer/Blacklist Filters | `backend/controllers/customerController.js` | ⚠️ Audit needed |

## 7. Data Integrity Check

Verify that `REGION_BRANCH_CONFIG` is stored correctly in the database:

```sql
SELECT config_value FROM Configurations WHERE config_key = 'REGION_BRANCH_CONFIG';
```

Expected format:
```json
[
  {
    "region": "กทม (Metro)",
    "zones": [
      { "code": "TJ", "name": "ตรอกจันทน์" },
      { "code": "TR", "name": "พระราม 2" },
      ...
    ]
  }
]
```

## 8. Changelog

| Date | Change | Reason |
|------|--------|--------|
| 2026-05-07 | Fixed branch filter pattern in `getCreditRequests` | User branch `00TR` was not matching region zones; changed from `__${code}%` to `${code}%` pattern |
| 2026-05-07 | Added comprehensive normalization logging | Enable debugging of branch filtering issues in production |
| 2026-05-07 | Updated unit tests to validate region mapping | Ensure all normalization rules are tested |
| 2026-06-05 | Added support for multiple branches per user (`getBranchCodesFromUser`) | Allow Regional Managers with multiple branches to oversee multiple regions |

---

**Document Version**: 1.1
**Last Updated**: 2026-06-05
**Maintained By**: Development Team
