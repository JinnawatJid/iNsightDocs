# Sequence Diagrams: ระบบ CreditInsight

เพื่ออธิบายลำดับการแลกเปลี่ยนข้อมูลระหว่างผู้ใช้งาน ระบบส่วนติดต่อผู้ใช้ (Frontend) ระบบประมวลผล (Backend) ฐานข้อมูล (Database) และระบบภายนอก โดยแสดงลำดับการเรียกใช้งาน การประมวลผล และการตอบกลับของแต่ละองค์ประกอบในกระบวนการหลักของระบบ CreditInsight เพื่อให้เห็นภาพการทำงานของระบบตั้งแต่การเข้าสู่ระบบ การสร้างคำขอ การประเมินความเสี่ยง ไปจนถึงกระบวนการอนุมัติ

**Participants (องค์ประกอบหลักในระบบ):**
* `Actor`: ผู้ใช้งานระบบ (เช่น ผู้จัดการสาขา, ผู้อนุมัติ)
* `Frontend (Vue.js)`: ระบบหน้าบ้านที่ทำงานบน Browser (Pinia Store, Vue Components)
* `Backend (Node.js/Express)`: ระบบหลังบ้านที่จัดการ Business Logic และ API
* `Database (MSSQL/SQLite)`: ฐานข้อมูลของระบบ
* `External System`: ระบบภายนอก (SSO, UXP, DBD)

---

## 1. กระบวนการยืนยันตัวตนและจัดการสิทธิ์ (Authentication & Authorization Flow)
แสดงขั้นตอนการเข้าสู่ระบบ โดยระบบจะตรวจสอบ Token และ Redirect ไปยัง SSO ภายนอกหากยังไม่ได้ยืนยันตัวตน จากนั้น Backend จะทำการ Decode JWT และดึงสิทธิ์ (RBAC Matrix) ส่งกลับให้ Frontend เพื่อแสดงเมนูตามบทบาท

```mermaid
sequenceDiagram
    autonumber
    actor User as ผู้ใช้งาน

    box rgb(240, 248, 255) CreditInsight System
        participant Vue as Frontend (Vue.js)
        participant API as Backend (Node.js)
        participant DB as Database
    end

    participant SSO as ระบบ SSO ขององค์กร

    User->>Vue: เปิดหน้าเว็บแอปพลิเคชัน
    activate Vue
    Vue->>Vue: Router Check (beforeEach) ตรวจสอบ Token

    alt ไม่มี Token หรือ Token หมดอายุ (Not Authenticated)
        Vue->>SSO: พาผู้ใช้ไปยังหน้า Login ขององค์กร (Redirect)
        activate SSO

        User->>SSO: กรอกรหัสพนักงาน + รหัสผ่านบนเว็บ SSO

        alt Authentication Failed
            SSO-->>User: แสดงข้อความแจ้งเตือนรหัสผิด (บนหน้า SSO)
        else Authentication Success
            SSO-->>Vue: Redirect กลับมาพร้อม JWT Token (Callback)
            deactivate SSO
        end
    else มี Token อยู่แล้ว (Already Authenticated)
        Vue->>Vue: ข้ามขั้นตอน SSO
    end

    %% Proceed to RBAC Loading regardless of whether token came from SSO or cache
    Vue->>API: ขอข้อมูล Role และ RBAC Matrix (GET /api/config/rbac พร้อมแนบ Token)
    activate API
    API->>API: Decode JWT เพื่อตรวจสอบสิทธิ์เบื้องต้น (ไม่จำกัดเฉพาะการ Sign)
    API->>DB: Query `RolePermissions` & `Configurations`
    activate DB
    DB-->>API: คืนค่า JSON Matrix Configuration
    deactivate DB
    API-->>Vue: 200 OK (JSON RBAC Matrix)
    deactivate API

    Vue->>Vue: นำ Matrix โหลดเข้าสู่ `rbacStore` (Pinia)
    Vue-->>User: แสดง Dashboard และเมนูตามสิทธิ์ (Role-based Menu)
    deactivate Vue
```

---

## 2. กระบวนการสร้างคำขอ (Request Creation Flow)
อธิบายลำดับตั้งแต่ผู้จัดการสาขาค้นหาลูกค้าผ่าน UXP การดึงประวัติการซื้อขาย การบันทึกแบบร่าง ไปจนถึงการแนบไฟล์เอกสารต่างๆ เพื่อเตรียมพร้อมสำหรับการส่งประเมิน

