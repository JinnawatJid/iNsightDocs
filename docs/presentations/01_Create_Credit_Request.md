# Code Walkthrough Guide: Technical Architecture & Workflows

This document is an in-depth technical walkthrough designed to present the system's architecture to the reviewing professor. It details the system architecture, core design patterns, and provides sequence diagrams for key features.

---

## 🎙️ Presentation Script: System Architecture Overview

**[คำกล่าวเปิด / Intro (5 นาที)]**
"Architecture และ Workflow หลักของระบบที่เราได้พัฒนาขึ้นมาครับ ระบบของเราออกแบบโดยแยกส่วน Frontend และ Backend ออกจากกันอย่างชัดเจนครับ"

**[อธิบาย Tech Stack]**
"สำหรับ Tech Stack ฝั่ง Frontend เราใช้ Vue.js 3 ร่วมกับ Vite และใช้ Pinia สำหรับจัดการ State Management ครับ

โดย **Vue.js** จะเป็น Framework หลักที่ใช้สร้างหน้าจอ UI แบบ Component-based ช่วยให้การจัดการหน้าเว็บมีความยืดหยุ่นและนำโค้ดกลับมาใช้ใหม่ได้ง่าย ส่วน **Vite** เป็น Build Tool ที่ช่วยให้เรารันและคอมไพล์โค้ดในระหว่างพัฒนาได้อย่างรวดเร็วครับ และ **Pinia** คือเครื่องมือสำหรับจัดการ State หรือข้อมูลส่วนกลางของแอปพลิเคชัน เพื่อให้แต่ละ Component สามารถแชร์ข้อมูลกันได้อย่างเป็นระบบครับ

ส่วนฝั่ง Backend เราใช้ Node.js รันด้วย Express ทำหน้าที่เป็น REST API และเชื่อมต่อกับ Database (SQLite/MSSQL) ครับ นอกจากนี้ยังมี Local Bridge Server ที่เขียนเชื่อมต่อผ่าน Server-Sent Events (SSE) เพื่อใช้ทำ Web Scraping ดึงข้อมูลจากภายนอกแบบ Asynchronous ครับ"

**[เปิดรูป System Architecture Diagram ด้านล่าง]**
"นี่คือภาพรวม High-Level Architecture ของระบบครับ (ชี้ที่แผนภาพ) อาจารย์จะเห็นว่าผู้ใช้เชื่อมต่อผ่าน Frontend เข้ามา ส่วนการดึงข้อมูล DBD จะไม่ผ่าน Backend หลักเพื่อลดคอขวด แต่จะคุยกับ Bridge Server ส่วนตัวเพื่อสกัดข้อมูลแทนครับ"

```mermaid
flowchart LR
    %% Entities
    User((User))

    %% Containers
    subgraph Frontend [Frontend: Vue.js 3]
        UI[Vue Components]
        Store[(Pinia State)]
        UI <--> Store
    end

    subgraph Backend [Backend: Node.js / Express]
        API[REST API Routes]
        Controllers[Logic / Controllers]
        API <--> Controllers
    end

    subgraph DatabaseLayer [Databases]
        DB[(SQLite / MSSQL)]
        JSONFiles[(Scorecard JSON)]
    end

    subgraph ExternalIntegration [External Scraping Bridge]
        PythonBridge[Local Bridge Server :4343]
        DBD[(DBD Website)]
    end

    %% Connections
    User -- "HTTPS" --> Frontend
    UI -- "HTTPS (Axios)" --> API
    Controllers -- "SQL Queries" --> DB
    Controllers -- "Read/Write" --> JSONFiles

    UI -- "Server-Sent Events (SSE)" --> PythonBridge
    PythonBridge -- "Web Scraping" --> DBD
```

**[อธิบาย Design Patterns]**
"Design Patterns หลักที่เรานำมาใช้มี 2 ส่วนครับ:
1. **Centralized State Management:** เราใช้ Pinia รวบรวมข้อมูลฟอร์มจากหลายๆ แท็บไว้ที่เดียว
2. **Sequential Data Processing (Atomicity Concept):** การบันทึกข้อมูลที่มีความเกี่ยวเนื่องกันหลายตาราง เราจัดการผ่านโค้ดใน Backend ให้ทำงานแบบเรียงลำดับ (Sequential Await) เพื่อรับประกันความถูกต้องสมบูรณ์และสอดคล้องกันของข้อมูล (Data Integrity) โดยควบคุมกระบวนการทั้งหมดให้เสร็จสิ้นเป็นชุดคำสั่งเดียวกันครับ"

