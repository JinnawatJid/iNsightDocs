const xlsx = require('xlsx');
const db = require('../db');
const axios = require('axios');
const fs = require('fs-extra');
const path = require('path');
const { calculateSlope, calculateTrendRatio } = require('../services/financialCalculator');

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
  const yearsInput = parseFloat(customer.years_in_business || 0);
  let years = yearsInput;

  // Flexible Rule: If input > 1000, treat as establishment year
  if (yearsInput > 1000) {
      const currentYear = new Date().getFullYear();
      let establishYear = yearsInput;
      // If BE (e.g. 2568), convert to AD (2568 - 543 = 2025)
      // Check for reasonably high value typical of BE
      if (establishYear > 2300) {
          establishYear = establishYear - 543;
      }
      years = currentYear - establishYear;
      if (years < 0) years = 0;
  }

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
  // Removed assetValue logic as per new requirement

  let rawAsset = 1.0;
  let displayVal = ownership;

  // Logic: Own (2.0), Parents/Relatives (1.5), Rent/Hire Purchase (1.0)
  if (ownership.includes('ตนเอง') || ownership.includes('Own')) {
      rawAsset = 2.0;
  } else if (ownership.includes('ญาติ') || ownership.includes('บิดามารดา') || ownership.includes('Relative') || ownership.includes('Parents')) {
      rawAsset = 1.5;
  } else if (ownership.includes('เช่า') || ownership.includes('Rent')) {
      rawAsset = 1.0;
  } else {
      // Default / "Please Select"
      // If empty or unrecognized, we might want to flag it, but for scoring safety we can default to lowest or 0.
      // Keeping 1.0 as safe baseline for 'Rent' equivalent if ambiguous, or use 0 if strict.
      // Given user's formula had "Please select", we'll rely on frontend validation for empty.
      // If we fall through here with something else, we stick to 1.0 or 0?
      // Let's assume 1.0 (Rent) is the floor for existing businesses.
      rawAsset = 1.0;
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
const calculateC2 = (financials, isCompany = true) => {
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

  let scoreDE = rawDE * 12.38;
  if (!isCompany) scoreDE = 0; // Force 0 for Individual

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

  let scoreInv = rawInv * 6.88;
  if (!isCompany) scoreInv = 0; // Force 0 for Individual

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

  let scoreDSCR = rawDSCR * 8.25;
  if (!isCompany) scoreDSCR = 0; // Force 0 for Individual

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
  // FIX: Use Average Revenue (3 Years) instead of Latest Revenue
  const revenueForRatio = financials.averageRevenue || 0;
  const regCap = parseFloat(registeredCapital || 1);
  const reqAmt = parseFloat(requestAmount || 1);
  const reqDays = parseFloat(requestTerm || 30);

  // 1. Revenue / Registered Capital (Max 3.04)
  const revCapRatio = revenueForRatio / regCap;
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
  // FIX: Use "Average 1.5 Months" (Sum / 2) instead of "Average 1 Month" (Sum / 3)
  const avg1_5Months = secondAccum / 2;
  // Apply Rounding to 2 decimal places to match Google Sheet =ROUND(..., 2)
  const capCheckRatio = Number((avg1_5Months / reqAmt).toFixed(2));

  let rawCapCheck = 0.25;
  // Updated Logic to strictly match User's IFS formula
  if (capCheckRatio <= 0.25) rawCapCheck = 0.25;
  else if (capCheckRatio <= 0.59) rawCapCheck = 0.5;
  else if (capCheckRatio <= 0.99) rawCapCheck = 1.0;
  else if (capCheckRatio <= 1.49) rawCapCheck = 1.5;
  else if (capCheckRatio >= 1.5) rawCapCheck = 2.0;
  else rawCapCheck = 0.25; // Fallback

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
  // FIX: Updated Logic to match Google Sheet IFS formula
  // Formula: =IFS(B11=7, K10/4, B11=14, K10/2, B11=15, K10/2, B11=30, K10/1, B11=45, K10/0.75, B11=60, SUM(I10:I11), TRUE, "Error")/B10
  // Where K10 = avg1_5Months (Sum Last 3 Months / 2)
  // And for 60 Days: SUM(I10:I11) means Sum of Month 1 and Month 2 (Oldest 2 months of the 3-month set)

  let numerator = 0;
  let isTermValid = true;
  const term = parseInt(reqDays);

  switch (term) {
    case 7:
        numerator = avg1_5Months / 4;
        break;
    case 14:
    case 15:
        numerator = avg1_5Months / 2;
        break;
    case 30:
        numerator = avg1_5Months;
        break;
    case 45:
        numerator = avg1_5Months / 0.75;
        break;
    case 60:
        // Special Case: Sum of First 2 Months (Oldest 2)
        if (accumData && accumData.last3Months && accumData.last3Months.length >= 2) {
            // last3Months is [Oldest, Middle, Newest]
            numerator = accumData.last3Months[0].amount + accumData.last3Months[1].amount;
        } else {
            // Fallback if data missing (should be rare if accumData exists)
            // Fallback logic: 2/3 of Total Sum
            numerator = (accumData.SecondAccum / 3) * 2;
        }
        break;
    default:
        // User requested Error for invalid terms
        numerator = 0;
        isTermValid = false;
        console.warn(`[C3 Calculation] Invalid Credit Term: ${term}. Allowed: 7, 14, 15, 30, 45, 60.`);
        break;
  }

  const turnoverSpeed = numerator / reqAmt;

  let rawTurnover = 0;
  // Logic Updated:
  // <= 0.5 -> 0.5 (Includes 0, provided Term is valid)
  // <= 0.9 -> 1.0
  // <= 1.5 -> 1.5
  // <= 1.99 -> 2.0
  // > 1.99 -> 2.0 (TRUE condition)
  if (turnoverSpeed <= 0.5) rawTurnover = 0.5;
  else if (turnoverSpeed <= 0.9) rawTurnover = 1.0;
  else if (turnoverSpeed <= 1.5) rawTurnover = 1.5;
  else rawTurnover = 2.0;

  // If invalid term, force score to 0
  if (!isTermValid) rawTurnover = 0;

  const scoreTurnover = rawTurnover * 9.14;
  score += scoreTurnover;
  items.push({
    key: 'turnover',
    label: 'สัดส่วนยอดซื้อต่อระยะเวลาเครดิตที่ขอ',
    value: turnoverSpeed,
    displayValue: turnoverSpeed.toFixed(4),
    weight: 18.28,
    score: scoreTurnover,
    error: !isTermValid ? "Invalid Term" : null
  });
  debug.push({ label: 'ความเร็วในการหมุนเวียน', value: turnoverSpeed.toFixed(2), weight: 18.28, score: scoreTurnover, column: '-' });

  // 4. Purchase Trend (Max 28.96)
  // FIX: Switch from Trend Ratio to SLOPE Value based on User Request
  // Formula:
  // IF(Total3Months = 0, 0,
  //   IF(Slope > 16008.34, 2,
  //     IF(Slope >= 205.52, 1.5,
  //       IF(Slope >= -0.01, 1,
  //         IF(Slope >= -4654.54, 0.5, 0.25))))) * 14.48

  const slope = accumData.Slope || 0;
  const totalPurchase3Months = accumData.SecondAccum || 0;
  let rawTrend = 0;

  if (totalPurchase3Months === 0) {
      rawTrend = 0;
  } else {
      if (slope > 16008.34) rawTrend = 2.0;
      else if (slope >= 205.52) rawTrend = 1.5;
      else if (slope >= -0.01) rawTrend = 1.0;
      else if (slope >= -4654.54) rawTrend = 0.5;
      else rawTrend = 0.25;
  }

  const scoreTrend = rawTrend * 14.48;
  score += scoreTrend;

  // NOTE: We still display the calculated Slope and potentially the old Ratio in debug/UI if needed,
  // but scoring is now strictly based on Slope.
  items.push({
    key: 'trend',
    label: 'แนวโน้มการซื้อ (Slope)',
    value: slope,
    displayValue: slope.toFixed(2),
    weight: 28.96,
    score: scoreTrend
  });
  debug.push({ label: 'แนวโน้มการซื้อ (Slope)', value: slope.toFixed(2), weight: 28.96, score: scoreTrend, column: '-' });

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

    // --- PERSISTENT STORAGE (Project Requirement) ---
    // Save uploaded files to SP682/customers/{CustomerCode}/{YYYYMMDD}/
    if (customer_no) {
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
            const projectRoot = path.resolve(__dirname, '../../../../');
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

            // Determine Current System Month (YYYY-MM)
            const now = new Date();
            const currentYear = now.getFullYear();
            const currentMonthIdx = now.getMonth() + 1; // 1-12
            const currentSystemMonth = `${currentYear}-${String(currentMonthIdx).padStart(2, '0')}`;

            // Separate Calculation Set (Exclude Current Month)
            // Logic Update: Only exclude the last month if it MATCHES the current system month.
            let calcData = [];
            const lastMonthData = monthlyData[monthlyData.length - 1];

            if (monthlyData.length > 0) {
                 if (lastMonthData.month === currentSystemMonth) {
                     // Last month is current (incomplete) -> Exclude
                     if (monthlyData.length > 1) {
                         calcData = monthlyData.slice(0, -1);
                     } else {
                         calcData = [];
                     }
                 } else {
                     // Last month is past (complete) -> Include all
                     calcData = monthlyData;
                 }
            }

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
            monthlyHistory = monthlyData.map((m, index) => {
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

    // --- 3. SCORING ---
    const c1 = calculateC1(customerData, regCap, reqAmt);

    // Determine if Company (Check Name)
    // Use customer_name from body (latest) or DB (fallback)
    const finalName = customer_name || customerData.Name || "";
    const isCompany = (name) => {
        if (!name) return false;
        const keywords = ['บริษัท', 'ห้างหุ้นส่วนจำกัด', 'บ.', 'หจก.'];
        return keywords.some(keyword => name.includes(keyword));
    };
    const isCorp = isCompany(finalName);

    const c2Inputs = { ...results, dscr: calculations.dscr };
    const c2 = calculateC2(c2Inputs, isCorp);

    const c3 = calculateC3(accumData, results, regCap, reqAmt, request_credit_term || 30, customer_duration);

    const totalScore = c1.total + c2.total + c3.total;

    // --- 4. RECOMMENDED LIMIT ---
    const minLimit = 50000;
    const maxLimit = 500000;
    const n = 1.2;
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
