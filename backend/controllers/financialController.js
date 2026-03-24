const logger = require('../utils/logger');
const xlsx = require('xlsx');
const db = require('../db');
const axios = require('axios');
const fs = require('fs-extra');
const path = require('path');
const { calculateSlope, calculateTrendRatio, generateContinuousTimeline, findYearlySeries } = require('../services/financialCalculator');
const ScoringEngine = require('../services/scoring/ScoringEngine');
const { extractDBDData } = require('../utils/pdfExtractor');
const pdf = require('pdf-parse');

// Configuration
const FINANCIAL_API_URL = "http://192.192.0.37:8280/sales-summary-6-months/1.0.0";
const FINANCIAL_API_TAX_URL = "http://192.192.0.37:8000/api/customer-analytics/monthly-summary";
const LATE_PAYMENT_API_URL = "http://192.192.0.37:8280/customer-late-payment/1.0.0";
// New WADL API Endpoint
const LATE_PAYMENT_WADL_API_URL = "http://192.192.0.37:8280/weight-baselatepayment/1.0.0";

const API_KEY = process.env.CUSTOMER_API_KEY || "YOUR_API_KEY";
// Separate API Key for Late Payment Service (if different from Customer API)
const LATE_PAYMENT_API_KEY = process.env.LATE_PAYMENT_API_KEY || API_KEY;
// Dedicated API Key for WADL Service
const LATE_PAYMENT_WADL_API_KEY = process.env.LATE_PAYMENT_WADL_API_KEY || "YOUR_WADL_API_KEY";

// Global mock flag for external APIs
const MOCK_EXTERNAL_APIS = process.env.MOCK_EXTERNAL_APIS === 'true';

// MOCK FLAG for Financial API (Sandbox Environment) - Legacy
const MOCK_FINANCIAL_API = process.env.MOCK_FINANCIAL_API === 'true';

const { getMockFinancialData, getMockLatePaymentData } = require('../utils/mockData');

// --- HELPER FUNCTIONS ---

// Helper: Convert 0-based index to Excel Column Letter (0->A, 25->Z, 26->AA)
const indexToColumn = (i) => {
  if (i < 0) return '?';
  let letter = '';
  while (i >= 0) {
    letter = String.fromCharCode((i % 26) + 65) + letter;
    i = Math.floor(i / 26) - 1;
  }
  return letter;
};

