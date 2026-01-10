/**
 * Light - Plan Deduplication Module
 *
 * Detects and removes duplicate electricity plans
 * (e.g., English/Spanish versions of the same plan).
 */

const Deduplication = {
  /**
   * Create a fingerprint for a plan to detect duplicates
   *
   * Duplicates typically occur when providers list the same plan in both English and Spanish
   * with identical pricing and terms but different plan names.
   *
   * @param {Object} plan - Plan object
   * @returns {string} Plan fingerprint
   */
  createPlanFingerprint(plan) {
    // Normalize and round values to avoid floating point comparison issues
    const normalizePrice = (price) => Math.round((price || 0) * 1000) / 1000;
    const normalizeFee = (fee) => Math.round((fee || 0) * 100) / 100;

    // Create fingerprint from key identifying fields
    // Note: We intentionally exclude plan_name and plan_id as these differ for duplicates
    return JSON.stringify({
      rep: (plan.rep_name || '').toUpperCase().trim(),
      tdu: (plan.tdu_area || '').toUpperCase().trim(),
      p500: normalizePrice(plan.price_kwh_500),
      p1000: normalizePrice(plan.price_kwh_1000),
      p2000: normalizePrice(plan.price_kwh_2000),
      term: plan.term_months || 0,
      etf: normalizeFee(plan.early_termination_fee),
      base: normalizeFee(plan.base_charge_monthly),
      renewable: plan.renewable_pct || 0,
      prepaid: !!plan.is_prepaid,
      tou: !!plan.is_tou
    });
  },

  /**
   * Calculate a preference score for a plan name
   * Higher scores indicate more preferred plans (e.g., English, shorter names)
   *
   * @param {string} planName - Plan name to check
   * @param {string} specialTerms - Optional special terms text
   * @returns {number} Preference score (higher = more preferred)
   */
  calculatePlanPreference(planName, specialTerms = '') {
    let score = 100;
    const text = `${planName} ${specialTerms}`.toLowerCase();

    // Penalize Spanish-specific characters and patterns
    if (text.includes('ñ')) score -= 20;
    if (
      text.includes('á') ||
      text.includes('é') ||
      text.includes('í') ||
      text.includes('ó') ||
      text.includes('ú')
    )
      score -= 10;
    if (text.includes('ción')) score -= 15;

    // Penalize longer names (usually Spanish translations are wordier)
    const nameLength = planName.length;
    if (nameLength > 50) score -= 15;
    else if (nameLength > 30) score -= 10;
    else if (nameLength > 20) score -= 5;

    // Prefer names with fewer special characters
    const specialChars = (planName.match(/[^a-zA-Z0-9\s-]/g) || []).length;
    score -= specialChars * 2;

    return score;
  },

  /**
   * Deduplicate plans by identifying and removing duplicate versions
   *
   * Some REPs list identical plans in both English and Spanish versions.
   * This function detects duplicates based on plan features (prices, terms, fees)
   * and keeps the preferred version (typically English, shorter name).
   *
   * @param {Array} plans - Array of plan objects
   * @returns {Object} Object with deduplicated array, duplicate count, and original count
   */
  deduplicatePlans(plans) {
    const fingerprintMap = new Map();
    const duplicateDetails = [];
    let duplicateCount = 0;

    for (const plan of plans) {
      const fingerprint = this.createPlanFingerprint(plan);

      if (!fingerprintMap.has(fingerprint)) {
        // First occurrence, keep it
        fingerprintMap.set(fingerprint, {
          plan: plan,
          preference: this.calculatePlanPreference(plan.plan_name, plan.special_terms)
        });
      } else {
        // Duplicate found - compare based on plan features
        duplicateCount++;
        const existing = fingerprintMap.get(fingerprint);
        const currentPreference = this.calculatePlanPreference(plan.plan_name, plan.special_terms);

        // Keep the plan with higher preference score
        const keepCurrent = currentPreference > existing.preference;

        if (keepCurrent) {
          duplicateDetails.push({
            removed: existing.plan.plan_name,
            kept: plan.plan_name,
            provider: plan.rep_name
          });
          fingerprintMap.set(fingerprint, {
            plan: plan,
            preference: currentPreference
          });
        } else {
          duplicateDetails.push({
            removed: plan.plan_name,
            kept: existing.plan.plan_name,
            provider: plan.rep_name
          });
        }
      }
    }

    const deduplicated = Array.from(fingerprintMap.values()).map((entry) => entry.plan);

    return {
      deduplicated: deduplicated,
      duplicateCount: duplicateCount,
      originalCount: plans.length,
      duplicateDetails: duplicateDetails
    };
  }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Deduplication;
}
