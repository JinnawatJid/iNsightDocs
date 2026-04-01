# Production Readiness Checklist

This document outlines the critical readiness checks required before launching the application on the production air-gapped Windows Server.

## 1. Environment & Infrastructure
- [ ] **Network Ports:** Ensure the required ports (e.g., 80, 443, and 3000 for the backend) are open in the Windows Firewall to allow internal client access.
- [ ] **Persistent Storage Directory:** Verify the permanent storage directory (`SP682/customers/`) exists entirely outside the versioned release folders. Ensure the Node.js application process has the necessary read/write permissions to this directory.
- [ ] **Puppeteer Requirements:** Confirm if the production environment requires automated DBD scraping. If so, ensure the standalone Chromium binary is manually transferred to the server and the application is configured to locate it (since the automated builder omits the binary to save space).
- [ ] **DBD Bridge Connection:** Ensure the main backend server can correctly connect to the active DBD Bridge Server (via PNA or local network loopback) to facilitate file downloads.

## 2. Database & External Services
- [ ] **MSSQL Migration & Connectivity:** Verify that the server can successfully connect to the `CreditRequestDB` MSSQL instance. Ensure all pre-approved SQL database migration scripts (schema changes) have been executed against the production database.
- [ ] **External APIs (WSO2, Dynamics 365):** Confirm that the production environment variables point to the live, production instances of WSO2 and Dynamics 365 APIs. Verify that proxy rules or internal firewalls permit traffic to these specific API endpoints.

## 3. Configuration
- [ ] **Log Path & Log Storage:** Verify that application logs (Winston/Morgan) are configured to write to permanent, rotating files on the disk rather than just the standard output console. Ensure log rotation is active to prevent server disk exhaustion over time.
- [ ] **File Paths Configuration:** Double-check the `backend/.env` configuration to guarantee all file paths point correctly to the absolute paths outside the release folder (e.g., ensuring `UPLOAD_PATH` resolves correctly to the persistent `SP682/uploads/` directory, while financial caching points to `SP682/customers/`).
- [ ] **Authentication Toggle:** Ensure `ENABLE_AUTH=true` is set (or explicitly omit the variable to default to true) in the `backend/.env` file so that the Single Sign-On flow with the external Exchange Platform is actively enforced on both the backend middleware and the frontend router guard. Do not leave `ENABLE_AUTH=false` active in a production environment.

## 4. Security
- [ ] **Service Account:** Ensure the application processes (`start_server.bat` or the background service) are run using a dedicated Windows Service Account with least-privilege access, rather than an Administrator or SYSTEM account.
- [ ] **Directory Permissions:** Restrict NTFS permissions on the application folder and specifically the `.env` file so only the service account and authorized server administrators can read or modify them.
- [ ] **Data Protection:** Ensure the persistent storage directory (`SP682/customers/`) is secured with strict access controls, as it contains sensitive financial profiles and Excel data downloaded from the DBD.

## 5. Testing & Verification
- [ ] **Health Check Endpoint:** Ping the application's base URL and specific backend health check API endpoints to verify the server is actively responding to requests.
- [ ] **Core Workflow Validation:** Perform an end-to-end smoke test on the production environment:
    - Search for a customer to verify the external API connection.
    - Create a draft credit request.
    - Trigger the DBD auto-download flow (to verify the Bridge Server, Puppeteer, and persistent storage work together).
    - Generate and download the final PDF.
- [ ] **Log Inspection:** Monitor the production log files during the core workflow validation to ensure no hidden exceptions, database connection warnings, or file write errors are being suppressed.
