/**
 * Plan Ranker Module
 *
 * Ranks electricity plans by annual cost and quality score,
 * with comprehensive penalty system for risky plan features.
 *
 * Quality Scoring System:
 * - Base score: 100 points
 * - Automatic F (0): Non-fixed rates, prepaid, time-of-use
 * - Cost penalty: Up to -40 points (expensive vs best)
 * - Volatility penalty: Up to -25 points (unpredictable costs)
 * - Warning penalty: -5 per warning, max -25 points
 * - Base charge penalty: Up to -5 points (high monthly fees)
 * - Rate consistency bonus: Up to +5 points (stable pricing)
 *
 * VULNERABILITY FIXED: Full type safety for all parameters and returns
 * VULNERABILITY FIXED: Safe array access and null checks throughout
 */

import type { ElectricityPlan, QualityGrade, QualityGradeLetter, TDURate } from '../types';
import { ETFCalculator } from './etf-calculator';

// ============================================================================
// Types
// ============================================================================

/**
 * Risk level for various scoring factors.
 */
type RiskLevel = 'high' | 'medium' | 'low' | 'optimal';

/**
 * Quality score breakdown for transparency.
 */
interface ScoreBreakdown {
  baseScore: number;
  costPenalty: number;
  volatilityPenalty: number;
  warningPenalty: number;
  baseChargePenalty: number;
  expirationPenalty: number;
  automaticF: boolean;
  automaticFReason: string | null;
}

/**
 * Ranked plan with calculated metrics.
 */
interface RankedPlan extends ElectricityPlan {
  annualCost: number;
  averageMonthlyCost: number;
  effectiveRate: number;
  monthlyCosts: readonly number[];
  totalUsage: number;
  volatility: number;
  warnings: string[];
  isGimmick: boolean;
  isNonFixed: boolean;
  is_new_customer_only: boolean;
  qualityScore: number;
  combinedScore: number;
  scoreBreakdown: ScoreBreakdown;
}

/**
 * Ranking options.
 */
interface RankingOptions {
  localTaxRate?: number;
  termLengthPreference?: number | null;
  contractStartDate?: Date | string | null;
  includeNonFixed?: boolean;
}

/**
 * Expiration analysis result (simplified).
 */
interface ExpirationResult {
  expirationMonthName: string;
  riskLevel: RiskLevel;
  alternativeTerms: Array<{ termMonths: number }>;
}

/**
 * Comparison summary between two plans.
 */
interface ComparisonSummary {
  readonly annualSavings: number;
  readonly monthlySavings: number;
  readonly percentSavings: number;
  readonly betterQuality: boolean;
  readonly qualityDiff: number;
  readonly summary: string;
}

/**
 * Ranking position description.
 */
interface RankDescription {
  readonly label: string;
  readonly description: string;
  readonly percentile: number;
}

/**
 * Annual cost calculation result from CostCalculator.
 */
interface AnnualCostResult {
  annualCost: number;
  averageMonthlyCost: number;
  effectiveAnnualRate: number;
  monthlyCosts: readonly number[];
  totalUsage: number;
}

/**
 * Cost calculator interface.
 */
interface CostCalculatorLike {
  calculateAnnualCost(
    usage: readonly number[],
    plan: ElectricityPlan,
    tduRates: TDURate,
    localTaxRate: number
  ): AnnualCostResult;
}

// ============================================================================
// Constants
// ============================================================================

const MONTH_NAMES = [
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
] as const;

const SEASONALITY: Record<number, number> = {
  0: 0.7,
  1: 0.5,
  2: 0.2,
  3: 0.0,
  4: 0.1,
  5: 0.6,
  6: 1.0,
  7: 1.0,
  8: 0.7,
  9: 0.0,
  10: 0.2,
  11: 0.6
};

