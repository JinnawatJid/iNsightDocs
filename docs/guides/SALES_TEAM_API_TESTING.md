# คู่มือการทดสอบ Credit Status API สำหรับทีม Sales

เอกสารนี้จัดทำขึ้นเพื่อให้ทีม Sales หรือทีม IT ที่เกี่ยวข้อง สามารถทดสอบการเชื่อมต่อและตรวจสอบข้อมูลจาก **Credit Status API** ได้ด้วยตนเอง

## 1. ข้อมูลการเชื่อมต่อ (Connection Details)

*   **Endpoint URL:** `http://192.192.0.37:3000/api/external/credit-status/:customerId`
    *   *:customerId* คือ รหัสลูกค้าที่ต้องการตรวจสอบ (เช่น `08015AY`)
*   **Method:** `GET`
*   **Authentication:** จำเป็นต้องระบุ API Key ใน Header

### Headers ที่ต้องระบุ
| Header Key | Value | รายละเอียด |
| :--- | :--- | :--- |
| `X-API-KEY` | `dev-api-key` | (ติดต่อ Admin เพื่อขอ Key สำหรับ Production) |

---

## 2. โหมดจำลองข้อมูล (Mock Mode) - แนะนำสำหรับการทดสอบเบื้องต้น

เนื่องจากการดึงข้อมูลจริงอาจต้องใช้ข้อมูลลูกค้าที่มีอยู่ในระบบจริง ท่านสามารถใช้ **Mock Mode** เพื่อตรวจสอบว่าระบบตอบสนองถูกต้องหรือไม่ โดยไม่ต้องสนใจว่ารหัสลูกค้าจะมีอยู่จริงหรือไม่

### วิธีการใช้งาน Mock Mode
เพิ่ม Parameter `?mock=true` ต่อท้าย URL

### ตรรกะการจำลองสถานะ (Mock Logic)
ระบบจะดูจาก **เลขตัวสุดท้าย** ของรหัสลูกค้าเพื่อกำหนดสถานะที่ตอบกลับมา:

| เลขท้ายของรหัสลูกค้า | สถานะที่ได้ | ความหมาย | วงเงินตัวอย่าง |
| :--- | :--- | :--- | :--- |
| **0 - 4** (เช่น `08011AY`) | **N** | ปกติ (Normal) | 500,000 |
| **5 - 6** (เช่น `08015AY`) | **P** | มีปัญหา (Problem) | 250,000 |
| **7 - 8** (เช่น `08017AY`) | **NPL** | หนี้เสีย (NPL) | 0 |
| **9** (เช่น `08019AY`) | **L** | กฎหมาย/ฟ้องร้อง (Legal) | 0 |

---

## 3. ตัวอย่างคำสั่งทดสอบ (Test Commands)

ท่านสามารถใช้โปรแกรมเช่น **Postman** หรือคำสั่ง **cURL** ใน Terminal เพื่อทดสอบได้

### กรณีที่ 1: ลูกค้าสถานะปกติ (Normal)
*รหัสลงท้ายด้วย 1 -> คาดหวังสถานะ N*

```bash
curl -X GET "http://192.192.0.37:3000/api/external/credit-status/08011AY?mock=true" \
     -H "X-API-KEY: dev-api-key"
```

**ผลลัพธ์ที่ควรได้:**
```json
{
    "customer_id": "08011AY",
    "customer_name": "Mock Customer (N Scenario)",
    "status": "N",
    "credit_limit": 500000,
    "credit_terms": {
        "gs": 30,
        "ae": 60,
        "yc": 45
    },
    "_is_mock": true
}
```

### กรณีที่ 2: ลูกค้าสถานะมีปัญหา (Problem)
*รหัสลงท้ายด้วย 5 -> คาดหวังสถานะ P*

```bash
curl -X GET "http://192.192.0.37:3000/api/external/credit-status/08015AY?mock=true" \
     -H "X-API-KEY: dev-api-key"
```

**ผลลัพธ์ที่ควรได้:**
```json
{
    "customer_id": "08015AY",
    "customer_name": "Mock Customer (P Scenario)",
    "status": "P",
    "credit_limit": 250000,
    "credit_terms": {
        "gs": 0,
        "ae": 30,
        "yc": 0
    },
    "_is_mock": true
}
```

---

## 4. ปัญหาที่พบบ่อย (Troubleshooting)

### ได้รับ Error 401 Unauthorized
```json
{ "error": "Unauthorized: Missing API Key" }
```
**สาเหตุ:** ไม่ได้ใส่ Header `X-API-KEY` หรือใส่ชื่อ Key ผิด
**แก้ไข:** ตรวจสอบว่าใน Header มี key ชื่อ `X-API-KEY` (ตัวพิมพ์ใหญ่ทั้งหมด ขีดกลาง) และค่าถูกต้อง

### ได้รับ Error 404 Customer not found
**สาเหตุ:** ค้นหารหัสลูกค้าที่ไม่มีในระบบจริง (และไม่ได้เปิด Mock Mode)
**แก้ไข:** ตรวจสอบรหัสลูกค้า หรือลองเพิ่ม `?mock=true` เพื่อทดสอบการเชื่อมต่อก่อน
