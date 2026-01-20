/**
 * Contract Analyzer Module
 *
 * Analyzes contract expiration timing to help users
 * avoid expensive renewal periods.
 *
 * VULNERABILITY FIXED: Full type safety for all parameters and returns
 * VULNERABILITY FIXED: Safe date handling with validation
 */

import type { ElectricityPlan } from '../types';
import { MONTH_NAMES } from './formatters';

/**
 * Risk level for renewal timing.
 */
type RiskLevel = 'optimal' | 'low' | 'medium' | 'high';

/**
 * Alternative contract term suggestion.
 */
interface AlternativeTerm {
  readonly termMonths: number;
  readonly expirationDate: Date;
  readonly expirationMonth: number;
  readonly expirationMonthName: string;
  readonly seasonalityScore: number;
  readonly riskLevel: RiskLevel;
  readonly improvement: string;
}

/**
 * Full contract expiration analysis result.
 */
interface ContractExpirationResult {
  readonly startDate: Date;
  readonly expirationDate: Date;
  readonly termMonths: number;
  readonly expirationMonth: number;
  readonly expirationMonthName: string;
  readonly expirationYear: number;
  readonly renewalTiming: string;
  readonly renewalAdvice: string;
  readonly riskLevel: RiskLevel;
  readonly seasonalityScore: number;
  readonly estimatedRateImpact: string;
  readonly alternativeTerms: readonly AlternativeTerm[];
  readonly daysUntilExpiration: number;
  readonly monthsUntilExpiration: number;
  readonly formattedExpiration: string;
}

/**
 * Rate seasonality by month (0 = best, 1 = worst).
 * Based on Texas electricity market historical data.
 */
const RENEWAL_SEASONALITY: Record<number, number> = {
  0: 0.8, // January - winter peak
  1: 0.5, // February - post-winter
  2: 0.2, // March - spring shoulder
  3: 0.0, // April - BEST (lowest demand)
  4: 0.1, // May - excellent
  5: 0.6, // June - summer rising
  6: 1.0, // July - WORST (summer peak)
  7: 1.0, // August - WORST (peak demand)
  8: 0.7, // September - still hot
  9: 0.0, // October - BEST (fall shoulder)
  10: 0.2, // November - good
  11: 0.6 // December - winter begins
} as const;

/**
 * Standard contract terms to check for alternatives.
 */
const STANDARD_TERMS = [3, 6, 9, 12, 15, 18, 24, 36] as const;

/**
 * Get month name from index (0-11).
 */
function getMonthName(monthIndex: number): string {
  if (monthIndex < 0 || monthIndex > 11) {
    return '';
  }
  return MONTH_NAMES[monthIndex] ?? '';
}

/**
 * Parse and validate a date input.
 */
function parseDate(input: Date | string | null | undefined): Date {
  if (input == null) {
    return new Date();
  }

  const date = typeof input === 'string' ? new Date(input) : new Date(input.getTime());

  // Return current date if parsing failed
  if (Number.isNaN(date.getTime())) {
    return new Date();
  }

  return date;
}

/**
 * Get risk level from seasonality score.
 */
function getRiskLevel(score: number): RiskLevel {
  if (score >= 0.8) return 'high';
  if (score >= 0.5) return 'medium';
  if (score >= 0.2) return 'low';
  return 'optimal';
}

/**
 * Contract Analyzer singleton.
 */
