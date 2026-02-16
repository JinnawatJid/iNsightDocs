const BaseScorecard = require('./BaseScorecard');

class ExistingCustomerScorecard extends BaseScorecard {

    calculateScore(context) {
        const {
            customer,
            registeredCapital,
            requestAmount, // Note: For existing customers, this might be the *New* Requested Amount or ignored if calculating limit adjustment
            financials,
            accumData,
            requestTerm,
            customerDuration,
            isCompany,
            currentCreditLimit // Crucial for Existing Customers
        } = context;

        // 1. Calculate Component Scores
        // Use standard C1 & C2 from Base
        const c1 = this.calculateC1(customer, registeredCapital, requestAmount);
        const c2 = this.calculateC2(financials, isCompany);

        // Use Specialized C3 for Existing Customers
        const c3 = this.calculateC3(accumData, financials, registeredCapital, requestAmount, requestTerm, customerDuration, currentCreditLimit);

        // 2. Aggregate Total Score
        const totalScore = c1.total + c2.total + c3.total;

        // 3. Determine Limit Adjustment (Existing Customer Logic)
        // Strategy: Recommend Limit based on Current Limit + Score-based Factor
        const currentLimit = parseFloat(currentCreditLimit || 0);

        let adjustmentFactor = 0;
        // Example Logic:
        // A+ (>= 81) -> +20%
        // A  (>= 66) -> +10%
        // B+ (>= 50) -> +0% (Maintain)
        // B  (>= 35) -> -10% (Reduce)
        // C  (>= 20) -> -20% (Reduce)
        // D  (< 20)  -> -50% (Drastic Reduction)

        const gradeScore = c3.total; // Grade is typically driven by Behavior (C3)
        let gradeLabel = "D";

        if (gradeScore >= 81) {
            gradeLabel = "A+";
            adjustmentFactor = 0.20;
        } else if (gradeScore >= 66) {
            gradeLabel = "A";
            adjustmentFactor = 0.10;
        } else if (gradeScore >= 50) {
            gradeLabel = "B+";
            adjustmentFactor = 0.00;
        } else if (gradeScore >= 35) {
            gradeLabel = "B";
            adjustmentFactor = -0.10;
        } else if (gradeScore >= 20) {
            gradeLabel = "C";
            adjustmentFactor = -0.20;
        } else {
            gradeLabel = "D";
            adjustmentFactor = -0.50;
        }

        const recommendedLimit = currentLimit * (1 + adjustmentFactor);
        const roundedLimit = Math.round(recommendedLimit / 1000) * 1000;

        // 4. Calculate Size Result (Same as New)
        const sizeScore = c1.total + c2.total;
        let sizeLabel = "L";
        if (sizeScore <= 37) sizeLabel = "S";
        else if (sizeScore <= 68) sizeLabel = "M";
        else sizeLabel = "L";

        // 5. Structure Output
        return {
            totalScore: Math.round(totalScore),
            grade: gradeLabel,
            recommendedLimit: roundedLimit,
            adjustmentFactor: adjustmentFactor, // Extra field for debugging
            currentLimit: currentLimit,         // Extra field for reference
            breakdown: { c1, c2, c3 },
            sizeResult: { score: sizeScore, label: sizeLabel },
            gradeResult: { score: gradeScore, label: gradeLabel },
            debug: [...c1.debug, ...c2.debug, ...c3.debug]
        };
    }

    /**
     * C3: Purchase Behavior (Specialized for Existing Customers)
     * Includes Late Payment Logic (Placeholder)
     */
    calculateC3(accumData, financials, registeredCapital, requestAmount, requestTerm, customerDuration, currentCreditLimit) {
        let score = 0;
        const items = [];
        const debug = [];

        if (!accumData) {
            return { total: 0, items: [], debug: [] };
        }

        // --- Standard Behavior Metrics (Reused from Base/New logic for now) ---
        // In a real scenario, you might weight these differently for Existing Customers.
        // For this refactor, we keep the core logic but add the new component.

        const secondAccum = this.parseAmount(accumData.SecondAccum);
        const revenueForRatio = financials.averageRevenue || 0;
        const regCap = parseFloat(registeredCapital || 1);

        // FIX: Fallback to Current Credit Limit if Request Amount is not provided (common for existing customers)
        let reqAmt = parseFloat(requestAmount || 0);
        if (reqAmt <= 0) {
             reqAmt = parseFloat(currentCreditLimit || 1);
        }

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
          displayValue: revCapRatio.toFixed(4),
          weight: 3.04,
          score: scoreRevCap
        });
        debug.push({ label: 'รายได้ต่อทุน', value: revCapRatio.toFixed(2), weight: 3.04, score: scoreRevCap, column: '-' });

        // 2. Avg Purchase (3mo) / Requested Credit (Max 35.04)
        const avg1_5Months = secondAccum / 2;
        const capCheckRatio = Number((avg1_5Months / reqAmt).toFixed(2));

        let rawCapCheck = 0.25;
        if (capCheckRatio <= 0.25) rawCapCheck = 0.25;
        else if (capCheckRatio <= 0.59) rawCapCheck = 0.5;
        else if (capCheckRatio <= 0.99) rawCapCheck = 1.0;
        else if (capCheckRatio <= 1.49) rawCapCheck = 1.5;
        else if (capCheckRatio >= 1.5) rawCapCheck = 2.0;
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
        let rawTurnover = 0;
        if (turnoverSpeed <= 0.5) rawTurnover = 0.5;
        else if (turnoverSpeed <= 0.9) rawTurnover = 1.0;
        else if (turnoverSpeed <= 1.5) rawTurnover = 1.5;
        else rawTurnover = 2.0;

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


        // --- NEW: 6. Late Payment Behavior (Placeholder) ---
        // TODO: Implement actual logic when API is available.
        // Currently assumes 0 penalty/bonus.
        const latePaymentScore = this.calculateLatePaymentScore(null);
        score += latePaymentScore;

        items.push({
            key: 'latePayment',
            label: 'ระยะเวลาการจ่ายล่าช้า (Late Payment)',
            value: 0,
            displayValue: 'No Data',
            weight: 0, // Placeholder weight
            score: latePaymentScore,
            isNew: true // Flag to highlight this is a new feature
        });
        debug.push({ label: 'Late Payment Score (Placeholder)', value: 'N/A', weight: 0, score: latePaymentScore, column: '-' });

        return { total: score, items, debug };
    }

    /**
     * Placeholder for Late Payment Logic
     * @param {Object} paymentData - Data from future API
     */
    calculateLatePaymentScore(paymentData) {
        // Example Future Logic:
        // if (avgLateDays > 30) return -10;
        // if (avgLateDays > 7) return -5;
        // return 0;
        return 0;
    }
}

module.exports = ExistingCustomerScorecard;
