const xlsx = require('xlsx');
const db = require('../db');
const axios = require('axios');

// Configuration
const FINANCIAL_API_URL = "http://192.192.0.37:8000/api/customer-analytics/monthly-summary";
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

// Helper: Calculate Slope (Linear Regression)
// Data: Array of { month: 1, amount: X }, { month: 2, amount: Y } ...
const calculateSlope = (data) => {
    // Formula: slope = (N * Σ(xy) - Σx * Σy) / (N * Σ(x^2) - (Σx)^2)
    const n = data.length;
    if (n < 2) return 0;

    let sumX = 0;
    let sumY = 0;
    let sumXY = 0;
    let sumXX = 0;

    // Use indices 1, 2, 3... as X values
    for (let i = 0; i < n; i++) {
        const x = i + 1; // Month 1, 2, 3
        const y = data[i].amount;

        sumX += x;
        sumY += y;
        sumXY += (x * y);
        sumXX += (x * x);
    }

    const numerator = (n * sumXY) - (sumX * sumY);
    const denominator = (n * sumXX) - (sumX * sumX);

    if (denominator === 0) return 0;
    return numerator / denominator;
};

// Helper: Extract Series of Years (Last N years)
const findYearlySeries = (sheet, rowKeywords, count = 3) => {
  const data = xlsx.utils.sheet_to_json(sheet, { header: 1 });
  const yearCols = [];

  // 1. Scan Header Rows (0-10) for Years
  // Check rows 0-10 for year headers
  for (let r = 0; r < Math.min(data.length, 10); r++) {
      const row = data[r] || [];
      for (let c = 0; c < row.length; c++) {
          const cell = row[c];
          let yearVal = 0;

          if (typeof cell === 'number' && cell > 2000 && cell < 3000) {
              yearVal = cell;
          } else if (typeof cell === 'string') {
              // Try to find 4 digit year
              const match = cell.match(/(25\d{2}|20\d{2})/);
              if (match) {
                   yearVal = parseInt(match[0]);
              }
          }

          if (yearVal > 0) {
              // Check if we already have this year, keep the first occurrence (usually Amount column)
              // Actually, often headers are merged. If J4 is 2567, K4 is empty (merged).
              // So we find 2567 at J4.
              yearCols.push({ year: yearVal, col: c, row: r });
          }
      }
  }

  // Sort by Year Ascending
  yearCols.sort((a, b) => a.year - b.year);

  // Deduplicate: If multiple headers for same year, assume the first one (left-most) is the main data column
  const uniqueYears = [];
  const seen = new Set();
  for (const item of yearCols) {
      if (!seen.has(item.year)) {
          uniqueYears.push(item);
          seen.add(item.year);
      }
  }

  // Take last 'count' years
  const targetYears = uniqueYears.slice(-count);

  // 2. Find Row matching Keywords
  let targetRowIndex = -1;
  for (let r = 0; r < data.length; r++) {
      const row = data[r] || [];
      const rowString = row.join(' ').toLowerCase();

      let match = false;
      if (Array.isArray(rowKeywords)) {
          match = rowKeywords.every(k => rowString.includes(k.toLowerCase()));
      } else {
          match = rowString.includes(rowKeywords.toLowerCase());
      }

      if (match) {
          targetRowIndex = r;
          break;
      }
  }

  if (targetRowIndex === -1) return [];

  // 3. Extract Values
  const result = targetYears.map(item => {
      // Data is usually in the identified column
      const val = data[targetRowIndex][item.col];
      return {
          year: item.year,
          amount: parseAmount(val)
      };
  });

  return result;
};

// --- SCORING LOGIC ---

