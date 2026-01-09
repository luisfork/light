/**
 * Light - Texas Electricity Cost Calculator
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
    const tduCost = tduRates.monthly_base_charge + (usageKwh * tduRates.per_kwh_rate / 100);

    // Base monthly charge from REP
    const baseCost = plan.base_charge_monthly || 0;

    // Calculate subtotal before credits
    let subtotal = energyCost + baseCost;

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
            effectiveRate: (total / usageKwh * 100) // cents per kWh
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
    } else if (usageKwh <= 1000) {
        // Linear interpolation between 500 and 1000
        const ratio = (usageKwh - 500) / 500;
        return price_kwh_500 + (price_kwh_1000 - price_kwh_500) * ratio;
    } else if (usageKwh <= 2000) {
        // Linear interpolation between 1000 and 2000
        const ratio = (usageKwh - 1000) / 1000;
        return price_kwh_1000 + (price_kwh_2000 - price_kwh_1000) * ratio;
    } else {
        // Extrapolate beyond 2000 kWh
        return price_kwh_2000;
    }
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
    const rangeMatch = terms.match(/between\s+(\d+)-(\d+)\s+kwh/i) ||
                       terms.match(/exactly\s+(\d+)\s+kwh/i);

    if (creditMatch && rangeMatch) {
        const creditAmount = parseFloat(creditMatch[1]);
        const minKwh = parseFloat(rangeMatch[1]);
        const maxKwh = rangeMatch[2] ? parseFloat(rangeMatch[2]) : minKwh;

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
        effectiveAnnualRate: (totalCost / totalUsage * 100) // cents per kWh
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
function estimateUsagePattern(avgMonthlyKwh, homeSize = null) {
    // Texas seasonal multipliers (based on research data)
    const seasonalMultipliers = [
        1.2,  // January (winter)
        1.1,  // February (winter)
        1.0,  // March (shoulder)
        0.95, // April (shoulder)
        1.0,  // May (shoulder)
        1.4,  // June (summer)
        1.7,  // July (summer peak)
        1.8,  // August (summer peak)
        1.5,  // September (summer)
        1.0,  // October (shoulder)
        0.95, // November (shoulder)
        1.2   // December (winter)
    ];

    // Calculate adjustment factor to ensure average equals input
    const sumMultipliers = seasonalMultipliers.reduce((a, b) => a + b, 0);
    const adjustmentFactor = 12 / sumMultipliers;

    // Generate monthly usage pattern
    return seasonalMultipliers.map(multiplier =>
        Math.round(avgMonthlyKwh * multiplier * adjustmentFactor)
    );
}

/**
 * Estimate average monthly usage from home size
 *
 * @param {string} homeSize - Home size category
 * @returns {number} Estimated average monthly kWh
 */
function estimateUsageFromHomeSize(homeSize) {
    const sizeMap = {
        'studio': 500,
        '1br': 500,
        '2br': 750,
        'small': 1000,
        'medium': 1500,
        'large': 2000,
        'xlarge': 2500
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
        'ONCOR': [
            { min: 75001, max: 75999 }, // Dallas-Fort Worth
            { min: 76001, max: 76999 }, // Fort Worth area
        ],
        'CENTERPOINT': [
            { min: 77001, max: 77999 }, // Houston
        ],
        'AEP_CENTRAL': [
            { min: 78401, max: 78499 }, // Corpus Christi
            { min: 78500, max: 78599 }, // Rio Grande Valley
        ],
        'AEP_NORTH': [
            { min: 79601, max: 79699 }, // Abilene
            { min: 76901, max: 76999 }, // San Angelo
        ],
        'TNMP': [
            { min: 77550, max: 77554 }, // Galveston
        ],
        'LPL': [
            { min: 79401, max: 79499 }, // Lubbock
        ]
    };

    const zip = parseInt(zipCode);

    for (const [tduCode, ranges] of Object.entries(zipRanges)) {
        for (const range of ranges) {
            if (zip >= range.min && zip <= range.max) {
                return tduList.find(tdu => tdu.code === tduCode);
            }
        }
    }

    return null;
}

/**
 * Rank plans by annual cost and identify gimmicks
 *
 * @param {Object[]} plans - Array of plan objects
 * @param {number[]} userUsage - 12-month usage pattern
 * @param {Object} tduRates - TDU rate object
 * @param {Object} options - Ranking options
 * @returns {Object[]} Ranked plans with warnings
 */
