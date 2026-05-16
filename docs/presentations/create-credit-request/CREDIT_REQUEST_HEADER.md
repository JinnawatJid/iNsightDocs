# CreditRequestHeader Component — Overview & Component Map
> `src/components/credit/dashboard/CreditRequestHeader.vue`

---

## Component Map (ภาพรวม)

```
[CreditRequestHeader.vue]  ← UI Orchestrator — ควบคุม 3 state + emit events
     │
     ├── src/stores/creditRequest.js     ← state หลักของระบบ
     │        └── hasSearched            ← ควบคุม state ของ Action Panel
     │        └── customer               ← ข้อมูลลูกค้าที่เลือก (current_credit_limit ฯลฯ)
     │        └── transactionData        ← requestType ที่เลือก
     │        └── updateTransactionData() ← อัปเดต requestType ใน store
     │        └── saveTransactionData()  ← บันทึกลง DB (เรียกเมื่อมี requestId)
     │
     ├── src/stores/rbac.js              ← ตรวจสอบสิทธิ์
     │        └── hasPermission('create_request') ← guard ทั้ง Action Panel
     │
     ├── src/stores/auth.js              ← feature flags
     │        └── projectCreditEnabled   ← เปิด/ปิด menu item "เครดิตโครงการ"
     │
     ├── src/services/CustomerService.js ← ดึง suggestions จาก backend
     │        └── getSuggestions(query)  → GET /api/customers/search?q=...
     │
     └── src/components/shared/MultiSelectDropdown.vue  ← dropdown เลือก requestType (State 3)

[Backend — รับ search request]
     └── backend/controllers/customerController.js
              └── searchCustomers()
                    ├── Path A: External NAV API (primary)
                    └── Path B: Local DB Fallback (ถ้า API ล้มเหลว)
```

---

## ไฟล์ที่เกี่ยวข้องและหน้าที่

| ไฟล์ | Layer | หน้าที่ |
|---|---|---|
| `src/components/credit/dashboard/CreditRequestHeader.vue` | Frontend / Component | UI Orchestrator — search input, suggestions, action panel (3 states) |
| `src/stores/creditRequest.js` | Frontend / Store | state หลัก — เก็บ customer, hasSearched, transactionData |
| `src/stores/rbac.js` | Frontend / Store | ตรวจสอบสิทธิ์ — guard action panel ด้วย `hasPermission('create_request')` |
| `src/stores/auth.js` | Frontend / Store | feature flags — `projectCreditEnabled` เพื่อควบคุม menu item |
| `src/services/CustomerService.js` | Frontend / Service | wrapper สำหรับ HTTP call ไปยัง `/api/customers/search` |
| `src/components/shared/MultiSelectDropdown.vue` | Frontend / Component | dropdown เลือกประเภทคำขอ (ใช้ใน State 3) |
| `backend/controllers/customerController.js` | Backend / Controller | รับ search query → ค้นหา NAV API หรือ local DB → return list |

---

## 3 States ของ Action Panel (ด้านขวา)

Action Panel ทั้งหมดจะแสดงเฉพาะเมื่อ `rbacStore.hasPermission('create_request')` เท่านั้น

| State | เงื่อนไข | แสดงอะไร |
|---|---|---|
| **State 1: Placeholder** | `hasSearched = false` (ยังไม่ได้ค้นหา) | ข้อความ "กรุณาค้นหาลูกค้าก่อน..." (disabled) |
| **State 2: Start Button** | `hasSearched = true` และ `isRequestStarted = false` (เลือกลูกค้าแล้ว ยังไม่เริ่มคำขอ) | ปุ่ม "+ เพิ่มคำขอเครดิตใหม่" + Popover Menu |
| **State 3: Form Mode** | `isRequestStarted = true` (เริ่มกรอกฟอร์มแล้ว) | MultiSelectDropdown เลือกประเภทคำขอ |

```
[User ยังไม่ค้นหา]
        ↓  ค้นหาและเลือกลูกค้า (emit 'search')
[State 1 → State 2]  hasSearched = true
        ↓  กดปุ่ม "+ เพิ่มคำขอ" → toggleMenu()
[Popover Menu เปิด]  → เลือกประเภทคำขอ → handleMenuSelect() → emit('start-request', type)
        ↓  parent รับ event → isRequestStarted = true (prop)
[State 2 → State 3]  MultiSelectDropdown ปรากฏ
```

---

## Search Flow (ส่วนซ้าย)

| Event | Trigger | ผล |
|---|---|---|
| `v-model="searchQuery"` | พิมพ์ข้อความ | bind 2-way กับ local `searchQuery` |
| `@input="onInput"` | กด keyboard / paste | ถ้า query ≥ 3 ตัว → เรียก `debouncedFetchSuggestions()` (300ms) |
| `@focus="onFocus"` | คลิกเข้า input | ถ้า query ≥ 3 ตัว → เรียก `fetchSuggestions()` ทันที |
| `@keyup.enter` | กด Enter | เรียก `performSearch()` → emit 'search' |
| `@click="performSearch"` | กดปุ่มค้นหา | เรียก `performSearch()` → emit 'search' |
| คลิก suggestion item | เลือก dropdown | `selectSuggestion()` → set searchQuery = item.id → emit 'search' |

**Debounce:** ใช้ `lodash/debounce` 300ms เพื่อไม่ให้ยิง API ทุกครั้งที่พิมพ์

