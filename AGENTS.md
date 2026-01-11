# Agent Guidelines & Protocols

This file contains critical instructions and protocols for any AI agent or developer working on this repository.

## 1. Stability & Persistence Protocol (Atomic Commits)

**CRITICAL WARNING:** The development environment is susceptible to "Filesystem Reversion" during heavy process executions.

### Symptom
Files created but not yet committed may disappear if the environment resets or "crashes" (e.g., during a resource-intensive `npm install` or `npm start`).

### Protocol
*   **Atomic Commits:** Do not accumulate multiple uncommitted file creations.
*   **Immediate Persistence:** After creating a significant file or completing a logical step, **immediately commit** the change (or verify it is saved to disk and persistent).
*   **Resource Management:** Do not run heavy commands like `npm install` or `npm start` while the workspace contains valuable, uncommitted work. Commit first, then run commands.

## 2. Project Structure

*   `backend/`: Node.js backend (Express, SQLite/MSSQL).
*   `src/`: Vue.js frontend (Vite).
*   `docs/`: Documentation (organized by type).

## 3. General Directives
*   **Verification:** Always verify file creation and content using `read_file` or `list_files` before marking a task as complete.
*   **Testing:** Run relevant tests (or verify manually via `curl` for backend / Playwright for frontend) before submitting.
