/**
 * Light - Data API Module
 *
 * Handles loading electricity plan data, TDU rates, and other resources
 */

const API = {
    /**
     * Base path for data files (relative to site root)
     */
    basePath: './data',

    /**
     * Cached data
     */
    cache: {
        plans: null,
        tduRates: null,
        localTaxes: null
    },

    /**
     * Load electricity plans from JSON file
     *
     * @returns {Promise<Object>} Plans data object
     */
    async loadPlans() {
        if (this.cache.plans) {
            return this.cache.plans;
        }

        try {
            const response = await fetch(`${this.basePath}/plans.json`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            this.cache.plans = data;
            return data;
        } catch (error) {
            console.error('Error loading plans:', error);
            throw new Error('Failed to load electricity plans. Please try again later.');
        }
    },

    /**
     * Load TDU rates from JSON file
     *
     * @returns {Promise<Object>} TDU rates data object
     */
    async loadTDURates() {
        if (this.cache.tduRates) {
            return this.cache.tduRates;
        }

        try {
            const response = await fetch(`${this.basePath}/tdu-rates.json`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            this.cache.tduRates = data;
            return data;
        } catch (error) {
            console.error('Error loading TDU rates:', error);
            throw new Error('Failed to load TDU delivery rates. Please try again later.');
        }
    },

    /**
     * Load local tax rates from JSON file
     *
     * @returns {Promise<Object>} Local tax data object
     */
    async loadLocalTaxes() {
        if (this.cache.localTaxes) {
            return this.cache.localTaxes;
        }

        try {
            const response = await fetch(`${this.basePath}/local-taxes.json`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            this.cache.localTaxes = data;
            return data;
        } catch (error) {
            console.error('Error loading local taxes:', error);
            // Non-critical, return default
            return {
                last_updated: new Date().toISOString(),
                state_sales_tax: 0.0,
                cities_with_local_tax: []
            };
        }
    },

    /**
     * Get TDU rates for a specific TDU code
     *
     * @param {string} tduCode - TDU code (e.g., 'ONCOR', 'CENTERPOINT')
     * @returns {Promise<Object|null>} TDU rate object or null
     */
    async getTDUByCode(tduCode) {
        const data = await this.loadTDURates();
        const tdu = data.tdus.find(t => t.code === tduCode);
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
        return data.plans.filter(plan => plan.tdu_area === tduCode);
    },

    /**
     * Get local tax rate for a ZIP code
     *
     * @param {string} zipCode - 5-digit ZIP code
     * @returns {Promise<number>} Local tax rate (0.0 - 1.0)
     */
    async getLocalTaxRate(zipCode) {
        const data = await this.loadLocalTaxes();

        // For now, return 0 as most residential electricity is tax-exempt
        // In production, this would lookup the specific city
        return 0.0;
    },

    /**
     * Clear cached data
     */
    clearCache() {
        this.cache = {
            plans: null,
            tduRates: null,
            localTaxes: null
        };
    },

    /**
     * Get data freshness information
     *
     * @returns {Promise<Object>} Data freshness info
     */
    async getDataFreshness() {
        const plansData = await this.loadPlans();
        const tduData = await this.loadTDURates();

        return {
            plansUpdated: plansData.last_updated,
            tduRatesUpdated: tduData.last_updated,
            tduRatesEffective: tduData.effective_date,
            tduRatesNextUpdate: tduData.next_update
        };
    }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = API;
}
