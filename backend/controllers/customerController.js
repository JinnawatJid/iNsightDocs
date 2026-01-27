const db = require('../db');
const axios = require('axios');

// Configuration
const API_URL = process.env.CUSTOMER_API_URL || "http://192.192.0.37:8280/customer-sp682/1.0.0";
const API_KEY = process.env.CUSTOMER_API_KEY || "YOUR_API_KEY";

// Configuration
const FINANCIAL_API_URL = process.env.FINANCIAL_API_URL || "http://192.192.0.37:8000/api/customer-analytics/monthly-summary";
const ENABLE_LOCAL_FALLBACK = process.env.ENABLE_LOCAL_FALLBACK === 'true';

// MOCK FLAG for Financial API (Sandbox Environment)
const MOCK_FINANCIAL_API = process.env.MOCK_FINANCIAL_API === 'true';
const MOCK_FINANCIAL_DATA = {
  "customer": "01013AY",
  "anchor_date": "2026-01-15",
  "months": 6,
  "monthly": [
    { "month": "2025-07", "amount": 172935.25 },
    { "month": "2025-08", "amount": 567041.5 },
    { "month": "2025-09", "amount": 440718.5 },
    { "month": "2025-10", "amount": 590844.75 },
    { "month": "2025-11", "amount": 929268.5 },
    { "month": "2025-12", "amount": 715785.5 },
    { "month": "2026-01", "amount": 426226.75 }
  ],
  "total": 3842820.75
};

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

// Helper: Format Thai Date (YYYY-MM -> Month YY)
const formatThaiMonth = (yyyy_mm, isCurrent = false) => {
    if (!yyyy_mm) return '';
    const [yearStr, monthStr] = yyyy_mm.split('-');
    const year = parseInt(yearStr);
    const month = parseInt(monthStr);

    const thaiMonths = [
        "", "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.",
        "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."
    ];

    const thaiYear = (year + 543) % 100; // Get last 2 digits of BE year
    let label = `${thaiMonths[month]} ${thaiYear}`;
    if (isCurrent) {
        label += " (เดือนปัจจุบัน)";
    }
    return label;
};

// Helper: Format Trend from Percentage
const formatTrendPercent = (percent) => {
    if (percent === null || isNaN(percent)) return null;
    const absVal = Math.abs(percent).toFixed(2);
    if (percent > 0) return `เพิ่มขึ้น ${absVal}% จากรอบก่อน`;
    if (percent < 0) return `ลดลง ${absVal}% จากรอบก่อน`;
    return `คงที่ 0% จากรอบก่อน`;
};

const fetchPurchasingBehavior = async (customerNo) => {
    if (MOCK_FINANCIAL_API) {
        console.log(`[Financial API] Using Mock Data for ${customerNo}`);
        return MOCK_FINANCIAL_DATA;
    }

    try {
        const response = await axios.get(FINANCIAL_API_URL, {
            params: { customer_code: customerNo },
            timeout: 5000
        });
        return response.data;
    } catch (error) {
        console.error(`Error fetching purchasing behavior for ${customerNo}:`, error.message);
        throw error;
    }
};

/**
 * Helper: Search Customers via API (Split & Merge Strategy)
 */
const searchApiCustomers = async (query) => {
    // Define fields for Split & Merge
    const searchRequests = [
        { label: "By ID",   payload: { "No_": { "$like": `%${query}%` } } },
        { label: "By Name", payload: { "Name": { "$like": `%${query}%` } } },
        { label: "By Mobile", payload: { "Mobile Phone No_": { "$like": `%${query}%` } } }
    ];

    // Execute in parallel
    const promises = searchRequests.map(reqData =>
         axios.post(API_URL, {
           page: 1,
           size: 10,
           ...reqData.payload
         }, {
          headers: {
            "apikey": API_KEY,
            "Content-Type": "application/json"
          },
          timeout: 5000 // 5s timeout for API to allow quick fallback
        }).then(response => response.data.data || [])
    );

    // We need to know if ALL requests failed to trigger fallback
    const resultsArrays = await Promise.allSettled(promises);

    // Check if all failed (Network error, etc)
    const allFailed = resultsArrays.every(r => r.status === 'rejected');
    if (allFailed) {
        const errors = resultsArrays.map(r => r.reason.message).join('; ');
        throw new Error(`All API requests failed: ${errors}`);
    }

    // Collect successful results
    const allCustomers = resultsArrays
      .filter(r => r.status === 'fulfilled')
      .map(r => r.value)
      .flat();

    // Deduplicate
    const uniqueCustomers = [];
    const seenIds = new Set();

    for (const customer of allCustomers) {
        if (!customer["No_"]) continue;
        if (!seenIds.has(customer["No_"])) {
            seenIds.add(customer["No_"]);
            uniqueCustomers.push(customer);
        }
    }

    return uniqueCustomers;
};

