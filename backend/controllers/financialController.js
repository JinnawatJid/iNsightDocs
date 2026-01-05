const xlsx = require('xlsx');

// Helper to find value in a sheet based on row label
const findValueByLabel = (sheet, labelSearchTerm) => {
  // Convert sheet to array of arrays
  const data = xlsx.utils.sheet_to_json(sheet, { header: 1 });

  for (const row of data) {
    if (row && row.length > 0) {
      // Check the first few columns for the label (usually col 0 or 1)
      const rowString = row.join(' ').toLowerCase();
      // Simple substring match
      if (rowString.includes(labelSearchTerm.toLowerCase())) {
        // Assume the value is in the last non-empty column
        // Filter out empty/null values from the end
        const validCells = row.filter(c => c !== null && c !== undefined && c !== '');
        let value = validCells[validCells.length - 1];

        // Clean the value
        if (typeof value === 'string') {
          // Remove commas
          value = value.replace(/,/g, '');
          // Handle parentheses for negative numbers (100) -> -100
          if (value.includes('(') && value.includes(')')) {
            value = value.replace(/[()]/g, '');
            value = -1 * parseFloat(value);
          } else {
            value = parseFloat(value);
          }
        }
        return value;
      }
    }
  }
  return null;
};

exports.analyzeFinancials = async (req, res) => {
  try {
    const files = req.files;
    const { registered_capital, request_amount } = req.body;

    // We expect specific field names from multer
    // balance_sheet, profit_loss, financial_ratios

    const results = {
      nonCurrentLiabilities: 0,
      shareholdersEquity: 0,
      totalRevenue: 0,
      grossProfit: 0,
      deRatio: 0,
      inventoryTurnover: 0
    };

    // 1. Parse Balance Sheet
    if (files['balance_sheet'] && files['balance_sheet'][0]) {
      const workbook = xlsx.read(files['balance_sheet'][0].buffer, { type: 'buffer' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];

      results.nonCurrentLiabilities = findValueByLabel(sheet, 'หนี้สินไม่หมุนเวียน') || 0;
      results.shareholdersEquity = findValueByLabel(sheet, 'ส่วนของผู้ถือหุ้น') || 0;
    }

    // 2. Parse Profit & Loss
    if (files['profit_loss'] && files['profit_loss'][0]) {
      const workbook = xlsx.read(files['profit_loss'][0].buffer, { type: 'buffer' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];

      results.totalRevenue = findValueByLabel(sheet, 'รายได้รวม') || 0;
      results.grossProfit = findValueByLabel(sheet, 'กำไร(ขาดทุน) ขั้นต้น') || 0;
    }

    // 3. Parse Ratios
    if (files['financial_ratios'] && files['financial_ratios'][0]) {
      const workbook = xlsx.read(files['financial_ratios'][0].buffer, { type: 'buffer' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];

      results.deRatio = findValueByLabel(sheet, 'อัตราส่วนหนี้สินรวมต่อส่วนของผู้ถือหุ้น') || 0;
      results.inventoryTurnover = findValueByLabel(sheet, 'อัตราการหมุนเวียนสินค้าคงเหลือ') || 0;
    }

    // 4. Calculations
    const calculations = {
      dscr: 0,
      creditCapitalRatio: 0
    };

    // DSCR = (Gross Profit / Non-Current Liabilities) * 0.3
    if (results.nonCurrentLiabilities !== 0) {
      calculations.dscr = (results.grossProfit / results.nonCurrentLiabilities) * 0.3;
    }

    // Credit/Capital Ratio = Request Amount / Registered Capital
    const regCap = parseFloat(registered_capital || 0);
    const reqAmt = parseFloat(request_amount || 0);

    if (regCap !== 0) {
      calculations.creditCapitalRatio = reqAmt / regCap;
    }

    res.json({
      success: true,
      extractedData: results,
      calculations: calculations
    });

  } catch (error) {
    console.error('Financial Analysis Error:', error);
    res.status(500).json({ success: false, message: 'Failed to analyze financial documents', error: error.message });
  }
};
