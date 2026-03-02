const BaseScorecard = require('./BaseScorecard');
const ScorecardEvaluator = require('../ScorecardEvaluator');

class ExistingCustomerScorecard extends BaseScorecard {

    constructor() {
        super();
        this.evaluator = new ScorecardEvaluator('credit_scorecard_existing_v1.json');
    }

    calculateScore(context) {
        const {
            customer,
            registeredCapital,
            requestAmount,
            financials,
            accumData,
            requestTerm,
            customerDuration,
            isCompany,
            wadl,
            limitExponent
        } = context;

        // 1. Calculate Component Scores
        const c1 = this.calculateC1(customer, registeredCapital, requestAmount);
        const c2 = this.calculateC2(financials, isCompany);
        const c3 = this.calculateC3(accumData, financials, registeredCapital, requestAmount, requestTerm, customerDuration, wadl);

        // 2. Aggregate Total Score
        const totalScore = c1.total + c2.total + c3.total;

        // 3. Determine Recommended Limit
        // Formula: Limit = (Average 1.5 Months) * (TotalScore / 200) ^ limitExponent
        // limitExponent defaults to 2.0 if not provided
        const exponent = typeof limitExponent === 'number' ? limitExponent : (this.evaluator.config.limitExponent || 2.0);

        let avg1_5Months = 0;
        if (accumData && accumData.SumLast6 !== undefined) {
            // Existing Customer: Use Sum Last 6 Months / 4 (Average 1.5 Months)
            avg1_5Months = this.parseAmount(accumData.SumLast6) / 4;
        } else {
            // Fallback: Use Second Accum (Last 3 Months) / 2
            const secondAccum = accumData ? this.parseAmount(accumData.SecondAccum) : 0;
            avg1_5Months = secondAccum / 2;
        }

        const ratio = Math.pow((totalScore / 200), exponent);
        const recommendedLimit = avg1_5Months * ratio;

        // Round to nearest 1,000
        const roundedLimit = Math.round(recommendedLimit / 1000) * 1000;

        // 4. Calculate Size & Grade
        // Dynamically calculate boundaries based on max possible scores
        const config = this.evaluator.config;

        // Size = C1 + C2
        const sizeScore = c1.total + c2.total;
        const maxSizeScore = this.getMaxScore(config.components, ['c1', 'c2']);
        const sizeLabels = config.size_definitions || ["S", "M", "L"];
        const sizeDefs = this.generateDefinitions(maxSizeScore, sizeLabels);
        const sizeLabel = this.evaluateDefinition(sizeScore, sizeDefs, sizeLabels[0] || "S");

        // Grade = C3
        const gradeScore = c3.total;
        const maxGradeScore = this.getMaxScore(config.components, ['c3']);
        const gradeLabels = config.grade_definitions || ["D", "C", "B", "B+", "A", "A+"];
        const gradeDefs = this.generateDefinitions(maxGradeScore, gradeLabels);
        const gradeLabel = this.evaluateDefinition(gradeScore, gradeDefs, gradeLabels[0] || "D");

        // 5. Structure Output
        return {
            totalScore: Math.round(totalScore),
            grade: gradeLabel,
            recommendedLimit: roundedLimit,
            breakdown: { c1, c2, c3 },
            sizeResult: { score: sizeScore, label: sizeLabel },
            gradeResult: { score: gradeScore, label: gradeLabel },
            debug: [...c1.debug, ...c2.debug, ...c3.debug]
        };
    }

