const xlsx = require('xlsx');
const db = require('../db');
const axios = require('axios');
const fs = require('fs-extra');
const path = require('path');
const { calculateSlope, calculateTrendRatio, generateContinuousTimeline, findYearlySeries } = require('../services/financialCalculator');
const ScoringEngine = require('../services/scoring/ScoringEngine');
const { extractDBDData } = require('../utils/pdfExtractor');

// Configuration
const FINANCIAL_API_URL = "http://192.192.0.37:8000/api/customer-analytics/monthly-summary";
const LATE_PAYMENT_API_URL = "http://192.192.0.37:8280/customer-late-payment/1.0.0";
const API_KEY = process.env.CUSTOMER_API_KEY || "YOUR_API_KEY";
const MOCK_FINANCIAL_API = process.env.MOCK_FINANCIAL_API === 'true';

// Mock Data (Matches customerController.js for consistency)
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

// Helper: Fetch Purchasing Behavior from External API
const fetchPurchasingBehavior = async (customerNo) => {
    if (MOCK_FINANCIAL_API) {
        console.log(`[Financial API] Using Mock Data for ${customerNo}`);
        return MOCK_FINANCIAL_DATA;
    }

    try {
        console.log(`[Financial API] Fetching data for ${customerNo} from ${FINANCIAL_API_URL}`);
        const response = await axios.get(FINANCIAL_API_URL, {
            params: { customer_code: customerNo },
            timeout: 5000
        });
        console.log(`[Financial API] Success for ${customerNo}`);
        return response.data;
    } catch (error) {
        console.error(`[Financial API] Error fetching purchasing behavior for ${customerNo}:`, error.message);
        // Return null to indicate failure/no data
        return null;
    }
};

