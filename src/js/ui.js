// src/ts/utils/logger.ts
var LOG_LEVEL_PRIORITY = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3
};
var Logger = {
  level: "info",
  shouldLog(level) {
    return LOG_LEVEL_PRIORITY[level] >= LOG_LEVEL_PRIORITY[this.level];
  },
  formatEntry(entry) {
    return `[${entry.timestamp}] [${entry.level.toUpperCase()}] ${entry.message}`;
  },
  _log(level, message, context) {
    if (!this.shouldLog(level)) {
      return;
    }
    const entry = context !== undefined ? { level, message, timestamp: new Date().toISOString(), context } : { level, message, timestamp: new Date().toISOString() };
    const formatted = this.formatEntry(entry);
    switch (level) {
      case "error":
        if (context !== undefined) {
          console.error(formatted, context);
        } else {
          console.error(formatted);
        }
        break;
      case "warn":
        if (context !== undefined) {
          console.warn(formatted, context);
        } else {
          console.warn(formatted);
        }
        break;
      case "debug":
        if (context !== undefined) {
          console.debug(formatted, context);
        } else {
          console.debug(formatted);
        }
        break;
      default:
        if (context !== undefined) {
          console.info(formatted, context);
        } else {
          console.info(formatted);
        }
    }
  },
  debug(message, context) {
    this._log("debug", message, context);
  },
  info(message, context) {
    this._log("info", message, context);
  },
  warn(message, context) {
    this._log("warn", message, context);
  },
  error(message, context) {
    this._log("error", message, context);
  },
  setLevel(level) {
    this.level = level;
  },
  withPrefix(prefix) {
    return {
      debug: (msg, ctx) => this.debug(`[${prefix}] ${msg}`, ctx),
      info: (msg, ctx) => this.info(`[${prefix}] ${msg}`, ctx),
      warn: (msg, ctx) => this.warn(`[${prefix}] ${msg}`, ctx),
      error: (msg, ctx) => this.error(`[${prefix}] ${msg}`, ctx)
    };
  }
};
var logger_default = Logger;
if (typeof window !== "undefined") {
  window["Logger"] = Logger;
}

