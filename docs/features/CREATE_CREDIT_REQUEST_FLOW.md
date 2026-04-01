# Create Credit Request Flow & UI Rules

## 1. Core Workflow ("Search First" Pattern)
The `CreateCreditRequest` feature STRICTLY enforces a **"Search First"** pattern. This means users cannot select a credit request type or view the application form until a customer is successfully searched and validated.

### The 3 States of the UI:
1. **Initial State (Before Search)**:
   - The Search input is active on the left.
   - The Action area (Request Type) on the right displays a **disabled placeholder** (`กรุณาค้นหาลูกค้าก่อน...`).
   - The main content area shows a generic search prompt.

2. **Context Mode (Dashboard State)**:
   - Triggered when `store.hasSearched = true` AND `!isRequestStarted`.
   - The `CustomerProfileDashboard` is displayed, giving the user context about the customer's current limits, terms, and history.
   - The Action area transforms into a `+ เพิ่มคำขอเครดิตใหม่` (Start New Request) button. Clicking this opens a popover menu to select the specific request type (New, Increase, Change Terms, etc.).
   - Options in the popover are dynamically disabled based on the customer's current credit limit (e.g., cannot request "New Credit" if they already have an existing limit).
   - **Important:** At this stage, a temporary Draft Request ID (`store.requestId`) has **not** been generated yet. It is explicitly deferred until the user makes a selection.

3. **Form Mode (Action State)**:
   - Triggered when `isRequestStarted = true` (after selecting a type from the popover or clicking a previous request from the history sidebar via the `@request-selected` event).
   - Upon selecting a request type from the popover (e.g., "เครดิตใหม่"), the system **finally generates the temporary Draft Request ID** and saves the initial transaction data.
   - The `CustomerProfileDashboard` is hidden, and the `CreditRequestForm` is displayed.
   - The Action area transforms into a standard `MultiSelectDropdown` to allow changing the request type while editing the form.
   - **Note:** If a request opened from the sidebar has any status other than 'Draft', the form is strictly **read-only** (`isReadOnly = true` in the `creditRequest` store) to prevent modification of submitted data.

## 2. Preventing Accidental Reverts
**DO NOT REMOVE THE DASHBOARD:** The `CustomerProfileDashboard.vue` is a critical intermediate step designed to give users financial context *before* they initiate a request. Reverting this to jump straight to the form bypasses vital business logic and UX design. Do not trigger the creation of a temporary draft ID immediately upon searching; this ID must only be created after the user explicitly selects a request type, preventing the database from filling with unused, blank drafts.

**DO NOT CHANGE HEADER LAYOUT:** The header layout is strictly "Search (Left) | Action (Right)".

*Note: This document serves as the absolute source of truth for the Create Credit Request UI behavior to prevent accidental reversions of this workflow.*

## 3. State Management and Navigation
To ensure the "Search First" pattern is preserved and no stale data persists across different application views, the `creditRequest` Pinia store MUST be explicitly reset when navigating to the Create Credit Request flow.

- **Component-Level Cleanup:** The `CreateCreditRequest.vue` view component enforces this by calling `store.resetState()` within its `onMounted` lifecycle hook.
- **Why it matters:** Other views, such as `/pending-requests`, share the global `creditRequest` store to display detailed customer data. If a user views a pending request and then navigates to `/create-credit-request`, the store would retain the pending request's ID and customer data, completely bypassing the "Initial State" search requirement and jumping straight into the "Form Mode" with incorrect context. The `onMounted` cleanup guarantees a clean slate.
