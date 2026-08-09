# Financial Analysis and Credit Scoring

## 1. Overview

The **Financial Analysis and Scoring** feature allows branch managers and financial officers to analyze customer financial data and automatically compute credit scores, business size classifications, and recommended credit limits. This feature is implemented in the `StoreStatementTab.vue` component within the `CreditRequestForm` workflow.

The analysis triggers a backend calculation engine that evaluates financial statements (Balance Sheet, Profit & Loss, Financial Ratios) and returns:
- **Credit Score** (0-200 points)
- **Business Size Classification** (e.g., Small, Medium, Large)
- **Credit Grade** (e.g., A+, A, B+, S)
- **Recommended Credit Limit** (with optional guarantee breakdown)

## 2. Component Architecture

### 2.1 Main Component: `StoreStatementTab.vue`
**Location:** `/src/components/credit/tabs/StoreStatementTab.vue`

This component manages:
- File uploads for financial documents (Balance Sheet, Profit & Loss, Financial Ratios)
- Manual input fields (Registered Capital, Customer Duration)
- The **"วิเคราะห์และคำนวณคะแนน"** (Analyze and Calculate Score) button
- Inline validation hint below the analyze button (shown only after submit-attempt validation fails due to missing score calculation)
- Display of analysis results in three cards:
  1. **Credit Score Card** (Credit points: X/200)
  2. **Size & Grade Card** (Business Size + Credit Grade)
  3. **Suggested Limit Card** (Recommended credit limit with guarantee breakdown)
- Score breakdown details (C1, C2, C3 component scores)

### 2.2 Related Components
- **CreditScoreSheet.vue**: Full detailed analysis report (accessible via "📄 ดูรายละเอียดเต็ม" button)
- **ScoringBreakdownGrid.vue**: Detailed breakdown of scoring components

## 3. Role-Based Visibility Control

The feature implements **role-based visibility** to prevent confusion among branch managers by hiding sensitive scoring details they don't need to see.

### 3.1 The `shouldHideValues` Computed Property

```javascript
const shouldHideValues = computed(() => {
    return authStore.hideCreditScoreEnabled && authStore.isInitiator && store.requestStatus !== 'Approved';
});
```

**Condition Logic:**
- `authStore.hideCreditScoreEnabled`: Global feature flag (system-wide setting)
- `authStore.isInitiator`: User is identified as a **Branch Manager** (ผู้สร้างคำขอ)
- `store.requestStatus !== 'Approved'`: Request is NOT yet approved (Draft or Pending states)

**When ALL conditions are true**, `shouldHideValues = true`, and sensitive data is hidden.

### 3.2 Visibility Matrix

| Role | Status | Credit Score Card | Size & Grade Card | Limit Card | Score Breakdown | Description |
|------|--------|-------------------|-------------------|------------|-----------------|-------------|
| **Branch Manager** (Initiator) | Draft/Pending | ❌ Hidden | ✅ Visible | ❌ Hidden | ❌ Hidden | Only sees Size & Grade inline |
| **Branch Manager** (Initiator) | Approved | ✅ Visible | ✅ Visible | ✅ Visible | ✅ Visible | Full visibility after approval |
| **Finance Officer/Reviewer** | Any | ✅ Visible | ✅ Visible | ✅ Visible | ✅ Visible | Always sees all details |
| **System Admin** | Any | ✅ Visible | ✅ Visible | ✅ Visible | ✅ Visible | Always sees all details |

### 3.3 Why This Design?

**Problem:** Branch managers were confused when seeing the full credit analysis modal popup with:
- Credit score (technical metric)
- Suggested credit limit (determined by approvers, not branch managers)
- Complex scoring breakdown

This created confusion because:
1. Branch managers cannot set credit limits (approval committee decides)
2. Detailed scoring is reviewer responsibility
3. The popup was interruptive and unnecessary

