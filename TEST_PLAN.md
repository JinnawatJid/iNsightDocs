# Credit Request System - Manual Test Plan

This document outlines the test strategy and checklist for manual testing of the Credit Request System. It is designed for software testers (including junior testers) to validate the system's functionality before deployment.

## Prerequisites

1.  **Environment**: The testing environment should be a fresh instance of the application running via Docker.
    *   **Start the System**:
        ```bash
        docker compose up --build -d
        ```
    *   **Access**: Open `http://localhost` (or the configured IP) in a web browser (Chrome recommended).
2.  **Test Data**:
    *   Use the following Customer IDs for testing:
        *   `01016AY` (Individual Customer)
        *   `01017AY`
        *   `01018AY`
    *   Prepare dummy files for upload (e.g., `test.jpg`, `doc.pdf`).

---

## Test Scenarios

### TS01: Happy Path - Create Credit Request (Success)
**Objective**: Verify that a user can successfully create a credit request for an existing customer.

| Step | Action | Expected Result |
| :--- | :--- | :--- |
| 1 | Open the application. | The "Create Credit Request" page loads. The history sidebar and form are hidden. |
| 2 | In the search bar, type `01016AY`. | A dropdown appears showing the customer ID and Name. |
| 3 | Click on the customer from the dropdown. | 1. The main form appears.<br>2. The "History" sidebar on the left populates.<br>3. The "Financial Summary" on the right populates. |
| 4 | **Tab 1: General Info**<br>- Verify Name and Company are pre-filled.<br>- Enter "Position" (e.g., Owner).<br>- Enter "Credit Amount" (e.g., 50000).<br>- Upload "ID Card" and "Home Registration" files. | All fields accept input. Files are uploaded successfully. |
| 5 | **Tab 2: Residence**<br>- Verify address fields are pre-filled.<br>- Enter/Verify Phone Number.<br>- Upload "Home Photo". | Address is correct. Phone number is formatted correctly. |
| 6 | **Tab 3: Store/Company**<br>- Check "Same as Residence" checkbox. | The address fields automatically fill with the residence address. |
| 7 | **Tab 4: Financial**<br>- Upload "Bank Statement".<br>- Enter Account Name and Number. | Files are uploaded. Fields accept input. |
| 8 | Scroll to bottom and click "ส่งคำขอเครดิต" (Submit). | A success message (SweetAlert) appears: "Success! Credit request has been created." |
| 9 | Click "OK" on the success message. | The page refreshes or resets for the next request. |

### TS02: Validation & Negative Cases
**Objective**: Verify that the system handles invalid input gracefully.

| Step | Action | Expected Result |
| :--- | :--- | :--- |
| 1 | **Empty Search**: Click "Search" without typing anything. | No action or a gentle reminder to enter text. |
| 2 | **Invalid Customer**: Type `99999ZZ` and search. | "No results found" (or similar) is displayed in the dropdown or alert. |
| 3 | **Required Fields**: Search for `01016AY` but try to Submit immediately without filling any tab. | The system should block submission. Red borders/text should appear under required fields (Name, Amount, Phone, etc.). |
| 4 | **Invalid Phone**: In Residence Tab, enter a phone number with only 5 digits. | An error message "Invalid phone format" (or Thai equivalent) appears. |
| 5 | **Non-Numeric Amount**: In General Tab, try typing "ABC" into the Credit Amount field. | The field should either not accept letters or show a validation error. |

### TS03: UI & Navigation
**Objective**: Verify the user interface is consistent and usable.

| Step | Action | Expected Result |
| :--- | :--- | :--- |
| 1 | **Tab Navigation**: Click through "General", "Residence", "Store", "Financial" tabs. | The content area updates instantly without page reload. Data in previous tabs is preserved. |
| 2 | **History Sidebar**: Check the left sidebar after searching `01016AY`. | It should show a list of previous requests (or be empty if none). Clicking an item should not break the page. |
| 3 | **Map Component**: In Residence Tab, look at the bottom. | A map interface (Google Maps or Coordinate fields) should be visible. |

---

## Reporting Bugs
If any step fails:
1.  Take a screenshot of the error or unexpected behavior.
2.  Note the browser version and Customer ID used.
3.  Report to the development team with the Step Number from this plan.
