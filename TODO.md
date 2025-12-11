# Project TODOs

## General
- [ ] **Implement Test Cases**: Replace the deleted `TEST_CASES.md` with comprehensive automated (or updated manual) test cases for the current system architecture.
- [ ] **Dynamic Branch Code**: Update the Transaction ID generation logic to retrieve the Branch Code from the future SSO system instead of using the hardcoded "AY".
- [ ] **File Storage Strategy**: Design and document a strategy for handling uploaded file storage in the containerized production environment (e.g., Docker Volumes vs External Storage Service).

## Backend Integration
- [ ] **Fetch Customer Data**: Implement API call in `CreateCreditRequest.vue` (currently using `mock_customer_data.json`).
- [ ] **OCR Integration**: Implement backend OCR service to parse uploaded documents (ID card, Home registration, Financial statements) and auto-fill fields.
- [ ] **Google Map Integration**: Implement Google Maps API to allow users to pin customer coordinates for "Residential Address" and "Company Address".
- [ ] **Credit Scoring Model**: Implement the backend logic to calculate "Credit Pass/Fail" and generate suggestions based on financial data.
- [ ] **Financial Statement Summation**: Implement logic to sum financial statement data, whether from a single consolidated file or multiple monthly files.

## Frontend
- [ ] **Search Logic**: Connect "Search" button to the real backend API.
- [ ] **Address Coordinates**: Replace placeholder with actual map component once API key is available.
