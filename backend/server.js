const express = require('express');
const cors = require('cors');
// const db = require('./db'); // Database disabled for mock mode

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Mock Data
const MOCK_CUSTOMERS = [
  {
    "No_": "C001",
    "Name": "Siam Department Store",
    "Contact": "Mr. Somchai",
    "Phone No_": "02-123-4567",
    "Telex No_": "",
    "Mobile Phone No_": "081-987-6543",
    "VAT Registration No_": "1234567890123",
    "Address": "123 Sukhumvit Road",
    "City": "Wattana",
    "County": "Bangkok",
    "Post Code": "10110"
  },
  {
    "No_": "C002",
    "Name": "Chiang Mai Retail",
    "Contact": "Ms. Malee",
    "Phone No_": "053-111-222",
    "Telex No_": "",
    "Mobile Phone No_": "",
    "VAT Registration No_": "",
    "Address": "456 Nimman Road",
    "City": "Muang",
    "County": "Chiang Mai",
    "Post Code": "50200"
  }
];

const MOCK_AY_ACCUM = {
  "C001": {
    custcode: "C001",
    Mar: "100,000",
    Apr: "120,000",
    May: "110,000",
    firstAccum: "330,000",
    firstTrend: 1.1,
    SecondTrend: 0.95,
    AvgFirstTrend: 1.05,
    Jun: "105,000",
    Jul: "115,000",
    Aug: "91,430", // Sum = 311,430
    SecondAccum: "311,430",
    ThirdTrend: 1.27, // 1.27 -> +27%
    FourthTrend: 0.85,
    SecondAvgTrend: 1.05, // 1.05 -> +5%
    AccumTrend: 1.27 // Duplicate of ThirdTrend/logic? prompt says "below it will be AccumTrend"
  }
};

// Helper to format currency
const formatCurrency = (val) => {
    // If it's already a string with commas, try to keep it, otherwise format
    if (typeof val === 'string') return val;
    return new Intl.NumberFormat('en-US').format(val);
};

// Helper to parse float from string (remove commas)
const parseAmount = (str) => {
  if (!str) return 0;
  return parseFloat(str.replace(/,/g, ''));
};

// Helper to format trend text
const formatTrend = (value) => {
  if (value === null || value === undefined) return null;
  // logic: (Value * 100) - 100
  const percentage = (value * 100) - 100;
  const absPercentage = Math.abs(percentage).toFixed(2); // Keep 2 decimals or as integer? Prompt says "27%" in image, "0.86" in text.
  // Image shows "เพิ่มขึ้น 27% ...". Let's format to integer if possible or 1 decimal.
  // Prompt: "AccumTrend which looks like 0.86, 0.97, 1.21 you need to minus by 100"
  // Wait, if 1.21 -> 121 - 100 = 21.

  const displayVal = Number.isInteger(percentage) ? percentage : percentage.toFixed(2);
  const absDisplayVal = Math.abs(displayVal);

  if (percentage > 0) {
    return `เพิ่มขึ้น ${absDisplayVal}% จากรอบก่อน`;
  } else if (percentage < 0) {
    return `ลดลง ${absDisplayVal}% จากรอบก่อน`;
  } else {
    return `คงที่ 0% จากรอบก่อน`;
  }
};

// Search API
app.get('/api/customers/search', async (req, res) => {
  const query = req.query.q ? req.query.q.toLowerCase() : '';

  if (!query) {
    return res.status(400).json({ error: "Query parameter 'q' is required" });
  }

  // Mock Search Logic
  const rows = MOCK_CUSTOMERS.filter(c =>
    c["Name"].toLowerCase().includes(query) ||
    c["No_"].toLowerCase().includes(query) ||
    c["Phone No_"].includes(query)
  );

  const results = rows.map(row => {
    // Basic Customer Logic
    const addressParts = [
      row["Address"],
      row["City"],
      row["County"],
      row["Post Code"]
    ].filter(part => part && part.trim() !== "");

    const fullAddress = addressParts.join(' ');
    const isCompany = row["VAT Registration No_"] && row["VAT Registration No_"].trim().length > 0;
    const customerType = isCompany ? 'Company' : 'Individual';

    let finalPhone = row["Phone No_"];
    if (!finalPhone || finalPhone.trim() === '') finalPhone = row["Telex No_"];
    if (!finalPhone || finalPhone.trim() === '') finalPhone = row["Mobile Phone No_"];

    // Financial Summary Logic (Mock AY_ACCUM)
    const accumData = MOCK_AY_ACCUM[row["No_"]];
    let financialSummary = {};
    let suggestions = [];

    if (accumData) {
        // Calculate Avg Monthly
        const jun = parseAmount(accumData.Jun);
        const jul = parseAmount(accumData.Jul);
        const aug = parseAmount(accumData.Aug);
        const avgRaw = (jun + jul + aug) / 1.5; // Requirement: divide by 1.5
        const avgMonthly = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(avgRaw);

        // Trends
        const totalPurchaseGrowth = formatTrend(accumData.AccumTrend); // Using AccumTrend for total purchase
        const avgMonthlyTrend = formatTrend(accumData.SecondAvgTrend); // Using SecondAvgTrend for avg monthly

        financialSummary = {
            total_purchase_3_months: formatCurrency(accumData.SecondAccum), // Display SecondAccum
            total_purchase_growth: totalPurchaseGrowth,
            avg_monthly: avgMonthly,
            avg_monthly_trend: avgMonthlyTrend
        };

        // Generate Suggestions based on vision/logic
        if (accumData.AccumTrend > 1) {
            suggestions.push("ลูกค้ามีแนวโน้มการซื้อที่ดีและเพิ่มขึ้นอย่างต่อเนื่อง"); // Customer has good buying trend and increasing continuously
        } else {
            suggestions.push("ยอดการสั่งซื้อมีแนวโน้มลดลง ควรติดตามสาเหตุ");
        }

        if (parseAmount(accumData.SecondAccum) > 300000) {
            suggestions.push("เป็นลูกค้าชั้นดี มียอดซื้อสะสมสูง"); // High value customer
        }

        suggestions.push("รักษาประวัติการชำระเงินได้ดี"); // Maintains good payment history (Generic)
        suggestions.push("ควรเสนอโปรโมชั่นเพื่อกระตุ้นยอดขายเพิ่มเติม"); // Should offer promo to boost sales (Generic)

    } else {
        // Fallback if no ACCUM data
        financialSummary = {
            total_purchase_3_months: "0",
            total_purchase_growth: null,
            avg_monthly: "0",
            avg_monthly_trend: null
        };
        suggestions = ["ไม่พบข้อมูลประวัติการซื้อ"];
    }

    return {
      customer: {
        id: row["No_"],
        name: row["Name"],
        contact_person: row["Contact"],
        phone: finalPhone,
        tax_id: row["VAT Registration No_"],
        type: customerType,
        address_residential: fullAddress,
        address_company: fullAddress,
        company_name: row["Name"],
        address: row["Address"],
        district: row["City"],
        province: row["County"],
        zipcode: row["Post Code"]
      },
      history: [],
      financial_summary: financialSummary,
      credit_score: {
          can_request_credit: true, // Mocking
          badges: [], // User asked to keep empty for now
          suggestions: suggestions
      }
    };
  });

  // Artificial delay to simulate network
  setTimeout(() => {
    res.json(results);
  }, 500);
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
