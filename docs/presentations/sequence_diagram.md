# Sequence Diagrams: ระบบ CreditInsight

เอกสารนี้แสดง Sequence Diagrams ของระบบ CreditInsight ตามมาตรฐาน **UML 2.0** เพื่อใช้อธิบายลำดับการโต้ตอบระหว่าง Object หรือ Component ต่างๆ ในระบบตามเส้นเวลา (Timeline)

เนื่องจากระบบมีการทำงานที่ซับซ้อน จึงได้ทำการแบ่ง Diagram ออกเป็น 3 ส่วนหลักตาม Business Workflow โดยนำเสนอในระดับ Technical Architecture (Frontend, Backend API, Database, External Systems)

**Participants (องค์ประกอบหลักในระบบ):**
* `Actor`: ผู้ใช้งานระบบ (เช่น ผู้จัดการสาขา, ผู้อนุมัติ)
* `Frontend (Vue.js)`: ระบบหน้าบ้านที่ทำงานบน Browser (Pinia Store, Vue Components)
* `Backend (Node.js/Express)`: ระบบหลังบ้านที่จัดการ Business Logic และ API
* `Database (MSSQL/SQLite)`: ฐานข้อมูลของระบบ
* `External System`: ระบบภายนอก (SSO, ERP, DBD)

---

## 1. Authentication & Authorization Flow
แสดงกระบวนการเมื่อผู้ใช้งานเข้าสู่ระบบผ่าน SSO และระบบทำการดึงข้อมูลสิทธิ์ (RBAC Matrix) เพื่ออนุญาตการเข้าถึง

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

    User->>Vue: เปิดหน้าเว็บและกรอกรหัสพนักงาน + รหัสผ่าน
    Vue->>SSO: ส่งข้อมูล Credential เพื่อยืนยันตัวตน (POST)
    activate SSO

    alt Authentication Failed
        SSO-->>Vue: 401 Unauthorized
        Vue-->>User: แสดงข้อความ "ข้อมูลเข้าสู่ระบบไม่ถูกต้อง"
    else Authentication Success
        SSO-->>Vue: 200 OK (พร้อม JWT / Token)
        deactivate SSO

        Vue->>API: ขอข้อมูล Role และ RBAC Matrix (GET /api/config/rbac)
        activate API
        API->>DB: Query `RolePermissions` & `Configurations`
        activate DB
        DB-->>API: คืนค่า JSON Matrix Configuration
        deactivate DB
        API-->>Vue: 200 OK (JSON RBAC Matrix)
        deactivate API

        Vue->>Vue: นำ Matrix โหลดเข้าสู่ `rbacStore` (Pinia)
        Vue-->>User: แสดง Dashboard และเมนูตามสิทธิ์ (Role-based Menu)
    end