    /**
     * Override BaseScorecard.calculateC1 to use Evaluator with Existing Customer Config
     */
    calculateC1(customer, registeredCapital, requestAmount) {
        let score = 0;
        const items = [];
        const debug = [];

        // 1. Years in Business
        const yearsInput = parseFloat(customer.years_in_business || 0);
        let years = yearsInput;
        if (yearsInput > 1000) {
            const currentYear = new Date().getFullYear();
            let establishYear = yearsInput;
            if (establishYear > 2300) establishYear = establishYear - 543;
            years = currentYear - establishYear;
            if (years < 0) years = 0;
        }

        const yearsRes = this.evaluator.evaluate('c1', 'years_in_business', years);
        score += yearsRes.score;
        items.push(yearsRes);
        debug.push({
            label: 'ระยะเวลาดำเนินธุรกิจ',
            value: years,
            weight: yearsRes.weight,
            score: yearsRes.score,
            column: '-',
            matchedRule: yearsRes.matchedRule
        });

        // 2. Request / Capital
        const regCap = parseFloat(registeredCapital || 1);
        const reqAmt = parseFloat(requestAmount || 0);
        const leverage = reqAmt / regCap;

        const levRes = this.evaluator.evaluate('c1', 'leverage', leverage);
        score += levRes.score;
        items.push(levRes);
        debug.push({
            label: 'สัดส่วนเครดิตต่อทุน',
            value: leverage.toFixed(2),
            weight: levRes.weight,
            score: levRes.score,
            column: '-',
            matchedRule: levRes.matchedRule
        });

        // 3. Asset Ownership
        const ownership = customer.residence_ownership || '';
        const assetRes = this.evaluator.evaluate('c1', 'asset_ownership', ownership);
        if (!assetRes.displayValue) {
            assetRes.displayValue = 'ไม่ระบุ';
        }
        score += assetRes.score;
        items.push(assetRes);
        debug.push({
            label: 'กรรมสิทธิ์ทรัพย์สิน',
            value: ownership,
            weight: assetRes.weight,
            score: assetRes.score,
            column: '-',
            matchedRule: assetRes.matchedRule
        });

        return { total: score, items, debug };
    }

    /**
     * Override BaseScorecard.calculateC2 to use Evaluator with Existing Customer Config
     */
    calculateC2(financials, isCompany = true) {
        let score = 0;
        const items = [];
        const debug = [];

        // 1. D/E Ratio
        const de = financials.deRatio.value || 0;
        let deRes = this.evaluator.evaluate('c2', 'de_ratio', de);
        if (!isCompany) deRes.score = 0;

        score += deRes.score;
        items.push(deRes);
        debug.push({
            label: 'อัตราส่วนหนี้สินต่อทุน (D/E)',
            value: de,
            weight: deRes.weight,
            score: deRes.score,
            column: financials.deRatio.column,
            matchedRule: deRes.matchedRule
        });

        // 2. Inventory Turnover
        const inv = financials.inventoryTurnover.value || 0;
        let invRes = this.evaluator.evaluate('c2', 'inventory_turnover', inv);
        if (!isCompany) invRes.score = 0;

        score += invRes.score;
        items.push(invRes);
        debug.push({
            label: 'อัตราหมุนเวียนสินค้าคงเหลือ',
            value: inv,
            weight: invRes.weight,
            score: invRes.score,
            column: financials.inventoryTurnover.column,
            matchedRule: invRes.matchedRule
        });

        // 3. DSCR
        const dscr = financials.dscr || 0;
        let dscrRes = this.evaluator.evaluate('c2', 'dscr', dscr);
        if (!isCompany) dscrRes.score = 0;

        score += dscrRes.score;
        items.push(dscrRes);
        debug.push({
            label: 'ความสามารถชำระหนี้ (DSCR)',
            value: dscr.toFixed(4),
            weight: dscrRes.weight,
            score: dscrRes.score,
            column: '-',
            matchedRule: dscrRes.matchedRule
        });

        return { total: score, items, debug };
    }

