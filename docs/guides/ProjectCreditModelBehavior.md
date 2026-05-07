# Project Credit: Model Selection Behavior

Summary
-------
This guide describes the business rule and implementation points for choosing the scoring model when creating or analysing a "Project Credit" request (เครดิตโครงการ).

Business rule
-------------
- If the customer has an existing credit relationship (existing credit entries OR a non-zero current credit limit), use the Existing Customer model (`model_type=existing`).
- Otherwise, treat the request as a New Customer scoring (`model_type=new`).

Why
---
Previously the UI sometimes selected the "increase credit"/existing-customer model for project-credit requests even when the customer had no prior limit. That caused inappropriate limit-adjustment logic to run. The new rule ensures we score new/unknown customers with the NewCustomerScorecard instead.

Files to inspect/change
-----------------------
- Frontend decision logic: `src/components/credit/tabs/StoreStatementTab.vue`
- Backend scoring entrypoint: `backend/controllers/financialController.js`
- Scoring factory: `backend/services/scoring/ScoringEngine.js`

Simple pseudocode
-----------------
```
if requestType == 'เครดิตใหม่':
    model_type = 'new'
else:
    if customer.existing_credits.length > 0 or customer.current_credit_limit > 0:
        model_type = 'existing'
    else:
        model_type = 'new'
```

Testing notes
-------------
- QA should verify three scenarios:
  1. Customer with no existing credits and zero current limit => `model_type=new` and NewCustomerScorecard used.
  2. Customer with existing credits or non-zero limit => `model_type=existing` and ExistingCustomerScorecard used.
  3. Explicit `เครดิตใหม่` requests always send `model_type=new` even if a limit exists.

Release note (to include in changelog)
-------------------------------------
Project-credit requests now select the scoring model based on whether the customer has prior credit (existing credits or a non-zero current limit). This prevents incorrectly using the existing-customer increase-credit model for customers without prior limits.