// C1: Company Strength (Max 49)
const calculateC1 = (customer, registeredCapital, requestAmount) => {
  let score = 0;
  const items = [];
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
  score += scoreYears;
  items.push({
    key: 'years',
    label: 'ระยะเวลาธุรกิจ',
    value: years,
    displayValue: years.toString(),
    weight: 14.42,
    score: scoreYears
  });
  debug.push({ label: 'ระยะเวลาดำเนินธุรกิจ', value: years, weight: 14.42, score: scoreYears, column: '-' });

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
  score += scoreLev;
  items.push({
    key: 'leverage',
    label: 'สัดส่วนเครดิตที่ขอต่อทุนจดทะเบียน',
    value: leverage,
    displayValue: leverage.toFixed(2),
    weight: 8.64,
    score: scoreLev
  });
  debug.push({ label: 'สัดส่วนเครดิตต่อทุน', value: leverage.toFixed(2), weight: 8.64, score: scoreLev, column: '-' });

  // 3. Asset Ownership (Max 25.94)
  const ownership = customer.residence_ownership || '';
  const assetValue = parseAmount(customer.residence_ownership_other || '0');

  let rawAsset = 1.0;
  let displayVal = ownership;
  if (ownership.includes('ตนเอง') || ownership.includes('Own')) {
    if (assetValue > reqAmt) {
        rawAsset = 2.0;
        displayVal = "มูลค่ามากกว่าเครดิตที่ขอ";
    } else {
        rawAsset = 1.5;
        displayVal = "มูลค่าน้อยกว่าเครดิตที่ขอ";
    }
  } else if (ownership.includes('เช่า') || ownership.includes('Rent')) {
      rawAsset = 1.0;
      displayVal = "เช่า";
  }

  const scoreAsset = rawAsset * 12.97;
  score += scoreAsset;
  items.push({
    key: 'asset',
    label: 'กรรมสิทธิ์ทรัพย์สิน',
    value: rawAsset, // Use score factor as raw value proxy
    displayValue: displayVal,
    weight: 25.94,
    score: scoreAsset
  });
  debug.push({ label: 'กรรมสิทธิ์ทรัพย์สิน', value: ownership, weight: 25.94, score: scoreAsset, column: '-' });

  return { total: score, items, debug };
};

// C2: Cash Flow (Max 55.02)
const calculateC2 = (financials) => {
  let score = 0;
  const items = [];
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
  score += scoreDE;
  items.push({
    key: 'deRatio',
    label: 'อัตราการส่วนหนี้สินรวม ต่อส่วนของผู้ถือหุ้น',
    value: de,
    displayValue: de.toFixed(4),
    weight: 24.76,
    score: scoreDE
  });
  debug.push({ label: 'อัตราส่วนหนี้สินต่อทุน (D/E)', value: de, weight: 24.76, score: scoreDE, column: financials.deRatio.column });

  // 2. Inventory Turnover (Max 13.76)
  const inv = financials.inventoryTurnover.value || 0;
  let rawInv = 0;
  if (inv >= 12) rawInv = 2.0;
  else if (inv >= 8) rawInv = 1.5;
  else if (inv >= 6) rawInv = 1.0;
  else if (inv >= 4) rawInv = 0.5;
  else rawInv = 0;

  const scoreInv = rawInv * 6.88;
  score += scoreInv;
  items.push({
    key: 'inventory',
    label: 'อัตราการหมุนเวียนของสินค้าคงเหลือ',
    value: inv,
    displayValue: inv.toFixed(2),
    weight: 13.76,
    score: scoreInv
  });
  debug.push({ label: 'อัตราหมุนเวียนสินค้าคงเหลือ', value: inv, weight: 13.76, score: scoreInv, column: financials.inventoryTurnover.column });

  // 3. DSCR (Max 16.50)
  const dscr = financials.dscr || 0;
  let rawDSCR = 0;
  if (dscr >= 0.5) rawDSCR = 2.0;
  else if (dscr >= 0.4) rawDSCR = 1.5;
  else if (dscr >= 0.33) rawDSCR = 1.0;
  else if (dscr >= 0.25) rawDSCR = 0.5;
  else rawDSCR = 0;

  const scoreDSCR = rawDSCR * 8.25;
  score += scoreDSCR;
  items.push({
    key: 'dscr',
    label: 'ความสามารถในการชำระหนี้ (DSCR)',
    value: dscr,
    displayValue: dscr.toFixed(4),
    weight: 16.50,
    score: scoreDSCR
  });
  debug.push({ label: 'ความสามารถชำระหนี้ (DSCR)', value: dscr.toFixed(4), weight: 16.50, score: scoreDSCR, column: '-' });

  return { total: score, items, debug };
};

