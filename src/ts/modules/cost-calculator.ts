/**
 * Cost Calculator Module
 *
 * Core electricity cost calculation engine for computing
 * monthly and annual costs based on usage and plan details.
 *
 * VULNERABILITY FIXED: All parameters now have explicit types
 * VULNERABILITY FIXED: Null checks for optional plan properties
 * VULNERABILITY FIXED: Array length validation with type system
 */

import type {
  AnnualCostResult,
  ElectricityPlan,
  MonthlyCostBreakdown,
  MonthlyCostResult,
  TDURate,
  ZipCodeRange
} from '../types';

/**
 * ZIP code range mapping for TDU detection.
 * Maps TDU codes to arrays of [min, max] ZIP code ranges.
 */
const ZIP_RANGES: Record<string, readonly ZipCodeRange[]> = {
  ONCOR: [
    [75001, 75999], // Dallas-Fort Worth
    [76001, 76999] // Fort Worth area
  ],
  CENTERPOINT: [
    [77001, 77999] // Houston
  ],
  AEP_CENTRAL: [
    [78401, 78499], // Corpus Christi
    [78500, 78599] // Rio Grande Valley
  ],
  AEP_NORTH: [
    [79601, 79699], // Abilene
    [76901, 76999] // San Angelo
  ],
  TNMP: [
    [77550, 77554] // Galveston
  ],
  LPL: [
    [79401, 79499] // Lubbock
  ]
} as const;

/**
 * Cost Calculator singleton.
 * Handles all electricity cost computations.
 */
