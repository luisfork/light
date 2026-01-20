/**
 * Usage Estimator Module
 *
 * Estimates monthly electricity usage patterns based on
 * average usage or home size, applying Texas seasonal multipliers.
 *
 * VULNERABILITY FIXED: Added strict types for all parameters
 * VULNERABILITY FIXED: Safe object property access
 * VULNERABILITY FIXED: Enforces 12-element array output
 */

import type { MonthlyUsagePattern } from '../types';

/**
 * Seasonal category for a month.
 */
type SeasonalCategory = 'summer' | 'winter' | 'shoulder';

/**
 * Home size keys for usage lookup.
 */
type HomeSizeKey = 'studio' | '1br' | '2br' | 'small' | 'medium' | 'large' | 'xlarge';

/**
 * Texas seasonal multipliers (based on research data).
 * Reflects typical Texas usage patterns where summer AC dominates consumption.
 * Index 0 = January, Index 11 = December.
 */
const SEASONAL_MULTIPLIERS: MonthlyUsagePattern = [
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
] as const;

/**
 * Home size to average monthly usage mapping.
 */
const HOME_SIZE_USAGE: Record<HomeSizeKey, number> = {
  studio: 500,
  '1br': 500,
  '2br': 750,
  small: 1000,
  medium: 1500,
  large: 2000,
  xlarge: 2500
} as const;

/**
 * Default usage when home size is unknown.
 */
const DEFAULT_USAGE_KWH = 1000;

/**
 * Usage Estimator singleton.
 * Handles usage pattern estimation for Texas homes.
 */
const UsageEstimator = {
  /**
   * Expose seasonal multipliers for external use.
   */
  seasonalMultipliers: SEASONAL_MULTIPLIERS,

  /**
   * Estimate monthly usage pattern from average monthly usage.
   *
   * Applies Texas seasonal multipliers:
   * - Summer (Jun-Sep): 1.4-1.8x
   * - Winter (Dec-Feb): 1.1-1.3x
   * - Shoulder (Mar-May, Oct-Nov): 0.95-1.0x
   *
   * VULNERABILITY FIXED: Returns exactly 12 elements always
   *
   * @param avgMonthlyKwh - Average monthly usage
   * @param _homeSize - Home size category (reserved for future use)
   * @returns Array of exactly 12 monthly usage estimates
   */
  estimateUsagePattern(avgMonthlyKwh: number, _homeSize: string | null = null): number[] {
    // VULNERABILITY FIXED: Validate input is a positive number
    const validAvg =
      Number.isFinite(avgMonthlyKwh) && avgMonthlyKwh > 0 ? avgMonthlyKwh : DEFAULT_USAGE_KWH;

    // Calculate adjustment factor to ensure average equals input
    const sumMultipliers = SEASONAL_MULTIPLIERS.reduce((a, b) => a + b, 0);
    const adjustmentFactor = 12 / sumMultipliers;

    // Generate monthly usage pattern with precise rounding
    const monthlyUsage: number[] = [];
    for (let i = 0; i < 12; i++) {
      // VULNERABILITY FIXED: Safe access to seasonal multipliers
      // Using direct index access with bounds already checked by loop
      const multiplier = SEASONAL_MULTIPLIERS[i] ?? 1.0;
      monthlyUsage.push(Math.round(validAvg * multiplier * adjustmentFactor));
    }

    // Adjust to ensure sum equals exactly avgMonthlyKwh * 12
    const targetTotal = Math.round(validAvg * 12);
    const actualTotal = monthlyUsage.reduce((a, b) => a + b, 0);
    const difference = targetTotal - actualTotal;

    if (difference !== 0 && monthlyUsage.length > 0) {
      // Find the month with highest usage and adjust it
      const maxValue = Math.max(...monthlyUsage);
      const maxIndex = monthlyUsage.indexOf(maxValue);
      if (maxIndex >= 0 && monthlyUsage[maxIndex] !== undefined) {
        monthlyUsage[maxIndex] += difference;
      }
    }

    return monthlyUsage;
  },

  /**
   * Estimate average monthly usage from home size.
   *
   * VULNERABILITY FIXED: Safe property access with fallback
   *
   * @param homeSize - Home size category
   * @returns Estimated average monthly kWh
   */
  estimateUsageFromHomeSize(homeSize: string): number {
    // Normalize the home size key
    const key = homeSize.toLowerCase().replace(/[^a-z0-9]/g, '');

    // VULNERABILITY FIXED: Type-safe property access
    if (key in HOME_SIZE_USAGE) {
      return HOME_SIZE_USAGE[key as HomeSizeKey];
    }

    return DEFAULT_USAGE_KWH;
  },

  /**
   * Get seasonal category for a month.
   *
   * @param monthIndex - Month index (0-11)
   * @returns Seasonal category
   */
  getSeasonalCategory(monthIndex: number): SeasonalCategory {
    // Summer: June through September (indices 5-8)
    if (monthIndex >= 5 && monthIndex <= 8) {
      return 'summer';
    }

    // Winter: December, January, February (indices 11, 0, 1)
    if (monthIndex === 0 || monthIndex === 1 || monthIndex === 11) {
      return 'winter';
    }

    // Shoulder: all other months
    return 'shoulder';
  },

  /**
   * Get multiplier for a specific month.
   *
   * VULNERABILITY FIXED: Bounds check for array access
   *
   * @param monthIndex - Month index (0-11)
   * @returns Multiplier value or 1.0 if invalid
   */
  getMultiplier(monthIndex: number): number {
    if (monthIndex < 0 || monthIndex > 11 || !Number.isInteger(monthIndex)) {
      return 1.0;
    }
    // Direct index access is safe after bounds check
    return SEASONAL_MULTIPLIERS[monthIndex] ?? 1.0;
  }
};

export default UsageEstimator;

// Named export for tree-shaking
export { UsageEstimator, SEASONAL_MULTIPLIERS, HOME_SIZE_USAGE };

// Browser environment: attach to window for compatibility
if (typeof window !== 'undefined') {
  (window as unknown as Record<string, unknown>).UsageEstimator = UsageEstimator;
}

// CommonJS export for Node.js compatibility (tests)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = UsageEstimator;
}

// Backwards compatibility exports
export const estimateUsagePattern = UsageEstimator.estimateUsagePattern.bind(UsageEstimator);
export const estimateUsageFromHomeSize =
  UsageEstimator.estimateUsageFromHomeSize.bind(UsageEstimator);
