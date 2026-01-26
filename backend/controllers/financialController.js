const xlsx = require('xlsx');
const db = require('../db');
const axios = require('axios');

// Configuration
const FINANCIAL_API_URL = process.env.FINANCIAL_API_URL || "http://localhost:8000/api/customer-analytics/monthly-summary";
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
        const response = await axios.get(FINANCIAL_API_URL, {
            params: { customer_code: customerNo },
            timeout: 5000
        });
        return response.data;
    } catch (error) {
        console.error(`Error fetching purchasing behavior for ${customerNo}:`, error.message);
        // Return null to indicate failure/no data
        return null;
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

// --- SCORING LOGIC ---

// C1: Company Strength (Max 49)
const calculateC1 = (customer, registeredCapital, requestAmount) => {
  let score = 0;
  const breakdown = {};
  const debug = [];

  // 1. Years in Business (Max 14.42)
  const years = parseFloat(customer.years_in_business || 0);
  let rawYears = 0;
  if (years >= 10) rawYears = 2.0;
  else if (years >= 5) rawYears = 1.5;
  else if (years >= 3) rawYears = 1.0;
  else if (years >= 1) rawYears = 0.5;
  else rawYears = 0.25;

  const scoreYears = rawYears * 7.21;
  breakdown.years = scoreYears;
  score += scoreYears;
  debug.push({ label: 'Years in Business', value: years, weight: 14.42, score: scoreYears, column: '-' });

  // 2. Request / Capital (Max 8.64)
  const regCap = parseFloat(registeredCapital || 1);
  const reqAmt = parseFloat(requestAmount || 0);
  const leverage = reqAmt / regCap;
  let rawLev = 0;
  if (leverage <= 0.5) rawLev = 2.0;
  else if (leverage <= 0.9) rawLev = 1.5;
  else if (leverage <= 1.5) rawLev = 1.0;
  else if (leverage <= 1.99) rawLev = 0.5;
  else rawLev = 0.25;

  const scoreLev = rawLev * 4.32;
  breakdown.leverage = scoreLev;
  score += scoreLev;
  debug.push({ label: 'Request / Capital Ratio', value: leverage.toFixed(2), weight: 8.64, score: scoreLev, column: '-' });

  // 3. Asset Ownership (Max 25.94)
  const ownership = customer.residence_ownership || '';
  const assetValue = parseAmount(customer.residence_ownership_other || '0');

  let rawAsset = 1.0;
  if (ownership.includes('ตนเอง') || ownership.includes('Own')) {
    if (assetValue > reqAmt) rawAsset = 2.0;
    else rawAsset = 1.5;
  } else if (ownership.includes('เช่า') || ownership.includes('Rent')) {
      rawAsset = 1.0;
  }

  const scoreAsset = rawAsset * 12.97;
  breakdown.asset = scoreAsset;
  score += scoreAsset;
  debug.push({ label: 'Asset Ownership', value: ownership, weight: 25.94, score: scoreAsset, column: '-' });

  return { total: score, details: breakdown, debug };
};

// C2: Cash Flow (Max 55.02)
const calculateC2 = (financials) => {
  let score = 0;
  const breakdown = {};
  const debug = [];

  // 1. D/E Ratio (Max 24.76)
  const de = financials.deRatio.value || 0;
  let rawDE = 0;
  if (de <= 1) rawDE = 2.0;
  else if (de <= 1.5) rawDE = 1.6;
  else if (de <= 2) rawDE = 1.2;
  else if (de <= 3) rawDE = 1.0;
  else rawDE = 0;

  const scoreDE = rawDE * 12.38;
  breakdown.deRatio = scoreDE;
  score += scoreDE;
  debug.push({ label: 'D/E Ratio', value: de, weight: 24.76, score: scoreDE, column: financials.deRatio.column });

  // 2. Inventory Turnover (Max 13.76)
  const inv = financials.inventoryTurnover.value || 0;
  let rawInv = 0;
  if (inv >= 12) rawInv = 2.0;
  else if (inv >= 8) rawInv = 1.5;
  else if (inv >= 6) rawInv = 1.0;
  else if (inv >= 4) rawInv = 0.5;
  else rawInv = 0;

  const scoreInv = rawInv * 6.88;
  breakdown.inventory = scoreInv;
  score += scoreInv;
  debug.push({ label: 'Inventory Turnover', value: inv, weight: 13.76, score: scoreInv, column: financials.inventoryTurnover.column });

  // 3. DSCR (Max 16.50)
  const dscr = financials.dscr || 0;
  let rawDSCR = 0;
  if (dscr >= 0.5) rawDSCR = 2.0;
  else if (dscr >= 0.4) rawDSCR = 1.5;
  else if (dscr >= 0.33) rawDSCR = 1.0;
  else if (dscr >= 0.25) rawDSCR = 0.5;
  else rawDSCR = 0;

  const scoreDSCR = rawDSCR * 8.25;
  breakdown.dscr = scoreDSCR;
  score += scoreDSCR;
  debug.push({ label: 'DSCR (Calculated)', value: dscr.toFixed(4), weight: 16.50, score: scoreDSCR, column: '-' });

  return { total: score, details: breakdown, debug };
};

// C3: Purchase Behavior (Max 95.98)
const calculateC3 = (accumData, financials, registeredCapital, requestAmount, requestTerm) => {
  let score = 0;
  const breakdown = {};
  const debug = [];

  if (!accumData) {
      return { total: 0, details: {}, debug: [] };
  }

  const secondAccum = parseAmount(accumData.SecondAccum);
  const totalRevenue = financials.totalRevenue.value || 0;
  const regCap = parseFloat(registeredCapital || 1);
  const reqAmt = parseFloat(requestAmount || 1);
  const reqDays = parseFloat(requestTerm || 30);

  // 1. Revenue / Registered Capital (Max 3.04)
  const revCapRatio = totalRevenue / regCap;
  let rawRevCap = 0;
  if (revCapRatio >= 1.5) rawRevCap = 2.0;
  else if (revCapRatio >= 1.0) rawRevCap = 1.5;
  else if (revCapRatio >= 0.6) rawRevCap = 1.0;
  else if (revCapRatio >= 0.26) rawRevCap = 0.5;
  else rawRevCap = 0.25;

  const scoreRevCap = rawRevCap * 1.52;
  breakdown.revenueCapital = scoreRevCap;
  score += scoreRevCap;
  debug.push({ label: 'Revenue / Capital', value: revCapRatio.toFixed(2), weight: 3.04, score: scoreRevCap, column: '-' });

  // 2. Avg Purchase (3mo) / Requested Credit (Max 35.04)
  const avgPurchase3Mo = secondAccum / 3;
  const capCheckRatio = avgPurchase3Mo / reqAmt;
  let rawCapCheck = 0;
  if (capCheckRatio >= 1.5) rawCapCheck = 2.0;
  else if (capCheckRatio >= 1.0) rawCapCheck = 1.5;
  else if (capCheckRatio >= 0.6) rawCapCheck = 1.0;
  else if (capCheckRatio >= 0.26) rawCapCheck = 0.5;
  else rawCapCheck = 0.25;

  const scoreCapCheck = rawCapCheck * 17.52;
  breakdown.capacityCheck = scoreCapCheck;
  score += scoreCapCheck;
  debug.push({ label: 'Capacity Check', value: capCheckRatio.toFixed(2), weight: 35.04, score: scoreCapCheck, column: '-' });

  // 3. Purchase / Credit Term (Max 18.28)
  const termFactor = reqDays / 30;
  const turnoverSpeed = (1.5 * (avgPurchase3Mo * termFactor)) / reqAmt;

  let rawTurnover = 0;
  if (turnoverSpeed >= 1.5) rawTurnover = 2.0;
  else if (turnoverSpeed >= 1.0) rawTurnover = 1.5;
  else if (turnoverSpeed >= 0.6) rawTurnover = 1.0;
  else if (turnoverSpeed >= 0.26) rawTurnover = 0.5;
  else rawTurnover = 0.25;

  const scoreTurnover = rawTurnover * 9.14;
  breakdown.turnover = scoreTurnover;
  score += scoreTurnover;
  debug.push({ label: 'Turnover Speed', value: turnoverSpeed.toFixed(2), weight: 18.28, score: scoreTurnover, column: '-' });

  // 4. Purchase Trend (Max 28.96)
  const trend = parseFloat(accumData.AccumTrend || 1.0);
  let rawTrend = 0;
  if (trend >= 1.20) rawTrend = 2.0;
  else if (trend >= 1.05) rawTrend = 1.5;
  else if (trend >= 0.95) rawTrend = 1.0;
  else if (trend >= 0.80) rawTrend = 0.5;
  else rawTrend = 0.25;

  const scoreTrend = rawTrend * 14.48;
  breakdown.trend = scoreTrend;
  score += scoreTrend;
  debug.push({ label: 'Purchase Trend', value: trend.toFixed(2), weight: 28.96, score: scoreTrend, column: '-' });

  // 5. Customer Duration
  const scoreDuration = 0.5 * 5.33;
  breakdown.duration = scoreDuration;
  score += scoreDuration;
  debug.push({ label: 'Customer Duration', value: 'Active', weight: 2.67, score: scoreDuration, column: '-' });

  return { total: score, details: breakdown, debug };
};

exports.analyzeFinancials = async (req, res) => {
  try {
    const files = req.files;
    const { registered_capital, request_amount, customer_no } = req.body;

    // --- 1. EXTRACT FROM EXCEL ---
    const results = {
      nonCurrentLiabilities: { value: 0, column: '' },
      shareholdersEquity: { value: 0, column: '' },
      totalRevenue: { value: 0, column: '' },
      grossProfit: { value: 0, column: '' },
      deRatio: { value: 0, column: '' },
      inventoryTurnover: { value: 0, column: '' }
    };

    if (files['balance_sheet'] && files['balance_sheet'][0]) {
      const workbook = xlsx.read(files['balance_sheet'][0].buffer, { type: 'buffer' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      results.nonCurrentLiabilities = findValue(sheet, 'หนี้สินไม่หมุนเวียน', 'AMOUNT');
      results.shareholdersEquity = findValue(sheet, 'ส่วนของผู้ถือหุ้น', 'AMOUNT');
    }

    if (files['profit_loss'] && files['profit_loss'][0]) {
      const workbook = xlsx.read(files['profit_loss'][0].buffer, { type: 'buffer' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      results.totalRevenue = findValue(sheet, 'รายได้รวม', 'AMOUNT');
      results.grossProfit = findValue(sheet, 'กำไร(ขาดทุน) ขั้นต้น', 'AMOUNT');
    }

    if (files['financial_ratios'] && files['financial_ratios'][0]) {
      const workbook = xlsx.read(files['financial_ratios'][0].buffer, { type: 'buffer' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      results.deRatio = findValue(sheet, 'อัตราส่วนหนี้สินรวมต่อส่วนของผู้ถือหุ้น', 'RATIO');
      // Updated: Search for BOTH 'อัตราการหมุนเวียน' AND 'สินค้าคงเหลือ'
      results.inventoryTurnover = findValue(sheet, ['อัตราการหมุนเวียน', 'สินค้าคงเหลือ'], 'RATIO');
    }

    // Calculations for C2 inputs
    const calculations = { dscr: 0, creditCapitalRatio: 0 };
    const gp = results.grossProfit.value;
    const ncl = results.nonCurrentLiabilities.value;

    if (ncl !== 0) {
      calculations.dscr = (gp / ncl) * 0.3;
    }
    const regCap = parseFloat(registered_capital || 0);
    const reqAmt = parseFloat(request_amount || 0);
    if (regCap !== 0) {
      calculations.creditCapitalRatio = reqAmt / regCap;
    }

    // --- 2. FETCH DATABASE & API INFO ---
    let customerData = {};
    let accumData = null;
    let monthlyHistory = [];

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

        // Fetch Financial Data (REPLACED SQL WITH API)
        const apiData = await fetchPurchasingBehavior(customer_no);

        if (apiData && apiData.monthly && apiData.monthly.length > 0) {
            const monthlyData = [...apiData.monthly];
            // Sort by month (oldest first)
            monthlyData.sort((a, b) => a.month.localeCompare(b.month));

            // Separate Calculation Set (Exclude Current Month)
            let calcData = [];
            if (monthlyData.length > 1) {
                calcData = monthlyData.slice(0, -1);
            } else {
                calcData = [];
            }

            const totalCalcAvailable = calcData.length;

            // Last 3 Months (for SecondAccum)
            const last3 = calcData.slice(-3);
            const sumLast3 = last3.reduce((acc, cur) => acc + cur.amount, 0);

            // Previous 3 Months (for Trend)
            let prev3 = [];
            if (totalCalcAvailable >= 6) {
                prev3 = calcData.slice(-6, -3);
            } else if (totalCalcAvailable > 3) {
                prev3 = calcData.slice(0, -3);
            }
            const sumPrev3 = prev3.reduce((acc, cur) => acc + cur.amount, 0);

            // Calculate Trend %
            let trendPercent = 0;
            if (sumPrev3 > 0) {
                trendPercent = ((sumLast3 - sumPrev3) / sumPrev3) * 100;
            } else if (sumLast3 > 0) {
                trendPercent = 100;
            }

            // Map to legacy "accumData" format for calculateC3
            // SecondAccum = Sum of Last 3 Months
            // AccumTrend = Ratio (e.g., 1.20 for 20% growth)
            const trendRatio = 1 + (trendPercent / 100);

            accumData = {
                SecondAccum: sumLast3,
                AccumTrend: trendRatio
            };

            // Prepare Monthly History for Frontend (Reverse order: Newest First)
            monthlyHistory = monthlyData.map((m, index) => {
                const isCurrent = index === monthlyData.length - 1;
                return {
                    label: formatThaiMonth(m.month, isCurrent),
                    month: m.month,
                    amount: m.amount
                };
            }).reverse();

        } else {
             // No Data found
             accumData = { SecondAccum: 0, AccumTrend: 1.0 };
        }
    }

    // --- 3. SCORING ---
    const c1 = calculateC1(customerData, regCap, reqAmt);

    const c2Inputs = { ...results, dscr: calculations.dscr };
    const c2 = calculateC2(c2Inputs);

    const c3 = calculateC3(accumData, results, regCap, reqAmt, 30);

    const totalScore = c1.total + c2.total + c3.total;

    // --- 4. RECOMMENDED LIMIT ---
    const minLimit = 50000;
    const maxLimit = 500000;
    const n = 2;
    const ratio = Math.pow((totalScore / 200), n);
    const recommendedLimit = minLimit + (maxLimit - minLimit) * ratio;
    const roundedLimit = Math.round(recommendedLimit / 1000) * 1000;

    let grade = 'C';
    if (totalScore >= 160) grade = 'A';
    else if (totalScore >= 120) grade = 'B';

    // Combine Debug Data
    const rawInputs = [
        { label: 'Total Revenue (Extracted)', value: results.totalRevenue.value, column: results.totalRevenue.column, weight: '-', score: '-' },
        { label: 'Gross Profit (Extracted)', value: results.grossProfit.value, column: results.grossProfit.column, weight: '-', score: '-' },
        { label: 'Non-Current Liabilities (Extracted)', value: results.nonCurrentLiabilities.value, column: results.nonCurrentLiabilities.column, weight: '-', score: '-' },
        { label: 'Shareholders Equity (Extracted)', value: results.shareholdersEquity.value, column: results.shareholdersEquity.column, weight: '-', score: '-' },
    ];

    const debugData = [
        ...rawInputs,
        ...c1.debug,
        ...c2.debug,
        ...c3.debug
    ];

    const scoringResult = {
        totalScore: Math.round(totalScore),
        grade,
        recommendedLimit: roundedLimit,
        breakdown: { c1, c2, c3 }
    };

    // Additional Financial Summary for Frontend
    const financialSummary = {
        monthlyHistory,
        stats: {
            sumLast3: accumData ? accumData.SecondAccum : 0,
            trendRatio: accumData ? accumData.AccumTrend : 1.0
        }
    };

    res.json({
      success: true,
      extractedData: results,
      calculations: calculations,
      scoringResult: scoringResult,
      financialSummary: financialSummary, // New Field
      debugData: debugData
    });

  } catch (error) {
    console.error('Financial Analysis Error:', error);
    res.status(500).json({ success: false, message: 'Failed to analyze financial documents', error: error.message });
  }
};
