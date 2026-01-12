/**
 * Texas Electricity Cost Calculator
 *
 * Core calculation engine for comparing electricity plans
 * based on actual usage patterns and true annual costs.
 */

/**
 * Calculate monthly electricity cost for a given plan and usage
 *
 * @param {number} usageKwh - Monthly usage in kilowatt-hours
 * @param {Object} plan - Plan object from plans.json
 * @param {Object} tduRates - TDU rate object for the service area
 * @param {number} localTaxRate - Local sales tax rate (e.g., 0.02 for 2%)
 * @returns {number} Total monthly cost in dollars
 */
function calculateMonthlyCost(usageKwh, plan, tduRates, localTaxRate = 0) {
  // Energy charges (from REP)
  // The price_kwh values in plans already include TDU charges per EFL requirements
  // For simplicity, we'll use the interpolated rate based on usage
  const energyRate = interpolateRate(usageKwh, plan);
  const energyCost = (usageKwh * energyRate) / 100; // Convert cents to dollars

  // TDU delivery charges (already included in EFL prices, but tracked separately for transparency)
  const tduCost = tduRates.monthly_base_charge + (usageKwh * tduRates.per_kwh_rate) / 100;

  // Base monthly charge from REP
  const baseCost = plan.base_charge_monthly || 0;

  // Calculate subtotal before credits
  const subtotal = energyCost + baseCost;

  // Apply bill credits if applicable
  const credits = calculateBillCredits(usageKwh, plan);

  // Apply local sales tax
  const taxAmount = (subtotal - credits) * localTaxRate;

  // Total cost
  const total = Math.max(0, subtotal - credits + taxAmount);

  return {
    total: total,
    breakdown: {
      energyCost: energyCost,
      baseCost: baseCost,
      tduCost: tduCost,
      credits: credits,
      tax: taxAmount,
      effectiveRate: (total / usageKwh) * 100 // cents per kWh
    }
  };
}

/**
 * Interpolate energy rate based on usage
 *
 * Plans provide rates at 500, 1000, and 2000 kWh.
 * We interpolate for other usage levels.
 *
 * @param {number} usageKwh - Monthly usage
 * @param {Object} plan - Plan object
 * @returns {number} Rate in cents per kWh
 */
function interpolateRate(usageKwh, plan) {
  const { price_kwh_500, price_kwh_1000, price_kwh_2000 } = plan;

  if (usageKwh <= 500) {
    return price_kwh_500;
  }
  if (usageKwh <= 1000) {
    // Linear interpolation between 500 and 1000
    const ratio = (usageKwh - 500) / 500;
    return price_kwh_500 + (price_kwh_1000 - price_kwh_500) * ratio;
  }
  if (usageKwh <= 2000) {
    // Linear interpolation between 1000 and 2000
    const ratio = (usageKwh - 1000) / 1000;
    return price_kwh_1000 + (price_kwh_2000 - price_kwh_1000) * ratio;
  }
  // Extrapolate beyond 2000 kWh
  return price_kwh_2000;
}

/**
 * Calculate bill credits based on usage
 *
 * @param {number} usageKwh - Monthly usage
 * @param {Object} plan - Plan object
 * @returns {number} Total credits in dollars
 */
function calculateBillCredits(usageKwh, plan) {
  // For sample data, we detect bill credits from special_terms
  // In production, this would parse the EFL or use structured credit data

  if (!plan.special_terms) {
    return 0;
  }

  const terms = plan.special_terms.toLowerCase();

  // Simple pattern matching for bill credits
  // e.g., "$120 bill credit applied when usage is between 1000-1050 kWh"
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
}

/**
 * Calculate annual electricity cost based on monthly usage pattern
 *
 * @param {number[]} monthlyUsageArray - Array of 12 monthly usage values
 * @param {Object} plan - Plan object
 * @param {Object} tduRates - TDU rate object
 * @param {number} localTaxRate - Local sales tax rate
 * @returns {Object} Annual cost breakdown
 */
