/**
 * Data Loader Module
 *
 * Handles fetching data with retry logic, exponential backoff,
 * and timeout handling.
 */

const DataLoader = {
  /**
   * Default configuration
   */
  config: {
    retryCount: 3,
    retryDelay: 1000, // Base delay in ms
    timeout: 10000 // 10 second timeout
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
   * Load JSON data from URL
   *
   * @param {string} url - URL to fetch JSON from
   * @returns {Promise<Object>} Parsed JSON data
   */
  async loadJSON(url) {
    const response = await this.fetchWithRetry(url);
    return response.json();
  }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = DataLoader;
}