**Solution:** Show only **Grade** and **Size** inline (without modal popup), which are business-relevant metrics that help branch managers understand their customer segment.

## 4. Analysis Workflow

### 4.1 Pre-Analysis Requirements

Before clicking the analyze button, the system validates:

1. **Registered Capital** (ทุนจดทะเบียน) - Required for company customers
2. **Customer Duration** (ระยะเวลาการเป็นลูกค้า) - Years the customer has been with the bank
3. **Financial Documents** - Unless marked as "no financial data":
   - Balance Sheet (งบดุล)
   - Profit & Loss (งบกำไล)
   - Financial Ratios (งบอัตราส่วน)

If validation fails, a warning modal appears listing missing fields/documents by tab.

### 4.2 Analysis Trigger

```vue
<button
  @click="analyzeFinancials"
  class="btn-primary"
  :disabled="analyzing"
>
  {{ analyzing ? 'กำลังวิเคราะห์...' : 'วิเคราะห์และคำนวณคะแนน' }}
</button>
```

The `analyzeFinancials()` method:
1. Validates all required data
2. Creates FormData with:
   - Excel files (Balance Sheet, P&L, Financial Ratios, optionally Company Profile)
   - Numeric inputs (Registered Capital, Customer Duration, Years in Business)
   - Customer info (Customer Number, Tax ID, Residence Ownership)
   - Request context (Credit Term, Request Amount, Model Type)
   - **Total Guarantee Amount** (sum of all guarantees from all tabs)
3. POSTs to `/api/financials/analyze`
4. Stores results in `analysisResults.value`
5. Triggers automatic save of transaction data

### 4.3 Success: Inline Display (No Modal)

**Previous Behavior:** ❌ Success modal popup with size, grade, and limit
**Current Behavior:** ✅ Results display inline in the component

After successful analysis:
```
analysisResults.value = response.data
```

The three scoring cards automatically display via the template's `v-if="analysisResults.scoringResult"` condition:

#### Card 1: Credit Score (Hidden for Branch Managers)
```
Visible when: !shouldHideValues

Shows: Total score (X/200)
Example: 145/200 (displayed with color-coded grade class)
```

#### Card 2: Size & Grade (Always Visible)
```
Always visible regardless of shouldHideValues

Shows two columns:
  ┌─────────────────────────┐
  │ ขนาด (Size)  │ เกรด (Grade) │
  │   Medium    │     A+       │
  │ คะแนน 45    │  คะแนน 85    │
  └─────────────────────────┘
```

#### Card 3: Suggested Limit (Hidden for Branch Managers)
```
Visible when: !shouldHideValues

Shows: Recommended credit limit
       Optional breakdown of base limit + guarantees
Example: 205,000.00 บาท
         (205,000 base + 100,000 guarantee = 305,000 total)
```

### 4.4 Score Breakdown Section (Hidden for Branch Managers)

When `!shouldHideValues` is false:
```
Visible when: analysisResults.scoringResult.breakdown && !shouldHideValues

Shows breakdown of scoring components:
- C1: ความแข็งแกร่งของบริษัท (Company Strength)
- C2: กระแสเงินสด (Cash Flow)
- C3: เงื่อนไขการชำระเงิน (Payment Terms)
[etc.]
```

### 4.5 Error Handling

If analysis fails:
- Error modal displayed with backend error message or default message
- Result stored in `analysisResults.value = null`
- User can retry

### 4.6 Submit-Time Enforcement (Mandatory Analyze Click)

To prevent sending requests without evaluated suggested credit, the submit flow now enforces a score-calculation checkpoint:

- Validation key: `score_calculation`
- Enforcement point: `validateRequest(isSubmit=true, isFinancialMandatory=true)`
- Scope: **Both individual and company customers**
- Exception: if `transactionData.noFinancialData === true`, score-calculation is not required

