/**
 * Plan Ranker Module
 *
 * Ranks electricity plans by annual cost and quality score,
 * with comprehensive penalty system for risky plan features.
 *
 * IMPORTANT: Now includes non-fixed-rate plans (Variable, Indexed)
 * with significant penalties and clear warnings.
 *
 * Quality Scoring System:
 * - Base score: 100 points
 * - Automatic F (0): Non-fixed rates, prepaid, time-of-use
 * - Cost penalty: Up to -40 points (expensive vs best)
 * - Volatility penalty: Up to -25 points (unpredictable costs)
 * - Warning penalty: -5 per warning, max -25 points
 * - Base charge penalty: Up to -5 points (high monthly fees)
 * - Rate consistency bonus: Up to +5 points (stable pricing)
 */

const PlanRanker = {
  /**
   * Scoring weight configuration
   */
  SCORING_WEIGHTS: {
    costEfficiency: 0.30, // Heavily reduced to ensure visual grade consistency
    quality: 0.70 // Dominant factor: Grade A plans should almost always beat Grade B
  },

  /**
   * Quality score breakdown categories
   */
  QUALITY_FACTORS: {
    costPenalty: { max: 40, label: 'Cost Efficiency' },
    volatilityPenalty: { max: 25, label: 'Price Stability' },
    warningPenalty: { max: 25, perItem: 5, label: 'Risk Factors' },
    baseChargePenalty: { max: 5, threshold: 15, label: 'Fee Structure' },
    expirationPenalty: { max: 25, label: 'Expiration Seasonality' }
  },

  /**
   * Rank plans by combined weighted score (85% cost + 15% quality)
   *
   * Ranking system with unified weighted scoring.
   * 85% of score based on cost efficiency, 15% based on quality factors.
   * No tie-breakers - single combined score determines ranking.
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
      _termLengthPreference = null,
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

    // Find best and worst annual cost for normalization
    const allCosts = filteredPlans.map((p) => p.annualCost);
    const bestAnnualCost = Math.min(...allCosts);
    const worstAnnualCost = Math.max(...allCosts);
    const costRange = worstAnnualCost - bestAnnualCost || 1; // Avoid division by zero

    // Calculate quality scores with penalties for bad features
    filteredPlans.forEach((plan) => {
      plan.qualityScore = this.calculateQualityScore(plan, bestAnnualCost, options);
    });

    // Calculate combined weighted score: 85% cost + 15% quality
    // Both metrics normalized to 0-100 scale where higher is better
    filteredPlans.forEach((plan) => {
      // Cost score: 100 for best cost, 0 for worst cost (inverted so lower cost = higher score)
      const costScore = 100 - ((plan.annualCost - bestAnnualCost) / costRange) * 100;

      // Quality score already on 0-100 scale
      const qualityScore = plan.qualityScore;

      // NEW SCORING SYSTEM: Multiplicative Value Scoring
      // Instead of adding Cost + Quality, we use Quality as a multiplier for the Cost Score.
      // This ensures that a "cheap" plan with "poor" quality (e.g., risky renewal) is heavily discounted.
      // Example: 
      // - Perfect Plan: Cost 100 * Quality 1.0 = 100
      // - Risky Plan: Cost 100 * Quality 0.7 = 70
      // - Expensive Safe Plan: Cost 80 * Quality 1.0 = 80
      // Result: Expensive Safe Plan (80) beats Cheap Risky Plan (70).
      
      const qualityFactor = Math.max(1, qualityScore) / 100;
      let combinedScore = costScore * qualityFactor;

      // Apply penalties based on quality tiers to improve ranking stability
      if (qualityScore < 60) {
        // F-Grade (Avoid): Severe penalty, strictly at bottom
        // Still allow sorting within F-grade by cost
        combinedScore = (qualityScore - 1000) + (costScore * 0.1);
      } else if (qualityScore < 70) {
        // D-Grade (Caution): Apply a flat penalty to the final score to separate from C-tier
        combinedScore -= 10;
      }

      plan.combinedScore = combinedScore;
    });

    // Sort by combined score (higher is better) - no tie-breakers
    filteredPlans.sort((a, b) => b.combinedScore - a.combinedScore);

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
    return messages[rateType] || messages.default;
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
  calculateQualityScore(plan, bestAnnualCost, _options = {}) {
    // Initialize score breakdown for transparency
    const breakdown = {
      baseScore: 100,
      costPenalty: 0,
      volatilityPenalty: 0,
      warningPenalty: 0,
      baseChargePenalty: 0,
      expirationPenalty: 0,
      automaticF: false,
      automaticFReason: null
    };

    // Automatic F (0) for problematic plan types
    // These plan types are considered unsuitable for most consumers
    if (plan.rate_type !== 'FIXED') {
      breakdown.automaticF = true;
      breakdown.automaticFReason = `${plan.rate_type} rate - price can change unpredictably`;
      plan.scoreBreakdown = breakdown;
      return 0;
    }
    if (plan.is_prepaid) {
      breakdown.automaticF = true;
      breakdown.automaticFReason = 'Prepaid plan - requires upfront payment and credit monitoring';
      plan.scoreBreakdown = breakdown;
      return 0;
    }
    if (plan.is_tou) {
      breakdown.automaticF = true;
      breakdown.automaticFReason = 'Time-of-use plan - rates vary by time of day';
      plan.scoreBreakdown = breakdown;
      return 0;
    }

    let score = 100;

    // Penalty 1: Cost penalty (0-40 points)
    // Plans more expensive than the best lose up to 40 points
    if (plan.annualCost > bestAnnualCost && bestAnnualCost > 0) {
      const costDiffPercent = (plan.annualCost - bestAnnualCost) / bestAnnualCost;
      breakdown.costPenalty = Math.min(40, Math.round(costDiffPercent * 100));
      score -= breakdown.costPenalty;
    }

    // Penalty 2: Volatility penalty (0-25 points)
    // High volatility plans lose up to 25 points
    breakdown.volatilityPenalty = Math.round(plan.volatility * 25);
    score -= breakdown.volatilityPenalty;

    // Penalty 3: Warning penalty (5 points per warning, max 25)
    // Don't double-count the non-fixed warning
    const warningCount = plan.isNonFixed ? plan.warnings.length - 1 : plan.warnings.length;
    breakdown.warningPenalty = Math.min(25, warningCount * 5);
    score -= breakdown.warningPenalty;

    // Penalty 4: High base charge penalty (0-5 points)
    // Base charges over $15/month are penalized
    if (plan.base_charge_monthly > 15) {
      breakdown.baseChargePenalty = Math.min(5, Math.round((plan.base_charge_monthly - 15) / 3));
      score -= breakdown.baseChargePenalty;
    }

    // Penalty 5: Expiration Seasonality Penalty (0-30 points)
    // Critical: Penalize plans that expire during peak demand months (Summer/Winter)
    // This ensures the algorithm accounts for "optimal renewal months vs mad renewal months"
    if (_options.contractStartDate && plan.term_months) {
      const expiration = this.calculateContractExpiration(_options.contractStartDate, plan.term_months);
      
      if (expiration.riskLevel === 'high') { // Summer/Winter peak (e.g., July/Aug/Jan)
        breakdown.expirationPenalty = 30; // Increased penalty for high risk
        score -= 30;
      } else if (expiration.riskLevel === 'medium') { // Shoulder peaks (e.g., June/Dec)
        breakdown.expirationPenalty = 15;
        score -= 15;
      }
    }

    // Store breakdown on plan for UI display
    plan.scoreBreakdown = breakdown;

    // Ensure score stays in 0-100 range
    return Math.max(0, Math.min(100, Math.round(score)));
  },

  /**
   * Generate human-readable score explanation
   *
   * @param {Object} plan - Plan with scoreBreakdown
   * @returns {string} Formatted explanation of the score
   */
  getScoreExplanation(plan) {
    if (!plan.scoreBreakdown) {
      return 'Score details unavailable';
    }

    const b = plan.scoreBreakdown;

    if (b.automaticF) {
      return `Automatic F grade: ${b.automaticFReason}`;
    }

    const parts = [`Base: ${b.baseScore}`];

    if (b.costPenalty > 0) {
      parts.push(`Cost: -${b.costPenalty}`);
    }
    if (b.volatilityPenalty > 0) {
      parts.push(`Volatility: -${b.volatilityPenalty}`);
    }
    if (b.warningPenalty > 0) {
      parts.push(`Warnings: -${b.warningPenalty}`);
    }
    if (b.baseChargePenalty > 0) {
      parts.push(`Base fee: -${b.baseChargePenalty}`);
    }
    if (b.expirationPenalty > 0) {
      parts.push(`Expiration risk: -${b.expirationPenalty}`);
    }

    return parts.join(' | ');
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
    if (plan.special_terms?.includes('credit')) {
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
      const creditAmount = Number.parseFloat(creditMatch[1]);
      const minKwh = Number.parseFloat(rangeMatch[1]);
      const maxKwh = rangeMatch[2] ? Number.parseFloat(rangeMatch[2]) : minKwh;

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
    if (plan.special_terms?.includes('credit')) {
      let missedMonths = 0;
      let missedValue = 0;

      for (const usage of userUsage) {
        const credits = this.calculateBillCredits(usage, plan);
        if (credits === 0) {
          missedMonths++;
          // Estimate missed credit value
          const match = plan.special_terms.match(/\$(\d+)/);
          if (match) {
            missedValue += Number.parseFloat(match[1]);
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
    const _rate2000 = plan.price_kwh_2000;

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
    if (Number.isNaN(start.getTime())) {
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
   * Convert quality score to letter grade with detailed descriptions
   *
   * @param {number} score - Quality score (0-100)
   * @returns {Object} Grade object with letter, description, class, and tooltip
   */
  getQualityGrade(score) {
    if (score >= 90) {
      return {
        letter: 'A',
        description: 'Excellent',
        shortDesc: 'Highly recommended',
        tooltip: 'Top-tier plan with competitive pricing, stable rates, and minimal risk factors.',
        class: 'grade-a'
      };
    } else if (score >= 80) {
      return {
        letter: 'B',
        description: 'Good',
        shortDesc: 'Solid choice',
        tooltip: 'Good overall value with reasonable pricing and acceptable risk level.',
        class: 'grade-b'
      };
    } else if (score >= 70) {
      return {
        letter: 'C',
        description: 'Acceptable',
        shortDesc: 'Consider carefully',
        tooltip: 'Moderate value with some concerns. Review details before enrolling.',
        class: 'grade-c'
      };
    } else if (score >= 60) {
      return {
        letter: 'D',
        description: 'Caution',
        shortDesc: 'Significant concerns',
        tooltip: 'Below-average value with notable drawbacks. Compare with better options.',
        class: 'grade-d'
      };
    } else {
      return {
        letter: 'F',
        description: 'Avoid',
        shortDesc: 'Not recommended',
        tooltip:
          'High risk or poor value. Variable rates, prepaid, or time-of-use plans fall here.',
        class: 'grade-f'
      };
    }
  },

  /**
   * Get comparison summary between two plans
   *
   * @param {Object} planA - First plan to compare
   * @param {Object} planB - Second plan to compare
   * @returns {Object} Comparison summary with savings and differences
   */
  comparePlans(planA, planB) {
    const annualSavings = planB.annualCost - planA.annualCost;
    const monthlySavings = annualSavings / 12;
    const percentSavings = (annualSavings / planB.annualCost) * 100;

    return {
      annualSavings: annualSavings,
      monthlySavings: monthlySavings,
      percentSavings: percentSavings,
      betterQuality: planA.qualityScore > planB.qualityScore,
      qualityDiff: planA.qualityScore - planB.qualityScore,
      summary:
        annualSavings > 0
          ? `Saves $${Math.abs(annualSavings).toFixed(0)}/year vs this plan`
          : annualSavings < 0
            ? `Costs $${Math.abs(annualSavings).toFixed(0)}/year more`
            : 'Same annual cost'
    };
  },

  /**
   * Get ranking position description
   *
   * @param {number} rank - Plan rank (1-based)
   * @param {number} totalPlans - Total number of plans
   * @returns {Object} Ranking description
   */
  getRankDescription(rank, totalPlans) {
    const percentile = ((totalPlans - rank + 1) / totalPlans) * 100;

    if (rank === 1) {
      return {
        label: 'Best Value',
        description: 'Lowest cost plan for your usage',
        percentile: 100
      };
    } else if (rank <= 3) {
      return {
        label: 'Top 3',
        description: 'Among the best options available',
        percentile: Math.round(percentile)
      };
    } else if (rank <= 5) {
      return {
        label: 'Top 5',
        description: 'Competitive pricing',
        percentile: Math.round(percentile)
      };
    } else if (percentile >= 75) {
      return {
        label: `Top ${100 - Math.round(percentile)}%`,
        description: 'Above average value',
        percentile: Math.round(percentile)
      };
    } else {
      return {
        label: `Rank ${rank}`,
        description: 'Other options may offer better value',
        percentile: Math.round(percentile)
      };
    }
  }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = PlanRanker;
}

// Browser environment support
if (typeof window !== 'undefined') {
  window.PlanRanker = PlanRanker;
}

// Also export individual functions for backwards compatibility
const _rankPlans = PlanRanker.rankPlans.bind(PlanRanker);
const _getQualityGrade = PlanRanker.getQualityGrade.bind(PlanRanker);
const _getScoreExplanation = PlanRanker.getScoreExplanation.bind(PlanRanker);
const _comparePlans = PlanRanker.comparePlans.bind(PlanRanker);
const _getRankDescription = PlanRanker.getRankDescription.bind(PlanRanker);