```mermaid
sequenceDiagram
    autonumber
    actor BM as ผู้จัดการสาขา

    box rgb(240, 248, 255) CreditInsight System
        participant Vue as Frontend (Vue.js)
        participant API as Backend (Node.js)
        participant DB as Database
    end

    participant UXP as ระบบ UXP

    %% 1. Search & UXP Data Fetching
    BM->>Vue: กรอกเลขประจำตัวลูกค้า (ค้นหา)
    activate Vue
    Vue->>API: GET /api/customers/:id
    activate API
    API->>DB: Query ข้อมูลลูกค้าเบื้องต้น
    activate DB
    DB-->>API: ข้อมูลลูกค้า
    deactivate DB
    API->>UXP: Request ประวัติการซื้อและชำระเงิน 3 เดือนย้อนหลัง
    activate UXP
    UXP-->>API: ข้อมูล Invoice & Payment History
    deactivate UXP
    API-->>Vue: 200 OK (รวมข้อมูลลูกค้าและ UXP)
    deactivate API
    Vue-->>BM: แสดงโปรไฟล์ลูกค้าและประวัติการซื้อ
    deactivate Vue

    %% 2. Create Request & Draft
    BM->>Vue: กดสร้างคำขอและกรอกข้อมูลงบการเงิน
    activate Vue

    opt บันทึกฉบับร่าง (Save Draft)
        BM->>Vue: กดปุ่ม "บันทึกฉบับร่าง"
        Vue->>Vue: แปลงฟอร์มเป็น Snapshot JSON
        Vue->>API: POST /api/credit-requests/draft
        activate API
        API->>DB: บันทึกเข้าตารางสถานะ 'Draft'
        activate DB
        DB-->>API: บันทึกสำเร็จ
        deactivate DB
        API-->>Vue: 200 OK
        deactivate API
        Vue-->>BM: แสดงข้อความ "บันทึกร่างสำเร็จ"
    end
    deactivate Vue

    %% 3. File Upload
    BM->>Vue: แนบไฟล์เอกสาร
    activate Vue
    Vue->>API: POST /api/upload (Multer)
    activate API
    API-->>Vue: URL/Path ของไฟล์แนบ
    deactivate API
    deactivate Vue
```

---

## 3. กระบวนการประเมินความเสี่ยง (Automated Scoring Flow)
อธิบายลำดับการทำงานเมื่อผู้ใช้งานกดส่งคำขอ ระบบจะทำการตรวจสอบความถูกต้องของข้อมูลเบื้องต้น (Validation) ก่อนให้ Backend คำนวณคะแนนความเสี่ยงและวงเงินแนะนำอัตโนมัติตาม Scorecard

```mermaid
sequenceDiagram
    autonumber
    actor BM as ผู้จัดการสาขา

    box rgb(240, 248, 255) CreditInsight System
        participant Vue as Frontend (Vue.js)
        participant API as Backend (Node.js)
        participant DB as Database
    end

    %% 1. Submit Request
    BM->>Vue: กดปุ่ม "ส่งคำขอ (Submit)"
    activate Vue
    Vue->>Vue: Validate Mandatory Fields (เช็คความครบถ้วน)

    %% 2. Scoring & Submission
    alt ข้อมูลไม่ครบถ้วน
        Vue-->>BM: แสดง Error ชี้จุดที่ต้องแก้ไข (Highlight Red)
    else ข้อมูลครบถ้วน
        Vue->>API: POST /api/credit-requests
        activate API

        %% Scoring Engine Logic
        API->>DB: ดึงตั้งค่าคะแนน (Scorecard Config JSON)
        activate DB
        DB-->>API: JSON Weights & Factors
        deactivate DB
        API->>API: คำนวณคะแนนรวม (Total Score) และ Grade
        API->>API: คำนวณวงเงินแนะนำตามสูตร: BaseLimit * (Score/200)^Exponent

        %% Save & Workflow Transition
        API->>DB: บันทึกคำขอ, แนบ Score, และตั้งสถานะเป็น 'Pending Review'
        activate DB
        DB-->>API: บันทึกสำเร็จ
        deactivate DB
        API-->>Vue: 201 Created
        deactivate API
        Vue-->>BM: นำทางกลับหน้าจอรายการคำขอ
    end
    deactivate Vue
```

---

