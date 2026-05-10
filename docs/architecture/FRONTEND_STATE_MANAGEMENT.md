# Frontend State Management & Workflow

This document outlines the architecture, patterns, and state management strategies used within the Vue frontend, specifically focusing on complex workflows like the Credit Request form (`/create-credit-request`).

## 1. URL Query Parameters for State Persistence

Because standard Vue applications are SPAs (Single Page Applications) and can lose local state on a hard refresh, critical state identifiers are maintained in the URL's query parameters.

### Pattern: `?search={customer_no}&txId={transaction_id}`

For the Credit Request form, the application relies on two query parameters to restore state:
*   `search`: The ID or Code of the Customer being evaluated. If this is present, the app automatically fetches the `customerController` data and populates the profile tabs.
*   `txId`: The ID of a specific Credit Request Draft (`CreditRequests.tx_id`). If this is present alongside `search`, the app explicitly loads that draft transaction.

If a user manually refreshes the page (`F5`), the `onMounted` lifecycle hook in `CreateCreditRequest.vue` intercepts these URL parameters to restore the exact state they were looking at, preventing data loss or kicking the user back to an empty search screen.

### Model Type Selection for Analysis

The frontend determines which scoring model to request (`model_type` = `new` | `existing`) when performing financial analysis. Historically this mapping used the request label alone. Current behavior:

- If the request is explicitly `เครดิตใหม่`, the frontend always sends `model_type=new`.
- For other request types (including `เครดิตโครงการ`), the frontend checks customer data and will send `model_type=existing` only when the customer has:
    - non-empty `customer.existing_credits`, or
    - a numeric, non-zero `customer.current_credit_limit` (or `Fixed_Credit_Limit`).

This logic is implemented in `src/components/credit/tabs/StoreStatementTab.vue` and ensures the backend receives the correct model intent. The backend scoring flow (`backend/controllers/financialController.js` -> `backend/services/scoring/ScoringEngine.js`) then uses `model_type` to choose the `NewCustomerScorecard` or `ExistingCustomerScorecard`.

## 2. Draft Saving & Validation Bypasses
### 2.1 State Hydration from Database Snapshots
When the frontend loads an existing request, it maps data from the backend `snapshot_data` into the Pinia `transactionData` object. It is strictly required that any field actively used by the frontend (such as `draftComment`) is explicitly extracted during hydration.
Failure to map a field during the load phase will cause the Pinia store to assume the field is empty, which will subsequently overwrite and erase the database value upon the next background state sync.


When a user initiates a "Save Draft" action on a Credit Request, two rules apply to improve the user experience:

