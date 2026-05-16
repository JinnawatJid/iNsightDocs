# DocumentChecklist Component — Overview & Component Map
> `src/components/credit/workflow/DocumentChecklist.vue`

---

## Component Map (ภาพรวม)

```
[DocumentChecklist.vue]  ← display + UI interactions (dropdown, navigation)
     │
     ├── src/stores/creditRequest.js    ← source of truth: `files`, `uploadedDocuments`, `isCompany`, `setActiveTab`
     └── src/config/mandatoryFields.js   ← provides required `files` list via `getMandatoryKeys(isCompany)`
```

---

## ไฟล์ที่เกี่ยวข้องและหน้าที่

| ไฟล์ | Layer | หน้าที่ |
|---|---|---|
| `src/components/credit/workflow/DocumentChecklist.vue` | Frontend / Component | แสดงรายการเอกสารที่ต้องใช้, สถานะการอัปโหลด, และนำทางไปยังแท็บที่เกี่ยวข้อง |
| `src/stores/creditRequest.js` | Frontend / Store | เก็บ `files`, `uploadedDocuments`, method `setActiveTab()` |
| `src/config/mandatoryFields.js` | Frontend / Config | ให้รายการ `fields` และ `files` ที่ต้องตรวจสอบตามประเภทลูกค้า |

---

## DocumentChecklist — แสดงอะไรบ้าง

| ส่วน | แหล่งข้อมูล | เงื่อนไข/หมายเหตุ |
|---|---|---|
| รายการเอกสารที่ต้องใช้ | `getMandatoryKeys(store.isCompany).files` | คำนวณตาม `isCompany` (company vs individual)
| สถานะไฟล์ (`isUploaded`) | `store.files[key]` หรือ `store.uploadedDocuments[key]` | ถือว่า `true` เมื่อมีไฟล์จริงหรือ `uploadedDocuments[key] === true` (empty arrays treated as not uploaded)
| นับที่อัปโหลด (`uploadedCount`) | derived from computed `documents` | แสดงเป็น `x / total`
| เปิด/ปิด dropdown | local `isOpen` state | ปิดเมื่อ click outside หรือเมื่อเลือกรายการ
| คลิกรายการ | `store.setActiveTab(tab)` | ปิด dropdown และเปลี่ยน active tab

---

## Mapping & Config

- `DOC_CONFIG` (component-local) maps file keys → Thai label + default target tab (e.g., `credit_application_doc` → `ใบขอเปิดเครดิต`, tab `requestInfo`).
- `getMandatoryKeys(isCompany)` supplies the authoritative list of required file keys; the component maps those keys to labels using `DOC_CONFIG` and falls back to the raw key when missing.

Recommendation: centralize `DOC_CONFIG` (labels + tab mapping) and localize labels via i18n so UI and config remain consistent.

---

## Behavior / UX

- Header acts as toggle for dropdown; shows title, subtitle and uploaded-count badge.
- Clicking an item navigates to the associated tab via the store and closes the dropdown.
- Click-outside listener closes dropdown and is removed on unmount.
- Visual states: `.uploaded` (green check) vs `.missing` (orange alert).

---

## Edge cases & review checklist

- [ ] Accessibility: header lacks `role="button"`, `tabindex`, `aria-expanded`, and keyboard handlers (Enter/Space/Escape) — add for keyboard/screenreader users.
- [ ] Label localization: `DOC_CONFIG` is inline and labels are not i18n-ready; move to shared/localized resource.
- [ ] Dynamic keys: project-scoped keys (e.g., `project_contract_doc_<id>`) will not match static `DOC_CONFIG` — ensure label strategy or pattern matching exists.
- [ ] Empty arrays: component treats empty arrays as not uploaded (good). Verify other code paths don't leave empty arrays to represent uploaded files.
- [ ] Navigation guard: clicking missing document currently still navigates to the tab; consider offering a quick upload action or prevent navigation if intentional.
- [ ] Focus management: when opening dropdown focus is not moved into list; pressing `Esc` should close dropdown and restore focus to header.

---

## Suggested small improvements

- Add keyboard accessibility: `role="button"`, `tabindex="0"`, keydown handlers for Enter/Space to toggle and Escape to close.
- Export `DOC_CONFIG` to a shared module under `src/config/` and provide i18n keys instead of hard-coded Thai labels.
- Add pattern-based labeling for dynamic project document keys (regex match `project_contract_doc_` → `สัญญาโครงการ` + project id fallback).
- Add unit tests for `documents` computed mapping, `uploadedCount`, and `navigateToTab` side effects.
- Consider a small ARIA live region if the uploaded count may change asynchronously and should be announced.

---

## Suggested tests

- Mapping: assert `documents` contains correct `label`, `tab`, and `isUploaded` for company vs individual inputs.
- UX: assert dropdown opens/closes on header click, click-outside closes, and `setActiveTab` called on item click.
- Accessibility: tests for `aria-expanded`, keyboard toggling and `Esc` behavior (after implementing).

---

## Quick reference links

- Source: [src/components/credit/workflow/DocumentChecklist.vue](src/components/credit/workflow/DocumentChecklist.vue#L1-L200)
- Mandatory keys provider: [src/config/mandatoryFields.js](src/config/mandatoryFields.js)
- Related: `RequestStatus` (status display): [src/components/credit/workflow/RequestStatus.vue](src/components/credit/workflow/RequestStatus.vue#L1-L200)

---

If you want, I can implement the accessibility improvements (keyboard handlers + ARIA) and extract `DOC_CONFIG` to `src/config/documentKeys.js`. Which should I do next?