// src/ts/api.ts
var logger = logger_default.withPrefix("API");
var LEGAL_SUFFIXES = [
  ", LLC",
  ", INC",
  ", LP",
  ", & CO",
  " LLC",
  " INC",
  " LP",
  " & CO",
  " (TX)",
  " (TEXAS)",
  " COMPANY",
  " SERVICES",
  " RETAIL"
];
var API = {
  basePath: typeof window !== "undefined" && window.location.pathname.includes("/src/") ? "../data" : "./data",
  cacheConfig: {
    maxAge: 5 * 60 * 1000,
    retryCount: 3,
    retryDelay: 1000
  },
  cache: {
    plans: { data: null, timestamp: 0 },
    tduRates: { data: null, timestamp: 0 },
    localTaxes: { data: null, timestamp: 0 }
  },
  loadingPromises: {
    plans: null,
    tduRates: null,
    localTaxes: null
  },
  isCacheValid(key) {
    const cached = this.cache[key];
    if (cached.data === null)
      return false;
    return Date.now() - cached.timestamp < this.cacheConfig.maxAge;
  },
  async fetchWithRetry(url, options = {}) {
    let lastError = null;
    const { retryCount, retryDelay } = this.cacheConfig;
    for (let attempt = 0;attempt < retryCount; attempt++) {
      try {
        const controller = new AbortController;
        const timeoutId = setTimeout(() => controller.abort(), 1e4);
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
        lastError = error instanceof Error ? error : new Error(String(error));
        if (lastError.name === "AbortError" || attempt === retryCount - 1) {
          break;
        }
        const delay = retryDelay * 2 ** attempt + Math.random() * 500;
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
    throw lastError ?? new Error("Fetch failed");
  },
  async loadPlans(forceRefresh = false) {
    if (!forceRefresh && this.isCacheValid("plans")) {
      return this.cache.plans.data;
    }
    if (this.loadingPromises.plans !== null) {
      return this.loadingPromises.plans;
    }
    this.loadingPromises.plans = (async () => {
      try {
        const response = await this.fetchWithRetry(`${this.basePath}/plans.json`);
        const data = await response.json();
        if (data === null || !Array.isArray(data.plans)) {
          throw new Error("Invalid plans data structure");
        }
        data.plans = data.plans.map((plan) => ({
          ...plan,
          rep_name: this.formatProviderName(plan.rep_name)
        }));
        const originalPlanCount = data.plans.length;
        const result = this.deduplicatePlans(data.plans);
        data.plans = result.deduplicated;
        data.total_plans = result.deduplicated.length;
        if (result.duplicateCount > 0) {
          logger.info(`Deduplication: ${originalPlanCount} total, ${result.duplicateCount} removed, ${data.total_plans} unique`);
        }
        this.cache.plans = { data, timestamp: Date.now() };
        return data;
      } catch (error) {
        logger.error("Error loading plans", { error });
        if (this.cache.plans.data !== null) {
          logger.warn("Returning stale plans data");
          return this.cache.plans.data;
        }
        throw new Error("Failed to load electricity plans. Please try again later.");
      } finally {
        this.loadingPromises.plans = null;
      }
    })();
    return this.loadingPromises.plans;
  },
  async loadTDURates(forceRefresh = false) {
    if (!forceRefresh && this.isCacheValid("tduRates")) {
      return this.cache.tduRates.data;
    }
    if (this.loadingPromises.tduRates !== null) {
      return this.loadingPromises.tduRates;
    }
    this.loadingPromises.tduRates = (async () => {
      try {
        const response = await this.fetchWithRetry(`${this.basePath}/tdu-rates.json`);
        const data = await response.json();
        if (data === null || !Array.isArray(data.tdus)) {
          throw new Error("Invalid TDU rates data structure");
        }
        this.cache.tduRates = { data, timestamp: Date.now() };
        return data;
      } catch (error) {
        logger.error("Error loading TDU rates", { error });
        if (this.cache.tduRates.data !== null) {
          logger.warn("Returning stale TDU rates data");
          return this.cache.tduRates.data;
        }
        throw new Error("Failed to load TDU delivery rates. Please try again later.");
      } finally {
        this.loadingPromises.tduRates = null;
      }
    })();
    return this.loadingPromises.tduRates;
  },
  async loadLocalTaxes(forceRefresh = false) {
    if (!forceRefresh && this.isCacheValid("localTaxes")) {
      return this.cache.localTaxes.data;
    }
    if (this.loadingPromises.localTaxes !== null) {
      return this.loadingPromises.localTaxes;
    }
    this.loadingPromises.localTaxes = (async () => {
      try {
        const response = await this.fetchWithRetry(`${this.basePath}/local-taxes.json`);
        const data = await response.json();
        this.cache.localTaxes = { data, timestamp: Date.now() };
        return data;
      } catch {
        logger.warn("Error loading local taxes, using defaults");
        const defaultData = {
          last_updated: new Date().toISOString(),
          state_sales_tax: 0,
          default_local_rate: 0,
          zip_code_ranges: {},
          major_cities: {}
        };
        this.cache.localTaxes = { data: defaultData, timestamp: Date.now() };
        return defaultData;
      } finally {
        this.loadingPromises.localTaxes = null;
      }
    })();
    return this.loadingPromises.localTaxes;
  },
  async preloadAll() {
    const [plans, tduRates, localTaxes] = await Promise.all([
      this.loadPlans(),
      this.loadTDURates(),
      this.loadLocalTaxes()
    ]);
    return { plans, tduRates, localTaxes };
  },
  async getTDUByCode(tduCode) {
    const data = await this.loadTDURates();
    const tdu = data.tdus.find((t) => t.code === tduCode);
    return tdu ?? null;
  },
  async getAllTDUs() {
    const data = await this.loadTDURates();
    return data.tdus;
  },
  async getPlansByTDU(tduCode) {
    const data = await this.loadPlans();
    return data.plans.filter((plan) => plan.tdu_area === tduCode);
  },
  async getLocalTaxInfo(zipCode) {
    const data = await this.loadLocalTaxes();
    const zip = Number.parseInt(zipCode, 10);
    const majorCities = data.major_cities;
    for (const [cityName, cityData] of Object.entries(majorCities)) {
      if (cityData.zip_codes.includes(zipCode)) {
        return {
          rate: cityData.rate,
          city: cityName.replace(/_/g, " "),
          deregulated: cityData.deregulated,
          tdu: cityData.tdu ?? null
        };
      }
    }
    const ranges = data.zip_code_ranges;
    for (const [range, rangeData] of Object.entries(ranges)) {
      const [minStr, maxStr] = range.split("-");
      const min = Number.parseInt(minStr ?? "0", 10);
      const max = Number.parseInt(maxStr ?? "99999", 10);
      if (zip >= min && zip <= max) {
        return {
          rate: rangeData.rate,
          region: rangeData.region,
          deregulated: rangeData.tdu !== null,
          tdu: rangeData.tdu ?? null
        };
      }
    }
    return {
      rate: data.default_local_rate,
      region: "Texas",
      tdu: null,
      deregulated: true
    };
  },
  async getLocalTaxRate(zipCode) {
    const info = await this.getLocalTaxInfo(zipCode);
    return info.rate;
  },
  async checkDeregulationStatus(zipCode) {
    const info = await this.getLocalTaxInfo(zipCode);
    return {
      isDeregulated: info.deregulated,
      tdu: info.tdu ?? null,
      reason: null
    };
  },
  clearCache(key = null) {
    if (key !== null) {
      this.cache[key] = { data: null, timestamp: 0 };
    } else {
      this.cache = {
        plans: { data: null, timestamp: 0 },
        tduRates: { data: null, timestamp: 0 },
        localTaxes: { data: null, timestamp: 0 }
      };
    }
  },
  async getDataFreshness() {
    const [plansData, tduData] = await Promise.all([this.loadPlans(), this.loadTDURates()]);
    return {
      plansUpdated: plansData.last_updated,
      totalPlans: plansData.total_plans,
      originalPlanCount: plansData.total_plans,
      duplicateCount: 0,
      dataSource: plansData.data_source,
      tduRatesUpdated: tduData.last_updated,
      tduRatesEffective: tduData.last_updated,
      tduRatesNextUpdate: tduData.next_update
    };
  },
  getCacheStats() {
    return {
      plans: {
        cached: this.cache.plans.data !== null,
        age: this.cache.plans.timestamp > 0 ? Date.now() - this.cache.plans.timestamp : null,
        valid: this.isCacheValid("plans")
      },
      tduRates: {
        cached: this.cache.tduRates.data !== null,
        age: this.cache.tduRates.timestamp > 0 ? Date.now() - this.cache.tduRates.timestamp : null,
        valid: this.isCacheValid("tduRates")
      },
      localTaxes: {
        cached: this.cache.localTaxes.data !== null,
        age: this.cache.localTaxes.timestamp > 0 ? Date.now() - this.cache.localTaxes.timestamp : null,
        valid: this.isCacheValid("localTaxes")
      }
    };
  },
  createPlanFingerprint(plan) {
    const normalizePrice = (price) => price != null ? Math.round(price * 1000) / 1000 : 0;
    const normalizeFee = (fee) => fee != null ? Math.round(fee * 100) / 100 : 0;
    return JSON.stringify({
      rep: (plan.rep_name ?? "").toUpperCase().trim(),
      tdu: (plan.tdu_area ?? "").toUpperCase().trim(),
      rate_type: (plan.rate_type ?? "FIXED").toUpperCase().trim(),
      p500: normalizePrice(plan.price_kwh_500),
      p1000: normalizePrice(plan.price_kwh_1000),
      p2000: normalizePrice(plan.price_kwh_2000),
      term: plan.term_months ?? 0,
      etf: normalizeFee(plan.early_termination_fee),
      base: normalizeFee(plan.base_charge_monthly),
      renewable: plan.renewable_pct ?? 0,
      prepaid: Boolean(plan.is_prepaid),
      tou: Boolean(plan.is_tou)
    });
  },
  calculatePlanPreference(plan) {
    let score = 100;
    const planName = plan.plan_name ?? "";
    const specialTerms = plan.special_terms ?? "";
    const language = (plan.language ?? "").toLowerCase();
    const text = `${planName} ${specialTerms}`.toLowerCase();
    if (language === "english")
      score += 50;
    else if (language === "spanish" || language === "español")
      score -= 50;
    if (text.includes("ñ"))
      score -= 20;
    if (/[áéíóú]/.test(text))
      score -= 10;
    if (text.includes("ción"))
      score -= 15;
    const nameLength = planName.length;
    if (nameLength > 50)
      score -= 15;
    else if (nameLength > 30)
      score -= 10;
    else if (nameLength > 20)
      score -= 5;
    const specialChars = (planName.match(/[^a-zA-Z0-9\s-]/g) ?? []).length;
    score -= specialChars * 2;
    return score;
  },
  deduplicatePlans(plans) {
    const fingerprintMap = new Map;
    let duplicateCount = 0;
    let orphanedEnglishCount = 0;
    let orphanedSpanishCount = 0;
    for (const plan of plans) {
      const fingerprint = this.createPlanFingerprint(plan);
      if (!fingerprintMap.has(fingerprint)) {
        fingerprintMap.set(fingerprint, {
          plan,
          preference: this.calculatePlanPreference(plan),
          hasLanguagePair: false
        });
      } else {
        duplicateCount++;
        const existing = fingerprintMap.get(fingerprint);
        const currentPreference = this.calculatePlanPreference(plan);
        existing.hasLanguagePair = true;
        if (currentPreference > existing.preference) {
          fingerprintMap.set(fingerprint, {
            plan,
            preference: currentPreference,
            hasLanguagePair: true
          });
        }
      }
    }
    const deduplicated = [];
    for (const entry of fingerprintMap.values()) {
      const planCopy = { ...entry.plan };
      const language = (planCopy.language ?? "").toLowerCase();
      if (!entry.hasLanguagePair) {
        if (language === "spanish" || language === "español") {
          orphanedSpanishCount++;
        } else if (language === "english") {
          orphanedEnglishCount++;
        }
      }
      deduplicated.push(planCopy);
    }
    return {
      deduplicated,
      duplicateCount,
      originalCount: plans.length,
      orphanedEnglishCount,
      orphanedSpanishCount
    };
  },
  formatProviderName(name) {
    if (name == null)
      return "";
    let formatted = name.toUpperCase().trim();
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
    return formatted.replace(/[,.\s]+$/, "");
  }
};
if (typeof window !== "undefined") {
  window["API"] = API;
}
if (typeof module_api !== "undefined" && module_api.exports) {
  module_api.exports = API;
}

// src/ts/modules/etf-calculator.ts
var currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD"
});
var NO_FEE_PATTERNS = [
  /no\s+(?:early\s+)?(?:termination|cancellation)\s+fee/i,
  /no\s+cancel(?:lation)?\s+fee/i,
  /no\s+etf\b/i,
  /without\s+(?:an?\s+)?early\s+termination\s+fee/i,
  /(?:termination|cancellation)\s+fee\s*(?:is|of)?\s*\$?0\b/i,
  /fee\s+waived/i,
  /waiv(?:e|ed)\s+(?:the\s+)?(?:termination|cancellation)\s+fee/i
];
var CONDITIONAL_NO_FEE_PATTERNS = [
  /no\s+(?:early\s+)?(?:termination|cancellation)\s+fee\s+if\s+you\s+move/i,
  /waiv(?:e|ed)\s+(?:the\s+)?(?:termination|cancellation)\s+fee\s+if\s+you\s+move/i,
  /no\s+fee\s+for\s+moving/i,
  /fee\s+waived\s+for\s+moving/i
];
var UNSPECIFIED_FEE_PATTERNS = [
  /early\s+termination\s+fee\s+applies/i,
  /cancellation\s+fee\s+applies/i,
  /termination\s+fee\s+applies/i,
  /early\s+termination\s+fee\s+may\s+apply/i,
  /cancellation\s+fee\s+may\s+apply/i,
  /termination\s+fee\s+may\s+apply/i,
  /early\s+termination\s+fee\s+will\s+apply/i,
  /cancellation\s+fee\s+will\s+apply/i
];
function matchesAnyPattern(text, patterns) {
  return patterns.some((pattern) => pattern.test(text));
}
function safeMatch(text, pattern) {
  return text.match(pattern);
}
function parseCapture(match, index) {
  if (match === null)
    return 0;
  const value = match[index];
  if (value === undefined)
    return 0;
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
}
var ETFCalculator = {
  normalizeEtfDetails(plan) {
    if (plan == null)
      return null;
    let details = plan.etf_details ?? null;
    if (details === null)
      return null;
    if (typeof details === "string") {
      try {
        details = JSON.parse(details);
      } catch {
        return null;
      }
    }
    if (details == null || typeof details !== "object")
      return null;
    const structure = (details.structure ?? "").toLowerCase();
    if (!structure)
      return null;
    const baseAmount = details.base_amount ?? 0;
    return {
      structure,
      perMonthRate: structure === "per-month-remaining" ? baseAmount : 0,
      flatFee: structure === "flat" ? baseAmount : 0,
      source: details.source ?? null
    };
  },
  calculateEarlyTerminationFee(plan, monthsRemaining) {
    let etfValue = 0;
    let etfStructure = "flat";
    let perMonthRate = 0;
    const etfDetails = this.normalizeEtfDetails(plan);
    if (etfDetails !== null) {
      if (etfDetails.structure === "none") {
        return { total: 0, structure: "none", perMonthRate: 0, monthsRemaining };
      }
      if (etfDetails.structure === "unknown") {
        return { total: 0, structure: "unknown", perMonthRate: 0, monthsRemaining };
      }
      if (etfDetails.structure === "flat" && Number.isFinite(etfDetails.flatFee)) {
        return { total: etfDetails.flatFee, structure: "flat", perMonthRate: 0, monthsRemaining };
      }
      if ((etfDetails.structure === "per-month" || etfDetails.structure === "per-month-remaining") && Number.isFinite(etfDetails.perMonthRate)) {
        return {
          total: etfDetails.perMonthRate * monthsRemaining,
          structure: "per-month",
          perMonthRate: etfDetails.perMonthRate,
          monthsRemaining
        };
      }
    }
    const termsSources = [
      plan.special_terms,
      plan.fees_credits,
      plan.promotion_details,
      plan.min_usage_fees
    ].filter((s) => s != null).join(" | ");
    let hasNoFeeLanguage = false;
    let isConditionalNoFee = false;
    let hasUnspecifiedFeeLanguage = false;
    if (termsSources.length > 0) {
      const terms = termsSources.toLowerCase().replace(/\s+/g, " ").trim();
      hasNoFeeLanguage = matchesAnyPattern(terms, NO_FEE_PATTERNS);
      isConditionalNoFee = matchesAnyPattern(terms, CONDITIONAL_NO_FEE_PATTERNS);
      hasUnspecifiedFeeLanguage = matchesAnyPattern(terms, UNSPECIFIED_FEE_PATTERNS);
      const perMonthMatch = safeMatch(terms, /\$(\d+(?:\.\d{2})?)\s*(?:per|\/)\s*(?:each\s+)?(?:month|mo)(?:nth)?\s*(?:remaining|left|of\s+(?:the\s+)?(?:contract|term))/i);
      if (perMonthMatch !== null) {
        perMonthRate = parseCapture(perMonthMatch, 1);
        if (perMonthRate > 0)
          etfStructure = "per-month";
      }
      if (perMonthRate === 0) {
        const timesMatch = safeMatch(terms, /\$(\d+(?:\.\d{2})?)\s*(?:times|x|×|\*)\s*(?:the\s+)?(?:number\s+of\s+)?(?:remaining\s+)?months?\s*(?:remaining|left)?/i);
        if (timesMatch !== null) {
          perMonthRate = parseCapture(timesMatch, 1);
          if (perMonthRate > 0)
            etfStructure = "per-month";
        }
      }
      if (perMonthRate === 0) {
        const multipliedMatch = safeMatch(terms, /\$(\d+(?:\.\d{2})?)\s+multiplied\s+by\s+(?:the\s+)?(?:number\s+of\s+)?months?\s+remaining/i);
        if (multipliedMatch !== null) {
          perMonthRate = parseCapture(multipliedMatch, 1);
          if (perMonthRate > 0)
            etfStructure = "per-month";
        }
      }
      if (perMonthRate === 0 && (terms.includes("per remaining month") || terms.includes("per month remaining") || terms.includes("each remaining month"))) {
        const planEtf = plan.early_termination_fee ?? 0;
        if (planEtf > 0 && planEtf <= 50) {
          perMonthRate = planEtf;
          etfStructure = "per-month";
        }
      }
      if (perMonthRate === 0 && plan.early_termination_fee == null) {
        const fixedFeeMatch = safeMatch(terms, /(?:early\s+termination|termination|cancellation)\s+(?:fee|charge)\s*(?:is|of|:)?\s*\$?(\d+(?:\.\d{2})?)/i);
        if (fixedFeeMatch !== null) {
          etfValue = parseCapture(fixedFeeMatch, 1);
          etfStructure = "flat";
        }
      }
    }
    if (hasNoFeeLanguage) {
      return {
        total: 0,
        structure: isConditionalNoFee ? "none-conditional" : "none",
        perMonthRate: 0,
        monthsRemaining
      };
    }
    if (etfStructure === "per-month" && perMonthRate > 0) {
      return {
        total: perMonthRate * monthsRemaining,
        structure: "per-month",
        perMonthRate,
        monthsRemaining
      };
    }
    const numericETF = plan.early_termination_fee ?? 0;
    const hasExplicitETFValue = Number.isFinite(numericETF) && numericETF > 0;
    if (!hasExplicitETFValue && etfValue === 0) {
      if (hasUnspecifiedFeeLanguage) {
        return { total: 0, structure: "unknown", perMonthRate: 0, monthsRemaining };
      }
      if ((plan.term_months ?? 0) >= 2) {
        return { total: 0, structure: "unknown", perMonthRate: 0, monthsRemaining };
      }
      return { total: 0, structure: "none", perMonthRate: 0, monthsRemaining };
    }
    if (etfValue === 0) {
      etfValue = numericETF;
    }
    if (etfValue > 0 && plan.is_prepaid) {
      return { total: etfValue, structure: "flat", perMonthRate: 0, monthsRemaining };
    }
    if (etfValue <= 50 && (plan.term_months ?? 0) >= 12) {
      return { total: 0, structure: "unknown", perMonthRate: 0, monthsRemaining };
    }
    return { total: etfValue, structure: "flat", perMonthRate: 0, monthsRemaining };
  },
  getETFDisplayInfo(plan, monthsRemaining = null) {
    const months = monthsRemaining ?? Math.floor((plan.term_months ?? 12) / 2);
    const result = this.calculateEarlyTerminationFee(plan, months);
    let displayText;
    let needsConfirmation = false;
    if (result.structure === "none" || result.structure === "none-conditional") {
      if (plan.special_terms != null && /cancel|terminat|early|etf|fee/i.test(plan.special_terms)) {
        displayText = "See EFL";
        needsConfirmation = true;
      } else {
        displayText = "No fee";
      }
    } else if (result.structure === "unknown") {
      displayText = "See EFL";
      needsConfirmation = true;
    } else if (result.structure === "flat") {
      displayText = currencyFormatter.format(result.total);
    } else if (result.structure === "per-month-inferred") {
      displayText = `$${result.perMonthRate}/mo*`;
      needsConfirmation = true;
    } else {
      displayText = `$${result.perMonthRate}/mo remaining`;
    }
    return {
      ...result,
      displayText,
      exampleTotal: result.total,
      exampleMonths: months,
      needsConfirmation
    };
  },
  formatCurrency(amount) {
    return currencyFormatter.format(amount);
  }
};
if (typeof window !== "undefined") {
  window["ETFCalculator"] = ETFCalculator;
}
if (typeof module_etf_calculator !== "undefined" && module_etf_calculator.exports) {
  module_etf_calculator.exports = ETFCalculator;
}
var calculateEarlyTerminationFee = ETFCalculator.calculateEarlyTerminationFee.bind(ETFCalculator);
var getETFDisplayInfo = ETFCalculator.getETFDisplayInfo.bind(ETFCalculator);

