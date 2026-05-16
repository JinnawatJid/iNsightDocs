# Navbar Component — Overview & Component Map
> `src/components/shared/Navbar.vue`

---

## Component Map (ภาพรวม)

```
[Navbar.vue]  ← display only — ไม่มี logic ของตัวเอง
     │
     ├── src/stores/auth.js          ← ยืนยันตัวตน + จัดการ session
     │        └── initAuth()  → GET /api/auth/me
     │                ↓
     │        └── rbacStore.fetchRbacConfig()  ← เรียกต่อหลัง auth สำเร็จ
     │
     ├── src/stores/rbac.js          ← ตรวจสอบสิทธิ์
     │        └── fetchRbacConfig() → GET /api/config/rbac
     │        └── hasPermission(key) ← ควบคุม v-if ทุก nav link
     │
     └── src/stores/notification.js  ← notification bell
              └── startPolling() → GET /api/notifications ทุก 30 วินาที
              └── markAsRead()   → PUT /api/notifications/:id/read
              └── markAllAsRead() → PUT /api/notifications/read-all

[Backend]
     ├── backend/routes/authRoutes.js       → backend/controllers/ (auth)
     ├── backend/routes/configRoutes.js     → backend/controllers/configController.js
     └── backend/routes/notificationRoutes.js → backend/controllers/notificationController.js
```

---

## ไฟล์ที่เกี่ยวข้องและหน้าที่

| ไฟล์ | Layer | หน้าที่ |
|---|---|---|
| `src/components/shared/Navbar.vue` | Frontend / Component | แสดงผลเท่านั้น — logo, nav links, bell, user info, logout |
| `src/stores/auth.js` | Frontend / Store | จัดการ session ผู้ใช้ — ยืนยันตัวตน, logout, เก็บข้อมูล user/roles |
| `src/stores/rbac.js` | Frontend / Store | ตรวจสอบสิทธิ์ — เก็บ permission matrix, expose `hasPermission()` |
| `src/stores/notification.js` | Frontend / Store | จัดการ notification — polling, mark as read, unread count |
| `backend/routes/authRoutes.js` | Backend / Routes | map URL `/api/auth/*` → controller functions |
| `backend/routes/configRoutes.js` | Backend / Routes | map URL `/api/config/*` → controller functions |
| `backend/routes/notificationRoutes.js` | Backend / Routes | map URL `/api/notifications/*` → controller functions |
| `backend/controllers/configController.js` | Backend / Controller | query DB เพื่อดึง RBAC matrix, workflow config, feature flags |
| `backend/controllers/notificationController.js` | Backend / Controller | query DB เพื่อดึง/อัปเดต notifications ของ user |

---

## Navbar.vue — แสดงอะไรบ้าง

| ส่วน | เงื่อนไขการแสดงผล |
|---|---|
| Link "สร้างคำขอ / ค้นหาลูกค้า" | `rbacStore.hasPermission('page:create-credit')` |
| Link "คำขอทั้งหมด" | `rbacStore.hasPermission('page:pending-requests')` |
| Link "ระบบอัตโนมัติ" | `rbacStore.hasPermission('page:batch-automation')` |
| Link "ตั้งค่าระบบ" | `rbacStore.hasPermission('page:system-configuration')` หรือ `authStore.isAdmin` |
| Dev Role Switcher | แสดงเฉพาะเมื่อ `!authStore.authRequired` (dev mode เท่านั้น) |
| Notification Badge | แสดงเมื่อ `notificationStore.unreadCount > 0` |
| User Info | `authStore.user?.branchCode` + `username` + `empname` |

---

## auth.js — หน้าที่หลัก

| Action / Getter | ทำอะไร |
|---|---|
| `fetchAuthConfig()` | ดึง feature flags จาก `/api/config/auth` (เรียกก่อน initAuth เสมอ) |
| `initAuth()` | ยืนยัน session กับ backend → set `user`, `isAuthenticated` → เรียก rbac |
| `logout()` | POST logout ไปทั้ง backend + SSO hub → `clearAuth()` → redirect |
| `clearAuth()` | ล้าง state + ลบ cookies (`token`, `dev_role`) |
| `setDevRole()` | เปลี่ยน role ใน dev mode โดย set cookie แล้ว reload |
| `resolveBranchCode()` | แปลง `user.branches[0]` → branchCode (รองรับ SSO หลายรูปแบบ) |
| `isAdmin`, `isInitiator`, ... | getters — เช็ค role ของ user สำหรับส่วนอื่นของ app |

---

## rbac.js — หน้าที่หลัก

| Action / Getter | ทำอะไร |
|---|---|
| `fetchRbacConfig()` | ดึง permission matrix จาก `/api/config/rbac` → เก็บใน `matrixConfig` |
| `hasPermission(key)` | เช็คว่า role ของ user อยู่ใน matrix สำหรับ permission นั้นมั้ย → คืน `true`/`false` |
| `normalizeRoleName()` | map ชื่อ role เก่า → ชื่อ canonical ปัจจุบัน (แก้ปัญหา legacy role names) |

**หลักการ `hasPermission`:**
```
1. matrix โหลดยังไม่เสร็จ → return false (secure by default)
2. user ไม่มี roles → return false
3. วนทุก role ของ user → หาใน matrix → ถ้าเจอ permission key → return true
```

---

## notification.js — หน้าที่หลัก

| Action / Getter | ทำอะไร |
|---|---|
| `startPolling()` | fetch ทันที + ตั้ง interval 30 วินาที (เรียกโดย Navbar ตอน `mounted`) |
| `stopPolling()` | ยกเลิก interval (เรียกโดย Navbar ตอน `beforeUnmount`) |
| `fetchNotifications()` | GET `/api/notifications` → update `notifications[]` ใน state |
| `markAsRead(id)` | PUT `/api/notifications/:id/read` + update local state ทันที |
| `markAllAsRead()` | PUT `/api/notifications/read-all` + update local state ทันที |
| `unreadCount` | getter — นับ notifications ที่ `is_read == 0` |
| `sortedNotifications` | getter — เรียง newest-first ก่อน render ใน dropdown |

---

## Backend Pattern (Routes → Controller)

Routes ทำหน้าที่แค่ **map URL + middleware** ไปหา controller function:
```js
// configRoutes.js
router.get('/rbac', configController.getRbacConfig);       // public
router.get('/', checkIsAdmin, configController.getConfig);  // admin only
```

Controllers ทำหน้าที่ **รับ `req` → query DB → ส่ง `res`**:
```js
// configController.js (pattern ทั่วไป)
exports.getRbacConfig = async (req, res) => {
  const result = await db.query("SELECT config_value FROM Configurations WHERE ...");
  res.json({ success: true, data: result });
};
```

Logic จริงทั้งหมดอยู่ที่ **backend** — frontend เป็นแค่ "Thin Client" ที่รับข้อมูลมาแสดงผล
