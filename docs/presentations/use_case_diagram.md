# Use Case Diagram: ระบบ CreditInsight

เอกสารนี้แสดง Use Case Diagram ของระบบ CreditInsight โดยอ้างอิงจาก Business Requirements (BR.txt) ซึ่งจัดทำขึ้นตามมาตรฐานการออกแบบ (Industry Standard) โดยแบ่งออกเป็นภาพรวมระดับสูง (High-Level Context Diagram) และแบ่งย่อยตามระบบย่อย (Sub-systems) จำนวน 5 ส่วน เพื่อความชัดเจนในการทำความเข้าใจ

---

## 1. ภาพรวมระดับสูง (High-Level Context Diagram)
แสดงภาพรวมของระบบย่อย (Use Cases หลัก), Actors ที่โต้ตอบกับระบบ CreditInsight และการเชื่อมต่อไปยังระบบภายนอก

```mermaid
flowchart LR
    %% Styling
    classDef actorStyle fill:#f9f9f9,stroke:#333,stroke-width:2px;
    classDef systemStyle fill:#e1f5fe,stroke:#0288d1,stroke-width:2px;
    classDef useCaseStyle fill:#fff,stroke:#333,stroke-width:1px;

    %% Primary Actors
    BM(ผู้จัดการสาขา):::actorStyle
    App(ผู้อนุมัติ <br>ผจก.การเงิน / คณะกรรมการ):::actorStyle
    Rev(ผู้ตรวจสอบ <br>ผจก.ภูมิภาค / ผจก.ขาย / จนท.การเงิน):::actorStyle
    Admin(ผู้ดูแลระบบ):::actorStyle

    %% External Systems (Secondary Actors)
    SSO[[ระบบ SSO ขององค์กร]]:::systemStyle
    DBD[[ระบบ กรมพัฒนาธุรกิจการค้า DBD]]:::systemStyle
    ERP[[ระบบ ERP/UXP]]:::systemStyle

    %% System Boundary
    subgraph CreditInsight [ระบบ CreditInsight]
        direction TB
        UC1([เข้าสู่ระบบและการจัดการสิทธิ์]):::useCaseStyle
        UC2([ค้นหาและตรวจสอบสถานะลูกค้า]):::useCaseStyle
        UC3([สร้างและส่งคำขอเครดิต]):::useCaseStyle
        UC4([จัดการคำขอฉบับร่าง]):::useCaseStyle
        UC5([ประมวลผลคะแนนความเสี่ยงและดึงข้อมูลอัตโนมัติ]):::useCaseStyle
        UC6([พิจารณาและอนุมัติวงเงินเครดิต]):::useCaseStyle
        UC7([ดูรายการคำขอและติดตามสถานะ]):::useCaseStyle
        UC8([จัดการตั้งค่าระบบ]):::useCaseStyle
    end

    %% Actor Connections
    BM --> UC1
    App --> UC1
    Rev --> UC1
    Admin --> UC1

    BM --> UC2
    BM --> UC3
    BM --> UC4
    BM --> UC7

    App --> UC2
    App --> UC6
    App --> UC7

    Rev --> UC2
    Rev --> UC7

    Admin --> UC2
    Admin --> UC7
    Admin --> UC8

    %% Relationships and Includes/Extends
    UC1 -. "<< includes >>" .-> SSO
    UC3 -. "<< includes >>" .-> UC5

    %% System Connections
    UC5 --> DBD
    UC5 --> ERP
```

---

## 2. ระบบย่อยที่ 1: ระบบจัดการสิทธิ์เข้าใช้งาน (Authentication & Authorization)
อ้างอิง FR 1.1 - 1.2

**คำอธิบาย Diagram:**
ภาพนี้แสดงกระบวนการเมื่อ "ผู้ใช้งานทุกบทบาท" ทำการเข้าสู่ระบบ โดยมีกระบวนการที่ถูกบังคับทำ (`<<includes>>`) หรือเป็นขั้นตอนย่อยที่ขาดไม่ได้ 2 ส่วน ได้แก่:
1. **การยืนยันตัวตน (`<<includes>>` ระบบ SSO):** การเข้าสู่ระบบจะพึ่งพาระบบภายนอก คือ SSO ขององค์กรในการยืนยันตัวตนผู้ใช้งาน
2. **การกำหนดสิทธิ์ (`<<includes>>` ตรวจสอบสิทธิ์และแสดงเมนูตามบทบาท):** หลังจากยืนยันตัวตนผ่าน SSO สำเร็จ ระบบจะบังคับตรวจสอบบทบาท (Role) ของผู้ใช้งานทันที เพื่อนำไปแสดงหน้าจอและเมนูการใช้งานที่สอดคล้องกับบทบาทนั้น ๆ ตามกฎความปลอดภัย

