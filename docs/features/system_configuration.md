# System Configuration Page Design Document

## 1. Overview
The System Configuration Page (Admin Panel) is designed to allow administrators to manage global settings, business rules, and integration parameters without requiring code redeployments. This document outlines the scope, categories, and technical implementation approach based on industry standards.

*Note: For deep modifications to the Credit Scoring rules (factors, weights, and thresholds), the system provides a dedicated **"Scorecard Management"** UI. Please refer to `docs/specs/CREDIT_SCORING_CONFIG_GUIDE.md` for details on scorecard modification.*

## 2. Scope & Categories (What to Configure)
The configuration settings are logically grouped into categories. The UI will use a vertical tabbed interface (sidebar on the left, content on the right) to organize these.

### Categories
1. **System & General Settings**
   - **Data Freshness Limits:** e.g., `DBD_FILE_FRESHNESS_DAYS` (default 180 days).
   - **Data Retention:** Policies for temporary requests or logs.
2. **Workflow & Approval Rules**
   - **Approval Thresholds:** e.g., requiring senior approval for requests > 1,000,000 THB.
   - **SLA / Timeouts:** Overdue thresholds for pending requests.
3. **Business & Financial Rules**
   - **Scoring Parameters:** Weights used in financial analysis to calculate `finalGrade` or `recommendedLimit`.
   - **Risk Tolerance:** Score thresholds that trigger automatic rejection vs. manual review.
4. **Integrations & APIs**
   - **API Keys & Endpoints:** WSO2 API Gateway, OCR API, and DBD integrations.
   - **Timeouts & Retries:** Wait limits for external APIs.
5. **User & Role Management (Optional/Future)**
   - **Role Mapping:** Mapping SSO group claims to internal system roles.

## 3. Implementation Approach (How to Implement)

### 3.1 Database Schema (Backend)
A generic `Configurations` table will be created to store settings dynamically using a Key-Value structure.

**Schema Definition:**
- `config_key` (String, Primary Key / Unique) - e.g., `dbd_freshness_days`
- `config_value` (String/Text) - e.g., `180` (stored as string, casted based on `data_type`)
- `data_type` (String) - e.g., `number`, `string`, `boolean`
- `category` (String) - e.g., `System`, `API`, `Workflow`
- `description` (Text) - What this setting does.
- `label` (String) - Human-readable Thai label for the UI (e.g., "อายุไฟล์ข้อมูล DBD (วัน)").
- `updated_at` (Datetime) - UTC Timestamp for audit trail.
- `updated_by` (String) - Username for audit trail.

**Initial Seed Data:**
The system automatically seeds the following baseline configurations upon database initialization if they do not exist:
- `DBD_FILE_FRESHNESS_DAYS` (180, System, number)
- `AUDIT_LOG_RETENTION_DAYS` (14, System, number)
- `MAX_FILE_UPLOAD_SIZE_MB` (50, System, number)
- `SYSTEM_MAINTENANCE_MODE` (false, System, boolean)
- `DEFAULT_PAGE_SIZE` (20, System, number)
- `ENABLE_BATCH_PROCESSING` (true, System, boolean)
- `COMMITTEE_APPROVAL_THRESHOLD_THB` (300000, Workflow, number)

### 3.2 API Endpoints & Dynamic Reconfiguration (Backend)
- `GET /api/config`: Fetches all configurations, grouped by `category`.
- `PUT /api/config`: Accepts an array of modified configurations to perform bulk updates.
  - *Note on Dynamic Reconfiguration:* Certain system-level configurations (e.g., `AUDIT_LOG_RETENTION_DAYS` governing the Winston logger) are applied immediately during the `PUT` request via exposed utility functions (e.g., `logger.updateLogRetention`) to avoid requiring server restarts.

### 3.3 Frontend Architecture (Vue 3 + Pinia)
- **State:** A Pinia store (`src/stores/config.js`) will manage the configuration state.
- **Service:** Axios calls in `src/services/api/config.js`.
- **UI Component:** `src/views/SystemConfiguration.vue` using a vertical tabbed layout.
- **Form Controls:** Dynamically rendered based on `data_type` (toggles for booleans, numeric inputs, text fields, or masked inputs for secrets).
- **Feedback:** SweetAlert2 toasts for successful saves (non-disruptive).

### 3.4 Access Control (RBAC Implementation)
- **Backend Protection:** A dedicated `checkIsAdmin` middleware (`backend/middleware/checkIsAdmin.js`) parses the JWT/Mock role and guarantees that `GET` and `PUT` endpoints (`/api/config`) are restricted to users with the `"ผู้ดูแลระบบ"` role.
- **Frontend Router Guard:** A global `beforeEach` navigation guard in `src/router/index.js` intercepts access to the `/configuration` route and redirects non-admins.
- **UI Visibility:** The `Navbar.vue` conditionally renders the navigation link based on the `authStore.isAdmin` computed property.
