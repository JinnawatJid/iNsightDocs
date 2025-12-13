# Project TODOs

## General
- [ ] **Implement Test Cases**: Replace the deleted `TEST_CASES.md` with comprehensive automated (or updated manual) test cases for the current system architecture.
- [ ] **Dynamic Branch Code**: Update the Transaction ID generation logic to retrieve the Branch Code from the future SSO system instead of using the hardcoded "AY".

## Backend Integration
- [ ] **OCR Integration**: Implement backend OCR service to parse uploaded documents (ID card, Home registration, Financial statements) and auto-fill fields.
- [x] **Google Map Integration**: Implement Google Maps API to allow users to pin customer coordinates for "Residential Address" and "Company Address". (Implemented via Phone-Assisted QR Code)
- [ ] **Credit Scoring Model**: Implement the backend logic to calculate "Credit Pass/Fail" and generate suggestions based on financial data.
- [ ] **Financial Statement Summation**: Implement logic to sum financial statement data, whether from a single consolidated file or multiple monthly files.

## Frontend
- [x] **Address Coordinates**: Replace placeholder with actual map component once API key is available. (Replaced by QR Code Solution)
- [ ] **Add tests for Google Map Coordinator feature**: Add automated tests for the new Map Code, Landmark, and Note fields.