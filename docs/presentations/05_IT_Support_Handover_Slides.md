# IT Support & Operations Handover - Slide Storyboard

This document serves as a slide storyboard for creating the presentation deck for the IT Support and Operations Handover Session. It outlines the visual elements, text to be displayed on each slide, and the speaker notes (using English technical terms with Thai explanations).

---

## Slide 1: Title Slide
**[Visual / ภาพประกอบ]**:
- Company Logo or Project Logo.
- Clean, professional background.

**[Slide Text / ข้อความบนสไลด์]**:
- **IT Support & Operations Handover**
- Credit Request Application System
- Date / Presenter Name

**[Speaker Notes / คำบรรยาย]**:
"สวัสดีครับทุกท่าน วันนี้เราจะมาทำการ Handover ระบบ Credit Request Application ให้กับทางทีม IT Support และ Operations นะครับ วัตถุประสงค์หลักของวันนี้คือเพื่อให้ทุกท่านเข้าใจ System Overview ของระบบ จุดที่ต้องทำ Monitoring และแนวทางการให้ความช่วยเหลือผู้ใช้งานในระดับ Level 1 (L1) และ Level 2 (L2) Support ครับ"

---

## Slide 2: Agenda (วาระการประชุม)
**[Visual / ภาพประกอบ]**:
- Bulleted list with simple icons for each topic.

**[Slide Text / ข้อความบนสไลด์]**:
1. System Overview & Architecture
2. Project Library & Documentation
3. Deployment & Environment
4. Common L1/L2 Support Scenarios
5. Q&A

**[Speaker Notes / คำบรรยาย]**:
"สำหรับ Agenda ในวันนี้ เราจะแบ่งเนื้อหาออกเป็น 5 ส่วนหลักครับ เริ่มจาก System Architecture ภาพรวม, การใช้งาน Project Library เพื่อหา Document, การทำ Deployment และ Environment Setup, จากนั้นจะเป็น Use Cases หลักที่ L1/L2 มักจะเจอ และปิดท้ายด้วยช่วง Q&A ครับ"

---

## Slide 3: System Overview & Architecture
**[Visual / ภาพประกอบ]**:
- System Architecture Diagram (Can be referenced/extracted from `docs/presentations/01_Create_Credit_Request.md` or a new clear block diagram showing Frontend -> Backend -> DB & External APIs).

**[Slide Text / ข้อความบนสไลด์]**:
- **Frontend (UI & Interaction):** Vue.js 3
- **Backend (Business Logic & APIs):** Node.js (Express)
- **Database:** SQLite / MSSQL
- **External API Integrations:** DBD API, Navision API

**[Speaker Notes / คำบรรยาย]**:
"มาเริ่มกันที่ System Architecture ครับ ระบบเราแบ่งเป็น 2 Tiers หลักๆ คือส่วน Frontend ที่พัฒนาด้วย Framework Vue.js 3 เพื่อจัดการเรื่อง User Interface (UI)
และส่วน Backend ที่พัฒนาด้วย Node.js (Express) ซึ่งทำหน้าที่ Process Business Logic จัดการ Database Transactions (SQLite/MSSQL) และทำ API Integration กับระบบภายนอก เช่น DBD API และระบบ ERP Navision
จุดที่สำคัญสำหรับทีม Support คือเมื่อเกิด Connection Issues ปัญหาอาจมาจาก External API Timeout ซึ่งสามารถเช็คได้จาก Application Logs ในส่วน Backend ครับ"

---

## Slide 4: Project Library & Documentation
**[Visual / ภาพประกอบ]**:
- Folder structure screenshot showing the `docs/` directory.
- Icon representing a "Single Source of Truth".

**[Slide Text / ข้อความบนสไลด์]**:
- **Location:** Repository `docs/` folder
- **Key Documents:**
  - `PRODUCTION_READINESS_CHECKLIST.md`
  - `RELEASE_PROCESS.md`
  - `RACI_MATRIX.md` (Role & Access Control)
- **Single Source of Truth** for System Operations

**[Speaker Notes / คำบรรยาย]**:
"เพื่อการทำงานที่รวดเร็ว เราได้เตรียม Project Library ไว้ที่ Directory `docs/` ใน Source Code Repository ครับ
เอกสารที่จำเป็นต่อการ Operation ได้แก่ `PRODUCTION_READINESS_CHECKLIST.md` สำหรับการทำ Pre-flight check, `RELEASE_PROCESS.md` สำหรับขั้นตอนการ Build, และ `RACI_MATRIX.md` สำหรับตรวจสอบ Permission การเข้าถึง
เอกสารเหล่านี้ถูก Design ให้เป็น Single Source of Truth หากมี Configuration เปลี่ยนแปลง ทีมสามารถอ้างอิงจาก Document ในส่วนนี้ได้เลยครับ"

---

## Slide 5: Deployment & Environment
**[Visual / ภาพประกอบ]**:
- Code snippet of `.env` variables (blurred sensitive info).
- Flowchart showing `create_release.bat` execution to Standalone deployment.

