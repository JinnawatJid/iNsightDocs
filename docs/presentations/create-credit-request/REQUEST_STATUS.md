
---

## Component Map (ภาพรวม)

```
[RequestStatus.vue]  ← display-only — ไม่มี logic ของตัวเอง
     │
     └── src/stores/creditRequest.js    ← `requestId`, `requestStatus` (source of truth)
```

---

## ไฟล์ที่เกี่ยวข้องและหน้าที่

| ไฟล์ | Layer | หน้าที่ |
|---|---|---|
| `src/components/credit/workflow/RequestStatus.vue` | Frontend / Component | แสดงเลขที่คำขอ, สถานะ (badge + icon) และปุ่ม export PDF |
| `src/stores/creditRequest.js` | Frontend / Store | เก็บ `requestId`, `requestStatus` และ action ที่เกี่ยวข้อง |
| `src/views/CreateCreditRequest.vue` | Frontend / View | แสดง RequestStatus เมื่อ `store.hasSearched` |

---

## RequestStatus — แสดงอะไรบ้าง

| ส่วน | แหล่งข้อมูล | เงื่อนไข/หมายเหตุ |
|---|---|---|
| เลขที่คำขอ (`requestId`) | `creditRequest` store | ถ้าไม่มีจะแสดง `-` |
| สถานะ (label + class + icon) | `creditRequest.requestStatus` → `statusConfig` | `currentStatus` fallback = `'Opened'` |
| ปุ่ม `PDF` | `requestId` + whitelist ของสถานะ | เปิดเมื่อ `showExportButton === true` (membership check กับ array ใน component) |

## statusConfig (mapping)

ตัวอย่าง mapping ที่มีใน component:

```
Opened → label: 'Opened', class: 'info', icon: file
Submitted → label: 'Submitted', class: 'warning', icon: clock
FinanceReviewed / Reviewed → label: 'Finance Reviewed'/'Reviewed', class: 'purple', icon: user
Approved → label: 'Approved', class: 'success', icon: check
Rejected / Canceled → label: 'Rejected'/'Canceled', class: 'error'/'gray', icon: x
Closed → label: 'Closed', class: 'dark', icon: file
```

หมายเหตุ: ป้ายข้อความปัจจุบันเป็นข้อความภาษาอังกฤษ — ถ้าต้องการ localization ให้ย้าย label เข้า i18n

---

## การทำงานของปุ่ม Export PDF

- `exportPDF()` ตรวจสอบ `store.requestId` → `encodeURIComponent(requestId)` → เปิด URL `/api/credit-requests/:id/pdf` ในแท็บใหม่ โดยใช้ `window.open`.
- ถ้า `requestId` ไม่มี จะ console.warn และไม่ทำอะไรต่อ

## การใช้งาน (where rendered)

- แสดงใน header ของหน้า create-request: `CreateCreditRequest.vue` (เมื่อ `store.hasSearched` เป็น `true`).

---

## ปัญหาเชิง edge-cases และข้อเสนอแนะสำหรับการรีวิว

- `requestStatus` เป็น `null`/undefined: component ใช้ fallback `'Opened'` สำหรับ label/class แต่ `showExportButton` เช็คค่าจริงจาก `store.requestStatus` — ตัดสินใจว่าจะอนุญาต export เมื่อใช้ fallback หรือไม่
- `requestId` หาย: ปัจจุบัน function แค่เตือนใน console — ควร disable ปุ่มจริง ๆ ทั้ง visual และ `aria-disabled`
- Status keys ที่มีคำอธิบายเสริม (เช่น `PendingSales (ชั่วคราว)`) ควร normalize ใน store เป็น key canonical แล้วให้ component แสดง label ที่เป็นมิตร
- Centralize export-status whitelist เป็น `Set`/constant ใน store หรือ config เพื่อให้ส่วนอื่นของแอพตรวจสอบได้ตรงกัน
- Accessibility: เพิ่ม `role=\"status\"` / `aria-live=\"polite\"` ให้กับ element แสดงสถานะ ถ้าสถานะสามารถเปลี่ยนได้ไดนามิก และเพิ่ม `aria-label` ให้ปุ่ม export
- Error handling: `window.open` อาจโดน popup blocker — ควรจับผลลัพธ์และแจ้งผู้ใช้ (notify) หากล้มเหลว

---

## ข้อเสนอแนะสำหรับการทดสอบ

- ทดสอบ mapping: สำหรับแต่ละ status canonical ให้ assert ว่า `statusLabel`/`statusClass`/`statusIcon` ถูกต้อง
- ทดสอบ `showExportButton`: รายการ status ใน whitelist => true, อื่น ๆ => false
- ทดสอบ `exportPDF`: เมื่อ `requestId='TX-123'` ควรเรียก `window.open` ด้วย URL ที่ถูก encode

---

## ถัดไป (options)

- เพิ่ม unit test scaffold สำหรับ `RequestStatus` (Jest + Vue Test Utils)
- Patch `RequestStatus.vue` เพื่อ harden accessibility และ defensive export behavior
