# Verification Protocol for Autonomous Agents

This project depends heavily on external infrastructure (Exchange Platforms, SSO Authentication Hubs, active VPN connections to internal corporate DBs, DBD Data Bridge API) that are **inaccessible** from isolated sandbox environments.

## Strict Verification Rules:
1. **DO NOT** attempt to execute automated end-to-end (E2E) UI verification scripts (e.g., Playwright, Puppeteer, Selenium) or start the frontend/backend servers for the purpose of visual verification.
2. The sandbox environment **will freeze or timeout** when attempting to load the frontend or reach backend endpoints, due to missing external APIs and SSO authentication requirements.
3. **Mandatory Protocol:** You must **bypass** any standard automated frontend verification or server testing steps.
4. Instead of running scripts, you must rely **exclusively** on rigorous **manual code review and static code auditing** to verify your logic.
