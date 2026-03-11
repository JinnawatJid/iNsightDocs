const path = require('path');
const xlsx = require('xlsx');
const fs = require('fs');

/**
 * Parses a single DBD Excel file and extracts the rows/columns.
 *
 * Typically, these files have headers in the first few rows. We need to
 * find the actual data headers (e.g., years like 2564, 2565) and extract the rows.
 *
 * @param {string} filePath - Full path to the Excel file
 * @returns {Object} Parsed data structure
 */
function parseExcelFile(filePath) {
    if (!fs.existsSync(filePath)) {
        return null;
    }

    try {
        const fileBuffer = fs.readFileSync(filePath);
        const workbook = xlsx.read(fileBuffer, { type: 'buffer', cellFormula: false, cellHTML: false });
        const sheetName = workbook.SheetNames[0]; // Usually the first sheet
        const worksheet = workbook.Sheets[sheetName];

        // Convert to JSON with raw output to inspect
        const rawData = xlsx.utils.sheet_to_json(worksheet, { header: 1, defval: null });

        // Structure:
        // We need to identify the header row containing years.
        // It's usually the row with "หน่วย : บาท" or similar, or just looks like "2564", "2565".

        let headerRowIdx = -1;
        let years = [];
        let columnMapping = {}; // maps index to year

        // 1. Find the header row
        for (let i = 0; i < rawData.length && i < 15; i++) { // check first 15 rows
            const row = rawData[i];

            // Check if this row contains years (e.g. 2560-2570)
            const rowYears = [];
            row.forEach((cell, idx) => {
                const cellStr = String(cell).trim();
                if (cellStr.match(/^25[6-9][0-9]$/)) { // Match Thai years like 2564
                    rowYears.push({ year: cellStr, index: idx });
                }
            });

            if (rowYears.length >= 2) { // Found at least 2 years, likely the header
                headerRowIdx = i;
                years = rowYears.map(y => y.year);

                // Usually the next column or the column itself is the amount, and there might be a % change
                // Let's create a map: year -> { amountIdx, percentIdx }
                // In DBD, usually year is top, then below it or next to it is Amount / % Change.
                // It varies. Let's look at the next row to see if it says "จำนวนเงิน" and "%เปลี่ยนแปลง"

                let subHeaderRow = rawData[i + 1] || [];
                let hasSubHeaders = subHeaderRow.some(c => String(c).includes('จำนวน') || String(c).includes('เปลี่ยนแปลง'));

                rowYears.forEach((y, i2) => {
                    if (hasSubHeaders) {
                        // Amount is usually the first column under the year, % change is the second
                        columnMapping[y.year] = {
                            amountIdx: y.index,
                            percentIdx: y.index + 1 // Assuming they are adjacent
                        };
                    } else {
                         columnMapping[y.year] = {
                            amountIdx: y.index,
                            percentIdx: null
                        };
                    }
                });
                break;
            }
        }

        if (headerRowIdx === -1) {
            console.warn(`Could not find header row in ${filePath}`);
            return { rawData: rawData.slice(0, 10) }; // Return raw for debugging
        }

        // 2. Extract Data Rows
        const dataRows = [];
        // Data usually starts 1 or 2 rows after the header
        const startRowIdx = headerRowIdx + (rawData[headerRowIdx + 1]?.some(c => String(c).includes('จำนวน')) ? 2 : 1);

        for (let i = startRowIdx; i < rawData.length; i++) {
            const row = rawData[i];
            if (!row || row.length === 0 || !row[0]) continue; // Skip empty rows

            const metricName = String(row[0]).trim();
            if (metricName === '' || metricName.includes('หมายเหตุ') || metricName.includes('งบแสดง')) continue;

            const rowData = {
                metric: metricName,
                values: {}
            };

            let hasValidData = false;

            years.forEach(year => {
                const map = columnMapping[year];
                const amount = map.amountIdx < row.length ? row[map.amountIdx] : null;
                const percent = (map.percentIdx && map.percentIdx < row.length) ? row[map.percentIdx] : null;

                rowData.values[year] = {
                    amount: amount,
                    percentChange: percent
                };

                if (amount !== null && amount !== undefined && amount !== '') {
                    hasValidData = true;
                }
            });

            if (hasValidData) {
                dataRows.push(rowData);
            }
        }

        return {
            years: years,
            rows: dataRows
        };

    } catch (error) {
        console.error(`Error parsing Excel file ${filePath}:`, error);
        return null;
    }
}

/**
 * Extracts all financial data for a specific customer
 * @param {string} customerNo
 */
function getCustomerFinancialData(customerNo) {
    const sanitizedCustomerNo = require('path').basename(customerNo);

    // Replicate same path logic as financialController.js to support production structure
    let projectRoot = path.resolve(__dirname, '../../../../');
    if (!fs.existsSync(path.join(projectRoot, 'customers'))) {
        projectRoot = path.resolve(__dirname, '../../');
    }

    const customerDir = path.join(projectRoot, 'customers', sanitizedCustomerNo);
    console.log(`[DEBUG-PARSER] Reading customer directory for parsing: ${customerDir}`);

    if (!fs.existsSync(customerDir)) {
        return null;
    }

    const subdirs = fs.readdirSync(customerDir);
    const dateFolders = subdirs.filter(d => /^\d{8}$/.test(d)).sort().reverse();

    if (dateFolders.length === 0) {
        return null;
    }

    const latestFolder = dateFolders[0];
    const latestPath = path.join(customerDir, latestFolder);

    const positionFile = path.join(latestPath, 'DBD_FinancialPosition.xlsx');
    const incomeFile = path.join(latestPath, 'DBD_IncomeStatement.xlsx');
    const ratiosFile = path.join(latestPath, 'DBD_FinancialRatios.xlsx');

    return {
        financialPosition: parseExcelFile(positionFile),
        incomeStatement: parseExcelFile(incomeFile),
        financialRatios: parseExcelFile(ratiosFile)
    };
}

module.exports = {
    parseExcelFile,
    getCustomerFinancialData
};
