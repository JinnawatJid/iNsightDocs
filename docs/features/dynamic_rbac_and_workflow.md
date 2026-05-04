# Dynamic RBAC Matrix and Workflow State Machine

## 1. Overview and Purpose
Currently, the application relies on hardcoded role strings (e.g., `'ผู้สร้างคำขอ (เครดิตใหม่/ปรับปรุง)'`, `'ผู้ตรวจสอบเอกสาร'`) and implicit, static workflow progression. This document outlines a proposal to transition to an industry-standard **Dynamic Role-Based Access Control (RBAC)** paired with a **Workflow State Machine**.

This architecture will allow system administrators to dynamically define roles, assign specific granular permissions (abilities), and dictate the exact order and rules of the document approval workflow—all without requiring codebase changes or deployments.

This document serves as a proposal to be reviewed before implementation.

## 2. Core Concepts

### 2.1 Role-Based Access Control (RBAC) Matrix
Instead of checking if a user has a specific role to determine what they can see or do, the system checks if the user's assigned role possesses a specific *permission*.
*   **Role:** A grouping (e.g., 'Branch Manager', 'Credit Risk Analyst').
*   **Permission:** A specific action or access right (e.g., `can_edit_request`, `can_approve_credit`, `can_view_financial_secrets`).

### 2.2 Workflow State Machine
The lifecycle of a credit request (Draft -> Pending Review -> Pending Approval -> Approved) is defined as a directed graph.
*   **State:** The current status of the document.
*   **Transition:** The allowable movement from one State to another. Transitions are governed by rules (e.g., only a role with the `can_approve_credit` permission can trigger the transition from 'Pending Approval' to 'Approved').

## 3. Proposed Database Schema

To implement this dynamic behavior, new relational tables are required:

### 3.1 RBAC Schema
*   **`Roles` Table**
    *   `id` (PK)
    *   `role_name` (e.g., 'Initiator', 'Reviewer')
    *   `description`
*   **`Permissions` Table**
    *   `id` (PK)
    *   `permission_key` (e.g., `edit_request`, `view_sensitive_data`, `approve_document`)
    *   `category` (e.g., 'UI', 'Action', 'Data')
*   **`RolePermissions` Table (Mapping)**
    *   `role_id` (FK)
    *   `permission_id` (FK)

### 3.2 State Machine Schema
*   **`WorkflowStates` Table**
    *   `id` (PK)
    *   `state_name` (e.g., 'Draft', 'Pending Review', 'Approved')
    *   `is_terminal_state` (Boolean - indicates if the workflow ends here, e.g., 'Approved' or 'Rejected')
*   **`StateTransitions` Table**
    *   `id` (PK)
    *   `from_state_id` (FK)
    *   `to_state_id` (FK)
    *   `required_permission_id` (FK - The permission needed to trigger this transition)
    *   `auto_transition_condition` (Optional JSON/String - rules for straight-through processing, e.g., amounts < 10,000)

## 4. Proposed Backend Architecture

1.  **Permission Middleware:**
    *   Current hardcoded checks (e.g., `if (req.user.role === 'Admin')`) will be replaced by a dynamic permission middleware: `requirePermission('approve_document')`.
    *   On user login, the backend fetches the user's role and all associated permissions, attaching them to the JWT or session context.
2.  **Workflow Engine:**
    *   When an API request attempts to change a document's status, the backend queries the `StateTransitions` table to verify:
        *   Is the transition valid from the *current* state?
        *   Does the user have the `required_permission_id` for that transition?

## 5. Proposed UI Design Concept

This feature requires new administrative interfaces, separate from the standard Key-Value configurations.

### 5.1 Roles & Permissions Matrix UI
A grid interface where administrators can visually manage access:
*   **Rows:** List of all available Permissions (grouped by category).
*   **Columns:** List of all defined Roles.
*   **Cells:** Checkboxes to grant or revoke a permission for a specific role.

### 5.2 Workflow Builder UI
An interface to manage the State Machine:
*   Visual or table-based layout showing "Current Status" mapping to "Next Allowable Statuses".
*   Dropdowns to select which roles/permissions are required to execute the transition.

## 6. Implementation Scope and Effort
Implementing this architecture is a major structural change. It involves rewriting significant portions of the backend authorization logic and frontend rendering logic (conditionally showing buttons/tabs based on permissions rather than roles). It should be treated as a dedicated, large-scale feature phase.

**Current Interim Implementation:**
As of the current phase, an interim solution for both the **Roles & Permissions Matrix UI** and the **Workflow State Machine Builder UI** has been implemented on the System Configuration page (`/configuration`).

Instead of fully migrating to the relational database schema proposed above immediately, the system utilizes JSON configuration objects stored in the `Configurations` table:
*   `RBAC_MATRIX_CONFIG`: Allows administrators to visually toggle and save permissions for roles via the `RoleManagementTab.vue` component.
*   `WORKFLOW_CONFIG`: Allows administrators to define workflow states, types, actionable roles, and allowed transitions via an Expandable Accordion List in the `WorkflowManagementTab.vue` component. Both SQLite and MSSQL database seeds have been updated to ensure this configuration is initialized automatically on startup.

The next phase (Backend Enforcements & Full RBAC Middleware) is still pending, but significant progress has been made on the frontend:

### 6.1 Phase 1 (Completed): Frontend Workflow & Permissions Integration
The `WORKFLOW_CONFIG` and `RBAC_MATRIX_CONFIG` are now actively driving the frontend dashboard (`/pending-requests`) and UI visibility (e.g., NPL Toggles).
*   **Public Configuration APIs:** Two new endpoints (`GET /api/config/workflow` and `GET /api/config/rbac`) were created to allow all authenticated users (non-admins) to read the workflow configuration and their own permission mappings securely, without requiring full administrative access to all system configs.
*   **Dynamic Page Navigation & Routing:** The frontend router (`src/router/index.js`) and navigation bar (`Navbar.vue`) now read page-level permissions (e.g., `page:create-credit`, `page:system-configuration`) from the centralized `rbacStore` to dynamically restrict route access and toggle menu visibility based on the configured matrix.
*   **Dynamic Sidebar Visibility:** `RequestSidebar.vue` now uses the configured `actionableByRoles` from the state machine to determine which requests a user can see based on their roles.
*   **Dynamic Action Bar:** `WorkflowActionBar.vue` reads `allowedTransitions` from the configuration to render context-aware action buttons (e.g., Approve, Reject, Send to Committee) automatically.
*(Note: A few specific business rules, like the >300k approval threshold, remain hardcoded as safeguards).*

### 6.2 Phase 2 (Pending): Backend Middleware & RBAC
The system still needs to hook these JSON configurations into the backend middleware to fully enforce these dynamic permissions securely at the API level.