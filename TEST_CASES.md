# Manual Test Cases

This document outlines the manual test cases to verify the recent refactoring of the Vue.js application structure.

## Test Environment
- **Browser:** Chrome / Firefox / Safari (Latest versions)
- **URL:** `http://localhost:5173` (or your configured local dev URL)

## Test Case 1: Application Launch and Navigation
**Goal:** Verify that the application loads correctly after moving shared components.

1.  **Start the application:**
    -   Run `npm run dev` in the terminal.
    -   Open the browser to the provided localhost URL.
2.  **Verify Home Page (Create Credit Request):**
    -   **Check:** Does the page load without errors?
    -   **Check:** Is the `Navbar` visible at the top? (It was moved to `src/components/shared/Navbar.vue`).
    -   **Action:** Try clicking links in the Navbar (if any).
3.  **Verify Pending Request Page (Old View):**
    -   **Action:** Navigate to the "Pending Request" page (or whatever route maps to `PendingRequestOld.vue`, likely need to check `router/index.js` or modify URL manually if links are broken).
    -   **Check:** Does the table display?
    -   **Check:** Is the `Pagination` component visible at the bottom? (It was moved to `src/components/shared/Pagination.vue`).
    -   **Action:** Click next/prev page on pagination. Does it work?

## Test Case 2: Customer Search (Using Old Components)
**Goal:** Verify that the components moved to `old-credit-components` still function in the views that use them.

1.  **Navigate to Customer Search Page:**
    -   Go to the route for `CustomerSearch.vue`.
2.  **Perform Search:**
    -   Enter a customer ID or name (e.g., from `src/data/customers.json`).
    -   Click Search.
3.  **Verify Components:**
    -   **Check:** Does the `CreditBadge` appear? (Moved to `old-credit-components/CreditBadge.vue`).
    -   **Check:** Does the `NewCreditRequestButton` appear?
    -   **Check:** Do the `CustomerGeneralDetail`, `CustomerCredit`, and `CustomerInvoices` sections render data correctly?
4.  **Verify No Console Errors:**
    -   Open Developer Tools (F12) > Console.
    -   Ensure there are no "Failed to resolve component" errors.

## Test Case 3: Create Credit Request Flow
**Goal:** Ensure the main feature remains intact.

1.  **Navigate to `/create-credit-request` (or root).**
2.  **Search for a Customer:**
    -   Enter a customer name in the header search bar.
    -   Hit Enter or click Search.
3.  **Verify Layout:**
    -   **Check:** Does the left sidebar (History) appear?
    -   **Check:** Does the center form fill with data?
    -   **Check:** Does the right summary panel appear?

## Notes for Testers
- If any component fails to load, check the browser console for specific path errors.
- Ensure `npm install` has been run if any dependencies changed (none should have for this refactor).
