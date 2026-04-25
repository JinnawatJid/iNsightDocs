# Documentation

Welcome to the documentation folder for the Credit Management System. To keep our documentation organized and easy to navigate, we follow a structured approach based on standard industry practices.

This README serves as an index and guide for where to find existing documents and where to place new ones.

## Directory Structure

### `architecture/`
**High-level design documents, system integrations, and core architectural decisions.**
*   *What goes here:* System component designs, UI/UX standards, state management strategies, third-party integration outlines, and overarching technical decisions.
*   *Examples:* `FRONTEND_STATE_MANAGEMENT.md`, `SCORING_ARCHITECTURE.md`, `API_DESIGN_GUIDE.md`

### `features/`
**Detailed explanations, flows, and states of specific product features.**
*   *What goes here:* Business logic, user flows, and how specific features (like authentication, Blacklist checks, or credit scoring logic) operate from a user or system perspective.
*   *Examples:* `BLACKLIST_FEATURE.md`, `CREATE_CREDIT_REQUEST_FLOW.md`, `NOTIFICATION_SYSTEM.md`

### `guides/`
**"How-to" guides, coding standards, and step-by-step instructions for developers.**
*   *What goes here:* Tutorials on running specific scripts, generating files (like PDFs), routing structures, file naming conventions, and other practical instructions.
*   *Examples:* `FILE_NAMING_STANDARD.md`, `PDF_GENERATION_GUIDE.md`, `BATCH_AUTOMATION.md`

### `specs/`
**API specifications, schemas, database structures, and formal contracts.**
*   *What goes here:* OpenAPI definitions (`openapi.yaml`), database tables, field inventories, API endpoints, and SQL queries used across the system.
*   *Examples:* `openapi.yaml`, `LATE_PAYMENT_API.md`, `FIELD_INVENTORY.csv`

### `testing/`
**Testing strategies, QA scripts, test data, and UAT documents.**
*   *What goes here:* Test cases, CSV test data files, UAT training plans, and manual test scripts for specific environments.
*   *Examples:* `UAT_Training_Plan.md`, `UAT_TEST_SCRIPT.md`, `UAT_TEST.csv`

### `project/`
**Project management, release checklists, and process documentation.**
*   *What goes here:* Production readiness checklists, release processes, team responsibility charts (RACI), and general project structure overviews.
*   *Examples:* `PRODUCTION_READINESS_CHECKLIST.md`, `RELEASE_PROCESS.md`, `RACI_MATRIX.md`

## Root Files
Files located at the root of the `docs/` folder should be limited to high-level entry points:
*   `README.md`: This file, serving as the index and guide.
*   `AGENTS.md`: Instructions and context for AI agents interacting with the repository.

---

## How to use this documentation

*   **Looking for how a feature works?** Start in `features/`.
*   **Need to understand the system structure or global state?** Look in `architecture/`.
*   **Need to learn how to do a specific task as a dev?** Check `guides/`.
*   **Need exact details on API endpoints or DB fields?** Reference `specs/`.
*   **Getting ready for a release or UAT?** Review `testing/` and `project/`.

When adding new documentation, please select the most appropriate folder from the list above. If you are unsure, default to `features/` for product logic, `guides/` for dev tasks, or discuss with the team.