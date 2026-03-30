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