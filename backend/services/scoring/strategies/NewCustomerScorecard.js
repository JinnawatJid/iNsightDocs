const BaseScorecard = require('./BaseScorecard');
const ScorecardEvaluator = require('../ScorecardEvaluator');

class NewCustomerScorecard extends BaseScorecard {

    constructor() {
        super();
        this.evaluator = new ScorecardEvaluator();
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
            isCompany
        } = context;

        // 1. Calculate Component Scores
        const c1 = this.calculateC1(customer, registeredCapital, requestAmount);
        const c2 = this.calculateC2(financials, isCompany);
        const c3 = this.calculateC3(accumData, financials, registeredCapital, requestAmount, requestTerm, customerDuration);

        // 2. Aggregate Total Score
        const totalScore = c1.total + c2.total + c3.total;

        // 3. Determine Recommended Limit (New Customer Formula: 50k - 500k)
        const minLimit = 50000;
        const maxLimit = 500000;
        const n = 1.2;
        const ratio = Math.pow((totalScore / 200), n);
        const recommendedLimit = minLimit + (maxLimit - minLimit) * ratio;
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
     * Override BaseScorecard.calculateC1 to use Evaluator
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

        const yearsRes = this.evaluator.evaluate('c1', 'years_in_business', years);
        score += yearsRes.score;
        items.push(yearsRes);
        debug.push({
            label: 'ระยะเวลาดำเนินธุรกิจ',
            value: years,
            weight: yearsRes.weight,
            score: yearsRes.score,
            column: '-',
            matchedRule: yearsRes.matchedRule // NEW
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
            matchedRule: levRes.matchedRule // NEW
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
            matchedRule: assetRes.matchedRule // NEW
        });

        return { total: score, items, debug };
    }

    /**
     * Override BaseScorecard.calculateC2 to use Evaluator
     */
    calculateC2(financials, isCompany = true) {
        let score = 0;
        const items = [];
        const debug = [];

        // Helper to force 0 score if not company
        const handleScore = (res, isComp) => {
            if (!isComp) {
                return { ...res, score: 0, finalScore: 0, matchedRule: "N/A (Individual)" };
            }
            return res;
        };

        // 1. D/E Ratio
        const de = financials.deRatio.value || 0;
        let deRes = this.evaluator.evaluate('c2', 'de_ratio', de);
        if (!isCompany) deRes.score = 0; // Manual Override for logic that isn't purely weight-based?
        // Actually, the Evaluator calculates score based on rules.
        // If !isCompany, the score should be 0.
        // Let's stick to the old logic pattern: Calculate raw, then zero out if individual.
        if (!isCompany) {
             deRes.score = 0;
        }

        score += deRes.score;
        items.push(deRes);
        debug.push({
            label: 'อัตราส่วนหนี้สินต่อทุน (D/E)',
            value: de,
            weight: deRes.weight,
            score: deRes.score,
            column: financials.deRatio.column,
            matchedRule: deRes.matchedRule // NEW
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
            matchedRule: invRes.matchedRule // NEW
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
            matchedRule: dscrRes.matchedRule // NEW
        });

        return { total: score, items, debug };
    }

    /**
     * Override C3 to use Evaluator
     */
    calculateC3(accumData, financials, registeredCapital, requestAmount, requestTerm, customerDuration) {
        let score = 0;
        const items = [];
        const debug = [];

        if (!accumData) {
            return { total: 0, items: [], debug: [] };
        }

        const secondAccum = this.parseAmount(accumData.SecondAccum);
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
        const avg1_5Months = secondAccum / 2;
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

        // 3. Turnover Speed (Purchase / Credit Term)
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
              // Special Case: Sum of First 2 Months (Oldest 2)
              if (accumData && accumData.last3Months && accumData.last3Months.length >= 2) {
                  numerator = accumData.last3Months[0].amount + accumData.last3Months[1].amount;
              } else {
                  numerator = (accumData.SecondAccum / 3) * 2;
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
            label: 'ความเร็วในการหมุนเวียน',
            value: turnoverSpeed.toFixed(2),
            weight: turnoverRes.weight,
            score: turnoverRes.score,
            column: '-',
            matchedRule: turnoverRes.matchedRule
        });

        // 4. Purchase Trend (Slope)
        const slope = accumData.Slope || 0;
        const trendRes = this.evaluator.evaluate('c3', 'purchase_trend', slope);

        // Handle explicit 0 purchases
        const totalPurchase3Months = accumData.SecondAccum || 0;
        if (totalPurchase3Months === 0) {
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

        return { total: score, items, debug };
    }
}

module.exports = NewCustomerScorecard;
