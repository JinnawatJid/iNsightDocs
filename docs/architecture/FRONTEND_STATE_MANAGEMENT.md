# Frontend State Management & Workflow

This document outlines the architecture, patterns, and state management strategies used within the Vue frontend, specifically focusing on complex workflows like the Credit Request form (`/create-credit-request`).

## 1. URL Query Parameters for State Persistence

Because standard Vue applications are SPAs (Single Page Applications) and can lose local state on a hard refresh, critical state identifiers are maintained in the URL's query parameters.

### Pattern: `?search={customer_no}&txId={transaction_id}`

For the Credit Request form, the application relies on two query parameters to restore state:
*   `search`: The ID or Code of the Customer being evaluated. If this is present, the app automatically fetches the `customerController` data and populates the profile tabs.
*   `txId`: The ID of a specific Credit Request Draft (`CreditRequests.tx_id`). If this is present alongside `search`, the app explicitly loads that draft transaction.

If a user manually refreshes the page (`F5`), the `onMounted` lifecycle hook in `CreateCreditRequest.vue` intercepts these URL parameters to restore the exact state they were looking at, preventing data loss or kicking the user back to an empty search screen.

## 2. Draft Saving & Validation Bypasses

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