// C3: Purchase Behavior (Max 95.98)
const calculateC3 = (accumData, financials, registeredCapital, requestAmount, requestTerm, customerDuration) => {
  let score = 0;
  const items = [];
  const debug = [];

  if (!accumData) {
      // Return empty items with correct structure
      return { total: 0, items: [], debug: [] };
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
  score += scoreRevCap;
  items.push({
    key: 'revenueCapital',
    label: 'สัดส่วนรายได้ต่อทุนจดทะเบียน',
    value: revCapRatio,
    displayValue: revCapRatio.toFixed(4), // Use 4 dec matches sheet
    weight: 3.04,
    score: scoreRevCap
  });
  debug.push({ label: 'รายได้ต่อทุน', value: revCapRatio.toFixed(2), weight: 3.04, score: scoreRevCap, column: '-' });

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
  score += scoreCapCheck;
  items.push({
    key: 'capacityCheck',
    label: 'สัดส่วนยอดซื้อเฉลี่ย ย้อนหลัง 3 เดือนต่อเครดิตที่ขอ',
    value: capCheckRatio,
    displayValue: capCheckRatio.toFixed(2),
    weight: 35.04,
    score: scoreCapCheck
  });
  debug.push({ label: 'ตรวจสอบความสามารถ (Capacity)', value: capCheckRatio.toFixed(2), weight: 35.04, score: scoreCapCheck, column: '-' });

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
  score += scoreTurnover;
  items.push({
    key: 'turnover',
    label: 'สัดส่วนยอดซื้อต่อระยะเวลาเครดิตที่ขอ',
    value: turnoverSpeed,
    displayValue: turnoverSpeed.toFixed(4),
    weight: 18.28,
    score: scoreTurnover
  });
  debug.push({ label: 'ความเร็วในการหมุนเวียน', value: turnoverSpeed.toFixed(2), weight: 18.28, score: scoreTurnover, column: '-' });

  // 4. Purchase Trend (Max 28.96)
  const trend = parseFloat(accumData.AccumTrend || 1.0);
  let rawTrend = 0;
  if (trend >= 1.20) rawTrend = 2.0;
  else if (trend >= 1.05) rawTrend = 1.5;
  else if (trend >= 0.95) rawTrend = 1.0;
  else if (trend >= 0.80) rawTrend = 0.5;
  else rawTrend = 0.25;

  const scoreTrend = rawTrend * 14.48;
  score += scoreTrend;
  items.push({
    key: 'trend',
    label: 'แนวโน้มการซื้อ',
    value: trend,
    displayValue: trend.toFixed(2),
    weight: 28.96,
    score: scoreTrend
  });
  debug.push({ label: 'แนวโน้มการซื้อ', value: trend.toFixed(2), weight: 28.96, score: scoreTrend, column: '-' });

  // 5. Customer Duration
  const duration = parseInt(customerDuration || 0);
  let rawDuration = 0.25;
  if (duration >= 7) rawDuration = 2.0;
  else if (duration >= 4) rawDuration = 1.5;
  else if (duration >= 2) rawDuration = 1.0;
  else if (duration >= 1) rawDuration = 0.5;

  const scoreDuration = rawDuration * 5.33;
  score += scoreDuration;
  items.push({
    key: 'duration',
    label: 'ระยะเวลาเป็นลูกค้า',
    value: duration,
    displayValue: duration.toFixed(2),
    weight: 10.66,
    score: scoreDuration
  });
  debug.push({ label: 'ระยะเวลาเป็นลูกค้า', value: duration, weight: 10.66, score: scoreDuration, column: '-' });

  return { total: score, items, debug };
};

exports.analyzeFinancials = async (req, res) => {
  try {
    const files = req.files;
    const {
      registered_capital,
      request_amount,
      customer_no,
      customer_duration,
      years_in_business,
      request_credit_term,
      residence_ownership,
      residence_ownership_other
    } = req.body;

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
    }

    if (files['profit_loss'] && files['profit_loss'][0]) {
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

        // Merge Manual Overrides (Frontend Inputs take precedence)
        if (years_in_business) customerData.years_in_business = years_in_business;
        if (residence_ownership) customerData.residence_ownership = residence_ownership;
        if (residence_ownership_other) customerData.residence_ownership_other = residence_ownership_other;

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

            // Calculate SLOPE for the last 3 months
            const slope = calculateSlope(last3);

            // NEW FORMULA FOR TREND (AccumTrend)
            // User Formula: 1 + (Slope / AveragePerMonth)
            let trendRatio = 1.0;
            const averagePerMonth = sumLast3 / 3;

            if (averagePerMonth !== 0) {
                trendRatio = 1 + (slope / averagePerMonth);
            }

            accumData = {
                SecondAccum: sumLast3,
                AccumTrend: trendRatio,
                Slope: slope
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
             accumData = { SecondAccum: 0, AccumTrend: 1.0, Slope: 0 };
        }
    }

    // --- 3. SCORING ---
    const c1 = calculateC1(customerData, regCap, reqAmt);

    const c2Inputs = { ...results, dscr: calculations.dscr };
    const c2 = calculateC2(c2Inputs);

    const c3 = calculateC3(accumData, results, regCap, reqAmt, request_credit_term || 30, customer_duration);

    const totalScore = c1.total + c2.total + c3.total;

    // --- 4. RECOMMENDED LIMIT ---
    const minLimit = 50000;
    const maxLimit = 500000;
    const n = 2;
    const ratio = Math.pow((totalScore / 200), n);
    const recommendedLimit = minLimit + (maxLimit - minLimit) * ratio;
    const roundedLimit = Math.round(recommendedLimit / 1000) * 1000;

    // --- 5. CALCULATE SIZE & GRADE (NEW LOGIC) ---
    // Size = C1 + C2
    const sizeScore = c1.total + c2.total;
    let sizeLabel = "L";
    if (sizeScore <= 37) sizeLabel = "S";
    else if (sizeScore <= 68) sizeLabel = "M";
    else sizeLabel = "L";

    // Grade = C3
    const gradeScore = c3.total;
    let gradeLabel = "D";
    if (gradeScore >= 81) gradeLabel = "A+";
    else if (gradeScore >= 66) gradeLabel = "A";
    else if (gradeScore >= 50) gradeLabel = "B+";
    else if (gradeScore >= 35) gradeLabel = "B";
    else if (gradeScore >= 20) gradeLabel = "C";

    // Combine Debug Data
    const rawInputs = [
        { label: 'รายได้รวม (Extracted)', value: results.totalRevenue.value, column: results.totalRevenue.column, weight: '-', score: '-' },
        { label: 'กำไรขั้นต้น (Extracted)', value: results.grossProfit.value, column: results.grossProfit.column, weight: '-', score: '-' },
        { label: 'หนี้สินไม่หมุนเวียน (Extracted)', value: results.nonCurrentLiabilities.value, column: results.nonCurrentLiabilities.column, weight: '-', score: '-' },
        { label: 'ส่วนของผู้ถือหุ้น (Extracted)', value: results.shareholdersEquity.value, column: results.shareholdersEquity.column, weight: '-', score: '-' },
        { label: 'อัตราหมุนเวียนสินค้า (Extracted)', value: results.inventoryTurnover.value, column: results.inventoryTurnover.column, weight: '-', score: '-' },
    ];

    const debugData = [
        ...rawInputs,
        ...c1.debug,
        ...c2.debug,
        ...c3.debug
    ];

    const scoringResult = {
        totalScore: Math.round(totalScore),
        grade: gradeLabel, // Use new grade label
        recommendedLimit: roundedLimit,
        breakdown: { c1, c2, c3 },
        sizeResult: { score: sizeScore, label: sizeLabel },
        gradeResult: { score: gradeScore, label: gradeLabel }
    };

    // Additional Financial Summary for Frontend
    const financialSummary = {
        monthlyHistory,
        stats: {
            sumLast3: accumData ? accumData.SecondAccum : 0,
            trendRatio: accumData ? accumData.AccumTrend : 1.0,
            slope: accumData ? accumData.Slope : 0
        }
    };

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

// Export helper for testing
exports.findYearlySeries = findYearlySeries;
exports.calculateSlope = calculateSlope;
exports.calculateC1 = calculateC1;
exports.calculateC2 = calculateC2;
exports.calculateC3 = calculateC3;
