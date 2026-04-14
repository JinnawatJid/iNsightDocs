# Other Documents (เอกสารอื่นๆ) Architecture

## 1. Context and Purpose
The "Other Documents" (เอกสารอื่นๆ) section in the `CreditRequestForm` allows users to dynamically add, name, and upload miscellaneous files that are not strictly defined by the standard mandatory fields.

Originally, this component was a **shared pool** across all tabs. Any document uploaded as "Other" in the `GeneralInfoTab` would also appear in the `StoreCompanyTab`, `ResidenceTab`, etc.

To provide better context and organization, the system now enforces **Tab-Specific File Isolation** for the "Other Documents" section.

## 2. Implementation Details

### Component Prop: `tabName`
The `OtherDocumentsSection.vue` component requires a `tabName` prop. This prop is passed down from the parent tab component where it is instantiated:
- `GeneralInfoTab.vue` -> `tabName="general"`
- `RequestInfoTab.vue` -> `tabName="requestInfo"`
- `ResidenceTab.vue` -> `tabName="residence"`
- `StoreCompanyTab.vue` -> `tabName="storeCompany"`
- `StoreStatementTab.vue` -> `tabName="storeStatement"`

### State Management: `other_{tabName}:` Prefix
When a user adds a new document category (e.g., "รูปถ่ายหน้างาน"), the `OtherDocumentsSection` component prefixes the category name with `other_{tabName}:`.
For example, if added in the `general` tab, the key in the Pinia store (`store.files`) becomes:
`other_general:รูปถ่ายหน้างาน`

This prefix ensures that:
1. **Isolation**: When rendering the component, it only filters and displays keys from `store.files` that start with its specific `other_{tabName}:` prefix.
2. **Preventing Name Collisions**: Users can upload a document named "เอกสารสัญญา" in the General tab and another identically named document in the Store tab without the state conflicting.

### Validation & Enforcement
While creating an "Other Documents" category is optional, **once a category is created by the user, uploading at least one file to that category becomes mandatory**.

During form submission (`validateRequest` in `stores/creditRequest.js`), the validation logic dynamically scans the Pinia store (`this.files`) for any keys prefixed with `other_`. If an "Other Document" category exists but is empty (has no files), it is pushed to the `missingFiles` array, triggering a validation error and blocking submission.

### Completeness Metrics
The `creditRequest` Pinia store includes getters to calculate how complete an application is (e.g., `uploadedDocumentCount`, `approvalChancePercent`).

To prevent these dynamically generated "Other" documents from falsely inflating the core mandatory document count used for progress bars, the store explicitly filters out any key starting with `other_`:

```javascript
const count = Object.entries(state.files)
  .filter(([key, f]) => !key.startsWith('other_') && f && (!Array.isArray(f) || f.length > 0))
  .length;
```

## 3. Backend Integration
The Express backend is largely agnostic to the specific frontend keys used for uploaded files. It iterates over the `FormData` entries dynamically and saves the files mapping their `file_type` to whatever key the frontend provided (e.g., `other_general:รูปถ่ายหน้างาน`).

There are no hardcoded checks in the backend for the `other:` or `other_` prefix that would prevent these files from being saved correctly.
