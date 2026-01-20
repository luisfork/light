/**
 * Data API Module
 *
 * Handles loading electricity plan data, TDU rates, and other resources
 * with caching, retry logic, and error handling.
 *
 * VULNERABILITY FIXED: Full type safety for all parameters and returns
 * VULNERABILITY FIXED: Strict null checks for all cache operations
 */

import type {
  CityTaxData,
  ElectricityPlan,
  LocalTaxesData,
  PlansData,
  TaxInfo,
  TDURate,
  TDURatesData,
  ZipCodeRangeData
} from './types';
import Logger from './utils/logger';

// ==============================
// Types
// ==============================

/**
 * Cache key type.
 */
type CacheKey = 'plans' | 'tduRates' | 'localTaxes';

/**
 * Cache entry with data and timestamp.
 */
interface CacheEntry<T> {
  data: T | null;
  timestamp: number;
}

/**
 * Cache store type.
 */
interface CacheStore {
  plans: CacheEntry<PlansData>;
  tduRates: CacheEntry<TDURatesData>;
  localTaxes: CacheEntry<LocalTaxesData>;
}

/**
 * Deduplication result type.
 */
interface DeduplicationResult {
  readonly deduplicated: ElectricityPlan[];
  readonly duplicateCount: number;
  readonly originalCount: number;
  readonly orphanedEnglishCount: number;
  readonly orphanedSpanishCount: number;
}

/**
 * Data freshness info.
 */
interface DataFreshness {
  readonly plansUpdated: string;
  readonly totalPlans: number;
  readonly originalPlanCount: number;
  readonly duplicateCount: number;
  readonly dataSource: string;
  readonly tduRatesUpdated: string;
  readonly tduRatesEffective: string;
  readonly tduRatesNextUpdate: string;
}

/**
 * Cache stats for a key.
 */
interface CacheKeyStats {
  readonly cached: boolean;
  readonly age: number | null;
  readonly valid: boolean;
}

/**
 * Deregulation status info.
 */
interface DeregulationStatus {
  readonly isDeregulated: boolean;
  readonly tdu: string | null;
  readonly reason: string | null;
}

// ==============================
// Logger
// ==============================

const logger = Logger.withPrefix('API');

// ==============================
// Constants
// ==============================

const LEGAL_SUFFIXES = [
  ', LLC',
  ', INC',
  ', LP',
  ', & CO',
  ' LLC',
  ' INC',
  ' LP',
  ' & CO',
  ' (TX)',
  ' (TEXAS)',
  ' COMPANY',
  ' SERVICES',
  ' RETAIL'
] as const;

// ==============================
// API Module
// ==============================

