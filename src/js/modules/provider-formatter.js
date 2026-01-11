/**
 * Provider Formatter Module
 *
 * Formats electricity provider names for consistent,
 * professional display.
 */

const ProviderFormatter = {
  /**
   * Legal suffixes to remove from provider names
   */
  suffixes: [
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
    ' COMPANY'
  ],

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

    // Keep removing suffixes until none match
    let changed = true;
    while (changed) {
      changed = false;
      for (const suffix of this.suffixes) {
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
  module.exports = ProviderFormatter;
}
