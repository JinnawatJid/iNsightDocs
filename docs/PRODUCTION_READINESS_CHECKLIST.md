# Production Readiness Checklist

This document outlines the industry-standard tasks required to prepare the application for a manual deployment to an air-gapped Windows Server production environment.

Given the constraints of an air-gapped network, all dependencies, binaries, and configurations must be pre-packaged and verified before transferring to the production server.

## 1. Environment & Infrastructure (Windows Server)
- [ ] **Hardware Requirements:** Verify CPU, RAM, and Disk space match or exceed minimum requirements.
- [ ] **Node.js Installation:** Ensure the correct version of Node.js is installed on the server. Since it's air-gapped, the installer (`.msi` or zip) must be transferred manually.
- [ ] **PM2 / Windows Service:** Decide on the process manager (e.g., PM2 installed globally, or Node.js configured as a Windows Service via tools like `node-windows`) to ensure the application starts automatically on boot and restarts on failure.
- [ ] **Network Ports:** Ensure the required ports (e.g., 80, 443, and any specific backend/bridge server ports) are open in the Windows Firewall for internal client access.
- [ ] **Persistent Storage Directory:** Create the persistent storage directory `SP682/customers/` outside of the versioned release folders as defined in `PROJECT_STRUCTURE.md`. Verify read/write permissions for the Node.js process user.
- [ ] **Puppeteer Requirements:** Puppeteer requires specific system libraries and a Chromium executable. Since the server is air-gapped, ensure the Chromium binary is pre-downloaded and packaged, and the `PUPPETEER_EXECUTABLE_PATH` environment variable is correctly configured to point to it.

## 2. Database & External Services
- [ ] **MSSQL Connectivity:** Verify network connectivity from the Windows Server to the MSSQL Database.
- [ ] **Database Migrations:** Prepare and review SQL scripts for schema changes. Test the migrations on a staging replica if possible. Ensure backup of the production database is taken *before* applying migrations.
- [ ] **External APIs (WSO2, Dynamics 365):** In an air-gapped environment, if external APIs are external to the organization's network, ensure proxy rules or specific firewall holes are approved and implemented. If they are internal (on-premise), verify connectivity.
- [ ] **DBD Bridge Server:** Ensure the DBD website is accessible from the server if it requires internet access, or configure the system to handle offline scenarios (e.g., `MOCK_EXTERNAL_APIS=true` if applicable for testing, but ensure it's `false` for real production usage).

## 3. Application Configuration
- [ ] **Environment Variables (`.env`):** Create a production `.env` file.
    - Set `NODE_ENV=production`.
    - Configure production Database Connection Strings (with restricted user permissions).
    - Configure API endpoints for production WSO2/Dynamics 365.
    - Set `MOCK_EXTERNAL_APIS=false`.
    - Configure JWT secrets or session keys (generate strong, unique keys for production).
- [ ] **Logging:** Configure application logging (e.g., Winston/Morgan) to write to rolling files on disk. Ensure log rotation is set up so disk space doesn't fill up.
- [ ] **File Paths:** Double-check that all paths pointing to the `customers/` directory correctly resolve to the absolute path outside the release folder (e.g., `C:\SP682\customers\`).

## 4. Build & Packaging (Pre-Deployment)
*These steps must be done on a machine with internet access before transferring the artifact to the air-gapped server.*
- [ ] **Frontend Build:** Run the frontend build command (e.g., `npm run build`) and verify the `dist/` output.
- [ ] **Dependency Installation:** Run `npm install --production` (or `npm ci --omit=dev`) in the backend to install only necessary packages.
- [ ] **Bundle Dependencies (Air-gap specific):** Since the target server cannot run `npm install`, the entire `node_modules` folder (compiled for Windows architecture if native modules are used) must be packaged.
- [ ] **Create Release Artifact:** Create a zip archive (e.g., `SP682_1_5_0.zip`) containing:
    - `backend/`
    - `dist/`
    - `node_modules/`
    - `bridge-server/` (and its `node_modules` if separate)
    - `start_server.bat`
    - Production `.env` template.

## 5. Deployment Steps (Manual Process)
- [ ] **Transfer:** Securely transfer the release artifact (`.zip`) to the air-gapped Windows Server.
- [ ] **Extract:** Extract the contents into a new versioned folder (e.g., `C:\SP682\SP682_1_5_0\`).
- [ ] **Configure `.env`:** Copy and populate the production `.env` file into the new release folder.
- [ ] **Stop Existing Service:** Gracefully stop the currently running application process.
- [ ] **Database Migration:** Execute the pre-approved database migration scripts.
- [ ] **Start New Service:** Update PM2 or the Windows Service to point to the new folder's entry point (`start_server.bat` or `backend/server.js`) and start the service.
- [ ] **Verify Process:** Check process manager status and application logs for immediate crash errors.

## 6. Security & Compliance
- [ ] **Service Account:** Ensure the application runs under a dedicated Windows Service Account with least-privilege access, rather than a domain admin or SYSTEM account.
- [ ] **Directory Permissions:** Restrict access to the `SP682/` directory and `.env` files to only the necessary service accounts and administrators.
- [ ] **Data Protection:** Ensure sensitive financial data in the persistent `customers/` folder is protected by appropriate NTFS permissions.
- [ ] **Vulnerability Scan:** Run an `npm audit` on the project before packaging to ensure no critical vulnerabilities are being shipped.

## 7. Testing & Verification (Post-Deployment)
- [ ] **Health Check:** Ping the application's base URL and API health endpoints.
- [ ] **Frontend Access:** Load the Vue application in a browser to verify static assets are served correctly.
- [ ] **Core Workflow Test:** Perform a smoke test of critical paths:
    - Search for a customer.
    - Create a draft credit request.
    - Trigger the DBD Bridge auto-download (verify Puppeteer launches and saves files to the correct persistent directory).
    - Generate and download a PDF.
- [ ] **Log Inspection:** Monitor the production logs for exceptions or warnings during the smoke tests.

## 8. Rollback & Disaster Recovery
- [ ] **Rollback Plan:** Document the exact steps to revert to the previous version. Because releases are versioned folders, rollback usually involves stopping the current service, changing the process manager to point to the older folder (e.g., `SP682_1_4_9`), and restarting.
- [ ] **Database Reversion:** Have a plan to restore the database from the pre-deployment backup if migrations caused critical data corruption.
- [ ] **Backup Verification:** Confirm that the daily/weekly backups of the `SP682/customers/` directory and the MSSQL database are functioning correctly.
