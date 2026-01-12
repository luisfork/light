/**
 * Usage Estimator Module
 *
 * Estimates monthly electricity usage patterns based on
 * average usage or home size, applying Texas seasonal multipliers.
 */

const UsageEstimator = {
  /**
   * Texas seasonal multipliers (based on research data)
   * Reflects typical Texas usage patterns where summer AC dominates consumption
   */
  seasonalMultipliers: [
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
  ],

  /**
   * Home size to average monthly usage mapping
   */
  homeSizeUsage: {
    studio: 500,
    '1br': 500,
    '2br': 750,
    small: 1000,
    medium: 1500,
    large: 2000,
    xlarge: 2500
  },

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
  estimateUsagePattern(avgMonthlyKwh, _homeSize = null) {
    // Calculate adjustment factor to ensure average equals input
    const sumMultipliers = this.seasonalMultipliers.reduce((a, b) => a + b, 0);
    const adjustmentFactor = 12 / sumMultipliers;

    // Generate monthly usage pattern
    return this.seasonalMultipliers.map((multiplier) =>
      Math.round(avgMonthlyKwh * multiplier * adjustmentFactor)
    );
  },

  /**
   * Estimate average monthly usage from home size
   *
   * @param {string} homeSize - Home size category
   * @returns {number} Estimated average monthly kWh
   */
  estimateUsageFromHomeSize(homeSize) {
    const key = homeSize.toLowerCase().replace(/[^a-z0-9]/g, '');
    return this.homeSizeUsage[key] || 1000; // Default to 1000 kWh
  },

  /**
   * Get seasonal category for a month
   *
   * @param {number} monthIndex - Month index (0-11)
   * @returns {string} 'summer', 'winter', or 'shoulder'
   */
  getSeasonalCategory(monthIndex) {
    if (monthIndex >= 5 && monthIndex <= 8) return 'summer';
    if (monthIndex === 0 || monthIndex === 1 || monthIndex === 11) return 'winter';
    return 'shoulder';
  }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = UsageEstimator;
}

// Also export individual functions for backwards compatibility
const _estimateUsagePattern = UsageEstimator.estimateUsagePattern.bind(UsageEstimator);
const _estimateUsageFromHomeSize = UsageEstimator.estimateUsageFromHomeSize.bind(UsageEstimator);
