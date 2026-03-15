# คู่มือการเชื่อมต่อระบบ Authentication ด้วย JWT Cookie

เอกสารฉบับนี้อธิบาย Flow การทำงานระหว่าง **Insight Docs (Service Provider)** และ **Exchange Platform (Identity Provider)** โดยใช้รูปแบบการแชร์ Token ผ่าน Cookie

เอกสารนี้อธิบาย:
1. **ส่วนที่ 1:** สรุปภาพรวมการเข้าสู่ระบบ
2. **ส่วนที่ 2:** ข้อมูลเชิงเทคนิคสำหรับนักพัฒนา

---

## 📄 ส่วนที่ 1: สรุปภาพรวมแบบเข้าใจง่าย (High-Level Flow)

ระบบ Insight Docs ไม่มีหน้า Login เป็นของตัวเอง หากผู้ใช้เข้าสู่ระบบครั้งแรก จะถูกส่งไปที่หน้าต่างของ **Exchange Platform (Central Portal)**

1. **เข้าใช้งานครั้งแรก:** ผู้ใช้เข้า URL ของระบบ Insight Docs (เช่น `http://192.192.0.37:3000/create-credit-request`)
2. **ตรวจสอบสิทธิ์ (ไม่พบ):** ระบบ Insight Docs จะไม่พบ Cookie ที่ชื่อ `token`
3. **ส่งตัวไป Login:** ระบบจะพาผู้ใช้ไปยังหน้า Login ของ Exchange Platform: `http://192.192.0.37:53683/login?redirect=http://192.192.0.37:3000/create-credit-request&appName=Smart+Credit+Application`
4. **Login สำเร็จ:** Exchange Platform จะทำการตรวจสอบ Username/Password และสร้าง **JWT (JSON Web Token)**
5. **ส่งกลับเข้าระบบ:** Exchange Platform จะบันทึก JWT ไว้ใน **Cookie ที่ชื่อ `token`** และ Redirect ผู้ใช้กลับมาที่ระบบ Insight Docs (`http://192.192.0.37:3000/create-credit-request`)
6. **เข้าใช้งานได้:** Insight Docs จะอ่าน Cookie ดังกล่าว และดึงข้อมูลผู้ใช้มาใช้งาน (เช่น `userId`, `username`, `roles`, `branchCode`)

*หมายเหตุ: ในการใช้งานครั้งต่อไป หาก Cookie `token` ยังไม่หมดอายุ ผู้ใช้จะเข้าใช้งานระบบได้ทันทีโดยไม่ต้อง Login ซ้ำ*

---

## 💻 ส่วนที่ 2: ขั้นตอนเชิงเทคนิค (Technical Implementation Guide)

*เหมาะสำหรับทีมนักพัฒนา (Developer) ฝั่ง Insight Docs*

### 1. โครงสร้างของ JWT (Payload)
JWT ที่ถูกส่งกลับมาใน Cookie `token` (Sign ด้วยอัลกอริทึม RS256) จะมีหน้าตาดังนี้:

```json
{
  "sub": "20614",
  "userId": 564,
  "username": "20614",
  "roles": [
    {
      "app": "Smart Credit Application",
      "role": "ผู้สร้างคำขอ (เครดิตใหม่/ปรับปรุง)"
    }
  ],
  "branchCode": "00TR",
  "iss": "CentralPortal",
  "aud": "https://localhost:9443/oauth2/token",
  "groups": [
    "app_subscriber"
  ],
  "scope": "full_access",
  "iat": 1773578587,
  "exp": 1773585787
}
```

### 2. ฝั่ง Frontend (Vue.js)

1. **การตรวจสอบสิทธิ์:**
   - ใช้ `vue-router` Navigation Guard (`beforeEach`)
   - อ่านค่า `token` จาก Cookie (เช่นใช้ไลบรารี `js-cookie`)
   - หากไม่มี Cookie นี้ ให้บังคับ Redirect ไปที่:
     `http://192.192.0.37:53683/login?redirect={CURRENT_URL}&appName=Smart+Credit+Application`

2. **การถอดรหัส (Decode):**
   - เมื่อมี Cookie ให้ใช้ `jwt-decode` ถอดรหัส JWT (เฉพาะส่วน Payload) โดยไม่ต้อง Verify Signature บนฝั่ง Frontend เพื่อนำข้อมูล `userId`, `username`, `roles` มาแสดงผล หรือบันทึกลงใน Pinia Store
   - ในการเชื่อมต่อกับ Backend (Axios), Frontend สามารถส่ง Request ไปตามปกติ โดยระบุ `withCredentials: true` เพื่อให้เบราว์เซอร์แนบ Cookie `token` ไปกับทุกๆ HTTP Request หรือสามารถดึงค่าจาก Cookie มาใส่เป็น Header `Authorization: Bearer <Token>` อย่างชัดเจน

### 3. ฝั่ง Backend (Node.js/Express)

1. **Auth Middleware (`authMiddleware.js`):**
   - ตรวจสอบ Request ที่เข้ามายัง Protected Routes (เช่น `/api/customers`, `/api/credit-requests`)
   - ค้นหา Token ได้จาก 2 ช่องทาง:
     1. Header `Authorization: Bearer <Token>`
     2. Cookie ที่ชื่อ `token` (ผ่านไลบรารี `cookie-parser`)
   - หากไม่พบ ให้ตอบกลับ `401 Unauthorized`

2. **การ Verify Token:**
   - **(ปัจจุบัน):** เพื่อความรวดเร็วในการ Implement ชั้นต้น จะใช้คำสั่ง `jwt.decode(token)` (ไม่มีการ Verify Signature ด้วย Public Key ของตัวแม่) และนำข้อมูล Payload ไปผูกกับตัวแปร `req.user`
   - **(อนาคต):** เพื่อความปลอดภัยระดับ Production ควรเปลี่ยนไปใช้ `jwt.verify(token, PUBLIC_KEY, { algorithms: ['RS256'] })` โดยรับ Public Key (JWKS) จาก URL ของ Identity Provider

3. **การเปิด/ปิดระบบ Authentication (สำหรับทดสอบ)**
   - ระบบนี้สามารถถูกปิด (Bypass) ได้ชั่วคราว หากเซิร์ฟเวอร์มีปัญหาหรือต้องการข้ามขั้นตอน Login ในช่วงการทดสอบ (UAT)
   - การปิดระบบทำได้โดยกำหนดค่าตัวแปร `ENABLE_AUTH=false` ในไฟล์ `backend/.env` ของฝั่ง Backend เพียงที่เดียว
   - **เมื่อกำหนดค่าเป็น `false`:**
     - ฝั่ง Frontend จะทำการเรียก API `GET /api/config/auth` ตอนเปิดหน้าเว็บเพื่อเช็คสถานะ หากพบว่าปิดอยู่ จะข้ามการเช็ค Navigation Guard ใน Vue Router ทันที
     - ฝั่ง Backend จะข้ามการเช็ค Token และจ่ายค่า Mock User ปลอม (`{ username: "DEV_MODE_USER", branchCode: "00TR", ... }`) เข้าไปที่ `req.user` ทันทีเพื่อให้ API เดินหน้าต่อได้โดยไม่พัง

4. **การใช้งานภายใน Endpoint:**
   - Endpoint สามารถเข้าถึงข้อมูลผู้ใช้ (เช่น รหัสพนักงาน, สาขา) ผ่าน `req.user` ได้ทันที (เช่น `req.user.username` หรือ `req.user.branchCode`)