function rankPlans(plans, userUsage, tduRates, options = {}) {
    const { localTaxRate = 0, termLengthPreference = null } = options;

    // Calculate annual cost for each plan
    const rankedPlans = plans.map(plan => {
        const annualResult = calculateAnnualCost(userUsage, plan, tduRates, localTaxRate);
        const volatility = calculateVolatility(plan, userUsage);
        const warnings = identifyWarnings(plan, userUsage);

        return {
            ...plan,
            annualCost: annualResult.annualCost,
            averageMonthlyCost: annualResult.averageMonthlyCost,
            effectiveRate: annualResult.effectiveAnnualRate,
            monthlyCosts: annualResult.monthlyCosts,
            volatility: volatility,
            warnings: warnings,
            isGimmick: warnings.length > 0 || volatility > 0.3
        };
    });

    // Filter to fixed-rate only
    const fixedRatePlans = rankedPlans.filter(p => p.rate_type === 'FIXED');

    // Sort by annual cost (lowest first)
    fixedRatePlans.sort((a, b) => a.annualCost - b.annualCost);

    return fixedRatePlans;
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
    if (plan.special_terms && plan.special_terms.includes('credit')) {
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
    if (plan.special_terms && plan.special_terms.includes('credit')) {
        let missedMonths = 0;
        let missedValue = 0;

        for (const usage of userUsage) {
            const credits = calculateBillCredits(usage, plan);
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
    if (plan.early_termination_fee > 0) {
        // Calculate ETF at contract midpoint for warning purposes
        const midpointMonths = Math.floor(plan.term_months / 2);
        const totalETF = calculateEarlyTerminationFee(plan, midpointMonths);

        if (totalETF > 200) {
            warnings.push(
                `High early termination fee: $${totalETF.toFixed(0)} if cancelled at month ${midpointMonths}`
            );
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
 * @param {Date|string} startDate - Contract start date
 * @param {number} termMonths - Contract length in months
 * @returns {Object} Expiration analysis
 */
function calculateContractExpiration(startDate, termMonths) {
    const start = new Date(startDate);
    const expiration = new Date(start);
    expiration.setMonth(expiration.getMonth() + termMonths);

    const expirationMonth = expiration.getMonth(); // 0-11

    // Rate seasonality (0 = best time to renew, 1 = worst time to renew)
    const renewalSeasonality = {
        0: 0.7,  // January - expensive (winter peak)
        1: 0.5,  // February - moderate
        2: 0.2,  // March - good
        3: 0.0,  // April - excellent (best)
        4: 0.1,  // May - excellent
        5: 0.6,  // June - expensive (summer starts)
        6: 1.0,  // July - very expensive (summer peak)
        7: 1.0,  // August - very expensive (summer peak)
        8: 0.7,  // September - expensive
        9: 0.0,  // October - excellent (best)
        10: 0.2, // November - good
        11: 0.6  // December - moderate to expensive
    };

    const seasonalityScore = renewalSeasonality[expirationMonth];

    // Categorize renewal timing
    let renewalTiming;
    let renewalAdvice;
    let riskLevel;

    if (seasonalityScore >= 0.8) {
        renewalTiming = 'Peak Season (Expensive)';
        renewalAdvice = 'Your contract expires during the most expensive renewal period. Consider switching 60 days before expiration to lock in better rates, or choose a different contract length to shift your renewal to April/May or October/November.';
        riskLevel = 'high';
    } else if (seasonalityScore >= 0.5) {
        renewalTiming = 'Moderate Season';
        renewalAdvice = 'Your contract expires during a moderate-cost period. Shopping 30-60 days before expiration recommended.';
        riskLevel = 'medium';
    } else {
        renewalTiming = 'Optimal Season (Low Rates)';
        renewalAdvice = 'Excellent timing! Your contract expires during a low-rate period, giving you access to better renewal options.';
        riskLevel = 'low';
    }

    // Calculate alternative contract lengths for better timing
    const alternatives = [];
    for (let altTerm of [6, 9, 12, 18, 24, 36]) {
        if (altTerm === termMonths) continue;

        const altExpiration = new Date(start);
        altExpiration.setMonth(altExpiration.getMonth() + altTerm);
        const altMonth = altExpiration.getMonth();
        const altScore = renewalSeasonality[altMonth];

        if (altScore < seasonalityScore - 0.3) {
            alternatives.push({
                termMonths: altTerm,
                expirationDate: altExpiration,
                expirationMonth: altMonth,
                seasonalityScore: altScore,
                improvement: ((seasonalityScore - altScore) * 100).toFixed(0) + '%'
            });
        }
    }

    // Sort alternatives by seasonality score (best first)
    alternatives.sort((a, b) => a.seasonalityScore - b.seasonalityScore);

    return {
        startDate: start,
        expirationDate: expiration,
        termMonths: termMonths,
        expirationMonth: expirationMonth,
        expirationMonthName: expiration.toLocaleString('en-US', { month: 'long' }),
        expirationYear: expiration.getFullYear(),
        renewalTiming: renewalTiming,
        renewalAdvice: renewalAdvice,
        riskLevel: riskLevel,
        seasonalityScore: seasonalityScore,
        alternativeTerms: alternatives.slice(0, 3), // Top 3 alternatives
        daysUntilExpiration: Math.ceil((expiration - new Date()) / (1000 * 60 * 60 * 24))
    };
}

/**
 * Calculate early termination fee based on remaining contract months
 *
 * Properly calculates ETF for contracts with per-month-remaining fees.
 * Many plans charge $10-$20 per month remaining instead of a flat fee.
 *
 * @param {Object} plan - Plan object
 * @param {number} monthsRemaining - Months remaining in contract
 * @returns {number} Total early termination fee in dollars
 */
function calculateEarlyTerminationFee(plan, monthsRemaining) {
    if (!plan.early_termination_fee) return 0;

    const etfValue = plan.early_termination_fee;

    // Check if ETF is per-month-remaining (common pattern: $10-20 per month)
    // If the ETF is a small value ($50 or less) and the plan has a long term,
    // it's likely a per-month fee
    if (etfValue <= 50 && plan.term_months >= 12) {
        // Likely per-month-remaining
        return etfValue * monthsRemaining;
    }

    // Check if special_terms mentions per-month
    if (plan.special_terms) {
        const terms = plan.special_terms.toLowerCase();
        if (terms.includes('per month remaining') ||
            terms.includes('per remaining month') ||
            terms.includes('$' + etfValue + ' per month')) {
            return etfValue * monthsRemaining;
        }
    }

    // Otherwise, it's a flat fee
    return etfValue;
}

/**
 * Get month name from number (0-11)
 *
 * @param {number} monthIndex - Month index (0-11)
 * @returns {string} Month name
 */
function getMonthName(monthIndex) {
    const months = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return months[monthIndex];
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
        calculateEarlyTerminationFee,
        getMonthName
    };
}