```mermaid
flowchart LR
    classDef actorStyle fill:#f9f9f9,stroke:#333,stroke-width:2px;
    classDef systemStyle fill:#e1f5fe,stroke:#0288d1,stroke-width:2px;
    classDef useCaseStyle fill:#fff,stroke:#333,stroke-width:1px;

    AllActors(ผู้ใช้งานทุกบทบาท):::actorStyle
    SSO[[ระบบ SSO]]:::systemStyle

    subgraph AuthSystem [ระบบจัดการสิทธิ์เข้าใช้งาน]
        direction TB
        UC1([เข้าสู่ระบบ]):::useCaseStyle
        UC2([ตรวจสอบสิทธิ์และแสดงเมนูตามบทบาท]):::useCaseStyle
    end

    AllActors --> UC1
    UC1 -. "<< includes >>" .-> SSO
    UC1 -. "<< includes >>" .-> UC2
```

---

## 3. ระบบย่อยที่ 2: ระบบสร้างและจัดการคำขอ (Request Creation & Management)
อ้างอิงการทำงานจริงของระบบ (Actual Codebase Implementation)

**คำอธิบาย Diagram:**
ภาพนี้แสดงลำดับและเงื่อนไขในการจัดการคำขอของผู้จัดการสาขา:
1. **การค้นหาลูกค้า:** ผู้จัดการสาขาเริ่มต้นจาก `ค้นหาและตรวจสอบสถานะลูกค้า` ซึ่งในขั้นตอนนี้ระบบจะบังคับทำการ `ดึงประวัติการซื้อย้อนหลัง 3 เดือน` จากระบบ ERP/UXP มาแสดงผลประกอบทันที (`<<includes>>`)
2. **การสร้างคำขอ:** ผู้จัดการสาขาสามารถ `สร้างคำขอเครดิต` โดยผู้ใช้ต้องทำการ `แนบไฟล์เอกสาร` งบการเงินหรือเอกสารอื่นๆ ด้วยตนเอง (`<<includes>>`) และมีทางเลือกให้พักการทำงานโดย `บันทึกฉบับร่าง` (`<<extends>>`) ได้
3. **การส่งคำขอ:** เมื่อกรอกข้อมูลเสร็จสิ้นและกด `ส่งคำขอเครดิต` ระบบจะบังคับ `ตรวจสอบความครบถ้วน` ของฟอร์ม และทำการ `คำนวณคะแนนความเสี่ยง Scoring Engine` โดยอัตโนมัติก่อนส่งเข้าระบบ (`<<includes>>`)

```mermaid
flowchart LR
    classDef actorStyle fill:#f9f9f9,stroke:#333,stroke-width:2px;
    classDef systemStyle fill:#e1f5fe,stroke:#0288d1,stroke-width:2px;
    classDef useCaseStyle fill:#fff,stroke:#333,stroke-width:1px;

    BM(ผู้จัดการสาขา):::actorStyle
    ERP[[ระบบ ERP/UXP]]:::systemStyle

    subgraph ReqSystem [ระบบสร้าง จัดการคำขอ และประมวลผล]
        direction TB
        UC1([ค้นหาและตรวจสอบสถานะลูกค้า]):::useCaseStyle
        UC8([ดึงประวัติการซื้อย้อนหลัง 3 เดือน]):::useCaseStyle
        UC2([สร้างคำขอเครดิต]):::useCaseStyle
        UC3([แนบไฟล์เอกสาร]):::useCaseStyle
        UC4([บันทึกฉบับร่าง]):::useCaseStyle
        UC5([ส่งคำขอเครดิต]):::useCaseStyle
        UC6([ตรวจสอบความครบถ้วน]):::useCaseStyle
        UC9([คำนวณคะแนนความเสี่ยง Scoring Engine]):::useCaseStyle
    end

    BM --> UC1
    BM --> UC2
    BM --> UC5

    UC1 -. "<< includes >>" .-> UC8
    UC8 -. "<< communicates >>" .-> ERP

    UC2 -. "<< includes >>" .-> UC3
    UC2 -. "<< extends >>" .-> UC4

    UC5 -. "<< includes >>" .-> UC6
    UC5 -. "<< includes >>" .-> UC9
```

---

## 4. ระบบย่อยที่ 3: ระบบอัตโนมัติ (Batch Automation Process)
อ้างอิงการทำงานจริงของระบบ (Actual Codebase Implementation) และ NFR 9.1

