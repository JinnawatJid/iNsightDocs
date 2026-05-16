# CreditHistorySidebar Component — Overview & Component Map
> `src/components/credit/dashboard/CreditHistorySidebar.vue`

---

## Component Map (ภาพรวม)

```
[CreditHistorySidebar.vue]  ← display + UI interactions (history list, request selection)
     │
     ├── src/stores/creditRequest.js    ← source of truth: `history`, `loadRequestDetail()`
     └── src/utils/dateUtils.js         ← date normalization for display
```

---

## ไฟล์ที่เกี่ยวข้องและหน้าที่

| ไฟล์ | Layer | หน้าที่ |
|---|---|---|
| `src/components/credit/dashboard/CreditHistorySidebar.vue` | Frontend / Component | แสดงข้อมูลลูกค้า + รายการประวัติคำขอเครดิต และส่ง event เมื่อลูกค้าเลือก request |
| `src/stores/creditRequest.js` | Frontend / Store | เก็บ `history`, `loadRequestDetail(txId)` และข้อมูลคำขอที่ถูกเลือก |
| `src/views/CreateCreditRequest.vue` | Frontend / View | ส่ง props `customerName`, `customerCode`, `historyItems`, `searched` ให้ sidebar |
| `src/utils/dateUtils.js` | Frontend / Utility | แปลง/normalize วันที่ก่อนนำไป format แสดงผล |

---

## CreditHistorySidebar — แสดงอะไรบ้าง

| ส่วน | แหล่งข้อมูล | เงื่อนไข/หมายเหตุ |
|---|---|---|
| ชื่อลูกค้า | `customerName` prop | ถ้าไม่มีจะแสดง placeholder `-- ชื่อลูกค้า --` |
| รหัสลูกค้า | `customerCode` prop | แสดงเป็น `ID: ...` เมื่อมีค่า |
| จำนวนประวัติ | `historyItems.length` | แสดง `ทั้งหมด x รายการ` เมื่อมีรายการ |
| รายการประวัติ | `historyItems` prop | แต่ละ item แสดง request type, TxID/amount, request amount, date, status icon |
| สถานะว่าง | `searched` prop | ถ้าเคยค้นหาแล้วแต่ไม่มี history จะแสดงข้อความ `ไม่พบคำขอเครดิตก่อนหน้าในระบบ` |

## สถานะของรายการประวัติ

| สถานะ | การแสดงผล |
|---|---|
| `Opened`, `Submitted`, `Reviewed` | icon นาฬิกา (`clockIcon`) |
| `Rejected`, `Canceled` | icon ปฏิเสธ (`rejectedIcon`) |
| `Approved`, `Closed` | icon ผ่านแล้ว (`approvedIcon`) |
| `pending`, `rejected`, `approved` (legacy) | fallback icon ตาม legacy status |
| `Draft` | badge `Draft` |

หมายเหตุ: component รองรับทั้ง status แบบ canonical และ legacy lowercase เพื่อความเข้ากันได้กับข้อมูลเก่า

---

## พฤติกรรมของ component

- คลิกรายการประวัติจะเรียก `handleClick(item)`
- `handleClick(item)` จะใช้ `item.txId` เป็นหลัก และ fallback ไปที่ `item.amount` สำหรับข้อมูลเก่า
- ถ้ามี `txId` จะเรียก `store.loadRequestDetail(txId)` และ emit event `request-selected` กลับไปยัง parent
- มี click-outside behavior เฉพาะกลุ่มรายการ history/interaction และ UI เป็นแบบ card sidebar

---

## Logic สำคัญใน component

### `documents` ไม่มีที่นี่ แต่มี `historyItems` mapping

Component นี้ไม่ได้โหลดข้อมูลจาก API โดยตรง แต่รับข้อมูลที่ parent เตรียมไว้แล้ว และใช้ store เฉพาะตอนผู้ใช้เลือก request เพื่อโหลด detail เพิ่ม

### `getRequestTypeClass(type)`

Map request type → CSS class:

- `เครดิตเพิ่ม` → `type-increase`
- `เครดิตโครงการ` → `type-project`
- `เปลี่ยนแปลง...` → `type-change`
- default → `type-new`

