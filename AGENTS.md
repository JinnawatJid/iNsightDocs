
# Agent Operational Guidelines

## Project Structure & Commands
*   **Backend Directory:** The backend code is located in `backend/`.
    *   **Always** `cd backend` before running `npm install` or `npm start`.
    *   Do **not** run backend commands from the root directory.
*   **Root Directory:** Contains the Frontend (Vite).
    *   `npm install` and `npm run dev` are run from the root.

## Verification & Testing
*   **Robust Selectors:** When writing Playwright verification scripts:
    *   **Avoid** matching by text content (e.g., `get_by_text`) if possible, as it is fragile (especially with Thai localization).
    *   **Prefer** CSS classes (e.g., `.form-input`, `.credit-review-section`) or IDs.
    *   If using placeholders, ensure they are exact.
*   **Timeouts:** Increase timeouts for `wait_for_selector` (e.g., 15000ms) to account for build/startup times.

## UI/UX Standards
*   **Manager Review:** The "Credit Term" inputs are split into 3 fields (GS, AE, YC) and displayed in a unified `CreditReviewSection` for Managers (Opened+ status), alongside comments.
*   **Draft Mode:** Branch Heads (Draft) see terms in the main form, not the Review Section.
