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

3. **Form Mode (Action State)**:
   - Triggered when `isRequestStarted = true` (after selecting a type from the popover or clicking a previous request from the history sidebar via the `@request-selected` event).
   - The `CustomerProfileDashboard` is hidden, and the `CreditRequestForm` is displayed.
   - The Action area transforms into a standard `MultiSelectDropdown` to allow changing the request type while editing the form.
   - **Note:** If a request opened from the sidebar has any status other than 'Draft', the form is strictly **read-only** (`isReadOnly = true` in the `creditRequest` store) to prevent modification of submitted data.

## 2. Preventing Accidental Reverts
**DO NOT REMOVE THE DASHBOARD:** The `CustomerProfileDashboard.vue` is a critical intermediate step designed to give users financial context *before* they initiate a request. Reverting this to jump straight to the form bypasses vital business logic and UX design. Do not use global watchers on `store.requestId` to automatically set `isRequestStarted = true`, as this will skip the dashboard when a background search auto-populates the draft ID.

**DO NOT CHANGE HEADER LAYOUT:** The header layout is strictly "Search (Left) | Action (Right)".

*Note: This document serves as the absolute source of truth for the Create Credit Request UI behavior to prevent accidental reversions of this workflow.*