**[Slide Text / ข้อความบนสไลด์]**:
- **Release Build:** `create_release.bat` (Zero-dependency deployment)
- **Deployment OS:** Windows Server (Standalone Node.js Service)
- **Environment Management:** `.env` file
  - `DB_USER`, `DB_PASSWORD`
  - API Connection Strings

**[Speaker Notes / คำบรรยาย]**:
"ในส่วนของการทำ Deployment เราใช้ Script `create_release.bat` เพื่อรวม Frontend Build และ Backend Source Code เข้าด้วยกันเป็น Artifact เดียว ซึ่งสามารถนำไป Deploy บน Windows Server แบบ Zero-dependency ได้ทันที โดยไม่ต้อง Install Node.js เพิ่มเติมครับ
ข้อควรระวังคือการจัดการ Environment Variables ที่อยู่ในไฟล์ `.env` หากมีการเปลี่ยนแปลง Database Credentials หรือ API Endpoints ทีม Support ต้องเข้าไปอัปเดตไฟล์นี้ และทำการ Restart Service เพื่อให้ Configuration ใหม่ทำงานครับ"

---

## Slide 6: Common L1/L2 Support Scenarios (1/2)
**[Visual / ภาพประกอบ]**:
- Icon of a Loading Spinner (Performance).
- Screenshot of the `System Configuration > Role Management` UI (RBAC Matrix).

**[Slide Text / ข้อความบนสไลด์]**:
**Scenario A: Performance & Connectivity Issues**
- *Symptom:* Loading data fails / UI freezes.
- *Action:* Check Backend Application Logs (Database connection / API Timeouts), Check Server CPU/Memory.

**Scenario B: Access Control & RBAC Issues**
- *Symptom:* "Cannot approve request" / "Menu missing".
- *Action:* Verify Dynamic RBAC Matrix via `System Configuration > Role Management` UI (Admin access required).

**[Speaker Notes / คำบรรยาย]**:
"มาดู Use Case ของ L1/L2 Support ครับ
**Scenario A:** ปัญหา Performance หรือ Connectivity เช่น หน้าจอ Loading ค้าง Action Plan คือให้เช็ค Backend Application Logs ว่ามี Database Lock หรือ External API Timeout เกิดขึ้นหรือไม่ และมอนิเตอร์ Server Resources (CPU/Memory)
**Scenario B:** ปัญหา Access Control เช่น User ไม่เห็นปุ่ม Approve ระบบของเราใช้ระบบ Dynamic RBAC Matrix ทีม Support สามารถตรวจสอบและแก้ Role Mapping ได้ที่ UI `System Configuration > Role Management` โดยตรงครับ"

---

## Slide 7: Common L1/L2 Support Scenarios (2/2)
**[Visual / ภาพประกอบ]**:
- Folder write-permission icon or disk space gauge.
- Database icon with an alert symbol.

**[Slide Text / ข้อความบนสไลด์]**:
**Scenario C: File Upload / Storage Issues**
- *Symptom:* Cannot upload PDF/Excel documents.
- *Action:* Check Max File Size Limit in config, verify Windows Server Write Permissions, check available Disk Space.

**Scenario D: Database Locks / Transaction Failures**
- *Symptom:* Errors during save operations.
- *Action:* Review logs for `SQL Deadlock` or `Timeout`, verify VPN connectivity (Air-gapped environment).

**[Speaker Notes / คำบรรยาย]**:
"ต่อกันที่ **Scenario C:** เรื่อง File Upload ครับ ถ้าระบบแจ้ง Error ตอน Upload Document ให้ตรวจสอบ Max File Size Limit ก่อน จากนั้นเช็ค Write Permissions ของ Service Account บน Windows Server และตรวจสอบ Disk Space ที่เหลือ
**Scenario D:** หากเกิด Error ตอน Save ให้ตรวจสอบ Backend Logs หาคำว่า SQL Deadlock หรือ Timeout ครับ เนื่องจากระบบนี้อยู่บน Air-gapped Environment หากเป็นปัญหาที่ Network Layer ให้ Verify VPN Connectivity ไปที่ Database Server ควบคู่ด้วยครับ"

---

## Slide 8: Q&A
**[Visual / ภาพประกอบ]**:
- Large Q&A or Question Mark graphic.
- Contact email or support channel for escalations.

**[Slide Text / ข้อความบนสไลด์]**:
- **Questions & Answers**
- Contact: IT.Support@company.com

**[Speaker Notes / คำบรรยาย]**:
"มาถึงช่วงสุดท้ายของการ Handover ครับ นี่คือภาพรวมทั้งหมดของการดูแลรักษาระบบ มีทีมไหนมีข้อสงสัย หรืออยากให้ผม Demo วิธีการหา Logs หรือการตั้งค่า UI ประกอบไหมครับ? ช่วงเวลานี้เชิญสอบถามได้เลยครับ"