### `formatDate(dateString)`

- ใช้ `normalizeDateString()` เพื่อพยายามแปลงวันที่ก่อน
- ถ้า parse ไม่ได้ จะ fallback เป็น raw string
- แสดงผลด้วย locale `th-TH`

### `formatCurrency(val)`

- ใช้แสดงวงเงินที่ขอเป็นเลขทศนิยม 2 ตำแหน่ง
- ถ้าค่าไม่ถูกต้องหรือว่างจะคืน `0.00`

---

## การใช้งาน (where rendered)

- แสดงใน layout ของหน้า create-request ผ่าน [src/views/CreateCreditRequest.vue](src/views/CreateCreditRequest.vue)
- Parent ส่ง props ดังนี้:
  - `customerName`
  - `customerCode`
  - `historyItems`
  - `searched`

## Data flow

```
User search customer
      ↓
creditRequest store.searchCustomer()
      ↓
store.history populated
      ↓
CreateCreditRequest.vue passes historyItems prop
      ↓
CreditHistorySidebar renders list
      ↓
User clicks item
      ↓
store.loadRequestDetail(txId)
      ↓
parent receives request-selected and switches view state
```

---

## ปัญหาเชิง edge-cases และข้อเสนอแนะสำหรับการรีวิว

- `handleClick(item)` fallback ไปที่ `item.amount` เมื่อไม่มี `txId` — อาจทำให้โหลดผิด request ได้ ถ้าข้อมูลเก่ามี amount ซ้ำกัน
- Component นี้เรียก `store.loadRequestDetail(txId)` โดยตรง ทำให้เกิด side effect ภายใน child component; อาจพิจารณาให้ parent เป็นคนควบคุม flow แบบเดียวกับ component อื่น ๆ
- `historyItems` เป็น prop ที่คาดว่ามาจาก store แล้ว แต่ไม่มี defensive guard ถ้ารายการไม่ใช่ array หรือมี shape ผิด
- สถานะ legacy (`pending`, `approved`, `rejected`) แสดงผลได้ แต่ควร normalize ที่ store ก่อนเพื่อให้ UI ใช้ key เดียวกัน
- Accessibility: รายการคลิกได้เป็น div ไม่ใช่ button — ควรเพิ่ม keyboard handling และ ARIA roles
- `img` icons ใช้ alt เป็น status text ได้ดี แต่ควรตรวจสอบให้มี fallback text สำหรับ screen reader ในทุกกรณี

---

## ข้อเสนอแนะสำหรับการทดสอบ

- ทดสอบ rendering: `customerName`/`customerCode`/`historyItems`/empty state ถูกต้องตาม props
- ทดสอบ `getRequestTypeClass()` สำหรับ request type หลักและค่า default
- ทดสอบ `formatDate()` กับ valid/invalid/empty input
- ทดสอบ `handleClick()` ว่าเรียก `store.loadRequestDetail(txId)` และ emit `request-selected`
- ทดสอบสถานะ legacy และ canonical เพื่อให้ icon ถูกต้อง

---

## Suggested small improvements

- แยก status mapping และ request-type mapping ไปไว้ใน shared config/module เพื่อ reuse กับ component อื่น
- เพิ่ม keyboard accessibility ให้รายการ click-able (`tabindex`, `role="button"`, Enter/Space handlers)
- เปลี่ยน `handleClick(item)` ให้ใช้ `txId` เท่านั้น หรือให้ parent provide a stable identifier for legacy rows
- เพิ่ม unit tests สำหรับ mapping logic และ click behavior

---

## Quick reference links

- Source component: [src/components/credit/dashboard/CreditHistorySidebar.vue](src/components/credit/dashboard/CreditHistorySidebar.vue#L1-L200)
- Parent view: [src/views/CreateCreditRequest.vue](src/views/CreateCreditRequest.vue#L1-L220)
- Store: [src/stores/creditRequest.js](src/stores/creditRequest.js#L1-L260)
- Date helper: [src/utils/dateUtils.js](src/utils/dateUtils.js)

---

If you want, I can also create a matching `docs/presentations/CREDIT_HISTORY_SIDEBAR.md` companion update for the review checklist, or move on to the next component.
