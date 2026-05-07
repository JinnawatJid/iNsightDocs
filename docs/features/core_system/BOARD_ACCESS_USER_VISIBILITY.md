# Board Access User Visibility in /pending-requests

## Overview

Board access users have special visibility rules in the `/pending-requests` page. Unlike Regional Managers (who see statuses filtered by their assigned branch), board access users see **all non-final pending requests** across all branches for monitoring and approval purposes.

## Board Access Roles

The following roles are considered "board access" users:
- `ผู้พิจารณาฝ่ายขาย` (Sales Reviewer)
- `ผู้ตรวจสอบเอกสาร` (Document Verifier)
- `ผู้อนุมัติ (วงเงินต่ำกว่าเกณฑ์)` (Low-Threshold Approver)
- `ผู้อนุมัติ (วงเงินสูงกว่าเกณฑ์)` (High-Threshold Approver)

These roles are defined in `src/config/workflow.js`:

```javascript
export const broadPendingVisibilityRoles = [
    'ผู้พิจารณาฝ่ายขาย',
    'ผู้ตรวจสอบเอกสาร',
    'ผู้อนุมัติ (วงเงินต่ำกว่าเกณฑ์)',
    'ผู้อนุมัติ (วงเงินสูงกว่าเกณฑ์)',
];
```

## Implementation

### Frontend: RequestSidebar.vue

The `RequestSidebar.vue` component filters the pending requests displayed based on the user's role:

1. **Role Detection**: Checks if user has board access via `isBroadPendingVisibilityRole(myRoles)`

2. **Status Filtering Logic**:

```javascript
const canSeeAllPending = isBroadPendingVisibilityRole(myRoles);

if (canSeeAllPending) {
  // Board access users see all non-final statuses
  allowedStatuses = [
    'Opened', 
    'RegionalSubmitted', 
    'SalesSubmitted', 
    'FinanceReviewed', 
    'Reviewed',
    'PendingSales (ชั่วคราว)',
    'PendingFinance (ชั่วคราว)'
  ];
}
```

3. **Workflow Config Driven**: If `WORKFLOW_CONFIG` is loaded from the database, statuses are derived from it dynamically:

```javascript
if (workflowStates.value && canSeeAllPending) {
  allowedStatuses = Object.entries(workflowStates.value)
    .filter(([key, s]) => s.type !== 'final' && key !== 'Draft')
    .map(([key]) => key);
}
```

4. **Query Generation**: The final status list is sent to the backend:

```
GET /api/credit-requests?status=Opened,RegionalSubmitted,SalesSubmitted,FinanceReviewed,Reviewed,...
```

### Backend: creditRequestController.js

The backend `getCreditRequests` endpoint now identifies board access users:

```javascript
const hasBoardAccess = roles.some((r) => [
  'ผู้พิจารณาฝ่ายขาย',
  'ผู้ตรวจสอบเอกสาร',
  'ผู้อนุมัติ (วงเงินต่ำกว่าเกณฑ์)',
  'ผู้อนุมัติ (วงเงินสูงกว่าเกณฑ์)'
].includes(r.role));
```

**Board access users are NOT subject to branch filtering** - they receive all requests that match the provided status filters.

## 🐛 Bug Fix: May 7, 2026

### Issue
Board access users were only seeing requests with status `RegionalSubmitted`, missing other pending statuses like `Opened`, `SalesSubmitted`, etc.

### Root Cause
The frontend `RequestSidebar.vue` was falling back to hardcoded status logic when `WORKFLOW_CONFIG` wasn't loaded, and the fallback logic only included `RegionalSubmitted` for "SalesManager" users, instead of including all pending statuses for board access users.

### Solution
Enhanced the fallback logic in `RequestSidebar.vue` to explicitly check `canSeeAllPending` and include all pending statuses:

```javascript
} else if (canSeeAllPending) {
  // Board access users should see all pending statuses (fallback when WORKFLOW_CONFIG unavailable)
  allowedStatuses.push(
    'Opened', 
    'RegionalSubmitted', 
    'SalesSubmitted', 
    'FinanceReviewed', 
    'Reviewed', 
    'PendingSales (ชั่วคราว)', 
    'PendingFinance (ชั่วคราว)'
  );
}
```

### Testing Verification
After the fix, board access users now see:
- ✅ Opened status requests
- ✅ RegionalSubmitted status requests
- ✅ SalesSubmitted status requests
- ✅ FinanceReviewed status requests
- ✅ Reviewed status requests
- ✅ Transient pending statuses

## Debug Logging

Both frontend and backend now include comprehensive debugging:

**Frontend Console** (Browser DevTools → Console):
```javascript
[DEBUG] RequestSidebar fetchData - myRoles: ['ผู้พิจารณาฝ่ายขาย']
[DEBUG] RequestSidebar fetchData - canSeeAllPending: true
[DEBUG] RequestSidebar fetchData - workflowStates loaded: true/false
[DEBUG] RequestSidebar fetchData - Final uniqueStatuses: ['Opened', 'RegionalSubmitted', ...]
```

**Backend Logs** (Server logs):
```
[DEBUG] User "68201" roles array: [{"app":"2","app":"Smart Credit Application","roleId":"11","role":"ผู้พิจารณาฝ่ายขาย"}]
[DEBUG] Board Access Check - Found roles matching board: true
[DEBUG] Returned tx_ids: TRCA6905/02, PLC4905/01, PKC4905/01, ...
[DEBUG] ALL in-process requests in DB: [...]
```

## Actionability

While board access users can **see** all pending requests, they can only **take action** on requests that match their role's `actionableByRoles`:

- `ผู้พิจารณาฝ่ายขาย`: Can only act on `RegionalSubmitted` status
- `ผู้ตรวจสอบเอกสาร`: Can only act on `SalesSubmitted` status
- `ผู้อนุมัติ (วงเงินต่ำกว่าเกณฑ์)`: Can only act on `Reviewed` status (low amount)
- `ผู้อนุมัติ (วงเงินสูงกว่าเกณฑ์)`: Can only act on `Reviewed` status (high amount)

Read-only visibility for statuses outside their actionable scope allows for better monitoring and queue awareness.

## Related Files

- Frontend: [src/components/credit/dashboard/RequestSidebar.vue](../../src/components/credit/dashboard/RequestSidebar.vue)
- Frontend Config: [src/config/workflow.js](../../src/config/workflow.js)
- Backend: [backend/controllers/creditRequestController.js](../../backend/controllers/creditRequestController.js)
- Auth Middleware: [backend/middleware/authMiddleware.js](../../backend/middleware/authMiddleware.js)
- Feature Documentation: [docs/features/core_system/AUTHENTICATION_FLOW.md](./AUTHENTICATION_FLOW.md)
