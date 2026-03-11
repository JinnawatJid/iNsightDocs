# Production Readiness Checklist

This document outlines the industry-standard tasks required to prepare the application for a manual deployment to an air-gapped Windows Server production environment.

Given the constraints of an air-gapped network, all dependencies, binaries, and configurations must be pre-packaged and verified before transferring to the production server. This process is largely handled by our automated release builder.

## 1. Environment & Infrastructure (Windows Server)
- [~] **PM2 / Windows Service (SKIPPED):** *Skipped for current release.* Decide on the process manager (e.g., PM2 installed globally, or Node.js configured as a Windows Service via tools like `node-windows`) to ensure the application starts automatically on boot and restarts on failure, rather than relying solely on the bundled `start_server.bat`.
- [ ] **Network Ports:** Ensure the required ports (e.g., 80, 443, and 3000 for the backend) are open in the Windows Firewall for internal client access.
- [ ] **Persistent Storage Directory:** Create the persistent storage directory `SP682/customers/` outside of the versioned release folders as defined in `PROJECT_STRUCTURE.md`. Verify read/write permissions for the application user.
- [ ] **Puppeteer Requirements:** Puppeteer requires specific system libraries and a Chromium executable. Since the automated release builder specifically uninstalls Puppeteer to save space (Offline Mode), ensure that the target server either does not require Puppeteer (e.g., using `MOCK_EXTERNAL_APIS=true` or alternate flows), OR that the standalone Chromium binary is manually transferred and the code is configured to use it.

## 2. Database & External Services
- [ ] **MSSQL Connectivity:** Verify network connectivity from the Windows Server to the MSSQL Database (`CreditRequestDB`).
- [ ] **Database Migrations:** Prepare and review SQL scripts for schema changes. Ensure a backup of the production database is taken *before* applying migrations.
- [ ] **External APIs (WSO2, Dynamics 365):** In an air-gapped environment, if external APIs are external to the organization's network, ensure proxy rules or specific firewall holes are approved and implemented. If they are internal (on-premise), verify connectivity.
- [ ] **DBD Bridge Server:** Ensure the DBD website is accessible from the server if it requires internet access, or configure the system to handle offline scenarios.

## 3. Application Configuration
- [ ] **Environment Variables (`.env`):** The release builder generates a template `.env`. Update this file on the production server with real values:
    - Set `NODE_ENV=production`.
    - Configure production Database Connection Strings (`DB_USER`, `DB_PASSWORD`, `DB_SERVER`, etc.) with restricted user permissions.
    - Set `MOCK_EXTERNAL_APIS=false` (unless specifically testing offline fallback modes).
    - Configure API endpoints for production WSO2/Dynamics 365.
- [ ] **Logging:** Configure application logging to write to rolling files on disk. Ensure log rotation is set up so disk space doesn't fill up.
- [ ] **File Paths:** Double-check that all paths pointing to the `customers/` directory correctly resolve to the absolute path outside the release folder (e.g., `C:\SP682\customers\`).

## 4. Build & Packaging (Pre-Deployment)
*These steps must be done on a machine with internet access before transferring the artifact to the air-gapped server.*
- [ ] **Run Release Builder:** Execute `create_release.bat`. This automated script will:
    - Install build dependencies.
    - Build the Vue frontend into `dist/`.
    - Download and bundle a standalone Node.js Windows binary.
    - Copy backend files (respecting `exclude_backend.txt`).
    - Install production dependencies for the backend (excluding Puppeteer).
    - Generate a `start_server.bat` script and template `.env`.
    - Package everything into a `release.zip` archive.
- [ ] **Verify Artifact:** Inspect the generated `release.zip` to ensure `node/`, `backend/`, `dist/`, and `start_server.bat` are present.

## 5. Deployment Steps (Manual Process)
- [ ] **Transfer:** Securely transfer the `release.zip` artifact to the air-gapped Windows Server.
- [ ] **Extract:** Extract the contents into a new versioned folder (e.g., `C:\SP682\SP682_1_5_0\`).
- [ ] **Configure `.env`:** Update the `backend/.env` file in the new release folder with production credentials.
- [ ] **Stop Existing Service:** Gracefully stop the currently running application process.
- [ ] **Database Migration:** Execute the pre-approved database migration scripts.
- [ ] **Start New Service:** Run the bundled `start_server.bat`, or ideally, update your process manager (PM2/Windows Service) to point to the new folder's entry point (`backend/server.js` using the bundled Node binary) and start the service.
- [ ] **Verify Process:** Check process manager status and application logs for immediate crash errors.

## 6. Security & Compliance
- [ ] **Service Account:** Ensure the application runs under a dedicated Windows Service Account with least-privilege access, rather than a domain admin or SYSTEM account.
- [ ] **Directory Permissions:** Restrict access to the `SP682/` directory and `.env` files to only the necessary service accounts and administrators.
- [ ] **Data Protection:** Ensure sensitive financial data in the persistent `customers/` folder is protected by appropriate NTFS permissions.

## 7. Testing & Verification (Post-Deployment)
- [ ] **Health Check:** Ping the application's base URL and API health endpoints.
- [ ] **Frontend Access:** Load the Vue application in a browser to verify static assets are served correctly.
- [ ] **Core Workflow Test:** Perform a smoke test of critical paths:
    - Search for a customer.
    - Create a draft credit request.
    - Verify file uploads/generation.
- [ ] **Log Inspection:** Monitor the production logs for exceptions or warnings during the smoke tests.

## 8. Rollback & Disaster Recovery
- [ ] **Rollback Plan:** Document the exact steps to revert to the previous version. Because releases are versioned folders, rollback involves stopping the current service, changing the process manager to point to the older folder (e.g., `SP682_1_4_9`), and restarting.
- [ ] **Database Reversion:** Have a plan to restore the database from the pre-deployment backup if migrations caused critical data corruption.
