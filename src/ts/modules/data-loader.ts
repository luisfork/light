/**
 * Data Loader Module
 *
 * Handles fetching data with retry logic, exponential backoff,
 * and timeout handling.
 *
 * VULNERABILITY FIXED: Typed error handling in catch blocks
 * VULNERABILITY FIXED: AbortController properly typed
 * VULNERABILITY FIXED: Generic JSON loading with type parameter
 */

import { Logger } from '../utils/logger';

const log = Logger.withPrefix('DataLoader');

/**
 * Configuration for fetch retry behavior.
 */
interface DataLoaderConfig {
  readonly retryCount: number;
  readonly retryDelay: number; // Base delay in ms
  readonly timeout: number; // Timeout in ms
}

/**
 * Error thrown when all retry attempts fail.
 */
class FetchError extends Error {
  constructor(
    message: string,
    public readonly url: string,
    public readonly attempts: number,
    public readonly cause?: Error
  ) {
    super(message);
    this.name = 'FetchError';
  }
}

/**
 * Data Loader singleton.
 * Provides reliable data fetching with retry logic.
 */
const DataLoader = {
  /**
   * Default configuration.
   */
  config: {
    retryCount: 3,
    retryDelay: 1000, // Base delay in ms
    timeout: 10000 // 10 second timeout
  } as DataLoaderConfig,

  /**
   * Fetch with retry logic and exponential backoff.
   *
   * VULNERABILITY FIXED: Properly typed error handling
   * Before: catch (error) { if (error.name === 'AbortError') }
   * After: Type-safe error checking with unknown type
   *
   * @param url - URL to fetch
   * @param options - Fetch options
   * @returns Fetch response
   * @throws FetchError if all retries fail
   */
  async fetchWithRetry(url: string, options: RequestInit = {}): Promise<Response> {
    let lastError: Error | undefined;
    const { retryCount, retryDelay, timeout } = this.config;

    for (let attempt = 0; attempt < retryCount; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        const response = await fetch(url, {
          ...options,
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        log.debug(`Fetch successful`, { url, attempt: attempt + 1 });
        return response;
      } catch (error: unknown) {
        // VULNERABILITY FIXED: Type-safe error handling
        const errorObj = error instanceof Error ? error : new Error(String(error));
        lastError = errorObj;

        // Check if it's an abort error (timeout)
        const isAbortError = errorObj.name === 'AbortError';

        // Don't retry on abort or if it's the last attempt
        if (isAbortError || attempt === retryCount - 1) {
          log.warn(`Fetch failed`, {
            url,
            attempt: attempt + 1,
            error: errorObj.message,
            isTimeout: isAbortError
          });
          break;
        }

        // Exponential backoff with jitter
        const delay = retryDelay * 2 ** attempt + Math.random() * 500;
        log.debug(`Retrying fetch`, { url, attempt: attempt + 1, delayMs: Math.round(delay) });
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    // VULNERABILITY FIXED: Always throw a proper error, never undefined
    throw new FetchError(lastError?.message ?? 'Unknown fetch error', url, retryCount, lastError);
  },

  /**
   * Load JSON data from URL.
   *
   * VULNERABILITY FIXED: Generic type parameter for type-safe JSON parsing
   *
   * @param url - URL to fetch JSON from
   * @returns Parsed JSON data
   */
  async loadJSON<T>(url: string): Promise<T> {
    const response = await this.fetchWithRetry(url);
    const data: unknown = await response.json();
    // Note: Runtime validation should be done by caller with Zod/Pydantic-style library
    return data as T;
  }
};

export default DataLoader;

// Named export for tree-shaking
export { DataLoader, FetchError };

// Browser environment: attach to window for compatibility
if (typeof window !== 'undefined') {
  (window as unknown as Record<string, unknown>).DataLoader = DataLoader;
}

// CommonJS export for Node.js compatibility (tests)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = DataLoader;
}
