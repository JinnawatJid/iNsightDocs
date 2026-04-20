# Repository Guidelines for Agents

## Create Credit Request Flow
When working on `/create-credit-request`, you must strictly adhere to the "Search First" pattern documented in `docs/features/CREATE_CREDIT_REQUEST_FLOW.md`.

* **Never delete** `CustomerProfileDashboard.vue`. It is an essential intermediate screen.
* **Never jump straight** to `CreditRequestForm.vue` immediately after a search. The user must explicitly start a request from the dashboard via the "Start Request" button in `CreditRequestHeader.vue`.
* The header layout must always place the "Search" input on the left and the "Action/Request Type" section on the right.
* The "Action/Request Type" section has three distinct states (Disabled Placeholder, Button with Popover Menu, and MultiSelectDropdown). **Do not modify this 3-state logic without explicit user instruction.**

## General Rules
* Before modifying core UI workflows, check existing architecture documentation (e.g., in `docs/architecture/`) to ensure you are not accidentally reverting intentional design patterns.
* **Database Schema Synchronization:** We use two database environments (`db-sqlite.js` for testing/local, and `db-mssql.js` for production). **Any schema modifications** (e.g., adding a new column to a table, modifying data types) **must be mirrored in BOTH files.** Failure to do so will cause "invalid column name" errors when switching environments.
* **Customers Address Compatibility (MSSQL):** In some MSSQL sources, the customer address subdistrict field is exposed as `Address 2` instead of `District`. For backend customer search/select queries, normalize by selecting `"Address 2" AS "District"` so response mapping remains stable across MSSQL and SQLite.