// src/ts/modules/plan-ranker.ts
var MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December"
];
var SEASONALITY = {
  0: 0.7,
  1: 0.5,
  2: 0.2,
  3: 0,
  4: 0.1,
  5: 0.6,
  6: 1,
  7: 1,
  8: 0.7,
  9: 0,
  10: 0.2,
  11: 0.6
};
var NON_FIXED_WARNINGS = {
  VARIABLE: "VARIABLE RATE: Your price per kWh can change monthly based on market conditions. " + "You may pay significantly more during peak demand periods.",
  INDEXED: "INDEXED RATE: Your price is tied to wholesale market prices and will fluctuate. " + "During extreme weather, rates can spike 200-500%.",
  default: "NON-FIXED RATE: Your price can change based on market conditions. " + "Fixed-rate plans provide more budget certainty."
};
function matchCapture(text, pattern, group) {
  const match = text.match(pattern);
  if (match === null)
    return 0;
  const value = match[group];
  if (value === undefined)
    return 0;
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
}
function calculateBillCredits(usageKwh, plan) {
  if (plan.special_terms == null)
    return 0;
  const terms = plan.special_terms.toLowerCase();
  const creditMatch = terms.match(/\$(\d+)\s+bill\s+credit/i);
  const rangeMatch = terms.match(/between\s+(\d+)-(\d+)\s+kwh/i) ?? terms.match(/exactly\s+(\d+)\s+kwh/i);
  if (creditMatch !== null && rangeMatch !== null) {
    const creditAmount = matchCapture(terms, /\$(\d+)\s+bill\s+credit/i, 1);
    const minKwh = Number.parseFloat(rangeMatch[1] ?? "0");
    const maxKwh = rangeMatch[2] !== undefined ? Number.parseFloat(rangeMatch[2]) : minKwh;
    if (usageKwh >= minKwh && usageKwh <= maxKwh) {
      return creditAmount;
    }
  }
  return 0;
}
var PlanRanker = {
  isNewCustomerOnly(plan) {
    const text = [
      plan.special_terms,
      plan.promotion_details,
      plan.fees_credits,
      plan.min_usage_fees,
      plan.plan_name
    ].filter((s) => s != null).join(" ").toLowerCase();
    if (text.length === 0)
      return false;
    const normalized = text.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const patterns = [
      /\bnew customers? only\b/,
      /\bfor new customers? only\b/,
      /\bsolo para nuevos clientes\b/,
      /\bsolo nuevos clientes\b/
    ];
    return patterns.some((pattern) => pattern.test(normalized));
  },
  getNonFixedWarning(rateType) {
    return NON_FIXED_WARNINGS[rateType] ?? NON_FIXED_WARNINGS["default"] ?? "";
  },
  rankPlans(plans, userUsage, tduRates, options = {}, CostCalc = null) {
    const { localTaxRate = 0, contractStartDate = null, includeNonFixed = true } = options;
    const windowCalc = typeof window !== "undefined" ? window["CostCalculator"] : undefined;
    const calculator = CostCalc ?? windowCalc ?? null;
    if (calculator === null) {
      throw new Error("CostCalculator is required for plan ranking");
    }
    const rankedPlans = plans.map((plan) => {
      const isNewCustomerOnly = this.isNewCustomerOnly(plan);
      const annualResult = calculator.calculateAnnualCost(userUsage, plan, tduRates, localTaxRate);
      const volatility = this.calculateVolatility(plan, userUsage);
      const warnings = this.identifyWarnings(plan, userUsage, contractStartDate);
      if (plan.rate_type !== "FIXED") {
        warnings.unshift(this.getNonFixedWarning(plan.rate_type));
      }
      return {
        ...plan,
        annualCost: annualResult.annualCost,
        averageMonthlyCost: annualResult.averageMonthlyCost,
        effectiveRate: annualResult.effectiveAnnualRate,
        monthlyCosts: annualResult.monthlyCosts,
        totalUsage: annualResult.totalUsage,
        volatility,
        warnings,
        isGimmick: warnings.length > 0 || volatility > 0.3,
        isNonFixed: plan.rate_type !== "FIXED",
        is_new_customer_only: isNewCustomerOnly,
        qualityScore: 0,
        combinedScore: 0,
        scoreBreakdown: {
          baseScore: 100,
          costPenalty: 0,
          volatilityPenalty: 0,
          warningPenalty: 0,
          baseChargePenalty: 0,
          expirationPenalty: 0,
          automaticF: false,
          automaticFReason: null
        }
      };
    });
    const filteredPlans = includeNonFixed ? rankedPlans : rankedPlans.filter((p) => p.rate_type === "FIXED");
    if (filteredPlans.length === 0)
      return [];
    const allCosts = filteredPlans.map((p) => p.annualCost);
    const bestAnnualCost = Math.min(...allCosts);
    const worstAnnualCost = Math.max(...allCosts);
    const costRange = worstAnnualCost - bestAnnualCost || 1;
    for (const plan of filteredPlans) {
      plan.qualityScore = this.calculateQualityScore(plan, bestAnnualCost, options);
    }
    for (const plan of filteredPlans) {
      const costScore = 100 - (plan.annualCost - bestAnnualCost) / costRange * 100;
      const qualityScore = plan.qualityScore;
      const qualityFactor = Math.max(1, qualityScore) / 100;
      let combinedScore = costScore * qualityFactor;
      if (qualityScore < 60) {
        combinedScore = qualityScore - 1000 + costScore * 0.1;
      } else if (qualityScore < 70) {
        combinedScore -= 10;
      }
      plan.combinedScore = combinedScore;
    }
    filteredPlans.sort((a, b) => b.combinedScore - a.combinedScore);
    return filteredPlans;
  },
  calculateQualityScore(plan, bestAnnualCost, options = {}) {
    const breakdown = {
      baseScore: 100,
      costPenalty: 0,
      volatilityPenalty: 0,
      warningPenalty: 0,
      baseChargePenalty: 0,
      expirationPenalty: 0,
      automaticF: false,
      automaticFReason: null
    };
    if (plan.rate_type !== "FIXED") {
      breakdown.automaticF = true;
      breakdown.automaticFReason = `${plan.rate_type} rate - price can change unpredictably`;
      plan.scoreBreakdown = breakdown;
      return 0;
    }
    if (plan.is_prepaid) {
      breakdown.automaticF = true;
      breakdown.automaticFReason = "Prepaid plan - requires upfront payment";
      plan.scoreBreakdown = breakdown;
      return 0;
    }
    if (plan.is_tou) {
      breakdown.automaticF = true;
      breakdown.automaticFReason = "Time-of-use plan - rates vary by time of day";
      plan.scoreBreakdown = breakdown;
      return 0;
    }
    let score = 100;
    if (plan.annualCost > bestAnnualCost && bestAnnualCost > 0) {
      const costDiffPercent = (plan.annualCost - bestAnnualCost) / bestAnnualCost;
      breakdown.costPenalty = Math.min(40, Math.round(costDiffPercent * 100));
      score -= breakdown.costPenalty;
    }
    breakdown.volatilityPenalty = Math.round(plan.volatility * 25);
    score -= breakdown.volatilityPenalty;
    const warningCount = plan.isNonFixed ? plan.warnings.length - 1 : plan.warnings.length;
    breakdown.warningPenalty = Math.min(25, warningCount * 5);
    score -= breakdown.warningPenalty;
    if (plan.base_charge_monthly > 15) {
      breakdown.baseChargePenalty = Math.min(5, Math.round((plan.base_charge_monthly - 15) / 3));
      score -= breakdown.baseChargePenalty;
    }
    if (options.contractStartDate != null && plan.term_months > 0) {
      const expiration = this.calculateContractExpiration(options.contractStartDate, plan.term_months);
      if (expiration.riskLevel === "high") {
        breakdown.expirationPenalty = 30;
        score -= 30;
      } else if (expiration.riskLevel === "medium") {
        breakdown.expirationPenalty = 15;
        score -= 15;
      }
    }
    plan.scoreBreakdown = breakdown;
    return Math.max(0, Math.min(100, Math.round(score)));
  },
  calculateVolatility(plan, userUsage) {
    let volatilityScore = 0;
    if (plan.rate_type !== "FIXED") {
      volatilityScore += 0.6;
    }
    if (plan.special_terms?.includes("credit") === true) {
      volatilityScore += 0.5;
      let missedMonths = 0;
      for (const usage of userUsage) {
        if (calculateBillCredits(usage, plan) === 0) {
          missedMonths++;
        }
      }
      volatilityScore += missedMonths / 12 * 0.3;
    }
    if (plan.is_tou) {
      volatilityScore += 0.3;
    }
    const rate500 = plan.price_kwh_500;
    const rate1000 = plan.price_kwh_1000;
    const rate2000 = plan.price_kwh_2000;
    const variance = Math.max(Math.abs(rate500 - rate1000) / rate1000, Math.abs(rate2000 - rate1000) / rate1000);
    if (variance > 0.3) {
      volatilityScore += variance * 0.5;
    }
    return Math.min(volatilityScore, 1);
  },
  identifyWarnings(plan, userUsage, contractStartDate = null) {
    const warnings = [];
    if (plan.special_terms?.includes("credit") === true) {
      let missedMonths = 0;
      let missedValue = 0;
      for (const usage of userUsage) {
        if (calculateBillCredits(usage, plan) === 0) {
          missedMonths++;
          const match = plan.special_terms?.match(/\$(\d+)/);
          if (match !== null && match[1] !== undefined) {
            missedValue += Number.parseFloat(match[1]);
          }
        }
      }
      if (missedMonths > 0) {
        warnings.push(`You would miss the bill credit ${missedMonths} months per year, ` + `potentially costing you an extra $${Math.round(missedValue)}`);
      }
    }
    if (plan.is_tou) {
      warnings.push("Time-of-use plan requires shifting usage to off-peak hours. " + "Most households save more with simple fixed-rate plans.");
    }
    if ((plan.early_termination_fee ?? 0) > 0 || plan.special_terms != null) {
      const midpointMonths = Math.floor((plan.term_months ?? 12) / 2);
      const etfResult = ETFCalculator.calculateEarlyTerminationFee(plan, midpointMonths);
      if (etfResult.total > 200) {
        if (etfResult.structure === "per-month" || etfResult.structure === "per-month-inferred") {
          warnings.push(`High cancellation fee: $${etfResult.perMonthRate}/month remaining ` + `($${etfResult.total.toFixed(0)} at contract midpoint)`);
        } else {
          warnings.push(`High early termination fee: $${etfResult.total.toFixed(0)}`);
        }
      }
    }
    const rate500 = plan.price_kwh_500;
    const rate1000 = plan.price_kwh_1000;
    if (Math.abs(rate500 - rate1000) / rate1000 > 0.5) {
      warnings.push("Rate varies dramatically with usage. " + `${rate500.toFixed(1)}¢/kWh at low usage vs ${rate1000.toFixed(1)}¢/kWh at 1000 kWh.`);
    }
    if (contractStartDate != null && plan.term_months > 0) {
      const expirationAnalysis = this.calculateContractExpiration(contractStartDate, plan.term_months);
      if (expirationAnalysis.riskLevel === "high") {
        const altTerm = expirationAnalysis.alternativeTerms[0]?.termMonths ?? "different";
        warnings.push(`Contract expires in ${expirationAnalysis.expirationMonthName} - peak renewal season. ` + `Consider ${altTerm}-month term for better timing.`);
      }
    }
    return warnings;
  },
  calculateContractExpiration(startDate, termMonths) {
    let start = startDate instanceof Date ? startDate : new Date(startDate);
    if (Number.isNaN(start.getTime())) {
      start = new Date;
    }
    const term = termMonths > 0 ? termMonths : 12;
    const expiration = new Date(start);
    expiration.setMonth(expiration.getMonth() + term);
    const expirationMonth = expiration.getMonth();
    const score = SEASONALITY[expirationMonth] ?? 0.5;
    let riskLevel;
    if (score >= 0.8)
      riskLevel = "high";
    else if (score >= 0.5)
      riskLevel = "medium";
    else
      riskLevel = "low";
    return {
      expirationMonthName: MONTH_NAMES[expirationMonth] ?? "",
      riskLevel,
      alternativeTerms: []
    };
  },
  getQualityGrade(score) {
    if (score >= 90) {
      return {
        letter: "A",
        description: "Excellent",
        class: "grade-a",
        tooltip: "Top-tier plan with competitive pricing and minimal risk factors."
      };
    } else if (score >= 80) {
      return {
        letter: "B",
        description: "Good",
        class: "grade-b",
        tooltip: "Good overall value with reasonable pricing and acceptable risk level."
      };
    } else if (score >= 70) {
      return {
        letter: "C",
        description: "Acceptable",
        class: "grade-c",
        tooltip: "Moderate value with some concerns. Review details before enrolling."
      };
    } else if (score >= 60) {
      return {
        letter: "D",
        description: "Caution",
        class: "grade-d",
        tooltip: "Below-average value with notable drawbacks."
      };
    } else {
      return {
        letter: "F",
        description: "Avoid",
        class: "grade-f",
        tooltip: "High risk or poor value. Variable rates, prepaid, or TOU plans."
      };
    }
  },
  comparePlans(planA, planB) {
    const annualSavings = planB.annualCost - planA.annualCost;
    const monthlySavings = annualSavings / 12;
    const percentSavings = annualSavings / planB.annualCost * 100;
    return {
      annualSavings,
      monthlySavings,
      percentSavings,
      betterQuality: planA.qualityScore > planB.qualityScore,
      qualityDiff: planA.qualityScore - planB.qualityScore,
      summary: annualSavings > 0 ? `Saves $${Math.abs(annualSavings).toFixed(0)}/year vs this plan` : annualSavings < 0 ? `Costs $${Math.abs(annualSavings).toFixed(0)}/year more` : "Same annual cost"
    };
  },
  getRankDescription(rank, totalPlans) {
    const percentile = (totalPlans - rank + 1) / totalPlans * 100;
    if (rank === 1) {
      return {
        label: "Best Value",
        description: "Lowest cost plan for your usage",
        percentile: 100
      };
    } else if (rank <= 3) {
      return {
        label: "Top 3",
        description: "Among the best options available",
        percentile: Math.round(percentile)
      };
    } else if (rank <= 5) {
      return {
        label: "Top 5",
        description: "Competitive pricing",
        percentile: Math.round(percentile)
      };
    } else if (percentile >= 75) {
      return {
        label: `Top ${100 - Math.round(percentile)}%`,
        description: "Above average value",
        percentile: Math.round(percentile)
      };
    } else {
      return {
        label: `Rank ${rank}`,
        description: "Other options may offer better value",
        percentile: Math.round(percentile)
      };
    }
  },
  getScoreExplanation(plan) {
    const b = plan.scoreBreakdown;
    if (b == null)
      return "Score details unavailable";
    if (b.automaticF) {
      return `Automatic F grade: ${b.automaticFReason ?? "Unknown reason"}`;
    }
    const parts = [`Base: ${b.baseScore}`];
    if (b.costPenalty > 0)
      parts.push(`Cost: -${b.costPenalty}`);
    if (b.volatilityPenalty > 0)
      parts.push(`Volatility: -${b.volatilityPenalty}`);
    if (b.warningPenalty > 0)
      parts.push(`Warnings: -${b.warningPenalty}`);
    if (b.baseChargePenalty > 0)
      parts.push(`Base fee: -${b.baseChargePenalty}`);
    if (b.expirationPenalty > 0)
      parts.push(`Expiration risk: -${b.expirationPenalty}`);
    return parts.join(" | ");
  }
};
if (typeof window !== "undefined") {
  window["PlanRanker"] = PlanRanker;
}
if (typeof module_plan_ranker !== "undefined" && module_plan_ranker.exports) {
  module_plan_ranker.exports = PlanRanker;
}
var rankPlans = PlanRanker.rankPlans.bind(PlanRanker);
var getQualityGrade = PlanRanker.getQualityGrade.bind(PlanRanker);
var getScoreExplanation = PlanRanker.getScoreExplanation.bind(PlanRanker);
var comparePlans = PlanRanker.comparePlans.bind(PlanRanker);
var getRankDescription = PlanRanker.getRankDescription.bind(PlanRanker);

