const BaseScorecard = require('./BaseScorecard');

class NewCustomerScorecard extends BaseScorecard {

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
     * C3: Purchase Behavior (Standard Logic for New Customers)
     * Factors: Revenue/Capital, Capacity Check, Turnover Speed, Slope Trend, Customer Duration
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
        // Avg 1.5 Months = Sum Last 3 Months / 2
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

        return { total: score, items, debug };
    }
}

module.exports = NewCustomerScorecard;
