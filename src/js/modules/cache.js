/**
 * Light - Cache Manager Module
 *
 * Provides caching functionality with configurable max age,
 * loading state management, and cache invalidation.
 */

const CacheManager = {
  /**
   * Cache configuration
   */
  config: {
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
    return Date.now() - cached.timestamp < this.config.maxAge;
  },

  /**
   * Get cached data if valid
   *
   * @param {string} key - Cache key
   * @returns {*} Cached data or null
   */
  get(key) {
    if (this.isCacheValid(key)) {
      return this.cache[key].data;
    }
    return null;
  },

  /**
   * Set cache data with current timestamp
   *
   * @param {string} key - Cache key
   * @param {*} data - Data to cache
   */
  set(key, data) {
    this.cache[key] = {
      data: data,
      timestamp: Date.now()
    };
  },

  /**
   * Get or create a loading promise to prevent duplicate requests
   *
   * @param {string} key - Cache key
   * @returns {Promise|null} Existing promise or null
   */
  getLoadingPromise(key) {
    return this.loadingPromises[key];
  },

  /**
   * Set a loading promise
   *
   * @param {string} key - Cache key
   * @param {Promise} promise - Loading promise
   */
  setLoadingPromise(key, promise) {
    this.loadingPromises[key] = promise;
  },

  /**
   * Clear a loading promise
   *
   * @param {string} key - Cache key
   */
  clearLoadingPromise(key) {
    this.loadingPromises[key] = null;
  },

  /**
   * Clear cached data
   *
   * @param {string} key - Optional specific cache key to clear
   */
  clear(key = null) {
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
   * Get cache statistics
   *
   * @returns {Object} Cache stats
   */
  getStats() {
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
  }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CacheManager;
}
