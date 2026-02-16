const { calculateSlope, calculateTrendRatio, generateContinuousTimeline } = require('../../financialCalculator');

/**
 * BaseScorecard
 *
 * Provides shared scoring components (C1, C2) and helper methods used by all scoring strategies.
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

        // 1. Years in Business (Max 14.42)
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
        let rawAsset = 1.0;
        let displayVal = ownership;

        if (ownership.includes('ตนเอง') || ownership.includes('Own')) {
            rawAsset = 2.0;
        } else if (ownership.includes('ญาติ') || ownership.includes('บิดามารดา') || ownership.includes('Relative') || ownership.includes('Parents')) {
            rawAsset = 1.5;
        } else if (ownership.includes('เช่า') || ownership.includes('Rent')) {
            rawAsset = 1.0;
        } else {
            rawAsset = 1.0;
        }

        const scoreAsset = rawAsset * 12.97;
        score += scoreAsset;
        items.push({
            key: 'asset',
            label: 'กรรมสิทธิ์ทรัพย์สิน',
            value: rawAsset,
            displayValue: displayVal,
            weight: 25.94,
            score: scoreAsset
        });
        debug.push({ label: 'กรรมสิทธิ์ทรัพย์สิน', value: ownership, weight: 25.94, score: scoreAsset, column: '-' });

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
    }

    /**
     * Interface Method - Must be implemented by subclasses
     */
    calculateScore(context) {
        throw new Error("Method 'calculateScore' must be implemented.");
    }
}

module.exports = BaseScorecard;
