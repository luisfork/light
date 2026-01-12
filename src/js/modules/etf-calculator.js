/**
 * ETF Calculator Module
 *
 * Calculates early termination fees, properly handling
 * per-month-remaining fee structures.
 */

const ETFCalculator = {
  /**
   * Calculate early termination fee based on remaining contract months
   *
   * Properly calculates ETF for contracts with per-month-remaining fees.
   * Many plans charge $10-$20 per month remaining instead of a flat fee.
   *
   * @param {Object} plan - Plan object
   * @param {number} monthsRemaining - Months remaining in contract
   * @returns {Object} ETF calculation result with total and structure type
   */
  calculateEarlyTerminationFee(plan, monthsRemaining) {
    // Parse the ETF value - handle various formats
    let etfValue = 0;
    let etfStructure = 'flat';
    let perMonthRate = 0;

    // First check special_terms for per-month patterns
    if (plan.special_terms) {
      const terms = plan.special_terms.toLowerCase();

      // Pattern 1: "$X per month remaining" or "$X/month remaining"
      const perMonthMatch = terms.match(
        /\$(\d+(?:\.\d{2})?)\s*(?:per|\/)\s*(?:each\s+)?(?:month|mo)(?:nth)?\s*(?:remaining|left|of\s+(?:the\s+)?(?:contract|term))/i
      );
      if (perMonthMatch) {
        perMonthRate = Number.parseFloat(perMonthMatch[1]);
        etfStructure = 'per-month';
      }

      // Pattern 2: "$X times remaining months" or "$X x months remaining"
      if (!perMonthRate) {
        const timesMatch = terms.match(
          /\$(\d+(?:\.\d{2})?)\s*(?:times|x|×|\*)\s*(?:the\s+)?(?:number\s+of\s+)?(?:remaining\s+)?months?\s*(?:remaining|left|in\s+(?:the\s+)?(?:contract|term))?/i
        );
        if (timesMatch) {
          perMonthRate = Number.parseFloat(timesMatch[1]);
          etfStructure = 'per-month';
        }
      }

      // Pattern 2.5: "multiplied by months remaining" or "for each month left"
      if (!perMonthRate) {
        const multipliedMatch = terms.match(
          /\$(\d+(?:\.\d{2})?)\s*(?:multiplied\s+by|for\s+each)\s+(?:remaining\s+)?months?\s*(?:remaining|left)?/i
        );
        if (multipliedMatch) {
          perMonthRate = Number.parseFloat(multipliedMatch[1]);
          etfStructure = 'per-month';
        }
      }

      // Pattern 2.6: "cancellation fee equals $X per remaining month"
      if (!perMonthRate) {
        const equalsMatch = terms.match(
          /(?:cancellation|termination|early\s+termination)\s+fee\s+(?:equals|is|of)\s+\$(\d+(?:\.\d{2})?)\s*(?:per|\/|for\s+each)\s+(?:remaining\s+)?months?\s*(?:remaining|left)?/i
        );
        if (equalsMatch) {
          perMonthRate = Number.parseFloat(equalsMatch[1]);
          etfStructure = 'per-month';
        }
      }

      // Pattern 2.7: "$X multiplied by the number of months remaining" or "$X multiplied by months remaining"
      if (!perMonthRate) {
        const multipliedByMatch = terms.match(
          /\$(\d+(?:\.\d{2})?)\s+multiplied\s+by\s+(?:the\s+)?(?:number\s+of\s+)?months?\s+remaining/i
        );
        if (multipliedByMatch) {
          perMonthRate = Number.parseFloat(multipliedByMatch[1]);
          etfStructure = 'per-month';
        }
      }

      // Pattern 3: "months remaining" followed by "$X" or "$X" followed by "months remaining"
      if (!perMonthRate) {
        const monthsFirstMatch = terms.match(
          /(?:months?\s+(?:remaining|left)).*?\$(\d+(?:\.\d{2})?)|(?:\$(\d+(?:\.\d{2})?)).*?(?:months?\s+(?:remaining|left))/i
        );
        if (monthsFirstMatch) {
          const rate = Number.parseFloat(monthsFirstMatch[1] || monthsFirstMatch[2]);
          // Only treat as per-month if the value is reasonably small (≤$50)
          if (rate <= 50) {
            perMonthRate = rate;
            etfStructure = 'per-month';
          }
        }
      }

      // Pattern 4: "per remaining month" without explicit dollar amount
      if (
        !perMonthRate &&
        (terms.includes('per remaining month') ||
          terms.includes('per month remaining') ||
          terms.includes('each remaining month') ||
          terms.includes('multiplied by months remaining') ||
          terms.includes('times months remaining'))
      ) {
        // ETF value is the per-month rate
        if (plan.early_termination_fee && plan.early_termination_fee <= 50) {
          perMonthRate = plan.early_termination_fee;
          etfStructure = 'per-month';
        }
      }
    }

    // If we found a per-month pattern, calculate total ETF
    if (etfStructure === 'per-month' && perMonthRate > 0) {
      etfValue = perMonthRate * monthsRemaining;
      return {
        total: etfValue,
        structure: 'per-month',
        perMonthRate: perMonthRate,
        monthsRemaining: monthsRemaining
      };
    }

    // Handle the base ETF value
    if (!plan.early_termination_fee) {
      return { total: 0, structure: 'none', perMonthRate: 0, monthsRemaining: monthsRemaining };
    }

    etfValue = plan.early_termination_fee;

    // Heuristic: If ETF is small ($50 or less) and contract is long (12+ months),
    // it's likely a per-month fee even if not explicitly stated
    if (etfValue <= 50 && plan.term_months >= 12) {
      return {
        total: etfValue * monthsRemaining,
        structure: 'per-month-inferred',
        perMonthRate: etfValue,
        monthsRemaining: monthsRemaining
      };
    }

    // Otherwise, it's a flat fee
    return {
      total: etfValue,
      structure: 'flat',
      perMonthRate: 0,
      monthsRemaining: monthsRemaining
    };
  },

  /**
   * Get the display value for early termination fee
   *
   * @param {Object} plan - Plan object
   * @param {number} monthsRemaining - Optional, defaults to contract midpoint
   * @returns {Object} Display information for ETF
   */
  getETFDisplayInfo(plan, monthsRemaining = null) {
    if (monthsRemaining === null) {
      monthsRemaining = Math.floor((plan.term_months || 12) / 2);
    }

    const result = this.calculateEarlyTerminationFee(plan, monthsRemaining);

    // Create display string with confirmation notice for uncertain cases
    let displayText;
    let needsConfirmation = false;

    if (result.structure === 'none') {
      // Check if special_terms mentions cancellation/termination fees that we couldn't parse
      if (plan.special_terms && /cancel|terminat|early|etf/i.test(plan.special_terms)) {
        displayText = 'See EFL';
        needsConfirmation = true;
      } else {
        displayText = 'None';
      }
    } else if (result.structure === 'flat') {
      displayText = this.formatCurrency(result.total);
    } else if (result.structure === 'per-month-inferred') {
      // Inferred structure - add asterisk to indicate estimate
      displayText = `$${result.perMonthRate}/mo*`;
      needsConfirmation = true;
    } else {
      // Per-month structure (explicitly detected)
      displayText = `$${result.perMonthRate}/mo remaining`;
    }

    return {
      ...result,
      displayText: displayText,
      exampleTotal: result.total,
      exampleMonths: monthsRemaining,
      needsConfirmation: needsConfirmation
    };
  },

  /**
   * Simple currency formatter
   *
   * @param {number} amount - Dollar amount
   * @returns {string} Formatted string
   */
  formatCurrency(amount) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ETFCalculator;
}

// Also export individual functions for backwards compatibility
const _calculateEarlyTerminationFee =
  ETFCalculator.calculateEarlyTerminationFee.bind(ETFCalculator);
const _getETFDisplayInfo = ETFCalculator.getETFDisplayInfo.bind(ETFCalculator);
