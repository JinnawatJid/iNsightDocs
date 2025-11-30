const express = require('express');
const cors = require('cors');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Helper to format currency
const formatCurrency = (val) => {
    // If it's already a string with commas, try to keep it, otherwise format
    if (!val) return "0";
    if (typeof val === 'string' && val.includes(',')) return val;
    return new Intl.NumberFormat('en-US').format(val);
};

// Helper to parse float from string (remove commas)
const parseAmount = (str) => {
  if (!str) return 0;
  if (typeof str === 'number') return str;
  return parseFloat(str.replace(/,/g, ''));
};

// Helper to format trend text
const formatTrend = (value) => {
  if (value === null || value === undefined) return null;
  // logic: (Value * 100) - 100
  const percentage = (value * 100) - 100;
  const absPercentage = Math.abs(percentage).toFixed(2);
  
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
  const query = req.query.q;

  if (!query) {
    return res.status(400).json({ error: "Query parameter 'q' is required" });
  }

  // SQLite Query
  // Note: LIKE in SQLite is case-insensitive for ASCII characters by default
  const sql = `
    SELECT
      "No_",
      "Name",
      "Contact",
      "Phone No_",
      "Telex No_",
      "Mobile Phone No_",
      "VAT Registration No_",
      "Address",
      "City",
      "County",
      "Post Code"
    FROM "Customers"
    WHERE
      "Name" LIKE ? OR
      "No_" LIKE ? OR
      "Phone No_" LIKE ? OR
      "Mobile Phone No_" LIKE ? OR
      "Contact" LIKE ?
    LIMIT 20
  `;

  const searchPattern = `%${query}%`;
  // SQLite params need to be repeated for each placeholder
  const params = [searchPattern, searchPattern, searchPattern, searchPattern, searchPattern];

  try {
    const { rows } = await db.query(sql, params);

    // Transform data to match frontend expectations
    // Use Promise.all to handle async DB calls for each customer
    const results = await Promise.all(rows.map(async (row) => {
      // Logic: Address Concatenation
      const addressParts = [
        row["Address"],
        row["City"],
        row["County"],
        row["Post Code"]
      ].filter(part => part && part.trim() !== ""); 

      const fullAddress = addressParts.join(' ');

      // Logic: Company vs Individual
      const isCompany = row["VAT Registration No_"] && row["VAT Registration No_"].trim().length > 0;
      const customerType = isCompany ? 'Company' : 'Individual';

      // Logic: Phone Number Fallback
      let finalPhone = row["Phone No_"];
      if (!finalPhone || finalPhone.trim() === '') {
        finalPhone = row["Telex No_"];
      }
      if (!finalPhone || finalPhone.trim() === '') {
        finalPhone = row["Mobile Phone No_"];
      }

      // --- Financial Data Fetching (AY_ACCUM) ---
      let financialSummary = {};
      let suggestions = [];
      
      try {
          const accumSql = `SELECT * FROM "AY_ACCUM" WHERE "custcode" = ?`;
          const accumRes = await db.query(accumSql, [row["No_"]]);
          const accumData = accumRes.rows[0];

          if (accumData) {
              // Calculate Avg Monthly
              const jun = parseAmount(accumData.Jun);
              const jul = parseAmount(accumData.Jul);
              const aug = parseAmount(accumData.Aug);
              const avgRaw = (jun + jul + aug) / 2;
              const avgMonthly = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(avgRaw);

              // Trends
              // Note: Using AccumTrend for total purchase growth as per previous mock logic
              // and SecondAvgTrend for avg monthly trend.
              const totalPurchaseGrowth = formatTrend(accumData.AccumTrend); 
              const avgMonthlyTrend = formatTrend(accumData.SecondAvgTrend);

              financialSummary = {
                  total_purchase_3_months: formatCurrency(accumData.SecondAccum),
                  total_purchase_growth: totalPurchaseGrowth,
                  avg_monthly: avgMonthly,
                  avg_monthly_trend: avgMonthlyTrend
              };

              // Generate Suggestions
              if (accumData.AccumTrend > 1) {
                  suggestions.push("ลูกค้ามีแนวโน้มการซื้อที่ดีและเพิ่มขึ้นอย่างต่อเนื่อง");
              } else {
                  suggestions.push("ยอดการสั่งซื้อมีแนวโน้มลดลง ควรติดตามสาเหตุ");
              }

              if (parseAmount(accumData.SecondAccum) > 300000) {
                  suggestions.push("เป็นลูกค้าชั้นดี มียอดซื้อสะสมสูง");
              }

              suggestions.push("รักษาประวัติการชำระเงินได้ดี");
              suggestions.push("ควรเสนอโปรโมชั่นเพื่อกระตุ้นยอดขายเพิ่มเติม");

          } else {
              // Fallback if no AY_ACCUM data found for this customer
              financialSummary = {
                  total_purchase_3_months: "0",
                  total_purchase_growth: null,
                  avg_monthly: "0",
                  avg_monthly_trend: null
              };
              suggestions = ["ไม่พบข้อมูลประวัติการซื้อ"];
          }
      } catch (accumErr) {
          console.error(`Error fetching AY_ACCUM for ${row["No_"]}:`, accumErr);
          // Fallback on error
           financialSummary = {
              total_purchase_3_months: "0",
              total_purchase_growth: null,
              avg_monthly: "0",
              avg_monthly_trend: null
          };
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
        history: [], // Still empty as per requirements/scope
        financial_summary: financialSummary,
        credit_score: {
             can_request_credit: true, 
             badges: [], 
             suggestions: suggestions
        }
      };
    }));

    res.json(results);

  } catch (err) {
    console.error("Database error:", err);
    res.status(500).json({ error: "Internal Server Error", details: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
