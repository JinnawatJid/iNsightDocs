# IT Support & Operations Handover Session

This document provides the Agenda and Presentation Script for the official project handover to the IT Support and Operations team. It outlines the key topics necessary to ensure the team is prepared for system maintenance, monitoring, and Level 1/Level 2 support.

---

## 📅 Agenda (วาระการประชุม)
1. **System Overview & Architecture:** ภาพรวมของระบบและสถาปัตยกรรม (Frontend, Backend, Database)
2. **Project Library & Documentation:** แนะนำเอกสารคู่มือต่างๆ ที่จำเป็นสำหรับการดูแลระบบ
3. **Deployment & Environment:** ขั้นตอนการ Deploy และการจัดการ Environment Variables
4. **Common L1/L2 Support Scenarios:** แนวทางการแก้ไขปัญหาเบื้องต้นและปัญหาที่พบบ่อย (Industry Standard)
5. **Q&A:** ถาม-ตอบ

---

## 🎙️ Presentation Script (สคริปต์การนำเสนอ)

**[คำกล่าวเปิด / Intro (5 นาที)]**
"สวัสดีครับทุกท่าน วันนี้เราจะมาทำการ Handover ระบบ Credit Request Application ให้กับทางทีม IT Support และ Operations นะครับ วัตถุประสงค์หลักของวันนี้คือเพื่อให้ทุกท่านเข้าใจภาพรวมของระบบ จุดที่ต้องมอนิเตอร์ และแนวทางการให้ความช่วยเหลือผู้ใช้งานในระดับ Level 1 และ Level 2 ครับ"

**[1. System Overview & Architecture (10 นาที)]**
"มาเริ่มกันที่ภาพรวมของระบบครับ ระบบนี้แบ่งออกเป็น 2 ส่วนหลักๆ คือ Frontend ที่พัฒนาด้วย Vue.js 3 และ Backend ที่ใช้ Node.js (Express) ครับ

*   **Frontend:** รับผิดชอบเรื่องหน้าจอ UI ทั้งหมดที่ผู้ใช้งานเห็น
*   **Backend:** ทำหน้าที่ประมวลผล Business Logic, เชื่อมต่อกับ Database (SQLite/MSSQL), และสื่อสารกับ External APIs ต่างๆ (เช่น ระบบดึงข้อมูล DBD หรือ Navision)

(แนะนำให้เปิดไฟล์ `docs/presentations/01_Create_Credit_Request.md` เพื่อแสดง System Architecture Diagram ประกอบ)

จุดที่สำคัญสำหรับทีม Support คือการเชื่อมต่อเหล่านี้ครับ หากผู้ใช้งานแจ้งว่า 'ดึงข้อมูลลูกค้าไม่ได้' ปัญหาอาจจะไม่ได้อยู่ที่แอปของเรา แต่อาจเกิดจาก External API Timeout ซึ่งทางทีมสามารถตรวจสอบได้จาก Logs ของ Backend ครับ"

**[2. Project Library & Documentation (10 นาที)]**
"เพื่อสนับสนุนการทำงานของทีม เราได้เตรียม **Project Library** ไว้ในโฟลเดอร์ `docs/` ใน Repository ของโปรเจกต์ครับ เอกสารสำคัญที่ทีม Support ควรทราบได้แก่:

*   **`PRODUCTION_READINESS_CHECKLIST.md`:** รายการตรวจสอบก่อนขึ้นระบบจริง
*   **`RELEASE_PROCESS.md`:** คู่มือการสร้าง Release Build อัตโนมัติด้วย Script
*   **`RACI_MATRIX.md`:** ตารางแสดงสิทธิ์การเข้าถึงและการอนุมัติของแต่ละ Role ซึ่งจะมีประโยชน์มากเวลาผู้ใช้สอบถามว่า 'ทำไมถึงมองไม่เห็นปุ่มอนุมัติ'

เอกสารเหล่านี้คือ 'Single Source of Truth' สำหรับการ Operation ระบบนี้ครับ"

**[3. Deployment & Environment (10 นาที)]**
"สำหรับการนำระบบขึ้น Production เรามี Script `create_release.bat` ที่จะรวมโค้ด Frontend และ Backend เข้าด้วยกัน รวมถึงดาวน์โหลด Node.js Binary มาไว้ในโฟลเดอร์ `release/` ทำให้แอปพลิเคชันของเราเป็น Standalone และสามารถนำไปรันบน Windows Server ได้ทันทีโดยไม่ต้องลง Node.js เพิ่มเติมครับ (Zero-dependency deployment)

