# Pending Requests List & Sidebar

## Overview
The Pending Requests list (implemented in `src/components/credit/dashboard/RequestSidebar.vue`) provides reviewers and managers with a quick overview of credit requests awaiting action. It serves as the primary navigation hub for the review workflow.

## Baseline vs. Requested Data (Industry Standard Separation)
In the lifecycle of a credit request, there is a clear distinction between:
1. **Baseline Data (Original State)**: The terms and limits the customer currently has.
2. **Requested Data (Transaction State)**: The new terms and limits being applied for.

When a request is in a "Pending" or "Draft" state, it has not yet been approved. Displaying the *requested* terms in the sidebar list can be misleading to reviewers who expect to see the customer's *current* standing at a glance.

To align with industry standards for data integrity and UX clarity, the backend (`creditRequestController.js -> getCreditRequests`) explicitly isolates the baseline data for the list view:
- The backend parses the `snapshot_data` JSON blob.
- It extracts the `billing_terms_code` (e.g., `B00CR30`), which represents the original, approved terms captured when the request was first initiated.
- It dynamically parses the billing code (`B00`) and the credit terms (`30`) to temporarily override the unapproved `transaction_data` fields (`term_gs`, `term_ae`, `term_yc`).
- This ensures the UI accurately displays `[Amount] บาท (B[Billing Code], CR[GS]/[AE]/[YC])` (e.g., `300,000 บาท (B00, CR30/30/30)`) representing the baseline state.

## Layout and Truncation Strategies
Because the sidebar is a compact UI element, strict layout rules are enforced to prevent wrapping issues and maintain a clean tabular look.

1. **Flexbox Distribution**: The bottom row of each list item uses `display: flex; justify-content: space-between;` to push the Transaction ID to the far left and the financial details to the far right.
2. **Typography Optimization**: The font size is scaled down (e.g., `11.5px`) and paddings are reduced to maximize available horizontal space.
3. **Single-Line Truncation**: The financial details (`.details`) utilize `white-space: nowrap`, `overflow: hidden`, and `text-overflow: ellipsis`. This forces the text to remain on a single line, appending `...` if it overflows the container.
4. **Accessible Tooltips**: To ensure data is never permanently lost to truncation, the native HTML `title` attribute is bound to the details string. Hovering over the truncated text will display the full string via the browser's default tooltip mechanism.

## API Endpoint Considerations
The `/api/credit-requests` endpoint is highly optimized for list views. It explicitly selects only the necessary columns in its SQL query. To prevent massive data payloads over the network, after parsing the `snapshot_data` to extract the baseline terms, the `snapshot_data` property is explicitly set to `undefined` before sending the JSON response.

## Status Filtering and Visibility
The sidebar dynamically determines which requests a user can see based on their roles and the `WORKFLOW_CONFIG` matrix:
1. **Initiator (Tracking)**: By default, Initiators see all non-final states for requests they submitted to track progress. However, **`Draft` requests are explicitly excluded** from the pending tracking list to prevent clutter. 
2. **Reviewers/Approvers**: The approver-chain roles (`ผู้พิจารณาฝ่ายขาย`, `ผู้ตรวจสอบเอกสาร`, `ผู้อนุมัติ (วงเงินต่ำกว่าเกณฑ์)`, `ผู้อนุมัติ (วงเงินสูงกว่าเกณฑ์)`) can see the full non-final queue, but only the request state assigned to their role remains editable. All other states render read-only.
3. **Final States**: Final states (`Approved`, `Rejected`, `Closed`, `Canceled`) are strictly separated and only available within the "History" (ประวัติ) tab.
