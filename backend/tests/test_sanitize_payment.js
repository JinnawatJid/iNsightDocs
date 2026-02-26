const assert = require('assert');

// -----------------------------------------------------------------------------
// The Logic Under Test (simulating what will be added to financialController.js)
// -----------------------------------------------------------------------------
function sanitizeInvoices(invoices) {
    if (!invoices || !Array.isArray(invoices)) return invoices;

    const today = new Date();
    // Reset time to midnight for fair date comparison
    today.setHours(0, 0, 0, 0);

    return invoices.map(inv => {
        // Clone to avoid mutation if needed, but in controller we usually modify in place
        // For test, let's modify a clone to verify output vs input
        const sanitized = { ...inv };

        // 1. Check for Invalid Cleared Date (1753-01-01 from SQL)
        const clearedDateStr = sanitized['Cleared Date'] || sanitized.Cleared_Date;
        const checkDateStr = sanitized['Check Date'] || sanitized.Check_Date;

        let isInvalidCleared = false;
        if (clearedDateStr && clearedDateStr.startsWith('1753-01-01')) {
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
            // Log for debugging (simulated)
            // console.log(`[Sanitize] Marking Invoice ${sanitized.Invoice_No} as Outstanding (Uncleared/Future Check)`);
            sanitized.Effective_Payment_Date = null;
            sanitized.Status = 'OUTSTANDING'; // Optional: Update status for clarity
            sanitized.Late_Days = 0; // Not late, just not paid yet
        }

        return sanitized;
    });
}

// -----------------------------------------------------------------------------
// Test Case 1: The Reported Issue (1753 Cleared Date)
// -----------------------------------------------------------------------------
const testCase1 = [
    {
        "Invoice_No": "AYVR-6901/0493",
        "Invoice_Date": "2026-01-30T00:00:00.000Z",
        "Due Date": "2026-03-05T00:00:00.000Z",
        "Customer No_": "10006AY",
        "Amount": 3434.58,
        "Payment_Doc_No": "AYPRV-6902/0075",
        "Payment_Date": "2026-02-17T00:00:00.000Z",
        "Check Date": "2026-03-05T00:00:00.000Z",
        "Cleared Date": "1753-01-01T00:00:00.000Z",
        "Effective_Payment_Date": "2026-03-05T00:00:00.000Z",
        "Status": "ON-TIME",
        "Late_Days": 0
    }
];

// -----------------------------------------------------------------------------
// Test Case 2: Future Check Date (e.g., Check Date is in 2030)
// -----------------------------------------------------------------------------
const testCase2 = [
    {
        "Invoice_No": "FUTURE-CHECK",
        "Invoice_Date": "2025-01-01",
        "Due Date": "2025-02-01",
        "Check Date": "2030-01-01T00:00:00.000Z", // Way in the future
        "Cleared Date": null,
        "Effective_Payment_Date": "2030-01-01T00:00:00.000Z", // Currently considered paid
        "Status": "ON-TIME"
    }
];

// -----------------------------------------------------------------------------
// Test Case 3: Valid Paid Invoice (Cleared Date is valid, Check Date is past)
// -----------------------------------------------------------------------------
const testCase3 = [
    {
        "Invoice_No": "VALID-PAID",
        "Invoice_Date": "2024-01-01",
        "Check Date": "2024-02-01T00:00:00.000Z",
        "Cleared Date": "2024-02-05T00:00:00.000Z", // Valid Cleared
        "Effective_Payment_Date": "2024-02-05T00:00:00.000Z",
        "Status": "ON-TIME"
    }
];

// -----------------------------------------------------------------------------
// Execution & Verification
// -----------------------------------------------------------------------------
console.log("Running Sanitize Payment Tests...");

// Test 1
const result1 = sanitizeInvoices(testCase1);
assert.strictEqual(result1[0].Effective_Payment_Date, null, "Test 1 Failed: Invoice with 1753 Cleared Date should be marked outstanding (null Effective Date)");
console.log("✅ Test 1 Passed: 1753 Cleared Date handled correctly.");

// Test 2
const result2 = sanitizeInvoices(testCase2);
assert.strictEqual(result2[0].Effective_Payment_Date, null, "Test 2 Failed: Future Check Date should be marked outstanding (null Effective Date)");
console.log("✅ Test 2 Passed: Future Check Date handled correctly.");

// Test 3
const result3 = sanitizeInvoices(testCase3);
assert.notStrictEqual(result3[0].Effective_Payment_Date, null, "Test 3 Failed: Valid Paid Invoice should remain paid.");
console.log("✅ Test 3 Passed: Valid Invoice remains untouched.");

console.log("All tests passed!");