function calculateAnnualCost(monthlyUsageArray, plan, tduRates, localTaxRate = 0) {
  if (monthlyUsageArray.length !== 12) {
    throw new Error('monthlyUsageArray must contain exactly 12 values');
  }

  let totalCost = 0;
  const monthlyCosts = [];
  let totalUsage = 0;

  for (let i = 0; i < 12; i++) {
    const usage = monthlyUsageArray[i];
    const result = calculateMonthlyCost(usage, plan, tduRates, localTaxRate);
    monthlyCosts.push(result.total);
    totalCost += result.total;
    totalUsage += usage;
  }

  return {
    annualCost: totalCost,
    monthlyCosts: monthlyCosts,
    averageMonthlyCost: totalCost / 12,
    totalUsage: totalUsage,
    effectiveAnnualRate: (totalCost / totalUsage) * 100 // cents per kWh
  };
}

/**
 * Estimate monthly usage pattern from average monthly usage
 *
 * Applies Texas seasonal multipliers:
 * - Summer (Jun-Sep): 1.4-1.8x
 * - Winter (Dec-Feb): 1.1-1.3x
 * - Shoulder (Mar-May, Oct-Nov): 1.0x
 *
 * @param {number} avgMonthlyKwh - Average monthly usage
 * @param {string} homeSize - Home size category (optional, for future refinement)
 * @returns {number[]} Array of 12 monthly usage estimates
 */
function estimateUsagePattern(avgMonthlyKwh, _homeSize = null) {
  // Texas seasonal multipliers (based on research data)
  const seasonalMultipliers = [
    1.2, // January (winter)
    1.1, // February (winter)
    1.0, // March (shoulder)
    0.95, // April (shoulder)
    1.0, // May (shoulder)
    1.4, // June (summer)
    1.7, // July (summer peak)
    1.8, // August (summer peak)
    1.5, // September (summer)
    1.0, // October (shoulder)
    0.95, // November (shoulder)
    1.2 // December (winter)
  ];

  // Calculate adjustment factor to ensure average equals input
  const sumMultipliers = seasonalMultipliers.reduce((a, b) => a + b, 0);
  const adjustmentFactor = 12 / sumMultipliers;

  // Generate monthly usage pattern with precise rounding
  const monthlyUsage = seasonalMultipliers.map((multiplier) =>
    Math.round(avgMonthlyKwh * multiplier * adjustmentFactor)
  );

  // Adjust to ensure sum equals exactly avgMonthlyKwh * 12
  const targetTotal = Math.round(avgMonthlyKwh * 12);
  const actualTotal = monthlyUsage.reduce((a, b) => a + b, 0);
  const difference = targetTotal - actualTotal;

  if (difference !== 0) {
    // Find the month with highest usage and adjust it
    const maxIndex = monthlyUsage.indexOf(Math.max(...monthlyUsage));
    monthlyUsage[maxIndex] += difference;
  }

  return monthlyUsage;
}

/**
 * Estimate average monthly usage from home size
 *
 * @param {string} homeSize - Home size category
 * @returns {number} Estimated average monthly kWh
 */
function estimateUsageFromHomeSize(homeSize) {
  const sizeMap = {
    studio: 500,
    '1br': 500,
    '2br': 750,
    small: 1000,
    medium: 1500,
    large: 2000,
    xlarge: 2500
  };

  const key = homeSize.toLowerCase().replace(/[^a-z0-9]/g, '');
  return sizeMap[key] || 1000; // Default to 1000 kWh
}

/**
 * Detect TDU service area from ZIP code
 *
 * @param {string} zipCode - 5-digit ZIP code
 * @param {Object[]} tduList - Array of TDU objects
 * @returns {Object|null} TDU object or null if not found
 */
