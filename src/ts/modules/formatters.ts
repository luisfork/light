/**
 * Currency and Rate Formatters Module
 *
 * Provides consistent formatting for currency amounts,
 * electricity rates, and date/time values.
 *
 * VULNERABILITY FIXED: Added type safety for all formatters
 * VULNERABILITY FIXED: Safe array access for month names
 */

/**
 * Full month names for display.
 */
const MONTH_NAMES = [
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
] as const;

/**
 * Short month names for compact display.
 */
const MONTH_NAMES_SHORT = [
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
] as const;

/**
 * Month index type (0-11).
 */
type MonthIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11;

/**
 * Formatters singleton.
 * Provides consistent formatting across the application.
 */
const Formatters = {
  /**
   * Cached Intl.NumberFormat instance for currency.
   * Improves performance by reusing the formatter.
   */
  _currencyFormatter: new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }),

  /**
   * Format currency for display.
   *
   * @param amount - Dollar amount
   * @returns Formatted string (e.g., "$1,234.56")
   */
  formatCurrency(amount: number): string {
    return this._currencyFormatter.format(amount);
  },

  /**
   * Format rate for display.
   *
   * VULNERABILITY FIXED: Input validation for NaN
   *
   * @param rate - Rate in cents per kWh
   * @returns Formatted string (e.g., "12.50¢/kWh")
   */
  formatRate(rate: number): string {
    // VULNERABILITY FIXED: Handle NaN gracefully
    if (Number.isNaN(rate)) {
      return '0.00¢/kWh';
    }
    return `${rate.toFixed(2)}¢/kWh`;
  },

  /**
   * Get month name from index (0-11).
   *
   * VULNERABILITY FIXED: Safe array access with bounds check
   *
   * @param monthIndex - Month index (0-11)
   * @returns Month name or empty string if invalid
   */
  getMonthName(monthIndex: number): string {
    // VULNERABILITY FIXED: Bounds check for array access
    if (monthIndex < 0 || monthIndex > 11 || !Number.isInteger(monthIndex)) {
      return '';
    }
    // Safe access after bounds check
    return MONTH_NAMES[monthIndex as MonthIndex];
  },

  /**
   * Get short month name from index (0-11).
   *
   * VULNERABILITY FIXED: Safe array access with bounds check
   *
   * @param monthIndex - Month index (0-11)
   * @returns Short month name or empty string if invalid
   */
  getMonthNameShort(monthIndex: number): string {
    // VULNERABILITY FIXED: Bounds check for array access
    if (monthIndex < 0 || monthIndex > 11 || !Number.isInteger(monthIndex)) {
      return '';
    }
    // Safe access after bounds check
    return MONTH_NAMES_SHORT[monthIndex as MonthIndex];
  },

  /**
   * Format a percentage for display.
   *
   * @param value - Percentage value (0-100)
   * @param decimals - Number of decimal places
   * @returns Formatted string (e.g., "85%")
   */
  formatPercentage(value: number, decimals: number = 0): string {
    if (Number.isNaN(value)) {
      return '0%';
    }
    return `${value.toFixed(decimals)}%`;
  },

  /**
   * Format kWh usage for display.
   *
   * @param kwh - Usage in kilowatt-hours
   * @returns Formatted string (e.g., "1,234 kWh")
   */
  formatKwh(kwh: number): string {
    if (Number.isNaN(kwh)) {
      return '0 kWh';
    }
    const formatted = new Intl.NumberFormat('en-US', {
      maximumFractionDigits: 0
    }).format(kwh);
    return `${formatted} kWh`;
  }
};

export default Formatters;

// Named export for tree-shaking
export { Formatters, MONTH_NAMES, MONTH_NAMES_SHORT };

// Browser environment: attach to window for compatibility
if (typeof window !== 'undefined') {
  (window as unknown as Record<string, unknown>)['Formatters'] = Formatters;
}

// CommonJS export for Node.js compatibility (tests)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Formatters;
}

// Backwards compatibility exports
export const formatCurrency = Formatters.formatCurrency.bind(Formatters);
export const formatRate = Formatters.formatRate.bind(Formatters);
export const getMonthName = Formatters.getMonthName.bind(Formatters);
export const getMonthNameShort = Formatters.getMonthNameShort.bind(Formatters);