// Helper: Parse float from string/number
const parseAmount = (str) => {
  if (str === null || str === undefined || str === '') return 0;
  if (typeof str === 'number') return str;
  let val = str.toString();
  // Remove commas
  val = val.replace(/,/g, '');
  // Handle parentheses for negative numbers (100) -> -100
  if (val.includes('(') && val.includes(')')) {
    val = val.replace(/[()]/g, '');
    val = -1 * parseFloat(val);
  } else {
    val = parseFloat(val);
  }
  return isNaN(val) ? 0 : val;
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

// Helper: Sanitize Invoices (Handle 1753 Cleared Date & Future Check Dates)
const sanitizeInvoices = (invoices) => {
    if (!invoices || !Array.isArray(invoices)) return invoices;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return invoices.map(inv => {
        // 1. Check for Invalid Cleared Date (1753-01-01 from SQL)
        const clearedDateStr = inv['Cleared Date'] || inv.cleared_date || inv.Cleared_Date;
        const checkDateStr = inv['Check Date'] || inv.check_date || inv.Check_Date;

        let isInvalidCleared = false;
        if (clearedDateStr && String(clearedDateStr).startsWith('1753-01-01')) {
            isInvalidCleared = true;
        }

        // 2. Check for Future Check Date
        let isFutureCheck = false;
        if (checkDateStr) {
            const checkDate = new Date(checkDateStr);
            if (!isNaN(checkDate.getTime())) {
                checkDate.setHours(0, 0, 0, 0);
                if (checkDate > today) {
                    isFutureCheck = true;
                }
            }
        }

        // If either condition is met, mark as NOT PAID (Effective Payment Date = null)
        if (isInvalidCleared || isFutureCheck) {
            inv.Effective_Payment_Date = null;
            // Ensure consistency: if not paid, it shouldn't have late days (or be counted as on time)
            // But main logic filters by Effective_Payment_Date, so nulling it is key.
        }
        return inv;
    });
};

// Helper: Fetch Purchasing Behavior from External API
const fetchPurchasingBehavior = async (customerNo, taxId = null) => {
    if (MOCK_EXTERNAL_APIS || MOCK_FINANCIAL_API) {
        logger.info(`[Financial API] Using Mock Data for ${customerNo}`);
        const data = getMockFinancialData(customerNo);
        data.fetchSource = taxId ? 'tax_no' : 'customer_code';
        return data;
    }

    try {
        if (taxId && taxId.trim().length > 0) {
            logger.info(`[Financial API] Fetching via tax_no: ${taxId} for customer: ${customerNo}`);
            const response = await axios.get(FINANCIAL_API_TAX_URL, {
                params: { tax_no: taxId.trim() },
                headers: {
                    "apikey": API_KEY,
                    "Content-Type": "application/json"
                },
                timeout: 5000
            });
            logger.info(`[Financial API] Success for ${customerNo} (via tax_no)`);
            const data = response.data;
            if (data) {
                data.fetchSource = 'tax_no';
            }
            return data;
        }
    } catch (error) {
         logger.warn(`[Financial API] Failed fetching via tax_no for ${customerNo}. Error: ${error.message}. Falling back to customer_code...`);
    }

    try {
        logger.info(`[Financial API] Fetching via customer_code for ${customerNo} from ${FINANCIAL_API_URL}`);
        const response = await axios.post(FINANCIAL_API_URL, {
            customer_code: customerNo
        }, {
            headers: {
                "apikey": API_KEY, // Reuse existing API Key
                "Content-Type": "application/json"
            },
            timeout: 5000
        });
        logger.info(`[Financial API] Success for ${customerNo}`);
        return response.data;
    } catch (error) {
        logger.error(`[Financial API] Error fetching purchasing behavior for ${customerNo}:`, error.message);
        // Return null to indicate failure/no data
        return null;
    }
};

// Helper: Fetch Late Payment Data from External API
const fetchLatePaymentData = async (customerNo) => {
    try {
        let data;
        if (MOCK_EXTERNAL_APIS) {
            logger.info(`[Late Payment API] Using Mock Data for ${customerNo}`);
            data = getMockLatePaymentData(customerNo);
        } else {
            logger.info(`[Late Payment API] Fetching data for ${customerNo} from ${LATE_PAYMENT_API_URL}`);

            // Debug API Key (First 5 chars)
            if (!LATE_PAYMENT_API_KEY || LATE_PAYMENT_API_KEY === 'YOUR_API_KEY') {
                logger.warn('[Late Payment API] WARNING: LATE_PAYMENT_API_KEY is not set or is default placeholder.');
            } else {
                const maskedKey = LATE_PAYMENT_API_KEY.substring(0, 5) + '...';
                logger.info(`[Late Payment API] Using API Key: ${maskedKey}`);
            }

            const response = await axios.post(LATE_PAYMENT_API_URL, {
                "Customer No_": customerNo
            }, {
                headers: {
                    "apikey": LATE_PAYMENT_API_KEY,
                    "Content-Type": "application/json"
                },
                timeout: 5000
            });
            data = response.data;
        }
        // Check if data is array (direct list) or object with data property
        let invoices = Array.isArray(data) ? data : (data.data || []);

        if (!invoices || invoices.length === 0) {
             return { average_late_days: 0, total_invoices: 0, late_count: 0 };
        }

        // Sanitize Data (Handle 1753 / Future Checks)
        invoices = sanitizeInvoices(invoices);

        // Filter invoices: Only consider those with a valid Effective Payment Date (Paid Invoices)
        // Invoices with null/empty Effective Payment are Outstanding/Unpaid and should not skew the average (as 0 late days).
        const paidInvoices = invoices.filter(inv => inv.Effective_Payment_Date && inv.Effective_Payment_Date.trim() !== '');

        let totalLateDays = 0;
        let lateCount = 0;

        paidInvoices.forEach(inv => {
            const lateDays = Number(inv.Late_Days) || 0;
            totalLateDays += lateDays;
            if (lateDays > 0) lateCount++;

            // Enhanced Payment Method Detection (Cheque vs Cash)
            // If Payment_Method is missing but Check Date or Cleared Date exists, assume Cheque.
            if (!inv.Payment_Method && !inv.payment_method) {
                const checkDate = inv['Check Date'] || inv.check_date || inv.Check_Date;
                const clearedDate = inv['Cleared Date'] || inv.cleared_date || inv.Cleared_Date;

                const hasCheckDate = checkDate && String(checkDate).trim() !== '';
                const hasClearedDate = clearedDate && String(clearedDate).trim() !== '';

                if (hasCheckDate || hasClearedDate) {
                    inv.Payment_Method = 'เช็ค';
                    inv.payment_method = 'เช็ค'; // CamelCase alias
                } else {
                    inv.Payment_Method = 'เงินสด/โอน';
                    inv.payment_method = 'เงินสด/โอน';
                }
            }
        });

        // Calculate Average based on PAID invoices only
        const avg = paidInvoices.length > 0 ? (totalLateDays / paidInvoices.length) : 0;

        return {
            average_late_days: Number(avg.toFixed(2)),
            total_invoices: invoices.length,      // Total records (Paid + Outstanding)
            paid_invoices_count: paidInvoices.length, // Denominator for average
            late_count: lateCount,                // Count of late payments (among paid)
            invoices: invoices                    // Return raw list for debugging (UI can color code Outstanding)
        };

    } catch (error) {
        logger.error(`[Late Payment API] Error fetching data for ${customerNo}:`, error.message);
        if (error.response) {
            logger.error('[Late Payment API] Response Status:', error.response.status);
            logger.error('[Late Payment API] Response Headers:', JSON.stringify(error.response.headers));
            logger.error('[Late Payment API] Response Data:', JSON.stringify(error.response.data).substring(0, 500));
        }
        return null; // Return null to indicate error/no data available
    }
};

/**
 * EXPERIMENTAL: Calculate Weighted Average Days Late (WADL)
 * Formula: SUM(Amount * LateDays) / SUM(Amount)
 * Filter: Paid Invoices Only, Last 6 Months
 */
const calculateWADL = (invoices) => {
    if (!invoices || invoices.length === 0) return { score: 0, grade: 'N/A' };

    // Enrich Payment Method (Cheque vs Cash) if missing
    // This mirrors the logic in fetchLatePaymentData to ensure consistency across reports
    invoices.forEach(inv => {
        if (!inv.Payment_Method && !inv.payment_method) {
            const checkDate = inv['Check Date'] || inv.check_date || inv.Check_Date;
            const clearedDate = inv['Cleared Date'] || inv.cleared_date || inv.Cleared_Date;

            const hasCheckDate = checkDate && String(checkDate).trim() !== '';
            const hasClearedDate = clearedDate && String(clearedDate).trim() !== '';

            if (hasCheckDate || hasClearedDate) {
                inv.Payment_Method = 'เช็ค';
                inv.payment_method = 'เช็ค';
            } else {
                inv.Payment_Method = 'เงินสด/โอน';
                inv.payment_method = 'เงินสด/โอน';
            }
        }
    });

    // 1. Filter Timeframe (Last 6 Months) & Paid Status
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const paidInvoices = invoices.filter(inv => {
        // Must be paid
        if (!inv.Effective_Payment_Date) return false;

        // Must be within timeframe (Use Posting Date or Invoice Date as anchor)
        // Some APIs return Posting_Date, others Invoice_Date. Check both.
        const dateStr = inv.Posting_Date || inv.Invoice_Date;
        if (!dateStr) return false;

        const postingDate = new Date(dateStr);
        return postingDate >= sixMonthsAgo;
    });

    if (paidInvoices.length === 0) return { score: 0, grade: 'No Data' };

    let totalWeightedDelay = 0;
    let totalAmount = 0;

    paidInvoices.forEach(inv => {
        const amount = Number(inv.Amount || inv.amount || 0); // Need Amount field!
        const lateDays = Number(inv.Late_Days || inv.late_days || 0);

        if (amount > 0) {
            totalWeightedDelay += (amount * lateDays);
            totalAmount += amount;
        }
    });

    const wadl = totalAmount > 0 ? (totalWeightedDelay / totalAmount) : 0;

    // Grading Scale (Experimental)
    let grade = 'A';
    if (wadl > 30) grade = 'D';
    else if (wadl > 15) grade = 'C';
    else if (wadl > 7) grade = 'B';

    return {
        score: Number(wadl.toFixed(2)),
        grade: grade,
        invoice_count: paidInvoices.length,
        total_value: totalAmount,
        invoices: invoices // Return original invoices (with Amount) for frontend display
    };
};

// Helper: Fetch WADL Data from External API
const fetchWADLData = async (customerNo) => {
    try {
        let data;
        if (MOCK_EXTERNAL_APIS) {
            logger.info(`[WADL API] Using Mock Data for ${customerNo}`);
            data = getMockLatePaymentData(customerNo);
        } else {
            logger.info(`[WADL API] Fetching data for ${customerNo} from ${LATE_PAYMENT_WADL_API_URL}`);

            if (!LATE_PAYMENT_WADL_API_KEY || LATE_PAYMENT_WADL_API_KEY === 'YOUR_WADL_API_KEY') {
                logger.warn('[WADL API] WARNING: LATE_PAYMENT_WADL_API_KEY is not set or is default placeholder.');
            } else {
                const maskedKey = LATE_PAYMENT_WADL_API_KEY.substring(0, 5) + '...';
                logger.info(`[WADL API] Using API Key: ${maskedKey}`);
            }

            const response = await axios.post(LATE_PAYMENT_WADL_API_URL, {
                "Customer No_": customerNo
            }, {
                headers: {
                    "apikey": LATE_PAYMENT_WADL_API_KEY,
                    "Content-Type": "application/json"
                },
                timeout: 5000
            });
            data = response.data;
        }
        let invoices = Array.isArray(data) ? data : (data.data || []);

        if (!invoices || invoices.length === 0) {
             return { score: 0, grade: 'N/A' };
        }

        // Sanitize Data (Handle 1753 / Future Checks)
        invoices = sanitizeInvoices(invoices);

        return calculateWADL(invoices);

    } catch (error) {
        logger.error(`[WADL API] Error fetching data for ${customerNo}:`, error.message);
        return { score: 0, grade: 'Error' }; // Return error state
    }
};

// Helper to find value in a sheet based on row label (or keywords) and strategy
const findValue = (sheet, searchTerms, strategy = 'AMOUNT') => {
  const data = xlsx.utils.sheet_to_json(sheet, { header: 1 });

  // 1. Determine Target Column based on Headers (Global Sheet Context)
  let targetColIndex = -1;
  const headerRowsToCheck = 10; // Check first 10 rows for headers

  if (strategy === 'AMOUNT') {
    // Strategy: Find 'จำนวนเงิน' (Amount). Use the last occurrence (latest year).
    for (let r = 0; r < Math.min(data.length, headerRowsToCheck); r++) {
      const row = data[r] || [];
      for (let c = 0; c < row.length; c++) {
        const cell = row[c];
        if (cell && typeof cell === 'string' && cell.includes('จำนวนเงิน')) {
          if (c > targetColIndex) {
            targetColIndex = c;
          }
        }
      }
    }
  } else if (strategy === 'RATIO') {
    // Strategy: Find Years (4 digits like 2567, 2024). Pick the max year.
    let maxYear = 0;
    for (let r = 0; r < Math.min(data.length, headerRowsToCheck); r++) {
      const row = data[r] || [];
      for (let c = 0; c < row.length; c++) {
        const cell = row[c];
        let yearVal = 0;
        if (typeof cell === 'number' && cell > 2000 && cell < 3000) yearVal = cell;
        else if (typeof cell === 'string' && /^\d{4}$/.test(cell.trim())) yearVal = parseInt(cell.trim());

        if (yearVal > maxYear) {
          maxYear = yearVal;
          targetColIndex = c;
        }
      }
    }
  }

  // 2. Find the Row matching the Label/Keywords
  for (let r = 0; r < data.length; r++) {
    const row = data[r];
    if (row && row.length > 0) {
      const rowString = row.join(' ').toLowerCase();

      let match = false;
      if (Array.isArray(searchTerms)) {
        match = searchTerms.every(term => rowString.includes(term.toLowerCase()));
      } else {
        match = rowString.includes(searchTerms.toLowerCase());
      }

      if (match) {
        let finalValue = 0;
        let finalColIndex = -1;

        // Path A: We found a definitive Target Column from headers
        if (targetColIndex !== -1) {
           if (targetColIndex < row.length) {
             finalValue = parseAmount(row[targetColIndex]);
             finalColIndex = targetColIndex;
           }
        }

        // Path B: Fallback (No Header found or Empty Cell at Target)
        if (targetColIndex === -1) {
             const validCells = [];
             for(let c = 0; c < row.length; c++) {
               const val = row[c];
               if (val !== null && val !== undefined && val !== '') {
                 validCells.push({ val: val, idx: c });
               }
             }

             if (validCells.length > 0) {
               if (strategy === 'AMOUNT') {
                 // Heuristic for Amount vs % Change
                 const last = validCells[validCells.length - 1];
                 const prev = validCells.length > 1 ? validCells[validCells.length - 2] : null;
                 const lastNum = parseAmount(last.val);
                 const prevNum = prev ? parseAmount(prev.val) : 0;

                 if (Math.abs(lastNum) < 500 && Math.abs(prevNum) > 1000) {
                    finalValue = prevNum;
                    finalColIndex = prev.idx;
                 } else {
                    finalValue = lastNum;
                    finalColIndex = last.idx;
                 }
               } else {
                 // RATIO Strategy Fallback
                 const last = validCells[validCells.length - 1];
                 finalValue = parseAmount(last.val);
                 finalColIndex = last.idx;
               }
             }
        }

        return {
          value: finalValue,
          column: indexToColumn(finalColIndex)
        };
      }
    }
  }

  return { value: 0, column: '' };
};

// --- MAIN CONTROLLER LOGIC ---

exports.analyzeFinancials = async (req, res) => {
  try {
    const files = req.files || {};
    const {
      registered_capital,
      request_amount,
      customer_no,
      customer_name,
      customer_duration,
      years_in_business,
      request_credit_term,
      residence_ownership,
      residence_ownership_other,
      model_type, // 'new' or 'existing'
      limit_exponent, // Optional override
      wadl, // Manual override for WADL
      tax_id
    } = req.body;

    // --- LOCAL FILE HANDLING ---
    let localRegisteredCapital = 0;
    let localYearsInBusiness = 0;

    if (req.body.use_local === 'true' && customer_no) {
        try {
             let projectRoot = path.resolve(__dirname, '../../../../');
             // Fallback for dev/sandbox environment (2 levels up)
             if (!await fs.pathExists(path.join(projectRoot, 'customers'))) {
                 projectRoot = path.resolve(__dirname, '../../');
             }

             const customerRoot = path.join(projectRoot, 'customers', customer_no);
        logger.info(`[DEBUG] Checking local files for ${customer_no} at path: ${customerRoot}`);

             // Find latest folder logic again (safety)
             if (await fs.pathExists(customerRoot)) {
                 const subdirs = await fs.readdir(customerRoot);
                 const dateFolders = subdirs.filter(d => /^\d{8}$/.test(d)).sort().reverse();

                 if (dateFolders.length > 0) {
                     const latestPath = path.join(customerRoot, dateFolders[0]);
                     logger.info(`[Financial Analysis] Using Local Files from: ${latestPath}`);

                     // Helper inside scope
                     const loadFile = async (filename) => {
                         const filePath = path.join(latestPath, filename);
                         if (await fs.pathExists(filePath)) {
                             return await fs.readFile(filePath);
                         }
                         return null;
                     };

                     // Map local files to multer-like structure
                     const bs = await loadFile('DBD_BalanceSheet.xlsx');
                     if (bs) files['balance_sheet'] = [{ buffer: bs }];

                     const pl = await loadFile('DBD_IncomeStatement.xlsx');
                     if (pl) files['profit_loss'] = [{ buffer: pl }];

                     const fr = await loadFile('DBD_FinancialRatios.xlsx');
                     if (fr) files['financial_ratios'] = [{ buffer: fr }];

                     // Check for No Financial Data Marker
                     const hasNoFinancialMarker = await fs.pathExists(path.join(latestPath, 'DBD_NoFinancialData.txt'));
                     if (hasNoFinancialMarker) {
                         logger.info(`[Financial Analysis] Customer ${customer_no} has No Financial Data marker.`);
                         // This will ensure Excel extraction yields zero but PDF extraction still works
                         req.body.is_no_financial_data = 'true';
                     }

                     // Profile is not used for analysis yet, but good to have if needed
                     const cp = await loadFile('DBD_Profile.pdf');
                     if (cp) {
                         files['company_profile'] = [{ buffer: cp }];

                         // Try to extract Registered Capital / Years if not provided
                         if (!registered_capital || registered_capital == 0 || !years_in_business) {
                             const extraction = await extractDBDData(cp);
                             if (extraction.success) {
                                 logger.info('[Financial Analysis] Extracted from Local PDF:', extraction);
                                 if (extraction.registeredCapital) localRegisteredCapital = extraction.registeredCapital;
                                 if (extraction.yearsInBusiness) localYearsInBusiness = extraction.yearsInBusiness;
                             }
                         }
                     }
                 }
             }
        } catch (localErr) {
            logger.error('[Financial Analysis] Error loading local files:', localErr);
        }
    }


    // --- PERSISTENT STORAGE (Project Requirement) ---
    // Save uploaded files to SP682/customers/{CustomerCode}/{YYYYMMDD}/
    // Only save if NOT using local files (avoid duplication)
    if (customer_no && req.body.use_local !== 'true') {
        try {
            // Determine Date Folder (YYYYMMDD)
            const now = new Date();
            const yyyy = now.getFullYear();
            const mm = String(now.getMonth() + 1).padStart(2, '0');
            const dd = String(now.getDate()).padStart(2, '0');
            const dateFolder = `${yyyy}${mm}${dd}`;

            // Determine Root Path (SP682/customers)
            // Current: .../SP682_v_x/release/backend/controllers
            // Target:  .../customers
            let projectRoot = path.resolve(__dirname, '../../../../');
            // Fallback for dev/sandbox environment (2 levels up)
            if (!await fs.pathExists(path.join(projectRoot, 'customers'))) {
                projectRoot = path.resolve(__dirname, '../../');
            }

            const customerDir = path.join(projectRoot, 'customers', customer_no, dateFolder);

            await fs.ensureDir(customerDir);
            logger.info(`[Financial Persistent] Saving files to: ${customerDir}`);

            // Helper to save buffer
            const saveFile = async (field, filename) => {
                if (files[field] && files[field][0]) {
                    const dest = path.join(customerDir, filename);
                    await fs.outputFile(dest, files[field][0].buffer);
                }
            };

            await saveFile('company_profile', 'DBD_Profile.pdf');
            await saveFile('balance_sheet', 'DBD_BalanceSheet.xlsx');
            await saveFile('profit_loss', 'DBD_IncomeStatement.xlsx');
            await saveFile('financial_ratios', 'DBD_FinancialRatios.xlsx');

        } catch (persistErr) {
            logger.error('[Financial Persistent] Error saving files:', persistErr.message);
        }
    }

    // --- 1. EXTRACT FROM EXCEL ---
    const results = {
      nonCurrentLiabilities: { value: 0, column: '' },
      totalLiabilities: { value: 0, column: '' },
      shareholdersEquity: { value: 0, column: '' },
      totalRevenue: { value: 0, column: '' },
      grossProfit: { value: 0, column: '' },
      deRatio: { value: 0, column: '' },
      inventoryTurnover: { value: 0, column: '' },
      revenueHistory: [],
      averageRevenue: 0
    };

    if (files['balance_sheet'] && files['balance_sheet'][0] && req.body.is_no_financial_data !== 'true') {
      try {
          const workbook = xlsx.read(files['balance_sheet'][0].buffer, { type: 'buffer' });
          const sheet = workbook.Sheets[workbook.SheetNames[0]];
          results.nonCurrentLiabilities = findValue(sheet, 'หนี้สินไม่หมุนเวียน', 'AMOUNT');

          // Try 'หนี้สินรวม' first, fallback to 'รวมหนี้สิน'
          let tl = findValue(sheet, 'หนี้สินรวม', 'AMOUNT');
          if (tl.value === 0) {
              tl = findValue(sheet, 'รวมหนี้สิน', 'AMOUNT');
          }
          results.totalLiabilities = tl;

          results.shareholdersEquity = findValue(sheet, 'ส่วนของผู้ถือหุ้น', 'AMOUNT');
      } catch (e) {
          logger.error("Error parsing balance sheet:", e);
      }
    }

    if (files['profit_loss'] && files['profit_loss'][0] && req.body.is_no_financial_data !== 'true') {
      try {
          const workbook = xlsx.read(files['profit_loss'][0].buffer, { type: 'buffer' });
          const sheet = workbook.Sheets[workbook.SheetNames[0]];
          results.totalRevenue = findValue(sheet, 'รายได้รวม', 'AMOUNT');
          results.grossProfit = findValue(sheet, 'กำไร(ขาดทุน) ขั้นต้น', 'AMOUNT');

          // NEW: Extract Revenue History (Last 3 Years)
          results.revenueHistory = findYearlySeries(sheet, 'รายได้รวม', 3);
          if (results.revenueHistory.length > 0) {
              const sum = results.revenueHistory.reduce((acc, cur) => acc + cur.amount, 0);
              results.averageRevenue = sum / results.revenueHistory.length;
          }
      } catch (e) {
          logger.error("Error parsing profit loss:", e);
      }
    }

    if (files['financial_ratios'] && files['financial_ratios'][0] && req.body.is_no_financial_data !== 'true') {
      try {
          const workbook = xlsx.read(files['financial_ratios'][0].buffer, { type: 'buffer' });
          const sheet = workbook.Sheets[workbook.SheetNames[0]];
          results.deRatio = findValue(sheet, 'อัตราส่วนหนี้สินรวมต่อส่วนของผู้ถือหุ้น', 'RATIO');
          // Updated: Search for BOTH 'อัตราการหมุนเวียน' AND 'สินค้าคงเหลือ'
          results.inventoryTurnover = findValue(sheet, ['อัตราการหมุนเวียน', 'สินค้าคงเหลือ'], 'RATIO');
      } catch (e) {
          logger.error("Error parsing financial ratios:", e);
      }
    }

    // Calculations for C2 inputs
    const calculations = { dscr: 0, creditCapitalRatio: 0 };
    const gp = results.grossProfit.value;
    const ncl = results.nonCurrentLiabilities.value;

    if (ncl !== 0) {
      const denominator = ncl * 0.3;
      if (denominator !== 0) {
        calculations.dscr = Number((gp / denominator).toFixed(4));
      } else {
        calculations.dscr = 0;
      }
    }
    // Use Local Extraction Fallback if request body is empty OR to override with better data (PDF)
    // Priority: Local PDF Extraction > Frontend Input > Default/DB
    let regCap = 0;
    if (localRegisteredCapital && localRegisteredCapital > 0) {
        regCap = parseFloat(localRegisteredCapital);
    } else {
        regCap = parseFloat(registered_capital || 0);
    }

    const reqAmt = parseFloat(request_amount || 0);
    if (regCap !== 0) {
      calculations.creditCapitalRatio = reqAmt / regCap;
    }

    // --- 2. FETCH DATABASE & API INFO ---
    let customerData = {};
    let accumData = null;
    let monthlyHistory = [];
    let latePaymentData = null;
    let wadlDataResult = null;
    let finalYears = 0;

    if (customer_no) {
        // Fetch Customer Profile (Years in Business, etc.)
        const custSql = 'SELECT * FROM Customers WHERE No_ = ?';
        let rowsC = [];
        if (db.dbType === 'mssql') {
             const resC = await db.query('SELECT TOP 1 * FROM Customers WHERE No_ = ?', [customer_no]);
             rowsC = resC.rows;
        } else {
             const resC = await db.query('SELECT * FROM Customers WHERE No_ = ? LIMIT 1', [customer_no]);
             rowsC = resC.rows;
        }
        if (rowsC.length > 0) customerData = rowsC[0];

        // Merge Manual Overrides
        // Priority: Local PDF Extraction > Frontend Input > Database
        if (localYearsInBusiness && localYearsInBusiness > 0) {
            finalYears = localYearsInBusiness;
        } else {
            finalYears = years_in_business || customerData.years_in_business || 0;
        }

        // Update customerData for context
        if (finalYears) customerData.years_in_business = finalYears;

        if (residence_ownership) customerData.residence_ownership = residence_ownership;
        if (residence_ownership_other) customerData.residence_ownership_other = residence_ownership_other;

        // We need tax_id for fetchPurchasingBehavior if available
        const taxIdForFinancials = tax_id || (customerData && customerData.tax_id ? customerData.tax_id : null);

        // Parallel Fetch: Financial Data (API) & Late Payment Data (API) & WADL Data
        const [apiData, lateData, wadlData] = await Promise.all([
             fetchPurchasingBehavior(customer_no, taxIdForFinancials),
             fetchLatePaymentData(customer_no),
             fetchWADLData(customer_no)
        ]);

        latePaymentData = lateData;
        wadlDataResult = wadlData;

        // Support both old 'monthly' and new 'data' formats
        const monthlyData = apiData && (apiData.monthly || apiData.data);

        if (monthlyData) {
            // Include fetchSource in context if available
            if (apiData.fetchSource) {
                 customerData.fetchSource = apiData.fetchSource;
            }

            // New Logic: Use Continuous Timeline
            const timeline = generateContinuousTimeline(monthlyData);

            const now = new Date();
            const currentYear = now.getFullYear();
            const currentMonthIdx = now.getMonth() + 1; // 1-12
            const currentSystemMonth = `${currentYear}-${String(currentMonthIdx).padStart(2, '0')}`;

            // Calculation Set: Always exclude the last item (Current Month)
            const calcData = timeline.slice(0, -1);

            const totalCalcAvailable = calcData.length;

            // Last 3 Months (for SecondAccum)
            const last3 = calcData.slice(-3);
            const sumLast3 = last3.reduce((acc, cur) => acc + cur.amount, 0);
            const slope3 = calculateSlope(last3);
            const avg3 = sumLast3 / 3;
            const trendRatio3 = calculateTrendRatio(slope3, avg3);

            // Last 6 Months (for Existing Customer)
            const last6 = calcData.slice(-6);
            const sumLast6 = last6.reduce((acc, cur) => acc + cur.amount, 0);
            const slope6 = calculateSlope(last6);
            const avg6 = sumLast6 / 6;
            const trendRatio6 = calculateTrendRatio(slope6, avg6);

            accumData = {
                // New Customer / Legacy (3 Months)
                SecondAccum: sumLast3,
                AccumTrend: trendRatio3,
                Slope: slope3,
                last3Months: last3,

                // Existing Customer (6 Months)
                SumLast6: sumLast6,
                Trend6: trendRatio6,
                Slope6: slope6,
                last6Months: last6
            };

            // Prepare Monthly History for Frontend (Reverse order: Newest First)
            monthlyHistory = timeline.map((m) => {
                const isCurrent = m.month === currentSystemMonth;
                return {
                    label: formatThaiMonth(m.month, isCurrent),
                    month: m.month,
                    amount: m.amount
                };
            }).reverse();

        } else {
             // No Data found
             accumData = { SecondAccum: 0, AccumTrend: 1.0, Slope: 0 };
        }
    }

    // --- 3. SCORING ENGINE INTEGRATION ---

    // Determine if Company (Check Name)
    const finalName = customer_name || customerData.Name || "";
    const isCompany = (name) => {
        if (!name) return false;
        const keywords = ['บริษัท', 'ห้างหุ้นส่วนจำกัด', 'บ.', 'หจก.'];
        return keywords.some(keyword => name.includes(keyword));
    };
    const isCorp = isCompany(finalName);
    const c2Inputs = { ...results, dscr: calculations.dscr };

    // Prepare Context
    const scoringContext = {
        customer: customerData,
        registeredCapital: regCap,
        requestAmount: reqAmt,
        financials: c2Inputs,
        accumData: accumData,
        requestTerm: request_credit_term || 30,
        customerDuration: customer_duration,
        isCompany: isCorp,
        currentCreditLimit: customerData['Fixed Credit Limit'] || 0, // Pass Current Limit
        // New Parameters for Existing Customer Model
        modelType: model_type || 'new',
        limitExponent: limit_exponent ? parseFloat(limit_exponent) : undefined,
        // Priority: Manual Input > API Result > 0 (Safe check)
        wadl: wadl ? parseFloat(wadl) : (typeof wadlDataResult !== 'undefined' && wadlDataResult ? wadlDataResult.score : 0)
    };

    // Execute Scoring via Engine
    const scoringResult = ScoringEngine.score(scoringContext);

    // Additional Financial Summary for Frontend
    const financialSummary = {
        monthlyHistory,
        latePaymentData: latePaymentData, // Include Late Payment Info
        wadlData: wadlDataResult,         // Include WADL Info
        stats: {
            sumLast3: accumData ? accumData.SecondAccum : 0,
            sumLast6: accumData ? accumData.SumLast6 : 0,
            // Dynamic Stats based on Model Type
            avg1_5m: accumData ? (
                model_type === 'existing'
                    ? (accumData.SumLast6 / 4)
                    : (accumData.SecondAccum / 2)
            ) : 0,
            trendRatio: accumData ? (
                model_type === 'existing'
                    ? accumData.Trend6
                    : accumData.AccumTrend
            ) : 1.0,
            slope: accumData ? (
                model_type === 'existing'
                    ? accumData.Slope6
                    : accumData.Slope
            ) : 0
        }
    };

    // Combine Debug Data from Engine
    const rawInputs = [
        { label: 'รายได้รวม (Extracted)', value: results.totalRevenue.value, column: results.totalRevenue.column, weight: '-', score: '-' },
        { label: 'กำไรขั้นต้น (Extracted)', value: results.grossProfit.value, column: results.grossProfit.column, weight: '-', score: '-' },
        { label: 'หนี้สินไม่หมุนเวียน (Extracted)', value: results.nonCurrentLiabilities.value, column: results.nonCurrentLiabilities.column, weight: '-', score: '-' },
        { label: 'ส่วนของผู้ถือหุ้น (Extracted)', value: results.shareholdersEquity.value, column: results.shareholdersEquity.column, weight: '-', score: '-' },
        { label: 'อัตราหมุนเวียนสินค้า (Extracted)', value: results.inventoryTurnover.value, column: results.inventoryTurnover.column, weight: '-', score: '-' },
    ];

    const debugData = [
        ...rawInputs,
        ...scoringResult.debug // Merged debug from engine
    ];

    res.json({
      success: true,
      extractedData: results,
      calculations: calculations,
      scoringResult: scoringResult,
      financialSummary: financialSummary,
      debugData: debugData,
      finalInputs: {
          registeredCapital: regCap,
          yearsInBusiness: finalYears
      }
    });

  } catch (error) {
    logger.error('Financial Analysis Error:', error);
    res.status(500).json({ success: false, message: 'Failed to analyze financial documents', error: error.message });
  }
};

// Configuration for Customer API
const CUSTOMER_INFO_API_URL = process.env.CUSTOMER_API_URL || "http://192.192.0.37:8280/customer-sp682/1.0.0";
const CUSTOMER_INFO_API_KEY = process.env.CUSTOMER_API_KEY || "YOUR_API_KEY";

const fetchMultipleCustomersInfo = async (customerIds) => {
    try {
        // Send a single batch request using $in operator
        const response = await axios.post(CUSTOMER_INFO_API_URL, {
            page: 1,
            size: customerIds.length,
            "No_": { "$in": customerIds }
        }, {
            headers: {
                "apikey": CUSTOMER_INFO_API_KEY,
                "Content-Type": "application/json"
            },
            timeout: 10000
        });

        if (response.data && response.data.data) {
            // Create a lookup map for faster access
            const customerMap = {};
            response.data.data.forEach(cust => {
                customerMap[cust["No_"]] = cust;
            });
            return customerMap;
        }
    } catch (error) {
        logger.warn(`[Batch Check] Failed to fetch multiple customers info:`, error.message);
    }
    return {};
};

const checkSingleCustomerFiles = async (customer_no) => {
    try {
        if (!customer_no) return { exists: false, reason: 'Customer No required' };

        logger.info(`[DEBUG-CHECK] Starting check for ${customer_no}`);

        let projectRoot = path.resolve(__dirname, '../../../../');
        if (!await fs.pathExists(path.join(projectRoot, 'customers'))) {
            projectRoot = path.resolve(__dirname, '../../');
        }

        const customerRoot = path.join(projectRoot, 'customers', customer_no);
        logger.info(`[DEBUG-CHECK] Resolved customerRoot: ${customerRoot}`);

        if (!await fs.pathExists(customerRoot)) {
            logger.info(`[DEBUG-CHECK] FAIL: No customer directory at ${customerRoot}`);
            return { exists: false, reason: 'No customer directory' };
        }

        const subdirs = await fs.readdir(customerRoot);
        const dateFolders = subdirs.filter(d => /^\d{8}$/.test(d)).sort().reverse();
        logger.info(`[DEBUG-CHECK] Found dateFolders: ${dateFolders}`);

        if (dateFolders.length === 0) {
            logger.info(`[DEBUG-CHECK] FAIL: No 8-digit date folders in ${customerRoot}`);
            return { exists: false, reason: 'No date folders' };
        }

        const latestFolder = dateFolders[0];

        // Check Freshness (180 days)
        const folderDate = new Date(
            parseInt(latestFolder.substring(0, 4)),
            parseInt(latestFolder.substring(4, 6)) - 1,
            parseInt(latestFolder.substring(6, 8))
        );
        const now = new Date();
        const diffTime = Math.abs(now - folderDate);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays > 180) {
            logger.info(`[DEBUG] Local files for ${customer_no} (${latestFolder}) rejected. diffDays=${diffDays} > 180`);
            return { exists: false, reason: 'Files too old', days: diffDays, limit: 180 };
        }

        const latestPath = path.join(customerRoot, latestFolder);

        // Check for No Financial Data Marker FIRST
        const markerPath = path.join(latestPath, 'DBD_NoFinancialData.txt');
        const hasNoDataMarker = await fs.pathExists(markerPath);

        if (hasNoDataMarker) {
            // Include profile if it exists, but don't strictly require it here
            const profilePath = path.join(latestPath, 'DBD_Profile.pdf');
            let profileDetail = null;
            let dbdCompanyName = null;
            let dbdYearsInBusiness = null;
            let dbdRegisteredCapital = null;
            if (await fs.pathExists(profilePath)) {
                const stats = await fs.stat(profilePath);
                profileDetail = { filename: 'DBD_Profile.pdf', size: stats.size, date: stats.mtime, path: profilePath };

                try {
                    const dataBuffer = await fs.readFile(profilePath);
                    const extracted = await extractDBDData(dataBuffer);
                    if (extracted.success) {
                        if (extracted.companyName) dbdCompanyName = extracted.companyName;
                        if (extracted.yearsInBusiness) dbdYearsInBusiness = extracted.yearsInBusiness;
                        if (extracted.registeredCapital) dbdRegisteredCapital = extracted.registeredCapital;
                    }
                } catch (pdfErr) {
                    logger.warn('Failed to parse profile for name:', pdfErr.message);
                }
            }

            return {
                exists: true,
                isNoFinancialData: true,
                noFinancialData: true,
                date: latestFolder,
                daysOld: diffDays,
                path: latestPath,
                reason: 'ลูกค้าไม่ส่งงบการเงิน',
                dbdCompanyName: dbdCompanyName,
                dbdYearsInBusiness: dbdYearsInBusiness,
                dbdRegisteredCapital: dbdRegisteredCapital,
                files: profileDetail ? { profile: profileDetail } : {}
            };
        }

        // Check required files
        const requiredFiles = [
            { key: 'profile', name: 'DBD_Profile.pdf' },
            { key: 'balanceSheet', name: 'DBD_BalanceSheet.xlsx' },
            { key: 'incomeStatement', name: 'DBD_IncomeStatement.xlsx' },
            { key: 'financialRatios', name: 'DBD_FinancialRatios.xlsx' }
        ];

        const fileDetails = {};

        let dbdCompanyName = null;
        let dbdYearsInBusiness = null;
        let dbdRegisteredCapital = null;
        for (const file of requiredFiles) {
            const filePath = path.join(latestPath, file.name);
            logger.info(`[DEBUG] Checking for file: ${filePath}`);
            if (!await fs.pathExists(filePath)) {
                logger.info(`[DEBUG] File NOT FOUND: ${filePath}`);
                continue; // Skip instead of returning false immediately
            }
            logger.info(`[DEBUG] File FOUND: ${filePath}`);

            // Get File Stats
            const stats = await fs.stat(filePath);
            fileDetails[file.key] = {
                filename: file.name,
                size: stats.size,
                date: stats.mtime, // Modification time
                path: filePath
            };

            if (file.key === 'profile') {
                try {
                    const dataBuffer = await fs.readFile(filePath);
                    const extracted = await extractDBDData(dataBuffer);
                    if (extracted.success) {
                        if (extracted.companyName) dbdCompanyName = extracted.companyName;
                        if (extracted.yearsInBusiness) dbdYearsInBusiness = extracted.yearsInBusiness;
                        if (extracted.registeredCapital) dbdRegisteredCapital = extracted.registeredCapital;
                    }
                } catch (pdfErr) {
                    logger.warn('Failed to parse profile for name:', pdfErr.message);
                }
            }
        }

        return {
            exists: Object.keys(fileDetails).length > 0,
            isNoFinancialData: false,
            noFinancialData: false,
            date: latestFolder,
            daysOld: diffDays,
            path: latestPath,
            files: fileDetails,
            dbdCompanyName: dbdCompanyName,
            dbdYearsInBusiness: dbdYearsInBusiness,
            dbdRegisteredCapital: dbdRegisteredCapital
        };
    } catch (error) {
        logger.error(`Check Local Files Error for ${customer_no}:`, error);
        return { exists: false, reason: error.message };
    }
};

