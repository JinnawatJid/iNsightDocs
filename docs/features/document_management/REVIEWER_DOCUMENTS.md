# Reviewer & Additional Documents Architecture

## 1. Context and Purpose
The "Additional Documents" (formerly Reviewer Documents) feature allows Initiators and Approvers (e.g., Regional Managers, Sales Managers, Finance Officers, Credit Committee) to attach supplementary documents to a credit request *after* it has been submitted (in statuses beyond Draft).

To support this safely and transparently, the system tracks exactly **who** uploaded each document. It implements an append-only audit trail methodology where files can be "soft-deleted" but never truly erased from the database history.

## 2. Feature Toggle (Environment Flag)
The visibility of this feature is controlled globally via an environment variable.
- **Backend:** `ENABLE_ADDITIONAL_DOCUMENTS=true` in the `.env` file.
- **API Exposure:** The backend exposes this flag via the `/api/config/auth` endpoint.
- **Frontend State:** The `authStore` fetches and stores this flag as `additionalDocumentsEnabled`. The `ReviewerDocumentsSection.vue` component will only render if this flag is true.

## 3. Backend Implementation

### Database Schema
The `CreditRequestAttachments` table includes:
- **`uploaded_by`**: `TEXT` (SQLite) / `NVARCHAR(255)` (MSSQL) - Tracks the user who uploaded the file.
- **`is_deleted`**: `INTEGER` (SQLite) / `BIT` (MSSQL) - A flag used for soft-deleting files. Defaults to 0/NULL.

### Soft-Delete & Audit Trail
When a user "deletes" an additional document:
1.  **Verification:** The backend endpoint (`DELETE /api/credit-requests/:id/additional-documents/:fileId`) checks that the user deleting the file is the **original uploader** (via `req.user.empname` or `req.user.username`). High-role bypass (e.g., "กรรมการเครดิต") has been removed from the normal delete flow. For exceptional admin overrides, use a separate explicit admin flow that requires justification and creates a dedicated audit record.
2.  **Soft Delete:** The database record is updated to `is_deleted = 1` rather than being dropped. Main queries exclude records where `is_deleted = 1`.
3.  **Audit Log:** An automated system comment is inserted into the `RequestComments` table (e.g., "เอกสาร [Filename] ถูกลบโดย [Username]").
4.  **Physical Deletion:** A best-effort `fs.unlinkSync` removes the physical file from the disk to save space. If physical deletion fails, the soft-delete still applies.

### File Naming & Extension Fallbacks
Users can provide custom "Document Names" (descriptions) for uploaded files. To ensure document previews (`DocumentPreviewModal.vue`) function correctly:
-   **Upload Phase:** The backend checks if the custom name provided by the user includes an extension. If it does not, it securely extracts the extension using `path.extname` and appends it to the `original_name` before saving to the database.
-   **Preview Fallback:** For legacy documents saved without extensions, the frontend `ReviewerDocumentsSection.vue` maps the `file_path` from the store. When previewing, it falls back to parsing the extension from `file_path` if the `original_name` is missing one.

### File Storage Paths
When storing file paths in `CreditRequestAttachments`, the `file_path` is normalized relative to the base upload directory.
-   **Format:** `[Customer_No]/[YYYYMMDD]/[secure_filename.ext]`
-   **Crucial Rule:** The path *must not* be manually prepended with a `customers/` string in the DB, as the download API (`downloadCreditRequestFile`) already targets the correct root. Prefixing it causes 404 errors during downloads. (A backward-compatibility check exists in the download API to strip `customers/` if encountered).

## 4. Frontend Integration

### State Management
When fetching a request's details (`/api/credit-requests/:id/detail`), the backend returns the `uploaded_by`, `created_at`, `file_path`, and `original_name` fields within the `attachments` array. The frontend Pinia store (`useCreditRequestStore`) explicitly maps these fields into the local `files` state.

### Component Architecture
The dedicated `ReviewerDocumentsSection.vue` component handles the display, upload, and deletion of these supplementary documents.

**Key Responsibilities:**
-   **Upload Flow:** Utilizes a `SweetAlert2` modal prompting for a mandatory "Document Name" and file selection.
-   **Display:** Renders a list of attached documents using a left-aligned card layout. Displays the custom name, original physical filename, upload date, and the uploader's initials/name.
-   **Preview:** Triggers the native `DocumentPreviewModal.vue` inline using the injected `openPreviewModal` function, ensuring URLs are safely URI encoded (`encodeURIComponent(txId)`).
-   **Access Control:** Computes a `canDelete` boolean. A user is only permitted to delete a file if they are the **original uploader**. Initiators and approvers can both upload, provided the request is not in a 'Draft' state.

## Change log / Notes

- 2026-05-06: Enforced uploader-only deletion in both frontend and backend. Branch: `feature/restrict-delete-uploader`. Commit: "Restrict additional-document deletion to original uploader (frontend + backend)".

	- Rationale: Align with product requirement that "คนแนบเอกสารควรสามารถลบได้แค่คนเดียว" (only the uploader can delete attachments). High-role deletion was removed from the normal delete endpoint to avoid accidental or unauthorized removals; admins should use a separate, auditable override process.
