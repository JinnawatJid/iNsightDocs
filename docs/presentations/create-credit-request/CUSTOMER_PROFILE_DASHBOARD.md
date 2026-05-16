# CustomerProfileDashboard Component — Overview & Component Map
> `src/components/credit/dashboard/CustomerProfileDashboard.vue`

---

## Component Map (ภาพรวม)

```
[CustomerProfileDashboard.vue]  ← UI orchestrator + store-driven summary + blacklist toggle
     │
     ├── src/stores/creditRequest.js    ← source of truth: `customer`, `financialSummary`
     ├── src/stores/auth.js             ← current user roles used for blacklist permission
     ├── src/services/CustomerService.js← blacklist update + customer refresh
     └── src/utils/axios.js             ← fetch RBAC matrix on mount
```

---

## ไฟล์ที่เกี่ยวข้องและหน้าที่

| ไฟล์ | Layer | หน้าที่ |
|---|---|---|
| `src/components/credit/dashboard/CustomerProfileDashboard.vue` | Frontend / Component | แสดงข้อมูลลูกค้าหลัก, วงเงินเครดิต, เครดิตเทอม, ระยะเวลาความสัมพันธ์ และสลับสถานะ NPL |
| `src/stores/creditRequest.js` | Frontend / Store | เก็บ `customer` และ `financialSummary` ที่ component ใช้อ่าน |
| `src/stores/auth.js` | Frontend / Store | ให้ข้อมูล role ปัจจุบันของผู้ใช้สำหรับตรวจ permission |
| `src/services/CustomerService.js` | Frontend / Service | เรียก API สำหรับ toggle blacklist และรีเฟรช customer |
| `src/utils/axios.js` | Frontend / Utility | ใช้ดึง RBAC matrix ตอน mount |

---

## CustomerProfileDashboard — แสดงอะไรบ้าง

| ส่วน | แหล่งข้อมูล | เงื่อนไข/หมายเหตุ |
|---|---|---|
| ชื่อลูกค้า | `store.customer.name` | ถ้าไม่มีจะแสดง `-` |
| รหัสลูกค้า | `store.customer.id` / `store.customer.No_` | fallback ตามข้อมูลที่มี |
| เลขประจำตัวผู้เสียภาษี | `store.customer.tax_id` | ถ้าไม่มีจะแสดง `-` |
| ที่อยู่ | `customer.address_company` หรือ compose จาก address fields | ถ้าไม่มีข้อมูลจะแสดง `-` |
| วงเงินเครดิตปัจจุบัน | `store.customer.current_credit_limit` | แสดงเป็นตัวเลข 2 ตำแหน่ง |
| เงื่อนไขการชำระเงิน | `store.customer.payment_terms_code` | `CASH` → `เงินสด`, otherwise `X วัน` |
| ระยะเวลาความสัมพันธ์ | `store.customer.customer_since` | แสดงทั้งข้อความช่วงเวลาและปี พ.ศ. |
| ประเภทลูกค้า | คำนวณจากชื่อ `customer.name` | company vs shop/individual badge |
| สถานะ NPL | `store.financialSummary.is_blacklisted` | แสดง toggle เฉพาะผู้มีสิทธิ์ |

---

## การทำงานหลักของ component

### 1) อ่านข้อมูลจาก store

Component นี้ไม่ได้โหลด customer เอง แต่ใช้ `useCreditRequestStore()` เพื่ออ่าน state ที่ถูกเตรียมไว้แล้วโดย flow อื่น เช่น `searchCustomer()` หรือ `loadRequestDetail()`.

### 2) RBAC สำหรับ blacklist

- `onMounted()` เรียก `/api/config/rbac`
- ดึง role ที่มี permission `manage_blacklist`
- `canManageBlacklist` เปรียบเทียบ role ของ user ปัจจุบันกับ role ที่อนุญาต

### 3) Toggle NPL

- ผู้ใช้กด switch → component ย้อน state UI ทันที (`event.target.checked = !newValue`) แล้วเปิด confirm dialog
- ถ้ายืนยัน จะเรียก `CustomerService.toggleBlacklist(payload)`
- จากนั้นแสดง success alert และเรียก `store.searchCustomer(...)` เพื่อ refresh customer data

