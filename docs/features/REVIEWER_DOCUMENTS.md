# Reviewer Documents Architecture

## 1. Context and Purpose
The "Reviewer Documents" feature allows approvers (e.g., Regional Managers, Sales Managers, Finance Officers, Credit Committee) to attach supplementary documents to a credit request *after* it has been submitted by the original creator.

To support this safely and transparently, the system tracks exactly **who** uploaded each document. This ensures that reviewers can only delete their own documents and that the history of attachments is clearly attributed to the correct actor in the workflow.

## 2. Backend Implementation (Data Tracking)

### Database Schema
The `CreditRequestAttachments` table (in both SQLite and MSSQL) includes an `uploaded_by` column.

- **Data Type:** `TEXT` (SQLite) / `NVARCHAR(255)` (MSSQL)
- **Constraint:** Nullable (`NULL` allowed) to maintain backward compatibility with documents uploaded before this feature existed.

### User Attribution Logic
When a file is uploaded to the `/api/credit-requests` endpoint (e.g., during creation, status updates, or revisions), the backend determines the identity of the uploader.

The `creditRequestController.createCreditRequest` method resolves the user's identity in the following strict priority order:
1.  **`req.user.empname`**: The actual employee name extracted from the authenticated user's JWT payload (e.g., "Test SmartCredit"). This is the preferred identifier as it provides human-readable attribution.
2.  **`req.user.username`**: The employee ID or username from the JWT payload (e.g., "68201"). Used if the `empname` is missing.
3.  **`req.body.actor_role`**: The functional role passed from the frontend form payload (e.g., "ผู้จัดการภาค"). Used as a final fallback if token information is unavailable (e.g., in legacy development modes).

This resolved value is then inserted directly into the `uploaded_by` column of the database.

### Request Revision Handling
When a rejected request is revised (generating a new `-R` transaction ID), the `reviseRequest` endpoint meticulously copies all existing attachment records. During this duplication, the `uploaded_by` field is carried over to the new records, preserving the historical attribution of previously attached documents.

## 3. Frontend Integration (Planned)

### State Management
When fetching a request's details (`/api/credit-requests/:id/detail`), the backend naturally returns the `uploaded_by` field within the `attachments` array. The frontend Pinia store (`useCreditRequestStore`) maps this field into the local `files` state.

### Component Architecture
A dedicated `ReviewerDocumentsSection.vue` component handles the display, upload, and deletion of these supplementary documents.

**Key Responsibilities:**
-   **Display:** Renders a list of attached reviewer documents, prominently displaying the `uploaded_by` name next to each file.
-   **Categorization:** Typically uses a specific prefix (e.g., `reviewer_doc:`) for the `file_type` to distinguish these files from standard application documents (like DBD financials or application forms).
-   **Access Control:** Computes a `canRemove` boolean for each file. A user is only permitted to delete a file if the current authenticated user matches the `uploaded_by` value of that file (or if they possess overriding administrative privileges).

### Submission Flow
When a reviewer clicks "Approve" or "Submit", the `ReviewerDocumentsSection` appends any newly added files to the main form payload. The backend processes these identically to standard uploads, automatically tagging them with the reviewer's identity.
