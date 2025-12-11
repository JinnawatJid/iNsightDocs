const db = require('../db');

// Helper to format currency
const formatCurrency = (val) => {
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

exports.searchCustomers = async (req, res) => {
  const query = req.query.q;

  if (!query) {
    return res.status(400).json({ error: "Query parameter 'q' is required" });
  }

  let sql;
  if (db.dbType === 'mssql') {
    sql = `
      SELECT TOP 20
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
    `;
  } else {
    sql = `
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
  }

  const searchPattern = `%${query}%`;
  const params = [searchPattern, searchPattern, searchPattern, searchPattern, searchPattern];

  try {
    const { rows } = await db.query(sql, params);

    const results = await Promise.all(rows.map(async (row) => {
      // Address Concatenation
      const addressParts = [
        row["Address"],
        row["City"],
        row["County"],
        row["Post Code"]
      ].filter(part => part && part.trim() !== "");

      const fullAddress = addressParts.join(' ');

      // Company vs Individual
      const isCompany = row["VAT Registration No_"] && row["VAT Registration No_"].trim().length > 0;
      const customerType = isCompany ? 'Company' : 'Individual';

      // Phone Number Fallback
      let finalPhone = row["Phone No_"];
      if (!finalPhone || finalPhone.trim() === '') {
        finalPhone = row["Telex No_"];
      }
      if (!finalPhone || finalPhone.trim() === '') {
        finalPhone = row["Mobile Phone No_"];
      }

      // Financial Data Fetching
      let financialSummary = {};
      let suggestions = [];

      // Fetch Credit History (Requests)
      let history = [];
      try {
          // This should match CreditRequests table structure
          // Map backend status to something the frontend history sidebar expects?
          // The sidebar expects: { id, date, amount, status }
          // We have: id, tx_id, customer_no, customer_name, status, created_at

          const historySql = `SELECT * FROM CreditRequests WHERE customer_no = ? ORDER BY created_at DESC`;
          const historyRes = await db.query(historySql, [row["No_"]]);

          history = historyRes.rows.map(h => ({
              id: h.id,
              date: new Date(h.created_at).toLocaleDateString('th-TH'), // Simple date format
              amount: h.tx_id, // Using TxID as 'amount' or identifier label for now as we don't have amount
              status: h.status
          }));
      } catch (histErr) {
          console.error(`Error fetching history for ${row["No_"]}:`, histErr);
      }

      try {
          const accumSql = `SELECT * FROM "AY_ACCUM" WHERE "custcode" = ?`;
          const accumRes = await db.query(accumSql, [row["No_"]]);
          const accumData = accumRes.rows[0];

          if (accumData) {
              const jun = parseAmount(accumData.Jun);
              const jul = parseAmount(accumData.Jul);
              const aug = parseAmount(accumData.Aug);

              // Business Logic: Divide by 2
              const avgRaw = (jun + jul + aug) / 2;
              const avgMonthly = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(avgRaw);

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

              const secondAccumVal = parseAmount(accumData.SecondAccum);

              // Consistency Check
              if (jun > 0 && jul > 0 && aug > 0) {
                  suggestions.push("มีการสั่งซื้อต่อเนื่องทุกเดือนในช่วง 3 เดือนล่าสุด");
              } else if (secondAccumVal > 0) {
                  // Sold something in the quarter, but missed some months
                  suggestions.push("มีการเว้นช่วงการสั่งซื้อในบางเดือน");
              }

              // Churn Warning: No purchase in latest month (Aug) despite having history
              if (aug === 0 && secondAccumVal > 0) {
                  suggestions.push("ไม่มียอดซื้อในเดือนล่าสุด ควรติดต่อลูกค้าเพื่อสอบถามสถานะ");
              }

          } else {
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
        history: history,
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
};

exports.getSuggestions = async (req, res) => {
  const query = req.query.q;

  if (!query) {
    return res.json([]);
  }

  let sql;
  if (db.dbType === 'mssql') {
    sql = `
      SELECT TOP 4
        "No_",
        "Name",
        "Phone No_",
        "Mobile Phone No_"
      FROM "Customers"
      WHERE
        "Name" LIKE ? OR
        "No_" LIKE ? OR
        "Phone No_" LIKE ? OR
        "Mobile Phone No_" LIKE ?
    `;
  } else {
    sql = `
      SELECT
        "No_",
        "Name",
        "Phone No_",
        "Mobile Phone No_"
      FROM "Customers"
      WHERE
        "Name" LIKE ? OR
        "No_" LIKE ? OR
        "Phone No_" LIKE ? OR
        "Mobile Phone No_" LIKE ?
      LIMIT 4
    `;
  }

  const searchPattern = `%${query}%`;
  const params = [searchPattern, searchPattern, searchPattern, searchPattern];

  try {
    const { rows } = await db.query(sql, params);
    
    // Map the raw DB rows to a clean structure
    // Handling potential nulls for phones if necessary, though lightweight
    const suggestions = rows.map(row => ({
      id: row["No_"],
      name: row["Name"],
      phone: row["Phone No_"],
      mobile: row["Mobile Phone No_"]
    }));

    res.json(suggestions);

  } catch (err) {
    console.error("Database error in suggestions:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};
