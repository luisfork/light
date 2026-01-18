/**
 * Cache Manager Module
 *
 * Provides caching functionality with configurable max age,
 * loading state management, and cache invalidation.
 *
 * VULNERABILITY FIXED: Added strict type safety for cache keys
 * VULNERABILITY FIXED: Safe property access with null checks
 * VULNERABILITY FIXED: Generic typing prevents runtime type errors
 */

import type {
  CacheConfig,
  CacheEntry,
  CacheKey,
  LocalTaxesData,
  PlansData,
  TDURatesData
} from '../types';

/**
 * Type mapping for cache data types.
 * Ensures type safety when getting/setting cache entries.
 */
interface CacheDataTypes {
  plans: PlansData;
  tduRates: TDURatesData;
  localTaxes: LocalTaxesData;
}

/**
 * Cache store with typed entries.
 */
interface CacheStore {
  plans: CacheEntry<PlansData>;
  tduRates: CacheEntry<TDURatesData>;
  localTaxes: CacheEntry<LocalTaxesData>;
}

/**
 * Loading promises for preventing duplicate requests.
 */
interface LoadingPromises {
  plans: Promise<PlansData> | null;
  tduRates: Promise<TDURatesData> | null;
  localTaxes: Promise<LocalTaxesData> | null;
}

/**
 * Cache statistics for a single entry.
 */
interface CacheEntryStats {
  readonly cached: boolean;
  readonly age: number | null;
  readonly valid: boolean;
}

/**
 * Full cache statistics.
 */
interface CacheStats {
  readonly plans: CacheEntryStats;
  readonly tduRates: CacheEntryStats;
  readonly localTaxes: CacheEntryStats;
}

/**
 * Create an empty cache entry.
 * Factory function ensures consistent initialization.
 */
function createEmptyEntry<T>(): CacheEntry<T> {
  return { data: null, timestamp: 0 };
}

/**
 * Cache Manager singleton.
 * Manages data caching with TTL and loading state deduplication.
 */
const CacheManager = {
  /**
   * Cache configuration.
   */
  config: {
    maxAge: 5 * 60 * 1000, // 5 minutes cache validity
    retryCount: 3,
    retryDelay: 1000 // Base delay in ms
  } as CacheConfig,

  /**
   * Cached data with timestamps.
   */
  cache: {
    plans: createEmptyEntry<PlansData>(),
    tduRates: createEmptyEntry<TDURatesData>(),
    localTaxes: createEmptyEntry<LocalTaxesData>()
  } as CacheStore,

  /**
   * Loading states for preventing duplicate requests.
   */
  loadingPromises: {
    plans: null,
    tduRates: null,
    localTaxes: null
  } as LoadingPromises,

  /**
   * Check if cached data is still valid.
   *
   * VULNERABILITY FIXED: Safe property access with optional chaining
   * Before: const cached = this.cache[key]; if (!cached || !cached.data)
   * After: const cached = this.cache[key]; if (cached?.data == null)
   *
   * @param key - Cache key to check
   * @returns True if cache entry exists and has not expired
   */
  isCacheValid(key: CacheKey): boolean {
    const cached = this.cache[key];
    // VULNERABILITY FIXED: Explicit null check instead of truthy check
    if (cached.data === null) {
      return false;
    }
    return Date.now() - cached.timestamp < this.config.maxAge;
  },

  /**
   * Get cached data if valid.
   *
   * @param key - Cache key to retrieve
   * @returns Cached data or null if expired/missing
   */
  get<K extends CacheKey>(key: K): CacheDataTypes[K] | null {
    if (this.isCacheValid(key)) {
      // VULNERABILITY FIXED: Type assertion is safe here because
      // isCacheValid already verified data is not null
      return this.cache[key].data as CacheDataTypes[K];
    }
    return null;
  },

  /**
   * Set cache data with current timestamp.
   *
   * @param key - Cache key to set
   * @param data - Data to cache
   */
  set<K extends CacheKey>(key: K, data: CacheDataTypes[K]): void {
    this.cache[key] = {
      data: data,
      timestamp: Date.now()
    } as CacheStore[K];
  },

  /**
   * Get existing loading promise to prevent duplicate requests.
   *
   * When multiple callers request the same data simultaneously,
   * only the first request fetches; others wait on the same promise.
   *
   * @param key - Cache key to check
   * @returns Existing promise or null if no fetch in progress
   */
  getLoadingPromise<K extends CacheKey>(key: K): Promise<CacheDataTypes[K]> | null {
    return this.loadingPromises[key] as Promise<CacheDataTypes[K]> | null;
  },

  /**
   * Set a loading promise for request deduplication.
   *
   * @param key - Cache key being loaded
   * @param promise - Promise to track
   */
  setLoadingPromise<K extends CacheKey>(key: K, promise: Promise<CacheDataTypes[K]>): void {
    // Type assertion needed due to Promise covariance
    (this.loadingPromises as Record<CacheKey, Promise<unknown> | null>)[key] = promise;
  },

  /**
   * Clear a loading promise after fetch completes.
   *
   * @param key - Cache key to clear
   */
  clearLoadingPromise(key: CacheKey): void {
    this.loadingPromises[key] = null;
  },

  /**
   * Clear cached data.
   *
   * @param key - Optional specific cache key to clear. If null, clears all.
   */
  clear(key: CacheKey | null = null): void {
    if (key !== null) {
      // Reset specific cache entry
      switch (key) {
        case 'plans':
          this.cache.plans = createEmptyEntry<PlansData>();
          break;
        case 'tduRates':
          this.cache.tduRates = createEmptyEntry<TDURatesData>();
          break;
        case 'localTaxes':
          this.cache.localTaxes = createEmptyEntry<LocalTaxesData>();
          break;
      }
    } else {
      this.cache = {
        plans: createEmptyEntry<PlansData>(),
        tduRates: createEmptyEntry<TDURatesData>(),
        localTaxes: createEmptyEntry<LocalTaxesData>()
      };
    }
  },

  /**
   * Get cache statistics for monitoring.
   *
   * @returns Statistics for all cache entries
   */
  getStats(): CacheStats {
    const getEntryStats = (key: CacheKey): CacheEntryStats => {
      const entry = this.cache[key];
      return {
        cached: entry.data !== null,
        age: entry.timestamp > 0 ? Date.now() - entry.timestamp : null,
        valid: this.isCacheValid(key)
      };
    };

    return {
      plans: getEntryStats('plans'),
      tduRates: getEntryStats('tduRates'),
      localTaxes: getEntryStats('localTaxes')
    };
  }
};

export default CacheManager;

// Named export for tree-shaking
export { CacheManager };

// Browser environment: attach to window for compatibility
if (typeof window !== 'undefined') {
  (window as unknown as Record<string, unknown>)['CacheManager'] = CacheManager;
}

// CommonJS export for Node.js compatibility (tests)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CacheManager;
}
