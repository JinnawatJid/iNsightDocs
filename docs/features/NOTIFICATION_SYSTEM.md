# Notification System

The Notification System is designed to provide real-time-like alerts to users regarding the status and workflow progression of Credit Requests.

## Overview
The system utilizes a **Notification Bell** in the top navigation bar. When new actionable items or status updates occur, a red badge appears indicating the number of unread notifications. Users can click the bell to view a dropdown list of recent notifications, and clicking a specific notification redirects them to the relevant request.

## Architecture & Constraints
Because the application operates within an **air-gapped environment** (an internal enterprise network with restricted or no internet access), traditional real-time push technologies like WebSockets or third-party push notification services were avoided to keep the infrastructure simple and resilient.

Instead, the system uses **Short Polling**:
1.  **Frontend Store:** The Pinia `notificationStore` initiates a background `setInterval` loop that fetches `GET /api/notifications` every 30 seconds.
2.  **Lifecycle:** The polling starts when the user logs in (or the `Navbar` mounts) and stops upon logout or component unmount to prevent memory leaks.

## Database Schema & State Tracking
Notifications are persisted in the backend database (supporting both SQLite and MSSQL).

To support role-based notifications without creating complex many-to-many junction tables, the `Notifications` table utilizes a `read_by` column:

| Column | Type | Description |
| :--- | :--- | :--- |
| `id` | Integer / PK | Unique identifier |
| `tx_id` | String | The transaction ID (e.g., `TMP-123`) associated with the alert |
| `target_role` | String | (Optional) The specific role that should see this notification |
| `target_username` | String | (Optional) A specific user that should see this notification |
| `message` | String | The notification text |
| `is_read` | Boolean/Int | Legacy flag / fallback |
| `read_by` | String | A comma-separated list of usernames who have clicked/read this notification. |
| `created_at` | Timestamp | When the notification was generated |

**Why `read_by`?**
When a notification is sent to a group (e.g., `target_role: 'ผู้พิจารณาฝ่ายขาย'`), multiple users will receive it. If tracking relied on a simple boolean `is_read`, the first user to click the bell would clear the notification for *everyone* else in that role. By storing a comma-separated list of usernames in `read_by`, the backend can calculate the read state dynamically per-user.

## Notification Triggers
Notifications are automatically generated via hooks in `backend/controllers/creditRequestController.js` during the `updateCreditRequestStatus` flow.

There are two primary types of notifications generated upon a status change:

### 1. Workflow Action Alerts (Next Approver)
When a request advances to a new status, a notification is sent to the **Role** responsible for the next step.
*   `Opened` -> Notifies `ผู้พิจารณาของพื้นที่`
*   `RegionalSubmitted` -> Notifies `ผู้พิจารณาฝ่ายขาย`
*   `SalesSubmitted` -> Notifies `ผู้ตรวจสอบเอกสาร`
*   `FinanceReviewed` -> Notifies `ผู้อนุมัติ (วงเงินต่ำกว่าเกณฑ์)` (Displayed as `ผู้จัดการฝ่ายการเงิน`)
*   `Reviewed` -> Notifies `ผู้อนุมัติ (วงเงินสูงกว่าเกณฑ์)` (Displayed as `กรรมการเครดิต`)

The cutover between lower/higher approval routing is controlled by `COMMITTEE_APPROVAL_THRESHOLD_THB` in System Configuration (default `300000`).

### 2. Initiator Status Updates
To keep the original creator of the request informed, the system **always** sends a direct notification (via `target_username`) to the `created_by` user whenever the request changes status.

*Exception:* The system checks `req.user.username` against `created_by`. If the initiator is the one currently making the change (e.g., they just drafted and opened the request themselves), the update notification is skipped to prevent spamming the user with their own actions.
*(Note: During local testing with `ENABLE_AUTH=false`, the 'DEV_MODE_USER' bypasses this rule to allow for end-to-end testing across roles).*

## Frontend Implementation Details
*   **Component:** `src/components/shared/Navbar.vue`
*   **UI Alignment:** The `.dropdown-body` is explicitly set to `text-align: left` to ensure readability of Thai text, while the empty state ("ไม่มีการแจ้งเตือน") remains centered.
*   **Event Handling:** The `@click.stop` modifier is used on notification items to prevent event bubbling, which would otherwise immediately toggle the dropdown closed and then open again.
