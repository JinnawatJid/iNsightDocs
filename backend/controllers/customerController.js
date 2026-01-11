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
        "Fax No_",
        "E-Mail",
        "Fax No_",
        "E-Mail",
        "Telex No_",
        "Mobile Phone No_",
        "VAT Registration No_",
        "Address",
        "City",
        "County",
        "Post Code",
        "residence_latitude",
        "residence_longitude",
        "store_latitude",
        "store_longitude",
        "residence_landmark",
        "residence_note",
        "store_landmark",
        "store_note",
        "residence_map_code",
        "store_map_code",
        "authorized_person",
        "authorized_position",
        "contact_position",
        "contact_phone_number",
        "authorized_person_2",
        "authorized_position_2",
        "business_type",
        "main_products",
        "years_in_business",
        "contact_department",
        "contact_division",
        "billing_requirement",
        "billing_requirement_note",
        "billing_method",
        "billing_method_note",
        "billing_schedule",
        "billing_contact",
        "billing_department",
        "billing_phone",
        "billing_mobile",
        "billing_email",
        "existing_credits"
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
        "Post Code",
        "authorized_person",
        "authorized_position",
        "contact_position",
        "contact_phone_number",
        "authorized_person_2",
        "authorized_position_2",
        "business_type",
        "main_products",
        "years_in_business",
        "contact_department",
        "contact_division",
        "billing_requirement",
        "billing_requirement_note",
        "billing_method",
        "billing_method_note",
        "billing_schedule",
        "billing_contact",
        "billing_department",
        "billing_phone",
        "billing_mobile",
        "billing_email"
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
          const historySql = `SELECT * FROM CreditRequests WHERE customer_no = ? ORDER BY created_at DESC`;
          const historyRes = await db.query(historySql, [row["No_"]]);

          history = historyRes.rows.map(h => ({
              id: h.id,
              date: new Date(h.created_at).toLocaleDateString('th-TH'),
              amount: h.tx_id,
              status: h.status,
              request_type: h.request_type
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

              const monthlyHistory = [
                  { label: 'มิ.ย.', value: formatCurrency(jun) },
                  { label: 'ก.ค.', value: formatCurrency(jul) },
                  { label: 'ส.ค.', value: formatCurrency(aug) }
              ];

              financialSummary = {
                  total_purchase_3_months: formatCurrency(accumData.SecondAccum),
                  total_purchase_growth: totalPurchaseGrowth,
                  avg_monthly: avgMonthly,
                  avg_monthly_trend: avgMonthlyTrend,
                  monthly_history: monthlyHistory
              };

              // Generate Suggestions

              // 1. Total Purchase Value Check (Tiered)
              const secondAccumVal = parseAmount(accumData.SecondAccum);

              if (secondAccumVal > 1000000) {
                  suggestions.push("เป็นลูกค้าชั้นดี มียอดซื้อสะสมสูง");
              } else if (secondAccumVal > 300000) {
                  suggestions.push("มียอดซื้อสะสมปานกลาง");
              } else if (secondAccumVal > 0) {
                  suggestions.push("ยอดซื้อสะสมอยู่ในระดับทั่วไป");
              } else {
                  suggestions.push("ไม่มียอดซื้อสะสม");
              }

              // 2. Consistency Check
              if (jun > 0 && jul > 0 && aug > 0) {
                  suggestions.push("มีการสั่งซื้อต่อเนื่องทุกเดือนในช่วง 3 เดือนล่าสุด");
              } else if (secondAccumVal > 0) {
                  suggestions.push("มีการเว้นช่วงการสั่งซื้อในบางเดือน");
              }

              // Churn Warning: No purchase in latest month (Aug) despite having history
              if (aug === 0 && secondAccumVal > 0) {
                  suggestions.push("ไม่มียอดซื้อในเดือนล่าสุด ควรติดต่อลูกค้าเพื่อสอบถามสถานะ");
              }

              // 3. Trend Check
              if (accumData.AccumTrend > 1) {
                  suggestions.push("ลูกค้ามีแนวโน้มการซื้อที่ดีและเพิ่มขึ้นอย่างต่อเนื่อง");
              } else {
                  suggestions.push("ยอดการสั่งซื้อมีแนวโน้มลดลง ควรติดตามสาเหตุ");
              }

              // 4. Hardcoded: Payment Punctuality
              suggestions.push("มีการชำระเงินตรงเวลา");

              // 5. Hardcoded: No Bad Debt
              suggestions.push("ไม่เคยมีประวัติหนี้เสีย");

          } else {
              financialSummary = {
                  total_purchase_3_months: "0",
                  total_purchase_growth: null,
                  avg_monthly: "0",
                  avg_monthly_trend: null,
                  monthly_history: []
              };
              suggestions = ["ไม่พบข้อมูลประวัติการซื้อ"];
          }
      } catch (accumErr) {
          console.error(`Error fetching AY_ACCUM for ${row["No_"]}:`, accumErr);
          financialSummary = {
              total_purchase_3_months: "0",
              total_purchase_growth: null,
              avg_monthly: "0",
              avg_monthly_trend: null,
              monthly_history: []
          };
      }

      return {
        customer: {
          id: row["No_"],
          name: row["Name"],
          contact_person: row["Contact"],
          phone: finalPhone,
          fax: row["Fax No_"],
          email: row["E-Mail"],
          tax_id: row["VAT Registration No_"],
          type: customerType,
          address_residential: fullAddress,
          address_company: fullAddress,
          company_name: row["Name"],
          address: row["Address"],
          district: row["City"],
          province: row["County"],
          zipcode: row["Post Code"],
          // Coordinates
          residence_latitude: row["residence_latitude"] || "",
          residence_longitude: row["residence_longitude"] || "",
          store_latitude: row["store_latitude"] || "",
          store_longitude: row["store_longitude"] || "",
          residence_landmark: row["residence_landmark"] || "",
          residence_note: row["residence_note"] || "",
          store_landmark: row["store_landmark"] || "",
          store_note: row["store_note"] || "",
          residence_map_code: row["residence_map_code"] || "",
          store_map_code: row["store_map_code"] || "",
          authorized_person: row["authorized_person"] || "",
          authorized_position: row["authorized_position"] || "",
          contact_position: row["contact_position"] || "",
          contact_phone_number: row["contact_phone_number"] || "",
          residence_location_type: row["residence_location_type"] || "",
          residence_location_type_other: row["residence_location_type_other"] || "",
          residence_ownership: row["residence_ownership"] || "",
          residence_ownership_other: row["residence_ownership_other"] || "",
          store_location_type: row["store_location_type"] || "",
          store_location_type_other: row["store_location_type_other"] || "",
          store_ownership: row["store_ownership"] || "",
          store_ownership_other: row["store_ownership_other"] || "",
          authorized_person_2: row["authorized_person_2"] || "",
          authorized_position_2: row["authorized_position_2"] || "",
          business_type: row["business_type"] || "",
          main_products: row["main_products"] || "",
          years_in_business: row["years_in_business"] || "",
          contact_department: row["contact_department"] || "",
          contact_division: row["contact_division"] || "",
          // Billing Information
          billing_requirement: row["billing_requirement"] || "",
          billing_requirement_note: row["billing_requirement_note"] || "",
          billing_method: row["billing_method"] || "",
          billing_method_note: row["billing_method_note"] || "",
          billing_schedule: row["billing_schedule"] || "",
          billing_contact: row["billing_contact"] || "",
          billing_department: row["billing_department"] || "",
          billing_phone: row["billing_phone"] || "",
          billing_mobile: row["billing_mobile"] || "",
          billing_email: row["billing_email"] || ""
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

exports.updateCustomer = async (req, res) => {
  const customerId = req.params.id;
  const updates = req.body;

  if (!customerId) {
    return res.status(400).json({ error: "Customer ID is required" });
  }

  const allowedColumns = [
    'residence_latitude',
    'residence_longitude',
    'store_latitude',
    'store_longitude',
    'residence_landmark',
    'residence_note',
    'store_landmark',
    'store_note',
    'residence_map_code',
    'store_map_code',
    'authorized_person',
    'authorized_position',
    'contact_position',
    'contact_phone_number',
    'residence_location_type',
    'residence_location_type_other',
    'residence_ownership',
    'residence_ownership_other',
    'store_location_type',
    'store_location_type_other',
    'store_ownership',
    'store_ownership_other',
    'authorized_person_2',
    'authorized_position_2',
    'business_type',
    'main_products',
    'years_in_business',
    'contact_department',
    'contact_division',
    'VAT Registration No_',
    'Phone No_',
    'Fax No_',
    'E-Mail',
    // Billing Information
    'billing_requirement',
    'billing_requirement_note',
    'billing_method',
    'billing_method_note',
    'billing_schedule',
    'billing_contact',
    'billing_department',
    'billing_phone',
    'billing_mobile',
    'billing_email',
    'existing_credits',
    // Payment Details
    'payment_method',
    'payment_condition',
    'payment_bank_name',
    'payment_bank_branch',
    'payment_account_no'
  ];

  const keysToUpdate = Object.keys(updates).filter(key => allowedColumns.includes(key));

  // Check for mapped columns
  if (updates.contact_person !== undefined) keysToUpdate.push('contact_person');
  if (updates.name !== undefined) keysToUpdate.push('name');
  if (updates.phone !== undefined) keysToUpdate.push('phone');
  if (updates.fax !== undefined) keysToUpdate.push('fax');
  if (updates.email !== undefined) keysToUpdate.push('email');

  if (keysToUpdate.length === 0) {
    return res.status(400).json({ error: "No valid fields to update" });
  }

  let sql;
  let params = [];
  let clauses = [];

  // Handle standard allowed columns
  allowedColumns.forEach(key => {
    if (updates[key] !== undefined) {
      clauses.push(`"${key}" = ?`);
      // If existing_credits is an object/array, stringify it
      if (key === 'existing_credits' && typeof updates[key] === 'object') {
          params.push(JSON.stringify(updates[key]));
      } else {
          params.push(updates[key]);
      }
    }
  });

  // Handle mapped columns
  if (updates.contact_person !== undefined) {
    clauses.push(`"Contact" = ?`);
    params.push(updates.contact_person);
  }

  if (updates.name !== undefined) {
     clauses.push(`"Name" = ?`);
     params.push(updates.name);
  }

  if (updates.phone !== undefined) {
     clauses.push(`"Phone No_" = ?`);
     params.push(updates.phone);
  }

  if (updates.fax !== undefined) {
     clauses.push(`"Fax No_" = ?`);
     params.push(updates.fax);
  }

  if (updates.email !== undefined) {
     clauses.push(`"E-Mail" = ?`);
     params.push(updates.email);
  }

  const setClause = clauses.join(', ');

  sql = `UPDATE "Customers" SET ${setClause} WHERE "No_" = ?`;
  params.push(customerId);

  try {
    await db.runAsync(sql, params);
    res.json({ success: true, message: "Customer updated successfully" });
  } catch (err) {
    console.error("Error updating customer:", err);
    res.status(500).json({ error: "Failed to update customer" });
  }
};
