/**
 * ETF Calculator Module
 *
 * Calculates early termination fees, properly handling
 * per-month-remaining fee structures.
 *
 * VULNERABILITY FIXED: Full type safety for all parameters and returns
 * VULNERABILITY FIXED: Explicit null checks throughout
 * VULNERABILITY FIXED: Type-safe regex result handling
 */

import type { ElectricityPlan, ETFStructure } from '../types';

/**
 * Extended ETF structure types for calculation results.
 */
type ExtendedETFStructure =
  | ETFStructure
  | 'per-month'
  | 'per-month-inferred'
  | 'none'
  | 'none-conditional';

/**
 * Normalized ETF details from plan data.
 */
interface NormalizedETFDetails {
  readonly structure: string;
  readonly perMonthRate: number;
  readonly flatFee: number;
  readonly source: string | null;
}

/**
 * Result of ETF calculation.
 */
interface ETFCalcResult {
  readonly total: number;
  readonly structure: ExtendedETFStructure;
  readonly perMonthRate: number;
  readonly monthsRemaining: number;
}

/**
 * Display information for ETF.
 */
interface ETFDisplayInfo extends ETFCalcResult {
  readonly displayText: string;
  readonly exampleTotal: number;
  readonly exampleMonths: number;
  readonly needsConfirmation: boolean;
}

/**
 * Currency formatter singleton.
 */
const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD'
});

/**
 * Regex patterns for detecting no-fee language.
 */
const NO_FEE_PATTERNS: readonly RegExp[] = [
  /no\s+(?:early\s+)?(?:termination|cancellation)\s+fee/i,
  /no\s+cancel(?:lation)?\s+fee/i,
  /no\s+etf\b/i,
  /without\s+(?:an?\s+)?early\s+termination\s+fee/i,
  /(?:termination|cancellation)\s+fee\s*(?:is|of)?\s*\$?0\b/i,
  /fee\s+waived/i,
  /waiv(?:e|ed)\s+(?:the\s+)?(?:termination|cancellation)\s+fee/i
] as const;

/**
 * Regex patterns for conditional no-fee language.
 */
const CONDITIONAL_NO_FEE_PATTERNS: readonly RegExp[] = [
  /no\s+(?:early\s+)?(?:termination|cancellation)\s+fee\s+if\s+you\s+move/i,
  /waiv(?:e|ed)\s+(?:the\s+)?(?:termination|cancellation)\s+fee\s+if\s+you\s+move/i,
  /no\s+fee\s+for\s+moving/i,
  /fee\s+waived\s+for\s+moving/i
] as const;

/**
 * Regex patterns for unspecified fee language.
 */
const UNSPECIFIED_FEE_PATTERNS: readonly RegExp[] = [
  /early\s+termination\s+fee\s+applies/i,
  /cancellation\s+fee\s+applies/i,
  /termination\s+fee\s+applies/i,
  /early\s+termination\s+fee\s+may\s+apply/i,
  /cancellation\s+fee\s+may\s+apply/i,
  /termination\s+fee\s+may\s+apply/i,
  /early\s+termination\s+fee\s+will\s+apply/i,
  /cancellation\s+fee\s+will\s+apply/i
] as const;

/**
 * Safe regex test against patterns array.
 */
function matchesAnyPattern(text: string, patterns: readonly RegExp[]): boolean {
  return patterns.some((pattern) => pattern.test(text));
}

/**
 * Safe regex match that returns null instead of undefined.
 */
function safeMatch(text: string, pattern: RegExp): RegExpMatchArray | null {
  return text.match(pattern);
}

/**
 * Parse a numeric value from regex capture group.
 */
