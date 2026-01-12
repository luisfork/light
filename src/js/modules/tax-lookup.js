/**
 * Tax Lookup Module
 *
 * Provides local tax rate lookups by ZIP code
 * for Texas electricity billing.
 */

const TaxLookup = {
  /**
   * Get local tax rate information for a ZIP code
   *
   * @param {string} zipCode - 5-digit ZIP code
   * @param {Object} taxData - Tax data object from local-taxes.json
   * @returns {Object} Tax info object with rate and details
   */
  getLocalTaxInfo(zipCode, taxData) {
    const zip = Number.parseInt(zipCode, 10);

    // Check major cities first for exact ZIP match
    for (const [cityName, cityData] of Object.entries(taxData.major_cities || {})) {
      if (cityData.zip_codes?.includes(zipCode)) {
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
    for (const [range, rangeData] of Object.entries(taxData.zip_code_ranges || {})) {
      const [minStr, maxStr] = range.split('-');
      const min = Number.parseInt(minStr, 10);
      const max = Number.parseInt(maxStr, 10);

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
      rate: taxData.default_local_rate || 0,
      region: 'Texas',
      tdu: null,
      deregulated: true,
      note: null
    };
  },

  /**
   * Get local tax rate for a ZIP code (simplified)
   *
   * @param {string} zipCode - 5-digit ZIP code
   * @param {Object} taxData - Tax data object
   * @returns {number} Local tax rate (0.0 - 1.0)
   */
  getLocalTaxRate(zipCode, taxData) {
    const info = this.getLocalTaxInfo(zipCode, taxData);
    return info.rate;
  },

  /**
   * Check if a ZIP code is in a deregulated area
   *
   * @param {string} zipCode - 5-digit ZIP code
   * @param {Object} taxData - Tax data object
   * @returns {Object} Deregulation info
   */
  checkDeregulationStatus(zipCode, taxData) {
    const info = this.getLocalTaxInfo(zipCode, taxData);
    return {
      isDeregulated: info.deregulated,
      tdu: info.tdu,
      reason: info.note
    };
  }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = TaxLookup;
}
