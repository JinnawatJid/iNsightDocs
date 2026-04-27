# IT Support & Operations Handover - Slide Storyboard

This document serves as a slide storyboard for creating the presentation deck for the IT Support and Operations Handover Session. It outlines the visual elements, text to be displayed on each slide, and the speaker notes (using English technical terms with Thai explanations).

*Note: This presentation is designed for a 60-minute session, assuming approximately 2 minutes per slide.*

---

## Part 1: Introduction (5 Minutes)

### Slide 1: Title Slide
**[Visual]**: Company Logo / Project Logo on a clean background.
**[Slide Text]**:
- **IT Support & Operations Handover**
- Credit Request Application System
- Presenter Name | Date
**[Speaker Notes]**: "สวัสดีครับทุกท่าน ยินดีต้อนรับเข้าสู่ช่วง IT Support & Operations Handover ของระบบ Credit Request Application ครับ วันนี้เป้าหมายของเราคือการส่งมอบความรู้ เพื่อให้ทีม Operation สามารถดูแลระบบได้อย่างมั่นใจครับ"

### Slide 2: Objectives of this Session
**[Visual]**: Target/Bullseye Icon.
**[Slide Text]**:
- Understand System Architecture & Components
- Locate and Utilize Project Documentation
- Grasp Deployment & Environment Setup
- Handle L1/L2 Incident Responses Confidently
**[Speaker Notes]**: "วัตถุประสงค์ (Objectives) หลักของ Session ในวันนี้มี 4 ข้อครับ: 1. เข้าใจ Architecture 2. รู้แหล่งเก็บ Document 3. เข้าใจขั้นตอน Deployment และ 4. สามารถรับมือกับ Incidents ระดับ L1/L2 ได้อย่างมีประสิทธิภาพครับ"

### Slide 3: Agenda
**[Visual]**: Bulleted list with distinct icons.
**[Slide Text]**:
1. System Overview & Architecture (10 mins)
2. Project Library & Documentation (10 mins)
3. Deployment & Environment (10 mins)
4. Common L1/L2 Support Scenarios (20 mins)
5. Q&A & Wrap-up (5 mins)
**[Speaker Notes]**: "สำหรับ Agenda 1 ชั่วโมงในวันนี้ เราจะแบ่งตามนี้ครับ: เริ่มจาก Overview, ตามด้วย Documentation, Deployment Process, และจะใช้เวลาส่วนใหญ่เจาะลึกที่ Troubleshooting Scenarios ก่อนจะปิดท้ายด้วย Q&A ครับ"

---

## Part 2: System Overview & Architecture (10 Minutes)

### Slide 4: High-Level Concept
**[Visual]**: Simple 3-tier diagram (User -> App -> DB).
**[Slide Text]**:
- **Application Purpose:** Digitize & streamline credit limit requests.
- **Key Users:** Sales Initiators, Branch Managers, Reviewers, Approvers.
- **Core Process:** Data Entry -> Workflow Routing -> Final Approval.
**[Speaker Notes]**: "เพื่อปูพื้นฐาน ระบบนี้สร้างขึ้นมาเพื่อทำ Digital Transformation ในกระบวนการขออนุมัติวงเงินเครดิตลูกค้าครับ โดย User จะมีตั้งแต่ฝั่ง Sales ผู้ริเริ่มคำขอ ไปจนถึง Approvers ผู้มีอำนาจอนุมัติ โดยระบบจะจัดการ Workflow Routing ให้อัตโนมัติ"

### Slide 5: Full System Architecture Diagram
**[Visual]**: Detailed Architecture Diagram (from `docs/presentations/01_Create_Credit_Request.md`).
**[Slide Text]**:
- 2-Tier Application Architecture.
- Internal Network vs. External API Boundaries.
**[Speaker Notes]**: "นี่คือ Architecture Diagram ตัวเต็มครับ ระบบเราเป็น 2-Tier Architecture แยก Frontend ออกจาก Backend ชัดเจน และเชื่อมต่อ Database ผ่าน Internal Network แต่ก็มีการคุยกับ External Services เช่น Navision และ DBD ซึ่งจุดรอยต่อ (Boundaries) เหล่านี้คือจุดที่มักจะเกิด Issue ครับ"