```
พิมพ์ "สมชาย"
      ↓ onInput() → query ≥ 3
      ↓ debouncedFetchSuggestions() — รอ 300ms
      ↓ CustomerService.getSuggestions("สมชาย")
      ↓ GET /api/customers/search?q=สมชาย
      ↓ suggestions[] = results → showDropdown = true
```

---

## Popover Menu — Logic ควบคุม Menu Items

Menu items แต่ละตัวถูก enable/disable ตามค่า `currentLimit` ของลูกค้า:

```javascript
// currentLimit = creditStore.customer?.current_credit_limit
const canRequestNew      = currentLimit <= 0   // ลูกค้ายังไม่มีเครดิต
const canRequestExisting = currentLimit > 0    // ลูกค้ามีเครดิตอยู่แล้ว
```

| Menu Item | เงื่อนไข |
|---|---|
| เครดิตใหม่ | `canRequestNew` (currentLimit = 0) |
| เครดิตเพิ่ม | `canRequestExisting` (currentLimit > 0) |
| เปลี่ยนแปลงระยะเวลาเครดิต | `canRequestExisting` |
| เปลี่ยนแปลงเงื่อนไขการชำระเงิน | `canRequestExisting` |
| เครดิตโครงการ | `projectCreditEnabled` (feature flag จาก authStore) |

**Defense in Depth:** การ disable ใน UI และ guard ใน `handleMenuSelect()` ทำงานคู่กัน
```javascript
// handleMenuSelect() — JS guard (ป้องกันแม้ bypass UI)
if (type === 'เครดิตใหม่' && !canRequestNew.value) return;
if (type === 'เครดิตโครงการ' && !projectCreditEnabled.value) return;
```

---

## MultiSelectDropdown — Logic ควบคุม State 3

ประเภทคำขอแบ่งเป็น 2 กลุ่ม:

| กลุ่ม | ประเภท | กฎ |
|---|---|---|
| **Exclusive** | เครดิตใหม่, เครดิตโครงการ | เลือกได้อย่างเดียว — ถ้าเลือก → ล้างตัวอื่นทั้งหมด |
| **Combinable** | เครดิตเพิ่ม, เปลี่ยนแปลงระยะเวลา, เปลี่ยนแปลงเงื่อนไข | เลือกได้หลายตัวพร้อมกัน |

```javascript
// handleSelectionChange() — ตัวอย่าง logic
// ถ้าเลือก "เครดิตใหม่" → selectedTypes = ['เครดิตใหม่'] เท่านั้น
// ถ้าเลือก "เครดิตเพิ่ม" → เอา exclusive ออก → เหลือแต่ combinable
```

เมื่อ selectedTypes เปลี่ยน → `updateType()` → `creditStore.updateTransactionData({ requestType })` → บันทึกลง DB ถ้ามี requestId

---

## Props & Events

| Props | ชนิด | หน้าที่ |
|---|---|---|
| `isRequestStarted` | Boolean (default: false) | ควบคุม State 2 vs State 3 — ส่งมาจาก parent |

| Emits | เมื่อไหร่ | payload |
|---|---|---|
| `'search'` | กด Enter / กดปุ่ม / เลือก suggestion | `searchQuery` (string) |
| `'start-request'` | เลือก menu item แล้ว pass guard | `type` (string เช่น `'เครดิตใหม่'`) |

Parent (`CreateCreditRequest.vue`) รับ events เหล่านี้เพื่อ:
- `'search'` → เรียก `creditStore.searchCustomer(query)`
- `'start-request'` → set `isRequestStarted = true` + กำหนด requestType

---

## Backend Pattern — customerController.searchCustomers

```
GET /api/customers/search?q=<query>
        ↓
searchCustomers()
        ↓
[Decision 1] MOCK_EXTERNAL_APIS = true?
  YES → ข้ามไป DB path ทันที
  NO  → เรียก NAV API
            ↓ สำเร็จ
        return res.json(results)  ← จบ function ตรงนี้
            ↓ error
        ENABLE_LOCAL_FALLBACK = true?
          NO  → return 503
          YES → ไป DB path
        ↓
[DB Fallback] query local SQLite/MSSQL
        ↓ return res.json(results)
```

ทั้ง 2 path คืน response shape เดียวกัน แต่ต่างกันที่:
- API path: ข้อมูลน้อยกว่า ต้องยิง local DB เพิ่มอีก 2 ครั้ง (billing + authorized persons)
- DB path: ได้ข้อมูลครบในครั้งเดียว รวมถึง coordinates, landmarks, billing

---

## สรุปหลักการออกแบบ

1. **CreditRequestHeader เป็นแค่ UI Orchestrator** — ไม่มี business logic ของตัวเอง ทุก state อ่านจาก store
2. **RBAC เป็น gatekeeper** — `hasPermission('create_request')` ป้องกันทั้ง section ขวา ก่อนถึง logic ใดๆ
3. **Defense in Depth** — disabled class ใน template + guard ใน `handleMenuSelect()` ทำงานซ้อนกัน
4. **Debounce 300ms** — ลด API call ขณะพิมพ์ค้นหา
5. **Customer type (Company/Individual)** — ถูก classify โดย backend ด้วย `isCompanyByName()` จาก `nameNormalizer.js` ตาม keyword ใน customer name (ไม่ใช่ VAT number)
