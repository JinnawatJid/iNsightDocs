# Authentication and Token Lifecycle Flow

## Overview

The Smart Credit Application utilizes a Single Sign-On (SSO) authentication strategy integrated with an external Exchange Platform (Central Portal Hub). Instead of managing user credentials locally, the application relies on the SSO provider to authenticate users and issue a JSON Web Token (JWT) via a browser cookie.

This document outlines the architecture for token ingestion, local state management, and the multi-step token lifecycle and logout sequence.

---

## 1. SSO Login and Token Ingestion

1. **Authentication Flow**: When a user navigates to the application unauthenticated, they are redirected to the Central Portal Hub login page (`http://192.192.0.37:53683/login`).
2. **Token Delivery**: Upon successful authentication at the Hub, the provider redirects the user back to the application, setting a JWT in a cookie named `token`.
3. **Frontend Ingestion**:
   - The Vue frontend (`src/stores/auth.js`) reads the `token` cookie.
   - Using the `jwt-decode` library, it extracts the `userId`, `username`, `roles`, and `branchCode` payloads directly from the token without validating the RS256 signature (as this is currently handled implicitly by the trusted environment, though validation is planned for the future).
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

## 4. Future Security Roadmap

As noted in `backend/server.js`, several security enhancements are deferred for future implementation to align with stricter industry standards:

- **JWT Signature Validation (JWKS)**: The backend `authMiddleware.js` should be updated to fetch the Identity Provider's public keys (JSON Web Key Set) to cryptographically verify the RS256 signature of incoming tokens, preventing token forgery.
- **Strict Cookie Security**: The backend should enforce `HttpOnly`, `Secure`, and `SameSite` flags when setting the auth token cookie to mitigate Cross-Site Scripting (XSS) and Cross-Site Request Forgery (CSRF) vulnerabilities. This will require the frontend to fetch user details via a secure `/api/auth/me` endpoint rather than reading the cookie directly via JavaScript.
- **Role-Based Access Control (RBAC)**: Backend routes should implement an RBAC middleware to strictly enforce authorization rules based on the `req.user.roles` and `req.user.branchCode` payloads (e.g., preventing Branch Managers from approving requests, or restricting queries to specific branch codes).