    /**
     * Override C3 to use Evaluator with Existing Customer Config + WADL
     */
    calculateC3(accumData, financials, registeredCapital, requestAmount, requestTerm, customerDuration, wadl) {
        let score = 0;
        const items = [];
        const debug = [];

        if (!accumData) {
            return { total: 0, items: [], debug: [] };
        }

        // Determine Basis: 6 Months (Existing) or 3 Months (Fallback)
        const use6Months = accumData.SumLast6 !== undefined;
        const totalPurchase = use6Months ? this.parseAmount(accumData.SumLast6) : this.parseAmount(accumData.SecondAccum);

        const revenueForRatio = financials.averageRevenue || 0;
        const regCap = parseFloat(registeredCapital || 1);
        const reqAmt = parseFloat(requestAmount || 1);
        const reqDays = parseFloat(requestTerm || 30);

        // 1. Revenue / Registered Capital
        const revCapRatio = revenueForRatio / regCap;
        const revRes = this.evaluator.evaluate('c3', 'revenue_capital_ratio', revCapRatio);

        score += revRes.score;
        items.push(revRes);
        debug.push({
            label: 'รายได้ต่อทุน',
            value: revCapRatio.toFixed(2),
            weight: revRes.weight,
            score: revRes.score,
            column: '-',
            matchedRule: revRes.matchedRule
        });

        // 2. Capacity Check (Avg Purchase / Requested Credit)
        // Existing (6m): Avg 1.5m = Total6 / 4
        // New (3m): Avg 1.5m = Total3 / 2
        const avg1_5Months = use6Months ? (totalPurchase / 4) : (totalPurchase / 2);
        const capCheckRatio = Number((avg1_5Months / reqAmt).toFixed(2));

        const capRes = this.evaluator.evaluate('c3', 'capacity_check', capCheckRatio);
        score += capRes.score;
        items.push(capRes);
        debug.push({
            label: 'ตรวจสอบความสามารถ (Capacity)',
            value: capCheckRatio.toFixed(2),
            weight: capRes.weight,
            score: capRes.score,
            column: '-',
            matchedRule: capRes.matchedRule
        });

        // 3. Turnover Speed (Purchase / Credit Term) -> Renamed: สัดส่วนยอดซื้อต่อระยะเวลาเครดิตที่ขอ
        let numerator = 0;
        let isTermValid = true;
        const term = parseInt(reqDays);

        switch (term) {
          case 7: numerator = avg1_5Months / 4; break;
          case 14:
          case 15: numerator = avg1_5Months / 2; break;
          case 30: numerator = avg1_5Months; break;
          case 45: numerator = avg1_5Months / 0.75; break;
          case 60:
              if (use6Months) {
                  // Existing Customer: (Sum6 / 6) * 2 = Sum6 / 3
                  numerator = totalPurchase / 3;
              } else {
                  // New Customer Fallback: Sum3 / 3 * 2 (or Sum First 2)
                  if (accumData && accumData.last3Months && accumData.last3Months.length >= 2) {
                      numerator = accumData.last3Months[0].amount + accumData.last3Months[1].amount;
                  } else {
                      numerator = (totalPurchase / 3) * 2;
                  }
              }
              break;
          default:
              numerator = 0;
              isTermValid = false;
              break;
        }

        const turnoverSpeed = numerator / reqAmt;
        let turnoverRes = this.evaluator.evaluate('c3', 'turnover_speed', turnoverSpeed);

        if (!isTermValid) {
            turnoverRes.score = 0;
            turnoverRes.matchedRule = "Invalid Term";
        }

        score += turnoverRes.score;
        items.push(turnoverRes);
        debug.push({
            label: 'สัดส่วนยอดซื้อต่อระยะเวลาเครดิตที่ขอ',
            value: turnoverSpeed.toFixed(2),
            weight: turnoverRes.weight,
            score: turnoverRes.score,
            column: '-',
            matchedRule: turnoverRes.matchedRule
        });

        // 4. Purchase Trend (Slope)
        // Use Slope6 if available, else Slope (3m)
        const slope = use6Months ? (accumData.Slope6 || 0) : (accumData.Slope || 0);
        const trendRes = this.evaluator.evaluate('c3', 'purchase_trend', slope);

        if (totalPurchase === 0) {
            trendRes.score = 0;
            trendRes.matchedRule = "No Purchases";
        }

        score += trendRes.score;
        items.push(trendRes);
        debug.push({
            label: 'แนวโน้มการซื้อ (Slope)',
            value: slope.toFixed(2),
            weight: trendRes.weight,
            score: trendRes.score,
            column: '-',
            matchedRule: trendRes.matchedRule
        });

        // 5. Customer Duration
        const duration = parseInt(customerDuration || 0);
        const durRes = this.evaluator.evaluate('c3', 'customer_duration', duration);

        score += durRes.score;
        items.push(durRes);
        debug.push({
            label: 'ระยะเวลาเป็นลูกค้า',
            value: duration,
            weight: durRes.weight,
            score: durRes.score,
            column: '-',
            matchedRule: durRes.matchedRule
        });

        // 6. WADL (Weighted Average Days Late) - NEW
        const wadlValue = parseFloat(wadl || 0);
        const wadlRes = this.evaluator.evaluate('c3', 'wadl', wadlValue);

        // Gatekeeper: If Avg 1.5 Month Purchases (K10) is 0, WADL score is 0
        if (avg1_5Months === 0) {
            wadlRes.score = 0;
            wadlRes.matchedRule = "No Purchase History (Score 0)";
        }

        score += wadlRes.score;
        items.push(wadlRes);
        debug.push({
            label: 'ระยะเวลาการจ่ายเลท (WADL)',
            value: wadlValue.toFixed(2),
            weight: wadlRes.weight,
            score: wadlRes.score,
            column: '-',
            matchedRule: wadlRes.matchedRule
        });

        return { total: score, items, debug };
    }
}

module.exports = ExistingCustomerScorecard;
