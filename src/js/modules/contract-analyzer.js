/**
 * Contract Analyzer Module
 *
 * Analyzes contract expiration timing to help users
 * avoid expensive renewal periods.
 */

const ContractAnalyzer = {
  /**
   * Rate seasonality (0 = best time to renew, 1 = worst time to renew)
   * Based on Texas electricity market historical data and ERCOT patterns
   */
  renewalSeasonality: {
    0: 0.8, // January - expensive (winter peak, heating demand) - HIGH RISK
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
  },

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
   * @param {Date|string|null} startDate - Contract start date (defaults to today)
   * @param {number} termMonths - Contract length in months
   * @returns {Object} Expiration analysis
   */
  calculateContractExpiration(startDate, termMonths) {
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
    const seasonalityScore = this.renewalSeasonality[expirationMonth];

    // Categorize renewal timing with detailed advice
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
    const alternatives = this.calculateAlternatives(start, term, seasonalityScore);

    // Calculate days/months until expiration
    const now = new Date();
    const daysUntilExpiration = Math.max(0, Math.ceil((expiration - now) / (1000 * 60 * 60 * 24)));
    const monthsUntilExpiration = Math.max(0, Math.round(daysUntilExpiration / 30));

    return {
      startDate: start,
      expirationDate: expiration,
      termMonths: term,
      expirationMonth: expirationMonth,
      expirationMonthName: this.getMonthName(expirationMonth),
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
  },

  /**
   * Calculate alternative contract lengths for better timing
   *
   * @param {Date} start - Start date
   * @param {number} term - Current term in months
   * @param {number} seasonalityScore - Current expiration seasonality
   * @returns {Array} Alternative contract options
   */
  calculateAlternatives(start, term, seasonalityScore) {
    const alternatives = [];
    const termsToCheck = [3, 6, 9, 12, 15, 18, 24, 36];

    for (const altTerm of termsToCheck) {
      if (altTerm === term) continue;

      const altExpiration = new Date(start);
      altExpiration.setMonth(altExpiration.getMonth() + altTerm);
      const altMonth = altExpiration.getMonth();
      const altScore = this.renewalSeasonality[altMonth];

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
          expirationMonthName: this.getMonthName(altMonth),
          seasonalityScore: altScore,
          riskLevel: altRiskLevel,
          improvement: `${Math.round(Math.max(0, improvement))}% better timing`
        });
      }
    }

    // Sort alternatives by seasonality score (best first)
    alternatives.sort((a, b) => a.seasonalityScore - b.seasonalityScore);

    return alternatives;
  },

  /**
   * Get contract expiration analysis for a plan (assuming start today)
   *
   * @param {Object} plan - Plan object with term_months
   * @returns {Object} Expiration analysis
   */
  getContractExpirationForPlan(plan) {
    if (!plan || !plan.term_months) {
      return this.calculateContractExpiration(new Date(), 12);
    }
    return this.calculateContractExpiration(new Date(), plan.term_months);
  },

  /**
   * Get month name from number (0-11)
   *
   * @param {number} monthIndex - Month index (0-11)
   * @returns {string} Month name
   */
  getMonthName(monthIndex) {
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
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ContractAnalyzer;
}

// Also export individual functions for backwards compatibility
const _calculateContractExpiration =
  ContractAnalyzer.calculateContractExpiration.bind(ContractAnalyzer);
const _getContractExpirationForPlan =
  ContractAnalyzer.getContractExpirationForPlan.bind(ContractAnalyzer);