/**
 * Enriches a customer object with local database data (History, Financials).
 * @param {string} customerNo - The customer ID (No_).
 * @returns {Promise<Object>} - Object containing { history, financial_summary, suggestions }
 */
const enrichCustomerData = async (customerNo) => {
    let financialSummary = {};
    let suggestions = [];
    let history = [];

    // 1. Fetch Credit History (Requests)
    try {
        const historySql = `SELECT * FROM CreditRequests WHERE customer_no = ? ORDER BY created_at DESC`;
        const historyRes = await db.query(historySql, [customerNo]);
        const rows = historyRes.rows || [];

        history = rows.map(h => ({
            id: h.id,
            date: new Date(h.created_at).toLocaleDateString('th-TH'),
            amount: h.tx_id,
            status: h.status,
            requestType: h.request_type || 'เครดิตใหม่'
        }));
    } catch (histErr) {
        console.error(`Error fetching history for ${customerNo}:`, histErr);
    }

    // 2. Fetch Financial Data (New API)
    try {
        const apiData = await fetchPurchasingBehavior(customerNo);

        if (apiData && apiData.monthly && apiData.monthly.length > 0) {
            const monthlyData = apiData.monthly;

            // Sort by month (oldest first) to ensure slicing is correct
            monthlyData.sort((a, b) => a.month.localeCompare(b.month));

            // Separate Calculation Set (Exclude Current Month - The last one)
            // If we have at least 1 month, we separate the last one as "Current".
            // The request is: Show 7, Calculate on 6 (Exclude current).

            let calcData = [];
            if (monthlyData.length > 1) {
                calcData = monthlyData.slice(0, -1);
            } else {
                // If only 1 month exists, we can't really exclude it for calculation or everything is 0.
                // We'll treat it as empty calc but show the month.
                calcData = [];
            }

            const totalCalcAvailable = calcData.length;

            // Identify Last 3 Months (from Calculation Set)
            const last3 = calcData.slice(-3);

            // Identify Previous 3 Months (for trend - from Calculation Set)
            let prev3 = [];
            if (totalCalcAvailable >= 6) {
                prev3 = calcData.slice(-6, -3);
            } else if (totalCalcAvailable > 3) {
                prev3 = calcData.slice(0, -3);
            }

            // Sum Calculations
            const sumLast3 = last3.reduce((acc, cur) => acc + cur.amount, 0);
            const sumPrev3 = prev3.reduce((acc, cur) => acc + cur.amount, 0);

            // Trend Calculation: ((Current - Previous) / Previous) * 100
            let trendPercent = 0;
            if (sumPrev3 > 0) {
                trendPercent = ((sumLast3 - sumPrev3) / sumPrev3) * 100;
            } else if (sumLast3 > 0) {
                trendPercent = 100;
            } else {
                trendPercent = 0;
            }

            const totalPurchaseGrowth = formatTrendPercent(trendPercent);

            // Generate Monthly History List (Newest First for UI List)
            // We use the FULL monthlyData here to show everything (including current)
            const monthlyHistory = monthlyData.map((m, index) => {
                const isCurrent = index === monthlyData.length - 1;
                return {
                    label: formatThaiMonth(m.month, isCurrent),
                    value: formatCurrency(m.amount)
                };
            }).reverse();

            financialSummary = {
                total_purchase_3_months: formatCurrency(sumLast3),
                total_purchase_growth: totalPurchaseGrowth,
                avg_monthly: formatCurrency(sumLast3 / 3),
                avg_monthly_trend: totalPurchaseGrowth, // Reuse trend for avg (math is same)
                monthly_history: monthlyHistory
            };

            // Generate Suggestions Logic (Adapted for Dynamic Data - Based on Calc Set)
            // 1. Total Purchase Value Check (Tiered based on Sum Last 3)
            if (sumLast3 > 1000000) {
                suggestions.push("เป็นลูกค้าชั้นดี มียอดซื้อสะสมสูง");
            } else if (sumLast3 > 300000) {
                suggestions.push("มียอดซื้อสะสมปานกลาง");
            } else if (sumLast3 > 0) {
                suggestions.push("ยอดซื้อสะสมอยู่ในระดับทั่วไป");
            } else {
                suggestions.push("ไม่มียอดซื้อสะสมในช่วง 3 เดือนล่าสุด");
            }

            // 2. Consistency Check (Check if all last 3 months have sales)
            const activeMonths = last3.filter(m => m.amount > 0).length;
            if (activeMonths === 3) {
                suggestions.push("มีการสั่งซื้อต่อเนื่องทุกเดือนในช่วง 3 เดือนล่าสุด");
            } else if (sumLast3 > 0) {
                suggestions.push("มีการเว้นช่วงการสั่งซื้อในบางเดือน");
            }

            // Churn Warning: No purchase in latest month
            if (last3.length > 0 && last3[last3.length - 1].amount === 0 && sumLast3 > 0) {
                suggestions.push("ไม่มียอดซื้อในเดือนล่าสุด ควรติดต่อลูกค้าเพื่อสอบถามสถานะ");
            }

            // 3. Trend Check
            if (trendPercent > 0) {
                suggestions.push("ลูกค้ามีแนวโน้มการซื้อที่ดีและเพิ่มขึ้นอย่างต่อเนื่อง");
            } else if (trendPercent < 0) {
                suggestions.push("ยอดการสั่งซื้อมีแนวโน้มลดลง ควรติดตามสาเหตุ");
            }

            suggestions.push("มีการชำระเงินตรงเวลา");
            suggestions.push("ไม่เคยมีประวัติหนี้เสีย");

        } else {
            // Empty Data
             financialSummary = {
                total_purchase_3_months: "0",
                total_purchase_growth: null,
                avg_monthly: "0",
                avg_monthly_trend: null,
                monthly_history: []
            };
            suggestions.push("ไม่พบข้อมูลประวัติการซื้อ");
        }

    } catch (apiErr) {
        console.error(`Error fetching purchasing behavior for ${customerNo}:`, apiErr);
        financialSummary = {
            total_purchase_3_months: "0",
            total_purchase_growth: null,
            avg_monthly: "0",
            avg_monthly_trend: null,
            monthly_history: [],
            error: "ไม่สามารถเรียกข้อมูลพฤติกรรมการซื้อได้"
        };
    }

    return {
        history,
        financial_summary: financialSummary,
        suggestions
    };
};