const NON_FIXED_WARNINGS: Record<string, string> = {
  VARIABLE:
    'VARIABLE RATE: Your price per kWh can change monthly based on market conditions. ' +
    'You may pay significantly more during peak demand periods.',
  INDEXED:
    'INDEXED RATE: Your price is tied to wholesale market prices and will fluctuate. ' +
    'During extreme weather, rates can spike 200-500%.',
  default:
    'NON-FIXED RATE: Your price can change based on market conditions. ' +
    'Fixed-rate plans provide more budget certainty.'
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Safe regex match with capture group extraction.
 */
function matchCapture(text: string, pattern: RegExp, group: number): number {
  const match = text.match(pattern);
  if (match === null) return 0;
  const value = match[group];
  if (value === undefined) return 0;
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

/**
 * Calculate bill credits based on usage.
 */
function calculateBillCredits(usageKwh: number, plan: ElectricityPlan): number {
  if (plan.special_terms == null) return 0;

  const terms = plan.special_terms.toLowerCase();
  const creditMatch = terms.match(/\$(\d+)\s+bill\s+credit/i);
  const rangeMatch =
    terms.match(/between\s+(\d+)-(\d+)\s+kwh/i) ?? terms.match(/exactly\s+(\d+)\s+kwh/i);

  if (creditMatch !== null && rangeMatch !== null) {
    const creditAmount = matchCapture(terms, /\$(\d+)\s+bill\s+credit/i, 1);
    const minKwh = Number.parseFloat(rangeMatch[1] ?? '0');
    const maxKwh = rangeMatch[2] !== undefined ? Number.parseFloat(rangeMatch[2]) : minKwh;

    if (usageKwh >= minKwh && usageKwh <= maxKwh) {
      return creditAmount;
    }
  }

  return 0;
}

// ============================================================================
// Plan Ranker Module
// ============================================================================

const PlanRanker = {
  /**
   * Detect plans explicitly marked as for new customers only.
   */
  isNewCustomerOnly(plan: ElectricityPlan): boolean {
    const text = [
      plan.special_terms,
      plan.promotion_details,
      plan.fees_credits,
      plan.min_usage_fees,
      plan.plan_name
    ]
      .filter((s): s is string => s != null)
      .join(' ')
      .toLowerCase();

    if (text.length === 0) return false;

    const normalized = text.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

    const patterns = [
      /\bnew customers? only\b/,
      /\bfor new customers? only\b/,
      /\bsolo para nuevos clientes\b/,
      /\bsolo nuevos clientes\b/
    ];

    return patterns.some((pattern) => pattern.test(normalized));
  },

  /**
   * Get warning message for non-fixed rate plans.
   */
  getNonFixedWarning(rateType: string): string {
    return NON_FIXED_WARNINGS[rateType] ?? NON_FIXED_WARNINGS.default ?? '';
  },

  /**
   * Rank plans by combined weighted score.
   */
  rankPlans(
    plans: readonly ElectricityPlan[],
    userUsage: readonly number[],
    tduRates: TDURate,
    options: RankingOptions = {},
    CostCalc: CostCalculatorLike | null = null
  ): RankedPlan[] {
    const { localTaxRate = 0, contractStartDate = null, includeNonFixed = true } = options;

    // Get calculator (fallback to global if available)
    const windowCalc =
      typeof window !== 'undefined'
        ? (window as unknown as Record<string, CostCalculatorLike | undefined>).CostCalculator
        : undefined;
    const calculator: CostCalculatorLike | null = CostCalc ?? windowCalc ?? null;

    if (calculator === null) {
      throw new Error('CostCalculator is required for plan ranking');
    }

    // Calculate metrics for all plans
    const rankedPlans: RankedPlan[] = plans.map((plan) => {
      const isNewCustomerOnly = this.isNewCustomerOnly(plan);
      const annualResult = calculator.calculateAnnualCost(userUsage, plan, tduRates, localTaxRate);
      const volatility = this.calculateVolatility(plan, userUsage);
      const warnings = this.identifyWarnings(plan, userUsage, contractStartDate);

      // Add non-fixed rate warning
      if (plan.rate_type !== 'FIXED') {
        warnings.unshift(this.getNonFixedWarning(plan.rate_type));
      }

      return {
        ...plan,
        annualCost: annualResult.annualCost,
        averageMonthlyCost: annualResult.averageMonthlyCost,
        effectiveRate: annualResult.effectiveAnnualRate,
        monthlyCosts: annualResult.monthlyCosts,
        totalUsage: annualResult.totalUsage,
        volatility,
        warnings,
        isGimmick: warnings.length > 0 || volatility > 0.3,
        isNonFixed: plan.rate_type !== 'FIXED',
        is_new_customer_only: isNewCustomerOnly,
        qualityScore: 0,
        combinedScore: 0,
        scoreBreakdown: {
          baseScore: 100,
          costPenalty: 0,
          volatilityPenalty: 0,
          warningPenalty: 0,
          baseChargePenalty: 0,
          expirationPenalty: 0,
          automaticF: false,
          automaticFReason: null
        }
      };
    });

    // Filter if needed
    const filteredPlans = includeNonFixed
      ? rankedPlans
      : rankedPlans.filter((p) => p.rate_type === 'FIXED');

    if (filteredPlans.length === 0) return [];

    // Calculate cost range
    const allCosts = filteredPlans.map((p) => p.annualCost);
    const bestAnnualCost = Math.min(...allCosts);
    const worstAnnualCost = Math.max(...allCosts);
    const costRange = worstAnnualCost - bestAnnualCost || 1;

    // Calculate quality scores
    for (const plan of filteredPlans) {
      plan.qualityScore = this.calculateQualityScore(plan, bestAnnualCost, options);
    }

    // Calculate combined scores
    for (const plan of filteredPlans) {
      const costScore = 100 - ((plan.annualCost - bestAnnualCost) / costRange) * 100;
      const qualityScore = plan.qualityScore;

      const qualityFactor = Math.max(1, qualityScore) / 100;
      let combinedScore = costScore * qualityFactor;

      // Apply tier penalties
      if (qualityScore < 60) {
        combinedScore = qualityScore - 1000 + costScore * 0.1;
      } else if (qualityScore < 70) {
        combinedScore -= 10;
      }

      plan.combinedScore = combinedScore;
    }

    // Sort by combined score (higher is better)
    filteredPlans.sort((a, b) => b.combinedScore - a.combinedScore);

    return filteredPlans;
  },

  /**
   * Calculate quality score for a plan (0-100 scale).
   */
  calculateQualityScore(
    plan: RankedPlan,
    bestAnnualCost: number,
    options: RankingOptions = {}
  ): number {
    const breakdown: ScoreBreakdown = {
      baseScore: 100,
      costPenalty: 0,
      volatilityPenalty: 0,
      warningPenalty: 0,
      baseChargePenalty: 0,
      expirationPenalty: 0,
      automaticF: false,
      automaticFReason: null
    };

    // Automatic F for problematic plan types
    if (plan.rate_type !== 'FIXED') {
      breakdown.automaticF = true;
      breakdown.automaticFReason = `${plan.rate_type} rate - price can change unpredictably`;
      plan.scoreBreakdown = breakdown;
      return 0;
    }
    if (plan.is_prepaid) {
      breakdown.automaticF = true;
      breakdown.automaticFReason = 'Prepaid plan - requires upfront payment';
      plan.scoreBreakdown = breakdown;
      return 0;
    }
    if (plan.is_tou) {
      breakdown.automaticF = true;
      breakdown.automaticFReason = 'Time-of-use plan - rates vary by time of day';
      plan.scoreBreakdown = breakdown;
      return 0;
    }

    let score = 100;

    // Cost penalty (0-40 points)
    if (plan.annualCost > bestAnnualCost && bestAnnualCost > 0) {
      const costDiffPercent = (plan.annualCost - bestAnnualCost) / bestAnnualCost;
      breakdown.costPenalty = Math.min(40, Math.round(costDiffPercent * 100));
      score -= breakdown.costPenalty;
    }

    // Volatility penalty (0-25 points)
    breakdown.volatilityPenalty = Math.round(plan.volatility * 25);
    score -= breakdown.volatilityPenalty;

    // Warning penalty (5 per warning, max 25)
    const warningCount = plan.isNonFixed ? plan.warnings.length - 1 : plan.warnings.length;
    breakdown.warningPenalty = Math.min(25, warningCount * 5);
    score -= breakdown.warningPenalty;

    // Base charge penalty (0-5 points)
    if (plan.base_charge_monthly > 15) {
      breakdown.baseChargePenalty = Math.min(5, Math.round((plan.base_charge_monthly - 15) / 3));
      score -= breakdown.baseChargePenalty;
    }

    // Expiration penalty (0-30 points)
    if (options.contractStartDate != null && plan.term_months > 0) {
      const expiration = this.calculateContractExpiration(
        options.contractStartDate,
        plan.term_months
      );

      if (expiration.riskLevel === 'high') {
        breakdown.expirationPenalty = 30;
        score -= 30;
      } else if (expiration.riskLevel === 'medium') {
        breakdown.expirationPenalty = 15;
        score -= 15;
      }
    }

    plan.scoreBreakdown = breakdown;
    return Math.max(0, Math.min(100, Math.round(score)));
  },

  /**
   * Calculate volatility score for a plan (0-1).
   */
  calculateVolatility(plan: ElectricityPlan, userUsage: readonly number[]): number {
    let volatilityScore = 0;

    if (plan.rate_type !== 'FIXED') {
      volatilityScore += 0.6;
    }

    if (plan.special_terms?.includes('credit') === true) {
      volatilityScore += 0.5;

      let missedMonths = 0;
      for (const usage of userUsage) {
        if (calculateBillCredits(usage, plan) === 0) {
          missedMonths++;
        }
      }
      volatilityScore += (missedMonths / 12) * 0.3;
    }

    if (plan.is_tou) {
      volatilityScore += 0.3;
    }

    // Rate variance
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
  },

  /**
   * Identify warnings for a plan.
   */
  identifyWarnings(
    plan: ElectricityPlan,
    userUsage: readonly number[],
    contractStartDate: Date | string | null = null
  ): string[] {
    const warnings: string[] = [];

    // Bill credit warnings
    if (plan.special_terms?.includes('credit') === true) {
      let missedMonths = 0;
      let missedValue = 0;

      for (const usage of userUsage) {
        if (calculateBillCredits(usage, plan) === 0) {
          missedMonths++;
          const match = plan.special_terms?.match(/\$(\d+)/);
          if (match !== null && match[1] !== undefined) {
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

    // ETF warnings
    if ((plan.early_termination_fee ?? 0) > 0 || plan.special_terms != null) {
      const midpointMonths = Math.floor((plan.term_months ?? 12) / 2);
      const etfResult = ETFCalculator.calculateEarlyTerminationFee(plan, midpointMonths);

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

    if (Math.abs(rate500 - rate1000) / rate1000 > 0.5) {
      warnings.push(
        'Rate varies dramatically with usage. ' +
          `${rate500.toFixed(1)}¢/kWh at low usage vs ${rate1000.toFixed(1)}¢/kWh at 1000 kWh.`
      );
    }

    // Contract expiration timing warning
    if (contractStartDate != null && plan.term_months > 0) {
      const expirationAnalysis = this.calculateContractExpiration(
        contractStartDate,
        plan.term_months
      );

      if (expirationAnalysis.riskLevel === 'high') {
        const altTerm = expirationAnalysis.alternativeTerms[0]?.termMonths ?? 'different';
        warnings.push(
          `Contract expires in ${expirationAnalysis.expirationMonthName} - peak renewal season. ` +
            `Consider ${altTerm}-month term for better timing.`
        );
      }
    }

    return warnings;
  },

  /**
   * Calculate contract expiration (simplified).
   */
  calculateContractExpiration(startDate: Date | string, termMonths: number): ExpirationResult {
    let start = startDate instanceof Date ? startDate : new Date(startDate);
    if (Number.isNaN(start.getTime())) {
      start = new Date();
    }

    const term = termMonths > 0 ? termMonths : 12;
    const expiration = new Date(start);
    expiration.setMonth(expiration.getMonth() + term);

    const expirationMonth = expiration.getMonth();
    const score = SEASONALITY[expirationMonth] ?? 0.5;

    let riskLevel: RiskLevel;
    if (score >= 0.8) riskLevel = 'high';
    else if (score >= 0.5) riskLevel = 'medium';
    else riskLevel = 'low';

    return {
      expirationMonthName: MONTH_NAMES[expirationMonth] ?? '',
      riskLevel,
      alternativeTerms: []
    };
  },

  /**
   * Convert quality score to letter grade.
   */
  getQualityGrade(score: number): QualityGrade {
    if (score >= 90) {
      return {
        letter: 'A' as QualityGradeLetter,
        description: 'Excellent',
        class: 'grade-a',
        tooltip: 'Top-tier plan with competitive pricing and minimal risk factors.'
      };
    } else if (score >= 80) {
      return {
        letter: 'B' as QualityGradeLetter,
        description: 'Good',
        class: 'grade-b',
        tooltip: 'Good overall value with reasonable pricing and acceptable risk level.'
      };
    } else if (score >= 70) {
      return {
        letter: 'C' as QualityGradeLetter,
        description: 'Acceptable',
        class: 'grade-c',
        tooltip: 'Moderate value with some concerns. Review details before enrolling.'
      };
    } else if (score >= 60) {
      return {
        letter: 'D' as QualityGradeLetter,
        description: 'Caution',
        class: 'grade-d',
        tooltip: 'Below-average value with notable drawbacks.'
      };
    } else {
      return {
        letter: 'F' as QualityGradeLetter,
        description: 'Avoid',
        class: 'grade-f',
        tooltip: 'High risk or poor value. Variable rates, prepaid, or TOU plans.'
      };
    }
  },

  /**
   * Get comparison summary between two plans.
   */
  comparePlans(planA: RankedPlan, planB: RankedPlan): ComparisonSummary {
    const annualSavings = planB.annualCost - planA.annualCost;
    const monthlySavings = annualSavings / 12;
    const percentSavings = (annualSavings / planB.annualCost) * 100;

    return {
      annualSavings,
      monthlySavings,
      percentSavings,
      betterQuality: planA.qualityScore > planB.qualityScore,
      qualityDiff: planA.qualityScore - planB.qualityScore,
      summary:
        annualSavings > 0
          ? `Saves $${Math.abs(annualSavings).toFixed(0)}/year vs this plan`
          : annualSavings < 0
            ? `Costs $${Math.abs(annualSavings).toFixed(0)}/year more`
            : 'Same annual cost'
    };
  },

  /**
   * Get ranking position description.
   */
  getRankDescription(rank: number, totalPlans: number): RankDescription {
    const percentile = ((totalPlans - rank + 1) / totalPlans) * 100;

    if (rank === 1) {
      return {
        label: 'Best Value',
        description: 'Lowest cost plan for your usage',
        percentile: 100
      };
    } else if (rank <= 3) {
      return {
        label: 'Top 3',
        description: 'Among the best options available',
        percentile: Math.round(percentile)
      };
    } else if (rank <= 5) {
      return {
        label: 'Top 5',
        description: 'Competitive pricing',
        percentile: Math.round(percentile)
      };
    } else if (percentile >= 75) {
      return {
        label: `Top ${100 - Math.round(percentile)}%`,
        description: 'Above average value',
        percentile: Math.round(percentile)
      };
    } else {
      return {
        label: `Rank ${rank}`,
        description: 'Other options may offer better value',
        percentile: Math.round(percentile)
      };
    }
  },

  /**
   * Generate human-readable score explanation.
   */
  getScoreExplanation(plan: RankedPlan): string {
    const b = plan.scoreBreakdown;
    if (b == null) return 'Score details unavailable';

    if (b.automaticF) {
      return `Automatic F grade: ${b.automaticFReason ?? 'Unknown reason'}`;
    }

    const parts = [`Base: ${b.baseScore}`];
    if (b.costPenalty > 0) parts.push(`Cost: -${b.costPenalty}`);
    if (b.volatilityPenalty > 0) parts.push(`Volatility: -${b.volatilityPenalty}`);
    if (b.warningPenalty > 0) parts.push(`Warnings: -${b.warningPenalty}`);
    if (b.baseChargePenalty > 0) parts.push(`Base fee: -${b.baseChargePenalty}`);
    if (b.expirationPenalty > 0) parts.push(`Expiration risk: -${b.expirationPenalty}`);

    return parts.join(' | ');
  }
};

export default PlanRanker;

// Named exports
export { PlanRanker };
export type { RankedPlan, ScoreBreakdown, RankingOptions, ComparisonSummary, RankDescription };

// Browser compatibility
if (typeof window !== 'undefined') {
  (window as unknown as Record<string, unknown>).PlanRanker = PlanRanker;
}

// CommonJS compatibility
if (typeof module !== 'undefined' && module.exports) {
  module.exports = PlanRanker;
}

// Backwards compatibility exports
export const rankPlans = PlanRanker.rankPlans.bind(PlanRanker);
export const getQualityGrade = PlanRanker.getQualityGrade.bind(PlanRanker);
export const getScoreExplanation = PlanRanker.getScoreExplanation.bind(PlanRanker);
export const comparePlans = PlanRanker.comparePlans.bind(PlanRanker);
export const getRankDescription = PlanRanker.getRankDescription.bind(PlanRanker);
