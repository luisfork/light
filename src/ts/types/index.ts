/**
 * Type Definitions for Light Electricity Calculator
 *
 * Central type definitions for all data structures used across the application.
 * These types mirror the JSON schema in data/plans.json and data/tdu-rates.json.
 */

// ==============================
// Early Termination Fee Types
// ==============================

/**
 * Structure indicating how the ETF is calculated.
 * - 'flat': Single fixed fee regardless of remaining term
 * - 'per-month-remaining': Fee multiplied by months remaining in contract
 * - 'unknown': ETF structure could not be determined, user should check EFL
 */
export type ETFStructure = 'flat' | 'per-month-remaining' | 'unknown';

/**
 * Source of ETF information.
 * - 'efl': Parsed from Electricity Facts Label PDF
 * - 'text-parsing': Inferred from special_terms or promotion_details
 * - 'legacy': Fallback to early_termination_fee field only
 */
export type ETFSource = 'efl' | 'text-parsing' | 'legacy';

/**
 * Detailed early termination fee information.
 * Used when EFL parsing provides structured ETF data.
 */
export interface ETFDetails {
  readonly structure: ETFStructure;
  readonly base_amount: number | null;
  readonly source: ETFSource;
}

// ==============================
// Electricity Plan Types
// ==============================

/**
 * Valid rate types for electricity plans.
 * - FIXED: Rate locked for contract duration
 * - VARIABLE: Rate changes monthly based on market
 * - INDEXED: Rate tied to an index (e.g., natural gas prices)
 */
export type RateType = 'FIXED' | 'VARIABLE' | 'INDEXED';

/**
 * Raw electricity plan data as loaded from plans.json.
 * All fields match the Power to Choose API response schema.
 */
export interface ElectricityPlan {
  readonly plan_id: string;
  readonly plan_name: string;
  readonly rep_name: string;
  readonly tdu_area: string;
  readonly rate_type: RateType;
  readonly term_months: number;
  readonly price_kwh_500: number;
  readonly price_kwh_1000: number;
  readonly price_kwh_2000: number;
  readonly base_charge_monthly: number;
  readonly early_termination_fee: number | null;
  readonly renewable_pct: number;
  readonly is_prepaid: boolean;
  readonly is_tou: boolean;
  readonly special_terms: string | null;
  readonly promotion_details: string | null;
  readonly fees_credits: string | null;
  readonly min_usage_fees: string | null;
  readonly language: string;
  readonly efl_url: string | null;
  readonly enrollment_url: string | null;
  readonly terms_url: string | null;
  readonly etf_details?: ETFDetails;
  // Deduplication flags (added by API module)
  readonly is_spanish_only?: boolean;
}

/**
 * Plans data file structure (data/plans.json).
 */
export interface PlansData {
  plans: ElectricityPlan[];
  readonly last_updated: string;
  readonly data_source: string;
  total_plans: number;
  readonly disclaimer: string;
}

// ==============================
// TDU (Transmission and Distribution Utility) Types
// ==============================

/**
 * ZIP code range for TDU service area mapping.
 * Tuple of [min, max] ZIP code values.
 */
export type ZipCodeRange = readonly [number, number];

/**
 * TDU rate information for a specific utility company.
 */
export interface TDURate {
  readonly code: string;
  readonly name: string;
  readonly service_area: string;
  readonly monthly_base_charge: number;
  readonly per_kwh_rate: number;
  readonly effective_date: string;
  readonly zip_codes: readonly ZipCodeRange[];
  readonly notes?: string;
}

/**
 * TDU rates data file structure (data/tdu-rates.json).
 */
export interface TDURatesData {
  readonly tdus: readonly TDURate[];
  readonly last_updated: string;
  readonly next_update: string;
}

/**
 * Local tax information for a ZIP code.
 */
export interface TaxInfo {
  readonly rate: number;
  readonly city?: string;
  readonly region?: string;
  readonly tdu: string | null;
  readonly deregulated: boolean;
}

/**
 * City tax data entry.
 */
export interface CityTaxData {
  readonly rate: number;
  readonly zip_codes: readonly string[];
  readonly tdu: string | null;
  readonly deregulated: boolean;
}

/**
 * ZIP code range data entry.
 */
export interface ZipCodeRangeData {
  readonly rate: number;
  readonly region: string;
  readonly tdu: string | null;
}

/**
 * Local taxes data file structure (data/local-taxes.json).
 */
export interface LocalTaxesData {
  readonly last_updated: string;
  readonly state_sales_tax: number;
  readonly default_local_rate: number;
  readonly zip_code_ranges: Record<string, ZipCodeRangeData>;
  readonly major_cities: Record<string, CityTaxData>;
}

// ==============================
// Cost Calculation Types
// ==============================

/**
 * Breakdown of monthly electricity cost components.
 */
export interface MonthlyCostBreakdown {
  readonly energyCost: number;
  readonly baseCost: number;
  readonly tduCost: number;
  readonly credits: number;
  readonly tax: number;
  readonly effectiveRate: number; // cents per kWh
}

/**
 * Result of monthly cost calculation.
 */
export interface MonthlyCostResult {
  readonly total: number;
  readonly breakdown: MonthlyCostBreakdown;
}

/**
 * Result of annual cost calculation.
 */
export interface AnnualCostResult {
  readonly annualCost: number;
  readonly monthlyCosts: readonly number[];
  readonly averageMonthlyCost: number;
  readonly totalUsage: number;
  readonly effectiveAnnualRate: number; // cents per kWh
}