// Helper: Fetch Late Payment Data from External API
const fetchLatePaymentData = async (customerNo) => {
    try {
        console.log(`[Late Payment API] Fetching data for ${customerNo} from ${LATE_PAYMENT_API_URL}`);
        const response = await axios.post(LATE_PAYMENT_API_URL, {
            "Customer No_": customerNo
        }, {
            headers: {
                "apikey": API_KEY,
                "Content-Type": "application/json"
            },
            timeout: 5000
        });

        const data = response.data;
        // Check if data is array (direct list) or object with data property
        const invoices = Array.isArray(data) ? data : (data.data || []);

        if (!invoices || invoices.length === 0) {
             return { average_late_days: 0, total_invoices: 0, late_count: 0 };
        }

        let totalLateDays = 0;
        let lateCount = 0;

        invoices.forEach(inv => {
            const lateDays = Number(inv.Late_Days) || 0;
            totalLateDays += lateDays;
            if (lateDays > 0) lateCount++;
        });

        const avg = totalLateDays / invoices.length;

        return {
            average_late_days: Number(avg.toFixed(2)),
            total_invoices: invoices.length,
            late_count: lateCount
        };

    } catch (error) {
        console.error(`[Late Payment API] Error fetching data for ${customerNo}:`, error.message);
        return null; // Return null to indicate error/no data available
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
      residence_ownership_other
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

             // Find latest folder logic again (safety)
             if (await fs.pathExists(customerRoot)) {
                 const subdirs = await fs.readdir(customerRoot);
                 const dateFolders = subdirs.filter(d => /^\d{8}$/.test(d)).sort().reverse();

                 if (dateFolders.length > 0) {
                     const latestPath = path.join(customerRoot, dateFolders[0]);
                     console.log(`[Financial Analysis] Using Local Files from: ${latestPath}`);

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

                     // Profile is not used for analysis yet, but good to have if needed
                     const cp = await loadFile('DBD_Profile.pdf');
                     if (cp) {
                         files['company_profile'] = [{ buffer: cp }];

                         // Try to extract Registered Capital / Years if not provided
                         if (!registered_capital || registered_capital == 0 || !years_in_business) {
                             const extraction = await extractDBDData(cp);
                             if (extraction.success) {
                                 console.log('[Financial Analysis] Extracted from Local PDF:', extraction);
                                 if (extraction.registeredCapital) localRegisteredCapital = extraction.registeredCapital;
                                 if (extraction.yearsInBusiness) localYearsInBusiness = extraction.yearsInBusiness;
                             }
                         }
                     }
                 }
             }
        } catch (localErr) {
            console.error('[Financial Analysis] Error loading local files:', localErr);
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
            console.log(`[Financial Persistent] Saving files to: ${customerDir}`);

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
            console.error('[Financial Persistent] Error saving files:', persistErr.message);
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

    if (files['balance_sheet'] && files['balance_sheet'][0]) {
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
          console.error("Error parsing balance sheet:", e);
      }
    }

    if (files['profit_loss'] && files['profit_loss'][0]) {
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
          console.error("Error parsing profit loss:", e);
      }
    }

    if (files['financial_ratios'] && files['financial_ratios'][0]) {
      try {
          const workbook = xlsx.read(files['financial_ratios'][0].buffer, { type: 'buffer' });
          const sheet = workbook.Sheets[workbook.SheetNames[0]];
          results.deRatio = findValue(sheet, 'อัตราส่วนหนี้สินรวมต่อส่วนของผู้ถือหุ้น', 'RATIO');
          // Updated: Search for BOTH 'อัตราการหมุนเวียน' AND 'สินค้าคงเหลือ'
          results.inventoryTurnover = findValue(sheet, ['อัตราการหมุนเวียน', 'สินค้าคงเหลือ'], 'RATIO');
      } catch (e) {
          console.error("Error parsing financial ratios:", e);
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
    // Use Local Extraction Fallback if request body is empty
    const regCap = parseFloat(registered_capital || localRegisteredCapital || 0);
    const reqAmt = parseFloat(request_amount || 0);
    if (regCap !== 0) {
      calculations.creditCapitalRatio = reqAmt / regCap;
    }

    // --- 2. FETCH DATABASE & API INFO ---
    let customerData = {};
    let accumData = null;
    let monthlyHistory = [];
    let latePaymentData = null;

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

        // Merge Manual Overrides (Frontend Inputs take precedence)
        // Also apply Local Extraction fallback for Years in Business
        const finalYears = years_in_business || localYearsInBusiness || customerData.years_in_business;
        if (finalYears) customerData.years_in_business = finalYears;

        if (residence_ownership) customerData.residence_ownership = residence_ownership;
        if (residence_ownership_other) customerData.residence_ownership_other = residence_ownership_other;

        // Parallel Fetch: Financial Data (API) & Late Payment Data (API)
        const [apiData, lateDataResult] = await Promise.all([
             fetchPurchasingBehavior(customer_no),
             fetchLatePaymentData(customer_no)
        ]);

        latePaymentData = lateDataResult;

        if (apiData && apiData.monthly) {
            // New Logic: Use Continuous Timeline
            const timeline = generateContinuousTimeline(apiData.monthly);

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

            // Calculate SLOPE for the last 3 months
            const slope = calculateSlope(last3);

            // NEW FORMULA FOR TREND (AccumTrend)
            // User Formula: 1 + (Slope / AveragePerMonth)
            const averagePerMonth = sumLast3 / 3;
            const trendRatio = calculateTrendRatio(slope, averagePerMonth);

            accumData = {
                SecondAccum: sumLast3,
                AccumTrend: trendRatio,
                Slope: slope,
                last3Months: last3 // Store raw data for C3 specific calculations (e.g. 60-day term)
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
        currentCreditLimit: customerData['Fixed Credit Limit'] || 0 // Pass Current Limit
    };

    // Execute Scoring via Engine
    const scoringResult = ScoringEngine.score(scoringContext);

    // Additional Financial Summary for Frontend
    const financialSummary = {
        monthlyHistory,
        latePaymentData: latePaymentData, // Include Late Payment Info
        stats: {
            sumLast3: accumData ? accumData.SecondAccum : 0,
            trendRatio: accumData ? accumData.AccumTrend : 1.0,
            slope: accumData ? accumData.Slope : 0
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
      debugData: debugData
    });

  } catch (error) {
    console.error('Financial Analysis Error:', error);
    res.status(500).json({ success: false, message: 'Failed to analyze financial documents', error: error.message });
  }
};

exports.checkLocalFiles = async (req, res) => {
  try {
    const { customer_no } = req.params;
    if (!customer_no) return res.status(400).json({ success: false, message: 'Customer No required' });

    // Use same path resolution as persist logic
    let projectRoot = path.resolve(__dirname, '../../../../');
    // Fallback for dev/sandbox environment (2 levels up)
    if (!await fs.pathExists(path.join(projectRoot, 'customers'))) {
        projectRoot = path.resolve(__dirname, '../../');
    }

    const customerRoot = path.join(projectRoot, 'customers', customer_no);

    if (!await fs.pathExists(customerRoot)) {
        return res.json({ exists: false, reason: 'No customer directory' });
    }

    const subdirs = await fs.readdir(customerRoot);
    // Filter for 8-digit folders (YYYYMMDD) and sort descending (latest first)
    const dateFolders = subdirs.filter(d => /^\d{8}$/.test(d)).sort().reverse();

    if (dateFolders.length === 0) {
        return res.json({ exists: false, reason: 'No date folders' });
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
        return res.json({ exists: false, reason: 'Files too old', days: diffDays, limit: 180 });
    }

    const latestPath = path.join(customerRoot, latestFolder);

    // Check required files
    const requiredFiles = [
        { key: 'profile', name: 'DBD_Profile.pdf' },
        { key: 'balanceSheet', name: 'DBD_BalanceSheet.xlsx' },
        { key: 'incomeStatement', name: 'DBD_IncomeStatement.xlsx' },
        { key: 'financialRatios', name: 'DBD_FinancialRatios.xlsx' }
    ];

    const fileDetails = {};

    for (const file of requiredFiles) {
        const filePath = path.join(latestPath, file.name);
        if (!await fs.pathExists(filePath)) {
            return res.json({ exists: false, reason: `Missing file: ${file.name}` });
        }

        // Get File Stats
        const stats = await fs.stat(filePath);
        fileDetails[file.key] = {
            filename: file.name,
            size: stats.size,
            date: stats.mtime, // Modification time
            path: filePath
        };
    }

    return res.json({
        exists: true,
        date: latestFolder,
        daysOld: diffDays,
        path: latestPath,
        files: fileDetails
    });

  } catch (error) {
    console.error('Check Local Files Error:', error);
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
        console.error('Download Local File Error:', error);
        res.status(500).send('Internal Server Error');
    }
};

// Export helper for testing
exports.findYearlySeries = findYearlySeries;