function detectTDU(zipCode, tduList) {
  // ZIP code to TDU mapping (simplified - in production, use comprehensive database)
  const zipRanges = {
    ONCOR: [
      { min: 75001, max: 75999 }, // Dallas-Fort Worth
      { min: 76001, max: 76999 } // Fort Worth area
    ],
    CENTERPOINT: [
      { min: 77001, max: 77999 } // Houston
    ],
    AEP_CENTRAL: [
      { min: 78401, max: 78499 }, // Corpus Christi
      { min: 78500, max: 78599 } // Rio Grande Valley
    ],
    AEP_NORTH: [
      { min: 79601, max: 79699 }, // Abilene
      { min: 76901, max: 76999 } // San Angelo
    ],
    TNMP: [
      { min: 77550, max: 77554 } // Galveston
    ],
    LPL: [
      { min: 79401, max: 79499 } // Lubbock
    ]
  };

  const zip = Number.parseInt(zipCode, 10);

  for (const [tduCode, ranges] of Object.entries(zipRanges)) {
    for (const range of ranges) {
      if (zip >= range.min && zip <= range.max) {
        return tduList.find((tdu) => tdu.code === tduCode);
      }
    }
  }

  return null;
}

/**
 * Rank plans by annual cost and identify gimmicks
 *
 * Ranking system with quality scoring and penalties for bad plan features
 *
 * @param {Object[]} plans - Array of plan objects
 * @param {number[]} userUsage - 12-month usage pattern
 * @param {Object} tduRates - TDU rate object
 * @param {Object} options - Ranking options
 * @returns {Object[]} Ranked plans with warnings and quality scores
 */