/**
 * 12-month usage pattern tuple.
 * Index 0 = January, Index 11 = December.
 */
export type MonthlyUsagePattern = readonly [
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number
];

// ==============================
// Quality Scoring Types
// ==============================

/**
 * Letter grades for plan quality.
 */
export type QualityGradeLetter = 'A' | 'B' | 'C' | 'D' | 'F';

/**
 * Quality grade with display information.
 */
export interface QualityGrade {
  readonly letter: QualityGradeLetter;
  readonly description: string;
  readonly class: string;
  readonly tooltip: string;
}

/**
 * Breakdown of quality score components.
 * All penalties are negative values, bonuses are positive.
 */
export interface ScoreBreakdown {
  readonly base: number;
  readonly costPenalty: number;
  readonly volatilityPenalty: number;
  readonly warningPenalty: number;
  readonly baseChargePenalty: number;
  readonly expirationPenalty: number;
  readonly consistencyBonus: number;
}

/**
 * Plan with calculated ranking metrics.
 * Extends ElectricityPlan with computed fields.
 */
export interface RankedPlan extends ElectricityPlan {
  readonly annualCost: number;
  readonly qualityScore: number;
  readonly qualityGrade: QualityGrade;
  readonly warnings: readonly string[];
  readonly rank: number;
  readonly scoreBreakdown: ScoreBreakdown;
  readonly combinedScore: number;
  readonly effectiveRate: number;
}

// ==============================
// Contract Expiration Types
// ==============================

/**
 * Contract expiration analysis result.
 */
export interface ContractExpiration {
  readonly expirationDate: Date;
  readonly expirationMonth: number;
  readonly expirationMonthName: string;
  readonly seasonalityScore: number;
  readonly seasonalityRisk: 'low' | 'medium' | 'high';
  readonly recommendations: readonly ContractRecommendation[];
}

/**
 * Alternative contract length recommendation.
 */
export interface ContractRecommendation {
  readonly termMonths: number;
  readonly expirationDate: Date;
  readonly expirationMonthName: string;
  readonly seasonalityScore: number;
  readonly improvement: string;
}

// ==============================
// ETF Calculation Types
// ==============================

/**
 * Result of ETF calculation.
 */
export interface ETFCalculationResult {
  readonly total: number;
  readonly structure: ETFStructure;
  readonly baseFee: number;
  readonly monthsRemaining: number;
  readonly isEstimate: boolean;
  readonly displayValue: string;
  readonly tooltip: string;
}

// ==============================
// UI State Types
// ==============================

/**
 * Usage input method selection.
 */
export type UsageMethod = 'estimate' | 'average' | 'detailed';

/**
 * Main UI application state.
 */
export interface UIState {
  zipCode: string | null;
  tdu: TDURate | null;
  usageMethod: UsageMethod;
  homeSize: string | null;
  avgUsage: number | null;
  monthlyUsage: number[];
  rankedPlans: RankedPlan[] | null;
  isLoading: boolean;
  lastCalculation: Date | null;
  localTaxRate: number;
  taxInfo: TaxInfo | null;
}

/**
 * Cached UI element references.
 */
export interface UIElements {
  readonly zipInput: HTMLInputElement | null;
  readonly zipStatus: HTMLElement | null;
  readonly tduDisplay: HTMLElement | null;
  readonly homeSizeSelect: HTMLSelectElement | null;
  readonly avgKwhInput: HTMLInputElement | null;
  readonly monthInputs: readonly HTMLInputElement[];
  readonly resultsSection: HTMLElement | null;
  readonly topPlansContainer: HTMLElement | null;
  readonly comparisonTable: HTMLTableElement | null;
  readonly comparisonBody: HTMLTableSectionElement | null;
}

// ==============================
// Cache Types
// ==============================

/**
 * Generic cache entry with timestamp.
 */
export interface CacheEntry<T> {
  data: T | null;
  timestamp: number;
}

/**
 * Cache key identifiers.
 */
export type CacheKey = 'plans' | 'tduRates' | 'localTaxes';

/**
 * Cache configuration options.
 */
export interface CacheConfig {
  readonly maxAge: number;
  readonly retryCount: number;
  readonly retryDelay: number;
}

// ==============================
// Logging Types
// ==============================

/**
 * Log severity levels.
 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

/**
 * Structured log entry.
 */
export interface LogEntry {
  readonly level: LogLevel;
  readonly message: string;
  readonly timestamp: string;
  readonly context?: Record<string, unknown>;
}

// ==============================
// Deduplication Types
// ==============================

/**
 * Result of plan deduplication process.
 */
export interface DeduplicationResult {
  readonly deduplicated: readonly ElectricityPlan[];
  readonly duplicateCount: number;
  readonly originalCount: number;
  readonly orphanedEnglishCount: number;
  readonly orphanedSpanishCount: number;
}

/**
 * Plan fingerprint for detecting duplicates.
 * Based on 11 numeric/boolean fields only.
 */
export interface PlanFingerprint {
  readonly rep_name: string;
  readonly tdu_area: string;
  readonly rate_type: string;
  readonly p500: number;
  readonly p1000: number;
  readonly p2000: number;
  readonly term: number;
  readonly etf: number;
  readonly base: number;
  readonly renewable: number;
  readonly prepaid: boolean;
  readonly tou: boolean;
}