### 4) Computed helpers

- `isBlacklisted` — อ่านจาก `store.financialSummary?.is_blacklisted`
- `hasCredit` / `currentCreditLimit` — ตรวจและแสดง current credit limit
- `customerTypeLabel` / `customerTypeClass` — ใช้ชื่อบริษัทในการจัดประเภท
- `avatarInitials` — ตัวอักษรตัวแรกของชื่อ
- `fullAddress` — เลือก `address_company` ก่อน แล้วค่อย compose address parts
- `paymentTermsLabel` — format เครดิตเทอม
- `customerSinceLabel` / `customerSinceYear` — แสดงระยะเวลาความสัมพันธ์
- `formatCurrency()` — format THB ด้วย 2 decimals

---

## การใช้งาน (where rendered)

- แสดงในหน้า create-request ผ่าน [src/views/CreateCreditRequest.vue](src/views/CreateCreditRequest.vue)
- ใช้ร่วมกับ `RequestStatus`, `DocumentChecklist`, และ `CreditHistorySidebar` ในแถว header ของหน้า request

## Data flow

```
User search customer or loads request detail
      ↓
creditRequest store.customer / financialSummary updated
      ↓
CreateCreditRequest.vue renders CustomerProfileDashboard
      ↓
Dashboard displays customer summary + blacklist toggle
      ↓
If toggle used: CustomerService.toggleBlacklist()
      ↓
store.searchCustomer() refreshes UI state
```

---

## ปัญหาเชิง edge-cases และข้อเสนอแนะสำหรับการรีวิว

- `canManageBlacklist` fetches RBAC matrix on mount with a direct axios call; if the request fails, toggle visibility depends on an empty role list — consider fallback behavior or caching.
- `console.log` / `console.debug` statements are present in blacklist permission flow; these should likely be removed or gated for production.
- `customerTypeLabel` relies on name substring checks; this can misclassify names and should ideally use canonical business classification from backend/store.
- `toggleBlacklistStatus()` optimistically reverts checkbox state and then reloads customer data; ensure there is no race if multiple toggle attempts happen quickly.
- `formatCurrency()` returns `0.00` for invalid values, which may hide data issues; review whether `-` would be clearer when limit is missing.
- `customerSinceYear` uses Buddhist year conversion; if upstream data is not a valid date, it falls back to raw value — confirm this is intentional.
- Accessibility: the toggle switch should have clear `aria-label` or associated text for screen readers, and the NPL badge could be announced as status.

---

## Suggested small improvements

- Move RBAC loading into a store/composable so permission logic is not duplicated across components.
- Replace name-based customer type detection with a canonical field from backend or store.
- Add defensive checks around `toggleBlacklist()` response and show a visible error message if refresh fails.
- Remove or gate debug logs before production.
- Add unit tests for `customerTypeLabel`, `fullAddress`, `paymentTermsLabel`, `customerSinceLabel`, and blacklist toggling behavior.

---

## Suggested tests

- Rendering: assert customer details, limit, payment terms, relationship text, and badge states for company vs individual.
- Permission: assert blacklist toggle is only visible when `canManageBlacklist` is true.
- Behavior: assert toggle opens confirmation, calls `CustomerService.toggleBlacklist()`, and refreshes store.
- Formatting: assert `formatCurrency()` and date helpers return the expected values for valid/invalid inputs.

---

## Quick reference links

- Source component: [src/components/credit/dashboard/CustomerProfileDashboard.vue](src/components/credit/dashboard/CustomerProfileDashboard.vue#L1-L220)
- Store: [src/stores/creditRequest.js](src/stores/creditRequest.js#L1-L260)
- Parent view: [src/views/CreateCreditRequest.vue](src/views/CreateCreditRequest.vue#L1-L220)
- Customer service: [src/services/CustomerService.js](src/services/CustomerService.js)

---

If you want, I can also create a companion review checklist note in the same style as the other presentation docs, or move on to the next component.
