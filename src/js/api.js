/**
 * Data API Module
 *
 * Handles loading electricity plan data, TDU rates, and other resources
 * with caching, retry logic, and error handling.
 */

const API = {
  /**
   * Base path for data files
   * Dynamically determined based on current location:
   * - Local dev from repo root: /data
   * - Deployed site: ./data
   */
  basePath: window.location.pathname.includes('/src/') ? '../data' : './data',

  /**
   * Cache configuration
   */
  cacheConfig: {
    maxAge: 5 * 60 * 1000, // 5 minutes cache validity
    retryCount: 3,
    retryDelay: 1000 // Base delay in ms
  },

  /**
   * Cached data with timestamps
   */
  cache: {
    plans: { data: null, timestamp: 0 },
    tduRates: { data: null, timestamp: 0 },
    localTaxes: { data: null, timestamp: 0 }
  },

  /**
   * Loading states for preventing duplicate requests
   */
  loadingPromises: {
    plans: null,
    tduRates: null,
    localTaxes: null
  },

  /**
   * Check if cached data is still valid
   *
   * @param {string} key - Cache key
   * @returns {boolean} True if cache is valid
   */
  isCacheValid(key) {
    const cached = this.cache[key];
    if (!cached || !cached.data) return false;
    return Date.now() - cached.timestamp < this.cacheConfig.maxAge;
  },

  /**
   * Fetch with retry logic and exponential backoff
   *
   * @param {string} url - URL to fetch
   * @param {Object} options - Fetch options
   * @returns {Promise<Response>} Fetch response
   */
  async fetchWithRetry(url, options = {}) {
    let lastError;
    const { retryCount, retryDelay } = this.cacheConfig;

    for (let attempt = 0; attempt < retryCount; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

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
        lastError = error;

        // Don't retry on abort or if it's the last attempt
        if (error.name === 'AbortError' || attempt === retryCount - 1) {
          break;
        }

        // Exponential backoff with jitter
        const delay = retryDelay * 2 ** attempt + Math.random() * 500;
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    throw lastError;
  },

  /**
   * Load electricity plans from JSON file
   *
   * @param {boolean} forceRefresh - Force refresh from server
   * @returns {Promise<Object>} Plans data object
   */
  async loadPlans(forceRefresh = false) {
    // Return cached data if valid
    if (!forceRefresh && this.isCacheValid('plans')) {
      return this.cache.plans.data;
    }

    // Return existing promise if already loading
    if (this.loadingPromises.plans) {
      return this.loadingPromises.plans;
    }

    // Create new loading promise
    this.loadingPromises.plans = (async () => {
      try {
        const response = await this.fetchWithRetry(`${this.basePath}/plans.json`);
        const data = await response.json();

        // Validate data structure
        if (!data || !Array.isArray(data.plans)) {
          throw new Error('Invalid plans data structure');
        }

        // Format provider names in all plans
        data.plans = data.plans.map((plan) => ({
          ...plan,
          rep_name: this.formatProviderName(plan.rep_name)
        }));

        // Store original count before deduplication
        const originalPlanCount = data.plans.length;

        // Remove duplicate plans (English/Spanish versions)
        const deduplicationResult = this.deduplicatePlans(data.plans);
        data.plans = deduplicationResult.deduplicated;

        // Store both counts for transparency
        data.original_plan_count = originalPlanCount;
        data.total_plans = deduplicationResult.deduplicated.length;
        data.duplicate_count = deduplicationResult.duplicateCount;

        // Log deduplication info
        if (deduplicationResult.duplicateCount > 0) {
          console.info(
            `Deduplication: ${originalPlanCount} total plans, ` +
              `${deduplicationResult.duplicateCount} duplicates removed, ` +
              `${data.total_plans} unique plans`
          );
        }

        // Update cache
        this.cache.plans = {
          data: data,
          timestamp: Date.now()
        };

        return data;
      } catch (error) {
        console.error('Error loading plans:', error);
        // Return stale cache if available
        if (this.cache.plans.data) {
          console.warn('Returning stale plans data');
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
   * Load TDU rates from JSON file
   *
   * @param {boolean} forceRefresh - Force refresh from server
   * @returns {Promise<Object>} TDU rates data object
   */
  async loadTDURates(forceRefresh = false) {
    if (!forceRefresh && this.isCacheValid('tduRates')) {
      return this.cache.tduRates.data;
    }

    if (this.loadingPromises.tduRates) {
      return this.loadingPromises.tduRates;
    }

    this.loadingPromises.tduRates = (async () => {
      try {
        const response = await this.fetchWithRetry(`${this.basePath}/tdu-rates.json`);
        const data = await response.json();

        if (!data || !Array.isArray(data.tdus)) {
          throw new Error('Invalid TDU rates data structure');
        }

        this.cache.tduRates = {
          data: data,
          timestamp: Date.now()
        };

        return data;
      } catch (error) {
        console.error('Error loading TDU rates:', error);
        if (this.cache.tduRates.data) {
          console.warn('Returning stale TDU rates data');
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
   * Load local tax rates from JSON file
   *
   * @param {boolean} forceRefresh - Force refresh from server
   * @returns {Promise<Object>} Local tax data object
   */
  async loadLocalTaxes(forceRefresh = false) {
    if (!forceRefresh && this.isCacheValid('localTaxes')) {
      return this.cache.localTaxes.data;
    }

    if (this.loadingPromises.localTaxes) {
      return this.loadingPromises.localTaxes;
    }

    this.loadingPromises.localTaxes = (async () => {
      try {
        const response = await this.fetchWithRetry(`${this.basePath}/local-taxes.json`);
        const data = await response.json();

        this.cache.localTaxes = {
          data: data,
          timestamp: Date.now()
        };

        return data;
      } catch (error) {
        console.error('Error loading local taxes:', error);
        // Non-critical, return default
        const defaultData = {
          last_updated: new Date().toISOString(),
          state_sales_tax: 0.0,
          default_local_rate: 0.0,
          zip_code_ranges: {},
          major_cities: {}
        };

        this.cache.localTaxes = {
          data: defaultData,
          timestamp: Date.now()
        };

        return defaultData;
      } finally {
        this.loadingPromises.localTaxes = null;
      }
    })();

    return this.loadingPromises.localTaxes;
  },

  /**
   * Preload all data in parallel
   *
   * @returns {Promise<Object>} Object with all loaded data
   */
  async preloadAll() {
    const [plans, tduRates, localTaxes] = await Promise.all([
      this.loadPlans(),
      this.loadTDURates(),
      this.loadLocalTaxes()
    ]);

    return { plans, tduRates, localTaxes };
  },

  /**
   * Get TDU rates for a specific TDU code
   *
   * @param {string} tduCode - TDU code (e.g., 'ONCOR', 'CENTERPOINT')
   * @returns {Promise<Object|null>} TDU rate object or null
   */
  async getTDUByCode(tduCode) {
    const data = await this.loadTDURates();
    const tdu = data.tdus.find((t) => t.code === tduCode);
    return tdu || null;
  },

  /**
   * Get all TDU rates
   *
   * @returns {Promise<Object[]>} Array of TDU objects
   */
  async getAllTDUs() {
    const data = await this.loadTDURates();
    return data.tdus;
  },

  /**
   * Filter plans by TDU area
   *
   * @param {string} tduCode - TDU code to filter by
   * @returns {Promise<Object[]>} Filtered plans
   */
  async getPlansByTDU(tduCode) {
    const data = await this.loadPlans();
    return data.plans.filter((plan) => plan.tdu_area === tduCode);
  },

  /**
   * Get local tax rate for a ZIP code
   *
   * @param {string} zipCode - 5-digit ZIP code
   * @returns {Promise<Object>} Tax info object with rate and details
   */
  async getLocalTaxInfo(zipCode) {
    const data = await this.loadLocalTaxes();
    const zip = parseInt(zipCode, 10);

    // Check major cities first for exact ZIP match
    for (const [cityName, cityData] of Object.entries(data.major_cities || {})) {
      if (cityData.zip_codes && cityData.zip_codes.includes(zipCode)) {
        return {
          rate: cityData.rate || 0,
          city: cityName.replace(/_/g, ' '),
          tdu: cityData.tdu,
          deregulated: cityData.deregulated !== false,
          note: cityData.note || null
        };
      }
    }

    // Check ZIP code ranges
    for (const [range, rangeData] of Object.entries(data.zip_code_ranges || {})) {
      const [minStr, maxStr] = range.split('-');
      const min = parseInt(minStr, 10);
      const max = parseInt(maxStr, 10);

      if (zip >= min && zip <= max) {
        return {
          rate: rangeData.rate || 0,
          region: rangeData.region,
          tdu: rangeData.tdu,
          deregulated: rangeData.tdu !== null,
          note: rangeData.note || null
        };
      }
    }

    // Default response
    return {
      rate: data.default_local_rate || 0,
      region: 'Texas',
      tdu: null,
      deregulated: true,
      note: null
    };
  },

  /**
   * Get local tax rate for a ZIP code (backwards compatible)
   *
   * @param {string} zipCode - 5-digit ZIP code
   * @returns {Promise<number>} Local tax rate (0.0 - 1.0)
   */
  async getLocalTaxRate(zipCode) {
    const info = await this.getLocalTaxInfo(zipCode);
    return info.rate;
  },

  /**
   * Check if a ZIP code is in a deregulated area
   *
   * @param {string} zipCode - 5-digit ZIP code
   * @returns {Promise<Object>} Deregulation info
   */
  async checkDeregulationStatus(zipCode) {
    const info = await this.getLocalTaxInfo(zipCode);
    return {
      isDeregulated: info.deregulated,
      tdu: info.tdu,
      reason: info.note
    };
  },

  /**
   * Clear cached data
   *
   * @param {string} key - Optional specific cache key to clear
   */
  clearCache(key = null) {
    if (key) {
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
   * Get data freshness information
   *
   * @returns {Promise<Object>} Data freshness info
   */
  async getDataFreshness() {
    const [plansData, tduData] = await Promise.all([this.loadPlans(), this.loadTDURates()]);

    return {
      plansUpdated: plansData.last_updated,
      totalPlans: plansData.total_plans,
      originalPlanCount: plansData.original_plan_count || plansData.total_plans,
      duplicateCount: plansData.duplicate_count || 0,
      dataSource: plansData.data_source,
      tduRatesUpdated: tduData.last_updated,
      tduRatesEffective: tduData.effective_date,
      tduRatesNextUpdate: tduData.next_update
    };
  },

  /**
   * Get cache statistics
   *
   * @returns {Object} Cache stats
   */
  getCacheStats() {
    return {
      plans: {
        cached: !!this.cache.plans.data,
        age: this.cache.plans.timestamp ? Date.now() - this.cache.plans.timestamp : null,
        valid: this.isCacheValid('plans')
      },
      tduRates: {
        cached: !!this.cache.tduRates.data,
        age: this.cache.tduRates.timestamp ? Date.now() - this.cache.tduRates.timestamp : null,
        valid: this.isCacheValid('tduRates')
      },
      localTaxes: {
        cached: !!this.cache.localTaxes.data,
        age: this.cache.localTaxes.timestamp ? Date.now() - this.cache.localTaxes.timestamp : null,
        valid: this.isCacheValid('localTaxes')
      }
    };
  },

  /**
   * Create a fingerprint for a plan to detect duplicates
   *
   * Duplicates typically occur when providers list the same plan in both English and Spanish
   * with identical pricing and terms but different plan names.
   *
   * @param {Object} plan - Plan object
   * @returns {string} Plan fingerprint
   */
  createPlanFingerprint(plan) {
    // Normalize and round values to avoid floating point comparison issues
    const normalizePrice = (price) => Math.round((price || 0) * 1000) / 1000;
    const normalizeFee = (fee) => Math.round((fee || 0) * 100) / 100;

    // Create fingerprint from key identifying fields
    // Note: We intentionally exclude plan_name and plan_id as these differ for duplicates
    return JSON.stringify({
      rep: (plan.rep_name || '').toUpperCase().trim(),
      tdu: (plan.tdu_area || '').toUpperCase().trim(),
      p500: normalizePrice(plan.price_kwh_500),
      p1000: normalizePrice(plan.price_kwh_1000),
      p2000: normalizePrice(plan.price_kwh_2000),
      term: plan.term_months || 0,
      etf: normalizeFee(plan.early_termination_fee),
      base: normalizeFee(plan.base_charge_monthly),
      renewable: plan.renewable_pct || 0,
      prepaid: !!plan.is_prepaid,
      tou: !!plan.is_tou
    });
  },

  /**
   * Calculate a preference score for a plan name
   * Higher scores indicate more preferred plans (e.g., English, shorter names)
   *
   * @param {string} planName - Plan name to check
   * @param {string} specialTerms - Optional special terms text
   * @returns {number} Preference score (higher = more preferred)
   */
  calculatePlanPreference(planName, specialTerms = '') {
    let score = 100;
    const text = `${planName} ${specialTerms}`.toLowerCase();

    // Penalize Spanish-specific characters and patterns
    if (text.includes('ñ')) score -= 20;
    if (
      text.includes('á') ||
      text.includes('é') ||
      text.includes('í') ||
      text.includes('ó') ||
      text.includes('ú')
    )
      score -= 10;
    if (text.includes('ción')) score -= 15;

    // Penalize longer names (usually Spanish translations are wordier)
    const nameLength = planName.length;
    if (nameLength > 50) score -= 15;
    else if (nameLength > 30) score -= 10;
    else if (nameLength > 20) score -= 5;

    // Prefer names with fewer special characters
    const specialChars = (planName.match(/[^a-zA-Z0-9\s-]/g) || []).length;
    score -= specialChars * 2;

    return score;
  },

  /**
   * Deduplicate plans by identifying and removing duplicate versions
   *
   * Some REPs list identical plans in both English and Spanish versions.
   * This function detects duplicates based on plan features (prices, terms, fees)
   * and keeps the preferred version (typically English, shorter name).
   *
   * Feature comparison instead of language detection.
   *
   * @param {Array} plans - Array of plan objects
   * @returns {Object} Object with deduplicated array, duplicate count, and original count
   */
  deduplicatePlans(plans) {
    const fingerprintMap = new Map();
    const duplicateDetails = [];
    let duplicateCount = 0;

    for (const plan of plans) {
      const fingerprint = this.createPlanFingerprint(plan);

      if (!fingerprintMap.has(fingerprint)) {
        // First occurrence, keep it
        fingerprintMap.set(fingerprint, {
          plan: plan,
          preference: this.calculatePlanPreference(plan.plan_name, plan.special_terms)
        });
      } else {
        // Duplicate found - compare based on plan features
        duplicateCount++;
        const existing = fingerprintMap.get(fingerprint);
        const currentPreference = this.calculatePlanPreference(plan.plan_name, plan.special_terms);

        // Keep the plan with higher preference score
        const keepCurrent = currentPreference > existing.preference;

        if (keepCurrent) {
          duplicateDetails.push({
            removed: existing.plan.plan_name,
            kept: plan.plan_name,
            provider: plan.rep_name
          });
          fingerprintMap.set(fingerprint, {
            plan: plan,
            preference: currentPreference
          });
        } else {
          duplicateDetails.push({
            removed: plan.plan_name,
            kept: existing.plan.plan_name,
            provider: plan.rep_name
          });
        }
      }
    }

    const deduplicated = Array.from(fingerprintMap.values()).map((entry) => entry.plan);

    return {
      deduplicated: deduplicated,
      duplicateCount: duplicateCount,
      originalCount: plans.length,
      duplicateDetails: duplicateDetails
    };
  },

  /**
   * Format provider name by uppercasing and removing common legal suffixes
   *
   * @param {string} name - Original provider name
   * @returns {string} Formatted provider name
   */
  formatProviderName(name) {
    if (!name) return '';

    // Convert to uppercase
    let formatted = name.toUpperCase().trim();

    // Remove common legal suffixes from the END of the name
    // Order matters - check longer patterns first
    const suffixes = [
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
    ];

    // Keep removing suffixes until none match
    let changed = true;
    while (changed) {
      changed = false;
      for (const suffix of suffixes) {
        if (formatted.endsWith(suffix)) {
          formatted = formatted.slice(0, -suffix.length).trim();
          changed = true;
          break;
        }
      }
    }

    // Clean up any trailing commas or periods
    formatted = formatted.replace(/[,.\s]+$/, '');

    return formatted;
  }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = API;
}