Behavior details:
1. User submits without clicking **"วิเคราะห์และคำนวณคะแนน"**
2. Validation fails with `missingFields` containing `score_calculation`
3. SweetAlert lists the missing item in the Financial tab group
4. Inline red helper text appears below the analyze button, guiding the user to click it first
5. After a successful analysis click, the warning is cleared and submit can proceed

Important UX rule:
- The inline red helper text is **not always visible**.
- It is shown only after a submit attempt fails on missing score calculation (aligned with the existing form validation pattern used in other tabs).

## 5. Data Flow Diagram

```
User fills form
      ↓
Clicks "วิเคราะห์และคำนวณคะแนน"
      ↓
analyzeFinancials() validates input
      ↓
Creates FormData with files & inputs
      ↓
POST /api/financials/analyze
      ↓
Backend: Extracts financial data, calculates scores
      ↓
Response: {
  success: true,
  scoringResult: {
    totalScore: 145,
    grade: "A+",
    sizeResult: { label: "Medium", score: 45 },
    gradeResult: { label: "A+", score: 85 },
    recommendedLimit: 305000,
    baseLimit: 205000,
    guaranteeAmount: 100000,
    breakdown: { c1: {...}, c2: {...}, c3: {...} }
  },
  calculations: { dscr: 1.5, creditCapitalRatio: 2.0 }
}
      ↓
analysisResults.value = response
      ↓
Template renders scoring cards (conditioned by shouldHideValues)
      ↓
User sees Size & Grade inline (Branch Manager)
    OR
User sees Size, Grade, Score, & Limit (Reviewer/Approver)
```

## 6. Data Persistence

After successful analysis:

```javascript
// Results stored in component state
analysisResults.value = response.data;

// Results also stored in Pinia store
store.updateFinancialAnalysis(response.data);

// Credit score metadata updated
if (response.data.scoringResult) {
  store.creditScore = {
    ...store.creditScore,
    ...response.data.scoringResult
  };
}

// Transaction data auto-saved to backend
await store.saveTransactionData();
```

This ensures:
- Results persist during form edits
- Results survive page navigation (within session)
- Results automatically save to database

## 7. Guarantee Amount Calculation

The analysis includes a **Total Guarantee Amount** calculated from guarantees across all tabs:

### Sources:
1. **General Tab Guarantees:**
   - Bank Guarantee (bankGuaranteeDetails)
   - Letter Guarantee (letterGuaranteeDetails)
   - Cash Deposit (cashDepositDetails)

2. **Project Tab Guarantees:** (If project credit requests exist)
   - Project Bank Guarantee (projectBankGuaranteeDetails)
   - Project Cash Deposit (projectCashDepositDetails)

### Calculation:
```javascript
let totalGuaranteeSum = 0;

// Sum all amount fields from all guarantee detail maps
generalGuaranteeKeys.forEach(key => {
    const detailsMap = store.transactionData[key] || {};
    Object.values(detailsMap).forEach(detail => {
        if (detail.amount) {
            const num = parseFloat(String(detail.amount).replace(/,/g, ''));
            if (!isNaN(num)) totalGuaranteeSum += num;
        }
    });
});
```

The sum is included in the analysis request:
```
formData.append('total_guarantee_amount', totalGuaranteeSum);
```

## 8. Configuration and Feature Flags

### 8.1 hideCreditScoreEnabled
**Location:** `authStore.hideCreditScoreEnabled`

Controls whether sensitive scoring data (Credit Score, Limit, Breakdown) is hidden from branch managers.

**Set by:**
- Backend authentication/authorization system
- Role-based configuration

### 8.2 requestStatus
**Location:** `store.requestStatus`

Possible values:
- `'Draft'`: Initiator can still edit
- `'Pending Review'`: Submitted for review
- `'Pending Approval'`: Submitted for approval
- `'Approved'`: Final approval granted
- `'Rejected'`: Rejected and returned

**Note:** Once status is `'Approved'`, branch managers see full analysis details.

## 9. Current Limitations & Future Enhancements