---

## 1. Feature: Create Credit Request

**The Goal:** Demonstrate how form state is gathered across multiple components and persisted transactionally on the server.

### 🎙️ Presentation Script: Create Credit Request
"ฟีเจอร์แรกและถือเป็นจุดเริ่มต้นหลักของระบบ คือการสร้างคำขอเครดิตครับ จุดประสงค์ของหน้านี้คือต้องการให้พนักงานขายสามารถรวบรวมข้อมูลลูกค้า ทั้งข้อมูลทั่วไปและข้อมูลทางการเงิน เพื่อส่งให้ฝ่ายสินเชื่อพิจารณาได้อย่างครบถ้วนและเป็นระบบครับ

**[อธิบาย User Flow และการออกแบบ UI]**
ในมุมมองของ User Journey ทันทีที่เข้ามาในหน้านี้ ผู้ใช้จะต้องค้นหาลูกค้าก่อนครับ ซึ่งในทางเทคนิค เมื่อผู้ใช้กดค้นหา ระบบจะเรียก API ไปดึงข้อมูล Master Data ของลูกค้ามา และ Mapping เข้าสู่ Pinia State (`store.customer`) ทันที เพื่อนำมา Auto-fill ลงในฟอร์ม ช่วยลดข้อผิดพลาดจากการพิมพ์มือครับ

**[เปิดรูป Mini-Sequence Diagram: Customer Search]**
"นี่คือลำดับการทำงาน (Data Flow) ตอนที่ User พิมพ์ค้นหาลูกค้าครับ"

```mermaid
sequenceDiagram
    participant User
    participant Component as Search Bar
    participant Store as Pinia (creditRequest)
    participant API as Backend (CustomerService)

    User->>Component: Types ID & Clicks Search
    Component->>Store: searchCustomer(query)
    Store->>API: GET /api/customers?q=...
    API-->>Store: JSON (Customer Master Data)
    Note over Store: Maps JSON to store.customer<br/>for Form Auto-fill
    Store-->>Component: Reactively updates UI
```

**[คลิกขยาย "View Source Code: Customer Search & Autofill"]**
<details>
<summary><b>View Source Code: Customer Search & Autofill</b></summary>

```javascript
// src/stores/creditRequest.js
async searchCustomer(query) {
  if (!query) return;
  try {
    // 1. Fetch from backend API
    const results = await CustomerService.searchCustomers(query);
    if (results && results.length > 0) {
      const data = results[0];

      // 2. Map data into the global Pinia state (this.customer)
      this.customer = { ...data.customer };

      // Auto-fill form fields explicitly
      this.customer.store_address = data.customer.address;
      this.customer.store_subdistrict = data.customer.subdistrict;
      // ... mapping other fields to pre-fill the form automatically

      this.hasSearched = true;
    }
  } catch (err) {
    console.error(err);
  }
}
```
</details>

จากนั้นระบบจะสร้างฟอร์มให้กรอกข้อมูล โดยเราออกแบบ UI ให้เป็นแบบ Tabs (เช่น ข้อมูลทั่วไป, ที่อยู่, ข้อมูลทางการเงิน) ในเชิงโค้ด เราใช้ Vue Dynamic Component (`<component :is="currentTabComponent">`) ในการสลับหน้าจอ ทำให้หน้า UI ไม่รกและทำงานได้รวดเร็วครับ และในแต่ละ Tab ก็จะมีช่องสำหรับอัปโหลดเอกสารแนบไปด้วยครับ

**[เปิดรูป Mini-Sequence Diagram: Dynamic Tabs]**
"และเมื่อข้อมูลพร้อมให้กรอกแล้ว หน้า UI จะแบ่งเป็น Tabs ซึ่งการสลับ Tabs จะทำงานร่วมกับ State แบบนี้ครับ"

```mermaid
sequenceDiagram
    participant User
    participant Tabs as ApplicationTabs.vue
    participant Store as Pinia (creditRequest)
    participant Vue as Dynamic Component

    User->>Tabs: Clicks "ที่อยู่" (Residence)
    Tabs->>Store: setActiveTab('residence')
    Store-->>Tabs: Updates currentTab state
    Tabs->>Vue: <component :is="currentTabComponent">
    Note over Vue: Unmounts GeneralInfoTab<br/>Mounts ResidenceTab
    Vue-->>User: Displays Residence Form instantly
```

**[คลิกขยาย "View Source Code: Dynamic Vue Components"]**
<details>
<summary><b>View Source Code: Dynamic Vue Components</b></summary>

