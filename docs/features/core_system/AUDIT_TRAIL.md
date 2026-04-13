# Audit Trail Architecture

## 1. Context and Purpose
The system implements a comprehensive Audit Trail to satisfy strict financial and credit compliance standards. It provides an immutable, chronological record of user actions and automated system processes.

The primary goals of the audit trail are to answer:
- **Who** created or modified data? (User accountability).
- **When** did the action occur? (Exact UTC timestamps).
- **How** was the data acquired? (Manual user upload vs. System automated fetch).

## 2. Core Transaction Tables (Credit Requests)
The primary transaction tables track ownership and modification history via specific tracking columns:

### `CreditRequests`
- **`created_at`** / **`updated_at`**: Tracks the timeline of the request.
- **`created_by`** / **`updated_by`**: Tracks the username (`req.user.username` or explicitly provided `uploaded_by` payload) of the person who initiated or last revised the credit request.

### `CreditRequestAttachments`
- **`uploaded_by`**: Tracks the original uploader of a specific transaction-bound file.
- **`updated_by`**: Tracks the user who last modified the file record (e.g., performing a soft deletion).
- **`is_deleted`**: Bit flag for soft-deletion (files are never physically deleted to maintain the audit record).

### `RequestComments`
- **`username`**: Tracks the explicit user identity associated with a comment or a system-generated audit log (e.g., "File deleted by User X").
- **`actor_role`**: Tracks the role context (Initiator, Approver, System) at the time of the action.

## 3. Customer-Level Documents (`CustomerDocuments`)
To satisfy the requirement of tracking financial documents that belong to a customer rather than a specific transaction (such as DBD Financial Profiles fetched automatically), the system uses the `CustomerDocuments` table.

### Schema and Purpose
This table sits outside the transaction (`tx_id`) constraints. When the system's background processes or scraper (`externalController`, `financialController`) successfully downloads a document directly from a government source:
1. The physical file is saved to the customer's directory.
2. A record is inserted into `CustomerDocuments`.
3. The **`uploaded_by`** column is explicitly set to **`SYSTEM_AUTO_FETCH`** (or the triggering user's identity).

This proves to auditors that the document was securely sourced by the system, unaltered by human intervention.

## 4. Implementation Rules
- **Backend Responsibility**: Controllers must extract the user's identity (`req.user.username` or equivalent) and pass it into the parameterized SQL queries during `INSERT` and `UPDATE` operations.
- **Timestamps**: All audit timestamps must use UTC (`GETUTCDATE()` in MSSQL, `CURRENT_TIMESTAMP` in SQLite) at the database level.
- **Immutability**: Once an audit log is created (like a comment or a file attachment), it should not be silently overwritten. Data corrections should result in new rows or explicit soft-deletes coupled with audit comments.