```

---

## 2. Request Creation & Automated Scoring Flow
แสดงกระบวนการสร้างคำขอเครดิตของผู้จัดการสาขา เริ่มตั้งแต่ค้นหาลูกค้า (ดึง ERP), บันทึกแบบร่าง (Draft), จนถึงส่งคำขอ (ประมวลผล Scoring อัตโนมัติ)

```mermaid
sequenceDiagram
    autonumber
    actor BM as ผู้จัดการสาขา

    box rgb(240, 248, 255) CreditInsight System
        participant Vue as Frontend (Vue.js)
        participant API as Backend (Node.js)
        participant DB as Database
    end

    participant ERP as ระบบ ERP/UXP

    %% 1. Search & ERP Data Fetching
    BM->>Vue: กรอกเลขประจำตัวลูกค้า (ค้นหา)
    Vue->>API: GET /api/customers/:id
    activate API
    API->>DB: Query ข้อมูลลูกค้าเบื้องต้น
    DB-->>API: ข้อมูลลูกค้า
    API->>ERP: Request ประวัติการซื้อและชำระเงิน 3 เดือนย้อนหลัง
    activate ERP
    ERP-->>API: ข้อมูล Invoice & Payment History
    deactivate ERP
    API-->>Vue: 200 OK (รวมข้อมูลลูกค้าและ ERP)
    deactivate API
    Vue-->>BM: แสดงโปรไฟล์ลูกค้าและประวัติการซื้อ

    %% 2. Create Request & Draft
    BM->>Vue: กดสร้างคำขอและกรอกข้อมูลงบการเงิน

    opt บันทึกฉบับร่าง (Save Draft)
        BM->>Vue: กดปุ่ม "บันทึกฉบับร่าง"
        Vue->>Vue: แปลงฟอร์มเป็น Snapshot JSON
        Vue->>API: POST /api/credit-requests/draft
        API->>DB: บันทึกเข้าตารางสถานะ 'Draft'
        DB-->>API: บันทึกสำเร็จ
        API-->>Vue: 200 OK
        Vue-->>BM: แสดงข้อความ "บันทึกร่างสำเร็จ"
    end

    %% 3. Form Validation & File Upload
    BM->>Vue: แนบไฟล์เอกสาร
    Vue->>API: POST /api/upload (Multer)
    API-->>Vue: URL/Path ของไฟล์แนบ

    BM->>Vue: กดปุ่ม "ส่งคำขอ (Submit)"
    Vue->>Vue: Validate Mandatory Fields (เช็คความครบถ้วน)

    %% 4. Scoring & Submission
    alt ข้อมูลไม่ครบถ้วน
        Vue-->>BM: แสดง Error ชี้จุดที่ต้องแก้ไข (Highlight Red)
    else ข้อมูลครบถ้วน
        Vue->>API: POST /api/credit-requests
        activate API

        %% Scoring Engine Logic
        API->>DB: ดึงตั้งค่าคะแนน (Scorecard Config JSON)
        DB-->>API: JSON Weights & Factors
        API->>API: คำนวณคะแนนรวม (Total Score) และ Grade
        API->>API: คำนวณวงเงินแนะนำตามสูตร: BaseLimit * (Score/200)^Exponent

        %% Save & Workflow Transition
        API->>DB: บันทึกคำขอ, แนบ Score, และตั้งสถานะเป็น 'Pending Review'
        DB-->>API: บันทึกสำเร็จ
        API-->>Vue: 201 Created
        deactivate API
        Vue-->>BM: นำทางกลับหน้าจอรายการคำขอ
    end
```

---

## 3. Review & Approval Workflow
แสดงกระบวนการผู้ตรวจสอบ/ผู้อนุมัติทำการเปิดอ่านคำขอ ตรวจสอบวงเงินแนะนำ และทำการตัดสินใจ (อนุมัติ/ปรับแก้/ปฏิเสธ) พร้อมระบบ Audit Trail และแจ้งเตือน

```mermaid
sequenceDiagram
    autonumber
    actor App as ผู้อนุมัติ <br>(ผจก.การเงิน / กรรมการ)

    box rgb(240, 248, 255) CreditInsight System
        participant Vue as Frontend (Vue.js)
        participant API as Backend (Node.js)
        participant DB as Database
    end

    %% 1. View Pending List & Open Request
    App->>Vue: เข้าหน้า "รายการเอกสารรออนุมัติ"
    Vue->>API: GET /api/credit-requests?status=pending
    API->>DB: Query กรองข้อมูลตามเขต (Region) และ Role
    DB-->>API: รายการคำขอ
    API-->>Vue: 200 OK (List of Requests)
    Vue-->>App: แสดงตารางข้อมูล

    App->>Vue: คลิกเปิดอ่านคำขอ (Review Dashboard)
    Vue->>API: GET /api/credit-requests/:id
    API-->>Vue: 200 OK (Full Request Data, Snapshot, Score)
    Vue-->>App: แสดงข้อมูลคำขอและวงเงินแนะนำ (System Recommendation)

    %% 2. Decision Making
    App->>Vue: พิมพ์ความเห็นและเลือกการกระทำ (Action)

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

    %% 3. Backend Processing & Notification
    activate API
    API->>DB: อัปเดตสถานะคำขอและแนบ Audit Trail Comment
    DB-->>API: บันทึกสำเร็จ

    %% Notification Trigger
    API->>DB: สร้าง Record ในตาราง Notifications (แจ้งกลับสาขา หรือ Role ถัดไป)
    DB-->>API: สร้างแจ้งเตือนสำเร็จ
    API-->>Vue: 200 OK (อัปเดตสถานะเรียบร้อย)
    deactivate API

    Vue-->>App: แสดง SweetAlert Success และพาคลับหน้าหลัก
```
