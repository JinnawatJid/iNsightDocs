# Create Credit Request Flow & UI Rules

## 1. Core Workflow ("Search First" Pattern)
The `CreateCreditRequest` feature STRICTLY enforces a **"Search First"** pattern. This means users cannot select a credit request type or view the application form until a customer is successfully searched and validated.

### The 3 States of the UI:
1. **Initial State (Before Search)**:
   - The Search input is active on the left.
   - The Action area (Request Type) on the right displays a **disabled placeholder** (`กรุณาค้นหาลูกค้าก่อน...`).
   - The main content area shows a generic search prompt.
   - **Single Customer View (SCV) Enforcement:** When a user searches for a customer, the system queries the external API using the customer's 13-digit VAT Registration Number (`vatNo`). If another branch account with the same VAT ID already has an active credit limit (`Fixed Credit Limit > 0`), the UI displays a SweetAlert2 warning ("พบข้อมูลเครดิตเดิม") and automatically redirects the search context to the account holding the credit line. This prevents "limit stacking" across multiple duplicate accounts.
   - **Auto Carry-over:** If the customer has a previously approved request, the system automatically fetches its `snapshot_data` and file attachments. The store merges this data (contact person, billing info, documents) into the current form context and notifies the user via a SweetAlert banner. This behavior is toggleable via the `FEATURE_AUTO_CARRYOVER` backend environment variable.

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

- **Multiple Selections Precedence:** When a user selects multiple request types, the system enforces a strict hierarchy for the `amount` field behavior. **"Credit Increase" (เครดิตเพิ่ม)** takes absolute precedence. If it is selected, the field will always be labeled "ต้องการวงเงินเพิ่ม" and remain editable, regardless of other selections.
- **Change Term (เปลี่ยนแปลงระยะเวลาเครดิต) & Change Payment Conditions (เปลี่ยนแปลงเงื่อนไขการชำระเงิน) [Standalone]:**
  - **UI Display:** If these are selected *without* "Credit Increase", the "Requested Amount" (`amount`) field is re-labeled as "วงเงินปัจจุบัน (บาท)" (Current Limit). The input field becomes read-only and displays the customer's actual `current_credit_limit` instead of requiring new user input.
  - **Validation Logic:** Because these standalone request types do not involve requesting a new credit amount, the `amount` field is explicitly skipped during validation, ensuring submission is not blocked by a missing amount value. However, all other fields visually marked with a red asterisk in the UI (such as business type, address details, and store value/rent) remain strictly validated.

- **Strict Alignment of UI and Validation:** For special requests like "Credit Increase" (เครดิตเพิ่ม), "Change Term" (เปลี่ยนแปลงระยะเวลาเครดิต), and "Change Payment Conditions" (เปลี่ยนแปลงเงื่อนไขการชำระเงิน), the system does not filter or reduce the required field list. Every field that appears with a red asterisk in the UI must pass validation upon form submission.

## 5. Credit Increase Summaries
- **Confirmation Modal Logic:** For "Credit Increase" (เครดิตเพิ่ม) requests, when the user submits or approves the form, a Change Summary confirmation modal is presented. The "New Limit" (วงเงินใหม่ที่ต้องการ) displayed in this modal must be calculated as the sum of the customer's current credit limit (`store.customer.current_credit_limit`) and the explicitly requested additional amount (`store.transactionData.amount`). The modal must not display only the requested amount, as that would misrepresent the final total credit line.

## 6. Credit History Display
- **Sidebar Presentation:** When a customer has previous credit history, their past requests are displayed in the `CreditHistorySidebar.vue`.
- **UI Guidelines:**
  - The **Transaction ID** (`txId`) serves as the primary identifier for each history item and must be displayed prominently (e.g., bolded).
  - The **Requested Credit Limit** (`requestAmount`) must be displayed immediately below the Transaction ID to provide quick financial context. This value must be properly formatted as currency (e.g., `300,000.00 บาท`).
- **Data Mapping:** The backend `/api/customers/search` endpoint (`enrichCustomerData`) handles the mapping of historical data from the `CreditRequests` table, specifically mapping `h.tx_id` to `txId` and `h.request_amount` to `requestAmount` to avoid ambiguous variable names like `amount`.