```html
<!-- src/components/credit/forms/ApplicationTabs.vue -->
<template>
  <div class="application-tabs">
    <!-- Header Navigation for Tabs -->
    <div class="tabs-header">
      <div v-for="(tab, index) in tabs" :key="index"
           :class="['tab-item', { active: currentTab === tab.id }]"
           @click="handleTabClick(tab.id)">
        {{ tab.label }}
      </div>
    </div>

    <!-- Dynamic Form Body -->
    <div class="tab-content">
      <keep-alive>
        <!-- Renders GeneralInfoTab, ResidenceTab, etc. based on state -->
        <component :is="currentTabComponent" :readOnly="readOnly" />
      </keep-alive>
    </div>
  </div>
</template>
```
</details>

**[อธิบายตรรกะและ Logic ภายใน]**
ในเชิงเทคนิคเบื้องหลัง เราได้เขียน Logic ควบคุมไว้หลายจุดครับ เช่น การทำ Form Validation ดักจับข้อมูลที่ไม่ถูกต้อง, การเขียนเงื่อนไขเพื่อซ่อนหรือแสดงฟิลด์ต่างๆ ให้แปรผันตามประเภทลูกค้าแบบ Dynamic

และอีกจุดที่สำคัญมากคือกล่องอัปโหลดไฟล์ครับ ตัวคอมโพเนนต์ `FileUploader` ของเรา จะยังไม่อัปโหลดไฟล์ขึ้นเซิร์ฟเวอร์ทันทีที่ผู้ใช้เลือกไฟล์ แต่เราจะใช้ `v-model` เก็บไฟล์นั้นไว้ใน Pinia State ก่อน เพื่อป้องกันปัญหาไฟล์ขยะค้างในเซิร์ฟเวอร์ในกรณีที่ผู้ใช้เปลี่ยนใจไม่กดส่งคำขอครับ

ซึ่งความท้าทายหลักตรงนี้คือ ข้อมูลมันกระจัดกระจายอยู่ตาม Tabs ต่างๆ ครับ ถ้าเราส่งข้อมูลไปบันทึกทีละหน้า ข้อมูลอาจจะไม่สมบูรณ์หรือสูญหายระหว่างทางได้ครับ"

**[เปิดรูป Mini-Sequence Diagram: API Call Delegation]**
"และนี่คือวิธีการแก้ปัญหาของเราครับ จาก Diagram ขนาดย่อยนี้ อาจารย์จะเห็นว่าเมื่อ User กรอกข้อมูลตาม Flow จนเสร็จสมบูรณ์ และกดปุ่ม Submit ตัว Vue Component จะไม่ยิง API ไปหา Database โดยตรงเลยครับ แต่จะส่งผ่านไปให้ Pinia Store จัดการแทน"

```mermaid
sequenceDiagram
    participant User
    participant Vue as CreateCreditRequest.vue
    participant Store as Pinia (creditRequest)
    participant API as Backend

    User->>Vue: Clicks "Submit"
    Vue->>Store: saveTransactionData()
    Note over Store: Prepares Payload
    Store->>API: POST Data
```

<details>
<summary><b>View Source Code: Vue Component API Call Delegation</b></summary>

```javascript
// src/views/CreateCreditRequest.vue
const handleStartRequest = async () => {
  // Save to backend immediately so the Draft correctly reflects the chosen type
  if (store.requestId) {
    await store.saveTransactionData();
  }
};
```
</details>

**[เปิดรูป Mini-Sequence Diagram: Frontend Payload Construction]**
"จากนั้น Pinia จะนำไฟล์ที่เราเก็บไว้ (Delayed Upload) และ State ทั้งหมดมาแพ็ครวมกันเป็นก้อนเดียวส่งไปครับ"

```mermaid
sequenceDiagram
    participant Store as Pinia (creditRequest)
    participant FormData
    participant API as Backend

    Store->>FormData: append("customer_no", ...)
    Store->>FormData: append("snapshot_data", JSON)
    Store->>FormData: append("files", Binary Blobs)
    Store->>API: POST /api/credit-requests (multipart/form-data)
```

**[คลิกขยาย "View Source Code: Frontend Payload Construction"]**
"อาจารย์ลองดูโค้ดตรงนี้ครับ เราใช้ `FormData.append()` เพื่อรวมข้อมูลทุกอย่าง รวมถึงไฟล์และการตั้งค่าต่างๆ (Snapshot) เข้าด้วยกันครับ"

<details>
<summary><b>View Source Code: Frontend Payload Construction</b></summary>

