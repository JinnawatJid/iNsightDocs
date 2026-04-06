# Maps & Plus Codes

This document outlines the architecture and business logic used for generating map navigation links and QR codes within the Credit Management System.

## The Problem: Plus Codes (Open Location Codes)

The application allows branch managers to input their location using coordinates (Latitude, Longitude) or Google Plus Codes. Google Plus Codes come in two formats:

1. **Full Plus Codes (e.g., `7P52RGFF+F74`)**: These are 10+ characters long and are globally unique.
2. **Short Plus Codes (e.g., `RGFF+F74`)**: These are typically 8 characters long and are only unique within a roughly 100km radius.

**The Issue:** When a user inputs a *Short Plus Code* without specifying a city or province (e.g., just `RGFF+F74` instead of `RGFF+F74 Bangkok`), Google Maps attempts to guess the location based on the *current location of the user opening the link*. This often leads to wildly inaccurate navigation directions, sending delivery drivers or inspectors to the wrong destination.

## The Solution: Auto-Appending Context

To enforce industry standards and ensure accurate navigation, the frontend automatically intercepts Short Plus Codes and appends the relevant geographical context (Province/City) before generating the Google Maps search URL and its corresponding QR Code.

### How it works (`CoordinateMap.vue`)

The core logic is handled within the `src/components/shared/CoordinateMap.vue` component. It accepts a `province` prop, which is populated by the active form data (e.g., `formData.city`).

When generating the URL, the component performs the following checks:
1. **Is it a coordinate pair?** It uses a RegEx (`/^-?\d+(\.\d+)?\s*,\s*-?\d+(\.\d+)?$/`) to ignore standard Latitude/Longitude inputs.
2. **Is it a Plus Code?** It checks if the string contains a `+` symbol.
3. **Is it a Short Plus Code?** It checks if the input is a single block of text (no spaces) AND the total length is under 10 characters.
4. **Append:** If it is a Short Plus Code, and the `province` prop is provided, it automatically appends the province text (e.g., `RGFF+F74` becomes `RGFF+F74 จังหวัดสมุทรปราการ`). Google Maps Search is highly robust and correctly translates Thai province names appended to Plus Codes.

### Implementation Locations

This auto-append logic is actively utilized in the following address-related tabs where a `city` or `province` field is available:
*   **ที่อยู่อาศัย (Residence Tab):** `src/components/credit/tabs/ResidenceTab.vue`
*   **ข้อมูลร้านค้า (Store/Company Tab):** `src/components/credit/tabs/StoreCompanyTab.vue`

Both components pass their active `formData.city` state down into the `<CoordinateMap>` component via the `:province` prop.
## Reviewer Overrides and Audit Trail

To accommodate human error during the initial application process (such as a Branch Manager entering an incorrect Plus Code), the system allows specific roles (e.g., Financial Officers / ผู้ตรวจสอบเอกสาร) to correct map data even when a credit request is in a submitted, read-only state.

### How it works

The `<CoordinateMap>` component accepts an `allowOverride` boolean prop. When the form is disabled (`readOnly` is true) and `allowOverride` is true, the component renders an "Edit Map" (แก้ไขข้อมูลแผนที่) button.

1. **Suppressed Auto-Save:** During normal drafting, map inputs trigger an auto-save on the `@change` event. To prevent premature or accidental saves during a reviewer override, this auto-save is explicitly blocked while the map is in edit mode.
2. **Explicit Save & Audit:** The reviewer must click the explicit "Save Map" (บันทึกแผนที่) button. This triggers a `@save-override` event containing the updated data.
3. **Database & Audit Log:** The parent component handles the event by permanently updating the customer's coordinates in the database (via `store.saveCustomerCoordinates`) and simultaneously `POST`ing a system-generated comment to the `/api/credit-requests/:txId/comments` endpoint.

This ensures that any alterations to the originally submitted data are permanently recorded with a clear audit trail (e.g., "พิกัดแผนที่...ถูกแก้ไขโดย [User] ([Role])").