exports.checkLocalFiles = async (req, res) => {
  try {
    // Prevent browser caching for this specific status endpoint
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    // Force Express to NOT return 304 by stripping the cache header from the request
    delete req.headers['if-none-match'];
    delete req.headers['if-modified-since'];

    const { customer_no } = req.params;
    if (!customer_no) return res.status(400).json({ success: false, message: 'Customer No required' });

    const result = await checkSingleCustomerFiles(customer_no);
    return res.json(result);
  } catch (error) {
    logger.error('Check Local Files Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.checkLocalFilesBatch = async (req, res) => {
  try {
    const { customer_ids } = req.body;
    if (!customer_ids || !Array.isArray(customer_ids)) {
        return res.status(400).json({ success: false, message: 'customer_ids array required' });
    }

    const corporateKeywords = ['บริษัท', 'ห้างหุ้นส่วน', 'บ.', 'หจก.', 'ltd', 'limited', 'co.', 'plc', 'corp', 'inc', 'company'];
    const results = [];

    // Fetch all customer infos in a single API call to avoid N+1 query problem
    const customersInfoMap = await fetchMultipleCustomersInfo(customer_ids);

    for (const customer_no of customer_ids) {
        // Check if it's a company
        const customerInfo = customersInfoMap[customer_no];

        let skipDBD = false;
        if (customerInfo) {
            const nameLower = (customerInfo["Name"] || '').toLowerCase();
            const taxId = customerInfo["VAT Registration No_"] || '';
            const isCorporate = corporateKeywords.some(k => nameLower.includes(k));

            if (!taxId || taxId.length < 5) {
                skipDBD = true;
            } else if (!isCorporate) {
                skipDBD = true;
            }
        } else {
            // If API couldn't find them, we can't reliably say they are a company, but typically
            // if we don't have tax ID, we skip DBD.
            skipDBD = true;
        }

        if (skipDBD) {
            results.push({
                customerId: customer_no,
                isReady: true,
                isSkipped: true,
                reason: 'ข้าม (ไม่ใช่บริษัท)',
                date: null,
                noFinancialData: false
            });
            continue;
        }

        const result = await checkSingleCustomerFiles(customer_no);
        results.push({
            customerId: customer_no,
            isReady: result.exists,
            isSkipped: false,
            isNoFinancialData: result.isNoFinancialData || false,
            noFinancialData: result.noFinancialData || result.isNoFinancialData || false,
            reason: result.reason || 'Ready',
            date: result.date || null,
            dbdCompanyName: result.dbdCompanyName || null
        });
    }

    return res.json({ success: true, results });
  } catch (error) {
    logger.error('Check Local Files Batch Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.downloadLocalFile = async (req, res) => {
    try {
        const { customer_no, file_key } = req.params;
        if (!customer_no || !file_key) return res.status(400).send('Missing parameters');

        // Mapping (Supports snake_case and camelCase)
        const fileMap = {
            'profile': 'DBD_Profile.pdf',
            'balance_sheet': 'DBD_BalanceSheet.xlsx',
            'income_statement': 'DBD_IncomeStatement.xlsx',
            'financial_ratios': 'DBD_FinancialRatios.xlsx',
            // CamelCase aliases for Frontend compatibility
            'balanceSheet': 'DBD_BalanceSheet.xlsx',
            'incomeStatement': 'DBD_IncomeStatement.xlsx',
            'financialRatios': 'DBD_FinancialRatios.xlsx'
        };

        const filename = fileMap[file_key];
        if (!filename) return res.status(400).send('Invalid file key');

        // Locate Folder
        let projectRoot = path.resolve(__dirname, '../../../../');
        if (!await fs.pathExists(path.join(projectRoot, 'customers'))) {
            projectRoot = path.resolve(__dirname, '../../');
        }

        const customerRoot = path.join(projectRoot, 'customers', customer_no);
        if (!await fs.pathExists(customerRoot)) return res.status(404).send('Customer folder not found');

        const subdirs = await fs.readdir(customerRoot);
        const dateFolders = subdirs.filter(d => /^\d{8}$/.test(d)).sort().reverse();

        if (dateFolders.length === 0) return res.status(404).send('No date folders found');

        // Use Latest Folder
        const latestPath = path.join(customerRoot, dateFolders[0]);
        const filePath = path.join(latestPath, filename);

        if (!await fs.pathExists(filePath)) return res.status(404).send('File not found');

        res.download(filePath);

    } catch (error) {
        logger.error('Download Local File Error:', error);
        res.status(500).send('Internal Server Error');
    }
};

/**
 * New Endpoint: Get Late Payment Benchmark Comparison
 * Compares Traditional (Count-based) vs WADL (Amount-based)
 */
exports.getLatePaymentBenchmark = async (req, res) => {
    const { customer_no } = req.params;

    try {
        logger.info(`[WADL API] Fetching data for ${customer_no} from ${LATE_PAYMENT_WADL_API_URL}`);

        // Debug API Key (First 5 chars)
        if (!LATE_PAYMENT_WADL_API_KEY || LATE_PAYMENT_WADL_API_KEY === 'YOUR_WADL_API_KEY') {
            logger.warn('[WADL API] WARNING: LATE_PAYMENT_WADL_API_KEY is not set or is default placeholder.');
        } else {
            const maskedKey = LATE_PAYMENT_WADL_API_KEY.substring(0, 5) + '...';
            logger.info(`[WADL API] Using API Key: ${maskedKey}`);
        }

        const response = await axios.post(LATE_PAYMENT_WADL_API_URL, {
            "Customer No_": customer_no
        }, {
            headers: {
                "apikey": LATE_PAYMENT_WADL_API_KEY,
                "Content-Type": "application/json"
            },
            timeout: 5000
        });

        const data = response.data;
        let invoices = Array.isArray(data) ? data : (data.data || []);

        if (!invoices || invoices.length === 0) {
            return res.json({
                customer_no,
                comparison: null,
                message: "No invoice data found for WADL calculation."
            });
        }

        // Sanitize Data (Handle 1753 / Future Checks)
        invoices = sanitizeInvoices(invoices);

        // 2. Calculate Traditional (Simple Average) based on this dataset
        // Filter paid invoices first for fair comparison
        const paidInvoices = invoices.filter(inv => inv.Effective_Payment_Date && inv.Effective_Payment_Date.trim() !== '');

        const totalLateDays = paidInvoices.reduce((sum, inv) => sum + (Number(inv.Late_Days) || 0), 0);
        const traditionalScore = paidInvoices.length > 0 ? (totalLateDays / paidInvoices.length) : 0;

        // 3. Calculate WADL (Weighted Average)
        const wadlResult = calculateWADL(invoices);

        res.json({
            customer_no,
            comparison: {
                traditional: {
                    method: "Simple Average (Count-based)",
                    score: Number(traditionalScore.toFixed(2)),
                    formula: "SUM(LateDays) / Count",
                    interpretation: "Heavily influenced by frequency of small late bills."
                },
                wadl: {
                    method: "Weighted Average (Value-based)",
                    score: wadlResult.score,
                    grade: wadlResult.grade,
                    formula: "SUM(Amount * LateDays) / SUM(Amount)",
                    interpretation: "Reflects financial impact; lower score if large bills are paid on time."
                }
            },
            data_source: "Real API"
        });

    } catch (error) {
        logger.error(`[WADL API] Error fetching data for ${customer_no}:`, error.message);
        if (error.response) {
            logger.error('[WADL API] Response Status:', error.response.status);
            logger.error('[WADL API] Response Headers:', JSON.stringify(error.response.headers));
            logger.error('[WADL API] Response Data:', JSON.stringify(error.response.data).substring(0, 500));
        }

        res.status(500).json({
            success: false,
            message: 'Failed to fetch WADL benchmark data',
            error: error.message
        });
    }
};

// Export helper for testing
exports.findYearlySeries = findYearlySeries;
exports.calculateWADL = calculateWADL;

exports.uploadLocalFiles = async (req, res) => {
    try {
        const { customer_no } = req.params;
        const { no_financial_data } = req.body;
        const files = req.files || {};

        if (!customer_no) {
            return res.status(400).json({ success: false, message: 'Customer No is required' });
        }

        // Determine Date Folder (YYYYMMDD)
        const now = new Date();
        const yyyy = now.getFullYear();
        const mm = String(now.getMonth() + 1).padStart(2, '0');
        const dd = String(now.getDate()).padStart(2, '0');
        const dateFolder = `${yyyy}${mm}${dd}`;

        let projectRoot = path.resolve(__dirname, '../../../../');
        if (!await fs.pathExists(path.join(projectRoot, 'customers'))) {
            projectRoot = path.resolve(__dirname, '../../');
        }

        const customerDir = path.join(projectRoot, 'customers', customer_no, dateFolder);
        await fs.ensureDir(customerDir);
        logger.info(`[Financial Upload] Saving files to: ${customerDir}`);

        // Helper to save buffer
        const saveFile = async (field, filename) => {
            if (files[field] && files[field][0]) {
                const dest = path.join(customerDir, filename);
                await fs.outputFile(dest, files[field][0].buffer);
            }
        };

        // If no_financial_data is true, we still expect at least a profile
        if (no_financial_data === 'true') {
            await saveFile('company_profile', 'DBD_Profile.pdf');
            // Create Marker file
            await fs.outputFile(path.join(customerDir, 'DBD_NoFinancialData.txt'), 'No financial statements submitted by customer.');
        } else {
            // Require all files for normal processing
            if (!files['company_profile'] || !files['balance_sheet'] || !files['profit_loss'] || !files['financial_ratios']) {
                 return res.status(400).json({ success: false, message: 'Missing required financial files.' });
            }
            await saveFile('company_profile', 'DBD_Profile.pdf');
            await saveFile('balance_sheet', 'DBD_BalanceSheet.xlsx');
            await saveFile('profit_loss', 'DBD_IncomeStatement.xlsx');
            await saveFile('financial_ratios', 'DBD_FinancialRatios.xlsx');

            // Remove marker file if it exists from previous attempts
            const markerPath = path.join(customerDir, 'DBD_NoFinancialData.txt');
            if (await fs.pathExists(markerPath)) {
                await fs.remove(markerPath);
            }
        }

        return res.json({ success: true, message: 'Files uploaded successfully.' });

    } catch (error) {
        logger.error('Upload Local Files Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

// New Endpoint for parsing and returning DBD document data
exports.getDBDData = async (req, res) => {
    try {
        // Prevent browser caching for financial data
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');

        delete req.headers['if-none-match'];
        delete req.headers['if-modified-since'];

        const { customer_no } = req.params;
        const parser = require('../utils/dbdExcelParser');

        const data = parser.getCustomerFinancialData(customer_no);

        res.status(200).json({
            success: true,
            data: data
        });
    } catch (error) {
        logger.error(`Error in getDBDData for ${req.params.customer_no}:`, error);
        res.status(500).json({ success: false, message: 'Failed to parse financial data' });
    }
};