```javascript
// src/stores/creditRequest.js
async saveTransactionData() {
  if (!this.customer || !this.customer.id) return;
  try {
    const formData = new FormData();
    formData.append("customer_no", this.customer.id);
    formData.append("request_amount", this.transactionData.amount || "");

    // Convert reactive object state into a JSON string
    formData.append("snapshot_data", JSON.stringify(this.getSnapshot()));

    // Attach File Blobs and unified state...
    await CreditRequestService.createCreditRequest(formData);
  } catch (e) {
    console.error("Failed to save transaction data", e);
  }
}
```
</details>

**[เปิดรูป Mini-Sequence Diagram: Sequential Data Processing]**
"เพื่อให้เห็นภาพเรื่อง Atomicity ชัดเจนขึ้น ดู Diagram นี้ครับ Backend จะทำงานเป็นลำดับขั้นแบบ Sequential"

```mermaid
sequenceDiagram
    participant API as creditRequestController.js
    participant DB as Database
    participant FS as File System

    API->>DB: 1. Insert New Request Record (Cloned)
    API->>FS: 2. Move Physical Uploaded Files
    API->>DB: 3. Update DB Attachment Paths
    API->>DB: 4. Move Audit Comments
    API->>DB: 5. Delete Old Draft Record
    Note over API,DB: Sequential Await acts as<br/>Logical Transaction
```

**[คลิกขยาย "View Source Code: Sequential Data Processing"]**
"และนี่คือโค้ดฝั่ง Backend ครับ เมื่อข้อมูลมาถึง เราให้ความสำคัญกับ Atomicity ของข้อมูล แม้ว่าเราจะไม่ได้เขียน SQL TRANSACTION ครอบโดยตรง แต่เราออกแบบลอจิกเป็น Sequential Await ให้ทำงานต่อเนื่องกันอย่างเข้มงวด ตัวอย่างเช่นตอนที่เราจะเลื่อนสถานะจาก Draft เป็นคำขอจริง (Opened) เราต้องสร้าง ID (tx_id) แบบทางการขึ้นมาใหม่, Insert โคลน Record เข้าไป, อัปเดตตารางไฟล์ให้ชี้ไปที่ ID ใหม่, แล้วถึงลบ Draft เก่าทิ้ง ทั้งหมดนี้ถูกแพ็ครวมไว้ใน Controller ชุดเดียว เพื่อป้องกันข้อมูลขยะค้างในระบบครับ"

<details>
<summary><b>View Source Code: Sequential Data Processing</b></summary>

```javascript
// backend/controllers/creditRequestController.js
// ตัวอย่างการทำ Sequential Await เพื่อความต่อเนื่องของข้อมูล (Data Integrity)

// 1. Insert New Record with Generated Official ID
const insertResult = await db.runAsync(insertSql, [
  newRealTxId, existing.customer_no, existing.status /*...omitted parameters*/
]);

// 2. Update DB Attachments Paths (Move Children to point to new official ID)
await db.runAsync(
  `UPDATE CreditRequestAttachments SET tx_id = ?, file_path = REPLACE(file_path, ?, ?) WHERE tx_id = ?`,
  [newRealTxId, oldPathSegment, newPathSegment, oldTxId],
);

// 3. Delete Old Parent Record (Clean up the draft)
await db.runAsync("DELETE FROM CreditRequests WHERE id = ?", [ oldRequestId ]);
```
</details>

---

### Sequence Diagram (Mermaid)

```mermaid
sequenceDiagram
    participant User
    participant VueComponent as CreateCreditRequest.vue
    participant PiniaStore as creditRequest.js
    participant ExpressRoute as POST /api/credit-requests
    participant DB as Database

    User->>VueComponent: Fills Form Data across Tabs
    User->>VueComponent: Uploads File (e.g., DBD Profile)
    User->>VueComponent: Clicks "Submit"
    VueComponent->>PiniaStore: saveTransactionData()
    Note over PiniaStore: Appends JSON and File Blobs into a single FormData payload
    PiniaStore->>ExpressRoute: POST FormData Payload
    ExpressRoute->>DB: INSERT INTO CreditRequests
    ExpressRoute->>DB: INSERT INTO CreditRequestAttachments (File Paths)
    alt Success
        ExpressRoute-->>PiniaStore: 200 OK (returns new tx_id)
        PiniaStore-->>VueComponent: Update UI (Success)
    else File Save Fails
        ExpressRoute-->>PiniaStore: 500 Error
        PiniaStore-->>VueComponent: Show Error Toast
    end
```