### Current Limitations:
1. Analysis can only be triggered once per request (manual re-analysis requires form edit + re-submit)
2. No progress indicator for long-running analysis (uses simple loading state)
3. Backend analysis engine location (bridge/server) is auto-detected with fallback logic

### Potential Enhancements:
1. **Re-analyze Option:** Allow users to re-run analysis after editing financial data
2. **Export Analysis:** Generate PDF report of scoring details
3. **Historical Comparisons:** Compare scores across multiple analysis runs
4. **What-If Calculator:** Allow hypothetical scenarios (e.g., "what if revenue increases 10%?")
5. **Granular Permissions:** Separate permissions for viewing vs. exporting analysis details

## 10. Testing Considerations

### Manual Testing Checklist:
- [ ] Branch Manager role: Analyze → See Size & Grade (no modal, no score/limit)
- [ ] Branch Manager on Approved request: See all details
- [ ] Reviewer role: Analyze → See all four cards + breakdown
- [ ] Invalid input validation: Missing capital → Warning modal
- [ ] Missing files: No Balance Sheet → Warning modal
- [ ] Network error: Analysis fails → Error modal
- [ ] Large file upload: Confirm file size handling
- [ ] Guarantee calculation: Sum multiple guarantees from tabs

### Backend API Verification:
- [ ] Endpoint: `POST /api/financials/analyze`
- [ ] Required fields in request body
- [ ] Response structure includes `scoringResult` object
- [ ] Error response includes meaningful `message` field

## 11. Related Documentation
- [CREATE_CREDIT_REQUEST_FLOW.md](./CREATE_CREDIT_REQUEST_FLOW.md) - Overall credit request workflow
- [MULTI_PROJECT_CREDIT.md](./MULTI_PROJECT_CREDIT.md) - Project credit context and guarantee handling
- [dynamic_rbac_and_workflow.md](../dynamic_rbac_and_workflow.md) - RBAC and permission system

## 12. Data Model Specifications for Name Resolution & Purchase Stats

### 12.1 Customer Name Resolution & Corporate Detection (`isCompanyByName`)
When auto-evaluating credit scores or rendering financial summaries, customer name resolution follows strict data model hierarchy:
1. **Primary Database Field:** `CreditRequests.customer_name` (or `req.body.customer_name`)
2. **Snapshot Root Fields:** `parsedSnapshot.name`, `parsedSnapshot.Name`, `parsedSnapshot.company_name` (spread from `this.customer` in `getSnapshot()`)

> [!CAUTION]
> **Anti-Pattern Warning:** Do NOT check `parsedSnapshot.customer?.name`. In `getSnapshot()` (`src/stores/creditRequest.js`), customer properties are spread at the snapshot **root level**, leaving `parsedSnapshot.customer` `undefined`. Attempting to read `parsedSnapshot.customer?.name` returns `""`, which causes `isCompanyByName("")` to return `false` (falsely treating companies as individuals and zeroing out C2 scores).

### 12.2 Purchase Statistics (`accumData`) Property Key Normalization
Purchase statistics fetched from history APIs or stored in database snapshots may use either camelCase or PascalCase keys. `ExistingCustomerScorecard.js` and `NewCustomerScorecard.js` implement `normalizeAccumData()` to guarantee compatibility:

- **Supported Keys:**
  - 6-Month Purchase Accumulation: `sumLast6` / `SumLast6`
  - 3-Month Purchase Accumulation: `sumLast3` / `SecondAccum`
  - Purchase Trend Slope: `slope` / `Slope` / `Slope6`
  - Payment Delay Days (WADL): `wadl` / `WADL`
  - Trend Ratio: `trendRatio` / `Trend6` / `AccumTrend`

This key normalization ensures that the credit limit formula $\text{Limit} = (\frac{\text{SumLast6}}{4}) \times (\frac{\text{TotalScore}}{200})^2$ never evaluates to `0` due to casing mismatches.