1.  **Partial Validation:** Full form validation (checking for mandatory fields and financial documents) is explicitly skipped for `saveDraft` actions. The user should be able to save incomplete work and return to it later.
2.  **No Page Reloading (`window.location.reload()`):** Historically, upon successfully submitting data to the backend API, the application executed a `window.location.reload()` to flush state. However, doing this for a "Save Draft" interrupts the user. If they created a *new* draft (where `txId` wasn't previously in the URL), reloading the page would drop them back to the initial "Search Customer" screen.

### The `router.replace` Solution

Instead of reloading the page, when a draft is successfully saved, the frontend captures the newly generated `tx_id` returned by the API (`response.data.data.tx_id`).

It then uses Vue Router's `router.replace` to silently append the `txId` to the current URL:

```javascript
if (btn.action === 'saveDraft') {
    const newTxId = response.data?.data?.tx_id || store.requestId;
    if (newTxId && newTxId !== route.query.txId) {
        // Silently update the URL to include the new txId so refreshes work safely
        router.replace({
            query: {
                ...route.query,
                txId: newTxId
            }
        });
        store.requestId = newTxId;
    }
    // IMPORTANT: Refresh state to map newly uploaded remote files properly
    if (store.requestId) {
        await store.loadRequestDetail(store.requestId);
    }
} else {
    // For actual submissions moving the workflow forward, reload to clear state and return to Search
    window.location.reload();
}
```

This approach provides a seamless experience:
*   The user gets a success notification ("ทำรายการสำเร็จ").
*   The page does not flash or reload.
*   The URL updates from `/create-credit-request?search=CUST` to `/create-credit-request?search=CUST&txId=TX_123`.
*   If the user subsequently hits refresh, they are brought right back to their saved draft.

## 3. When to Use `window.location.reload()`

Hard page reloads should be avoided during active data entry. They are generally only acceptable in the following scenarios:
*   **Final Form Submission:** When a user officially submits a Credit Request (moving it from `Draft` to `Opened`), they are finished with that task. Reloading the page clears out all Pinia store state and returns them to a clean "Search" screen, preventing accidental duplicate submissions.
*   **Authentication Expiration:** If the `HttpOnly` cookie expires or the user logs out.

## 4. Concurrency Control (Optimistic Locking)

To prevent multiple users from accidentally overwriting or duplicating a credit request when working on the same customer simultaneously, the application utilizes an Optimistic Locking pattern based on the `tx_id`.

### The Backend Check
When the frontend submits a request (either to save a draft or submit for approval), it must append the current `tx_id` (from `store.requestId`) to the `FormData` payload.

The backend `createCreditRequest` endpoint will intercept this and compare it against the active database record for that customer. If the `tx_id` does not match, or if a user attempts to submit a Draft but the database shows the request has already been transitioned to `Opened` (or beyond) by someone else, the backend will reject the request and return an HTTP `409 Conflict`.

### The Frontend Handling
The frontend (`CreditRequestForm.vue`) explicitly catches this `409` status code. Instead of showing a generic "Error Submitting Request" message, it parses the custom error message returned by the backend (e.g., "มีคำขอเครดิตที่กำลังดำเนินการอยู่สำหรับลูกค้ารายนี้ โปรดรีเฟรชหน้าจอ") and displays it to the user via a SweetAlert popup. This strictly informs the user that their current screen state is stale and they must refresh to see the latest progress made by their colleague.

## 5. File Uploads & Remote State Flags

A critical aspect of state management involves uploaded files, specifically preventing duplicate files from being uploaded upon successive saves (like clicking "Save Draft" multiple times).

### The `isRemote` Flag

When a user selects a file from their local machine, it is added to the Pinia store (`store.files`) as a standard JavaScript `File` object.

When the frontend appends data to a `FormData` object during submission, it iterates over `store.files`. If it encounters a raw `File` object, it assumes it is a new file and appends it to the upload payload.

If the backend successfully saves the file, that file is now "Remote". To prevent re-uploading the same file, the frontend must replace the local `File` object in `store.files` with a placeholder object containing the property `isRemote: true`.

```javascript
// Example remote placeholder
const fileObj = {
    name: "DBD_Profile.pdf",
    original_name: "DBD_Profile.pdf",
    isRemote: true,
    // ...
};
```

When building the next `FormData` payload, the frontend explicitly ignores any object where `!file.isRemote` is false.

**Crucial Implementation Rule:**
Whenever an action occurs that performs a background save (like "Save Draft" preventing page reloads), the application **must** actively refresh the state of the transaction from the backend (e.g., `await store.loadRequestDetail(requestId)`). Failing to do so will leave the local `File` objects in the store without the `isRemote` flag, resulting in them being incorrectly appended and duplicated on the next save or submit action. Similarly, when iterating over arrays of files (like "Other Documents"), the `!f.isRemote` check must be applied to every single element in the array mapping.
## 4. Form Validation & Error Feedback UI

When validating complex forms with multiple tabs (such as the Credit Request Form), the application adheres to the following UI standards to ensure user-friendly feedback:

### Tab-Grouped Validation Presentation

If a user attempts to submit a form that fails validation (e.g., missing required fields or documents), the application groups the missing items by their corresponding UI tab.

The feedback is presented via a SweetAlert (`Swal.fire`) popup. However, the HTML string inside the popup must follow specific formatting rules to maximize readability and adhere to industry standards for long lists:

*   **Avoid Bracket Notation:** Do not use `[Tab Name]` as a prefix, as it appears overly technical.
*   **Use Descriptive Labels:** Use the word "หน้า" (Page/Tab) followed by the tab name and a colon (e.g., `หน้าข้อมูลที่อยู่:`).
*   **Use Bullet Points:** Render the grouped list as a bulleted list (`<ul><li>&bull; ...</li></ul>`) to separate the sections clearly and make them easily scannable.

**Correct Format Example:**
```html
📝 ข้อมูลที่ต้องระบุ:
• หน้าเงื่อนไขและคำขอ: วงเงินที่ขอ, เหตุผล, วิธีชำระเงิน
• หน้าข้อมูลที่อยู่: ที่อยู่/บ้านเลขที่, แขวง/ตำบล
```

This ensures the user does not feel overwhelmed by a wall of text and knows exactly which tab to navigate to in order to resolve the errors. The internal logic maps database field keys (e.g., `address_no`) to these readable labels using the `src/utils/validationLabels.js` dictionary.

---

## 5. Credit Data Isolation — Reviewer Suggestion Pattern (2026-05-10)

A critical architectural pattern governs how reviewer edits are isolated from read-only display components during the credit review workflow.

### The Problem

The `CreditReviewSection` allows reviewers to suggest modified credit amounts and terms before formally submitting. Without isolation, binding these inputs directly to `store.transactionData` causes live contamination: the Deal Summary, Expanded Details (RequestInfoTab), and other read-only components update dynamically as the reviewer types — showing reviewer drafts as if they were the approved values.

### Three Layers of Credit State

| Layer | Store field | Purpose |
|-------|------------|---------|
| **Initiator's original** | `originalTransactionData`, `originalRequestedAmount`, `originalRequestedTerms` | Frozen at Draft → Opened submission. Never mutated after that. |
| **Current DB state** | `transactionData` | Reflects what the DB says right now (may include prior reviewer modifications). Populated by `loadRequestDetail`. |
| **Reviewer's draft edit** | `reviewerSuggestion` | Isolated buffer for in-progress reviewer input. Cleared on load. Only written to `transactionData` on formal submission. |

### How it Works

**`CreditReviewSection.vue`** binds its inputs to `reviewerSuggestion` via `store.updateReviewerSuggestion(field, value)`. It never writes directly to `transactionData`.

**`store.getEffectiveValue(field)`** is a read helper:
```js
getEffectiveValue(field) {
  if (this.reviewerSuggestion[field] !== '' && this.reviewerSuggestion[field] !== null) {
    return this.reviewerSuggestion[field];  // reviewer's draft
  }
  return this.transactionData[field];       // current DB value
}
```
Only `CreditReviewSection` uses this — it shows the reviewer what they are typing.

**`ReviewDashboard.vue`** — Deal Summary reads `store.originalRequestedAmount` and `store.originalRequestedTerms` (immutable originals). It never reads `reviewerSuggestion`.

**`RequestInfoTab.vue`** — in the expanded view (`readOnly=true` with a `baseline` prop), reads `props.baseline.amount` / `props.baseline.termGS` etc. The `baseline` prop is a deep-frozen snapshot set when the user opens the full details view.

**`store.applyReviewerSuggestion()`** — atomically writes `reviewerSuggestion` → `transactionData` on formal submission (Approve/Reject action). Only at this point does the DB state update.

### Rules for Display Components

| Component | Should read from |
|-----------|-----------------|
| Deal Summary (`ReviewDashboard`) | `originalRequestedAmount` / `originalRequestedTerms` |
| Expanded Details (`RequestInfoTab`, readOnly+baseline) | `props.baseline` (deep copy of `originalTransactionData`) |
| Reviewer input form (`CreditReviewSection`) | `getEffectiveValue()` → `reviewerSuggestion` first |
| Initiator draft form (`RequestInfoTab`, edit mode) | `transactionData` |

### Key Rule: snapshot embeds originals at Draft submission

In `saveTransactionData()`, when `requestStatus === 'Draft'`, the store syncs `originalTransactionData = transactionData` **before** calling `getSnapshot()`. This ensures the snapshot bakes in the initiator's actual input as the canonical original that all reviewers will see.