const ContractAnalyzer = {
  /**
   * Expose seasonality data for external use.
   */
  renewalSeasonality: RENEWAL_SEASONALITY,

  /**
   * Calculate contract expiration date and timing analysis.
   *
   * Helps users avoid expensive renewal periods by showing when their
   * contract expires and whether it falls during high-rate months.
   *
   * @param startDate - Contract start date (defaults to today)
   * @param termMonths - Contract length in months
   * @returns Expiration analysis with timing advice
   */
  calculateContractExpiration(
    startDate: Date | string | null | undefined,
    termMonths: number
  ): ContractExpirationResult {
    const start = parseDate(startDate);
    const term = termMonths > 0 ? termMonths : 12;

    const expiration = new Date(start);
    expiration.setMonth(expiration.getMonth() + term);

    const expirationMonth = expiration.getMonth();
    const seasonalityScore = RENEWAL_SEASONALITY[expirationMonth] ?? 0.5;

    // Determine renewal timing advice
    let renewalTiming: string;
    let renewalAdvice: string;
    let estimatedRateImpact: string;

    if (seasonalityScore >= 0.8) {
      renewalTiming = 'Peak Season - Expensive Renewal';
      renewalAdvice =
        'Your contract expires during peak rate season when demand is highest. ' +
        'Consider a different contract length to shift renewal to April/May or October. ' +
        'Alternatively, start shopping 60-90 days early to lock in better rates.';
      estimatedRateImpact = '15-40% higher rates than optimal months';
    } else if (seasonalityScore >= 0.5) {
      renewalTiming = 'Moderate Season';
      renewalAdvice =
        'Your contract expires during a moderate-cost period. ' +
        'Shopping 30-60 days before expiration is recommended.';
      estimatedRateImpact = '5-15% higher rates than optimal months';
    } else if (seasonalityScore >= 0.2) {
      renewalTiming = 'Good Season';
      renewalAdvice =
        'Your contract expires during a favorable period for renewal. ' +
        'This is a good time to shop for competitive rates.';
      estimatedRateImpact = 'Near-optimal rates available';
    } else {
      renewalTiming = 'Optimal Season - Best Rates';
      renewalAdvice =
        'Excellent timing! Your contract expires during the best possible ' +
        'renewal period when rates are typically lowest.';
      estimatedRateImpact = 'Optimal rates - best time to shop';
    }

    const riskLevel = getRiskLevel(seasonalityScore);
    const alternatives = this.calculateAlternatives(start, term, seasonalityScore);

    // Calculate time until expiration
    const now = new Date();
    const msUntilExpiration = expiration.getTime() - now.getTime();
    const daysUntilExpiration = Math.max(0, Math.ceil(msUntilExpiration / (1000 * 60 * 60 * 24)));
    const monthsUntilExpiration = Math.max(0, Math.round(daysUntilExpiration / 30));

    return {
      startDate: start,
      expirationDate: expiration,
      termMonths: term,
      expirationMonth,
      expirationMonthName: getMonthName(expirationMonth),
      expirationYear: expiration.getFullYear(),
      renewalTiming,
      renewalAdvice,
      riskLevel,
      seasonalityScore,
      estimatedRateImpact,
      alternativeTerms: alternatives.slice(0, 3),
      daysUntilExpiration,
      monthsUntilExpiration,
      formattedExpiration: expiration.toLocaleDateString('en-US', {
        month: 'long',
        year: 'numeric'
      })
    };
  },

  /**
   * Calculate alternative contract lengths for better timing.
   *
   * @param start - Start date
   * @param term - Current term in months
   * @param seasonalityScore - Current expiration seasonality
   * @returns Alternative contract options sorted by best timing
   */
  calculateAlternatives(start: Date, term: number, seasonalityScore: number): AlternativeTerm[] {
    const alternatives: AlternativeTerm[] = [];

    for (const altTerm of STANDARD_TERMS) {
      if (altTerm === term) continue;

      const altExpiration = new Date(start);
      altExpiration.setMonth(altExpiration.getMonth() + altTerm);
      const altMonth = altExpiration.getMonth();
      const altScore = RENEWAL_SEASONALITY[altMonth] ?? 0.5;

      // Calculate improvement percentage
      const improvement =
        seasonalityScore > 0
          ? ((seasonalityScore - altScore) / seasonalityScore) * 100
          : seasonalityScore < altScore
            ? -100
            : 0;

      // Only suggest if meaningfully better
      if (improvement >= 30 || (altScore <= 0.1 && seasonalityScore > 0.3)) {
        alternatives.push({
          termMonths: altTerm,
          expirationDate: altExpiration,
          expirationMonth: altMonth,
          expirationMonthName: getMonthName(altMonth),
          seasonalityScore: altScore,
          riskLevel: getRiskLevel(altScore),
          improvement: `${Math.round(Math.max(0, improvement))}% better timing`
        });
      }
    }

    // Sort by best timing first
    alternatives.sort((a, b) => a.seasonalityScore - b.seasonalityScore);
    return alternatives;
  },

  /**
   * Get contract expiration analysis for a plan.
   *
   * @param plan - Plan object with term_months
   * @returns Expiration analysis assuming start today
   */
  getContractExpirationForPlan(plan: ElectricityPlan | null | undefined): ContractExpirationResult {
    const term = plan?.term_months ?? 12;
    return this.calculateContractExpiration(new Date(), term);
  },

  /**
   * Get month name from number (0-11).
   * Backwards compatibility wrapper.
   */
  getMonthName
};

export default ContractAnalyzer;

// Named exports
export { ContractAnalyzer, RENEWAL_SEASONALITY };
export type { ContractExpirationResult, AlternativeTerm, RiskLevel };

// Browser compatibility
if (typeof window !== 'undefined') {
  (window as unknown as Record<string, unknown>).ContractAnalyzer = ContractAnalyzer;
}

// CommonJS compatibility
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ContractAnalyzer;
}

// Backwards compatibility
export const calculateContractExpiration =
  ContractAnalyzer.calculateContractExpiration.bind(ContractAnalyzer);
export const getContractExpirationForPlan =
  ContractAnalyzer.getContractExpirationForPlan.bind(ContractAnalyzer);
