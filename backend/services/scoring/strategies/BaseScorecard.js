const { calculateSlope, calculateTrendRatio, generateContinuousTimeline } = require('../../financialCalculator');
const evaluator = require('../ScorecardEvaluator');

/**
 * BaseScorecard
 *
 * Provides shared scoring components (C1, C2) and helper methods used by all scoring strategies.
 * Refactored to use ScorecardEvaluator (JSON Configuration).
 */
class BaseScorecard {
    constructor() {
        // Base weights or configurations can be set here if needed
    }

    /**
     * Parses amount strings or numbers into a float.
     * @param {string|number} str
     */
    parseAmount(str) {
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
    }

    /**
     * C1: Company Strength (Shared Logic)
     * Factors: Years in Business, Registered Capital Leverage, Asset Ownership
     */
    calculateC1(customer, registeredCapital, requestAmount) {
        let score = 0;
        const items = [];
        const debug = [];

        // 1. Years in Business
        const yearsInput = parseFloat(customer.years_in_business || 0);
        let years = yearsInput;

        // Flexible Rule: If input > 1000, treat as establishment year
        if (yearsInput > 1000) {
            const currentYear = new Date().getFullYear();
            let establishYear = yearsInput;
            if (establishYear > 2300) {
                establishYear = establishYear - 543;
            }
            years = currentYear - establishYear;
            if (years < 0) years = 0;
        }

        const yearsResult = evaluator.evaluate('C1', 'yearsInBusiness', years);
        score += yearsResult.score;

        items.push({
            key: 'years',
            label: yearsResult.label,
            value: years,
            displayValue: years.toString(),
            weight: yearsResult.weight,
            score: yearsResult.score,
            matchedRule: yearsResult.matchedRule
        });
        debug.push({
            label: 'ระยะเวลาดำเนินธุรกิจ',
            value: years,
            weight: yearsResult.weight,
            score: yearsResult.score,
            column: '-',
            matchedRule: yearsResult.matchedRule
        });

        // 2. Request / Capital
        const regCap = parseFloat(registeredCapital || 1);
        const reqAmt = parseFloat(requestAmount || 0);
        const leverage = reqAmt / regCap;

        const levResult = evaluator.evaluate('C1', 'leverage', leverage);
        score += levResult.score;

        items.push({
            key: 'leverage',
            label: levResult.label,
            value: leverage,
            displayValue: leverage.toFixed(2),
            weight: levResult.weight,
            score: levResult.score,
            matchedRule: levResult.matchedRule
        });
        debug.push({
            label: 'สัดส่วนเครดิตต่อทุน',
            value: leverage.toFixed(2),
            weight: levResult.weight,
            score: levResult.score,
            column: '-',
            matchedRule: levResult.matchedRule
        });

        // 3. Asset Ownership
        const ownership = customer.residence_ownership || '';
        const assetResult = evaluator.evaluate('C1', 'assetOwnership', ownership);
        score += assetResult.score;

        items.push({
            key: 'asset',
            label: assetResult.label,
            value: 2, // Legacy: Frontend expects a raw value here sometimes? No, keeping it simple.
            displayValue: ownership,
            weight: assetResult.weight,
            score: assetResult.score,
            matchedRule: assetResult.matchedRule
        });
        debug.push({
            label: 'กรรมสิทธิ์ทรัพย์สิน',
            value: ownership,
            weight: assetResult.weight,
            score: assetResult.score,
            column: '-',
            matchedRule: assetResult.matchedRule
        });

        return { total: score, items, debug };
    }

    /**
     * C2: Cash Flow (Shared Logic)
     * Factors: D/E Ratio, Inventory Turnover, DSCR
     */
    calculateC2(financials, isCompany = true) {
        let score = 0;
        const items = [];
        const debug = [];

        // 1. D/E Ratio
        const de = financials.deRatio.value || 0;
        let deResult = evaluator.evaluate('C2', 'deRatio', de);

        if (!isCompany) {
             deResult.score = 0;
             deResult.matchedRule = "N/A (Individual)";
        }

        score += deResult.score;
        items.push({
            key: 'deRatio',
            label: deResult.label,
            value: de,
            displayValue: de.toFixed(4),
            weight: deResult.weight,
            score: deResult.score,
            matchedRule: deResult.matchedRule
        });
        debug.push({
            label: 'อัตราส่วนหนี้สินต่อทุน (D/E)',
            value: de,
            weight: deResult.weight,
            score: deResult.score,
            column: financials.deRatio.column,
            matchedRule: deResult.matchedRule
        });

        // 2. Inventory Turnover
        const inv = financials.inventoryTurnover.value || 0;
        let invResult = evaluator.evaluate('C2', 'inventoryTurnover', inv);

        if (!isCompany) {
            invResult.score = 0;
            invResult.matchedRule = "N/A (Individual)";
        }

        score += invResult.score;
        items.push({
            key: 'inventory',
            label: invResult.label,
            value: inv,
            displayValue: inv.toFixed(2),
            weight: invResult.weight,
            score: invResult.score,
            matchedRule: invResult.matchedRule
        });
        debug.push({
            label: 'อัตราหมุนเวียนสินค้าคงเหลือ',
            value: inv,
            weight: invResult.weight,
            score: invResult.score,
            column: financials.inventoryTurnover.column,
            matchedRule: invResult.matchedRule
        });

        // 3. DSCR
        const dscr = financials.dscr || 0;
        let dscrResult = evaluator.evaluate('C2', 'dscr', dscr);

        if (!isCompany) {
            dscrResult.score = 0;
            dscrResult.matchedRule = "N/A (Individual)";
        }

        score += dscrResult.score;
        items.push({
            key: 'dscr',
            label: dscrResult.label,
            value: dscr,
            displayValue: dscr.toFixed(4),
            weight: dscrResult.weight,
            score: dscrResult.score,
            matchedRule: dscrResult.matchedRule
        });
        debug.push({
            label: 'ความสามารถชำระหนี้ (DSCR)',
            value: dscr.toFixed(4),
            weight: dscrResult.weight,
            score: dscrResult.score,
            column: '-',
            matchedRule: dscrResult.matchedRule
        });

        return { total: score, items, debug };
    }

    /**
     * Interface Method - Must be implemented by subclasses
     */
    calculateScore(context) {
        throw new Error("Method 'calculateScore' must be implemented.");
    }
}

module.exports = BaseScorecard;