**คำอธิบาย Diagram:**
ภาพนี้สะท้อนบทบาทของ **เจ้าหน้าที่ฝ่ายการเงิน** ที่สามารถเข้าถึงเมนู "ระบบอัตโนมัติ" เพื่อจัดการคิวงาน (Queue) แบบ Batch:
1. ทำการ `ตรวจสอบสถานะคิวงานประมวลผล` แบบกลุ่ม
2. สามารถสั่ง `ดาวน์โหลดข้อมูลนิติบุคคลและงบการเงินอัตโนมัติ` แบบเป็นชุดจากระบบ DBD
3. สามารถสั่ง `ประมวลผลรายการที่ขัดข้องซ้ำ (Retry Failed Jobs)` กรณีที่การดึงข้อมูลผิดพลาด

```mermaid
flowchart LR
    classDef actorStyle fill:#f9f9f9,stroke:#333,stroke-width:2px;
    classDef systemStyle fill:#e1f5fe,stroke:#0288d1,stroke-width:2px;
    classDef useCaseStyle fill:#fff,stroke:#333,stroke-width:1px;

    Fin(เจ้าหน้าที่ฝ่ายการเงิน):::actorStyle
    DBD[[ระบบ DBD]]:::systemStyle

    subgraph AutoSystem [ระบบอัตโนมัติ Batch Automation]
        direction TB
        UC1([ตรวจสอบสถานะคิวงานประมวลผล]):::useCaseStyle
        UC2([ประมวลผลรายการที่ขัดข้องซ้ำ Retry Jobs]):::useCaseStyle
        UC3([ดาวน์โหลดข้อมูลนิติบุคคลและงบการเงินอัตโนมัติ]):::useCaseStyle
    end

    Fin --> UC1
    Fin --> UC2
    Fin --> UC3

    UC3 -. "<< communicates >>" .-> DBD
```

---

## 5. ระบบย่อยที่ 4: ระบบพิจารณาอนุมัติ (Approval Process)
อ้างอิง FR 4.1 - 4.5

```mermaid
flowchart LR
    classDef actorStyle fill:#f9f9f9,stroke:#333,stroke-width:2px;
    classDef useCaseStyle fill:#fff,stroke:#333,stroke-width:1px;

    App(ผู้อนุมัติ):::actorStyle

    subgraph ApprovalSystem [ระบบพิจารณาอนุมัติ]
        direction TB
        UC1([ดูรายการเอกสารรออนุมัติ]):::useCaseStyle
        UC2([เปิดอ่านคำขอและดาวน์โหลดไฟล์แนบ]):::useCaseStyle
        UC3([ตรวจสอบวงเงินแนะนำจากระบบ]):::useCaseStyle
        UC4([อนุมัติวงเงินตามขอ]):::useCaseStyle
        UC5([ปรับแก้ไขมูลค่าวงเงินใหม่]):::useCaseStyle
        UC6([ปฏิเสธคำขอ]):::useCaseStyle
        UC7([แจ้งเตือนผลกลับไปยังผู้สร้างคำขอ]):::useCaseStyle
    end

    App --> UC1
    App --> UC2
    App --> UC4
    App --> UC5
    App --> UC6

    UC4 -. "<< includes >>" .-> UC3
    UC5 -. "<< includes >>" .-> UC3
    UC6 -. "<< includes >>" .-> UC3

    UC4 -. "<< includes >>" .-> UC7
    UC5 -. "<< includes >>" .-> UC7
    UC6 -. "<< includes >>" .-> UC7
```

---

## 6. ระบบย่อยที่ 5: ระบบติดตามและตั้งค่า (Tracking & Configuration)
อ้างอิง FR 5.1 - 5.2, 6.1 - 6.3, 8.2

```mermaid
flowchart LR
    classDef actorStyle fill:#f9f9f9,stroke:#333,stroke-width:2px;
    classDef useCaseStyle fill:#fff,stroke:#333,stroke-width:1px;

    AllActors(ผู้ใช้งานทุกบทบาท):::actorStyle
    Admin(ผู้ดูแลระบบ):::actorStyle

    subgraph TrackConfigSystem [ระบบติดตามและตั้งค่า]
        direction TB
        UC1([ดูรายการคำขอทั้งหมด]):::useCaseStyle
        UC2([ติดตามสถานะปัจจุบันของคำขอ]):::useCaseStyle
        UC3([ดูประวัติกิจกรรม Audit Trail]):::useCaseStyle
        UC4([รับการแจ้งเตือนจากระบบ Notification]):::useCaseStyle
        UC5([จัดการตั้งค่าระบบ Configuration]):::useCaseStyle
    end

    AllActors --> UC1
    AllActors --> UC2
    AllActors --> UC4
    AllActors --> UC3

    Admin --> UC5
```
