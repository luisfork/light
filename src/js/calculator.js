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
 * @returns {string[]} Array of warning messages
 */
function identifyWarnings(plan, userUsage) {
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

    // High ETF warning
    if (plan.early_termination_fee > 200) {
        warnings.push(
            `High early termination fee of $${plan.early_termination_fee}`
        );
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

    // Summer contract end warning (expires during expensive months)
    // This would require contract start date - placeholder for future

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
        formatRate
    };
}
