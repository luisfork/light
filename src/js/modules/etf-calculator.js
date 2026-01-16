/**
 * ETF Calculator Module
 *
 * Calculates early termination fees, properly handling
 * per-month-remaining fee structures.
 */

const ETFCalculator = {
  normalizeEtfDetails(plan) {
    if (!plan) return null;
    let details = plan.etf_details || plan.etfDetails || null;
    if (!details) return null;

    if (typeof details === 'string') {
      try {
        details = JSON.parse(details);
      } catch {
        return null;
      }
    }

    if (!details || typeof details !== 'object') return null;

    const structure = (details.structure || '').toLowerCase();
    if (!structure) return null;

    return {
      structure,
      perMonthRate: Number.parseFloat(
        details.per_month_rate ?? details.perMonthRate ?? details.per_month ?? details.rate ?? 0
      ),
      flatFee: Number.parseFloat(details.flat_fee ?? details.flatFee ?? details.amount ?? 0),
      source: details.source || null
    };
  },

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
    let hasNoFeeLanguage = false;
    let isConditionalNoFee = false;
    let hasUnspecifiedFeeLanguage = false;

    const etfDetails = this.normalizeEtfDetails(plan);
    if (etfDetails) {
      if (etfDetails.structure === 'none') {
        return {
          total: 0,
          structure: 'none',
          perMonthRate: 0,
          monthsRemaining: monthsRemaining
        };
      }

      if (etfDetails.structure === 'unknown') {
        return {
          total: 0,
          structure: 'unknown',
          perMonthRate: 0,
          monthsRemaining: monthsRemaining
        };
      }

      if (etfDetails.structure === 'flat' && Number.isFinite(etfDetails.flatFee)) {
        return {
          total: etfDetails.flatFee,
          structure: 'flat',
          perMonthRate: 0,
          monthsRemaining: monthsRemaining
        };
      }

      if (etfDetails.structure === 'per-month' && Number.isFinite(etfDetails.perMonthRate)) {
        return {
          total: etfDetails.perMonthRate * monthsRemaining,
          structure: 'per-month',
          perMonthRate: etfDetails.perMonthRate,
          monthsRemaining: monthsRemaining
        };
      }
    }

    // First check known text fields for per-month patterns
    const termsSources = [
      plan.special_terms,
      plan.fees_credits,
      plan.promotion_details,
      plan.min_usage_fees
    ]
      .filter(Boolean)
      .join(' | ');

    if (termsSources) {
      const terms = termsSources.toLowerCase().replace(/\s+/g, ' ').trim();

      // Detect explicit no-fee language
      const noFeePatterns = [
        /no\s+(?:early\s+)?(?:termination|cancellation)\s+fee/i,
        /no\s+cancel(?:lation)?\s+fee/i,
        /no\s+etf\b/i,
        /without\s+(?:an?\s+)?early\s+termination\s+fee/i,
        /(?:termination|cancellation)\s+fee\s*(?:is|of)?\s*\$?0\b/i,
        /fee\s+waived/i,
        /waiv(?:e|ed)\s+(?:the\s+)?(?:termination|cancellation)\s+fee/i
      ];
      hasNoFeeLanguage = noFeePatterns.some((pattern) => pattern.test(terms));

      // Detect conditional no-fee language (e.g., moving)
      const conditionalNoFeePatterns = [
        /no\s+(?:early\s+)?(?:termination|cancellation)\s+fee\s+if\s+you\s+move/i,
        /waiv(?:e|ed)\s+(?:the\s+)?(?:termination|cancellation)\s+fee\s+if\s+you\s+move/i,
        /no\s+fee\s+for\s+moving/i,
        /fee\s+waived\s+for\s+moving/i
      ];
      isConditionalNoFee = conditionalNoFeePatterns.some((pattern) => pattern.test(terms));

      // Detect unspecified fee language (fee applies but no amount listed)
      const unspecifiedFeePatterns = [
        /early\s+termination\s+fee\s+applies/i,
        /cancellation\s+fee\s+applies/i,
        /termination\s+fee\s+applies/i,
        /early\s+termination\s+fee\s+may\s+apply/i,
        /cancellation\s+fee\s+may\s+apply/i,
        /termination\s+fee\s+may\s+apply/i,
        /early\s+termination\s+fee\s+will\s+apply/i,
        /cancellation\s+fee\s+will\s+apply/i
      ];
      hasUnspecifiedFeeLanguage = unspecifiedFeePatterns.some((pattern) => pattern.test(terms));

      // Pattern 1: "$X per month remaining" or "$X/month remaining"
      const perMonthMatch = terms.match(
        /\$(\d+(?:\.\d{2})?)\s*(?:per|\/)\s*(?:each\s+)?(?:month|mo)(?:nth)?\s*(?:remaining|left|of\s+(?:the\s+)?(?:contract|term))/i
      );
      if (perMonthMatch) {
        perMonthRate = Number.parseFloat(perMonthMatch[1]);
        etfStructure = 'per-month';
      }

      // Pattern 1b: "20 per month remaining" (no dollar sign)
      if (!perMonthRate) {
        const perMonthNoDollarMatch = terms.match(
          /(\d+(?:\.\d{2})?)\s*(?:per|\/)\s*(?:each\s+)?(?:month|mo)(?:nth)?\s*(?:remaining|left|of\s+(?:the\s+)?(?:contract|term))/i
        );
        if (perMonthNoDollarMatch) {
          const parsed = Number.parseFloat(perMonthNoDollarMatch[1]);
          if (parsed <= 75) {
            perMonthRate = parsed;
            etfStructure = 'per-month';
          }
        }
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

      // Fixed fee parsing if not provided
      if (!perMonthRate && !plan.early_termination_fee) {
        const fixedFeeMatch = terms.match(
          /(?:early\s+termination|termination|cancellation)\s+(?:fee|charge)\s*(?:is|of|:)?\s*\$?(\d+(?:\.\d{2})?)/i
        );
        if (fixedFeeMatch) {
          etfValue = Number.parseFloat(fixedFeeMatch[1]);
          etfStructure = 'flat';
        }
      }
    }

    if (hasNoFeeLanguage) {
      return {
        total: 0,
        structure: isConditionalNoFee ? 'none-conditional' : 'none',
        perMonthRate: 0,
        monthsRemaining: monthsRemaining
      };
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
    const numericETF = Number.parseFloat(plan.early_termination_fee);
    const hasExplicitETFValue = Number.isFinite(numericETF) && numericETF > 0;
    const isZeroOrMissingETF = !Number.isFinite(numericETF) || numericETF === 0;

    if (!hasExplicitETFValue && !etfValue) {
      // If fee is unspecified but terms indicate a fee applies, mark as unknown
      if (hasUnspecifiedFeeLanguage) {
        return {
          total: 0,
          structure: 'unknown',
          perMonthRate: 0,
          monthsRemaining: monthsRemaining
        };
      }

      // If ETF value is 0/missing for longer contracts, treat as unknown unless explicit no-fee language exists
      if (isZeroOrMissingETF && (plan.term_months || 0) >= 2) {
        return {
          total: 0,
          structure: 'unknown',
          perMonthRate: 0,
          monthsRemaining: monthsRemaining
        };
      }

      return { total: 0, structure: 'none', perMonthRate: 0, monthsRemaining: monthsRemaining };
    }

    if (!etfValue) {
      etfValue = Number.isFinite(numericETF) ? numericETF : 0;
    }

    // Avoid misclassifying small prepaid ETFs as per-month
    if (etfValue > 0 && plan.is_prepaid) {
      return {
        total: etfValue,
        structure: 'flat',
        perMonthRate: 0,
        monthsRemaining: monthsRemaining
      };
    }

    // For small ETFs on long contracts without explicit per-month language, mark as unknown
    if (etfValue <= 50 && (plan.term_months || 0) >= 12) {
      return {
        total: 0,
        structure: 'unknown',
        perMonthRate: 0,
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

    if (result.structure === 'none' || result.structure === 'none-conditional') {
      // Check if special_terms mentions cancellation/termination fees that we couldn't parse
      if (plan.special_terms && /cancel|terminat|early|etf|fee/i.test(plan.special_terms)) {
        displayText = 'See EFL';
        needsConfirmation = true;
      } else {
        displayText = 'None';
      }
    } else if (result.structure === 'unknown') {
      displayText = 'See EFL';
      needsConfirmation = true;
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
