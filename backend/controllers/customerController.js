const db = require('../db');
const axios = require('axios');
const { calculateSlope, calculateTrendRatio, generateContinuousTimeline } = require('../services/financialCalculator');
const { normalizeName, extractLastName } = require('../utils/nameNormalizer');

// Configuration
const API_URL = process.env.CUSTOMER_API_URL || "http://192.192.0.37:8280/customer-sp682/1.0.0";
const API_KEY = process.env.CUSTOMER_API_KEY || "YOUR_API_KEY";

// Configuration
const FINANCIAL_API_URL = process.env.FINANCIAL_API_URL || "http://192.192.0.37:8280/sales-summary-6-months/1.0.0";
const CATEGORY_API_URL = process.env.CATEGORY_API_URL || "http://192.192.0.37:8280/sales-by-category-6-months/1.0.0";
const ENABLE_LOCAL_FALLBACK = process.env.ENABLE_LOCAL_FALLBACK === 'true';

// Global mock flag for external APIs
const MOCK_EXTERNAL_APIS = process.env.MOCK_EXTERNAL_APIS === 'true';

// MOCK FLAG for Financial API (Sandbox Environment) - Legacy
const MOCK_FINANCIAL_API = process.env.MOCK_FINANCIAL_API === 'true';

const { getMockFinancialData, getMockCategoryData } = require('../utils/mockData');

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

// Helper: Format Trend from Trend Ratio (1.10 -> +10%)
const formatTrendFromRatio = (ratio) => {
    if (ratio === null || isNaN(ratio)) return null;
    const percent = (ratio - 1) * 100;
    const absVal = Math.abs(percent).toFixed(2);
    // User requested format: "แนวโน้มการซื้อลดลง 10%"
    if (percent > 0.001) return `แนวโน้มการซื้อเพิ่มขึ้น ${absVal}%`;
    if (percent < -0.001) return `แนวโน้มการซื้อลดลง ${absVal}%`;
    return `แนวโน้มการซื้อคงที่ 0.00%`;
};

// Helper: Format Average Monthly Change from Slope
const formatAvgMonthlyChange = (slope) => {
    if (slope === null || isNaN(slope)) return null;
    const absVal = formatCurrency(Math.abs(slope)); // Use existing currency formatter
    if (slope > 0.001) return `เฉลี่ยซื้อเพิ่มขึ้นเดือนละ ${absVal} บาท`;
    if (slope < -0.001) return `เฉลี่ยซื้อลดลงเดือนละ ${absVal} บาท`;
    return `เฉลี่ยซื้อคงที่ 0.00 บาท`;
};

// Helper: Map Category Code to Label
const getCategoryLabel = (code) => {
    const map = {
        'A': 'อลูมิเนียม (A)',
        'G': 'กระจก (G)',
        'Y': 'ยิปซั่ม (Y)',
        'C': 'ซีลาย (C)',
        'E': 'Accessory (E)',
        'S': 'กาว (S)'
    };
    return map[code] || `Category ${code}`;
};

const fetchPurchasingBehavior = async (customerNo) => {
    if (MOCK_EXTERNAL_APIS || MOCK_FINANCIAL_API) {
        console.log(`[Financial API] Using Mock Data for ${customerNo}`);
        return getMockFinancialData(customerNo);
    }

    try {
        // Updated to POST method with JSON body
        const response = await axios.post(FINANCIAL_API_URL, {
            customer_code: customerNo
        }, {
            headers: {
                "apikey": API_KEY, // Reuse API_KEY from customer search if applicable, or check if distinct key needed
                "Content-Type": "application/json"
            },
            timeout: 5000
        });
        return response.data;
    } catch (error) {
        console.error(`Error fetching purchasing behavior for ${customerNo}:`, error.message);
        throw error;
    }
};

