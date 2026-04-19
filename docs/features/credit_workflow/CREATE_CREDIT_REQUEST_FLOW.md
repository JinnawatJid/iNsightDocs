# Create Credit Request Flow & UI Rules

## 1. Core Workflow ("Search First" Pattern)
The `CreateCreditRequest` feature STRICTLY enforces a **"Search First"** pattern. This means users cannot select a credit request type or view the application form until a customer is successfully searched and validated.

### The 3 States of the UI:
1. **Initial State (Before Search)**:
   - The Search input is active on the left.
   - The Action area (Request Type) on the right displays a **disabled placeholder** (`กรุณาค้นหาลูกค้าก่อน...`).
   - The main content area shows a generic search prompt.
   - **Single Customer View (SCV) Enforcement:** When a user searches for a customer, the system queries the external API using the customer's 13-digit VAT Registration Number (`vatNo`). If another branch account with the same VAT ID already has an active credit limit (`Fixed Credit Limit > 0`), the UI displays a SweetAlert2 warning ("พบข้อมูลเครดิตเดิม") and automatically redirects the search context to the account holding the credit line. This prevents "limit stacking" across multiple duplicate accounts.

2. **Context Mode (Dashboard State)**:
   - Triggered when `store.hasSearched = true` AND `!isRequestStarted`.
   - The `CustomerProfileDashboard` is displayed, giving the user context about the customer's current limits, terms, and history.
   - The Action area transforms into a `+ เพิ่มคำขอเครดิตใหม่` (Start New Request) button. Clicking this opens a popover menu to select the specific request type (New, Increase, Change Terms, etc.).
   - Options in the popover are dynamically disabled based on the customer's current credit limit (e.g., cannot request "New Credit" if they already have an existing limit). However, "Project Credit" requests bypass this rule and can be initiated regardless of whether the customer has an existing credit limit, provided the global Project Credit feature flag is enabled.
   - **Important:** At this stage, a temporary Draft Request ID (`store.requestId`) has **not** been generated yet. It is explicitly deferred until the user makes a selection.

3. **Form Mode (Action State)**:
   - Triggered when `isRequestStarted = true` (after selecting a type from the popover or clicking a previous request from the history sidebar via the `@request-selected` event).
   - Upon selecting a request type from the popover (e.g., "เครดิตใหม่"), the system **finally generates the temporary Draft Request ID** and saves the initial transaction data.
   - The `CustomerProfileDashboard` is hidden, and the `CreditRequestForm` is displayed.
   - The Action area transforms into a standard `MultiSelectDropdown` to allow changing the request type while editing the form.
   - **Note:** The `isReadOnly` state in the `creditRequest` store enforces strict access control:
     - If the status is *anything other than 'Draft'*, the form is strictly read-only for general editing.
     - If the status *is 'Draft'*, the form remains strictly read-only for everyone **except** the Initiator (`ผู้สร้างคำขอ`) to prevent unauthorized users from editing or accidentally submitting requests on behalf of the creator.

## 2. Preventing Accidental Reverts
**DO NOT REMOVE THE DASHBOARD:** The `CustomerProfileDashboard.vue` is a critical intermediate step designed to give users financial context *before* they initiate a request. Reverting this to jump straight to the form bypasses vital business logic and UX design. Do not trigger the creation of a temporary draft ID immediately upon searching; this ID must only be created after the user explicitly selects a request type, preventing the database from filling with unused, blank drafts.

**DO NOT CHANGE HEADER LAYOUT:** The header layout is strictly "Search (Left) | Action (Right)".

*Note: This document serves as the absolute source of truth for the Create Credit Request UI behavior to prevent accidental reversions of this workflow.*

## 3. State Management and Navigation
To ensure the "Search First" pattern is preserved and no stale data persists across different application views, the `creditRequest` Pinia store MUST be explicitly reset when navigating to the Create Credit Request flow.

- **Component-Level Cleanup:** The `CreateCreditRequest.vue` view component enforces this by calling `store.resetState()` within its `onMounted` lifecycle hook.
- **Why it matters:** Other views, such as `/pending-requests`, share the global `creditRequest` store to display detailed customer data. If a user views a pending request and then navigates to `/create-credit-request`, the store would retain the pending request's ID and customer data, completely bypassing the "Initial State" search requirement and jumping straight into the "Form Mode" with incorrect context. The `onMounted` cleanup guarantees a clean slate.

## 4. Request Type Business Logic
Specific request types trigger dynamic UI and validation behavior in the `CreditRequestForm` (specifically within `RequestInfoTab.vue`):

- **Change Term (เปลี่ยนแปลงระยะเวลาเครดิต) & Change Payment Conditions (เปลี่ยนแปลงเงื่อนไขการชำระเงิน):**
  - **UI Display:** The "Requested Amount" (`amount`) field is re-labeled as "วงเงินปัจจุบัน (บาท)" (Current Limit). The input field becomes read-only and displays the customer's actual `current_credit_limit` instead of requiring new user input.
  - **Validation Logic:** Because these request types do not involve requesting a new credit amount, the `amount` field is explicitly skipped during the `validateRequest` process in the Pinia store (`src/stores/creditRequest.js`), ensuring that submission is not blocked by a missing amount value.

## 5. Credit Increase Summaries
- **Confirmation Modal Logic:** For "Credit Increase" (เครดิตเพิ่ม) requests, when the user submits or approves the form, a Change Summary confirmation modal is presented. The "New Limit" (วงเงินใหม่ที่ต้องการ) displayed in this modal must be calculated as the sum of the customer's current credit limit (`store.customer.current_credit_limit`) and the explicitly requested additional amount (`store.transactionData.amount`). The modal must not display only the requested amount, as that would misrepresent the final total credit line.

## 6. Credit History Display
- **Sidebar Presentation:** When a customer has previous credit history, their past requests are displayed in the `CreditHistorySidebar.vue`.
- **UI Guidelines:**
  - The **Transaction ID** (`txId`) serves as the primary identifier for each history item and must be displayed prominently (e.g., bolded).
  - The **Requested Credit Limit** (`requestAmount`) must be displayed immediately below the Transaction ID to provide quick financial context. This value must be properly formatted as currency (e.g., `300,000.00 บาท`).
- **Data Mapping:** The backend `/api/customers/search` endpoint (`enrichCustomerData`) handles the mapping of historical data from the `CreditRequests` table, specifically mapping `h.tx_id` to `txId` and `h.request_amount` to `requestAmount` to avoid ambiguous variable names like `amount`.