function rankPlans(plans, userUsage, tduRates, options = {}) {
  const { localTaxRate = 0, _termLengthPreference = null, contractStartDate = null } = options;

  // Calculate metrics for all plans first
  const rankedPlans = plans.map((plan) => {
    const annualResult = calculateAnnualCost(userUsage, plan, tduRates, localTaxRate);
    const volatility = calculateVolatility(plan, userUsage);
    const warnings = identifyWarnings(plan, userUsage, contractStartDate);

    return {
      ...plan,
      annualCost: annualResult.annualCost,
      averageMonthlyCost: annualResult.averageMonthlyCost,
      effectiveRate: annualResult.effectiveAnnualRate,
      monthlyCosts: annualResult.monthlyCosts,
      totalUsage: annualResult.totalUsage,
      volatility: volatility,
      warnings: warnings,
      isGimmick: warnings.length > 0 || volatility > 0.3
    };
  });

  // Filter to fixed-rate only
  const fixedRatePlans = rankedPlans.filter((p) => p.rate_type === 'FIXED');

  if (fixedRatePlans.length === 0) {
    return [];
  }

  // Find best annual cost for quality scoring
  const bestAnnualCost = Math.min(...fixedRatePlans.map((p) => p.annualCost));

  // Calculate quality scores with penalties for bad features
  for (const plan of fixedRatePlans) {
    plan.qualityScore = calculateQualityScore(plan, bestAnnualCost, options);
  }

  // Sort by annual cost (primary), then quality score (tie-breaker)
  fixedRatePlans.sort((a, b) => {
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

  return fixedRatePlans;
}

/**
 * Calculate quality score for a plan (0-100 scale)
 *
 * Higher scores indicate better overall value considering cost, reliability, and features
 *
 * @param {Object} plan - Plan object with calculated metrics
 * @param {number} bestAnnualCost - Lowest annual cost among all plans
 * @param {Object} options - Scoring options
 * @returns {number} Quality score (0-100)
 */
function calculateQualityScore(plan, bestAnnualCost, _options = {}) {
  // Automatic F (0) for problematic plan types
  // These plan types are considered unsuitable for most consumers
  if (plan.rate_type !== 'FIXED') {
    return 0; // Non-fixed rate plans (VARIABLE, INDEXED) get automatic F
  }
  if (plan.is_prepaid) {
    return 0; // Prepaid plans get automatic F
  }
  if (plan.is_tou) {
    return 0; // Time of Use plans get automatic F
  }

  let score = 100;

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
  const warningPenalty = Math.min(25, plan.warnings.length * 5);
  score -= warningPenalty;

  // Penalty 4: High base charge penalty (0-5 points)
  // Base charges over $15/month are penalized
  if (plan.base_charge_monthly > 15) {
    const baseChargePenalty = Math.min(5, (plan.base_charge_monthly - 15) / 3);
    score -= baseChargePenalty;
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
}

/**
 * Calculate volatility score for a plan
 *
 * Higher volatility = more risk of unexpected costs
 *
 * @param {Object} plan - Plan object
 * @param {number[]} userUsage - 12-month usage pattern
 * @returns {number} Volatility score (0-1)
 */
function calculateVolatility(plan, userUsage) {
  let volatilityScore = 0;

  // Bill credits increase volatility
  if (plan.special_terms?.includes('credit')) {
    volatilityScore += 0.5;

    // Count how many months user would miss the credit
    let missedMonths = 0;
    for (const usage of userUsage) {
      const credits = calculateBillCredits(usage, plan);
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
}

/**
 * Identify warnings for a plan
 *
 * @param {Object} plan - Plan object
 * @param {number[]} userUsage - 12-month usage pattern
 * @param {Date} contractStartDate - Optional contract start date for expiration analysis
 * @returns {string[]} Array of warning messages
 */
function identifyWarnings(plan, userUsage, contractStartDate = null) {
  const warnings = [];

  // Bill credit warnings
  if (plan.special_terms?.includes('credit')) {
    let missedMonths = 0;
    let missedValue = 0;

    for (const usage of userUsage) {
      const credits = calculateBillCredits(usage, plan);
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
    const etfResult = calculateEarlyTerminationFee(plan, midpointMonths);

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
      `Rate varies dramatically with usage. ${rate500.toFixed(1)}¢/kWh at low usage vs ${rate1000.toFixed(1)}¢/kWh at 1000 kWh.`
    );
  }

  // Contract expiration timing warning
  if (contractStartDate && plan.term_months) {
    const expirationAnalysis = calculateContractExpiration(contractStartDate, plan.term_months);

    if (expirationAnalysis.riskLevel === 'high') {
      warnings.push(
        `Contract expires in ${expirationAnalysis.expirationMonthName} - peak renewal season. ` +
          `Consider ${expirationAnalysis.alternativeTerms[0]?.termMonths || 'different'}-month term for better timing.`
      );
    }
  }

  return warnings;
}

/**
 * Format currency for display
 *
 * @param {number} amount - Dollar amount
 * @returns {string} Formatted string
 */
function formatCurrency(amount) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(amount);
}

/**
 * Format rate for display
 *
 * @param {number} rate - Rate in cents per kWh
 * @returns {string} Formatted string
 */
function formatRate(rate) {
  return `${rate.toFixed(2)}¢/kWh`;
}

/**
 * Calculate contract expiration date and timing analysis
 *
 * This function helps users avoid expensive renewal periods by showing
 * when their contract will expire and whether it falls during high-rate months.
 *
 * Texas electricity rates are typically:
 * - Highest: July, August, January (peak demand months)
 * - Lowest: April, May, October, November (shoulder months)
 *
 * Version with robust date handling and better recommendations.
 *
 * @param {Date|string|null} startDate - Contract start date (defaults to today)
 * @param {number} termMonths - Contract length in months
 * @returns {Object} Expiration analysis
 */
function calculateContractExpiration(startDate, termMonths) {
  // Default to today if no start date provided
  let start;
  if (!startDate) {
    start = new Date();
  } else if (typeof startDate === 'string') {
    start = new Date(startDate);
  } else {
    start = new Date(startDate);
  }

  // Handle invalid dates
  if (Number.isNaN(start.getTime())) {
    start = new Date();
  }

  // Handle invalid or missing term
  const term = termMonths && termMonths > 0 ? termMonths : 12;

  const expiration = new Date(start);
  expiration.setMonth(expiration.getMonth() + term);

  const expirationMonth = expiration.getMonth(); // 0-11

  // Rate seasonality (0 = best time to renew, 1 = worst time to renew)
  // Based on Texas electricity market historical data and ERCOT patterns
  const renewalSeasonality = {
    0: 0.7, // January - expensive (winter peak, heating demand)
    1: 0.5, // February - moderate (post-winter)
    2: 0.2, // March - good (spring shoulder)
    3: 0.0, // April - excellent (BEST - lowest demand)
    4: 0.1, // May - excellent (still low demand)
    5: 0.6, // June - expensive (summer demand rising)
    6: 1.0, // July - WORST (summer peak, AC at maximum)
    7: 1.0, // August - WORST (summer peak, highest demand)
    8: 0.7, // September - expensive (still hot in Texas)
    9: 0.0, // October - excellent (BEST - fall shoulder)
    10: 0.2, // November - good (fall shoulder)
    11: 0.6 // December - moderate to expensive (winter begins)
  };

  const seasonalityScore = renewalSeasonality[expirationMonth];

  // Categorize renewal timing with more detailed advice
  let renewalTiming;
  let renewalAdvice;
  let riskLevel;
  let estimatedRateImpact;

  if (seasonalityScore >= 0.8) {
    renewalTiming = 'Peak Season - Expensive Renewal';
    renewalAdvice =
      'Your contract expires during peak rate season when demand is highest. ' +
      'Consider a different contract length to shift renewal to April/May or October. ' +
      'Alternatively, start shopping 60-90 days early to lock in better rates.';
    riskLevel = 'high';
    estimatedRateImpact = '15-40% higher rates than optimal months';
  } else if (seasonalityScore >= 0.5) {
    renewalTiming = 'Moderate Season';
    renewalAdvice =
      'Your contract expires during a moderate-cost period. ' +
      'Shopping 30-60 days before expiration is recommended. ' +
      'You may find slightly better rates with adjusted timing.';
    riskLevel = 'medium';
    estimatedRateImpact = '5-15% higher rates than optimal months';
  } else if (seasonalityScore >= 0.2) {
    renewalTiming = 'Good Season';
    renewalAdvice =
      'Your contract expires during a favorable period for renewal. ' +
      'This is a good time to shop for competitive rates.';
    riskLevel = 'low';
    estimatedRateImpact = 'Near-optimal rates available';
  } else {
    renewalTiming = 'Optimal Season - Best Rates';
    renewalAdvice =
      'Excellent timing! Your contract expires during the best possible ' +
      'renewal period when rates are typically lowest.';
    riskLevel = 'optimal';
    estimatedRateImpact = 'Optimal rates - best time to shop';
  }

  // Calculate alternative contract lengths for better timing
  const alternatives = [];
  const termsToCheck = [3, 6, 9, 12, 15, 18, 24, 36];

  for (const altTerm of termsToCheck) {
    if (altTerm === term) continue;

    const altExpiration = new Date(start);
    altExpiration.setMonth(altExpiration.getMonth() + altTerm);
    const altMonth = altExpiration.getMonth();
    const altScore = renewalSeasonality[altMonth];

    // Calculate improvement percentage
    const improvement =
      seasonalityScore > 0
        ? ((seasonalityScore - altScore) / seasonalityScore) * 100
        : seasonalityScore < altScore
          ? -100
          : 0;

    // Only suggest if meaningfully better (30%+ improvement or moving to optimal)
    if (improvement >= 30 || (altScore <= 0.1 && seasonalityScore > 0.3)) {
      let altRiskLevel;
      if (altScore >= 0.8) altRiskLevel = 'high';
      else if (altScore >= 0.5) altRiskLevel = 'medium';
      else if (altScore >= 0.2) altRiskLevel = 'low';
      else altRiskLevel = 'optimal';

      alternatives.push({
        termMonths: altTerm,
        expirationDate: altExpiration,
        expirationMonth: altMonth,
        expirationMonthName: getMonthName(altMonth),
        seasonalityScore: altScore,
        riskLevel: altRiskLevel,
        improvement: `${Math.round(Math.max(0, improvement))}% better timing`
      });
    }
  }

  // Sort alternatives by seasonality score (best first)
  alternatives.sort((a, b) => a.seasonalityScore - b.seasonalityScore);

  // Calculate days/months until expiration
  const now = new Date();
  const daysUntilExpiration = Math.max(0, Math.ceil((expiration - now) / (1000 * 60 * 60 * 24)));
  const monthsUntilExpiration = Math.max(0, Math.round(daysUntilExpiration / 30));

  return {
    startDate: start,
    expirationDate: expiration,
    termMonths: term,
    expirationMonth: expirationMonth,
    expirationMonthName: getMonthName(expirationMonth),
    expirationYear: expiration.getFullYear(),
    renewalTiming: renewalTiming,
    renewalAdvice: renewalAdvice,
    riskLevel: riskLevel,
    seasonalityScore: seasonalityScore,
    estimatedRateImpact: estimatedRateImpact,
    alternativeTerms: alternatives.slice(0, 3), // Top 3 alternatives
    daysUntilExpiration: daysUntilExpiration,
    monthsUntilExpiration: monthsUntilExpiration,
    formattedExpiration: expiration.toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric'
    })
  };
}

/**
 * Get contract expiration analysis for a plan (assuming start today)
 *
 * @param {Object} plan - Plan object with term_months
 * @returns {Object} Expiration analysis
 */
function getContractExpirationForPlan(plan) {
  if (!plan || !plan.term_months) {
    return calculateContractExpiration(new Date(), 12);
  }
  return calculateContractExpiration(new Date(), plan.term_months);
}

/**
 * Calculate early termination fee based on remaining contract months
 *
 * Properly calculates ETF for contracts with per-month-remaining fees.
 * Many plans charge $10-$20 per month remaining instead of a flat fee.
 *
 * @param {Object} plan - Plan object
 * @param {number} monthsRemaining - Months remaining in contract
 * @returns {Object} ETF calculation result with total and structure type
 */
function calculateEarlyTerminationFee(plan, monthsRemaining) {
  // Parse the ETF value - handle various formats
  let etfValue = 0;
  let etfStructure = 'flat';
  let perMonthRate = 0;

  // First check special_terms for per-month patterns
  if (plan.special_terms) {
    const terms = plan.special_terms.toLowerCase();

    // Pattern 1: "$X per month remaining" or "$X/month remaining"
    const perMonthMatch = terms.match(
      /\$(\d+(?:\.\d{2})?)\s*(?:per|\/)\s*(?:each\s+)?(?:month|mo)(?:nth)?\s*(?:remaining|left)/i
    );
    if (perMonthMatch) {
      perMonthRate = Number.parseFloat(perMonthMatch[1]);
      etfStructure = 'per-month';
    }

    // Pattern 2: "$X times remaining months" or "$X x months remaining"
    if (!perMonthRate) {
      const timesMatch = terms.match(
        /\$(\d+(?:\.\d{2})?)\s*(?:times|x|×)\s*(?:remaining\s+)?months/i
      );
      if (timesMatch) {
        perMonthRate = Number.parseFloat(timesMatch[1]);
        etfStructure = 'per-month';
      }
    }

    // Pattern 3: "per remaining month" without explicit dollar amount
    if (
      !perMonthRate &&
      (terms.includes('per remaining month') ||
        terms.includes('per month remaining') ||
        terms.includes('each remaining month') ||
        terms.includes('multiplied by months remaining') ||
        terms.includes('times months remaining'))
    ) {
      // ETF value is the per-month rate
      if (plan.early_termination_fee && plan.early_termination_fee <= 50) {
        perMonthRate = plan.early_termination_fee;
        etfStructure = 'per-month';
      }
    }
  }

  // If we found a per-month pattern, calculate total ETF
  if (etfStructure === 'per-month' && perMonthRate > 0) {
    etfValue = perMonthRate * monthsRemaining;
    return {
      total: etfValue,
      structure: 'per-month',
      perMonthRate: perMonthRate,
      monthsRemaining: monthsRemaining
    };
  }

  // Handle the base ETF value
  if (!plan.early_termination_fee) {
    return { total: 0, structure: 'none', perMonthRate: 0, monthsRemaining: monthsRemaining };
  }

  etfValue = plan.early_termination_fee;

  // Heuristic: If ETF is small ($50 or less) and contract is long (12+ months),
  // it's likely a per-month fee even if not explicitly stated
  if (etfValue <= 50 && plan.term_months >= 12) {
    return {
      total: etfValue * monthsRemaining,
      structure: 'per-month-inferred',
      perMonthRate: etfValue,
      monthsRemaining: monthsRemaining
    };
  }

  // Otherwise, it's a flat fee
  return {
    total: etfValue,
    structure: 'flat',
    perMonthRate: 0,
    monthsRemaining: monthsRemaining
  };
}

/**
 * Get the display value for early termination fee
 *
 * @param {Object} plan - Plan object
 * @param {number} monthsRemaining - Optional, defaults to contract midpoint
 * @returns {Object} Display information for ETF
 */
function getETFDisplayInfo(plan, monthsRemaining = null) {
  if (monthsRemaining === null) {
    monthsRemaining = Math.floor((plan.term_months || 12) / 2);
  }

  const result = calculateEarlyTerminationFee(plan, monthsRemaining);

  // Create display string
  let displayText;
  if (result.structure === 'none') {
    displayText = 'None';
  } else if (result.structure === 'flat') {
    displayText = formatCurrency(result.total);
  } else {
    // Per-month structure
    displayText = `$${result.perMonthRate}/mo remaining`;
  }

  return {
    ...result,
    displayText: displayText,
    exampleTotal: result.total,
    exampleMonths: monthsRemaining
  };
}

/**
 * Get month name from number (0-11)
 *
 * @param {number} monthIndex - Month index (0-11)
 * @returns {string} Month name
 */
function getMonthName(monthIndex) {
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
  return months[monthIndex];
}

/**
 * Convert quality score to letter grade
 *
 * @param {number} score - Quality score (0-100)
 * @returns {Object} Grade object with letter and description
 */
function getQualityGrade(score) {
  if (score >= 90) {
    return {
      letter: 'A',
      description: 'Excellent',
      class: 'grade-a'
    };
  }
  if (score >= 80) {
    return {
      letter: 'B',
      description: 'Good',
      class: 'grade-b'
    };
  }
  if (score >= 70) {
    return {
      letter: 'C',
      description: 'Acceptable',
      class: 'grade-c'
    };
  }
  if (score >= 60) {
    return {
      letter: 'D',
      description: 'Caution',
      class: 'grade-d'
    };
  }
  return {
    letter: 'F',
    description: 'Avoid',
    class: 'grade-f'
  };
}

// Export functions for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    calculateMonthlyCost,
    calculateAnnualCost,
    estimateUsagePattern,
    estimateUsageFromHomeSize,
    detectTDU,
    rankPlans,
    formatCurrency,
    formatRate,
    calculateContractExpiration,
    getContractExpirationForPlan,
    calculateEarlyTerminationFee,
    getETFDisplayInfo,
    getMonthName,
    getQualityGrade
  };
}