### Slide 6: The Frontend Stack
**[Visual]**: Vue.js Logo, Pinia Logo.
**[Slide Text]**:
- **Framework:** Vue.js 3
- **State Management:** Pinia
- **Build Tool:** Vite
- **Responsibility:** User Interface, Form Validations, Workflow Rendering.
**[Speaker Notes]**: "เจาะลึกฝั่ง Frontend ครับ เราพัฒนาด้วย Vue.js 3 ใช้ Pinia สำหรับจัดการ State (ตัวแปรต่างๆ ในระบบ) และ Build ด้วย Vite หน้าที่หลักของส่วนนี้คือเรื่อง UI และการทำ Form Validation เบื้องต้นก่อนส่งข้อมูลไป Backend"

### Slide 7: The Backend Stack
**[Visual]**: Node.js Logo, Express Logo.
**[Slide Text]**:
- **Runtime:** Node.js
- **Framework:** Express.js
- **File System:** Multer & fs-extra
- **Responsibility:** Business Logic, RBAC Enforcement, DB Transactions.
**[Speaker Notes]**: "ในส่วนของ Backend เราใช้ Node.js และ Express.js ครับ ทำหน้าที่เป็นตัวกลางควบคุม Business Logic ตรวจสอบสิทธิ์ (RBAC Enforcement) ก่อนทำ Database Transactions รวมถึงจัดการ File Upload ผ่าน Library ที่ชื่อ Multer ครับ"

### Slide 8: Database & Storage Strategy
**[Visual]**: Database Icon, JSON Icon.
**[Slide Text]**:
- **Engines:** SQLite (Dev) / MSSQL (Prod).
- **Semi-structured Data:** Complex configs (Workflows, Scorecards) stored as JSON.
- **Historical Tracking:** `snapshot_data` for audit trails.
**[Speaker Notes]**: "Database ที่ใช้บน Production คือ MSSQL ครับ สถาปัตยกรรมข้อมูลของเราเป็นแบบลูกผสม (Hybrid) คือมี Table ปกติ และมีการเก็บ Configuration ซับซ้อนในรูปแบบ Semi-structured JSON นอกจากนี้เรายังเก็บ History เป็น `snapshot_data` เพื่อทำ Audit Trail ครับ"

### Slide 9: External Integrations (The Bridge)
**[Visual]**: Server Icon -> Two-way arrow -> Cloud (API).
**[Slide Text]**:
- **Navision (ERP):** Customer Search, Sync base data.
- **DBD API:** Financial statements extraction.
- **Failovers:** Fallback logic exists (e.g., local DB search if ERP is down).
**[Speaker Notes]**: "และส่วนสุดท้ายของ Architecture คือ Integrations ครับ เราเชื่อมกับ ERP Navision เพื่อดึงฐานข้อมูลลูกค้า และ DBD เพื่อดึงงบการเงิน หาก API เหล่านี้ล่ม ระบบเรามี Fallback Logic เช่นหาใน Local DB เพื่อให้กระบวนการไม่ชะงัก (Halt) จนเกินไป"

---

## Part 3: Project Library & Documentation (10 Minutes)

### Slide 10: Where is Everything?
**[Visual]**: Screenshot of Git repository focusing on the `docs/` folder.
**[Slide Text]**:
- **The "Project Library"**
- Hosted alongside source code in `docs/` directory.
- Version-controlled documentation.
**[Speaker Notes]**: "สำหรับ Documentation ทั้งหมดของระบบ เราเรียกมันว่า 'Project Library' ครับ ซึ่งจะถูกเก็บรวบรวมไว้ที่โฟลเดอร์ `docs/` ใน Repository เดียวกับ Source Code ข้อดีคือ Document จะถูก Version-control ไปพร้อมๆ กับการอัปเดตระบบครับ"

### Slide 11: Production Readiness
**[Visual]**: Clipboard / Checklist icon.
**[Slide Text]**:
- **`PRODUCTION_READINESS_CHECKLIST.md`**
- Essential Pre-flight checks.
- Verifying Environment variables, DB connections, and Folder permissions.
**[Speaker Notes]**: "เอกสารตัวแรกที่สำคัญคือ Checklist ก่อนขึ้นระบบครับ มันจะรวบรวมรายการตรวจเช็ค (Pre-flight checks) เช่น การตรวจสอบตัวแปร Environment, ทดสอบ DB Connection และการเช็ค Folder Permissions เพื่อป้องกันปัญหาตอน Go-live"