// src/ts/modules/cost-calculator.ts
var ZIP_RANGES = {
  ONCOR: [
    [75001, 75999],
    [76001, 76999]
  ],
  CENTERPOINT: [
    [77001, 77999]
  ],
  AEP_CENTRAL: [
    [78401, 78499],
    [78500, 78599]
  ],
  AEP_NORTH: [
    [79601, 79699],
    [76901, 76999]
  ],
  TNMP: [
    [77550, 77554]
  ],
  LPL: [
    [79401, 79499]
  ]
};
var CostCalculator = {
  interpolateRate(usageKwh, plan) {
    const p500 = plan.price_kwh_500 ?? 0;
    const p1000 = plan.price_kwh_1000 ?? 0;
    const p2000 = plan.price_kwh_2000 ?? 0;
    if (usageKwh <= 500) {
      return p500;
    }
    if (usageKwh <= 1000) {
      const ratio = (usageKwh - 500) / 500;
      return p500 + (p1000 - p500) * ratio;
    }
    if (usageKwh <= 2000) {
      const ratio = (usageKwh - 1000) / 1000;
      return p1000 + (p2000 - p1000) * ratio;
    }
    return p2000;
  },
  calculateBillCredits(usageKwh, plan) {
    if (plan.special_terms == null) {
      return 0;
    }
    const terms = plan.special_terms.toLowerCase();
    const creditMatch = terms.match(/\$(\d+)\s+bill\s+credit/i);
    const rangeMatch = terms.match(/between\s+(\d+)-(\d+)\s+kwh/i) ?? terms.match(/exactly\s+(\d+)\s+kwh/i);
    if (creditMatch !== null && rangeMatch !== null) {
      const creditAmount = Number.parseFloat(creditMatch[1] ?? "0");
      const minKwh = Number.parseFloat(rangeMatch[1] ?? "0");
      const maxKwh = rangeMatch[2] !== undefined ? Number.parseFloat(rangeMatch[2]) : minKwh;
      if (usageKwh >= minKwh && usageKwh <= maxKwh) {
        return creditAmount;
      }
    }
    return 0;
  },
  calculateMonthlyCost(usageKwh, plan, tduRates, localTaxRate = 0) {
    const energyRate = this.interpolateRate(usageKwh, plan);
    const energyCost = usageKwh * energyRate / 100;
    const tduCost = tduRates.monthly_base_charge + usageKwh * tduRates.per_kwh_rate / 100;
    const baseCost = plan.base_charge_monthly ?? 0;
    const subtotal = energyCost + baseCost;
    const credits = this.calculateBillCredits(usageKwh, plan);
    const taxAmount = Math.max(0, subtotal - credits) * localTaxRate;
    const total = Math.max(0, subtotal - credits + taxAmount);
    const effectiveRate = usageKwh > 0 ? total / usageKwh * 100 : 0;
    const breakdown = {
      energyCost,
      baseCost,
      tduCost,
      credits,
      tax: taxAmount,
      effectiveRate
    };
    return {
      total,
      breakdown
    };
  },
  calculateAnnualCost(monthlyUsageArray, plan, tduRates, localTaxRate = 0) {
    if (monthlyUsageArray.length !== 12) {
      throw new Error(`monthlyUsageArray must contain exactly 12 values, got ${monthlyUsageArray.length}`);
    }
    let totalCost = 0;
    const monthlyCosts = [];
    let totalUsage = 0;
    for (let i = 0;i < 12; i++) {
      const usage = monthlyUsageArray[i];
      if (usage === undefined) {
        throw new Error(`Missing usage value for month ${i}`);
      }
      const result = this.calculateMonthlyCost(usage, plan, tduRates, localTaxRate);
      monthlyCosts.push(result.total);
      totalCost += result.total;
      totalUsage += usage;
    }
    const effectiveAnnualRate = totalUsage > 0 ? totalCost / totalUsage * 100 : 0;
    return {
      annualCost: totalCost,
      monthlyCosts,
      averageMonthlyCost: totalCost / 12,
      totalUsage,
      effectiveAnnualRate
    };
  },
  detectTDU(zipCode, tduList) {
    const zip = Number.parseInt(zipCode, 10);
    if (Number.isNaN(zip)) {
      return null;
    }
    for (const [tduCode, ranges] of Object.entries(ZIP_RANGES)) {
      for (const range of ranges) {
        const [min, max] = range;
        if (zip >= min && zip <= max) {
          const tdu = tduList.find((t) => t.code === tduCode);
          return tdu ?? null;
        }
      }
    }
    return null;
  }
};
if (typeof window !== "undefined") {
  window["CostCalculator"] = CostCalculator;
}
if (typeof module_cost_calculator !== "undefined" && module_cost_calculator.exports) {
  module_cost_calculator.exports = CostCalculator;
}
var calculateMonthlyCost = CostCalculator.calculateMonthlyCost.bind(CostCalculator);
var calculateAnnualCost = CostCalculator.calculateAnnualCost.bind(CostCalculator);
var detectTDU = CostCalculator.detectTDU.bind(CostCalculator);

