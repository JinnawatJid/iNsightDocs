const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'customer_data.db');
const db = new sqlite3.Database(dbPath);

const mockData = [
  {
    customer_code: "C001",
    name: "ห้างหุ้นส่วน สตีลแอนด์กลาส จำกัด",
    phone: "081-234-5678",
    residential_address: "123/45 หมู่ 6 ต.บางเสาธง อ.บางเสาธง จ.สมุทรปราการ 10540",
    company_name: "ห้างหุ้นส่วน สตีลแอนด์กลาส จำกัด",
    company_address: "123/45 หมู่ 6 ต.บางเสาธง อ.บางเสาธง จ.สมุทรปราการ 10540",
    full_data: JSON.stringify({
      history: [
        { id: 1, date: "15/10/2024", amount: "300,000 บาท", status: "pending" },
        { id: 2, date: "15/09/2024", amount: "300,000 บาท", status: "rejected" },
        { id: 3, date: "15/08/2024", amount: "300,000 บาท", status: "approved" }
      ],
      financial_summary: {
        total_purchase_3_months: "311,430 บาท",
        total_purchase_growth: "เพิ่มขึ้น 27% จากรอบก่อน",
        avg_monthly: "103,810 บาท",
        avg_monthly_trend: "แนวโน้มเพิ่มขึ้นเล็กน้อย"
      },
      credit_score: {
        can_request_credit: true,
        badges: [
          { text: "ไม่เคยมีเครดิตมาก่อน" },
          { text: "มียอดซื้อติดต่อกัน 3 เดือน" }
        ],
        suggestions: [
          "ลูกค้ามีแนวโน้มการซื้อที่ดีและเพิ่มขึ้นอย่างต่อเนื่อง"
        ]
      }
    })
  },
  {
    customer_code: "C002",
    name: "บริษัท ไทยรุ่งเรือง จำกัด",
    phone: "089-999-8888",
    residential_address: "55/8 ถ.สุขุมวิท แขวงคลองเตย เขตคลองเตย กทม. 10110",
    company_name: "บริษัท ไทยรุ่งเรือง จำกัด",
    company_address: "55/8 ถ.สุขุมวิท แขวงคลองเตย เขตคลองเตย กทม. 10110",
    full_data: JSON.stringify({
      history: [],
      financial_summary: {
        total_purchase_3_months: "150,000 บาท",
        total_purchase_growth: "ลดลง 5% จากรอบก่อน",
        avg_monthly: "50,000 บาท",
        avg_monthly_trend: "คงที่"
      },
      credit_score: {
        can_request_credit: false,
        badges: [],
        suggestions: ["ยอดซื้อยังไม่ถึงเกณฑ์"]
      }
    })
  },
  {
    customer_code: "C003",
    name: "ร้านสมชาย การช่าง",
    phone: "02-555-1234",
    residential_address: "88 หมู่ 3 ต.บางพลีใหญ่ อ.บางพลี จ.สมุทรปราการ 10540",
    company_name: "ร้านสมชาย การช่าง",
    company_address: "88 หมู่ 3 ต.บางพลีใหญ่ อ.บางพลี จ.สมุทรปราการ 10540",
    full_data: JSON.stringify({
      history: [
          { id: 1, date: "01/01/2024", amount: "50,000 บาท", status: "approved" }
      ],
      financial_summary: {
        total_purchase_3_months: "600,000 บาท",
        total_purchase_growth: "เพิ่มขึ้น 100%",
        avg_monthly: "200,000 บาท",
        avg_monthly_trend: "เติบโตสูง"
      },
      credit_score: {
        can_request_credit: true,
        badges: [{ text: "ลูกค้าชั้นดี" }],
        suggestions: ["ควรเพิ่มวงเงินเครดิต"]
      }
    })
  }
];

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS customers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_code TEXT UNIQUE,
    name TEXT,
    phone TEXT,
    residential_address TEXT,
    company_name TEXT,
    company_address TEXT,
    full_data TEXT
  )`);

  db.get("SELECT count(*) as count FROM customers", (err, row) => {
    if (err) {
      console.error(err.message);
      return;
    }
    if (row.count === 0) {
      console.log("Seeding database...");
      const stmt = db.prepare("INSERT INTO customers (customer_code, name, phone, residential_address, company_name, company_address, full_data) VALUES (?, ?, ?, ?, ?, ?, ?)");
      mockData.forEach(c => {
        stmt.run(c.customer_code, c.name, c.phone, c.residential_address, c.company_name, c.company_address, c.full_data);
      });
      stmt.finalize();
      console.log("Database seeded successfully.");
    } else {
      console.log("Database already seeded.");
    }
  });
});

module.exports = db;
