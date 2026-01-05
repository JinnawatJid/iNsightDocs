const xlsx = require('xlsx');
const db = require('../db');

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

// Helper to find value in a sheet based on row label and strategy
const findValueByLabel = (sheet, labelSearchTerm, strategy = 'AMOUNT') => {
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
          // If we find multiple, we prefer the right-most one (latest year typically)
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
        // Check if cell is a year (number or string)
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

  // 2. Find the Row matching the Label
  for (let r = 0; r < data.length; r++) {
    const row = data[r];
    if (row && row.length > 0) {
      const rowString = row.join(' ').toLowerCase();
      if (rowString.includes(labelSearchTerm.toLowerCase())) {

        let finalValue = 0;
        let finalColIndex = -1;

        // Path A: We found a definitive Target Column from headers
        if (targetColIndex !== -1) {
           // Verify if the cell at targetColIndex exists
           if (targetColIndex < row.length) {
             finalValue = parseAmount(row[targetColIndex]);
             finalColIndex = targetColIndex;
           }
        }

        // Path B: Fallback (No Header found or Empty Cell at Target)
        // If Path A yielded 0 (and it might be real 0, but let's check fallback if we are unsure)
        // Actually, let's stick to Target Column if found.
        // Only do fallback if targetColIndex == -1.

        if (targetColIndex === -1) {
             // Get all non-empty cells with their original indices
             const validCells = [];
             for(let c = 0; c < row.length; c++) {
               const val = row[c];
               if (val !== null && val !== undefined && val !== '') {
                 validCells.push({ val: val, idx: c });
               }
             }

             if (validCells.length > 0) {
               if (strategy === 'AMOUNT') {
                 // Option B Heuristic:
                 // Check last value. If small (<100) and prev is large (>1000), assume last is % change.
                 const last = validCells[validCells.length - 1];
                 const prev = validCells.length > 1 ? validCells[validCells.length - 2] : null;

                 const lastNum = parseAmount(last.val);
                 const prevNum = prev ? parseAmount(prev.val) : 0;

                 // Simple heuristic: "Change %" is usually small (e.g. -5, 10, 0.5) vs Amount (thousands/millions)
                 // Or we look for specific formatting? No, raw values.
                 // Let's use: if lastNum < 500 (abs) AND prevNum > 10000 (abs)
                 if (Math.abs(lastNum) < 500 && Math.abs(prevNum) > 1000) {
                    finalValue = prevNum;
                    finalColIndex = prev.idx;
                 } else {
                    finalValue = lastNum;
                    finalColIndex = last.idx;
                 }
               } else {
                 // RATIO Strategy Fallback: Just take the last one
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

  // 1. Years in Business (7.21% -> Max 14.42)
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

  // 2. Request / Capital (4.32% -> Max 8.64)
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

  // 3. Asset Ownership (12.97% -> Max 25.94)
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

  return { total: score, details: breakdown };
};

// C2: Cash Flow (Max 55.02)
const calculateC2 = (financials) => {
  let score = 0;
  const breakdown = {};

  // 1. D/E Ratio (12.38% -> Max 24.76)
  const de = financials.deRatio.value || 0; // Access .value
  let rawDE = 0;
  if (de <= 1) rawDE = 2.0;
  else if (de <= 1.5) rawDE = 1.6;
  else if (de <= 2) rawDE = 1.2;
  else if (de <= 3) rawDE = 1.0;
  else rawDE = 0;

  const scoreDE = rawDE * 12.38;
  breakdown.deRatio = scoreDE;
  score += scoreDE;

  // 2. Inventory Turnover (6.88% -> Max 13.76)
  const inv = financials.inventoryTurnover.value || 0; // Access .value
  let rawInv = 0;
  if (inv >= 12) rawInv = 2.0;
  else if (inv >= 8) rawInv = 1.5;
  else if (inv >= 6) rawInv = 1.0;
  else if (inv >= 4) rawInv = 0.5;
  else rawInv = 0;

  const scoreInv = rawInv * 6.88;
  breakdown.inventory = scoreInv;
  score += scoreInv;

  // 3. DSCR (8.25% -> Max 16.50)
  const dscr = financials.dscr || 0; // Calculated field (number)
  let rawDSCR = 0;
  if (dscr >= 0.5) rawDSCR = 2.0;
  else if (dscr >= 0.4) rawDSCR = 1.5;
  else if (dscr >= 0.33) rawDSCR = 1.0;
  else if (dscr >= 0.25) rawDSCR = 0.5;
  else rawDSCR = 0;

  const scoreDSCR = rawDSCR * 8.25;
  breakdown.dscr = scoreDSCR;
  score += scoreDSCR;

  return { total: score, details: breakdown };
};

// C3: Purchase Behavior (Max 95.98)
const calculateC3 = (accumData, financials, registeredCapital, requestAmount, requestTerm) => {
  let score = 0;
  const breakdown = {};

  if (!accumData) {
      return { total: 0, details: {} };
  }

  const secondAccum = parseAmount(accumData.SecondAccum);
  const totalRevenue = financials.totalRevenue.value || 0; // Access .value
  const regCap = parseFloat(registeredCapital || 1);
  const reqAmt = parseFloat(requestAmount || 1);
  const reqDays = parseFloat(requestTerm || 30);

  // 1. Revenue / Registered Capital (1.52% -> Max 3.04)
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

  // 2. Avg Purchase (3mo) / Requested Credit (17.52% -> Max 35.04)
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

  // 3. Purchase / Credit Term (9.14% -> Max 18.28)
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

  // 4. Purchase Trend (14.48% -> Max 28.96)
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

  // 5. Customer Duration
  const scoreDuration = 0.5 * 5.33;
  breakdown.duration = scoreDuration;
  score += scoreDuration;

  return { total: score, details: breakdown };
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
      results.nonCurrentLiabilities = findValueByLabel(sheet, 'หนี้สินไม่หมุนเวียน', 'AMOUNT');
      results.shareholdersEquity = findValueByLabel(sheet, 'ส่วนของผู้ถือหุ้น', 'AMOUNT');
    }

    if (files['profit_loss'] && files['profit_loss'][0]) {
      const workbook = xlsx.read(files['profit_loss'][0].buffer, { type: 'buffer' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      results.totalRevenue = findValueByLabel(sheet, 'รายได้รวม', 'AMOUNT');
      results.grossProfit = findValueByLabel(sheet, 'กำไร(ขาดทุน) ขั้นต้น', 'AMOUNT');
    }

    if (files['financial_ratios'] && files['financial_ratios'][0]) {
      const workbook = xlsx.read(files['financial_ratios'][0].buffer, { type: 'buffer' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      results.deRatio = findValueByLabel(sheet, 'อัตราส่วนหนี้สินรวมต่อส่วนของผู้ถือหุ้น', 'RATIO');
      results.inventoryTurnover = findValueByLabel(sheet, 'อัตราการหมุนเวียนสินค้าคงเหลือ', 'RATIO');
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

    // --- 2. FETCH DATABASE INFO ---
    let customerData = {};
    let accumData = null;

    if (customer_no) {
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

        const accumSql = 'SELECT * FROM AY_ACCUM WHERE custcode = ?';
        let rowsA = [];
        if (db.dbType === 'mssql') {
             const resA = await db.query('SELECT TOP 1 * FROM AY_ACCUM WHERE custcode = ?', [customer_no]);
             rowsA = resA.rows;
        } else {
             const resA = await db.query('SELECT * FROM AY_ACCUM WHERE custcode = ? LIMIT 1', [customer_no]);
             rowsA = resA.rows;
        }
        if (rowsA.length > 0) accumData = rowsA[0];
    }

    // --- 3. SCORING ---
    const c1 = calculateC1(customerData, regCap, reqAmt);

    // Mix extracted inputs (using .value) + calculated inputs for C2
    // We pass the whole 'results' object, but calculateC2 is updated to read .value
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

    const scoringResult = {
        totalScore: Math.round(totalScore),
        grade,
        recommendedLimit: roundedLimit,
        breakdown: { c1, c2, c3 }
    };

    res.json({
      success: true,
      extractedData: results,
      calculations: calculations,
      scoringResult: scoringResult
    });

  } catch (error) {
    console.error('Financial Analysis Error:', error);
    res.status(500).json({ success: false, message: 'Failed to analyze financial documents', error: error.message });
  }
};
