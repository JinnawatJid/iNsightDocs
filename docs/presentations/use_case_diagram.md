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

## 4. ระบบย่อยที่ 3: ระบบตรวจสอบและส่งต่อ (Review & Forward Process)
อ้างอิง FR 4.1 - 4.2 และกระบวนการ Workflow

**คำอธิบาย Diagram:**
ภาพนี้แสดงกระบวนการทำงานของกลุ่ม "ผู้ตรวจสอบ" (ประกอบด้วย ผู้จัดการภูมิภาค, ผู้จัดการฝ่ายขาย, และเจ้าหน้าที่ฝ่ายการเงิน) เมื่อได้รับคำขอเครดิตที่ส่งมาจากสาขา ผู้ตรวจสอบมีหน้าที่พิจารณากลั่นกรองข้อมูล ให้ความคิดเห็นเพิ่มเติม และส่งต่อคำขอไปยังผู้อนุมัติในลำดับถัดไป โดยไม่มีสิทธิ์ในการตัดสินใจอนุมัติหรือปฏิเสธคำขอโดยตรง

```mermaid
flowchart LR
    classDef actorStyle fill:#f9f9f9,stroke:#333,stroke-width:2px;
    classDef useCaseStyle fill:#fff,stroke:#333,stroke-width:1px;

    Rev(ผู้ตรวจสอบ <br>ผจก.ภูมิภาค / ผจก.ขาย / จนท.การเงิน):::actorStyle

    subgraph ReviewSystem [ระบบตรวจสอบและส่งต่อ]
        direction TB
        UC1([ดูรายการเอกสารรอตรวจสอบ]):::useCaseStyle
        UC2([เปิดอ่านคำขอและดาวน์โหลดไฟล์แนบ]):::useCaseStyle
        UC3([ให้ความคิดเห็นและส่งต่อ]):::useCaseStyle
        UC4([แจ้งเตือนไปยังผู้รับผิดชอบลำดับถัดไป]):::useCaseStyle
    end

    Rev --> UC1
    Rev --> UC2
    Rev --> UC3

    UC3 -. "<< includes >>" .-> UC4
```

---

## 5. ระบบย่อยที่ 4: ระบบพิจารณาอนุมัติ (Approval Process)
อ้างอิง FR 4.1 - 4.5

**คำอธิบาย Diagram:**
ระบบแบ่งระดับ "ผู้อนุมัติ" ตามมูลค่าวงเงินที่ร้องขอ (อ้างอิง FR 4.4):
* **ผู้จัดการฝ่ายการเงิน:** อนุมัติวงเงินมูลค่า **ไม่เกิน 300,000 บาท**
* **คณะกรรมการเครดิต:** อนุมัติวงเงินมูลค่า **มากกว่า 300,000 บาทขึ้นไป**

```mermaid
flowchart LR
    classDef actorStyle fill:#f9f9f9,stroke:#333,stroke-width:2px;
    classDef useCaseStyle fill:#fff,stroke:#333,stroke-width:1px;

    App1(ผู้จัดการฝ่ายการเงิน <br>วงเงิน <= 300,000):::actorStyle
    App2(คณะกรรมการเครดิต <br>วงเงิน > 300,000):::actorStyle

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

    App1 --> UC1
    App1 --> UC2
    App1 --> UC4
    App1 --> UC5
    App1 --> UC6

    App2 --> UC1
    App2 --> UC2
    App2 --> UC4
    App2 --> UC5
    App2 --> UC6

    UC2 -. "<< includes >>" .-> UC3

    UC4 -. "<< includes >>" .-> UC7
    UC5 -. "<< includes >>" .-> UC7
    UC6 -. "<< includes >>" .-> UC7
```

---

## 6. ระบบย่อยที่ 5: ระบบตั้งค่า (System Configuration)
อ้างอิงการทำงานจริงของระบบ (Actual Codebase Implementation)

**คำอธิบาย Diagram:**
ภาพนี้แสดงการทำงานของ "ผู้ดูแลระบบ (Admin)" ในการจัดการตั้งค่าพารามิเตอร์และกฎเกณฑ์ต่างๆ ของระบบ (System Configuration) เพื่อให้ระบบมีความยืดหยุ่นและปรับเปลี่ยนได้โดยไม่ต้องแก้ไขโค้ด

```mermaid
flowchart LR
    classDef actorStyle fill:#f9f9f9,stroke:#333,stroke-width:2px;
    classDef useCaseStyle fill:#fff,stroke:#333,stroke-width:1px;

    Admin(ผู้ดูแลระบบ):::actorStyle

    subgraph ConfigSystem [ระบบตั้งค่า]
        direction TB
        UC1([จัดการการตั้งค่าระบบทั่วไป System Rules]):::useCaseStyle
        UC2([จัดการสิทธิ์ผู้ใช้งาน User Roles]):::useCaseStyle
        UC3([จัดการพื้นที่และสาขา Region Mapping]):::useCaseStyle
        UC4([จัดการโมเดลให้คะแนน Scorecards]):::useCaseStyle
    end

    Admin --> UC1
    Admin --> UC2
    Admin --> UC3
    Admin --> UC4
```


---

> **📝 หมายเหตุถึงผู้อ่าน / Note to the User:**
> เพื่อให้เอกสาร Use Case Diagram สอดคล้องและตรงกันกับไฟล์ **`docs/presentations/BR.txt`** โปรดอย่าลืมกลับไปลบข้อความที่ระบุถึง "ระบบอัตโนมัติ" ในไฟล์ BR.txt ดังนี้:
> 1. ลบคำว่า **"ระบบอัตโนมัติ"** ออกจากข้อ **FR 1.2.3**
> 2. ลบหัวข้อ **NFR 9.1** (เรื่องระบบทำงานประมวลผลข้อมูลแบบชุดอัตโนมัติ Batch Automation Process) ออกทั้งข้อ