### Slide 12: Release Processes
**[Visual]**: Gear icon / Automation.
**[Slide Text]**:
- **`RELEASE_PROCESS.md`**
- How to package the application.
- Automation scripts (`create_release.bat`).
**[Speaker Notes]**: "หากมี Patch หรือ Version ใหม่ ทีมสามารถอ้างอิงวิธี Build ระบบได้จาก `RELEASE_PROCESS.md` ครับ ในนั้นจะอธิบายขั้นตอนการใช้ Script อัตโนมัติที่เราเตรียมไว้ให้ ซึ่งจะลดข้อผิดพลาดจากการทำ Manual Build ได้มาก"

### Slide 13: Managing Permissions (RACI)
**[Visual]**: Matrix table graphic.
**[Slide Text]**:
- **`RACI_MATRIX.md`**
- Defines Who can Do What.
- Base configurations for Dynamic RBAC Matrix.
**[Speaker Notes]**: "เวลาที่ User ถามว่า 'ทำไมถึงไม่เห็นเมนูนี้' เอกสารที่คุณต้องเปิดคือ `RACI_MATRIX.md` ครับ เอกสารนี้คือ Reference มาตรฐาน (Base configurations) สำหรับตรวจสอบว่า Role ไหนมีสิทธิ์ในการทำ Action ใดในระบบบ้าง"

### Slide 14: Keeping Docs Updated
**[Visual]**: Pen/Paper writing icon.
**[Slide Text]**:
- Documentation is a living entity.
- Please commit updates if SOPs change.
- Formatted in standard Markdown (.md).
**[Speaker Notes]**: "ขอฝากไว้ว่า Document เหล่านี้ไม่ใช่ของตายตัว (Living entity) ครับ หากในอนาคตทีม Operation มีการปรับ Standard Operating Procedure (SOP) ใหม่ สามารถอัปเดตไฟล์ Markdown (.md) แล้ว Commit เข้ามาได้เลยครับ"

---

## Part 4: Deployment & Environment (10 Minutes)

### Slide 15: Deployment Strategy
**[Visual]**: Box icon (Standalone application).
**[Slide Text]**:
- **Zero-Dependency Deployment.**
- No need to globally install Node.js on Production Servers.
- Everything packaged via `create_release.bat`.
**[Speaker Notes]**: "เข้าสู่เรื่อง Deployment ครับ Strategy ที่เราใช้คือ 'Zero-Dependency' หมายความว่าทีมสามารถนำ Artifact ที่ถูก Build แพ็ครวมกันแล้วไปวางบน Windows Server ได้เลย โดยไม่จำเป็นต้อง Install Node.js ทิ้งไว้ในเครื่อง Server ให้ยุ่งยากครับ"

### Slide 16: The `.env` File (The Brain)
**[Visual]**: Code snippet of `.env` file (masking passwords).
**[Slide Text]**:
- Application settings reside in `.env`.
- Database Strings, API Endpoints, Feature Toggles.
- **Rule:** Never commit `.env` to Git.
**[Speaker Notes]**: "ตัวควบคุมพฤติกรรมของแอป (The Brain) คือไฟล์ `.env` ครับ ค่าต่างๆ เช่น Database Credentials หรือ URL ของ API จะถูกตั้งค่าที่นี่ กฎเหล็ก (Golden Rule) ของเราคือห้ามนำไฟล์ .env ที่เป็น Production อัปโหลดเข้าสู่ Git Repository เด็ดขาดครับ"

### Slide 17: Key Environment Variables
**[Visual]**: Table showing variable names and definitions.
**[Slide Text]**:
- `DB_USER` / `DB_PASSWORD`
- `FEATURE_ISOLATE_INITIATOR_REQUESTS` (Toggles data visibility rules).
- `MAX_FILE_UPLOAD_SIZE_MB`
**[Speaker Notes]**: "ตัวแปรสำคัญในไฟล์ `.env` ที่ทีมควรทราบได้แก่ ชุดเชื่อมต่อ DB, Feature Toggles อย่าง `ISOLATE_INITIATOR_REQUESTS` ที่ใช้เปิด-ปิด Rule การมองเห็นข้อมูลของผู้สร้างคำขอ และการกำหนดขนาดไฟล์อัปโหลดครับ"

### Slide 18: File System Structure on Server
**[Visual]**: Directory tree (`/release`, `/logs`, `/uploads`).
**[Slide Text]**:
- `/release` - The application binary.
- `/logs` - PM2 / Application run logs.
- `/uploads` - Storage for attached documents.
**[Speaker Notes]**: "เมื่อนำไปวางบน Server โฟลเดอร์จะถูกจัดสรรชัดเจนครับ ตัวแอปจะอยู่ในโฟลเดอร์ release ส่วน /logs จะเก็บประวัติการรัน และ /uploads คือที่เก็บไฟล์แนบ ซึ่งโฟลเดอร์นี้สำคัญมากในการสำรองข้อมูล (Backup)"