const fetchCategorySummary = async (customerNo, months = 6) => {
    if (MOCK_EXTERNAL_APIS) {
        console.log(`[Category API] Using Mock Data for ${customerNo}`);
        const mockData = getMockCategoryData(customerNo);
        const by_category = mockData.data.reduce((acc, item) => {
            const cat = item.category;
            const amount = item.total_amount || 0;
            acc[cat] = (acc[cat] || 0) + amount;
            return acc;
        }, {});
        return { by_category };
    }

    try {
        // Updated to POST method with JSON body
        const response = await axios.post(CATEGORY_API_URL, {
            customer_code: customerNo,
            months: months
        }, {
            headers: {
                "apikey": API_KEY,
                "Content-Type": "application/json"
            },
            timeout: 5000
        });

        // Transform response: Aggregate amounts by category
        const rawData = response.data.data || [];
        const by_category = rawData.reduce((acc, item) => {
            const cat = item.category;
            const amount = item.total_amount || 0;
            acc[cat] = (acc[cat] || 0) + amount;
            return acc;
        }, {});

        return { by_category };
    } catch (error) {
        console.error(`Error fetching category summary for ${customerNo}:`, error.message);
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

// Helper: Check Blacklist Status (Advanced)
const checkBlacklist = async ({ taxId, personNames = [], companyNames = [] }) => {
    let warningMatch = null;

    // 1. Check Tax ID (Highest Confidence / Block)
    if (taxId) {
        const normalized = String(taxId).replace(/\D/g, '');
        if (normalized) {
            const sql = `SELECT * FROM CustomerBlacklist WHERE normalized_id = ? LIMIT 1`;
            try {
                const { rows } = await db.query(sql, [normalized]);
                if (rows && rows.length > 0) {
                    console.log(`[Blacklist] MATCH Tax ID:`, rows[0]);
                    return {
                        is_blacklisted: true,
                        blacklist_data: {
                            status: rows[0]['สถานะ'],
                            remark: rows[0]['หมายเหตุ'],
                            match_type: 'Tax ID',
                            match_value: taxId
                        }
                    };
                }
            } catch (e) { console.error('Error checking blacklist TaxID:', e.message); }
        }
    }

    // 2. Check Person Names (Full Name & Last Name)
    for (const name of personNames) {
        if (!name || typeof name !== 'string') continue;
        const normalizedInput = normalizeName(name);
        if (!normalizedInput) continue;

        // 2.1 Full Name Match (High Confidence / Block)
        try {
            const sql = `SELECT * FROM CustomerBlacklist WHERE normalized_name = ? LIMIT 1`;
            const { rows } = await db.query(sql, [normalizedInput]);
            if (rows && rows.length > 0) {
                 console.log(`[Blacklist] MATCH Full Name:`, rows[0]);
                 return {
                    is_blacklisted: true,
                    blacklist_data: {
                        status: rows[0]['สถานะ'],
                        remark: rows[0]['หมายเหตุ'],
                        match_type: 'Full Name',
                        match_value: name
                    }
                };
            }
        } catch (e) { console.error('Error checking blacklist FullName:', e.message); }

        // 2.2 Last Name Match (Warning / Low Confidence)
        // Only record warning if we don't already have one (or prioritize?)
        // We continue checking for Blocks.
        if (!warningMatch) {
            const lastName = extractLastName(normalizedInput);
            if (lastName) {
                 try {
                    // Match exact normalized name = Lastname OR ends with " Lastname"
                    const sql = `SELECT * FROM CustomerBlacklist WHERE normalized_name = ? OR normalized_name LIKE ? LIMIT 1`;
                    const { rows } = await db.query(sql, [lastName, `% ${lastName}`]);

                    if (rows && rows.length > 0) {
                        console.log(`[Blacklist] MATCH Last Name (Warning stored):`, rows[0]);
                        warningMatch = {
                            is_blacklisted: true,
                            blacklist_data: {
                                status: rows[0]['สถานะ'],
                                remark: `(ตรงกับนามสกุลในระบบ Blacklist) ${rows[0]['หมายเหตุ']}`,
                                match_type: 'Last Name',
                                match_value: lastName,
                                severity: 'warning'
                            }
                        };
                    }
                 } catch (e) { console.error('Error checking blacklist LastName:', e.message); }
            }
        }
    }

    // 3. Check Company Names (Shop Name) - Block
    for (const company of companyNames) {
        if (!company || typeof company !== 'string') continue;
        const normalizedComp = normalizeName(company);
        if (!normalizedComp) continue;

        try {
            const sql = `SELECT * FROM CustomerBlacklist WHERE normalized_shop = ? LIMIT 1`;
            const { rows } = await db.query(sql, [normalizedComp]);
             if (rows && rows.length > 0) {
                 console.log(`[Blacklist] MATCH Company Name:`, rows[0]);
                 return {
                    is_blacklisted: true,
                    blacklist_data: {
                        status: rows[0]['สถานะ'],
                        remark: rows[0]['หมายเหตุ'],
                        match_type: 'Company Name',
                        match_value: company
                    }
                };
            }
        } catch (e) { console.error('Error checking blacklist Company:', e.message); }
    }

    // If no Block found, return Warning (if exists)
    if (warningMatch) {
        return warningMatch;
    }

    return { is_blacklisted: false, blacklist_data: null };
};

/**
 * Enriches a customer object with local database data (History, Financials).
 * @param {string} customerNo - The customer ID (No_).
 * @param {number} currentCreditLimit - The customer's current credit limit.
 * @returns {Promise<Object>} - Object containing { history, financial_summary, suggestions }
 */
const enrichCustomerData = async (customerNo, currentCreditLimit = 0) => {
    let financialSummary = {};
    let suggestions = [];
    let history = [];

    // Determine the number of months to fetch for the category summary
    // Existing customers (Credit > 10) use 6 months, new customers use 3 months
    const categoryMonths = currentCreditLimit > 10 ? 6 : 3;

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
        const results = await Promise.allSettled([
            fetchPurchasingBehavior(customerNo),
            fetchCategorySummary(customerNo, categoryMonths)
        ]);

        const apiDataResult = results[0];
        const categoryDataResult = results[1];

        // Process Category Data (Graceful Failure)
        let categoryBreakdown = [];
        if (categoryDataResult.status === 'fulfilled') {
            const categoryData = categoryDataResult.value;
            if (categoryData && categoryData.by_category) {
                 const entries = Object.entries(categoryData.by_category);
                 // Calculate Total for Percentage
                 const totalSales = entries.reduce((sum, [_, val]) => sum + val, 0);

                 categoryBreakdown = entries.map(([key, value]) => ({
                     label: getCategoryLabel(key),
                     value: value,
                     formattedValue: formatCurrency(value),
                     percentage: totalSales > 0 ? (value / totalSales) * 100 : 0
                 }));

                 // Sort Descending
                 categoryBreakdown.sort((a, b) => b.value - a.value);
            }
        } else {
            console.warn(`[Warning] Failed to fetch category summary for ${customerNo}:`, categoryDataResult.reason.message);
            // Append warning to suggestions/status later if needed
            suggestions.push("ไม่สามารถดึงข้อมูลสัดส่วนสินค้า (Category Summary) ได้");
        }

        // Process Financial Data (Critical)
        if (apiDataResult.status === 'rejected') {
            throw new Error(`Financial API Failed: ${apiDataResult.reason.message}`);
        }

        const apiData = apiDataResult.value;

        // Support both old 'monthly' and new 'data' formats
        const monthlyData = apiData && (apiData.monthly || apiData.data);

        if (monthlyData) {
            // New Logic: Use Continuous Timeline (Fixes gap issues)
            // This returns 7 months: [Month-6, Month-5, ..., Month-1, CurrentMonth]
            // Gaps are filled with 0.
            const timeline = generateContinuousTimeline(monthlyData);

            const now = new Date();
            const currentYear = now.getFullYear();
            const currentMonthIdx = now.getMonth() + 1; // 1-12
            const currentSystemMonth = `${currentYear}-${String(currentMonthIdx).padStart(2, '0')}`;

            // Calculation Set: ALWAYS Exclude the last item (which is strictly the Current System Month)
            // The generateContinuousTimeline function guarantees the last item is 'Current System Month'.
            const calcData = timeline.slice(0, -1); // Take first 6 items (the completed months)

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

            // Slope & Trend Ratio Calculation
            const slope = calculateSlope(last3);
            const averagePerMonth = sumLast3 / 3;
            const trendRatio = calculateTrendRatio(slope, averagePerMonth);

            const totalPurchaseGrowth = formatTrendFromRatio(trendRatio);
            const avgMonthlyTrend = formatAvgMonthlyChange(slope);

            // Generate Monthly History List (Newest First for UI List)
            // We use the FULL timeline here to show everything (including current month, even if 0)
            const monthlyHistory = timeline.map((m) => {
                const isCurrent = m.month === currentSystemMonth;
                return {
                    label: formatThaiMonth(m.month, isCurrent),
                    value: formatCurrency(m.amount)
                };
            }).reverse();

            financialSummary = {
                total_purchase_3_months: formatCurrency(sumLast3),
                total_purchase_growth: totalPurchaseGrowth,
                avg_monthly: formatCurrency(sumLast3 / 3),
                avg_monthly_trend: avgMonthlyTrend, // Use distinct Slope-based string
                monthly_history: monthlyHistory,
                category_breakdown: categoryBreakdown,
                category_months_used: categoryMonths
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

            // 3. Trend Check (Updated to use Slope)
            if (slope > 0) {
                const growthAmt = formatCurrency(Math.abs(slope));
                suggestions.push(`ลูกค้ามีแนวโน้มการเติบโตยอดซื้อที่ดี (เฉลี่ยเพิ่มขึ้น ${growthAmt} บาท/เดือน)`);
            } else if (slope < 0) {
                const dropAmt = formatCurrency(Math.abs(slope));
                suggestions.push(`ยอดซื้อมีแนวโน้มลดลง (เฉลี่ยลดลง ${dropAmt} บาท/เดือน) ควรติดตามสาเหตุ`);
            } else if (sumLast3 > 0) {
                suggestions.push("ยอดซื้อสม่ำเสมอ");
            }

            suggestions.push("มีการชำระเงินตรงเวลา");

        } else {
            // Empty Data
             financialSummary = {
                total_purchase_3_months: "0",
                total_purchase_growth: null,
                avg_monthly: "0",
                avg_monthly_trend: null,
                monthly_history: [],
                category_breakdown: categoryBreakdown,
                category_months_used: categoryMonths
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
            category_breakdown: [],
            category_months_used: categoryMonths,
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
          "residence_value",
          "store_location_type", "store_location_type_other",
          "store_ownership", "store_ownership_other",
          "store_value"
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
        const currentCreditLimit = parseFloat(row["Fixed Credit Limit"]) || 0;
        const enriched = await enrichCustomerData(row["No_"], currentCreditLimit);

        // Blacklist Check (Advanced)
        const isCompanyRec = row["VAT Registration No_"] && row["VAT Registration No_"].trim().length > 0;
        const personNamesRec = [row["Contact"], row["authorized_person"], row["authorized_person_2"]];
        const companyNamesRec = [];

        if (isCompanyRec) {
            companyNamesRec.push(row["Name"]);
        } else {
            personNamesRec.push(row["Name"]);
        }

        const blacklistInfo = await checkBlacklist({
            taxId: row["VAT Registration No_"],
            personNames: personNamesRec,
            companyNames: companyNamesRec
        });

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
            residence_value: row["residence_value"] || "",
            store_location_type: row["store_location_type"] || "",
            store_location_type_other: row["store_location_type_other"] || "",
            store_ownership: row["store_ownership"] || "",
            store_ownership_other: row["store_ownership_other"] || "",
            store_value: row["store_value"] || "",
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
          financial_summary: {
              ...enriched.financial_summary,
              is_blacklisted: blacklistInfo.is_blacklisted,
              blacklist_data: blacklistInfo.blacklist_data
          },
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

  if (MOCK_EXTERNAL_APIS) {
      console.log(`[Search] MOCK_EXTERNAL_APIS is true. Skipping API and using local DB...`);
      // Use fallback logic by skipping try block
  } else {
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
              // DEBUG: Log the raw row to inspect Tax ID field
              console.log(`[Search] Processing customer: ${row["No_"]}. Tax ID (VAT Registration No_): '${row["VAT Registration No_"]}'`);

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

              // Extract Customer Date (New Field)
              const customerSince = row["Customer Date"] || null;

              // Side-load History & Financials from Local DB
              const currentCreditLimit = parseFloat(row["Fixed Credit Limit"]) || 0;
              const enriched = await enrichCustomerData(row["No_"], currentCreditLimit);

              // Improved Blacklist Logic: Gather Tax ID and Names (from API + Local Fallback)
              let taxId = row["VAT Registration No_"];
              const personNames = [row["Contact"]]; // API Contact
              const companyNames = [];

              // API Name Field classification
              const isCompanyCheck = taxId && taxId.trim().length > 0;
              if (isCompanyCheck) {
                   companyNames.push(row["Name"]);
              } else {
                   personNames.push(row["Name"]);
              }

              // Fetch additional local data for comprehensive check (Authorized Persons, Local Tax ID)
              try {
                  const localRes = await db.query(`SELECT "VAT Registration No_", "authorized_person", "authorized_person_2", "Contact", "Name" FROM Customers WHERE "No_" = ? LIMIT 1`, [row["No_"]]);
                  if (localRes && localRes.rows && localRes.rows.length > 0) {
                      const localData = localRes.rows[0];

                      // Fallback Tax ID
                      if (!taxId || taxId.trim() === '') {
                          taxId = localData['VAT Registration No_'];
                          console.log(`[Blacklist] Using Local DB Tax ID for ${row["No_"]}: ${taxId}`);
                      }

                      // Add Local Names
                      if (localData['authorized_person']) personNames.push(localData['authorized_person']);
                      if (localData['authorized_person_2']) personNames.push(localData['authorized_person_2']);
                  }
              } catch (e) {
                  console.error(`[Blacklist] Failed to lookup local data for ${row["No_"]}`, e);
              }

              const blacklistInfo = await checkBlacklist({
                  taxId,
                  personNames,
                  companyNames
              });

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
                      zipcode: row["Post Code"],
                      customer_since: customerSince,
                      payment_terms_code: row["Payment Terms Code"],
                      billing_terms_code: row["Billing Terms Code"],
                      current_credit_limit: row["Fixed Credit Limit"]
                  },
                  history: enriched.history,
                  financial_summary: {
                      ...enriched.financial_summary,
                      is_blacklisted: blacklistInfo.is_blacklisted,
                      blacklist_data: blacklistInfo.blacklist_data
                  },
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

          if (!ENABLE_LOCAL_FALLBACK) {
             return res.status(503).json({ error: "External API Unavailable", details: err.message });
          }
      }
  }

  // --- LOCAL DB FALLBACK FOR SEARCH ---
  console.log(`[Search] Switching to fallback for query: "${query}"`);
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
        "residence_value",
        "store_location_type", "store_location_type_other",
        "store_ownership", "store_ownership_other",
        "store_value"
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
      const currentCreditLimit = parseFloat(row["Fixed Credit Limit"]) || 0;
      const enriched = await enrichCustomerData(row["No_"], currentCreditLimit);

      // Blacklist Check (Advanced)
      const isCompanyRec = row["VAT Registration No_"] && row["VAT Registration No_"].trim().length > 0;
      const personNamesRec = [row["Contact"], row["authorized_person"], row["authorized_person_2"]];
      const companyNamesRec = [];

      if (isCompanyRec) {
          companyNamesRec.push(row["Name"]);
      } else {
          personNamesRec.push(row["Name"]);
      }

      const blacklistInfo = await checkBlacklist({
          taxId: row["VAT Registration No_"],
          personNames: personNamesRec,
          companyNames: companyNamesRec
      });

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
          residence_value: row["residence_value"] || "",
          store_location_type: row["store_location_type"] || "",
          store_location_type_other: row["store_location_type_other"] || "",
          store_ownership: row["store_ownership"] || "",
          store_ownership_other: row["store_ownership_other"] || "",
          store_value: row["store_value"] || "",
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
        financial_summary: {
            ...enriched.financial_summary,
            is_blacklisted: blacklistInfo.is_blacklisted,
            blacklist_data: blacklistInfo.blacklist_data
        },
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

exports.getSuggestions = async (req, res) => {
  const query = req.query.q;

  if (!query) {
    return res.json([]);
  }

  if (MOCK_EXTERNAL_APIS) {
      console.log(`[Suggestion] MOCK_EXTERNAL_APIS is true. Skipping API and using local DB...`);
      // Use fallback logic by skipping try block
  } else {
      try {
      // 1. Try API Search for suggestions
      const apiResults = await searchApiCustomers(query);

      // Map to suggestion format
      const suggestions = apiResults.map(row => ({
          id: row["No_"],
          name: row["Name"],
          phone: row["Phone No_"],
          mobile: row["Mobile Phone No_"]
      })).slice(0, 4); // Limit to 4

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
  // Fix: Removed extra param for SQLite (4 placeholders vs 5 params)
  const params = db.dbType === 'mssql'
      ? [searchPattern, searchPattern, searchPattern, searchPattern]
      : [searchPattern, searchPattern, searchPattern, searchPattern];

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
    'residence_value',
    'store_location_type',
    'store_location_type_other',
    'store_ownership',
    'store_ownership_other',
    'store_value',
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

exports.searchCustomersByBranch = async (req, res) => {
    const { branchCode } = req.query;

    if (!branchCode) {
        return res.status(400).json({ error: "Branch Code is required" });
    }

    try {
        console.log(`[CustomerAPI] Fetching customers for branch: ${branchCode}`);

        // Construct Payload
        const payload = {
            "Branch Code": { "$eq": branchCode },
            "Billing Terms Code": { "$ne": " " },
            "Fixed Credit Limit": { "$gt": 1 }
        };

        // Call API
        // Using a large size to fetch all records (as per requirement "fetch all active customer on one go")
        const response = await axios.post(API_URL, {
            page: 1,
            size: 2000, // Large enough to cover most branches
            ...payload
        }, {
            headers: {
                "apikey": API_KEY,
                "Content-Type": "application/json"
            },
            timeout: 10000 // Increased timeout for large data
        });

        const data = response.data.data || [];

        // Filter and Map necessary fields
        // We only need basic info for the queue: No_, Name, Tax ID, Limit, Terms
        const result = data.map(item => ({
            No_: item["No_"],
            Name: item["Name"],
            VAT_Registration_No_: item["VAT Registration No_"],
            Fixed_Credit_Limit: item["Fixed Credit Limit"],
            Payment_Terms_Code: item["Payment Terms Code"],
            Billing_Terms_Code: item["Billing Terms Code"],
            Customer_Date: item["Customer Date"]
        }));

        console.log(`[CustomerAPI] Found ${result.length} customers for branch ${branchCode}`);
        return res.json(result);

    } catch (error) {
        console.error(`[CustomerAPI] Error fetching by branch ${branchCode}:`, error.message);
        return res.status(502).json({ error: "Failed to fetch customers from API", details: error.message });
    }
};

exports.checkBlacklist = checkBlacklist;
