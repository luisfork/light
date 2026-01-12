/**
 * Cost Calculator Module
 *
 * Core electricity cost calculation engine for computing
 * monthly and annual costs based on usage and plan details.
 */

const CostCalculator = {
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
  interpolateRate(usageKwh, plan) {
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
  },

  /**
   * Calculate bill credits based on usage
   *
   * @param {number} usageKwh - Monthly usage
   * @param {Object} plan - Plan object
   * @returns {number} Total credits in dollars
   */
  calculateBillCredits(usageKwh, plan) {
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
   * Calculate monthly electricity cost for a given plan and usage
   *
   * @param {number} usageKwh - Monthly usage in kilowatt-hours
   * @param {Object} plan - Plan object from plans.json
   * @param {Object} tduRates - TDU rate object for the service area
   * @param {number} localTaxRate - Local sales tax rate (e.g., 0.02 for 2%)
   * @returns {Object} Monthly cost with breakdown
   */
  calculateMonthlyCost(usageKwh, plan, tduRates, localTaxRate = 0) {
    // Energy charges (from REP)
    // The price_kwh values in plans already include TDU charges per EFL requirements
    // For simplicity, we'll use the interpolated rate based on usage
    const energyRate = this.interpolateRate(usageKwh, plan);
    const energyCost = (usageKwh * energyRate) / 100; // Convert cents to dollars

    // TDU delivery charges (already included in EFL prices, but tracked separately for transparency)
    const tduCost = tduRates.monthly_base_charge + (usageKwh * tduRates.per_kwh_rate) / 100;

    // Base monthly charge from REP
    const baseCost = plan.base_charge_monthly || 0;

    // Calculate subtotal before credits
    const subtotal = energyCost + baseCost;

    // Apply bill credits if applicable
    const credits = this.calculateBillCredits(usageKwh, plan);

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
  },

  /**
   * Calculate annual electricity cost based on monthly usage pattern
   *
   * @param {number[]} monthlyUsageArray - Array of 12 monthly usage values
   * @param {Object} plan - Plan object
   * @param {Object} tduRates - TDU rate object
   * @param {number} localTaxRate - Local sales tax rate
   * @returns {Object} Annual cost breakdown
   */
  calculateAnnualCost(monthlyUsageArray, plan, tduRates, localTaxRate = 0) {
    if (monthlyUsageArray.length !== 12) {
      throw new Error('monthlyUsageArray must contain exactly 12 values');
    }

    let totalCost = 0;
    const monthlyCosts = [];
    let totalUsage = 0;

    for (let i = 0; i < 12; i++) {
      const usage = monthlyUsageArray[i];
      const result = this.calculateMonthlyCost(usage, plan, tduRates, localTaxRate);
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
  },

  /**
   * Detect TDU service area from ZIP code
   *
   * @param {string} zipCode - 5-digit ZIP code
   * @param {Object[]} tduList - Array of TDU objects
   * @returns {Object|null} TDU object or null if not found
   */
  detectTDU(zipCode, tduList) {
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

    const zip = parseInt(zipCode, 10);

    for (const [tduCode, ranges] of Object.entries(zipRanges)) {
      for (const range of ranges) {
        if (zip >= range.min && zip <= range.max) {
          return tduList.find((tdu) => tdu.code === tduCode);
        }
      }
    }

    return null;
  }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CostCalculator;
}

// Also export individual functions for backwards compatibility
const _calculateMonthlyCost = CostCalculator.calculateMonthlyCost.bind(CostCalculator);
const _calculateAnnualCost = CostCalculator.calculateAnnualCost.bind(CostCalculator);
const _detectTDU = CostCalculator.detectTDU.bind(CostCalculator);
