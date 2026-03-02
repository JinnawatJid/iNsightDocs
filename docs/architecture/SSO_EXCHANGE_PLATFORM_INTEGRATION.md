# คู่มือการเชื่อมต่อระบบ Authentication และการจัดการ Session ข้ามระบบ (SSO & Cross-System Timeout)

เอกสารฉบับนี้อธิบาย Flow การทำงานระหว่าง **Insight Docs (Service Provider - ตัวลูก)** และ **Exchange Platform (Identity Provider - ตัวแม่)** โดยอ้างอิงจากมาตรฐานอุตสาหกรรม (Industry Standard: OAuth 2.0 / OpenID Connect และ Best Practices สำหรับการจัดการ Idle Timeout)

เอกสารนี้แบ่งออกเป็น 2 ส่วน:
1. **ส่วนที่ 1:** สรุปภาพรวมแบบเข้าใจง่าย (High-Level / Business Flow)
2. **ส่วนที่ 2:** ขั้นตอนเชิงเทคนิคและ API Contract (Technical Implementation Guide)

---

## 📄 ส่วนที่ 1: สรุปภาพรวมแบบเข้าใจง่าย (High-Level / Business Flow)

*เหมาะสำหรับนำเสนอผู้บริหาร อาจารย์ หรือตกลง Architecture ข้ามทีม*

**แนวคิดหลัก:**
เราจะมอง **Exchange Platform** เป็นเหมือน "ป้อมยามหน้าตึก (Identity Provider)" ที่มีหน้าที่ตรวจบัตรประชาชนและแจก "ป้ายห้อยคอ (Token)" ส่วน **Insight Docs** เป็นเหมือน "ห้องสมุดในตึก (Service Provider)" ที่มีหน้าที่แค่ขอดูหน้าป้ายห้อยคอ แต่ไม่ทำหน้าที่ออกป้ายเอง (ไม่มีระบบ Login ของตัวเอง)

### 1️⃣ การเข้าสู่ระบบ (Single Sign-On - SSO)
1. ผู้ใช้เดินมาเข้าห้องสมุด (เข้าเว็บ Insight Docs)
2. Insight Docs ขอดูบัตร แต่ผู้ใช้ไม่มี เลยบอกให้ "ไปติดต่อป้อมยามหน้าตึก (Exchange Platform)"
3. ผู้ใช้ทำการล็อกอินที่ Exchange Platform สำเร็จ
4. Exchange Platform ให้ "ป้ายห้อยคอ (Token)" และบอกให้เดินกลับมาที่ Insight Docs
5. Insight Docs ตรวจป้ายห้อยคอว่าถูกต้อง ก็อนุญาตให้เข้าใช้งานได้เลยโดยไม่ต้องพิมพ์รหัสผ่านอีก

### 2️⃣ การทำงานระหว่างวัน (Active Session & Heartbeat)
* **ปัญหาโลกแตก:** ถ้าป้อมยาม (Exchange Platform) ตั้งกฎว่า "ใครไม่มาติดต่อเกิน 15 นาที ถือว่ากลับบ้านแล้ว (Session Timeout)"... แต่ผู้ใช้นั่งอ่านหนังสืออยู่แต่ในห้องสมุด (Insight Docs) เป็นชั่วโมง! ป้อมยามจะเข้าใจผิดว่าคนนี้กลับบ้านไปแล้ว
* **ทางแก้มาตรฐาน (Heartbeat):** ห้องสมุด (Insight Docs) จะส่งข้อความ (Ping API) ไปบอกป้อมยามเป็นระยะๆ (เช่น ทุกๆ 5 นาที) ว่า *"เฮ้ย! นายนาย คนนี้ยังขยับตัวนั่งอ่านหนังสืออยู่ห้องเรานะ อย่าเพิ่งตัดชื่อเขาทิ้ง"*

### 3️⃣ การหมดเวลาหรือออกระบบ (Idle Timeout & Single Logout - SLO)
* ถ้าผู้ใช้หลับคาโต๊ะในห้องสมุดไป 15 นาที (ไม่มีการขยับเมาส์/คีย์บอร์ดในหน้าจอ Insight Docs)
* Insight Docs จะแจ้งเตือน ถ้าไม่มีการตอบสนอง จะทำการ **"ยึดป้ายห้อยคอคืน (Clear Token)"**
* **สำคัญมาก:** Insight Docs จะโทรไปบอกป้อมยาม (Exchange Platform) ด้วยว่า *"คนนี้หลับไปแล้วนะ เราเตะเขาออกแล้ว ช่วยตัดชื่อออกจากระบบส่วนกลางด้วยนะ (Single Logout)"* เพื่อความปลอดภัยขั้นสูงสุด

---

## 💻 ส่วนที่ 2: ขั้นตอนเชิงเทคนิคและ API Contract (Technical Implementation Guide)

*เหมาะสำหรับทีมนักพัฒนา (Developer) ฝั่ง Insight Docs และ Exchange Platform สำหรับตกลงการเขียนโค้ด*

**Architecture Pattern:** OAuth 2.0 / OpenID Connect (OIDC) - Authorization Code Flow with PKCE (หรือ Implicit Flow ขึ้นอยู่กับการตกลง)

*   **Identity Provider (IdP):** Exchange Platform
*   **Service Provider (SP):** Insight Docs

### Phase 1: การยืนยันตัวตน (Authentication Flow)

1. **[Insight Docs - Frontend] ตรวจสอบสถานะ**
   * ตรวจสอบว่าใน Memory/State มี Access Token หรือไม่
   * หากไม่มี (Unauthenticated) ให้บังคับ Redirect ผู้ใช้ไปที่หน้า Login ของฝั่งตัวแม่
   * **ตัวอย่าง URL:** `GET https://exchange-platform.com/login?redirect_uri=https://insight-docs.com/auth/callback`