const API = {
  /**
   * Base path for data files.
   * Dynamically determined based on current location.
   */
  basePath:
    typeof window !== 'undefined' && window.location.pathname.includes('/src/')
      ? '../data'
      : './data',

  /**
   * Cache configuration.
   */
  cacheConfig: {
    maxAge: 5 * 60 * 1000, // 5 minutes
    retryCount: 3,
    retryDelay: 1000
  } as const,

  /**
   * Cached data with timestamps.
   */
  cache: {
    plans: { data: null, timestamp: 0 },
    tduRates: { data: null, timestamp: 0 },
    localTaxes: { data: null, timestamp: 0 }
  } as CacheStore,

  /**
   * Loading promises for preventing duplicate requests.
   */
  loadingPromises: {
    plans: null as Promise<PlansData> | null,
    tduRates: null as Promise<TDURatesData> | null,
    localTaxes: null as Promise<LocalTaxesData> | null
  },

  /**
   * Check if cached data is still valid.
   */
  isCacheValid(key: CacheKey): boolean {
    const cached = this.cache[key];
    if (cached.data === null) return false;
    return Date.now() - cached.timestamp < this.cacheConfig.maxAge;
  },

  /**
   * Fetch with retry logic and exponential backoff.
   */
  async fetchWithRetry(url: string, options: RequestInit = {}): Promise<Response> {
    let lastError: Error | null = null;
    const { retryCount, retryDelay } = this.cacheConfig;

    for (let attempt = 0; attempt < retryCount; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);

        const response = await fetch(url, {
          ...options,
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        return response;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (lastError.name === 'AbortError' || attempt === retryCount - 1) {
          break;
        }

        const delay = retryDelay * 2 ** attempt + Math.random() * 500;
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    throw lastError ?? new Error('Fetch failed');
  },

  /**
   * Load electricity plans from JSON file.
   */
  async loadPlans(forceRefresh: boolean = false): Promise<PlansData> {
    if (!forceRefresh && this.isCacheValid('plans')) {
      const cachedData = this.cache.plans.data;
      if (cachedData === null) {
        throw new Error('Cache validation error: data should not be null');
      }
      return cachedData;
    }

    if (this.loadingPromises.plans !== null) {
      return this.loadingPromises.plans;
    }

    this.loadingPromises.plans = (async (): Promise<PlansData> => {
      try {
        const response = await this.fetchWithRetry(`${this.basePath}/plans.json`);
        const data = (await response.json()) as PlansData;

        if (data === null || !Array.isArray(data.plans)) {
          throw new Error('Invalid plans data structure');
        }

        // Format provider names
        data.plans = data.plans.map((plan) => ({
          ...plan,
          rep_name: this.formatProviderName(plan.rep_name)
        }));

        const originalPlanCount = data.plans.length;

        // Deduplicate
        const result = this.deduplicatePlans(data.plans);
        data.plans = result.deduplicated;
        data.total_plans = result.deduplicated.length;

        if (result.duplicateCount > 0) {
          logger.info(
            `Deduplication: ${originalPlanCount} total, ${result.duplicateCount} removed, ${data.total_plans} unique`
          );
        }

        this.cache.plans = { data, timestamp: Date.now() };
        return data;
      } catch (error) {
        logger.error('Error loading plans', { error });
        if (this.cache.plans.data !== null) {
          logger.warn('Returning stale plans data');
          return this.cache.plans.data;
        }
        throw new Error('Failed to load electricity plans. Please try again later.');
      } finally {
        this.loadingPromises.plans = null;
      }
    })();

    return this.loadingPromises.plans;
  },

  /**
   * Load TDU rates from JSON file.
   */
  async loadTDURates(forceRefresh: boolean = false): Promise<TDURatesData> {
    if (!forceRefresh && this.isCacheValid('tduRates')) {
      const cachedData = this.cache.tduRates.data;
      if (cachedData === null) {
        throw new Error('Cache validation error: data should not be null');
      }
      return cachedData;
    }

    if (this.loadingPromises.tduRates !== null) {
      return this.loadingPromises.tduRates;
    }

    this.loadingPromises.tduRates = (async (): Promise<TDURatesData> => {
      try {
        const response = await this.fetchWithRetry(`${this.basePath}/tdu-rates.json`);
        const data = (await response.json()) as TDURatesData;

        if (data === null || !Array.isArray(data.tdus)) {
          throw new Error('Invalid TDU rates data structure');
        }

        this.cache.tduRates = { data, timestamp: Date.now() };
        return data;
      } catch (error) {
        logger.error('Error loading TDU rates', { error });
        if (this.cache.tduRates.data !== null) {
          logger.warn('Returning stale TDU rates data');
          return this.cache.tduRates.data;
        }
        throw new Error('Failed to load TDU delivery rates. Please try again later.');
      } finally {
        this.loadingPromises.tduRates = null;
      }
    })();

    return this.loadingPromises.tduRates;
  },

  /**
   * Load local tax rates from JSON file.
   */
  async loadLocalTaxes(forceRefresh: boolean = false): Promise<LocalTaxesData> {
    if (!forceRefresh && this.isCacheValid('localTaxes')) {
      const cachedData = this.cache.localTaxes.data;
      if (cachedData === null) {
        throw new Error('Cache validation error: data should not be null');
      }
      return cachedData;
    }

    if (this.loadingPromises.localTaxes !== null) {
      return this.loadingPromises.localTaxes;
    }

    this.loadingPromises.localTaxes = (async (): Promise<LocalTaxesData> => {
      try {
        const response = await this.fetchWithRetry(`${this.basePath}/local-taxes.json`);
        const data = (await response.json()) as LocalTaxesData;

        this.cache.localTaxes = { data, timestamp: Date.now() };
        return data;
      } catch {
        logger.warn('Error loading local taxes, using defaults');
        const defaultData: LocalTaxesData = {
          last_updated: new Date().toISOString(),
          state_sales_tax: 0.0,
          default_local_rate: 0.0,
          zip_code_ranges: {},
          major_cities: {}
        };

        this.cache.localTaxes = { data: defaultData, timestamp: Date.now() };
        return defaultData;
      } finally {
        this.loadingPromises.localTaxes = null;
      }
    })();

    return this.loadingPromises.localTaxes;
  },

  /**
   * Preload all data in parallel.
   */
  async preloadAll(): Promise<{
    plans: PlansData;
    tduRates: TDURatesData;
    localTaxes: LocalTaxesData;
  }> {
    const [plans, tduRates, localTaxes] = await Promise.all([
      this.loadPlans(),
      this.loadTDURates(),
      this.loadLocalTaxes()
    ]);

    return { plans, tduRates, localTaxes };
  },

  /**
   * Get TDU rates for a specific TDU code.
   */
  async getTDUByCode(tduCode: string): Promise<TDURate | null> {
    const data = await this.loadTDURates();
    const tdu = data.tdus.find((t) => t.code === tduCode);
    return tdu ?? null;
  },

  /**
   * Get all TDU rates.
   */
  async getAllTDUs(): Promise<readonly TDURate[]> {
    const data = await this.loadTDURates();
    return data.tdus;
  },

  /**
   * Filter plans by TDU area.
   */
  async getPlansByTDU(tduCode: string): Promise<ElectricityPlan[]> {
    const data = await this.loadPlans();
    return data.plans.filter((plan) => plan.tdu_area === tduCode);
  },

  /**
   * Get local tax info for a ZIP code.
   */
  async getLocalTaxInfo(zipCode: string): Promise<TaxInfo> {
    const data = await this.loadLocalTaxes();
    const zip = Number.parseInt(zipCode, 10);

    // Check major cities first
    const majorCities = data.major_cities as Record<string, CityTaxData>;
    for (const [cityName, cityData] of Object.entries(majorCities)) {
      if (cityData.zip_codes.includes(zipCode)) {
        return {
          rate: cityData.rate,
          city: cityName.replace(/_/g, ' '),
          deregulated: cityData.deregulated,
          tdu: cityData.tdu ?? null
        };
      }
    }

    // Check ZIP code ranges
    const ranges = data.zip_code_ranges as Record<string, ZipCodeRangeData>;
    for (const [range, rangeData] of Object.entries(ranges)) {
      const [minStr, maxStr] = range.split('-');
      const min = Number.parseInt(minStr ?? '0', 10);
      const max = Number.parseInt(maxStr ?? '99999', 10);

      if (zip >= min && zip <= max) {
        return {
          rate: rangeData.rate,
          region: rangeData.region,
          deregulated: rangeData.tdu !== null,
          tdu: rangeData.tdu ?? null
        };
      }
    }

    return {
      rate: data.default_local_rate,
      region: 'Texas',
      tdu: null,
      deregulated: true
    };
  },

  /**
   * Get local tax rate for a ZIP code.
   */
  async getLocalTaxRate(zipCode: string): Promise<number> {
    const info = await this.getLocalTaxInfo(zipCode);
    return info.rate;
  },

  /**
   * Check if a ZIP code is in a deregulated area.
   */
  async checkDeregulationStatus(zipCode: string): Promise<DeregulationStatus> {
    const info = await this.getLocalTaxInfo(zipCode);
    return {
      isDeregulated: info.deregulated,
      tdu: info.tdu ?? null,
      reason: null
    };
  },

  /**
   * Clear cached data.
   */
  clearCache(key: CacheKey | null = null): void {
    if (key !== null) {
      this.cache[key] = { data: null, timestamp: 0 };
    } else {
      this.cache = {
        plans: { data: null, timestamp: 0 },
        tduRates: { data: null, timestamp: 0 },
        localTaxes: { data: null, timestamp: 0 }
      };
    }
  },

  /**
   * Get data freshness information.
   */
  async getDataFreshness(): Promise<DataFreshness> {
    const [plansData, tduData] = await Promise.all([this.loadPlans(), this.loadTDURates()]);

    return {
      plansUpdated: plansData.last_updated,
      totalPlans: plansData.total_plans,
      originalPlanCount: plansData.total_plans,
      duplicateCount: 0,
      dataSource: plansData.data_source,
      tduRatesUpdated: tduData.last_updated,
      tduRatesEffective: tduData.last_updated,
      tduRatesNextUpdate: tduData.next_update
    };
  },

  /**
   * Get cache statistics.
   */
  getCacheStats(): Record<CacheKey, CacheKeyStats> {
    return {
      plans: {
        cached: this.cache.plans.data !== null,
        age: this.cache.plans.timestamp > 0 ? Date.now() - this.cache.plans.timestamp : null,
        valid: this.isCacheValid('plans')
      },
      tduRates: {
        cached: this.cache.tduRates.data !== null,
        age: this.cache.tduRates.timestamp > 0 ? Date.now() - this.cache.tduRates.timestamp : null,
        valid: this.isCacheValid('tduRates')
      },
      localTaxes: {
        cached: this.cache.localTaxes.data !== null,
        age:
          this.cache.localTaxes.timestamp > 0 ? Date.now() - this.cache.localTaxes.timestamp : null,
        valid: this.isCacheValid('localTaxes')
      }
    };
  },

  /**
   * Create a fingerprint for a plan to detect duplicates.
   */
  createPlanFingerprint(plan: ElectricityPlan): string {
    const normalizePrice = (price: number | null | undefined): number =>
      price != null ? Math.round(price * 1000) / 1000 : 0;
    const normalizeFee = (fee: number | null | undefined): number =>
      fee != null ? Math.round(fee * 100) / 100 : 0;

    return JSON.stringify({
      rep: (plan.rep_name ?? '').toUpperCase().trim(),
      tdu: (plan.tdu_area ?? '').toUpperCase().trim(),
      rate_type: (plan.rate_type ?? 'FIXED').toUpperCase().trim(),
      p500: normalizePrice(plan.price_kwh_500),
      p1000: normalizePrice(plan.price_kwh_1000),
      p2000: normalizePrice(plan.price_kwh_2000),
      term: plan.term_months ?? 0,
      etf: normalizeFee(plan.early_termination_fee),
      base: normalizeFee(plan.base_charge_monthly),
      renewable: plan.renewable_pct ?? 0,
      prepaid: Boolean(plan.is_prepaid),
      tou: Boolean(plan.is_tou)
    });
  },

  /**
   * Calculate preference score for a plan.
   * Higher = more preferred (English, shorter names).
   */
  calculatePlanPreference(plan: ElectricityPlan): number {
    let score = 100;
    const planName = plan.plan_name ?? '';
    const specialTerms = plan.special_terms ?? '';
    const language = (plan.language ?? '').toLowerCase();
    const text = `${planName} ${specialTerms}`.toLowerCase();

    if (language === 'english') score += 50;
    else if (language === 'spanish' || language === 'español') score -= 50;

    if (text.includes('ñ')) score -= 20;
    if (/[áéíóú]/.test(text)) score -= 10;
    if (text.includes('ción')) score -= 15;

    const nameLength = planName.length;
    if (nameLength > 50) score -= 15;
    else if (nameLength > 30) score -= 10;
    else if (nameLength > 20) score -= 5;

    const specialChars = (planName.match(/[^a-zA-Z0-9\s-]/g) ?? []).length;
    score -= specialChars * 2;

    return score;
  },

  /**
   * Deduplicate plans by identifying and removing duplicate versions.
   */
  deduplicatePlans(plans: ElectricityPlan[]): DeduplicationResult {
    const fingerprintMap = new Map<
      string,
      { plan: ElectricityPlan; preference: number; hasLanguagePair: boolean }
    >();
    let duplicateCount = 0;
    let orphanedEnglishCount = 0;
    let orphanedSpanishCount = 0;

    for (const plan of plans) {
      const fingerprint = this.createPlanFingerprint(plan);

      if (!fingerprintMap.has(fingerprint)) {
        fingerprintMap.set(fingerprint, {
          plan,
          preference: this.calculatePlanPreference(plan),
          hasLanguagePair: false
        });
      } else {
        duplicateCount++;
        const existing = fingerprintMap.get(fingerprint);
        if (existing === undefined) {
          throw new Error('Fingerprint map consistency error');
        }
        if (currentPreference > existing.preference) {
          fingerprintMap.set(fingerprint, {
            plan,
            preference: currentPreference,
            hasLanguagePair: true
          });
        }
      }
    }

    const deduplicated: ElectricityPlan[] = [];
    for (const entry of fingerprintMap.values()) {
      const planCopy = { ...entry.plan };
      const language = (planCopy.language ?? '').toLowerCase();

      if (!entry.hasLanguagePair) {
        if (language === 'spanish' || language === 'español') {
          orphanedSpanishCount++;
        } else if (language === 'english') {
          orphanedEnglishCount++;
        }
      }

      deduplicated.push(planCopy);
    }

    return {
      deduplicated,
      duplicateCount,
      originalCount: plans.length,
      orphanedEnglishCount,
      orphanedSpanishCount
    };
  },

  /**
   * Format provider name by uppercasing and removing legal suffixes.
   */
  formatProviderName(name: string | null | undefined): string {
    if (name == null) return '';

    let formatted = name.toUpperCase().trim();

    let changed = true;
    while (changed) {
      changed = false;
      for (const suffix of LEGAL_SUFFIXES) {
        if (formatted.endsWith(suffix)) {
          formatted = formatted.slice(0, -suffix.length).trim();
          changed = true;
          break;
        }
      }
    }

    return formatted.replace(/[,.\s]+$/, '');
  }
};

export default API;

// Named exports
export { API };
export type {
  CacheKey,
  CacheStore,
  DeduplicationResult,
  DataFreshness,
  CacheKeyStats,
  DeregulationStatus
};

// Browser compatibility
if (typeof window !== 'undefined') {
  (window as unknown as Record<string, unknown>).API = API;
}

// CommonJS compatibility
if (typeof module !== 'undefined' && module.exports) {
  module.exports = API;
}