### Slide 19: Starting & Restarting Services
**[Visual]**: Terminal / Command Prompt graphic.
**[Slide Text]**:
- Restart needed when `.env` changes.
- Using Process Managers (e.g., PM2 or Windows Services).
**[Speaker Notes]**: "ข้อควรจำคือ หากมีการแก้ไขไฟล์ `.env` ทีมจะต้องทำการ Restart Application เสมอเพื่อให้ระบบโหลด Configuration ใหม่ ใน Production เราแนะนำให้รันผ่าน Process Managers เช่น PM2 หรือผูกเป็น Windows Services เพื่อให้แอป Restart ตัวเองได้ถ้าเครื่องรีบูทครับ"

---

## Part 5: Common L1/L2 Support Scenarios (20 Minutes)

### Slide 20: Defining L1 vs L2
**[Visual]**: Pyramid or Two-tier escalation graphic.
**[Slide Text]**:
- **L1 (Helpdesk):** Basic usage queries, password resets, basic access issues.
- **L2 (Application Support):** Log analysis, Database investigations, Configuration changes.
**[Speaker Notes]**: "ในระบบเราแบ่งขอบเขตเป็น 2 ระดับครับ L1 คือหน้าด่าน ช่วยเหลือปัญหาการใช้งานทั่วไป ส่วน L2 คือ Application Support ที่ต้องลงลึกในการตรวจสอบ Logs (Log analysis), ตรวจสอบ Database หรือปรับแก้ค่า Configuration บนหน้า UI ขั้นสูงครับ"

### Slide 21: Scenario A - UI Loading Freeze (Symptom)
**[Visual]**: Spinner icon loading endlessly.
**[Slide Text]**:
- **Symptom:** User reports "The screen is spinning forever when searching for a customer."
- **Context:** Happens during Search Customer or Fetching DBD.
**[Speaker Notes]**: "มาดู Scenario แรกครับ User แจ้งว่ากดค้นหาลูกค้าแล้วหมุนค้าง (UI Freezes) ปัญหานี้มักจะเกิดในจังหวะที่มีการยิงคำขอออกไปยัง External API เช่น Navision หรือ DBD ครับ"

### Slide 22: Scenario A - UI Loading Freeze (Resolution L2)
**[Visual]**: Magnifying glass over a log file snippet showing "Timeout".
**[Slide Text]**:
- **L2 Action Plan:**
  1. Check Backend Application Logs for `Timeout` or `ECONNREFUSED`.
  2. Verify external API status (Is Navision down?).
  3. Inform users that Fallback logic will eventually engage.
**[Speaker Notes]**: "สำหรับทีม L2 วิธีแก้ปัญหา (Resolution) คือให้เปิด Backend Logs ทันทีครับ มองหาคำว่า Timeout หรือ Connection Refused หากเจอ แปลว่า Navision อาจจะล่ม ให้แจ้ง User ว่าระบบจะใช้ Fallback ไปค้นใน Local DB แทน ซึ่งอาจจะใช้เวลาสักครู่"

### Slide 23: Scenario B - Missing Menu/Actions (Symptom)
**[Visual]**: UI mockup highlighting a missing "Approve" button.
**[Slide Text]**:
- **Symptom:** "I am an Approver, but I don't see the Approve button for this request."
- **Context:** Workflows rely strictly on Roles.
**[Speaker Notes]**: "Scenario B พบบ่อยมากครับ User เป็นหัวหน้า แต่ไม่เห็นปุ่ม 'Approve' ในระบบของเรา สิทธิ์การมองเห็นไม่ได้ผูกตายตัว แต่ถูกคุมด้วยระบบ Workflow และ Roles ครับ"

### Slide 24: Scenario B - Missing Menu/Actions (Resolution L1/L2)
**[Visual]**: Screenshot of the `System Configuration > Role Management` UI.
**[Slide Text]**:
- **L1 Action Plan:** Verify the user's username vs assigned groups.
- **L2 Action Plan:** Access UI -> `System Configuration > Role Management`. Check the Dynamic RBAC Matrix matching.
**[Speaker Notes]**: "ทางแก้คือ ทีม L1 เช็คก่อนว่า User คนนั้นอยู่ใน Group ที่ถูกต้องไหม ถ้าถูกต้อง ทีม L2 สามารถใช้สิทธิ์ Admin เข้าไปที่เมนู Configuration แล้วตรวจสอบ Role Management Matrix เพื่อเช็คว่า Role ดังกล่าวถูกตั้งค่าให้อนุมัติ State นี้ได้หรือไม่ (Dynamic RBAC Check)"