2. **[Exchange Platform - Backend] รับรองสิทธิ์**
   * รับ Credential (Username/Password หรือการทำ SSO ของระบบเขา) -> ตรวจสอบสำเร็จ
   * Generate **JWT Access Token** (อายุสั้น เช่น 15 นาที) และ **Refresh Token** (อายุยาว เช่น 7 วัน)
   * ทำ HTTP 302 Redirect ผู้ใช้กลับมาที่ระบบเรา พร้อมแนบค่าที่จำเป็นมาด้วย
   * **ตัวอย่าง Redirect:** `302 Redirect -> https://insight-docs.com/auth/callback?token=<JWT_TOKEN_HERE>` (หรือส่งเป็น Authorization Code เพื่อให้หลังบ้าน Insight Docs ไปแลก Token เองเพื่อความปลอดภัยที่สูงกว่า)

3. **[Insight Docs - Frontend] รับ Token เข้าสู่ระบบ**
   * รับ Token จาก Callback URL
   * เก็บ **Access Token** ลงใน Memory (ห้ามเก็บใน LocalStorage ป้องกัน XSS)
   * แนบ Header: `Authorization: Bearer <Access Token>` ในทุกๆ Request ที่ยิงเข้า API หลังบ้านของ Insight Docs

4. **[Insight Docs - Backend] ตรวจสอบความถูกต้อง (Signature Verification)**
   * ทุกครั้งที่ได้รับ API Request พร้อม JWT
   * Insight Docs ต้องดึง **Public Key (JWKS)** จาก Exchange Platform มาแคชไว้ เพื่อแกะและ Verify ว่า Signature ของ JWT ตัวนี้ เป็นของแท้จาก Exchange Platform แน่นอน

---

### Phase 2: การซิงก์สถานะข้ามระบบ (Heartbeat / Session Keep-alive)

เพื่อแก้ปัญหา Cross-domain Idle Timeout (ระบบหนึ่งตื่น อีกระบบหลับ) ทั้งสองทีมต้องตกลงสร้าง API สื่อสารกัน:

1. **[Exchange Platform] เตรียม Endpoint สำหรับรับ Ping:**
   * **Endpoint:** `POST /api/v1/auth/heartbeat`
   * **Header Required:** `Authorization: Bearer <Access Token>`
   * **Action ที่คาดหวัง:** เมื่อระบบตัวแม่ได้รับ Request นี้ ให้นำ Session หรือ Refresh Token ของ User คนนี้มาขยายเวลาหมดอายุ (Extend TTL) เป็นเริ่มต้นใหม่ที่ 15 นาที (หรือตามนโยบาย) โดยไม่ต้องคืนค่าใดๆ กลับมานอกจาก HTTP 200 OK

2. **[Insight Docs - Frontend] การส่ง Ping:**
   * ใช้ JS ดักจับ DOM Events มาตรฐาน (`mousemove`, `keydown`, `click`, `scroll`, `touchstart`) ด้วยเทคนิค **Throttling** (หน่วงเวลา) ป้องกันปัญหา Performance
   * **Logic:** ถ้าระบบตรวจพบ Activity การใช้งานจริง ให้ทำการ `setInterval` (หรือยิง Request) ไปที่ `/api/v1/auth/heartbeat` ของ Exchange Platform **ทุกๆ 3-5 นาที** (ไม่ต้องยิงทุกวินาทีที่เมาส์ขยับ เพื่อประหยัด Network Request)

---

### Phase 3: การจัดการ Idle Timeout แบบสมบูรณ์ (Single Logout - SLO)

หากผู้ใช้ทิ้งหน้าจอ Insight Docs ไว้นานเกินขีดจำกัด (เช่น 15 นาที โดยไม่มี Activity):

1. **[Insight Docs - Frontend] ตรวจพบการหมดเวลา (Local Idle Timeout)**
   * JavaScript Timer ของเรานับถอยหลังถึง 0
   * Insight Docs ล้าง `Access Token` ออกจาก Memory ของฝั่งตัวเองทันที

2. **[Insight Docs - Frontend] ส่งคำสั่ง Single Logout (SLO) ไปส่วนกลาง**
   * เพื่อความปลอดภัยขั้นสุด ป้องกันไม่ให้ Refresh Token ที่อยู่ฝั่งตัวแม่นำกลับมาใช้ได้อีก
   * **ยิง Request:** `POST https://exchange-platform.com/api/v1/auth/logout`
   * **Action ของตัวแม่:** แก้ไขสถานะ `is_revoked = true` ในตาราง Refresh Tokens ของ Database และสั่งทำลาย HTTP-Only Cookie ทิ้ง

3. **[Insight Docs - Frontend] รีไดเรกต์ผู้ใช้**
   * เด้งหน้าจอผู้ใช้กลับไปที่ Landing Page หลัก หรือพาไปที่หน้า Login ของ Exchange Platform แจ้งว่า "เซสชันของคุณหมดอายุเนื่องจากไม่มีการใช้งาน"

> **ข้อควรระวัง (Edge Case):**
> หากผู้ใช้ปิดแท็บ Insight Docs ทิ้งไปดื้อๆ (ไม่มีโอกาสส่ง SLO) ฝั่ง Insight Docs จะไม่ได้ส่ง Heartbeat ไปอีก เมื่อครบเวลาที่กำหนด ฝั่ง Exchange Platform จะจัดการทำลาย Session ส่วนกลางทิ้งเองตาม TTL ของระบบ ซึ่งเป็นไปตามหลักการความปลอดภัยมาตรฐาน