// src/ts/modules/formatters.ts
var MONTH_NAMES2 = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December"
];
var MONTH_NAMES_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec"
];
var Formatters = {
  _currencyFormatter: new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD"
  }),
  formatCurrency(amount) {
    return this._currencyFormatter.format(amount);
  },
  formatRate(rate) {
    if (Number.isNaN(rate)) {
      return "0.00¢/kWh";
    }
    return `${rate.toFixed(2)}¢/kWh`;
  },
  getMonthName(monthIndex) {
    if (monthIndex < 0 || monthIndex > 11 || !Number.isInteger(monthIndex)) {
      return "";
    }
    return MONTH_NAMES2[monthIndex];
  },
  getMonthNameShort(monthIndex) {
    if (monthIndex < 0 || monthIndex > 11 || !Number.isInteger(monthIndex)) {
      return "";
    }
    return MONTH_NAMES_SHORT[monthIndex];
  },
  formatPercentage(value, decimals = 0) {
    if (Number.isNaN(value)) {
      return "0%";
    }
    return `${value.toFixed(decimals)}%`;
  },
  formatKwh(kwh) {
    if (Number.isNaN(kwh)) {
      return "0 kWh";
    }
    const formatted = new Intl.NumberFormat("en-US", {
      maximumFractionDigits: 0
    }).format(kwh);
    return `${formatted} kWh`;
  }
};
if (typeof window !== "undefined") {
  window["Formatters"] = Formatters;
}
if (typeof module_formatters !== "undefined" && module_formatters.exports) {
  module_formatters.exports = Formatters;
}
var formatCurrency = Formatters.formatCurrency.bind(Formatters);
var formatRate = Formatters.formatRate.bind(Formatters);
var getMonthName = Formatters.getMonthName.bind(Formatters);
var getMonthNameShort = Formatters.getMonthNameShort.bind(Formatters);

// src/ts/modules/usage-estimator.ts
var SEASONAL_MULTIPLIERS = [
  1.2,
  1.1,
  1,
  0.95,
  1,
  1.4,
  1.7,
  1.8,
  1.5,
  1,
  0.95,
  1.2
];
var HOME_SIZE_USAGE = {
  studio: 500,
  "1br": 500,
  "2br": 750,
  small: 1000,
  medium: 1500,
  large: 2000,
  xlarge: 2500
};
var DEFAULT_USAGE_KWH = 1000;
var UsageEstimator = {
  seasonalMultipliers: SEASONAL_MULTIPLIERS,
  estimateUsagePattern(avgMonthlyKwh, _homeSize = null) {
    const validAvg = Number.isFinite(avgMonthlyKwh) && avgMonthlyKwh > 0 ? avgMonthlyKwh : DEFAULT_USAGE_KWH;
    const sumMultipliers = SEASONAL_MULTIPLIERS.reduce((a, b) => a + b, 0);
    const adjustmentFactor = 12 / sumMultipliers;
    const monthlyUsage = [];
    for (let i = 0;i < 12; i++) {
      const multiplier = SEASONAL_MULTIPLIERS[i] ?? 1;
      monthlyUsage.push(Math.round(validAvg * multiplier * adjustmentFactor));
    }
    const targetTotal = Math.round(validAvg * 12);
    const actualTotal = monthlyUsage.reduce((a, b) => a + b, 0);
    const difference = targetTotal - actualTotal;
    if (difference !== 0 && monthlyUsage.length > 0) {
      const maxValue = Math.max(...monthlyUsage);
      const maxIndex = monthlyUsage.indexOf(maxValue);
      if (maxIndex >= 0 && monthlyUsage[maxIndex] !== undefined) {
        monthlyUsage[maxIndex] += difference;
      }
    }
    return monthlyUsage;
  },
  estimateUsageFromHomeSize(homeSize) {
    const key = homeSize.toLowerCase().replace(/[^a-z0-9]/g, "");
    if (key in HOME_SIZE_USAGE) {
      return HOME_SIZE_USAGE[key];
    }
    return DEFAULT_USAGE_KWH;
  },
  getSeasonalCategory(monthIndex) {
    if (monthIndex >= 5 && monthIndex <= 8) {
      return "summer";
    }
    if (monthIndex === 0 || monthIndex === 1 || monthIndex === 11) {
      return "winter";
    }
    return "shoulder";
  },
  getMultiplier(monthIndex) {
    if (monthIndex < 0 || monthIndex > 11 || !Number.isInteger(monthIndex)) {
      return 1;
    }
    return SEASONAL_MULTIPLIERS[monthIndex] ?? 1;
  }
};
if (typeof window !== "undefined") {
  window["UsageEstimator"] = UsageEstimator;
}
if (typeof module_usage_estimator !== "undefined" && module_usage_estimator.exports) {
  module_usage_estimator.exports = UsageEstimator;
}
var estimateUsagePattern = UsageEstimator.estimateUsagePattern.bind(UsageEstimator);
var estimateUsageFromHomeSize = UsageEstimator.estimateUsageFromHomeSize.bind(UsageEstimator);