### Slide 25: Scenario C - File Upload Failures (Symptom)
**[Visual]**: Alert box showing file upload error.
**[Slide Text]**:
- **Symptom:** "I cannot attach the balance sheet Excel file."
- **Context:** System enforces limits to prevent memory exhaustion.
**[Speaker Notes]**: "Scenario C User โวยวายว่าแนบไฟล์ Excel งบการเงินไม่ได้ (Upload Failures) ปัญหานี้มักเกิดจากระบบเรามีการตั้ง Limits ป้องกันไฟล์ขนาดใหญ่เกินไปเพื่อไม่ให้ Server Memory เต็มครับ"

### Slide 26: Scenario C - File Upload Failures (Resolution L2)
**[Visual]**: Gear config icon and folder icon.
**[Slide Text]**:
- **L2 Action Plan:**
  1. Check Dynamic Upload Limit in DB Config UI (`MAX_FILE_UPLOAD_SIZE_MB`).
  2. Verify Service Account Write Permissions on `/uploads`.
  3. Check Windows Server Disk Space.
**[Speaker Notes]**: "L2 จะต้องทำ 3 อย่างครับ: 1. เช็คว่าไฟล์ใหญ่กว่าที่ Config ไว้ในระบบไหม 2. เช็คว่าโฟลเดอร์ /uploads บนเครื่อง Server มีพื้นที่เต็มหรือไม่ 3. เช็ค Permission ว่า Service Account ที่รันแอปมีสิทธิ์ Write ไฟล์หรือเปล่า"

### Slide 27: Scenario D - Database Save Errors (Symptom)
**[Visual]**: Error 500 graphic or SQL icon.
**[Slide Text]**:
- **Symptom:** "An error occurred while saving the draft."
- **Context:** Often related to concurrent accesses or network interruptions to DB.
**[Speaker Notes]**: "Scenario สุดท้าย เกิด Error 500 ระหว่างที่ User กดบันทึก Draft ครับ สาเหตุมักเกิดจากปัญหาคอขวดของ Database (Concurrent access) หรือ Network ระหว่าง App กับ Database ขาดหาย"

### Slide 28: Scenario D - Database Save Errors (Resolution L2)
**[Visual]**: Log snippet highlighting `SQL Deadlock`.
**[Slide Text]**:
- **L2 Action Plan:**
  1. Read backend logs for `SQL Deadlock` or `Connection Closed`.
  2. Verify VPN/Network between App Server and DB Server (Air-gapped env).
  3. Restart Application Service to clear connection pools.
**[Speaker Notes]**: "ในกรณีนี้ L2 ต้องเช็ค Logs เพื่อหา `SQL Deadlock` ครับ ถ้าระบบค้างหนัก วิธีแก้เบื้องต้นที่เร็วที่สุดคือ Restart Application Service เพื่อเคลียร์ Connection Pool กลับคืนมา และเช็ค VPN Connectivity ระหว่าง App Server และ DB Server ครับ"

---

## Part 6: Wrap-up (5 Minutes)

### Slide 29: Escalation Matrix
**[Visual]**: Arrow graphic pointing upwards (L1 -> L2 -> Dev).
**[Slide Text]**:
- Ensure all L2 checks (Logs, UI Configs) are done before escalating.
- Include Transaction ID (`txId`) and Exact Error Logs when escalating to Development/Vendor.
**[Speaker Notes]**: "ข้อควรระวังก่อนทำการ ส่งเรื่องต่อ (Escalate) ให้ทางทีม Developer หรือ Vendor ครับ ขอให้ชัวร์ว่าทีมทำ L2 Checks แล้ว และที่สำคัญที่สุด เวลาส่งเรื่อง โปรดแนบ Transaction ID (txId) พร้อม Error Logs เสมอ จะช่วยให้แก้ปัญหาได้ไวขึ้นมากครับ"

### Slide 30: Q&A
**[Visual]**: Question mark graphic.
**[Slide Text]**:
- **Questions?**
- Open Floor.
**[Speaker Notes]**: "จบเนื้อหาสำหรับ Session วันนี้ครับ มีท่านใดมีข้อสงสัย หรืออยากให้ผม Demo ขั้นตอนการเข้าถึงหน้า System Configuration เพื่อตรวจสอบ Logs หรือ Roles ไหมครับ?"
