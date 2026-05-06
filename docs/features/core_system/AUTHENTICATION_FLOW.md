# Authentication and Token Lifecycle Flow

## Overview

The Smart Credit Application utilizes a Single Sign-On (SSO) authentication strategy integrated with an external Exchange Platform (Central Portal Hub). Instead of managing user credentials locally, the application relies on the SSO provider to authenticate users and issue a JSON Web Token (JWT) via a browser cookie.

This document outlines the architecture for token ingestion, local state management, and the multi-step token lifecycle and logout sequence.

---

## 1. SSO Login and Token Ingestion

1. **Authentication Flow**: When a user navigates to the application unauthenticated, they are redirected to the Central Portal Hub login page (`http://192.192.0.37:53683/login`).
2. **Token Delivery**: Upon successful authentication at the Hub, the provider redirects the user back to the application, setting a JWT in an `HttpOnly` cookie named `token`.
3. **Frontend Ingestion (Updated for `HttpOnly` security)**:
   - Because the SSO provider sets the `token` cookie as `HttpOnly` for enhanced security (mitigating XSS risks), the Vue frontend cannot directly read it using JavaScript (`js-cookie`).
   - Instead, during initialization (`authStore.initAuth()`), the frontend makes a `GET` request to the local backend's `/api/auth/me` endpoint.
   - The browser automatically includes the `HttpOnly` cookie in this request.
   - The backend `authMiddleware` reads the cookie, decodes the token, and returns the user data (`userId`, `username`, `empname`, `roles`, `branchCode`) to the frontend.
   - This data is stored in the global Pinia `authStore` to govern UI state (e.g., displaying the user's name in the `Navbar.vue` and managing Role-Based UI visibility).

## 2. Protected Routes

1. **Frontend Router Guards**: The Vue Router uses global navigation guards to check the `authStore.isAuthenticated` state. If false, it redirects users to the Central Portal Hub login URL.
2. **Backend Middleware**: The Express backend protects internal API routes (like `/api/customers`, `/api/credit-requests`) using `authMiddleware.js`.
   - This middleware extracts the JWT from the `Authorization: Bearer` header or the `token` cookie.
   - It decodes the payload, verifies token expiration, and attaches the user data to the `req.user` object for subsequent controllers to use.

## 3. The Multi-Step Logout Lifecycle

Because the application relies on an external SSO session, logging out requires a coordinated multi-step process to ensure the user is completely logged out locally and at the provider level.

The logout sequence is triggered via the prominent "ออกจากระบบ" (Sign Out) button in the `Navbar.vue` and executes the following asynchronous steps in `src/stores/auth.js`:

1. **Clear Local Backend Session**:
   - A `POST` request is sent to the local backend `POST /api/auth/logout`.
   - The backend explicitly executes `res.clearCookie('token')` to destroy the local authentication cookie, ensuring subsequent API calls will fail.

2. **Terminate SSO Provider Session**:
   - A `POST` request is sent to the Central Portal Hub's external logout endpoint (`http://192.192.0.37:52683/auth/logout`).
   - This request is sent with `{ mode: 'no-cors', credentials: 'include' }` to ensure the session cookie is transmitted to the Identity Provider without being blocked by browser CORS read restrictions.

3. **Clear Local Frontend State**:
   - The Pinia store (`this.clearAuth()`) resets the `user` and `token` state to `null` and sets `isAuthenticated` to `false`.
   - The `js-cookie` library removes any remaining trace of the `token` cookie in the browser.

4. **Redirect**:
   - Finally, the user is redirected to the Central Portal Hub (`http://192.192.0.37:53683/hub`).

## 4. Role-Based Access Control (RBAC) & Contextual Logic

The application implements Frontend Role-Based Access Control (RBAC) driven by the roles embedded in the SSO JWT.

1. **Role Mapping**: The `src/stores/auth.js` Pinia store maps exact Thai strings from the JWT to computed getters (e.g., `isInitiator`, `isRegionalManager`, `isFinanceManager`).
   - For example, if a user has the role `ผู้สร้างคำขอ (เครดิตใหม่/ปรับปรุง)`, they are identified as an "Initiator" (Branch Manager).
2. **View-Based Access**: These getters control UI visibility across the application.
   - **Navigation**: The primary CTA in `Navbar.vue` dynamically displays "สร้างคำขอ" (Create Request) for Initiators, but "ค้นหาลูกค้า" (Search Customer) for other roles.
   - **Action Menus**: The "+ เพิ่มคำขอเครดิตใหม่" button on the `/create-credit-request` page is completely hidden from non-initiators to prevent unauthorized request creation.
    - **Dashboard Filtering**: In the `/pending-requests` dashboard, the `RequestSidebar.vue` uses role-aware filtering from workflow configuration:
       - Initiators track their non-final submitted requests (excluding `Draft`).
       - Regional Managers still see their actionable queue (e.g., `Opened`, with branch/region constraints).
       - Approver-chain roles (`ผู้พิจารณาฝ่ายขาย`, `ผู้ตรวจสอบเอกสาร`, `ผู้อนุมัติ (วงเงินต่ำกว่าเกณฑ์)`, `ผู้อนุมัติ (วงเงินสูงกว่าเกณฑ์)`) can see the broader non-final queue for monitoring.
       - Editability remains state-scoped: only requests in states where the user role appears in `actionableByRoles` are editable/approvable; all others are read-only.
3. **Dynamic Identifiers**: The `branchCode` payload from the JWT (`req.user.branchCode`) is actively used by the backend `creditRequestController.js` to dynamically generate localized Transaction IDs. Note that the year used in the Transaction ID follows the Buddhist Era (B.E.) format (e.g., `00TRCA6903/01` for the year 2569 / 2026). Also note that the running number is strictly 2 digits, allowing a maximum of 99 requests per month per branch.

## 5. Future Security Roadmap

As noted in `backend/server.js`, several backend security enhancements are deferred for future implementation to align with stricter industry standards:

- **JWT Signature Validation (JWKS)**: The backend `authMiddleware.js` should be updated to fetch the Identity Provider's public keys (JSON Web Key Set) to cryptographically verify the RS256 signature of incoming tokens, preventing token forgery.
- **Strict Cookie Security**: Partially implemented. The SSO provider now sets the `token` cookie with `HttpOnly` and `SameSite=Lax`. The local frontend has been updated to fetch user details securely via `/api/auth/me` rather than reading the cookie directly.
- **Backend API RBAC Enforcement**: While Frontend RBAC is implemented, backend routes should also implement a strict RBAC middleware to enforce authorization rules on API mutations (e.g., preventing a hijacked session from explicitly calling an approval endpoint if the user lacks the required `req.user.roles`).