## 4. กระบวนการพิจารณาคำขอ (Review Process Flow)
แสดงการทำงานของผู้อนุมัติที่เข้ามาดูรายการคำขอ เปิดอ่านรายละเอียด และตรวจสอบวงเงินแนะนำที่ระบบคำนวณไว้ให้ เพื่อใช้ประกอบการตัดสินใจ

```mermaid
sequenceDiagram
    autonumber
    actor App as ผู้อนุมัติ <br>(ผจก.การเงิน / กรรมการ)

    box rgb(240, 248, 255) CreditInsight System
        participant Vue as Frontend (Vue.js)
        participant API as Backend (Node.js)
        participant DB as Database
    end

    %% 1. View Pending List
    App->>Vue: เข้าหน้า "รายการเอกสารรออนุมัติ"
    activate Vue
    Vue->>API: GET /api/credit-requests?status=pending
    activate API
    API->>DB: Query กรองข้อมูลตามเขต (Region) และ Role
    activate DB
    DB-->>API: รายการคำขอ
    deactivate DB
    API-->>Vue: 200 OK (List of Requests)
    deactivate API
    Vue-->>App: แสดงตารางข้อมูล
    deactivate Vue

    %% 2. Open Request
    App->>Vue: คลิกเปิดอ่านคำขอ (Review Dashboard)
    activate Vue
    Vue->>API: GET /api/credit-requests/:id
    activate API
    API-->>Vue: 200 OK (Full Request Data, Snapshot, Score)
    deactivate API
    Vue-->>App: แสดงข้อมูลคำขอและวงเงินแนะนำ (System Recommendation)
    deactivate Vue
```

---

## 5. กระบวนการอนุมัติและแจ้งเตือน (Approval & Notification Flow)
อธิบายลำดับเมื่อผู้อนุมัติตัดสินใจอนุมัติ ปรับแก้ หรือปฏิเสธ ระบบจะบันทึก Audit Trail เปลี่ยนสถานะในฐานข้อมูล และแจ้งเตือนกลับไปยังผู้สร้างหรือส่งต่อในลำดับถัดไป

```mermaid
sequenceDiagram
    autonumber
    actor App as ผู้อนุมัติ <br>(ผจก.การเงิน / กรรมการ)

    box rgb(240, 248, 255) CreditInsight System
        participant Vue as Frontend (Vue.js)
        participant API as Backend (Node.js)
        participant DB as Database
    end

    %% 1. Decision Making
    App->>Vue: พิมพ์ความเห็นและเลือกการกระทำ (Action)
    activate Vue

    alt ตัดสินใจ: ปฏิเสธ (Reject)
        App->>Vue: กดปุ่ม "ปฏิเสธคำขอ"
        Vue->>Vue: ตรวจสอบว่ากรอกเหตุผลแล้ว
        Vue->>API: PUT /api/credit-requests/:id/status (Rejected)
    else ตัดสินใจ: ปรับแก้ไขวงเงิน (Adjust)
        App->>Vue: แก้ไขยอดเงินที่อนุมัติ และกด "อนุมัติ"
        Vue->>Vue: รวบรวมข้อความความเห็น + "ปรับวงเงินจาก X เป็น Y" (Client-side Audit)
        Vue->>API: PUT /api/credit-requests/:id/status (Approved with changes)
    else ตัดสินใจ: อนุมัติวงเงินตามขอ (Approve as Requested)
        App->>Vue: กดปุ่ม "อนุมัติ" โดยไม่แก้ไขตัวเลข
        Vue->>Vue: รวบรวมข้อความความเห็น + "อนุมัติวงเงินที่ X" (Client-side Audit)
        Vue->>API: PUT /api/credit-requests/:id/status (Approved)
    end

    %% 2. Backend Processing & Notification
    activate API
    API->>DB: อัปเดตสถานะคำขอและแนบ Audit Trail Comment
    activate DB
    DB-->>API: บันทึกสำเร็จ
    deactivate DB

    %% Notification Trigger
    API->>DB: สร้าง Record ในตาราง Notifications (แจ้งกลับสาขา หรือ Role ถัดไป)
    activate DB
    DB-->>API: สร้างแจ้งเตือนสำเร็จ
    deactivate DB
    API-->>Vue: 200 OK (อัปเดตสถานะเรียบร้อย)
    deactivate API

    Vue-->>App: แสดง SweetAlert Success และพาคลับหน้าหลัก
    deactivate Vue
```