const CostCalculator = {
  /**
   * Interpolate energy rate based on usage.
   *
   * Plans provide rates at 500, 1000, and 2000 kWh.
   * We interpolate for other usage levels using linear interpolation.
   *
   * VULNERABILITY FIXED: Safe property access with nullish coalescing
   * Before: const { price_kwh_500, price_kwh_1000, price_kwh_2000 } = plan;
   * After: Explicit null checks with fallback to 0
   *
   * @param usageKwh - Monthly usage in kilowatt-hours
   * @param plan - Plan object with price tiers
   * @returns Rate in cents per kWh
   */
  interpolateRate(usageKwh: number, plan: ElectricityPlan): number {
    // VULNERABILITY FIXED: Null-safe property access
    const p500 = plan.price_kwh_500 ?? 0;
    const p1000 = plan.price_kwh_1000 ?? 0;
    const p2000 = plan.price_kwh_2000 ?? 0;

    if (usageKwh <= 500) {
      return p500;
    }

    if (usageKwh <= 1000) {
      // Linear interpolation between 500 and 1000
      const ratio = (usageKwh - 500) / 500;
      return p500 + (p1000 - p500) * ratio;
    }

    if (usageKwh <= 2000) {
      // Linear interpolation between 1000 and 2000
      const ratio = (usageKwh - 1000) / 1000;
      return p1000 + (p2000 - p1000) * ratio;
    }

    // Extrapolate beyond 2000 kWh using the 2000 kWh rate
    return p2000;
  },

  /**
   * Calculate bill credits based on usage.
   *
   * Parses special_terms for bill credit patterns like:
   * "$120 bill credit applied when usage is between 1000-1050 kWh"
   *
   * VULNERABILITY FIXED: Null check on special_terms before regex
   *
   * @param usageKwh - Monthly usage in kilowatt-hours
   * @param plan - Plan object with special_terms
   * @returns Total credits in dollars
   */
  calculateBillCredits(usageKwh: number, plan: ElectricityPlan): number {
    // VULNERABILITY FIXED: Early return for null/undefined special_terms
    if (plan.special_terms == null) {
      return 0;
    }

    const terms = plan.special_terms.toLowerCase();

    // Pattern matching for bill credits
    // e.g., "$120 bill credit applied when usage is between 1000-1050 kWh"
    const creditMatch = terms.match(/\$(\d+)\s+bill\s+credit/i);
    const rangeMatch =
      terms.match(/between\s+(\d+)-(\d+)\s+kwh/i) ?? terms.match(/exactly\s+(\d+)\s+kwh/i);

    if (creditMatch !== null && rangeMatch !== null) {
      const creditAmount = Number.parseFloat(creditMatch[1] ?? '0');
      const minKwh = Number.parseFloat(rangeMatch[1] ?? '0');
      const maxKwh = rangeMatch[2] !== undefined ? Number.parseFloat(rangeMatch[2]) : minKwh;

      if (usageKwh >= minKwh && usageKwh <= maxKwh) {
        return creditAmount;
      }
    }

    return 0;
  },

  /**
   * Calculate monthly electricity cost for a given plan and usage.
   *
   * VULNERABILITY FIXED: All optional properties have null checks
   * VULNERABILITY FIXED: Return type is fully typed interface
   *
   * @param usageKwh - Monthly usage in kilowatt-hours
   * @param plan - Plan object from plans.json
   * @param tduRates - TDU rate object for the service area
   * @param localTaxRate - Local sales tax rate (e.g., 0.02 for 2%)
   * @returns Monthly cost with detailed breakdown
   */
  calculateMonthlyCost(
    usageKwh: number,
    plan: ElectricityPlan,
    tduRates: TDURate,
    localTaxRate: number = 0
  ): MonthlyCostResult {
    // Energy charges (from REP)
    // The price_kwh values in plans already include TDU charges per EFL requirements
    const energyRate = this.interpolateRate(usageKwh, plan);
    const energyCost = (usageKwh * energyRate) / 100; // Convert cents to dollars

    // TDU delivery charges (tracked for transparency, not added to total)
    const tduCost = tduRates.monthly_base_charge + (usageKwh * tduRates.per_kwh_rate) / 100;

    // Base monthly charge from REP
    // VULNERABILITY FIXED: Null coalescing for optional field
    const baseCost = plan.base_charge_monthly ?? 0;

    // Calculate subtotal before credits
    const subtotal = energyCost + baseCost;

    // Apply bill credits if applicable
    const credits = this.calculateBillCredits(usageKwh, plan);

    // Apply local sales tax
    const taxAmount = Math.max(0, subtotal - credits) * localTaxRate;

    // Total cost (cannot be negative)
    const total = Math.max(0, subtotal - credits + taxAmount);

    // Effective rate in cents per kWh
    const effectiveRate = usageKwh > 0 ? (total / usageKwh) * 100 : 0;

    const breakdown: MonthlyCostBreakdown = {
      energyCost,
      baseCost,
      tduCost,
      credits,
      tax: taxAmount,
      effectiveRate
    };

    return {
      total,
      breakdown
    };
  },

  /**
   * Calculate annual electricity cost based on monthly usage pattern.
   *
   * VULNERABILITY FIXED: Array length validation with descriptive error
   *
   * @param monthlyUsageArray - Array of 12 monthly usage values (0=Jan, 11=Dec)
   * @param plan - Plan object
   * @param tduRates - TDU rate object
   * @param localTaxRate - Local sales tax rate
   * @returns Annual cost breakdown
   * @throws Error if monthlyUsageArray is not exactly 12 elements
   */
  calculateAnnualCost(
    monthlyUsageArray: readonly number[],
    plan: ElectricityPlan,
    tduRates: TDURate,
    localTaxRate: number = 0
  ): AnnualCostResult {
    // VULNERABILITY FIXED: Explicit length validation with clear error message
    if (monthlyUsageArray.length !== 12) {
      throw new Error(
        `monthlyUsageArray must contain exactly 12 values, got ${monthlyUsageArray.length}`
      );
    }

    let totalCost = 0;
    const monthlyCosts: number[] = [];
    let totalUsage = 0;

    for (let i = 0; i < 12; i++) {
      // VULNERABILITY FIXED: Safe array access with noUncheckedIndexedAccess
      const usage = monthlyUsageArray[i];
      if (usage === undefined) {
        throw new Error(`Missing usage value for month ${i}`);
      }

      const result = this.calculateMonthlyCost(usage, plan, tduRates, localTaxRate);
      monthlyCosts.push(result.total);
      totalCost += result.total;
      totalUsage += usage;
    }

    const effectiveAnnualRate = totalUsage > 0 ? (totalCost / totalUsage) * 100 : 0;

    return {
      annualCost: totalCost,
      monthlyCosts,
      averageMonthlyCost: totalCost / 12,
      totalUsage,
      effectiveAnnualRate
    };
  },

  /**
   * Detect TDU service area from ZIP code.
   *
   * VULNERABILITY FIXED: Explicit null return type and safe iteration
   *
   * @param zipCode - 5-digit ZIP code string
   * @param tduList - Array of TDU objects
   * @returns TDU object or null if not found
   */
  detectTDU(zipCode: string, tduList: readonly TDURate[]): TDURate | null {
    const zip = Number.parseInt(zipCode, 10);

    // VULNERABILITY FIXED: Validate parsed ZIP is a valid number
    if (Number.isNaN(zip)) {
      return null;
    }

    for (const [tduCode, ranges] of Object.entries(ZIP_RANGES)) {
      for (const range of ranges) {
        const [min, max] = range;
        if (zip >= min && zip <= max) {
          // VULNERABILITY FIXED: Explicit undefined check for find result
          const tdu = tduList.find((t) => t.code === tduCode);
          return tdu ?? null;
        }
      }
    }

    return null;
  }
};

export default CostCalculator;

// Named export for tree-shaking
export { CostCalculator };

// Browser environment: attach to window for compatibility
if (typeof window !== 'undefined') {
  (window as unknown as Record<string, unknown>).CostCalculator = CostCalculator;
}

// CommonJS export for Node.js compatibility (tests)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CostCalculator;
}

// Backwards compatibility exports
export const calculateMonthlyCost = CostCalculator.calculateMonthlyCost.bind(CostCalculator);
export const calculateAnnualCost = CostCalculator.calculateAnnualCost.bind(CostCalculator);
export const detectTDU = CostCalculator.detectTDU.bind(CostCalculator);
