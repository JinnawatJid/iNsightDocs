# Request Revision Feature

## Overview
The "Request Revision" feature allows Branch Managers (Makers) to easily revise a credit request that has been rejected by an Approver. Instead of starting from scratch and manually re-entering all data and re-uploading documents, the system duplicates the rejected request into a new "Draft" state, appending a revision suffix to the transaction ID.

This feature maintains a clean audit trail by keeping the original rejected request intact with its history, while streamlining the workflow for the Branch Manager.

## Workflow UI
1. **Trigger:** A request must be in the `Rejected` status.
2. **Access:** The Branch Manager (or any Initiator role such as Sales Representative or Credit Assistant) navigates to the request details (typically via the "ประวัติ" (History) tab in `/pending-requests`).
3. **Action:** At the bottom of the "บันทึกการพิจารณา" (Credit Review Section), a button labeled **"สร้างคำขอใหม่ (แก้ไข)"** (Create New Request (Revise)) is visible.
4. **Confirmation:** Clicking the button triggers a SweetAlert confirmation dialog explaining that a new draft will be created without the prior approval history.
5. **Redirection:** Upon confirmation and successful creation, the user is redirected to `/create-credit-request` with the new `-R` suffix transaction ID loaded and ready to edit.

## Backend Implementation Strategy (`POST /api/credit-requests/:id/revise`)

When the revise endpoint is called:

### 1. Verification
The backend verifies the requested ID exists and strictly checks that its status is `Rejected`.

### 2. ID Generation (`-R` suffix)
The system parses the existing Transaction ID.
- If it has no revision suffix (e.g., `01CA2310/001`), the new ID becomes `01CA2310/001-R1`.
- If it already has a revision suffix (e.g., `01CA2310/001-R1`), it parses the integer and increments it, resulting in `01CA2310/001-R2`.
- A safety check ensures the newly generated revision ID does not already exist in the database.

### 3. Data Duplication & Exclusions
A new record is inserted into the `CreditRequests` table with the following properties:
- **Copied Data:** `customer_no`, `customer_name`, `request_amount`, `request_reason`, `request_credit_term`, `term_gs`, `term_ae`, `term_yc`, `request_type`.
- **Status:** Hardcoded to `Draft`.
- **Snapshot Data (Form Fields):** The `snapshot_data` JSON string is parsed. To ensure a clean slate, approval comments (`review_comment`, `regional_review_comment`, `sales_review_comment`) are explicitly cleared (`""`). The cleaned object is re-stringified and saved.
- **Workflow Flags & Timestamps:** Fields like `is_approved`, `reviewed_by`, and `review_date` are explicitly set to `0` or `NULL` so the new draft begins fresh.

### 4. Physical Document Duplication
To save the user from re-uploading files, the system uses `fs-extra` to physically copy the entire document folder associated with the old Transaction ID to a new folder named after the new Revision ID.
- Example: `uploads/01CA2310_001` is copied to `uploads/01CA2310_001-R1`.

## Security & Access Control
- The UI button is protected by a computed property `showReviseButton` which verifies both the status (`Rejected`) and the user's role via the Pinia auth store getter `authStore.isInitiator`.
- **Note on Roles:** The system manages user roles as an array of objects (`authStore.user?.roles = [{ role: 'ผู้สร้างคำขอ (เครดิตใหม่/ปรับปรุง)' }]`). Authorization checks must use these centralized getters rather than explicit hardcoded string matches against a single `role` property.
- The backend API does not currently have RBAC middleware (per future security requirements), but enforces the `Rejected` status requirement before processing the duplicate action.
