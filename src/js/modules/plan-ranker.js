/**
 * Light - Plan Ranker Module
 *
 * Ranks electricity plans by annual cost and quality score,
 * with comprehensive penalty system for risky plan features.
 *
 * IMPORTANT: Now includes non-fixed-rate plans (Variable, Indexed)
 * with significant penalties and clear warnings.
 */

const PlanRanker = {
  /**
   * Rank plans by annual cost and identify gimmicks
   *
   * Enhanced ranking system with quality scoring and penalties for bad plan features.
   * Now includes non-fixed-rate plans with clear warnings.
   *
   * @param {Object[]} plans - Array of plan objects
   * @param {number[]} userUsage - 12-month usage pattern
   * @param {Object} tduRates - TDU rate object
   * @param {Object} options - Ranking options
   * @param {Object} CostCalculator - Cost calculator module reference
   * @returns {Object[]} Ranked plans with warnings and quality scores
   */
  rankPlans(plans, userUsage, tduRates, options = {}, CostCalculator = null) {
    const {
      localTaxRate = 0,
      termLengthPreference = null,
      contractStartDate = null,
      includeNonFixed = true
    } = options;

    // Use passed CostCalculator or try to access global
    const calculator = CostCalculator ||
      (typeof window !== 'undefined' && window.CostCalculator) || {
        calculateAnnualCost: calculateAnnualCost // Fallback to global function
      };

    // Calculate metrics for all plans first
    const rankedPlans = plans.map((plan) => {
      const annualResult = calculator.calculateAnnualCost(userUsage, plan, tduRates, localTaxRate);
      const volatility = this.calculateVolatility(plan, userUsage);
      const warnings = this.identifyWarnings(plan, userUsage, contractStartDate);

      // Add non-fixed rate warning
      if (plan.rate_type !== 'FIXED') {
        warnings.unshift(this.getNonFixedWarning(plan.rate_type));
      }

      return {
        ...plan,
        annualCost: annualResult.annualCost,
        averageMonthlyCost: annualResult.averageMonthlyCost,
        effectiveRate: annualResult.effectiveAnnualRate,
        monthlyCosts: annualResult.monthlyCosts,
        totalUsage: annualResult.totalUsage,
        volatility: volatility,
        warnings: warnings,
        isGimmick: warnings.length > 0 || volatility > 0.3,
        isNonFixed: plan.rate_type !== 'FIXED'
      };
    });

    // Optionally filter to fixed-rate only (default: include all with penalties)
    let filteredPlans = rankedPlans;
    if (!includeNonFixed) {
      filteredPlans = rankedPlans.filter((p) => p.rate_type === 'FIXED');
    }

    if (filteredPlans.length === 0) {
      return [];
    }

    // Find best annual cost for quality scoring (from fixed-rate plans only for fair comparison)
    const fixedRatePlans = filteredPlans.filter((p) => p.rate_type === 'FIXED');
    const bestAnnualCost =
      fixedRatePlans.length > 0
        ? Math.min(...fixedRatePlans.map((p) => p.annualCost))
        : Math.min(...filteredPlans.map((p) => p.annualCost));

    // Calculate quality scores with penalties for bad features
    filteredPlans.forEach((plan) => {
      plan.qualityScore = this.calculateQualityScore(plan, bestAnnualCost, options);
    });

    // Sort by annual cost (primary), then quality score (tie-breaker)
    filteredPlans.sort((a, b) => {
      // Primary: Annual cost
      const costDiff = a.annualCost - b.annualCost;
      if (Math.abs(costDiff) > 1.0) {
        return costDiff;
      }

      // Tie-breaker 1: Quality score (higher is better)
      const qualityDiff = b.qualityScore - a.qualityScore;
      if (Math.abs(qualityDiff) > 2.0) {
        return qualityDiff;
      }

      // Tie-breaker 2: Volatility (lower is better)
      const volatilityDiff = a.volatility - b.volatility;
      if (Math.abs(volatilityDiff) > 0.05) {
        return volatilityDiff;
      }

      // Tie-breaker 3: Shorter term preferred for flexibility
      return a.term_months - b.term_months;
    });

    return filteredPlans;
  },

  /**
   * Get warning message for non-fixed rate plans
   *
   * @param {string} rateType - Rate type (VARIABLE, INDEXED, etc.)
   * @returns {string} Warning message
   */
  getNonFixedWarning(rateType) {
    const messages = {
      VARIABLE:
        'VARIABLE RATE: Your price per kWh can change monthly based on market conditions. ' +
        'You may pay significantly more during peak demand periods. Fixed-rate plans offer budget certainty.',
      INDEXED:
        'INDEXED RATE: Your price is tied to wholesale market prices and will fluctuate. ' +
        'During extreme weather (summer/winter), rates can spike 200-500%. Fixed-rate plans are safer.',
      default:
        'NON-FIXED RATE: Your price can change based on market conditions. ' +
        'Fixed-rate plans provide more budget certainty and protection from price spikes.'
    };
    return messages[rateType] || messages['default'];
  },

  /**
   * Calculate quality score for a plan (0-100 scale)
   *
   * Higher scores indicate better overall value considering cost, reliability, and features.
   * Non-fixed rate plans receive significant penalties.
   *
   * @param {Object} plan - Plan object with calculated metrics
   * @param {number} bestAnnualCost - Lowest annual cost among all plans
   * @param {Object} options - Scoring options
   * @returns {number} Quality score (0-100)
   */
  calculateQualityScore(plan, bestAnnualCost, options = {}) {
    let score = 100;

    // MAJOR PENALTY: Non-fixed rate plans (25 points)
    // This results in D/F grades for most non-fixed plans
    if (plan.rate_type !== 'FIXED') {
      score -= 25;
    }

    // Penalty 1: Cost penalty (0-40 points)
    // Plans more expensive than the best lose up to 40 points
    if (plan.annualCost > bestAnnualCost) {
      const costDiffPercent = (plan.annualCost - bestAnnualCost) / bestAnnualCost;
      const costPenalty = Math.min(40, costDiffPercent * 100);
      score -= costPenalty;
    }

    // Penalty 2: Volatility penalty (0-25 points)
    // High volatility plans lose up to 25 points
    const volatilityPenalty = plan.volatility * 25;
    score -= volatilityPenalty;

    // Penalty 3: Warning penalty (5 points per warning, max 25)
    // Don't double-count the non-fixed warning
    const nonFixedWarnings = plan.isNonFixed ? plan.warnings.length - 1 : plan.warnings.length;
    const warningPenalty = Math.min(25, nonFixedWarnings * 5);
    score -= warningPenalty;

    // Penalty 4: High base charge penalty (0-5 points)
    // Base charges over $15/month are penalized
    if (plan.base_charge_monthly > 15) {
      const baseChargePenalty = Math.min(5, (plan.base_charge_monthly - 15) / 3);
      score -= baseChargePenalty;
    }

    // Penalty 5: Prepaid penalty (10 points)
    // Prepaid plans are less convenient for most users
    if (plan.is_prepaid) {
      score -= 10;
    }

    // Bonus: Low rate variance bonus (0-5 points)
    // Plans with consistent rates across usage levels get bonus
    const rate500 = plan.price_kwh_500;
    const rate1000 = plan.price_kwh_1000;
    const rate2000 = plan.price_kwh_2000;
    const maxVariance = Math.max(
      Math.abs(rate500 - rate1000) / rate1000,
      Math.abs(rate2000 - rate1000) / rate1000
    );
    if (maxVariance < 0.1) {
      // Less than 10% variance
      score += 5;
    } else if (maxVariance < 0.2) {
      // Less than 20% variance
      score += 2;
    }

    // Ensure score stays in 0-100 range
    return Math.max(0, Math.min(100, Math.round(score)));
  },

  /**
   * Calculate volatility score for a plan
   *
   * Higher volatility = more risk of unexpected costs
   *
   * @param {Object} plan - Plan object
   * @param {number[]} userUsage - 12-month usage pattern
   * @returns {number} Volatility score (0-1)
   */
  calculateVolatility(plan, userUsage) {
    let volatilityScore = 0;

    // Non-fixed rate plans have inherent volatility
    if (plan.rate_type !== 'FIXED') {
      volatilityScore += 0.6;
    }

    // Bill credits increase volatility
    if (plan.special_terms && plan.special_terms.includes('credit')) {
      volatilityScore += 0.5;

      // Count how many months user would miss the credit
      let missedMonths = 0;
      for (const usage of userUsage) {
        const credits = this.calculateBillCredits(usage, plan);
        if (credits === 0) {
          missedMonths++;
        }
      }
      volatilityScore += (missedMonths / 12) * 0.3;
    }

    // Time-of-use plans have volatility
    if (plan.is_tou) {
      volatilityScore += 0.3;
    }

    // High variance between usage levels indicates complexity
    const rate500 = plan.price_kwh_500;
    const rate1000 = plan.price_kwh_1000;
    const rate2000 = plan.price_kwh_2000;
    const variance = Math.max(
      Math.abs(rate500 - rate1000) / rate1000,
      Math.abs(rate2000 - rate1000) / rate1000
    );

    if (variance > 0.3) {
      volatilityScore += variance * 0.5;
    }

    return Math.min(volatilityScore, 1.0);
  },

  /**
   * Calculate bill credits based on usage (simplified version)
   *
   * @param {number} usageKwh - Monthly usage
   * @param {Object} plan - Plan object
   * @returns {number} Total credits in dollars
   */
  calculateBillCredits(usageKwh, plan) {
    if (!plan.special_terms) {
      return 0;
    }

    const terms = plan.special_terms.toLowerCase();
    const creditMatch = terms.match(/\$(\d+)\s+bill\s+credit/i);
    const rangeMatch =
      terms.match(/between\s+(\d+)-(\d+)\s+kwh/i) || terms.match(/exactly\s+(\d+)\s+kwh/i);

    if (creditMatch && rangeMatch) {
      const creditAmount = parseFloat(creditMatch[1]);
      const minKwh = parseFloat(rangeMatch[1]);
      const maxKwh = rangeMatch[2] ? parseFloat(rangeMatch[2]) : minKwh;

      if (usageKwh >= minKwh && usageKwh <= maxKwh) {
        return creditAmount;
      }
    }

    return 0;
  },

  /**
   * Identify warnings for a plan
   *
   * @param {Object} plan - Plan object
   * @param {number[]} userUsage - 12-month usage pattern
   * @param {Date} contractStartDate - Optional contract start date for expiration analysis
   * @returns {string[]} Array of warning messages
   */
  identifyWarnings(plan, userUsage, contractStartDate = null) {
    const warnings = [];

    // Bill credit warnings
    if (plan.special_terms && plan.special_terms.includes('credit')) {
      let missedMonths = 0;
      let missedValue = 0;

      for (const usage of userUsage) {
        const credits = this.calculateBillCredits(usage, plan);
        if (credits === 0) {
          missedMonths++;
          // Estimate missed credit value
          const match = plan.special_terms.match(/\$(\d+)/);
          if (match) {
            missedValue += parseFloat(match[1]);
          }
        }
      }

      if (missedMonths > 0) {
        warnings.push(
          `You would miss the bill credit ${missedMonths} months per year, ` +
            `potentially costing you an extra $${Math.round(missedValue)}`
        );
      }
    }

    // Time-of-use warnings
    if (plan.is_tou) {
      warnings.push(
        'Time-of-use plan requires shifting usage to off-peak hours. ' +
          'Most households save more with simple fixed-rate plans.'
      );
    }

    // Early Termination Fee warnings (properly calculated for per-month fees)
    if (plan.early_termination_fee > 0 || plan.special_terms) {
      // Calculate ETF at contract midpoint for warning purposes
      const midpointMonths = Math.floor((plan.term_months || 12) / 2);
      const etfResult = this.calculateEarlyTerminationFee(plan, midpointMonths);

      if (etfResult.total > 200) {
        if (etfResult.structure === 'per-month' || etfResult.structure === 'per-month-inferred') {
          warnings.push(
            `High cancellation fee: $${etfResult.perMonthRate}/month remaining ` +
              `($${etfResult.total.toFixed(0)} at contract midpoint)`
          );
        } else {
          warnings.push(`High early termination fee: $${etfResult.total.toFixed(0)}`);
        }
      }
    }

    // Rate volatility warning
    const rate500 = plan.price_kwh_500;
    const rate1000 = plan.price_kwh_1000;
    const rate2000 = plan.price_kwh_2000;

    if (Math.abs(rate500 - rate1000) / rate1000 > 0.5) {
      warnings.push(
        'Rate varies dramatically with usage. ' +
          `${rate500.toFixed(1)}¢/kWh at low usage vs ${rate1000.toFixed(1)}¢/kWh at 1000 kWh.`
      );
    }

    // Contract expiration timing warning
    if (contractStartDate && plan.term_months) {
      const expirationAnalysis = this.calculateContractExpiration(
        contractStartDate,
        plan.term_months
      );

      if (expirationAnalysis.riskLevel === 'high') {
        warnings.push(
          `Contract expires in ${expirationAnalysis.expirationMonthName} - peak renewal season. ` +
            `Consider ${expirationAnalysis.alternativeTerms[0]?.termMonths || 'different'}-month term for better timing.`
        );
      }
    }

    return warnings;
  },

  /**
   * Calculate early termination fee (simplified version)
   *
   * @param {Object} plan - Plan object
   * @param {number} monthsRemaining - Months remaining in contract
   * @returns {Object} ETF calculation result
   */
  calculateEarlyTerminationFee(plan, monthsRemaining) {
    if (!plan.early_termination_fee) {
      return { total: 0, structure: 'none', perMonthRate: 0, monthsRemaining };
    }

    const etfValue = plan.early_termination_fee;

    // Heuristic: If ETF is small ($50 or less) and contract is long (12+ months),
    // it's likely a per-month fee
    if (etfValue <= 50 && plan.term_months >= 12) {
      return {
        total: etfValue * monthsRemaining,
        structure: 'per-month-inferred',
        perMonthRate: etfValue,
        monthsRemaining
      };
    }

    return {
      total: etfValue,
      structure: 'flat',
      perMonthRate: 0,
      monthsRemaining
    };
  },

  /**
   * Calculate contract expiration (simplified version)
   *
   * @param {Date|string} startDate - Contract start date
   * @param {number} termMonths - Contract length in months
   * @returns {Object} Expiration analysis
   */
  calculateContractExpiration(startDate, termMonths) {
    let start = startDate instanceof Date ? startDate : new Date(startDate);
    if (isNaN(start.getTime())) {
      start = new Date();
    }

    const term = termMonths && termMonths > 0 ? termMonths : 12;
    const expiration = new Date(start);
    expiration.setMonth(expiration.getMonth() + term);

    const expirationMonth = expiration.getMonth();
    const seasonality = {
      0: 0.7,
      1: 0.5,
      2: 0.2,
      3: 0.0,
      4: 0.1,
      5: 0.6,
      6: 1.0,
      7: 1.0,
      8: 0.7,
      9: 0.0,
      10: 0.2,
      11: 0.6
    };
    const score = seasonality[expirationMonth];

    const months = [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December'
    ];

    return {
      expirationMonthName: months[expirationMonth],
      riskLevel: score >= 0.8 ? 'high' : score >= 0.5 ? 'medium' : 'low',
      alternativeTerms: []
    };
  },

  /**
   * Convert quality score to letter grade
   *
   * @param {number} score - Quality score (0-100)
   * @returns {Object} Grade object with letter and description
   */
  getQualityGrade(score) {
    if (score >= 90) {
      return {
        letter: 'A',
        description: 'Excellent',
        class: 'grade-a'
      };
    } else if (score >= 80) {
      return {
        letter: 'B',
        description: 'Good',
        class: 'grade-b'
      };
    } else if (score >= 70) {
      return {
        letter: 'C',
        description: 'Acceptable',
        class: 'grade-c'
      };
    } else if (score >= 60) {
      return {
        letter: 'D',
        description: 'Caution',
        class: 'grade-d'
      };
    } else {
      return {
        letter: 'F',
        description: 'Avoid',
        class: 'grade-f'
      };
    }
  }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = PlanRanker;
}

// Also export individual functions for backwards compatibility
const rankPlans = PlanRanker.rankPlans.bind(PlanRanker);
const getQualityGrade = PlanRanker.getQualityGrade.bind(PlanRanker);
