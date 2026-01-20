/**
 * Texas Electricity Cost Calculator
 *
 * Facade module providing unified exports for all calculation functions.
 * This module re-exports functions from specialized TypeScript modules
 * to maintain backwards compatibility with existing code.
 *
 * NOTE: This is a facade for the migrated TypeScript modules.
 * All actual logic is in the /modules subdirectory.
 */

// ==============================
// Re-exports from TypeScript modules
// ==============================

// Cache management
export { CacheManager } from './modules/cache';
// Contract expiration analysis
export {
  ContractAnalyzer,
  calculateContractExpiration,
  getContractExpirationForPlan
} from './modules/contract-analyzer';
// Cost calculation
export {
  CostCalculator,
  calculateAnnualCost,
  calculateMonthlyCost
} from './modules/cost-calculator';
// Data loading
export { DataLoader } from './modules/data-loader';
// ETF calculation
export {
  calculateEarlyTerminationFee,
  ETFCalculator,
  getETFDisplayInfo
} from './modules/etf-calculator';

// Formatting utilities
export { formatCurrency, formatRate, getMonthName, MONTH_NAMES } from './modules/formatters';
// Plan ranking
export {
  comparePlans,
  getQualityGrade,
  getRankDescription,
  getScoreExplanation,
  PlanRanker,
  rankPlans
} from './modules/plan-ranker';
// Provider name formatting
export { formatProviderName, ProviderFormatter } from './modules/provider-formatter';
// Usage estimation
export { estimateUsagePattern, UsageEstimator } from './modules/usage-estimator';

// ==============================
// Types re-exports
// ==============================

export type {
  AnnualCostResult,
  ContractExpiration,
  ContractRecommendation,
  ElectricityPlan,
  ETFCalculationResult,
  MonthlyCostBreakdown,
  MonthlyCostResult,
  MonthlyUsagePattern,
  PlansData,
  QualityGrade,
  QualityGradeLetter,
  RankedPlan,
  TDURate,
  TDURatesData
} from './types';

// ==============================
// Default export for backwards compatibility
// ==============================

import { ContractAnalyzer } from './modules/contract-analyzer';
import { CostCalculator } from './modules/cost-calculator';
import { ETFCalculator } from './modules/etf-calculator';
import * as Formatters from './modules/formatters';
import { PlanRanker } from './modules/plan-ranker';
import { UsageEstimator } from './modules/usage-estimator';

/**
 * Unified Calculator object for backwards compatibility.
 */
const Calculator = {
  // Cost calculations
  calculateMonthlyCost: CostCalculator.calculateMonthlyCost.bind(CostCalculator),
  calculateAnnualCost: CostCalculator.calculateAnnualCost.bind(CostCalculator),
  interpolateRate: CostCalculator.interpolateRate.bind(CostCalculator),
  calculateBillCredits: CostCalculator.calculateBillCredits.bind(CostCalculator),

  // ETF calculations
  calculateEarlyTerminationFee: ETFCalculator.calculateEarlyTerminationFee.bind(ETFCalculator),
  getETFDisplayInfo: ETFCalculator.getETFDisplayInfo.bind(ETFCalculator),

  // Contract expiration
  calculateContractExpiration: ContractAnalyzer.calculateContractExpiration.bind(ContractAnalyzer),
  getContractExpirationForPlan:
    ContractAnalyzer.getContractExpirationForPlan.bind(ContractAnalyzer),

  // Plan ranking
  rankPlans: PlanRanker.rankPlans.bind(PlanRanker),
  getQualityGrade: PlanRanker.getQualityGrade.bind(PlanRanker),
  getScoreExplanation: PlanRanker.getScoreExplanation.bind(PlanRanker),
  comparePlans: PlanRanker.comparePlans.bind(PlanRanker),
  getRankDescription: PlanRanker.getRankDescription.bind(PlanRanker),

  // Usage estimation
  estimateUsagePattern: UsageEstimator.estimateUsagePattern.bind(UsageEstimator),
  estimateUsageFromHomeSize: UsageEstimator.estimateUsageFromHomeSize.bind(UsageEstimator),

  // Formatting
  formatCurrency: Formatters.formatCurrency,
  formatRate: Formatters.formatRate,
  getMonthName: Formatters.getMonthName
};

export default Calculator;

// Browser compatibility
if (typeof window !== 'undefined') {
  const w = window as unknown as Record<string, unknown>;
  w.Calculator = Calculator;
  w.CostCalculator = CostCalculator;
  w.ETFCalculator = ETFCalculator;
  w.ContractAnalyzer = ContractAnalyzer;
  w.PlanRanker = PlanRanker;
}

// CommonJS compatibility
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Calculator;
}