// src/ts/ui.ts
var logger2 = logger_default.withPrefix("UI");
var Toast = {
  container: null,
  icons: {
    success: "&#10003;",
    error: "&#10007;",
    warning: "!",
    info: "i"
  },
  titles: {
    success: "Success",
    error: "Error",
    warning: "Warning",
    info: "Information"
  },
  init() {
    this.container = document.getElementById("toast-container");
    if (this.container === null) {
      this.container = document.createElement("div");
      this.container.id = "toast-container";
      this.container.className = "toast-container";
      this.container.setAttribute("aria-live", "polite");
      this.container.setAttribute("aria-atomic", "true");
      document.body.appendChild(this.container);
    }
  },
  show(message, type = "info", duration = 5000, title) {
    if (this.container === null)
      this.init();
    const toast = document.createElement("div");
    toast.className = `toast toast-${type}`;
    const displayTitle = title ?? this.titles[type] ?? "Notification";
    const icon = this.icons[type] ?? this.icons.info;
    toast.innerHTML = `
      <span class="toast-icon">${icon}</span>
      <div class="toast-content">
        <div class="toast-title">${this.escapeHtml(displayTitle)}</div>
        <div class="toast-message">${this.escapeHtml(message)}</div>
      </div>
      <button class="toast-close" aria-label="Dismiss notification">&times;</button>
      ${duration > 0 ? `<div class="toast-progress"><div class="toast-progress-bar" style="animation-duration: ${duration}ms"></div></div>` : ""}
    `;
    const closeBtn = toast.querySelector(".toast-close");
    if (closeBtn !== null) {
      closeBtn.addEventListener("click", () => this.dismiss(toast));
    }
    this.container?.appendChild(toast);
    if (duration > 0) {
      setTimeout(() => this.dismiss(toast), duration);
    }
    return toast;
  },
  dismiss(toast) {
    if (toast.parentNode === null)
      return;
    toast.classList.add("toast-out");
    setTimeout(() => {
      if (toast.parentNode !== null) {
        toast.parentNode.removeChild(toast);
      }
    }, 250);
  },
  success(msg, duration = 5000, title = "Success") {
    return this.show(msg, "success", duration, title);
  },
  error(msg, duration = 8000, title = "Error") {
    return this.show(msg, "error", duration, title);
  },
  warning(msg, duration = 6000, title = "Attention") {
    return this.show(msg, "warning", duration, title);
  },
  info(msg, duration = 5000, title = "Information") {
    return this.show(msg, "info", duration, title);
  },
  escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }
};
var UI = {
  state: {
    zipCode: null,
    tdu: null,
    usageMethod: "estimate",
    homeSize: null,
    avgUsage: null,
    monthlyUsage: Array(12).fill(0),
    rankedPlans: null,
    isLoading: false,
    autoCalculateTimer: null,
    zipValidationTimer: null,
    lastCalculation: null,
    localTaxRate: 0,
    taxInfo: null
  },
  elements: {},
  sortState: { column: null, direction: "desc" },
  AUTO_CALCULATE_DELAY: 500,
  ZIP_VALIDATION_DELAY: 300,
  async init() {
    this.cacheElements();
    Toast.init();
    this.attachEventListeners();
    try {
      const { plans } = await API.preloadAll();
      this.updateHeroMetrics();
      Toast.success(`${plans.total_plans.toLocaleString()} electricity plans ready for comparison.`, 5000, "Data Loaded");
    } catch (error) {
      Toast.error("Unable to load plan data. Please check your connection and refresh.", 0, "Connection Error");
      logger2.error("Init error", { error });
    }
  },
  cacheElements() {
    this.elements = {
      totalPlansCount: document.getElementById("total-plans-count"),
      lastUpdate: document.getElementById("last-update"),
      zipInput: document.getElementById("zip-code"),
      zipStatus: document.getElementById("zip-status"),
      tduDisplay: document.getElementById("tdu-display"),
      tduName: document.getElementById("tdu-name"),
      tduBase: document.getElementById("tdu-base"),
      tduRate: document.getElementById("tdu-rate"),
      tduArea: document.getElementById("tdu-area"),
      stepUsage: document.getElementById("step-usage"),
      methodOptions: document.querySelectorAll(".method-option"),
      panelEstimate: document.getElementById("panel-estimate"),
      panelAverage: document.getElementById("panel-average"),
      panelDetailed: document.getElementById("panel-detailed"),
      homeSize: document.getElementById("home-size"),
      avgKwh: document.getElementById("avg-kwh"),
      annualUsageTotal: document.getElementById("annual-usage-total"),
      monthlyUsageAvg: document.getElementById("monthly-usage-avg"),
      calculateBtn: document.getElementById("calculate-btn"),
      resultsSection: document.getElementById("results-section"),
      resultsCount: document.getElementById("results-count"),
      usageChart: document.getElementById("usage-chart"),
      profileAnnual: document.getElementById("profile-annual"),
      profileAvg: document.getElementById("profile-avg"),
      profilePeak: document.getElementById("profile-peak"),
      topPlans: document.getElementById("top-plans"),
      warningsSection: document.getElementById("warnings-section"),
      warningPlans: document.getElementById("warning-plans"),
      comparisonBody: document.getElementById("comparison-body"),
      filterTerm: document.getElementById("filter-term"),
      filterRenewable: document.getElementById("filter-renewable"),
      modalBackdrop: document.getElementById("modal-backdrop"),
      modalBody: document.getElementById("modal-body"),
      modalClose: document.getElementById("modal-close"),
      calculationStatus: document.getElementById("calculation-status"),
      statusIdle: document.getElementById("status-idle"),
      statusLoading: document.getElementById("status-loading"),
      statusReady: document.getElementById("status-ready")
    };
  },
  attachEventListeners() {
    if (this.elements.zipInput !== null) {
      this.elements.zipInput.addEventListener("input", (e) => this.handleZipInput(e));
      this.elements.zipInput.addEventListener("blur", () => this.handleZipBlur());
      this.elements.zipInput.addEventListener("keypress", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          this.handleZipBlur();
        }
      });
    }
    this.elements.methodOptions.forEach((option) => {
      option.addEventListener("click", () => this.handleMethodChange(option));
    });
    if (this.elements.homeSize !== null) {
      this.elements.homeSize.addEventListener("change", (e) => {
        this.state.homeSize = e.target.value;
        this.triggerAutoCalculate();
      });
    }
    if (this.elements.avgKwh !== null) {
      this.elements.avgKwh.addEventListener("input", (e) => {
        this.state.avgUsage = Number.parseFloat(e.target.value) || null;
        this.debounceAutoCalculate();
      });
    }
    const monthInputs = document.querySelectorAll("[data-month]");
    monthInputs.forEach((input) => {
      input.addEventListener("input", () => {
        this.handleMonthlyInput();
        this.debounceAutoCalculate();
      });
    });
    if (this.elements.filterTerm !== null) {
      this.elements.filterTerm.addEventListener("change", () => this.applyFilters());
    }
    if (this.elements.filterRenewable !== null) {
      this.elements.filterRenewable.addEventListener("change", () => this.applyFilters());
    }
    if (this.elements.modalBackdrop !== null) {
      this.elements.modalBackdrop.addEventListener("click", (e) => {
        if (e.target === this.elements.modalBackdrop)
          this.closeModal();
      });
    }
    if (this.elements.modalClose !== null) {
      this.elements.modalClose.addEventListener("click", () => this.closeModal());
    }
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape")
        this.closeModal();
    });
  },
  async updateHeroMetrics() {
    try {
      const freshness = await API.getDataFreshness();
      this.state.freshness = freshness;
      if (this.elements.totalPlansCount !== null) {
        if (freshness.duplicateCount > 0) {
          this.elements.totalPlansCount.innerHTML = `
            <span class="metric-value-main">${freshness.totalPlans.toLocaleString()}</span>
            <span class="metric-subvalue">
              ${freshness.originalPlanCount.toLocaleString()} total - ${freshness.duplicateCount.toLocaleString()} duplicate${freshness.duplicateCount !== 1 ? "s" : ""} removed
            </span>
          `;
        } else {
          this.elements.totalPlansCount.textContent = freshness.totalPlans.toLocaleString();
        }
      }
      if (this.elements.lastUpdate !== null) {
        const date = new Date(freshness.plansUpdated);
        this.elements.lastUpdate.textContent = date.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric"
        });
      }
    } catch (error) {
      logger2.error("Error updating metrics", { error });
    }
  },
  handleZipInput(e) {
    const target = e.target;
    const value = target.value.replace(/\D/g, "").substring(0, 5);
    target.value = value;
    if (this.state.zipValidationTimer !== null) {
      clearTimeout(this.state.zipValidationTimer);
      this.state.zipValidationTimer = null;
    }
    if (value.length === 5) {
      if (this.elements.zipStatus !== null) {
        this.elements.zipStatus.innerHTML = '<span class="zip-status-checking">Validating...</span>';
      }
      this.state.zipValidationTimer = setTimeout(() => {
        this.validateZipCode(value);
      }, this.ZIP_VALIDATION_DELAY);
    } else if (value.length > 0) {
      if (this.elements.zipStatus !== null) {
        this.elements.zipStatus.innerHTML = `<span class="zip-status-partial">${5 - value.length} more digits</span>`;
      }
      this.disableUsageSection();
    } else {
      if (this.elements.zipStatus !== null) {
        this.elements.zipStatus.textContent = "";
      }
      this.disableUsageSection();
    }
  },
  async validateZipCode(zipCode) {
    if (zipCode.length !== 5) {
      this.disableUsageSection();
      return;
    }
    if (this.state.zipCode === zipCode && this.state.tdu !== null) {
      return;
    }
    this.state.zipCode = zipCode;
    try {
      const taxInfo = await API.getLocalTaxInfo(zipCode);
      this.state.taxInfo = taxInfo;
      this.state.localTaxRate = taxInfo.rate ?? 0;
      if (taxInfo.deregulated === false) {
        Toast.warning("This ZIP code is in a regulated service area where retail choice is not available.", 8000, "Regulated Area");
        this.disableUsageSection();
        if (this.elements.zipStatus !== null) {
          this.elements.zipStatus.innerHTML = '<span class="zip-status-unknown">Regulated</span>';
        }
        return;
      }
      if (taxInfo.tdu !== null) {
        const tdu2 = await API.getTDUByCode(taxInfo.tdu);
        if (tdu2 !== null) {
          this.state.tdu = tdu2;
          this.showTduInfo(tdu2);
          this.enableUsageSection();
          if (this.elements.zipStatus !== null) {
            this.elements.zipStatus.innerHTML = '<span class="zip-status-valid">Valid ZIP</span>';
          }
          return;
        }
      }
      const tdus = await API.getAllTDUs();
      const tdu = this.detectTDU(zipCode, Array.from(tdus));
      if (tdu !== null) {
        this.state.tdu = tdu;
        this.showTduInfo(tdu);
        this.enableUsageSection();
        if (this.elements.zipStatus !== null) {
          this.elements.zipStatus.innerHTML = '<span class="zip-status-valid">Valid ZIP</span>';
        }
      } else {
        Toast.warning("This ZIP code may be in a non-deregulated area of Texas.", 8000, "Unknown Service Area");
        this.disableUsageSection();
        if (this.elements.zipStatus !== null) {
          this.elements.zipStatus.innerHTML = '<span class="zip-status-unknown">Unknown</span>';
        }
      }
    } catch (error) {
      Toast.error("Unable to verify service area. Please try again.", 6000, "Lookup Failed");
      logger2.error("ZIP detection error", { error });
      this.disableUsageSection();
    }
  },
  detectTDU(zipCode, tduList) {
    const zipRanges = {
      ONCOR: [
        { min: 75001, max: 75999 },
        { min: 76001, max: 76999 }
      ],
      CENTERPOINT: [{ min: 77001, max: 77999 }],
      AEP_CENTRAL: [
        { min: 78401, max: 78499 },
        { min: 78500, max: 78599 }
      ],
      AEP_NORTH: [
        { min: 79601, max: 79699 },
        { min: 76901, max: 76999 }
      ],
      TNMP: [{ min: 77550, max: 77554 }],
      LPL: [{ min: 79401, max: 79499 }]
    };
    const zip = Number.parseInt(zipCode, 10);
    for (const [tduCode, ranges] of Object.entries(zipRanges)) {
      for (const range of ranges) {
        if (zip >= range.min && zip <= range.max) {
          return tduList.find((tdu) => tdu.code === tduCode) ?? null;
        }
      }
    }
    return null;
  },
  async handleZipBlur() {
    if (this.state.zipValidationTimer !== null) {
      clearTimeout(this.state.zipValidationTimer);
      this.state.zipValidationTimer = null;
    }
    const zipCode = this.elements.zipInput?.value ?? "";
    await this.validateZipCode(zipCode);
  },
  showTduInfo(tdu) {
    if (this.elements.tduDisplay === null)
      return;
    this.elements.tduDisplay.hidden = false;
    if (this.elements.tduName !== null) {
      this.elements.tduName.textContent = tdu.name;
    }
    if (this.elements.tduBase !== null) {
      this.elements.tduBase.textContent = `$${tdu.monthly_base_charge.toFixed(2)}/month`;
    }
    if (this.elements.tduRate !== null) {
      this.elements.tduRate.textContent = `${tdu.per_kwh_rate.toFixed(2)} cents/kWh`;
    }
    if (this.elements.tduArea !== null) {
      this.elements.tduArea.textContent = tdu.service_area;
    }
  },
  enableUsageSection() {
    if (this.elements.stepUsage !== null) {
      this.elements.stepUsage.classList.remove("calc-step-disabled");
    }
  },
  disableUsageSection() {
    if (this.elements.stepUsage !== null) {
      this.elements.stepUsage.classList.add("calc-step-disabled");
    }
    if (this.elements.tduDisplay !== null) {
      this.elements.tduDisplay.hidden = true;
    }
    this.state.tdu = null;
    this.state.localTaxRate = 0;
    this.state.taxInfo = null;
  },
  handleMethodChange(option) {
    const method = option.dataset["method"] ?? "estimate";
    this.state.usageMethod = method;
    this.elements.methodOptions.forEach((opt) => {
      opt.classList.remove("active");
      opt.setAttribute("aria-selected", "false");
    });
    option.classList.add("active");
    option.setAttribute("aria-selected", "true");
    ["estimate", "average", "detailed"].forEach((m) => {
      const panel = document.getElementById(`panel-${m}`);
      if (panel !== null) {
        panel.hidden = m !== method;
        panel.classList.toggle("active", m === method);
      }
    });
  },
  handleMonthlyInput() {
    const monthInputs = document.querySelectorAll("[data-month]");
    const values = Array.from(monthInputs).map((input) => Number.parseFloat(input.value) || 0);
    this.state.monthlyUsage = values;
    const total = values.reduce((sum, v) => sum + v, 0);
    const filledCount = values.filter((v) => v > 0).length;
    const avg = filledCount > 0 ? total / filledCount : 0;
    if (this.elements.annualUsageTotal !== null) {
      this.elements.annualUsageTotal.textContent = `${total.toLocaleString()} kWh`;
    }
    if (this.elements.monthlyUsageAvg !== null) {
      this.elements.monthlyUsageAvg.textContent = `${Math.round(avg).toLocaleString()} kWh`;
    }
  },
  isInputValid() {
    if (this.state.tdu === null)
      return false;
    switch (this.state.usageMethod) {
      case "estimate":
        return Boolean(this.state.homeSize ?? this.elements.homeSize?.value);
      case "average":
        return Boolean(this.state.avgUsage ?? Number.parseFloat(this.elements.avgKwh?.value ?? ""));
      case "detailed":
        return this.state.monthlyUsage.some((v) => v > 0);
      default:
        return false;
    }
  },
  debounceAutoCalculate() {
    if (this.state.autoCalculateTimer !== null) {
      clearTimeout(this.state.autoCalculateTimer);
    }
    this.state.autoCalculateTimer = setTimeout(() => {
      this.triggerAutoCalculate();
    }, this.AUTO_CALCULATE_DELAY);
  },
  triggerAutoCalculate() {
    if (this.state.autoCalculateTimer !== null) {
      clearTimeout(this.state.autoCalculateTimer);
      this.state.autoCalculateTimer = null;
    }
    if (this.isInputValid() && !this.state.isLoading) {
      this.handleCalculate();
    }
  },
  async handleCalculate() {
    if (this.state.isLoading || this.state.tdu === null)
      return;
    let monthlyUsage;
    switch (this.state.usageMethod) {
      case "estimate": {
        const homeSize = this.elements.homeSize?.value ?? this.state.homeSize;
        if (!homeSize) {
          Toast.warning("Select your home size to estimate usage.", 5000, "Selection Required");
          return;
        }
        monthlyUsage = UsageEstimator.estimateUsagePattern(Number.parseFloat(homeSize));
        break;
      }
      case "average": {
        const avgKwh = Number.parseFloat(this.elements.avgKwh?.value ?? "") ?? this.state.avgUsage;
        if (!avgKwh) {
          Toast.warning("Enter your average monthly kWh usage.", 5000, "Usage Required");
          return;
        }
        monthlyUsage = UsageEstimator.estimateUsagePattern(avgKwh);
        break;
      }
      case "detailed": {
        if (!this.state.monthlyUsage.some((v) => v > 0)) {
          Toast.warning("Enter usage for at least one month.", 5000, "Usage Required");
          return;
        }
        const filledMonths = this.state.monthlyUsage.filter((v) => v > 0);
        const avgFilled = filledMonths.reduce((a, b) => a + b, 0) / filledMonths.length;
        monthlyUsage = this.state.monthlyUsage.map((v) => v || avgFilled);
        break;
      }
      default:
        return;
    }
    this.state.isLoading = true;
    this.showLoading();
    try {
      const plansData = await API.loadPlans();
      const tduPlans = plansData.plans.filter((p) => p.tdu_area === this.state.tdu?.code);
      if (tduPlans.length === 0) {
        Toast.warning("No electricity plans currently available for your service area.", 6000, "No Plans Found");
        return;
      }
      const rankedPlans = PlanRanker.rankPlans(tduPlans, monthlyUsage, this.state.tdu, { localTaxRate: this.state.localTaxRate }, CostCalculator);
      this.state.rankedPlans = rankedPlans;
      this.displayResults(rankedPlans, monthlyUsage);
      if (this.elements.resultsSection !== null) {
        this.elements.resultsSection.hidden = false;
        this.elements.resultsSection.classList.add("is-visible");
        this.elements.resultsSection.scrollIntoView({ behavior: "smooth", block: "start" });
      }
      const best = rankedPlans[0];
      if (best !== undefined) {
        Toast.success(`Lowest cost plan: ${formatCurrency(best.annualCost)}/year.`, 6000, `${rankedPlans.length} Plans Analyzed`);
      }
    } catch (error) {
      Toast.error("Unable to calculate costs. Please try again.", 8000, "Calculation Error");
      logger2.error("Calculation error", { error });
    } finally {
      this.state.isLoading = false;
      this.hideLoading();
    }
  },
  showLoading() {
    if (this.elements.statusIdle !== null)
      this.elements.statusIdle.hidden = true;
    if (this.elements.statusLoading !== null)
      this.elements.statusLoading.hidden = false;
    if (this.elements.statusReady !== null)
      this.elements.statusReady.hidden = true;
  },
  hideLoading() {
    if (this.elements.statusIdle !== null)
      this.elements.statusIdle.hidden = true;
    if (this.elements.statusLoading !== null)
      this.elements.statusLoading.hidden = true;
    if (this.elements.statusReady !== null)
      this.elements.statusReady.hidden = false;
  },
  displayResults(plans, monthlyUsage) {
    this.displayUsageProfile(monthlyUsage);
    this.displayTopPlans(plans);
    this.displayComparisonTable(plans);
    if (this.elements.resultsCount !== null) {
      this.elements.resultsCount.textContent = String(plans.length);
    }
  },
  displayUsageProfile(monthlyUsage) {
    const total = monthlyUsage.reduce((a, b) => a + b, 0);
    const avg = total / 12;
    const max = Math.max(...monthlyUsage);
    const peakMonth = monthlyUsage.indexOf(max);
    if (this.elements.profileAnnual !== null) {
      this.elements.profileAnnual.textContent = `${total.toLocaleString()} kWh`;
    }
    if (this.elements.profileAvg !== null) {
      this.elements.profileAvg.textContent = `${Math.round(avg).toLocaleString()} kWh`;
    }
    if (this.elements.profilePeak !== null) {
      this.elements.profilePeak.textContent = `${getMonthName(peakMonth)} (${Math.round(max).toLocaleString()} kWh)`;
    }
    if (this.elements.usageChart !== null) {
      const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      this.elements.usageChart.innerHTML = monthlyUsage.map((usage, i) => {
        const height = max > 0 ? Math.round(usage / max * 100) : 0;
        return `
            <div class="chart-bar-container">
              <div class="chart-bar" style="height: ${height}%" title="${usage.toLocaleString()} kWh"></div>
              <span class="chart-label">${monthNames[i]}</span>
            </div>
          `;
      }).join("");
    }
  },
  displayTopPlans(plans) {
    if (this.elements.topPlans === null)
      return;
    const displayPlans = plans.slice(0, 5);
    this.elements.topPlans.innerHTML = displayPlans.map((plan, i) => this.renderPlanCard(plan, i)).join("");
  },
  displayComparisonTable(plans) {
    if (this.elements.comparisonBody === null)
      return;
    this.elements.comparisonBody.innerHTML = plans.map((plan) => {
      const grade = this.getQualityGrade(plan.qualityScore);
      const contractEnd = new Date;
      contractEnd.setMonth(contractEnd.getMonth() + plan.term_months);
      const contractEndStr = contractEnd.toLocaleDateString("en-US", { month: "short", year: "numeric" });
      return `
          <tr>
            <td class="col-grade"><span class="quality-grade ${grade.class}">${grade.letter}</span></td>
            <td class="col-provider">${this.escapeHtml(plan.rep_name)}</td>
            <td class="col-plan">${this.escapeHtml(plan.plan_name)}</td>
            <td class="col-term">${plan.term_months} mo</td>
            <td class="col-contract-end">${contractEndStr}</td>
            <td class="col-annual">${formatCurrency(plan.annualCost)}</td>
            <td class="col-monthly">${formatCurrency(plan.averageMonthlyCost)}</td>
            <td class="col-rate">${formatRate(plan.effectiveRate)}</td>
            <td class="col-renewable">${plan.renewable_pct}%</td>
            <td class="col-etf">${this.formatETF(plan)}</td>
            <td class="col-actions">
              <button class="btn-table-details" onclick="UI.showPlanModal('${plan.plan_id}')">Details</button>
            </td>
          </tr>
        `;
    }).join("");
  },
  renderPlanCard(plan, index) {
    const rankBadge = index === 0 ? "rank-badge-first" : index <= 2 ? "rank-badge-top3" : "rank-badge-top5";
    const rankLabel = index === 0 ? "Best Value" : index <= 2 ? "Top 3" : "Top 5";
    return `
      <div class="plan-item">
        <div class="plan-item-rank">
          <span class="rank-badge ${rankBadge}">${rankLabel}</span>
        </div>
        <div class="plan-item-header">
          <div>
            <div class="plan-item-name">${this.escapeHtml(plan.plan_name)}</div>
            <div class="plan-item-provider">${this.escapeHtml(plan.rep_name)}</div>
          </div>
          <div class="plan-item-cost">
            <div class="plan-item-annual">${formatCurrency(plan.annualCost)}/yr</div>
            <div class="plan-item-monthly">${formatCurrency(plan.averageMonthlyCost)}/month avg</div>
          </div>
        </div>
        <div class="plan-item-details">
          <span class="plan-detail-item">
            <span class="plan-detail-label">Quality:</span>
            <span class="plan-detail-value">${plan.qualityScore}/100</span>
          </span>
          <span class="plan-detail-item">
            <span class="plan-detail-label">Term:</span>
            <span class="plan-detail-value">${plan.term_months} months</span>
          </span>
          <span class="plan-detail-item">
            <span class="plan-detail-label">Rate:</span>
            <span class="plan-detail-value">${formatRate(plan.effectiveRate)}</span>
          </span>
        </div>
        <div class="plan-item-actions">
          <button class="btn-plan-action btn-plan-details" onclick="UI.showPlanModal('${plan.plan_id}')">View Details</button>
          ${plan.efl_url ? `<a href="${this.escapeHtml(plan.efl_url)}" target="_blank" rel="noopener" class="btn-plan-action btn-plan-efl">View EFL</a>` : ""}
        </div>
      </div>
    `;
  },
  showPlanModal(planId) {
    const plan = this.state.rankedPlans?.find((p) => p.plan_id === planId);
    if (plan === undefined || this.elements.modalBackdrop === null)
      return;
    if (this.elements.modalBody !== null) {
      const monthlyCostText = plan.monthlyCosts ? `${formatCurrency(Math.min(...plan.monthlyCosts))} - ${formatCurrency(Math.max(...plan.monthlyCosts))}` : formatCurrency(plan.averageMonthlyCost);
      this.elements.modalBody.innerHTML = `
        <div class="modal-header">
          <h2 class="modal-plan-name">${this.escapeHtml(plan.plan_name)}</h2>
          <p class="modal-provider">${this.escapeHtml(plan.rep_name)}</p>
        </div>
        <div class="modal-cost-summary">
          <div class="modal-cost-item">
            <span class="modal-cost-label">Annual Cost</span>
            <span class="modal-cost-value">${formatCurrency(plan.annualCost)}</span>
          </div>
          <div class="modal-cost-item">
            <span class="modal-cost-label">Monthly (${plan.term_months} months)</span>
            <span class="modal-cost-value">${monthlyCostText}</span>
          </div>
          <div class="modal-cost-item">
            <span class="modal-cost-label">Effective Rate</span>
            <span class="modal-cost-value">${formatRate(plan.effectiveRate)}</span>
          </div>
        </div>
        <div class="modal-details">
          <p><strong>Rate Type:</strong> ${plan.rate_type}</p>
          <p><strong>Contract Term:</strong> ${plan.term_months} months</p>
          <p><strong>Renewable:</strong> ${plan.renewable_pct}%</p>
          <p><strong>Cancellation Fee:</strong> ${this.formatETF(plan)}</p>
          ${plan.special_terms ? `<p><strong>Special Terms:</strong> ${this.escapeHtml(plan.special_terms)}</p>` : ""}
        </div>
        <div class="modal-actions">
          ${plan.efl_url ? `<a href="${this.escapeHtml(plan.efl_url)}" target="_blank" rel="noopener" class="btn-modal-action">View EFL</a>` : ""}
          ${plan.enrollment_url ? `<a href="${this.escapeHtml(plan.enrollment_url)}" target="_blank" rel="noopener" class="btn-modal-action btn-enroll">Enroll Now</a>` : ""}
        </div>
      `;
    }
    this.elements.modalBackdrop.hidden = false;
  },
  closeModal() {
    if (this.elements.modalBackdrop !== null) {
      this.elements.modalBackdrop.hidden = true;
    }
  },
  applyFilters() {},
  escapeHtml(text) {
    if (text == null)
      return "";
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  },
  formatETF(plan) {
    const info = ETFCalculator.getETFDisplayInfo(plan);
    return info.displayText;
  },
  getQualityTier(score) {
    if (score >= 80)
      return "high";
    if (score >= 60)
      return "medium";
    return "low";
  },
  getQualityGrade(score) {
    return PlanRanker.getQualityGrade(score);
  }
};
var ui_default = UI;
if (typeof window !== "undefined") {
  window["UI"] = UI;
  window["Toast"] = Toast;
}
if (typeof document !== "undefined") {
  const init = () => {
    if (window._uiInitialized)
      return;
    window._uiInitialized = true;
    UI.init();
  };
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
    window.addEventListener("load", init);
  } else {
    init();
  }
}
export {
  ui_default as default,
  UI,
  Toast
};
