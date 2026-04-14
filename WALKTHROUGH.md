# Code Walkthrough Guide: Final Presentation

This document is your "Cheat Sheet" for presenting your codebase to your professor. It outlines the core features (Create Request, Approve Request, and Batch Automation) and maps the exact flow from Frontend $\rightarrow$ State Management $\rightarrow$ Backend Database.

---

## General Presentation Tips
*   **Don't open files randomly.** Follow the "Traceability Walkthrough" approach: Start at the UI (Vue component), show where the data is managed (Pinia store), then show where it's saved (Backend controller/route).
*   **Highlight the "Why".** Explain *why* you chose a specific pattern. For example: "We use Pinia here to manage form state so that if the user changes tabs, the data persists."
*   **Keep it high-level.** Don't explain what an `if` statement does. Explain what the *block of code* achieves for the business logic.

---

## 1. Feature: Create Credit Request

**The Goal:** Show how a new credit request is initialized, how user input is managed, and how it is sent to the server.

### Step 1: The UI Component (`src/views/CreateCreditRequest.vue`)
*   **Open:** `src/views/CreateCreditRequest.vue`
*   **Show:** The `<template>` block. Point out the `Navbar`, `RequestStatus`, and `CreditRequestHeader`.
*   **Talk About:** "This is the main entry point. We use a modular component design. The header handles the search and initiation, while the form itself is broken down into separate tabs managed below."
*   **Key Code:** Show the `handleStartRequest` function. Explain that when a user clicks 'Start', it triggers the Pinia store.

### Step 2: State Management (`src/stores/creditRequest.js`)
*   **Open:** `src/stores/creditRequest.js`
*   **Show:** The `submitRequest` or `saveTransactionData` action.
*   **Talk About:** "We use Pinia (Vue's state management) to handle the complex state of a credit request. This allows us to gather data from multiple different components (like project details, attachments, and financial info) into one centralized payload."
*   **Key Code:** Show how `FormData` is constructed to handle both JSON data and file uploads simultaneously.

### Step 3: Backend API (`backend/routes/creditRequestRoutes.js` & `backend/controllers/creditRequestController.js`)
*   **Open:** `backend/routes/creditRequestRoutes.js` first. Show the `POST /` route.
*   **Talk About:** "The request hits our Express router, which directs it to the controller."
*   **Open:** `backend/controllers/creditRequestController.js`. Go to the `createCreditRequest` function.
*   **Talk About:** "Here is where we handle the business logic. We use database transactions to ensure data integrity. If inserting the request details succeeds but saving the file attachments fails, the entire transaction rolls back."

---

## 2. Feature: Approve Credit Request (Workflow Progression)

**The Goal:** Demonstrate how the system handles role-based state changes (Initiator $\rightarrow$ Reviewer $\rightarrow$ Approver).

### Step 1: The UI / Trigger (`src/stores/creditRequest.js`)
*   **Open:** `src/stores/creditRequest.js`
*   **Show:** The `updateStatus` action.
*   **Talk About:** "Workflow state changes (like Approvals or Submissions) don't have separate endpoints. We reuse our unified `createCreditRequest` endpoint. The frontend updates the status payload and sends it through."

### Step 2: Backend Handling (`backend/controllers/creditRequestController.js`)
*   **Open:** `backend/controllers/creditRequestController.js`
*   **Show:** The `createCreditRequest` function again, focusing on the `UPDATE` logic block.
*   **Talk About:** "When a request already has a transaction ID (`tx_id`), the backend performs an `UPDATE` instead of an `INSERT`. It updates the `status` and `updated_at` timestamps, progressing the workflow."
*   **Bonus Point:** Show how audit tracking works. "We automatically append the `updated_by` or `username` from the authenticated request (`req.user.username`) so we always have an audit trail of who approved the request."

---

## 3. Feature: Batch Automation (External API Integration)

**The Goal:** Showcase your ability to build complex, automated background tasks connecting to external systems.

### Step 1: The UI Component (`src/views/BatchAutomation.vue`)
*   **Open:** `src/views/BatchAutomation.vue`
*   **Show:** The `startBatch` or `processNext` functions.
*   **Talk About:** "This view orchestrates a batch processing job. It doesn't just make one API call; it processes a queue of customers, managing rate limits and bridging to an external automation server."

### Step 2: The Polling / Bridging Logic (`src/views/BatchAutomation.vue`)
*   **Open:** `src/views/BatchAutomation.vue`
*   **Show:** The `checkSingleCustomerFiles` and `pollCheckReadiness` functions.
*   **Talk About:** "We implemented a bridging mechanism to communicate with a local scraping service. The system checks if files exist locally, and if not, it signals the bridge to download them. We use polling (`setInterval` / `setTimeout`) to wait for the external process to finish downloading the files before uploading them to our main server."
*   **Key Point:** Emphasize the resilience. "If a step fails, it logs the error but continues processing the next item in the batch."

---

## Final Words for the Professor
"This architecture ensures that our frontend is purely presentational and state-driven, our backend handles secure transactions and file storage, and our automation seamlessly bridges external data into our system."