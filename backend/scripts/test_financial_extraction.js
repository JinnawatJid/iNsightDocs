const xlsx = require('xlsx');
const { findYearlySeries } = require('../controllers/financialController');

console.log('Running Financial Extraction Verification...');

// 1. Create Mock Data (Array of Arrays)
const mockData = [
    ["Company Name"],
    ["Profit & Loss Statement"],
    [],
    // Row 3 (Index 3): Years Header (simulating merged cells by placing year in first col)
    // Cols: 0, 1, 2, 3, 4, 5, 6, 7(H), 8(I), 9(J), 10(K), 11(L), 12(M), 13(N), 14(O)
    // Years: 2563, 2564, 2565, 2566, 2567
    [null, null, null, null, null, "2563", null, "2564", null, "2565", null, "2566", null, "2567", null],

    // Row 4 (Index 4): Subheaders
    [null, null, null, null, null, "Amount", "%", "Amount", "%", "Amount", "%", "Amount", "%", "Amount", "%"],

    // Row 5: Data "รายได้รวม" (Total Revenue)
    // Values: 2563=100, 2564=200, 2565=300, 2566=400, 2567=500
    ["รายได้รวม", null, null, null, null, 100, 10, 200, 20, 300, 30, 400, 40, 500, 50],

    // Row 6: Data "กำไรขั้นต้น"
    ["กำไร(ขาดทุน) ขั้นต้น", null, null, null, null, 10, 1, 20, 2, 30, 3, 40, 4, 50, 5]
];

// 2. Convert to Sheet
const sheet = xlsx.utils.aoa_to_sheet(mockData);

// 3. Test findYearlySeries
console.log('Testing findYearlySeries for "รายได้รวม"...');
const result = findYearlySeries(sheet, 'รายได้รวม', 3);

console.log('Result:', JSON.stringify(result, null, 2));

// 4. Verification Logic
const expected = [
    { year: 2565, amount: 300 },
    { year: 2566, amount: 400 },
    { year: 2567, amount: 500 }
];

let pass = true;
if (result.length !== 3) pass = false;
expected.forEach((exp, i) => {
    if (!result[i]) {
        pass = false;
        console.error(`Missing index ${i}`);
    } else {
        if (result[i].year !== exp.year) {
             pass = false;
             console.error(`Year mismatch at ${i}: Expected ${exp.year}, Got ${result[i].year}`);
        }
        if (result[i].amount !== exp.amount) {
             pass = false;
             console.error(`Amount mismatch at ${i}: Expected ${exp.amount}, Got ${result[i].amount}`);
        }
    }
});

if (pass) {
    console.log('✅ TEST PASSED: Successfully extracted last 3 years of revenue.');
} else {
    console.error('❌ TEST FAILED');
    process.exit(1);
}