/**
 * Fallback Search Strategy (Local Database)
 */
const searchCustomersFallback = async (req, res, query) => {
    console.log(`[Search] API Failed. Falling back to local database for query: "${query}"`);

    let sql;
    if (db.dbType === 'mssql') {
      sql = `
        SELECT TOP 20
          "No_", "Name", "Contact", "Phone No_", "Fax No_", "E-Mail",
          "Telex No_", "Mobile Phone No_", "VAT Registration No_",
          "Address", "City", "County", "Post Code",
          "residence_latitude", "residence_longitude", "store_latitude", "store_longitude",
          "residence_landmark", "residence_note", "store_landmark", "store_note",
          "residence_map_code", "store_map_code",
          "authorized_person", "authorized_position", "contact_position", "contact_phone_number",
          "authorized_person_2", "authorized_position_2",
          "business_type", "main_products", "years_in_business",
          "contact_department", "contact_division",
          "billing_requirement", "billing_requirement_note",
          "billing_method", "billing_method_note",
          "billing_schedule", "billing_contact", "billing_department",
          "billing_phone", "billing_mobile", "billing_email",
          "existing_credits",
          "residence_location_type", "residence_location_type_other",
          "residence_ownership", "residence_ownership_other",
          "store_location_type", "store_location_type_other",
          "store_ownership", "store_ownership_other"
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
        SELECT *
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

        // Enrich with History & Financials
        const enriched = await enrichCustomerData(row["No_"]);

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
            // Coordinates & Extra Fields
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
          history: enriched.history,
          financial_summary: enriched.financial_summary,
          credit_score: {
               can_request_credit: true,
               badges: [],
               suggestions: enriched.suggestions
          },
          _source: 'database'
        };
      }));

      return res.json(results);

    } catch (err) {
      console.error("Database fallback error:", err);
      return res.status(500).json({ error: "Internal Server Error (Fallback)", details: err.message });
    }
};

/**
 * Main Search Controller
 * Strategy: Split & Merge (API) -> Fallback (DB)
 */
exports.searchCustomers = async (req, res) => {
  const query = req.query.q;

  if (!query) {
    return res.status(400).json({ error: "Query parameter 'q' is required" });
  }

  // 1. Try API Search
  try {
      const uniqueCustomers = await searchApiCustomers(query);

      if (uniqueCustomers.length === 0) {
          // API returned no results.
          // Unless the user wants fallback on "empty result", we return empty list.
          // Current policy: API is master.
          return res.json([]);
      }

      // Map & Enrich
      const mappedResults = await Promise.all(uniqueCustomers.map(async (row) => {
          // Address Concatenation
          const addressParts = [
              row["Address"],
              row["City"],
              row["County"],
              row["Post Code"]
          ].filter(part => part && part.trim() !== "");
          const fullAddress = addressParts.join(' ');

          const isCompany = row["VAT Registration No_"] && row["VAT Registration No_"].trim().length > 0;
          const customerType = isCompany ? 'Company' : 'Individual';

          // Side-load History & Financials from Local DB
          const enriched = await enrichCustomerData(row["No_"]);

          return {
              customer: {
                  id: row["No_"],
                  name: row["Name"],
                  contact_person: row["Contact"],
                  phone: row["Mobile Phone No_"] || row["Phone No_"],
                  email: row["E-Mail"],
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
              history: enriched.history,
              financial_summary: enriched.financial_summary,
              credit_score: {
                   can_request_credit: true,
                   badges: [],
                   suggestions: enriched.suggestions
              },
              _source: 'api'
          };
      }));

      return res.json(mappedResults);

  } catch (err) {
      // Fallback on any API error (Timeout, Network, 500)
      console.warn("API Search failed:", err.message);

      if (ENABLE_LOCAL_FALLBACK) {
         console.log(`[Search] Switching to fallback for query: "${query}"`);
         return searchCustomersFallback(req, res, query);
      } else {
         return res.status(503).json({ error: "External API Unavailable", details: err.message });
      }
  }
};

exports.getSuggestions = async (req, res) => {
  const query = req.query.q;

  if (!query) {
    return res.json([]);
  }

  try {
      // 1. Try API Search for suggestions
      const apiResults = await searchApiCustomers(query);

      // Map to suggestion format
      const suggestions = apiResults.map(row => ({
          id: row["No_"],
          name: row["Name"],
          phone: row["Phone No_"],
          mobile: row["Mobile Phone No_"]
      })).slice(0, 10); // Limit to 10

      // If API returns results, use them.
      if (suggestions.length > 0) {
          return res.json(suggestions);
      }

      // If API returns 0, and we have NO fallback enabled, we return 0.
      if (!ENABLE_LOCAL_FALLBACK) {
          return res.json([]);
      }

      // If Fallback IS enabled, proceed to DB code below...
      // (Falling through to existing DB code)

  } catch (err) {
      console.warn("API Suggestion failed:", err.message);
      if (!ENABLE_LOCAL_FALLBACK) {
          // If fallback disabled, return empty
          return res.json([]);
      }
      // If fallback enabled, catch block continues to DB code...
  }

  // --- LOCAL DB FALLBACK FOR SUGGESTIONS ---

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
