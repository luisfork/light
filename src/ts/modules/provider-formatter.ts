/**
 * Provider Formatter Module
 *
 * Formats electricity provider names for consistent,
 * professional display.
 *
 * VULNERABILITY FIXED: Added null check for input
 * VULNERABILITY FIXED: Type-safe iteration over suffixes
 */

/**
 * Legal suffixes to remove from provider names.
 * Ordered by specificity (longer matches first).
 */
const LEGAL_SUFFIXES = [
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
  ' RETAIL',
  ' SERVICES'
] as const;

/**
 * Provider Formatter singleton.
 * Handles provider name normalization.
 */
const ProviderFormatter = {
  /**
   * Expose suffixes for testing.
   */
  suffixes: LEGAL_SUFFIXES,

  /**
   * Format provider name by uppercasing and removing common legal suffixes.
   *
   * VULNERABILITY FIXED: Null/undefined safety
   * Before: if (!name) return '';
   * After: Explicit null check with type narrowing
   *
   * @param name - Original provider name
   * @returns Formatted provider name (uppercase, no legal suffixes)
   */
  formatProviderName(name: string | null | undefined): string {
    // VULNERABILITY FIXED: Explicit null/undefined check
    if (name == null || name === '') {
      return '';
    }

    // Convert to uppercase and trim
    let formatted = name.toUpperCase().trim();

    // Keep removing suffixes until none match
    let changed = true;
    while (changed) {
      changed = false;
      for (const suffix of LEGAL_SUFFIXES) {
        if (formatted.endsWith(suffix)) {
          formatted = formatted.slice(0, -suffix.length).trim();
          changed = true;
          break;
        }
      }
    }

    // Clean up any trailing commas, periods, or whitespace
    formatted = formatted.replace(/[,.\s]+$/, '');

    return formatted;
  }
};

export default ProviderFormatter;

// Named export for tree-shaking
export { ProviderFormatter, LEGAL_SUFFIXES };

// Browser environment: attach to window for compatibility
if (typeof window !== 'undefined') {
  (window as unknown as Record<string, unknown>).ProviderFormatter = ProviderFormatter;
}

// CommonJS export for Node.js compatibility (tests)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ProviderFormatter;
}

// Backwards compatibility export
export const formatProviderName = ProviderFormatter.formatProviderName.bind(ProviderFormatter);
