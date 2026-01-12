/**
 * Currency and Rate Formatters Module
 *
 * Provides consistent formatting for currency amounts,
 * electricity rates, and date/time values.
 */

const Formatters = {
  /**
   * Format currency for display
   *
   * @param {number} amount - Dollar amount
   * @returns {string} Formatted string
   */
  formatCurrency(amount) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  },

  /**
   * Format rate for display
   *
   * @param {number} rate - Rate in cents per kWh
   * @returns {string} Formatted string
   */
  formatRate(rate) {
    return `${rate.toFixed(2)}¢/kWh`;
  },

  /**
   * Get month name from number (0-11)
   *
   * @param {number} monthIndex - Month index (0-11)
   * @returns {string} Month name
   */
  getMonthName(monthIndex) {
    const months = [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December'
    ];
    return months[monthIndex];
  },

  /**
   * Get short month name from number (0-11)
   *
   * @param {number} monthIndex - Month index (0-11)
   * @returns {string} Short month name
   */
  getMonthNameShort(monthIndex) {
    const months = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec'
    ];
    return months[monthIndex];
  }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Formatters;
}

// Also export individual functions for backwards compatibility
const _formatCurrency = Formatters.formatCurrency.bind(Formatters);
const _formatRate = Formatters.formatRate.bind(Formatters);
const _getMonthName = Formatters.getMonthName.bind(Formatters);