function parseCapture(match: RegExpMatchArray | null, index: number): number {
  if (match === null) return 0;
  const value = match[index];
  if (value === undefined) return 0;
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

/**
 * ETF Calculator singleton.
 */
const ETFCalculator = {
  /**
   * Normalize ETF details from various plan formats.
   *
   * @param plan - Plan object with ETF info
   * @returns Normalized details or null
   */
  normalizeEtfDetails(plan: ElectricityPlan | null | undefined): NormalizedETFDetails | null {
    if (plan == null) return null;

    let details = plan.etf_details ?? null;
    if (details === null) return null;

    // Handle string JSON (shouldn't happen with proper types, but defensive)
    if (typeof details === 'string') {
      try {
        details = JSON.parse(details) as typeof details;
      } catch {
        return null;
      }
    }

    if (details == null || typeof details !== 'object') return null;

    const structure = (details.structure ?? '').toLowerCase();
    if (!structure) return null;

    const baseAmount = details.base_amount ?? 0;

    return {
      structure,
      perMonthRate: structure === 'per-month-remaining' ? baseAmount : 0,
      flatFee: structure === 'flat' ? baseAmount : 0,
      source: details.source ?? null
    };
  },

  /**
   * Calculate early termination fee based on remaining contract months.
   *
   * Properly calculates ETF for contracts with per-month-remaining fees.
   * Many plans charge $10-$20 per month remaining instead of a flat fee.
   *
   * @param plan - Plan object
   * @param monthsRemaining - Months remaining in contract
   * @returns ETF calculation result with total and structure type
   */
  calculateEarlyTerminationFee(plan: ElectricityPlan, monthsRemaining: number): ETFCalcResult {
    let etfValue = 0;
    let etfStructure: ExtendedETFStructure = 'flat';
    let perMonthRate = 0;

    // Check normalized ETF details first
    const etfDetails = this.normalizeEtfDetails(plan);
    if (etfDetails !== null) {
      if (etfDetails.structure === 'none') {
        return { total: 0, structure: 'none', perMonthRate: 0, monthsRemaining };
      }

      if (etfDetails.structure === 'unknown') {
        return { total: 0, structure: 'unknown', perMonthRate: 0, monthsRemaining };
      }

      if (etfDetails.structure === 'flat' && Number.isFinite(etfDetails.flatFee)) {
        return { total: etfDetails.flatFee, structure: 'flat', perMonthRate: 0, monthsRemaining };
      }

      if (
        (etfDetails.structure === 'per-month' || etfDetails.structure === 'per-month-remaining') &&
        Number.isFinite(etfDetails.perMonthRate)
      ) {
        return {
          total: etfDetails.perMonthRate * monthsRemaining,
          structure: 'per-month',
          perMonthRate: etfDetails.perMonthRate,
          monthsRemaining
        };
      }
    }

    // Build terms text from all relevant fields
    const termsSources = [
      plan.special_terms,
      plan.fees_credits,
      plan.promotion_details,
      plan.min_usage_fees
    ]
      .filter((s): s is string => s != null)
      .join(' | ');

    let hasNoFeeLanguage = false;
    let isConditionalNoFee = false;
    let hasUnspecifiedFeeLanguage = false;

    if (termsSources.length > 0) {
      const terms = termsSources.toLowerCase().replace(/\s+/g, ' ').trim();

      hasNoFeeLanguage = matchesAnyPattern(terms, NO_FEE_PATTERNS);
      isConditionalNoFee = matchesAnyPattern(terms, CONDITIONAL_NO_FEE_PATTERNS);
      hasUnspecifiedFeeLanguage = matchesAnyPattern(terms, UNSPECIFIED_FEE_PATTERNS);

      // Pattern 1: "$X per month remaining"
      const perMonthMatch = safeMatch(
        terms,
        /\$(\d+(?:\.\d{2})?)\s*(?:per|\/)\s*(?:each\s+)?(?:month|mo)(?:nth)?\s*(?:remaining|left|of\s+(?:the\s+)?(?:contract|term))/i
      );
      if (perMonthMatch !== null) {
        perMonthRate = parseCapture(perMonthMatch, 1);
        if (perMonthRate > 0) etfStructure = 'per-month';
      }

      // Pattern 2: "$X times remaining months"
      if (perMonthRate === 0) {
        const timesMatch = safeMatch(
          terms,
          /\$(\d+(?:\.\d{2})?)\s*(?:times|x|×|\*)\s*(?:the\s+)?(?:number\s+of\s+)?(?:remaining\s+)?months?\s*(?:remaining|left)?/i
        );
        if (timesMatch !== null) {
          perMonthRate = parseCapture(timesMatch, 1);
          if (perMonthRate > 0) etfStructure = 'per-month';
        }
      }

      // Pattern 3: "$X multiplied by months remaining"
      if (perMonthRate === 0) {
        const multipliedMatch = safeMatch(
          terms,
          /\$(\d+(?:\.\d{2})?)\s+multiplied\s+by\s+(?:the\s+)?(?:number\s+of\s+)?months?\s+remaining/i
        );
        if (multipliedMatch !== null) {
          perMonthRate = parseCapture(multipliedMatch, 1);
          if (perMonthRate > 0) etfStructure = 'per-month';
        }
      }

      // Pattern 4: Detect per-month language with plan's ETF value
      if (
        perMonthRate === 0 &&
        (terms.includes('per remaining month') ||
          terms.includes('per month remaining') ||
          terms.includes('each remaining month'))
      ) {
        const planEtf = plan.early_termination_fee ?? 0;
        if (planEtf > 0 && planEtf <= 50) {
          perMonthRate = planEtf;
          etfStructure = 'per-month';
        }
      }

      // Fixed fee parsing fallback
      if (perMonthRate === 0 && plan.early_termination_fee == null) {
        const fixedFeeMatch = safeMatch(
          terms,
          /(?:early\s+termination|termination|cancellation)\s+(?:fee|charge)\s*(?:is|of|:)?\s*\$?(\d+(?:\.\d{2})?)/i
        );
        if (fixedFeeMatch !== null) {
          etfValue = parseCapture(fixedFeeMatch, 1);
          etfStructure = 'flat';
        }
      }
    }

    // Handle no-fee language
    if (hasNoFeeLanguage) {
      return {
        total: 0,
        structure: isConditionalNoFee ? 'none-conditional' : 'none',
        perMonthRate: 0,
        monthsRemaining
      };
    }

    // Per-month calculation
    if (etfStructure === 'per-month' && perMonthRate > 0) {
      return {
        total: perMonthRate * monthsRemaining,
        structure: 'per-month',
        perMonthRate,
        monthsRemaining
      };
    }

    // Fallback to plan's ETF value
    const numericETF = plan.early_termination_fee ?? 0;
    const hasExplicitETFValue = Number.isFinite(numericETF) && numericETF > 0;

    if (!hasExplicitETFValue && etfValue === 0) {
      if (hasUnspecifiedFeeLanguage) {
        return { total: 0, structure: 'unknown', perMonthRate: 0, monthsRemaining };
      }

      // Unknown for longer contracts without explicit values
      if ((plan.term_months ?? 0) >= 2) {
        return { total: 0, structure: 'unknown', perMonthRate: 0, monthsRemaining };
      }

      return { total: 0, structure: 'none', perMonthRate: 0, monthsRemaining };
    }

    if (etfValue === 0) {
      etfValue = numericETF;
    }

    // Prepaid plans use flat fees
    if (etfValue > 0 && plan.is_prepaid) {
      return { total: etfValue, structure: 'flat', perMonthRate: 0, monthsRemaining };
    }

    // Small ETFs on long contracts are suspicious
    if (etfValue <= 50 && (plan.term_months ?? 0) >= 12) {
      return { total: 0, structure: 'unknown', perMonthRate: 0, monthsRemaining };
    }

    return { total: etfValue, structure: 'flat', perMonthRate: 0, monthsRemaining };
  },

  /**
   * Get the display value for early termination fee.
   *
   * @param plan - Plan object
   * @param monthsRemaining - Optional, defaults to contract midpoint
   * @returns Display information for ETF
   */
  getETFDisplayInfo(plan: ElectricityPlan, monthsRemaining: number | null = null): ETFDisplayInfo {
    const months = monthsRemaining ?? Math.floor((plan.term_months ?? 12) / 2);
    const result = this.calculateEarlyTerminationFee(plan, months);

    let displayText: string;
    let needsConfirmation = false;

    if (result.structure === 'none' || result.structure === 'none-conditional') {
      // Check for unparsed fee language
      if (plan.special_terms != null && /cancel|terminat|early|etf|fee/i.test(plan.special_terms)) {
        displayText = 'See EFL';
        needsConfirmation = true;
      } else {
        displayText = 'No fee';
      }
    } else if (result.structure === 'unknown') {
      displayText = 'See EFL';
      needsConfirmation = true;
    } else if (result.structure === 'flat') {
      displayText = currencyFormatter.format(result.total);
    } else if (result.structure === 'per-month-inferred') {
      displayText = `$${result.perMonthRate}/mo*`;
      needsConfirmation = true;
    } else {
      displayText = `$${result.perMonthRate}/mo remaining`;
    }

    return {
      ...result,
      displayText,
      exampleTotal: result.total,
      exampleMonths: months,
      needsConfirmation
    };
  },

  /**
   * Format currency amount.
   */
  formatCurrency(amount: number): string {
    return currencyFormatter.format(amount);
  }
};

export default ETFCalculator;

// Named exports
export { ETFCalculator };
export type { ETFCalcResult, ETFDisplayInfo, NormalizedETFDetails, ExtendedETFStructure };

// Browser compatibility
if (typeof window !== 'undefined') {
  (window as unknown as Record<string, unknown>)['ETFCalculator'] = ETFCalculator;
}

// CommonJS compatibility
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ETFCalculator;
}

// Backwards compatibility
export const calculateEarlyTerminationFee =
  ETFCalculator.calculateEarlyTerminationFee.bind(ETFCalculator);
export const getETFDisplayInfo = ETFCalculator.getETFDisplayInfo.bind(ETFCalculator);
