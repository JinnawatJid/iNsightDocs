# Proposal: Audit-Trail Baseline Next Steps

Date: 2026-05-08
Author: Jules (Assistant)

This document outlines the proposed implementation plan for the "Next steps / Recommendations" identified in the `AUDIT-TRAIL-BASELINE-INVESTIGATION.md` to establish a more robust, server-trusted baseline for credit request auditing.

## 1. Backend: Immutable `original_snapshot` Field

**Goal:** Establish an immutable server-side record of the initiator's exact original request to replace the current client-side `localStorage` mitigation and prevent subsequent reviewer edits from polluting the baseline.

**Implementation Steps:**

1. **Database Schema Update:**
   - Add a new `JSON` column (or text column, depending on the DBMS, e.g., MSSQL `NVARCHAR(MAX)` or Postgres `JSONB`) named `original_snapshot` to the `CreditRequests` table.
   - Example SQL (MSSQL): `ALTER TABLE CreditRequests ADD original_snapshot NVARCHAR(MAX) NULL;`
   - Example SQL (SQLite): `ALTER TABLE CreditRequests ADD COLUMN original_snapshot TEXT;`

2. **Backend Controller Updates (`backend/controllers/creditRequestController.js`):**
   - **`createCreditRequest` (Creation):** When a new request is created (i.e., transitioning to 'Draft' or when initially saving a new request), populate the `original_snapshot` column with the same JSON data currently passed as `snapshot_data`.
   - **`createCreditRequest` (Update):** Crucially, when an existing request is updated (e.g., by reviewers or subsequent saves), **do not overwrite** the `original_snapshot` column. It should only be written once upon the initial transition out of 'Draft' status (or initially created if skipping draft).
   - **`getCreditRequestDetail` / `getCreditRequests`:** Ensure the `original_snapshot` field is returned in the API responses alongside the standard `snapshot_data`.

3. **Revise Flow Updates:**
   - In `reviseRequest`, when a new draft is created from a rejected request, the `original_snapshot` of the *new* draft should be populated with the *restored* original values (stripping the reviewer comments, as is currently done for `snapshot_data`).

## 2. Tests: Unit Tests for Store Immutability

**Goal:** Prevent regressions by ensuring that the Pinia store correctly preserves the original baseline data and does not overwrite it when receiving subsequent backend responses.

**Implementation Steps:**

1. **Test Environment Setup:** Utilize the existing testing framework (e.g., Vitest or Jest, checking `package.json` for current configuration) and Pinia testing utilities (`@pinia/testing`).
2. **Create Test File (`src/stores/creditRequest.test.js` or similar):**
3. **Test Cases:**
   - **Initial Load:** Mock an API response for `getCreditRequestDetail` containing `originalRequestedAmount` and `originalTransactionData`. Verify that the store's state correctly adopts these values.
   - **Immutability on Update:** Mock a subsequent call to `createCreditRequest` (simulating a save action). Return a response payload where `request_amount` differs from `originalRequestedAmount`. Verify that `store.originalRequestedAmount` and `store.originalTransactionData` remain unchanged.
   - **Local Storage Interaction:** Verify that `persistOriginalSnapshot` correctly serializes data to `localStorage` and `loadPersistedOriginalSnapshot` correctly deserializes it.
   - **State Reset:** Ensure that navigating away or calling `resetState()` clears the `originalTransactionData` and removes the specific `localStorage` key.

## 3. Code Cleanup: Removal of Redundant Client-Side Fallbacks

**Goal:** Simplify the frontend codebase by removing complex client-side workarounds once the server-side `original_snapshot` is in place.

**Implementation Steps:**

1. **Deprecate `localStorage` Fallback:** Remove `persistOriginalSnapshot`, `loadPersistedOriginalSnapshot`, and `clearPersistedOriginalSnapshot` from `src/stores/creditRequest.js`.
2. **Streamline `loadRequestDetail`:** Modify the logic to strictly read from `response.data.original_snapshot` (provided by the backend) to populate `store.originalRequestedAmount`, `store.originalRequestedTerms`, and `store.originalTransactionData`. Remove the complex `else if` chains trying to parse deeply nested structures.
3. **Simplify `WorkflowActionBar.vue` Audit Logic:** Update `generateAuditTrailMessage` to directly compare current values against `store.originalTransactionData` (populated from the reliable backend field). The complex comment-parsing fallback (`extractLastAmountFromComments`) should only be kept temporarily for legacy data migration, and eventually removed.

## 4. UX: "Viewing Original Snapshot" Badge

**Goal:** Provide clear visual feedback to users (approvers) when they are viewing the read-only, original snapshot data in the Full Details view, distinguishing it from live, editable data.

**Implementation Steps:**

1. **`ReviewDashboard.vue` Updates:**
   - When `showFullDetails` is active (i.e., the user clicks "ดูรายละเอียดข้อมูลลูกค้าแบบเต็ม"), add a prominent UI badge or banner at the top of the `ApplicationTabs` component.
   - Example Badge HTML:
     ```html
     <div class="snapshot-banner bg-blue-50 border-l-4 border-blue-500 p-4 mb-4">
       <div class="flex">
         <div class="flex-shrink-0">
           <!-- Icon -->
         </div>
         <div class="ml-3">
           <p class="text-sm text-blue-700">
             คุณกำลังดู <strong>ข้อมูลต้นฉบับ (Original Snapshot)</strong> ที่ผู้ขอเริ่มต้นระบุไว้ ข้อมูลที่ถูกแก้ไขระหว่างกระบวนการอนุมัติจะไม่แสดงในหน้านี้
           </p>
         </div>
       </div>
     </div>
     ```
2. **Component Prop Passing:** Ensure the `baselineSnapshot` prop passed to `ApplicationTabs` continues to reliably freeze the read-only view. The presence of this banner will reassure users that the frozen state is intentional.