จุดที่ต้องระวังคือไฟล์ `.env` ครับ ค่าต่างๆ เช่น Database Connection String (`DB_USER`, `DB_PASSWORD`) และ API URLs จะถูกเก็บไว้ที่นี่ หากมีการเปลี่ยนรหัสผ่าน Database ต้องมาอัปเดตที่ไฟล์นี้และ Restart Backend Service ครับ"

**[4. Common L1/L2 Support Scenarios (20 นาที)]**
"ทีนี้มาดู Use Case จริงที่ทีม Support ระดับ L1/L2 มักจะเจอตามมาตรฐานอุตสาหกรรม (Industry Standard) ของระบบประเภทนี้กันครับ:

**Scenario A: ระบบทำงานช้า หรือ หน้าเว็บโหลดข้อมูลไม่ขึ้น (Performance/Connectivity Issues)**
*   **Symptom:** ผู้ใช้งานแจ้งว่ากดค้นหาลูกค้าแล้วหมุนค้าง
*   **Action Plan:**
    1. ตรวจสอบ **Application Logs** ของ Backend ดูว่ามี Error ระบุถึงการเชื่อมต่อ Database หรือ External API Timeout หรือไม่
    2. เช็ค Status ของ Server ว่า CPU/Memory เต็มหรือไม่
    3. หากจำเป็น สามารถ Restart ตัว Node.js Service ได้เพื่อเคลียร์ Connection Pool

**Scenario B: ผู้ใช้งานไม่สามารถเข้าถึงเมนู หรือ ทำรายการได้ (Access Control & RBAC Issues)**
*   **Symptom:** ผู้ใช้งานแจ้งว่า 'ฉันเป็นผู้จัดการทำไมอนุมัติไม่ได้' หรือ 'มองไม่เห็นเมนู Configuration'
*   **Action Plan:**
    1. ระบบเราใช้ **Dynamic RBAC Matrix** (Role-Based Access Control)
    2. ทีม Support สามารถเข้าไปตรวจสอบหรือตั้งค่าสิทธิ์ได้ที่เมนู `System Configuration > Role Management` ผ่านหน้า UI (ต้องใช้สิทธิ์ Admin)
    3. ตรวจสอบให้แน่ใจว่า Username ของผู้ใช้งานถูกผูกกับ Role ที่ถูกต้องในระบบ

**Scenario C: อัปโหลดเอกสารประกอบไม่ผ่าน (File Upload/Storage Issues)**
*   **Symptom:** ผู้ใช้พยายามอัปโหลดไฟล์ PDF หรือ Excel แล้วระบบแจ้งเตือน Error
*   **Action Plan:**
    1. ตรวจสอบขนาดไฟล์ของผู้ใช้งาน ระบบเรามีการตั้งค่า **Max File Size Limit** ไว้ (โดยค่า Default ของระบบและเซิร์ฟเวอร์มักจะตั้งไว้ป้องกันการอัปโหลดไฟล์ใหญ่เกินไป) ทีม Support สามารถตรวจสอบและปรับแก้ลิมิตได้ในหน้า Configuration
    2. ตรวจสอบสิทธิ์การเขียนไฟล์ (Write Permission) ของโฟลเดอร์ปลายทางบน Windows Server ว่า Service Account มีสิทธิ์ในการเขียนไฟล์หรือไม่
    3. ตรวจสอบพื้นที่ว่างของฮาร์ดดิสก์บน Server

**Scenario D: ฐานข้อมูลล็อค หรือ ข้อมูลไม่บันทึก (Database Locks/Transactions)**
*   **Symptom:** เกิด Error ตอนบันทึกข้อมูล (Save Error)
*   **Action Plan:**
    1. ดู Logs ว่ามีข้อความเกี่ยวกับ `SQL Deadlock` หรือ `Timeout` หรือไม่
    2. ตรวจสอบการเชื่อมต่อ VPN ระหว่าง Server กับ Database (เนื่องจากเป็น Air-gapped environment)

**[5. Q&A & Wrap up (5 นาที)]**
"นี่คือภาพรวมทั้งหมดของการดูแลรักษาระบบครับ มีท่านใดมีข้อสงสัยเกี่ยวกับส่วนไหน หรืออยากให้เจาะลึกเรื่องการดู Logs เพิ่มเติมไหมครับ?"

---
**Note for Presenter:** แนะนำให้สาธิตการหาไฟล์ Logs หรือการเปิดหน้า UI ของ `System Configuration` ประกอบการอธิบายในหัวข้อ Scenario เพื่อให้ทีม Support เห็นภาพชัดเจนยิ่งขึ้น