## 7. Draft Finalization and Folder Collision Safeguard
- **Draft -> Opened TxID Finalization:** When a Draft is submitted and receives a real transaction ID, the backend also renames the upload folder from the temporary ID (`TMP-*`) to the finalized transaction ID format.
- **Collision Scenario:** If database rows were manually deleted in the past but upload folders were left on disk, the destination folder for the new transaction ID may already exist.
- **Safeguard:** The backend finalization logic now skips colliding transaction running numbers and selects the next available folder/transaction ID, preventing `dest already exists` failures during submission.

## 8. Reviewer Workflow & Draft Comments
When a request is processed by a reviewer in the `/pending-requests` view, they can write comments regarding the approval or rejection.
- **Dual-Save Architecture for Draft Comments:** To prevent data loss while maintaining high UI performance, draft comments utilize a dual-save strategy:
  1. **Instant Local Storage:** As the reviewer types, the comment is instantly saved to the browser's `LocalStorage` (keyed by `draftComment_${requestId}`), keeping the UI responsive without network latency.
  2. **Debounced Database Sync:** After 1 second of inactivity, the UI silently fires a background request to a dedicated backend endpoint (`/api/credit-requests/:id/draft-comment`). This saves the comment directly into the `snapshot_data.transaction_data.draftComment` JSON structure. This dedicated endpoint explicitly bypasses the standard full-form save route to avoid `409 Conflict` concurrency errors.
- **Hydration:** When a request is loaded or refreshed, the frontend Pinia store extracts the `draftComment` from the database snapshot and hydrates the state, ensuring the comment survives across devices and page reloads.
- **Clearing Drafts:** Once a formal workflow action (e.g., Approve, Reject, Send to Committee) is successfully processed, the draft is wiped from both the backend database and the browser's LocalStorage.

## 9. Review Dashboard UI & Document Status
When a reviewer views a request via the `ReviewDashboard.vue` component, the system dynamically renders the uploaded documents.
- **2-Column Layout:** The document status list strictly enforces a clean 2-column horizontal bulleted layout (without legacy SVG icons or toggle buttons) for improved readability.
- **Document Filtering & Display:** The main document list dynamically aggregates all attached documents (combining both mandatory system files and custom user-uploaded `other_` documents). It explicitly filters out the standard DBD financial documents (`company_profile_doc`, `balance_sheet_doc`, etc.), as those are rendered separately in a dedicated financial analysis section lower on the page.

## 10. Financial Submit Guard (Analyze Button Requirement)
- Before any forward workflow action (Submit/Approve), the form validation must confirm that **"วิเคราะห์และคำนวณคะแนน"** was clicked at least once for the current financial input set.
- This enforcement applies to both individual and company customers.
- If `noFinancialData` is explicitly selected, this specific analyze requirement is skipped.
- If missing, validation returns `score_calculation` and the UI must:
  - include this item in the grouped missing-field SweetAlert
  - show the inline red helper text under the analyze button only after the failed submit attempt

## 11. Action Buttons Behavior Across Tabs
- In `/create-credit-request`, the **Save Draft** action must be visible at the bottom of **every tab** while the form is editable (non-readonly).
- Forward workflow actions (for example Submit/Approve) remain visible only on the final step where workflow progression is intended.
- For non-final steps, the **Next** button is used for tab navigation.
- This rule prevents users from being forced to navigate to the final tab just to save partial progress.

## 12. Read-Only Full Details Snapshot
- When users click "ดูรายละเอียดข้อมูลลูกค้าแบบเต็ม" (View Full Details), the `ApplicationTabs` component receives a frozen `baseline` snapshot of the original request and a `readOnly=true` prop.
- **Enforcement:** Components like `RequestInfoTab.vue` must explicitly evaluate `props.readOnly` to immediately return `false` for computed edit states (e.g., `canEditAmount`, `canEditTerms`). This guarantees that the UI bypasses live transaction modifications and accurately renders the immutable baseline data regardless of the active reviewer's role (such as Area Managers or Finance Officers).
