const BaseScorecard = require('./BaseScorecard');
const evaluator = require('../ScorecardEvaluator');

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
     * Refactored to use ScorecardEvaluator.
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
        const revResult = evaluator.evaluate('C3', 'revenueCapitalRatio', revCapRatio);
        score += revResult.score;

        items.push({
          key: 'revenueCapital',
          label: revResult.label,
          value: revCapRatio,
          displayValue: revCapRatio.toFixed(4),
          weight: revResult.weight,
          score: revResult.score,
          matchedRule: revResult.matchedRule
        });
        debug.push({
            label: 'รายได้ต่อทุน',
            value: revCapRatio.toFixed(2),
            weight: revResult.weight,
            score: revResult.score,
            column: '-',
            matchedRule: revResult.matchedRule
        });

        // 2. Avg Purchase (3mo) / Requested Credit
        const avg1_5Months = secondAccum / 2;
        const capCheckRatio = Number((avg1_5Months / reqAmt).toFixed(2));

        const capResult = evaluator.evaluate('C3', 'capacityCheck', capCheckRatio);
        score += capResult.score;

        items.push({
          key: 'capacityCheck',
          label: capResult.label,
          value: capCheckRatio,
          displayValue: capCheckRatio.toFixed(2),
          weight: capResult.weight,
          score: capResult.score,
          matchedRule: capResult.matchedRule
        });
        debug.push({
            label: 'ตรวจสอบความสามารถ (Capacity)',
            value: capCheckRatio.toFixed(2),
            weight: capResult.weight,
            score: capResult.score,
            column: '-',
            matchedRule: capResult.matchedRule
        });

        // 3. Purchase / Credit Term
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
        let turnoverResult = evaluator.evaluate('C3', 'turnoverSpeed', turnoverSpeed);

        if (!isTermValid) {
            turnoverResult.score = 0;
            turnoverResult.matchedRule = "Invalid Term";
        }

        score += turnoverResult.score;
        items.push({
          key: 'turnover',
          label: turnoverResult.label,
          value: turnoverSpeed,
          displayValue: turnoverSpeed.toFixed(4),
          weight: turnoverResult.weight,
          score: turnoverResult.score,
          matchedRule: turnoverResult.matchedRule,
          error: !isTermValid ? "Invalid Term" : null
        });
        debug.push({
            label: 'ความเร็วในการหมุนเวียน',
            value: turnoverSpeed.toFixed(2),
            weight: turnoverResult.weight,
            score: turnoverResult.score,
            column: '-',
            matchedRule: turnoverResult.matchedRule
        });

        // 4. Purchase Trend (Slope)
        const slope = accumData.Slope || 0;
        const totalPurchase3Months = accumData.SecondAccum || 0;
        let trendResult;

        if (totalPurchase3Months === 0) {
            trendResult = { score: 0, weight: 28.96, matchedRule: "No Purchase Data", label: "แนวโน้มการซื้อ (Slope)" };
        } else {
            trendResult = evaluator.evaluate('C3', 'purchaseTrend', slope);
        }

        score += trendResult.score;

        items.push({
          key: 'trend',
          label: trendResult.label,
          value: slope,
          displayValue: slope.toFixed(2),
          weight: trendResult.weight,
          score: trendResult.score,
          matchedRule: trendResult.matchedRule
        });
        debug.push({
            label: 'แนวโน้มการซื้อ (Slope)',
            value: slope.toFixed(2),
            weight: trendResult.weight,
            score: trendResult.score,
            column: '-',
            matchedRule: trendResult.matchedRule
        });

        // 5. Customer Duration
        const duration = parseInt(customerDuration || 0);
        const durationResult = evaluator.evaluate('C3', 'customerDuration', duration);
        score += durationResult.score;

        items.push({
          key: 'duration',
          label: durationResult.label,
          value: duration,
          displayValue: duration.toFixed(2),
          weight: durationResult.weight,
          score: durationResult.score,
          matchedRule: durationResult.matchedRule
        });
        debug.push({
            label: 'ระยะเวลาเป็นลูกค้า',
            value: duration,
            weight: durationResult.weight,
            score: durationResult.score,
            column: '-',
            matchedRule: durationResult.matchedRule
        });

        return { total: score, items, debug };
    }
}

module.exports = NewCustomerScorecard;
