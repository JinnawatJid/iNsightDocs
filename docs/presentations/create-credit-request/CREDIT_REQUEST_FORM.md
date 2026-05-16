# CreditRequestForm Component — Overview & Component Map
> `src/components/credit/forms/CreditRequestForm.vue`

---

## Component Map (ภาพรวม)

```
[CreditRequestForm.vue]  ← Orchestrator: tabs, validation, submit flow
     │
     ├── ApplicationTabs / ProjectApplicationTabs / AddProjectTab  ← form sections
     ├── CreditReviewSection / ChangeSummaryModal ← review + change confirmation
     ├── src/stores/creditRequest.js    ← state: `customer`, `transactionData`, files, requestId/status
     ├── src/config/workflow.js         ← `workflowConfig`, `roleLabels` for actions
     ├── src/utils/validationLabels.js  ← fieldLabels / docLabels used in validation UI
     └── src/utils/axios.js / services  ← API calls for submit and config
```

---

## ไฟล์ที่เกี่ยวข้องและหน้าที่

| ไฟล์ | Layer | หน้าที่ |
|---|---|---|
| `src/components/credit/forms/CreditRequestForm.vue` | Frontend / Component | Orchestrates the full credit request form: tabs, project cards, validation, action buttons, submit flow |
| `ApplicationTabs.vue`, `ProjectApplicationTabs.vue`, `AddProjectTab.vue` | Subcomponents | Form sections (customer, store, general, residence, financial, project details) |
| `CreditReviewSection.vue` | Subcomponent | Unified review, terms, and comment box shown on last tab |
| `ChangeSummaryModal.vue` | Subcomponent | Presents detected changes for reviewer confirmation before submit |
| `src/stores/creditRequest.js` | Store | Source of truth: `customer`, `transactionData`, `files`, `pendingFileDeletions`, `requestId`, `requestStatus` |
| `src/config/workflow.js` | Config | Defines workflow actions per status used to render action buttons |
| `src/utils/validationLabels.js` | Utility | Maps field keys & document keys to human labels for validation messages |

---

## CreditRequestForm — แสดงอะไรบ้าง

Sections and UX elements:

- Read-only banner: shown when `isReadOnly` (request already submitted)
- Customer info card: `ApplicationTabs` (collapsible for project credits)
- Project cards: one per project with `ProjectApplicationTabs` (collapsible, removable)
- Add Project card: `AddProjectTab` (when not read-only)
- GlobalPhasingAnalysis: shown when multiple projects exist
- Review area: `CreditReviewSection` shown on last tab or in focus mode
- Action buttons: secondary and primary actions derived from `workflowConfig[requestStatus]` — Save Draft, Submit, Approve, Reject, etc.
- Change Summary Modal: appears when `computeChanges()` returns differences for special requests before submitting
- Empty state: prompt to search customer when no customer selected

---

## Logic & Data Flow (high level)

- Reads authoritative data from `creditRequest` store (customer, transactionData, files, comments, requestId/status).
- Computes viewMode (`full` vs `focus`) based on request type and `showAllDetails` flag.
- Determines available actions from `workflowConfig[requestStatus]`, filters by conditions like `isHighValue`.
- Validation and submit flow (`handleAction`):
  1. If action is submit-like → run `store.validateRequest(true, isFinancialMandatory)`
  2. If invalid → group missing fields/docs into HTML and show `Swal` warning
  3. If valid and special-type changes exist → open `ChangeSummaryModal` for review
  4. Persist customer (`store.saveCustomerData`) then call `submitTransaction(btn)`
- `submitTransaction(btn)`: builds FormData with snapshot, status, files, pending deletions, and posts to `/api/credit-requests`.
- On success: for drafts, update route query with `txId` and reload `store.loadRequestDetail`; for non-draft submission uses `window.location.reload()`.

---

## Key functions & behaviors

- `isReadOnly`: derived from store, gates UI interactions
- `isHighValue`: numeric comparison vs `approvalThreshold` (composable)
- `availableActions`, `secondaryActions`, `primaryActions`: compute UI buttons from `workflowConfig`
- `handleNextTab`: advances `store.activeTab` for non-project flows; scrolls for project layout
- `computeChanges()`: inspects `store.originalCustomer`, `store.customer`, and transaction data to produce a change summary used by the modal
- `submitTransaction(btn)`:
  - syncs originalTransactionData if submitting a draft
  - appends snapshot and files (skips `isRemote` File placeholders)
  - appends `files_to_delete` for soft deletions
  - calls API and handles 409 conflict vs other errors

---

## Edge cases & review checklist

- Validation complexity: `store.validateRequest()` is large and context-sensitive; ensure mappings in `fieldLabels` / `docLabels` are comprehensive and kept in sync with `getMandatoryKeys()`.
- LocalStorage usage: draft comments saved per `draftComment_<txId>` — verify cleanup and race conditions when `store.requestId` is created mid-flow.
- Snapshot & original data: `originalTransactionData` is set in multiple places (load/create/save); verify immutability guarantees so reviewers see true baseline values.
- File handling:
  - Only actual File objects are appended to FormData; remote placeholders are serialized under `previous_files`.
  - `pendingFileDeletions` are appended as `files_to_delete` — confirm backend expects repeated keys.
- Submit behavior: non-draft submissions call `window.location.reload()`; consider replacing with a route/SPA-friendly flow to avoid full reloads during code review/demos.
- Error handling: 409 returns a user-facing message; other errors show generic messages — consider more granular handling for validation vs server errors.
- Concurrency: actions reuse `createCreditRequest` endpoint shape for status changes; ensure backend supports idempotency and concurrent attempts.

---

## Suggested small improvements

- Extract `submitTransaction` helpers to a service module for easier unit testing and to centralize FormData logic.
- Replace `window.location.reload()` with SPA navigation to the resulting request detail route.
- Move action selection logic (filtering by conditions) into a composable so it can be unit-tested separately.
- Add unit tests for `computeChanges()` to ensure reviewer-visible diffs are correct for change/credit increase/payment-change scenarios.
- Add better handling for file upload placeholders: unify representation so components can treat remote files uniformly.
- Consider showing inline validation hints instead of a single modal list when submitting, to reduce user friction.

---

## Suggested tests

- Unit tests:
  - `computeChanges()` for different request types (increase, payment-change, term-change)
  - `handleAction()` validation branches: missing fields/docs -> shows Swal and does not submit
  - `submitTransaction()` FormData contents (files appended, snapshot included, files_to_delete present)
  - `availableActions` filtration by `isHighValue`

- Integration tests (mock store + axios):
  - Save draft flow: returns txId, route updated, `store.loadRequestDetail` called
  - Submit flow: success vs 409 conflict vs other error responses

---

## Quick reference links

- Source: [src/components/credit/forms/CreditRequestForm.vue](src/components/credit/forms/CreditRequestForm.vue#L1-L400)
- Workflow config: `src/config/workflow.js`
- Store: [src/stores/creditRequest.js](src/stores/creditRequest.js#L1-L260)
- Validation labels: `src/utils/validationLabels.js`

---

If you want, I can:
- add unit test stubs for `computeChanges()` and `submitTransaction()`;
- or refactor `submitTransaction` into a testable service and replace the `window.location.reload()` behavior.
